"use strict";
/**
 * Stored r3 (coach-film.v1) receipts across coach-film.v2 requests.
 *
 * CONTRACT AUTHORING ONLY (FILM-S2b r4; #39 A1 c-6291542143, AGREE
 * c-6291585020). Pure library: no database, no handler wiring, no cutover.
 * Accepted v1 handlers keep accepting v1 and replaying v1 receipts unchanged.
 *
 * Agreed rules (A1 R3):
 *  - identity is unchanged: (uid, operationId) — resolved by the caller —
 *    and the canonical PAYLOAD hash; the envelope version is excluded;
 *  - a stored r3 success receipt is validated with the PINNED v1 schema,
 *    deep-copied, and only the four new FilmState keys are added as null,
 *    for the supported receipt states (reserve: reserved; abandon:
 *    abandoned). Every existing value, id and timestamp is kept. The stored
 *    serialized receipt is never modified;
 *  - the projection is the HISTORICAL receipt: never current state, never
 *    renewed upload permission, never a new film or slot;
 *  - v1 + same operation/payload, unexpired: the ORIGINAL v1 receipt,
 *    verbatim (byte-equal string);
 *  - changed payload: conflict/operation-id-reused; at/after the original
 *    replayableUntil: failed-precondition/operation-expired;
 *  - corrupt/unsupported legacy receipt or stored record (missing or
 *    non-finite expiry, unknown stored version, unknown fields), for v1 and
 *    v2 requests alike: failed-precondition/legacy-record-invalid
 *    (non-retryable, never transport);
 *  - malformed caller-built query: {kind: "invalid-input"};
 *  - a NEW v1 operation under the FUTURE cutover:
 *    invalid-argument/unsupported-version.
 */
const v1 = require("./contract");
const v2 = require("./contract-v2");

const SUPPORTED_RECEIPT_STATUS = Object.freeze({
  reserveFilmUpload: "reserved",
  abandonFilmUpload: "abandoned",
});

const legacyInvalid = () =>
  v2.errorResponseFor("failed-precondition", "legacy-record-invalid");

/**
 * Project a stored r3 success receipt to its v2 representation (pure).
 * @param {string} action "reserveFilmUpload" | "abandonFilmUpload"
 * @param {string} storedResponseJson the serialized receipt as stored
 * @return {object} {ok: true, response} or {ok: false, error}, where
 *   `error` is the v2 error response legacy-record-invalid
 */
function projectR3SuccessToV2(action, storedResponseJson) {
  if (!Object.prototype.hasOwnProperty.call(SUPPORTED_RECEIPT_STATUS, action) ||
      typeof storedResponseJson !== "string") {
    return {ok: false, error: legacyInvalid()};
  }
  let original;
  try {
    original = JSON.parse(storedResponseJson);
  } catch (_) {
    return {ok: false, error: legacyInvalid()};
  }
  // Pinned v1 schema: strict, so unknown fields fail closed here.
  if (!v1.RESPONSE_SCHEMAS[action].safeParse(original).success ||
      original.ok !== true ||
      original.data.film.status !== SUPPORTED_RECEIPT_STATUS[action]) {
    return {ok: false, error: legacyInvalid()};
  }
  const copy = JSON.parse(storedResponseJson); // independent deep copy
  const film = {};
  for (const k of v2.FILM_KEYS) {
    film[k] = v2.NEW_FILM_KEYS.includes(k) ? null : copy.data.film[k];
  }
  const response = {ok: true, data: {...copy.data, film}};
  if (!v2.RESPONSE_SCHEMAS[action].safeParse(response).success) {
    return {ok: false, error: legacyInvalid()};
  }
  return {ok: true, response};
}

const {z} = require("zod");

const ACTIONS = Object.keys(SUPPORTED_RECEIPT_STATUS);
const safeMs = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

/**
 * Caller-built replay query (exported; invoked by decideReplay). The request
 * version is any string here (an unknown version is a client error,
 * schema-invalid); every other field is server-derived. `liveFilmStatus` is
 * accepted only to document that it is IGNORED: replay is historical.
 */
const replayQuery = z.strictObject({
  requestSchemaVersion: z.string(),
  action: z.enum(ACTIONS),
  payloadHash: z.string().min(1),
  nowMs: safeMs,
  stored: z.unknown(),
  liveFilmStatus: z.enum(v1.FILM_STATUSES).optional(),
});

