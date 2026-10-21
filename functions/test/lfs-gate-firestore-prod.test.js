"use strict";
// LFS acceptance item #1 (STOP gate), Firestore half, PRODUCTION branch: the
// SDK's default TLS channel (grpc createSsl with default roots) plus call
// credentials from the facade-owned bounded token provider, against a
// loopback TLS gRPC stand-in (controlled transport interceptor: a throwaway
// self-signed localhost certificate installed as the default roots through
// GRPC_DEFAULT_SSL_ROOTS_FILE_PATH, read once by grpc-js at load). No real
// endpoint, no real credentials. Separate process from the emulator branch.
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const {execFileSync} = require("node:child_process");

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "lfs-tls-"));
execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes",
  "-keyout", path.join(DIR, "key.pem"), "-out", path.join(DIR, "cert.pem"),
  "-days", "1", "-subj", "/CN=localhost",
  "-addext", "subjectAltName=DNS:localhost"], {stdio: "ignore"});
process.env.GRPC_DEFAULT_SSL_ROOTS_FILE_PATH = path.join(DIR, "cert.pem");
delete process.env.FIRESTORE_EMULATOR_HOST;

const {describe, it, after} = require("node:test");
const assert = require("node:assert/strict");
const grpc = require("@grpc/grpc-js");
const {Firestore} = require("@google-cloud/firestore");
const t = require("../src/film/lfs-transport");
const {startFakeFirestore, startHttp, until, bgdMissing, attemptRecorder,
  unsent} = require("./lfs-gate-helpers");

const T = 200;
const CUT_SLACK = 300;
const LIM = {...t.LFS_TRANSPORT_LIMITS, firestoreRpcMs: T,
  tokenRequestMs: 300};
const E = t.firestoreEnvelope(T);
// the functional TLS/auth test needs ANSWERED calls to succeed under CPU
// load (PR87 N-2); hung-call tests keep T
const LIMA = {...LIM, firestoreRpcMs: 1000};
const L = t.FIRESTORE_LAYERS;
const closers = [];
after(async () => {
  for (const c of closers) await c();
  fs.rmSync(DIR, {recursive: true, force: true});
});

/**
 * TCP proxy that holds the FIRST connection for `delayMs` before piping
 * (the TLS handshake cannot complete meanwhile); later ones pipe at once.
 * @param {number} port upstream
 * @param {number} delayMs
 * @return {Promise<{port: number, close: function}>}
 */
