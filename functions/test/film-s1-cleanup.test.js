"use strict";
// FILM-S1-C1 focused tests (proposal r3 #39 c-6299776477 §4, with Codex's
// T7-0 clarification c-6299971919). The UNCHANGED-contract S1 handlers run
// against an in-memory Firestore with real optimistic transactions and a
// bucket double with real Cloud Storage generation semantics (the Storage
// emulator ignores generations). Firestore-emulator query semantics (T11b)
// and rules (T12) are proven separately in test/emulator/ and tests/rules/.
// Synthetic objects only; no network, no project.
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {spawnSync} = require("child_process");
const c = require("../src/film/contract");
const {LIMITS} = require("../src/film/limits");
const {createFilmHandlers, QUARANTINE_RE: HANDLER_RE} =
  require("../src/film/handlers");
const {createStorageAdapter} = require("../src/film/storage-adapter");
const cl = require("../src/film/cleanup");
const {FakeTimestamp, FakeFirestore, FakeBucket} =
  require("./film-cleanup-doubles");

const BKT = "demo-coach-core-beta.appspot.com";
const OWNER = "uid-owner";
const TEAM = "team-c1-a";
const T0 = new Date("2026-10-20T20:00:00.000Z");
const L = cl.CLEANUP_LIMITS;
const AUTH = {uid: OWNER, token: {email_verified: true,
  firebase: {sign_in_provider: "google.com"}, auth_time: 1760900000}};

const MP4 = Buffer.alloc(32);
MP4.writeUInt32BE(24, 0);
MP4.write("ftypisom", 4, "latin1");
MP4.writeUInt32BE(0x200, 12);
MP4.write("isomiso2", 16, "latin1");
const NOT_MP4 = Buffer.from("this is plain text, not a video!", "latin1");

const outage = (code = 503) => async () => {
  throw Object.assign(new Error("service unavailable"), {code});
};

/** A fresh world: handlers + direct cleanup API over the same doubles. */
function world(over = {}) {
  const db = new FakeFirestore();
  const bucket = new FakeBucket(BKT);
  const clock = {t: T0};
  const mono = {t: 0};
  const logs = [];
  const rec = (level) => (msg, data) => logs.push({level, msg, data});
  const logger = {info: rec("info"), warn: rec("warn"), error: rec("error")};
  let hn = 0;
  let fn = 0;
  const adapter = createStorageAdapter(bucket);
  db.write(`teams/${TEAM}`, {ownerId: OWNER, name: "A"});
  const deps = {db, Timestamp: FakeTimestamp,
    getUser: async () => ({disabled: false, customClaims: {beta: true}}),
    readHead: (t) => adapter.readHead(t),
    cleanupBucketName: () => BKT, cleanupBucket: () => bucket,
    logger, now: () => clock.t, monotonicMs: () => mono.t,
    newCleanupHolder: () => `holder-${++hn}`,
    newFilmId: () => `00000000-0000-4000-8000-${String(++fn).padStart(12,
        "0")}`,
    ...over};
  const h = createFilmHandlers(deps);
  const api = cl.createCleanup({db, bucketName: deps.cleanupBucketName,
    getBucket: () => deps.cleanupBucket(), now: deps.now, logger,
    monotonicMs: deps.monotonicMs, newHolder: () => `direct-${++hn}`,
    limits: deps.cleanupLimits});
  const w = {db, bucket, clock, mono, logs, h, api, deps};
  w.advance = (ms) => {
    w.clock.t = new Date(w.clock.t.getTime() + ms);
  };
  w.reserve = async () => {
    const r = await h.reserveFilmUpload({auth: AUTH, data: {
      schemaVersion: c.CONTRACT_VERSION, operationId: crypto.randomUUID(),
      action: "reserveFilmUpload", payload: {teamId: TEAM,
        declaredBytes: 32, declaredContentType: "video/mp4",
        fileName: "clip.mp4", rightsAcknowledged: true,
        rightsWordingVersion: "rights-v1"}}});
    assert.equal(r.ok, true, JSON.stringify(r));
    return r.data.filmId;
  };
  w.path = (filmId) => c.uploadPathFor(TEAM, filmId);
  w.abandonReq = (filmId, opId = crypto.randomUUID()) => ({auth: AUTH,
    data: {schemaVersion: c.CONTRACT_VERSION, operationId: opId,
      action: "abandonFilmUpload", payload: {teamId: TEAM, filmId}}});
  w.abandon = (filmId, opId) => h.abandonFilmUpload(w.abandonReq(filmId,
      opId));
  w.validating = async () => {
    const filmId = await w.reserve();
    const e = bucket.put(w.path(filmId), MP4);
    assert.equal(await h.onQuarantineFinalized(e), "validating");
    return {filmId, e};
  };
  w.id = (e) => cl.cleanupIdFor(BKT, e.name, String(e.generation));
  w.record = (e) => db.read(`filmCleanup/${w.id(e)}`);
  w.records = () => db.paths("filmCleanup/").map((p) => db.read(p));
  w.op = (opId) => db.read(`filmOperations/${crypto.createHash("sha256")
      .update(`${OWNER}\n${opId}`).digest("hex")}`);
  w.film = (filmId) => db.read(`teams/${TEAM}/films/${filmId}`);
  w.slots = () => (db.read(`teams/${TEAM}/filmLedger/cap`) || {}).slots || {};
  /** Crash (instance loss) at the Nth transaction from now. */
  w.crashAtTx = (k) => {
    const at = db.txCount + k;
    db.beforeTransaction = (n) => {
      if (n === at) {
        db.beforeTransaction = null;
        throw new Error("instance lost");
      }
    };
  };
  return w;
}

const initial = (createdAtMs) => ({state: "pending", attempts: 0, fence: 0,
  lease: null, history: [], nextAttemptAtMs: createdAtMs,
  sweepDueAtMs: createdAtMs, resolvedAtMs: null, evidence: null});
