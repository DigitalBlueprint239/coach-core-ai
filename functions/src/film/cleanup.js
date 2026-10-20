"use strict";
/**
 * FILM-S1-C1: durable, generation-safe cleanup of quarantine source objects
 * (proposal r3, #39 c-6299776477, with Codex's T7-0 clarification
 * c-6299971919; owner authorization C1-A c-6300236512). TEST_ONLY slice.
 *
 * Every delete the S1 handlers owe is first recorded, inside the same
 * Firestore transaction as the decision, as a `filmCleanup/{id}` obligation
 * bound to one exact bucket / object name / generation. Attempts are then
 * admitted by ONE fenced transaction shared by every entry point (immediate,
 * abandon replay, sweep), counted BEFORE any Storage I/O, capped, and backed
 * off; results are written only by the holder of the current lease and
 * fence. No Storage call is ever made inside a transaction.
 *
 * Constants are TEST placeholders (like D3-D7), not approved production
 * values: decision C1-D1.
 */
const crypto = require("crypto");
const {z} = require("zod");
const c = require("./contract");

/** TEST placeholders (C1-D1 decides production values). */
const CLEANUP_LIMITS = Object.freeze({
  status: "TEST_PLACEHOLDER",
  maxAttempts: 8,
  backoffBaseMs: 60 * 1000,
  backoffMaxMs: 6 * 3600 * 1000,
  attemptBudgetMs: 10 * 1000,
  leaseMarginMs: 5 * 1000,
  sweepBatchMax: 25,
  sweepInvocationBudgetMs: 60 * 1000,
});

/** The sweep is TEST_ONLY: exporting it blocks deploy (guard + tests). */
const CLEANUP_SWEEP_DESIGNATION = Object.freeze({
  designation: "TEST_ONLY",
  marker: "film-cleanup-sweep",
  authorizationRecord: null,
});
/** Placeholder only; scheduling/activation is decision C1-D1. */
const SWEEP_SCHEDULE_PLACEHOLDER = "every 24 hours";

const CLEANUP_COLLECTION = "filmCleanup";
const GENERATION_RE = /^[1-9][0-9]{0,19}$/;
/** Same pattern as handlers.QUARANTINE_RE (asserted equal by tests). */
const QUARANTINE_RE =
  /^quarantine\/([A-Za-z0-9_-]{1,128})\/([0-9a-f-]{36})\/source\.mp4$/;

const STALE_STATUSES = c.FILM_STATUSES.filter((s) => s !== "reserved");
const REJECT_REASONS =
  ["size-mismatch", "content-type-mismatch", "signature-invalid"];
const ORIGINS = Object.freeze([
  "abandon",
  "finalize-no-reservation",
  ...STALE_STATUSES.map((s) => `finalize-stale-${s}`),
  "finalize-expired",
  ...REJECT_REASONS.map((r) => `finalize-rejected-${r}`),
]);
const TERMINAL = Object.freeze(["deleted", "absent", "mismatch"]);
const STATES = Object.freeze(["pending", ...TERMINAL, "stuck"]);
const RESULTS = Object.freeze([...TERMINAL, "error", "unknown"]);

const ms = z.number().int().nonnegative();
const pos = z.number().int().positive();
const code = z.string().max(64).nullable();
const historyEntry = z.object({
  n: pos, fence: pos, admittedAtMs: ms,
  result: z.enum(RESULTS).nullable(), code, endedAtMs: ms.nullable(),
}).strict();
/** Strict stored record. */
const recordSchema = z.object({
  bucket: z.string().min(1).max(222),
  name: z.string().min(1).max(1024),
  generation: z.string().regex(GENERATION_RE),
  teamId: z.string().min(1).max(128),
  filmId: z.string().min(1).max(64),
  origin: z.enum(ORIGINS),
  createdAtMs: ms,
  state: z.enum(STATES),
  attempts: z.number().int().min(0),
  fence: z.number().int().min(0),
  lease: z.object({holder: z.string().min(1).max(128), fence: pos,
    untilMs: ms}).strict().nullable(),
  history: z.array(historyEntry),
  nextAttemptAtMs: ms.nullable(),
  sweepDueAtMs: ms.nullable(),
  resolvedAtMs: ms.nullable(),
  evidence: z.object({reason: z.string().max(64), code}).strict().nullable(),
}).strict();

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

