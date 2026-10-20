"use strict";
/* eslint-disable max-len */
// coach-film.v2 (r4) golden fixture generator. CONTRACT AUTHORING ONLY.
//   node functions/scripts/film-fixtures-v2.js
// Reads tests/fixtures/coach-film.v1 READ-ONLY (never writes it) and writes
// tests/fixtures/coach-film.v2. The committed JSON files are authoritative;
// fixture changes need Codex's review (#39 A1). Expected v2 projections are
// built here INDEPENDENTLY of functions/src/film/legacy-r3.js (no circular
// fixtures): append the four new keys as null after the existing film keys.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const V1 = path.join(ROOT, "tests", "fixtures", "coach-film.v1");
const OUT = path.join(ROOT, "tests", "fixtures", "coach-film.v2");
const V1_ID = "coach-film.v1";
const V2_ID = "coach-film.v2";
const NEW_NULLS = {readyAt: null, normalizedGeneration: null, media: null, retentionExpiresAt: null};

fs.mkdirSync(OUT, {recursive: true});
for (const f of fs.readdirSync(OUT)) {
  if (f.endsWith(".json") && f !== "contract.schema.json") fs.unlinkSync(path.join(OUT, f));
}
const manifest = [];
const put = (file, value, meta) => {
  fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + "\n");
  manifest.push({file, ...meta});
};
const v1Index = JSON.parse(fs.readFileSync(path.join(V1, "index.json"), "utf8"));
const v1Raw = (f) => fs.readFileSync(path.join(V1, f), "utf8");
const v1Json = (f) => JSON.parse(v1Raw(f));
const upFilm = (film) => ({...film, ...NEW_NULLS});
const upResponse = (r) => (r && r.ok === true && r.data && r.data.film) ?
  {...r, data: {...r.data, film: upFilm(r.data.film)}} : r;
const upRequest = (r) => (r && r.schemaVersion === V1_ID) ? {...r, schemaVersion: V2_ID} : r;

// ---------------------------------------------------------------- 1. re-emitted v1 set
for (const fx of v1Index.fixtures) {
  if (fx.file.startsWith("error.")) continue; // regenerated from the v2 table below
  const v = v1Json(fx.file);
  let out = v;
  if (fx.kind === "request") out = upRequest(v);
  else if (fx.kind === "response") out = upResponse(v);
  else if (fx.kind === "film-state") out = upFilm(v);
  const meta = {...fx, reEmittedFrom: `coach-film.v1/${fx.file}`};
  delete meta.file;
  if (meta.rule === "T6") meta.rule = "T6'";
  put(`v2-${fx.file}`, out, meta);
}

// ---------------------------------------------------------------- 2. error table (v2)
const errorTable = {
  "unauthenticated": ["sign-in-required", "account-disabled"],
  "permission-denied": ["anonymous-not-allowed", "email-not-verified", "beta-access-required", "not-team-owner"],
  "invalid-argument": ["schema-invalid", "action-mismatch", "rights-acknowledgement-required", "unsupported-version"],
  "limit-exceeded": ["bytes-over-limit", "format-not-allowed"],
  "team-cap-reached": ["team-film-cap"],
  "failed-precondition": ["rights-wording-outdated", "film-not-found", "invalid-state", "operation-expired", "legacy-record-invalid"],
  "conflict": ["operation-id-reused"],
  "unavailable": ["backend-unavailable"],
};
for (const [code, reasons] of Object.entries(errorTable)) {
  for (const reason of reasons) {
    put(`v2-error.${code}.${reason}.json`, {ok: false, error: {code, retryable: code === "unavailable", reason}},
        {kind: "response", action: "*", valid: true, serverEmits: true,
          ...(["unsupported-version", "legacy-record-invalid"].includes(reason) ? {newInV2: true} : {})});
  }
}

