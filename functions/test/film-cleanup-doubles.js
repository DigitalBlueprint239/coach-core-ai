"use strict";
// FILM-S1-C1 test doubles: an in-memory Firestore with optimistic
// transactions (read-version validation + retry, read-before-write enforced)
// and single-field range queries with Firestore semantics (a range filter
// on a number never matches null), plus a Cloud Storage bucket double with
// REAL generation semantics (generation-matched delete, distinct 404/412) —
// the Storage emulator ignores generations and preconditions. Test-only; no
// network, no Firebase project.

/** Minimal Timestamp compatible with the S1 handlers. */
class FakeTimestamp {
  /** @param {number} ms */
  constructor(ms) {
    this.ms = ms;
  }
  /** @param {Date} d @return {FakeTimestamp} */
  static fromDate(d) {
    return new FakeTimestamp(d.getTime());
  }
  /** @return {number} */
  toMillis() {
    return this.ms;
  }
  /** @return {Date} */
  toDate() {
    return new Date(this.ms);
  }
}

const clone = (v) => {
  if (v instanceof FakeTimestamp) return new FakeTimestamp(v.ms);
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, x] of Object.entries(v)) {
      if (x === undefined) throw new Error(`undefined value at ${k}`);
      o[k] = clone(x);
    }
    return o;
  }
  return v;
};

/** In-memory Firestore. */
class FakeFirestore {
  /** */
  constructor() {
    this.docs = new Map(); // path -> {data, version}
    this.clock = 0;
    this.txCount = 0;
    this.queries = [];
    /** Called before each transaction body; may throw (instance loss). */
    this.beforeTransaction = null;
    /** Called before a transaction commits (after the body). */
    this.beforeCommit = null;
  }
  /** @param {string} name @return {object} */
  collection(name) {
    return new CollRef(this, name);
  }
  /** @param {string} p @return {object} */
  snap(p) {
    const e = this.docs.get(p);
    const ref = new DocRef(this, p);
    return {exists: !!e, id: ref.id, ref,
      data: () => (e ? clone(e.data) : undefined)};
  }
  /** @param {function} fn @return {Promise<*>} */
  async runTransaction(fn) {
    this.txCount += 1;
    if (this.beforeTransaction) await this.beforeTransaction(this.txCount);
    for (let attempt = 0; attempt < 8; attempt++) {
      const reads = new Map();
      const writes = [];
      const tx = {
        get: async (ref) => {
          if (writes.length) throw new Error("read after write in tx");
          const e = this.docs.get(ref.path);
          reads.set(ref.path, e ? e.version : 0);
          return this.snap(ref.path);
        },
        set: (ref, data) => writes.push({op: "set", path: ref.path,
          data: clone(data)}),
        update: (ref, patch) => writes.push({op: "update", path: ref.path,
          data: clone(patch)}),
        create: (ref, data) => writes.push({op: "create", path: ref.path,
          data: clone(data)}),
      };
      const result = await fn(tx);
      if (this.beforeCommit) {
        await this.beforeCommit({attempt, reads: [...reads.keys()],
          writes: writes.map((w) => w.path)});
      }
      const conflict = [...reads].some(([p, v]) =>
        (this.docs.get(p) ? this.docs.get(p).version : 0) !== v);
      if (conflict) continue;
      this.apply(writes);
      return result;
    }
    throw Object.assign(new Error("transaction contention"), {code: 10});
  }
  /** @param {object[]} writes */
  apply(writes) {
    for (const w of writes) {
      const cur = this.docs.get(w.path);
      if (w.op === "create" && cur) {
        throw Object.assign(new Error("already exists"), {code: 6});
      }
      if (w.op === "update" && !cur) {
        throw Object.assign(new Error("not found"), {code: 5});
      }
    }
    for (const w of writes) {
      this.clock += 1;
      let data = w.data;
      if (w.op === "update") {
        data = {...clone(this.docs.get(w.path).data), ...w.data};
      }
      this.docs.set(w.path, {data, version: this.clock});
    }
  }
  /** @param {string} p @return {*} */
  read(p) {
    const e = this.docs.get(p);
    return e ? clone(e.data) : null;
  }
  /** @param {string} p @param {*} d */
  write(p, d) {
    this.clock += 1;
    this.docs.set(p, {data: clone(d), version: this.clock});
  }
  /** @param {string} prefix @return {string[]} */
  paths(prefix) {
    return [...this.docs.keys()].filter((k) => k.startsWith(prefix));
  }
}