/**
 * Thrown by `obligate` (PR86 C1-R1): a cleanup-owing decision must never
 * commit without its durable, valid record, so ANY target refusal aborts the
 * deciding transaction before it writes. Code "unavailable": nothing was
 * committed and the same operation can be retried once configuration is
 * back (the S1 callable maps it to unavailable/backend-unavailable).
 */
class CleanupRefused extends Error {
  /** @param {string} problem */
  constructor(problem) {
    super(`cleanup obligation refused: ${problem}`);
    this.name = "CleanupRefused";
    this.problem = problem;
    this.code = "unavailable";
  }
}

/**
 * Record id: sha256(bucket \n name \n generation).
 * @param {string} bucket
 * @param {string} name
 * @param {string} generation decimal string
 * @return {string}
 */
function cleanupIdFor(bucket, name, generation) {
  return sha256(`${bucket}\n${name}\n${generation}`);
}

/**
 * Backoff before attempt n+1, after attempt n was admitted.
 * @param {number} n admitted attempts (>= 1)
 * @param {object} [limits]
 * @return {number}
 */
function backoffMs(n, limits = CLEANUP_LIMITS) {
  return Math.min(limits.backoffBaseMs * 2 ** (n - 1), limits.backoffMaxMs);
}

/**
 * A delete target is valid only for the configured bucket, a canonical
 * quarantine name and a positive decimal generation string.
 * @param {{bucket: *, name: *, generation: *}} t
 * @param {string} bucketName configured default bucket
 * @return {?string} problem, or null
 */
function targetProblem(t, bucketName) {
  if (!t || typeof t !== "object") return "target-missing";
  if (typeof bucketName !== "string" || !bucketName) return "bucket-unset";
  if (t.bucket !== bucketName) return "bucket-mismatch";
  if (typeof t.name !== "string") return "name-invalid";
  const m = QUARANTINE_RE.exec(t.name);
  if (!m || t.name !== c.uploadPathFor(m[1], m[2])) return "name-invalid";
  if (typeof t.generation !== "string" || !GENERATION_RE.test(t.generation)) {
    return "generation-invalid";
  }
  return null;
}

/**
 * Schema + binding + internal consistency. Checked on every read, before any
 * Storage I/O and before any mutation. Invalid records fail closed.
 * @param {string} id document id
 * @param {*} data stored data
 * @param {string} bucketName configured bucket
 * @param {object} [limits]
 * @return {?string} problem, or null
 */
function recordProblem(id, data, bucketName, limits = CLEANUP_LIMITS) {
  const p = recordSchema.safeParse(data);
  if (!p.success) return "schema";
  const r = p.data;
  const t = targetProblem(r, bucketName);
  if (t) return t;
  const m = QUARANTINE_RE.exec(r.name);
  if (m[1] !== r.teamId || m[2] !== r.filmId) return "team-film-mismatch";
  if (id !== cleanupIdFor(r.bucket, r.name, r.generation)) {
    return "id-mismatch";
  }
  if (r.attempts > limits.maxAttempts || r.fence !== r.attempts ||
      r.history.length !== r.attempts) {
    return "attempts-inconsistent";
  }
  for (let i = 0; i < r.history.length; i++) {
    const h = r.history[i];
    const last = i === r.history.length - 1;
    if (h.n !== i + 1 || h.fence !== i + 1 || h.admittedAtMs < r.createdAtMs) {
      return "history-inconsistent";
    }
    if ((h.result === null) !== (h.endedAtMs === null)) {
      return "history-inconsistent";
    }
    if (!last && h.result === null) return "history-inconsistent";
  }
  const open = r.attempts > 0 && r.history[r.attempts - 1].result === null;
  if (r.lease) {
    if (r.state !== "pending" || !open || r.lease.fence !== r.fence) {
      return "lease-inconsistent";
    }
  } else if (open) {
    return "lease-inconsistent";
  }
  if (r.state === "pending") {
    if (r.sweepDueAtMs === null || r.nextAttemptAtMs === null ||
        r.resolvedAtMs !== null) {
      return "pending-not-sweepable";
    }
  } else {
    if (r.sweepDueAtMs !== null || r.lease || r.resolvedAtMs === null) {
      return "terminal-inconsistent";
    }
    if (TERMINAL.includes(r.state) &&
        (!r.attempts || r.history[r.attempts - 1].result !== r.state)) {
      return "terminal-inconsistent";
    }
  }
  return null;
}

