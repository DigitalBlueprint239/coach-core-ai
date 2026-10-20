// FILM-S2a isolation harness: run the pinned decoder as a bounded child process.
//
// Guarantees this module provides (each one has a test in harness.test.mjs):
//   - argv array, never a shell: arguments are passed literally;
//   - clean environment: the child sees ONLY the variables listed in `env`
//     (default: none), so no credentials, tokens or proxy settings leak in;
//   - private working directory, stdin closed;
//   - wall-time limit: SIGTERM at `timeoutMs`, SIGKILL `graceMs` later;
//   - resource limits via prlimit(1) when available: CPU seconds, address
//     space, output file size, no core dumps, bounded open files;
//   - bounded stderr capture (tail only), stdout either captured (bounded) or
//     discarded; a run is also terminated when captured output exceeds
//     `maxCaptureBytes`.
// No network access is enforced by the decoder BUILD (--disable-network,
// protocol=file only), not by this module; the harness asserts that fact on
// the binary rather than claiming a sandbox it does not have.
import {spawn, spawnSync} from "node:child_process";
import {mkdtempSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

export const DEFAULT_LIMITS = Object.freeze({
  cpuSeconds: 120,          // RLIMIT_CPU
  addressSpaceBytes: 2 * 1024 ** 3, // RLIMIT_AS, 2 GiB
  fileSizeBytes: 512 * 1024 ** 2,   // RLIMIT_FSIZE, 512 MiB per file written
  openFiles: 64,            // RLIMIT_NOFILE
  coreBytes: 0,             // RLIMIT_CORE
});

let prlimitAvailable = null;
/** @return {boolean} whether util-linux prlimit(1) is usable on this host */
export function hasPrlimit() {
  if (prlimitAvailable === null) {
    const r = spawnSync("prlimit", ["--version"], {encoding: "utf8"});
    prlimitAvailable = r.status === 0;
  }
  return prlimitAvailable;
}

/**
 * Build the argv prefix that applies resource limits (prlimit) when available.
 * @param {object} limits
 * @return {string[]} e.g. ["prlimit", "--cpu=120", ...] or []
 */
export function limitPrefix(limits) {
  if (!hasPrlimit()) return [];
  return [
    "prlimit",
    `--cpu=${limits.cpuSeconds}`,
    `--as=${limits.addressSpaceBytes}`,
    `--fsize=${limits.fileSizeBytes}`,
    `--nofile=${limits.openFiles}`,
    `--core=${limits.coreBytes}`,
    "--",
  ];
}

/**
 * Run a binary under the harness policy.
 * @param {object} opts
 * @param {string} opts.bin absolute path of the executable
 * @param {string[]} opts.args argv (passed literally; no shell)
 * @param {number} [opts.timeoutMs=60000] wall-time limit
 * @param {number} [opts.graceMs=2000] SIGTERM -> SIGKILL grace
 * @param {object} [opts.limits] overrides for DEFAULT_LIMITS
 * @param {object} [opts.env] the ONLY environment the child receives
 * @param {string} [opts.cwd] working dir; default: fresh private temp dir
 * @param {boolean} [opts.captureStdout=false]
 * @param {number} [opts.maxCaptureBytes=1048576] cap on captured bytes per stream
 * @param {number} [opts.stderrTailBytes=8192] bytes of stderr kept in the result
 * @return {Promise<object>} {code, signal, timedOut, killedForOutput, elapsedMs,
 *   stdout, stderrTail, argv, limitsApplied, cwd}
 */
export function runDecoder(opts) {
  const {
    bin, args, timeoutMs = 60_000, graceMs = 2_000, env = {},
    captureStdout = false, maxCaptureBytes = 1024 * 1024,
    stderrTailBytes = 8192,
  } = opts;
  if (typeof bin !== "string" || !bin.startsWith("/")) {
    throw new TypeError("bin must be an absolute path");
  }
  if (!Array.isArray(args) || args.some((a) => typeof a !== "string")) {
    throw new TypeError("args must be an array of strings");
  }
  const limits = {...DEFAULT_LIMITS, ...(opts.limits || {})};
  const prefix = limitPrefix(limits);
  const argv = [...prefix, bin, ...args];
  const ownCwd = !opts.cwd;
  const cwd = opts.cwd || mkdtempSync(join(tmpdir(), "film-decoder-"));
  const started = Date.now();

  return new Promise((resolve) => {
    // detached => own process group, so a timeout kills the whole tree
    // (the decoder and anything it spawned), not just the direct child.
    const child = spawn(argv[0], argv.slice(1), {
      cwd, env, stdio: ["ignore", captureStdout ? "pipe" : "ignore", "pipe"],
      shell: false, windowsHide: true, detached: true,
    });
    let timedOut = false; let killedForOutput = false; let done = false;
    const outChunks = []; let outBytes = 0;
    let errBuf = Buffer.alloc(0); let errBytes = 0;
    const signalGroup = (sig) => {
      try { process.kill(-child.pid, sig); } catch (_) { try { child.kill(sig); } catch (__) { /* gone */ } }
    };
    const killTree = () => {
      signalGroup("SIGTERM");
      setTimeout(() => signalGroup("SIGKILL"), graceMs).unref();
    };
    const timer = setTimeout(() => { timedOut = true; killTree(); }, timeoutMs);
    if (child.stdout) {
      child.stdout.on("data", (c) => {
        outBytes += c.length;
        if (outBytes > maxCaptureBytes) { killedForOutput = true; killTree(); return; }
        outChunks.push(c);
      });
    }
    child.stderr.on("data", (c) => {
      errBytes += c.length;
      if (errBytes > maxCaptureBytes * 4) { killedForOutput = true; killTree(); return; }
      errBuf = Buffer.concat([errBuf, c]);
      if (errBuf.length > stderrTailBytes) errBuf = errBuf.subarray(errBuf.length - stderrTailBytes);
    });
    const finish = (code, signal, spawnError) => {
      if (done) return; done = true; clearTimeout(timer);
      if (ownCwd) { try { rmSync(cwd, {recursive: true, force: true}); } catch (_) { /* best effort */ } }
      resolve({
        code, signal, timedOut, killedForOutput, spawnError: spawnError ? String(spawnError.code || spawnError.message) : null,
        elapsedMs: Date.now() - started,
        stdout: captureStdout ? Buffer.concat(outChunks).toString("utf8") : null,
        stderrTail: errBuf.toString("utf8"),
        argv, limitsApplied: prefix.length > 0 ? limits : null, cwd: ownCwd ? null : cwd,
      });
    };
    child.on("error", (e) => finish(null, null, e));
    child.on("close", (code, signal) => finish(code, signal, null));
  });
}

/**
 * Convenience: run ffprobe with JSON output on one file, bounded.
 * @param {string} ffprobe absolute path
 * @param {string} file absolute path of the input
 * @param {object} [opts] runDecoder options
 * @return {Promise<{result: object, probe: ?object}>}
 */
export async function probeJson(ffprobe, file, opts = {}) {
  const result = await runDecoder({
    bin: ffprobe,
    args: ["-v", "error", "-hide_banner", "-print_format", "json",
      "-show_format", "-show_streams", "-show_chapters", "-i", file],
    captureStdout: true, timeoutMs: opts.timeoutMs || 30_000, ...opts,
  });
  let probe = null;
  if (result.code === 0 && result.stdout) {
    try { probe = JSON.parse(result.stdout); } catch (_) { probe = null; }
  }
  return {result, probe};
}