async function slowFirstConnectionProxy(port, delayMs) {
  let first = true;
  const socks = new Set();
  const srv = net.createServer((c) => {
    socks.add(c);
    c.pause();
    const wait = first ? delayMs : 0;
    first = false;
    setTimeout(() => {
      const u = net.connect(port, "127.0.0.1");
      socks.add(u);
      const end = () => {
        c.destroy();
        u.destroy();
      };
      u.on("error", end).on("close", end);
      c.on("error", end).on("close", end);
      c.pipe(u).pipe(c);
      c.resume();
    }, wait);
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  return {port: srv.address().port, close: () => {
    for (const x of socks) x.destroy();
    srv.close();
  }};
}

/**
 * TLS fake Firestore + metadata stand-in + bounded production client.
 * @param {object} [behavior]
 * @param {string} [metadataMode]
 * @param {object} [limits]
 * @param {number} [proxyDelayMs] hold the first TCP connection (N-2)
 * @return {Promise<object>}
 */
async function world(behavior = {}, metadataMode = "ok", limits = LIM,
    proxyDelayMs = 0) {
  const creds = grpc.ServerCredentials.createSsl(null, [{
    private_key: fs.readFileSync(path.join(DIR, "key.pem")),
    cert_chain: fs.readFileSync(path.join(DIR, "cert.pem"))}], false);
  const srv = await startFakeFirestore(grpc, behavior, creds);
  const px = proxyDelayMs ?
    await slowFirstConnectionProxy(srv.port, proxyDelayMs) : null;
  const md = await startHttp((req, res) => {
    if (metadataMode === "hang") return;
    res.writeHead(200, {"content-type": "application/json"});
    res.end(JSON.stringify({access_token: "tok-prod", expires_in: 3600}));
  });
  const tp = t.createTokenProvider({url: `${md.url}/token`, limits});
  const rec = attemptRecorder();
  const db = t.createBoundedFirestore({Firestore, projectId: "demo-lfs-gate",
    tokenProvider: tp, limits,
    settings: {"host": `localhost:${px ? px.port : srv.port}`,
      "grpc.callInvocationTransformer": rec.transformer}});
  closers.push(async () => {
    await db.terminate();
    if (px) px.close();
    srv.close();
    await md.close();
  });
  return {srv, md, db, attempts: rec.attempts};
}
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
const assertEachCut = (recs) => {
  assert.ok(recs.length > 0);
  for (const r of recs) {
    assert.ok(r.cancelledAt !== null, `${r.m} cancelled server-side`);
    assert.ok(r.cancelledAt - r.at <= T + CUT_SLACK,
        `${r.m} cut after ${r.cancelledAt - r.at} ms`);
  }
};

describe("Firestore transport bound, production branch (TLS + bounded " +
    "token auth)", {concurrency: true}, () => {
  it("TLS default-roots channel with bounded-token call credentials: the " +
      "server sees the facade token; a transaction completes", {timeout:
      60000}, async () => {
    const {srv, md, db} = await world({BatchGetDocuments: bgdMissing,
      Commit: (call, cb, req, v1) => cb(null, Buffer.from(
          v1.CommitResponse.encode({commitTime: {seconds: 1}}).finish()))},
    "ok", LIMA);
    await db.doc("c/warm").get(); // establish the TLS channel (N-2)
    await db.runTransaction(async (tx) => {
      await tx.get(db.doc("c/ok"));
      tx.set(db.doc("c/ok-w"), {x: 1});
    }, {maxAttempts: 1});
    assert.ok(srv.log.length >= 2);
    for (const r of srv.log) assert.equal(r.authorization, "Bearer tok-prod");
    assert.equal(md.reqs.length, 1, "token cached");
    assert.equal(md.reqs[0].headers["metadata-flavor"], "Google");
  });
  it("hung read: 5 x 3 attempts, each cut at the deadline; within the " +
      "envelope", {timeout: 180000}, async () => {
    const {srv, db, attempts} = await world();
    const t0 = Date.now();
    await assert.rejects(db.doc("c/hang").get(), (e) => e.code === 4);
    const ms = Date.now() - t0;
    await new Promise((r) => setTimeout(r, T + 300));
    const recs = srv.log.filter((x) => x.m === "BatchGetDocuments");
    // run 39581464447 observed 14 server-side: one attempt's deadline
    // expired while the TLS channel was still connecting (never sent). The
    // retry bound is proven on the CLIENT count; sent ones are cut server-
    // side (N-2)
    const mine = reconcile(attempts, recs, "BatchGetDocuments");
    assert.equal(mine.length, L.retryAttempts * L.streamCallsPerAttempt);
    assert.ok(mine.every((a) => a.code === 4));
    assertEachCut(recs);
    assert.ok(ms <= E.streamRead, `${ms} > ${E.streamRead}`);
  });
  it("N-2 regression (run 39581464447 saw 14/15 server-side): a slow " +
      "first TLS connection leaves attempts that expire before a " +
      "connection is picked (never sent); the CLIENT still makes exactly " +
      "15, all DEADLINE_EXCEEDED; every sent attempt is server-observed " +
      "and cut", {timeout: 180000}, async () => {
    const {srv, db, attempts} = await world({}, "ok", LIM, 3 * T);
    const t0 = Date.now();
    await assert.rejects(db.doc("c/slow-connect").get(), (e) => e.code === 4);
    const ms = Date.now() - t0;
    await new Promise((r) => setTimeout(r, T + 300));
    const recs = srv.log.filter((x) => x.m === "BatchGetDocuments");
    const mine = reconcile(attempts, recs, "BatchGetDocuments");
    assert.equal(mine.length, L.retryAttempts * L.streamCallsPerAttempt);
    assert.ok(mine.every((a) => a.code === 4));
    const never = mine.filter(unsent).length;
    assert.ok(never >= 1, "the slow connection left an unsent attempt");
    assert.equal(recs.length, mine.length - never);
    assert.ok(recs.length < L.retryAttempts * L.streamCallsPerAttempt,
        "a server-only count would have been below 15");
    assertEachCut(recs);
    assert.ok(ms <= E.streamRead, `${ms} > ${E.streamRead}`);
  });
  it("hung metadata server: every token request is aborted by the facade " +
      "at the token deadline (server-observed); no RPC reaches Firestore; " +
      "the read fails within the envelope", {timeout: 180000}, async () => {
    const {srv, md, db, attempts} = await world({}, "hang");
    const t0 = Date.now();
    await assert.rejects(db.doc("c/notoken").get());
    const ms = Date.now() - t0;
    assert.equal(srv.log.length, 0, "no RPC without a token");
    assert.ok(attempts.length <= L.retryAttempts * L.streamCallsPerAttempt,
        String(attempts.length));
    assert.ok(md.reqs.length >= 1);
    assert.ok(await until(() => md.reqs.every((r) => r.closedAt !== null)));
    for (const r of md.reqs) {
      assert.ok(r.closedAt - r.at <= LIM.tokenRequestMs + CUT_SLACK,
          `token request closed after ${r.closedAt - r.at} ms`);
    }
    assert.ok(md.reqs.length <= L.retryAttempts * L.streamCallsPerAttempt,
        String(md.reqs.length));
    assert.ok(ms <= t.firestoreEnvelope(Math.max(T,
        LIM.tokenRequestMs)).streamRead, String(ms));
  });
});
