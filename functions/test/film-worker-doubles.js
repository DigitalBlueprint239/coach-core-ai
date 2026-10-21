"use strict";
// FILM-S2b test doubles: an in-memory Firestore with optimistic
// transactions (read-version validation + retry, like the server) and a
// Cloud Storage double with REAL generation semantics (create-only,
// generation-matched delete, distinct 404/412) — the Storage emulator
// ignores generations and preconditions (package §4.8 known limitation).
// Test-only; no network, no Firebase project.
const fs = require("fs");
const crypto = require("crypto");

/** Minimal Timestamp compatible with the handlers and the worker. */
class FakeTimestamp {
  /** @param {number} ms */
  constructor(ms) {
    this.ms = ms;
  }
  /** @param {Date} d @return {FakeTimestamp} */
  static fromDate(d) {
    return new FakeTimestamp(d.getTime());
  }
  /** @param {number} ms @return {FakeTimestamp} */
  static fromMillis(ms) {
    return new FakeTimestamp(ms);
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

const setPath = (obj, dotted, value) => {
  const parts = dotted.split(".");
  let o = obj;
  for (const p of parts.slice(0, -1)) {
    if (!o[p] || typeof o[p] !== "object") o[p] = {};
    o = o[p];
  }
  o[parts[parts.length - 1]] = value;
};

/** In-memory Firestore. */
class FakeFirestore {
  /** */
  constructor() {
    this.docs = new Map(); // path -> {data, version}
    this.clock = 0;
    this.hooks = {beforeCommit: null};
    this.commits = 0;
  }
  /** @param {string} name @return {object} */
  collection(name) {
    return new CollRef(this, name);
  }
  /** @param {string} p @return {object} snapshot */
  snap(p) {
    const e = this.docs.get(p);
    const ref = new DocRef(this, p);
    return {exists: !!e, id: ref.id, ref,
      data: () => (e ? clone(e.data) : undefined)};
  }
  /** @param {function} fn @return {Promise<*>} */
  async runTransaction(fn) {
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
        delete: (ref) => writes.push({op: "delete", path: ref.path}),
      };
      const result = await fn(tx);
      if (this.hooks.beforeCommit) {
        await this.hooks.beforeCommit({reads: [...reads.keys()],
          writes: writes.map((w) => w.path)});
      }
      const conflict = [...reads].some(([p, v]) =>
        (this.docs.get(p) ? this.docs.get(p).version : 0) !== v);
      if (conflict) continue;
      this.apply(writes);
      return result;
    }
    const e = new Error("transaction contention");
    e.code = 10;
    throw e;
  }
  /** @param {object[]} writes */
  apply(writes) {
    for (const w of writes) {
      const cur = this.docs.get(w.path);
      if (w.op === "create" && cur) {
        const e = new Error("already exists");
        e.code = 6;
        throw e;
      }
      if (w.op === "update" && !cur) {
        const e = new Error("not found");
        e.code = 5;
        throw e;
      }
    }
    this.commits += 1;
    for (const w of writes) {
      this.clock += 1;
      if (w.op === "delete") {
        this.docs.delete(w.path);
        continue;
      }
      let data = w.data;
      if (w.op === "update") {
        data = clone(this.docs.get(w.path).data);
        for (const [k, v] of Object.entries(w.data)) setPath(data, k, v);
      }
      this.docs.set(w.path, {data, version: this.clock});
    }
  }
  /** Direct read for assertions. @param {string} p @return {*} */
  read(p) {
    const e = this.docs.get(p);
    return e ? clone(e.data) : null;
  }
  /** Direct write for setup/corruption. @param {string} p @param {*} d */
  write(p, d) {
    this.clock += 1;
    this.docs.set(p, {data: clone(d), version: this.clock});
  }
  /** @param {string} prefix @return {string[]} */
  paths(prefix) {
    return [...this.docs.keys()].filter((k) => k.startsWith(prefix));
  }
}

/** */
class CollRef {
  /** @param {FakeFirestore} db @param {string} path */
  constructor(db, path) {
    this.db = db;
    this.path = path;
  }
  /** @param {string} id @return {DocRef} */
  doc(id) {
    return new DocRef(this.db, `${this.path}/${id}`);
  }
}

/** */
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
  /** @param {object} d @return {Promise<void>} */
  async set(d) {
    this.db.write(this.path, d);
  }
}

