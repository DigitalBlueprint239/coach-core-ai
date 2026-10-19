"use strict";
// In-memory doubles for the FILM-S1 handlers. No Firebase project, no
// emulator, no network, no media. The Firestore fake enforces the two
// transaction rules the real one enforces and the handlers rely on:
//   * every read happens before the first write in a transaction;
//   * writes are buffered and applied atomically at commit, and a retried
//     attempt sees none of the discarded attempt's writes.
// It also records how many attempts each transaction took, so a test can
// prove that an attempt forced to retry never double-counts a cap slot.

const {betaAuth, ALICE, BOB} = require("./fakes");

function clone(v) {
  if (v instanceof Date) return new Date(v.getTime());
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v)) o[k] = clone(v[k]);
    return o;
  }
  return v;
}

function cmp(a, b) {
  const x = a instanceof Date ? a.getTime() : a;
  const y = b instanceof Date ? b.getTime() : b;
  if (x < y) return -1;
  if (x > y) return 1;
  return 0;
}

class FakeDocRef {
  constructor(db, path) {
    this.db = db;
    this.path = path;
    this.id = path.split("/").pop();
  }
  collection(name) {
    return new FakeCollectionRef(this.db, `${this.path}/${name}`);
  }
  async get() {
    return this.db._snapshot(this);
  }
}

class FakeQuery {
  constructor(db, path, filters = [], max = Infinity) {
    this.db = db;
    this.path = path;
    this.filters = filters;
    this.max = max;
  }
  where(field, op, value) {
    return new FakeQuery(this.db, this.path,
        [...this.filters, {field, op, value}], this.max);
  }
  limit(n) {
    return new FakeQuery(this.db, this.path, this.filters, n);
  }
  _run() {
    const prefix = `${this.path}/`;
    const docs = [];
    for (const [path, data] of this.db.store) {
      if (!path.startsWith(prefix)) continue;
      if (path.slice(prefix.length).includes("/")) continue; // not nested
      if (!this.filters.every((f) => {
        const v = data[f.field];
        if (v === undefined || v === null) return false; // Firestore: no match
        switch (f.op) {
          case "==": return cmp(v, f.value) === 0;
          case "<=": return cmp(v, f.value) <= 0;
          case "<": return cmp(v, f.value) < 0;
          case ">=": return cmp(v, f.value) >= 0;
          case ">": return cmp(v, f.value) > 0;
          default: throw new Error(`fake query op ${f.op} unsupported`);
        }
      })) continue;
      const ref = new FakeDocRef(this.db, path);
      docs.push({ref, id: ref.id, exists: true, data: () => clone(data)});
      if (docs.length >= this.max) break;
    }
    return {docs, size: docs.length, empty: docs.length === 0};
  }
  async get() {
    return this._run();
  }
}

class FakeCollectionRef extends FakeQuery {
  doc(id) {
    return new FakeDocRef(this.db, `${this.path}/${id}`);
  }
}

class AlreadyExistsError extends Error {
  constructor(path) {
    super(`6 ALREADY_EXISTS: document already exists: ${path}`);
    this.code = 6;
  }
}

class FakeTransaction {
  constructor(db) {
    this.db = db;
    this.writes = [];
    this.reads = 0;
    this.wroteYet = false;
  }
  _noReadAfterWrite() {
    if (this.wroteYet) {
      throw new Error("Firestore transactions require all reads to be " +
        "executed before all writes.");
    }
  }
  async get(target) {
    this._noReadAfterWrite();
    this.reads += 1;
    if (target instanceof FakeQuery) return target._run();
    return this.db._snapshot(target);
  }
  create(ref, data) {
    this.wroteYet = true;
    this.writes.push({kind: "create", path: ref.path, data: clone(data)});
  }
  set(ref, data, opts = {}) {
    this.wroteYet = true;
    this.writes.push({kind: opts.merge ? "merge" : "set", path: ref.path,
      data: clone(data)});
  }
  update(ref, data) {
    this.wroteYet = true;
    this.writes.push({kind: "update", path: ref.path, data: clone(data)});
  }
  _commit() {
    // Validate preconditions against the live store first (atomic).
    for (const w of this.writes) {
      const exists = this.db.store.has(w.path);
      if (w.kind === "create" && exists) throw new AlreadyExistsError(w.path);
      if (w.kind === "update" && !exists) {
        throw new Error(`5 NOT_FOUND: no document to update: ${w.path}`);
      }
    }
    for (const w of this.writes) {
      const cur = this.db.store.get(w.path);
      if (w.kind === "create" || w.kind === "set") {
        this.db.store.set(w.path, w.data);
      } else {
        this.db.store.set(w.path, {...(cur || {}), ...w.data});
      }
      this.db.writeLog.push({path: w.path, kind: w.kind});
    }
  }
}