const pick = (r, keys) => Object.fromEntries(keys.map((k) => [k, r[k]]));
const ATTEMPT_KEYS = Object.keys(initial(0));

describe("T1 abandon, delete succeeds", () => {
  it("record deleted after one attempt; receipt, payloadHash, " +
      "replayableUntil and op record carry no cleanup state; slot released " +
      "once", async () => {
    const w = world();
    const {filmId, e} = await w.validating();
    const opId = crypto.randomUUID();
    const res = await w.abandon(filmId, opId);
    assert.equal(res.ok, true);
    assert.deepEqual(Object.keys(w.op(opId)).sort(), ["action", "createdAt",
      "operationId", "payloadHash", "replayableUntil", "responseJson",
      "uid"]);
    assert.deepEqual(JSON.parse(w.op(opId).responseJson), res);
    assert.equal(w.op(opId).replayableUntil.toMillis(),
        T0.getTime() + LIMITS.operationReplayWindowMs);
    const r = w.record(e);
    assert.equal(r.state, "deleted");
    assert.equal(r.attempts, 1);
    assert.equal(r.origin, "abandon");
    assert.equal(r.sweepDueAtMs, null);
    assert.equal(w.bucket.objects.has(e.name), false);
    assert.deepEqual(w.slots(), {});
    // the film document gets no cleanup fields
    assert.ok(!Object.keys(w.film(filmId)).some((k) => /clean/i.test(k)));
    // baseline: identical receipt bytes in a world whose delete fails
    const w2 = world({cleanupLimits: undefined});
    const v2 = await w2.validating();
    w2.bucket.deleteFault = outage();
    const res2 = await w2.abandon(v2.filmId, opId);
    assert.equal(JSON.stringify(res2), JSON.stringify(res));
    assert.deepEqual(w2.op(opId), w.op(opId));
  });
});

describe("T2 abandon during a storage outage", () => {
  it("attempt counted before I/O; pending; response and error class " +
      "unchanged; due time honoured; later sweep deletes", async () => {
    const w = world();
    const {filmId, e} = await w.validating();
    let seen = null;
    w.bucket.deleteFault = async () => {
      seen = w.record(e);
      throw Object.assign(new Error("unavailable"), {code: 503});
    };
    const res = await w.abandon(filmId);
    assert.equal(res.ok, true);
    assert.equal(res.data.previousStatus, "validating");
    assert.equal(seen.attempts, 1, "counted before the delete request");
    assert.equal(seen.lease.fence, 1);
    const r = w.record(e);
    assert.deepEqual(pick(r, ["state", "attempts", "fence", "lease"]),
        {state: "pending", attempts: 1, fence: 1, lease: null});
    assert.deepEqual(r.history[0].result, "error");
    assert.equal(r.history[0].code, "503");
    assert.equal(r.nextAttemptAtMs, T0.getTime() + L.backoffBaseMs);
    assert.equal(r.sweepDueAtMs, r.nextAttemptAtMs);
    assert.equal(w.bucket.objects.has(e.name), true);
    // not due: the sweep finds nothing and sends nothing
    w.bucket.deleteFault = null;
    let s = await w.h.retryPendingFilmCleanups({limit: 5});
    assert.equal(s.queried, 0);
    assert.equal(w.bucket.deletes(), 1);
    w.advance(L.backoffBaseMs);
    s = await w.h.retryPendingFilmCleanups({limit: 5});
    assert.equal(s.results[0].result, "deleted");
    assert.equal(w.record(e).state, "deleted");
    assert.equal(w.record(e).attempts, 2);
    assert.equal(w.bucket.objects.has(e.name), false);
  });
  it("a timed-out delete is a recorded error; the response is unchanged",
      async () => {
        const lim = {...L, attemptBudgetMs: 40, leaseMarginMs: 10};
        const w = world({cleanupLimits: lim});
        const {filmId, e} = await w.validating();
        w.bucket.deleteFault = () => new Promise(() => {});
        const res = await w.abandon(filmId);
        assert.equal(res.ok, true);
        const r = w.record(e);
        assert.equal(r.history[0].code, "attempt-timeout");
        assert.equal(r.state, "pending");
        assert.equal(r.lease, null);
      });
});

describe("T3 404 / T4 412", () => {
  it("T3 404 -> absent, terminal; later admissions are no-ops", async () => {
    const w = world();
    const {filmId, e} = await w.validating();
    w.bucket.objects.delete(e.name);
    await w.abandon(filmId);
    const r = w.record(e);
    assert.equal(r.state, "absent");
    assert.equal(r.history[0].code, "404");
    w.advance(7 * 3600 * 1000);
    assert.deepEqual(await w.api.admitAttempt(w.id(e), "x"),
        {outcome: "no-op", state: "absent"});
    assert.equal((await w.h.retryPendingFilmCleanups({limit: 5})).queried, 0);
    assert.equal(w.bucket.deletes(), 1);
    assert.deepEqual(w.record(e), r);
  });
  it("T4 412 -> mismatch with code; every object preserved byte-identical; " +
      "only generation-matched deletes; no claim about a newer generation",
  async () => {
    const w = world();
    const {filmId, e} = await w.validating();
    const newer = w.bucket.put(e.name, Buffer.from(MP4).fill(7, 24));
    const before = Buffer.from(w.bucket.objects.get(e.name).bytes);
    await w.abandon(filmId);
    const r = w.record(e);
    assert.equal(r.state, "mismatch");
    assert.equal(r.history[0].code, "412");
    assert.equal(r.evidence, null);
    assert.equal(w.bucket.objects.get(e.name).generation, newer.generation);
    assert.ok(w.bucket.objects.get(e.name).bytes.equals(before));
    for (const call of w.bucket.calls.filter((x) => x[0] === "delete")) {
      assert.deepEqual(call[2], {ifGenerationMatch: e.generation});
    }
    w.advance(7 * 3600 * 1000);
    await w.h.retryPendingFilmCleanups({limit: 5});
    assert.equal(w.bucket.deletes(), 1, "never retried as a delete");
    assert.deepEqual(Object.keys(r).sort(), Object.keys(
        cl.recordSchema.shape).sort(), "no extra (cause) fields");
  });
});

