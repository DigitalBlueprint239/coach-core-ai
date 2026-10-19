"use strict";
/* eslint-disable max-len, one-var */
// Authoring helper for coach-film.v1 golden fixtures. The committed JSON
// files are the source of truth; this script records how they were made.
//   node functions/scripts/film-fixtures.js tests/fixtures/coach-film.v1
// Fixture changes need review from both owners on issue #39.
const fs = require("fs"); const path = require("path");
const out = process.argv[2];
for (const f of fs.readdirSync(out)) if (f.endsWith(".json")) fs.unlinkSync(path.join(out, f));
fs.mkdirSync(out, {recursive: true});
const V = "coach-film.v1";
const TEAM = "team_fixture_a", UID = "uid-fixture-owner";
const FILM = "3f1e2d4c-5b6a-4e7f-8a9b-0c1d2e3f4a5b";
const OP = {
  reserve: "0b7c9e1a-2d3f-4a5b-8c6d-7e8f9a0b1c2d",
  abandon: "1c8daf2b-3e4f-4b6c-9d7e-8f9a0b1c2d3e",
  abandonRepeat: "2d9eb03c-4f5a-4c7d-ae8f-9a0b1c2d3e4f",
};
const T0 = "2026-10-19T21:00:00.000Z", T1 = "2026-10-19T21:04:12.345Z",
  T2 = "2026-10-19T21:06:30.000Z", EXP = "2026-10-19T22:00:00.000Z";
const reservePayload = {teamId: TEAM, declaredBytes: 48211954,
  declaredContentType: "video/mp4", fileName: "vs-eagles-q2-drive.mp4",
  rightsAcknowledged: true, rightsWordingVersion: "rights-v1"};
const UP = `quarantine/${TEAM}/${FILM}/source.mp4`;
const base = {filmId: FILM, teamId: TEAM, createdBy: UID, status: "reserved",
  createdAt: T0, statusChangedAt: T0, reservationExpiresAt: EXP,
  declaredBytes: 48211954, declaredContentType: "video/mp4",
  fileName: "vs-eagles-q2-drive.mp4", rightsWordingVersion: "rights-v1",
  rightsAcknowledgedAt: T0, uploadPath: UP, objectGeneration: null,
  rejectionReason: null, abandonedAt: null};
const st = (o) => ({...base, ...o});
const states = {
  reserved: st({}),
  validating: st({status: "validating", statusChangedAt: T1, objectGeneration: "1760907852345678"}),
  rejected: st({status: "rejected", statusChangedAt: T1, objectGeneration: "1760907852345678", rejectionReason: "signature-invalid"}),
  abandonedFromReserved: st({status: "abandoned", statusChangedAt: T2, abandonedAt: T2}),
  abandonedFromValidating: st({status: "abandoned", statusChangedAt: T2, abandonedAt: T2, objectGeneration: "1760907852345678"}),
  expired: st({status: "expired", statusChangedAt: "2026-10-19T22:00:00.000Z"}),
};
const manifest = [];
const put = (file, value, meta) => {
  fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + "\n");
  manifest.push({file, ...meta});
};
const req = (op, action, payload) => ({schemaVersion: V, operationId: op, action, payload});
// ---- requests (valid)
put("reserve.request.valid.json", req(OP.reserve, "reserveFilmUpload", reservePayload),
    {kind: "request", action: "reserveFilmUpload", valid: true});
put("reserve.request.at-byte-limit.json", req("3eafc14d-5a6b-4d8e-bf9a-0b1c2d3e4f5a", "reserveFilmUpload", {...reservePayload, declaredBytes: 100000000}),
    {kind: "request", action: "reserveFilmUpload", valid: true, placeholder: "PENDING_D3", note: "exactly LIMITS.maxBytes; accepted"});
put("abandon.request.valid.json", req(OP.abandon, "abandonFilmUpload", {teamId: TEAM, filmId: FILM}),
    {kind: "request", action: "abandonFilmUpload", valid: true});
put("reserve.request.file-name-canonicalized.json", req("c13850d6-e34f-4a71-8c8d-9eafb0c1d2e3", "reserveFilmUpload", {...reservePayload, fileName: "  Cafe\u0301 drive.mp4\t"}),
    {kind: "request", action: "reserveFilmUpload", valid: true, canonicalFileName: "Caf\u00e9 drive.mp4", note: "NFC then trim; the server stores, hashes and returns the canonical form"});
