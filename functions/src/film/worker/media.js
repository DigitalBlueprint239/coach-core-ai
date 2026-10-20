"use strict";
/* global BigInt */
/**
 * FILM-S2b media pipeline (statement r2, "Before ready, in order"):
 *   (1 generation-pinned input: the worker, before this module)
 *   2 decoder-independent structural validation (S2a mp4-boxes.mjs)
 *   3 bounded probe + placeholder policy           step "probe-input"
 *   4 full strict decode of the input              step "decode-input"
 *   5 stream-copy normalization, metadata stripped step "normalize"
 *   6 independent validation of the ACTUAL output: structural, probe,
 *     timestamp fidelity, tags (probe AND bytes), limits ("probe-output"),
 *     full strict decode                           step "decode-output"
 *
 * Every decoder run is preceded by `checkpoint(step)`, which the worker uses
 * to renew its fenced lease; a refused checkpoint aborts with no further
 * decoder launch. No policy value is approved: limits are the PENDING_D3
 * placeholders from functions/src/film/limits.js (read only).
 *
 * Result (one of):
 *   {outcome: "ok", media, output: {path, sha256, bytes}, input: {...}}
 *   {outcome: "verdict", reason, step}        permanent media verdict
 *   {outcome: "limit-kill", kill, step}       r4 attempt record material
 *   {outcome: "crash"|"infrastructure"|"configuration", step}
 *   {outcome: "unknown", step}   a failure WITHOUT positive media evidence
 *                                (never a verdict; recovery path)
 *   {outcome: "aborted", step}                checkpoint refused
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {pathToFileURL} = require("url");
const {LIMITS} = require("../limits");
const c2 = require("../contract-v2");

const BOXES = path.resolve(__dirname, "..", "..", "..", "..", "tools",
    "ffmpeg", "harness", "mp4-boxes.mjs");
let boxesPromise = null;
const loadBoxes = () => boxesPromise ||
  (boxesPromise = import(pathToFileURL(BOXES).href));

/** Container tags a normalized output may carry (structural only). */
const ALLOWED_FORMAT_TAGS = Object.freeze(["major_brand", "minor_version",
  "compatible_brands"]);
const ALLOWED_STREAM_TAGS = Object.freeze(["language", "handler_name",
  "vendor_id"]);
const ALLOWED_HANDLERS = Object.freeze(["VideoHandler", "SoundHandler"]);
const MIN_SCAN_LEN = 4;

/** Common input flags: local file only, external data references disabled. */
const INPUT_GUARD = ["-protocol_whitelist", "file", "-enable_drefs", "0"];
const QUIET = ["-v", "error", "-hide_banner"];

const sha256 = (buf) => crypto.createHash("sha256").update(buf)
    .digest("hex");

/**
 * Exact argv of every bounded decoder run (shared with calibration so the
 * measured commands are the commands the worker runs).
 */
const ARGS = Object.freeze({
  probe: (file) => [...QUIET, ...INPUT_GUARD, "-print_format", "json",
    "-show_format", "-show_streams", "-show_chapters", "-i", file],
  packets: (file) => [...QUIET, ...INPUT_GUARD, "-select_streams", "v:0",
    "-show_entries", "packet=pts:stream=time_base", "-print_format", "json",
    "-i", file],
  decode: (file) => [...QUIET, "-nostdin", "-threads", "1", ...INPUT_GUARD,
    "-xerror", "-i", file, "-map", "0", "-filter_threads", "1", "-f", "null",
    "-"],
  normalize: (file, out, hasAudio) => [...QUIET, "-nostdin", "-n",
    "-threads", "1", ...INPUT_GUARD, "-i", file, "-map", "0:v:0",
    ...(hasAudio ? ["-map", "0:a:0"] : []), "-c", "copy",
    "-map_metadata", "-1", "-map_metadata:s", "-1", "-map_chapters", "-1",
    "-fflags", "+bitexact", "-flags:v", "+bitexact", "-flags:a", "+bitexact",
    "-movflags", "+faststart", "-f", "mp4", out],
});

/**
 * @param {string} s "n/d"
 * @return {?[bigint, bigint]}
 */
