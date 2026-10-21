"use strict";
// FILM-INT-A D5 (I-9) `list-s2b-recovery` unit tests over a small
// query-capable Firestore fake that COUNTS reads and refuses writes. Real
// Firestore query semantics are exercised separately on the emulator
// (test/emulator/film-int.emulator.test.js). Synthetic data. TEST ONLY.
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const {spawnSync} = require("child_process");
const {jobIdFor} = require("../src/film/worker/worker");
const admin = require("../scripts/film-cleanup-admin");

const DOC_ID = {documentId: true};

/** Minimal Firestore fake: ordered ids, `in` filter, cursors, limits. */
class QueryFake {
  /** @param {Map<string, object>} docs path -> data */
  constructor(docs) {
    this.docs = docs;
    this.reads = 0;
    this.writes = 0;
  }
  /** @param {string} p @return {object} */
  collection(p) {
    return new FakeQuery(this, p);
  }
}
/** */
class FakeQuery {
  /** @param {QueryFake} db @param {string} p @param {object} [q] */
  constructor(db, p, q = {}) {
    this.db = db;
    this.p = p;
    this.q = q;
  }
  /** @param {object} o @return {FakeQuery} */
  with(o) {
    return new FakeQuery(this.db, this.p, {...this.q, ...o});
  }
  /** @param {string} f @param {string} op @param {*} v @return {object} */
  where(f, op, v) {
    assert.equal(op, "in");
    return this.with({where: {f, v}});
  }
  /** @param {*} f @return {FakeQuery} */
  orderBy(f) {
    assert.equal(f, DOC_ID, "orders by document id only");
    return this;
  }
  /** @param {string} id @return {FakeQuery} */
  startAt(id) {
    return this.with({startAt: id});
  }
  /** @param {string} id @return {FakeQuery} */
  startAfter(id) {
    return this.with({startAfter: id});
  }
  /** @param {number} n @return {FakeQuery} */
  limit(n) {
    return this.with({limit: n});
  }
  /** @param {string} id @return {object} */
  doc(id) {
    const p = `${this.p}/${id}`;
    const db = this.db;
    return {
      collection: (c) => new FakeQuery(db, `${p}/${c}`),
      get: async () => {
        db.reads += 1;
        const d = db.docs.get(p);
        return {exists: !!d, id, data: () => d && {...d}};
      },
      set() {
        db.writes += 1;
      }, update() {
        db.writes += 1;
      }, delete() {
        db.writes += 1;
      },
    };
  }
  /** @return {Promise<object>} */
  async get() {
    const depth = this.p.split("/").length + 1;
    let ids = [...this.db.docs.keys()]
        .filter((k) => k.startsWith(`${this.p}/`) &&
          k.split("/").length === depth)
        .map((k) => k.slice(this.p.length + 1)).sort();
    if (this.q.where) {
      ids = ids.filter((id) => this.q.where.v.includes(
          this.db.docs.get(`${this.p}/${id}`)[this.q.where.f]));
    }
    if (this.q.startAt) ids = ids.filter((id) => id >= this.q.startAt);
    if (this.q.startAfter) ids = ids.filter((id) => id > this.q.startAfter);
    ids = ids.slice(0, this.q.limit);
    this.db.reads += ids.length;
    return {docs: ids.map((id) => ({id,
      data: () => ({...this.db.docs.get(`${this.p}/${id}`)})}))};
  }
}

const GEN = "1001";
/**
 * Seed one film (+ optional job) in team t.
 * @param {Map} m
 * @param {string} t
 * @param {string} f
 * @param {object} film
 * @param {?object} job
 */
function seed(m, t, f, film, job) {
  m.set(`teams/${t}`, {ownerId: "o"});
  m.set(`teams/${t}/films/${f}`, {objectGeneration: GEN, ...film});
  if (job) {
    m.set(`teams/${t}/films/${f}/workerJobs/${jobIdFor(t, f, GEN)}`, job);
  }
}
const q = (result, generation = GEN) => ({cleanup: {quarantine: {
  object: "x", generation, fence: 1, result}, output: null}});
const list = (db, o) => admin.listS2bRecovery(db, {documentId: DOC_ID, ...o});

