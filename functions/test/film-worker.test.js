"use strict";
// FILM-S2b worker orchestration (statement r2, #39 c-6294022891), driven
// THROUGH the accepted S1 handlers (reserve -> quarantine finalize ->
// validating; abandon) on an in-memory Firestore with optimistic
// transactions and a generation-true object store. The media pipeline is
// scripted here; the real pipeline runs against the PINNED decoder in
// test/worker-pinned (CI). Clock injected. TEST ONLY.
const {describe, it, beforeEach} = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const v1 = require("../src/film/contract");
const c2 = require("../src/film/contract-v2");
const {createFilmHandlers} = require("../src/film/handlers");
const {createFilmWorker, jobIdFor} = require("../src/film/worker/worker");
const {WORKER_LIMITS, leaseTtlMs} = require("../src/film/worker/limits");
const {FakeTimestamp, FakeFirestore, FakeObjects, fakeDecoder,
  scriptedPipeline} = require("./film-worker-doubles");

const OWNER = "uid-owner";
const TEAM = "team-film-a";
const T0 = new Date("2026-10-19T21:00:00.000Z");
const HOUR = 3600 * 1000;
const TTL = leaseTtlMs(WORKER_LIMITS);
const HEAD = Buffer.concat([Buffer.from([0, 0, 0, 16]),
  Buffer.from("ftypisom"), Buffer.from([0, 0, 2, 0])]);
const BODY = Buffer.concat([HEAD, Buffer.alloc(16)]);

let env;

/** Fresh world: S1 handlers + worker over the same doubles. */
function world(o = {}) {
  const db = new FakeFirestore();
  const objects = new FakeObjects();
  const clock = {t: T0};
  const logger = {info() {}, warn() {}, error() {}};
  db.write(`teams/${TEAM}`, {ownerId: OWNER, name: "A"});
  const s1 = createFilmHandlers({db, Timestamp: FakeTimestamp,
    getUser: async () => ({uid: OWNER, disabled: false,
      customClaims: {beta: true}}),
    ...objects.s1(), logger, now: () => clock.t});
  const pipeline = scriptedPipeline(o.script || [], o.outputBytes);
  const decoder = o.decoder || fakeDecoder();
  let ids = 0;
  const mk = (extra = {}) => createFilmWorker({db, Timestamp: FakeTimestamp,
    objects, decoder, runPipeline: pipeline, isEnabled: () => true,
    now: () => clock.t, newId: () => `exec-${++ids}`, logger,
    limits: WORKER_LIMITS, ...extra});
  return {db, objects, clock, s1, pipeline, decoder, worker: mk(), mk};
}

const auth = {uid: OWNER, token: {email_verified: true,
  firebase: {sign_in_provider: "google.com"}, auth_time: 1760900000}};

/** Reserve + upload + finalize through S1: film is `validating`. */
async function validatingFilm(w, bytes = BODY) {
  const r = await w.s1.reserveFilmUpload({auth, data: {
    schemaVersion: v1.CONTRACT_VERSION, operationId: crypto.randomUUID(),
    action: "reserveFilmUpload", payload: {teamId: TEAM,
      declaredBytes: bytes.length, declaredContentType: "video/mp4",
      fileName: "clip.mp4", rightsAcknowledged: true,
      rightsWordingVersion: "rights-v1"}}});
  assert.equal(r.ok, true, JSON.stringify(r));
  const filmId = r.data.filmId;
  const name = v1.uploadPathFor(TEAM, filmId);
  const generation = w.objects.put(name, bytes);
  const out = await w.s1.onQuarantineFinalized({name, size: bytes.length,
    contentType: "video/mp4", generation});
  assert.equal(out, "validating");
  return {filmId, name, generation, receipt: r,
    jobId: jobIdFor(TEAM, filmId, generation)};
}

const filmPath = (f) => `teams/${TEAM}/films/${f}`;
const ledger = (w) => w.db.read(`teams/${TEAM}/filmLedger/cap`).slots;
const job = (w, f) => w.db.read(`${filmPath(f.filmId)}/workerJobs/${f.jobId}`);
const wireDoc = (w, filmId) => {
  const d = w.db.read(filmPath(filmId));
  for (const k of c2.FILM_TIMESTAMP_FIELDS) {
    if (d[k] !== undefined) d[k] = v1.toWireTimestamp(d[k]);
  }
  return d;
};

