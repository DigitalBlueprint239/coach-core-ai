"use strict";
// FILM-S2b deploy blocks and static guarantees (package §5 B4, C10, E22):
// the worker is not exported; the predeploy guard blocks an export while
// TEST_ONLY regardless of terms.js; platform retry is OFF; no unlimited
// decoder runs; every delete is generation-matched. No network, no project.
const {describe, it, before} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {spawnSync} = require("child_process");
const c2 = require("../src/film/contract-v2");
const {WORKER_DESIGNATION, workerExportProblem} =
  require("../src/film/worker/designation");
const {defineWorkerTrigger, WORKER_TRIGGER_DOCUMENT} =
  require("../src/film/worker/trigger");

const ROOT = path.join(__dirname, "..");
const WORKER_DIR = path.join(ROOT, "src", "film", "worker");
const workerSources = () => fs.readdirSync(WORKER_DIR)
    .filter((f) => f.endsWith(".js"))
    .map((f) => [f, fs.readFileSync(path.join(WORKER_DIR, f), "utf8")]);

let fns;
before(() => {
  process.env.GCLOUD_PROJECT = "demo-coach-core-beta";
  fns = require("../index");
});

describe("FILM-S2b worker is TEST_ONLY and unexported", () => {
  it("designation is TEST_ONLY with no deploy authorization record", () => {
    assert.equal(WORKER_DESIGNATION.designation, "TEST_ONLY");
    assert.equal(WORKER_DESIGNATION.authorizationRecord, null);
  });
  it("functions/index.js exports no film-worker trigger", () => {
    for (const [name, fn] of Object.entries(fns)) {
      const ep = (fn && fn.__endpoint) || {};
      const et = ep.eventTrigger || {};
      const doc = (et.eventFilters && et.eventFilters.document) ||
        (et.eventFilterPathPatterns && et.eventFilterPathPatterns.document);
      assert.notEqual(doc, WORKER_TRIGGER_DOCUMENT, `${name} is the worker`);
      assert.ok(!/worker/i.test(name), `${name} looks like a worker export`);
    }
    const src = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.equal(workerExportProblem(src), null);
  });
  it("the trigger definition has platform retry OFF", () => {
    const t = defineWorkerTrigger({onFilmWritten: async () => ({})});
    const et = t.__endpoint.eventTrigger;
    assert.equal(et.retry, false);
    assert.equal(c2.WORKER_ATTEMPT_POLICY.platformRetry, false);
  });
  it("predeploy guard exits 1 if index.js exports the worker, regardless " +
      "of terms (and with --check)", () => {
    // INT-A: the composed guard also runs the C1/LFS loaded-exports probe,
    // which must resolve src/film/** and the package's node_modules
    const dir = fs.mkdtempSync(path.join(ROOT, ".guard-"));
    fs.cpSync(path.join(ROOT, "src/film"), path.join(dir, "src/film"),
        {recursive: true});
    const copy = (rel) => {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), {recursive: true});
      fs.copyFileSync(path.join(ROOT, rel), path.join(dir, rel));
    };
    copy("scripts/film-terms-guard.js");
    copy("src/film/terms.js");
    copy("src/film/worker/designation.js");
    // terms marked SETTLED in the sandbox: the worker block must still hold
    fs.writeFileSync(path.join(dir, "src/film/terms.js"),
        "module.exports={TERMS:{},pendingTerms:()=>[]," +
        "allTermsSettled:()=>true};\n");
    fs.writeFileSync(path.join(dir, "index.js"),
        "exports.filmWorker = require('./src/film/worker/trigger');\n");
    for (const args of [[], ["--check"]]) {
      const r = spawnSync(process.execPath,
          [path.join(dir, "scripts/film-terms-guard.js"), ...args],
          {encoding: "utf8"});
      assert.equal(r.status, 1, r.stderr);
      assert.match(r.stderr, /film worker is TEST_ONLY/);
    }
    fs.writeFileSync(path.join(dir, "index.js"), "exports.ok = 1;\n");
    const ok = spawnSync(process.execPath,
        [path.join(dir, "scripts/film-terms-guard.js")], {encoding: "utf8"});
    assert.equal(ok.status, 0, ok.stderr);
    fs.rmSync(dir, {recursive: true, force: true});
  });
});

describe("static guarantees over worker sources", () => {
  it("no allowNoLimits anywhere in worker code (fail closed)", () => {
    for (const [f, src] of workerSources()) {
      assert.ok(!/allowNoLimits\s*:/.test(src), f);
    }
  });
  it("every object delete is generation-matched (no name-only delete)",
      () => {
        for (const [f, src] of workerSources()) {
          const deletes = src.match(/\.delete\([^)]*\)/g) || [];
          for (const d of deletes) {
            assert.match(d, /ifGenerationMatch/, `${f}: ${d}`);
          }
        }
      });
  it("uploads are create-only (ifGenerationMatch: 0)", () => {
    const src = fs.readFileSync(path.join(WORKER_DIR, "objects.js"), "utf8");
    assert.match(src, /preconditionOpts: \{ifGenerationMatch: 0\}/);
  });
  it("the pipeline disables external data references and network " +
      "protocols on every decoder input", () => {
    const src = fs.readFileSync(path.join(WORKER_DIR, "media.js"), "utf8");
    assert.match(src, /"-protocol_whitelist", "file", "-enable_drefs", "0"/);
  });
});
