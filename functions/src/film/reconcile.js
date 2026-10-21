"use strict";
/**
 * LOST-FINALIZE-SOURCE quarantine reconciler (LFS-A, #39 c-6303891279;
 * agreed scope r2 c-6302707899 + r3 c-6303547094 + r3.1 c-6303586101 + r3.2
 * c-6303605492, consolidated by Codex c-6303623216). TEST_ONLY, unexported,
 * default-OFF, platform retry 0.
 *
 * It makes NO decision of its own. For each eligible live object under
 * `quarantine/` in the configured default bucket it builds a finalize event
 * from trusted LISTING metadata only and re-presents it to the UNCHANGED S1
 * `onQuarantineFinalized` of a dedicated handler instance whose Firestore
 * and Storage go through the bounded transport boundary (lfs-transport.js).
 * Every film, ledger and filmCleanup change therefore comes from frozen S1 +
 * C1 code (handlers.js, cleanup.js and storage-adapter.js are byte-unchanged).
 *
 * The reconciliation lease authorizes discovery, checkpoint, evidence and
 * error writes only. A re-drive already started under a lease that later
 * expires finishes as an ordinary duplicate delivery (it may even make the
 * first valid decision); it can create no extra effect beyond the frozen
 * idempotent semantics and can write no reconciliation state.
 */
const crypto = require("crypto");
const {z} = require("zod");
const c = require("./contract");
const {LIMITS} = require("./limits");
const {GENERATION_RE, QUARANTINE_RE} = require("./cleanup");
const {createFilmHandlers} = require("./handlers");
const {createStorageAdapter} = require("./storage-adapter");
const {firestoreEnvelope, LFS_TRANSPORT_LIMITS} = require("./lfs-transport");

const POLICY_REVISION = "lfs-r3.2";
const STATE_PATH = "filmReconcile/quarantine";
const EVIDENCE_COLLECTION = `${STATE_PATH}/evidence`;
const PREFIX = "quarantine/";

/**
 * TEST placeholders; production values are decision C1-D1.
 * @param {object} [transport] lfs-transport limits
 * @param {object} [over] overrides (tests)
 * @return {object}
 */
function deriveLimits(transport = LFS_TRANSPORT_LIMITS, over = {}) {
  const env = firestoreEnvelope(transport.firestoreRpcMs);
  const txMaxAttempts = over.txMaxAttempts || 1;
  // Worst case per object (every call hangs until cut): pre-read; verify
  // (1 read); head read (+ token); finalize decision (<= 3 reads: film,
  // ledger, cleanup record); C1 admission (1 read) + DELETE + result
  // (1 read); checkpoint (1 read + evidence read).
  const tx = (reads) => txMaxAttempts * env.txAttempt(reads);
  const objectEnvelopeMs = Math.ceil(env.streamRead + tx(1) +
    (transport.storageRequestMs + transport.tokenRequestMs) + tx(3) +
    tx(1) + transport.storageRequestMs + tx(1) + tx(2));
  return Object.freeze({
    status: "TEST_PLACEHOLDER",
    minAgeMs: 15 * 60 * 1000,
    clockSkewMs: 5 * 60 * 1000,
    pageMax: 100,
    objectsMax: 100,
    listsMax: 2,
    txMaxAttempts,
    objectEnvelopeMs,
    /** Admission budget per object: NOT a hard deadline (r3 §C). */
    objectBudgetMs: over.objectBudgetMs || 60 * 1000,
    invocationBudgetMs: over.invocationBudgetMs || 9 * 60 * 1000,
    /** Lease outlives one object's whole envelope plus a margin. */
    leaseMs: objectEnvelopeMs + 60 * 1000,
    evidenceCodeMax: 64,
    ...over,
  });
}
const RECONCILE_LIMITS = deriveLimits();

const RECONCILE_DESIGNATION = Object.freeze({designation: "TEST_ONLY",
  marker: "film-lfs-reconciler", authorizationRecord: null});