beforeEach(() => {
  env = null;
});

describe("B. gating, designation, configuration", () => {
  it("switch OFF: zero Firestore, Storage and decoder I/O", async () => {
    const w = world();
    const f = await validatingFilm(w);
    const before = {commits: w.db.commits, calls: w.objects.calls.length};
    let reads = 0;
    const db = new Proxy(w.db, {get(t, k) {
      reads += 1;
      return t[k];
    }});
    const off = createFilmWorker({db, Timestamp: FakeTimestamp,
      objects: w.objects, decoder: w.decoder, runPipeline: w.pipeline,
      logger: {info() {}, warn() {}, error() {}}});
    const r = await off.onFilmWritten({id: "e1", params: {teamId: TEAM,
      filmId: f.filmId}, data: {after: {data: () => ({status: "validating"})}}});
    assert.deepEqual(r, {outcome: "disabled"});
    assert.equal(reads, 0);
    assert.equal(w.db.commits, before.commits);
    assert.equal(w.objects.calls.length, before.calls);
    assert.equal(w.decoder.state.preflights, 0);
    assert.equal(w.pipeline.calls.length, 0);
  });
  it("default switch reads the env and is OFF unless exactly 'true'",
      async () => {
        const {workerEnabled} = require("../src/film/worker/designation");
        assert.equal(workerEnabled({}), false);
        assert.equal(workerEnabled({COACH_CORE_FILM_WORKER_ENABLED: "1"}),
            false);
        assert.equal(workerEnabled({COACH_CORE_FILM_WORKER_ENABLED: "true"}),
            true);
      });
  it("configuration preflight failure stalls; consumes nothing; no decoder",
      async () => {
        const w = world({decoder: fakeDecoder({ok: false,
          reason: "ffmpeg-digest-mismatch"})});
        const f = await validatingFilm(w);
        const r = await w.worker.processFilm({teamId: TEAM, filmId: f.filmId,
          eventId: "e1"});
        assert.equal(r.outcome, "stalled-configuration");
        const j = job(w, f);
        assert.equal(j.admitted, 0);
        assert.equal(j.attempts.length, 0);
        assert.equal(j.counters.configurationStalls, 1);
        assert.equal(j.stalled.reason, "ffmpeg-digest-mismatch");
        assert.equal(w.pipeline.calls.length, 0);
        assert.equal(w.db.read(filmPath(f.filmId)).status, "validating");
      });
});

