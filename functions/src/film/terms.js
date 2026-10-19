"use strict";
/**
// Lifted from claude/film-s1-backend-b @ d052244 (review session), R1.
 * Founder-term registry for the Film Analyzer (FILM-S1).
 *
 * `limits.js` holds the VALUES (test placeholders tagged PENDING_D3 /
 * PENDING_D7). This file holds the STATUS of the founder terms those values
 * wait on, so the deploy guard (functions/scripts/film-terms-guard.js) can
 * block `firebase deploy` until the settled D1–D9 record is attached.
 *
 * To settle a term: attach the record link here, set status to "SETTLED",
 * replace the placeholder values in limits.js and storage.rules, and rerun the
 * policy-dependent checks listed in docs/film/FILM_S1_BACKEND.md.
 * Changing this file alone does not change any limit.
 */

const TERMS = Object.freeze({
  // D3: format, size, duration, resolution, per-team cap (gap G3).
  D3: Object.freeze({status: "PENDING", record: null}),
  // D7: rights / consent wording and version (gap G7).
  D7: Object.freeze({status: "PENDING", record: null}),
});

/**
 * @return {string[]} names of terms that are not SETTLED
 */
function pendingTerms() {
  return Object.entries(TERMS)
      .filter(([, t]) => t.status !== "SETTLED")
      .map(([name]) => name);
}

/**
 * @return {boolean}
 */
function allTermsSettled() {
  return pendingTerms().length === 0;
}

module.exports = {TERMS, pendingTerms, allTermsSettled};