describe("T5 outage across all MAX admissions", () => {
  it("stuck after the eighth; no ninth delete; record and object kept; " +
      "sweepDueAtMs null", async () => {
    const w = world();
    const {filmId, e} = await w.validating();
    w.bucket.deleteFault = outage();
    await w.abandon(filmId);
    for (let i = 2; i <= L.maxAttempts; i++) {
      w.clock.t = new Date(w.record(e).nextAttemptAtMs);
      const s = await w.h.retryPendingFilmCleanups({limit: 5});
      assert.equal(s.results.length, 1);
    }
    let r = w.record(e);
    assert.equal(r.attempts, L.maxAttempts);
    assert.equal(r.state, "stuck");
    assert.equal(r.sweepDueAtMs, null);
    assert.deepEqual(r.evidence, {reason: "max-attempts", code: "503"});
    assert.equal(w.bucket.deletes(), L.maxAttempts);
    w.advance(365 * 24 * 3600 * 1000);
    assert.equal((await w.h.retryPendingFilmCleanups({limit: 5})).queried, 0);
    assert.deepEqual(await w.api.admitAttempt(w.id(e), "y"),
        {outcome: "no-op", state: "stuck"});
    await w.abandon(filmId); // a new (non-replay) abandon: stable, no-op
    r = w.record(e);
    assert.equal(w.bucket.deletes(), L.maxAttempts, "no ninth delete");
    assert.equal(w.bucket.objects.has(e.name), true);
    // backoff grew and was capped
    const gaps = r.history.slice(1).map((h, i) =>
      h.admittedAtMs - r.history[i].admittedAtMs);
    assert.deepEqual(gaps, [1, 2, 3, 4, 5, 6, 7].map((n) =>
      cl.backoffMs(n)));
  });
});

describe("T6 abandon replay", () => {
  it("not due / leased / cap / terminal -> zero attempts; eligible -> " +
      "exactly one; response, op record and deadline byte-unchanged; only " +
      "the exact record touched; no second slot release", async () => {
    const w = world();
    const a = await w.validating();
    const b = await w.validating();
    w.bucket.deleteFault = outage();
    await w.abandon(b.filmId); // another film's pending record
    const opId = crypto.randomUUID();
    const first = await w.abandon(a.filmId, opId);
    const opBefore = w.op(opId);
    const ledgerBefore = w.db.read(`teams/${TEAM}/filmLedger/cap`);
    const other = w.record(b.e);
    const replay = async () => {
      const r = await w.abandon(a.filmId, opId);
      assert.equal(JSON.stringify(r), JSON.stringify(first));
      assert.deepEqual(w.op(opId), opBefore);
      assert.deepEqual(w.db.read(`teams/${TEAM}/filmLedger/cap`),
          ledgerBefore);
      assert.deepEqual(w.record(b.e), other, "other film untouched");
    };
    w.bucket.deleteFault = null;
    let n = w.bucket.deletes();
    // not due
    await replay();
    assert.equal(w.bucket.deletes(), n);
    // leased by someone else
    w.clock.t = new Date(w.record(a.e).nextAttemptAtMs);
    const held = await w.api.admitAttempt(w.id(a.e), "other-holder");
    assert.equal(held.outcome, "admitted");
    const leased = w.record(a.e);
    await replay();
    assert.equal(w.bucket.deletes(), n);
    assert.deepEqual(w.record(a.e), leased);
    // the holder's error result releases the lease; eligible after backoff
    await w.api.recordResult(w.id(a.e), "other-holder", held.fence,
        {result: "error", code: "503"});
    w.clock.t = new Date(w.record(a.e).nextAttemptAtMs);
    await replay();
    assert.equal(w.bucket.deletes(), n + 1, "exactly one attempt");
    assert.equal(w.record(a.e).state, "deleted");
    n = w.bucket.deletes();
    // terminal
    await replay();
    assert.equal(w.bucket.deletes(), n);
    // cap: the other film's record driven to stuck, then replayed
    w.bucket.deleteFault = outage();
    const bOp = crypto.randomUUID();
    await w.abandon(b.filmId, bOp);
    while (w.record(b.e).state === "pending") {
      w.clock.t = new Date(w.record(b.e).nextAttemptAtMs);
      await w.api.attemptOnce(w.id(b.e));
    }
    assert.equal(w.record(b.e).state, "stuck");
    n = w.bucket.deletes();
    await w.abandon(b.filmId, bOp);
    assert.equal(w.bucket.deletes(), n);
  });
});