const ms = z.number().int().nonnegative();
const stateSchema = z.object({
  schema: z.literal("film-reconcile.v1"),
  project: z.string().min(1).max(128),
  bucket: z.string().min(1).max(222),
  prefix: z.literal(PREFIX),
  policyRevision: z.string().min(1).max(32),
  passId: z.string().regex(/^[0-9a-f]{32}$/),
  passStartedAtMs: ms,
  afterName: z.string().min(1).max(1024).nullable(),
  passObjects: ms,
  passEvidence: ms,
  lease: z.object({holder: z.string().min(1).max(128),
    fence: z.number().int().positive(), untilMs: ms}).strict().nullable(),
  fence: ms,
  lastError: z.object({code: z.string().max(64), atMs: ms}).strict()
      .nullable(),
  consecutiveFailures: ms,
  previous: z.object({project: z.string().max(128), bucket: z.string()
      .max(222), policyRevision: z.string().max(32), passId: z.string()
      .max(32), afterName: z.string().max(1024).nullable(), atMs: ms})
      .strict().nullable(),
}).strict();

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

/**
 * Evidence id: bound to project, bucket, policy, name and generation.
 * @param {string} project
 * @param {string} bucket
 * @param {string} policyRevision
 * @param {string} name
 * @param {string} generation
 * @return {string}
 */
function evidenceIdFor(project, bucket, policyRevision, name, generation) {
  return sha256([project, bucket, policyRevision, name, String(generation)]
      .join("\n"));
}

/** Thrown at the transaction-read boundary for an ambiguous film doc. */
class FilmAmbiguous extends Error {
  /** @param {string} problem */
  constructor(problem) {
    super(`film document ambiguous: ${problem}`);
    this.name = "FilmAmbiguous";
    this.problem = problem;
    this.code = "film-ambiguous";
  }
}

const FILM_PATH_RE = /^teams\/([^/]+)\/films\/([^/]+)$/;

/**
 * Film document validation (r2 §3.2 step 4, r3 §D): frozen v1 FilmState
 * after the same wire projection, identity bound to the path, valid expiry,
 * decimal generation where required. null = valid.
 * @param {string} path document path teams/{t}/films/{f}
 * @param {object} d stored data
 * @return {?string} problem
 */
function filmProblem(path, d) {
  const m = FILM_PATH_RE.exec(path);
  if (!m) return "path";
  if (!d || typeof d !== "object") return "not-object";
  if (d.teamId !== m[1] || d.filmId !== m[2]) return "identity";
  if (d.uploadPath !== c.uploadPathFor(m[1], m[2])) return "upload-path";
  if (!c.FILM_STATUSES.includes(d.status)) return "status";
  const exp = d.reservationExpiresAt;
  if (!exp || typeof exp.toMillis !== "function" ||
      !Number.isFinite(exp.toMillis())) {
    return "reservation-expiry";
  }
  if ((d.status === "validating" || d.status === "ready") &&
      (typeof d.objectGeneration !== "string" ||
        !GENERATION_RE.test(d.objectGeneration))) {
    return "object-generation";
  }
  let wire;
  try {
    wire = {};
    for (const k of Object.keys(c.schemas.filmState.shape)) {
      const v = d[k] === undefined ? null : d[k];
      wire[k] = c.FILM_TIMESTAMP_FIELDS.includes(k) ?
        c.toWireTimestamp(v) : v;
    }
  } catch (_) {
    return "timestamp";
  }
  return c.schemas.filmState.safeParse(wire).success ? null : "schema";
}

/**
 * Firestore facade for the dedicated handler instance and the reconciler:
 * caps transaction callback attempts, counts logical transactions and
 * callback attempts, and validates EVERY transactional read of a film
 * document, including retries (r3 §D). Everything else passes through.
 * @param {object} db bounded Firestore (or a test double)
 * @param {{maxAttempts: number}} o
 * @return {object}
 */
