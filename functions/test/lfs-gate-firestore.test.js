"use strict";
// LFS acceptance item #1 (STOP gate), Firestore half, EMULATOR branch
// (FIRESTORE_EMULATOR_HOST pointing at a fake gRPC Firestore). Pinned
// @google-cloud/firestore over gRPC, configured by
// lfs-transport.createBoundedFirestore. Proves, by SERVER-observed
// cancellation, that every attempt is cut at the configured per-RPC deadline,
// and COUNTS every SDK retry layer (lfs-transport FIRESTORE_LAYERS) so the
// per-object envelope is derived from measured limits. Each test owns its
// own fake server. Production branch (TLS + bounded token auth):
// lfs-gate-firestore-prod.test.js.
const {describe, it, after} = require("node:test");
const assert = require("node:assert/strict");
const grpc = require("@grpc/grpc-js");
const {Firestore} = require("@google-cloud/firestore");
const t = require("../src/film/lfs-transport");
const {startFakeFirestore, bgdMissing, attemptRecorder, unsent} =
  require("./lfs-gate-helpers");

const T = 200;
const CUT_SLACK = 300;
const LIM = {...t.LFS_TRANSPORT_LIMITS, firestoreRpcMs: T};
const E = t.firestoreEnvelope(T);
// Deadline for tests whose ANSWERED calls must succeed before the measured
// hang (PR87 N-2: under CPU load an answered read can exceed 200 ms). The
// cut is still asserted against the deadline actually configured.
const TA = 1000;
const LIMA = {...t.LFS_TRANSPORT_LIMITS, firestoreRpcMs: TA};
const EA = t.firestoreEnvelope(TA);
const L = t.FIRESTORE_LAYERS;

