"use strict";
// FILM-INT-A (#39 r3 c-6317821255 + r3.1 c-6317861326 + r3.2 c-6319524354 /
// c-6321423884) compatibility tests over the COMPOSED tree: accepted S1
// handlers (A7, with C1 cleanup), the accepted S2b worker (A5) and the
// accepted LFS reconciler (A7) share ONE in-memory Firestore and ONE
// generation-true object store. The worker runs by DIRECT invocation
// (processFilm / redrive) with an injected enabled switch: it stays
// unexported and no trigger delivery is claimed. Generations, preconditions
// and listing come from doubles (the Storage emulator ignores generations);
// no real-GCS semantics are established. The media pipeline is scripted;
// the pinned decoder runs in the accepted worker-pinned suite. TEST ONLY.
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const v1 = require("../src/film/contract");
const c2 = require("../src/film/contract-v2");
const {LIMITS} = require("../src/film/limits");
const cl = require("../src/film/cleanup");
const r = require("../src/film/reconcile");
const {createFilmHandlers} = require("../src/film/handlers");
const {createFilmWorker, jobIdFor} = require("../src/film/worker/worker");
const {WORKER_LIMITS} = require("../src/film/worker/limits");
const {FakeTimestamp, FakeFirestore, FakeObjects, fakeDecoder,
  scriptedPipeline} = require("./film-worker-doubles");

const OWNER = "uid-owner";
const TEAM = "team-int-a";
const BUCKET = "demo-s2b.appspot.com"; // the S1 double's configured bucket
const PROJECT = "demo-film-int";
const T0 = new Date("2026-10-21T16:00:00.000Z");
const MIN = 60 * 1000;
const HEAD = Buffer.concat([Buffer.from([0, 0, 0, 16]),
  Buffer.from("ftypisom"), Buffer.from([0, 0, 2, 0])]);
const BODY = Buffer.concat([HEAD, Buffer.alloc(16)]);
const auth = {uid: OWNER, token: {email_verified: true,
  firebase: {sign_in_provider: "google.com"}, auth_time: 1760900000}};
const utf8 = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));

/**
 * The reconciler's Storage view over the worker's object store: JSON-API
 * shaped listing (UTF-8 order, inclusive startOffset, resume-after tokens)
 * and the Bucket/File surface the frozen readHead and C1 delete use.
 * @param {object} objects FakeObjects
 * @param {Map<string, string>} created name -> timeCreated ISO
 * @return {object}
 */
function bucketView(objects, created) {
  return {
    name: BUCKET,
    async listObjects(q) {
      let names = [...objects.objects.keys()]
          .filter((n) => n.startsWith(q.prefix) &&
            (!q.startOffset || utf8(n, q.startOffset) >= 0))
          .sort(utf8);
      if (q.pageToken) {
        const after = Buffer.from(q.pageToken.slice(4), "base64url")
            .toString();
        names = names.filter((n) => utf8(n, after) > 0);
      }
      const page = names.slice(0, q.maxResults);
      const items = page.map((n) => {
        const o = objects.objects.get(n);
        return {name: n, generation: o.generation,
          size: String(o.bytes.length), contentType: "video/mp4",
          timeCreated: created.get(n)};
      });
      return {items, nextPageToken: names.length > page.length ?
        `tok:${Buffer.from(page.at(-1)).toString("base64url")}` : null};
    },
    file(name, fo = {}) {
      return {
        download: async ({start, end}) => {
          const o = objects.objects.get(name);
          if (!o || (fo.generation &&
              o.generation !== String(fo.generation))) {
            throw Object.assign(new Error("404"), {code: 404});
          }
          return [o.bytes.subarray(start, end + 1)];
        },
        delete: async ({ifGenerationMatch}) => {
          const res = await objects.deleteGeneration({name,
            generation: ifGenerationMatch});
          if (res === "absent") {
            throw Object.assign(new Error("404"), {code: 404});
          }
          if (res === "mismatch") {
            throw Object.assign(new Error("412"), {code: 412});
          }
        },
      };
    },
  };
}

/**
 * One composed world: S1 (A7) + worker (A5) + reconciler (A7), one store.
 * @param {object} [o] {script}
 * @return {object}
 */
