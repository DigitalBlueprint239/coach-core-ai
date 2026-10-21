"use strict";
/**
 * FILM-S2b worker designation. The worker is a TEST-ONLY component: it is
 * not exported from functions/index.js, its switch defaults OFF, and the
 * predeploy guard (functions/scripts/film-terms-guard.js) exits 1 if
 * index.js ever exports it while this designation is TEST_ONLY, regardless
 * of terms.js. Changing the designation needs its own explicit owner
 * authorization, recorded as a link here (statement r2, #39 c-6294022891).
 */
const WORKER_DESIGNATION = Object.freeze({
  designation: "TEST_ONLY",
  authorizationRecord: null,
  implementationAuthorization:
    "https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6294079240",
});

/** Environment switch; anything but the exact string "true" is OFF. */
const WORKER_SWITCH = "COACH_CORE_FILM_WORKER_ENABLED";

/**
 * @param {object} [env]
 * @return {boolean}
 */
function workerEnabled(env = process.env) {
  return env[WORKER_SWITCH] === "true";
}

/**
 * Deploy-block check used by the predeploy guard: while TEST_ONLY, the
 * functions entry point must not reference the worker at all.
 * @param {string} indexSource contents of functions/index.js
 * @param {object} [designation]
 * @return {?string} problem, or null
 */
function workerExportProblem(indexSource, designation = WORKER_DESIGNATION) {
  if (designation.designation !== "TEST_ONLY") return null;
  return /src\/film\/worker|film-worker|onFilmWritten|defineWorkerTrigger/
      .test(String(indexSource)) ? "worker-referenced-from-index" : null;
}

module.exports = {WORKER_DESIGNATION, WORKER_SWITCH, workerEnabled,
  workerExportProblem};
