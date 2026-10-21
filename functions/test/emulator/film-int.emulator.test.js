"use strict";
// FILM-INT-A on the REAL Firestore emulator (demo-* project):
// - CT-4.2: lost finalize -> LFS reconciler (accepted bounded gRPC client)
//   -> validating -> S2b worker (direct invocation, scripted pipeline;
//   the pinned-decoder pipeline runs in the accepted S2b suites) -> ready;
// - D5 `list-s2b-recovery`: classes, Firestore `in` + document-id order,
//   cursor traversal of > M films across two teams, read-only (every seeded
//   document's updateTime unchanged), and the CLI against the emulator.
// Objects use the generation-true double (the Storage emulator ignores
// generations). Run: firebase emulators:exec --project demo-coach-core-beta
//   --only firestore "node --test test/emulator/film-int.emulator.test.js"
const {describe, it, before, after} = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const path = require("path");
const {spawnSync} = require("child_process");

const PROJECT = process.env.GCLOUD_PROJECT || "demo-coach-core-beta";
if (!PROJECT.startsWith("demo-") || !process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("FILM-INT emulator tests need a demo-* project + emulator");
}

const {Firestore} = require("@google-cloud/firestore");
const {initializeApp, getApp} = require("firebase-admin/app");
const {getFirestore, Timestamp, FieldPath} =
  require("firebase-admin/firestore");
const v1 = require("../../src/film/contract");
const r = require("../../src/film/reconcile");
const t = require("../../src/film/lfs-transport");
const {createFilmHandlers} = require("../../src/film/handlers");
const {createFilmWorker, jobIdFor} = require("../../src/film/worker/worker");
const {WORKER_LIMITS} = require("../../src/film/worker/limits");
const admin = require("../../scripts/film-cleanup-admin");
const {FakeObjects, fakeDecoder, scriptedPipeline} =
  require("../film-worker-doubles");

initializeApp({projectId: PROJECT}, "film-int");
const db = getFirestore(getApp("film-int"));
const bounded = t.createBoundedFirestore({Firestore, projectId: PROJECT});
after(() => bounded.terminate());
const BUCKET = "demo-s2b.appspot.com";
const OWNER = "uid-owner";
const T0 = new Date("2026-10-21T16:00:00.000Z");
const MIN = 60 * 1000;
const logger = {info() {}, warn() {}, error() {}};
const auth = {uid: OWNER, token: {email_verified: true,
  firebase: {sign_in_provider: "google.com"}, auth_time: 1760900000}};
const HEAD = Buffer.concat([Buffer.from([0, 0, 0, 16]),
  Buffer.from("ftypisom"), Buffer.from([0, 0, 2, 0])]);
const BODY = Buffer.concat([HEAD, Buffer.alloc(16)]);

const wipe = async () => {
  for (const c of ["teams", "filmCleanup", "filmReconcile",
    "filmOperations"]) {
    for (const d of (await db.collection(c).get()).docs) {
      await db.recursiveDelete(d.ref);
    }
  }
};

describe("CT-4.2 on the emulator: lost finalize -> reconciler -> worker",
    () => {
      before(wipe);
      it("one re-drive to validating, one job, one promotion to ready",
          async () => {
            const team = `team-int-${crypto.randomUUID().slice(0, 8)}`;
            await db.doc(`teams/${team}`).set({ownerId: OWNER, name: "I"});
            const objects = new FakeObjects();
            const created = new Map();
            const clock = {t: T0};
            const now = () => clock.t;
            const s1 = createFilmHandlers({db, Timestamp,
              getUser: async () => ({uid: OWNER, disabled: false,
                customClaims: {beta: true}}), ...objects.s1(), logger, now});
            const res = await s1.reserveFilmUpload({auth, data: {
              schemaVersion: v1.CONTRACT_VERSION,
              operationId: crypto.randomUUID(), action: "reserveFilmUpload",
              payload: {teamId: team, declaredBytes: BODY.length,
                declaredContentType: "video/mp4", fileName: "clip.mp4",
                rightsAcknowledged: true, rightsWordingVersion: "rights-v1"}}});
            assert.equal(res.ok, true, JSON.stringify(res));
            const filmId = res.data.filmId;
            const name = v1.uploadPathFor(team, filmId);
            const generation = objects.put(name, BODY); // finalize lost
            created.set(name, clock.t.toISOString());
            clock.t = new Date(T0.getTime() + 16 * MIN);
            const storage = {name: BUCKET,
              async listObjects(q) {
                const names = [...objects.objects.keys()]
                    .filter((n) => n.startsWith(q.prefix) &&
                      (!q.startOffset || n >= q.startOffset)).sort();
                return {items: names.slice(0, q.maxResults).map((n) => ({
                  name: n, generation: objects.objects.get(n).generation,
                  size: String(objects.objects.get(n).bytes.length),
                  contentType: "video/mp4", timeCreated: created.get(n)})),
                nextPageToken: null};
              },
              file: (n, fo = {}) => ({
                download: async ({start, end}) => {
                  const o = objects.objects.get(n);
                  if (!o || (fo.generation &&
                      o.generation !== String(fo.generation))) {
                    throw Object.assign(new Error("404"), {code: 404});
                  }
                  return [o.bytes.subarray(start, end + 1)];
                },
                delete: async () => {
                  throw new Error("no delete expected");
                },
              }),
            };
            const rc = r.createQuarantineReconciler({db: bounded, Timestamp,
              storage, bucketName: () => BUCKET, project: PROJECT, logger,
              now, limits: r.deriveLimits(undefined, {objectBudgetMs: 1000})});
            const out = await rc.reconcileQuarantine({limit: 10});
            assert.deepEqual(out.outcomes, {validating: 1},
                JSON.stringify(out));
            const fp = `teams/${team}/films/${filmId}`;
            assert.equal((await db.doc(fp).get()).data().objectGeneration,
                generation);
            const worker = createFilmWorker({db, Timestamp, objects,
              decoder: fakeDecoder(), runPipeline: scriptedPipeline([]),
              isEnabled: () => true, now, logger, limits: WORKER_LIMITS});
            const done = await worker.processFilm({teamId: team, filmId});
            assert.equal(done.outcome, "ready", JSON.stringify(done));
            assert.equal((await db.doc(fp).get()).data().status, "ready");
            const jobs = (await db.collection(`${fp}/workerJobs`).get()).docs
                .map((d) => d.id);
            assert.deepEqual(jobs, [jobIdFor(team, filmId, generation)]);
            assert.equal([...objects.objects.keys()].filter((n) =>
              n.startsWith("films/")).length, 1);
          });
    });