function world(o = {}) {
  const db = new FakeFirestore();
  const objects = new FakeObjects();
  const created = new Map();
  const clock = {t: T0};
  const now = () => clock.t;
  const logger = {info() {}, warn() {}, error() {}};
  let fn = 0;
  let ids = 0;
  db.write(`teams/${TEAM}`, {ownerId: OWNER, name: "INT"});
  const put = objects.put.bind(objects);
  objects.put = (name, bytes, md) => {
    const g = put(name, bytes, md);
    created.set(name, clock.t.toISOString());
    return g;
  };
  const s1 = createFilmHandlers({db, Timestamp: FakeTimestamp,
    getUser: async () => ({uid: OWNER, disabled: false,
      customClaims: {beta: true}}),
    ...objects.s1(), logger, now,
    newFilmId: () => `00000000-0000-4000-8000-${String(++fn)
        .padStart(12, "0")}`});
  const pipeline = scriptedPipeline(o.script || []);
  const worker = createFilmWorker({db, Timestamp: FakeTimestamp, objects,
    decoder: fakeDecoder(), runPipeline: pipeline, isEnabled: () => true,
    now, newId: () => `exec-${++ids}`, logger, limits: WORKER_LIMITS});
  const storage = bucketView(objects, created);
  const rc = r.createQuarantineReconciler({db, Timestamp: FakeTimestamp,
    storage, bucketName: () => BUCKET, project: PROJECT, logger, now,
    limits: r.deriveLimits(undefined, {objectBudgetMs: 1000,
      invocationBudgetMs: 60 * 60 * 1000})});
  const w = {db, objects, clock, s1, worker, rc, pipeline, storage};
  w.advance = (ms) => {
    clock.t = new Date(clock.t.getTime() + ms);
  };
  w.filmPath = (filmId) => `teams/${TEAM}/films/${filmId}`;
  w.film = (filmId) => db.read(w.filmPath(filmId));
  w.job = (f) => db.read(`${w.filmPath(f.filmId)}/workerJobs/${f.jobId}`);
  w.slots = () => (db.read(`teams/${TEAM}/filmLedger/cap`) || {}).slots || {};
  w.records = () => db.paths("filmCleanup/").map((p) => db.read(p));
  w.evidence = () => db.paths(`${r.EVIDENCE_COLLECTION}/`)
      .map((p) => db.read(p));
  w.reserve = async (bytes = BODY) => {
    const res = await s1.reserveFilmUpload({auth, data: {
      schemaVersion: v1.CONTRACT_VERSION, operationId: crypto.randomUUID(),
      action: "reserveFilmUpload", payload: {teamId: TEAM,
        declaredBytes: bytes.length, declaredContentType: "video/mp4",
        fileName: "clip.mp4", rightsAcknowledged: true,
        rightsWordingVersion: "rights-v1"}}});
    assert.equal(res.ok, true, JSON.stringify(res));
    return res.data.filmId;
  };
  w.upload = (filmId, bytes = BODY) => {
    const name = v1.uploadPathFor(TEAM, filmId);
    const generation = objects.put(name, bytes);
    return {filmId, name, generation,
      jobId: jobIdFor(TEAM, filmId, generation)};
  };
  w.finalize = (f, bytes = BODY) => s1.onQuarantineFinalized({bucket: BUCKET,
    name: f.name, size: bytes.length, contentType: "video/mp4",
    generation: f.generation});
  w.validating = async () => {
    const f = w.upload(await w.reserve());
    assert.equal(await w.finalize(f), "validating");
    return f;
  };
  w.abandon = (filmId, operationId = crypto.randomUUID()) =>
    s1.abandonFilmUpload({auth, data: {schemaVersion: v1.CONTRACT_VERSION,
      operationId, action: "abandonFilmUpload",
      payload: {teamId: TEAM, filmId}}});
  w.reconcile = (limit = 50) => rc.reconcileQuarantine({limit});
  return w;
}

