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
