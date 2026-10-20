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
const {HttpsError} = require("firebase-functions/v2/https");
const c = require("./contract");
const {LIMITS} = require("./limits");
const {createCleanup, cleanupIdFor, GENERATION_RE} = require("./cleanup");

// R4: bounded first-box read (ftyp with up to 252 compatible brands).
const HEAD_READ_BYTES = 1024;

// gRPC / Firestore codes treated as known-transient: ABORTED (contention),
// DEADLINE_EXCEEDED, UNAVAILABLE. Anything else is not retry-eligible.
const TRANSIENT_CODES = new Set([10, 4, 14, "aborted", "deadline-exceeded",
  "unavailable", "ABORTED", "DEADLINE_EXCEEDED", "UNAVAILABLE"]);
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
 * @param {function(): boolean} [deps.isEnabled] film switch (default off in
 *   index.js: COACH_CORE_FILM_ENABLED); callables refuse while false
 * @param {function(): string} deps.cleanupBucketName configured default
 *   bucket name (FILM-S1-C1: every owed delete is a bound filmCleanup record)
 * @param {function(): object} deps.cleanupBucket Bucket from a Storage client
 *   with implicit retries disabled, used only for classified exact deletes
 * @param {function({name: string, generation: string, bytes: number}):
 *   Promise<?Buffer>} deps.readHead first bytes of that generation; null =
 *   that generation no longer exists; throws on transient errors
 * @param {object} deps.logger
 * @param {function(): Date} [deps.now]
 * @param {function(): string} [deps.newFilmId]
 * @param {object} [deps.cleanupLimits] TEST override of CLEANUP_LIMITS
 * @param {function(): number} [deps.monotonicMs]
 * @param {function(): string} [deps.newCleanupHolder]
 * @return {object} reserve, abandon and finalize handlers, plus the
 *   (unexported) bounded cleanup sweep
 */