/** Make the worker's quarantine cleanup end `pending` (error) or 412. */
const failQuarantineCleanup = (w, mode) => {
  const orig = w.objects.deleteGeneration.bind(w.objects);
  w.objects.deleteGeneration = async (t) => {
    if (t.name.startsWith("quarantine/")) {
      if (mode === "mismatch") return "mismatch";
      throw Object.assign(new Error("unavailable"), {code: 503});
    }
    return orig(t);
  };
};

// ---------------------------------------------------------------------------
// CT-4.3 / §4 (r3.1): the D4 test-first decision. Positive AND negative
// cases run against the reconciler's filmProblem exactly as composed.
// ---------------------------------------------------------------------------
describe("CT-4.3 (§4, r3.1): reconciler film validation over worker-written " +
    "documents", () => {
  /** A worker-written `ready` document whose quarantine source remains. */
  const readyWithSource = async () => {
    const w = world();
    const f = await w.validating();
    failQuarantineCleanup(w, "error");
    // A5: the cleanup error propagates after the commit; the entry stays
    // `pending` (no terminal-error state exists)
    await assert.rejects(w.worker.processFilm({teamId: TEAM,
      filmId: f.filmId}), (e) => e.code === 503);
    assert.equal(w.film(f.filmId).status, "ready");
    assert.equal(w.job(f).cleanup.quarantine.result, "pending");
    assert.equal(w.objects.objects.get(f.name).generation, f.generation);
    return {w, f};
  };
  /** A worker-reason `rejected` document whose quarantine source remains. */
  const rejectedWithSource = async () => {
    const w = world({script: [{verdict: "container-invalid"}]});
    const f = await w.validating();
    failQuarantineCleanup(w, "error");
    await assert.rejects(w.worker.processFilm({teamId: TEAM,
      filmId: f.filmId}), (e) => e.code === 503);
    assert.equal(w.job(f).cleanup.quarantine.result, "pending");
    assert.equal(w.film(f.filmId).status, "rejected");
    assert.equal(w.film(f.filmId).rejectionReason, "container-invalid");
    return {w, f};
  };
  const problem = (w, f) => r.filmProblem(w.filmPath(f.filmId),
      w.db.snap(w.filmPath(f.filmId)).data());

  it("positives: worker `ready`, worker-reason `rejected` and the S1 " +
      "legacy document (absent r4 keys) are valid; a reconciler pass gives " +
      "duplicate-event with no evidence and no S1 obligation", async () => {
    const legacyW = world();
    const legacy = await legacyW.validating();
    assert.equal(problem(legacyW, legacy), null, "legacy");
    for (const mk of [readyWithSource, rejectedWithSource]) {
      const {w, f} = await mk();
      assert.equal(problem(w, f), null, w.film(f.filmId).status);
      w.advance(16 * MIN);
      const out = await w.reconcile();
      assert.deepEqual(out.outcomes, {"duplicate-event": 1},
          JSON.stringify(out));
      assert.deepEqual(w.evidence(), []);
      assert.deepEqual(w.records(), []);
    }
  });

  // Each negative corrupts ONE r4 aspect of a real worker `ready` (or
  // `rejected`) document. r4 (A3) requires all of these to be refused.
  const negatives = [
    ["ready without readyAt", "ready", (d) => {
      delete d.readyAt;
    }],
    ["ready with readyAt null", "ready", (d) => {
      d.readyAt = null;
    }],
    ["ready without normalizedGeneration", "ready", (d) => {
      delete d.normalizedGeneration;
    }],
    ["ready with a non-decimal normalizedGeneration", "ready", (d) => {
      d.normalizedGeneration = "12x";
    }],
    ["ready without media", "ready", (d) => {
      delete d.media;
    }],
    ["ready with invalid media (codec)", "ready", (d) => {
      d.media = {...d.media, videoCodec: "hevc"};
    }],
    ["ready with invalid media (extra key)", "ready", (d) => {
      d.media = {...d.media, gps: "1,2"};
    }],
    ["ready with media over the PENDING_D3 byte limit", "ready", (d) => {
      d.media = {...d.media, bytes: LIMITS.maxBytes + 1};
    }],
    ["ready with a malformed retentionExpiresAt", "ready", (d) => {
      d.retentionExpiresAt = "soon";
    }],
    ["rejected with an invalid worker reason", "rejected", (d) => {
      d.rejectionReason = "not-a-reason";
    }],
  ];
  for (const [name, status, corrupt] of negatives) {
    it(`negative: ${name} -> FilmAmbiguous (evidence, no decision)`,
        async () => {
          const {w, f} = status === "ready" ? await readyWithSource() :
            await rejectedWithSource();
          const p = w.filmPath(f.filmId);
          const d = w.db.read(p);
          corrupt(d);
          w.db.write(p, d);
          const before = JSON.stringify(w.db.read(p));
          assert.notEqual(problem(w, f), null, "filmProblem refuses");
          w.advance(16 * MIN);
          const out = await w.reconcile();
          assert.equal(out.evidence, 1, JSON.stringify(out));
          assert.match(w.evidence()[0].code, /^film-ambiguous:/);
          assert.deepEqual(w.records(), []);
          assert.equal(JSON.stringify(w.db.read(p)), before, "no decision");
        });
  }
});