// ---------------------------------------------------------------- 3. new film states
const base = upFilm(v1Json("film-state.reserved.json"));
// base.createdAt = 2026-10-19T21:00:00.000Z
const EXP = base.reservationExpiresAt; // 2026-10-19T22:00:00.000Z
const T1 = "2026-10-19T21:04:12.345Z"; // object finalized (validating)
const T2 = "2026-10-19T21:05:30.000Z"; // worker outcome, before expiry
const LATE = "2026-10-19T23:30:00.000Z"; // worker outcome after reservation expiry
const GEN_IN = "1760907852345678";
const GEN_OUT = "1760907930000001";
const SHA = "9f2b1c3d4e5f60718293a4b5c6d7e8f9012345678901abcdef0123456789abcd";
const st = (o) => ({...base, ...o});
const ready = (o = {}, m = {}) => st({status: "ready", statusChangedAt: T2, readyAt: T2, objectGeneration: GEN_IN,
  normalizedGeneration: GEN_OUT,
  media: {bytes: 47120304, durationMs: 4000, width: 320, height: 180, videoCodec: "h264", audioCodec: "aac", frameRateMode: "cfr", sha256: SHA, ...m},
  ...o});
const state = (file, value, meta) => put(file, value, {kind: "film-state", ...meta});
state("v2-state-ready-h264-aac.json", ready(), {valid: true});
state("v2-state-ready-h264-noaudio.json", ready({}, {audioCodec: null}), {valid: true});
state("v2-state-ready-vfr.json", ready({}, {frameRateMode: "vfr", durationMs: 6733}), {valid: true});
state("v2-state-ready-at-limits.json", ready({}, {bytes: 100000000, durationMs: 300000, width: 1920, height: 1080}),
    {valid: true, placeholder: "PENDING_D3", note: "exactly at every placeholder limit: accepted"});
state("v2-state-late-ready.json", ready({statusChangedAt: LATE, readyAt: LATE}),
    {valid: true, rule: "T6'", note: "ready after the reservation expiry is allowed (asynchronous processing)"});
const WORKER_REASONS = ["container-invalid", "metadata-invalid", "video-stream-missing", "video-codec-not-allowed",
  "audio-codec-not-allowed", "stream-count-exceeded", "duration-over-limit", "resolution-over-limit", "media-corrupt",
  "output-invalid", "processing-limit-exceeded"];
for (const r of WORKER_REASONS) {
  state(`v2-state-rejected-${r}.json`, st({status: "rejected", statusChangedAt: T2, objectGeneration: GEN_IN, rejectionReason: r}), {valid: true});
}
state("v2-state-late-worker-rejected.json", st({status: "rejected", statusChangedAt: LATE, objectGeneration: GEN_IN, rejectionReason: "media-corrupt"}),
    {valid: true, rule: "T6'", note: "worker rejection after the reservation expiry is allowed"});

// ---------------------------------------------------------------- 4. new negative mutations (named rule)
const mut = (file, value, rule, note) => state(file, value, {valid: false, rule, ...(note ? {note} : {})});
mut("v2-mut-R5-ready-without-media.json", ready({media: null}), "R5 media");
mut("v2-mut-R5-ready-without-readyAt.json", ready({readyAt: null}), "R5 readyAt");
mut("v2-mut-R5-ready-without-normalizedGeneration.json", ready({normalizedGeneration: null}), "R5 normalizedGeneration");
mut("v2-mut-R5-validating-with-media.json", st({status: "validating", statusChangedAt: T1, objectGeneration: GEN_IN, media: ready().media}), "R5 media");
mut("v2-mut-R5-reserved-with-normalizedGeneration.json", st({normalizedGeneration: GEN_OUT}), "R5 normalizedGeneration");
mut("v2-mut-R6-readyAt-not-statusChangedAt.json", ready({readyAt: T1}), "R6");
mut("v2-mut-R7-retentionExpiresAt-set.json", st({retentionExpiresAt: "2026-11-18T21:00:00.000Z"}), "R7");
mut("v2-mut-R7-ready-retentionExpiresAt-set.json", ready({retentionExpiresAt: "2026-11-18T21:00:00.000Z"}), "R7");
mut("v2-mut-R8-ready-without-objectGeneration.json", ready({objectGeneration: null}), "R8");
mut("v2-mut-R9-bytes-over-limit.json", ready({}, {bytes: 100000001}), "R9 media.bytes", "placeholder maxBytes + 1 (PENDING_D3)");
mut("v2-mut-R9-duration-over-limit.json", ready({}, {durationMs: 300001}), "R9 media.durationMs", "+1 ms (PENDING_D3)");
mut("v2-mut-R9-width-over-limit.json", ready({}, {width: 1921}), "R9 media.width", "+1 px width only");
mut("v2-mut-R9-height-over-limit.json", ready({}, {height: 1081}), "R9 media.height", "+1 px height only");
mut("v2-mut-T6p-late-s1-rejected.json", st({status: "rejected", statusChangedAt: LATE, objectGeneration: GEN_IN, rejectionReason: "signature-invalid"}),
    "T6'", "S1 intake reasons must still precede the reservation expiry");
