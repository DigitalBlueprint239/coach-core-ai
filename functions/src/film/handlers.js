"use strict";
/**
 * FILM-S1 server handlers for coach-film.v1:
 *   reserveFilmUpload, abandonFilmUpload (callables) and the quarantine
 *   object-finalized handler.
 *
 * Every external effect is injected (`deps`) so the emulator tests drive the
 * real Firestore/Storage emulators with a fake identity source and clock.
 *
 * Data written (server only; clients can never write any of it):
 *   teams/{teamId}/films/{filmId}      FilmState, *At fields as Timestamp
 *   teams/{teamId}/filmLedger/cap      {slots: {filmId: {status, expiresAt}}}
 *   filmOperations/{sha256(uid,opId)}  idempotency record (success only)
 *
 * Every status change updates the film doc AND its ledger slot in ONE
 * transaction, so the ledger is the authoritative cap count.
 */
const crypto = require("crypto");
const c = require("./contract");
const {LIMITS} = require("./limits");

const OP_RETENTION_MS = 24 * 60 * 60 * 1000; // DELEGATED (contract doc §7)
const QUARANTINE_RE =
  /^quarantine\/([A-Za-z0-9_-]{1,128})\/([0-9a-f-]{36})\/source\.mp4$/;

/** A contract outcome that ends a handler early. */
class Outcome extends Error {
  /** @param {object} response */
  constructor(response) {
    super("contract outcome");
    this.response = response;
  }
}
const stop = (code, reason) => new Outcome(c.errorResponseFor(code, reason));

/**
 * Identity: token AND live user record (mirrors the coachAI gateway).
 * account-not-found maps to account-disabled and session-revoked maps to
 * sign-in-required, the nearest reasons in the coach-film.v1 closed set.
 * @param {object} auth
 * @param {function(string): Promise<object>} getUser
 * @return {Promise<string>} uid
 */
async function assertEligible(auth, getUser) {
  if (!auth || !auth.uid || !auth.token) {
    throw stop("unauthenticated", "sign-in-required");
  }
  const t = auth.token;
  const provider = t.firebase && t.firebase.sign_in_provider;
  if (!provider || provider === "anonymous") {
    throw stop("permission-denied", "anonymous-not-allowed");
  }
  if (t.email_verified !== true) {
    throw stop("permission-denied", "email-not-verified");
  }
  let user;
  try {
    user = await getUser(auth.uid);
  } catch (_) {
    throw stop("unauthenticated", "account-disabled");
  }
  if (!user || user.disabled) {
    throw stop("unauthenticated", "account-disabled");
  }
  const validAfter = user.tokensValidAfterTime ?
    Date.parse(user.tokensValidAfterTime) : 0;
  if (validAfter && Number(t.auth_time || 0) * 1000 < validAfter) {
    throw stop("unauthenticated", "sign-in-required");
  }
  if (!user.customClaims || user.customClaims.beta !== true) {
    throw stop("permission-denied", "beta-access-required");
  }
  return auth.uid;
}

/**
 * Parse envelope + payload for one callable.
 * @param {string} action
 * @param {*} data
 * @return {{operationId: string, payload: object}}
 */
function parseRequest(action, data) {
  const env = c.schemas.requestEnvelope.safeParse(data);
  if (!env.success) throw stop("invalid-argument", "schema-invalid");
  if (env.data.action !== action) {
    throw stop("invalid-argument", "action-mismatch");
  }
  const p = c.PAYLOAD_SCHEMAS[action].safeParse(env.data.payload);
  if (!p.success) throw stop("invalid-argument", "schema-invalid");
  return {operationId: env.data.operationId, payload: p.data};
}

/**
 * Stable JSON (sorted keys) for payload hashing.
 * @param {*} v
 * @return {string}
 */