// ---- requests the server must reject (schema-valid ones get a code from handler logic)
const bad = (file, value, action, code, reason, schemaValid, note, placeholder) =>
  put(file, value, {kind: "request", action, valid: false, schemaValid, expect: {code, reason}, ...(note ? {note} : {}), ...(placeholder ? {placeholder} : {})});
bad("reserve.request.over-byte-limit.json", req("4fb0d25e-6b7c-4e9f-8a0b-1c2d3e4f5a6b", "reserveFilmUpload", {...reservePayload, declaredBytes: 100000001}),
    "reserveFilmUpload", "limit-exceeded", "bytes-over-limit", true, "LIMITS.maxBytes + 1", "PENDING_D3");
bad("reserve.request.format-not-allowed.json", req("5ac1e36f-7c8d-4f0a-9b1c-2d3e4f5a6b7c", "reserveFilmUpload", {...reservePayload, declaredContentType: "video/quicktime", fileName: "IMG_0412.MOV"}),
    "reserveFilmUpload", "limit-exceeded", "format-not-allowed", true, null, "PENDING_D3");
bad("reserve.request.rights-not-acknowledged.json", req("6bd2f470-8d9e-4a1b-8c2d-3e4f5a6b7c8d", "reserveFilmUpload", {...reservePayload, rightsAcknowledged: false}),
    "reserveFilmUpload", "invalid-argument", "rights-acknowledgement-required", true);
bad("reserve.request.rights-wording-outdated.json", req("7ce30581-9eaf-4b2c-9d3e-4f5a6b7c8d9e", "reserveFilmUpload", {...reservePayload, rightsWordingVersion: "rights-v0"}),
    "reserveFilmUpload", "failed-precondition", "rights-wording-outdated", true, null, "PENDING_D7");
bad("reserve.request.unknown-field.json", req("8df41692-af0b-4c3d-ae4f-5a6b7c8d9eaf", "reserveFilmUpload", {...reservePayload, status: "ready"}),
    "reserveFilmUpload", "invalid-argument", "schema-invalid", false, "client-chosen status must be rejected, not ignored");
bad("reserve.request.wrong-schema-version.json", {...req("9e0527a3-b01c-4d4e-bf5a-6b7c8d9eafb0", "reserveFilmUpload", reservePayload), schemaVersion: "coach-film.v0"},
    "reserveFilmUpload", "invalid-argument", "schema-invalid", false);
bad("reserve.request.file-name-too-long.json", req("af1638b4-c12d-4e5f-8a6b-7c8d9eafb0c1", "reserveFilmUpload", {...reservePayload, fileName: "a".repeat(117) + ".mp4"}),
    "reserveFilmUpload", "invalid-argument", "schema-invalid", false, "121 characters");
bad("reserve.request.file-name-control-char.json", req("d24961e7-f450-4b82-9d9e-afb0c1d2e3f4", "reserveFilmUpload", {...reservePayload, fileName: "clip\u0007.mp4"}),
    "reserveFilmUpload", "invalid-argument", "schema-invalid", false);
bad("reserve.request.operation-id-not-uuid-v4.json", req("not-a-uuid", "reserveFilmUpload", reservePayload),
    "reserveFilmUpload", "invalid-argument", "schema-invalid", false);
bad("reserve.request.action-mismatch.json", req("b02749c5-d23e-4f60-9b7c-8d9eafb0c1d2", "abandonFilmUpload", {teamId: TEAM, filmId: FILM}),
    "reserveFilmUpload", "invalid-argument", "action-mismatch", false, "valid abandon envelope sent to the reserveFilmUpload callable");
bad("reserve.request.operation-id-reused.json", req(OP.reserve, "reserveFilmUpload", {...reservePayload, declaredBytes: 48211955}),
    "reserveFilmUpload", "conflict", "operation-id-reused", true, "same caller + operationId as reserve.request.valid.json, different payload");
// ---- responses
put("reserve.response.ok.json", {ok: true, data: {filmId: FILM, uploadPath: UP, expiresAt: EXP, film: states.reserved}},
    {kind: "response", action: "reserveFilmUpload", valid: true, respondsTo: "reserve.request.valid.json"});
put("abandon.response.ok-from-reserved.json", {ok: true, data: {filmId: FILM, previousStatus: "reserved", film: states.abandonedFromReserved}},
    {kind: "response", action: "abandonFilmUpload", valid: true, respondsTo: "abandon.request.valid.json"});
put("abandon.response.ok-from-validating.json", {ok: true, data: {filmId: FILM, previousStatus: "validating", film: states.abandonedFromValidating}},
    {kind: "response", action: "abandonFilmUpload", valid: true});