mut("v2-mut-T6p-validating-after-expiry.json", st({status: "validating", statusChangedAt: EXP, objectGeneration: GEN_IN}), "T6'");
mut("v2-mut-T3-late-worker-rejected-before-created.json", st({status: "rejected", statusChangedAt: "2026-10-19T20:00:00.000Z", objectGeneration: GEN_IN, rejectionReason: "media-corrupt"}), "T3");
mut("v2-mut-S2-unknown-reason.json", st({status: "rejected", statusChangedAt: T2, objectGeneration: GEN_IN, rejectionReason: "too-blurry"}), "rejectionReason",
    "closed reason set");
mut("v2-mut-media-extra-key.json", ready({}, {fps: 30}), "media", "media is strict");
mut("v2-mut-media-hevc.json", ready({}, {videoCodec: "hevc"}), "videoCodec");
mut("v2-mut-media-bad-sha256.json", ready({}, {sha256: "NOT-HEX"}), "sha256");
mut("v2-mut-media-bad-framerate-mode.json", ready({}, {frameRateMode: "variable"}), "frameRateMode");
const missingKey = {...base}; delete missingKey.retentionExpiresAt;
mut("v2-mut-wire-missing-retentionExpiresAt.json", missingKey, "retentionExpiresAt", "the WIRE FilmState requires all four keys; only the stored-document reader tolerates absence");

// ---------------------------------------------------------------- 5. stored film documents (reader)
const legacyDoc = (file) => v1Json(file); // r3 document: the four keys are ABSENT
const doc = (file, value, meta) => put(file, value, {kind: "film-document", ...meta});
doc("v2-doc-legacy-r3-reserved.json", legacyDoc("film-state.reserved.json"), {valid: true, reEmittedFrom: "coach-film.v1/film-state.reserved.json (unchanged bytes)"});
doc("v2-doc-legacy-r3-validating.json", legacyDoc("film-state.validating.json"), {valid: true});
doc("v2-doc-legacy-r3-abandoned.json", legacyDoc("film-state.abandonedFromValidating.json"), {valid: true});
doc("v2-doc-legacy-r3-rejected.json", legacyDoc("film-state.rejected.json"), {valid: true});
doc("v2-doc-legacy-r3-expired.json", legacyDoc("film-state.expired.json"), {valid: true});
const readyNoKeys = {...ready()}; for (const k of Object.keys(NEW_NULLS)) delete readyNoKeys[k];
doc("v2-doc-legacy-ready-without-keys.json", readyNoKeys, {valid: false, rule: "readyAt", note: "an impossible legacy ready document: no media is invented"});
doc("v2-doc-present-but-invalid-media.json", {...legacyDoc("film-state.reserved.json"), media: "x"}, {valid: false, rule: "media"});
doc("v2-doc-v2-ready.json", ready(), {valid: true});