const outputs = (w) => [...w.objects.objects.keys()]
    .filter((n) => n.startsWith("films/"));
const jobsOf = (w, filmId) => w.db.paths(`${w.filmPath(filmId)}/workerJobs/`);

// ---------------------------------------------------------------------------
// CT-4.1 / CT-4.2: end-to-end flows across S1, the worker and the reconciler
// ---------------------------------------------------------------------------
describe("CT-4.1/4.2 end-to-end flows (one store, direct worker invocation)",
    () => {
      it("CT-4.1 reserve -> upload -> finalize (with bucket) -> worker -> " +
          "ready: one promotion; quarantine generation removed " +
          "(generation-matched); slot ready", async () => {
        const w = world();
        const f = await w.validating();
        const out = await w.worker.processFilm({teamId: TEAM,
          filmId: f.filmId});
        assert.equal(out.outcome, "ready", JSON.stringify(out));
        const d = w.film(f.filmId);
        assert.equal(d.status, "ready");
        assert.equal(outputs(w).length, 1, "one promotion");
        assert.equal(d.normalizedGeneration,
            w.objects.objects.get(outputs(w)[0]).generation);
        assert.equal(w.objects.objects.has(f.name), false);
        assert.equal(w.job(f).cleanup.quarantine.result, "deleted");
        assert.ok(w.objects.calls.some((c) => c[0] === "deleteGeneration" &&
          c[1] === f.name && c[2] === f.generation));
        assert.equal(w.slots()[f.filmId].status, "ready");
        assert.deepEqual(w.records(), [], "no S1 cleanup obligation");
      });
      it("CT-4.2 lost finalize -> reconciler re-drive -> validating -> " +
          "worker -> ready: one promotion, one job", async () => {
        const w = world();
        const f = w.upload(await w.reserve()); // finalize event lost
        assert.equal(w.film(f.filmId).status, "reserved");
        w.advance(16 * MIN);
        const rec = await w.reconcile();
        assert.deepEqual(rec.outcomes, {validating: 1}, JSON.stringify(rec));
        assert.equal(w.film(f.filmId).objectGeneration, f.generation);
        const out = await w.worker.processFilm({teamId: TEAM,
          filmId: f.filmId});
        assert.equal(out.outcome, "ready");
        assert.equal(outputs(w).length, 1);
        assert.deepEqual(jobsOf(w, f.filmId),
            [`${w.filmPath(f.filmId)}/workerJobs/${f.jobId}`]);
        // a later pass sees nothing left to do
        const again = await w.reconcile();
        assert.equal(again.processed, 0);
        assert.deepEqual(w.evidence(), []);
      });
      it("CT-4.6 lost finalize after the reservation expired -> " +
          "stale-expired C1 obligation -> deleted", async () => {
        const w = world();
        const f = w.upload(await w.reserve());
        w.advance(LIMITS.reservationLifetimeMs + MIN);
        await w.reserve(); // lazy expiry of the first reservation
        assert.equal(w.film(f.filmId).status, "expired");
        const rec = await w.reconcile();
        assert.deepEqual(rec.outcomes, {"stale-expired": 1});
        const id = cl.cleanupIdFor(BUCKET, f.name, f.generation);
        const record = w.db.read(`filmCleanup/${id}`);
        assert.equal(record.origin, "finalize-stale-expired");
        assert.equal(record.state, "deleted");
        assert.equal(w.objects.objects.has(f.name), false);
      });
    });

