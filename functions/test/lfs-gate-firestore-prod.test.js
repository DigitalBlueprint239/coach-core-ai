"use strict";
// LFS acceptance item #1 (STOP gate), Firestore half, PRODUCTION branch: the
// SDK's default TLS channel (grpc createSsl with default roots) plus call
// credentials from the facade-owned bounded token provider, against a
// loopback TLS gRPC stand-in (controlled transport interceptor: a throwaway
// self-signed localhost certificate installed as the default roots through
// GRPC_DEFAULT_SSL_ROOTS_FILE_PATH, read once by grpc-js at load). No real
// endpoint, no real credentials. Separate process from the emulator branch.
const fs = require("node:fs");
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
const {startFakeFirestore, startHttp, until, bgdMissing} =
  require("./lfs-gate-helpers");

const T = 200;
const CUT_SLACK = 300;
const LIM = {...t.LFS_TRANSPORT_LIMITS, firestoreRpcMs: T,
  tokenRequestMs: 300};
const E = t.firestoreEnvelope(T);
const L = t.FIRESTORE_LAYERS;
const closers = [];
after(async () => {
  for (const c of closers) await c();
  fs.rmSync(DIR, {recursive: true, force: true});
});

/** TLS fake Firestore + metadata stand-in + bounded production client. */
async function world(behavior = {}, metadataMode = "ok") {
  const creds = grpc.ServerCredentials.createSsl(null, [{
    private_key: fs.readFileSync(path.join(DIR, "key.pem")),
    cert_chain: fs.readFileSync(path.join(DIR, "cert.pem"))}], false);
  const srv = await startFakeFirestore(grpc, behavior, creds);
  const md = await startHttp((req, res) => {
    if (metadataMode === "hang") return;
    res.writeHead(200, {"content-type": "application/json"});
    res.end(JSON.stringify({access_token: "tok-prod", expires_in: 3600}));
  });
  const tp = t.createTokenProvider({url: `${md.url}/token`, limits: LIM});
  const db = t.createBoundedFirestore({Firestore, projectId: "demo-lfs-gate",
    tokenProvider: tp, limits: LIM,
    settings: {host: `localhost:${srv.port}`}});
  closers.push(async () => {
    await db.terminate();
    srv.close();
    await md.close();
  });
  return {srv, md, db};
}
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
          v1.CommitResponse.encode({commitTime: {seconds: 1}}).finish()))});
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
    const {srv, db} = await world();
    const t0 = Date.now();
    await assert.rejects(db.doc("c/hang").get(), (e) => e.code === 4);
    const ms = Date.now() - t0;
    await new Promise((r) => setTimeout(r, T + 300));
    const recs = srv.log.filter((x) => x.m === "BatchGetDocuments");
    assert.equal(recs.length, L.retryAttempts * L.streamCallsPerAttempt);
    assertEachCut(recs);
    assert.ok(ms <= E.streamRead, `${ms} > ${E.streamRead}`);
  });
  it("hung metadata server: every token request is aborted by the facade " +
      "at the token deadline (server-observed); no RPC reaches Firestore; " +
      "the read fails within the envelope", {timeout: 180000}, async () => {
    const {srv, md, db} = await world({}, "hang");
    const t0 = Date.now();
    await assert.rejects(db.doc("c/notoken").get());
    const ms = Date.now() - t0;
    assert.equal(srv.log.length, 0, "no RPC without a token");
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