describe("D5 list-s2b-recovery on the emulator (read-only, bounded)", () => {
  const GEN = "1001";
  const seeded = [];
  const put = async (team, film, data, job) => {
    await db.doc(`teams/${team}`).set({ownerId: OWNER});
    const fp = `teams/${team}/films/${film}`;
    await db.doc(fp).set({objectGeneration: GEN, ...data});
    seeded.push(fp);
    if (job) {
      const jp = `${fp}/workerJobs/${jobIdFor(team, film, GEN)}`;
      await db.doc(jp).set(job);
      seeded.push(jp);
    }
  };
  const q = (result, generation = GEN) => ({cleanup: {quarantine: {
    object: "x", generation, fence: 1, result}, output: null}});
  const times = async () => Promise.all(seeded.map(async (p) =>
    [p, (await db.doc(p).get()).updateTime.toMillis()]));
  before(async () => {
    await wipe();
    await put("t1", "f-a", {status: "validating"},
        {recovery: {reason: "attempts-exhausted"},
          exhaustion: {outcome: "recovery-needed"}});
    // PR88 F-1: any active recovery mark, not only exhaustion
    await put("t1", "f-a2", {status: "validating"},
        {recovery: {reason: "output-ownership-unproven"}, exhaustion: null});
    await put("t1", "n-resolved", {status: "validating"}, {recovery: null,
      resolvedRecovery: {reason: "team-ownership-changed", resolvedAtMs: 2}});
    await put("t1", "f-b", {status: "ready"}, q("mismatch"));
    await put("t1", "f-c", {status: "rejected",
      rejectionReason: "container-invalid"}, q("pending"));
    await put("t1", "f-d", {status: "ready"}, {cleanup: {quarantine: null,
      output: null}});
    await put("t1", "n-del", {status: "ready"}, q("deleted"));
    await put("t1", "n-gen", {status: "ready"}, q("pending", "999"));
    await put("t1", "n-s1", {status: "rejected",
      rejectionReason: "signature-invalid"}, null);
    await put("t1", "n-res", {status: "reserved", objectGeneration: null},
        null);
    for (const team of ["t2", "t3"]) {
      for (let i = 0; i < 4; i++) {
        await put(team, `g${i}`, {status: "ready"}, q("pending"));
      }
    }
  });
  it("classes a-d on real Firestore queries; negatives excluded; " +
      "cursor traversal (> M films, 3 teams) without gaps or duplicates; " +
      "no document written", async () => {
    const before = await times();
    const seen = [];
    let after = null;
    let runs = 0;
    do {
      const out = await admin.listS2bRecovery(db, {teams: 2, films: 3,
        after, documentId: FieldPath.documentId()});
      assert.ok(out.reads <= out.maxReads, JSON.stringify(out));
      for (const i of out.items) {
        seen.push(`${i.team}/${i.film}:${i.class}`);
      }
      after = out.next;
      runs += 1;
    } while (after && runs < 30);
    assert.equal(after, null);
    const expected = ["t1/f-a:a", "t1/f-a2:a", "t1/f-b:b", "t1/f-c:c",
      "t1/f-d:d"];
    for (const team of ["t2", "t3"]) {
      for (let i = 0; i < 4; i++) expected.push(`${team}/g${i}:c`);
    }
    assert.deepEqual(seen, expected);
    assert.deepEqual(await times(), before, "read-only: no updateTime moved");
  });
  it("CLI against the emulator: bounded JSON output", () => {
    const script = path.join(__dirname, "..", "..", "scripts",
        "film-cleanup-admin.js");
    const res = spawnSync(process.execPath, [script, "list-s2b-recovery",
      "--teams", "1", "--films", "2"], {encoding: "utf8",
      env: {...process.env, GCLOUD_PROJECT: PROJECT}});
    assert.equal(res.status, 0, res.stderr);
    const out = JSON.parse(res.stdout);
    assert.deepEqual(out.items.map((i) => [i.film, i.recoveryReason]),
        [["f-a", "attempts-exhausted"], ["f-a2", "output-ownership-unproven"]]);
    assert.deepEqual(out.next, {team: "t1", film: "f-a2"});
    assert.equal(out.truncated.films, true);
    assert.equal(out.maxReads, (1 + 1) + (2 + 1) + 2);
  });
});
