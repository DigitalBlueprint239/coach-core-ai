"use strict";
// FILM-S1 policy pins (FS-25): the PENDING_D3 / PENDING_D7 placeholders in
// limits.js, the literals in storage.rules, the terms registry and the deploy
// guard must agree, and the candidate must be visibly non-deployable while
// the founder terms are pending. No project, no emulator, no network.
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {spawnSync} = require("node:child_process");

const {LIMITS, PENDING} = require("../src/film/limits");
const {TERMS, pendingTerms, allTermsSettled} = require("../src/film/terms");

const repoRoot = path.resolve(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(repoRoot, p), "utf8");

describe("FS-25 placeholders are pinned together and visibly PENDING", () => {
  it("D3 and D7 are PENDING with no record link", () => {
    assert.equal(TERMS.D3.status, "PENDING");
    assert.equal(TERMS.D7.status, "PENDING");
    assert.equal(TERMS.D3.record, null);
    assert.equal(TERMS.D7.record, null);
    assert.equal(allTermsSettled(), false);
    assert.deepEqual(pendingTerms(), ["D3", "D7"]);
  });
  it("every PENDING_D3 / PENDING_D7 value in limits.js has a term in the registry", () => {
    for (const [k, tag] of Object.entries(PENDING)) {
      const m = /^PENDING_(D\d)$/.exec(tag);
      if (m) assert.ok(TERMS[m[1]], `${k} waits on ${m[1]}, which must be registered`);
    }
  });
  it("storage.rules carries the same byte limit and content type literals as limits.js", () => {
    const rules = read("storage.rules");
    assert.ok(rules.includes(`request.resource.size <= ${LIMITS.maxBytes}`),
        "byte limit literal mirrors LIMITS.maxBytes");
    assert.equal(LIMITS.allowedContentTypes.length, 1, "rule literal assumes one allowed type");
    assert.ok(rules.includes(`request.resource.contentType == '${LIMITS.allowedContentTypes[0]}'`),
        "content type literal mirrors LIMITS.allowedContentTypes");
    assert.ok(rules.includes("PENDING_D3"), "rules say the limit is a placeholder");
    assert.ok(rules.includes("match /quarantine/{teamId}/{filmId}/source.mp4"));
    assert.ok(rules.includes("reservationExpiresAt > request.time"));
    assert.ok(rules.includes("allow read, update, delete: if false;"));
  });
  it("firestore.rules makes film documents owner-readable and client-unwritable; no rules for ledger or operations", () => {
    const rules = read("firestore.rules");
    assert.ok(rules.includes("match /teams/{teamId}/films/{filmId}"));
    assert.ok(/films\/\{filmId\} \{\s*allow get, list: if isBetaUser\(\) && ownsTeam\(teamId\);\s*allow create, update, delete: if false;/.test(rules));
    assert.ok(!/match [^\n]*filmLedger/.test(rules), "ledger has no client rule");
    assert.ok(!/match [^\n]*filmOperations/.test(rules), "operations have no client rule");
  });
  it("the deploy guard exits non-zero while terms are pending and is wired as the functions predeploy hook", () => {
    const script = path.join(repoRoot, "functions", "scripts", "film-terms-guard.js");
    const r = spawnSync(process.execPath, [script], {encoding: "utf8"});
    assert.equal(r.status, 1);
    assert.ok(r.stderr.includes("DEPLOY BLOCKED"));
    assert.ok(r.stderr.includes("D3, D7"));
    const check = spawnSync(process.execPath, [script, "--check"], {encoding: "utf8"});
    assert.equal(check.status, 0);
    const firebaseJson = JSON.parse(read("firebase.json"));
    assert.deepEqual(firebaseJson.functions.predeploy,
        ["node \"$RESOURCE_DIR/scripts/film-terms-guard.js\""]);
    assert.equal(firebaseJson.functions.source, "functions");
    assert.deepEqual(Object.keys(firebaseJson).sort(),
        ["emulators", "firestore", "functions", "hosting", "storage"]);
  });
  it("the published fixtures carry the placeholder values, not approved ones", () => {
    const dir = path.join(repoRoot, "tests", "fixtures", "coach-film.v1");
    const atLimit = JSON.parse(fs.readFileSync(path.join(dir, "reserve.request.at-byte-limit.json"), "utf8"));
    assert.equal(atLimit.payload.declaredBytes, LIMITS.maxBytes);
    const valid = JSON.parse(fs.readFileSync(path.join(dir, "reserve.request.valid.json"), "utf8"));
    assert.ok(LIMITS.acceptedRightsWordingVersions.includes(valid.payload.rightsWordingVersion));
    assert.equal(PENDING.acceptedRightsWordingVersions, "PENDING_D7");
    assert.equal(PENDING.maxBytes, "PENDING_D3");
  });
});