// ---------------------------------------------------------------- 6. requests at the v2 envelope
const reqV1 = v1Json("reserve.request.valid.json");
put("v2-reserve.request.v1-envelope-at-v2-parser.json", reqV1,
    {kind: "request", action: "reserveFilmUpload", valid: false, schemaValid: false, expect: {code: "invalid-argument", reason: "schema-invalid"},
      note: "a v1 envelope does not parse at the v2 envelope parser; a NEW v1 operation under the future cutover gets unsupported-version from the replay table"});

// ---------------------------------------------------------------- 7. replay table (stored r3 receipts)
const OP_TIME = Date.parse("2026-10-19T21:00:00.000Z");
const WINDOW = 24 * 60 * 60 * 1000;
const stored = (v1File, o = {}) => ({action: "reserveFilmUpload", payloadHash: "phash-O", responseJson: v1Raw(v1File), replayableUntilMs: OP_TIME + WINDOW, ...o});
const expectedProjection = (v1File) => upResponse(v1Json(v1File));
const proj = (name, v1File) => {
  put(name, expectedProjection(v1File), {kind: "response", action: v1File.startsWith("abandon") ? "abandonFilmUpload" : "reserveFilmUpload", valid: true,
    projectionOf: `coach-film.v1/${v1File}`});
  return name;
};
const pReserve = proj("v2-replay.expected.reserve-projection.json", "reserve.response.ok.json");
const pAbandonR = proj("v2-replay.expected.abandon-from-reserved-projection.json", "abandon.response.ok-from-reserved.json");
const pAbandonV = proj("v2-replay.expected.abandon-from-validating-projection.json", "abandon.response.ok-from-validating.json");
const rc = (file, q, expect, note) => put(file, {request: q, expect}, {kind: "replay-case", valid: true, ...(note ? {note} : {})});
const q = (o) => ({requestSchemaVersion: V2_ID, action: "reserveFilmUpload", payloadHash: "phash-O", nowMs: OP_TIME + 3600000, ...o});
rc("v2-replay-r3-reserve-receipt.json", q({stored: stored("reserve.response.ok.json")}), {kind: "replay", responseFile: pReserve},
    "identical v2 operation +1 h: historical receipt projected; four null keys; original reservation expiry; no new film/slot; stored bytes unchanged");
rc("v2-replay-r3-abandon-from-reserved-receipt.json", q({action: "abandonFilmUpload", stored: stored("abandon.response.ok-from-reserved.json", {action: "abandonFilmUpload"})}),
    {kind: "replay", responseFile: pAbandonR});
rc("v2-replay-r3-abandon-from-validating-receipt.json", q({action: "abandonFilmUpload", stored: stored("abandon.response.ok-from-validating.json", {action: "abandonFilmUpload"})}),
    {kind: "replay", responseFile: pAbandonV});
rc("v2-replay-r3-live-film-now-ready.json", q({liveFilmStatus: "ready", stored: stored("reserve.response.ok.json")}), {kind: "replay", responseFile: pReserve},
    "the live film has since become ready: replay still returns the historical reserved snapshot, never current state or upload permission");
rc("v2-replay-v1-same-operation-verbatim.json", q({requestSchemaVersion: V1_ID, stored: stored("reserve.response.ok.json")}),
    {kind: "replay", responseJsonEqualsStored: true}, "v1 replay returns the original v1 receipt byte-for-byte");
rc("v2-replay-r3-changed-payload.json", q({payloadHash: "phash-O-declaredBytes-48211955", stored: stored("reserve.response.ok.json")}),
    {kind: "error", code: "conflict", reason: "operation-id-reused"});
rc("v2-replay-r3-other-action.json", q({action: "abandonFilmUpload", stored: stored("reserve.response.ok.json")}),
    {kind: "error", code: "conflict", reason: "operation-id-reused"}, "action isolation");
rc("v2-replay-r3-just-before-expiry.json", q({nowMs: OP_TIME + WINDOW - 1, stored: stored("reserve.response.ok.json")}), {kind: "replay", responseFile: pReserve});
rc("v2-replay-r3-at-expiry.json", q({nowMs: OP_TIME + WINDOW, stored: stored("reserve.response.ok.json")}),
    {kind: "error", code: "failed-precondition", reason: "operation-expired"}, "at the ORIGINAL replayableUntil; the version does not renew the window");
