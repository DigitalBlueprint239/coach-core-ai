"use strict";
/**
 * Coach Core Film — wire contract coach-film.v2 (contract revision r4).
 *
 * CONTRACT AUTHORING ONLY (FILM-S2b r4, authorized 2026-10-20, #39
 * c-6291585020 / A1 c-6291542143). This module is ADDITIVE: it does not
 * change, replace or re-export over the accepted v1 contract
 * (./contract.js, coach-film.v1, r3). No handler, trigger or rule uses it.
 * Accepted S1 runtime behaviour is unchanged.
 *
 * What v2 adds to v1 (normative doc: docs/film/COACH_FILM_V2_CONTRACT.md):
 *  - schemaVersion "coach-film.v2" on requests;
 *  - FilmState keys readyAt, normalizedGeneration, media, retentionExpiresAt
 *    (always present on the wire; null unless status == "ready";
 *    retentionExpiresAt is ALWAYS null in this slice — D4 pending);
 *  - worker rejection reasons (closed set);
 *  - error reasons invalid-argument/unsupported-version and
 *    failed-precondition/legacy-record-invalid (non-retryable);
 *  - invariants R5–R9 and the T6' amendment (late worker outcomes);
 *  - FilmDocument: the STORED-document reader, where the four new keys may be
 *    absent (read as null) for non-ready statuses only. Never used for
 *    callable responses;
 *  - the agreed worker attempt policy as data plus pure helpers (no engine).
 *
 * Every v1 field definition is reused from ./contract.js unchanged.
 */
const {z} = require("zod");
const v1 = require("./contract");
const {LIMITS, PENDING} = require("./limits");

const CONTRACT_VERSION = "coach-film.v2";
const PREVIOUS_CONTRACT_VERSION = v1.CONTRACT_VERSION; // "coach-film.v1"

// ------------------------------------------------------------ reasons

/** S1 intake rejection reasons (unchanged from v1). */
const S1_REJECTION_REASONS = Object.freeze([...v1.REJECTION_REASONS]);

/** Worker rejection reasons (closed set, new in v2). */
const WORKER_REJECTION_REASONS = Object.freeze([
  "container-invalid", // structural check failed (incl. oversized boxes)
  "metadata-invalid", // missing / NaN / non-positive probe values
  "video-stream-missing",
  "video-codec-not-allowed",
  "audio-codec-not-allowed",
  "stream-count-exceeded",
  "duration-over-limit",
  "resolution-over-limit", // width OR height
  "media-corrupt", // strict full decode reported an error
  "output-invalid", // normalized output failed independent validation
  "processing-limit-exceeded", // classified own-limit kills, see policy
]);

const REJECTION_REASONS = Object.freeze([
  ...S1_REJECTION_REASONS, ...WORKER_REJECTION_REASONS,
]);

/** Error reasons: v1 table plus two non-retryable additions. */
const ERROR_REASONS = Object.freeze(Object.fromEntries(
    Object.entries(v1.ERROR_REASONS).map(([code, reasons]) => {
      const extra = {
        "invalid-argument": ["unsupported-version"],
        "failed-precondition": ["legacy-record-invalid"],
      }[code] || [];
      return [code, Object.freeze([...reasons, ...extra])];
    })));
const ERROR_CODES = v1.ERROR_CODES;
const RETRYABLE = v1.RETRYABLE; // unchanged: only `unavailable` is retryable

// ------------------------------------------------------------ primitives

const isoTimestamp = v1.schemas.isoTimestamp;
const generation = z.string().regex(/^[1-9][0-9]{0,19}$/);
const HEX64 = /^[0-9a-f]{64}$/;

/** Normalized-output facts. All limits are PENDING_D3 test placeholders. */
const media = z.object({
  bytes: z.number().int().min(1),
  durationMs: z.number().int().min(1),
  width: z.number().int().min(2),
  height: z.number().int().min(2),
  videoCodec: z.literal("h264"),
  audioCodec: z.literal("aac").nullable(),
  frameRateMode: z.enum(["cfr", "vfr"]),
  sha256: z.string().regex(HEX64),
}).strict();

const NEW_FILM_KEYS = Object.freeze([
  "readyAt", "normalizedGeneration", "media", "retentionExpiresAt",
]);
const FILM_TIMESTAMP_FIELDS = Object.freeze([
  ...v1.FILM_TIMESTAMP_FIELDS, "readyAt", "retentionExpiresAt",
]);

