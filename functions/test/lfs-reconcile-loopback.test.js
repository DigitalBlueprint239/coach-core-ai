"use strict";
// LFS L9/L15 at the reconciler level: the reconciler and the frozen S1/C1
// code it re-drives, over the REAL bounded Storage facade (lfs-transport) on
// a loopback JSON-API stand-in. Exact list/head/DELETE requests, a 20-digit
// generation kept as a string end to end, and a hung list cut at the
// facade deadline (server-observed) with the failure recorded, fenced.
const {describe, it, after} = require("node:test");
const assert = require("node:assert/strict");
const c = require("../src/film/contract");
const t = require("../src/film/lfs-transport");
const r = require("../src/film/reconcile");
const {FakeFirestore, FakeTimestamp} = require("./lfs-doubles");
const {startHttp, until} = require("./lfs-gate-helpers");

const BKT = "demo-lfs-loop.appspot.com";
const NAME = c.uploadPathFor("team-loop",
    "00000000-0000-4000-8000-0000000000aa");
const GEN = "17609000000000000001";
const T0 = new Date("2026-10-20T20:00:00.000Z");
const LIM = {...t.LFS_TRANSPORT_LIMITS, storageRequestMs: 300};
const servers = [];
after(async () => {
  for (const s of servers) await s.close();
});

/** Build a reconciler over the real facade bound to a loopback server. */
async function world(handler) {
  const s = await startHttp(handler);
  servers.push(s);
  const storage = t.createBoundedStorage({bucketName: BKT,
    endpoint: s.url, tokenProvider: null, limits: LIM});
  const db = new FakeFirestore();
  const rc = r.createQuarantineReconciler({db, Timestamp: FakeTimestamp,
    storage, bucketName: () => BKT, project: "demo-lfs-loop",
    logger: {info() {}, warn() {}, error() {}},
    now: () => new Date(T0.getTime() + 20 * 60 * 1000)});
  return {s, db, rc};
}

describe("reconciler over the real bounded Storage facade (loopback)", () => {
  it("lost upload, no reservation: exact list, ranged head and " +
      "generation-matched DELETE; 20-digit generation intact", async () => {
    let deleted = false;
    const {s, db, rc} = await world((req, res) => {
      const u = new URL(req.url, "http://x");
      if (req.method === "GET" && u.pathname === `/storage/v1/b/${BKT}/o`) {
        res.writeHead(200, {"content-type": "application/json"});
        return res.end(deleted ? "{}" : `{"items":[{"name":"${NAME}",` +
          `"generation":"${GEN}","size":"32","contentType":"video/mp4",` +
          `"timeCreated":"${T0.toISOString()}"}]}`);
      }
      if (req.method === "GET") { // head read of that generation
        res.writeHead(206);
        return res.end(Buffer.alloc(32));
      }
      deleted = true;
      res.writeHead(204);
      res.end();
    });
    const out = await rc.reconcileQuarantine({limit: 5});
    assert.deepEqual(out.outcomes, {"no-reservation": 1});
    const [list, head, del] = s.reqs;
    const lu = new URL(list.url, "http://x");
    assert.deepEqual(Object.fromEntries(lu.searchParams),
        {prefix: "quarantine/", maxResults: "6"});
    const hu = new URL(head.url, "http://x");
    assert.equal(hu.searchParams.get("generation"), GEN);
    assert.equal(head.headers.range, "bytes=0-1023");
    const du = new URL(del.url, "http://x");
    assert.equal(del.method, "DELETE");
    assert.equal(du.searchParams.get("ifGenerationMatch"), GEN);
    const recs = db.paths("filmCleanup/").map((p) => db.read(p));
    assert.equal(recs.length, 1);
    assert.equal(recs[0].generation, GEN);
    assert.equal(recs[0].state, "deleted");
  });
  it("hung list: aborted at the facade deadline (server-observed); the " +
      "failure is recorded under the lease; no object processed",
  async () => {
    const {s, db, rc} = await world(() => {});
    const out = await rc.reconcileQuarantine({limit: 5});
    assert.equal(out.stoppedFor, "list:deadline");
    assert.equal(out.processed, 0);
    assert.ok(await until(() => s.reqs[0].closedAt !== null));
    assert.ok(s.reqs[0].closedAt - s.reqs[0].at <= 300 + 400);
    const st = db.read(r.STATE_PATH);
    assert.deepEqual(st.lastError.code, "deadline");
    assert.equal(st.consecutiveFailures, 1);
    assert.equal(st.lease, null);
  });
});
