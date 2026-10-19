"use strict";
/**
 * Coach Core Film — versioned wire contract.
 *
 * Contract version: coach-film.v1 (FILM-S1 scope: reservation + cancellation)
 *
 * This module is the server's authoritative contract. The golden fixtures in
 * tests/fixtures/coach-film.v1/ are validated against these schemas by
 * functions/test/film-contract.test.js, and contract.schema.json there is
 * generated from these schemas (drift-checked by the same test).
 *
 * Wire rules (normative; see docs/film/COACH_FILM_V1_CONTRACT.md):
 *  - Every request and every response object is STRICT: unknown keys are
 *    rejected (requests) or never emitted (responses).
 *  - Timestamps on the wire are ISO 8601 UTC strings with exactly three
 *    fractional digits and a trailing "Z" (e.g. 2026-10-19T21:15:00.000Z).
 *    In Firestore the same fields are stored as Timestamp values.
 *  - Storage object generations are decimal strings (int64 exceeds 2^53).
 *  - Absent optional state is null, never an omitted key.
 *  - Contract errors are RETURNED as {ok:false,error}. The callable never
 *    throws for a contract outcome. Unknown server failures surface as the
 *    SDK's `internal` (non-retry-eligible); see CLIENT_FAILURES.
 *  - Response invariants (IDs, paths, expiry, state-dependent fields,
 *    timestamp ordering) are enforced by these schemas, not only by fixtures.
 */
const {z} = require("zod");
const {LIMITS} = require("./limits");

const CONTRACT_VERSION = "coach-film.v1";

// Callable names == action names. A callable accepts only its own action.
const ACTIONS = Object.freeze({
  reserveFilmUpload: "reserveFilmUpload",
  abandonFilmUpload: "abandonFilmUpload",
});
const ACTION_NAMES = Object.freeze(Object.values(ACTIONS));

// ------------------------------------------------------------- primitives

const ISO_UTC_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const isoTimestamp = z.string().regex(ISO_UTC_MS)
    .refine((s) => !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString() === s, "not a canonical ISO UTC timestamp");

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const uuidV4 = z.string().regex(UUID_V4); // lowercase only

const teamId = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const filmId = uuidV4;
const uid = z.string().min(1).max(128);
const generation = z.string().regex(/^[1-9][0-9]{0,19}$/);

// --------------------------------------------------------------- state

/** Stored and reported film status. Order is not significant. */
const FILM_STATUSES = Object.freeze([
  "reserved", // reservation live; client may upload the source object
  "validating", // object received and passed the FILM-S1 box check
  "ready", // reserved for the decoder slice; never set in FILM-S1
  "rejected", // object failed validation; object deleted; slot released
  "abandoned", // owner cancelled; object deleted; slot released
  "expired", // reservation lapsed before an upload finalized; slot released
]);
const filmStatus = z.enum(FILM_STATUSES);

/** Statuses that hold one of the team's cap slots. */
const SLOT_HOLDING_STATUSES =
  Object.freeze(["reserved", "validating", "ready"]);
/** Terminal for FILM-S1: no transition leaves these. */
const TERMINAL_STATUSES = Object.freeze(["rejected", "abandoned", "expired"]);

/** Allowed transitions (server-only; no client writes film documents). */
const TRANSITIONS = Object.freeze({
  reserved: Object.freeze(["validating", "rejected", "abandoned", "expired"]),
  validating: Object.freeze(["ready", "rejected", "abandoned"]),
  ready: Object.freeze([]), // later slices (deletion) extend this
  rejected: Object.freeze([]),
  abandoned: Object.freeze([]),
  expired: Object.freeze([]),
});

const REJECTION_REASONS = Object.freeze([
  "size-mismatch", // object size != declaredBytes
  "content-type-mismatch", // object content type != declaredContentType
  "signature-invalid", // first box is not a valid 'ftyp' box
]);

/**
 * objectGeneration rule per status: "null" = must be null, "required" =
 * must be a generation, "any" = either (abandoned from reserved vs from
 * validating).
 */