const filmStateShape = {
  ...v1.schemas.filmState.shape, // every v1 field, unchanged, except:
  // the closed reason set grows by the worker reasons (S1 reasons unchanged)
  rejectionReason: z.enum(REJECTION_REASONS).nullable(),
  readyAt: isoTimestamp.nullable(),
  normalizedGeneration: generation.nullable(),
  media: media.nullable(),
  retentionExpiresAt: isoTimestamp.nullable(),
};
/** Key order on the wire: the v1 order, then the four new keys. */
const FILM_KEYS = Object.freeze(Object.keys(filmStateShape));

const ms = (iso) => Date.parse(iso);

/**
 * v2 FilmState invariants. Rules P1, S1, S2, G1, G2, T1–T5, T7 are the v1
 * rules restated unchanged (v1 does not export them); T6 becomes T6'; R5–R9
 * are new. Messages keep the v1 rule ids.
 * @param {object} f parsed film state
 * @param {object} ctx zod refinement context
 */
function filmInvariantsV2(f, ctx) {
  const bad = (rule, path) => ctx.addIssue({code: "custom",
    message: `film invariant ${rule}`, path: [path]});
  if (f.uploadPath !== v1.uploadPathFor(f.teamId, f.filmId)) {
    bad("P1 uploadPath == quarantine/{teamId}/{filmId}/source.mp4",
        "uploadPath");
  }
  if ((f.abandonedAt !== null) !== (f.status === "abandoned")) {
    bad("S1 abandonedAt non-null iff status abandoned", "abandonedAt");
  }
  if ((f.rejectionReason !== null) !== (f.status === "rejected")) {
    bad("S2 rejectionReason non-null iff status rejected", "rejectionReason");
  }
  if (f.rejectionReason !== null &&
      !REJECTION_REASONS.includes(f.rejectionReason)) {
    bad("S2 rejectionReason in the closed v2 set", "rejectionReason");
  }
  const g = v1.GENERATION_RULE[f.status];
  if (g === "null" && f.objectGeneration !== null) {
    bad(`G1 objectGeneration null when ${f.status}`, "objectGeneration");
  }
  if (g === "required" && f.objectGeneration === null) {
    bad(`G2 objectGeneration required when ${f.status}`, "objectGeneration");
  }
  const created = ms(f.createdAt);
  const changed = ms(f.statusChangedAt);
  const expires = ms(f.reservationExpiresAt);
  if (ms(f.rightsAcknowledgedAt) > created) {
    bad("T1 rightsAcknowledgedAt <= createdAt", "rightsAcknowledgedAt");
  }
  if (!(created < expires)) {
    bad("T2 createdAt < reservationExpiresAt", "reservationExpiresAt");
  }
  if (changed < created) {
    bad("T3 createdAt <= statusChangedAt", "statusChangedAt");
  }
  if (f.status === "reserved" && changed !== created) {
    bad("T4 reserved: statusChangedAt == createdAt", "statusChangedAt");
  }
  if (f.status === "expired" && changed < expires) {
    bad("T5 expired: statusChangedAt >= reservationExpiresAt",
        "statusChangedAt");
  }
  // T6' (r4 amendment): only validating and S1-intake rejections must happen
  // before the reservation lapses; worker rejections and ready may be later.
  const s1Rejection = f.status === "rejected" &&
    S1_REJECTION_REASONS.includes(f.rejectionReason);
  if ((f.status === "validating" || s1Rejection) && !(changed < expires)) {
    bad("T6' validating / S1-intake rejected: statusChangedAt < " +
      "reservationExpiresAt", "statusChangedAt");
  }
  if (f.status === "abandoned" && f.abandonedAt !== null &&
      ms(f.abandonedAt) !== changed) {
    bad("T7 abandoned: abandonedAt == statusChangedAt", "abandonedAt");
  }
  // R5: the three ready keys are non-null iff ready.
  const isReady = f.status === "ready";
  for (const k of ["readyAt", "normalizedGeneration", "media"]) {
    if ((f[k] !== null) !== isReady) bad(`R5 ${k} non-null iff ready`, k);
  }
  if (isReady && f.readyAt !== null && ms(f.readyAt) !== changed) {
    bad("R6 ready: readyAt == statusChangedAt", "readyAt");
  }
  if (f.retentionExpiresAt !== null) {
    bad("R7 retentionExpiresAt null (D4 pending)", "retentionExpiresAt");
  }
  if (isReady && f.objectGeneration === null) {
    bad("R8 ready: objectGeneration required", "objectGeneration");
  }
  if (f.media) {
    const m = f.media;
    if (m.bytes > LIMITS.maxBytes) bad("R9 media.bytes <= maxBytes", "media");
    if (m.durationMs > LIMITS.maxDurationMs) {
      bad("R9 media.durationMs <= maxDurationMs", "media");
    }
    if (m.width > LIMITS.maxWidth) bad("R9 media.width <= maxWidth", "media");
    if (m.height > LIMITS.maxHeight) {
      bad("R9 media.height <= maxHeight", "media");
    }
  }
}

