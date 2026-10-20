"use strict";
/**
 * Generates tests/fixtures/coach-film.v2/contract.schema.json and
 * SHA256SUMS.txt from functions/src/film/contract-v2.js (r4).
 * CONTRACT AUTHORING ONLY. The v1 generator (film-contract-schema.js) and the
 * v1 fixture tree are not touched.
 *
 *   node functions/scripts/film-contract-schema-v2.js          # write
 *   node functions/scripts/film-contract-schema-v2.js --check  # drift: exit 1
 *
 * JSON Schema cannot express the cross-field rules (R1–R9, T6', reason sets,
 * UTF-16 file-name bound); they live in x-coach-film and in the zod schemas.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {z} = require("zod");
const c = require("../src/film/contract-v2");
const {LIMITS} = require("../src/film/limits");

const DIR = path.join(__dirname, "..", "..", "tests", "fixtures",
    "coach-film.v2");

/** @return {string} */
function buildSchema() {
  const s = c.schemas;
  const doc = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "title": c.CONTRACT_VERSION,
    "x-coach-film": {
      contractVersion: c.CONTRACT_VERSION,
      revision: "r4",
      previousContractVersion: c.PREVIOUS_CONTRACT_VERSION,
      newFilmKeys: c.NEW_FILM_KEYS,
      filmKeys: c.FILM_KEYS,
      timestampFields: c.FILM_TIMESTAMP_FIELDS,
      s1RejectionReasons: c.S1_REJECTION_REASONS,
      workerRejectionReasons: c.WORKER_REJECTION_REASONS,
      errorCodes: c.ERROR_CODES,
      retryable: c.RETRYABLE,
      errorReasons: c.ERROR_REASONS,
      placeholderLimits: {
        maxBytes: LIMITS.maxBytes, maxDurationMs: LIMITS.maxDurationMs,
        maxWidth: LIMITS.maxWidth, maxHeight: LIMITS.maxHeight,
      },
      placeholderLimitsStatus: c.PENDING_LIMITS,
      retentionExpiresAt: "always null in r4 (D4 pending)",
      workerAttemptPolicy: c.WORKER_ATTEMPT_POLICY,
      classifiedLimitKills: c.CLASSIFIED_LIMIT_KILLS,
    },
    "$defs": {
      FilmState: z.toJSONSchema(s.filmState, {io: "input"}),
      Media: z.toJSONSchema(s.media, {io: "input"}),
      ReserveRequest: z.toJSONSchema(s.reserveRequest, {io: "input"}),
      AbandonRequest: z.toJSONSchema(s.abandonRequest, {io: "input"}),
      ReserveData: z.toJSONSchema(s.reserveData, {io: "input"}),
      AbandonData: z.toJSONSchema(s.abandonData, {io: "input"}),
      ErrorResponse: z.toJSONSchema(s.errorResponse, {io: "input"}),
    },
  };
  return JSON.stringify(doc, null, 2) + "\n";
}

/** @return {string} */
function buildSums() {
  return fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()
      .map((f) => `${crypto.createHash("sha256")
          .update(fs.readFileSync(path.join(DIR, f))).digest("hex")}  ${f}`)
      .join("\n") + "\n";
}

if (require.main === module) {
  const schemaPath = path.join(DIR, "contract.schema.json");
  if (process.argv.includes("--check")) {
    const ok = fs.existsSync(schemaPath) &&
      fs.readFileSync(schemaPath, "utf8") === buildSchema() &&
      fs.readFileSync(path.join(DIR, "SHA256SUMS.txt"), "utf8") ===
        buildSums();
    if (!ok) {
      console.error("coach-film.v2 schema or SHA256SUMS drifted");
      process.exit(1);
    }
    console.log("coach-film.v2 schema and SHA256SUMS up to date");
  } else {
    fs.writeFileSync(schemaPath, buildSchema());
    fs.writeFileSync(path.join(DIR, "SHA256SUMS.txt"), buildSums());
    console.log("wrote", schemaPath);
  }
}

module.exports = {buildSchema, buildSums, DIR};