/** A fresh fake server and a bounded client bound to it (emulator). */
async function world(behavior = {}, limits = LIM) {
  const srv = await startFakeFirestore(grpc, behavior);
  const prev = process.env.FIRESTORE_EMULATOR_HOST;
  process.env.FIRESTORE_EMULATOR_HOST = `127.0.0.1:${srv.port}`;
  const rec = attemptRecorder();
  const db = t.createBoundedFirestore({Firestore, projectId: "demo-lfs-gate",
    limits, settings: {"grpc.callInvocationTransformer":
      rec.transformer}});
  if (prev === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
  else process.env.FIRESTORE_EMULATOR_HOST = prev;
  closers.push(async () => {
    await db.terminate();
    srv.close();
  });
  return {srv, db, attempts: rec.attempts};
}
const closers = [];
after(async () => {
  for (const c of closers) await c();
});
const calls = (srv, m) => srv.log.filter((x) => x.m === m);
const assertEachCut = (recs, deadline = T) => {
  assert.ok(recs.length > 0);
  for (const r of recs) {
    assert.ok(r.cancelledAt !== null, `${r.m} cancelled server-side`);
    assert.ok(r.cancelledAt - r.at <= deadline + CUT_SLACK,
        `${r.m} cut after ${r.cancelledAt - r.at} ms`);
  }
};
const settle = (ms) => new Promise((r) => setTimeout(r, ms));
/**
 * Establish the channel with one ANSWERED read before a measured
 * transaction (PR87 N-2): under CPU load the first RPC on a fresh channel
 * can spend its whole deadline waiting for the connection ("Waiting for LB
 * pick"), failing the precondition read before Commit is ever reached. The
 * warm-up read is outside the measurement; Commit/Rollback bounds are
 * unchanged.
 * @param {object} db
 */
const warm = async (db) => {
  await db.doc("c/warm").get();
};
const dump = (attempts) => JSON.stringify(attempts.map((a) => [a.m, a.code,
  a.details]));

/**
 * Client attempts for method m, reconciled with the server log (PR87 N-2):
 * every attempt has a final status; every attempt that was SENT is observed
 * by the server; an unsent one ended DEADLINE_EXCEEDED before any transport
 * was picked. Retry bounds are asserted on the CLIENT count.
 * @param {object[]} attempts recorder attempts
 * @param {object[]} recs server records for m
 * @param {string} m
 * @return {object[]} client attempts for m
 */
const reconcile = (attempts, recs, m) => {
  const mine = attempts.filter((a) => a.m === m);
  const info = JSON.stringify(mine.map((a) => [a.code, a.details]));
  for (const a of mine) assert.notEqual(a.code, null, info);
  for (const a of mine.filter(unsent)) assert.equal(a.code, 4, info);
  assert.equal(recs.length, mine.filter((a) => !unsent(a)).length, info);
  return mine;
};

describe("Firestore transport bound, emulator branch", {concurrency: true},
    () => {
      it("hung server-streaming read (doc get): exactly 5 x 3 attempts, " +
          "each cut at the deadline; total within the envelope",
      {timeout: 180000}, async () => {
        const {srv, db, attempts} = await world();
        const t0 = Date.now();
        await assert.rejects(db.doc("c/hang-get").get(), (e) => e.code === 4);
        const ms = Date.now() - t0;
        await settle(T + 300);
        const recs = calls(srv, "BatchGetDocuments");
        const mine = reconcile(attempts, recs, "BatchGetDocuments");
        assert.equal(mine.length, L.retryAttempts * L.streamCallsPerAttempt);
        assert.ok(mine.every((a) => a.code === 4));
        assertEachCut(recs);
        assert.ok(ms <= E.streamRead, `${ms} ms > ${E.streamRead}`);
      });
      it("hung RunQuery: exactly 15 attempts, each cut; within the envelope",
          {timeout: 180000}, async () => {
            const {srv, db, attempts} = await world();
            const t0 = Date.now();
            await assert.rejects(db.collection("q").where("x", "<=", 1)
                .limit(1).get(), (e) => e.code === 4);
            const ms = Date.now() - t0;
            await settle(T + 300);
            const recs = calls(srv, "RunQuery");
            const mine = reconcile(attempts, recs, "RunQuery");
            assert.equal(mine.length,
                L.retryAttempts * L.streamCallsPerAttempt);
            assert.ok(mine.every((a) => a.code === 4));
            assertEachCut(recs);
            assert.ok(ms <= E.streamRead, `${ms} ms > ${E.streamRead}`);
          });
      it("transaction, reads answer, Commit hangs, maxAttempts 1: Commit " +
          "called once (DEADLINE not retryable for commit), cut; background Rollback bounded and cut; " +
          "within the envelope", {timeout: 180000}, async () => {
        const {srv, db, attempts} = await world({BatchGetDocuments:
          bgdMissing}, LIMA);
        await warm(db);
        const t0 = Date.now();
        await assert.rejects(db.runTransaction(async (tx) => {
          await tx.get(db.doc("c/commit-tx"));
          tx.set(db.doc("c/commit-tx-w"), {x: 1});
        }, {maxAttempts: 1}), (e) => e.code === 4);
        const ms = Date.now() - t0;
        await settle(EA.unary + 500); // the SDK's background rollback drains
        const commits = calls(srv, "Commit");
        // DEADLINE_EXCEEDED is not in the SDK's commit retry codes: 1 call
        assert.equal(reconcile(attempts, commits, "Commit").length, 1,
            dump(attempts));
        assertEachCut(commits, TA);
        const rollbacks = calls(srv, "Rollback");
        const rb = reconcile(attempts, rollbacks, "Rollback").length;
        assert.ok(rb >= 1 && rb <= L.retryAttempts, String(rb));
        assertEachCut(rollbacks, TA);
        assert.ok(ms <= EA.txAttempt(1), `${ms} > ${EA.txAttempt(1)}`);
      });
      it("Commit failing UNAVAILABLE (retryable): at most 5 calls (the " +
          "Firestore._retry layer); within the unary envelope",
      {timeout: 180000}, async () => {
        const {srv, db, attempts} = await world({BatchGetDocuments:
          bgdMissing, Commit: (call, cb) => cb({code: grpc.status.UNAVAILABLE,
          details: "synthetic"})}, LIMA);
        await warm(db);
        const t0 = Date.now();
        await assert.rejects(db.runTransaction(async (tx) => {
          await tx.get(db.doc("c/unavail"));
          tx.set(db.doc("c/unavail-w"), {x: 1});
        }, {maxAttempts: 1}));
        const ms = Date.now() - t0;
        await settle(100);
        const n = reconcile(attempts, calls(srv, "Commit"), "Commit").length;
        assert.ok(n >= 1 && n <= L.retryAttempts, `${n} ${dump(attempts)}`);
        assert.ok(ms <= EA.txAttempt(1), `${ms} > ${EA.txAttempt(1)}`);
      });
      it("transaction whose read hangs, maxAttempts 2: reads <= 2 x 15, " +
          "each cut; within 2 attempts + backoff", {timeout: 360000},
      async () => {
        const {srv, db, attempts} = await world();
        const t0 = Date.now();
        await assert.rejects(db.runTransaction(async (tx) => {
          await tx.get(db.doc("hang-tx/r"));
          tx.set(db.doc("hang-tx/w"), {x: 1});
        }, {maxAttempts: 2}), (e) => e.code === 4);
        const ms = Date.now() - t0;
        await settle(E.unary + 500);
        const reads = calls(srv, "BatchGetDocuments");
        const nr = reconcile(attempts, reads, "BatchGetDocuments").length;
        assert.ok(nr <= 2 * L.retryAttempts * L.streamCallsPerAttempt,
            String(nr));
        assertEachCut(reads);
        const bound = 2 * E.txAttempt(1) + L.txBackoffMaxMs(2);
        assert.ok(ms <= bound, `${ms} > ${bound}`);
      });
      it("configured deadline and no gax retry codes on every RPC", () => {
        const cfg = t.firestoreClientConfig(T);
        const m = cfg.interfaces["google.firestore.v1.Firestore"].methods;
        for (const name of t.FIRESTORE_METHODS) {
          assert.equal(m[name].timeout_millis, T);
          assert.equal(m[name].retry_codes_name, "none");
        }
      });
    });
