"use strict";
// FILM-S2b cross-boundary tests (statement r2 "Acceptance"): the UNCHANGED
// S1 v1 handlers (reserve -> quarantine finalize -> validating; abandon)
// and the TEST_ONLY worker with the PINNED decoder and the real pipeline,
// against the LOCAL Firestore emulator (demo-* project). Object storage uses
// the generation-true double because the Storage emulator ignores
// generations and preconditions (package §4.8). No v2-callable or
// full-client acceptance is claimed: S1 callables still speak coach-film.v1.
// Run: firebase emulators:exec --project demo-coach-core-beta --only
//   firestore "node --test functions/test/emulator/film-s2b.emulator.test.js"
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PROJECT = process.env.GCLOUD_PROJECT || "demo-coach-core-beta";
if (!PROJECT.startsWith("demo-") || !process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("S2b emulator tests need a demo-* project + the emulator");
}
const PINNED = process.env.PINNED === "1";
if (!PINNED && process.env.DEV_DECODER !== "1") {
  throw new Error("set PINNED=1 (CI) or DEV_DECODER=1; refusing to skip");
}

const {initializeApp, getApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const v1 = require("../../src/film/contract");
const c2 = require("../../src/film/contract-v2");
const {createFilmHandlers} = require("../../src/film/handlers");
const {createFilmWorker, jobIdFor} = require("../../src/film/worker/worker");
const {createDecoder, pinnedDigests, fileSha256} =
  require("../../src/film/worker/decoder");
const {WORKER_LIMITS} = require("../../src/film/worker/limits");
const {FakeObjects} = require("../film-worker-doubles");

initializeApp({projectId: PROJECT}, "film-s2b");
const db = getFirestore(getApp("film-s2b"));
const BIN = {ffmpeg: process.env.FFMPEG_BIN, ffprobe: process.env.FFPROBE_BIN};
const decoder = createDecoder({...BIN, expectedSha256: PINNED ?
  pinnedDigests() : {ffmpeg: fileSha256(BIN.ffmpeg),
    ffprobe: fileSha256(BIN.ffprobe)},
limits: PINNED ? WORKER_LIMITS : {...WORKER_LIMITS, status: "MEASURED"}});
const limits = PINNED ? WORKER_LIMITS : {...WORKER_LIMITS,
  status: "MEASURED"};
const FIX = path.join(__dirname, "..", "..", "..", "tools", "ffmpeg",
    "fixtures", "frozen");
const OWNER = "uid-owner";
const T0 = new Date("2026-10-19T21:00:00.000Z");
const logger = {info() {}, warn() {}, error() {}};
const auth = {uid: OWNER, token: {email_verified: true,
  firebase: {sign_in_provider: "google.com"}, auth_time: 1760900000}};

/** A fresh team world on the emulator. */
async function world() {
  const team = `team-s2b-${crypto.randomUUID().slice(0, 8)}`;
  await db.collection("teams").doc(team).set({ownerId: OWNER, name: "S2b"});
  const objects = new FakeObjects();
  const clock = {t: T0};
  const s1 = createFilmHandlers({db, Timestamp,
    getUser: async () => ({uid: OWNER, disabled: false,
      customClaims: {beta: true}}), ...objects.s1(), logger,
    now: () => clock.t});
  const mk = () => createFilmWorker({db, Timestamp, objects, decoder,
    isEnabled: () => true, now: () => clock.t, logger, limits});
  return {team, objects, clock, s1, mk};
}

/** v1 reserve -> upload -> finalize: film is `validating`. */
async function validating(w, fixture) {
  const bytes = fs.readFileSync(path.join(FIX, fixture));
  const request = {schemaVersion: v1.CONTRACT_VERSION,
    operationId: crypto.randomUUID(), action: "reserveFilmUpload",
    payload: {teamId: w.team, declaredBytes: bytes.length,
      declaredContentType: "video/mp4", fileName: "clip.mp4",
      rightsAcknowledged: true, rightsWordingVersion: "rights-v1"}};
  const r = await w.s1.reserveFilmUpload({auth, data: request});
  assert.equal(r.ok, true, JSON.stringify(r));
  const filmId = r.data.filmId;
  const name = v1.uploadPathFor(w.team, filmId);
  const generation = w.objects.put(name, bytes);
  assert.equal(await w.s1.onQuarantineFinalized({name, size: bytes.length,
    contentType: "video/mp4", generation}), "validating");
  return {filmId, name, generation, receipt: r, request,
    jobId: jobIdFor(w.team, filmId, generation)};
}

const film = async (w, f) => (await db.doc(
    `teams/${w.team}/films/${f.filmId}`).get()).data();
const slots = async (w) => ((await db.doc(
    `teams/${w.team}/filmLedger/cap`).get()).data() || {}).slots || {};
const wire = (d) => {
  const out = {};
  for (const [k, v] of Object.entries(d)) {
    out[k] = c2.FILM_TIMESTAMP_FIELDS.includes(k) ? v1.toWireTimestamp(v) : v;
  }
  return out;
};
const abandonReq = (w, f) => ({auth, data: {
  schemaVersion: v1.CONTRACT_VERSION, operationId: crypto.randomUUID(),
  action: "abandonFilmUpload", payload: {teamId: w.team, filmId: f.filmId}}});

describe("unchanged v1 reserve/intake -> worker (Firestore emulator)", () => {
  it("s10: ready; one slot kept as 'ready'; v2 FilmDocument/FilmState " +
      "valid; receipt and reservation timestamps untouched", async () => {
    const w = await world();
    const f = await validating(w, "s10-known-good.mp4");
    const before = await film(w, f);
    w.clock.t = new Date(T0.getTime() + 2 * 3600 * 1000);
    const r = await w.mk().processFilm({teamId: w.team, filmId: f.filmId,
      eventId: "evt-1"});
    assert.equal(r.outcome, "ready", JSON.stringify(r));
    const d = await film(w, f);
    assert.equal(d.status, "ready");
    assert.equal(d.readyAt.toMillis(), d.statusChangedAt.toMillis());
    assert.equal(d.retentionExpiresAt, null);
    assert.equal(d.media.width, 160);
    assert.equal(d.reservationExpiresAt.toMillis(),
        before.reservationExpiresAt.toMillis());
    assert.ok(c2.schemas.filmState.safeParse(wire(d)).success);
    assert.ok(c2.schemas.filmDocument.safeParse(wire(d)).success);
    const s = await slots(w);
    assert.deepEqual(Object.keys(s), [f.filmId]);
    assert.equal(s[f.filmId].status, "ready");
    // the S1 reserve receipt is untouched: replaying the same v1 operation
    // returns the original, historical receipt (still `reserved`, v1)
    const replay = await w.s1.reserveFilmUpload({auth, data: f.request});
    assert.deepEqual(replay, f.receipt);
    assert.equal(replay.data.film.status, "reserved");
    assert.ok(v1.RESPONSE_SCHEMAS.reserveFilmUpload.safeParse(replay)
        .success);
    assert.equal(w.objects.objects.has(f.name), false, "quarantine deleted");
  });
  it("s11a: rejected container-invalid; slot released exactly once",
      async () => {
        const w = await world();
        const f = await validating(w, "s11a-oversized-moov-size.mp4");
        const r = await w.mk().processFilm({teamId: w.team,
          filmId: f.filmId});
        assert.equal(r.outcome, "rejected", JSON.stringify(r));
        const d = await film(w, f);
        assert.equal(d.rejectionReason, "container-invalid");
        for (const k of ["readyAt", "normalizedGeneration", "media",
          "retentionExpiresAt"]) {
          assert.equal(d[k], null, k);
        }
        assert.deepEqual(await slots(w), {});
        assert.ok(c2.schemas.filmState.safeParse(wire(d)).success);
      });
  it("lease race on real transactions: one promotion, one output",
      async () => {
        const w = await world();
        const f = await validating(w, "s10-known-good.mp4");
        const [a, b] = await Promise.all([
          w.mk().processFilm({teamId: w.team, filmId: f.filmId,
            eventId: "a"}),
          w.mk().processFilm({teamId: w.team, filmId: f.filmId,
            eventId: "b"})]);
        assert.deepEqual([a.outcome, b.outcome].sort(),
            ["ready", "skip-contention"]);
        assert.equal(w.objects.calls.filter((c) => c[0] === "createOnly")
            .length, 1);
      });
});

describe("cancellation during work (S1 abandon observed, unchanged)", () => {
  it("v1 abandonment during work: worker stops, no ready, slot released " +
      "once by S1", async () => {
    const w = await world();
    const f = await validating(w, "s10-known-good.mp4");
    const dec = {...decoder, run: async (...a) => {
      if (!w.abandoned) {
        w.abandoned = await w.s1.abandonFilmUpload(abandonReq(w, f));
      }
      return decoder.run(...a);
    }};
    const worker = createFilmWorker({db, Timestamp, objects: w.objects,
      decoder: dec, isEnabled: () => true, now: () => w.clock.t, logger,
      limits});
    const r = await worker.processFilm({teamId: w.team, filmId: f.filmId});
    assert.equal(w.abandoned.ok, true);
    assert.equal(r.outcome, "aborted", JSON.stringify(r));
    assert.equal((await film(w, f)).status, "abandoned");
    assert.deepEqual(await slots(w), {});
    assert.equal(w.objects.calls.filter((c) => c[0] === "createOnly").length,
        0);
  });
  it("stale output after abandonment: the proven own output is deleted " +
      "(generation-matched); nothing else", async () => {
    const w = await world();
    const f = await validating(w, "s10-known-good.mp4");
    const key = `films/${w.team}/${f.filmId}/jobs/${f.jobId}/normalized.mp4`;
    const orig = w.objects.createOnly.bind(w.objects);
    w.objects.createOnly = async (t) => {
      const out = await orig(t);
      await w.s1.abandonFilmUpload(abandonReq(w, f));
      return out;
    };
    const r = await w.mk().processFilm({teamId: w.team, filmId: f.filmId});
    assert.equal(r.outcome, "film-changed", JSON.stringify(r));
    assert.equal((await film(w, f)).status, "abandoned");
    assert.equal(w.objects.objects.has(key), false);
    const job = (await db.doc(`teams/${w.team}/films/${f.filmId}/` +
      `workerJobs/${f.jobId}`).get()).data();
    assert.equal(job.cleanup.output.result, "deleted");
    assert.deepEqual(await slots(w), {});
  });
});
