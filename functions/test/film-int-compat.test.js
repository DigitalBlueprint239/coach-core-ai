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

module.exports = {world, failQuarantineCleanup, TEAM, BUCKET, PROJECT, T0,
  MIN, BODY};

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
