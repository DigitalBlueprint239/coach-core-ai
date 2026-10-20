"use strict";
// coach-film.v2 (r4) contract tests. CONTRACT AUTHORING ONLY: no handler,
// trigger or database. Every v2 golden fixture is checked against the
// authoritative v2 schemas / pure helpers; negative fixtures must fail for
// their NAMED rule. The v1 contract and its 86 fixtures are asserted
// unchanged.
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const v1 = require("../src/film/contract");
const c = require("../src/film/contract-v2");
const {decideReplay} = require("../src/film/legacy-r3");
const gen = require("../scripts/film-contract-schema-v2");

const DIR = gen.DIR;
const V1DIR = path.join(DIR, "..", "coach-film.v1");
const manifest = JSON.parse(fs.readFileSync(path.join(DIR, "index.json")));
const load = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
const messages = (r) => r.error.issues.map((i) =>
  `${i.message} @${(i.path || []).join(".")}`).join(" | ");
const anyV2ServerResponse = (v) =>
  c.RESPONSE_SCHEMAS.reserveFilmUpload.safeParse(v).success ||
  c.RESPONSE_SCHEMAS.abandonFilmUpload.safeParse(v).success;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Parse a request the way a future v2 callable would. */
function parseRequest(action, value) {
  const env = c.schemas.requestEnvelope.safeParse(value);
  if (!env.success) return {schemaValid: false, reason: "schema-invalid"};
  if (env.data.action !== action) {
    return {schemaValid: false, reason: "action-mismatch"};
  }
  const p = c.PAYLOAD_SCHEMAS[action].safeParse(env.data.payload);
  return p.success ? {schemaValid: true, payload: p.data} :
    {schemaValid: false, reason: "schema-invalid"};
}

describe("coach-film.v2 fixtures", () => {
  it("manifest lists exactly the fixture files on disk", () => {
    const onDisk = fs.readdirSync(DIR).filter((f) => f.endsWith(".json") &&
      !["index.json", "contract.schema.json"].includes(f)).sort();
    assert.deepEqual(manifest.fixtures.map((x) => x.file).sort(), onDisk);
    assert.equal(manifest.contract, c.CONTRACT_VERSION);
  });

  for (const fx of manifest.fixtures) {
    it(`${fx.file} (${fx.kind}, valid=${fx.valid})`, () => {
      const v = load(fx.file);
      const ruleCheck = (r) => {
        if (fx.rule) assert.match(messages(r), new RegExp(esc(fx.rule)));
      };
      switch (fx.kind) {
        case "film-state": {
          const r = c.schemas.filmState.safeParse(v);
          assert.equal(r.success, fx.valid, r.success ? "" : messages(r));
          if (!fx.valid) ruleCheck(r);
          return;
        }
        case "film-document": {
          const r = c.schemas.filmDocument.safeParse(v);
          assert.equal(r.success, fx.valid, r.success ? "" : messages(r));
          if (!fx.valid) ruleCheck(r);
          if (r.success) {
            for (const k of c.NEW_FILM_KEYS) {
              assert.ok(k in r.data, `reader yields ${k}`);
            }
          }
          return;
        }
        case "client-failure":
          assert.equal(v1.schemas.clientFailure.safeParse(v).success,
              fx.valid);
          assert.equal(anyV2ServerResponse(v), false);
          return;
        case "request": {
          const r = parseRequest(fx.action, v);
          if (fx.valid) {
            assert.equal(r.schemaValid, true);
            if (fx.canonicalFileName) {
              assert.equal(r.payload.fileName, fx.canonicalFileName);
            }
          } else {
            assert.equal(r.schemaValid, fx.schemaValid);
            if (!fx.schemaValid) assert.equal(r.reason, fx.expect.reason);
            assert.ok(c.ERROR_REASONS[fx.expect.code]
                .includes(fx.expect.reason));
          }
          return;
        }
        case "response": {
          const schema = fx.action === "*" ?
            c.schemas.errorResponse : c.RESPONSE_SCHEMAS[fx.action];
          const r = schema.safeParse(v);
          assert.equal(r.success, fx.valid, r.success ? "" : messages(r));
          if (!fx.valid) ruleCheck(r);
          if (fx.valid && v.ok === false) {
            assert.deepEqual(c.errorResponseFor(v.error.code, v.error.reason),
                v);
          }
          if (fx.valid) {
            assert.equal(v1.schemas.clientFailure.safeParse(v).success, false);
          }
          return;
        }
        case "replay-case": {
          const input = v.request;
          const before = JSON.stringify(input);
          const out = decideReplay(input);
          assert.equal(JSON.stringify(input), before, "input not mutated");
          assert.equal(out.kind, v.expect.kind);
          if (v.expect.kind === "invalid-input") {
            assert.deepEqual(out, {kind: "invalid-input"});
          }
          if (v.expect.responseFile) {
            const want = load(v.expect.responseFile);
            assert.deepEqual(out.response, want);
            assert.deepEqual(Object.keys(out.response.data.film), c.FILM_KEYS);
            assert.ok(c.RESPONSE_SCHEMAS[input.action]
                .safeParse(out.response).success);
          }
          if (v.expect.responseJsonEqualsStored) {
            assert.equal(out.responseJson, input.stored.responseJson);
          }
          if (v.expect.kind === "error") {
            assert.deepEqual(out.response,
                c.errorResponseFor(v.expect.code, v.expect.reason));
            assert.equal(out.response.error.retryable,
                v.expect.code === "unavailable");
          }
          return;
        }
        case "attempt-admission":
          assert.deepEqual(c.admissionDecision(v.input), v.expect);
          return;
        case "attempt-exhaustion":
          assert.deepEqual(c.exhaustionOutcome(v.attempts), v.expect);
          return;
        default:
          assert.fail(`unknown fixture kind ${fx.kind}`);
      }
    });
  }

  it("every v1 fixture except the error table has a v2 re-emission", () => {
    const v1Index = JSON.parse(fs.readFileSync(path.join(V1DIR, "index.json")));
    const have = new Set(manifest.fixtures.map((f) => f.file));
    for (const fx of v1Index.fixtures) {
      if (fx.file.startsWith("error.")) continue;
      assert.ok(have.has(`v2-${fx.file}`), fx.file);
    }
  });

  it("every v2 server (code, reason) pair has a fixture", () => {
    const have = new Set(manifest.fixtures.map((f) => f.file));
    for (const [code, reasons] of Object.entries(c.ERROR_REASONS)) {
      for (const reason of reasons) {
        assert.ok(have.has(`v2-error.${code}.${reason}.json`),
            `${code}/${reason}`);
      }
    }
  });

  it("published v2 JSON Schema and SHA256SUMS match the source", () => {
    assert.equal(fs.readFileSync(path.join(DIR, "contract.schema.json"),
        "utf8"), gen.buildSchema());
    assert.equal(fs.readFileSync(path.join(DIR, "SHA256SUMS.txt"), "utf8"),
        gen.buildSums());
  });
});