describe("ready and rejected commits through S1 (ledger fidelity)", () => {
  it("v1 reserve/intake -> worker ready: one slot kept, now 'ready'",
      async () => {
        const w = world();
        const f = await validatingFilm(w);
        const before = w.db.read(filmPath(f.filmId));
        const ops = w.db.paths("filmOperations/").map((p) => w.db.read(p));
        w.clock.t = new Date(T0.getTime() + 2 * HOUR); // after reservation
        const r = await w.worker.processFilm({teamId: TEAM, filmId: f.filmId,
          eventId: "e1"});
        assert.equal(r.outcome, "ready", JSON.stringify(r));
        const d = w.db.read(filmPath(f.filmId));
        assert.equal(d.status, "ready");
        assert.equal(d.readyAt.toMillis(), d.statusChangedAt.toMillis());
        assert.equal(d.retentionExpiresAt, null);
        assert.equal(d.normalizedGeneration, r.generation);
        assert.equal(d.createdAt.toMillis(), before.createdAt.toMillis());
        assert.equal(d.reservationExpiresAt.toMillis(),
            before.reservationExpiresAt.toMillis());
        assert.deepEqual(Object.keys(ledger(w)), [f.filmId]);
        assert.equal(ledger(w)[f.filmId].status, "ready");
        // receipts untouched, no replay or rewrite
        assert.deepEqual(w.db.paths("filmOperations/").map((p) => w.db.read(p)),
            ops);
        // the stored document is a valid r4 FilmDocument and FilmState
        const wire = wireDoc(w, f.filmId);
        assert.ok(c2.schemas.filmDocument.safeParse(wire).success);
        assert.ok(c2.schemas.filmState.safeParse(wire).success,
            JSON.stringify(c2.schemas.filmState.safeParse(wire).error));
        // quarantine generation removed by a generation-matched delete
        assert.equal(w.objects.objects.has(f.name), false);
        assert.equal(job(w, f).cleanup.quarantine.result, "deleted");
        // the output exists at the job-scoped key with matching digest
        const out = w.objects.objects.get(
            `films/${TEAM}/${f.filmId}/jobs/${f.jobId}/normalized.mp4`);
        assert.equal(out.generation, r.generation);
        assert.equal(out.metadata.jobId, f.jobId);
      });
  it("media verdict rejects at once: slot released exactly once, new " +
      "ready fields null", async () => {
    const w = world({script: [{verdict: "container-invalid"}]});
    const f = await validatingFilm(w);
    const r = await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
    assert.equal(r.outcome, "rejected");
    const d = w.db.read(filmPath(f.filmId));
    assert.equal(d.status, "rejected");
    assert.equal(d.rejectionReason, "container-invalid");
    for (const k of ["readyAt", "normalizedGeneration", "media",
      "retentionExpiresAt"]) {
      assert.equal(d[k], null, k);
    }
    assert.deepEqual(ledger(w), {});
    assert.ok(c2.schemas.filmState.safeParse(wireDoc(w, f.filmId)).success);
    assert.equal(job(w, f).attempts[0].end.end, "media-verdict");
    assert.equal(job(w, f).admitted, 1);
    assert.equal(w.objects.objects.has(f.name), false);
  });
  it("terminal films are never reprocessed or rewritten", async () => {
    for (const script of [["ok"], [{verdict: "media-corrupt"}]]) {
      const w = world({script});
      const f = await validatingFilm(w);
      await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
      const film = w.db.read(filmPath(f.filmId));
      const led = ledger(w);
      const r = await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
      assert.equal(r.outcome, "not-validating");
      assert.deepEqual(w.db.read(filmPath(f.filmId)), film);
      assert.deepEqual(ledger(w), led);
      assert.equal(w.pipeline.calls.length, 1);
    }
  });
});