rc("v2-replay-v1-at-expiry.json", q({requestSchemaVersion: V1_ID, nowMs: OP_TIME + WINDOW, stored: stored("reserve.response.ok.json")}),
    {kind: "error", code: "failed-precondition", reason: "operation-expired"});
rc("v2-replay-new-v1-operation.json", q({requestSchemaVersion: V1_ID, stored: null}),
    {kind: "error", code: "invalid-argument", reason: "unsupported-version"}, "FUTURE cutover only; accepted v1 handlers are unchanged in this slice");
rc("v2-replay-new-v2-operation.json", q({stored: null}), {kind: "new-operation"});
rc("v2-replay-unknown-version.json", q({requestSchemaVersion: "coach-film.v0", stored: null}), {kind: "error", code: "invalid-argument", reason: "schema-invalid"});
rc("v2-replay-legacy-corrupt-json.json", q({stored: stored("reserve.response.ok.json", {responseJson: "{\"ok\": true, \"data\": "})}),
    {kind: "error", code: "failed-precondition", reason: "legacy-record-invalid"});
rc("v2-replay-legacy-unknown-field.json", q({stored: stored("reserve.response.ok.json", {responseJson: v1Raw("reserve.response.ok.json").replace("\"ok\": true,", "\"ok\": true, \"signedUrl\": \"https://example.invalid\",")})}),
    {kind: "error", code: "failed-precondition", reason: "legacy-record-invalid"}, "no silently dropped fields");
rc("v2-replay-legacy-impossible-ready.json", q({stored: stored("reserve.response.ok.json", {responseJson: v1Raw("reserve.response.ok.json").replace("\"status\": \"reserved\"", "\"status\": \"ready\"")})}),
    {kind: "error", code: "failed-precondition", reason: "legacy-record-invalid"}, "no media metadata is invented");
rc("v2-replay-legacy-error-receipt.json", q({stored: stored("reserve.response.ok.json", {responseJson: v1Raw("error.conflict.operation-id-reused.json")})}),
    {kind: "error", code: "failed-precondition", reason: "legacy-record-invalid"}, "only success receipts are ever stored");
rc("v2-replay-stored-v2-receipt.json", q({stored: {...stored("reserve.response.ok.json"), schemaVersion: V2_ID, responseJson: JSON.stringify(expectedProjection("reserve.response.ok.json"))}}),
    {kind: "replay", responseFile: pReserve}, "a receipt stored under v2 replays as stored");
rc("v2-replay-stored-v2-receipt-v1-request.json", q({requestSchemaVersion: V1_ID, stored: {...stored("reserve.response.ok.json"), schemaVersion: V2_ID, responseJson: JSON.stringify(expectedProjection("reserve.response.ok.json"))}}),
    {kind: "error", code: "invalid-argument", reason: "unsupported-version"}, "no v1 representation is invented for a v2 receipt");

// ---------------------------------------------------------------- 8. attempt policy (A1 R1), pure cases
const H = 6 * 60 * 60 * 1000; const C0 = OP_TIME;
const ad = (file, input, expect, note) => put(file, {input, expect}, {kind: "attempt-admission", valid: true, ...(note ? {note} : {})});
ad("v2-attempt-admit-first.json", {delivery: "process", configurationOk: true, admitted: 0, jobCreatedAtMs: C0, nowMs: C0}, {admit: true, consumes: true, outcome: "admitted"});
ad("v2-attempt-admit-third.json", {delivery: "process", configurationOk: true, admitted: 2, jobCreatedAtMs: C0, nowMs: C0 + 1000}, {admit: true, consumes: true, outcome: "admitted"});
ad("v2-attempt-refuse-fourth.json", {delivery: "process", configurationOk: true, admitted: 3, jobCreatedAtMs: C0, nowMs: C0 + 1000}, {admit: false, consumes: false, outcome: "refused-exhausted"},
    "three admitted attempts INCLUDING the first; no fourth decoder run or upload");
