"use strict";
// coach-film.v1 contract: every golden fixture is validated against the
// server schemas, the published JSON Schema and checksums are drift-checked,
// and the error / state tables are internally consistent. No emulator.
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const c = require("../src/film/contract");
const {LIMITS, PENDING} = require("../src/film/limits");
const gen = require("../scripts/film-contract-schema");

const DIR = gen.DIR;
const manifest = JSON.parse(fs.readFileSync(path.join(DIR, "index.json")));
const load = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));

/** Parse a request the way the callable will: envelope, then payload. */
function parseRequest(callable, value) {
  const env = c.schemas.requestEnvelope.safeParse(value);
  if (!env.success) return {schemaValid: false, reason: "schema-invalid"};
  if (env.data.action !== callable) {
    return {schemaValid: false, reason: "action-mismatch"};
  }
  const p = c.PAYLOAD_SCHEMAS[callable].safeParse(env.data.payload);
  return p.success ?
    {schemaValid: true} : {schemaValid: false, reason: "schema-invalid"};
}

describe("coach-film.v1 fixtures", () => {
  it("manifest lists exactly the fixture files on disk", () => {
    const onDisk = fs.readdirSync(DIR).filter((f) => f.endsWith(".json") &&
      !["index.json", "contract.schema.json"].includes(f)).sort();
    assert.deepEqual(manifest.fixtures.map((x) => x.file).sort(), onDisk);
    assert.equal(manifest.contract, c.CONTRACT_VERSION);
  });

  for (const fx of manifest.fixtures) {
    it(`${fx.file} (${fx.kind}, valid=${fx.valid})`, () => {
      const v = load(fx.file);
      if (fx.kind === "film-state") {
        assert.ok(c.schemas.filmState.safeParse(v).success);
        assert.equal(v.uploadPath, c.uploadPathFor(v.teamId, v.filmId));
        assert.equal(v.abandonedAt !== null, v.status === "abandoned");
        assert.equal(v.rejectionReason !== null, v.status === "rejected");
        return;
      }
      if (fx.kind === "request") {
        const r = parseRequest(fx.action, v);
        if (fx.valid) {
          assert.equal(r.schemaValid, true);
        } else {
          assert.equal(r.schemaValid, fx.schemaValid);
          if (!fx.schemaValid) assert.equal(r.reason, fx.expect.reason);
          assert.equal(c.RETRYABLE[fx.expect.code], false);
          assert.ok(c.ERROR_REASONS[fx.expect.code].includes(fx.expect.reason));
        }
        return;
      }
      // response
      const schema = fx.action === "*" ?
        c.schemas.errorResponse : c.RESPONSE_SCHEMAS[fx.action];
      assert.equal(schema.safeParse(v).success, fx.valid);
      if (fx.valid && v.ok === false) {
        assert.equal(fx.serverEmits, !c.CLIENT_ONLY_REASONS.includes(
            v.error.reason));
        if (fx.serverEmits) {
          assert.deepEqual(c.errorResponseFor(v.error.code, v.error.reason), v);
        }
      }
      if (fx.valid && v.ok === true) {
        assert.equal(v.data.filmId, v.data.film.filmId);
        if (fx.action === "reserveFilmUpload") {
          assert.equal(v.data.uploadPath, v.data.film.uploadPath);
          assert.equal(v.data.expiresAt, v.data.film.reservationExpiresAt);
        }
      }
    });
  }

  it("every server-emittable (code, reason) pair has a fixture", () => {
    const have = new Set(manifest.fixtures.filter((f) => f.serverEmits)
        .map((f) => f.file));
    for (const [code, reasons] of Object.entries(c.ERROR_REASONS)) {
      for (const reason of reasons) {
        if (c.CLIENT_ONLY_REASONS.includes(reason)) continue;
        assert.ok(have.has(`error.${code}.${reason}.json`), `${code}/${reason}`);
      }
    }
  });

  it("published JSON Schema and SHA256SUMS match the source", () => {
    assert.equal(fs.readFileSync(path.join(DIR, "contract.schema.json"),
        "utf8"), gen.buildSchema());
    assert.equal(fs.readFileSync(path.join(DIR, "SHA256SUMS.txt"), "utf8"),
        gen.buildSums());
  });
});

describe("coach-film.v1 tables", () => {
  it("only unavailable is retryable; every code has reasons", () => {
    assert.deepEqual(Object.keys(c.RETRYABLE).sort(), [...c.ERROR_CODES].sort());
    assert.deepEqual(Object.keys(c.ERROR_REASONS).sort(),
        [...c.ERROR_CODES].sort());
    for (const code of c.ERROR_CODES) {
      assert.equal(c.RETRYABLE[code], code === "unavailable");
      assert.ok(c.ERROR_REASONS[code].length >= 1);
    }
  });

  it("errorResponseFor refuses client-only and foreign reasons", () => {
    assert.throws(() => c.errorResponseFor("unavailable", "transport"));
    assert.throws(() => c.errorResponseFor("conflict", "schema-invalid"));
    assert.throws(() => c.errorResponseFor("nope", "x"));
  });

  it("state machine: terminal states have no exits; ready unreachable from reserved", () => {
    for (const s of c.FILM_STATUSES) assert.ok(Array.isArray(c.TRANSITIONS[s]));
    for (const s of c.TERMINAL_STATUSES) assert.equal(c.TRANSITIONS[s].length, 0);
    assert.ok(!c.TRANSITIONS.reserved.includes("ready"));
    for (const s of c.SLOT_HOLDING_STATUSES) {
      assert.ok(!c.TERMINAL_STATUSES.includes(s));
    }
  });

  it("timestamps: canonical ISO with millis only", () => {
    const t = c.schemas.isoTimestamp;
    assert.ok(t.safeParse("2026-10-19T21:15:00.000Z").success);
    for (const bad of ["2026-10-19T21:15:00Z", "2026-10-19T21:15:00.000+00:00",
      "2026-02-30T00:00:00.000Z", "2026-10-19 21:15:00.000Z", 1760908500000]) {
      assert.equal(t.safeParse(bad).success, false, String(bad));
    }
    assert.equal(c.toWireTimestamp(new Date(Date.UTC(2026, 9, 19, 21))),
        "2026-10-19T21:00:00.000Z");
    assert.equal(c.toWireTimestamp(null), null);
  });

  it("every limit is labelled placeholder or delegated", () => {
    for (const k of Object.keys(LIMITS)) {
      assert.ok(["PENDING_D3", "PENDING_D7", "DELEGATED"].includes(PENDING[k]), k);
    }
  });
});
