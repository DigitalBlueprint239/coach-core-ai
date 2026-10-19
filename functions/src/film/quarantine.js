"use strict";
/**
 * Coach Core Film Analyzer — FILM-S1 quarantine finalize handler.
 *
 * Runs when an object is finalized under `quarantine/`. It is NOT media
 * validation: it checks that the object matches its reservation (size,
 * declared content type) and that the first bytes look like an ISO BMFF
 * (`ftyp`) container. The bounded decoder, metadata-stripping remux and
 * promotion to `ready` belong to a later slice, so the best outcome here is
 * `validating`.
 *
 * Safety properties, each covered by a test in film-quarantine.test.js:
 *  - only paths of the exact shape quarantine/{teamId}/{filmId}/source.mp4
 *    are handled; everything else is ignored, never deleted;
 *  - a duplicate delivery of the same event (same generation) is a no-op;
 *  - an object that arrives for a missing, abandoned, rejected, expired or
 *    already-validated reservation is deleted by exact name AND generation,
 *    and the reservation's status is never resurrected;
 *  - a failed check deletes only that object/generation, marks the film
 *    rejected with a safe reason and releases the cap slot once.
 */
const {LIMITS} = require("./limits");
const {toMs} = require("./reservation");
const {REJECTION_REASONS} = require("./contract");

// DELEGATED: bytes read for the container signature check.
const HEADER_PROBE_BYTES = 64;

const PATH_RE =
  /^quarantine\/([A-Za-z0-9_-]{1,64})\/([A-Za-z0-9_-]{1,64})\/source\.mp4$/;

/**
 * Minimal ISO BMFF signature check on the first bytes of the object.
 * @param {Buffer|Uint8Array} head first bytes (>= 12 expected)
 * @return {boolean}
 */
function looksLikeMp4(head) {
  if (!head || head.length < 12) return false;
  const size = (head[0] << 24 | head[1] << 16 | head[2] << 8 | head[3]) >>> 0;
  const tag = String.fromCharCode(head[4], head[5], head[6], head[7]);
  if (tag !== "ftyp") return false;
  // A real ftyp box is small: 8-byte header + brand + version + compat list.
  return size >= 12 && size <= 1024;
}

/**
 * @param {object} deps
 * @param {object} deps.db Admin Firestore (or test double)
 * @param {function({name: string, generation: string}): Promise<boolean>}
 *   deps.deleteObject exact-generation delete; false when already gone
 * @param {function({name: string, generation: string, bytes: number}):
 *   Promise<Buffer|null>} deps.readHead first bytes of that exact object
 *   generation; null when it no longer exists
 * @param {object} deps.logger
 * @param {function(): Date} [deps.now]
 * @return {function(object): Promise<object>} CloudEvent handler returning
 *   a small outcome record (for tests and logs)
 */
function createQuarantineFinalizeHandler(deps) {
  const now = deps.now || (() => new Date());
  const db = deps.db;

  return async function onQuarantineObjectFinalized(event) {
    const obj = (event && event.data) || {};
    const name = String(obj.name || "");
    const generation = obj.generation == null ? "" : String(obj.generation);
    const m = PATH_RE.exec(name);
    if (!m || !generation) {
      // Not a quarantine upload path (or malformed event): leave it alone.
      deps.logger.warn("film.quarantine.ignored", {name});
      return {outcome: "ignored", name};
    }
    const [, teamId, filmId] = m;
    const size = Number(obj.size);
    const contentType = String(obj.contentType || "");
    const at = now();
    const target = {name, generation};

    const teamRef = db.collection("teams").doc(teamId);
    const filmRef = teamRef.collection("films").doc(filmId);
    const ledgerRef = teamRef.collection("filmLedger").doc("counts");

    // Read the head before the transaction (transactions may retry; the
    // probe is idempotent). null => the object is already gone.
    let head = null;
    try {
      head = await deps.readHead({name, generation, bytes: HEADER_PROBE_BYTES});
    } catch (e) {
      deps.logger.warn("film.quarantine.probe-failed",
          {teamId, filmId, error: String(e && e.code)});
      head = null;
    }

    const decision = await db.runTransaction(async (tx) => {
      const filmSnap = await tx.get(filmRef);
      if (!filmSnap.exists) {
        return {outcome: "stray-no-reservation", remove: true};
      }
      const film = filmSnap.data();

      if (film.objectGeneration && film.objectGeneration === generation) {
        return {outcome: "duplicate-event", remove: false};
      }
      if (film.status !== "reserved") {
        // abandoned / rejected / expired / validating(other generation):
        // the object must go, the status must not change.
        return {outcome: `stray-${film.status}`, remove: true};
      }

      const expired = toMs(film.reservationExpiresAt) <= at.getTime();
      const ledgerSnap = await tx.get(ledgerRef);
      const active = ledgerSnap.exists ? (ledgerSnap.data().active || 0) : 0;
      const release = () => tx.set(ledgerRef,
          {active: Math.max(0, active - 1), updatedAt: at}, {merge: true});

      if (expired) {
        // Lifetime passed before the object finalized: expired (no
        // rejectionReason; the object is removed, the slot released).
        tx.update(filmRef, {status: "expired", statusChangedAt: at});
        release();
        return {outcome: "expired", remove: true};
      }

      let reason = null;
      if (size !== Number(film.declaredBytes)) reason = "size-mismatch";
      else if (contentType !== film.declaredContentType ||
          !LIMITS.allowedContentTypes.includes(contentType)) {
        reason = "content-type-mismatch";
      } else if (head === null) {
        // Object vanished between the event and the probe. Leave the
        // reservation open; nothing to validate or delete.
        return {outcome: "object-missing", remove: false};
      } else if (!looksLikeMp4(head)) reason = "signature-invalid";

      if (reason) {
        tx.update(filmRef, {
          status: "rejected", statusChangedAt: at, rejectionReason: reason,
          objectGeneration: generation,
        });
        release();
        return {outcome: "rejected", reason, remove: true};
      }

      tx.update(filmRef, {
        status: "validating", statusChangedAt: at,
        objectGeneration: generation,
      });
      return {outcome: "validating", remove: false};
    });

    let removed = null;
    if (decision.remove) {
      try {
        removed = await deps.deleteObject(target);
      } catch (e) {
        removed = false;
        deps.logger.warn("film.quarantine.delete-failed",
            {teamId, filmId, generation, error: String(e && e.code)});
      }
    }
    deps.logger.info("film.quarantine", {
      teamId, filmId, generation, outcome: decision.outcome,
      reason: decision.reason || null, removed,
    });
    return {...decision, teamId, filmId, generation, removed};
  };
}

// Every reason this handler can store is in the published contract.
const USED_REASONS =
  ["size-mismatch", "content-type-mismatch", "signature-invalid"];
for (const r of USED_REASONS) {
  if (!REJECTION_REASONS.includes(r)) {
    throw new Error(`quarantine reason ${r} missing from contract`);
  }
}

module.exports = {
  createQuarantineFinalizeHandler, looksLikeMp4, PATH_RE, HEADER_PROBE_BYTES,
};