describe("attempt policy via the r4 helpers (3 total, 6 h, retry OFF)", () => {
  it("duplicate deliveries and contention never admit or count", async () => {
    const w = world({script: [{before: async () => {
      const dup = await w.mk().processFilm({teamId: TEAM, filmId: env.filmId,
        eventId: "e1"});
      const other = await w.mk().processFilm({teamId: TEAM,
        filmId: env.filmId, eventId: "e2"});
      env.inner = [dup.outcome, other.outcome];
    }, then: "ok"}]});
    const f = await validatingFilm(w);
    env = {filmId: f.filmId};
    const r = await w.worker.processFilm({teamId: TEAM, filmId: f.filmId,
      eventId: "e1"});
    assert.equal(r.outcome, "ready");
    assert.deepEqual(env.inner, ["skip-duplicate", "skip-contention"]);
    const j = job(w, f);
    assert.equal(j.admitted, 1);
    assert.equal(j.counters.duplicateDeliveries, 1);
    assert.equal(j.counters.contentionSkips, 1);
    assert.equal(w.pipeline.calls.length, 1);
  });
  it("two same-step classified kills: attempt 3 still admissible; third " +
      "same-step kill -> processing-limit-exceeded", async () => {
    const kill = {kill: "SIGXCPU", step: "decode-input"};
    const w = world({script: [kill, kill, kill]});
    const f = await validatingFilm(w);
    const r1 = await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
    const r2 = await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
    assert.equal(r1.exhaustion, null);
    assert.equal(r2.exhaustion, null, "no premature exhaustion");
    assert.equal(w.db.read(filmPath(f.filmId)).status, "validating");
    const r3 = await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
    assert.equal(r3.exhaustion.outcome, "rejected");
    const d = w.db.read(filmPath(f.filmId));
    assert.equal(d.status, "rejected");
    assert.equal(d.rejectionReason, "processing-limit-exceeded");
    assert.deepEqual(ledger(w), {});
    // a fourth attempt is never admitted: no decoder, no upload
    const r4 = await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
    assert.equal(r4.outcome, "not-validating");
    assert.equal(w.pipeline.calls.length, 3);
    assert.equal(job(w, f).admitted, 3);
  });
  it("kills on different steps, SIGKILL, crash/infra -> recovery-needed: " +
      "validating, slot held, never rejected", async () => {
    const scripts = [
      [{kill: "SIGXCPU", step: "decode-input"}, {kill: "SIGXCPU",
        step: "normalize"}, {kill: "SIGXCPU", step: "decode-output"}],
      [{kill: "SIGKILL", step: "decode-input"}, {kill: "SIGKILL",
        step: "decode-input"}, {kill: "SIGKILL", step: "decode-input"}],
      ["crash", "infrastructure", "crash"],
    ];
    for (const script of scripts) {
      const w = world({script});
      const f = await validatingFilm(w);
      const changed = w.db.read(filmPath(f.filmId)).statusChangedAt.toMillis();
      for (let i = 0; i < 3; i++) {
        await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
      }
      const j = job(w, f);
      assert.equal(j.exhaustion.outcome, "recovery-needed");
      assert.equal(j.recovery.reason, "attempts-exhausted");
      const d = w.db.read(filmPath(f.filmId));
      assert.equal(d.status, "validating");
      assert.equal(d.statusChangedAt.toMillis(), changed, "T6' preserved");
      assert.equal(ledger(w)[f.filmId].status, "validating");
      const again = await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
      assert.equal(again.outcome, "recovery-needed");
      assert.equal(w.pipeline.calls.length, 3);
    }
  });
  it("a crash after admission consumes the attempt (no decoder needed)",
      async () => {
        const w = world({script: [{before: async () => {
          throw new Error("instance lost after admission");
        }, then: "ok"}]});
        const f = await validatingFilm(w);
        await assert.rejects(w.worker.processFilm({teamId: TEAM,
          filmId: f.filmId}));
        let j = job(w, f);
        assert.equal(j.admitted, 1);
        assert.equal(j.attempts[0].end, null);
        // lease still live: a new delivery is contention, not processing
        const c = await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
        assert.equal(c.outcome, "skip-contention");
        w.clock.t = new Date(T0.getTime() + TTL + 1);
        const r = await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
        assert.equal(r.outcome, "ready");
        j = job(w, f);
        assert.equal(j.admitted, 2);
      });
  it("no admission at or after job creation + 6 h; exhaustion evaluated",
      async () => {
        const w = world({script: [{kill: "wall-time", step: "normalize"}]});
        const f = await validatingFilm(w);
        await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
        w.clock.t = new Date(T0.getTime() + 6 * HOUR);
        const r = await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
        assert.equal(r.outcome, "refused-horizon");
        assert.equal(r.exhaustion.outcome, "recovery-needed");
        assert.equal(job(w, f).admitted, 1);
        assert.equal(w.pipeline.calls.length, 1);
      });
  it("event, lease and operation ids cannot reset the job or its origin",
      async () => {
        const w = world({script: [{kill: "SIGXFSZ", step: "normalize"}]});
        const f = await validatingFilm(w);
        await w.worker.processFilm({teamId: TEAM, filmId: f.filmId,
          eventId: "a"});
        const created = job(w, f).createdAtMs;
        w.clock.t = new Date(T0.getTime() + HOUR);
        await w.mk().processFilm({teamId: TEAM, filmId: f.filmId,
          eventId: "b"});
        const jobs = w.db.paths(`${filmPath(f.filmId)}/workerJobs/`);
        assert.equal(jobs.length, 1);
        assert.equal(job(w, f).createdAtMs, created);
        assert.equal(job(w, f).admitted, 2);
      });
});

describe("fencing, stale workers, lease race", () => {
  it("stale worker: superseded fence stops it; no commit, delete or upload",
      async () => {
        const w = world({script: [{before: async () => {
          w.clock.t = new Date(w.clock.t.getTime() + TTL + 1);
          env.b = await w.mk().redrive({teamId: TEAM, filmId: env.filmId});
        }, then: "ok"}, "ok"]});
        const f = await validatingFilm(w);
        env = {filmId: f.filmId};
        const a = await w.worker.processFilm({teamId: TEAM,
          filmId: f.filmId});
        assert.equal(env.b.outcome, "ready");
        assert.equal(a.outcome, "aborted");
        const creates = w.objects.calls.filter((c) => c[0] === "createOnly");
        assert.equal(creates.length, 1, "only the live holder uploaded");
        assert.equal(job(w, f).admitted, 2);
        assert.equal(ledger(w)[f.filmId].status, "ready");
      });
  it("lease race: two concurrent deliveries -> one promotion, one output",
      async () => {
        const w = world();
        const f = await validatingFilm(w);
        const [x, y] = await Promise.all([
          w.mk().processFilm({teamId: TEAM, filmId: f.filmId, eventId: "x"}),
          w.mk().processFilm({teamId: TEAM, filmId: f.filmId, eventId: "y"}),
        ]);
        const outcomes = [x.outcome, y.outcome].sort();
        assert.deepEqual(outcomes, ["ready", "skip-contention"]);
        assert.equal(w.objects.calls.filter((c) => c[0] === "createOnly")
            .length, 1);
        assert.equal(job(w, f).admitted, 1);
      });
});

