"use strict";
// FILM-S1 checks that need no emulator: FS-24 (contract rejection before any
// database access), FS-25 (rules literals == limits module), the ftyp check,
// and identity-reason mapping. Emulator cases live in test/emulator/.
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const c = require("../src/film/contract");
const {LIMITS} = require("../src/film/limits");
const {createFilmHandlers, isFtypHead} = require("../src/film/handlers");

const ROOT = path.join(__dirname, "..", "..");
const FIX = path.join(ROOT, "tests", "fixtures", "coach-film.v1");
const fixture = (f) => JSON.parse(fs.readFileSync(path.join(FIX, f)));

const noDb = new Proxy({}, {get() {
  throw new Error("database must not be touched");
}});
const h = createFilmHandlers({
  db: noDb, Timestamp: null,
  getUser: async () => ({disabled: false, customClaims: {beta: true}}),
  deleteObject: async () => {}, readHead: async () => null,
  logger: {info() {}, warn() {}, error() {}},
});
const AUTH = {uid: "u", token: {email_verified: true,
  firebase: {sign_in_provider: "google.com"}}};

describe("FS-24 contract rejection (fixtures, no database access)", () => {
  const manifest = fixture("index.json").fixtures;
  const schemaInvalid = manifest.filter((f) => f.kind === "request" &&
    f.valid === false && f.schemaValid === false);
  it("has schema-invalid fixtures", () => assert.ok(schemaInvalid.length >= 5));
  for (const fx of schemaInvalid) {
    it(`${fx.file} -> ${fx.expect.code}/${fx.expect.reason}`, async () => {
      const res = await h[fx.action]({auth: AUTH, data: fixture(fx.file)});
      assert.deepEqual(res, c.errorResponseFor(fx.expect.code,
          fx.expect.reason));
    });
  }
  it("non-object data and missing auth", async () => {
    assert.deepEqual(await h.reserveFilmUpload({auth: AUTH, data: "x"}),
        c.errorResponseFor("invalid-argument", "schema-invalid"));
    assert.deepEqual(await h.abandonFilmUpload({auth: null, data: {}}),
        c.errorResponseFor("unauthenticated", "sign-in-required"));
  });
});

describe("identity reason mapping", () => {
  const mk = (getUser) => createFilmHandlers({db: noDb, Timestamp: null,
    getUser, deleteObject: async () => {}, readHead: async () => null,
    logger: {info() {}, warn() {}, error() {}}});
  it("unknown account -> account-disabled; revoked -> sign-in-required",
      async () => {
        const gone = mk(async () => {
          throw new Error("no user");
        });
        assert.deepEqual(await gone.reserveFilmUpload({auth: AUTH, data: {}}),
            c.errorResponseFor("unauthenticated", "account-disabled"));
        const revoked = mk(async () => ({disabled: false,
          customClaims: {beta: true},
          tokensValidAfterTime: "2026-10-19T21:00:00.000Z"}));
        assert.deepEqual(await revoked.reserveFilmUpload({
          auth: {...AUTH, token: {...AUTH.token, auth_time: 1}}, data: {}}),
        c.errorResponseFor("unauthenticated", "sign-in-required"));
      });
  it("unexpected failure -> unavailable/backend-unavailable", async () => {
    const res = await h.reserveFilmUpload({auth: AUTH,
      data: fixture("reserve.request.valid.json")});
    assert.deepEqual(res,
        c.errorResponseFor("unavailable", "backend-unavailable"));
  });
});

describe("FS-25 rules literals == limits module", () => {
  const storage = fs.readFileSync(path.join(ROOT, "storage.rules"), "utf8");
  const block = storage.slice(storage.indexOf("match /quarantine/"));
  it("max bytes", () => {
    const m = /request\.resource\.size <= (\d+)/.exec(block);
    assert.ok(m);
    assert.equal(Number(m[1]), LIMITS.maxBytes);
  });
  it("content types", () => {
    const types = [...block.matchAll(/contentType == '([^']+)'/g)]
        .map((x) => x[1]);
    assert.deepEqual(types, [...LIMITS.allowedContentTypes]);
  });
  it("path template", () => {
    assert.ok(storage.includes("match /quarantine/{teamId}/{filmId}/source.mp4"));
    assert.equal(c.uploadPathFor("t", "f"), "quarantine/t/f/source.mp4");
  });
  it("film docs are not client-writable", () => {
    const fr = fs.readFileSync(path.join(ROOT, "firestore.rules"), "utf8");
    const b = fr.slice(fr.indexOf("match /teams/{teamId}/films/{filmId}"));
    assert.match(b.slice(0, 200), /allow write: if false;/);
  });
});

describe("ftyp first-box check", () => {
  const box = (size, type, brand) => {
    const b = Buffer.alloc(32);
    b.writeUInt32BE(size, 0);
    b.write(type, 4, "latin1");
    b.write(brand, 8, "latin1");
    return b;
  };
  it("accepts a plausible ftyp box", () => {
    assert.equal(isFtypHead(box(24, "ftyp", "isom")), true);
  });
  it("rejects wrong type, bad size, unprintable brand, short or null", () => {
    assert.equal(isFtypHead(box(24, "moov", "isom")), false);
    assert.equal(isFtypHead(box(8, "ftyp", "isom")), false);
    assert.equal(isFtypHead(box(4096, "ftyp", "isom")), false);
    assert.equal(isFtypHead(box(24, "ftyp", "\u0000\u0001ab")), false);
    assert.equal(isFtypHead(Buffer.alloc(8)), false);
    assert.equal(isFtypHead(null), false);
  });
});