// ---------------------------------------------------------------------------
// CT-4.4 / I-9: same-generation sources stay owned by the S2b job. A
// reconciler pass gives duplicate-event, no S1 record, no delete, no
// evidence, and the job record is byte-unchanged.
// ---------------------------------------------------------------------------
describe("CT-4.4 (I-9) same-generation sources owned by the S2b job", () => {
  const passLeavesJob = async (w, f) => {
    const job = JSON.stringify(w.job(f));
    const objectsBefore = [...w.objects.objects.keys()].sort();
    w.advance(16 * MIN);
    const out = await w.reconcile();
    assert.deepEqual(out.outcomes, {"duplicate-event": 1},
        JSON.stringify(out));
    assert.deepEqual(w.records(), []);
    assert.deepEqual(w.evidence(), []);
    assert.equal(JSON.stringify(w.job(f)), job, "job byte-unchanged");
    assert.deepEqual([...w.objects.objects.keys()].sort(), objectsBefore);
  };
  it("(a) validating whose job is recovery-needed", async () => {
    const w = world({script: ["crash", "infrastructure", "crash"]});
    const f = await w.validating();
    for (let i = 0; i < 3; i++) {
      await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
    }
    assert.equal(w.job(f).exhaustion.outcome, "recovery-needed");
    assert.equal(w.film(f.filmId).status, "validating");
    await passLeavesJob(w, f);
  });
  it("(b) ready whose quarantine cleanup ended mismatch (412): object " +
      "preserved", async () => {
    const w = world();
    const f = await w.validating();
    failQuarantineCleanup(w, "mismatch");
    const out = await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
    assert.equal(out.outcome, "ready");
    assert.equal(w.job(f).cleanup.quarantine.result, "mismatch");
    assert.equal(w.objects.objects.get(f.name).generation, f.generation);
    await passLeavesJob(w, f);
  });
  it("(c) ready and rejected whose quarantine cleanup is still pending " +
      "(unresolved, not proven failed)", async () => {
    for (const script of [[], [{verdict: "metadata-invalid"}]]) {
      const w = world({script});
      const f = await w.validating();
      failQuarantineCleanup(w, "error");
      await assert.rejects(w.worker.processFilm({teamId: TEAM,
        filmId: f.filmId}), (e) => e.code === 503);
      assert.equal(w.job(f).cleanup.quarantine.result, "pending");
      await passLeavesJob(w, f);
    }
  });
});

