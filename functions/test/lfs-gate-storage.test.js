"use strict";
// LFS acceptance item #1 (STOP gate), Storage half. Proves the facade-owned
// bound on every Storage call of the reconciler path (list, ranged head read,
// C1 DELETE) by the SERVER observing the connection close at the deadline,
// on both transport branches:
//   - emulator branch: STORAGE_EMULATOR_HOST-style endpoint, no credentials;
//   - production branch: Authorization from the facade-owned, bounded
//     metadata-server token provider (a loopback stand-in for the metadata
//     server and storage.googleapis.com — a controlled transport interceptor).
// Also proves the FROZEN S1 code (storage-adapter.readHead and
// cleanup.deleteExactGeneration) runs unchanged over the facade.
// Local transport only: an aborted DELETE may still have happened remotely.
const {describe, it, after} = require("node:test");
const assert = require("node:assert/strict");
const t = require("../src/film/lfs-transport");
const {createStorageAdapter} = require("../src/film/storage-adapter");
const {deleteExactGeneration, CLEANUP_LIMITS} =
  require("../src/film/cleanup");
const {startHttp, until} = require("./lfs-gate-helpers");

const DEADLINE = 300;
const SLACK = 400;
const LIM = {...t.LFS_TRANSPORT_LIMITS, storageRequestMs: DEADLINE,
  tokenRequestMs: DEADLINE};
const BKT = "demo-lfs-gate.appspot.com";
const NAME = "quarantine/team-g/00000000-0000-4000-8000-000000000001/" +
  "source.mp4";
const GEN = "17609000000000000001"; // 20 digits, > 2^53
const servers = [];
after(async () => {
  for (const s of servers) await s.close();
});

/** Metadata-server stand-in. */
async function metadata(mode = "ok") {
  const s = await startHttp((req, res) => {
    if (mode === "hang") return;
    res.writeHead(200, {"content-type": "application/json"});
    res.end(JSON.stringify({access_token: "tok-1", expires_in: 3600,
      token_type: "Bearer"}));
  });
  servers.push(s);
  return s;
}

const branches = {
  emulator: async (storageUrl) => ({tokenProvider: null,
    endpoint: storageUrl}),
  production: async (storageUrl) => {
    const md = await metadata();
    return {endpoint: storageUrl, md,
      tokenProvider: t.createTokenProvider({url: `${md.url}/token`,
        limits: LIM})};
  },
};