const GENERATION_RULE = Object.freeze({
  reserved: "null",
  validating: "required",
  ready: "required",
  rejected: "required",
  abandoned: "any",
  expired: "null",
});

const FILM_TIMESTAMP_FIELDS = Object.freeze([
  "createdAt", "statusChangedAt", "reservationExpiresAt",
  "rightsAcknowledgedAt", "abandonedAt",
]);

/**
 * uploadPath is fully determined by teamId and filmId.
 * @param {string} team
 * @param {string} film
 * @return {string}
 */
function uploadPathFor(team, film) {
  return `quarantine/${team}/${film}/source.mp4`;
}

// Display file name. Canonical form = NFC-normalized, then leading/trailing
// whitespace trimmed (String.prototype.trim), then 1..120 UTF-16 code units,
// no C0/C1 control characters. The server stores, hashes (idempotency) and
// returns the canonical form only. Never used in a path.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;
const canonicalFileName = z.string().normalize("NFC").trim()
    .min(1).max(LIMITS.maxFileNameLength)
    .refine((v) => !CONTROL_CHARS.test(v), "control characters");
// Stored/returned file names must already be canonical (no transform).
const storedFileName = z.string().min(1).max(LIMITS.maxFileNameLength)
    .refine((v) => !CONTROL_CHARS.test(v) &&
      v === v.normalize("NFC").trim(), "file name not canonical");

/**
 * Canonicalize a display file name (client mirror must match exactly).
 * @param {string} name
 * @return {string}
 */
function canonicalizeFileName(name) {
  return name.normalize("NFC").trim();
}

const ms = (iso) => Date.parse(iso);

const filmStateShape = {
  filmId,
  teamId,
  createdBy: uid,
  status: filmStatus,
  createdAt: isoTimestamp,
  statusChangedAt: isoTimestamp,
  reservationExpiresAt: isoTimestamp,
  declaredBytes: z.number().int().min(1),
  declaredContentType: z.string().min(1).max(100),
  fileName: storedFileName,
  rightsWordingVersion: z.string().min(1).max(40),
  rightsAcknowledgedAt: isoTimestamp,
  uploadPath: z.string().min(1).max(300),
  objectGeneration: generation.nullable(),
  rejectionReason: z.enum(REJECTION_REASONS).nullable(),
  abandonedAt: isoTimestamp.nullable(),
};

/**
 * Executable FilmState invariants (authoritative; contract doc §4.1).
 * @param {object} f parsed film state
 * @param {object} ctx zod refinement context
 */
function filmInvariants(f, ctx) {
  const bad = (rule, path) => ctx.addIssue({code: "custom",
    message: `film invariant ${rule}`, path: [path]});
  if (f.uploadPath !== uploadPathFor(f.teamId, f.filmId)) {
    bad("P1 uploadPath == quarantine/{teamId}/{filmId}/source.mp4",
        "uploadPath");
  }
  if ((f.abandonedAt !== null) !== (f.status === "abandoned")) {
    bad("S1 abandonedAt non-null iff status abandoned", "abandonedAt");
  }
  if ((f.rejectionReason !== null) !== (f.status === "rejected")) {
    bad("S2 rejectionReason non-null iff status rejected", "rejectionReason");
  }
  const g = GENERATION_RULE[f.status];
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
  if ((f.status === "validating" || f.status === "rejected") &&
      !(changed < expires)) {
    bad("T6 validating/rejected: statusChangedAt < reservationExpiresAt",
        "statusChangedAt");
  }
  if (f.status === "abandoned" && f.abandonedAt !== null &&
      ms(f.abandonedAt) !== changed) {
    bad("T7 abandoned: abandonedAt == statusChangedAt", "abandonedAt");
  }
}

/**
 * FilmState: the film as the client sees it. Returned by the callables and
 * equal (field for field) to the Firestore document at
 * teams/{teamId}/films/{filmId}, where every *At field is a Timestamp.
 */
const filmState = z.object(filmStateShape).strict().superRefine(filmInvariants);

// -------------------------------------------------------------- requests