describe("T7 crash points", () => {
  const origins = {
    "abandon": async (w) => {
      const v = await w.validating();
      w.crashAtTx(2); // abandon tx commits; the admission is lost
      const r = await w.abandon(v.filmId);
      assert.equal(r.ok, true);
      return {e: v.e, filmId: v.filmId};
    },
    "finalize-no-reservation": async (w) => {
      const e = w.bucket.put(w.path(crypto.randomUUID()), MP4);
      w.crashAtTx(2);
      assert.equal(await w.h.onQuarantineFinalized(e), "no-reservation");
      return {e};
    },
    "finalize-expired": async (w) => {
      const filmId = await w.reserve();
      w.advance(LIMITS.reservationLifetimeMs);
      const e = w.bucket.put(w.path(filmId), MP4);
      w.crashAtTx(2);
      assert.equal(await w.h.onQuarantineFinalized(e), "expired");
      return {e};
    },
    "finalize-rejected-signature-invalid": async (w) => {
      const filmId = await w.reserve();
      const e = w.bucket.put(w.path(filmId), NOT_MP4);
      w.crashAtTx(2);
      assert.equal(await w.h.onQuarantineFinalized(e),
          "rejected-signature-invalid");
      return {e};
    },
    "finalize-stale-abandoned": async (w) => {
      const filmId = await w.reserve();
      await w.abandon(filmId);
      const e = w.bucket.put(w.path(filmId), MP4);
      w.crashAtTx(2);
      assert.equal(await w.h.onQuarantineFinalized(e), "stale-abandoned");
      return {e};
    },
  };
  for (const [origin, run] of Object.entries(origins)) {
    it(`T7-0 ${origin}: crash after obligation commit, before the first ` +
        "admission -> initialized, sweepable; create-or-read preserves " +
        "it; first admission is attempt 1 / fence 1", async () => {
      const w = world();
      const {e} = await run(w);
      const r = w.record(e);
      assert.equal(r.origin, origin);
      assert.deepEqual(pick(r, ATTEMPT_KEYS), initial(w.clock.t.getTime()));
      assert.equal(w.bucket.deletes(), 0);
      if (origin !== "abandon") {
        // a duplicate finalize (create-or-read) preserves the initial fields
        assert.ok((await w.h.onQuarantineFinalized(e)).length > 0);
        assert.deepEqual(w.record(e), r);
        assert.equal(w.bucket.deletes(), 0);
      }
      const q = await w.db.collection("filmCleanup")
          .where("sweepDueAtMs", "<=", w.clock.t.getTime())
          .orderBy("sweepDueAtMs").limit(5).get();
      assert.deepEqual(q.docs.map((d) => d.id), [w.id(e)]);
      const s = await w.h.retryPendingFilmCleanups({limit: 5});
      assert.equal(s.results[0].fence, 1);
      assert.equal(w.record(e).attempts, 1);
      assert.equal(w.record(e).state, "deleted");
    });
  }
  it("T7-0 abandon replay after the crash: an eligible replay admits " +
      "attempt 1 / fence 1 through the shared admission; a non-eligible " +
      "replay admits nothing", async () => {
    for (const eligible of [true, false]) {
      const w = world();
      const v = await w.validating();
      const opId = crypto.randomUUID();
      w.crashAtTx(2);
      const res = await w.abandon(v.filmId, opId);
      assert.deepEqual(pick(w.record(v.e), ATTEMPT_KEYS),
          initial(T0.getTime()));
      if (!eligible) {
        const held = await w.api.admitAttempt(w.id(v.e), "sweeper");
        assert.equal(held.fence, 1);
      }
      const before = w.record(v.e);
      const again = await w.abandon(v.filmId, opId);
      assert.equal(JSON.stringify(again), JSON.stringify(res));
      if (eligible) {
        assert.equal(w.record(v.e).history[0].fence, 1);
        assert.equal(w.record(v.e).state, "deleted");
        assert.equal(w.bucket.deletes(), 1);
      } else {
        assert.deepEqual(w.record(v.e), before);
        assert.equal(w.bucket.deletes(), 0);
      }
    }
  });
  it("T7a crash after admission, before I/O: attempt consumed; at lease " +
      "expiry the entry closes 'unknown'; sweepable at the admission-fixed " +
      "time", async () => {
    const w = world();
    const e = w.bucket.put(w.path(crypto.randomUUID()), MP4);
    w.crashAtTx(2);
    await w.h.onQuarantineFinalized(e);
    const a = await w.api.admitAttempt(w.id(e), "lost-holder"); // then crash
    const r = w.record(e);
    assert.equal(a.fence, 1);
    assert.equal(r.attempts, 1);
    assert.equal(r.sweepDueAtMs, Math.max(r.lease.untilMs,
        r.nextAttemptAtMs));
    assert.equal(r.sweepDueAtMs, T0.getTime() + L.backoffBaseMs);
    w.clock.t = new Date(r.lease.untilMs + 1); // expired, not yet due
    assert.equal((await w.h.retryPendingFilmCleanups({limit: 5})).queried, 0);
    assert.deepEqual(await w.api.admitAttempt(w.id(e), "peek"),
        {outcome: "not-due", closed: true});
    let x = w.record(e);
    assert.deepEqual(pick(x.history[0], ["result", "code"]),
        {result: "unknown", code: "lease-expired"});
    assert.equal(x.attempts, 1, "never decremented");
    assert.equal(x.lease, null);
    assert.equal(x.sweepDueAtMs, r.sweepDueAtMs);
    w.clock.t = new Date(r.sweepDueAtMs);
    const s = await w.h.retryPendingFilmCleanups({limit: 5});
    assert.equal(s.results[0].fence, 2);
    x = w.record(e);
    assert.equal(x.state, "deleted");
    assert.equal(w.bucket.deletes(), 1);
    assert.equal((await w.api.recordResult(w.id(e), "lost-holder", 1,
        {result: "deleted", code: null})).outcome, "stale-ignored");
  });
  it("T7b crash after delete, before the result write: the next " +
      "admission gets 404 -> absent; count never reset", async () => {
    const w = world();
    const e = w.bucket.put(w.path(crypto.randomUUID()), MP4);
    w.crashAtTx(2);
    await w.h.onQuarantineFinalized(e);
    const a = await w.api.admitAttempt(w.id(e), "lost");
    assert.equal((await cl.deleteExactGeneration(w.bucket, a.target,
        L.attemptBudgetMs)).result, "deleted"); // then crash
    w.clock.t = new Date(w.record(e).sweepDueAtMs);
    const s = await w.h.retryPendingFilmCleanups({limit: 5});
    assert.equal(s.results[0].result, "absent");
    const r = w.record(e);
    assert.equal(r.state, "absent");
    assert.equal(r.attempts, 2);
    assert.deepEqual(r.history.map((h) => h.result), ["unknown", "absent"]);
  });
});

