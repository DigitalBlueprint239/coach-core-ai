"use strict";
/**
 * FILM-S2b worker resource limits (TEST ONLY).
 *
 * Every value here is measured, never assumed: the calibration in
 * functions/scripts/film-worker-calibrate.py runs every pipeline step over
 * every frozen and S2b fixture three times on the PINNED decoder in CI, and
 * the limits are derived as max(observed) x 3 with the stated floors
 * (statement r2, package §4.2). They are labelled TEST_MEASURED: they are not
 * deploy values and approve nothing.
 *
 * `status` is PROVISIONAL until the pinned calibration table below is filled
 * in from a CI run; preflight refuses to run the decoder while it is.
 */

/** Per-step limits for the bounded decoder subprocess stages. */
const STEP_LIMITS = Object.freeze({
  "probe-input": Object.freeze({
    wallMs: 30000, cpuSoftSeconds: 10, addressSpaceBytes: 1024 * 1024 ** 2,
    fileSizeBytes: 1024 * 1024, maxCaptureBytes: 32 * 1024 ** 2}),
  "decode-input": Object.freeze({
    wallMs: 120000, cpuSoftSeconds: 60, addressSpaceBytes: 1024 * 1024 ** 2,
    fileSizeBytes: 1024 * 1024, maxCaptureBytes: 1024 * 1024}),
  "normalize": Object.freeze({
    wallMs: 60000, cpuSoftSeconds: 30, addressSpaceBytes: 1024 * 1024 ** 2,
    fileSizeBytes: 110 * 1000 * 1000, maxCaptureBytes: 1024 * 1024}),
  "probe-output": Object.freeze({
    wallMs: 30000, cpuSoftSeconds: 10, addressSpaceBytes: 1024 * 1024 ** 2,
    fileSizeBytes: 1024 * 1024, maxCaptureBytes: 32 * 1024 ** 2}),
  "decode-output": Object.freeze({
    wallMs: 120000, cpuSoftSeconds: 60, addressSpaceBytes: 1024 * 1024 ** 2,
    fileSizeBytes: 1024 * 1024, maxCaptureBytes: 1024 * 1024}),
});

const WORKER_LIMITS = Object.freeze({
  status: "PROVISIONAL",
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
  calibration: Object.freeze({run: null, decoder: null, table: null}),
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