for (const [branch, setup] of Object.entries(branches)) {
  describe(`Storage facade, ${branch} branch`, () => {
    const facade = async (handler) => {
      const s = await startHttp(handler);
      servers.push(s);
      const cfg = await setup(s.url);
      return {s, cfg, b: t.createBoundedStorage({bucketName: BKT,
        endpoint: cfg.endpoint, tokenProvider: cfg.tokenProvider,
        limits: LIM})};
    };
    const assertClosedAtDeadline = async (s) => {
      assert.equal(s.reqs.length, 1, "exactly one request");
      assert.ok(await until(() => s.reqs[0].closedAt !== null),
          "server observed the connection close");
      assert.ok(s.reqs[0].closedAt - s.reqs[0].at <= DEADLINE + SLACK,
          `closed ${s.reqs[0].closedAt - s.reqs[0].at} ms after start`);
      if (branch === "production") {
        assert.equal(s.reqs[0].headers.authorization, "Bearer tok-1");
      } else {
        assert.equal(s.reqs[0].headers.authorization, undefined);
      }
    };
    for (const [op, run] of Object.entries({
      list: (b) => b.listObjects({prefix: "quarantine/", maxResults: 5}),
      head: (b) => b.file(NAME, {generation: GEN})
          .download({start: 0, end: 1023}),
      delete: (b) => b.file(NAME).delete({ifGenerationMatch: GEN}),
    })) {
      it(`hung ${op}: aborted by the facade at the deadline; server ` +
          "observes the close; one request", async () => {
        const {s, b} = await facade(() => {});
        const t0 = Date.now();
        await assert.rejects(run(b), (e) => e.code === "deadline");
        assert.ok(Date.now() - t0 < DEADLINE + SLACK);
        await assertClosedAtDeadline(s);
      });
    }
    it("trickling head body: aborted at the deadline (not per chunk)",
        async () => {
          const {s, b} = await facade((req, res) => {
            res.writeHead(206);
            const iv = setInterval(() => res.write("x"), 50);
            res.on("close", () => clearInterval(iv));
          });
          await assert.rejects(b.file(NAME, {generation: GEN})
              .download({start: 0, end: 1023}), (e) => e.code === "deadline");
          await assertClosedAtDeadline(s);
        });
    it("oversized head body: aborted at the 1 KiB cap; nothing beyond " +
        "the cap accepted", async () => {
      const {s, b} = await facade((req, res) => {
        res.writeHead(206);
        res.write(Buffer.alloc(4096, 1));
        // keep the connection open: only the client's abort closes it
      });
      await assert.rejects(b.file(NAME, {generation: GEN})
          .download({start: 0, end: 1023}), (e) => e.code === "body-over-cap");
      await assertClosedAtDeadline(s);
    });
    it("short head body is returned as is; exact Range and generation",
        async () => {
          const {s, b} = await facade((req, res) => {
            res.writeHead(206);
            res.end(Buffer.alloc(10, 2));
          });
          const [buf] = await b.file(NAME, {generation: GEN})
              .download({start: 0, end: 1023});
          assert.equal(buf.length, 10);
          const u = new URL(s.reqs[0].url, "http://x");
          assert.equal(u.searchParams.get("generation"), GEN);
          assert.equal(u.searchParams.get("alt"), "media");
          assert.equal(s.reqs[0].headers.range, "bytes=0-1023");
        });
    it("slow but within the deadline: succeeds", async () => {
      const {b} = await facade((req, res) => {
        setTimeout(() => {
          res.writeHead(204);
          res.end();
        }, DEADLINE / 3);
      });
      await b.file(NAME).delete({ifGenerationMatch: GEN});
    });
    for (const status of [404, 412, 503, 500, 429, 408]) {
      it(`DELETE ${status}: code ${status}, exactly one request (no retry)`,
          async () => {
            const {s, b} = await facade((req, res) => {
              res.writeHead(status);
              res.end("{}");
            });
            await assert.rejects(b.file(NAME).delete(
                {ifGenerationMatch: GEN}), (e) => e.code === status);
            await new Promise((r) => setTimeout(r, 100));
            assert.equal(s.reqs.length, 1);
            const u = new URL(s.reqs[0].url, "http://x");
            assert.equal(s.reqs[0].method, "DELETE");
            assert.equal(u.pathname, `/storage/v1/b/${BKT}/o/` +
              encodeURIComponent(NAME));
            assert.equal(u.searchParams.get("ifGenerationMatch"), GEN);
          });
    }
    it("list: exact query; 20-digit generation stays a string; " +
        "oversized response capped", async () => {
      const item = {name: NAME, generation: GEN, size: "32",
        contentType: "video/mp4", timeCreated: "2026-10-20T20:00:00.000Z",
        metageneration: "1"};
      const {s, b} = await facade((req, res) => {
        res.writeHead(200, {"content-type": "application/json"});
        res.end(`{"items":[{"name":${JSON.stringify(NAME)},` +
          `"generation":"${GEN}","size":"32","contentType":"video/mp4",` +
          "\"timeCreated\":\"2026-10-20T20:00:00.000Z\"," +
          "\"metageneration\":\"1\"}]}");
      });
      const r = await b.listObjects({prefix: "quarantine/",
        startOffset: "quarantine/a", maxResults: 7});
      assert.deepEqual(r.items, [item]);
      const u = new URL(s.reqs[0].url, "http://x");
      assert.deepEqual(Object.fromEntries(u.searchParams), {
        prefix: "quarantine/", maxResults: "7", startOffset: "quarantine/a"});
      const big = await facade((req, res) => {
        res.writeHead(200);
        res.write(Buffer.alloc(LIM.listResponseMaxBytes + 1, 32));
      });
      await assert.rejects(big.b.listObjects({prefix: "quarantine/",
        maxResults: 1}), (e) => e.code === "body-over-cap");
      await assertClosedAtDeadline(big.s);
    });
    it("frozen S1 code over the facade: storage-adapter.readHead and " +
        "cleanup.deleteExactGeneration classify unchanged", async () => {
      const {b} = await facade((req, res) => {
        if (req.method === "GET") {
          res.writeHead(404);
          return res.end("{}");
        }
        res.writeHead(412);
        res.end("{}");
      });
      assert.equal(await createStorageAdapter(b).readHead({name: NAME,
        generation: GEN, bytes: 1024}), null);
      assert.deepEqual(await deleteExactGeneration(b, {name: NAME,
        generation: GEN}, CLEANUP_LIMITS.attemptBudgetMs),
      {result: "mismatch", code: "412"});
    });
    it("frozen deleteExactGeneration over a hung DELETE: the facade " +
        "aborts the underlying request (server-observed) before the " +
        "frozen race deadline; no completion is claimed remotely",
    async () => {
      const {s, b} = await facade(() => {});
      const out = await deleteExactGeneration(b, {name: NAME,
        generation: GEN}, CLEANUP_LIMITS.attemptBudgetMs);
      assert.deepEqual(out, {result: "error", code: "deadline"});
      await assertClosedAtDeadline(s);
      assert.ok(LIM.storageRequestMs <= CLEANUP_LIMITS.attemptBudgetMs);
    });
  });
}

describe("token provider (production branch auth)", () => {
  it("hung metadata server: aborted at the token deadline (server-" +
      "observed); no storage request is sent", async () => {
    const md = await metadata("hang");
    const st = await startHttp(() => {});
    servers.push(st);
    const b = t.createBoundedStorage({bucketName: BKT, endpoint: st.url,
      tokenProvider: t.createTokenProvider({url: `${md.url}/token`,
        limits: LIM}), limits: LIM});
    await assert.rejects(b.file(NAME).delete({ifGenerationMatch: GEN}),
        (e) => e.code === "deadline");
    assert.ok(await until(() => md.reqs[0] && md.reqs[0].closedAt !== null));
    assert.ok(md.reqs[0].closedAt - md.reqs[0].at <= DEADLINE + SLACK);
    assert.equal(st.reqs.length, 0);
  });
  it("single-flight and cached: one metadata request for concurrent and " +
      "later calls; Metadata-Flavor header sent", async () => {
    const md = await metadata();
    const tp = t.createTokenProvider({url: `${md.url}/token`, limits: LIM});
    const all = await Promise.all([tp.token(), tp.token(), tp.token()]);
    assert.deepEqual(all, ["tok-1", "tok-1", "tok-1"]);
    assert.equal(await tp.token(), "tok-1");
    assert.equal(md.reqs.length, 1);
    assert.equal(md.reqs[0].headers["metadata-flavor"], "Google");
  });
  it("malformed token responses fail closed", async () => {
    for (const body of ["not json", "{}", "{\"access_token\":\"\"," +
      "\"expires_in\":1}"]) {
      const md = await startHttp((req, res) => {
        res.writeHead(200);
        res.end(body);
      });
      servers.push(md);
      const tp = t.createTokenProvider({url: md.url, limits: LIM});
      await assert.rejects(tp.token(), (e) => e.code === "token-malformed");
    }
  });
});