describe("T8 every finalize path", () => {
  const paths = {
    "no-reservation": async (w) => ({
      e: w.bucket.put(w.path(crypto.randomUUID()), MP4)}),
    "stale-validating": async (w) => {
      const v = await w.validating();
      return {e: w.bucket.put(v.e.name, MP4)};
    },
    "stale-ready": async (w) => {
      const v = await w.validating();
      w.db.write(`teams/${TEAM}/films/${v.filmId}`,
          {...w.film(v.filmId), status: "ready"});
      return {e: w.bucket.put(v.e.name, MP4)};
    },
    "stale-rejected": async (w) => {
      const filmId = await w.reserve();
      const bad = w.bucket.put(w.path(filmId), NOT_MP4);
      assert.equal(await w.h.onQuarantineFinalized(bad),
          "rejected-signature-invalid");
      return {e: w.bucket.put(w.path(filmId), MP4)};
    },
    "stale-abandoned": async (w) => {
      const filmId = await w.reserve();
      await w.abandon(filmId);
      return {e: w.bucket.put(w.path(filmId), MP4)};
    },
    "stale-expired": async (w) => {
      const filmId = await w.reserve();
      w.db.write(`teams/${TEAM}/films/${filmId}`,
          {...w.film(filmId), status: "expired"});
      return {e: w.bucket.put(w.path(filmId), MP4)};
    },
    "expired": async (w) => {
      const filmId = await w.reserve();
      w.advance(LIMITS.reservationLifetimeMs);
      return {e: w.bucket.put(w.path(filmId), MP4)};
    },
    "rejected-size-mismatch": async (w) => {
      const filmId = await w.reserve();
      return {e: w.bucket.put(w.path(filmId), Buffer.concat([MP4,
        Buffer.alloc(1)]))};
    },
    "rejected-content-type-mismatch": async (w) => {
      const filmId = await w.reserve();
      return {e: w.bucket.put(w.path(filmId), MP4, "video/quicktime")};
    },
    "rejected-signature-invalid": async (w) => {
      const filmId = await w.reserve();
      return {e: w.bucket.put(w.path(filmId), NOT_MP4)};
    },
  };
  for (const [label, setup] of Object.entries(paths)) {
    it(`${label}: obligation in the transaction; label unchanged; outage ` +
        "-> pending; duplicate creates nothing and admits nothing; sweep " +
        "recovers; a transaction retry does not reset", async () => {
      const w = world();
      const {e} = await setup(w);
      const deletesBefore = w.bucket.deletes();
      w.bucket.deleteFault = outage();
      // force one optimistic retry of the finalize transaction
      let forced = false;
      w.db.beforeCommit = ({attempt, writes}) => {
        if (!forced && attempt === 0 &&
            writes.some((p) => p.startsWith("filmCleanup/"))) {
          forced = true;
          const p = `teams/${TEAM}/filmLedger/cap`;
          w.db.write(p, w.db.read(p) || {slots: {}});
        }
      };
      assert.equal(await w.h.onQuarantineFinalized(e), label);
      w.db.beforeCommit = null;
      assert.equal(forced, true, "the finalize transaction was retried");
      const r = w.record(e);
      assert.equal(r.origin, `finalize-${label}`);
      assert.equal(r.generation, e.generation);
      assert.equal(r.attempts, 1, "one immediate attempt, not two");
      assert.equal(r.state, "pending");
      assert.equal(w.bucket.deletes(), deletesBefore + 1);
      // duplicate event: no new record, no attempt, record byte-unchanged
      const count = w.records().length;
      const again = await w.h.onQuarantineFinalized(e);
      assert.ok(typeof again === "string");
      assert.equal(w.records().length, count);
      assert.deepEqual(w.record(e), r);
      assert.equal(w.bucket.deletes(), deletesBefore + 1);
      // recovery via the sweep
      w.bucket.deleteFault = null;
      w.clock.t = new Date(r.sweepDueAtMs);
      const s = await w.h.retryPendingFilmCleanups({limit: 25});
      assert.ok(s.results.some((x) => x.id === w.id(e) &&
        x.result === "deleted"));
      assert.equal(w.bucket.objects.has(e.name), false);
    });
  }
  it("validating and duplicate-event create no obligation", async () => {
    const w = world();
    const v = await w.validating();
    assert.equal(await w.h.onQuarantineFinalized(v.e), "duplicate-event");
    assert.deepEqual(w.records(), []);
    assert.equal(w.bucket.deletes(), 0);
  });
});