/** Cloud Storage double with real generation semantics. */
class FakeObjects {
  /** */
  constructor() {
    this.objects = new Map(); // name -> {generation, bytes, metadata}
    this.gen = 1000;
    this.faults = []; // {method, mode}
    this.calls = [];
  }
  /** @param {string} method @param {string} mode */
  fault(method, mode) {
    this.faults.push({method, mode});
  }
  /** @param {string} method @return {?string} */
  takeFault(method) {
    const i = this.faults.findIndex((f) => f.method === method);
    if (i < 0) return null;
    return this.faults.splice(i, 1)[0].mode;
  }
  /** Raw put (setup / S1 upload). */
  put(name, bytes, metadata = {}) {
    this.gen += 1;
    const generation = String(this.gen);
    this.objects.set(name, {generation, bytes: Buffer.from(bytes),
      metadata: {...metadata}});
    return generation;
  }
  /** @param {object} t @return {Promise<boolean>} */
  async downloadGeneration({name, generation, dest}) {
    this.calls.push(["downloadGeneration", name, generation]);
    if (this.takeFault("downloadGeneration") === "error") {
      throw Object.assign(new Error("unavailable"), {code: 503});
    }
    const o = this.objects.get(name);
    if (!o || o.generation !== String(generation)) return false;
    fs.writeFileSync(dest, o.bytes);
    return true;
  }
  /** @param {object} t @return {Promise<?Buffer>} */
  async readGeneration({name, generation}) {
    this.calls.push(["readGeneration", name, generation]);
    const o = this.objects.get(name);
    return o && o.generation === String(generation) ? Buffer.from(o.bytes) :
      null;
  }
  /** @param {object} t @return {Promise<?object>} */
  async stat({name}) {
    this.calls.push(["stat", name]);
    const o = this.objects.get(name);
    return o ? {generation: o.generation, size: o.bytes.length,
      metadata: {...o.metadata}} : null;
  }
  /** @param {object} t @return {Promise<{generation: string}>} */
  async createOnly({name, file, metadata}) {
    this.calls.push(["createOnly", name]);
    const mode = this.takeFault("createOnly");
    if (mode === "error") throw Object.assign(new Error("x"), {code: 503});
    if (this.objects.has(name)) {
      throw Object.assign(new Error("precondition"), {code: 412});
    }
    const generation = this.put(name, fs.readFileSync(file), metadata);
    if (mode === "ack-lost") {
      throw Object.assign(new Error("ack lost"), {code: "ECONNRESET"});
    }
    return {generation};
  }
  /** @param {object} t @return {Promise<string>} */
  async deleteGeneration({name, generation}) {
    this.calls.push(["deleteGeneration", name, generation]);
    const o = this.objects.get(name);
    if (!o) return "absent";
    if (o.generation !== String(generation)) return "mismatch";
    this.objects.delete(name);
    return "deleted";
  }
  /** S1 adapter view (readHead / deleteObject), same store. */
  s1() {
    return {
      readHead: async ({name, generation, bytes}) => {
        const o = this.objects.get(name);
        return o && o.generation === String(generation) ?
          o.bytes.subarray(0, bytes) : null;
      },
      deleteObject: async (t) => (await this.deleteGeneration(t)) ===
        "deleted",
    };
  }
}

/** Decoder double for orchestration tests (pipeline is scripted). */
function fakeDecoder(o = {}) {
  const digests = o.digests || {ffmpeg: "f".repeat(64),
    ffprobe: "e".repeat(64)};
  const state = {ok: o.ok !== false, reason: o.reason || null, preflights: 0};
  return {
    state,
    preflight: async () => {
      state.preflights += 1;
      return {ok: state.ok, reason: state.ok ? null : state.reason ||
        "decoder-digest-mismatch"};
    },
    digests: () => (state.ok ? digests : null),
    run: async () => {
      throw new Error("scripted pipeline: decoder.run must not be called");
    },
  };
}

/**
 * Scripted pipeline: each call takes the next script entry.
 * Entries: "ok" | {verdict} | {kill, step} | "crash" | "infrastructure" |
 * {abortAt: step} | {before: async fn, then: entry}
 */
function scriptedPipeline(script, outputBytes) {
  const calls = [];
  const fn = async ({inputPath, workDir, checkpoint}) => {
    let entry = script.length ? script.shift() : "ok";
    calls.push({inputPath, entry});
    if (entry && entry.before) {
      await entry.before();
      entry = entry.then;
    }
    for (const step of ["probe-input", "decode-input", "normalize",
      "probe-output", "decode-output"]) {
      if (!(await checkpoint(step))) return {outcome: "aborted", step};
      if (entry && entry.abortAt === step) return {outcome: "aborted", step};
      if (entry && entry.kill && entry.step === step) {
        return {outcome: "limit-kill", kill: entry.kill, step};
      }
    }
    if (entry && entry.verdict) {
      return {outcome: "verdict", reason: entry.verdict, step: "probe-input"};
    }
    if (["crash", "infrastructure", "unknown"].includes(entry)) {
      return {outcome: entry, step: "decode-input"};
    }
    const out = `${workDir}/normalized.mp4`;
    const bytes = Buffer.from(outputBytes || "normalized-output-bytes");
    fs.writeFileSync(out, bytes);
    const sha = crypto.createHash("sha256").update(bytes).digest("hex");
    const input = fs.readFileSync(inputPath);
    return {outcome: "ok",
      media: {bytes: bytes.length, durationMs: 2000, width: 160, height: 90,
        videoCodec: "h264", audioCodec: "aac", frameRateMode: "cfr",
        sha256: sha},
      output: {path: out, sha256: sha, bytes: bytes.length},
      input: {sha256: crypto.createHash("sha256").update(input)
          .digest("hex"), bytes: input.length, durationMs: 2000, frames: 20}};
  };
  fn.calls = calls;
  return fn;
}

module.exports = {FakeTimestamp, FakeFirestore, FakeObjects, fakeDecoder,
  scriptedPipeline};
