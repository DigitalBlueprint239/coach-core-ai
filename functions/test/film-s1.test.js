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
  it("unknown failure -> thrown sanitized internal (not retry-eligible)",
      async () => {
        await assert.rejects(h.reserveFilmUpload({auth: AUTH,
          data: fixture("reserve.request.valid.json")}), (e) =>
          e.code === "internal" && e.message === "internal" &&
          e.details === undefined);
      });
  for (const code of [10, 4, 14, "aborted", "unavailable"]) {
    it(`known transient (${code}) -> unavailable/backend-unavailable`,
        async () => {
          const t = createFilmHandlers({
            db: {runTransaction: async () => {
              throw Object.assign(new Error("x"), {code});
            }},
            Timestamp: null,
            getUser: async () => ({disabled: false, customClaims: {beta: true}}),
            deleteObject: async () => {}, readHead: async () => null,
            logger: {info() {}, warn() {}, error() {}}});
          assert.deepEqual(await t.reserveFilmUpload({auth: AUTH,
            data: fixture("reserve.request.valid.json")}),
          c.errorResponseFor("unavailable", "backend-unavailable"));
        });
  }
  for (const code of [7, 8, 13, "permission-denied", undefined]) {
    it(`non-transient (${code}) -> thrown internal`, async () => {
      const t = createFilmHandlers({
        db: {runTransaction: async () => {
          throw Object.assign(new Error("secret detail"), {code});
        }},
        Timestamp: null,
        getUser: async () => ({disabled: false, customClaims: {beta: true}}),
        deleteObject: async () => {}, readHead: async () => null,
        logger: {info() {}, warn() {}, error() {}}});
      await assert.rejects(t.reserveFilmUpload({auth: AUTH,
        data: fixture("reserve.request.valid.json")}), (e) =>
        e.code === "internal" && !/secret/.test(e.message));
    });
  }
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

describe("R4 ftyp bounds", () => {
  const {HEAD_READ_BYTES} = require("../src/film/handlers");
  const ftyp = (size, len = size) => {
    const b = Buffer.alloc(len);
    b.writeUInt32BE(size, 0);
    b.write("ftypisom", 4, "latin1");
    for (let i = 16; i + 4 <= Math.min(size, len); i += 4) {
      b.write("iso2", i, "latin1");
    }
    return b;
  };
  it("accepts complete boxes up to the 1 KiB read", () => {
    assert.equal(HEAD_READ_BYTES, 1024);
    for (const n of [16, 20, 80, 1024]) assert.equal(isFtypHead(ftyp(n)), true, n);
  });
  it("rejects truncated, misaligned or oversized boxes", () => {
    assert.equal(isFtypHead(ftyp(80, 64)), false); // box larger than bytes read
    assert.equal(isFtypHead(ftyp(22, 32)), false); // (size-16) % 4 != 0
    assert.equal(isFtypHead(ftyp(1028, 1024)), false);
  });
});

describe("R2/R3 storage adapter (fake bucket)", () => {
  const {createStorageAdapter} = require("../src/film/storage-adapter");
  const fakeBucket = (behaviour) => ({file: (name, opts) => ({
    delete: async (o) => behaviour.delete(name, o),
    download: async (o) => behaviour.download(name, opts, o),
  })});
  it("deletes only the given generation; 404/412 -> false; else throws",
      async () => {
        const calls = [];
        const ok = createStorageAdapter(fakeBucket({delete: async (n, o) => {
          calls.push([n, o]);
        }}));
        assert.equal(await ok.deleteObject({name: "q/x", generation: "171"}),
            true);
        assert.deepEqual(calls, [["q/x", {ifGenerationMatch: "171"}]]);
        await assert.rejects(ok.deleteObject({name: "q/x", generation: null}));
        for (const code of [404, 412]) {
          const a = createStorageAdapter(fakeBucket({delete: async () => {
            throw Object.assign(new Error("x"), {code});
          }}));
          assert.equal(await a.deleteObject({name: "q", generation: "1"}),
              false);
        }
        const bad = createStorageAdapter(fakeBucket({delete: async () => {
          throw Object.assign(new Error("x"), {code: 503});
        }}));
        await assert.rejects(bad.deleteObject({name: "q", generation: "1"}));
      });
  it("reads that generation; 404 -> null; transient -> throws", async () => {
    let seen;
    const a = createStorageAdapter(fakeBucket({download: async (n, f, o) => {
      seen = {n, f, o};
      return [Buffer.from("ab")];
    }}));
    const buf = await a.readHead({name: "q", generation: "9", bytes: 1024});
    assert.equal(buf.toString(), "ab");
    assert.deepEqual(seen, {n: "q", f: {generation: "9"},
      o: {start: 0, end: 1023, validation: false}});
    const gone = createStorageAdapter(fakeBucket({download: async () => {
      throw Object.assign(new Error("x"), {code: 404});
    }}));
    assert.equal(await gone.readHead({name: "q", generation: "9", bytes: 4}),
        null);
    const flaky = createStorageAdapter(fakeBucket({download: async () => {
      throw Object.assign(new Error("x"), {code: "ECONNRESET"});
    }}));
    await assert.rejects(flaky.readHead({name: "q", generation: "9",
      bytes: 4}));
  });
});

describe("R1 visibly non-deployable", () => {
  const {spawnSync} = require("child_process");
  const {pendingTerms} = require("../src/film/terms");
  it("D3 and D7 are PENDING, and the predeploy guard exits 1", () => {
    assert.deepEqual(pendingTerms(), ["D3", "D7"]);
    const r = spawnSync(process.execPath,
        [path.join(__dirname, "..", "scripts", "film-terms-guard.js")],
        {encoding: "utf8"});
    assert.equal(r.status, 1);
    assert.match(r.stderr, /DEPLOY BLOCKED: FILM TERMS PENDING/);
  });
  it("firebase.json runs the guard before any functions deploy", () => {
    const fb = JSON.parse(fs.readFileSync(path.join(ROOT, "firebase.json")));
    assert.deepEqual(fb.functions.predeploy,
        ["node \"$RESOURCE_DIR/scripts/film-terms-guard.js\""]);
  });
  it("switch off: handler refuses before identity or data access", async () => {
    let touched = false;
    const off = createFilmHandlers({db: noDb, Timestamp: null,
      isEnabled: () => false,
      getUser: async () => {
        touched = true;
        return {};
      },
      deleteObject: async () => false, readHead: async () => null,
      logger: {info() {}, warn() {}, error() {}}});
    await assert.rejects(off.reserveFilmUpload({auth: AUTH,
      data: fixture("reserve.request.valid.json")}),
    (e) => e.code === "internal" && e.message === "internal");
    assert.equal(touched, false);
  });
  it("deployed callables default to off (COACH_CORE_FILM_ENABLED unset)",
      async () => {
        process.env.GCLOUD_PROJECT = "demo-coach-core-beta";
        delete process.env.COACH_CORE_FILM_ENABLED;
        const fns = require("../index");
        for (const name of ["reserveFilmUpload", "abandonFilmUpload"]) {
          await assert.rejects(fns[name].run({auth: AUTH,
            data: fixture("reserve.request.valid.json")}),
          (e) => e.code === "internal", name);
        }
      });
});