describe("T9 binding and generation", () => {
  it("finalize for a different bucket: unchanged label, no record, no " +
      "Storage call", async () => {
    const w = world();
    const e = {...w.bucket.put(w.path(crypto.randomUUID()), MP4),
      bucket: "other-bucket"};
    assert.equal(await w.h.onQuarantineFinalized(e), "no-reservation");
    assert.deepEqual(w.records(), []);
    assert.equal(w.bucket.deletes(), 0);
    assert.ok(w.logs.some((l) => l.msg === "film.cleanup.target_refused" &&
      l.data.problem === "bucket-mismatch"));
  });
  it("target problems: bucket, non-canonical name, generation form",
      () => {
        const name = c.uploadPathFor(TEAM, crypto.randomUUID());
        const ok = {bucket: BKT, name, generation: "1001"};
        assert.equal(cl.targetProblem(ok, BKT), null);
        for (const [t, p] of [
          [{...ok, bucket: "x"}, "bucket-mismatch"],
          [{...ok, name: name.toUpperCase()}, "name-invalid"],
          [{...ok, name: `${name}/../x`}, "name-invalid"],
          [{...ok, name: "films/x/y/z.mp4"}, "name-invalid"],
          [{...ok, generation: "0"}, "generation-invalid"],
          [{...ok, generation: "0123"}, "generation-invalid"],
          [{...ok, generation: "12a"}, "generation-invalid"],
          [{...ok, generation: "1".repeat(21)}, "generation-invalid"],
          [{...ok, generation: 1001}, "generation-invalid"],
        ]) {
          assert.equal(cl.targetProblem(t, BKT), p, JSON.stringify(t));
        }
        assert.equal(cl.QUARANTINE_RE.source, HANDLER_RE.source);
      });
  it("20-digit generation preserved exactly; exact delete options",
      async () => {
        const w = world();
        const g = "18446744073709551615";
        const e = w.bucket.put(w.path(crypto.randomUUID()), MP4,
            "video/mp4", g);
        assert.equal(await w.h.onQuarantineFinalized(e), "no-reservation");
        const r = w.record(e);
        assert.equal(r.generation, g);
        assert.equal(r.state, "deleted");
        const del = w.bucket.calls.filter((x) => x[0] === "delete");
        assert.deepEqual(del, [["delete", e.name, {ifGenerationMatch: g}]]);
      });
  const corrupt = {
    "wrong bucket": (r) => ({...r, bucket: "other-bucket"}),
    "team mismatch": (r) => ({...r, teamId: "team-other"}),
    "film mismatch": (r) => ({...r, filmId: crypto.randomUUID()}),
    "zero generation": (r) => ({...r, generation: "0"}),
    "numeric generation": (r) => ({...r, generation: 1001}),
    "unknown field": (r) => ({...r, cause: "newer-generation"}),
    "attempts/history disagree": (r) => ({...r, attempts: 2}),
    "pending without sweepDueAtMs": (r) => ({...r, sweepDueAtMs: null}),
    "terminal with a due time": (r) => ({...r, state: "deleted",
      resolvedAtMs: 1}),
  };
  for (const [name, mutate] of Object.entries(corrupt)) {
    it(`invalid record (${name}) fails closed before any Storage call; ` +
        "preserved", async () => {
      const w = world();
      const e = w.bucket.put(w.path(crypto.randomUUID()), MP4);
      w.crashAtTx(2);
      await w.h.onQuarantineFinalized(e);
      const bad = mutate(w.record(e));
      w.db.write(`filmCleanup/${w.id(e)}`, bad);
      const a = await w.api.attemptOnce(w.id(e));
      assert.equal(a.admission, "invalid");
      assert.equal((await w.h.retryPendingFilmCleanups({limit: 5}))
          .results.every((x) => x.admission !== "admitted"), true);
      assert.equal(w.bucket.deletes(), 0);
      assert.deepEqual(w.record(e), bad);
      assert.ok(w.logs.some((l) => l.msg === "film.cleanup.record_invalid"));
    });
  }
  it("id mismatch (record stored under another id) fails closed",
      async () => {
        const w = world();
        const e = w.bucket.put(w.path(crypto.randomUUID()), MP4);
        w.crashAtTx(2);
        await w.h.onQuarantineFinalized(e);
        const fake = "f".repeat(64);
        w.db.write(`filmCleanup/${fake}`, w.record(e));
        assert.deepEqual(await w.api.admitAttempt(fake, "x"),
            {outcome: "invalid", problem: "id-mismatch"});
        assert.equal(w.bucket.deletes(), 0);
      });
  it("the injected client has implicit retries disabled (real SDK class)",
      () => {
        process.env.GCLOUD_PROJECT = "demo-coach-core-beta";
        const {initializeApp, getApp} = require("firebase-admin/app");
        let app;
        try {
          app = getApp("c1-retry");
        } catch (_) {
          app = initializeApp({projectId: "demo-coach-core-beta",
            storageBucket: BKT}, "c1-retry");
        }
        const {getStorage} = require("firebase-admin/storage");
        const def = getStorage(app).bucket();
        const b = cl.noRetryBucketFor(def);
        assert.equal(b.name, BKT);
        assert.equal(b.storage.retryOptions.autoRetry, false);
        assert.notEqual(b.storage, def.storage);
        assert.equal(def.storage.retryOptions.autoRetry, true,
            "the shared default client is not mutated");
        const src = fs.readFileSync(path.join(__dirname, "..", "index.js"),
            "utf8");
        assert.match(src, /cleanupBucket: getFilmCleanupBucket/);
        assert.match(src, /noRetryBucketFor\(getStorage\(\)\.bucket\(\)\)/);
      });
});

