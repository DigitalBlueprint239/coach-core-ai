"use strict";
/**
 * FILM-S2b validation worker (TEST ONLY; statement r2, #39 c-6294022891).
 *
 * Not exported from functions/index.js; default OFF (designation.js). Every
 * external effect is injected so tests drive it with in-memory doubles or
 * the local emulators. Nothing here is a deploy artifact.
 *
 * Data (server only; default-deny in rules):
 *   teams/{t}/films/{f}                        S1 film document (adapter)
 *   teams/{t}/filmLedger/cap                   S1 authoritative ledger
 *   teams/{t}/films/{f}/workerJobs/{jobId}     one durable job per
 *                                              (team, film, input generation)
 *   films/{t}/{f}/jobs/{jobId}/normalized.mp4  job-scoped create-only output
 *
 * Attempt policy: ONLY the agreed r4 helpers decide (contract-v2.js
 * admissionDecision / exhaustionOutcome) over transactionally stored state;
 * there is no second implementation here. Outcomes are interpreted
 * explicitly and never reset a terminal film:
 *   admitted                         the only processing admission
 *   skip-duplicate / skip-contention counters only; no film/slot change
 *   stalled-configuration            recorded; no decoder, no verdict
 *   invalid-input                    preserved + surfaced, no transition
 *   refused-horizon / -exhausted     no processing; exhaustion evaluated
 *                                    once no attempt is admissible
 * exhaustionOutcome: rejected -> fenced rejection; recovery-needed -> job
 * marked while the film is still validating; completed -> never treated as
 * ready by itself; invalid-input -> evidence only.
 */
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {z} = require("zod");
const v1 = require("../contract");
const c2 = require("../contract-v2");
const {LIMITS} = require("../limits");
const {leaseTtlMs} = require("./limits");
const {workerEnabled} = require("./designation");
const media = require("./media");

const JOB_SCHEMA = "film-worker-job.v1";
const MAX = c2.WORKER_ATTEMPT_POLICY.maxAdmittedAttempts;
const HORIZON = c2.WORKER_ATTEMPT_POLICY.admissionHorizonMs;
const SEEN_EVENTS = 32;
const PIPELINE_VERSION = "film-s2b-pipeline.v1";

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

/**
 * Deterministic logical job id for (team, film, input generation): event,
 * lease and client-operation ids can never create a second job.
 * @param {string} teamId
 * @param {string} filmId
 * @param {string} generation
 * @return {string}
 */
function jobIdFor(teamId, filmId, generation) {
  return sha256(`${teamId}\n${filmId}\n${generation}`).slice(0, 32);
}

/** Revision of everything the pipeline's verdict depends on. */
const POLICY_REVISION = sha256(JSON.stringify({
  pipeline: PIPELINE_VERSION,
  d3: {maxBytes: LIMITS.maxBytes, maxDurationMs: LIMITS.maxDurationMs,
    maxWidth: LIMITS.maxWidth, maxHeight: LIMITS.maxHeight},
  formatTags: media.ALLOWED_FORMAT_TAGS, streamTags: media.ALLOWED_STREAM_TAGS,
}));

const ms = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const cleanupEntry = z.object({
  object: z.string(), generation: z.string(), fence: z.number().int(),
  result: z.enum(["pending", "deleted", "absent", "mismatch"]),
}).nullable();
/** Stored job (validated on every read; malformed state is never forced). */
const jobSchema = z.object({
  schema: z.literal(JOB_SCHEMA),
  jobId: z.string(), teamId: z.string(), filmId: z.string(),
  inputGeneration: z.string(), createdAtMs: ms,
  admitted: z.number().int().min(0).max(MAX),
  fence: z.number().int().min(0),
  lease: z.object({holder: z.string(), untilMs: ms, fence: z.number().int(),
    kind: z.enum(["process", "reconcile"])}).nullable(),
  attempts: z.array(z.object({n: z.number().int().min(1).max(MAX),
    fence: z.number().int(), admittedAtMs: ms,
    end: c2.schemas.attemptRecord.nullable(), endedAtMs: ms.nullable()}))
      .max(MAX),
  seenEventIds: z.array(z.string()).max(SEEN_EVENTS),
  counters: z.object({duplicateDeliveries: z.number().int(),
    contentionSkips: z.number().int(), configurationStalls: z.number().int()}),
  stalled: z.object({reason: z.string(), atMs: ms}).nullable(),
  validated: z.any().nullable(),
  intent: z.any().nullable(),
  output: z.object({generation: z.string(), sha256: z.string(),
    bytes: z.number().int(), key: z.string(),
    provenBy: z.enum(["ack", "adopted"])}).nullable(),
  terminal: z.object({outcome: z.enum(["ready", "rejected"]),
    reason: z.string().nullable(), atMs: ms}).nullable(),
  recovery: z.object({reason: z.string(), evidence: z.any(), atMs: ms})
      .nullable(),
  exhaustion: z.object({outcome: z.string(), reason: z.string().nullable(),
    atMs: ms}).nullable(),
  cleanup: z.object({quarantine: cleanupEntry, output: cleanupEntry}),
}).strict();

