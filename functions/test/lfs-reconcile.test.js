"use strict";
// LFS reconciler acceptance tests (agreed scope L1-L19; LFS-A c-6303891279).
// Unchanged S1 handlers + C1 cleanup, re-driven by the reconciler, over the
// accepted C1 Firestore double (optimistic transactions) and a listing
// bucket double with real generation semantics. Transport bounds (L9/L15/L16
// transport half) are proven on the real pinned SDKs in lfs-gate-*.test.js;
// Firestore-emulator transactions in test/emulator/lfs-reconcile.emulator.
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const c = require("../src/film/contract");
const {LIMITS} = require("../src/film/limits");
const cl = require("../src/film/cleanup");
const {createFilmHandlers} = require("../src/film/handlers");
const {createStorageAdapter} = require("../src/film/storage-adapter");
const r = require("../src/film/reconcile");
const {LfsBucket, FakeFirestore, FakeTimestamp} = require("./lfs-doubles");

const BKT = "demo-lfs.appspot.com";
const PROJECT = "demo-lfs";
const OWNER = "uid-owner";
const TEAM = "team-lfs";
const T0 = new Date("2026-10-20T20:00:00.000Z");
const MIN = 60 * 1000;
const AUTH = {uid: OWNER, token: {email_verified: true,
  firebase: {sign_in_provider: "google.com"}, auth_time: 1760900000}};
const MP4 = Buffer.alloc(32);
MP4.writeUInt32BE(24, 0);
MP4.write("ftypisom", 4, "latin1");
MP4.writeUInt32BE(0x200, 12);
MP4.write("isomiso2", 16, "latin1");

/** World: S1 handlers (for setup) + reconciler over the same doubles. */
function world(over = {}) {
  const clock = {t: T0};
  const now = () => clock.t;
  const db = new FakeFirestore();
  const bucket = new LfsBucket(BKT, now);
  const mono = {t: 0};
  const logs = [];
  const rec = (level) => (msg, data) => logs.push({level, msg, data});
  const logger = {info: rec("info"), warn: rec("warn"), error: rec("error")};
  const cfg = {bucket: BKT};
  let fn = 0;
  let hn = 0;
  db.write(`teams/${TEAM}`, {ownerId: OWNER, name: "L"});
  const s1 = createFilmHandlers({db, Timestamp: FakeTimestamp,
    getUser: async () => ({disabled: false, customClaims: {beta: true}}),
    readHead: (x) => createStorageAdapter(bucket).readHead(x),
    cleanupBucketName: () => cfg.bucket, cleanupBucket: () => bucket,
    logger, now, newFilmId: () =>
      `00000000-0000-4000-8000-${String(++fn).padStart(12, "0")}`});
  const limits = r.deriveLimits(undefined, {objectBudgetMs: 1000,
    invocationBudgetMs: 60 * 60 * 1000, ...(over.limits || {})});
  const mk = (o = {}) => r.createQuarantineReconciler({db: o.db || db,
    Timestamp: FakeTimestamp, storage: o.storage || bucket,
    bucketName: () => cfg.bucket, project: o.project || PROJECT, logger,
    now, monotonicMs: () => mono.t,
    newHolder: () => `holder-${++hn}`, limits: o.limits || limits});
  const w = {clock, db, bucket, mono, logs, cfg, s1, limits, mk,
    rc: mk()};
  w.advance = (ms) => {
    clock.t = new Date(clock.t.getTime() + ms);
  };
  w.reserve = async () => {
    const res = await s1.reserveFilmUpload({auth: AUTH, data: {
      schemaVersion: c.CONTRACT_VERSION, operationId: crypto.randomUUID(),
      action: "reserveFilmUpload", payload: {teamId: TEAM, declaredBytes: 32,
        declaredContentType: "video/mp4", fileName: "clip.mp4",
        rightsAcknowledged: true, rightsWordingVersion: "rights-v1"}}});
    assert.equal(res.ok, true, JSON.stringify(res));
    return res.data.filmId;
  };
  w.abandon = (filmId) => s1.abandonFilmUpload({auth: AUTH, data: {
    schemaVersion: c.CONTRACT_VERSION, operationId: crypto.randomUUID(),
    action: "abandonFilmUpload", payload: {teamId: TEAM, filmId}}});
  w.path = (filmId) => c.uploadPathFor(TEAM, filmId);
  w.film = (filmId) => db.read(`teams/${TEAM}/films/${filmId}`);
  w.filmPath = (filmId) => `teams/${TEAM}/films/${filmId}`;
  w.record = (e) => db.read(`filmCleanup/${cl.cleanupIdFor(BKT, e.name,
      String(e.generation))}`);
  w.records = () => db.paths("filmCleanup/").map((p) => db.read(p));
  w.state = () => db.read(r.STATE_PATH);
  w.evidence = () => db.paths(`${r.EVIDENCE_COLLECTION}/`)
      .map((p) => db.read(p));
  w.slots = () => (db.read(`teams/${TEAM}/filmLedger/cap`) || {}).slots || {};
  /** An upload whose finalize was lost (event never decided). */
  w.lostUpload = async (filmId, bytes = MP4, o = {}) => w.bucket.put(
      w.path(filmId), bytes, o.contentType || "video/mp4", o.generation,
      {timeCreated: (o.at || clock.t).toISOString()});
  w.run = (limit = 50) => w.rc.reconcileQuarantine({limit});
  return w;
}

describe("L1 lost finalize -> reconcile (new positive tests)", () => {
  it("configuration outage loses the finalize; reservation still live -> " +
      "re-driven intake: validating, slot kept, no cleanup record",
  async () => {
    const w = world();
    const filmId = await w.reserve();
    const e = await w.lostUpload(filmId);
    w.cfg.bucket = null;
    await assert.rejects(w.s1.onQuarantineFinalized(e)); // event lost
    w.cfg.bucket = BKT;
    assert.equal(w.film(filmId).status, "reserved");
    w.advance(16 * MIN); // older than RECONCILE_MIN_AGE, reservation live
    const out = await w.run();
    assert.deepEqual(out.outcomes, {validating: 1});
    const f = w.film(filmId);
    assert.equal(f.status, "validating");
    assert.equal(f.objectGeneration, e.generation);
    assert.equal(w.slots()[filmId].status, "validating");
    assert.deepEqual(w.records(), []);
    assert.equal(w.bucket.objects.has(e.name), true, "upload recovered");
  });
  it("after lazy expiry -> stale-expired obligation -> immediate attempt " +
      "fails -> C1 sweep -> deleted", async () => {
    const w = world();
    const filmId = await w.reserve();
    const e = await w.lostUpload(filmId);
    w.advance(LIMITS.reservationLifetimeMs + MIN);
    await w.reserve(); // lazy expiry of the first reservation
    assert.equal(w.film(filmId).status, "expired");
    w.bucket.deleteFault = async () => {
      throw Object.assign(new Error("unavailable"), {code: 503});
    };
    const out = await w.run();
    assert.deepEqual(out.outcomes, {"stale-expired": 1});
    const rec0 = w.record(e);
    assert.equal(rec0.origin, "finalize-stale-expired");
    assert.equal(rec0.state, "pending");
    w.bucket.deleteFault = null;
    w.clock.t = new Date(rec0.sweepDueAtMs);
    const s = await w.s1.retryPendingFilmCleanups({limit: 5});
    assert.equal(s.results[0].result, "deleted");
    assert.equal(w.bucket.objects.has(e.name), false);
  });
});

