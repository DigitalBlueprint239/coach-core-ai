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
const {startFakeFirestore, bgdMissing} = require("./lfs-gate-helpers");

const T = 200;
const CUT_SLACK = 300;
const LIM = {...t.LFS_TRANSPORT_LIMITS, firestoreRpcMs: T};
const E = t.firestoreEnvelope(T);
const L = t.FIRESTORE_LAYERS;

/** A fresh fake server and a bounded client bound to it (emulator). */
async function world(behavior = {}) {
  const srv = await startFakeFirestore(grpc, behavior);
  const prev = process.env.FIRESTORE_EMULATOR_HOST;
  process.env.FIRESTORE_EMULATOR_HOST = `127.0.0.1:${srv.port}`;
  const db = t.createBoundedFirestore({Firestore, projectId: "demo-lfs-gate",
    limits: LIM});
  if (prev === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
  else process.env.FIRESTORE_EMULATOR_HOST = prev;
  closers.push(async () => {
    await db.terminate();
    srv.close();
  });
  return {srv, db};
}
const closers = [];
after(async () => {
  for (const c of closers) await c();
});
const calls = (srv, m) => srv.log.filter((x) => x.m === m);
const assertEachCut = (recs) => {
  assert.ok(recs.length > 0);
  for (const r of recs) {
    assert.ok(r.cancelledAt !== null, `${r.m} cancelled server-side`);
    assert.ok(r.cancelledAt - r.at <= T + CUT_SLACK,
        `${r.m} cut after ${r.cancelledAt - r.at} ms`);
  }
};
const settle = (ms) => new Promise((r) => setTimeout(r, ms));

describe("Firestore transport bound, emulator branch", {concurrency: true},
    () => {
      it("hung server-streaming read (doc get): exactly 5 x 3 attempts, " +
          "each cut at the deadline; total within the envelope",
      {timeout: 180000}, async () => {
        const {srv, db} = await world();
        const t0 = Date.now();
        await assert.rejects(db.doc("c/hang-get").get(), (e) => e.code === 4);
        const ms = Date.now() - t0;
        await settle(T + 300);
        const recs = calls(srv, "BatchGetDocuments");
        assert.equal(recs.length, L.retryAttempts * L.streamCallsPerAttempt);
        assertEachCut(recs);
        assert.ok(ms <= E.streamRead, `${ms} ms > ${E.streamRead}`);
      });
      it("hung RunQuery: exactly 15 attempts, each cut; within the envelope",
          {timeout: 180000}, async () => {
            const {srv, db} = await world();
            const t0 = Date.now();
            await assert.rejects(db.collection("q").where("x", "<=", 1)
                .limit(1).get(), (e) => e.code === 4);
            const ms = Date.now() - t0;
            await settle(T + 300);
            const recs = calls(srv, "RunQuery");
            assert.equal(recs.length,
                L.retryAttempts * L.streamCallsPerAttempt);
            assertEachCut(recs);
            assert.ok(ms <= E.streamRead, `${ms} ms > ${E.streamRead}`);
          });
      it("transaction, reads answer, Commit hangs, maxAttempts 1: Commit " +
          "called once (DEADLINE not retryable for commit), cut; background Rollback bounded and cut; " +
          "within the envelope", {timeout: 180000}, async () => {
        const {srv, db} = await world({BatchGetDocuments: bgdMissing});
        const t0 = Date.now();
        await assert.rejects(db.runTransaction(async (tx) => {
          await tx.get(db.doc("c/commit-tx"));
          tx.set(db.doc("c/commit-tx-w"), {x: 1});
        }, {maxAttempts: 1}), (e) => e.code === 4);
        const ms = Date.now() - t0;
        await settle(E.unary + 500); // the SDK's background rollback drains
        const commits = calls(srv, "Commit");
        // DEADLINE_EXCEEDED is not in the SDK's commit retry codes: 1 call
        assert.equal(commits.length, 1);
        assertEachCut(commits);
        const rollbacks = calls(srv, "Rollback");
        assert.ok(rollbacks.length >= 1 &&
          rollbacks.length <= L.retryAttempts, String(rollbacks.length));
        assertEachCut(rollbacks);
        assert.ok(ms <= E.txAttempt(1), `${ms} > ${E.txAttempt(1)}`);
      });
      it("Commit failing UNAVAILABLE (retryable): at most 5 calls (the " +
          "Firestore._retry layer); within the unary envelope",
      {timeout: 180000}, async () => {
        const {srv, db} = await world({BatchGetDocuments: bgdMissing,
          Commit: (call, cb) => cb({code: grpc.status.UNAVAILABLE,
            details: "synthetic"})});
        const t0 = Date.now();
        await assert.rejects(db.runTransaction(async (tx) => {
          await tx.get(db.doc("c/unavail"));
          tx.set(db.doc("c/unavail-w"), {x: 1});
        }, {maxAttempts: 1}));
        const ms = Date.now() - t0;
        const n = calls(srv, "Commit").length;
        assert.ok(n >= 1 && n <= L.retryAttempts, String(n));
        assert.ok(ms <= E.txAttempt(1), `${ms} > ${E.txAttempt(1)}`);
      });
      it("transaction whose read hangs, maxAttempts 2: reads <= 2 x 15, " +
          "each cut; within 2 attempts + backoff", {timeout: 360000},
      async () => {
        const {srv, db} = await world();
        const t0 = Date.now();
        await assert.rejects(db.runTransaction(async (tx) => {
          await tx.get(db.doc("hang-tx/r"));
          tx.set(db.doc("hang-tx/w"), {x: 1});
        }, {maxAttempts: 2}), (e) => e.code === 4);
        const ms = Date.now() - t0;
        await settle(E.unary + 500);
        const reads = calls(srv, "BatchGetDocuments");
        assert.ok(reads.length <= 2 * L.retryAttempts *
          L.streamCallsPerAttempt, String(reads.length));
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
