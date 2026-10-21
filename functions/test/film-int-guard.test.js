"use strict";
// FILM-INT-A CT-3 (r3 section 6): the COMPOSED predeploy guard
// (scripts/film-terms-guard.js = A5 worker block first, then the A7 C1/LFS
// block, both byte-identical to their accepted sides). Each case runs in a
// sandbox under functions/ (so the C1/LFS loaded-exports probe resolves
// src/film/** and node_modules), with and without --check, and RECORDS which
// mechanism caught it:
//   - worker:        source regex (designation.js workerExportProblem) only;
//                    no loaded-exports marker exists (I-4 stays OPEN);
//   - sweep, LFS:    source regex AND the loaded-exports __filmTestOnly
//                    marker;
//   - a disguised worker export passes the guard (I-4) and is caught only by
//     the runtime wiring check (the accepted S2b wiring test's method).
// No claim that all three components carry loaded markers. TEST ONLY.
const {describe, it, after} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {spawnSync} = require("child_process");

const ROOT = path.join(__dirname, "..");
const dirs = [];
after(() => {
  for (const d of dirs) fs.rmSync(d, {recursive: true, force: true});
});

/**
 * Sandbox: guard + src/film (+ settled terms) + the given index.js.
 * @param {string} indexSource
 * @param {{dropCleanup: boolean}} [o]
 * @return {string} dir
 */
function sandbox(indexSource, o = {}) {
  const dir = fs.mkdtempSync(path.join(ROOT, ".guard-int-"));
  dirs.push(dir);
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.copyFileSync(path.join(ROOT, "scripts/film-terms-guard.js"),
      path.join(dir, "scripts/film-terms-guard.js"));
  fs.cpSync(path.join(ROOT, "src/film"), path.join(dir, "src/film"),
      {recursive: true});
  // terms SETTLED in the sandbox: only the TEST_ONLY blocks can refuse
  fs.writeFileSync(path.join(dir, "src/film/terms.js"),
      "module.exports={TERMS:{},pendingTerms:()=>[]," +
      "allTermsSettled:()=>true};\n");
  if (o.dropCleanup) fs.rmSync(path.join(dir, "src/film/cleanup.js"));
  fs.writeFileSync(path.join(dir, "index.js"), indexSource);
  return dir;
}
const guard = (dir, args) => spawnSync(process.execPath,
    [path.join(dir, "scripts/film-terms-guard.js"), ...args],
    {encoding: "utf8", env: {...process.env,
      GCLOUD_PROJECT: "demo-film-guard"}});
const both = (dir) => [[], ["--check"]].map((a) => guard(dir, a));

const CASES = [
  {name: "clean index", src: "exports.ok = 1;\n", status: 0, by: null},
  {name: "worker referenced", src:
    "exports.w = require('./src/film/worker/trigger');\n", status: 1,
  by: /film worker is TEST_ONLY \(worker-referenced-from-index\)/},
  {name: "sweep referenced", src: "const c = require('./src/film/cleanup');" +
    "\nexports.s = c.defineCleanupSweepTrigger;\n", status: 1,
  by: /film cleanup sweep is TEST_ONLY \(referenced by functions\/index/},
  {name: "reconciler referenced", src: "const r = require(" +
    "'./src/film/reconcile');\nexports.r = r.defineReconcileTrigger;\n",
  status: 1, by: /LFS reconciler\/operator referenced/},
  {name: "DISGUISED reconciler (no source match; loaded marker)", src:
    "const r = require('./src/film/' + 'recon' + 'cile');\n" +
    "exports.innocuous = r['define' + 'Reconcile' + 'Trigger']({" +
    "run: async () => {}, isEnabled: () => false});\n", status: 1,
  by: /exported: innocuous=film-lfs-reconciler/},
  {name: "missing cleanup dependency (clean index) fails closed", src:
    "exports.ok = 1;\n", dropCleanup: true, status: 1,
  by: /loaded exports could not be verified/},
];

describe("CT-3 composed predeploy guard: each block and its mechanism",
    () => {
      for (const c of CASES) {
        it(`${c.name}: exit ${c.status} with and without --check`, () => {
          const dir = sandbox(c.src, {dropCleanup: c.dropCleanup});
          for (const r of both(dir)) {
            assert.equal(r.status, c.status, r.stderr);
            if (c.by) assert.match(r.stderr, c.by);
          }
        });
      }
      it("DISGUISED worker export: the guard does NOT catch it (I-4 stays " +
          "open: source regex only, no loaded marker); the runtime wiring " +
          "check (eventFilters.document) does", () => {
        const src = "const t = require('./src/film/' + 'wor' + 'ker/' +" +
          " 'trigger');\nexports.innocuous = t['define' + 'Worker' + " +
          "'Trigger']({['onFilm' + 'Written']: async () => ({})});\n";
        const dir = sandbox(src);
        for (const r of both(dir)) {
          assert.equal(r.status, 0, "guard misses the disguised worker");
        }
        const fns = require(path.join(dir, "index.js"));
        const {WORKER_TRIGGER_DOCUMENT} =
          require("../src/film/worker/trigger");
        const caught = Object.entries(fns).filter(([, fn]) => {
          const et = ((fn && fn.__endpoint) || {}).eventTrigger || {};
          const doc = (et.eventFilters && et.eventFilters.document) ||
            (et.eventFilterPathPatterns &&
              et.eventFilterPathPatterns.document);
          return doc === WORKER_TRIGGER_DOCUMENT;
        }).map(([n]) => n);
        assert.deepEqual(caught, ["innocuous"],
            "caught by the runtime wiring check");
      });
      it("ordering: a worker reference is reported by the worker block " +
          "even when the C1/LFS dependency is missing", () => {
        const dir = sandbox("exports.w = require('./src/film/worker/" +
          "trigger');\n", {dropCleanup: true});
        for (const r of both(dir)) {
          assert.equal(r.status, 1);
          assert.match(r.stderr, /film worker is TEST_ONLY/);
        }
      });
    });