/**
 * Stored operation record (exported). `schemaVersion` is ABSENT for r3
 * records or exactly "coach-film.v2"; any other value — including an
 * explicit "coach-film.v1" — is invalid. replayableUntilMs is required and a
 * finite, safe, non-negative integer.
 */
const storedOperation = z.strictObject({
  schemaVersion: z.literal(v2.CONTRACT_VERSION).optional(),
  action: z.enum(ACTIONS),
  payloadHash: z.string().min(1),
  responseJson: z.string(),
  replayableUntilMs: safeMs,
});

/**
 * Validate a stored v2 success receipt (strict v2 schema, supported state).
 * @param {string} action
 * @param {string} json
 * @return {?object} the parsed receipt, or null when invalid
 */
function parseStoredV2(action, json) {
  try {
    const r = JSON.parse(json);
    if (v2.RESPONSE_SCHEMAS[action].safeParse(r).success && r.ok === true &&
        r.data.film.status === SUPPORTED_RECEIPT_STATUS[action]) {
      return r;
    }
  } catch (_) {
    // invalid
  }
  return null;
}

/**
 * Replay decision for an operation already looked up by (uid, operationId)
 * (pure and total; library only — the future cutover wires it, this slice
 * does not). Order, fail-closed:
 *  1. query fails `replayQuery` -> {kind: "invalid-input"} (caller bug:
 *     never a replay, never a new operation);
 *  2. unknown request version -> invalid-argument/schema-invalid;
 *  3. no stored record -> new operation (v2) / unsupported-version (v1);
 *  4. stored record fails `storedOperation` (missing or non-finite expiry,
 *     unknown stored version, unknown fields) -> legacy-record-invalid;
 *  5. action or payload differs -> conflict/operation-id-reused;
 *  6. now >= the ORIGINAL replayableUntil -> operation-expired;
 *  7. stored receipt content invalid for its version (corrupt JSON, error
 *     receipt, unknown fields, unsupported or impossible state) ->
 *     legacy-record-invalid — for v1 AND v2 requests, before either path;
 *  8. v1 request: r3 receipt -> the original string verbatim; v2 receipt ->
 *     unsupported-version. v2 request: v2 receipt as stored; r3 receipt ->
 *     projection.
 * @param {object} q see replayQuery; q.stored see storedOperation (or null)
 * @return {object} one of {kind: "invalid-input"}, {kind: "new-operation"},
 *   {kind: "replay", responseJson} (verbatim v1 string),
 *   {kind: "replay", response} (v2 object) or {kind: "error", response}
 */
function decideReplay(q) {
  const qv = replayQuery.safeParse(q);
  if (!qv.success) return {kind: "invalid-input"};
  const isV1 = q.requestSchemaVersion === v1.CONTRACT_VERSION;
  const isV2 = q.requestSchemaVersion === v2.CONTRACT_VERSION;
  const err = (code, reason) =>
    ({kind: "error", response: v2.errorResponseFor(code, reason)});
  if (!isV1 && !isV2) return err("invalid-argument", "schema-invalid");
  if (q.stored === null || q.stored === undefined) {
    return isV1 ? err("invalid-argument", "unsupported-version") :
      {kind: "new-operation"};
  }
  const sv = storedOperation.safeParse(q.stored);
  if (!sv.success) return {kind: "error", response: legacyInvalid()};
  const s = sv.data;
  if (s.action !== q.action || s.payloadHash !== q.payloadHash) {
    return err("conflict", "operation-id-reused");
  }
  if (q.nowMs >= s.replayableUntilMs) {
    return err("failed-precondition", "operation-expired");
  }
  const storedIsV2 = s.schemaVersion === v2.CONTRACT_VERSION;
  const v2Receipt = storedIsV2 ? parseStoredV2(s.action, s.responseJson) :
    null;
  const projection = storedIsV2 ? null :
    projectR3SuccessToV2(s.action, s.responseJson);
  if (storedIsV2 ? !v2Receipt : !projection.ok) {
    return {kind: "error", response: legacyInvalid()};
  }
  if (isV1) {
    // Only a VALID original v1 receipt is replayed to a v1 request, byte for
    // byte; no v1 shape is invented for a v2 receipt.
    return storedIsV2 ? err("invalid-argument", "unsupported-version") :
      {kind: "replay", responseJson: s.responseJson};
  }
  return storedIsV2 ? {kind: "replay", response: v2Receipt} :
    {kind: "replay", response: projection.response};
}

module.exports = {SUPPORTED_RECEIPT_STATUS, projectR3SuccessToV2,
  decideReplay, schemas: {replayQuery, storedOperation}};