describe("L2 lost finalize for missing / expired / abandoned films", () => {
  it("missing film -> no-reservation obligation -> deleted", async () => {
    const w = world();
    const e = await w.lostUpload(crypto.randomUUID());
    w.advance(16 * MIN);
    assert.deepEqual((await w.run()).outcomes, {"no-reservation": 1});
    assert.equal(w.record(e).state, "deleted");
  });
  it("expired but not lazily expired -> expired: film expired, slot " +
      "released once, obligation, deleted", async () => {
    const w = world();
    const filmId = await w.reserve();
    const e = await w.lostUpload(filmId);
    w.advance(LIMITS.reservationLifetimeMs + MIN);
    assert.deepEqual((await w.run()).outcomes, {expired: 1});
    assert.equal(w.film(filmId).status, "expired");
    assert.equal(w.slots()[filmId], undefined);
    assert.equal(w.record(e).state, "deleted");
  });
  it("late event lost after abandon -> stale-abandoned -> deleted",
      async () => {
        const w = world();
        const filmId = await w.reserve();
        await w.abandon(filmId);
        const e = await w.lostUpload(filmId);
        w.advance(16 * MIN);
        assert.deepEqual((await w.run()).outcomes, {"stale-abandoned": 1});
        assert.equal(w.record(e).origin, "finalize-stale-abandoned");
        assert.equal(w.bucket.objects.has(e.name), false);
      });
});

describe("L3 O-5 ignored-bucket window", () => {
  it("event ignored during a wrong bucket name is re-driven after " +
      "restoration with the configured bucket", async () => {
    const w = world();
    const filmId = await w.reserve();
    const e = await w.lostUpload(filmId);
    w.cfg.bucket = "demo-renamed.appspot.com";
    assert.equal(await w.s1.onQuarantineFinalized(e), "ignored-bucket");
    w.cfg.bucket = BKT;
    w.advance(16 * MIN);
    assert.deepEqual((await w.run()).outcomes, {validating: 1});
    assert.ok(w.bucket.lists.every((q) => q.prefix === "quarantine/"));
  });
  it("only the configured bucket's facade is ever listed", async () => {
    const w = world();
    const other = new LfsBucket("foreign.appspot.com", () => w.clock.t);
    other.put(w.path(crypto.randomUUID()), MP4);
    w.advance(16 * MIN);
    await w.run();
    assert.equal(other.lists.length, 0);
    assert.equal(other.objects.size, 1);
  });
});

describe("L4 no false deletion or decision", () => {
  it("young object: skipped without evidence, re-seen next pass",
      async () => {
        const w = world();
        const e = await w.lostUpload(crypto.randomUUID());
        let out = await w.run();
        assert.equal(out.young, 1);
        assert.deepEqual(w.records(), []);
        assert.deepEqual(w.evidence(), []);
        assert.equal(out.passEnded, true);
        w.advance(16 * MIN);
        out = await w.run();
        assert.deepEqual(out.outcomes, {"no-reservation": 1});
        assert.equal(w.record(e).state, "deleted");
      });
  const ambiguous = {
    "unknown status": (d) => ({...d, status: "mystery"}),
    "malformed expiry": (d) => ({...d, reservationExpiresAt: "2026"}),
    "malformed objectGeneration": (d) => ({...d, status: "validating",
      objectGeneration: "12a"}),
    "identity mismatch": (d) => ({...d, teamId: "team-other"}),
  };
  for (const [name, mutate] of Object.entries(ambiguous)) {
    it(`film-ambiguous (${name}): evidence, no re-drive, no record`,
        async () => {
          const w = world();
          const filmId = await w.reserve();
          const e = await w.lostUpload(filmId);
          w.db.write(w.filmPath(filmId), mutate(w.film(filmId)));
          const before = w.film(filmId);
          w.advance(16 * MIN);
          const out = await w.run();
          assert.deepEqual(out.outcomes, {});
          assert.equal(out.evidence, 1);
          assert.deepEqual(w.film(filmId), before);
          assert.deepEqual(w.records(), []);
          assert.equal(w.bucket.objects.has(e.name), true);
          const ev = w.evidence()[0];
          assert.match(ev.code, /^film-ambiguous:/);
          assert.equal(ev.generation, e.generation);
        });
  }
  it("same-generation validating and ready -> duplicate-event, no record",
      async () => {
        const w = world();
        const a = await w.reserve();
        const ea = await w.lostUpload(a);
        assert.equal(await w.s1.onQuarantineFinalized(ea), "validating");
        const b = await w.reserve();
        const eb = await w.lostUpload(b);
        assert.equal(await w.s1.onQuarantineFinalized(eb), "validating");
        w.db.write(w.filmPath(b), {...w.film(b), status: "ready"});
        w.advance(16 * MIN);
        const out = await w.run();
        assert.deepEqual(out.outcomes, {"duplicate-event": 2});
        assert.deepEqual(w.records(), []);
        assert.equal(w.bucket.objects.size, 2);
      });
});

describe("L5 generation safety", () => {
  it("20-digit generation stays a string end to end", async () => {
    const w = world();
    const filmId = await w.reserve();
    const g = "18446744073709551615";
    await w.lostUpload(filmId, MP4, {generation: g});
    w.advance(16 * MIN);
    await w.run();
    assert.equal(w.film(filmId).objectGeneration, g);
  });
  it("overwritten or deleted between list and head read -> frozen " +
      "object-gone: no decision, no record", async () => {
    for (const change of ["overwrite", "delete"]) {
      const w = world();
      const filmId = await w.reserve();
      const e = await w.lostUpload(filmId);
      w.advance(16 * MIN);
      w.bucket.downloadFault = async ({name}) => {
        w.bucket.downloadFault = null;
        if (change === "overwrite") w.bucket.put(name, MP4);
        else w.bucket.objects.delete(name);
      };
      assert.deepEqual((await w.run()).outcomes, {"object-gone": 1});
      assert.equal(w.film(filmId).status, "reserved");
      assert.equal(w.record(e), null);
    }
  });
  it("deleted between head read and C1 delete -> absent; newer " +
      "generation before the C1 delete -> mismatch, newer object intact",
  async () => {
    for (const change of ["delete", "newer"]) {
      const w = world();
      const e = await w.lostUpload(crypto.randomUUID());
      w.advance(16 * MIN);
      let newer = null;
      w.bucket.deleteFault = async ({name}) => {
        w.bucket.deleteFault = null;
        if (change === "delete") w.bucket.objects.delete(name);
        else newer = w.bucket.put(name, Buffer.from(MP4).fill(9, 24));
      };
      await w.run();
      const rec0 = w.record(e);
      assert.equal(rec0.state, change === "delete" ? "absent" : "mismatch");
      if (newer) {
        assert.equal(w.bucket.objects.get(e.name).generation,
            newer.generation);
        assert.equal(w.bucket.objects.get(e.name).bytes[30], 9);
      }
    }
  });
});

