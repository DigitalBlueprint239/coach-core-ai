"use strict";
// LFS acceptance item #1, Storage PRODUCTION branch on the DEFAULT origin
// (PR87 review c-6311907042). The facade is built with NO endpoint override,
// so it addresses https://storage.googleapis.com and the default metadata
// URL http://metadata.google.internal exactly as in production. A
// controlled transport interceptor — an undici dispatcher (the same class as
// Node's global fetch dispatcher) whose connector routes those two origins
// to loopback servers, with a throwaway self-signed certificate for
// storage.googleapis.com trusted only by this dispatcher — lets the servers
// observe the real requests and every abort. No DNS change, no global
// setting, no real endpoint, no credentials.
const fs = require("node:fs");
const os = require("node:os");
const net = require("node:net");
const tls = require("node:tls");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const {execFileSync} = require("node:child_process");
const {describe, it, before, after} = require("node:test");
const assert = require("node:assert/strict");
const t = require("../src/film/lfs-transport");
const {until} = require("./lfs-gate-helpers");

const DEADLINE = 300;
const SLACK = 400;
const LIM = {...t.LFS_TRANSPORT_LIMITS, storageRequestMs: DEADLINE,
  tokenRequestMs: DEADLINE};
const BKT = "demo-lfs-https.appspot.com";
const NAME = "quarantine/team-h/00000000-0000-4000-8000-000000000001/" +
  "source.mp4";
const GEN = "17609000000000000001";
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "lfs-https-"));
let storageSrv;
let mdSrv;
let dispatcher;
let mode = "ok";
const reqs = [];
const mdReqs = [];

/** Record a request and the moment its socket closes. */
function record(list, req) {
  const r = {method: req.method, url: req.url, headers: req.headers,
    at: Date.now(), closedAt: null};
  list.push(r);
  req.socket.once("close", () => {
    r.closedAt = Date.now();
  });
  return r;
}

before(async () => {
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", path.join(DIR, "key.pem"), "-out", path.join(DIR, "cert.pem"),
    "-days", "1", "-subj", "/CN=storage.googleapis.com",
    "-addext", "subjectAltName=DNS:storage.googleapis.com"],
  {stdio: "ignore"});
  const key = fs.readFileSync(path.join(DIR, "key.pem"));
  const cert = fs.readFileSync(path.join(DIR, "cert.pem"));
  storageSrv = https.createServer({key, cert}, (req, res) => {
    record(reqs, req);
    if (mode === "hang") return;
    if (req.method === "DELETE") {
      res.writeHead(204);
      return res.end();
    }
    const u = new URL(req.url, "https://x");
    if (u.searchParams.get("alt") === "media") {
      res.writeHead(206);
      return res.end(Buffer.alloc(32, 7));
    }
    res.writeHead(200, {"content-type": "application/json"});
    res.end(JSON.stringify({items: [{name: NAME, generation: GEN,
      size: "32", contentType: "video/mp4",
      timeCreated: "2026-10-20T20:00:00.000Z"}]}));
  });
  mdSrv = http.createServer((req, res) => {
    record(mdReqs, req);
    if (mode === "md-hang") return;
    res.writeHead(200, {"content-type": "application/json"});
    res.end(JSON.stringify({access_token: "tok-https", expires_in: 3600}));
  });
  await new Promise((r) => storageSrv.listen(0, "127.0.0.1", r));
  await new Promise((r) => mdSrv.listen(0, "127.0.0.1", r));
  // the undici Agent class of Node's own fetch
  try {
    await fetch("http://127.0.0.1:1");
  } catch (_) {/* only to materialize the global dispatcher */}
  // eslint-disable-next-line no-undef
  const Agent = globalThis[Symbol.for("undici.globalDispatcher.1")]
      .constructor;
  dispatcher = new Agent({connect: (o, cb) => {
    let s;
    if (o.protocol === "https:" && o.hostname === "storage.googleapis.com") {
      s = tls.connect({host: "127.0.0.1", port: storageSrv.address().port,
        servername: "storage.googleapis.com", ca: cert,
        ALPNProtocols: ["http/1.1"]});
      s.once("secureConnect", () => cb(null, s));
    } else if (o.protocol === "http:" &&
        o.hostname === "metadata.google.internal") {
      s = net.connect({host: "127.0.0.1", port: mdSrv.address().port});
      s.once("connect", () => cb(null, s));
    } else {
      return cb(new Error(`interceptor refuses ${o.hostname}`));
    }
    s.once("error", (e) => cb(e));
  }});
});
after(async () => {
  storageSrv.closeAllConnections();
  mdSrv.closeAllConnections();
  await new Promise((r) => storageSrv.close(r));
  await new Promise((r) => mdSrv.close(r));
  await dispatcher.close().catch(() => {});
  fs.rmSync(DIR, {recursive: true, force: true});
});