ad("v2-attempt-duplicate.json", {delivery: "duplicate", configurationOk: true, admitted: 1, jobCreatedAtMs: C0, nowMs: C0}, {admit: false, consumes: false, outcome: "skip-duplicate"});
ad("v2-attempt-contention.json", {delivery: "contention", configurationOk: true, admitted: 1, jobCreatedAtMs: C0, nowMs: C0}, {admit: false, consumes: false, outcome: "skip-contention"});
ad("v2-attempt-configuration-preflight.json", {delivery: "process", configurationOk: false, admitted: 0, jobCreatedAtMs: C0, nowMs: C0}, {admit: false, consumes: false, outcome: "stalled-configuration"},
    "wrong decoder digest / limits unavailable: stall, consume nothing, never a media verdict");
ad("v2-attempt-horizon-just-before.json", {delivery: "process", configurationOk: true, admitted: 1, jobCreatedAtMs: C0, nowMs: C0 + H - 1}, {admit: true, consumes: true, outcome: "admitted"});
ad("v2-attempt-horizon-at.json", {delivery: "process", configurationOk: true, admitted: 1, jobCreatedAtMs: C0, nowMs: C0 + H}, {admit: false, consumes: false, outcome: "refused-horizon"});
const ex = (file, attempts, expect, note) => put(file, {attempts, expect}, {kind: "attempt-exhaustion", valid: true, ...(note ? {note} : {})});
ex("v2-exhaust-media-verdict-first.json", [{end: "media-verdict", reason: "container-invalid"}], {outcome: "rejected", reason: "container-invalid"},
    "a deterministic media verdict rejects on the first proven failure (s11a: structural, despite pinned probe 0 / decode 0)");
ex("v2-exhaust-three-ambiguous.json", [{end: "crash"}, {end: "infrastructure"}, {end: "unknown"}], {outcome: "recovery-needed", reason: null});
ex("v2-exhaust-classified-kills-same-step.json", [{end: "limit-kill", kill: "wall-time", step: "decode-input"}, {end: "infrastructure"}, {end: "limit-kill", kill: "wall-time", step: "decode-input"}],
    {outcome: "rejected", reason: "processing-limit-exceeded"});
ex("v2-exhaust-classified-kills-different-steps.json", [{end: "limit-kill", kill: "SIGXCPU", step: "decode-input"}, {end: "limit-kill", kill: "SIGXCPU", step: "normalize"}, {end: "limit-kill", kill: "SIGXCPU", step: "decode-output"}],
    {outcome: "recovery-needed", reason: null});
ex("v2-exhaust-undifferentiated-sigkill.json", [{end: "limit-kill", kill: "SIGKILL", step: "decode-input"}, {end: "limit-kill", kill: "SIGKILL", step: "decode-input"}, {end: "limit-kill", kill: "SIGKILL", step: "decode-input"}],
    {outcome: "recovery-needed", reason: null}, "a SIGKILL we did not send is not a classified limit kill");
ex("v2-exhaust-final-infrastructure.json", [{end: "limit-kill", kill: "SIGXFSZ", step: "normalize"}, {end: "limit-kill", kill: "SIGXFSZ", step: "normalize"}, {end: "infrastructure"}],
    {outcome: "recovery-needed", reason: null}, "the FINAL attempt must itself be a classified kill");
ex("v2-exhaust-completed-second.json", [{end: "crash"}, {end: "completed"}], {outcome: "completed", reason: null});

fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({
  contract: V2_ID,
  revision: "r4",
  status: "CONTRACT AUTHORING ONLY; Codex AGREE r4 @ exact SHA pending",
  fixtures: manifest.sort((a, b) => a.file.localeCompare(b.file)),
}, null, 2) + "\n");
console.log(manifest.length, "fixtures");