describe("output ownership: lost acknowledgement and unknown objects", () => {
  it("ack lost after store: proven by bytes AND intent -> adopted -> ready",
      async () => {
        const w = world();
        const f = await validatingFilm(w);
        w.objects.fault("createOnly", "ack-lost");
        const r = await w.worker.processFilm({teamId: TEAM,
          filmId: f.filmId});
        assert.equal(r.outcome, "ready");
        assert.equal(job(w, f).output.provenBy, "adopted");
      });
  it("ambiguous failure with nothing stored: same create-only write again",
      async () => {
        const w = world();
        const f = await validatingFilm(w);
        w.objects.fault("createOnly", "error");
        const r = await w.worker.processFilm({teamId: TEAM,
          filmId: f.filmId});
        assert.equal(r.outcome, "ready");
        assert.equal(w.objects.calls.filter((c) => c[0] === "createOnly")
            .length, 2);
      });
  it("unknown object at the job key: recovery-needed; no overwrite, no " +
      "delete, no ready", async () => {
    const w = world();
    const f = await validatingFilm(w);
    const key = `films/${TEAM}/${f.filmId}/jobs/${f.jobId}/normalized.mp4`;
    const foreign = w.objects.put(key, Buffer.from("not ours"),
        {jobId: f.jobId, inputGeneration: f.generation});
    const r = await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
    assert.equal(r.outcome, "recovery-needed");
    assert.equal(w.objects.objects.get(key).generation, foreign);
    assert.equal(w.objects.calls.filter((c) => c[0] === "deleteGeneration")
        .length, 0);
    assert.equal(w.db.read(filmPath(f.filmId)).status, "validating");
    assert.equal(ledger(w)[f.filmId].status, "validating");
    assert.equal(job(w, f).recovery.reason, "output-ownership-unproven");
  });
});

describe("cancellation and cleanup (S1 abandon observed, not changed)", () => {
  it("v1 abandonment during work: worker stops; no ready; slot released " +
      "once by S1", async () => {
    const w = world({script: [{before: async () => {
      const r = await w.s1.abandonFilmUpload({auth, data: {
        schemaVersion: v1.CONTRACT_VERSION, operationId: crypto.randomUUID(),
        action: "abandonFilmUpload", payload: {teamId: TEAM,
          filmId: env.filmId}}});
      assert.equal(r.ok, true);
    }, then: "ok"}]});
    const f = await validatingFilm(w);
    env = {filmId: f.filmId};
    const r = await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
    assert.equal(r.outcome, "aborted");
    assert.equal(w.db.read(filmPath(f.filmId)).status, "abandoned");
    assert.deepEqual(ledger(w), {});
    assert.equal(w.objects.calls.filter((c) => c[0] === "createOnly").length,
        0);
  });
  it("stale output after abandonment: proven own output deleted " +
      "(generation-matched), receipt untouched", async () => {
    const w = world();
    const f = await validatingFilm(w);
    const key = `films/${TEAM}/${f.filmId}/jobs/${f.jobId}/normalized.mp4`;
    // abandon lands between the upload and the ready commit
    const orig = w.objects.createOnly.bind(w.objects);
    w.objects.createOnly = async (t) => {
      const r = await orig(t);
      await w.s1.abandonFilmUpload({auth, data: {
        schemaVersion: v1.CONTRACT_VERSION, operationId: crypto.randomUUID(),
        action: "abandonFilmUpload", payload: {teamId: TEAM,
          filmId: f.filmId}}});
      return r;
    };
    const r = await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
    assert.equal(r.outcome, "film-changed");
    assert.equal(w.db.read(filmPath(f.filmId)).status, "abandoned");
    assert.equal(w.objects.objects.has(key), false, "own output deleted");
    assert.equal(job(w, f).cleanup.output.result, "deleted");
    assert.deepEqual(ledger(w), {});
  });
  it("cleanup 404 recorded as absent; 412 preserves the object", async () => {
    for (const mode of ["absent", "mismatch"]) {
      const w = world({script: [{verdict: "metadata-invalid"}]});
      const f = await validatingFilm(w);
      const orig = w.objects.deleteGeneration.bind(w.objects);
      w.objects.deleteGeneration = async (t) => {
        if (mode === "absent") w.objects.objects.delete(t.name);
        else w.objects.put(t.name, Buffer.from("newer generation"));
        return orig(t);
      };
      await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
      assert.equal(job(w, f).cleanup.quarantine.result, mode);
      assert.equal(w.objects.objects.has(f.name), mode === "mismatch");
    }
  });
  it("team ownership changed: recovery-needed, no promotion", async () => {
    const w = world();
    const f = await validatingFilm(w);
    w.db.write(`teams/${TEAM}`, {ownerId: "someone-else", name: "A"});
    const r = await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
    assert.equal(r.outcome, "recovery-needed");
    assert.equal(w.pipeline.calls.length, 0);
    assert.equal(w.db.read(filmPath(f.filmId)).status, "validating");
  });
});