/** Wire FilmState (strict; all keys present). */
const filmState = z.object(filmStateShape).strict()
    .superRefine(filmInvariantsV2);

/**
 * Stored FilmDocument reader: the four new keys may be ABSENT (read as null)
 * when the stored status is not "ready". A ready document must carry them.
 * Present keys must be valid. Never used for callable responses.
 */
const filmDocument = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  if (raw.status === "ready") return raw;
  const out = {...raw};
  for (const k of NEW_FILM_KEYS) if (!(k in out)) out[k] = null;
  return out;
}, filmState);

// ------------------------------------------------------------ requests

const requestEnvelope = z.object({
  schemaVersion: z.literal(CONTRACT_VERSION),
  operationId: v1.schemas.requestEnvelope.shape.operationId,
  action: z.enum(v1.ACTION_NAMES),
  payload: z.unknown(),
}).strict();

/** Payloads are unchanged from v1 (same canonical identity). */
const PAYLOAD_SCHEMAS = v1.PAYLOAD_SCHEMAS;

const reserveRequest = requestEnvelope.extend({
  action: z.literal(v1.ACTIONS.reserveFilmUpload),
  payload: v1.schemas.reservePayload,
}).strict();
const abandonRequest = requestEnvelope.extend({
  action: z.literal(v1.ACTIONS.abandonFilmUpload),
  payload: v1.schemas.abandonPayload,
}).strict();

// ------------------------------------------------------------ responses

const filmId = v1.schemas.reserveData.shape.filmId;

/** Reserve receipt (R1–R4 as in v1, film is a v2 FilmState). */
const reserveData = z.object({
  filmId,
  uploadPath: z.string().min(1).max(300),
  expiresAt: isoTimestamp, // RESERVATION expiry (unchanged meaning)
  film: filmState,
}).strict().superRefine((d, ctx) => {
  const bad = (rule, path) => ctx.addIssue({code: "custom",
    message: `reserve invariant ${rule}`, path: [path]});
  if (d.filmId !== d.film.filmId) bad("R1 filmId == film.filmId", "filmId");
  if (d.uploadPath !== d.film.uploadPath) {
    bad("R2 uploadPath == film.uploadPath", "uploadPath");
  }
  if (d.expiresAt !== d.film.reservationExpiresAt) {
    bad("R3 expiresAt == film.reservationExpiresAt", "expiresAt");
  }
  if (d.film.status !== "reserved") {
    bad("R4 receipt snapshot status is reserved", "film");
  }
});

/** Cancellation (A1–A4 as in v1, film is a v2 FilmState). */
const abandonData = z.object({
  filmId,
  previousStatus: z.enum(["reserved", "validating", "abandoned"]),
  film: filmState,
}).strict().superRefine((d, ctx) => {
  const bad = (rule, path) => ctx.addIssue({code: "custom",
    message: `abandon invariant ${rule}`, path: [path]});
  if (d.filmId !== d.film.filmId) bad("A1 filmId == film.filmId", "filmId");
  if (d.film.status !== "abandoned") bad("A2 film.status abandoned", "film");
  if (d.previousStatus === "reserved" && d.film.objectGeneration !== null) {
    bad("A3 from reserved: no generation", "previousStatus");
  }
  if (d.previousStatus === "validating" && d.film.objectGeneration === null) {
    bad("A4 from validating: generation required", "previousStatus");
  }
});

const errorObject = z.object({
  code: z.enum(ERROR_CODES),
  retryable: z.boolean(),
  reason: z.string().min(1).max(60),
}).strict().superRefine((e, ctx) => {
  if (RETRYABLE[e.code] !== e.retryable) {
    ctx.addIssue({code: "custom", message: "retryable does not match code"});
  }
  if (!ERROR_REASONS[e.code].includes(e.reason)) {
    ctx.addIssue({code: "custom", message: "reason not allowed for code"});
  }
});
const errorResponse = z.object({ok: z.literal(false), error: errorObject})
    .strict();