describe("T10 fencing, takeover and late results", () => {
  /** A pending record whose obligation committed; no admission yet. */
  async function seeded() {
    const w = world();
    const e = w.bucket.put(w.path(crypto.randomUUID()), MP4);
    w.crashAtTx(2);
    await w.h.onQuarantineFinalized(e);
    return {w, e, id: w.id(e)};
  }
  const takeover = async (w, id) => {
    const a = await w.api.admitAttempt(id, "stale");
    w.clock.t = new Date(Math.max(w.record({name: a.target.name,
      generation: a.target.generation}).sweepDueAtMs,
    w.clock.t.getTime()));
    const b = await w.api.admitAttempt(id, "successor");
    return {a, b};
  };
  it("T10a takeover after lease expiry: higher fence; history and count " +
      "kept", async () => {
    const {w, id} = await seeded();
    const {a, b} = await takeover(w, id);
    assert.deepEqual([a.fence, b.fence], [1, 2]);
    const r = w.db.read(`filmCleanup/${id}`);
    assert.equal(r.attempts, 2);
    assert.equal(r.lease.holder, "successor");
    assert.equal(r.history[0].result, "unknown");
  });
  it("T10b late success from the stale holder is refused; successor's " +
      "outcome intact; successor's delete -> absent", async () => {
    const {w, e, id} = await seeded();
    const {a, b} = await takeover(w, id);
    await cl.deleteExactGeneration(w.bucket, a.target, 1000); // late, real
    assert.equal((await w.api.recordResult(id, "stale", a.fence,
        {result: "deleted", code: null})).outcome, "stale-ignored");
    const out = await cl.deleteExactGeneration(w.bucket, b.target, 1000);
    assert.equal(out.result, "absent");
    await w.api.recordResult(id, "successor", b.fence, out);
    assert.equal(w.record(e).state, "absent");
  });
  it("T10c late error from the stale holder: no-op; successor's lease " +
      "not cleared", async () => {
    const {w, e, id} = await seeded();
    const {a} = await takeover(w, id);
    const before = w.record(e);
    assert.equal((await w.api.recordResult(id, "stale", a.fence,
        {result: "error", code: "503"})).outcome, "stale-ignored");
    assert.deepEqual(w.record(e), before);
    assert.equal(w.record(e).lease.holder, "successor");
  });
  it("T10d concurrent sweepers: one admission per lease; result once",
      async () => {
        const {w, e, id} = await seeded();
        let release;
        const gate = new Promise((r) => {
          release = r;
        });
        w.bucket.deleteFault = () => gate;
        // both sweepers selected the same due record and race to admit it
        const both = Promise.all([w.api.attemptOnce(id),
          w.api.attemptOnce(id)]);
        await new Promise((r) => setTimeout(r, 5));
        release();
        const out = (await both).map((x) => x.admission).sort();
        assert.deepEqual(out, ["admitted", "skip-contention"]);
        assert.equal(w.bucket.deletes(), 1);
        const r = w.record(e);
        assert.equal(r.attempts, 1);
        assert.equal(r.state, "deleted");
        assert.equal(r.history.length, 1);
        // and a sweeper starting while the lease is live does not even
        // select the record (sweepDueAtMs is past the lease)
        const {w: w2} = await seeded();
        let rel2;
        w2.bucket.deleteFault = () => new Promise((r2) => {
          rel2 = r2;
        });
        const s1 = w2.h.retryPendingFilmCleanups({limit: 5});
        while (!rel2) await new Promise((r2) => setTimeout(r2, 1));
        assert.equal((await w2.h.retryPendingFilmCleanups({limit: 5}))
            .queried, 0);
        rel2();
        assert.equal((await s1).results[0].result, "deleted");
        assert.equal(w2.bucket.deletes(), 1);
      });
  it("T10e terminal record: immediate, replay and sweep are no-ops with " +
      "no Storage call", async () => {
    const w = world();
    const v = await w.validating();
    const opId = crypto.randomUUID();
    await w.abandon(v.filmId, opId);
    assert.equal(w.record(v.e).state, "deleted");
    const r = w.record(v.e);
    const n = w.bucket.deletes();
    await w.abandon(v.filmId, opId); // replay
    await w.abandon(v.filmId); // new abandon of an abandoned film
    w.advance(30 * 3600 * 1000);
    await w.h.retryPendingFilmCleanups({limit: 5});
    assert.deepEqual(await w.api.attemptOnce(w.id(v.e)),
        {admission: "no-op"});
    assert.equal(w.bucket.deletes(), n);
    assert.deepEqual(w.record(v.e), r);
  });
  it("T10f wrong holder, same fence (control): no-op; lease and history " +
      "unchanged", async () => {
    const {w, e, id} = await seeded();
    const a = await w.api.admitAttempt(id, "real");
    const before = w.record(e);
    assert.equal((await w.api.recordResult(id, "impostor", a.fence,
        {result: "deleted", code: null})).outcome, "stale-ignored");
    assert.deepEqual(w.record(e), before);
  });
  it("T10g cleared or replaced lease: the original holder's write is a " +
      "no-op", async () => {
    const {w, e, id} = await seeded();
    const a = await w.api.admitAttempt(id, "h1");
    await w.api.recordResult(id, "h1", a.fence, {result: "error",
      code: "503"}); // cleared
    const cleared = w.record(e);
    assert.equal(cleared.lease, null);
    assert.equal((await w.api.recordResult(id, "h1", a.fence,
        {result: "deleted", code: null})).outcome, "stale-ignored");
    assert.deepEqual(w.record(e), cleared);
    // unknown closure without re-admission, then a write
    const {w: w2, e: e2, id: id2} = await seeded();
    const b = await w2.api.admitAttempt(id2, "h2");
    w2.clock.t = new Date(w2.record(e2).lease.untilMs + 1);
    assert.equal((await w2.api.admitAttempt(id2, "peek")).outcome,
        "not-due");
    const closed = w2.record(e2);
    assert.equal(closed.lease, null);
    assert.equal((await w2.api.recordResult(id2, "h2", b.fence,
        {result: "deleted", code: null})).outcome, "stale-ignored");
    assert.deepEqual(w2.record(e2), closed);
  });
  it("T10h stale write after the successor's result leaves it " +
      "byte-unchanged; control: same holder+fence after untilMs with no " +
      "successor IS accepted", async () => {
    const {w, e, id} = await seeded();
    const {a, b} = await takeover(w, id);
    await w.api.recordResult(id, "successor", b.fence,
        {result: "deleted", code: null});
    const done = w.record(e);
    assert.equal((await w.api.recordResult(id, "stale", a.fence,
        {result: "error", code: "503"})).outcome, "stale-ignored");
    assert.deepEqual(w.record(e), done);
    // control
    const {w: w2, e: e2, id: id2} = await seeded();
    const c2 = await w2.api.admitAttempt(id2, "slow");
    w2.clock.t = new Date(w2.record(e2).lease.untilMs + 1);
    assert.equal((await w2.api.recordResult(id2, "slow", c2.fence,
        {result: "deleted", code: null})).outcome, "recorded");
    assert.equal(w2.record(e2).state, "deleted");
  });
  it("T10i result write on a schema- or binding-invalid record: not " +
      "mutated; no Storage call", async () => {
    const {w, e, id} = await seeded();
    const a = await w.api.admitAttempt(id, "h");
    const bad = {...w.record(e), bucket: "other-bucket"};
    w.db.write(`filmCleanup/${id}`, bad);
    assert.equal((await w.api.recordResult(id, "h", a.fence,
        {result: "deleted", code: null})).outcome, "invalid");
    assert.deepEqual(w.record(e), bad);
    assert.equal(w.bucket.deletes(), 0);
  });
});