describe("L6 existing records in any state stay byte-unchanged", () => {
  const states = {
    pending: async (w, rec0) => rec0,
    stuck: async (w, rec0) => ({...rec0, state: "stuck",
      attempts: 8, fence: 8, history: [...Array(8).keys()].map((i) => ({
        n: i + 1, fence: i + 1, admittedAtMs: rec0.createdAtMs,
        result: "error", code: "503", endedAtMs: rec0.createdAtMs})),
      nextAttemptAtMs: null, sweepDueAtMs: null,
      resolvedAtMs: rec0.createdAtMs,
      evidence: {reason: "max-attempts", code: "503"}}),
    mismatch: async (w, rec0) => ({...rec0, state: "mismatch",
      history: [{...rec0.history[0], result: "mismatch", code: "412"}],
      nextAttemptAtMs: null, sweepDueAtMs: null,
      resolvedAtMs: rec0.createdAtMs}),
    parked: async (w, rec0) => ({...rec0, sweepDueAtMs: null,
      parked: {problem: "bucket-mismatch", sweepDueAtMs: rec0.sweepDueAtMs,
        atMs: rec0.createdAtMs}}),
  };
  for (const [name, make] of Object.entries(states)) {
    it(`${name}: re-drive admits nothing and changes nothing`, async () => {
      const w = world();
      const filmId = await w.reserve();
      await w.abandon(filmId);
      const e = await w.lostUpload(filmId);
      w.bucket.deleteFault = async () => {
        throw Object.assign(new Error("x"), {code: 503});
      };
      assert.equal(await w.s1.onQuarantineFinalized(e), "stale-abandoned");
      w.bucket.deleteFault = null;
      const id = cl.cleanupIdFor(BKT, e.name, e.generation);
      const target = await make(w, w.record(e));
      w.db.write(`filmCleanup/${id}`, target);
      const deletes = w.bucket.deletes();
      w.advance(16 * MIN); // old enough; the sweep is not run here
      const out = await w.run();
      assert.deepEqual(out.outcomes, {"stale-abandoned": 1});
      assert.deepEqual(w.record(e), target);
      assert.equal(w.bucket.deletes(), deletes);
    });
  }
});

describe("L7 progress, passes and binding", () => {
  const many = async (w, n, o = {}) => {
    const es = [];
    for (let i = 0; i < n; i++) {
      es.push(await w.lostUpload(`00000000-0000-4000-9000-${String(i)
          .padStart(12, "0")}`, MP4, o));
    }
    return es;
  };
  it("a page larger than one invocation's allowance: per-object " +
      "checkpoint; next invocation continues; then pass end", async () => {
    const w = world();
    const es = await many(w, 5);
    w.advance(16 * MIN);
    let out = await w.run(2);
    assert.equal(out.processed, 2);
    assert.equal(w.state().afterName, es[1].name);
    assert.equal(w.bucket.lists[0].maxResults, 3);
    out = await w.run(2);
    assert.equal(w.bucket.lists[1].startOffset, es[1].name);
    assert.equal(out.processed, 2);
    out = await w.run(2);
    assert.equal(out.processed, 1);
    assert.equal(out.passEnded, true);
    assert.equal(w.state().afterName, null);
    assert.equal(w.records().length, 5);
  });
  it("budget stop before an object it cannot afford; no progress lost",
      async () => {
        const w = world({limits: {objectBudgetMs: 10 * MIN,
          invocationBudgetMs: 25 * MIN}});
        await many(w, 4);
        w.advance(16 * MIN);
        w.bucket.downloadFault = async () => {
          w.mono.t += 8 * MIN;
        };
        const out = await w.run(10);
        assert.equal(out.processed, 2);
        assert.equal(out.stoppedFor, "budget");
      });
  it("crash at every checkpoint position: the next invocation re-presents " +
      "at most the one object, idempotently", async () => {
    for (let k = 1; k <= 6; k++) {
      const w = world();
      const es = await many(w, 2);
      w.advance(16 * MIN);
      const at = w.db.txCount + k;
      w.db.beforeTransaction = (n) => {
        if (n === at) {
          w.db.beforeTransaction = null;
          throw new Error("instance lost");
        }
      };
      await w.run().catch(() => null);
      w.advance(w.limits.leaseMs + 1);
      await w.run();
      await w.run();
      // anything left pending belongs to the accepted C1 sweep
      for (let i = 0; i < 3; i++) {
        w.advance(10 * MIN);
        await w.s1.retryPendingFilmCleanups({limit: 5});
      }
      assert.equal(w.records().length, 2, `k=${k}: one record per object`);
      for (const e of es) {
        assert.ok(["deleted", "absent"].includes(w.record(e).state),
            `k=${k}: ${w.record(e).state}`);
        assert.equal(w.bucket.objects.has(e.name), false);
      }
      assert.ok(w.bucket.deletes() <= 4, `k=${k}`);
    }
  });
  it("a throwing object is recorded and passed (no starvation); " +
      "repeat failure updates the same evidence", async () => {
    const w = world();
    const es = await many(w, 3);
    w.advance(16 * MIN);
    w.bucket.downloadFault = async ({name}) => {
      if (name === es[0].name) {
        throw Object.assign(new Error("reset"), {code: "ECONNRESET"});
      }
    };
    let out = await w.run();
    assert.equal(out.processed, 3);
    assert.equal(out.evidence, 1);
    assert.equal(w.record(es[1]).state, "deleted");
    assert.equal(w.evidence()[0].count, 1);
    out = await w.run();
    assert.equal(w.evidence().length, 1);
    assert.equal(w.evidence()[0].count, 2);
  });
  it("young -> old and live -> expired transitions across passes; " +
      "insertion behind the cursor is covered next pass", async () => {
    const w = world();
    const live = await w.reserve();
    const eLive = await w.lostUpload(live);
    const young = await w.lostUpload("ffffffff-0000-4000-8000-000000000000",
        MP4, {at: new Date(T0.getTime() + 20 * MIN)});
    w.advance(16 * MIN);
    let out = await w.run();
    assert.deepEqual(out.outcomes, {validating: 1});
    assert.equal(out.young, 1);
    const behind = await w.lostUpload("00000000-0000-4000-8000-000000000000",
        MP4, {at: T0});
    w.advance(20 * MIN);
    out = await w.run();
    assert.equal(w.record(young).state, "deleted");
    assert.equal(w.record(behind).state, "deleted");
    assert.equal(w.film(live).objectGeneration, eLive.generation);
  });
  it("bucket or policy change -> previous kept, new pass; configuration " +
      "missing -> no list, no writes", async () => {
    const w = world();
    await many(w, 3);
    w.advance(16 * MIN);
    await w.run(1);
    const s1 = w.state();
    const r2 = w.mk({project: "demo-lfs-other"});
    await r2.reconcileQuarantine({limit: 1});
    const s2 = w.state();
    assert.equal(s2.project, "demo-lfs-other");
    assert.deepEqual(s2.previous, {project: PROJECT, bucket: BKT,
      policyRevision: r.POLICY_REVISION, passId: s1.passId,
      afterName: s1.afterName, atMs: w.clock.t.getTime()});
    assert.notEqual(s2.passId, s1.passId);
    w.cfg.bucket = null;
    const lists = w.bucket.lists.length;
    const before = w.state();
    assert.deepEqual(await w.run(), {configMissing: true, processed: 0});
    assert.equal(w.bucket.lists.length, lists);
    assert.deepEqual(w.state(), before);
  });
  it("invalid limit refused before any I/O", async () => {
    const w = world();
    for (const limit of [0, -1, 1.5, w.limits.objectsMax + 1, "3", null]) {
      await assert.rejects(w.rc.reconcileQuarantine({limit}), RangeError);
    }
    assert.equal(w.bucket.lists.length, 0);
    assert.equal(w.state(), null);
  });
});