/**
 * Classified, generation-matched delete of one exact object. Never throws.
 * 404 -> absent; 412 -> mismatch (the precondition did not match the
 * recorded generation; no claim about what exists); success -> deleted;
 * anything else, or the per-attempt deadline -> error with a bounded code.
 * The bucket must come from a client with implicit retries disabled.
 * @param {object} bucket @google-cloud/storage Bucket (or double)
 * @param {{name: string, generation: string}} target
 * @param {number} timeoutMs per-attempt deadline
 * @return {Promise<{result: string, code: ?string}>}
 */
async function deleteExactGeneration(bucket, target, timeoutMs) {
  let timer = null;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => resolve({result: "error",
      code: "attempt-timeout"}), timeoutMs);
  });
  const op = (async () => {
    try {
      await bucket.file(target.name)
          .delete({ifGenerationMatch: target.generation});
      return {result: "deleted", code: null};
    } catch (e) {
      const k = e && e.code;
      if (k === 404) return {result: "absent", code: "404"};
      if (k === 412) return {result: "mismatch", code: "412"};
      return {result: "error",
        code: k === undefined || k === null ? "unknown" :
          String(k).slice(0, 64)};
    }
  })();
  try {
    return await Promise.race([op, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A Bucket of the same name from a NEW client of the same Storage class with
 * implicit retries disabled (autoRetry false), so one admitted attempt sends
 * at most one delete request. Credentials: application default (Functions).
 * @param {object} defaultBucket admin getStorage().bucket()
 * @return {object} Bucket
 */
function noRetryBucketFor(defaultBucket) {
  const Storage = defaultBucket.storage.constructor;
  return new Storage({retryOptions: {autoRetry: false}})
      .bucket(defaultBucket.name);
}

/**
 * @param {object} deps
 * @param {object} deps.db Firestore (admin or double)
 * @param {function(): string} deps.bucketName configured default bucket
 * @param {function(): object} deps.getBucket no-retry Bucket for deletes
 * @param {function(): Date} deps.now
 * @param {object} deps.logger
 * @param {function(): number} [deps.monotonicMs] invocation budget clock
 * @param {function(): string} [deps.newHolder]
 * @param {object} [deps.limits]
 * @return {object}
 */
function createCleanup(deps) {
  const {db, logger} = deps;
  const limits = deps.limits || CLEANUP_LIMITS;
  const nowMs = () => deps.now().getTime();
  const mono = deps.monotonicMs || (() => performance.now());
  const newHolder = deps.newHolder || (() => crypto.randomUUID());
  const ref = (id) => db.collection(CLEANUP_COLLECTION).doc(id);
  const bucketName = () => {
    try {
      return deps.bucketName();
    } catch (_) {
      return null;
    }
  };
  const invalid = (where, id, problem) => {
    logger.warn("film.cleanup.record_invalid",
        {where, id: id.slice(0, 16), problem});
    return {outcome: "invalid", problem};
  };

  /**
   * Inside a caller's transaction, BEFORE that transaction writes anything:
   * create-or-read the obligation. A new record carries the C7 initial
   * values; an existing record (any state) is left byte-unchanged.
   * @param {object} tx
   * @param {{bucket: string, name: string, generation: string}} target
   * @param {string} origin
   * @param {Date} at the transaction's single time
   * @return {Promise<{id: string, created: boolean}>}
   * @throws {CleanupRefused} on ANY target refusal (C1-R1): the caller's
   *   transaction aborts before it writes, so no cleanup-owing decision is
   *   ever committed without its record
   */
  async function obligate(tx, target, origin, at) {
    const problem = targetProblem(target, bucketName()) ||
      (ORIGINS.includes(origin) ? null : "origin-invalid");
    if (problem) {
      logger.error("film.cleanup.target_refused", {origin, problem});
      throw new CleanupRefused(problem);
    }
    const id = cleanupIdFor(target.bucket, target.name, target.generation);
    const snap = await tx.get(ref(id));
    if (snap.exists) return {id, created: false};
    const m = QUARANTINE_RE.exec(target.name);
    const t = at.getTime();
    tx.create(ref(id), {
      bucket: target.bucket, name: target.name, generation: target.generation,
      teamId: m[1], filmId: m[2], origin, createdAtMs: t,
      state: "pending", attempts: 0, fence: 0, lease: null, history: [],
      nextAttemptAtMs: t, sweepDueAtMs: t, resolvedAtMs: null, evidence: null,
    });
    return {id, created: true};
  }

  /**
   * The ONE admission mechanism (r3 §2.3). No I/O.
   * @param {string} id
   * @param {string} holder
   * @return {Promise<object>} {outcome: admitted|no-op|skip-contention|
   *   stuck|not-due|missing|invalid, ...}
   */
  async function admitAttempt(id, holder) {
    const b = bucketName();
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref(id));
      if (!snap.exists) return {outcome: "missing"};
      const r = snap.data();
      const problem = recordProblem(id, r, b, limits);
      if (problem) {
        // C1-R2: a record-intrinsic problem parks the record out of the due
        // range (it can no longer crowd valid records out of the bounded
        // sweep). Only sweepDueAtMs changes, to null; the original value is
        // kept in `parked`; every other field stays byte-unchanged. A
        // missing configuration never parks (recoverable once restored).
        if (problem !== "bucket-unset" && r && typeof r === "object" &&
            typeof r.sweepDueAtMs === "number") {
          tx.update(ref(id), {sweepDueAtMs: null, parked: {problem,
            sweepDueAtMs: r.sweepDueAtMs, atMs: nowMs()}});
          return {...invalid("admit", id, problem), parked: true};
        }
        return invalid("admit", id, problem);
      }
      const t = nowMs();
      if (r.state !== "pending") return {outcome: "no-op", state: r.state};
      if (r.lease && r.lease.untilMs > t) return {outcome: "skip-contention"};
      const next = {...r, history: r.history.map((h) => ({...h}))};
      let changed = false;
      if (r.lease) {
        // expired lease with an open entry: crash or lost result. The
        // attempt stays consumed; the old holder's late write is refused.
        const last = next.history[next.history.length - 1];
        last.result = "unknown";
        last.code = "lease-expired";
        last.endedAtMs = t;
        next.lease = null;
        changed = true;
      }
      if (next.attempts >= limits.maxAttempts) {
        const last = next.history[next.history.length - 1];
        Object.assign(next, {state: "stuck", sweepDueAtMs: null,
          nextAttemptAtMs: null, resolvedAtMs: t,
          evidence: {reason: "max-attempts", code: last ? last.code : null}});
        tx.set(ref(id), next);
        logger.warn("film.cleanup.stuck", {id: id.slice(0, 16),
          attempts: next.attempts});
        return {outcome: "stuck"};
      }
      if (t < next.nextAttemptAtMs) {
        if (changed) tx.set(ref(id), next);
        return {outcome: "not-due", closed: changed};
      }
      const n = next.attempts + 1;
      const lease = {holder, fence: n,
        untilMs: t + limits.attemptBudgetMs + limits.leaseMarginMs};
      const nextAttemptAtMs = t + backoffMs(n, limits);
      Object.assign(next, {attempts: n, fence: n, lease,
        nextAttemptAtMs, sweepDueAtMs: Math.max(lease.untilMs, nextAttemptAtMs),
        history: [...next.history, {n, fence: n, admittedAtMs: t,
          result: null, code: null, endedAtMs: null}]});
      tx.set(ref(id), next);
      return {outcome: "admitted", fence: n,
        target: {bucket: r.bucket, name: r.name, generation: r.generation}};
    });
  }

  /**
   * Fenced result write (C8 predicate). A mismatch is a logged no-op.
   * @param {string} id
   * @param {string} holder
   * @param {number} fence
   * @param {{result: string, code: ?string}} outcome
   * @return {Promise<{outcome: string}>}
   */
  async function recordResult(id, holder, fence, outcome) {
    const b = bucketName();
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref(id));
      if (!snap.exists) return {outcome: "missing"};
      const r = snap.data();
      const problem = recordProblem(id, r, b, limits);
      if (problem) return invalid("result", id, problem);
      const last = r.history[r.history.length - 1];
      if (r.state !== "pending" || r.lease === null ||
          r.lease.holder !== holder || r.lease.fence !== fence ||
          r.fence !== fence || !last || last.fence !== fence ||
          last.result !== null) {
        logger.info("film.cleanup.stale_result_ignored",
            {id: id.slice(0, 16), fence, result: outcome.result});
        return {outcome: "stale-ignored"};
      }
      const t = nowMs();
      const history = r.history.map((h) => ({...h}));
      Object.assign(history[history.length - 1],
          {result: outcome.result, code: outcome.code || null, endedAtMs: t});
      const next = {...r, history, lease: null};
      if (TERMINAL.includes(outcome.result)) {
        Object.assign(next, {state: outcome.result, sweepDueAtMs: null,
          nextAttemptAtMs: null, resolvedAtMs: t});
      } else if (r.attempts >= limits.maxAttempts) {
        Object.assign(next, {state: "stuck", sweepDueAtMs: null,
          nextAttemptAtMs: null, resolvedAtMs: t,
          evidence: {reason: "max-attempts", code: outcome.code || null}});
      } else {
        next.sweepDueAtMs = r.nextAttemptAtMs;
      }
      tx.set(ref(id), next);
      return {outcome: "recorded", state: next.state};
    });
  }

  /**
   * At most ONE attempt: admit -> bounded delete -> fenced result. Awaited.
   * @param {string} id
   * @return {Promise<object>}
   */
  async function attemptOnce(id) {
    const holder = newHolder();
    const a = await admitAttempt(id, holder);
    if (a.outcome !== "admitted") return {admission: a.outcome};
    let result;
    try {
      result = await deleteExactGeneration(deps.getBucket(), a.target,
          limits.attemptBudgetMs);
    } catch (e) {
      // configuration (no bucket, no client): a recorded, capped error
      result = {result: "error", code: "config"};
    }
    const w = await recordResult(id, holder, a.fence, result);
    logger.info("film.cleanup.attempt", {id: id.slice(0, 16),
      fence: a.fence, result: result.result, code: result.code,
      write: w.outcome});
    return {admission: "admitted", fence: a.fence, ...result,
      write: w.outcome};
  }

  /**
   * Bounded sweep: exactly one query, sequential, stops on budget.
   * @param {{limit: number}} opts
   * @return {Promise<object>}
   */
  async function retryPendingFilmCleanups({limit} = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > limits.sweepBatchMax) {
      throw new RangeError("limit must be an integer in 1..sweepBatchMax");
    }
    const start = mono();
    if (!bucketName()) {
      // configuration outage: touch nothing, park nothing (C1-R2)
      logger.error("film.cleanup.sweep_config_missing", {});
      return {queried: 0, results: [], stoppedForBudget: false,
        configMissing: true};
    }
    const snap = await db.collection(CLEANUP_COLLECTION)
        .where("sweepDueAtMs", "<=", nowMs())
        .orderBy("sweepDueAtMs").limit(limit).get();
    const results = [];
    let stoppedForBudget = false;
    for (const d of snap.docs) {
      if (limits.sweepInvocationBudgetMs - (mono() - start) <
          limits.attemptBudgetMs) {
        stoppedForBudget = true;
        break;
      }
      results.push({id: d.id, ...await attemptOnce(d.id)});
    }
    return {queried: snap.docs.length, results, stoppedForBudget};
  }

  return {obligate, admitAttempt, recordResult, attemptOnce,
    retryPendingFilmCleanups, ref, limits};
}

