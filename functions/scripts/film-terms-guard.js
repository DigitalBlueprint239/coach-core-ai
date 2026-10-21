#!/usr/bin/env node
"use strict";
// Lifted from claude/film-s1-backend-b @ d052244 (review session), R1.
/**
 * Deploy guard for the Film Analyzer (FILM-S1).
 *
 * Wired as a `functions.predeploy` hook in firebase.json. It exits non-zero
 * while any founder term the film code depends on (D3 limits, D7 rights
 * wording) is still a PENDING placeholder, so `firebase deploy` of this
 * candidate fails loudly instead of shipping unapproved limits or wording.
 *
 * This guard is a safety net, not an approval mechanism: flipping TERMS to
 * SETTLED requires the settled record link in functions/src/film/terms.js
 * and a repeat of the policy-dependent checks
 * (docs/film/FILM_S1_BACKEND.md).
 *
 * Usage: node functions/scripts/film-terms-guard.js [--check]
 *   --check  print status and exit 0 even when pending (for CI/doc tooling)
 */
const path = require("node:path");

const {TERMS, pendingTerms} = require(
    path.join(__dirname, "..", "src", "film", "terms.js"));

// FILM-S1-C1: the quarantine cleanup sweep is TEST_ONLY. Deploy is blocked
// unconditionally (also with --check), independent of terms.js, if
// functions/index.js references the sweep OR if any LOADED export carries a
// TEST_ONLY film marker. Failing to load the exports also blocks (fails
// closed). Only a separate owner authorization (C1-D1) can lift this.
{
  const fs = require("node:fs");
  const {spawnSync} = require("node:child_process");
  const fnDir = path.join(__dirname, "..");
  const block = (why) => {
    process.stderr.write(`\nDEPLOY BLOCKED: film cleanup sweep is TEST_ONLY` +
      ` (${why}).\n`);
    process.exit(1);
  };
  const src = fs.readFileSync(path.join(fnDir, "index.js"), "utf8");
  if (/defineCleanupSweepTrigger|retryPendingFilmCleanups/.test(src)) {
    block("referenced by functions/index.js");
  }
  // LFS-A: the quarantine reconciler and the emulator-only operator tool are
  // TEST_ONLY too (same loaded-exports marker check below).
  const lfs = new RegExp(["defineReconcileTrigger", "reconcileQuarantine",
    "createQuarantineReconciler", "film-cleanup-admin"].join("|"));
  if (lfs.test(src)) {
    block("LFS reconciler/operator referenced by functions/index.js");
  }
  const probe = spawnSync(process.execPath, ["-e",
    "const {testOnlyExportProblem}=require('./src/film/cleanup');" +
    "const p=testOnlyExportProblem(require('./index.js'));" +
    "process.stdout.write('\\n@@'+JSON.stringify({problem:p}));" +
    "process.exit(0);"], {cwd: fnDir, encoding: "utf8", timeout: 120000,
    env: {...process.env,
      GCLOUD_PROJECT: process.env.GCLOUD_PROJECT || "demo-film-guard"}});
  const out = (probe.stdout || "").split("\n@@").pop();
  let verdict = null;
  try {
    verdict = probe.status === 0 ? JSON.parse(out) : null;
  } catch (_) {
    verdict = null;
  }
  if (!verdict) block("loaded exports could not be verified");
  if (verdict.problem) block(`exported: ${verdict.problem}`);
}

// FILM-S2b: the validation worker is a TEST_ONLY component. Exporting it
// from functions/index.js blocks deploy unconditionally (also with --check),
// independent of terms.js; only a separate owner authorization that changes
// functions/src/film/worker/designation.js can lift this.
const fs = require("node:fs");
const {workerExportProblem, WORKER_DESIGNATION} = require(
    path.join(__dirname, "..", "src", "film", "worker", "designation.js"));
const workerProblem = workerExportProblem(fs.readFileSync(
    path.join(__dirname, "..", "index.js"), "utf8"));
if (workerProblem) {
  process.stderr.write("\nDEPLOY BLOCKED: film worker is " +
    `${WORKER_DESIGNATION.designation} (${workerProblem}).\n`);
  process.exit(1);
}

const pending = pendingTerms();
const checkOnly = process.argv.includes("--check");

if (pending.length === 0) {
  process.stdout.write("film-terms-guard: all film terms SETTLED " +
    JSON.stringify(TERMS) + "\n");
  process.exit(0);
}

const msg = [
  "",
  "=================== DEPLOY BLOCKED: FILM TERMS PENDING ===================",
  `Pending founder terms: ${pending.join(", ")}`,
  "functions/src/film/limits.js still carries PENDING_D3 / PENDING_D7 test",
  "placeholders. They are NOT approved limits or approved rights wording.",
  "Attach Coach Drew's settled D1-D9 record, replace the placeholders, mark",
  "the terms SETTLED in functions/src/film/terms.js and rerun the checks in",
  "docs/film/FILM_S1_BACKEND.md before any deploy.",
  "==========================================================================",
  "",
].join("\n");

process.stderr.write(msg);
process.exit(checkOnly ? 0 : 1);