function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v).sort().map((k) =>
      `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

/**
 * Firestore doc -> wire FilmState.
 * @param {object} d stored data
 * @return {object}
 */
function toFilmState(d) {
  const out = {};
  for (const k of Object.keys(c.schemas.filmState.shape)) {
    const v = d[k] === undefined ? null : d[k];
    out[k] = c.FILM_TIMESTAMP_FIELDS.includes(k) ? c.toWireTimestamp(v) : v;
  }
  return out;
}

/**
 * @param {object} deps
 * @param {object} deps.db admin Firestore
 * @param {object} deps.Timestamp admin Timestamp class
 * @param {function(string): Promise<object>} deps.getUser
 * @param {function(string): Promise<void>} deps.deleteObject quarantine path
 * @param {function(string, number): Promise<Buffer>} deps.readHead
 * @param {object} deps.logger
 * @param {function(): Date} [deps.now]
 * @param {function(): string} [deps.newFilmId]
 * @return {object} reserve, abandon and finalize handlers
 */
function createFilmHandlers(deps) {
  const {db, Timestamp, logger} = deps;
  const now = deps.now || (() => new Date());
  const newFilmId = deps.newFilmId || (() => crypto.randomUUID());
  const ts = (d) => Timestamp.fromDate(d);

  const teamRef = (teamId) => db.collection("teams").doc(teamId);
  const filmRef = (teamId, filmId) =>
    teamRef(teamId).collection("films").doc(filmId);
  const ledgerRef = (teamId) =>
    teamRef(teamId).collection("filmLedger").doc("cap");
  const opRef = (uid, operationId) =>
    db.collection("filmOperations").doc(sha256(`${uid}\n${operationId}`));

  /**
   * Wrap a handler: contract outcomes are returned, unexpected failures
   * become unavailable/backend-unavailable (retryable with the same opId).
   * @param {string} name
   * @param {function(object): Promise<object>} fn
   * @return {function(object): Promise<object>}
   */
  function callable(name, fn) {
    return async (request) => {
      try {
        return await fn(request);
      } catch (err) {
        if (err instanceof Outcome) return err.response;
        logger.error(`film.${name}.error`,
            {error: String(err && err.message)});
        return c.errorResponseFor("unavailable", "backend-unavailable");
      }
    };
  }

  /**
   * Inside a transaction: replay, conflict, or null (new operation).
   * @param {object} tx
   * @param {object} ref
   * @param {string} action
   * @param {string} payloadHash
   * @return {Promise<?object>}
   */
  async function checkOperation(tx, ref, action, payloadHash) {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const op = snap.data();
    if (op.action !== action || op.payloadHash !== payloadHash) {
      throw stop("conflict", "operation-id-reused");
    }
    return JSON.parse(op.responseJson);
  }

  /**
   * Record a successful response for replay.
   * @param {object} tx
   * @param {object} ref
   * @param {object} r {uid, operationId, action, payloadHash, response, at}
   */
  function recordOperation(tx, ref, r) {
    const {uid, operationId, action, payloadHash, response, at} = r;
    tx.create(ref, {
      uid, operationId, action, payloadHash,
      responseJson: JSON.stringify(response),
      createdAt: ts(at),
      expiresAt: ts(new Date(at.getTime() + OP_RETENTION_MS)),
    });
  }

  /**
   * Throws unless uid owns teamId (missing team -> same answer).
   * @param {object} tx
   * @param {string} teamId
   * @param {string} uid
   */
  async function assertOwner(tx, teamId, uid) {
    const team = await tx.get(teamRef(teamId));
    if (!team.exists || team.data().ownerId !== uid) {
      throw stop("permission-denied", "not-team-owner");
    }
  }

  const reserveFilmUpload = callable("reserve", async (request) => {
    const uid = await assertEligible(request && request.auth, deps.getUser);
    const action = c.ACTIONS.reserveFilmUpload;
    const {operationId, payload} = parseRequest(action, request.data);
    const payloadHash = sha256(canonical(payload));
    const at = now();

    return db.runTransaction(async (tx) => {
      const oRef = opRef(uid, operationId);
      const replay = await checkOperation(tx, oRef, action, payloadHash);
      if (replay) return replay;
      await assertOwner(tx, payload.teamId, uid);

      if (payload.rightsAcknowledged !== true) {
        throw stop("invalid-argument", "rights-acknowledgement-required");
      }
      if (!LIMITS.allowedContentTypes.includes(payload.declaredContentType)) {
        throw stop("limit-exceeded", "format-not-allowed");
      }
      if (payload.declaredBytes > LIMITS.maxBytes) {
        throw stop("limit-exceeded", "bytes-over-limit");
      }
      if (!LIMITS.acceptedRightsWordingVersions.includes(
          payload.rightsWordingVersion)) {
        throw stop("failed-precondition", "rights-wording-outdated");
      }

      const lRef = ledgerRef(payload.teamId);
      const lSnap = await tx.get(lRef);
      const slots = {...((lSnap.exists && lSnap.data().slots) || {})};
      // Lazy expiry: a reserved slot past its expiry is released here.
      for (const [id, s] of Object.entries(slots)) {
        if (s.status === "reserved" && s.expiresAt.toMillis() <= at.getTime()) {
          delete slots[id];
          tx.update(filmRef(payload.teamId, id), {
            status: "expired", statusChangedAt: ts(at),
          });
        }
      }
      if (Object.keys(slots).length >= LIMITS.teamFilmCap) {
        throw stop("team-cap-reached", "team-film-cap");
      }

      const filmId = newFilmId();
      const expires = new Date(at.getTime() + LIMITS.reservationLifetimeMs);
      const doc = {
        filmId,
        teamId: payload.teamId,
        createdBy: uid,
        status: "reserved",
        createdAt: ts(at),
        statusChangedAt: ts(at),
        reservationExpiresAt: ts(expires),
        declaredBytes: payload.declaredBytes,
        declaredContentType: payload.declaredContentType,
        fileName: payload.fileName,
        rightsWordingVersion: payload.rightsWordingVersion,
        rightsAcknowledgedAt: ts(at),
        uploadPath: c.uploadPathFor(payload.teamId, filmId),
        objectGeneration: null,
        rejectionReason: null,
        abandonedAt: null,
      };
      slots[filmId] = {status: "reserved", expiresAt: ts(expires)};
      tx.create(filmRef(payload.teamId, filmId), doc);
      tx.set(lRef, {slots, updatedAt: ts(at)});

      const film = toFilmState(doc);
      const response = {ok: true, data: {
        filmId, uploadPath: film.uploadPath,
        expiresAt: film.reservationExpiresAt, film,
      }};
      recordOperation(tx, oRef,
          {uid, operationId, action, payloadHash, response, at});
      return response;
    });
  });

  const abandonFilmUpload = callable("abandon", async (request) => {
    const uid = await assertEligible(request && request.auth, deps.getUser);
    const action = c.ACTIONS.abandonFilmUpload;
    const {operationId, payload} = parseRequest(action, request.data);
    const payloadHash = sha256(canonical(payload));
    const at = now();
    let deletePath = null;

    const response = await db.runTransaction(async (tx) => {
      deletePath = null;
      const oRef = opRef(uid, operationId);
      const replay = await checkOperation(tx, oRef, action, payloadHash);
      if (replay) return replay;
      await assertOwner(tx, payload.teamId, uid);

      const fRef = filmRef(payload.teamId, payload.filmId);
      const fSnap = await tx.get(fRef);
      if (!fSnap.exists) throw stop("failed-precondition", "film-not-found");
      const lRef = ledgerRef(payload.teamId);
      const lSnap = await tx.get(lRef);
      const d = fSnap.data();
      const previousStatus = d.status;

      let next = d;
      if (previousStatus === "reserved" || previousStatus === "validating") {
        next = {...d, status: "abandoned", statusChangedAt: ts(at),
          abandonedAt: ts(at)};
        tx.update(fRef, {status: "abandoned", statusChangedAt: ts(at),
          abandonedAt: ts(at)});
        const slots = {...((lSnap.exists && lSnap.data().slots) || {})};
        delete slots[payload.filmId];
        tx.set(lRef, {slots, updatedAt: ts(at)});
        deletePath = d.uploadPath;
      } else if (previousStatus !== "abandoned") {
        throw stop("failed-precondition", "invalid-state");
      }

      const out = {ok: true, data: {
        filmId: payload.filmId, previousStatus, film: toFilmState(next),
      }};
      recordOperation(tx, oRef,
          {uid, operationId, action, payloadHash, response: out, at});
      return out;
    });

    if (deletePath) {
      try {
        await deps.deleteObject(deletePath);
      } catch (err) {
        // A late or missing object is reconciled by the finalize handler.
        logger.warn("film.abandon.delete_failed", {error: String(err)});
      }
    }
    return response;
  });

  /**
   * Storage onObjectFinalized for quarantine/. Never sets `ready`.
   * @param {{name: string, size: (number|string), contentType: string,
   *   generation: (number|string)}} object
   * @return {Promise<string>} outcome label (for tests and logs)
   */
  async function onQuarantineFinalized(object) {
    const m = QUARANTINE_RE.exec(object && object.name || "");
    if (!m) return "ignored-path";
    const [, teamId, filmId] = m;
    const generation = String(object.generation);
    const size = Number(object.size);
    const at = now();

    let head = null;
    try {
      head = await deps.readHead(object.name, 64);
    } catch (_) {
      head = null; // treated as an invalid signature
    }

    let deleteAfter = false;
    const outcome = await db.runTransaction(async (tx) => {
      deleteAfter = false;
      const fRef = filmRef(teamId, filmId);
      const fSnap = await tx.get(fRef);
      const lRef = ledgerRef(teamId);
      const lSnap = await tx.get(lRef);
      if (!fSnap.exists) {
        deleteAfter = true;
        return "no-reservation";
      }
      const d = fSnap.data();
      if (d.objectGeneration === generation) return "duplicate-event";
      const slots = {...((lSnap.exists && lSnap.data().slots) || {})};

      if (d.status !== "reserved") {
        deleteAfter = true; // abandoned/expired/rejected never resurrect
        return `stale-${d.status}`;
      }
      if (d.reservationExpiresAt.toMillis() <= at.getTime()) {
        delete slots[filmId];
        tx.update(fRef, {status: "expired", statusChangedAt: ts(at)});
        tx.set(lRef, {slots, updatedAt: ts(at)});
        deleteAfter = true;
        return "expired";
      }

      let reason = null;
      if (size !== d.declaredBytes) reason = "size-mismatch";
      else if (object.contentType !== d.declaredContentType) {
        reason = "content-type-mismatch";
      } else if (!isFtypHead(head)) reason = "signature-invalid";

      if (reason) {
        delete slots[filmId];
        tx.update(fRef, {status: "rejected", statusChangedAt: ts(at),
          rejectionReason: reason, objectGeneration: generation});
        tx.set(lRef, {slots, updatedAt: ts(at)});
        deleteAfter = true;
        return `rejected-${reason}`;
      }
      slots[filmId] = {...slots[filmId], status: "validating"};
      tx.update(fRef, {status: "validating", statusChangedAt: ts(at),
        objectGeneration: generation});
      tx.set(lRef, {slots, updatedAt: ts(at)});
      return "validating";
    });

    if (deleteAfter) {
      try {
        await deps.deleteObject(object.name);
      } catch (err) {
        logger.warn("film.finalize.delete_failed", {error: String(err)});
      }
    }
    logger.info("film.finalize", {outcome});
    return outcome;
  }

  return {reserveFilmUpload, abandonFilmUpload, onQuarantineFinalized};
}

/**
 * First ISO-BMFF box must be a plausible 'ftyp' box: size 16..64 (fits the
 * bounded read), type 'ftyp', printable 4-char major brand.
 * @param {?Buffer} head
 * @return {boolean}
 */
function isFtypHead(head) {
  if (!head || head.length < 16) return false;
  const boxSize = head.readUInt32BE(0);
  if (boxSize < 16 || boxSize > 64) return false;
  if (head.toString("latin1", 4, 8) !== "ftyp") return false;
  for (let i = 8; i < 12; i++) {
    if (head[i] < 0x20 || head[i] > 0x7e) return false;
  }
  return true;
}

module.exports = {createFilmHandlers, isFtypHead, assertEligible,
  QUARANTINE_RE};