describe("L8 races (no duplicate effects; sequential transitions allowed)",
    () => {
      it("re-drive and a genuine finalize for the same generation: one " +
          "decision, one slot transition, no record", async () => {
        const w = world();
        const filmId = await w.reserve();
        const e = await w.lostUpload(filmId);
        w.advance(16 * MIN);
        w.bucket.downloadFault = async () => {
          w.bucket.downloadFault = null;
          await w.s1.onQuarantineFinalized(e); // genuine, concurrent
        };
        const out = await w.run();
        assert.deepEqual(out.outcomes, {"duplicate-event": 1});
        assert.equal(w.film(filmId).status, "validating");
        assert.deepEqual(w.records(), []);
      });
      it("re-drive during a live abandon: abandon wins the race, the " +
          "re-drive becomes stale-abandoned with ONE obligation",
      async () => {
        const w = world();
        const filmId = await w.reserve();
        const e = await w.lostUpload(filmId);
        w.advance(16 * MIN);
        w.bucket.downloadFault = async () => {
          w.bucket.downloadFault = null;
          await w.abandon(filmId);
        };
        const out = await w.run();
        assert.deepEqual(out.outcomes, {"stale-abandoned": 1});
        assert.equal(w.film(filmId).status, "abandoned");
        assert.equal(w.records().length, 1);
        assert.equal(w.record(e).state, "deleted");
      });
      it("legitimate sequence: intake by re-drive, then an explicit " +
          "abandon owes its own obligation", async () => {
        const w = world();
        const filmId = await w.reserve();
        const e = await w.lostUpload(filmId);
        w.advance(16 * MIN);
        await w.run();
        assert.equal(w.film(filmId).status, "validating");
        assert.equal((await w.abandon(filmId)).ok, true);
        assert.equal(w.record(e).origin, "abandon");
        assert.equal(w.records().length, 1);
      });
      it("stale holder completes a re-drive after takeover: at most the " +
          "frozen single decision, no second record, cursor unmoved by it",
      async () => {
        const w = world();
        const e = await w.lostUpload(crypto.randomUUID());
        w.advance(16 * MIN);
        let second = null;
        w.bucket.downloadFault = async () => {
          w.bucket.downloadFault = null;
          w.advance(w.limits.leaseMs + 1); // lease expires mid re-drive
          second = await w.mk().reconcileQuarantine({limit: 5});
        };
        const out = await w.run();
        assert.equal(out.stoppedFor, "lease-lost");
        assert.equal(out.processed, 0);
        assert.deepEqual(second.outcomes, {"no-reservation": 1});
        assert.equal(w.records().length, 1);
        assert.equal(w.record(e).state, "deleted");
        assert.equal(w.bucket.deletes(), 1);
        assert.equal(w.state().lease, null);
      });
    });

describe("L10/L14 fencing and takeover positions", () => {
  it("concurrent reconcilers: one holder; the other skips", async () => {
    const w = world();
    await w.lostUpload(crypto.randomUUID());
    w.advance(16 * MIN);
    let inner = null;
    w.bucket.listFault = async (q, items) => {
      w.bucket.listFault = null;
      inner = await w.mk().reconcileQuarantine({limit: 5});
      return items;
    };
    await w.run();
    assert.deepEqual(inner, {skipContention: true, processed: 0});
  });
  it("takeover during listing: the first verify fails; nothing is " +
      "re-driven by the old holder", async () => {
    const w = world();
    const e = await w.lostUpload(crypto.randomUUID());
    w.advance(16 * MIN);
    w.bucket.listFault = async (q, items) => {
      w.bucket.listFault = null;
      w.advance(w.limits.leaseMs + 1);
      await w.mk().reconcileQuarantine({limit: 5}); // takes over, finishes
      return items;
    };
    const out = await w.run();
    assert.equal(out.stoppedFor, "lease-lost");
    assert.equal(out.processed, 0);
    assert.equal(w.record(e).state, "deleted");
    assert.equal(w.bucket.deletes(), 1);
  });
  it("takeover between objects: the old holder stops before the next one",
      async () => {
        const w = world();
        await w.lostUpload("00000000-0000-4000-8000-00000000000a");
        const e2 = await w.lostUpload("00000000-0000-4000-8000-00000000000b");
        w.advance(16 * MIN);
        let fired = false;
        const orig = w.bucket.deleteFault;
        w.bucket.deleteFault = async (x) => {
          if (orig) await orig(x);
          if (!fired) {
            fired = true;
            // after object 1's decision, before its checkpoint: takeover
            w.advance(w.limits.leaseMs + 1);
            const fence = w.state().fence;
            w.db.write(r.STATE_PATH, {...w.state(), fence: fence + 1,
              lease: {holder: "other", fence: fence + 1,
                untilMs: w.clock.t.getTime() + w.limits.leaseMs}});
          }
        };
        const out = await w.run();
        assert.equal(out.stoppedFor, "lease-lost");
        assert.equal(out.processed, 0, "stale checkpoint was a no-op");
        assert.equal(w.record(e2), null, "next object not started");
        assert.equal(w.state().lease.holder, "other");
      });
  it("stale state writes (checkpoint, evidence, error) are no-ops",
      async () => {
        const w = world();
        await w.lostUpload(crypto.randomUUID(), MP4, {generation: "77"});
        w.advance(16 * MIN);
        w.bucket.listFault = async (q, items) => {
          w.bucket.listFault = null;
          w.db.write(r.STATE_PATH, {...w.state(), fence: 99,
            lease: {holder: "other", fence: 99,
              untilMs: w.clock.t.getTime() + w.limits.leaseMs}});
          throw Object.assign(new Error("x"), {code: "list-boom"});
        };
        const before = () => ({...w.state()});
        const out = await w.run();
        assert.equal(out.stoppedFor, "list:list-boom");
        const s = before();
        assert.equal(s.lastError, null, "stale error write refused");
        assert.equal(s.lease.holder, "other");
        assert.deepEqual(w.evidence(), []);
      });
});