describe("D5 list-s2b-recovery (read-only, bounded, resumable)", () => {
  it("classes a-d on actual A5 job semantics; negatives excluded", async () => {
    const m = new Map();
    seed(m, "t1", "f-a", {status: "validating"},
        {recovery: {reason: "attempts-exhausted"},
          exhaustion: {outcome: "recovery-needed"}});
    seed(m, "t1", "f-b", {status: "ready"}, q("mismatch"));
    seed(m, "t1", "f-c", {status: "rejected",
      rejectionReason: "container-invalid"}, q("pending"));
    seed(m, "t1", "f-d", {status: "ready"}, {cleanup: {quarantine: null,
      output: null}});
    // negatives
    seed(m, "t1", "n-run", {status: "validating"}, {exhaustion: null});
    seed(m, "t1", "n-del", {status: "ready"}, q("deleted"));
    seed(m, "t1", "n-abs", {status: "ready"}, q("absent"));
    seed(m, "t1", "n-gen", {status: "ready"}, q("pending", "999"));
    seed(m, "t1", "n-s1", {status: "rejected",
      rejectionReason: "signature-invalid"}, null);
    seed(m, "t1", "n-res", {status: "reserved", objectGeneration: null},
        null);
    const db = new QueryFake(m);
    const out = await list(db, {teams: 5, films: 50});
    assert.deepEqual(out.items.map((i) => [i.film, i.class,
      i.classification]), [
      ["f-a", "a", "recovery: attempts-exhausted"],
      ["f-b", "b", "precondition mismatch"],
      ["f-c", "c", "unresolved (not proven failed)"],
      ["f-d", "d", "no intent"],
    ]);
    assert.equal(out.next, null);
    assert.equal(db.writes, 0, "read-only");
    assert.ok(out.reads <= out.maxReads);
    assert.equal(db.reads, out.reads, "reads accounted");
  });
  it("more than M eligible films across two teams: repeated invocations " +
      "with the cursor visit every film exactly once, then next=null; " +
      "every invocation within its read cap", async () => {
    const m = new Map();
    const expected = [];
    for (const t of ["ta", "tb"]) {
      for (let i = 0; i < 7; i++) {
        const f = `f${i}`;
        seed(m, t, f, {status: "ready"}, q("pending"));
        expected.push(`${t}/${f}`);
      }
    }
    seed(m, "tc", "x", {status: "reserved"}, null);
    const db = new QueryFake(m);
    const seen = [];
    let after = null;
    let runs = 0;
    do {
      db.reads = 0;
      const out = await list(db, {teams: 2, films: 3, after});
      assert.ok(out.reads <= out.maxReads, `${out.reads} > ${out.maxReads}`);
      assert.equal(out.maxReads, (2 + 1) + (3 + 2) + 3);
      for (const i of out.items) seen.push(`${i.team}/${i.film}`);
      after = out.next;
      runs += 1;
      if (after) assert.ok(out.truncated.films || out.truncated.teams);
    } while (after && runs < 20);
    assert.equal(after, null);
    assert.deepEqual(seen, expected, "no gaps, no duplicates, in order");
    assert.equal(db.writes, 0);
  });
  it("hard caps: --teams/--films clamp to 1..50", async () => {
    const db = new QueryFake(new Map());
    const out = await list(db, {teams: 999, films: 0});
    assert.equal(out.maxReads, (50 + 1) + (50 + 50) + 50);
  });
  it("refuses a non-demo project and a missing emulator host (CLI)", () => {
    assert.equal(admin.environmentProblem({FIRESTORE_EMULATOR_HOST: "x"},
        "prod-coach"), "project-not-demo");
    assert.equal(admin.environmentProblem({}, "demo-x"),
        "emulator-host-missing");
    const script = path.join(__dirname, "..", "scripts",
        "film-cleanup-admin.js");
    for (const env of [{GCLOUD_PROJECT: "coach-core-ai",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:1"}, {GCLOUD_PROJECT: "demo-x"}]) {
      const clean = {...process.env};
      delete clean.FIRESTORE_EMULATOR_HOST;
      const r = spawnSync(process.execPath, [script, "list-s2b-recovery"],
          {encoding: "utf8", env: {...clean, ...env}});
      assert.equal(r.status, 1);
      assert.match(r.stderr, /refused \((project-not-demo|emulator-host-missing)\)/);
    }
  });
});

// PR88 F-1 (#39 c-6326638892): class (a) is ANY active A5 recovery mark
// (`job.recovery`, the mark admission refuses on), not only exhaustion.
const RECOVERY_REASONS = [ // every reason A5 worker.js can set
  ["attempts-exhausted", {outcome: "recovery-needed"}],
  ["rejection-precondition-failed", {outcome: "rejected"}],
  ["reject-precondition-failed", null],
  ["ready-precondition-failed", null],
  ["precondition-changed-mid-run", null],
  ["validation-record-invalid", null],
  ["validation-record-stale", null],
  ["output-ownership-unproven", null],
  ["team-ownership-changed", null],
];

describe("D5 class (a): every A5 recovery reason; controls (F-1)", () => {
  it("each recovery reason on a same-generation validating film is " +
      "listed with its reason; running, resolved-only and " +
      "different-generation jobs are not", async () => {
    const m = new Map();
    RECOVERY_REASONS.forEach(([reason, exhaustion], i) => {
      seed(m, "tr", `r${i}`, {status: "validating"}, {
        recovery: {reason, evidence: {}, atMs: 1}, exhaustion,
        resolvedRecovery: null});
    });
    // F-1b (c-6327104671): exhausted recovery-needed WITHOUT a mark
    seed(m, "tr", "u-unmarked", {status: "validating"}, {recovery: null,
      exhaustion: {outcome: "recovery-needed", reason: "x", atMs: 1},
      resolvedRecovery: null});
    // controls
    seed(m, "tr", "x-running", {status: "validating"}, {recovery: null,
      exhaustion: null, lease: {holder: "h", fence: 1, untilMs: 9}});
    seed(m, "tr", "x-resolved", {status: "validating"}, {recovery: null,
      resolvedRecovery: {reason: "output-ownership-unproven", evidence: {},
        atMs: 1, resolvedAtMs: 2}, exhaustion: null});
    // a recovery mark on a DIFFERENT generation's job is not read
    m.set("teams/tr/films/x-othergen", {status: "validating",
      objectGeneration: GEN});
    m.set(`teams/tr/films/x-othergen/workerJobs/${jobIdFor("tr",
        "x-othergen", "999")}`, {recovery: {reason: "attempts-exhausted"}});
    // a non-validating film with a recovery mark is not class (a)
    seed(m, "tr", "x-abandoned", {status: "abandoned"},
        {recovery: {reason: "precondition-changed-mid-run"}});
    // an exhausted job whose outcome is NOT recovery-needed is not (a)
    seed(m, "tr", "x-exh-rejected", {status: "validating"}, {recovery: null,
      exhaustion: {outcome: "rejected"}});
    const db = new QueryFake(m);
    const out = await list(db, {teams: 5, films: 50});
    const marked = out.items.filter((i) => i.film.startsWith("r"));
    assert.deepEqual(marked.map((i) => [i.film, i.class, i.recoveryReason,
      i.classification]), RECOVERY_REASONS.map(([reason], i) =>
      [`r${i}`, "a", reason, `recovery: ${reason}`]));
    assert.deepEqual(marked.map((i) => i.exhaustion),
        RECOVERY_REASONS.map(([, e]) => (e ? e.outcome : null)));
    assert.deepEqual(out.items.filter((i) => !i.film.startsWith("r"))
        .map((i) => [i.film, i.class, i.recoveryReason, i.classification,
          i.exhaustion]), [["u-unmarked", "a", null,
      "exhaustion: recovery-needed (unmarked)", "recovery-needed"]]);
    assert.equal(db.writes, 0);
  });
});

// Composed world: the REAL A5 worker produces the recovery marks (the
// techniques of the accepted S2b tests), then the listing reads the store.
describe("D5 class (a) over real worker-written recovery marks", () => {
  const {createFilmHandlers} = require("../src/film/handlers");
  const {createFilmWorker} = require("../src/film/worker/worker");
  const {WORKER_LIMITS} = require("../src/film/worker/limits");
  const v1 = require("../src/film/contract");
  const crypto = require("crypto");
  const {FakeTimestamp, FakeFirestore, FakeObjects, fakeDecoder,
    scriptedPipeline} = require("./film-worker-doubles");
  const TEAM = "team-int-rec";
  const OWNER = "uid-owner";
  const HEAD = Buffer.concat([Buffer.from([0, 0, 0, 16]),
    Buffer.from("ftypisom"), Buffer.from([0, 0, 2, 0])]);
  const BODY = Buffer.concat([HEAD, Buffer.alloc(16)]);
  const auth = {uid: OWNER, token: {email_verified: true,
    firebase: {sign_in_provider: "google.com"}, auth_time: 1760900000}};
  /**
   * S1 + worker over one store; a validating film.
   * @param {Array} script
   * @return {Promise<object>}
   */
  async function film(script = [], after = null) {
    const db = new FakeFirestore();
    const objects = new FakeObjects();
    const now = () => new Date("2026-10-21T16:00:00.000Z");
    const logger = {info() {}, warn() {}, error() {}};
    db.write(`teams/${TEAM}`, {ownerId: OWNER, name: "R"});
    const s1 = createFilmHandlers({db, Timestamp: FakeTimestamp,
      getUser: async () => ({uid: OWNER, disabled: false,
        customClaims: {beta: true}}), ...objects.s1(), logger, now});
    const base = scriptedPipeline(script);
    let runs = 0;
    // optional hook AFTER a pipeline returns (past the last step-boundary
    // renewal, before the attempt's end/exhaustion transaction)
    const runPipeline = async (x) => {
      const r = await base(x);
      runs += 1;
      if (after) await after(runs, db);
      return r;
    };
    const worker = createFilmWorker({db, Timestamp: FakeTimestamp, objects,
      decoder: fakeDecoder(), runPipeline,
      isEnabled: () => true, now, logger, limits: WORKER_LIMITS});
    const r = await s1.reserveFilmUpload({auth, data: {
      schemaVersion: v1.CONTRACT_VERSION, operationId: crypto.randomUUID(),
      action: "reserveFilmUpload", payload: {teamId: TEAM,
        declaredBytes: BODY.length, declaredContentType: "video/mp4",
        fileName: "clip.mp4", rightsAcknowledged: true,
        rightsWordingVersion: "rights-v1"}}});
    const filmId = r.data.filmId;
    const name = v1.uploadPathFor(TEAM, filmId);
    const generation = objects.put(name, BODY);
    assert.equal(await s1.onQuarantineFinalized({bucket:
      "demo-s2b.appspot.com", name, size: BODY.length,
    contentType: "video/mp4", generation}), "validating");
    return {db, objects, worker, filmId, generation,
      jobId: jobIdFor(TEAM, filmId, generation)};
  }
  const listOf = async (w) => {
    const m = new Map();
    for (const p of w.db.paths("teams/")) m.set(p, w.db.read(p));
    const db = new QueryFake(m);
    const out = await list(db, {teams: 5, films: 50});
    assert.equal(db.writes, 0);
    return out.items;
  };
  const paths = {
    "attempts-exhausted": async () => {
      const w = await film(["crash", "infrastructure", "crash"]);
      for (let i = 0; i < 3; i++) {
        await w.worker.redrive({teamId: TEAM, filmId: w.filmId});
      }
      return w;
    },
    "output-ownership-unproven": async () => {
      const w = await film();
      w.objects.put(`films/${TEAM}/${w.filmId}/jobs/${w.jobId}/` +
        "normalized.mp4", Buffer.from("not ours"),
      {jobId: w.jobId, inputGeneration: w.generation});
      await w.worker.processFilm({teamId: TEAM, filmId: w.filmId});
      return w;
    },
    "team-ownership-changed": async () => {
      const w = await film();
      w.db.write(`teams/${TEAM}`, {ownerId: "someone-else", name: "R"});
      await w.worker.processFilm({teamId: TEAM, filmId: w.filmId});
      return w;
    },
    "exhaustion: recovery-needed (unmarked)": async () => {
      // F-1b: ownership changes during the final attempt, so A5 exhausts
      // the job without the attempts-exhausted mark (marked only while the
      // owner check holds); platform retry is off, so nothing re-admits
      // ownership changes after the third pipeline returns: endAttempt's
      // maybeExhaust (A5 worker.js) then sees ownerOk false
      const w = await film(["crash", "infrastructure", "crash"],
          async (n, db) => {
            if (n === 3) {
              db.write(`teams/${TEAM}`, {ownerId: "someone-else", name: "R"});
            }
          });
      for (let i = 0; i < 3; i++) {
        await w.worker.redrive({teamId: TEAM, filmId: w.filmId});
      }
      return w;
    },
    "ready-precondition-failed": async () => {
      const w = await film();
      const orig = w.objects.createOnly.bind(w.objects);
      w.objects.createOnly = async (t) => {
        const r = await orig(t);
        w.db.write(`teams/${TEAM}/filmLedger/cap`, {slots: {}});
        return r;
      };
      await w.worker.processFilm({teamId: TEAM, filmId: w.filmId});
      return w;
    },
  };
  for (const [reason, make] of Object.entries(paths)) {
    it(`real worker path ${reason}: listed as class (a) with that reason`,
        async () => {
          const w = await make();
          const job = w.db.read(`teams/${TEAM}/films/${w.filmId}/` +
            `workerJobs/${w.jobId}`);
          const items = await listOf(w);
          if (reason.startsWith("exhaustion:")) {
            assert.equal(job.recovery, null, JSON.stringify(job.exhaustion));
            assert.equal(job.exhaustion.outcome, "recovery-needed");
            assert.deepEqual(items.map((i) => [i.film, i.class,
              i.recoveryReason, i.classification]),
            [[w.filmId, "a", null, reason]]);
            return;
          }
          assert.equal(job.recovery.reason, reason);
          assert.deepEqual(items.map((i) => [i.film, i.class,
            i.recoveryReason]), [[w.filmId, "a", reason]]);
        });
  }
  it("controls on real worker state: validating with no job, and a " +
      "worker run interrupted before any recovery mark -> not listed",
  async () => {
    const idle = await film();
    assert.deepEqual(await listOf(idle), []);
    const run = await film();
    run.objects.fault("downloadGeneration", "error");
    await run.worker.processFilm({teamId: TEAM, filmId: run.filmId})
        .catch(() => {});
    const job = run.db.read(`teams/${TEAM}/films/${run.filmId}/` +
      `workerJobs/${run.jobId}`);
    assert.ok(job, "job exists");
    assert.equal(job.recovery, null);
    assert.deepEqual(await listOf(run), []);
  });
});
