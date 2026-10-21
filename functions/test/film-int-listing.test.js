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
        {exhaustion: {outcome: "recovery-needed"}});
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
      ["f-a", "a", "recovery-needed"],
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
