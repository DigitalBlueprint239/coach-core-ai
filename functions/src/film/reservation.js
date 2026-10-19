"use strict";
/**
 * Coach Core Film Analyzer — FILM-S1 upload reservation and cancellation.
 *
 * Implements the `reserveFilmUpload` and `abandonFilmUpload` callables of the
 * coach-film.v1 contract (contract.js is authoritative; see
 * docs/film/COACH_FILM_V1_CONTRACT.md). Contract outcomes are RETURNED as
 * {ok:false, error}; the handler throws only for genuinely unexpected
 * failures, which the client mirror maps to `unavailable / transport`.
 *
 * State machine, server-owned (clients cannot write film documents):
 *
 *   reserved ──finalize ok (size, type, ftyp)──▶ validating
 *   reserved ──finalize mismatch──────────────▶ rejected
 *   reserved ──lifetime passed────────────────▶ expired
 *   reserved | validating ──abandon───────────▶ abandoned
 *
 * `ready` is reserved for the decoder slice and is never set here. Nothing in
 * FILM-S1 can make a film playable.
 *
 * The Firestore document teams/{teamId}/films/{filmId} is field-for-field the
 * contract's FilmState with Timestamps in place of ISO strings.
 *
 * Cap accounting: teams/{teamId}/filmLedger/counts.active counts films in a
 * slot-holding status (reserved, validating, ready). Every change to it is in
 * the same transaction as the status change, so concurrent reservations cannot
 * exceed the cap and a slot is never released twice.
 *
 * Idempotency: filmOperations/{uid}__{operationId} stores the first SUCCESS
 * response. Same key + same action + same payload → stored response replayed
 * verbatim, no writes. Same key, different action/payload → conflict. Error
 * responses are not stored.
 *
 * Cleanup never touches anything but this reservation's own object
 * quarantine/{teamId}/{filmId}/source.mp4, generation-matched when known.
 */
const crypto = require("node:crypto");
const c = require("./contract");
const {LIMITS} = require("./limits");

const {errorResponseFor: err, toWireTimestamp} = c;

/**
 * Canonical hash of a payload (sorted keys) for idempotency comparison.
 * @param {object} value
 * @return {string}
 */
function payloadHash(value) {
  const canon = JSON.stringify(value, Object.keys(value).sort());
  return crypto.createHash("sha256").update(canon).digest("hex");
}

/**
 * Firestore Timestamp | Date | null -> epoch ms (0 when absent).
 * @param {*} v
 * @return {number}
 */
function toMs(v) {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.toDate === "function") return v.toDate().getTime();
  return Number(v) || 0;
}

/**
 * Firestore document -> contract FilmState (wire encoding).
 * @param {object} doc
 * @return {object}
 */
function toFilmState(doc) {
  const out = {};
  for (const k of Object.keys(c.schemas.filmState.shape)) {
    out[k] = c.FILM_TIMESTAMP_FIELDS.includes(k) ?
      toWireTimestamp(doc[k]) : (doc[k] === undefined ? null : doc[k]);
  }
  return out;
}

/**
 * Identity gate: token checks plus the LIVE user record so disabling, beta
 * removal and session revocation apply at once. Returns an error response or
 * null.
 * @param {object} auth CallableRequest.auth
 * @param {object} deps
 * @return {Promise<?object>}
 */
async function identityError(auth, deps) {
  if (!auth || !auth.uid || !auth.token) {
    return err("unauthenticated", "sign-in-required");
  }
  const token = auth.token;
  const provider = token.firebase && token.firebase.sign_in_provider;
  if (!provider || provider === "anonymous") {
    return err("permission-denied", "anonymous-not-allowed");
  }
  if (token.email_verified !== true) {
    return err("permission-denied", "email-not-verified");
  }
  let user;
  try {
    user = await deps.getUser(auth.uid);
  } catch (_) {
    return err("unauthenticated", "sign-in-required");
  }
  if (!user || user.disabled) {
    return err("unauthenticated", "account-disabled");
  }
  const validAfter = user.tokensValidAfterTime ?
    Date.parse(user.tokensValidAfterTime) : 0;
  const authTimeMs = Number(token.auth_time || 0) * 1000;
  if (validAfter && authTimeMs < validAfter) {
    return err("unauthenticated", "sign-in-required");
  }
  if (!user.customClaims || user.customClaims.beta !== true) {
    return err("permission-denied", "beta-access-required");
  }
  return null;
}