function createFilmHandlers(deps) {
  const {db, Timestamp, logger} = deps;
  const now = deps.now || (() => new Date());
  const newFilmId = deps.newFilmId || (() => crypto.randomUUID());
  const ts = (d) => Timestamp.fromDate(d);
  const isEnabled = deps.isEnabled || (() => true);

  // FILM-S1-C1: owed deletes are durable filmCleanup obligations, created
  // inside the deciding transaction; attempts go through ONE fenced,
  // counted admission shared with replay and the sweep.
  const cleanupBucketName = () => {
    let name = null;
    try {
      name = deps.cleanupBucketName ? deps.cleanupBucketName() : null;
    } catch (_) {
      name = null;
    }
    if (typeof name !== "string" || !name) {
      logger.error("film.cleanup.config_missing", {what: "bucket"});
      return null;
    }
    return name;
  };
  const cleanup = createCleanup({db, bucketName: cleanupBucketName,
    getBucket: () => deps.cleanupBucket(), now, logger,
    monotonicMs: deps.monotonicMs, newHolder: deps.newCleanupHolder,
    limits: deps.cleanupLimits});

  /**
   * At most one awaited, bounded attempt; never throws and never changes the
   * caller's response or its error class.
   * @param {string} id
   * @param {string} why log label
   */
  async function attemptCleanup(id, why) {
    try {
      const r = await cleanup.attemptOnce(id);
      logger.info("film.object_delete", {why, admission: r.admission,
        result: r.result || null, code: r.code || null});
    } catch (err) {
      logger.warn("film.object_delete_failed",
          {why, code: err && err.code ? String(err.code) : null});
    }
  }

  /**
   * Abandon replay: derive the EXACT record id from the film's recorded
   * source (separate read; no scan) and await at most one eligible attempt.
   * @param {{teamId: string, filmId: string}} payload
   */
  async function replayCleanup(payload) {
    try {
      const snap = await filmRef(payload.teamId, payload.filmId).get();
      const d = snap.exists ? snap.data() : null;
      if (!d || typeof d.objectGeneration !== "string" ||
          typeof d.uploadPath !== "string") {
        return;
      }
      const bucket = cleanupBucketName();
      if (!bucket) return;
      await attemptCleanup(cleanupIdFor(bucket, d.uploadPath,
          d.objectGeneration), "abandon-replay");
    } catch (err) {
      logger.warn("film.object_delete_failed",
          {why: "abandon-replay", code: err && err.code ? String(err.code) :
            null});
    }
  }

  const teamRef = (teamId) => db.collection("teams").doc(teamId);
  const filmRef = (teamId, filmId) =>
    teamRef(teamId).collection("films").doc(filmId);
  const ledgerRef = (teamId) =>
    teamRef(teamId).collection("filmLedger").doc("cap");
  const opRef = (uid, operationId) =>
    db.collection("filmOperations").doc(sha256(`${uid}\n${operationId}`));

  /**
   * Wrap a handler: contract outcomes are returned; KNOWN transient backend
   * failures become unavailable/backend-unavailable (retryable, same opId);
   * anything else is thrown as a sanitized `internal` HttpsError, which the
   * client classifies as sdk/internal (not retry-eligible).
   * @param {string} name
   * @param {function(object): Promise<object>} fn
   * @return {function(object): Promise<object>}
   */
  function callable(name, fn) {
    return async (request) => {
      if (!isEnabled()) {
        // Configuration state, not a transient condition: thrown sanitized
        // internal (client: sdk/internal, not retry-eligible). FILM-S1 is not
        // deployable while D3/D7 are placeholders (deploy guard + this).
        logger.warn(`film.${name}.disabled`);
        throw new HttpsError("internal", "internal");
      }
      try {
        return await fn(request);
      } catch (err) {
        if (err instanceof Outcome) return err.response;
        const transient = err && TRANSIENT_CODES.has(err.code);
        logger.error(`film.${name}.error`,
            {transient, code: err && err.code ? String(err.code) : null});
        if (transient) {
          return c.errorResponseFor("unavailable", "backend-unavailable");
        }
        throw new HttpsError("internal", "internal");
      }
    };
  }

  /**
   * Inside a transaction: replay, conflict, or null (new operation).
   * @param {object} tx
   * @param {object} ref
   * @param {string} action
   * @param {string} payloadHash
   * @param {Date} at request time
   * @return {Promise<?object>}
   */
  async function checkOperation(tx, ref, action, payloadHash, at) {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const op = snap.data();
    if (op.action !== action || op.payloadHash !== payloadHash) {
      throw stop("conflict", "operation-id-reused");
    }
    // Records are never pruned (tombstones); past the window the same key is
    // refused, so an old retry can never create a second reservation.
    if (at.getTime() >= op.replayableUntil.toMillis()) {
      throw stop("failed-precondition", "operation-expired");
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
      replayableUntil: ts(new Date(at.getTime() +
        LIMITS.operationReplayWindowMs)),
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
      const replay = await checkOperation(tx, oRef, action, payloadHash, at);
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
      // Lazy expiry: a reserved slot past its expiry is released here. The
      // film docs are read first (all reads precede writes); a slot whose
      // document is missing or no longer reserved is dropped, never updated.
      const lapsed = Object.entries(slots).filter(([, s]) =>
        s.status === "reserved" && s.expiresAt.toMillis() <= at.getTime());
      const lapsedSnaps = await Promise.all(lapsed.map(([id]) =>
        tx.get(filmRef(payload.teamId, id))));
      lapsed.forEach(([id], i) => {
        delete slots[id];
        const snap = lapsedSnaps[i];
        if (snap.exists && snap.data().status === "reserved") {
          tx.update(snap.ref, {status: "expired", statusChangedAt: ts(at)});
        } else {
          logger.warn("film.ledger.orphan_slot_dropped",
              {exists: snap.exists});
        }
      });
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
    let obligation = null;
    let replayed = false;

    const response = await db.runTransaction(async (tx) => {
      obligation = null;
      replayed = false;
      const oRef = opRef(uid, operationId);
      const replay = await checkOperation(tx, oRef, action, payloadHash, at);
      if (replay) {
        replayed = true;
        return replay;
      }
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
        // Only a generation this film recorded is owed here. An object whose
        // finalize has not been processed yet is owed by that event (exact
        // generation) when it sees the film is abandoned. The obligation is
        // created (read before any write) in THIS transaction.
        if (d.objectGeneration) {
          obligation = await cleanup.obligate(tx, {
            bucket: cleanupBucketName(), name: d.uploadPath,
            generation: d.objectGeneration}, "abandon", at);
        }
        next = {...d, status: "abandoned", statusChangedAt: ts(at),
          abandonedAt: ts(at)};
        tx.update(fRef, {status: "abandoned", statusChangedAt: ts(at),
          abandonedAt: ts(at)});
        const slots = {...((lSnap.exists && lSnap.data().slots) || {})};
        delete slots[payload.filmId];
        tx.set(lRef, {slots, updatedAt: ts(at)});
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

    if (replayed) await replayCleanup(payload);
    else if (obligation) await attemptCleanup(obligation.id, "abandon");
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

    // PR86 C1-R1: a cleanup-owing decision never commits without its durable
    // record. Without a resolvable configured bucket nothing is decided
    // (thrown before the head read: no state change, like the R3 transient
    // read). An event for another bucket, or with no bucket or a
    // non-decimal generation, is not ours: no read, no decision, no record.
    const configured = cleanupBucketName();
    if (!configured) {
      throw Object.assign(new Error("film cleanup bucket not configured"),
          {code: "failed-precondition"});
    }
    if (object.bucket !== configured) {
      logger.warn("film.finalize", {outcome: "ignored-bucket"});
      return "ignored-bucket";
    }
    if (!GENERATION_RE.test(generation)) {
      logger.warn("film.finalize", {outcome: "ignored-generation"});
      return "ignored-generation";
    }

    // R3: a transient read error throws (no state change, nothing deleted);
    // a vanished generation leaves the reservation untouched. Only a head
    // that was actually read can cause a signature rejection.
    const head = await deps.readHead(
        {name: object.name, generation, bytes: HEAD_READ_BYTES});
    if (head === null) {
      logger.info("film.finalize", {outcome: "object-gone"});
      return "object-gone";
    }

    // The event's exact bucket/name/generation; a different bucket or a
    // non-canonical name creates no record and no attempt (fails closed).
    const target = {bucket: object.bucket, name: object.name, generation};
    let obligation = null;
    const owe = async (tx, origin) => {
      obligation = await cleanup.obligate(tx, target, origin, at);
    };
    const outcome = await db.runTransaction(async (tx) => {
      obligation = null;
      const fRef = filmRef(teamId, filmId);
      const fSnap = await tx.get(fRef);
      const lRef = ledgerRef(teamId);
      const lSnap = await tx.get(lRef);
      if (!fSnap.exists) {
        await owe(tx, "finalize-no-reservation");
        return "no-reservation";
      }
      const d = fSnap.data();
      if (d.objectGeneration === generation) return "duplicate-event";
      const slots = {...((lSnap.exists && lSnap.data().slots) || {})};

      if (d.status !== "reserved") {
        // abandoned/expired/rejected never resurrect
        await owe(tx, `finalize-stale-${d.status}`);
        return `stale-${d.status}`;
      }
      if (d.reservationExpiresAt.toMillis() <= at.getTime()) {
        await owe(tx, "finalize-expired");
        delete slots[filmId];
        tx.update(fRef, {status: "expired", statusChangedAt: ts(at)});
        tx.set(lRef, {slots, updatedAt: ts(at)});
        return "expired";
      }

      let reason = null;
      if (size !== d.declaredBytes) reason = "size-mismatch";
      else if (object.contentType !== d.declaredContentType) {
        reason = "content-type-mismatch";
      } else if (!isFtypHead(head)) reason = "signature-invalid";

      if (reason) {
        await owe(tx, `finalize-rejected-${reason}`);
        delete slots[filmId];
        tx.update(fRef, {status: "rejected", statusChangedAt: ts(at),
          rejectionReason: reason, objectGeneration: generation});
        tx.set(lRef, {slots, updatedAt: ts(at)});
        return `rejected-${reason}`;
      }
      slots[filmId] = {...slots[filmId], status: "validating"};
      tx.update(fRef, {status: "validating", statusChangedAt: ts(at),
        objectGeneration: generation});
      tx.set(lRef, {slots, updatedAt: ts(at)});
      return "validating";
    });

    // Immediate attempt only when THIS invocation created the obligation: a
    // duplicate event admits nothing (the sweep owns later attempts).
    if (obligation && obligation.created) {
      await attemptCleanup(obligation.id, outcome);
    }
    logger.info("film.finalize", {outcome});
    return outcome;
  }

  return {reserveFilmUpload, abandonFilmUpload, onQuarantineFinalized,
    retryPendingFilmCleanups: cleanup.retryPendingFilmCleanups};
}

/**
 * First ISO-BMFF box must be a plausible, complete 'ftyp' box inside the
 * bounded read: 16 <= size <= HEAD_READ_BYTES, size within the bytes read,
 * (size - 16) a multiple of 4 (compatible brands), type 'ftyp', printable
 * 4-char major brand. FILM-S1 intake check only; NOT media validation.
 * @param {?Buffer} head
 * @return {boolean}
 */
function isFtypHead(head) {
  if (!head || head.length < 16) return false;
  const boxSize = head.readUInt32BE(0);
  if (boxSize < 16 || boxSize > HEAD_READ_BYTES || boxSize > head.length ||
      (boxSize - 16) % 4 !== 0) {
    return false;
  }
  if (head.toString("latin1", 4, 8) !== "ftyp") return false;
  for (let i = 8; i < 12; i++) {
    if (head[i] < 0x20 || head[i] > 0x7e) return false;
  }
  return true;
}

module.exports = {createFilmHandlers, isFtypHead, assertEligible,
  QUARANTINE_RE, HEAD_READ_BYTES};