describe("bounded failure of reconciliation state transactions", () => {
  it("acquire transaction fails (contention/deadline): bounded result, " +
      "no list, no state", async () => {
    const w = world();
    await w.lostUpload(crypto.randomUUID());
    w.advance(16 * MIN);
    w.db.beforeTransaction = () => {
      w.db.beforeTransaction = null;
      throw Object.assign(new Error("deadline"), {code: 4});
    };
    assert.deepEqual(await w.run(), {acquireError: "4", processed: 0});
    assert.equal(w.bucket.lists.length, 0);
    assert.equal(w.state(), null);
  });
  it("verify transaction fails: stops before the re-drive; lease " +
      "released; the object is presented next time", async () => {
    const w = world();
    const e = await w.lostUpload(crypto.randomUUID());
    w.advance(16 * MIN);
    const at = w.db.txCount + 2; // acquire, then verify
    w.db.beforeTransaction = (n) => {
      if (n === at) {
        w.db.beforeTransaction = null;
        throw Object.assign(new Error("deadline"), {code: 4});
      }
    };
    const out = await w.run();
    assert.equal(out.stoppedFor, "state:4");
    assert.equal(out.processed, 0);
    assert.equal(w.record(e), null, "no re-drive");
    assert.equal(w.state().lease, null);
    assert.deepEqual((await w.run()).outcomes, {"no-reservation": 1});
  });
});

describe("L16/L17 db facade: attempt counting and transaction-read " +
    "validation", () => {
  it("counts logical transactions and callback attempts separately; caps " +
      "attempts at the facade setting", async () => {
    const w = world();
    const facade = r.createDbFacade(w.db, {maxAttempts: 1});
    let n = 0;
    w.db.beforeCommit = ({attempt}) => {
      if (attempt === 0 && n++ === 0) {
        w.db.write(`teams/${TEAM}`, w.db.read(`teams/${TEAM}`));
      }
    };
    await facade.runTransaction(async (tx) => {
      await tx.get(w.db.collection("teams").doc(TEAM));
    });
    assert.equal(facade.lfsCounters.transactions, 1);
    assert.equal(facade.lfsCounters.callbackAttempts, 2,
        "the double retried once on contention");
  });
  it("a film doc malformed between the pre-read and the decision " +
      "transaction is refused at the transaction read (no decision)",
  async () => {
    const w = world();
    const filmId = await w.reserve();
    const e = await w.lostUpload(filmId);
    w.advance(16 * MIN);
    w.bucket.downloadFault = async () => {
      w.bucket.downloadFault = null; // after the pre-read, before the tx
      w.db.write(w.filmPath(filmId), {...w.film(filmId), status: "ready"});
    };
    const out = await w.run();
    assert.deepEqual(out.outcomes, {});
    assert.match(w.evidence()[0].code, /^film-ambiguous:/);
    assert.equal(w.film(filmId).status, "ready");
    assert.equal(w.record(e), null);
  });
  it("malformed between transaction attempt 1 and attempt 2 -> refused " +
      "on the retry read", async () => {
    const w = world({limits: {txMaxAttempts: 3}});
    const filmId = await w.reserve();
    await w.lostUpload(filmId);
    w.advance(16 * MIN);
    let fired = false;
    w.db.beforeCommit = ({attempt, writes}) => {
      if (!fired && attempt === 0 && writes.some((p) =>
        p === w.filmPath(filmId))) {
        fired = true;
        w.db.write(w.filmPath(filmId), {...w.film(filmId),
          objectGeneration: "12a", status: "validating"});
      }
    };
    const out = await w.run();
    assert.equal(fired, true);
    assert.deepEqual(out.outcomes, {});
    assert.match(w.evidence()[0].code, /^film-ambiguous:/);
  });
});

describe("L18 listing metadata fails closed", () => {
  const cases = {
    "generation number": {generation: 1001},
    "generation non-decimal": {generation: "12a"},
    "size missing": {size: undefined},
    "size non-integer": {size: "3.5"},
    "size over max": {size: String(LIMITS.maxBytes + 1)},
    "contentType missing": {contentType: undefined},
    "contentType unsupported": {contentType: "video/quicktime"},
    "timeCreated invalid": {timeCreated: "yesterday"},
    "timeCreated future": {timeCreated: "2030-01-01T00:00:00.000Z"},
    "name noncanonical": {name: "quarantine/team-lfs/ABC/source.mp4"},
  };
  for (const [name, patch] of Object.entries(cases)) {
    it(`${name}: evidence, no re-drive, no record`, async () => {
      const w = world();
      const filmId = await w.reserve();
      await w.lostUpload(filmId);
      w.advance(16 * MIN);
      w.bucket.listFault = async (q, items) => items.map((it) => {
        const x = {...it, ...patch};
        for (const k of Object.keys(x)) if (x[k] === undefined) delete x[k];
        return x;
      });
      const out = await w.run();
      assert.deepEqual(out.outcomes, {});
      assert.equal(out.evidence, 1);
      assert.equal(w.film(filmId).status, "reserved");
      assert.deepEqual(w.records(), []);
      const ev = w.evidence()[0];
      assert.ok(ev.code === "name-noncanonical" ||
        ev.code.startsWith("listing-malformed:"), ev.code);
      assert.deepEqual(Object.keys(ev).sort(), ["bucket", "code", "count",
        "firstAtMs", "generation", "lastAtMs", "lastPassId", "name",
        "policyRevision", "project", "schema"]);
    });
  }
  it("evidence identity is bound to project/bucket/policy: a target " +
      "change never merges evidence", () => {
    const a = r.evidenceIdFor("p1", "b1", "lfs-r3.2", "n", "1");
    assert.notEqual(a, r.evidenceIdFor("p2", "b1", "lfs-r3.2", "n", "1"));
    assert.notEqual(a, r.evidenceIdFor("p1", "b2", "lfs-r3.2", "n", "1"));
    assert.notEqual(a, r.evidenceIdFor("p1", "b1", "lfs-r4", "n", "1"));
  });
});