put("abandon.response.ok-repeat-new-operation.json", {ok: true, data: {filmId: FILM, previousStatus: "abandoned", film: states.abandonedFromReserved}},
    {kind: "response", action: "abandonFilmUpload", valid: true, note: "second abandon of the same film under a NEW operationId; film unchanged"});
const RET = {"unavailable": true};
const pairs = [["unauthenticated", "sign-in-required"], ["unauthenticated", "account-disabled"],
  ["permission-denied", "anonymous-not-allowed"], ["permission-denied", "email-not-verified"], ["permission-denied", "beta-access-required"], ["permission-denied", "not-team-owner"],
  ["invalid-argument", "schema-invalid"], ["invalid-argument", "action-mismatch"], ["invalid-argument", "rights-acknowledgement-required"],
  ["limit-exceeded", "bytes-over-limit"], ["limit-exceeded", "format-not-allowed"],
  ["team-cap-reached", "team-film-cap"],
  ["failed-precondition", "rights-wording-outdated"], ["failed-precondition", "film-not-found"], ["failed-precondition", "invalid-state"], ["failed-precondition", "operation-expired"],
  ["conflict", "operation-id-reused"], ["unavailable", "backend-unavailable"]];
for (const [code, reason] of pairs) {
  put(`error.${code}.${reason}.json`, {ok: false, error: {code, retryable: !!RET[code], reason}},
      {kind: "response", action: "*", valid: true, serverEmits: true});
}
// ---- client-side failures (NOT wire data; never parse as a server response)
const cf = (file, kind, category, retryEligible, valid, note) => put(file, {clientFailure: {kind, category, retryEligible}},
    {kind: "client-failure", valid, ...(note ? {note} : {})});
cf("client-failure.protocol.response-invalid.json", "protocol", "response-invalid", false, true, "resolved value failed the response schema; non-retryable client protocol error");
cf("client-failure.network.network.json", "network", "network", true, true, "no HTTP response; retry-eligible, never automatic, same operationId");
cf("client-failure.sdk.unavailable.json", "sdk", "unavailable", true, true);
cf("client-failure.sdk.deadline-exceeded.json", "sdk", "deadline-exceeded", true, true);
cf("client-failure.sdk.internal.json", "sdk", "internal", false, true, "unknown server failure; do not guess a server reason");
cf("client-failure.sdk.permission-denied.json", "sdk", "permission-denied", false, true, "thrown access/config failure keeps its sanitized category");
cf("invalid.client-failure.internal-retry-eligible.json", "sdk", "internal", true, false, "internal is never retry-eligible");
cf("invalid.client-failure.protocol-retry-eligible.json", "protocol", "response-invalid", true, false);
cf("invalid.client-failure.unknown-category.json", "sdk", "transport", true, false);
put("invalid.response.client-transport-as-server.json", {ok: false, error: {code: "unavailable", retryable: true, reason: "transport"}},
    {kind: "response", action: "*", valid: false, note: "client-only conditions must not parse as server-emitted responses"});
// invalid responses the client must refuse to accept
put("invalid.response.retryable-mismatch.json", {ok: false, error: {code: "conflict", retryable: true, reason: "operation-id-reused"}},
    {kind: "response", action: "*", valid: false, note: "retryable must equal RETRYABLE[code]"});
put("invalid.response.reason-not-for-code.json", {ok: false, error: {code: "permission-denied", retryable: false, reason: "bytes-over-limit"}},
    {kind: "response", action: "*", valid: false});
put("invalid.response.extra-key.json", {ok: true, data: {filmId: FILM, uploadPath: UP, expiresAt: EXP, film: states.reserved, signedUrl: "https://example.invalid"}},
    {kind: "response", action: "reserveFilmUpload", valid: false, note: "strict: no unknown keys"});
put("invalid.response.timestamp-no-millis.json", {ok: true, data: {filmId: FILM, uploadPath: UP, expiresAt: "2026-10-19T22:00:00Z", film: states.reserved}},
    {kind: "response", action: "reserveFilmUpload", valid: false, note: "timestamps need exactly 3 fractional digits"});