// ---------------------------------------------------------------------------
// CT-4.5: frozen v1 S1 handlers over worker-written stored documents.
// Expectation table derived from frozen A7 handlers.js (r3 section 7).
// ---------------------------------------------------------------------------
describe("CT-4.5 frozen v1 handlers over worker-written documents", () => {
  const V1_KEYS = Object.keys(v1.schemas.filmState.shape).sort();
  /** Worker-written film in each stored status. */
  const states = {
    "validating (job running)": async () => {
      const w = world();
      const f = await w.validating();
      // an admitted, still-running job: interrupt after admission
      w.objects.fault("downloadGeneration", "error");
      await w.worker.processFilm({teamId: TEAM, filmId: f.filmId})
          .catch(() => {});
      assert.ok(w.job(f), "job exists");
      return {w, f};
    },
    "validating (recovery-needed)": async () => {
      const w = world({script: ["crash", "infrastructure", "crash"]});
      const f = await w.validating();
      for (let i = 0; i < 3; i++) {
        await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
      }
      return {w, f};
    },
    "ready": async () => {
      const w = world();
      const f = await w.validating();
      await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
      return {w, f};
    },
    "rejected (worker reason)": async () => {
      const w = world({script: [{verdict: "video-codec-not-allowed"}]});
      const f = await w.validating();
      await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
      assert.equal(w.film(f.filmId).rejectionReason,
          "video-codec-not-allowed");
      return {w, f};
    },
  };
  const withPendingCleanup = (script) => async () => {
    const w = world({script});
    const f = await w.validating();
    failQuarantineCleanup(w, "error");
    await assert.rejects(w.worker.processFilm({teamId: TEAM,
      filmId: f.filmId}), (e) => e.code === 503);
    return {w, f};
  };
  states["ready"].pending = withPendingCleanup([]);
  states["rejected (worker reason)"].pending =
    withPendingCleanup([{verdict: "video-codec-not-allowed"}]);
  const snapshot = (w, f) => JSON.stringify({film: w.film(f.filmId),
    job: w.job(f)});

  for (const [label, make] of Object.entries(states)) {
    const status = label.split(" ")[0];
    it(`${label}: abandon (v1)`, async () => {
      const {w, f} = await make();
      const before = w.film(f.filmId);
      const slotsBefore = w.slots();
      const res = await w.abandon(f.filmId);
      if (status === "validating") {
        assert.equal(res.ok, true, JSON.stringify(res));
        assert.equal(res.data.previousStatus, "validating");
        assert.deepEqual(Object.keys(res.data.film).sort(), V1_KEYS,
            "v1 FilmState keys only");
        assert.equal(res.data.film.rejectionReason, null);
        const after = w.film(f.filmId);
        assert.equal(after.status, "abandoned");
        for (const k of ["readyAt", "normalizedGeneration", "media",
          "retentionExpiresAt"]) {
          assert.deepEqual(after[k], before[k], `${k} retained`);
        }
        assert.ok(slotsBefore[f.filmId]);
        assert.equal(w.slots()[f.filmId], undefined, "slot released");
        const id = cl.cleanupIdFor(BUCKET, f.name, f.generation);
        assert.equal(w.db.read(`filmCleanup/${id}`).origin, "abandon");
        // released at most once: a second abandon is idempotent
        const again = await w.abandon(f.filmId);
        assert.equal(again.data.previousStatus, "abandoned");
        assert.deepEqual(w.slots(), {});
      } else {
        const snap = snapshot(w, f);
        assert.deepEqual(res, {ok: false, error: {code: "failed-precondition",
          retryable: false, reason: "invalid-state"}});
        assert.equal(snapshot(w, f), snap, "no write");
        assert.deepEqual(w.slots(), slotsBefore);
      }
    });
    it(`${label}: finalize of the same generation -> no write ` +
        "(duplicate-event while the source exists; object-gone once the " +
        "worker removed it: frozen finalize reads the head first)",
    async () => {
      const {w, f} = await make();
      const snap = snapshot(w, f);
      const present = w.objects.objects.has(f.name) &&
        w.objects.objects.get(f.name).generation === f.generation;
      assert.equal(present, status === "validating",
          "the worker removes the source only on ready/rejected");
      assert.equal(await w.finalize(f), present ? "duplicate-event" :
        "object-gone");
      assert.equal(snapshot(w, f), snap);
      assert.deepEqual(w.records(), []);
    });
    if (status !== "validating") {
      it(`${label} with the source still present (worker cleanup ` +
          "pending): same-generation finalize -> duplicate-event, no write",
      async () => {
        const {w, f} = await make.pending();
        const snap = snapshot(w, f);
        assert.equal(await w.finalize(f), "duplicate-event");
        assert.equal(snapshot(w, f), snap);
        assert.deepEqual(w.records(), []);
      });
    }
    it(`${label}: finalize of another generation -> stale-${status} + ` +
        "obligation for that generation; film unchanged", async () => {
      const {w, f} = await make();
      const snap = snapshot(w, f);
      const other = {...f, generation: w.objects.put(f.name, BODY)};
      assert.equal(await w.finalize(other), `stale-${status}`);
      assert.equal(snapshot(w, f), snap);
      const id = cl.cleanupIdFor(BUCKET, f.name, other.generation);
      assert.equal(w.db.read(`filmCleanup/${id}`).origin,
          `finalize-stale-${status}`);
    });
  }
  it("abandoned (after worker cancellation): abandon is idempotent, " +
      "same-generation finalize is object-gone (source deleted), other generation is " +
      "stale-abandoned, abandon replay returns the stored receipt", async () => {
    const env = {};
    const w = world({script: [{before: async () => {
      env.first = await w.abandon(env.filmId, env.op);
    }, then: "ok"}]});
    const f = await w.validating();
    env.filmId = f.filmId;
    env.op = crypto.randomUUID();
    const run = await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
    assert.equal(run.outcome, "aborted");
    assert.equal(env.first.ok, true);
    const replay = await w.abandon(f.filmId, env.op);
    assert.deepEqual(replay, env.first, "stored receipt byte-identical");
    const again = await w.abandon(f.filmId);
    assert.equal(again.data.previousStatus, "abandoned");
    // C1 deleted the source at abandon: same-generation finalize reads no
    // head -> object-gone (no write); another generation -> stale-abandoned
    assert.equal(w.objects.objects.has(f.name), false);
    const snap = JSON.stringify(w.film(f.filmId));
    assert.equal(await w.finalize(f), "object-gone");
    assert.equal(JSON.stringify(w.film(f.filmId)), snap);
    const other = {...f, generation: w.objects.put(f.name, BODY)};
    assert.equal(await w.finalize(other), "stale-abandoned");
    assert.deepEqual(w.slots(), {});
  });
  it("validating abandon replay: stored receipt byte-identical; only an " +
      "eligible cleanup attempt", async () => {
    const {w, f} = await states["validating (job running)"]();
    const op = crypto.randomUUID();
    const first = await w.abandon(f.filmId, op);
    const id = cl.cleanupIdFor(BUCKET, f.name, f.generation);
    const rec = w.db.read(`filmCleanup/${id}`);
    assert.equal(rec.state, "deleted");
    const replay = await w.abandon(f.filmId, op);
    assert.deepEqual(replay, first);
    assert.deepEqual(w.db.read(`filmCleanup/${id}`), rec,
        "terminal record: no further attempt");
  });
});