function createDbFacade(db, o) {
  const counters = {transactions: 0, callbackAttempts: 0, filmReads: 0};
  const wrapTx = (tx) => new Proxy(tx, {get(target, k) {
    if (k === "get") {
      return async (ref) => {
        const snap = await target.get(ref);
        if (ref && typeof ref.path === "string" &&
            FILM_PATH_RE.test(ref.path)) {
          counters.filmReads += 1;
          if (snap.exists) {
            const p = filmProblem(ref.path, snap.data());
            if (p) throw new FilmAmbiguous(p);
          }
        }
        return snap;
      };
    }
    const v = target[k];
    return typeof v === "function" ? v.bind(target) : v;
  }});
  return new Proxy(db, {get(target, k) {
    if (k === "runTransaction") {
      return (fn) => {
        counters.transactions += 1;
        return target.runTransaction((tx) => {
          counters.callbackAttempts += 1;
          return fn(wrapTx(tx));
        }, {maxAttempts: o.maxAttempts});
      };
    }
    if (k === "lfsCounters") return counters;
    const v = target[k];
    return typeof v === "function" ? v.bind(target) : v;
  }});
}

/**
 * Listing metadata check (r3 §E). Fails closed; never manufactures a
 * mismatch from a missing field.
 * @param {object} item listing entry
 * @param {number} nowMs
 * @param {object} limits
 * @return {object} {ok, problem, young, event}
 */
function classifyListing(item, nowMs, limits) {
  const bad = (field) => ({ok: false, problem: `listing-malformed:${field}`});
  if (!item || typeof item !== "object") return bad("entry");
  if (typeof item.name !== "string") return bad("name");
  const m = QUARANTINE_RE.exec(item.name);
  if (!m || item.name !== c.uploadPathFor(m[1], m[2])) {
    return {ok: false, problem: "name-noncanonical"};
  }
  if (typeof item.generation !== "string" ||
      !GENERATION_RE.test(item.generation)) {
    return bad("generation");
  }
  if (typeof item.size !== "string" || !/^[1-9][0-9]{0,15}$/.test(item.size) ||
      Number(item.size) > LIMITS.maxBytes) {
    return bad("size");
  }
  if (typeof item.contentType !== "string" ||
      !LIMITS.allowedContentTypes.includes(item.contentType)) {
    return bad("contentType");
  }
  const created = typeof item.timeCreated === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/
        .test(item.timeCreated) ? Date.parse(item.timeCreated) : NaN;
  if (!Number.isFinite(created) || created > nowMs + limits.clockSkewMs) {
    return bad("timeCreated");
  }
  if (created > nowMs - limits.minAgeMs) {
    return {ok: false, problem: null, young: true};
  }
  return {ok: true, problem: null, event: {name: item.name,
    generation: item.generation, size: item.size,
    contentType: item.contentType}};
}

/**
 * @param {object} deps
 * @param {object} deps.db bounded Firestore (dedicated) or a test double
 * @param {object} deps.Timestamp Firestore Timestamp class
 * @param {object} deps.storage bounded Storage facade (lfs-transport)
 * @param {function(): ?string} deps.bucketName configured default bucket
 * @param {string} deps.project
 * @param {object} deps.logger
 * @param {function(): Date} deps.now
 * @param {function(): number} [deps.monotonicMs]
 * @param {function(): string} [deps.newHolder]
 * @param {object} [deps.limits] deriveLimits(...)
 * @param {object} [deps.cleanupLimits] passed to the handler instance
 * @return {{reconcileQuarantine: function, handlers: object, db: object}}
 */
