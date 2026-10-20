"use strict";
// FILM-S1-C1 on the LOCAL Firestore emulator (demo-* project only): real
// transactions and real query semantics for the bounded sweep (T11b: a
// numeric range never matches null, so terminal records cannot crowd due
// pending records out of the limit), T7-0 reachability, and T1/T2 through
// the S1 handlers. Objects use a bucket double with real generation
// semantics (the Storage emulator ignores generations and preconditions).
// The emulator does NOT enforce indexes: the "automatic single-field index
// serves sweepDueAtMs" claim is static and is re-verified at C1-D1.
// Run: firebase emulators:exec --project demo-coach-core-beta --only
//   firestore "node --test test/emulator/film-s1-cleanup.emulator.test.js"
const {describe, it, beforeEach} = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const PROJECT = process.env.GCLOUD_PROJECT || "demo-coach-core-beta";
if (!PROJECT.startsWith("demo-") || !process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("C1 emulator tests need a demo-* project + the emulator");
}

const {initializeApp, getApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const c = require("../../src/film/contract");
const cl = require("../../src/film/cleanup");
const {createFilmHandlers} = require("../../src/film/handlers");
const {createStorageAdapter} = require("../../src/film/storage-adapter");
const {FakeBucket} = require("../film-cleanup-doubles");

initializeApp({projectId: PROJECT}, "film-c1");
const db = getFirestore(getApp("film-c1"));
const BKT = `${PROJECT}.appspot.com`;
const OWNER = "uid-owner";
const TEAM = "team-c1-emu";
const T0 = new Date("2026-10-20T20:00:00.000Z");
const NOW = T0.getTime();
const L = cl.CLEANUP_LIMITS;
const logger = {info() {}, warn() {}, error() {}};
const AUTH = {uid: OWNER, token: {email_verified: true,
  firebase: {sign_in_provider: "google.com"}, auth_time: 1760900000}};
const MP4 = Buffer.alloc(32);
MP4.writeUInt32BE(24, 0);
MP4.write("ftypisom", 4, "latin1");
MP4.writeUInt32BE(0x200, 12);
MP4.write("isomiso2", 16, "latin1");

beforeEach(async () => {
  for (const col of ["teams", "filmOperations", "filmCleanup"]) {
    const snap = await db.collection(col).get();
    for (const d of snap.docs) await db.recursiveDelete(d.ref);
  }
  await db.doc(`teams/${TEAM}`).set({ownerId: OWNER, name: "C1"});
});

/** Valid synthetic records (pure builders). */
const target = () => {
  const name = c.uploadPathFor(TEAM, crypto.randomUUID());
  const generation = String(1000 + Math.floor(Math.random() * 1e9));
  return {id: cl.cleanupIdFor(BKT, name, generation), base: {bucket: BKT,
    name, generation, teamId: TEAM, filmId: name.split("/")[2],
    origin: "abandon", createdAtMs: NOW - 3600 * 1000}};
};
const closed = (n, result, at) => ({n, fence: n, admittedAtMs: at,
  result, code: result === "deleted" ? null : "503", endedAtMs: at});
const build = {
  initial: (due) => {
    const t = target();
    return {...t, data: {...t.base, createdAtMs: due, state: "pending",
      attempts: 0, fence: 0, lease: null, history: [], nextAttemptAtMs: due,
      sweepDueAtMs: due, resolvedAtMs: null, evidence: null}};
  },
  terminal: (state) => {
    const t = target();
    const at = NOW - 1000;
    if (state === "stuck") {
      return {...t, data: {...t.base, state, attempts: L.maxAttempts,
        fence: L.maxAttempts, lease: null,
        history: [...Array(L.maxAttempts).keys()].map((i) =>
          closed(i + 1, "error", at)),
        nextAttemptAtMs: null, sweepDueAtMs: null, resolvedAtMs: at,
        evidence: {reason: "max-attempts", code: "503"}}};
    }
    return {...t, data: {...t.base, state, attempts: 1, fence: 1,
      lease: null, history: [closed(1, state, at)], nextAttemptAtMs: null,
      sweepDueAtMs: null, resolvedAtMs: at, evidence: null}};
  },
  leased: (untilMs, nextMs) => {
    const t = target();
    return {...t, data: {...t.base, state: "pending", attempts: 1, fence: 1,
      lease: {holder: "h", fence: 1, untilMs},
      history: [{n: 1, fence: 1, admittedAtMs: untilMs - 15000,
        result: null, code: null, endedAtMs: null}],
      nextAttemptAtMs: nextMs, sweepDueAtMs: Math.max(untilMs, nextMs),
      resolvedAtMs: null, evidence: null}};
  },
  future: (nextMs) => {
    const t = target();
    return {...t, data: {...t.base, state: "pending", attempts: 1, fence: 1,
      lease: null, history: [closed(1, "error", NOW - 1000)],
      nextAttemptAtMs: nextMs, sweepDueAtMs: nextMs, resolvedAtMs: null,
      evidence: null}};
  },
};
const seed = async (recs) => {
  for (const r of recs) {
    assert.equal(cl.recordProblem(r.id, r.data, BKT), null,
        JSON.stringify(r.data));
    await db.collection(cl.CLEANUP_COLLECTION).doc(r.id).set(r.data);
  }
};
const sweepQuery = (limit, now = NOW) => db.collection("filmCleanup")
    .where("sweepDueAtMs", "<=", now).orderBy("sweepDueAtMs").limit(limit)
    .get();

describe("T11b batch reachability (Firestore emulator semantics)", () => {
  it("more than SWEEP_BATCH_MAX terminal null-due records, plus future " +
      "and live-leased records, never appear or use up the limit; only due " +
      "pending records return, in due order", async () => {
    const terminal = [];
    for (let i = 0; i <= L.sweepBatchMax + 5; i++) {
      terminal.push(build.terminal(["deleted", "absent", "mismatch",
        "stuck"][i % 4]));
    }
    const due = [
      build.initial(NOW - 5000), // never admitted (T7-0 shape)
      build.initial(NOW), // due exactly now
      build.leased(NOW - 2000, NOW - 4000), // expired lease, due
      build.future(NOW - 3000), // error closed, due
    ];
    const notDue = [build.future(NOW + 60000),
      build.leased(NOW + 15000, NOW + 60000), // live lease
      build.initial(NOW + 1)];
    await seed([...terminal, ...notDue, ...due]);
    const all = await db.collection("filmCleanup").get();
    assert.equal(all.size, terminal.length + due.length + notDue.length);
    const wantOrder = [...due].sort((a, b) =>
      a.data.sweepDueAtMs - b.data.sweepDueAtMs).map((r) => r.id);
    const q = await sweepQuery(L.sweepBatchMax);
    assert.deepEqual(q.docs.map((d) => d.id), wantOrder);
    const q2 = await sweepQuery(2);
    assert.deepEqual(q2.docs.map((d) => d.id), wantOrder.slice(0, 2));
    // the real sweep selects the same records and nothing else
    const bucket = new FakeBucket(BKT);
    const api = cl.createCleanup({db, bucketName: () => BKT,
      getBucket: () => bucket, now: () => T0, logger});
    const s = await api.retryPendingFilmCleanups({limit: L.sweepBatchMax});
    assert.deepEqual(s.results.map((x) => x.id), wantOrder);
    assert.ok(s.results.every((x) => x.admission === "admitted"));
    for (const r of [...terminal, ...notDue]) {
      assert.deepEqual((await db.doc(`filmCleanup/${r.id}`).get()).data(),
          r.data, "untouched");
    }
  });
});

/** S1 handlers on the emulator, with a crash switch on transactions. */
function handlers() {
  const bucket = new FakeBucket(BKT);
  const adapter = createStorageAdapter(bucket);
  let n = 0;
  let crashAt = null;
  const crashDb = new Proxy(db, {get(t, k) {
    if (k === "runTransaction") {
      return (fn) => {
        n += 1;
        if (n === crashAt) return Promise.reject(new Error("instance lost"));
        return t.runTransaction(fn);
      };
    }
    const v = t[k];
    return typeof v === "function" ? v.bind(t) : v;
  }});
  const clock = {t: T0};
  const h = createFilmHandlers({db: crashDb, Timestamp, logger,
    getUser: async () => ({disabled: false, customClaims: {beta: true}}),
    readHead: (x) => adapter.readHead(x), cleanupBucketName: () => BKT,
    cleanupBucket: () => bucket, now: () => clock.t});
  return {h, bucket, clock, crashNext: (k) => {
    crashAt = n + k;
  }};
}
const reserve = async (x) => {
  const r = await x.h.reserveFilmUpload({auth: AUTH, data: {
    schemaVersion: c.CONTRACT_VERSION, operationId: crypto.randomUUID(),
    action: "reserveFilmUpload", payload: {teamId: TEAM, declaredBytes: 32,
      declaredContentType: "video/mp4", fileName: "clip.mp4",
      rightsAcknowledged: true, rightsWordingVersion: "rights-v1"}}});
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.data.filmId;
};
const abandon = (x, filmId, opId = crypto.randomUUID()) =>
  x.h.abandonFilmUpload({auth: AUTH, data: {
    schemaVersion: c.CONTRACT_VERSION, operationId: opId,
    action: "abandonFilmUpload", payload: {teamId: TEAM, filmId}}});
const record = async (e) => (await db.doc(`filmCleanup/${cl.cleanupIdFor(
    BKT, e.name, e.generation)}`).get()).data();

describe("S1 handlers on real transactions (Firestore emulator)", () => {
  it("T1: abandon of a validating film deletes the exact generation; " +
      "op record has no cleanup state; slot released once", async () => {
    const x = handlers();
    const filmId = await reserve(x);
    const e = x.bucket.put(c.uploadPathFor(TEAM, filmId), MP4);
    assert.equal(await x.h.onQuarantineFinalized(e), "validating");
    const opId = crypto.randomUUID();
    const res = await abandon(x, filmId, opId);
    assert.equal(res.ok, true);
    const r = await record(e);
    assert.deepEqual([r.state, r.attempts, r.origin],
        ["deleted", 1, "abandon"]);
    assert.equal(x.bucket.objects.has(e.name), false);
    const ops = await db.collection("filmOperations").get();
    for (const d of ops.docs) {
      assert.deepEqual(Object.keys(d.data()).sort(), ["action", "createdAt",
        "operationId", "payloadHash", "replayableUntil", "responseJson",
        "uid"]);
    }
    const cap = (await db.doc(`teams/${TEAM}/filmLedger/cap`).get()).data();
    assert.deepEqual(cap.slots, {});
    assert.deepEqual(await abandon(x, filmId, opId), res, "replay verbatim");
  });
  it("T2: outage -> pending with the attempt counted; the sweep recovers " +
      "after the due time", async () => {
    const x = handlers();
    const filmId = await reserve(x);
    const e = x.bucket.put(c.uploadPathFor(TEAM, filmId), MP4);
    await x.h.onQuarantineFinalized(e);
    x.bucket.deleteFault = async () => {
      throw Object.assign(new Error("unavailable"), {code: 503});
    };
    assert.equal((await abandon(x, filmId)).ok, true);
    let r = await record(e);
    assert.deepEqual([r.state, r.attempts, r.history[0].code],
        ["pending", 1, "503"]);
    x.bucket.deleteFault = null;
    x.clock.t = new Date(r.sweepDueAtMs);
    const s = await x.h.retryPendingFilmCleanups({limit: 5});
    assert.equal(s.results[0].result, "deleted");
    r = await record(e);
    assert.deepEqual([r.state, r.attempts], ["deleted", 2]);
  });
  it("T7-0: crash after the obligation commits, before admission -> the " +
      "initialized record is returned by the real sweep query; first " +
      "admission is attempt 1 / fence 1", async () => {
    const x = handlers();
    const e = x.bucket.put(c.uploadPathFor(TEAM, crypto.randomUUID()), MP4);
    x.crashNext(2);
    assert.equal(await x.h.onQuarantineFinalized(e), "no-reservation");
    const r = await record(e);
    assert.deepEqual([r.state, r.attempts, r.fence, r.lease, r.history,
      r.nextAttemptAtMs, r.sweepDueAtMs], ["pending", 0, 0, null, [], NOW,
      NOW]);
    assert.equal(x.bucket.deletes(), 0);
    const q = await sweepQuery(5);
    assert.deepEqual(q.docs.map((d) => d.id),
        [cl.cleanupIdFor(BKT, e.name, e.generation)]);
    assert.equal(await x.h.onQuarantineFinalized(e), "no-reservation");
    assert.deepEqual(await record(e), r, "create-or-read preserves it");
    const s = await x.h.retryPendingFilmCleanups({limit: 5});
    assert.equal(s.results[0].fence, 1);
    assert.equal((await record(e)).state, "deleted");
  });
});