const okResponse = (data) => z.object({ok: z.literal(true), data}).strict();

const RESPONSE_SCHEMAS = Object.freeze({
  reserveFilmUpload: z.union([okResponse(reserveData), errorResponse]),
  abandonFilmUpload: z.union([okResponse(abandonData), errorResponse]),
});

/**
 * Build a v2 contract error response.
 * @param {string} code
 * @param {string} reason
 * @return {{ok: false, error: object}}
 */
function errorResponseFor(code, reason) {
  if (!Object.prototype.hasOwnProperty.call(RETRYABLE, code)) {
    throw new Error(`unknown code ${code}`);
  }
  if (!ERROR_REASONS[code].includes(reason)) {
    throw new Error(`reason ${reason} not allowed for ${code}`);
  }
  return {ok: false, error: {code, retryable: RETRYABLE[code], reason}};
}

// --------------------------------------- worker attempt policy (A1 R1)
// Agreed design of record for the FUTURE worker. Data and pure helpers only:
// no admission engine, lease, retry or trigger exists in this slice.

const WORKER_ATTEMPT_POLICY = Object.freeze({
  status: "TEST_ONLY",
  maxAdmittedAttempts: 3, // one cumulative ceiling, INCLUDING the first
  admissionHorizonMs: 6 * 60 * 60 * 1000, // from job creation; no new admit
  platformRetry: false, // OFF: explicit synthetic redrive only
});

/** Own-limit kills that may count toward processing-limit-exceeded. */
const CLASSIFIED_LIMIT_KILLS = Object.freeze([
  "SIGXCPU", "wall-time", "SIGXFSZ", "allocation-failure",
]);

/**
 * Every kill value an attempt record may carry: the classified own-limit
 * kills plus an undifferentiated SIGKILL (never classified). Closed set.
 */
const LIMIT_KILL_SIGNALS = Object.freeze([...CLASSIFIED_LIMIT_KILLS,
  "SIGKILL"]);

/**
 * Bounded decoder subprocess steps (S2b package §4.6 steps 3, 5, 6, 7) that
 * run under resource limits and so can end in a limit kill. Closed set.
 */
const PIPELINE_STEPS = Object.freeze([
  "probe-input", "decode-input", "normalize", "probe-output", "decode-output",
]);

/**
 * Reasons an attempt's own media verdict may carry. processing-limit-exceeded
 * is excluded: only exhaustionOutcome derives it, never an attempt.
 */
const MEDIA_VERDICT_REASONS = Object.freeze(WORKER_REJECTION_REASONS
    .filter((r) => r !== "processing-limit-exceeded"));

const safeMs = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

/**
 * Validated input of admissionDecision (exported; invoked by the helper).
 * Counts are safe integers within the ceiling; times are finite, safe,
 * non-negative integers with nowMs >= jobCreatedAtMs.
 */
const admissionInput = z.strictObject({
  delivery: z.enum(["process", "duplicate", "contention"]),
  configurationOk: z.boolean(),
  admitted: z.number().int().min(0)
      .max(WORKER_ATTEMPT_POLICY.maxAdmittedAttempts),
  jobCreatedAtMs: safeMs,
  nowMs: safeMs,
}).refine((s) => s.nowMs >= s.jobCreatedAtMs,
    {message: "nowMs precedes jobCreatedAtMs", path: ["nowMs"]});

/** One admitted attempt's end (exported; strict, closed per variant). */
const attemptRecord = z.discriminatedUnion("end", [
  z.strictObject({end: z.literal("media-verdict"),
    reason: z.enum(MEDIA_VERDICT_REASONS)}),
  z.strictObject({end: z.literal("limit-kill"),
    kill: z.enum(LIMIT_KILL_SIGNALS), step: z.enum(PIPELINE_STEPS)}),
  z.strictObject({end: z.literal("infrastructure")}),
  z.strictObject({end: z.literal("unknown")}),
  z.strictObject({end: z.literal("crash")}),
  z.strictObject({end: z.literal("completed")}),
]);

const TERMINAL_ENDS = ["media-verdict", "completed"];

/**
 * Validated input of exhaustionOutcome: 1..3 admitted attempts in order; a
 * terminal end (media verdict, completed) may only be the last attempt.
 */
