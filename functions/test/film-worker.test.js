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
      // decoder failures without positive media evidence: never a verdict
      ["unknown", "unknown", "unknown"],
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
        const outcomes = [x.outcome, y.outcome];
        assert.equal(outcomes.filter((o) => o === "ready").length, 1);
        assert.ok(outcomes.some((o) => ["skip-contention",
          "not-validating"].includes(o)), JSON.stringify(outcomes));
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

describe("inconsistent state mid-run is held for recovery, never forced",
    () => {
      it("ledger slot missing at the ready commit: recovery-needed with " +
          "evidence; film validating; no new slot", async () => {
        const w = world({script: [{before: async () => {
          env.slotsCleared = true;
        }, then: "ok"}]});
        const f = await validatingFilm(w);
        env = {};
        const orig = w.objects.createOnly.bind(w.objects);
        w.objects.createOnly = async (t) => {
          const r = await orig(t);
          w.db.write(`teams/${TEAM}/filmLedger/cap`, {slots: {}});
          return r;
        };
        const r = await w.worker.processFilm({teamId: TEAM,
          filmId: f.filmId});
        assert.equal(r.outcome, "recovery-needed", JSON.stringify(r));
        assert.equal(w.db.read(filmPath(f.filmId)).status, "validating");
        assert.deepEqual(ledger(w), {});
        const j = job(w, f);
        assert.equal(j.recovery.reason, "ready-precondition-failed");
        assert.equal(j.recovery.evidence.slot, null);
        assert.equal(j.lease, null);
        assert.equal(j.terminal, null);
      });
      it("owner changed mid-run: the checkpoint holds for recovery and no " +
          "further decoder step or upload runs", async () => {
        const w = world({script: [{before: async () => {
          w.db.write(`teams/${TEAM}`, {ownerId: "someone-else"});
        }, then: "ok"}]});
        const f = await validatingFilm(w);
        const r = await w.worker.processFilm({teamId: TEAM,
          filmId: f.filmId});
        assert.equal(r.outcome, "aborted");
        assert.equal(job(w, f).recovery.reason,
            "precondition-changed-mid-run");
        assert.equal(w.objects.calls.filter((c) => c[0] === "createOnly")
            .length, 0);
        assert.equal(w.db.read(filmPath(f.filmId)).status, "validating");
      });
    });

