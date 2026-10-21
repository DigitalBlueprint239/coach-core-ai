"use strict";
// LFS L11 (operator, doubles half; emulator half in
// test/emulator/lfs-reconcile.emulator.test.js) and L12 (boundary: TEST_ONLY,
// unexported, retry 0, guard over source AND loaded exports).
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const {spawnSync} = require("child_process");
const c = require("../src/film/contract");
const cl = require("../src/film/cleanup");
const r = require("../src/film/reconcile");
const admin = require("../scripts/film-cleanup-admin");
const {FakeFirestore} = require("./lfs-doubles");

const BKT = "demo-lfs.appspot.com";
const T0 = 1792526400000;

/** A valid pending record, then parked (C1-R2 shape). */
function parkedRecord(o = {}) {
  const name = c.uploadPathFor("team-x", crypto.randomUUID());
  const generation = "1001";
  const id = cl.cleanupIdFor(o.bucket || BKT, name, generation);
  const rec = {bucket: o.bucket || BKT, name, generation, teamId: "team-x",
    filmId: name.split("/")[2], origin: "abandon", createdAtMs: T0,
    state: "pending", attempts: 0, fence: 0, lease: null, history: [],
    nextAttemptAtMs: T0, sweepDueAtMs: null, resolvedAtMs: null,
    evidence: null, parked: {problem: "bucket-mismatch", sweepDueAtMs: T0,
      atMs: T0 + 5}};
  return {id, rec: {...rec, ...(o.patch || {})}};
}

