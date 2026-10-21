"use strict";
// LFS gate #1 helpers: loopback HTTP and gRPC servers that record every
// request and every connection close, so tests can prove server-observed
// aborts. Loopback only; no credentials; no network beyond 127.0.0.1.
const http = require("node:http");
const path = require("node:path");

/**
 * HTTP server whose handler decides per request. Records requests and the
 * time each underlying socket closed.
 * @param {function(object, object, object): void} handler (req, res, rec)
 * @return {Promise<object>}
 */
async function startHttp(handler) {
  const t0 = Date.now();
  const reqs = [];
  const sockets = [];
  const server = http.createServer((req, res) => {
    const rec = {method: req.method, url: req.url, headers: req.headers,
      at: Date.now() - t0, closedAt: null};
    reqs.push(rec);
    req.socket.once("close", () => {
      rec.closedAt = Date.now() - t0;
    });
    handler(req, res, rec);
  });
  server.on("connection", (s) => sockets.push(s));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  return {port, url: `http://127.0.0.1:${port}`, reqs, t0,
    elapsed: () => Date.now() - t0,
    close: async () => {
      for (const s of sockets) s.destroy();
      await new Promise((r) => server.close(r));
    }};
}

/** Wait until pred() or timeout. */
async function until(pred, ms = 3000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (pred()) return true;
    await new Promise((r) => setTimeout(r, 10));
  }
  return pred();
}

const FS_ROOT = path.dirname(require.resolve("@google-cloud/firestore"));
/** Pinned Firestore v1 protobuf codecs (static module of the SDK). */
function firestoreProtos() {
  // eslint-disable-next-line global-require
  const p = require(path.join(FS_ROOT, "..", "protos",
      "firestore_v1_proto_api.js"));
  return p.google.firestore.v1;
}

/**
 * Fake Firestore gRPC server. `behavior[Method]` is one of:
 *   "hang" (accept, never answer), or a function (call, cb, decoded) that
 *   answers. Records starts, cancellations and metadata.
 * @param {object} grpc @grpc/grpc-js
 * @param {object} behavior
 * @param {?object} creds ServerCredentials (default insecure)
 * @return {Promise<object>}
 */
async function startFakeFirestore(grpc, behavior, creds = null) {
  const v1 = firestoreProtos();
  const t0 = Date.now();
  const log = [];
  const server = new grpc.Server();
  const kinds = {BatchGetDocuments: ["serverStream",
    v1.BatchGetDocumentsRequest], RunQuery: ["serverStream",
    v1.RunQueryRequest], Commit: ["unary", v1.CommitRequest],
  BeginTransaction: ["unary", v1.BeginTransactionRequest],
  Rollback: ["unary", v1.RollbackRequest]};
  for (const [m, [type, Req]] of Object.entries(kinds)) {
    server.register(`/google.firestore.v1.Firestore/${m}`,
        (call, cb) => {
          const md = call.metadata.getMap();
          const rec = {m, at: Date.now() - t0, cancelledAt: null,
            authorization: md.authorization || null};
          log.push(rec);
          call.on("cancelled", () => {
            rec.cancelledAt = Date.now() - t0;
          });
          const b = behavior[m] || "hang";
          if (b === "hang") return;
          const decoded = type === "unary" ? Req.decode(call.request) :
            Req.decode(call.request);
          b(call, cb, decoded, v1);
        }, (x) => x, (x) => x, type);
  }
  const port = await new Promise((r, j) => server.bindAsync("127.0.0.1:0",
      creds || grpc.ServerCredentials.createInsecure(),
      (e, p) => (e ? j(e) : r(p))));
  return {port, log, t0, server,
    count: (m) => log.filter((x) => x.m === m).length,
    close: () => server.forceShutdown()};
}

/** BatchGetDocuments responder: every document missing, new tx id. */
function bgdMissing(call, _cb, req, v1) {
  const tx = Buffer.from("tx-1");
  if (req.newTransaction) {
    call.write(Buffer.from(v1.BatchGetDocumentsResponse.encode({
      transaction: tx, readTime: {seconds: 1}}).finish()));
  }
  for (const name of req.documents || []) {
    call.write(Buffer.from(v1.BatchGetDocumentsResponse.encode({
      missing: name, readTime: {seconds: 1}}).finish()));
  }
  call.end();
}

/**
 * CLIENT-side RPC attempt recorder (PR87 N-2). grpc-js runs the public
 * `callInvocationTransformer` client option once per call attempt, before
 * the call is started; gax forwards `grpc.callInvocationTransformer` from
 * the Firestore settings. The SDK's own retry layers therefore show up here
 * exactly, including attempts whose deadline expires before any connection
 * is picked ("Waiting for LB pick"): those never reach a server, so a
 * server-side count alone under-counts them under load (run 39581464447).
 * @return {{transformer: function, attempts: object[]}}
 */
function attemptRecorder() {
  const attempts = [];
  const transformer = (props) => {
    const rec = {m: props.methodDefinition.path.split("/").pop(),
      code: null, details: null};
    attempts.push(rec);
    props.call.on("status", (st) => {
      rec.code = st.code;
      rec.details = String(st.details || "");
    });
    return props;
  };
  return {transformer, attempts};
}

/** The attempt ended before a transport was picked: nothing was sent. */
const unsent = (a) => /Waiting for LB pick/.test(a.details || "");

module.exports = {startHttp, until, startFakeFirestore, bgdMissing,
  firestoreProtos, attemptRecorder, unsent};
