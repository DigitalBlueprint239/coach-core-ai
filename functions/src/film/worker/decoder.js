"use strict";
/**
 * FILM-S2b decoder runner: the accepted S2a isolation harness
 * (tools/ffmpeg/harness/run-decoder.mjs, byte-unchanged) with the worker's
 * measured per-step limits and an explicit classification of every result.
 *
 * Fail closed (package §4.2): preflight refuses when prlimit is unavailable,
 * when a binary's sha256 differs from the pinned digest, or when the limits
 * are invalid or not calibrated. `allowNoLimits` is never passed.
 *
 * Classification (r4 LIMIT_KILL_SIGNALS):
 *   timedOut                         -> limit-kill "wall-time"   (classified)
 *   signal SIGXCPU                   -> limit-kill "SIGXCPU"     (classified)
 *   signal SIGXFSZ                   -> limit-kill "SIGXFSZ"     (classified)
 *   allocation failure reported      -> limit-kill "allocation-failure"
 *   output-capture kill, other SIGKILL -> limit-kill "SIGKILL" (NOT
 *                                       classified: never a media verdict)
 *   any other signal                 -> crash
 *   spawn error                      -> infrastructure
 *   exit != 0                        -> error (the step decides its verdict)
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {pathToFileURL} = require("url");
const {limitsProblem} = require("./limits");

const HARNESS = path.resolve(__dirname, "..", "..", "..", "..", "tools",
    "ffmpeg", "harness", "run-decoder.mjs");
const SOURCE_JSON = path.resolve(__dirname, "..", "..", "..", "..", "tools",
    "ffmpeg", "SOURCE.json");
const ALLOCATION_RE = new RegExp(["Cannot allocate memory", "out of memory",
  "ENOMEM", "std::bad_alloc", "Memory allocation failed"].join("|"), "i");

/**
 * The ONLY environment a decoder process receives. One malloc arena keeps
 * the static binary's per-thread arena reservations (64 MiB of address
 * space each) from inflating RLIMIT_AS; calibration measures with exactly
 * this environment. No credentials, proxy or locale variables are passed.
 */
const DECODER_ENV = Object.freeze({GLIBC_TUNABLES: "glibc.malloc.arena_max=1"});

let harnessPromise = null;
/** @return {Promise<object>} the S2a harness module */
function loadHarness() {
  if (!harnessPromise) harnessPromise = import(pathToFileURL(HARNESS).href);
  return harnessPromise;
}

/** @return {{ffmpeg: string, ffprobe: string}} pinned digests (SOURCE.json) */
function pinnedDigests() {
  const s = JSON.parse(fs.readFileSync(SOURCE_JSON, "utf8"));
  return {...s.expectedBinarySha256};
}

/**
 * @param {string} file
 * @return {string} sha256 hex
 */
function fileSha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file))
      .digest("hex");
}

/**
 * Classify one harness result.
 * @param {object} r runDecoder result
 * @return {{status: string, kill: (string|undefined)}}
 */
function classify(r) {
  if (r.spawnError) {
    return {status: r.spawnError === "limits-unavailable" ?
      "configuration" : "infrastructure"};
  }
  if (r.timedOut) return {status: "limit-kill", kill: "wall-time"};
  if (r.signal === "SIGXCPU") return {status: "limit-kill", kill: "SIGXCPU"};
  if (r.signal === "SIGXFSZ") return {status: "limit-kill", kill: "SIGXFSZ"};
  if (r.killedForOutput) return {status: "limit-kill", kill: "SIGKILL"};
  const alloc = ALLOCATION_RE.test(r.stderrTail || "");
  if (r.signal === "SIGKILL") return {status: "limit-kill", kill: "SIGKILL"};
  if (r.signal) {
    return alloc ? {status: "limit-kill", kill: "allocation-failure"} :
      {status: "crash"};
  }
  if (r.code !== 0) {
    return alloc ? {status: "limit-kill", kill: "allocation-failure"} :
      {status: "error"};
  }
  return {status: "ok"};
}

/**
 * @param {object} cfg
 * @param {string} cfg.ffmpeg absolute path
 * @param {string} cfg.ffprobe absolute path
 * @param {{ffmpeg: string, ffprobe: string}} cfg.expectedSha256
 * @param {object} cfg.limits WORKER_LIMITS-shaped
 * @return {object} decoder
 */
function createDecoder(cfg) {
  const {limits} = cfg;
  let verified = null;

  /**
   * Configuration preflight; consumes nothing (r4: before admission).
   * @return {Promise<{ok: boolean, reason: ?string}>}
   */
  async function preflight() {
    const lp = limitsProblem(limits);
    if (lp) return {ok: false, reason: lp};
    if (limits.status !== "MEASURED") {
      return {ok: false, reason: "limits-not-calibrated"};
    }
    const h = await loadHarness();
    if (!h.hasPrlimit()) return {ok: false, reason: "prlimit-unavailable"};
    if (!cfg.expectedSha256 || !cfg.expectedSha256.ffmpeg ||
        !cfg.expectedSha256.ffprobe) {
      return {ok: false, reason: "decoder-digest-unpinned"};
    }
    for (const bin of ["ffmpeg", "ffprobe"]) {
      const p = cfg[bin];
      if (typeof p !== "string" || !path.isAbsolute(p) || !fs.existsSync(p)) {
        return {ok: false, reason: `${bin}-missing`};
      }
      if (fileSha256(p) !== cfg.expectedSha256[bin]) {
        return {ok: false, reason: `${bin}-digest-mismatch`};
      }
    }
    verified = {ffmpeg: cfg.expectedSha256.ffmpeg,
      ffprobe: cfg.expectedSha256.ffprobe};
    return {ok: true, reason: null};
  }

  /**
   * Run one bounded step. Refuses unless preflight passed.
   * @param {string} step one of PIPELINE_STEPS
   * @param {"ffmpeg"|"ffprobe"} bin
   * @param {string[]} args
   * @param {object} [o] {captureStdout, cwd}
   * @return {Promise<object>} {status, kill?, code, signal, stdout,
   *   stderrTail, elapsedMs}
   */
  async function run(step, bin, args, o = {}) {
    if (!verified) return {status: "configuration", reason: "no-preflight"};
    const s = limits.steps[step];
    if (!s) throw new Error(`unknown step ${step}`);
    const h = await loadHarness();
    const r = await h.runDecoder({
      bin: cfg[bin], args,
      timeoutMs: s.wallMs, graceMs: limits.graceMs,
      // soft:hard so the CPU limit raises SIGXCPU (classified), not SIGKILL.
      limits: {cpuSeconds: `${s.cpuSoftSeconds}:${s.cpuSoftSeconds +
        limits.cpuHardMarginSeconds}`, addressSpaceBytes: s.addressSpaceBytes,
      fileSizeBytes: s.fileSizeBytes, openFiles: limits.openFiles,
      coreBytes: 0},
      env: {...DECODER_ENV}, cwd: o.cwd, captureStdout: !!o.captureStdout,
      maxCaptureBytes: s.maxCaptureBytes,
    });
    return {...classify(r), code: r.code, signal: r.signal,
      stdout: r.stdout, stderrTail: r.stderrTail, elapsedMs: r.elapsedMs};
  }

  return {preflight, run, digests: () => verified};
}

module.exports = {createDecoder, classify, pinnedDigests, fileSha256,
  HARNESS, ALLOCATION_RE, DECODER_ENV};