// ---------------------------------------------------------------------------
// CT-6: double targeting the same generation (worker and C1). Constructed
// explicitly: frozen finalize never owes a same-generation source.
// ---------------------------------------------------------------------------
describe("CT-6 double targeting: one delete, then absent; 404/412 distinct",
    () => {
      const c1 = (w) => cl.createCleanup({db: w.db,
        bucketName: () => BUCKET, getBucket: () => w.storage,
        now: () => w.clock.t, logger: {info() {}, warn() {}, error() {}}});
      const owe = async (w, f, generation) => {
        const c = c1(w);
        const at = w.clock.t;
        const {id} = await w.db.runTransaction((tx) => c.obligate(tx,
            {bucket: BUCKET, name: f.name, generation}, "abandon", at));
        return {c, id};
      };
      it("worker deleted the generation; a C1 attempt on it -> absent (404)",
          async () => {
            const w = world();
            const f = await w.validating();
            await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
            assert.equal(w.job(f).cleanup.quarantine.result, "deleted");
            const deletes = () => w.objects.calls.filter((x) =>
              x[0] === "deleteGeneration" && x[1] === f.name).length;
            assert.equal(deletes(), 1);
            const {c, id} = await owe(w, f, f.generation);
            const r1 = await c.attemptOnce(id);
            assert.equal(w.db.read(`filmCleanup/${id}`).state, "absent",
                JSON.stringify(r1));
            assert.equal(deletes(), 2, "one real delete, one 404");
          });
      it("C1 on a replaced object -> mismatch (412), newer object " +
          "preserved; the worker records 412 as mismatch too", async () => {
        const w = world();
        const f = await w.validating();
        failQuarantineCleanup(w, "mismatch");
        await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
        assert.equal(w.job(f).cleanup.quarantine.result, "mismatch");
        const newer = w.objects.put(f.name, BODY);
        const {c, id} = await owe(w, f, f.generation);
        await c.attemptOnce(id);
        assert.equal(w.db.read(`filmCleanup/${id}`).state, "mismatch");
        assert.equal(w.objects.objects.get(f.name).generation, newer);
      });
    });