/** Collection reference with a single-field range query. */
class CollRef {
  /** @param {FakeFirestore} db @param {string} path @param {object} [q] */
  constructor(db, path, q = {}) {
    this.db = db;
    this.path = path;
    this.q = q;
  }
  /** @param {string} id @return {DocRef} */
  doc(id) {
    return new DocRef(this.db, `${this.path}/${id}`);
  }
  /** @return {CollRef} */
  where(field, op, value) {
    return new CollRef(this.db, this.path, {...this.q, where: [field, op,
      value]});
  }
  /** @return {CollRef} */
  orderBy(field) {
    return new CollRef(this.db, this.path, {...this.q, orderBy: field});
  }
  /** @return {CollRef} */
  limit(n) {
    return new CollRef(this.db, this.path, {...this.q, limit: n});
  }
  /** @return {Promise<{docs: object[]}>} */
  async get() {
    this.db.queries.push({path: this.path, ...this.q});
    const depth = this.path.split("/").length + 1;
    let docs = [...this.db.docs.keys()]
        .filter((k) => k.startsWith(`${this.path}/`) &&
          k.split("/").length === depth)
        .map((k) => this.db.snap(k));
    if (this.q.where) {
      const [f, op, v] = this.q.where;
      if (op !== "<=") throw new Error("double supports <= only");
      // Firestore semantics: a numeric range never matches null/missing.
      docs = docs.filter((d) => typeof d.data()[f] === "number" &&
        d.data()[f] <= v);
    }
    if (this.q.orderBy) {
      const f = this.q.orderBy;
      docs = docs.filter((d) => d.data()[f] !== undefined)
          .sort((a, b) => a.data()[f] - b.data()[f] ||
            (a.id < b.id ? -1 : 1));
    }
    if (this.q.limit !== undefined) docs = docs.slice(0, this.q.limit);
    return {docs, size: docs.length};
  }
}

/** Document reference. */
class DocRef {
  /** @param {FakeFirestore} db @param {string} path */
  constructor(db, path) {
    this.db = db;
    this.path = path;
    this.id = path.split("/").pop();
  }
  /** @param {string} name @return {CollRef} */
  collection(name) {
    return new CollRef(this.db, `${this.path}/${name}`);
  }
  /** @return {Promise<object>} */
  async get() {
    return this.db.snap(this.path);
  }
}

/** Cloud Storage bucket double with real generation semantics. */
class FakeBucket {
  /** @param {string} name */
  constructor(name) {
    this.name = name;
    this.objects = new Map(); // object name -> {generation, bytes}
    this.gen = 1000;
    this.calls = [];
    /** Optional per-delete fault: async ({name, options, n}) -> void. */
    this.deleteFault = null;
    /** Mirrors the real client's flag (asserted by wiring tests). */
    this.storage = {retryOptions: {autoRetry: false}};
  }
  /**
   * @param {string} name
   * @param {Buffer} bytes
   * @param {string} [contentType]
   * @param {string} [generation] explicit generation (e.g. 20 digits)
   * @return {object} finalize event data
   */
  put(name, bytes, contentType = "video/mp4", generation) {
    const g = generation || String(++this.gen);
    this.objects.set(name, {generation: g, bytes: Buffer.from(bytes)});
    return {bucket: this.name, name, size: String(bytes.length), contentType,
      generation: g};
  }
  /** @return {number} delete requests sent */
  deletes() {
    return this.calls.filter((c) => c[0] === "delete").length;
  }
  /**
   * @param {string} name
   * @param {object} [opts]
   * @return {object} File double
   */
  file(name, opts = {}) {
    return {
      delete: async (options) => {
        const n = this.deletes() + 1;
        this.calls.push(["delete", name, options]);
        if (this.deleteFault) {
          await this.deleteFault({name, options, n, bucket: this});
        }
        const o = this.objects.get(name);
        if (!o) throw Object.assign(new Error("No such object"), {code: 404});
        if (!options || o.generation !== options.ifGenerationMatch) {
          throw Object.assign(new Error("Precondition Failed"), {code: 412});
        }
        this.objects.delete(name);
        return [{}];
      },
      download: async ({start, end}) => {
        this.calls.push(["download", name, opts.generation]);
        const o = this.objects.get(name);
        if (!o || o.generation !== opts.generation) {
          throw Object.assign(new Error("No such object"), {code: 404});
        }
        return [o.bytes.subarray(start, end + 1)];
      },
    };
  }
}

module.exports = {FakeTimestamp, FakeFirestore, FakeBucket, clone};