// ---- C2 mutation regressions: each is one valid fixture with one invariant broken
const ok = (film, extra = {}) => ({ok: true, data: {filmId: FILM, uploadPath: UP, expiresAt: EXP, film, ...extra}});
const okA = (prev, film, extra = {}) => ({ok: true, data: {filmId: FILM, previousStatus: prev, film, ...extra}});
const OTHER_FILM = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const mut = (file, value, action, mutation, rule) => put(file, value, {kind: "response", action, valid: false, mutation, rule});
mut("invalid.mutation.M1-reserve-film-id-mismatch.json", ok(states.reserved, {filmId: OTHER_FILM}), "reserveFilmUpload", "M1", "R1");
mut("invalid.mutation.M2-reserve-upload-path-foreign.json", ok(states.reserved, {uploadPath: `quarantine/team_other/${FILM}/source.mp4`}), "reserveFilmUpload", "M2", "R2");
mut("invalid.mutation.M3-reserve-expires-at-mismatch.json", ok(states.reserved, {expiresAt: "2026-10-19T23:00:00.000Z"}), "reserveFilmUpload", "M3", "R3");
mut("invalid.mutation.M4-reserved-has-abandoned-at.json", ok(st({abandonedAt: T0})), "reserveFilmUpload", "M4", "S1");
const filmMut5 = st({status: "rejected", statusChangedAt: T1, objectGeneration: "1760907852345678", rejectionReason: null});
put("invalid.mutation.M5-rejected-null-reason.json", filmMut5, {kind: "film-state", valid: false, mutation: "M5", rule: "S2"});
mut("invalid.mutation.M6-abandon-null-abandoned-at.json", okA("reserved", st({status: "abandoned", statusChangedAt: T2, abandonedAt: null})), "abandonFilmUpload", "M6", "S1");
const filmMut = (file, value, mutation, rule) => put(file, value, {kind: "film-state", valid: false, mutation, rule});
filmMut("invalid.mutation.M7-validating-null-generation.json", st({status: "validating", statusChangedAt: T1, objectGeneration: null}), "M7", "G2");
mut("invalid.mutation.M8-expiry-before-creation.json", ok(st({reservationExpiresAt: "2026-10-19T20:59:59.999Z"}), {expiresAt: "2026-10-19T20:59:59.999Z"}), "reserveFilmUpload", "M8", "T2");
filmMut("invalid.mutation.X1-expired-before-expiry.json", st({status: "expired", statusChangedAt: "2026-10-19T21:59:59.999Z"}), "X1", "T5");
filmMut("invalid.mutation.X2-reserved-has-generation.json", st({objectGeneration: "1760907852345678"}), "X2", "G1");
filmMut("invalid.mutation.X3-rejected-null-generation.json", st({status: "rejected", statusChangedAt: T1, rejectionReason: "size-mismatch"}), "X3", "G2");
filmMut("invalid.mutation.X4-reserved-status-changed.json", st({statusChangedAt: T1}), "X4", "T4");
filmMut("invalid.mutation.X5-abandoned-at-not-status-changed.json", st({status: "abandoned", statusChangedAt: T2, abandonedAt: T1}), "X5", "T7");
filmMut("invalid.mutation.X6-status-changed-before-created.json", st({status: "validating", statusChangedAt: "2026-10-19T20:00:00.000Z", objectGeneration: "1"}), "X6", "T3");
filmMut("invalid.mutation.X7-rights-after-creation.json", st({rightsAcknowledgedAt: T1}), "X7", "T1");
filmMut("invalid.mutation.X8-upload-path-template.json", st({uploadPath: `quarantine/${TEAM}/${FILM}/other.mp4`}), "X8", "P1");
filmMut("invalid.mutation.X9-file-name-not-canonical.json", st({fileName: " clip.mp4"}), "X9", "file name not canonical");
filmMut("invalid.mutation.X10-validating-after-expiry.json", st({status: "validating", statusChangedAt: EXP, objectGeneration: "1"}), "X10", "T6");
mut("invalid.mutation.X11-receipt-not-reserved.json", ok(states.abandonedFromReserved), "reserveFilmUpload", "X11", "R4");
mut("invalid.mutation.X12-abandon-from-validating-no-generation.json", okA("validating", states.abandonedFromReserved), "abandonFilmUpload", "X12", "A4");
mut("invalid.mutation.X13-abandon-from-reserved-has-generation.json", okA("reserved", states.abandonedFromValidating), "abandonFilmUpload", "X13", "A3");
// ---- film states (== Firestore doc with *At fields as Timestamp)
for (const [name, s] of Object.entries(states)) {
  put(`film-state.${name}.json`, s, {kind: "film-state", valid: true});
}
fs.writeFileSync(path.join(out, "index.json"), JSON.stringify({
  contract: V,
  fixtures: manifest.sort((a, b) => a.file.localeCompare(b.file)),
}, null, 2) + "\n");
console.log(manifest.length, "fixtures");