describe("decoder-free reconciliation and malformed state", () => {
  it("after exhaustion, reconciliation adopts proven validated output " +
      "and promotes without any decoder or pipeline run", async () => {
    const w = world();
    const f = await validatingFilm(w);
    // validated + uploaded, then the instance died before recording output
    const orig = w.objects.createOnly.bind(w.objects);
    w.objects.createOnly = async (t) => {
      await orig(t);
      throw new Error("instance lost");
    };
    const stat = w.objects.stat.bind(w.objects);
    w.objects.stat = async () => {
      throw new Error("instance lost");
    };
    await assert.rejects(w.worker.processFilm({teamId: TEAM,
      filmId: f.filmId}));
    w.objects.createOnly = orig;
    w.objects.stat = stat;
    const j = job(w, f);
    assert.ok(j.validated && j.intent && !j.output);
    w.db.write(`${filmPath(f.filmId)}/workerJobs/${f.jobId}`,
        {...j, admitted: 3}); // budget exhausted
    w.clock.t = new Date(T0.getTime() + TTL + 1);
    const calls = w.pipeline.calls.length;
    const r = await w.worker.reconcileFilm({teamId: TEAM, filmId: f.filmId});
    assert.equal(r.reconcile, "ready");
    assert.equal(w.pipeline.calls.length, calls);
    assert.equal(job(w, f).admitted, 3, "reconciliation admits nothing");
    assert.equal(job(w, f).output.provenBy, "adopted");
    assert.equal(w.db.read(filmPath(f.filmId)).status, "ready");
  });
  it("reconciliation refuses a stale validation record (artifact changed)",
      async () => {
        const w = world();
        const f = await validatingFilm(w);
        w.objects.fault("createOnly", "error");
        w.objects.fault("createOnly", "error");
        await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
        const j = job(w, f);
        w.db.write(`${filmPath(f.filmId)}/workerJobs/${f.jobId}`,
            {...j, recovery: null, lease: null,
              validated: {...j.validated, artifact: {ffmpeg: "0".repeat(64),
                ffprobe: "0".repeat(64)}}});
        const r = await w.worker.reconcileFilm({teamId: TEAM,
          filmId: f.filmId});
        assert.equal(r.reconcile, "recovery-needed");
        assert.equal(w.db.read(filmPath(f.filmId)).status, "validating");
      });
  it("malformed worker state is preserved and surfaced, never forced",
      async () => {
        const w = world({script: [{kill: "SIGXCPU", step: "normalize"}]});
        const f = await validatingFilm(w);
        await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
        const p = `${filmPath(f.filmId)}/workerJobs/${f.jobId}`;
        const bad = {...w.db.read(p), admitted: 7};
        w.db.write(p, bad);
        const film = w.db.read(filmPath(f.filmId));
        const r = await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
        assert.equal(r.outcome, "anomaly");
        assert.deepEqual(w.db.read(p), bad);
        assert.deepEqual(w.db.read(filmPath(f.filmId)), film);
        assert.equal(w.pipeline.calls.length, 1);
      });
});