function rational(s) {
  const m = /^([1-9][0-9]{0,9})\/([1-9][0-9]{0,9})$/.exec(String(s || ""));
  return m ? [BigInt(m[1]), BigInt(m[2])] : null;
}

/**
 * Probe facts used by policy and fidelity, or a reason.
 * @param {object} probe ffprobe -show_format -show_streams JSON
 * @param {object} packets ffprobe video packets JSON
 * @return {{facts: ?object, reason: ?string}} one of the two is set
 */
function probeFacts(probe, packets) {
  if (!probe || !Array.isArray(probe.streams) || !probe.format) {
    return {reason: "metadata-invalid"};
  }
  const video = probe.streams.filter((s) => s.codec_type === "video");
  const audio = probe.streams.filter((s) => s.codec_type === "audio");
  if (video.length === 0) return {reason: "video-stream-missing"};
  if (video.length > 1 || audio.length > 1 || probe.streams.length > 2) {
    return {reason: "stream-count-exceeded"};
  }
  const v = video[0];
  const a = audio[0] || null;
  if (v.codec_name !== "h264") return {reason: "video-codec-not-allowed"};
  if (a && a.codec_name !== "aac") return {reason: "audio-codec-not-allowed"};
  const width = Number(v.width);
  const height = Number(v.height);
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width <= 0 || height <= 0) {
    return {reason: "metadata-invalid"};
  }
  const durs = [probe.format.duration, v.duration].map(Number)
      .filter((d) => Number.isFinite(d) && d > 0);
  if (durs.length === 0) return {reason: "metadata-invalid"};
  const durationMs = Math.round(Math.max(...durs) * 1000);
  const tb = rational(packets && packets.streams && packets.streams[0] &&
    packets.streams[0].time_base);
  const pts = ((packets && packets.packets) || []).map((p) => p.pts);
  if (!tb || pts.length === 0 ||
      pts.some((p) => typeof p !== "string" && typeof p !== "number") ||
      pts.some((p) => !/^-?[0-9]{1,18}$/.test(String(p)))) {
    return {reason: "metadata-invalid"};
  }
  const sorted = pts.map((p) => BigInt(p)).sort((x, y) => (x < y ? -1 :
    x > y ? 1 : 0));
  const deltas = [];
  for (let i = 1; i < sorted.length; i++) {
    deltas.push(sorted[i] - sorted[i - 1]);
  }
  if (deltas.some((d) => d <= 0n)) return {reason: "metadata-invalid"};
  return {facts: {width, height, durationMs,
    videoCodec: "h264", audioCodec: a ? "aac" : null,
    streams: probe.streams.length, timeBase: tb, deltas,
    formatTags: (probe.format && probe.format.tags) || {},
    streamTags: probe.streams.map((s) => s.tags || {}),
    chapters: Array.isArray(probe.chapters) ? probe.chapters.length : 0}};
}

/**
 * Multiset of exact frame intervals in seconds, as canonical rationals.
 * @param {bigint[]} deltas
 * @param {[bigint, bigint]} tb
 * @return {Map<string, number>}
 */
function intervalHistogram(deltas, tb) {
  const gcd = (x, y) => (y === 0n ? x : gcd(y, x % y));
  const h = new Map();
  for (const d of deltas) {
    const num = d * tb[0];
    const den = tb[1];
    const g = gcd(num, den);
    const k = `${num / g}/${den / g}`;
    h.set(k, (h.get(k) || 0) + 1);
  }
  return h;
}

/**
 * Longest frame interval in ms (rounded up), for the ±1 frame duration rule.
 * @param {object} facts
 * @return {number}
 */
function maxIntervalMs(facts) {
  let max = 0n;
  for (const d of facts.deltas) if (d > max) max = d;
  const [n, den] = facts.timeBase;
  return Number((max * n * 1000n + den - 1n) / den);
}

/**
 * Forbidden metadata values present in the input (scanned in output bytes).
 * @param {object} facts input facts
 * @return {string[]}
 */