const reservePayload = z.object({
  teamId,
  declaredBytes: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  // Checked in code (not a literal) so a wrong type gets a distinct reason.
  declaredContentType: z.string().min(1).max(100),
  fileName: canonicalFileName,
  // Boolean, checked in code, so `false` gets a distinct reason.
  rightsAcknowledged: z.boolean(),
  rightsWordingVersion: z.string().min(1).max(40),
}).strict();

const abandonPayload = z.object({
  teamId,
  filmId,
}).strict();

const PAYLOAD_SCHEMAS = Object.freeze({
  reserveFilmUpload: reservePayload,
  abandonFilmUpload: abandonPayload,
});

const requestEnvelope = z.object({
  schemaVersion: z.literal(CONTRACT_VERSION),
  operationId: uuidV4,
  action: z.enum(ACTION_NAMES),
  payload: z.unknown(),
}).strict();

const reserveRequest = requestEnvelope.extend({
  action: z.literal(ACTIONS.reserveFilmUpload),
  payload: reservePayload,
}).strict();

const abandonRequest = requestEnvelope.extend({
  action: z.literal(ACTIONS.abandonFilmUpload),
  payload: abandonPayload,
}).strict();

// ------------------------------------------------------------- responses

/**
 * Reservation RECEIPT. `film` is a snapshot taken when the reservation was
 * created (status "reserved"); a same-operation replay returns this same
 * snapshot verbatim even if the film has since expired or been abandoned.
 * It is NEVER permission to upload: permission is decided at upload time
 * by Storage rules against the CURRENT film document (contract doc §7.3).
 */