function createQuarantineReconciler(deps) {
  const limits = deps.limits || RECONCILE_LIMITS;
  const {logger} = deps;
  const nowMs = () => deps.now().getTime();
  const mono = deps.monotonicMs || (() => performance.now());
  const newHolder = deps.newHolder || (() => crypto.randomUUID());
  const db = createDbFacade(deps.db, {maxAttempts: limits.txMaxAttempts});
  const bucketName = () => {
    try {
      const b = deps.bucketName();
      return typeof b === "string" && b ? b : null;
    } catch (_) {
      return null;
    }
  };
  const handlers = createFilmHandlers({db, Timestamp: deps.Timestamp,
    getUser: async () => {
      throw new Error("reconciler never serves callables");
    },
    readHead: (x) => createStorageAdapter(deps.storage).readHead(x),
    cleanupBucketName: bucketName, cleanupBucket: () => deps.storage,
    logger, now: deps.now, cleanupLimits: deps.cleanupLimits});
  const stateRef = () => db.collection("filmReconcile").doc("quarantine");
  const evidenceRef = (id) => stateRef().collection("evidence").doc(id);

  const freshState = (project, bucket, prev, at) => ({
    schema: "film-reconcile.v1", project, bucket, prefix: PREFIX,
    policyRevision: POLICY_REVISION,
    passId: crypto.randomBytes(16).toString("hex"), passStartedAtMs: at,
    afterName: null, passObjects: 0, passEvidence: 0, lease: null, fence: 0,
    lastError: null, consecutiveFailures: 0, previous: prev});

  /**
   * Fenced state transaction: re-reads state and requires the same binding,
   * holder, fence and a live lease; then applies `mutate` (and optional
   * evidence upsert). Returns false (no write) when the lease was lost.
   * @param {object} ctx {project, bucket, holder, fence}
   * @param {function(object, number): object} mutate
   * @param {?object} [evidence] {id, code, name, generation}
   * @return {Promise<boolean>}
   */
  async function fenced(ctx, mutate, evidence) {
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(stateRef());
      const ev = evidence ? await tx.get(evidenceRef(evidence.id)) : null;
      const s = snap.exists ? snap.data() : null;
      const t = nowMs();
      if (!s || !stateSchema.safeParse(s).success || s.project !==
          ctx.project || s.bucket !== ctx.bucket || s.policyRevision !==
          POLICY_REVISION || !s.lease || s.lease.holder !== ctx.holder ||
          s.lease.fence !== ctx.fence || s.fence !== ctx.fence ||
          s.lease.untilMs <= t) {
        return false;
      }
      const next = mutate({...s}, t);
      next.lease = next.lease === null ? null :
        {...s.lease, untilMs: t + limits.leaseMs};
      tx.set(stateRef(), next);
      if (evidence) {
        const prev = ev.exists ? ev.data() : null;
        tx.set(evidenceRef(evidence.id), {
          schema: "film-reconcile-evidence.v1", project: ctx.project,
          bucket: ctx.bucket, policyRevision: POLICY_REVISION,
          name: evidence.name.slice(0, 1024),
          generation: String(evidence.generation).slice(0, 20),
          code: String(evidence.code).slice(0, limits.evidenceCodeMax),
          count: prev && Number.isSafeInteger(prev.count) ?
            prev.count + 1 : 1,
          firstAtMs: prev && Number.isSafeInteger(prev.firstAtMs) ?
            prev.firstAtMs : t,
          lastAtMs: t, lastPassId: s.passId,
        });
      }
      return true;
    });
  }

  /**
   * `fenced`, with transport/contention failures (bounded by the transport
   * boundary) reported instead of thrown: the invocation stops cleanly.
   * @param {object} ctx
   * @param {function(object, number): object} mutate
   * @param {?object} [evidence]
   * @return {Promise<{ok: boolean, error: ?string}>}
   */
  async function tryFenced(ctx, mutate, evidence) {
    try {
      return {ok: await fenced(ctx, mutate, evidence), error: null};
    } catch (e) {
      const code = String(e && e.code !== undefined ? e.code : "error")
          .slice(0, 64);
      logger.warn("film.reconcile.state_tx_failed", {code});
      return {ok: false, error: code};
    }
  }

  /**
   * Bounded reconciliation invocation (r2 §3, r3, r3.1, r3.2).
   * @param {{limit: number}} opts
   * @return {Promise<object>} summary
   */
  async function reconcileQuarantine({limit} = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > limits.objectsMax) {
      throw new RangeError("limit must be an integer in 1..objectsMax");
    }
    const start = mono();
    const bucket = bucketName();
    if (!bucket) {
      logger.error("film.reconcile.config_missing", {});
      return {configMissing: true, processed: 0};
    }
    const ctx = {project: deps.project, bucket, holder: newHolder(),
      fence: 0};
    // acquire (or take over) the lease; bind / rebind the target
    let acquired;
    try {
      acquired = await db.runTransaction(async (tx) => {
        const snap = await tx.get(stateRef());
        const t = nowMs();
        let s = snap.exists ? snap.data() : null;
        if (s && !stateSchema.safeParse(s).success) {
          return {outcome: "state-invalid"};
        }
        if (s && s.lease && s.lease.untilMs > t) {
          return {outcome: "skip-contention"};
        }
        if (!s) {
          s = freshState(ctx.project, ctx.bucket, null, t);
        } else if (s.project !== ctx.project || s.bucket !== ctx.bucket ||
          s.policyRevision !== POLICY_REVISION) {
          s = {...freshState(ctx.project, ctx.bucket, {project: s.project,
            bucket: s.bucket, policyRevision: s.policyRevision,
            passId: s.passId, afterName: s.afterName, atMs: t}, t),
          fence: s.fence};
        }
        const fence = s.fence + 1;
        tx.set(stateRef(), {...s, fence,
          lease: {holder: ctx.holder, fence, untilMs: t + limits.leaseMs}});
        return {outcome: "acquired", fence, afterName: s.afterName};
      });
    } catch (e) {
      // contention or a transport failure: bounded, nothing acquired
      const code = String(e && e.code !== undefined ? e.code : "error")
          .slice(0, 64);
      logger.warn("film.reconcile.acquire_failed", {code});
      return {acquireError: code, processed: 0};
    }
    if (acquired.outcome !== "acquired") {
      logger.warn("film.reconcile.not_acquired", {outcome: acquired.outcome});
      return {[acquired.outcome === "skip-contention" ? "skipContention" :
        "stateInvalid"]: true, processed: 0};
    }
    ctx.fence = acquired.fence;
    let afterName = acquired.afterName;
    const out = {processed: 0, outcomes: {}, evidence: 0, young: 0,
      lists: 0, passEnded: false, stoppedFor: null};
    const bump = (k) => {
      out.outcomes[k] = (out.outcomes[k] || 0) + 1;
    };
    const remaining = () => limits.invocationBudgetMs - (mono() - start);
    lists: while (out.lists < limits.listsMax) {
      const want = Math.min(limits.pageMax, limit - out.processed + 1);
      let page;
      out.lists += 1;
      try {
        page = await deps.storage.listObjects({prefix: PREFIX,
          startOffset: afterName || undefined, maxResults: want});
      } catch (e) {
        const code = String(e && e.code || "list-error").slice(0, 64);
        await tryFenced(ctx, (s, t) => ({...s, lastError: {code, atMs: t},
          consecutiveFailures: s.consecutiveFailures + 1}));
        out.stoppedFor = `list:${code}`;
        break;
      }
      if (remaining() <= 0) {
        out.stoppedFor = "budget-after-list"; // late page: no progress
        break;
      }
      const items = page.items.filter((it) => !(afterName &&
        it && it.name === afterName));
      for (const item of items) {
        if (out.processed >= limit) break lists;
        if (remaining() < limits.objectBudgetMs) {
          out.stoppedFor = "budget";
          break lists;
        }
        const name = item && typeof item.name === "string" ?
          item.name : null;
        if (!name) {
          out.stoppedFor = "listing-unnamed";
          break lists;
        }
        // fresh lease verify immediately before this object (r3 §B)
        const v = await tryFenced(ctx, (s) => s);
        if (!v.ok) {
          out.stoppedFor = v.error ? `state:${v.error}` : "lease-lost";
          break lists;
        }
        const cls = classifyListing(item, nowMs(), limits);
        let evidence = null;
        if (cls.young) {
          out.young += 1;
        } else if (!cls.ok) {
          evidence = {code: cls.problem, name, generation:
            item.generation};
        } else {
          let label = null;
          try {
            const m = QUARANTINE_RE.exec(name);
            const path = `teams/${m[1]}/films/${m[2]}`;
            const pre = await db.collection("teams").doc(m[1])
                .collection("films").doc(m[2]).get();
            const p = pre.exists ? filmProblem(path, pre.data()) : null;
            if (p) throw new FilmAmbiguous(p);
            label = await handlers.onQuarantineFinalized({bucket,
              ...cls.event});
            bump(label);
          } catch (e) {
            const code = e && e.name === "FilmAmbiguous" ?
              `film-ambiguous:${e.problem}` :
              `redrive:${String(e && e.code || "error")}`;
            evidence = {code, name, generation: cls.event.generation};
          }
        }
        if (evidence) {
          evidence.id = evidenceIdFor(ctx.project, ctx.bucket,
              POLICY_REVISION, name, evidence.generation);
          out.evidence += 1;
        }
        const cp = await tryFenced(ctx, (s) => ({...s, afterName: name,
          passObjects: s.passObjects + 1,
          passEvidence: s.passEvidence + (evidence ? 1 : 0),
          lastError: null, consecutiveFailures: 0}), evidence);
        if (!cp.ok) {
          out.stoppedFor = cp.error ? `state:${cp.error}` : "lease-lost";
          break lists;
        }
        afterName = name;
        out.processed += 1;
      }
      if (page.items.length < want) {
        // the listing has nothing beyond afterName: pass end
        const end = await tryFenced(ctx, (s, t) => ({...s, afterName: null,
          passId: crypto.randomBytes(16).toString("hex"),
          passStartedAtMs: t, passObjects: 0, passEvidence: 0}));
        if (end.ok) {
          out.passEnded = true;
          afterName = null;
        }
        break;
      }
    }
    // release the lease (fenced; a lost lease is a no-op)
    await tryFenced(ctx, (s) => ({...s, lease: null}));
    out.counters = {...db.lfsCounters};
    logger.info("film.reconcile.done", {processed: out.processed,
      evidence: out.evidence, young: out.young, lists: out.lists,
      passEnded: out.passEnded, stoppedFor: out.stoppedFor});
    return out;
  }

  return {reconcileQuarantine, handlers, db, limits};
}

/**
 * Unexported, default-OFF, TEST_ONLY trigger definition, retryCount 0.
 * Scheduling and activation are decision C1-D1.
 * @param {{run: function, isEnabled: function(): boolean}} o
 * @return {function}
 */
function defineReconcileTrigger({run, isEnabled}) {
  const {onSchedule} = require("firebase-functions/v2/scheduler");
  const fn = onSchedule({schedule: "every 24 hours", retryCount: 0,
    maxInstances: 1, timeoutSeconds: 540}, async () => {
    if (!isEnabled()) return;
    await run({limit: RECONCILE_LIMITS.objectsMax});
  });
  Object.defineProperty(fn, "__filmTestOnly",
      {value: RECONCILE_DESIGNATION.marker, enumerable: false});
  return fn;
}

module.exports = {POLICY_REVISION, STATE_PATH, EVIDENCE_COLLECTION, PREFIX,
  RECONCILE_LIMITS, RECONCILE_DESIGNATION, deriveLimits, stateSchema,
  evidenceIdFor, FilmAmbiguous, filmProblem, createDbFacade,
  classifyListing, createQuarantineReconciler, defineReconcileTrigger};
