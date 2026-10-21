"use strict";
// LFS L13 + L11 (emulator half): the reconciler's lease, verify, checkpoint
// and evidence transactions, and the frozen S1 decisions it re-drives, run on
// the REAL Firestore emulator through the dedicated BOUNDED Firestore client
// (lfs-transport.createBoundedFirestore: pinned SDK, gRPC, configured
// deadlines). Listing and objects use the bucket double (the Storage
// emulator ignores generations and preconditions; stated limit). Also runs
// the emulator-only operator CLI against the emulator.
// Run: firebase emulators:exec --project demo-coach-core-beta --only
//   firestore "node --test test/emulator/lfs-reconcile.emulator.test.js"
const {describe, it, beforeEach, after} = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const path = require("path");
const {spawnSync} = require("child_process");

const PROJECT = process.env.GCLOUD_PROJECT || "demo-coach-core-beta";
if (!PROJECT.startsWith("demo-") || !process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("LFS emulator tests need a demo-* project + the emulator");
}

const {Firestore, Timestamp} = require("@google-cloud/firestore");
const {initializeApp, getApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const c = require("../../src/film/contract");
const cl = require("../../src/film/cleanup");
const {LIMITS} = require("../../src/film/limits");
const {createFilmHandlers} = require("../../src/film/handlers");
const {createStorageAdapter} = require("../../src/film/storage-adapter");
const t = require("../../src/film/lfs-transport");
const r = require("../../src/film/reconcile");
const {LfsBucket} = require("../lfs-doubles");

initializeApp({projectId: PROJECT}, "lfs-emu");
const adminDb = getFirestore(getApp("lfs-emu"));
const db = t.createBoundedFirestore({Firestore, projectId: PROJECT});
after(() => db.terminate());
const BKT = `${PROJECT}.appspot.com`;
const OWNER = "uid-owner";
const TEAM = "team-lfs-emu";
const T0 = new Date("2026-10-20T20:00:00.000Z");
const MIN = 60 * 1000;
const logger = {info() {}, warn() {}, error() {}};
const AUTH = {uid: OWNER, token: {email_verified: true,
  firebase: {sign_in_provider: "google.com"}, auth_time: 1760900000}};
const MP4 = Buffer.alloc(32);
MP4.writeUInt32BE(24, 0);
MP4.write("ftypisom", 4, "latin1");
MP4.writeUInt32BE(0x200, 12);
MP4.write("isomiso2", 16, "latin1");

beforeEach(async () => {
  for (const col of ["teams", "filmOperations", "filmCleanup",
    "filmReconcile", "filmCleanupAudit"]) {
    const snap = await adminDb.collection(col).get();
    for (const d of snap.docs) await adminDb.recursiveDelete(d.ref);
  }
  await adminDb.doc(`teams/${TEAM}`).set({ownerId: OWNER, name: "E"});
});

/** S1 handlers (setup) + reconciler, both on the emulator. */
function world() {
  const clock = {t: T0};
  const now = () => clock.t;
  const bucket = new LfsBucket(BKT, now);
  const s1 = createFilmHandlers({db: adminDb, Timestamp,
    getUser: async () => ({disabled: false, customClaims: {beta: true}}),
    readHead: (x) => createStorageAdapter(bucket).readHead(x),
    cleanupBucketName: () => BKT, cleanupBucket: () => bucket, logger,
    now});
  const rc = r.createQuarantineReconciler({db, Timestamp, storage: bucket,
    bucketName: () => BKT, project: PROJECT, logger, now,
    limits: r.deriveLimits(undefined, {objectBudgetMs: 1000})});
  return {clock, bucket, s1, rc,
    advance: (ms) => {
      clock.t = new Date(clock.t.getTime() + ms);
    },
    reserve: async () => {
      const res = await s1.reserveFilmUpload({auth: AUTH, data: {
        schemaVersion: c.CONTRACT_VERSION, operationId: crypto.randomUUID(),
        action: "reserveFilmUpload", payload: {teamId: TEAM,
          declaredBytes: 32, declaredContentType: "video/mp4",
          fileName: "clip.mp4", rightsAcknowledged: true,
          rightsWordingVersion: "rights-v1"}}});
      assert.equal(res.ok, true, JSON.stringify(res));
      return res.data.filmId;
    },
    film: async (filmId) => (await adminDb.doc(
        `teams/${TEAM}/films/${filmId}`).get()).data(),
    record: async (e) => (await adminDb.doc(`filmCleanup/${cl.cleanupIdFor(
        BKT, e.name, e.generation)}`).get()).data(),
    state: async () => (await adminDb.doc(r.STATE_PATH).get()).data(),
  };
}

describe("LFS reconciler on the Firestore emulator (bounded client)", () => {
  it("L1: configuration-lost finalize, live reservation -> recovered " +
      "intake; lease released; transactions counted", async () => {
    const w = world();
    const filmId = await w.reserve();
    const e = w.bucket.put(c.uploadPathFor(TEAM, filmId), MP4);
    w.advance(16 * MIN);
    const out = await w.rc.reconcileQuarantine({limit: 10});
    assert.deepEqual(out.outcomes, {validating: 1}, JSON.stringify(out));
    assert.equal((await w.film(filmId)).status, "validating");
    assert.equal((await w.film(filmId)).objectGeneration, e.generation);
    const s = await w.state();
    assert.equal(s.lease, null);
    assert.equal(s.afterName, null, "pass ended");
    assert.ok(r.stateSchema.safeParse(s).success);
    assert.ok(out.counters.transactions >= 4);
    assert.ok(out.counters.callbackAttempts >= out.counters.transactions);
  });
  it("L1/L2: after lazy expiry -> stale-expired obligation -> deleted",
      async () => {
        const w = world();
        const filmId = await w.reserve();
        const e = w.bucket.put(c.uploadPathFor(TEAM, filmId), MP4);
        w.advance(LIMITS.reservationLifetimeMs + MIN);
        await w.reserve();
        const out = await w.rc.reconcileQuarantine({limit: 10});
        assert.deepEqual(out.outcomes, {"stale-expired": 1});
        assert.equal((await w.record(e)).state, "deleted");
        assert.equal(w.bucket.objects.has(e.name), false);
      });
  it("L7/L18: per-object checkpoint across invocations and bound " +
      "evidence documents on the real emulator", async () => {
    const w = world();
    const names = [];
    for (let i = 0; i < 3; i++) {
      names.push(w.bucket.put(c.uploadPathFor(TEAM,
          `00000000-0000-4000-8000-00000000000${i}`), MP4).name);
    }
    w.bucket.listFault = async (q, items) => items.map((it) =>
      it.name === names[1] ? {...it, size: "3.5"} : it);
    w.advance(16 * MIN);
    let out = await w.rc.reconcileQuarantine({limit: 2});
    assert.equal(out.processed, 2);
    assert.equal((await w.state()).afterName, names[1]);
    out = await w.rc.reconcileQuarantine({limit: 2});
    assert.equal(out.passEnded, true);
    const ev = (await adminDb.collection(r.EVIDENCE_COLLECTION).get()).docs;
    assert.equal(ev.length, 1);
    assert.equal(ev[0].data().code, "listing-malformed:size");
    assert.equal(ev[0].id, r.evidenceIdFor(PROJECT, BKT, r.POLICY_REVISION,
        names[1], ev[0].data().generation));
  });
  it("L10: concurrent reconcilers on real transactions: both end " +
      "bounded (no throw); at most one processes; never two deletes; a " +
      "leftover lease only when a result explains it; a later run " +
      "completes with exactly one delete", async () => {
    const w = world();
    const e = w.bucket.put(c.uploadPathFor(TEAM, crypto.randomUUID()), MP4);
    w.advance(16 * MIN);
    const res = await Promise.all([w.rc.reconcileQuarantine({limit: 5}),
      w.rc.reconcileQuarantine({limit: 5})]);
    // each result is EXACTLY one of: lost the acquire (skip-contention),
    // a bounded acquire failure (emulator lock contention may surface as a
    // deadline), or an acquired run summary (PR87 R-2)
    for (const x of res) {
      const kinds = [x.skipContention === true, typeof x.acquireError ===
        "string", typeof x.lists === "number"].filter(Boolean).length;
      assert.equal(kinds, 1, JSON.stringify(x));
    }
    assert.ok(res.filter((x) => x.processed > 0).length <= 1,
        JSON.stringify(res));
    assert.ok(w.bucket.deletes() <= 1, `two deletes ${JSON.stringify(res)}`);
    // A lease may survive ONLY an ambiguous acquire, a failed state
    // transaction or a reported release failure (release-if-mine is best
    // effort); then it is resolved by its expiry (injected clock). Any
    // other leftover lease is a leak and fails here (R-2 c-6312585072).
    const explained = res.some((x) => x.acquireError || x.releaseError ||
      String(x.stoppedFor || "").startsWith("state:"));
    // no state document at all: both acquires failed before any commit
    const st = await w.state();
    const lease = st ? st.lease : null;
    if (!explained) {
      assert.equal(lease, null, `unexplained lease ${JSON.stringify(res)}`);
    } else if (lease) {
      w.advance(w.rc.limits.leaseMs + 1);
    }
    const last = await w.rc.reconcileQuarantine({limit: 5});
    const info = JSON.stringify({res, last});
    assert.equal((await w.state()).lease, null, info);
    assert.equal(w.bucket.deletes(), 1, info);
    assert.equal((await w.record(e)).state, "deleted");
    const recs = await adminDb.collection("filmCleanup").get();
    assert.equal(recs.size, 1);
  });
});

describe("L11 operator CLI on the emulator", () => {
  const script = path.join(__dirname, "..", "..", "scripts",
      "film-cleanup-admin.js");
  const cli = (args) => spawnSync(process.execPath, [script, ...args],
      {encoding: "utf8", env: {...process.env, GCLOUD_PROJECT: PROJECT}});
  it("list-parked, refused unpark while still invalid, then unpark " +
      "under the right bucket; audit written", async () => {
    const name = c.uploadPathFor(TEAM, crypto.randomUUID());
    const id = cl.cleanupIdFor(BKT, name, "1001");
    const rec = {bucket: BKT, name, generation: "1001", teamId: TEAM,
      filmId: name.split("/")[2], origin: "abandon", createdAtMs: 1,
      state: "pending", attempts: 0, fence: 0, lease: null, history: [],
      nextAttemptAtMs: 1, sweepDueAtMs: null, resolvedAtMs: null,
      evidence: null, parked: {problem: "bucket-mismatch",
        sweepDueAtMs: 1, atMs: 7}};
    await adminDb.doc(`filmCleanup/${id}`).set(rec);
    let res = cli(["list-parked"]);
    assert.equal(res.status, 0, res.stderr);
    assert.deepEqual(JSON.parse(res.stdout).map((x) => x.id), [id]);
    res = cli(["unpark", "--id", id, "--expect-parked-at", "7",
      "--reason", "restored", "--bucket", "other.appspot.com"]);
    assert.equal(res.status, 1);
    assert.deepEqual(JSON.parse(res.stdout),
        {refused: "still-invalid:bucket-mismatch"});
    res = cli(["unpark", "--id", id, "--expect-parked-at", "7",
      "--reason", "restored", "--bucket", BKT]);
    assert.equal(res.status, 0, res.stderr);
    const after = (await adminDb.doc(`filmCleanup/${id}`).get()).data();
    assert.equal(after.parked, undefined);
    assert.equal(typeof after.sweepDueAtMs, "number");
    assert.equal(cl.recordProblem(id, after, BKT), null);
    const ev = (await adminDb.doc(`filmCleanupAudit/${id}/events/1`).get())
        .data();
    assert.deepEqual(ev.parked, rec.parked);
  });
});