/** Thrown inside a transaction to end it without writes. */
class Stop extends Error {
  /** @param {object} result */
  constructor(result) {
    super("stop");
    this.result = result;
  }
}

/**
 * @param {object} deps
 * @param {object} deps.db Firestore (admin or test double)
 * @param {object} deps.Timestamp Timestamp class
 * @param {object} deps.objects createObjectStore() result (or double)
 * @param {object} deps.decoder createDecoder() result (or double)
 * @param {function} [deps.runPipeline] default media.runPipeline
 * @param {function(): boolean} [deps.isEnabled] default env switch (OFF)
 * @param {function(): Date} [deps.now]
 * @param {function(): string} [deps.newId]
 * @param {string} [deps.tmpRoot]
 * @param {object} [deps.limits] worker limits (lease TTL)
 * @param {object} deps.logger
 * @return {object} worker
 */
function createFilmWorker(deps) {
  const {db, Timestamp, objects, decoder, logger} = deps;
  const now = deps.now || (() => new Date());
  const newId = deps.newId || (() => crypto.randomUUID());
  const isEnabled = deps.isEnabled || (() => workerEnabled());
  const runPipeline = deps.runPipeline || media.runPipeline;
  const ttl = () => leaseTtlMs(deps.limits);
  const ts = (d) => Timestamp.fromDate(d);

  const teamRef = (t) => db.collection("teams").doc(t);
  const filmRef = (t, f) => teamRef(t).collection("films").doc(f);
  const ledgerRef = (t) => teamRef(t).collection("filmLedger").doc("cap");
  const jobRef = (t, f, id) => filmRef(t, f).collection("workerJobs").doc(id);
  const outputKey = (t, f, id) => `films/${t}/${f}/jobs/${id}/normalized.mp4`;

  /**
   * S1 document -> wire FilmDocument (r4 legacy-null projection), without
   * rewriting the stored record.
   * @param {object} d
   * @return {?object} validated wire document, or null when invalid
   */
  function readFilm(d) {
    const wire = {};
    for (const [k, v] of Object.entries(d)) {
      wire[k] = c2.FILM_TIMESTAMP_FIELDS.includes(k) ?
        v1.toWireTimestamp(v) : v;
    }
    const r = c2.schemas.filmDocument.safeParse(wire);
    return r.success ? r.data : null;
  }

  /**
   * Read everything a fenced decision needs (all reads precede writes).
   * @param {object} tx
   * @param {string} teamId
   * @param {string} filmId
   * @return {Promise<object>} context
   */
  async function load(tx, teamId, filmId) {
    const fSnap = await tx.get(filmRef(teamId, filmId));
    const tSnap = await tx.get(teamRef(teamId));
    const lSnap = await tx.get(ledgerRef(teamId));
    const raw = fSnap.exists ? fSnap.data() : null;
    const film = raw ? readFilm(raw) : null;
    const generation = film && film.objectGeneration;
    const jobId = generation ? jobIdFor(teamId, filmId, generation) : null;
    const jSnap = jobId ? await tx.get(jobRef(teamId, filmId, jobId)) : null;
    let job = null;
    let jobInvalid = false;
    if (jSnap && jSnap.exists) {
      const p = jobSchema.safeParse(jSnap.data());
      if (p.success) job = p.data;
      else jobInvalid = true;
    }
    const slots = {...((lSnap.exists && lSnap.data().slots) || {})};
    return {teamId, filmId, raw, film, generation, jobId, job, jobInvalid,
      jRef: jobId ? jobRef(teamId, filmId, jobId) : null,
      ownerOk: tSnap.exists && film && tSnap.data().ownerId === film.createdBy,
      slots, slot: slots[filmId] || null};
  }

  /**
   * @param {object} ctx
   * @param {number} atMs stable job creation time
   * @return {object} fresh job record
   */
  const newJob = (ctx, atMs) => ({
    schema: JOB_SCHEMA, jobId: ctx.jobId, teamId: ctx.teamId,
    filmId: ctx.filmId, inputGeneration: ctx.generation, createdAtMs: atMs,
    admitted: 0, fence: 0, lease: null, attempts: [], seenEventIds: [],
    counters: {duplicateDeliveries: 0, contentionSkips: 0,
      configurationStalls: 0},
    stalled: null, validated: null, intent: null, output: null,
    terminal: null, recovery: null, exhaustion: null,
    cleanup: {quarantine: null, output: null},
  });

  /**
   * Fenced film + ledger transition to rejected (worker reason). Releases
   * the slot exactly once; new ready fields null.
   * @param {object} tx
   * @param {object} ctx
   * @param {object} job mutated
   * @param {string} reason
   * @param {Date} at
   */
  function writeRejected(tx, ctx, job, reason, at) {
    tx.update(filmRef(ctx.teamId, ctx.filmId), {
      status: "rejected", statusChangedAt: ts(at), rejectionReason: reason,
      readyAt: null, normalizedGeneration: null, media: null,
      retentionExpiresAt: null,
    });
    const slots = {...ctx.slots};
    delete slots[ctx.filmId];
    tx.set(ledgerRef(ctx.teamId), {slots, updatedAt: ts(at)});
    job.terminal = {outcome: "rejected", reason, atMs: at.getTime()};
    job.lease = null;
    job.cleanup = {...job.cleanup, quarantine: {object: ctx.film.uploadPath,
      generation: ctx.generation, fence: job.fence, result: "pending"}};
  }

  /**
   * Preconditions every film-changing decision needs.
   * @param {object} ctx
   * @return {boolean}
   */
  const transitionable = (ctx) => ctx.film && ctx.film.status ===
    "validating" && ctx.ownerOk && ctx.slot && ctx.slot.status === "validating";

  /**
   * Evaluate exhaustion for nonterminal failures, only when no further
   * processing attempt is admissible. Mutates job; may write a rejection.
   * @param {object} tx
   * @param {object} ctx
   * @param {object} job
   * @param {Date} at
   * @return {?object} {outcome, reason} when evaluated
   */
  function maybeExhaust(tx, ctx, job, at) {
    const nowMs = at.getTime();
    if (job.terminal || job.exhaustion) return null;
    if (job.lease && job.lease.untilMs > nowMs) return null;
    if (job.admitted < MAX && nowMs < job.createdAtMs + HORIZON) return null;
    // An admitted attempt with no recorded end crashed after admission.
    const ends = job.attempts.map((a) => a.end || {end: "crash"});
    const out = c2.exhaustionOutcome(ends);
    job.exhaustion = {outcome: out.outcome, reason: out.reason, atMs: nowMs};
    if (out.outcome === "rejected") {
      if (!transitionable(ctx)) {
        job.recovery = {reason: "rejection-precondition-failed",
          evidence: {status: ctx.film && ctx.film.status, ownerOk: ctx.ownerOk,
            slot: ctx.slot ? ctx.slot.status : null}, atMs: nowMs};
        return out;
      }
      job.fence += 1;
      writeRejected(tx, ctx, job, out.reason, at);
    } else if (out.outcome === "recovery-needed" && ctx.film &&
        ctx.film.status === "validating" && ctx.ownerOk &&
        ctx.generation === job.inputGeneration) {
      job.recovery = {reason: "attempts-exhausted", evidence: {ends},
        atMs: nowMs};
    }
    // "completed" is never ready by itself; "invalid-input" is evidence only.
    return out;
  }

  /**
   * Admission transaction. Consumes an attempt only on "admitted".
   * @param {object} a {teamId, filmId, eventId, configurationOk, holder}
   * @return {Promise<object>} {decision, ctx?, job?}
   */
  function admit(a) {
    return db.runTransaction(async (tx) => {
      const at = now();
      const ctx = await load(tx, a.teamId, a.filmId);
      if (!ctx.raw) return {decision: "film-not-found"};
      if (!ctx.film) return {decision: "anomaly", reason: "film-invalid"};
      if (ctx.film.status !== "validating" || !ctx.generation) {
        return {decision: "not-validating", status: ctx.film.status};
      }
      if (ctx.jobInvalid) return {decision: "anomaly", reason: "job-invalid"};
      const created = !ctx.job;
      const job = ctx.job || newJob(ctx, at.getTime());
      if (job.terminal) return {decision: "terminal"};
      if (job.recovery) return {decision: "recovery-needed"};
      if (!ctx.ownerOk) {
        job.recovery = {reason: "team-ownership-changed", evidence: {},
          atMs: at.getTime()};
        tx.set(ctx.jRef, job);
        return {decision: "recovery-needed"};
      }
      let delivery = "process";
      if (a.eventId && job.seenEventIds.includes(a.eventId)) {
        delivery = "duplicate";
      } else if (job.lease && job.lease.untilMs > at.getTime() &&
          job.lease.holder !== a.holder) {
        delivery = "contention";
      }
      const d = c2.admissionDecision({delivery,
        configurationOk: a.configurationOk, admitted: job.admitted,
        jobCreatedAtMs: job.createdAtMs, nowMs: at.getTime()});
      if (a.eventId && delivery !== "duplicate") {
        job.seenEventIds = [...job.seenEventIds, a.eventId]
            .slice(-SEEN_EVENTS);
      }
      switch (d.outcome) {
        case "admitted": {
          job.admitted += 1;
          job.fence += 1;
          job.lease = {holder: a.holder, untilMs: at.getTime() + ttl(),
            fence: job.fence, kind: "process"};
          job.attempts = [...job.attempts, {n: job.admitted, fence: job.fence,
            admittedAtMs: at.getTime(), end: null, endedAtMs: null}];
          job.stalled = null;
          tx.set(ctx.jRef, job);
          return {decision: "admitted", ctx, job};
        }
        case "skip-duplicate":
          job.counters.duplicateDeliveries += 1;
          break;
        case "skip-contention":
          job.counters.contentionSkips += 1;
          break;
        case "stalled-configuration":
          job.counters.configurationStalls += 1;
          job.stalled = {reason: a.configurationReason || "configuration",
            atMs: at.getTime()};
          break;
        case "refused-exhausted":
        case "refused-horizon":
          maybeExhaust(tx, ctx, job, at);
          break;
        default: // invalid-input: preserved, surfaced, never forced
          if (!created) {
            logger.warn("film.worker.admission_invalid_input",
                {jobId: job.jobId});
            return {decision: "anomaly", reason: "admission-invalid-input"};
          }
      }
      tx.set(ctx.jRef, job);
      return {decision: d.outcome, exhaustion: job.exhaustion};
    });
  }

  /**
   * Fenced transaction wrapper for an admitted holder.
   * @param {object} h {teamId, filmId, jobId, holder, fence}
   * @param {function(object, object, object, Date): (object|undefined)} fn
   *   (tx, ctx, job, at) -> result; throw Stop to end without writes
   * @return {Promise<object>}
   */
  function fenced(h, fn) {
    return db.runTransaction(async (tx) => {
      const at = now();
      const ctx = await load(tx, h.teamId, h.filmId);
      const job = ctx.job;
      const ok = job && ctx.jobId === h.jobId && job.lease &&
        job.lease.holder === h.holder && job.lease.fence === h.fence &&
        job.fence === h.fence && job.lease.untilMs > at.getTime();
      if (!ok) return {ok: false, why: "fence-lost", ctx};
      try {
        const r = fn(tx, ctx, job, at) || {};
        tx.set(ctx.jRef, job);
        return {ok: true, ...r, ctx};
      } catch (e) {
        if (e instanceof Stop) return {ok: false, ...e.result, ctx};
        throw e;
      }
    });
  }

  /**
   * Lease renewal at every step boundary; false stops the pipeline.
   * @param {object} h holder
   * @return {Promise<object>}
   */
  const renew = (h) => fenced(h, (tx, ctx, job, at) => {
    if (!transitionable(ctx) || ctx.generation !== job.inputGeneration) {
      throw new Stop({why: "film-changed"});
    }
    job.lease = {...job.lease, untilMs: at.getTime() + ttl()};
  });

  /**
   * Record the end of the holder's attempt (nonterminal), then exhaust.
   * @param {object} h holder
   * @param {object} record r4 attempt record
   * @return {Promise<object>}
   */
  const endAttempt = (h, record) => fenced(h, (tx, ctx, job, at) => {
    const a = job.attempts[job.attempts.length - 1];
    a.end = record;
    a.endedAtMs = at.getTime();
    job.lease = null;
    return {exhaustion: maybeExhaust(tx, ctx, job, at)};
  });

  /**
   * Generation-matched cleanup of one recorded intent; records the result.
   * Authority: the intent recorded on the job (status-appropriate), not a
   * processing lease.
   * @param {object} where {teamId, filmId, jobId}
   * @param {"quarantine"|"output"} which
   * @return {Promise<?string>} result
   */
  async function runCleanup(where, which) {
    const snap = await jobRef(where.teamId, where.filmId, where.jobId).get();
    const p = snap.exists ? jobSchema.safeParse(snap.data()) : null;
    if (!p || !p.success) return null;
    const entry = p.data.cleanup[which];
    if (!entry || entry.result !== "pending") return entry && entry.result;
    const result = await objects.deleteGeneration(
        {name: entry.object, generation: entry.generation});
    await db.runTransaction(async (tx) => {
      const j = await tx.get(jobRef(where.teamId, where.filmId, where.jobId));
      const q = jobSchema.safeParse(j.data());
      if (!q.success) return;
      const e = q.data.cleanup[which];
      if (!e || e.result !== "pending" || e.generation !== entry.generation) {
        return;
      }
      tx.update(j.ref, {[`cleanup.${which}.result`]: result});
    });
    logger.info("film.worker.cleanup", {which, result});
    return result;
  }

  /**
   * Prove ownership of an object at the job key by bytes AND intent.
   * @param {object} job
   * @return {Promise<object>} {state: "absent"|"proven"|"unproven", ...}
   */
  async function proveOutput(job) {
    const st = await objects.stat({name: job.intent.key});
    if (!st) return {state: "absent"};
    const bytes = await objects.readGeneration(
        {name: job.intent.key, generation: st.generation});
    if (!bytes) return {state: "absent"};
    const digest = sha256(bytes);
    const md = st.metadata || {};
    const proven = digest === job.intent.outputSha256 &&
      bytes.length === job.intent.outputBytes &&
      md.jobId === job.jobId && md.inputGeneration === job.inputGeneration &&
      md.outputSha256 === job.intent.outputSha256;
    return {state: proven ? "proven" : "unproven", generation: st.generation,
      evidence: {generation: st.generation, size: bytes.length,
        sha256: digest, metadata: md}};
  }

  /**
   * Ready commit: film + existing ledger slot together, under the fence.
   * @param {object} h holder
   * @return {Promise<object>}
   */
  const commitReady = (h) => fenced(h, (tx, ctx, job, at) => {
    if (!transitionable(ctx) || ctx.generation !== job.inputGeneration ||
        !job.validated || !job.output ||
        job.output.sha256 !== job.validated.outputSha256) {
      throw new Stop({why: "ready-precondition-failed"});
    }
    tx.update(filmRef(ctx.teamId, ctx.filmId), {
      status: "ready", statusChangedAt: ts(at), readyAt: ts(at),
      media: job.validated.media,
      normalizedGeneration: job.output.generation,
      retentionExpiresAt: null,
    });
    tx.set(ledgerRef(ctx.teamId), {slots: {...ctx.slots,
      [ctx.filmId]: {...ctx.slot, status: "ready"}}, updatedAt: ts(at)});
    const a = job.attempts[job.attempts.length - 1];
    if (a && a.fence === h.fence && !a.end) {
      a.end = {end: "completed"};
      a.endedAtMs = at.getTime();
    }
    job.terminal = {outcome: "ready", reason: null, atMs: at.getTime()};
    job.lease = null;
    job.cleanup = {...job.cleanup, quarantine: {object: ctx.film.uploadPath,
      generation: ctx.generation, fence: job.fence, result: "pending"}};
  });

  /**
   * After the film left `validating` mid-run (e.g. S1 abandonment): delete
   * only output this job PROVES it owns; unknown ownership -> evidence only.
   * @param {object} where {teamId, filmId, jobId}
   * @return {Promise<string>}
   */
  async function stopForChangedFilm(where) {
    const snap = await jobRef(where.teamId, where.filmId, where.jobId).get();
    const p = snap.exists ? jobSchema.safeParse(snap.data()) : null;
    if (!p || !p.success || !p.data.intent) return "stopped";
    const job = p.data;
    let output = job.output;
    let evidence = null;
    if (!output) {
      const proof = await proveOutput(job);
      if (proof.state === "proven") {
        output = {generation: proof.generation};
      } else if (proof.state === "unproven") {
        evidence = proof.evidence;
      }
    }
    const marked = await db.runTransaction(async (tx) => {
      const at = now();
      const ctx = await load(tx, where.teamId, where.filmId);
      const fSnap = ctx.raw;
      const jSnap = await tx.get(jobRef(where.teamId, where.filmId,
          where.jobId));
      const q = jobSchema.safeParse(jSnap.data());
      if (!q.success || !fSnap) return false;
      const j = q.data;
      const status = fSnap.status;
      if (status === "validating" || j.terminal) return false;
      if (evidence) {
        j.recovery = {reason: "output-ownership-unproven", evidence,
          atMs: at.getTime()};
        tx.set(jSnap.ref, j);
        return false;
      }
      if (!output || j.cleanup.output) return false;
      j.fence += 1;
      j.lease = null;
      j.cleanup = {...j.cleanup, output: {object: j.intent.key,
        generation: output.generation, fence: j.fence, result: "pending"}};
      tx.set(jSnap.ref, j);
      return true;
    });
    if (marked) await runCleanup(where, "output");
    return "stopped";
  }

  /**
   * One processing invocation (trigger delivery or explicit synthetic
   * redrive). Platform retry is OFF; this never loops.
   * @param {object} a {teamId, filmId, eventId?}
   * @return {Promise<object>} {outcome, ...}
   */
  async function processFilm(a) {
    const holder = newId();
    const pf = await decoder.preflight();
    const adm = await admit({...a, holder, configurationOk: pf.ok,
      configurationReason: pf.reason});
    if (adm.decision !== "admitted") {
      if (adm.decision === "not-validating") {
        return {outcome: "not-validating", ...(await reconcileFilm(a))};
      }
      return {outcome: adm.decision, reason: adm.reason,
        exhaustion: adm.exhaustion || null};
    }
    const {ctx, job} = adm;
    const h = {teamId: a.teamId, filmId: a.filmId, jobId: job.jobId, holder,
      fence: job.fence};
    const where = {teamId: a.teamId, filmId: a.filmId, jobId: job.jobId};
    const work = fs.mkdtempSync(path.join(deps.tmpRoot || os.tmpdir(),
        "film-worker-"));
    try {
      // 1. generation-pinned input
      const input = path.join(work, "input.mp4");
      let got;
      try {
        got = await objects.downloadGeneration({name: ctx.film.uploadPath,
          generation: ctx.generation, dest: input});
      } catch (_) {
        const r = await endAttempt(h, {end: "infrastructure"});
        return {outcome: "attempt-ended", end: "infrastructure",
          exhaustion: r.exhaustion || null};
      }
      if (!got) {
        // Generation gone: a no-op; the lease is released (§4.6 step 1).
        await fenced(h, (tx, c, j, at) => {
          j.attempts[j.attempts.length - 1].end = {end: "unknown"};
          j.attempts[j.attempts.length - 1].endedAtMs = at.getTime();
          j.lease = null;
        });
        return {outcome: "input-gone"};
      }
      if (fs.statSync(input).size !== ctx.film.declaredBytes) {
        return await finishVerdict(h, where, "container-invalid");
      }
      // 2-6. pipeline, lease renewed before every decoder step
      const checkpoint = async () => (await renew(h)).ok;
      const out = await runPipeline({inputPath: input, workDir: work,
        decoder, checkpoint});
      if (out.outcome === "aborted") {
        await stopForChangedFilm(where);
        return {outcome: "aborted", step: out.step};
      }
      if (out.outcome === "verdict") {
        return await finishVerdict(h, where, out.reason, out.step);
      }
      if (out.outcome !== "ok") {
        const record = out.outcome === "limit-kill" ?
          {end: "limit-kill", kill: out.kill, step: out.step} :
          {end: out.outcome === "crash" ? "crash" : "infrastructure"};
        const r = await endAttempt(h, record);
        if (!r.ok) return {outcome: "fence-lost"};
        return {outcome: "attempt-ended", end: record.end,
          exhaustion: r.exhaustion || null};
      }
      // awaited inside try: the work dir must outlive the upload
      return await promote(h, where, out);
    } finally {
      fs.rmSync(work, {recursive: true, force: true});
    }
  }

  /**
   * Permanent media verdict: immediate fenced rejection + cleanup.
   * @param {object} h holder
   * @param {object} where {teamId, filmId, jobId}
   * @param {string} reason worker rejection reason
   * @param {string} [step]
   * @return {Promise<object>}
   */
  async function finishVerdict(h, where, reason, step) {
    const r = await fenced(h, (tx, ctx, job, at) => {
      if (!transitionable(ctx) || ctx.generation !== job.inputGeneration) {
        throw new Stop({why: "reject-precondition-failed"});
      }
      const a = job.attempts[job.attempts.length - 1];
      a.end = {end: "media-verdict", reason};
      a.endedAtMs = at.getTime();
      writeRejected(tx, ctx, job, reason, at);
    });
    if (!r.ok) {
      if (r.why !== "fence-lost") await stopForChangedFilm(where);
      return {outcome: r.why};
    }
    await runCleanup(where, "quarantine");
    return {outcome: "rejected", reason, step: step || null};
  }

  /**
   * Validated -> intent -> create-only upload -> proof -> ready.
   * @param {object} h holder
   * @param {object} where {teamId, filmId, jobId}
   * @param {object} out pipeline result
   * @return {Promise<object>}
   */
  async function promote(h, where, out) {
    const artifact = decoder.digests ? decoder.digests() : null;
    const rec = await fenced(h, (tx, ctx, job, at) => {
      if (!transitionable(ctx)) throw new Stop({why: "film-changed"});
      job.validated = {attemptN: job.attempts.length, fence: job.fence,
        inputSha256: out.input.sha256, inputBytes: out.input.bytes,
        outputSha256: out.output.sha256, outputBytes: out.output.bytes,
        media: out.media, artifact, policyRevision: POLICY_REVISION,
        atMs: at.getTime()};
      job.intent = {fence: job.fence,
        key: outputKey(ctx.teamId, ctx.filmId, job.jobId),
        outputSha256: out.output.sha256, outputBytes: out.output.bytes,
        atMs: at.getTime()};
    });
    if (!rec.ok) {
      if (rec.why === "film-changed") await stopForChangedFilm(where);
      return {outcome: rec.why};
    }
    const job = rec.ctx.job; // pre-write snapshot; intent recomputed below
    const key = outputKey(where.teamId, where.filmId, where.jobId);
    const intent = {key, outputSha256: out.output.sha256,
      outputBytes: out.output.bytes};
    let generation = null;
    let ambiguous = false;
    try {
      const up = await objects.createOnly({name: key, file: out.output.path,
        contentType: "video/mp4", metadata: {jobId: where.jobId,
          fence: String(h.fence), inputGeneration: job.inputGeneration,
          inputSha256: out.input.sha256, outputSha256: out.output.sha256,
          policyRevision: POLICY_REVISION}});
      generation = up.generation;
    } catch (_) {
      ambiguous = true;
    }
    let provenBy = "ack";
    if (ambiguous) {
      const proof = await proveOutput({...job, jobId: where.jobId, intent});
      if (proof.state === "proven") {
        generation = proof.generation;
        provenBy = "adopted";
      } else if (proof.state === "absent" && (await renew(h)).ok) {
        try {
          const up = await objects.createOnly({name: key,
            file: out.output.path, contentType: "video/mp4",
            metadata: {jobId: where.jobId, fence: String(h.fence),
              inputGeneration: job.inputGeneration,
              inputSha256: out.input.sha256,
              outputSha256: out.output.sha256,
              policyRevision: POLICY_REVISION}});
          generation = up.generation;
        } catch (_) {
          const r = await endAttempt(h, {end: "infrastructure"});
          return {outcome: "attempt-ended", end: "infrastructure",
            exhaustion: r.exhaustion || null};
        }
      } else {
        await fenced(h, (tx, ctx, j, at) => {
          j.recovery = {reason: "output-ownership-unproven",
            evidence: proof.evidence || {state: proof.state},
            atMs: at.getTime()};
          const a = j.attempts[j.attempts.length - 1];
          a.end = {end: "unknown"};
          a.endedAtMs = at.getTime();
          j.lease = null;
        });
        return {outcome: "recovery-needed",
          reason: "output-ownership-unproven"};
      }
    }
    const up = await fenced(h, (tx, ctx, j) => {
      if (!transitionable(ctx)) throw new Stop({why: "film-changed"});
      j.output = {generation, sha256: out.output.sha256,
        bytes: out.output.bytes, key, provenBy};
    });
    if (!up.ok) {
      if (up.why === "film-changed") await stopForChangedFilm(where);
      return {outcome: up.why};
    }
    const c = await commitReady(h);
    if (!c.ok) {
      if (c.why !== "fence-lost") await stopForChangedFilm(where);
      return {outcome: c.why};
    }
    await runCleanup(where, "quarantine");
    return {outcome: "ready", generation, media: out.media};
  }

  /**
   * Decoder-free reconciliation pass: never probes, decodes or remuxes and
   * never admits a processing attempt. Remains available after the budget
   * or horizon is exhausted.
   * @param {object} a {teamId, filmId}
   * @return {Promise<object>}
   */
  async function reconcileFilm(a) {
    const holder = newId();
    const pre = await db.runTransaction(async (tx) => {
      const at = now();
      const ctx = await load(tx, a.teamId, a.filmId);
      if (!ctx.film || !ctx.job) return {action: "none"};
      const job = ctx.job;
      if (job.lease && job.lease.untilMs > at.getTime()) {
        return {action: "busy"};
      }
      if (job.cleanup.quarantine && job.cleanup.quarantine.result ===
          "pending") {
        return {action: "cleanup-quarantine", jobId: job.jobId};
      }
      if (ctx.film.status !== "validating") {
        return {action: job.intent ? "changed" : "none", jobId: job.jobId};
      }
      if (job.terminal || job.recovery) return {action: "none"};
      if (job.validated && job.intent) {
        job.fence += 1;
        job.lease = {holder, untilMs: at.getTime() + ttl(), fence: job.fence,
          kind: "reconcile"};
        tx.set(ctx.jRef, job);
        return {action: "promote", job, fence: job.fence};
      }
      const ex = maybeExhaust(tx, ctx, job, at);
      if (ex) tx.set(ctx.jRef, job);
      return {action: ex ? "exhausted" : "none", exhaustion: ex};
    });
    const where = {teamId: a.teamId, filmId: a.filmId, jobId: pre.jobId ||
      (pre.job && pre.job.jobId)};
    if (pre.action === "cleanup-quarantine") {
      return {reconcile: "cleanup",
        result: await runCleanup(where, "quarantine")};
    }
    if (pre.action === "changed") {
      return {reconcile: await stopForChangedFilm(where)};
    }
    if (pre.action !== "promote") {
      return {reconcile: pre.action, exhaustion: pre.exhaustion || null};
    }
    const h = {...where, holder, fence: pre.fence};
    const job = pre.job;
    // Decoder-free: preflight only hashes the pinned binaries (no launch).
    const pf = await decoder.preflight();
    if (!pf.ok) {
      await fenced(h, (tx, ctx, j) => {
        j.lease = null;
      });
      return {reconcile: "stalled-configuration", reason: pf.reason};
    }
    const sameArtifact = JSON.stringify(job.validated.artifact) ===
      JSON.stringify(decoder.digests());
    if (job.validated.policyRevision !== POLICY_REVISION || !sameArtifact) {
      await fenced(h, (tx, ctx, j, at) => {
        j.recovery = {reason: "validation-record-stale", evidence: {
          policyRevision: j.validated.policyRevision}, atMs: at.getTime()};
        j.lease = null;
      });
      return {reconcile: "recovery-needed", reason: "validation-record-stale"};
    }
    if (!job.output) {
      const proof = await proveOutput(job);
      if (proof.state !== "proven") {
        await fenced(h, (tx, ctx, j, at) => {
          if (proof.state === "unproven") {
            j.recovery = {reason: "output-ownership-unproven",
              evidence: proof.evidence, atMs: at.getTime()};
          }
          j.lease = null;
        });
        return {reconcile: proof.state === "absent" ?
          "output-absent-needs-processing" : "recovery-needed"};
      }
      const r = await fenced(h, (tx, ctx, j) => {
        if (!transitionable(ctx)) throw new Stop({why: "film-changed"});
        j.output = {generation: proof.generation,
          sha256: job.intent.outputSha256, bytes: job.intent.outputBytes,
          key: job.intent.key, provenBy: "adopted"};
      });
      if (!r.ok) return {reconcile: r.why};
    }
    const c = await commitReady(h);
    if (!c.ok) return {reconcile: c.why};
    await runCleanup(where, "quarantine");
    return {reconcile: "ready"};
  }

  /**
   * Trigger handler body (onDocumentWritten teams/{t}/films/{f}). With the
   * switch OFF it returns before any Firestore, Storage or decoder call.
   * @param {object} event {id, params: {teamId, filmId}, data: {after}}
   * @return {Promise<object>}
   */
  async function onFilmWritten(event) {
    if (!isEnabled()) return {outcome: "disabled"};
    const {teamId, filmId} = (event && event.params) || {};
    const after = event && event.data && event.data.after;
    const status = after && typeof after.data === "function" ?
      (after.data() || {}).status : undefined;
    if (!teamId || !filmId || !status) return {outcome: "ignored"};
    if (status === "validating") {
      return processFilm({teamId, filmId, eventId: event.id});
    }
    if (["ready", "rejected", "abandoned"].includes(status)) {
      return reconcileFilm({teamId, filmId});
    }
    return {outcome: "ignored"};
  }

  return {onFilmWritten, processFilm, reconcileFilm,
    // test-only explicit synthetic redrive (platform retry is OFF)
    redrive: (a) => processFilm({teamId: a.teamId, filmId: a.filmId})};
}

module.exports = {createFilmWorker, jobIdFor, jobSchema, POLICY_REVISION,
  JOB_SCHEMA};