describe("L19 coverage with budget for exactly one object per invocation",
    () => {
      it("N quiescent objects -> N progress-making invocations plus the " +
          "pass-end listing", async () => {
        const w = world();
        const N = 4;
        for (let i = 0; i < N; i++) {
          await w.lostUpload(`00000000-0000-4000-8000-${String(i)
              .padStart(12, "0")}`);
        }
        w.advance(16 * MIN);
        let invocations = 0;
        let ended = false;
        while (!ended && invocations < 3 * N) {
          const out = await w.run(1);
          invocations += 1;
          ended = out.passEnded;
        }
        assert.ok(invocations <= N + 1, String(invocations));
        assert.equal(w.records().length, N);
      });
    });

describe("boundary: limits are TEST placeholders derived from the envelope",
    () => {
      it("lease outlives one object's whole transport envelope", () => {
        const L = r.RECONCILE_LIMITS;
        assert.equal(L.status, "TEST_PLACEHOLDER");
        assert.ok(L.leaseMs > L.objectEnvelopeMs);
        assert.equal(r.RECONCILE_DESIGNATION.designation, "TEST_ONLY");
      });
    });

describe("PR87 F1: pagination is authoritative (short pages, tokens)", () => {
  const stable = async (w, n) => {
    const es = [];
    for (let i = 0; i < n; i++) {
      es.push(await w.lostUpload(`00000000-0000-4000-9000-${String(i)
          .padStart(12, "0")}`));
    }
    return es;
  };
  it("short pages WITH a continuation token never end the pass; every " +
      "stable object is presented (Codex reproducer shape)", async () => {
    const w = world();
    const es = await stable(w, 3);
    w.advance(16 * MIN);
    w.bucket.pageCap = 2; // GCS may return fewer items than maxResults
    // transient heads keep every object live (presented, never deleted)
    w.bucket.downloadFault = async () => {
      throw Object.assign(new Error("reset"), {code: "ECONNRESET"});
    };
    const seen = new Set();
    let ended = 0;
    for (let i = 0; i < 4; i++) {
      const out = await w.run(50);
      ended += out.passEnded ? 1 : 0;
      for (const ev of w.evidence()) seen.add(ev.name);
    }
    assert.deepEqual([...seen].sort(), es.map((e) => e.name).sort(),
        "the third object is reached");
    assert.ok(ended >= 1);
    assert.ok(w.bucket.lists.some((q) => q.pageToken),
        "the continuation token was followed");
  });
  it("an empty or overlap-only page with a token advances by the token " +
      "(no indefinite prefix replay)", async () => {
    const w = world();
    const es = await stable(w, 2);
    w.advance(16 * MIN);
    let first = true;
    w.bucket.listFault = async (q, items, token) => {
      if (first) {
        first = false;
        // empty page whose token resumes before everything: listing goes on
        return {items: [], token: `tok:${Buffer.from("quarantine/")
            .toString("base64url")}`};
      }
      return {items, token};
    };
    const out = await w.run(50);
    assert.equal(out.processed, 2);
    assert.equal(out.passEnded, true);
    for (const e of es) assert.equal(w.record(e).state, "deleted");
  });
  it("a persisted token resumes the SAME query in the next invocation " +
      "and covers the rest even after earlier objects were deleted",
  async () => {
    const w = world({limits: {listsMax: 1}});
    const es = await stable(w, 3);
    w.advance(16 * MIN);
    w.bucket.pageCap = 2;
    assert.equal((await w.run(50)).processed, 2);
    const out = await w.run(50);
    assert.equal(w.bucket.lists[1].pageToken,
        `tok:${Buffer.from(es[1].name).toString("base64url")}`);
    assert.equal(out.processed, 1);
    assert.equal(out.passEnded, true);
    for (const e of es) assert.equal(w.record(e).state, "deleted");
  });
  it("a page token is persisted across invocations; an invalid/expired " +
      "token (400) is cleared with evidence and the next run restarts " +
      "from the name cursor", async () => {
    const w = world({limits: {listsMax: 1}});
    const es = await stable(w, 3);
    w.advance(16 * MIN);
    w.bucket.pageCap = 2;
    let out = await w.run(50);
    assert.equal(out.processed, 2);
    assert.deepEqual(w.state().listQuery, {startOffset: null,
      pageToken: `tok:${Buffer.from(es[1].name).toString("base64url")}`});
    w.db.write(r.STATE_PATH, {...w.state(), listQuery: {startOffset: null,
      pageToken: "garbage"}});
    out = await w.run(50);
    assert.equal(out.stoppedFor, "list:page-token-invalid");
    assert.equal(w.state().listQuery, null);
    assert.equal(w.state().lastError.code, "page-token-invalid");
    out = await w.run(50);
    assert.equal(w.bucket.lists.at(-1).startOffset, es[1].name);
    assert.equal(w.record(es[2]).state, "deleted");
  });
});

describe("PR87 F2: discovery/transport target binding", () => {
  it("facade bucket differs from the configured bucket: fail closed " +
      "before any list or state write", async () => {
    const w = world();
    await w.lostUpload(crypto.randomUUID());
    w.advance(16 * MIN);
    w.cfg.bucket = "demo-other.appspot.com";
    assert.deepEqual(await w.run(), {targetMismatch: true, processed: 0});
    assert.equal(w.bucket.lists.length, 0);
    assert.equal(w.state(), null);
    assert.deepEqual(w.records(), []);
    assert.equal(w.bucket.objects.size, 1);
  });
  it("configuration changes mid-invocation: the run stops before the " +
      "next object; records stay bound to the pinned (facade) bucket",
  async () => {
    const w = world();
    const a = await w.lostUpload("00000000-0000-4000-8000-00000000000a");
    const b = await w.lostUpload("00000000-0000-4000-8000-00000000000b");
    w.advance(16 * MIN);
    w.bucket.deleteFault = async () => {
      w.bucket.deleteFault = null;
      w.cfg.bucket = "demo-other.appspot.com"; // during object a
    };
    const out = await w.run();
    assert.equal(out.stoppedFor, "config-changed");
    assert.equal(out.processed, 1);
    assert.equal(w.record(a).bucket, BKT);
    assert.equal(w.record(a).state, "deleted");
    assert.equal(w.record(b), null);
    assert.ok(w.records().every((x) => x.bucket === BKT));
  });
});