// ---------------------------------------------------------------------------
// CT-5 (server side): capture REAL worker-written stored documents with the
// reviewed timestamp projection only (contract-v2 FILM_TIMESTAMP_FIELDS ->
// v1.toWireTimestamp, as the worker's readFilm). Committed with SHA256SUMS;
// regenerated here on every run and compared byte-for-byte. D8 (Codex)
// parses these files. Stored documents, not a v2 callable response.
// ---------------------------------------------------------------------------
const CAPTURE_DIR = path.join(__dirname, "fixtures", "film-int-captured");
const project = (d) => {
  const out = {};
  for (const k of Object.keys(d).sort()) {
    out[k] = c2.FILM_TIMESTAMP_FIELDS.includes(k) ?
      v1.toWireTimestamp(d[k]) : d[k];
  }
  return out;
};
/** @return {Promise<object>} name -> {source, document} */
async function captures() {
  const out = {};
  const keep = (name, source, w, filmId) => {
    out[name] = {schema: "film-int-capture.v1",
      kind: "stored-film-document", source,
      projection: "contract-v2 FILM_TIMESTAMP_FIELDS -> toWireTimestamp",
      document: project(w.db.read(w.filmPath(filmId)))};
  };
  {
    const w = world();
    const f = await w.validating();
    keep("validating", "CT-4.1 after S1 finalize", w, f.filmId);
    await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
    keep("ready", "CT-4.1 worker ready", w, f.filmId);
  }
  for (const reason of ["container-invalid", "metadata-invalid",
    "video-codec-not-allowed", "duration-over-limit"]) {
    const w = world({script: [{verdict: reason}]});
    const f = await w.validating();
    await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
    keep(`rejected-${reason}`, "worker verdict", w, f.filmId);
  }
  {
    const kill = {kill: "SIGXCPU", step: "normalize"};
    const w = world({script: [kill, kill, kill]});
    const f = await w.validating();
    for (let i = 0; i < 3; i++) {
      await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
    }
    keep("rejected-processing-limit-exceeded", "worker limit exhaustion",
        w, f.filmId);
  }
  {
    const env = {};
    const w = world({script: [{before: async () => {
      await w.abandon(env.filmId);
    }, then: "ok"}]});
    const f = await w.validating();
    env.filmId = f.filmId;
    await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
    keep("abandoned", "S1 abandon during worker run", w, f.filmId);
  }
  return out;
}
const serialize = (o) => `${JSON.stringify(o, null, 2)}\n`;
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");

describe("CT-5 captured worker-written stored documents (server side)", () => {
  it("captures are deterministic, r4-valid stored documents and equal " +
      "the committed files byte-for-byte (FILM_INT_WRITE_CAPTURES=1 " +
      "rewrites them)", async () => {
    const a = await captures();
    const b = await captures();
    assert.deepEqual(Object.keys(a), Object.keys(b));
    for (const k of Object.keys(a)) {
      assert.equal(serialize(a[k]), serialize(b[k]), `${k} deterministic`);
      assert.ok(c2.schemas.filmDocument.safeParse(a[k].document).success,
          `${k} is an r4 stored document`);
    }
    const files = Object.keys(a).sort().map((k) => [`${k}.json`,
      serialize(a[k])]);
    const sums = files.map(([n, t]) => `${sha(t)}  ${n}`).join("\n") + "\n";
    if (process.env.FILM_INT_WRITE_CAPTURES === "1") {
      fs.mkdirSync(CAPTURE_DIR, {recursive: true});
      for (const [n, t] of files) fs.writeFileSync(path.join(CAPTURE_DIR, n), t);
      fs.writeFileSync(path.join(CAPTURE_DIR, "SHA256SUMS.txt"), sums);
    }
    for (const [n, t] of files) {
      assert.equal(fs.readFileSync(path.join(CAPTURE_DIR, n), "utf8"), t,
          `${n} regenerated byte-equal`);
    }
    assert.equal(fs.readFileSync(path.join(CAPTURE_DIR, "SHA256SUMS.txt"),
        "utf8"), sums);
    assert.deepEqual(fs.readdirSync(CAPTURE_DIR).sort(),
        [...files.map(([n]) => n), "SHA256SUMS.txt"].sort(),
        "no stale or extra capture");
  });
});