/** The production facade, default origins, real fetch via interceptor. */
function facade() {
  const fetchImpl = (url, init) => fetch(url, {...init, dispatcher});
  const tokenProvider = t.createTokenProvider({fetchImpl, limits: LIM});
  return t.createBoundedStorage({bucketName: BKT, tokenProvider, fetchImpl,
    limits: LIM});
}

describe("Storage facade, production branch on the DEFAULT origin " +
    "(controlled HTTPS interceptor)", () => {
  it("default origin, auth, range, generation and precondition reach " +
      "storage.googleapis.com; token from metadata.google.internal",
  async () => {
    mode = "ok";
    reqs.length = 0;
    mdReqs.length = 0;
    const b = facade();
    const list = await b.listObjects({prefix: "quarantine/",
      maxResults: 5});
    assert.equal(list.items[0].generation, GEN);
    const [buf] = await b.file(NAME, {generation: GEN})
        .download({start: 0, end: 1023});
    assert.equal(buf.length, 32);
    await b.file(NAME).delete({ifGenerationMatch: GEN});
    assert.equal(reqs.length, 3);
    for (const r of reqs) {
      assert.equal(r.headers.host, "storage.googleapis.com");
      assert.equal(r.headers.authorization, "Bearer tok-https");
    }
    const obj = `/storage/v1/b/${BKT}/o/${encodeURIComponent(NAME)}`;
    assert.equal(new URL(reqs[1].url, "https://x").pathname, obj);
    assert.equal(new URL(reqs[1].url, "https://x").searchParams
        .get("generation"), GEN);
    assert.equal(reqs[1].headers.range, "bytes=0-1023");
    assert.equal(reqs[2].method, "DELETE");
    assert.equal(new URL(reqs[2].url, "https://x").searchParams
        .get("ifGenerationMatch"), GEN);
    assert.equal(mdReqs.length, 1, "token cached");
    assert.equal(mdReqs[0].headers.host, "metadata.google.internal");
    assert.equal(mdReqs[0].headers["metadata-flavor"], "Google");
  });
  for (const [op, run] of Object.entries({
    list: (b) => b.listObjects({prefix: "quarantine/", maxResults: 5}),
    head: (b) => b.file(NAME, {generation: GEN})
        .download({start: 0, end: 1023}),
    delete: (b) => b.file(NAME).delete({ifGenerationMatch: GEN}),
  })) {
    it(`hung ${op} over HTTPS: aborted by the facade at the deadline; ` +
        "the server observes the TLS connection close; one request",
    async () => {
      const b = facade();
      mode = "ok";
      await b.listObjects({prefix: "quarantine/", maxResults: 1}); // token
      mode = "hang";
      reqs.length = 0;
      await assert.rejects(run(b), (e) => e.code === "deadline");
      assert.equal(reqs.length, 1);
      assert.ok(await until(() => reqs[0].closedAt !== null));
      assert.ok(reqs[0].closedAt - reqs[0].at <= DEADLINE + SLACK,
          `closed after ${reqs[0].closedAt - reqs[0].at} ms`);
    });
  }
  it("hung default metadata server: aborted at the token deadline " +
      "(server-observed); no storage request", async () => {
    mode = "md-hang";
    reqs.length = 0;
    mdReqs.length = 0;
    await assert.rejects(facade().file(NAME).delete({ifGenerationMatch:
      GEN}), (e) => e.code === "deadline");
    assert.ok(await until(() => mdReqs[0] && mdReqs[0].closedAt !== null));
    assert.ok(mdReqs[0].closedAt - mdReqs[0].at <= DEADLINE + SLACK);
    assert.equal(reqs.length, 0);
  });
});