describe("T11a sweep bounds", () => {
  it("invalid limit refused before any query", async () => {
    const w = world();
    for (const limit of [0, -1, 1.5, L.sweepBatchMax + 1, "3", undefined,
      null]) {
      await assert.rejects(w.h.retryPendingFilmCleanups({limit}),
          RangeError, String(limit));
    }
    assert.equal(w.db.queries.length, 0);
  });
  it("exactly one bounded query per invocation; stops on the invocation " +
      "budget", async () => {
    const w = world();
    for (let i = 0; i < 4; i++) {
      const e = w.bucket.put(w.path(crypto.randomUUID()), MP4);
      w.crashAtTx(2);
      await w.h.onQuarantineFinalized(e);
    }
    w.bucket.deleteFault = async () => {
      w.mono.t += L.sweepInvocationBudgetMs / 2;
    };
    const s = await w.h.retryPendingFilmCleanups({limit: 4});
    assert.equal(w.db.queries.length, 1);
    assert.deepEqual(w.db.queries[0], {path: "filmCleanup",
      where: ["sweepDueAtMs", "<=", w.clock.t.getTime()],
      orderBy: "sweepDueAtMs", limit: 4});
    assert.equal(s.queried, 4);
    assert.equal(s.results.length, 2);
    assert.equal(s.stoppedForBudget, true);
  });
  it("configuration / permission errors are recorded, capped and never " +
      "loop", async () => {
    let calls = 0;
    const w = world({cleanupBucket: () => {
      calls += 1;
      throw new Error("bucket not configured");
    }});
    const e = w.bucket.put(w.path(crypto.randomUUID()), MP4);
    await w.h.onQuarantineFinalized(e);
    assert.equal(w.record(e).history[0].code, "config");
    const perm = world();
    const e2 = perm.bucket.put(perm.path(crypto.randomUUID()), MP4);
    perm.bucket.deleteFault = outage(403);
    await perm.h.onQuarantineFinalized(e2);
    assert.equal(perm.record(e2).history[0].code, "403");
    for (const [x, ev] of [[w, e], [perm, e2]]) {
      let sweeps = 0;
      while (x.record(ev).state === "pending") {
        x.clock.t = new Date(x.record(ev).sweepDueAtMs);
        const s = await x.h.retryPendingFilmCleanups({limit: 5});
        assert.equal(s.results.length, 1, "one attempt per sweep");
        sweeps += 1;
      }
      assert.equal(sweeps, L.maxAttempts - 1);
      assert.equal(x.record(ev).state, "stuck");
    }
    assert.equal(calls, L.maxAttempts);
    assert.equal(perm.bucket.deletes(), L.maxAttempts);
  });
});

describe("T12 boundary: TEST_ONLY sweep, unexported, retry OFF", () => {
  let fns;
  const load = () => {
    process.env.GCLOUD_PROJECT = "demo-coach-core-beta";
    fns = fns || require("../index");
    return fns;
  };
  it("loaded exports carry no TEST_ONLY marker and no sweep", () => {
    assert.equal(cl.testOnlyExportProblem(load()), null);
    for (const name of Object.keys(load())) {
      assert.ok(!/sweep|pendingfilmcleanup/i.test(name), name);
    }
    assert.equal(cl.CLEANUP_SWEEP_DESIGNATION.designation, "TEST_ONLY");
    assert.equal(cl.CLEANUP_SWEEP_DESIGNATION.authorizationRecord, null);
    assert.equal(cl.CLEANUP_LIMITS.status, "TEST_PLACEHOLDER");
  });
  it("the sweep definition: retryCount 0, placeholder schedule, marked " +
      "TEST_ONLY, default-OFF before any work", async () => {
    let swept = 0;
    let enabled = false;
    const t = cl.defineCleanupSweepTrigger({sweep: async () => {
      swept += 1;
    }, isEnabled: () => enabled});
    const st = t.__endpoint.scheduleTrigger;
    assert.equal(st.schedule, cl.SWEEP_SCHEDULE_PLACEHOLDER);
    assert.equal(st.retryConfig.retryCount, 0);
    assert.equal(t.__filmTestOnly, "film-cleanup-sweep");
    assert.equal(cl.testOnlyExportProblem({x: t}), "x=film-cleanup-sweep");
    await t.run({});
    assert.equal(swept, 0);
    enabled = true;
    await t.run({});
    assert.equal(swept, 1);
  });
  it("predeploy guard: blocks a referenced or a disguised loaded export " +
      "regardless of terms and with --check; clean index passes the sweep " +
      "check", () => {
    const fnDir = path.join(__dirname, "..");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c1-guard-"));
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
    const named = "const c=require('./src/film/cleanup');\n" +
      "exports.s=c.defineCleanupSweepTrigger({sweep:async()=>{}," +
      "isEnabled:()=>false});\n";
    const disguised = "const m=require('./src/film/'+'clean'+'up');\n" +
      "exports.nightly=m['define'+'CleanupSweep'+'Trigger']({sweep:" +
      "async()=>{},isEnabled:()=>false});\n";
    for (const args of [[], ["--check"]]) {
      let r = run(named, args);
      assert.equal(r.status, 1, r.stderr);
      assert.match(r.stderr, /cleanup sweep is TEST_ONLY \(referenced/);
      r = run(disguised, args);
      assert.equal(r.status, 1, r.stderr);
      assert.match(r.stderr, /TEST_ONLY \(exported: nightly=film-cleanup/);
      r = run("throw new Error('cannot load');\n", args);
      assert.equal(r.status, 1, r.stderr);
      assert.match(r.stderr, /could not be verified/);
    }
    const ok = run("exports.ok = 1;\n", []);
    assert.equal(ok.status, 0, ok.stderr);
    fs.rmSync(dir, {recursive: true, force: true});
  });
});
