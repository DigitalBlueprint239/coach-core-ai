"use strict";
/**
 * Generates tests/fixtures/coach-film.v1/contract.schema.json and
 * SHA256SUMS.txt from functions/src/film/contract.js.
 *
 *   node functions/scripts/film-contract-schema.js          # write
 *   node functions/scripts/film-contract-schema.js --check  # exit 1 on drift
 *
 * JSON Schema cannot express the cross-field rules (retryable == table,
 * reason within code, canonical timestamp round-trip); those are stated in
 * x-coach-film and in the contract doc, and enforced by the zod schemas.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {z} = require("zod");
const c = require("../src/film/contract");
const {LIMITS, PENDING, PLACEHOLDER_STATUS} = require("../src/film/limits");

const DIR = path.join(__dirname, "..", "..", "tests", "fixtures",
    "coach-film.v1");

/** @return {string} */
function buildSchema() {
  const s = c.schemas;
  const doc = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "title": c.CONTRACT_VERSION,
    "x-coach-film": {
      contractVersion: c.CONTRACT_VERSION,
      actions: c.ACTION_NAMES,
      filmStatuses: c.FILM_STATUSES,
      slotHoldingStatuses: c.SLOT_HOLDING_STATUSES,
      terminalStatuses: c.TERMINAL_STATUSES,
      transitions: c.TRANSITIONS,
      rejectionReasons: c.REJECTION_REASONS,
      timestampFields: c.FILM_TIMESTAMP_FIELDS,
      timestampEncoding: "ISO 8601 UTC, exactly 3 fractional digits, 'Z'",
      generationEncoding: "decimal string",
      errorCodes: c.ERROR_CODES,
      retryable: c.RETRYABLE,
      errorReasons: c.ERROR_REASONS,
      clientOnlyReasons: c.CLIENT_ONLY_REASONS,
      uploadPathTemplate: "quarantine/{teamId}/{filmId}/source.mp4",
      limits: LIMITS,
      limitsStatus: PENDING,
      placeholderStatus: PLACEHOLDER_STATUS,
    },
    "$defs": {
      FilmState: z.toJSONSchema(s.filmState, {io: "input"}),
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
  const files = fs.readdirSync(DIR)
      .filter((f) => f.endsWith(".json")).sort();
  return files.map((f) => {
    const h = crypto.createHash("sha256")
        .update(fs.readFileSync(path.join(DIR, f))).digest("hex");
    return `${h}  ${f}`;
  }).join("\n") + "\n";
}

if (require.main === module) {
  const check = process.argv.includes("--check");
  const schemaPath = path.join(DIR, "contract.schema.json");
  const schema = buildSchema();
  if (check) {
    const ok = fs.existsSync(schemaPath) &&
      fs.readFileSync(schemaPath, "utf8") === schema &&
      fs.readFileSync(path.join(DIR, "SHA256SUMS.txt"), "utf8") ===
        buildSums();
    if (!ok) {
      console.error("coach-film.v1 schema or SHA256SUMS drifted");
      process.exit(1);
    }
    console.log("coach-film.v1 schema and SHA256SUMS up to date");
  } else {
    fs.writeFileSync(schemaPath, schema);
    fs.writeFileSync(path.join(DIR, "SHA256SUMS.txt"), buildSums());
    console.log("wrote", schemaPath);
  }
}

module.exports = {buildSchema, buildSums, DIR};