describe("PR87 F3: admission reserves the derived envelope", () => {
  it("defaults: object budget = derived envelope; invocation covers it; " +
      "lease covers envelope + background tail; trigger timeout covers " +
      "the invocation", () => {
    const L = r.RECONCILE_LIMITS;
    assert.equal(L.objectBudgetMs, L.objectEnvelopeMs);
    assert.ok(L.invocationBudgetMs >= L.objectBudgetMs);
    assert.ok(L.leaseMs >= L.objectEnvelopeMs + L.backgroundTailMs);
    const t = r.defineReconcileTrigger({run: async () => {},
      isEnabled: () => false});
    assert.ok(t.__endpoint.timeoutSeconds * 1000 >= L.invocationBudgetMs);
    assert.throws(() => r.deriveLimits(undefined, {objectBudgetMs: 10,
      invocationBudgetMs: 5}), RangeError);
  });
  it("insufficient remaining budget: no head read, no decision, no " +
      "state progress for that object", async () => {
    const w = world({limits: {objectBudgetMs: 10 * MIN,
      invocationBudgetMs: 10 * MIN}});
    const filmId = await w.reserve();
    await w.lostUpload(filmId);
    w.advance(16 * MIN);
    w.bucket.listFault = async (q, items, token) => {
      w.mono.t += 1; // the listing itself used a little budget
      return {items, token};
    };
    const out = await w.run();
    assert.equal(out.stoppedFor, "budget");
    assert.equal(out.processed, 0);
    assert.ok(!w.bucket.calls.some((x) => x[0] === "download"));
    assert.equal(w.film(filmId).status, "reserved");
    assert.equal(w.state().afterName, null);
  });
});

describe("PR87 F4: ambiguous acquire (committed remotely, error locally)",
    () => {
      it("release-if-mine clears the orphaned lease; the next run proceeds",
          async () => {
            const w = world();
            const e = await w.lostUpload(crypto.randomUUID());
            w.advance(16 * MIN);
            let ambiguous = true;
            const inner = w.db;
            const flaky = new Proxy(inner, {get(target, k) {
              if (k === "runTransaction") {
                return async (fn, o) => {
                  const res = await target.runTransaction(fn, o);
                  if (ambiguous) {
                    ambiguous = false; // committed, then the reply is lost
                    throw Object.assign(new Error("deadline"), {code: 4});
                  }
                  return res;
                };
              }
              const v = target[k];
              return typeof v === "function" ? v.bind(target) : v;
            }});
            const rc = w.mk({db: flaky});
            assert.deepEqual(await rc.reconcileQuarantine({limit: 5}),
                {acquireError: "4", processed: 0});
            assert.equal(w.state().lease, null, "orphaned lease released");
            assert.deepEqual((await w.run()).outcomes,
                {"no-reservation": 1});
            assert.equal(w.record(e).state, "deleted");
          });
    });

describe("PR87 c-6312514310: cursor uses the service UTF-8 order", () => {
  const A = "quarantine//source.mp4";
  const B = "quarantine/\u{10000}/source.mp4";
  const put = (w) => {
    for (const n of [A, B]) {
      w.bucket.put(n, MP4, "video/mp4", undefined,
          {timeCreated: w.clock.t.toISOString()});
    }
    w.advance(16 * MIN);
    w.bucket.pageCap = 1;
  };
  const ev = (w) => Object.fromEntries(w.evidence().map((e) =>
    [e.name, e.count]));
  const untouched = (w) => {
    assert.ok(!w.bucket.calls.some((x) => x[0] === "download"), "no head");
    assert.equal(w.bucket.deletes(), 0);
    assert.deepEqual(w.records(), []);
    assert.equal(w.bucket.objects.size, 2);
  };
  it("short pages with tokens: both noncanonical names get evidence on " +
      "every pass (failed on ff7ec57: B never)", async () => {
    const w = world();
    put(w);
    for (let i = 0; i < 3; i++) {
      const out = await w.run(10);
      assert.equal(out.processed, 2, JSON.stringify(out));
      assert.equal(out.passEnded, true);
    }
    assert.deepEqual(ev(w), {[A]: 3, [B]: 3});
    untouched(w);
  });
  it("partial budgets (limit 1, and the invocation budget) resume in " +
      "UTF-8 order and reach B", async () => {
    const w = world();
    put(w);
    assert.equal((await w.run(1)).processed, 1);
    assert.deepEqual(ev(w), {[A]: 1});
    let out = await w.run(1);
    assert.equal(out.processed, 1);
    assert.equal(out.passEnded, true);
    assert.deepEqual(ev(w), {[A]: 1, [B]: 1});
    const b = world({limits: {objectBudgetMs: 1000,
      invocationBudgetMs: 1500}});
    put(b);
    let charged = false;
    b.bucket.listFault = async (q, items, token) => {
      if (q.pageToken && !charged) {
        charged = true;
        b.mono.t += 600; // late continuation page in the first invocation
      }
      return {items, token};
    };
    out = await b.run(10);
    assert.equal(out.stoppedFor, "budget");
    assert.deepEqual(ev(b), {[A]: 1});
    out = await b.run(10);
    assert.equal(out.passEnded, true);
    assert.deepEqual(ev(b), {[A]: 1, [B]: 1});
    untouched(w);
    untouched(b);
  });
});