describe("L11 operator tool (emulator-only, CAS unpark)", () => {
  it("refuses unless demo-* AND FIRESTORE_EMULATOR_HOST, on every command",
      () => {
        assert.equal(admin.environmentProblem({}, "coach-core-prod"),
            "project-not-demo");
        assert.equal(admin.environmentProblem({}, "demo-x"),
            "emulator-host-missing");
        assert.equal(admin.environmentProblem({FIRESTORE_EMULATOR_HOST:
          "127.0.0.1:1"}, "demo-x"), null);
        const script = path.join(__dirname, "..", "scripts",
            "film-cleanup-admin.js");
        for (const [env, args] of [
          [{GCLOUD_PROJECT: "coach-core-prod",
            FIRESTORE_EMULATOR_HOST: "127.0.0.1:1"}, ["list-parked"]],
          [{GCLOUD_PROJECT: "demo-x"}, ["unpark", "--id", "x"]],
          [{GCLOUD_PROJECT: "demo-x", FIRESTORE_EMULATOR_HOST: "1.2.3.4:1"},
            ["list-stuck", "--project", "live-project"]],
        ]) {
          const res = spawnSync(process.execPath, [script, ...args],
              {encoding: "utf8", env: {PATH: process.env.PATH, ...env}});
          assert.equal(res.status, 1, res.stderr);
          assert.match(res.stderr, /refused \((project-not-demo|emulator-host-missing)\)/);
        }
      });
  it("unpark after the configuration is right: candidate passes " +
      "recordProblem; audit verbatim; record otherwise byte-equal", async () => {
    const db = new FakeFirestore();
    const {id, rec} = parkedRecord();
    db.write(`filmCleanup/${id}`, rec);
    const res = await admin.unpark(db, {id, expectParkedAt: rec.parked.atMs,
      reason: "default bucket restored", bucketName: BKT, nowMs: T0 + 100});
    assert.deepEqual(res, {ok: true, n: 1});
    const after = db.read(`filmCleanup/${id}`);
    const {parked, ...rest} = rec;
    assert.deepEqual(after, {...rest, sweepDueAtMs: T0 + 100});
    assert.equal(cl.recordProblem(id, after, BKT), null);
    assert.deepEqual(db.read(`filmCleanupAudit/${id}/events/1`), {
      kind: "unpark", parked, reason: "default bucket restored",
      atMs: T0 + 100, n: 1});
  });
  const refusals = {
    "still invalid (bucket still differs)": [{bucket: "old.appspot.com"},
      {}, "still-invalid:bucket-mismatch"],
    "CAS mismatch": [{}, {expectParkedAt: 1}, "cas-mismatch"],
    "terminal": [{patch: {state: "deleted"}}, {}, "not-pending"],
    "stuck": [{patch: {state: "stuck"}}, {}, "not-pending"],
    "live lease": [{patch: {lease: {holder: "h", fence: 1,
      untilMs: T0 + 10e6}}}, {}, "live-lease"],
    "bad reason": [{}, {reason: "x".repeat(121)}, "reason-invalid"],
    "control char in reason": [{}, {reason: "a\nb"}, "reason-invalid"],
  };
  for (const [name, [ro, uo, want]] of Object.entries(refusals)) {
    it(`refuses (${name}) with no write`, async () => {
      const db = new FakeFirestore();
      const {id, rec} = parkedRecord(ro);
      db.write(`filmCleanup/${id}`, rec);
      const res = await admin.unpark(db, {id, expectParkedAt:
        rec.parked.atMs, reason: "ok", bucketName: BKT, nowMs: T0 + 100,
      ...uo});
      assert.deepEqual(res, {refused: want});
      assert.deepEqual(db.read(`filmCleanup/${id}`), rec);
      assert.equal(db.read(`filmCleanupAudit/${id}`), null);
    });
  }
  it("audit history full: refused, never truncated", async () => {
    const db = new FakeFirestore();
    const {id, rec} = parkedRecord();
    db.write(`filmCleanup/${id}`, rec);
    db.write(`filmCleanupAudit/${id}`, {count: admin.PARK_AUDIT_MAX});
    assert.deepEqual(await admin.unpark(db, {id, expectParkedAt:
      rec.parked.atMs, reason: "x", bucketName: BKT, nowMs: T0}),
    {refused: "audit-full"});
    assert.deepEqual(db.read(`filmCleanupAudit/${id}`),
        {count: admin.PARK_AUDIT_MAX});
  });
  it("concurrent unparks: exactly one wins (CAS + transaction)",
      async () => {
        const db = new FakeFirestore();
        const {id, rec} = parkedRecord();
        db.write(`filmCleanup/${id}`, rec);
        const o = {id, expectParkedAt: rec.parked.atMs, reason: "x",
          bucketName: BKT, nowMs: T0 + 1};
        const res = await Promise.all([admin.unpark(db, o),
          admin.unpark(db, o)]);
        assert.deepEqual(res.map((x) => x.ok ? "ok" : x.refused).sort(),
            ["not-parked", "ok"]);
        assert.deepEqual(db.read(`filmCleanupAudit/${id}`), {count: 1});
      });
  it("unparked record is admitted and deleted by the accepted C1 " +
      "machinery; re-invalidation re-parks via admission (no loop)",
  async () => {
    const db = new FakeFirestore();
    const {LfsBucket} = require("./lfs-doubles");
    const bucket = new LfsBucket(BKT, () => new Date(T0));
    const {id, rec} = parkedRecord();
    bucket.put(rec.name, Buffer.from("x"), "video/mp4", rec.generation);
    db.write(`filmCleanup/${id}`, rec);
    await admin.unpark(db, {id, expectParkedAt: rec.parked.atMs,
      reason: "x", bucketName: BKT, nowMs: T0 + 1});
    const api = cl.createCleanup({db, bucketName: () => BKT,
      getBucket: () => bucket, now: () => new Date(T0 + 2),
      logger: {info() {}, warn() {}, error() {}}});
    const a = await api.attemptOnce(id);
    assert.equal(a.result, "deleted");
    // another record, unparked then re-invalidated: parked again
    const p2 = parkedRecord();
    db.write(`filmCleanup/${p2.id}`, p2.rec);
    await admin.unpark(db, {id: p2.id, expectParkedAt: p2.rec.parked.atMs,
      reason: "x", bucketName: BKT, nowMs: T0 + 1});
    const api2 = cl.createCleanup({db, bucketName: () => "renamed.appspot.com",
      getBucket: () => bucket, now: () => new Date(T0 + 2),
      logger: {info() {}, warn() {}, error() {}}});
    assert.equal((await api2.attemptOnce(p2.id)).admission, "invalid");
    assert.equal(db.read(`filmCleanup/${p2.id}`).parked.problem,
        "bucket-mismatch");
  });
});

