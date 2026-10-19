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
 *    throws for a contract outcome.
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
 * FilmState: the film as the client sees it. Returned by the callables and
 * equal (field for field) to the Firestore document at
 * teams/{teamId}/films/{filmId}, where every *At field is a Timestamp.
 */
const filmState = z.object({
  filmId,
  teamId,
  createdBy: uid,
  status: filmStatus,
  createdAt: isoTimestamp,
  statusChangedAt: isoTimestamp,
  reservationExpiresAt: isoTimestamp,
  declaredBytes: z.number().int().min(1),
  declaredContentType: z.string().min(1).max(100),
  fileName: z.string().min(1).max(LIMITS.maxFileNameLength),
  rightsWordingVersion: z.string().min(1).max(40),
  rightsAcknowledgedAt: isoTimestamp,
  uploadPath: z.string().min(1).max(300),
  objectGeneration: generation.nullable(),
  rejectionReason: z.enum(REJECTION_REASONS).nullable(),
  abandonedAt: isoTimestamp.nullable(),
}).strict();

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

// -------------------------------------------------------------- requests

const reservePayload = z.object({
  teamId,
  declaredBytes: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  // Checked in code (not a literal) so a wrong type gets a distinct reason.
  declaredContentType: z.string().min(1).max(100),
  fileName: z.string().trim().min(1).max(LIMITS.maxFileNameLength),
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

const reserveData = z.object({
  filmId,
  uploadPath: z.string().min(1).max(300),
  expiresAt: isoTimestamp,
  film: filmState,
}).strict();

/**
 * Cancellation response. `film.status` is always "abandoned".
 * `previousStatus` is the status the film had when THIS operation first
 * succeeded: "reserved", "validating", or "abandoned" for a repeat abandon
 * under a new operationId. A repeat under the SAME operationId replays the
 * stored response verbatim.
 */
const abandonData = z.object({
  filmId,
  previousStatus: z.enum(["reserved", "validating", "abandoned"]),
  film: filmState.extend({status: z.literal("abandoned")}).strict(),
}).strict();

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

/** code -> retryable. Only `unavailable` is retryable. */
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
 * code -> closed set of reasons. `reason` lets the client show distinct
 * plain-language messages (FA-C2). The server never emits a pair outside
 * this table. "transport" is CLIENT-SIDE ONLY (see contract doc §6).
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
  ]),
  "conflict": Object.freeze(["operation-id-reused"]),
  "unavailable": Object.freeze(["backend-unavailable", "transport"]),
});
const CLIENT_ONLY_REASONS = Object.freeze(["transport"]);

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
  if (!ERROR_REASONS[code].includes(reason) ||
      CLIENT_ONLY_REASONS.includes(reason)) {
    throw new Error(`reason ${reason} not allowed for ${code}`);
  }
  return {ok: false, error: {code, retryable: RETRYABLE[code], reason}};
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
  CLIENT_ONLY_REASONS,
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
  },
  PAYLOAD_SCHEMAS,
  RESPONSE_SCHEMAS,
  uploadPathFor,
  errorResponseFor,
  toWireTimestamp,
};
