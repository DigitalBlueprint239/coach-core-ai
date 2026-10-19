"use strict";
// coach-film.v1 contract: every golden fixture is validated against the
// authoritative server schemas. Negative mutation fixtures must be rejected
// by the schemas for the NAMED rule (not merely by some rule). The published
// JSON Schema and checksums are drift-checked. No emulator.
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
const anyServerResponse = (v) =>
  c.RESPONSE_SCHEMAS.reserveFilmUpload.safeParse(v).success ||
  c.RESPONSE_SCHEMAS.abandonFilmUpload.safeParse(v).success;

/** Parse a request the way the callable will: envelope, then payload. */
function parseRequest(callable, value) {
  const env = c.schemas.requestEnvelope.safeParse(value);
  if (!env.success) return {schemaValid: false, reason: "schema-invalid"};
  if (env.data.action !== callable) {
    return {schemaValid: false, reason: "action-mismatch"};
  }
  const p = c.PAYLOAD_SCHEMAS[callable].safeParse(env.data.payload);
  return p.success ? {schemaValid: true, payload: p.data} :
    {schemaValid: false, reason: "schema-invalid"};
}

/** Messages of a failed parse, for named-rule checks. */
const messages = (r) => r.error.issues.map((i) => i.message).join(" | ");

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
        const r = c.schemas.filmState.safeParse(v);
        assert.equal(r.success, fx.valid);
        if (!fx.valid) assert.match(messages(r), new RegExp(fx.rule));
        return;
      }
      if (fx.kind === "client-failure") {
        assert.equal(c.schemas.clientFailure.safeParse(v).success, fx.valid);
        assert.equal(anyServerResponse(v), false,
            "client failure must never parse as a server response");
        return;
      }
      if (fx.kind === "request") {
        const r = parseRequest(fx.action, v);
        if (fx.valid) {
          assert.equal(r.schemaValid, true);
          if (fx.canonicalFileName) {
            assert.equal(r.payload.fileName, fx.canonicalFileName);
            assert.equal(c.canonicalizeFileName(v.payload.fileName),
                fx.canonicalFileName);
          }
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
      const r = schema.safeParse(v);
      assert.equal(r.success, fx.valid);
      if (fx.mutation) assert.match(messages(r), new RegExp(fx.rule));
      if (fx.valid) {
        assert.equal(c.schemas.clientFailure.safeParse(v).success, false);
      }
      if (fx.valid && v.ok === false) {
        assert.deepEqual(c.errorResponseFor(v.error.code, v.error.reason), v);
      }
    });
  }

  it("all eight reviewer mutations (M1-M8) are present and rejected", () => {
    const m = manifest.fixtures.filter((f) => /^M[1-8]$/.test(f.mutation || ""));
    assert.deepEqual(m.map((f) => f.mutation).sort(),
        ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"]);
    for (const f of m) assert.equal(f.valid, false);
  });

  it("every server (code, reason) pair has a fixture", () => {
    const have = new Set(manifest.fixtures.map((f) => f.file));
    for (const [code, reasons] of Object.entries(c.ERROR_REASONS)) {
      for (const reason of reasons) {
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

  it("client failures: only network, sdk unavailable/deadline retry-eligible",
      () => {
        const eligible = [];
        for (const [kind, t] of Object.entries(c.CLIENT_FAILURES)) {
          for (const [cat, e] of Object.entries(t)) {
            if (e) eligible.push(`${kind}/${cat}`);
          }
        }
        assert.deepEqual(eligible.sort(), ["network/network",
          "sdk/deadline-exceeded", "sdk/unavailable"]);
        assert.throws(() => c.clientFailureFor("sdk", "transport"));
        assert.deepEqual(c.clientFailureFor("protocol", "response-invalid"),
            {clientFailure: {kind: "protocol", category: "response-invalid",
              retryEligible: false}});
      });

  it("errorResponseFor refuses foreign reasons", () => {
    assert.throws(() => c.errorResponseFor("unavailable", "transport"));
    assert.throws(() => c.errorResponseFor("conflict", "schema-invalid"));
    assert.throws(() => c.errorResponseFor("nope", "x"));
  });

  it("state machine: terminal states have no exits; ready unreachable from reserved", () => {
    for (const s of c.FILM_STATUSES) {
      assert.ok(Array.isArray(c.TRANSITIONS[s]));
      assert.ok(["null", "required", "any"].includes(c.GENERATION_RULE[s]));
    }
    for (const s of c.TERMINAL_STATUSES) assert.equal(c.TRANSITIONS[s].length, 0);
    assert.ok(!c.TRANSITIONS.reserved.includes("ready"));
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

  it("file name canonicalization: NFC then trim; controls rejected", () => {
    const f = c.schemas.canonicalFileName;
    assert.equal(f.parse("  Café.mp4\t"), "Café.mp4");
    for (const bad of ["   ", "a\u0000b", "a\u007fb", "a\u0085b",
      "x".repeat(LIMITS.maxFileNameLength + 1)]) {
      assert.equal(f.safeParse(bad).success, false, JSON.stringify(bad));
    }
    assert.equal(f.safeParse(" " + "x".repeat(LIMITS.maxFileNameLength) + " ")
        .success, true);
  });

  it("C4: file name limit counts UTF-16 units in request AND stored schemas",
      () => {
        const req = load("reserve.request.valid.json");
        const st = load("film-state.reserved.json");
        const accepts = (name) => ({
          request: c.schemas.reserveRequest.safeParse({...req,
            payload: {...req.payload, fileName: name}}).success,
          stored: c.schemas.filmState.safeParse({...st, fileName: name})
              .success,
        });
        const max = LIMITS.maxFileNameLength;
        assert.equal(max, 120);
        assert.deepEqual(accepts("\u{1F600}".repeat(60)),
            {request: true, stored: true});
        assert.deepEqual(accepts("\u{1F600}".repeat(61)),
            {request: false, stored: false});
        assert.deepEqual(accepts("a".repeat(max)), {request: true, stored: true});
        assert.deepEqual(accepts("a".repeat(max + 1)),
            {request: false, stored: false});
        // 119 ASCII + 1 astral = 121 units (120 code points): rejected.
        assert.deepEqual(accepts("a".repeat(119) + "\u{1F600}"),
            {request: false, stored: false});
      });

  it("manifest utf16Units matches the fixture's canonical file name", () => {
    for (const fx of manifest.fixtures.filter((f) => f.utf16Units)) {
      const v = load(fx.file);
      const name = fx.kind === "film-state" ? v.fileName :
        c.canonicalizeFileName(v.payload.fileName);
      assert.equal(name.length, fx.utf16Units, fx.file);
    }
  });

  it("every limit is labelled placeholder or delegated", () => {
    for (const k of Object.keys(LIMITS)) {
      assert.ok(["PENDING_D3", "PENDING_D7", "DELEGATED"].includes(PENDING[k]), k);
    }
  });
});