/**
 * Unexported, default-OFF, TEST_ONLY sweep definition with platform retry
 * OFF (retryCount 0). Never exported by functions/index.js; the predeploy
 * guard blocks deploy if it is. Scheduling/activation is decision C1-D1.
 * @param {{sweep: function, isEnabled: function(): boolean}} o
 * @return {function} scheduled-function definition (marked TEST_ONLY)
 */
function defineCleanupSweepTrigger({sweep, isEnabled}) {
  const {onSchedule} = require("firebase-functions/v2/scheduler");
  const fn = onSchedule({schedule: SWEEP_SCHEDULE_PLACEHOLDER,
    retryCount: 0, maxInstances: 1, timeoutSeconds: 120}, async () => {
    if (!isEnabled()) return;
    await sweep({limit: CLEANUP_LIMITS.sweepBatchMax});
  });
  Object.defineProperty(fn, "__filmTestOnly",
      {value: CLEANUP_SWEEP_DESIGNATION.marker, enumerable: false});
  return fn;
}

/**
 * Deploy guard over LOADED exports: any export carrying a TEST_ONLY film
 * marker is a problem.
 * @param {object} loaded require("functions/index.js")
 * @return {?string}
 */
function testOnlyExportProblem(loaded) {
  for (const [name, fn] of Object.entries(loaded || {})) {
    if (fn && fn.__filmTestOnly) return `${name}=${fn.__filmTestOnly}`;
  }
  return null;
}

module.exports = {CleanupRefused, CLEANUP_LIMITS, CLEANUP_SWEEP_DESIGNATION,
  SWEEP_SCHEDULE_PLACEHOLDER, CLEANUP_COLLECTION, GENERATION_RE,
  QUARANTINE_RE, ORIGINS, recordSchema, cleanupIdFor, backoffMs,
  targetProblem, recordProblem, deleteExactGeneration, noRetryBucketFor,
  createCleanup,
  defineCleanupSweepTrigger, testOnlyExportProblem};
