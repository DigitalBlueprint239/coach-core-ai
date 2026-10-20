#!/usr/bin/env node
"use strict";
/**
 * FILM-S2b limit calibration (package §4.2; statement r2 "Limits").
 *
 * Runs the EXACT worker argv (media.ARGS) for every pipeline step over every
 * structurally valid frozen S2a fixture and every S2b fixture, three times
 * each, on the decoder given by FFMPEG_BIN / FFPROBE_BIN, and finds each
 * command's minimum working address space (prlimit ladder). Then derives:
 *   wallMs          = max(ceil(maxWall x 3), 10 s)
 *   cpuSoftSeconds  = max(ceil(maxCpu x 3), 5 s)   (hard = soft + margin)
 *   addressSpace    = max(minWorkingAS x 3, 512 MiB)
 *   fileSize        = normalize: max(maxOut x 3, 1.1 x PENDING_D3 maxBytes)
 *                     other steps: 1 MiB (they write nothing)
 *   maxCapture      = max(maxStdout x 3, 8 MiB) for probes, 1 MiB otherwise
 * Values are TEST_MEASURED for synthetic media; they approve nothing.
 *
 * Usage: FFMPEG_BIN=... FFPROBE_BIN=... \
 *   node film-worker-calibrate.js <out.json>
 * PINNED=1 additionally requires the binaries to match SOURCE.json.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const {spawnSync} = require("child_process");
const {ARGS, probeFacts, policyReason, structural} =
  require("../src/film/worker/media");
const {pinnedDigests, fileSha256, DECODER_ENV} =
  require("../src/film/worker/decoder");
const {LIMITS} = require("../src/film/limits");

const MEASURE = path.join(__dirname, "film-worker-measure.py");
const ROOT = path.join(__dirname, "..", "..");
// CAL_DIRS (":"-separated) narrows the set for local development only; CI
// always calibrates the full frozen + S2b set.
const DIRS = process.env.CAL_DIRS ? process.env.CAL_DIRS.split(":") :
  [path.join(ROOT, "tools", "ffmpeg", "fixtures", "frozen"),
    path.join(ROOT, "functions", "test", "fixtures", "s2b-media")];
const REPS = 3;
const PRLIMIT = spawnSync("sh", ["-c", "command -v prlimit"],
    {encoding: "utf8"}).stdout.trim();
const MiB = 1024 * 1024;
const LADDER = [32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 1536,
  2048, 3072].map((m) => m * MiB);

const bins = {ffmpeg: process.env.FFMPEG_BIN, ffprobe: process.env.FFPROBE_BIN};
for (const [k, v] of Object.entries(bins)) {
  if (!v || !path.isAbsolute(v)) throw new Error(`${k} path required`);
}
const pinned = process.env.PINNED === "1";
const digests = {ffmpeg: fileSha256(bins.ffmpeg),
  ffprobe: fileSha256(bins.ffprobe)};
if (pinned) {
  const want = pinnedDigests();
  if (digests.ffmpeg !== want.ffmpeg || digests.ffprobe !== want.ffprobe) {
    throw new Error("decoder digests differ from SOURCE.json");
  }
}

/**
 * @param {string} bin "ffmpeg" | "ffprobe"
 * @param {string[]} args
 * @param {number} [asBytes] address-space limit (0 = none)
 * @param {object} [env] child environment (default: the worker's)
 * @return {object} one measured run
 */
