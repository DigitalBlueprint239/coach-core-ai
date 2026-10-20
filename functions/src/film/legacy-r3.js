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
 *  - corrupt/unsupported legacy receipt: failed-precondition/
 *    legacy-record-invalid (non-retryable, never transport);
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

/**
 * Replay decision for an operation already looked up by (uid, operationId)
 * (pure; library only — the future cutover wires it, this slice does not).
 * @param {object} q
 * @param {string} q.requestSchemaVersion "coach-film.v1" | "coach-film.v2"
 * @param {string} q.action
 * @param {string} q.payloadHash canonical payload hash (version excluded)
 * @param {number} q.nowMs
 * @param {?object} q.stored {schemaVersion?: "coach-film.v2" (absent = r3),
 *   action, payloadHash, responseJson, replayableUntilMs} or null
 * @return {object} one of {kind: "new-operation"},
 *   {kind: "replay", responseJson} (verbatim v1 string),
 *   {kind: "replay", response} (v2 object) or {kind: "error", response}
 */
function decideReplay(q) {
  const isV1 = q.requestSchemaVersion === v1.CONTRACT_VERSION;
  const isV2 = q.requestSchemaVersion === v2.CONTRACT_VERSION;
  const err = (code, reason) =>
    ({kind: "error", response: v2.errorResponseFor(code, reason)});
  if (!isV1 && !isV2) return err("invalid-argument", "schema-invalid");
  const s = q.stored;
  if (!s) {
    return isV1 ? err("invalid-argument", "unsupported-version") :
      {kind: "new-operation"};
  }
  if (s.action !== q.action || s.payloadHash !== q.payloadHash) {
    return err("conflict", "operation-id-reused");
  }
  if (q.nowMs >= s.replayableUntilMs) {
    return err("failed-precondition", "operation-expired");
  }
  const storedIsV2 = s.schemaVersion === v2.CONTRACT_VERSION;
  if (isV1) {
    // Only an original v1 receipt is replayed to a v1 request; no v1 shape
    // is invented for a v2 receipt.
    return storedIsV2 ? err("invalid-argument", "unsupported-version") :
      {kind: "replay", responseJson: s.responseJson};
  }
  if (storedIsV2) {
    try {
      const r = JSON.parse(s.responseJson);
      if (v2.RESPONSE_SCHEMAS[q.action].safeParse(r).success && r.ok) {
        return {kind: "replay", response: r};
      }
    } catch (_) {
      // fall through to legacy-record-invalid
    }
    return {kind: "error", response: legacyInvalid()};
  }
  const p = projectR3SuccessToV2(q.action, s.responseJson);
  return p.ok ? {kind: "replay", response: p.response} :
    {kind: "error", response: p.error};
}

module.exports = {SUPPORTED_RECEIPT_STATUS, projectR3SuccessToV2,
  decideReplay};