describe("PR85 review R1-R4 (#39 c-6297820037): focused regressions", () => {
  /** Lost acknowledgement after a validated upload; lease then expired. */
  const lostAck = async (w, f) => {
    w.objects.fault("createOnly", "ack-lost");
    const stat = w.objects.stat.bind(w.objects);
    w.objects.stat = async () => {
      throw new Error("instance lost before reconciling the upload");
    };
    await assert.rejects(w.worker.processFilm({teamId: TEAM,
      filmId: f.filmId}));
    w.objects.stat = stat;
    w.clock.t = new Date(w.clock.t.getTime() + TTL + 1);
  };
  const jobPath = (f) => `${filmPath(f.filmId)}/workerJobs/${f.jobId}`;
  // Each mutation keeps the job SCHEMA-valid but breaks a binding: the
  // binding check (not the schema) must hold it for recovery.
  const mutations = {
    "media sha differs from the validated output": (j) => {
      j.validated.media.sha256 = "0".repeat(64);
    },
    "media bytes differ from the validated output": (j) => {
      j.validated.media.bytes += 1;
    },
    "intent key points elsewhere": (j) => {
      j.intent.key = "films/other/x/jobs/y/normalized.mp4";
    },
    "media over the placeholder width": (j) => {
      j.validated.media.width = 1922;
    },
    "input bytes differ from the declared bytes": (j) => {
      j.validated.inputBytes += 1;
    },
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    it(`R2: ${name} -> held, never ready; record preserved`, async () => {
      const w = world();
      const f = await validatingFilm(w);
      await lostAck(w, f);
      const j = job(w, f);
      mutate(j);
      w.db.write(jobPath(f), j);
      const r = await w.worker.reconcileFilm({teamId: TEAM,
        filmId: f.filmId});
      assert.notEqual(r.reconcile, "ready", JSON.stringify(r));
      assert.equal(w.db.read(filmPath(f.filmId)).status, "validating");
      assert.equal(ledger(w)[f.filmId].status, "validating");
      const after = job(w, f);
      assert.deepEqual(after.validated, j.validated, "record preserved");
      assert.equal(after.recovery.reason, "validation-record-invalid");
      assert.ok(after.recovery.evidence.problem);
    });
  }
  it("R2: schema-invalid durable record -> anomaly, untouched", async () => {
    const w = world();
    const f = await validatingFilm(w);
    await lostAck(w, f);
    const j = job(w, f);
    j.validated.media.width = 0;
    w.db.write(jobPath(f), j);
    const r = await w.worker.reconcileFilm({teamId: TEAM, filmId: f.filmId});
    assert.deepEqual(r, {reconcile: "anomaly", reason: "job-invalid"});
    assert.deepEqual(job(w, f), j);
  });
  it("R1: after exhaustion an UNPROVEN object stays held; no attempt 4",
      async () => {
        const w = world({script: ["infrastructure", "infrastructure"]});
        const f = await validatingFilm(w);
        await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
        await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
        await lostAck(w, f);
        const key = `films/${TEAM}/${f.filmId}/jobs/${f.jobId}/normalized.mp4`;
        const own = w.objects.objects.get(key);
        own.bytes = Buffer.from("tampered after upload");
        assert.equal((await w.worker.redrive({teamId: TEAM,
          filmId: f.filmId})).outcome, "refused-exhausted");
        const r = await w.worker.reconcileFilm({teamId: TEAM,
          filmId: f.filmId});
        assert.equal(r.reconcile, "recovery-needed");
        assert.equal(w.db.read(filmPath(f.filmId)).status, "validating");
        assert.equal(job(w, f).admitted, 3);
        assert.equal(w.pipeline.calls.length, 3);
        assert.equal(w.objects.objects.has(key), true, "never deleted");
      });
  it("R1: a resolved recovery keeps its evidence", async () => {
    const w = world({script: ["infrastructure", "infrastructure"]});
    const f = await validatingFilm(w);
    await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
    await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
    await lostAck(w, f);
    await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
    assert.equal(job(w, f).recovery.reason, "attempts-exhausted");
    const r = await w.worker.reconcileFilm({teamId: TEAM, filmId: f.filmId});
    assert.equal(r.reconcile, "ready");
    const j = job(w, f);
    assert.equal(j.recovery, null);
    assert.equal(j.resolvedRecovery.reason, "attempts-exhausted");
    assert.equal(j.resolvedRecovery.by, "reconciliation");
  });
  it("R3: OFF gates processFilm, redrive, reconcileFilm and the trigger " +
      "before any I/O", async () => {
    const w = world();
    const f = await validatingFilm(w);
    const off = w.mk({isEnabled: () => false});
    const commits = w.db.commits;
    const calls = w.objects.calls.length;
    const a = {teamId: TEAM, filmId: f.filmId};
    assert.deepEqual(await off.processFilm(a), {outcome: "disabled"});
    assert.deepEqual(await off.redrive(a), {outcome: "disabled"});
    assert.deepEqual(await off.reconcileFilm(a), {reconcile: "disabled"});
    assert.deepEqual(await off.onFilmWritten({id: "e", params: a,
      data: {after: {data: () => ({status: "validating"})}}}),
    {outcome: "disabled"});
    assert.equal(w.db.commits, commits);
    assert.equal(w.objects.calls.length, calls);
    assert.equal(w.decoder.state.preflights, 0);
    assert.equal(w.pipeline.calls.length, 0);
  });
  it("R4: a pending output cleanup is resumed by the cancellation path " +
      "too, without reopening the film", async () => {
    const w = world();
    const f = await validatingFilm(w);
    const create = w.objects.createOnly.bind(w.objects);
    w.objects.createOnly = async (t) => {
      const out = await create(t);
      await w.s1.abandonFilmUpload({auth, data: {
        schemaVersion: v1.CONTRACT_VERSION, operationId: crypto.randomUUID(),
        action: "abandonFilmUpload", payload: {teamId: TEAM,
          filmId: f.filmId}}});
      return out;
    };
    const del = w.objects.deleteGeneration.bind(w.objects);
    w.objects.deleteGeneration = async () => {
      throw new Error("cleanup outage");
    };
    await assert.rejects(w.worker.processFilm({teamId: TEAM,
      filmId: f.filmId}));
    assert.equal(job(w, f).cleanup.output.result, "pending");
    w.objects.deleteGeneration = del;
    const film = w.db.read(filmPath(f.filmId));
    // a new processing delivery takes the changed-film path and resumes
    const r = await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
    assert.equal(r.outcome, "not-validating");
    assert.equal(job(w, f).cleanup.output.result, "deleted");
    assert.deepEqual(w.db.read(filmPath(f.filmId)), film, "film untouched");
    assert.equal(job(w, f).terminal, null);
    assert.equal(w.pipeline.calls.length, 1);
  });
});