function measure(bin, args, asBytes = 0, env = DECODER_ENV) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "cal-"));
  const r = spawnSync("python3", [MEASURE, cwd, String(asBytes),
    JSON.stringify(env), bins[bin], ...args],
  {encoding: "utf8", maxBuffer: 64 * MiB});
  fs.rmSync(cwd, {recursive: true, force: true});
  if (r.status !== 0) throw new Error(`measure failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

/**
 * Smallest ladder AS whose run ends like the unlimited run (bisection;
 * success is monotonic in the address-space limit).
 * @param {string} bin
 * @param {string[]} args
 * @param {object} ref the unlimited run
 * @param {object} [env]
 * @return {?number} bytes
 */
function minAs(bin, args, ref, env = DECODER_ENV) {
  const ok = (as) => {
    const m = measure(bin, args, as, env);
    return m.exit === ref.exit && m.signal === ref.signal &&
      m.stdoutBytes === ref.stdoutBytes;
  };
  if (!ok(LADDER[LADDER.length - 1])) return null;
  let lo = -1;
  let hi = LADDER.length - 1; // LADDER[hi] passes
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ok(LADDER[mid])) hi = mid;
    else lo = mid;
  }
  return LADDER[hi];
}

const rows = [];
/**
 * Measure a command REPS times; record the maxima.
 * @param {string} step
 * @param {string} fixture
 * @param {string} bin
 * @param {string[]} args
 * @param {object} [opts]
 * @return {{row: object, ref: object}}
 */
function run(step, fixture, bin, args, opts = {}) {
  const ms = [];
  for (let i = 0; i < REPS; i++) ms.push(measure(bin, args));
  const ref = ms[0];
  const row = {step, fixture, bin, cmd: opts.cmd || bin, args,
    exit: ref.exit, signal: ref.signal,
    wallMs: Math.max(...ms.map((m) => m.wallMs)),
    cpuMs: Math.max(...ms.map((m) => m.cpuMs)),
    maxRssKb: Math.max(...ms.map((m) => m.maxRssKb)),
    stdoutBytes: Math.max(...ms.map((m) => m.stdoutBytes)),
    stderrBytes: Math.max(...ms.map((m) => m.stderrBytes)),
    minAsBytes: minAs(bin, args, ref)};
  rows.push(row);
  return {row, ref};
}

(async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "cal-work-"));
  for (const dir of DIRS) {
    for (const f of fs.readdirSync(dir).filter((x) => /\.(mp4|webm)$/.test(x))
        .sort()) {
      const file = path.join(dir, f);
      if (await structural(fs.readFileSync(file))) continue;
      run("probe-input", f, "ffprobe", ARGS.probe(file), {cmd: "probe"});
      run("probe-input", f, "ffprobe", ARGS.packets(file), {cmd: "packets"});
      const p = spawnSync(bins.ffprobe, ARGS.probe(file), {encoding: "utf8",
        maxBuffer: 64 * MiB});
      const k = spawnSync(bins.ffprobe, ARGS.packets(file),
          {encoding: "utf8", maxBuffer: 64 * MiB});
      let facts = null;
      try {
        facts = probeFacts(JSON.parse(p.stdout), JSON.parse(k.stdout)).facts;
      } catch (_) {
        facts = null;
      }
      // Each later step is measured on exactly the inputs that reach it in
      // the worker (decode-input only after probe + placeholder policy).
      if (!facts || policyReason(facts)) continue;
      run("decode-input", f, "ffmpeg", ARGS.decode(file));
      const out = path.join(work, `${f}.normalized.mp4`);
      run("normalize", f, "ffmpeg",
          ARGS.normalize(file, out, !!facts.audioCodec));
      // normalize ran REPS times with -n: produce the output once here.
      fs.rmSync(out, {force: true});
      spawnSync(bins.ffmpeg, ARGS.normalize(file, out, !!facts.audioCodec));
      const outBytes = fs.statSync(out).size;
      rows[rows.length - 1].outputBytes = outBytes;
      run("probe-output", f, "ffprobe", ARGS.probe(out), {cmd: "probe"});
      run("probe-output", f, "ffprobe", ARGS.packets(out), {cmd: "packets"});
      run("decode-output", f, "ffmpeg", ARGS.decode(out));
    }
  }
  fs.rmSync(work, {recursive: true, force: true});

  const unfit = rows.filter((r) => r.minAsBytes === null);
  if (unfit.length) {
    throw new Error("commands did not fit the address-space ladder: " +
      JSON.stringify(unfit.map((r) => [r.step, r.fixture, r.cmd])));
  }
  // Diagnostic only: the worst address-space row again WITHOUT the
  // single-arena environment (shows what the tunable changes).
  const worst = rows.slice().sort((a, b) => b.minAsBytes - a.minAsBytes)[0];
  const worstArgs = worst.args;
  const plainRef = measure(worst.bin, worstArgs, 0, {});
  const diagnostic = {step: worst.step, fixture: worst.fixture,
    cmd: worst.cmd, minAsWithEnv: worst.minAsBytes,
    minAsWithoutEnv: minAs(worst.bin, worstArgs, plainRef, {})};

  // Diagnostic: how the pinned decoder fails when the address-space limit
  // is BELOW its measured need (classification evidence for
  // allocation-failure). Run directly under prlimit with the worker env.
  const allocProbe = [];
  const big = rows.filter((r) => r.step === "decode-input")
      .sort((a, b) => b.minAsBytes - a.minAsBytes)[0];
  for (const mib of [24, 48, 96, Math.max(32, big.minAsBytes / MiB / 2)]) {
    const r = spawnSync(PRLIMIT, [`--as=${mib * MiB}`, "--", bins.ffmpeg,
      ...big.args], {encoding: "utf8", env: DECODER_ENV,
      maxBuffer: 16 * MiB});
    allocProbe.push({mib, fixture: big.fixture, exit: r.status,
      signal: r.signal, stderrTail: String(r.stderr || "").slice(-600)});
  }
  console.error(JSON.stringify({allocProbe}));

  const steps = {};
  for (const step of ["probe-input", "decode-input", "normalize",
    "probe-output", "decode-output"]) {
    const rs = rows.filter((r) => r.step === step);
    if (rs.length === 0) throw new Error(`no measurements for ${step}`);
    const max = (k) => Math.max(0, ...rs.map((r) => r[k] || 0));
    const probe = step.startsWith("probe");
    const observed = {runs: rs.length * REPS, wallMs: max("wallMs"),
      cpuMs: max("cpuMs"), maxRssKb: max("maxRssKb"),
      minAsBytes: max("minAsBytes"), stdoutBytes: max("stdoutBytes"),
      outputBytes: max("outputBytes"),
      worstFixture: rs.slice().sort((a, b) => b.wallMs - a.wallMs)[0]
          .fixture};
    steps[step] = {observed, limits: {
      wallMs: Math.max(Math.ceil(observed.wallMs * 3), 10000),
      cpuSoftSeconds: Math.max(Math.ceil(observed.cpuMs * 3 / 1000), 5),
      addressSpaceBytes: Math.max(observed.minAsBytes * 3, 512 * MiB),
      fileSizeBytes: step === "normalize" ? Math.max(
          observed.outputBytes * 3, Math.ceil(LIMITS.maxBytes * 1.1)) : MiB,
      maxCaptureBytes: probe ? Math.max(observed.stdoutBytes * 3, 8 * MiB) :
        MiB,
    }};
  }
  const result = {pinned, digests, reps: REPS, env: DECODER_ENV,
    diagnostic, rule:
    "max(observed) x 3 with floors (wall 10 s, cpu 5 s, AS 512 MiB, " +
    "normalize fsize 1.1 x PENDING_D3 maxBytes, probe capture 8 MiB)",
    host: `${os.type()} ${os.release()} ${os.cpus().length}cpu`, steps, rows};
  fs.writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + "\n");
  // Every row, compact (reviewers without artifact access read annotations).
  const table = rows.map((r) => [r.step, r.fixture.replace(/\.(mp4|webm)$/,
      ""), r.cmd, Math.round(r.minAsBytes / MiB), Math.round(r.cpuMs),
  Math.round(r.wallMs), Math.round(r.maxRssKb / 1024)].join("|"));
  fs.writeFileSync(process.argv[2].replace(/\.json$/, ".rows.txt"),
      "step|fixture|cmd|minAsMiB|cpuMs|wallMs|rssMiB\n" +
      table.join("\n") + "\n");
  console.error(JSON.stringify({diagnostic}));
  // CHECK_COMMITTED=1: every command must still fit the COMMITTED limits.
  if (process.env.CHECK_COMMITTED === "1") {
    const {WORKER_LIMITS} = require("../src/film/worker/limits");
    const over = [];
    for (const r of rows) {
      const c = WORKER_LIMITS.steps[r.step];
      const why = (k) => over.push([r.step, r.fixture, k]);
      if (r.minAsBytes > c.addressSpaceBytes) why("as");
      if (r.cpuMs > c.cpuSoftSeconds * 1000) why("cpu");
      if (r.wallMs > c.wallMs) over.push([r.step, r.fixture, "wall"]);
      if (r.stdoutBytes > c.maxCaptureBytes) {
        over.push([r.step, r.fixture, "capture"]);
      }
      if ((r.outputBytes || 0) > c.fileSizeBytes) {
        over.push([r.step, r.fixture, "fsize"]);
      }
    }
    if (over.length) {
      throw new Error("measured need exceeds committed limits: " +
        JSON.stringify(over));
    }
    console.error(JSON.stringify({committedLimitsHold: rows.length}));
  }
  const compact = Object.fromEntries(Object.entries(steps).map(([k, v]) =>
    [k, {...v.limits, obs: {wall: v.observed.wallMs, cpu: v.observed.cpuMs,
      as: v.observed.minAsBytes, out: v.observed.stdoutBytes,
      runs: v.observed.runs, worst: v.observed.worstFixture}}]));
  console.log(JSON.stringify(compact));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