const reserveData = z.object({
  filmId,
  uploadPath: z.string().min(1).max(300),
  expiresAt: isoTimestamp,
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

/**
 * Cancellation response. `film.status` is always "abandoned".
 * `previousStatus` is the status the film had when THIS operation first
 * succeeded: "reserved", "validating", or "abandoned" for a repeat abandon
 * under a new operationId. A same-operation repeat replays verbatim.
 */
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

const ERROR_CODES = Object.freeze([
  "unauthenticated",
  "permission-denied",
  "invalid-argument",
  "limit-exceeded",
  "team-cap-reached",
  "failed-precondition",
  "conflict",
  "unavailable",
]);

/**
 * code -> retryable. Only `unavailable` is retryable, and only as an
 * explicit coach action with the SAME operationId — never automatically.
 */
const RETRYABLE = Object.freeze({
  "unauthenticated": false,
  "permission-denied": false,
  "invalid-argument": false,
  "limit-exceeded": false,
  "team-cap-reached": false,
  "failed-precondition": false,
  "conflict": false,
  "unavailable": true,
});

/**
 * code -> closed set of SERVER reasons. Every pair here is server-emittable.
 * Client-side failures are a separate type (clientFailure below) and never
 * use these codes or this envelope.
 */
const ERROR_REASONS = Object.freeze({
  "unauthenticated": Object.freeze(["sign-in-required", "account-disabled"]),
  "permission-denied": Object.freeze([
    "anonymous-not-allowed", "email-not-verified", "beta-access-required",
    "not-team-owner",
  ]),
  "invalid-argument": Object.freeze([
    "schema-invalid", "action-mismatch", "rights-acknowledgement-required",
  ]),
  "limit-exceeded": Object.freeze(["bytes-over-limit", "format-not-allowed"]),
  "team-cap-reached": Object.freeze(["team-film-cap"]),
  "failed-precondition": Object.freeze([
    "rights-wording-outdated", "film-not-found", "invalid-state",
    "operation-expired",
  ]),
  "conflict": Object.freeze(["operation-id-reused"]),
  "unavailable": Object.freeze(["backend-unavailable"]),
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

const errorResponse = z.object({
  ok: z.literal(false),
  error: errorObject,
}).strict();

const okResponse = (data) => z.object({ok: z.literal(true), data}).strict();

const RESPONSE_SCHEMAS = Object.freeze({
  reserveFilmUpload: z.union([okResponse(reserveData), errorResponse]),
  abandonFilmUpload: z.union([okResponse(abandonData), errorResponse]),
});

// --------------------------------------------- client-side failures (C1)
// NOT wire data. The client mirror produces these locally when no valid
// server envelope was obtained. Key `clientFailure` (not `error`) and no
// `ok` field, so a ClientFailure can never parse as a server response and a
// server response can never parse as a ClientFailure. Retry is never
// automatic; a retry-eligible failure may be retried only by an explicit
// coach action with the SAME operationId.

/** Firebase callable SDK error codes, kept as a sanitized category. */
const SDK_ERROR_CATEGORIES = Object.freeze([
  "cancelled", "unknown", "invalid-argument", "deadline-exceeded",
  "not-found", "already-exists", "permission-denied", "resource-exhausted",
  "failed-precondition", "aborted", "out-of-range", "unimplemented",
  "internal", "unavailable", "data-loss", "unauthenticated",
]);

/**
 * kind -> category -> retryEligible. Only known transient conditions are
 * retry-eligible. Unknown / internal / access / configuration failures are
 * not, and the client must not guess a server reason for them.
 */
const CLIENT_FAILURES = Object.freeze({
  // Resolved value failed RESPONSE_SCHEMAS: client protocol error.
  protocol: Object.freeze({"response-invalid": false}),
  // Request never produced an HTTP response (offline, DNS, reset).
  network: Object.freeze({"network": true}),
  // Callable SDK threw (HttpsError / FunctionsError): sanitized code only.
  sdk: Object.freeze(Object.fromEntries(SDK_ERROR_CATEGORIES.map((cat) =>
    [cat, cat === "unavailable" || cat === "deadline-exceeded"]))),
});

const clientFailure = z.object({
  clientFailure: z.object({
    kind: z.enum(Object.keys(CLIENT_FAILURES)),
    category: z.string().min(1).max(40),
    retryEligible: z.boolean(),
  }).strict().superRefine((f, ctx) => {
    const table = CLIENT_FAILURES[f.kind];
    if (!table || !Object.prototype.hasOwnProperty.call(table, f.category)) {
      ctx.addIssue({code: "custom", message: "category not allowed for kind"});
    } else if (table[f.category] !== f.retryEligible) {
      ctx.addIssue({code: "custom", message: "retryEligible mismatch"});
    }
  }),
}).strict();

/**
 * Build a contract error response (server side).
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

/**
 * Build a client-side failure (reference for the client mirror).
 * @param {string} kind
 * @param {string} category
 * @return {{clientFailure: object}}
 */
function clientFailureFor(kind, category) {
  const table = CLIENT_FAILURES[kind];
  if (!table || !Object.prototype.hasOwnProperty.call(table, category)) {
    throw new Error(`category ${category} not allowed for ${kind}`);
  }
  return {clientFailure: {kind, category, retryEligible: table[category]}};
}

/**
 * Wire encoding for a JS Date / Firestore Timestamp.
 * @param {?(Date|object)} t
 * @return {?string}
 */
function toWireTimestamp(t) {
  if (t === null || t === undefined) return null;
  const d = typeof t.toDate === "function" ? t.toDate() : t;
  return d.toISOString();
}

module.exports = {
  CONTRACT_VERSION,
  ACTIONS,
  ACTION_NAMES,
  FILM_STATUSES,
  SLOT_HOLDING_STATUSES,
  TERMINAL_STATUSES,
  TRANSITIONS,
  REJECTION_REASONS,
  FILM_TIMESTAMP_FIELDS,
  ERROR_CODES,
  RETRYABLE,
  ERROR_REASONS,
  GENERATION_RULE,
  SDK_ERROR_CATEGORIES,
  CLIENT_FAILURES,
  schemas: {
    isoTimestamp,
    filmState,
    requestEnvelope,
    reservePayload,
    abandonPayload,
    reserveRequest,
    abandonRequest,
    reserveData,
    abandonData,
    errorObject,
    errorResponse,
    clientFailure,
    canonicalFileName,
  },
  PAYLOAD_SCHEMAS,
  RESPONSE_SCHEMAS,
  uploadPathFor,
  errorResponseFor,
  clientFailureFor,
  canonicalizeFileName,
  toWireTimestamp,
};