class FakeFirestore {
  constructor() {
    this.store = new Map();
    this.writeLog = [];
    this.transactions = [];
    this._abortNext = 0;
  }
  collection(name) {
    return new FakeCollectionRef(this, name);
  }
  doc(path) {
    return new FakeDocRef(this, path);
  }
  _snapshot(ref) {
    const data = this.store.get(ref.path);
    return {
      exists: data !== undefined,
      id: ref.id,
      ref,
      data: () => (data === undefined ? undefined : clone(data)),
    };
  }
  /** Force the next N transaction attempts to abort after running (retry). */
  simulateContention(n) {
    this._abortNext = n;
  }
  async runTransaction(fn) {
    let attempts = 0;
    for (;;) {
      attempts += 1;
      const tx = new FakeTransaction(this);
      const result = await fn(tx); // handler errors propagate: no writes
      if (this._abortNext > 0) {
        this._abortNext -= 1;
        continue; // discard tx.writes, re-run like the SDK does on ABORTED
      }
      tx._commit();
      this.transactions.push({attempts, writes: tx.writes.length});
      return result;
    }
  }
  // Test helpers (outside transactions, like admin seeding).
  seed(path, data) {
    this.store.set(path, clone(data));
  }
  read(path) {
    const d = this.store.get(path);
    return d === undefined ? undefined : clone(d);
  }
  pathsUnder(prefix) {
    return [...this.store.keys()].filter((p) => p.startsWith(prefix)).sort();
  }
}

/** Fake bucket: objects keyed by name with a generation and bytes. */
class FakeStorage {
  constructor() {
    this.objects = new Map();
    this.deletes = [];
    this.nextGen = 1000;
  }
  put(name, bytes, generation) {
    const gen = String(generation || ++this.nextGen);
    this.objects.set(name, {generation: gen, bytes: Buffer.from(bytes)});
    return gen;
  }
  has(name) {
    return this.objects.has(name);
  }
  async deleteObject({name, generation}) {
    this.deletes.push({name, generation: generation || null});
    const cur = this.objects.get(name);
    if (!cur) return false;
    if (generation && cur.generation !== String(generation)) return false;
    this.objects.delete(name);
    return true;
  }
  async readHead({name, generation, bytes}) {
    const cur = this.objects.get(name);
    if (!cur || cur.generation !== String(generation)) return null;
    return cur.bytes.subarray(0, bytes);
  }
}

const silentLogger = {info() {}, warn() {}, error() {}};

/** Synthetic 24-byte ftyp box. Not a playable video. */
const FTYP = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
  0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
  0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x31,
]);

const TEAM_A = "team-alice";
const TEAM_B = "team-bob";
const OP1 = "11111111-1111-4111-8111-111111111111";
const OP2 = "22222222-2222-4222-8222-222222222222";
const OP3 = "33333333-3333-4333-8333-333333333333";
// Deterministic UUID v4 film ids (contract: filmId is a lowercase UUID v4).
const filmUuid = (n) => `f0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const FILM1 = filmUuid(1);
const FILM2 = filmUuid(2);
const FILM3 = filmUuid(3);

function seedTeams(db) {
  db.seed(`teams/${TEAM_A}`, {ownerId: ALICE, name: "Eagles"});
  db.seed(`teams/${TEAM_B}`, {ownerId: BOB, name: "Bears"});
}

function envelope(action, payload, operationId = OP1) {
  return {schemaVersion: "coach-film.v1", operationId, action, payload};
}

function reservePayload(overrides = {}) {
  return {
    teamId: TEAM_A,
    declaredBytes: FTYP.length,
    declaredContentType: "video/mp4",
    fileName: "synthetic-colour-bars.mp4",
    rightsAcknowledged: true,
    rightsWordingVersion: "rights-v1",
    ...overrides,
  };
}

module.exports = {
  FakeFirestore, FakeStorage, silentLogger, FTYP, TEAM_A, TEAM_B,
  OP1, OP2, OP3, filmUuid, FILM1, FILM2, FILM3, ALICE, BOB, betaAuth, seedTeams,
  envelope, reservePayload,
};