function forbiddenValues(facts) {
  const vals = [];
  const add = (tags, allowed) => {
    for (const [k, v] of Object.entries(tags || {})) {
      if (allowed.includes(k)) continue;
      const s = String(v);
      if (s.length >= MIN_SCAN_LEN) vals.push(s);
    }
  };
  add(facts.formatTags, ALLOWED_FORMAT_TAGS);
  for (const t of facts.streamTags) add(t, ALLOWED_STREAM_TAGS);
  return [...new Set(vals)];
}

/**
 * Policy over the PENDING_D3 placeholders.
 * @param {object} facts
 * @param {object} [limits]
 * @return {?string} reason or null
 */
function policyReason(facts, limits = LIMITS) {
  if (facts.durationMs > limits.maxDurationMs) return "duration-over-limit";
  if (facts.width > limits.maxWidth || facts.height > limits.maxHeight) {
    return "resolution-over-limit";
  }
  return null;
}

/**
 * Structural check (decoder-independent).
 * @param {Buffer} buf
 * @return {Promise<?string>} null when ok, else a short diagnostic
 */
async function structural(buf) {
  if (buf.length < 8 || buf.toString("latin1", 4, 8) !== "ftyp") {
    return "first-box-not-ftyp";
  }
  const {checkBoxes} = await loadBoxes();
  const r = checkBoxes(buf);
  return r.ok ? null : String(r.reason);
}

/**
 * Run the pipeline over one local input file.
 * @param {object} o
 * @param {string} o.inputPath
 * @param {string} o.workDir private directory for the output
 * @param {object} o.decoder createDecoder() result, preflight passed
 * @param {function(string): Promise<boolean>} o.checkpoint
 * @param {object} [o.policyLimits] PENDING_D3 placeholders (default LIMITS)
 * @return {Promise<object>} see module doc
 */