const exhaustionInput = z.array(attemptRecord).min(1)
    .max(WORKER_ATTEMPT_POLICY.maxAdmittedAttempts)
    .refine((a) => a.slice(0, -1).every((x) => !TERMINAL_ENDS.includes(x.end)),
        {message: "terminal attempt end before the last attempt"});

/**
 * Admission decision for one invocation (pure and total: never throws).
 * Input failing `admissionInput` (missing, NaN, infinite, fractional,
 * negative or out-of-range counts/times, unknown fields or deliveries) is
 * refused as `invalid-input`: never admitted, never consumed.
 * Duplicate deliveries and contention are not admissions; configuration
 * preflight failures stall without consuming an attempt.
 * @param {object} s see admissionInput
 * @return {{admit: boolean, consumes: boolean, outcome: string}}
 */
function admissionDecision(s) {
  const p = WORKER_ATTEMPT_POLICY;
  const v = admissionInput.safeParse(s);
  if (!v.success) {
    return {admit: false, consumes: false, outcome: "invalid-input"};
  }
  const d = v.data;
  if (d.delivery === "duplicate" || d.delivery === "contention") {
    return {admit: false, consumes: false, outcome: `skip-${d.delivery}`};
  }
  if (!d.configurationOk) {
    return {admit: false, consumes: false, outcome: "stalled-configuration"};
  }
  if (d.admitted >= p.maxAdmittedAttempts) {
    return {admit: false, consumes: false, outcome: "refused-exhausted"};
  }
  if (d.nowMs >= d.jobCreatedAtMs + p.admissionHorizonMs) {
    return {admit: false, consumes: false, outcome: "refused-horizon"};
  }
  return {admit: true, consumes: true, outcome: "admitted"};
}

/**
 * Outcome once no further attempt may be admitted (pure and total).
 * `attempts` must satisfy `exhaustionInput`; otherwise the result is
 * `invalid-input` — never a rejection: the film stays validating and
 * slot-holding exactly as for recovery-needed.
 * - A media verdict (last attempt; recognized reason) rejects with it.
 * - processing-limit-exceeded only when the FINAL attempt and at least one
 *   earlier attempt ended in a classified own-limit kill on the SAME
 *   (required, recognized) pipeline step.
 * - Everything else: recovery-needed (film stays validating, slot-holding;
 *   never a media rejection).
 * @param {object[]} attempts see exhaustionInput
 * @return {{outcome: string, reason: ?string}}
 */
function exhaustionOutcome(attempts) {
  const v = exhaustionInput.safeParse(attempts);
  if (!v.success) return {outcome: "invalid-input", reason: null};
  const a = v.data;
  const last = a[a.length - 1];
  if (last.end === "media-verdict") {
    return {outcome: "rejected", reason: last.reason};
  }
  if (last.end === "completed") return {outcome: "completed", reason: null};
  const isKill = (x) => x.end === "limit-kill" &&
    CLASSIFIED_LIMIT_KILLS.includes(x.kill);
  if (isKill(last) && a.slice(0, -1)
      .some((x) => isKill(x) && x.step === last.step)) {
    return {outcome: "rejected", reason: "processing-limit-exceeded"};
  }
  return {outcome: "recovery-needed", reason: null};
}

module.exports = {
  CONTRACT_VERSION,
  PREVIOUS_CONTRACT_VERSION,
  S1_REJECTION_REASONS,
  WORKER_REJECTION_REASONS,
  REJECTION_REASONS,
  ERROR_CODES,
  RETRYABLE,
  ERROR_REASONS,
  NEW_FILM_KEYS,
  FILM_KEYS,
  FILM_TIMESTAMP_FIELDS,
  PENDING_LIMITS: Object.freeze({
    maxBytes: PENDING.maxBytes, maxDurationMs: PENDING.maxDurationMs,
    maxWidth: PENDING.maxWidth, maxHeight: PENDING.maxHeight,
  }),
  WORKER_ATTEMPT_POLICY,
  CLASSIFIED_LIMIT_KILLS,
  LIMIT_KILL_SIGNALS,
  PIPELINE_STEPS,
  MEDIA_VERDICT_REASONS,
  schemas: {
    media, filmState, filmDocument, requestEnvelope, reserveRequest,
    abandonRequest, reserveData, abandonData, errorObject, errorResponse,
    admissionInput, attemptRecord, exhaustionInput,
  },
  PAYLOAD_SCHEMAS,
  RESPONSE_SCHEMAS,
  errorResponseFor,
  admissionDecision,
  exhaustionOutcome,
};
