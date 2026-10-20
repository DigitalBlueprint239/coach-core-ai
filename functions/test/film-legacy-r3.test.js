"use strict";
// Stored r3 receipts across coach-film.v2 (A1 R3). CONTRACT AUTHORING ONLY:
// the projection and replay decision are pure library code with no handler
// or database wiring. Exercised over EVERY v1 golden response fixture.
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const v1 = require("../src/film/contract");
const c = require("../src/film/contract-v2");
const {projectR3SuccessToV2, decideReplay, SUPPORTED_RECEIPT_STATUS} =
  require("../src/film/legacy-r3");

const V1DIR = path.join(__dirname, "..", "..", "tests", "fixtures",
    "coach-film.v1");
const v1Index = JSON.parse(fs.readFileSync(path.join(V1DIR, "index.json")));
const raw = (f) => fs.readFileSync(path.join(V1DIR, f), "utf8");
const legacyInvalid = c.errorResponseFor("failed-precondition",
    "legacy-record-invalid");
const deepFreeze = (o) => {
  if (o && typeof o === "object") {
    Object.values(o).forEach(deepFreeze); Object.freeze(o);
  }
  return o;
};

const successReceipts = v1Index.fixtures.filter((f) => f.kind === "response" &&
  f.valid && f.action !== "*" && JSON.parse(raw(f.file)).ok === true);
const otherResponses = v1Index.fixtures.filter((f) => f.kind === "response" &&
  !successReceipts.includes(f));

describe("projectR3SuccessToV2 over every v1 success receipt", () => {
  it("there are success receipts for both actions", () => {
    const actions = new Set(successReceipts.map((f) => f.action));
    assert.deepEqual([...actions].sort(),
        ["abandonFilmUpload", "reserveFilmUpload"]);
  });
  for (const fx of successReceipts) {
    it(`${fx.file}: values preserved, four null keys added, v2-valid`, () => {
      const stored = raw(fx.file);
      const original = JSON.parse(stored);
      const p = projectR3SuccessToV2(fx.action, stored);
      assert.equal(p.ok, true, JSON.stringify(p.error));
      assert.equal(stored, raw(fx.file), "stored string unchanged");
      const film = p.response.data.film;
      assert.deepEqual(Object.keys(film), c.FILM_KEYS);
      for (const [k, val] of Object.entries(original.data.film)) {
        assert.deepEqual(film[k], val, `film.${k} preserved`);
      }
      for (const k of c.NEW_FILM_KEYS) assert.equal(film[k], null, k);
      for (const [k, val] of Object.entries(original.data)) {
        if (k !== "film") assert.deepEqual(p.response.data[k], val, k);
      }
      assert.ok(c.RESPONSE_SCHEMAS[fx.action].safeParse(p.response).success);
      assert.equal(film.status, SUPPORTED_RECEIPT_STATUS[fx.action]);
      assert.ok(!("schemaVersion" in p.response), "no invented version field");
      // The projection is independent of the parsed original.
      original.data.film.fileName = "mutated";
      assert.notEqual(p.response.data.film.fileName, "mutated");
    });
  }
  it("reserve receipt keeps the reservation expiry in data.expiresAt", () => {
    const p = projectR3SuccessToV2("reserveFilmUpload",
        raw("reserve.response.ok.json"));
    assert.equal(p.response.data.expiresAt, "2026-10-19T22:00:00.000Z");
    assert.equal(p.response.data.film.retentionExpiresAt, null);
  });
});

describe("projectR3SuccessToV2 fails closed", () => {
  for (const fx of otherResponses) {
    it(`${fx.file}: not a storable success receipt -> legacy-record-invalid`,
        () => {
          const action = fx.action === "*" ? "reserveFilmUpload" : fx.action;
          assert.deepEqual(projectR3SuccessToV2(action, raw(fx.file)).error,
              legacyInvalid);
        });
  }
  const r = raw("reserve.response.ok.json");
  const cases = {
    "corrupt JSON": ["reserveFilmUpload", r.slice(0, 40)],
    "unknown top-level field": ["reserveFilmUpload",
      r.replace("\"ok\": true,", "\"ok\": true, \"extra\": 1,")],
    "unknown film field": ["reserveFilmUpload",
      r.replace("\"status\": \"reserved\",",
          "\"status\": \"reserved\", \"media\": null,")],
    "impossible ready receipt": ["reserveFilmUpload",
      r.replace("\"status\": \"reserved\"", "\"status\": \"ready\"")],
    "reserve receipt under abandon action": ["abandonFilmUpload", r],
    "unknown action": ["deleteFilm", r],
    "non-string input": ["reserveFilmUpload", JSON.parse(r)],
  };
  for (const [name, [action, input]] of Object.entries(cases)) {
    it(`${name} -> legacy-record-invalid (non-retryable)`, () => {
      const p = projectR3SuccessToV2(action, input);
      assert.equal(p.ok, false);
      assert.deepEqual(p.error, legacyInvalid);
      assert.equal(p.error.error.retryable, false);
    });
  }
});

describe("decideReplay is pure", () => {
  it("does not mutate a deep-frozen query", () => {
    const q = deepFreeze({requestSchemaVersion: "coach-film.v2",
      action: "reserveFilmUpload", payloadHash: "h", nowMs: 1,
      stored: {action: "reserveFilmUpload", payloadHash: "h",
        responseJson: raw("reserve.response.ok.json"),
        replayableUntilMs: 10}});
    const out = decideReplay(q);
    assert.equal(out.kind, "replay");
    assert.deepEqual(Object.keys(out.response.data.film), c.FILM_KEYS);
  });
  it("v1 module is not used to emit v2-only reasons", () => {
    assert.ok(!v1.ERROR_REASONS["invalid-argument"]
        .includes("unsupported-version"));
  });
});