async function runPipeline(o) {
  const {inputPath, workDir, decoder, checkpoint} = o;
  if (!path.isAbsolute(inputPath) || !path.isAbsolute(workDir)) {
    throw new TypeError("inputPath and workDir must be absolute");
  }
  const limits = o.policyLimits || LIMITS;
  const step = async (name, bin, args, opts) => {
    if (!(await checkpoint(name))) {
      return {done: {outcome: "aborted", step: name}};
    }
    const r = await decoder.run(name, bin, args, {cwd: workDir, ...opts});
    if (r.status === "ok") return {r};
    if (r.status === "error") return {r, error: true};
    if (r.status === "ambiguous") {
      return {done: {outcome: "unknown", step: name}};
    }
    if (r.status === "limit-kill") {
      return {done: {outcome: "limit-kill", kill: r.kill, step: name}};
    }
    return {done: {outcome: r.status === "crash" ? "crash" :
      r.status === "configuration" ? "configuration" : "infrastructure",
    step: name}};
  };
  const verdict = (reason, s) => ({outcome: "verdict", reason, step: s});
  const parse = (s) => {
    try {
      return JSON.parse(s);
    } catch (_) {
      return null;
    }
  };

  /**
   * Probe + packets for one file inside one bounded step.
   * @param {string} name step
   * @param {string} file
   * @return {Promise<object>}
   */
  const probeStep = async (name, file) => {
    const p = await step(name, "ffprobe", ARGS.probe(file),
        {captureStdout: true});
    if (p.done) return p;
    if (p.error) return {error: true};
    const k = await step(name, "ffprobe", ARGS.packets(file),
        {captureStdout: true});
    if (k.done) return k;
    if (k.error) return {error: true};
    return {probe: parse(p.r.stdout), packets: parse(k.r.stdout)};
  };

  // 2. structural (input)
  const inBuf = fs.readFileSync(inputPath);
  const inputSha256 = sha256(inBuf);
  if (await structural(inBuf)) {
    return verdict("container-invalid", "structural");
  }

  // 3. probe + policy
  const pi = await probeStep("probe-input", inputPath);
  if (pi.done) return pi.done;
  if (pi.error) return verdict("metadata-invalid", "probe-input");
  const fi = probeFacts(pi.probe, pi.packets);
  if (fi.reason) return verdict(fi.reason, "probe-input");
  const inFacts = fi.facts;
  const pol = policyReason(inFacts, limits);
  if (pol) return verdict(pol, "probe-input");

  // 4. full strict decode of the input
  const STRICT = {strict: true};
  const di = await step("decode-input", "ffmpeg", ARGS.decode(inputPath),
      STRICT);
  if (di.done) return di.done;
  if (di.error) return verdict("media-corrupt", "decode-input");

  // 5. normalize: stream copy, metadata stripped, bitexact, faststart
  const outPath = path.join(workDir, "normalized.mp4");
  const nz = await step("normalize", "ffmpeg",
      ARGS.normalize(inputPath, outPath, !!inFacts.audioCodec), STRICT);
  if (nz.done) return nz.done;
  if (nz.error || !fs.existsSync(outPath)) {
    return verdict("output-invalid", "normalize");
  }

  // 6. independent validation of the actual output
  const outBuf = fs.readFileSync(outPath);
  if (outBuf.length < 1 || outBuf.length > limits.maxBytes) {
    return verdict("output-invalid", "output-size");
  }
  if (await structural(outBuf)) return verdict("output-invalid", "structural");
  const po = await probeStep("probe-output", outPath);
  if (po.done) return po.done;
  if (po.error) return verdict("output-invalid", "probe-output");
  const fo = probeFacts(po.probe, po.packets);
  if (fo.reason) return verdict("output-invalid", "probe-output");
  const out = fo.facts;
  const sameStreams = out.audioCodec === inFacts.audioCodec &&
    out.streams === (inFacts.audioCodec ? 2 : 1) &&
    out.width === inFacts.width && out.height === inFacts.height;
  if (!sameStreams) return verdict("output-invalid", "output-streams");
  if (Math.abs(out.durationMs - inFacts.durationMs) > maxIntervalMs(inFacts) ||
      policyReason(out, limits)) {
    return verdict("output-invalid", "output-duration");
  }
  const hIn = intervalHistogram(inFacts.deltas, inFacts.timeBase);
  const hOut = intervalHistogram(out.deltas, out.timeBase);
  if (hIn.size !== hOut.size ||
      [...hIn].some(([k, n]) => hOut.get(k) !== n)) {
    return verdict("output-invalid", "timestamp-fidelity");
  }
  const badFormatTag = Object.keys(out.formatTags)
      .some((k) => !ALLOWED_FORMAT_TAGS.includes(k));
  const badStreamTag = out.streamTags.some((t) => Object.entries(t)
      .some(([k, v]) => !ALLOWED_STREAM_TAGS.includes(k) ||
        (k === "handler_name" && !ALLOWED_HANDLERS.includes(v))));
  if (badFormatTag || badStreamTag || out.chapters !== 0) {
    return verdict("output-invalid", "forbidden-tags-probe");
  }
  for (const v of forbiddenValues(inFacts)) {
    if (outBuf.includes(Buffer.from(v, "utf8")) ||
        outBuf.includes(Buffer.from(v, "utf16le"))) {
      return verdict("output-invalid", "forbidden-tags-bytes");
    }
  }
  const dout = await step("decode-output", "ffmpeg", ARGS.decode(outPath),
      STRICT);
  if (dout.done) return dout.done;
  if (dout.error) return verdict("output-invalid", "decode-output");

  const intervals = new Set(hOut.keys());
  const media = {
    bytes: outBuf.length, durationMs: out.durationMs, width: out.width,
    height: out.height, videoCodec: "h264", audioCodec: out.audioCodec,
    frameRateMode: intervals.size <= 1 ? "cfr" : "vfr",
    sha256: sha256(outBuf),
  };
  if (!c2.schemas.media.safeParse(media).success) {
    return verdict("output-invalid", "media-schema");
  }
  return {outcome: "ok", media,
    output: {path: outPath, sha256: media.sha256, bytes: media.bytes},
    input: {sha256: inputSha256, bytes: inBuf.length,
      durationMs: inFacts.durationMs, frames: inFacts.deltas.length + 1}};
}

module.exports = {runPipeline, ARGS, probeFacts, policyReason,
  intervalHistogram, forbiddenValues, structural, ALLOWED_FORMAT_TAGS,
  ALLOWED_STREAM_TAGS};