/** Thrown inside a transaction to return a contract error without writes. */
class ContractOutcome extends Error {
  /**
   * @param {object} response {ok:false, error}
   */
  constructor(response) {
    super(response.error.reason);
    this.name = "ContractOutcome";
    this.response = response;
  }
}

/**
 * Build the two FILM-S1 callable handlers.
 * @param {object} deps
 * @param {function(): boolean} deps.isEnabled COACH_CORE_FILM_ENABLED
 * @param {function(string): Promise<object>} deps.getUser auth user record
 * @param {object} deps.db Admin Firestore (or test double)
 * @param {function} deps.deleteObject ({name, generation?}) => Promise<bool>;
 *   deletes exactly one object (generation-matched when given); resolves
 *   false when it did not exist
 * @param {object} deps.logger
 * @param {function(): Date} [deps.now]
 * @param {function(): string} [deps.newFilmId] must return a UUID v4
 * @return {{reserve: function, abandon: function}}
 */
function createFilmHandlers(deps) {
  const now = deps.now || (() => new Date());
  const newFilmId = deps.newFilmId || (() => crypto.randomUUID());
  const db = deps.db;

  /**
   * Kill switch, identity, envelope + payload parsing.
   * @param {object} request
   * @param {string} action the callable's own action
   * @return {Promise<{error: object}|{env: object}>}
   */
  async function preamble(request, action) {
    if (!deps.isEnabled()) {
      // Feature off (default while D3/D7 are placeholders). Retryable per
      // the contract table; the client shows "not available yet".
      return {error: err("unavailable", "backend-unavailable")};
    }
    const idErr = await identityError(request && request.auth, deps);
    if (idErr) return {error: idErr};
    const env = c.schemas.requestEnvelope.safeParse(request.data);
    if (!env.success) {
      return {error: err("invalid-argument", "schema-invalid")};
    }
    if (env.data.action !== action) {
      return {error: err("invalid-argument", "action-mismatch")};
    }
    const payload = c.PAYLOAD_SCHEMAS[action].safeParse(env.data.payload);
    if (!payload.success) {
      return {error: err("invalid-argument", "schema-invalid")};
    }
    return {env: {...env.data, payload: payload.data}};
  }

  /**
   * @param {object} tx
   * @param {object} opRef
   * @param {object} env
   * @return {Promise<?object>} stored response when this is a replay
   */
  async function replayOrConflict(tx, opRef, env) {
    const snap = await tx.get(opRef);
    if (!snap.exists) return null;
    const op = snap.data();
    if (op.action !== env.action ||
        op.payloadHash !== payloadHash(env.payload)) {
      throw new ContractOutcome(err("conflict", "operation-id-reused"));
    }
    return op.response;
  }

  /**
   * @param {object} tx
   * @param {object} teamRef
   * @param {string} uid
   */
  async function assertOwner(tx, teamRef, uid) {
    const snap = await tx.get(teamRef);
    if (!snap.exists || snap.data().ownerId !== uid) {
      // Same answer for "missing" and "not yours" (no team enumeration).
      throw new ContractOutcome(err("permission-denied", "not-team-owner"));
    }
  }

  /**
   * @param {string} uid
   * @param {object} env
   * @param {object} response
   * @param {Date} at
   * @return {object}
   */
  function opRecord(uid, env, response, at) {
    return {
      uid, action: env.action, schemaVersion: c.CONTRACT_VERSION,
      payloadHash: payloadHash(env.payload), response, createdAt: at,
    };
  }

  /**
   * Run `body` in a transaction; a ContractOutcome becomes a returned error.
   * @param {function(object): Promise<object>} body
   * @return {Promise<object>}
   */
  async function contractTransaction(body) {
    try {
      return await db.runTransaction(body);
    } catch (e) {
      if (e instanceof ContractOutcome) return {response: e.response};
      throw e;
    }
  }

  // ------------------------------------------------------------ reserve

  /**
   * reserveFilmUpload
   * @param {object} request CallableRequest
   * @return {Promise<object>} {ok:true,data} | {ok:false,error}
   */
  async function reserve(request) {
    const pre = await preamble(request, c.ACTIONS.reserveFilmUpload);
    if (pre.error) return pre.error;
    const env = pre.env;
    const uid = request.auth.uid;
    const p = env.payload;

    // Value checks with distinct reasons (contract doc §2). The Storage rule
    // repeats size/type against the real object.
    if (!LIMITS.allowedContentTypes.includes(p.declaredContentType)) {
      return err("limit-exceeded", "format-not-allowed");
    }
    if (p.declaredBytes > LIMITS.maxBytes) {
      return err("limit-exceeded", "bytes-over-limit");
    }
    if (p.rightsAcknowledged !== true) {
      return err("invalid-argument", "rights-acknowledgement-required");
    }
    if (!LIMITS.acceptedRightsWordingVersions
        .includes(p.rightsWordingVersion)) {
      return err("failed-precondition", "rights-wording-outdated");
    }

    const at = now();
    const teamRef = db.collection("teams").doc(p.teamId);
    const ledgerRef = teamRef.collection("filmLedger").doc("counts");
    const filmsCol = teamRef.collection("films");
    const opRef = db.collection("filmOperations")
        .doc(`${uid}__${env.operationId}`);

    const result = await contractTransaction(async (tx) => {
      const replay = await replayOrConflict(tx, opRef, env);
      if (replay) return {replay: true, response: replay};

      await assertOwner(tx, teamRef, uid);

      // Lazy expiry: live reservations whose lifetime has passed release
      // their slot in the same transaction that may consume one. Equality on
      // `status` only (no composite index); the result is bounded by the cap.
      const reservedSnap = await tx.get(filmsCol
          .where("status", "==", "reserved").limit(LIMITS.teamFilmCap));
      const ledgerSnap = await tx.get(ledgerRef);
      let active = ledgerSnap.exists ? (ledgerSnap.data().active || 0) : 0;

      let released = 0;
      for (const d of reservedSnap.docs) {
        const film = d.data();
        if (toMs(film.reservationExpiresAt) > at.getTime()) continue;
        tx.update(d.ref, {status: "expired", statusChangedAt: at});
        released += 1;
      }
      active = Math.max(0, active - released);

      if (active >= LIMITS.teamFilmCap) {
        throw new ContractOutcome(err("team-cap-reached", "team-film-cap"));
      }

      const filmId = newFilmId();
      const filmRef = filmsCol.doc(filmId);
      const expiresAt = new Date(at.getTime() + LIMITS.reservationLifetimeMs);
      const doc = {
        filmId,
        teamId: p.teamId,
        createdBy: uid,
        status: "reserved",
        createdAt: at,
        statusChangedAt: at,
        reservationExpiresAt: expiresAt,
        declaredBytes: p.declaredBytes,
        declaredContentType: p.declaredContentType,
        fileName: p.fileName,
        rightsWordingVersion: p.rightsWordingVersion,
        rightsAcknowledgedAt: at,
        uploadPath: c.uploadPathFor(p.teamId, filmId),
        objectGeneration: null,
        rejectionReason: null,
        abandonedAt: null,
      };
      tx.create(filmRef, doc);
      tx.set(ledgerRef, {active: active + 1, updatedAt: at}, {merge: true});

      const film = toFilmState(doc);
      const response = {ok: true, data: {
        filmId, uploadPath: film.uploadPath,
        expiresAt: film.reservationExpiresAt, film,
      }};
      tx.create(opRef, opRecord(uid, env, response, at));
      return {replay: false, response};
    });

    deps.logger.info("film.reserve", {
      uid, teamId: p.teamId, ok: result.response.ok,
      replay: result.replay === true,
      filmId: result.response.ok ? result.response.data.filmId : null,
      reason: result.response.ok ? null : result.response.error.reason,
    });
    return result.response;
  }

  // ------------------------------------------------------------ abandon

  /**
   * abandonFilmUpload
   * @param {object} request CallableRequest
   * @return {Promise<object>} {ok:true,data} | {ok:false,error}
   */
  async function abandon(request) {
    const pre = await preamble(request, c.ACTIONS.abandonFilmUpload);
    if (pre.error) return pre.error;
    const env = pre.env;
    const uid = request.auth.uid;
    const p = env.payload;
    const at = now();

    const teamRef = db.collection("teams").doc(p.teamId);
    const ledgerRef = teamRef.collection("filmLedger").doc("counts");
    const filmRef = teamRef.collection("films").doc(p.filmId);
    const opRef = db.collection("filmOperations")
        .doc(`${uid}__${env.operationId}`);

    const result = await contractTransaction(async (tx) => {
      const replay = await replayOrConflict(tx, opRef, env);
      if (replay) return {replay: true, response: replay, cleanup: null};

      await assertOwner(tx, teamRef, uid);

      const filmSnap = await tx.get(filmRef);
      if (!filmSnap.exists) {
        throw new ContractOutcome(
            err("failed-precondition", "film-not-found"));
      }
      const film = filmSnap.data();
      if (film.createdBy !== uid) {
        throw new ContractOutcome(err("permission-denied", "not-team-owner"));
      }

      if (film.status === "abandoned") {
        // Idempotent cancel under a NEW operationId: film unchanged.
        const response = {ok: true, data: {
          filmId: p.filmId, previousStatus: "abandoned",
          film: toFilmState(film),
        }};
        tx.create(opRef, opRecord(uid, env, response, at));
        return {replay: false, response, cleanup: null};
      }
      if (!c.TRANSITIONS[film.status] ||
          !c.TRANSITIONS[film.status].includes("abandoned")) {
        // ready | rejected | expired
        throw new ContractOutcome(
            err("failed-precondition", "invalid-state"));
      }

      // reserved | validating -> abandoned (both hold a slot)
      const ledgerSnap = await tx.get(ledgerRef);
      const active = ledgerSnap.exists ? (ledgerSnap.data().active || 0) : 0;
      tx.set(ledgerRef, {active: Math.max(0, active - 1), updatedAt: at},
          {merge: true});
      const next = {...film, status: "abandoned", statusChangedAt: at,
        abandonedAt: at};
      tx.update(filmRef, {status: "abandoned", statusChangedAt: at,
        abandonedAt: at});
      const response = {ok: true, data: {
        filmId: p.filmId, previousStatus: film.status, film: toFilmState(next),
      }};
      tx.create(opRef, opRecord(uid, env, response, at));
      return {
        replay: false,
        response,
        cleanup: {
          name: film.uploadPath || c.uploadPathFor(p.teamId, p.filmId),
          generation: film.objectGeneration || undefined,
        },
      };
    });

    // After the status change is durable, remove this reservation's object
    // (and only that object). A late finalize for a now-abandoned film is
    // handled by the quarantine trigger, which deletes its exact generation.
    let removed = null;
    if (result.cleanup) {
      try {
        removed = await deps.deleteObject(result.cleanup);
      } catch (e) {
        removed = false;
        deps.logger.warn("film.abandon.cleanup-failed", {
          uid, teamId: p.teamId, filmId: p.filmId, error: String(e && e.code),
        });
      }
    }
    deps.logger.info("film.abandon", {
      uid, teamId: p.teamId, filmId: p.filmId, ok: result.response.ok,
      replay: result.replay === true, removed,
      reason: result.response.ok ? null : result.response.error.reason,
    });
    return result.response;
  }

  return {reserve, abandon};
}

module.exports = {createFilmHandlers, payloadHash, toMs, toFilmState};
