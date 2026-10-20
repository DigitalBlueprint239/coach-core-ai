"use strict";
/**
 * FILM-S2b worker resource limits (TEST ONLY).
 *
 * Every value here is measured, never assumed: the calibration
 * (functions/scripts/film-worker-calibrate.js with film-worker-measure.py)
 * runs every pipeline step's exact argv three times on the PINNED decoder in
 * CI, over the frozen and S2b fixtures that reach that step, and
 * the limits are derived as max(observed) x 3 with the stated floors
 * (statement r2, package §4.2). They are labelled TEST_MEASURED: they are not
 * deploy values and approve nothing.
 *
 * Preflight refuses to run the decoder unless `status` is MEASURED.
 */

/**
 * Per-step limits for the bounded decoder subprocess stages, derived from
 * the pinned calibration below: max(observed) x 3 with floors (wall 10 s,
 * CPU 5 s, address space 512 MiB, probe capture 8 MiB, normalize file size
 * 1.1 x PENDING_D3 maxBytes, 1 MiB for steps that write nothing).
 */
const STEP_LIMITS = Object.freeze({
  "probe-input": Object.freeze({
    wallMs: 10000, cpuSoftSeconds: 5, addressSpaceBytes: 536870912,
    fileSizeBytes: 1048576, maxCaptureBytes: 8388608}),
  "decode-input": Object.freeze({
    wallMs: 10000, cpuSoftSeconds: 5, addressSpaceBytes: 603979776,
    fileSizeBytes: 1048576, maxCaptureBytes: 1048576}),
  "normalize": Object.freeze({
    wallMs: 10000, cpuSoftSeconds: 5, addressSpaceBytes: 536870912,
    fileSizeBytes: 110000001, maxCaptureBytes: 1048576}),
  "probe-output": Object.freeze({
    wallMs: 10000, cpuSoftSeconds: 5, addressSpaceBytes: 536870912,
    fileSizeBytes: 1048576, maxCaptureBytes: 8388608}),
  "decode-output": Object.freeze({
    wallMs: 10000, cpuSoftSeconds: 5, addressSpaceBytes: 603979776,
    fileSizeBytes: 1048576, maxCaptureBytes: 1048576}),
});

const WORKER_LIMITS = Object.freeze({
  status: "MEASURED",
  label: "TEST_MEASURED",
  steps: STEP_LIMITS,
  /** CPU hard limit = soft + this, so SIGXCPU (classified) precedes SIGKILL. */
  cpuHardMarginSeconds: 2,
  /** SIGTERM -> SIGKILL grace after the wall-time limit. */
  graceMs: 2000,
  openFiles: 64,
  /** Lease time-to-live; renewed at every step boundary. */
  leaseTtlMs: 0,
  /** Margin kept between the longest step (+ grace) and the lease TTL. */
  leaseMarginMs: 30000,
  /**
   * Pinned calibration record (corrected after the PR85 review). Run
   * 39474927341 at b8b6113 (2026-10-20), ubuntu-24.04, FFmpeg 9.0.2 rebuilt
   * by the S2a recipe, env GLIBC_TUNABLES=glibc.malloc.arena_max=1, 3 runs
   * per command, each in a fresh work dir (normalization writes a fresh
   * output path every time), each reproducing the reference exactly, every
   * reference performing the intended operation; each step measured on
   * exactly the inputs that reach it. observedMax per step: [commands,
   * minimum address space MiB, CPU ms, wall ms]; peak RSS <= 26 MiB.
   * The derived limits are unchanged from the first record (run
   * 39452043759 at 95e777e), whose normalize rows reused one output path
   * with -n and so under-reported normalization (32 vs 48 MiB).
   * Diagnostic: s1 decode needs 192 MiB with the env, 768 MiB without.
   * Every later CI run re-measures and fails if any command needs more
   * than these committed limits (CHECK_COMMITTED).
   */
  calibration: Object.freeze({
    run: "https://github.com/DigitalBlueprint239/coach-core-ai/actions/" +
      "runs/39474927341",
    commit: "b8b611359fdfc64c034c0d06b0249707766a431b",
    decoder: Object.freeze({
      ffmpeg:
        "1314ab3b558c48ce7ed4aa6efba5a68fefe30362f796e59ef017b17424436ff1",
      ffprobe:
        "fd43ef9be4bb7d7fc821e1b25950efc6eb0aac586cabacd34a38fd52299f48e6",
    }),
    observedMax: Object.freeze({
      "probe-input": Object.freeze([34, 32, 14, 14]),
      "decode-input": Object.freeze([8, 192, 68, 38]),
      "normalize": Object.freeze([7, 48, 7, 7]),
      "probe-output": Object.freeze([14, 32, 7, 7]),
      "decode-output": Object.freeze([7, 192, 66, 38]),
    }),
    superseded: "https://github.com/DigitalBlueprint239/coach-core-ai/" +
      "actions/runs/39452043759",
  }),
});

/**
 * Longest single fenced interval: one step's wall limit plus kill grace.
 * @param {object} [limits]
 * @return {number}
 */
function longestStepMs(limits = WORKER_LIMITS) {
  return Math.max(...Object.values(limits.steps).map((s) => s.wallMs)) +
    limits.graceMs;
}

/**
 * Lease TTL actually used: explicit when set, else longest step + margin.
 * @param {object} [limits]
 * @return {number}
 */
function leaseTtlMs(limits = WORKER_LIMITS) {
  return limits.leaseTtlMs || longestStepMs(limits) + limits.leaseMarginMs;
}

/**
 * Structural validity of a limits object (preflight).
 * @param {object} limits
 * @return {?string} null when valid, else a reason
 */
function limitsProblem(limits) {
  if (!limits || typeof limits !== "object") return "limits-missing";
  if (limits.label !== "TEST_MEASURED") return "limits-unlabelled";
  const pos = (n) => Number.isSafeInteger(n) && n > 0;
  for (const step of ["probe-input", "decode-input", "normalize",
    "probe-output", "decode-output"]) {
    const s = limits.steps && limits.steps[step];
    if (!s) return `limits-missing-${step}`;
    for (const k of ["wallMs", "cpuSoftSeconds", "addressSpaceBytes",
      "fileSizeBytes", "maxCaptureBytes"]) {
      if (!pos(s[k])) return `limits-invalid-${step}-${k}`;
    }
  }
  if (!pos(limits.cpuHardMarginSeconds) || !pos(limits.graceMs) ||
      !pos(limits.openFiles) || !pos(limits.leaseMarginMs)) {
    return "limits-invalid-global";
  }
  if (leaseTtlMs(limits) < longestStepMs(limits) + limits.leaseMarginMs) {
    return "lease-ttl-below-step-deadline";
  }
  return null;
}

module.exports = {WORKER_LIMITS, longestStepMs, leaseTtlMs, limitsProblem};