describe("v1 contract and fixtures preserved", () => {
  it("all 86 v1 fixtures and their checksum file are byte-unchanged", () => {
    const sums = fs.readFileSync(path.join(V1DIR, "SHA256SUMS.txt"));
    assert.equal(crypto.createHash("sha256").update(sums).digest("hex"),
        "cd0860d87715a22e50f632a07657a6c5e71597c18daaca3dfcde80ed9033c776");
    const lines = sums.toString().trim().split("\n");
    for (const l of lines) {
      const [h, f] = l.split(/\s+/);
      if (f === "SHA256SUMS.txt") continue;
      assert.equal(crypto.createHash("sha256")
          .update(fs.readFileSync(path.join(V1DIR, f))).digest("hex"), h, f);
    }
    const v1Index = JSON.parse(fs.readFileSync(path.join(V1DIR, "index.json")));
    assert.equal(v1Index.fixtures.length, 86);
  });
  it("v1 module exports and tables are unchanged", () => {
    assert.equal(v1.CONTRACT_VERSION, "coach-film.v1");
    assert.deepEqual([...v1.ERROR_REASONS["invalid-argument"]],
        ["schema-invalid", "action-mismatch", "rights-acknowledgement-required"]);
    assert.deepEqual([...v1.ERROR_REASONS["failed-precondition"]],
        ["rights-wording-outdated", "film-not-found", "invalid-state",
          "operation-expired"]);
    assert.deepEqual([...v1.REJECTION_REASONS],
        ["size-mismatch", "content-type-mismatch", "signature-invalid"]);
  });
  it("strict v1 parsers reject v2-only keys and reasons", () => {
    const v2Ready = load("v2-state-ready-h264-aac.json");
    assert.equal(v1.schemas.filmState.safeParse(v2Ready).success, false);
    const v2Reserved = load("v2-film-state.reserved.json");
    assert.equal(v1.schemas.filmState.safeParse(v2Reserved).success, false);
    assert.equal(v1.schemas.errorResponse.safeParse(
        load("v2-error.invalid-argument.unsupported-version.json")).success,
    false);
  });
});

describe("coach-film.v2 tables and policy", () => {
  it("new keys, order and retentionExpiresAt naming", () => {
    assert.deepEqual([...c.NEW_FILM_KEYS],
        ["readyAt", "normalizedGeneration", "media", "retentionExpiresAt"]);
    assert.deepEqual(c.FILM_KEYS.slice(0, -4),
        Object.keys(v1.schemas.filmState.shape));
    assert.ok(!c.FILM_KEYS.includes("expiresAt"),
        "FilmState has no expiresAt (reserve data.expiresAt keeps its meaning)");
    assert.ok("expiresAt" in c.schemas.reserveData.shape);
  });
  it("only unavailable is retryable; new reasons are non-retryable", () => {
    for (const code of c.ERROR_CODES) {
      assert.equal(c.RETRYABLE[code], code === "unavailable");
    }
    assert.equal(c.errorResponseFor("invalid-argument", "unsupported-version")
        .error.retryable, false);
    assert.equal(c.errorResponseFor("failed-precondition",
        "legacy-record-invalid").error.retryable, false);
  });
  it("worker attempt policy: 3 admitted including the first, 6 h, retry OFF",
      () => {
        assert.deepEqual({...c.WORKER_ATTEMPT_POLICY}, {status: "TEST_ONLY",
          maxAdmittedAttempts: 3, admissionHorizonMs: 21600000,
          platformRetry: false});
        let admitted = 0;
        const base = {delivery: "process", configurationOk: true,
          jobCreatedAtMs: 0, nowMs: 1};
        for (let i = 0; i < 5; i++) {
          if (c.admissionDecision({...base, admitted}).admit) admitted++;
        }
        assert.equal(admitted, 3, "a fourth attempt is never admitted");
      });
  it("duplicates and contention never consume an attempt", () => {
    for (const delivery of ["duplicate", "contention"]) {
      const d = c.admissionDecision({delivery, configurationOk: true,
        admitted: 0, jobCreatedAtMs: 0, nowMs: 1});
      assert.equal(d.admit, false);
      assert.equal(d.consumes, false);
    }
  });
  it("placeholder limits are labelled PENDING_D3", () => {
    for (const v of Object.values(c.PENDING_LIMITS)) {
      assert.equal(v, "PENDING_D3");
    }
  });
});