describe("L12 boundary", () => {
  let fns;
  const load = () => {
    process.env.GCLOUD_PROJECT = "demo-coach-core-beta";
    fns = fns || require("../index");
    return fns;
  };
  it("loaded exports carry no TEST_ONLY marker; no reconciler/admin " +
      "export; index.js does not reference them", () => {
    assert.equal(cl.testOnlyExportProblem(load()), null);
    for (const name of Object.keys(load())) {
      assert.ok(!/reconcil|lfs|cleanup-admin/i.test(name), name);
    }
    const src = fs.readFileSync(path.join(__dirname, "..", "index.js"),
        "utf8");
    assert.ok(!/reconcile|lfs-transport|film-cleanup-admin/.test(src));
  });
  it("trigger definition: retryCount 0, marked TEST_ONLY, default-OFF " +
      "before any work", async () => {
    let runs = 0;
    let on = false;
    const t = r.defineReconcileTrigger({run: async () => {
      runs += 1;
    }, isEnabled: () => on});
    assert.equal(t.__endpoint.scheduleTrigger.retryConfig.retryCount, 0);
    assert.equal(t.__filmTestOnly, "film-lfs-reconciler");
    assert.equal(cl.testOnlyExportProblem({x: t}), "x=film-lfs-reconciler");
    await t.run({});
    assert.equal(runs, 0);
    on = true;
    await t.run({});
    assert.equal(runs, 1);
  });
  it("predeploy guard blocks a named, a disguised and an unloadable " +
      "reconciler export, regardless of terms and with --check", () => {
    const fnDir = path.join(__dirname, "..");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lfs-guard-"));
    fs.cpSync(path.join(fnDir, "src"), path.join(dir, "src"),
        {recursive: true});
    fs.mkdirSync(path.join(dir, "scripts"));
    fs.copyFileSync(path.join(fnDir, "scripts", "film-terms-guard.js"),
        path.join(dir, "scripts", "film-terms-guard.js"));
    fs.symlinkSync(path.join(fnDir, "node_modules"),
        path.join(dir, "node_modules"));
    fs.writeFileSync(path.join(dir, "src/film/terms.js"),
        "module.exports={TERMS:{},pendingTerms:()=>[]," +
        "allTermsSettled:()=>true};\n");
    const run = (index, args) => {
      fs.writeFileSync(path.join(dir, "index.js"), index);
      return spawnSync(process.execPath, [path.join(dir,
          "scripts/film-terms-guard.js"), ...args], {encoding: "utf8"});
    };
    const named = "const m=require('./src/film/reconcile');\n" +
      "exports.r=m.defineReconcileTrigger({run:async()=>{}," +
      "isEnabled:()=>false});\n";
    const disguised = "const m=require('./src/film/'+'recon'+'cile');\n" +
      "exports.nightly=m['define'+'Reconcile'+'Trigger']({run:" +
      "async()=>{},isEnabled:()=>false});\n";
    for (const args of [[], ["--check"]]) {
      let res = run(named, args);
      assert.equal(res.status, 1, res.stderr);
      assert.match(res.stderr, /LFS reconciler\/operator referenced/);
      res = run(disguised, args);
      assert.equal(res.status, 1, res.stderr);
      assert.match(res.stderr, /exported: nightly=film-lfs-reconciler/);
      res = run("throw new Error('x');\n", args);
      assert.equal(res.status, 1, res.stderr);
    }
    assert.equal(run("exports.ok = 1;\n", []).status, 0);
    fs.rmSync(dir, {recursive: true, force: true});
  });
});