describe("PR87 R-1 (c-6312585072): a non-advancing continuation is " +
    "detected, recorded durably and resumed by name", () => {
  const items = [1, 2, 3].map((n) => ({name: c.uploadPathFor("team",
      `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`),
  generation: String(n), size: "32", contentType: "video/mp4",
  timeCreated: "2026-10-21T00:00:00Z"}));
  /** Reviewer probe harness (pagination-token.cjs), heads always 503. */
  const probe = (list) => {
    const db = new FakeFirestore();
    const calls = [];
    const storage = {name: "demo-pages.appspot.com", async listObjects(q) {
      calls.push({...q});
      return list(q);
    }, file() {
      return {async download() {
        throw Object.assign(new Error("temporary"), {code: 503});
      }};
    }};
    const rc = r.createQuarantineReconciler({db, Timestamp: FakeTimestamp,
      storage, bucketName: () => storage.name, project: "demo-pages",
      now: () => new Date("2026-10-21T00:20:00Z"),
      logger: {info() {}, warn() {}, error() {}}});
    const ev = () => db.paths(r.EVIDENCE_COLLECTION + "/")
        .map((p) => db.read(p).name.split("/")[2].slice(-1)).sort();
    return {db, calls, rc, ev, st: () => db.read(r.STATE_PATH)};
  };
  it("reviewer double (b), token ignored and repeated: the stalling " +
      "invocation records list-no-progress; the third object is reached " +
      "(failed on ff7ec57: [2,0,0,0], lastError null)", async () => {
    const p = probe((q) => {
      const tail = items.filter((x) => !q.startOffset ||
        x.name >= q.startOffset);
      return {items: tail.slice(0, 2), nextPageToken: tail.length > 2 ?
        "more" : null};
    });
    const first = await p.rc.reconcileQuarantine({limit: 10});
    assert.equal(first.processed, 2);
    assert.equal(first.stoppedFor, "list:no-progress");
    assert.equal(p.st().lastError.code, "list-no-progress");
    assert.equal(p.st().consecutiveFailures, 1);
    assert.equal(p.st().listQuery, null, "falls back to the name cursor");
    assert.equal(p.st().afterName, items[1].name);
    const second = await p.rc.reconcileQuarantine({limit: 10});
    assert.equal(p.calls.at(-1).startOffset, items[1].name);
    assert.equal(second.processed, 1);
    assert.equal(second.passEnded, true);
    assert.deepEqual(p.ev(), ["1", "2", "3"], "third reached");
    assert.ok(r.stateSchema.safeParse(p.st()).success);
  });
  it("a FRESH token each time, always empty (N-1): indistinguishable " +
      "from a long legitimate empty run, so it is FOLLOWED, never falls " +
      "back; from listStallMax each page records list-stalled durably",
  async () => {
    let n = 0;
    const p = probe((q) => {
      if (q.pageToken) return {items: [], nextPageToken: `t${++n}`};
      return {items: items.slice(0, 1), nextPageToken: `t${++n}`};
    });
    assert.equal(r.RECONCILE_LIMITS.listStallMax, 3);
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const out = await p.rc.reconcileQuarantine({limit: 10});
      const st = p.st();
      runs.push([out.processed, out.stoppedFor, out.listStalled || 0,
        st.listStalls, st.lastError && st.lastError.code,
        st.consecutiveFailures]);
    }
    assert.deepEqual(runs, [
      [1, "list-limit", 0, 1, null, 0], // object 1; one empty continuation
      [0, "list-limit", 1, 3, "list-stalled", 1], // stalls 2, 3
      [0, "list-limit", 2, 5, "list-stalled", 3], // stalls 4, 5
    ]);
    assert.ok(p.calls.slice(1).every((q) => q.pageToken), "never restarted");
    assert.equal(p.st().stallTokens.length, 5);
  });
  it("a CYCLING token (t1, t2, t1, ...) is evidence of non-advance: " +
      "list-no-progress, fallback to the name cursor", async () => {
    const p = probe((q) => {
      if (!q.pageToken) {
        const tail = items.filter((x) => !q.startOffset ||
          x.name > q.startOffset);
        return {items: tail.slice(0, 1), nextPageToken: "t1"};
      }
      return {items: [], nextPageToken: q.pageToken === "t1" ? "t2" : "t1"};
    });
    let out = await p.rc.reconcileQuarantine({limit: 10}); // t1 -> t2
    assert.equal(out.stoppedFor, "list-limit");
    out = await p.rc.reconcileQuarantine({limit: 10}); // t2 -> t1: repeat
    assert.equal(out.stoppedFor, "list:no-progress");
    assert.equal(p.st().lastError.code, "list-no-progress");
    assert.equal(p.st().listQuery, null);
    assert.deepEqual(p.st().stallTokens, []);
    out = await p.rc.reconcileQuarantine({limit: 10});
    assert.equal(p.calls.at(-2).startOffset, items[0].name);
    assert.equal(out.processed, 1);
  });
  for (const k of [3, 5]) {
    it(`${k} legitimate empty pages with ADVANCING tokens before the ` +
        "object (N-1; reviewer empty-run.cjs shape): the object is reached " +
        "within bounded runs; never a fallback (failed on e7fdff3)",
    async () => {
      const item = {...items[0], name: c.uploadPathFor("team",
          "00000000-0000-4000-8000-000000000009"), generation: "9"};
      const p = probe((q) => {
        const n = q.pageToken ? Number(q.pageToken.slice(1)) : 0;
        return n < k ? {items: [], nextPageToken: "t" + (n + 1)} :
          {items: [item], nextPageToken: null};
      });
      const runs = [];
      for (let i = 0; i < 6 && !runs.includes("END"); i++) {
        const x = await p.rc.reconcileQuarantine({limit: 10});
        runs.push(x.passEnded ? "END" : x.stoppedFor);
      }
      assert.ok(runs.includes("END"), JSON.stringify(runs));
      assert.ok(!runs.includes("list:no-progress"), JSON.stringify(runs));
      assert.ok(runs.length <= Math.ceil((k + 1) / 2), JSON.stringify(runs));
      assert.deepEqual(p.ev(), ["9"]);
      assert.equal(p.st().lastError, null, "cleared by the checkpoint");
      assert.equal(p.st().listStalls, 0);
    });
  }
  it("a legitimate empty page with an advancing token is followed with " +
      "no error", async () => {
    let served = false;
    const p = probe((q) => {
      if (!q.pageToken && !served) {
        served = true;
        return {items: [], nextPageToken: "advance"};
      }
      return {items, nextPageToken: null};
    });
    const out = await p.rc.reconcileQuarantine({limit: 10});
    assert.equal(out.processed, 3);
    assert.equal(out.passEnded, true);
    assert.equal(p.st().lastError, null);
    assert.equal(p.st().listStalls, 0);
  });
});

describe("PR87 R-2: a lease that may outlive the invocation is reported",
    () => {
      // empty listing: transactions are acquire (1), pass end (2), fenced
      // release (3) and, only if 3 fails, release-if-mine (4)
      for (const [fail, leaked] of [[[3, 4], true], [[3], false], [[], false]]) {
        it(`failing transactions ${JSON.stringify(fail)}: releaseError ` +
            `${leaked ? "reported, lease left until expiry" : "absent"}`,
        async () => {
          const w = world();
          let n = 0;
          const flaky = new Proxy(w.db, {get(target, k) {
            if (k === "runTransaction") {
              return async (fn, o) => {
                n += 1;
                if (fail.includes(n)) {
                  // committed or not: the reply is a deadline either way
                  throw Object.assign(new Error("deadline"), {code: 4});
                }
                return target.runTransaction(fn, o);
              };
            }
            const v = target[k];
            return typeof v === "function" ? v.bind(target) : v;
          }});
          const out = await w.mk({db: flaky}).reconcileQuarantine({limit: 5});
          assert.equal(out.passEnded, true);
          assert.equal(n, fail.length ? 4 : 3);
          assert.equal(out.releaseError, leaked ? "4" : undefined);
          assert.equal(w.state().lease !== null, leaked);
        });
      }
    });