describe("PR85 re-review R2b (c-6298450957): validation provenance", () => {
  const jobPath = (f) => `${filmPath(f.filmId)}/workerJobs/${f.jobId}`;
  /** Validated + uploaded, ack lost; returns after the lease expired. */
  const lostAck = async (w, f, run = (a) => w.worker.processFilm(a)) => {
    w.objects.fault("createOnly", "ack-lost");
    const stat = w.objects.stat.bind(w.objects);
    w.objects.stat = async () => {
      throw new Error("instance lost");
    };
    await assert.rejects(run({teamId: TEAM, filmId: f.filmId}));
    w.objects.stat = stat;
    w.clock.t = new Date(w.clock.t.getTime() + TTL + 1);
  };
  it("legitimate OLDER validation stays recoverable: attempt 2 validated; " +
      "attempt 3 later crashed before validating", async () => {
    const w = world({script: ["infrastructure", "ok", {before: async () => {
      throw new Error("instance lost after admission");
    }, then: "ok"}]});
    const f = await validatingFilm(w);
    await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
    await lostAck(w, f, (a) => w.worker.redrive(a));
    await assert.rejects(w.worker.redrive({teamId: TEAM, filmId: f.filmId}));
    w.clock.t = new Date(w.clock.t.getTime() + TTL + 1);
    const j = job(w, f);
    assert.deepEqual([j.admitted, j.validated.attemptN, j.validated.fence,
      j.fence], [3, 2, 2, 3]);
    const r = await w.worker.reconcileFilm({teamId: TEAM, filmId: f.filmId});
    assert.equal(r.reconcile, "ready");
    assert.equal(w.pipeline.calls.length, 3);
  });
  it("legitimate validation is NOT required to equal the newer " +
      "reconciliation fence", async () => {
    const w = world();
    const f = await validatingFilm(w);
    await lostAck(w, f);
    // a first reconciliation takes a newer fence and dies mid-proof
    const read = w.objects.readGeneration.bind(w.objects);
    w.objects.readGeneration = async () => {
      throw new Error("instance lost mid-proof");
    };
    await assert.rejects(w.worker.reconcileFilm({teamId: TEAM,
      filmId: f.filmId}));
    w.objects.readGeneration = read;
    w.clock.t = new Date(w.clock.t.getTime() + TTL + 1);
    const before = job(w, f);
    assert.ok(before.fence > before.validated.fence);
    const r = await w.worker.reconcileFilm({teamId: TEAM, filmId: f.filmId});
    assert.equal(r.reconcile, "ready");
    assert.ok(job(w, f).fence > job(w, f).validated.fence);
  });
  const forged = {
    "attempt number never admitted (attemptN 3, admitted 1)": [(j) => {
      j.validated.attemptN = 3;
    }, "validation-attempt-not-admitted"],
    "fabricated fence on validation AND intent (99)": [(j) => {
      j.validated.fence = 99;
      j.intent.fence = 99;
    }, "validation-fence-not-admitted"],
    "validated before its attempt was admitted": [(j) => {
      j.validated.atMs = j.attempts[0].admittedAtMs - 1;
    }, "validation-outside-attempt"],
    "attempt recorded as ending in a media verdict": [(j) => {
      j.attempts[0].end = {end: "media-verdict", reason: "media-corrupt"};
      j.attempts[0].endedAtMs = j.validated.atMs;
    }, "validation-attempt-ended-before-validation"],
    "admitted counter without a matching attempt row": [(j) => {
      j.admitted = 2;
    }, "validation-attempt-not-admitted"],
  };
  for (const [name, [mutate, reason]] of Object.entries(forged)) {
    it(`forged provenance: ${name} -> held before any ownership I/O`,
        async () => {
          const w = world();
          const f = await validatingFilm(w);
          await lostAck(w, f);
          const j = job(w, f);
          mutate(j);
          w.db.write(jobPath(f), j);
          const io = w.objects.calls.length;
          const r = await w.worker.reconcileFilm({teamId: TEAM,
            filmId: f.filmId});
          assert.deepEqual(r, {reconcile: "recovery-needed", reason});
          assert.equal(w.objects.calls.length, io, "no ownership I/O");
          assert.equal(w.db.read(filmPath(f.filmId)).status, "validating");
          const after = job(w, f);
          assert.deepEqual(after.validated, j.validated, "evidence kept");
          assert.deepEqual(after.intent, j.intent);
          assert.equal(after.recovery.evidence.problem, reason);
        });
  }
  // PR85 re-review c-6298813169: the bound holds for EVERY admission fence,
  // not only the one the validation selects. Attempt 1 ends infrastructure;
  // attempt 2 validates and loses its ACK; only attempts[0].fence changes.
  const held = {reconcile: "recovery-needed",
    reason: "validation-fence-not-admitted"};
  const history = {
    "above the durable job fence (99)": [99, held],
    "zero": [0, held],
    "negative": [-1, held],
    "duplicate of attempt 2's fence": [2, held],
    // a non-integer already fails the strict job schema: anomaly, preserved
    "non-integer": [1.5, {reconcile: "anomaly", reason: "job-invalid"}],
  };
  for (const [name, [bad, want]] of Object.entries(history)) {
    it(`all-history fence bound: another attempt's fence ${name} -> ` +
        "held before any ownership I/O, evidence kept", async () => {
      const w = world({script: ["infrastructure", "ok"]});
      const f = await validatingFilm(w);
      await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
      await lostAck(w, f, (a) => w.worker.redrive(a));
      const j = job(w, f);
      assert.deepEqual([j.admitted, j.validated.attemptN], [2, 2]);
      j.attempts[0].fence = bad;
      w.db.write(jobPath(f), j);
      const io = w.objects.calls.length;
      const r = await w.worker.reconcileFilm({teamId: TEAM,
        filmId: f.filmId});
      assert.deepEqual(r, want);
      assert.equal(w.objects.calls.length, io, "no ownership I/O");
      assert.equal(w.db.read(filmPath(f.filmId)).status, "validating");
      const after = job(w, f);
      if (want.reconcile === "anomaly") {
        assert.deepEqual(after, j, "anomalous job preserved untouched");
        return;
      }
      // the forged history is kept verbatim; the only change is the
      // pre-existing close-out of the expired attempt 2 as "unknown"
      const strip = (xs) => xs.map(({end, endedAtMs, ...x}) => x);
      assert.deepEqual(strip(after.attempts), strip(j.attempts),
          "history kept");
      assert.deepEqual(after.attempts[0], j.attempts[0]);
      assert.equal(after.attempts[1].end.end, "unknown");
      assert.deepEqual(after.validated, j.validated);
      assert.deepEqual(after.intent, j.intent);
      assert.equal(after.recovery.evidence.problem,
          "validation-fence-not-admitted");
    });
  }
  it("all-history bound is not 'equal to the reconcile fence': the same " +
      "two-attempt history with valid fences [1, 2] promotes", async () => {
    const w = world({script: ["infrastructure", "ok"]});
    const f = await validatingFilm(w);
    await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
    await lostAck(w, f, (a) => w.worker.redrive(a));
    assert.deepEqual(job(w, f).attempts.map((x) => x.fence), [1, 2]);
    const r = await w.worker.reconcileFilm({teamId: TEAM, filmId: f.filmId});
    assert.equal(r.reconcile, "ready");
    const after = job(w, f);
    assert.ok(after.fence > 2, "reconcile took a newer fence");
    assert.deepEqual(after.attempts.map((x) => x.fence), [1, 2]);
  });
  it("a fabricated attempt row with a real-looking fence is still " +
      "rejected (fence must belong to THAT attempt)", async () => {
    const w = world({script: ["infrastructure"]});
    const f = await validatingFilm(w);
    await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
    await lostAck(w, f, (a) => w.worker.redrive(a));
    const j = job(w, f);
    assert.deepEqual(j.attempts.map((x) => x.fence), [1, 2]);
    j.validated.attemptN = 1; // attempt 1 exists, but its fence is 1, not 2
    w.db.write(jobPath(f), j);
    const r = await w.worker.reconcileFilm({teamId: TEAM, filmId: f.filmId});
    assert.deepEqual(r, {reconcile: "recovery-needed",
      reason: "validation-fence-not-admitted"});
  });
});

describe("decoder-free reconciliation and malformed state", () => {
  it("after exhaustion, reconciliation adopts proven validated output " +
      "and promotes without any decoder or pipeline run", async () => {
    // three GENUINE admissions: two infrastructure failures, then a third
    // that validated + uploaded and died before recording the output
    const w = world({script: ["infrastructure", "infrastructure"]});
    const f = await validatingFilm(w);
    await w.worker.processFilm({teamId: TEAM, filmId: f.filmId});
    await w.worker.redrive({teamId: TEAM, filmId: f.filmId});
    const orig = w.objects.createOnly.bind(w.objects);
    w.objects.createOnly = async (t) => {
      await orig(t);
      throw new Error("instance lost");
    };
    const stat = w.objects.stat.bind(w.objects);
    w.objects.stat = async () => {
      throw new Error("instance lost");
    };
    await assert.rejects(w.worker.redrive({teamId: TEAM, filmId: f.filmId}));
    w.objects.createOnly = orig;
    w.objects.stat = stat;
    const j = job(w, f);
    assert.ok(j.validated && j.intent && !j.output);
    assert.equal(j.admitted, 3);
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
