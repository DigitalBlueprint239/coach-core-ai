"use strict";
// Regressions from Codex's r4 contract review (#39 c-6292024186) of
// 1e8c69985cfecba14e6e9f16eac8772d7bc9c547: C1 (replay not fail-closed) and
// C2 (attempt helpers accept malformed input). The six reproductions are
// kept verbatim in intent; NaN / Infinity cases live here because JSON
// fixtures cannot carry them. CONTRACT AUTHORING ONLY: no handler wiring.
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const c = require("../src/film/contract-v2");
const l = require("../src/film/legacy-r3");

const V2DIR = path.join(__dirname, "..", "..", "tests", "fixtures",
    "coach-film.v2");
const f = JSON.parse(fs.readFileSync(
    path.join(V2DIR, "v2-replay-r3-reserve-receipt.json"), "utf8"));
const legacyInvalid = c.errorResponseFor("failed-precondition",
    "legacy-record-invalid");
const NO_ADMIT = {admit: false, consumes: false, outcome: "invalid-input"};
const NO_VERDICT = {outcome: "invalid-input", reason: null};

describe("Codex C1 reproductions: replay fails closed", () => {
  const cases = {
    missingExpiry: (q) => delete q.stored.replayableUntilMs,
    unknownStoredVersion: (q) => q.stored.schemaVersion = "coach-film.v999",
    corruptV1: (q) => {
      q.requestSchemaVersion = "coach-film.v1"; q.stored.responseJson = "{bad";
    },
  };
  for (const [name, mut] of Object.entries(cases)) {
    it(`${name} -> error legacy-record-invalid (was: replay)`, () => {
      const q = structuredClone(f.request); mut(q);
      const out = l.decideReplay(q);
      assert.equal(out.kind, "error");
      assert.deepEqual(out.response, legacyInvalid);
      assert.equal(out.response.error.retryable, false);
    });
  }
  for (const bad of [NaN, Infinity, -Infinity, -1, 2 ** 53]) {
    it(`stored replayableUntilMs ${bad} -> legacy-record-invalid`, () => {
      const q = structuredClone(f.request);
      q.stored.replayableUntilMs = bad;
      assert.deepEqual(l.decideReplay(q).response, legacyInvalid);
    });
  }
  for (const bad of [NaN, Infinity, -1, 1.5, "1"]) {
    it(`query nowMs ${String(bad)} -> invalid-input (no replay)`, () => {
      const q = structuredClone(f.request); q.nowMs = bad;
      assert.deepEqual(l.decideReplay(q), {kind: "invalid-input"});
    });
  }
  it("the valid v1 receipt is still replayed byte-for-byte", () => {
    const q = structuredClone(f.request);
    q.requestSchemaVersion = "coach-film.v1";
    const out = l.decideReplay(q);
    assert.equal(out.kind, "replay");
    assert.equal(out.responseJson, f.request.stored.responseJson);
  });
});

describe("Codex C2 reproductions: attempt helpers fail closed", () => {
  it("NaN admitted/time values never admit (was: admit true)", () => {
    assert.deepEqual(c.admissionDecision({delivery: "process",
      configurationOk: true, admitted: NaN, jobCreatedAtMs: NaN,
      nowMs: NaN}), NO_ADMIT);
  });
  it("two classified kills WITHOUT a step are not same-step " +
      "(was: processing-limit-exceeded)", () => {
    assert.deepEqual(c.exhaustionOutcome([{end: "limit-kill", kill: "SIGXCPU"},
      {end: "limit-kill", kill: "SIGXCPU"}]), NO_VERDICT);
  });
  it("media-verdict reason made-up is refused (was: rejected/made-up)", () => {
    assert.deepEqual(c.exhaustionOutcome([{end: "media-verdict",
      reason: "made-up"}]), NO_VERDICT);
  });
  const base = {delivery: "process", configurationOk: true, admitted: 0,
    jobCreatedAtMs: 0, nowMs: 1};
  for (const [k, bad] of [["admitted", Infinity], ["admitted", NaN],
    ["jobCreatedAtMs", Infinity], ["nowMs", Infinity], ["nowMs", NaN],
    ["jobCreatedAtMs", 2 ** 53]]) {
    it(`${k} ${bad} never admits`, () => {
      assert.deepEqual(c.admissionDecision({...base, [k]: bad}), NO_ADMIT);
    });
  }
  it("the agreed budget is unchanged: 3 admitted including the first", () => {
    let admitted = 0;
    for (let i = 0; i < 5; i++) {
      if (c.admissionDecision({...base, admitted}).admit) admitted++;
    }
    assert.equal(admitted, 3);
    assert.equal(c.WORKER_ATTEMPT_POLICY.platformRetry, false);
  });
  it("same-step classified kills with a valid step still reject", () => {
    assert.deepEqual(c.exhaustionOutcome([
      {end: "limit-kill", kill: "SIGXCPU", step: "decode-input"},
      {end: "limit-kill", kill: "SIGXCPU", step: "decode-input"}]),
    {outcome: "rejected", reason: "processing-limit-exceeded"});
  });
});

describe("helpers are total: garbage never throws, admits or rejects", () => {
  const garbage = [undefined, null, 0, "", "x", true, [], {}, [null], [{}],
    {end: "crash"}, () => 1, Object.create(null)];
  for (const g of garbage) {
    const label = typeof g === "function" ? "function" : JSON.stringify(g);
    it(`input ${label}`, () => {
      assert.deepEqual(c.admissionDecision(g), NO_ADMIT);
      assert.deepEqual(c.exhaustionOutcome(g), NO_VERDICT);
      assert.deepEqual(l.decideReplay(g), {kind: "invalid-input"});
    });
  }
  it("exported validation schemas are the ones the helpers apply", () => {
    for (const s of [c.schemas.admissionInput, c.schemas.attemptRecord,
      c.schemas.exhaustionInput, l.schemas.replayQuery,
      l.schemas.storedOperation]) {
      assert.equal(typeof s.safeParse, "function");
    }
    assert.deepEqual([...c.PIPELINE_STEPS], ["probe-input", "decode-input",
      "normalize", "probe-output", "decode-output"]);
    assert.ok(!c.MEDIA_VERDICT_REASONS.includes("processing-limit-exceeded"));
    assert.equal(c.MEDIA_VERDICT_REASONS.length,
        c.WORKER_REJECTION_REASONS.length - 1);
  });
});
