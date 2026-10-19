#!/usr/bin/env node
// Coach Core merge eligibility — the aggregate release check (2026-10-17; repaired 2026-10-18 after the
// independent review of dbf7a9a, findings F1–F4).
//
// One check that is SUCCESSFUL only when the complete required acceptance validation finished
// successfully on the exact candidate commit. It never widens, filters or re-runs anything: it reads
// what the 12 E2E jobs produced and decides. Every input it trusts is first authenticated (complete
// inventory coverage) and validated (schema); anything missing, malformed or inconsistent is a reason,
// and any reason makes the verdict INELIGIBLE with a nonzero exit.
//
//   evaluate(input) -> { eligible, reasons, rows }        (pure; unit-tested with fixtures)
//   CLI: node merge-eligibility.mjs --sha <sha> --head-sha <sha> --event <name> --run-id <id>
//        --attempt <n> --artifacts <dir> --e2e <dir> --out <dir> [--expected-repeat 1]
//
// Rules (fail closed — any reason makes the verdict INELIGIBLE):
//   R1  event must be pull_request or merge_group; workflow_dispatch / push can never satisfy the gate
//   R2  every expected job (4 projects x 3 buckets) must exist exactly once with conclusion "success"
//       for the ACCEPTANCE bucket; diagnostic/obsolete-fault-model jobs must have COMPLETED
//       (not cancelled / skipped / missing / in progress) — their test failures stay visible but do not
//       block, because they are classified out of acceptance (B11, approved). A non-required job that
//       concluded "success" while its own last-run record says tests failed is inconsistent evidence.
//   R3  every expected job's evidence artifact must exist, carry UPLOAD_OK, and its INVENTORY.sha256
//       must be well-formed, in-artifact, duplicate-free and COMPLETE: every retained file under
//       ci-evidence/ and test-results/ (hidden files included) is listed except the documented
//       self-exclusions (ci-evidence/INVENTORY.sha256, ci-evidence/UPLOAD_OK); every listed file exists
//       as a regular file inside the artifact and its digest matches; symlinks, traversal, absolute or
//       non-canonical paths and unexpected top-level entries are rejected; the files the gate decides
//       on (run.context, run.log, run.exit, results.json, .last-run.json) must be present and listed.
//       Matching a subset of files never authenticates the rest (F2).
//   R4  each artifact's run.context must bind to THIS sha, THIS run id and THIS attempt, the right
//       project/bucket, an empty dispatch grep and the expected repeat count
//   R5  selection completeness: identities in results.json (Playwright's stable test id) must equal the
//       source-derived membership of that project+bucket (playwright --list on the candidate) as a STRICT
//       multiset — no missing, no extra, no duplicate, no test row of another project (F3). Acceptance
//       membership must be non-empty for every project (F1). Zero executions are accepted ONLY when the
//       membership is itself empty (phone diagnostic/obsolete) AND results.json contains no test row of
//       any project AND the last-run record is a clean pass.
//   R6  outcomes: every expected identity must have COMPLETED results (results.length == repeat, each
//       passed/failed/timedOut) in every bucket — skipped, interrupted or absent results are not
//       coverage (F3); acceptance additionally requires every test "expected" and every result "passed";
//       results.json must be schema-valid with errors[] empty and stats agreeing with per-test outcomes;
//       .last-run.json must be a parsed, schema-valid record whose status and failedTests reconcile with
//       results.json (Playwright's own failedTests rule) and with the job conclusion (F4); acceptance
//       requires status "passed" and no failedTests
//   R7  the aggregate refuses to conclude when any input could not be gathered — collector spawn error,
//       nonzero exit, invalid/erroring list report, bucket partition mismatch, empty acceptance
//       membership, unreadable artifact, jobs API failure (F1) — and never runs on a cancelled run
//       (workflow if: !cancelled())
import { readFileSync, readdirSync, existsSync, lstatSync, realpathSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, posix, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const PROJECTS = ['chromium', 'firefox', 'phone-chromium', 'phone-firefox'];
export const BUCKETS = ['acceptance', 'diagnostic', 'obsolete-fault-model'];
export const TRUSTED_EVENTS = ['pull_request', 'merge_group'];
export const CHECK_NAME = 'Coach Core merge eligibility';
export const jobName = (bucket, project) => `E2E ${bucket} (${project})`;
export const artifactName = (bucket, project, sha) => `e2e-results-${bucket}-${project}-${sha}`;
// Artifact layout: upload-artifact of e2e/test-results + e2e/ci-evidence (common root e2e/), so the
// downloaded artifact holds ci-evidence/ and test-results/; inventory paths carry the e2e/ prefix.
export const ARTIFACT_ROOTS = ['ci-evidence', 'test-results'];
export const INVENTORY_PREFIX = 'e2e/';
export const INVENTORY_SELF_EXCLUSIONS = new Set(['ci-evidence/INVENTORY.sha256', 'ci-evidence/UPLOAD_OK']);
export const REQUIRED_EVIDENCE_FILES = ['ci-evidence/run.context', 'ci-evidence/run.log', 'ci-evidence/run.exit', 'test-results/results.json', 'test-results/.last-run.json'];
const COMPLETED_RESULT_STATUSES = new Set(['passed', 'failed', 'timedOut']);
const RESULT_STATUSES = new Set(['passed', 'failed', 'timedOut', 'skipped', 'interrupted']);
const TEST_STATUSES = new Set(['expected', 'unexpected', 'flaky', 'skipped']);
const LAST_RUN_STATUSES = new Set(['passed', 'failed', 'timedout', 'interrupted']);

// A test's identity is Playwright's stable test id (spec.id: file + title path + project; identical in
// `--list` and in a run of the same config, and what .last-run.json failedTests reference). The label
// (file:line:column title) is only used to make reasons readable.
export const specLabel = (spec) => `${spec.file}:${spec.line}:${spec.column} ${spec.title}`;
export function walkSpecs(report, project) {
  const out = [];
  const walk = (s) => {
    for (const sp of s.specs || []) for (const t of sp.tests || []) if (!project || t.projectName === project) out.push({ id: typeof sp.id === 'string' && sp.id ? sp.id : null, label: specLabel(sp), project: t.projectName, test: t });
    for (const c of s.suites || []) walk(c);
  };
  for (const s of report.suites || []) walk(s);
  return out;
}
// Schema check for a Playwright JSON report (1.64 shape). Returns a problem string or null.
export function validateResultsShape(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) return 'results.json is not an object';
  if (!Array.isArray(report.suites)) return 'results.json has no suites[]';
  if (!Array.isArray(report.errors)) return 'results.json has no errors[]';
  if (!report.stats || typeof report.stats !== 'object') return 'results.json has no stats';
  for (const k of ['expected', 'unexpected', 'skipped', 'flaky']) if (!Number.isInteger(report.stats[k]) || report.stats[k] < 0) return `results.json stats.${k} is not a non-negative integer`;
  let problem = null;
  const walk = (s, depth) => {
    if (problem) return;
    if (depth > 50) { problem = 'results.json suites nest too deeply'; return; }
    for (const sp of s.specs || []) {
      if (typeof sp.id !== 'string' || !sp.id) { problem = `spec "${sp && sp.title}" has no stable id`; return; }
      if (typeof sp.file !== 'string' || !Number.isInteger(sp.line) || !Number.isInteger(sp.column) || typeof sp.title !== 'string') { problem = `spec ${sp.id} has no file/line/column/title`; return; }
      if (!Array.isArray(sp.tests) || sp.tests.length === 0) { problem = `spec ${sp.id} has no tests[]`; return; }
      for (const t of sp.tests) {
        if (typeof t.projectName !== 'string' || !t.projectName) { problem = `spec ${sp.id} has a test without projectName`; return; }
        if (!TEST_STATUSES.has(t.status)) { problem = `spec ${sp.id} has test status "${t.status}"`; return; }
        if (!Array.isArray(t.results)) { problem = `spec ${sp.id} has no results[]`; return; }
        for (const r of t.results) if (!r || !RESULT_STATUSES.has(r.status)) { problem = `spec ${sp.id} has a result with status "${r && r.status}"`; return; }
      }
    }
    for (const c of s.suites || []) walk(c, depth + 1);
  };
  for (const s of report.suites) walk(s, 0);
  return problem;
}
export function validateLastRunShape(rec) {
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return '.last-run.json is not an object';
  if (!LAST_RUN_STATUSES.has(rec.status)) return `.last-run.json status "${rec.status}" is not one of ${[...LAST_RUN_STATUSES].join('/')}`;
  if (!Array.isArray(rec.failedTests) || rec.failedTests.some((x) => typeof x !== 'string' || !x)) return '.last-run.json failedTests is not an array of test ids';
  if (new Set(rec.failedTests).size !== rec.failedTests.length) return '.last-run.json failedTests contains duplicates';
  return null;
}
// Playwright 1.64's own rule for .last-run.json failedTests (runner/lastRun.ts): tests that are not ok
// (unexpected) plus tests that did not run (skipped without an interrupted result, unless expected to skip).
export const didNotRun = (t) => t.status === 'skipped' && !(t.results || []).some((r) => r.status === 'interrupted') && (!(t.results || []).length || t.expectedStatus !== 'skipped');
export const isFailedForLastRun = (t) => t.status === 'unexpected' || didNotRun(t);

export const parseContext = (text) => Object.fromEntries(
  String(text).split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);

// Pure decision. `input`:
//   sha, headSha, event, runId, attempt, expectedRepeat (default 1)
//   jobs: [{ name, status, conclusion }]           (GitHub Actions jobs of THIS run attempt)
//   membership: { [project]: { [bucket]: { ids: [testId...], labels: { [testId]: label } } | [testId...] } }
//   artifacts: { [artifactName]: { uploadOk, inventoryOk: true|string, context, results, resultsProblem,
//                                  lastRun, lastRunProblem } }      (as produced by readArtifactDir)
export function evaluate(input) {
  const reasons = [];
  const rows = [];
  const repeat = Number(input.expectedRepeat ?? 1);
  const fail = (r) => reasons.push(r);

  if (!TRUSTED_EVENTS.includes(input.event)) fail(`R1 event "${input.event}" is not a trusted merge event (${TRUSTED_EVENTS.join('/')}); bounded or manual runs cannot satisfy the release gate`);
  if (!/^[0-9a-f]{40}$/.test(input.sha || '')) fail(`R4 candidate sha is not a full 40-hex commit: "${input.sha}"`);
  if (!Number.isInteger(repeat) || repeat < 1) fail(`R4 expected repeat must be a positive integer, got "${input.expectedRepeat}"`);
  const membershipOf = (project, bucket) => {
    const m = (((input.membership || {})[project] || {})[bucket]);
    if (Array.isArray(m)) return { ids: m, labels: {} };
    if (m && Array.isArray(m.ids)) return { ids: m.ids, labels: m.labels || {} };
    return null;
  };

  for (const project of PROJECTS) {
    for (const bucket of BUCKETS) {
      const required = bucket === 'acceptance';
      const name = jobName(bucket, project);
      const row = { job: name, project, bucket, required, job_conclusion: 'missing', artifact: 'missing', selected: null, executed: null, passed: null, failed: null, verdict: 'FAIL', notes: [] };
      rows.push(row);
      const before = reasons.length;
      const done = () => { row.verdict = reasons.length > before ? 'FAIL' : row.verdict; };
      const expected = membershipOf(project, bucket);
      if (expected) {
        row.selected = expected.ids.length;
        if (expected.ids.some((x) => typeof x !== 'string' || !x)) fail(`R5 ${name}: source membership contains an invalid identity`);
        if (new Set(expected.ids).size !== expected.ids.length) fail(`R5 ${name}: source membership lists a duplicate identity (ambiguous source identities)`);
        if (required && expected.ids.length === 0) fail(`R5 ${name}: acceptance membership is EMPTY for ${project}; an empty required selection can never be eligible (collection failure or removed tests)`);
      }
      const matches = (input.jobs || []).filter((j) => j.name === name);
      if (matches.length === 0) { fail(`R2 ${name}: job missing from this run`); continue; }
      if (matches.length > 1) { fail(`R2 ${name}: ${matches.length} jobs with this name (duplicate/ambiguous)`); continue; }
      const job = matches[0];
      row.job_conclusion = job.conclusion || job.status || 'unknown';
      if (job.status !== 'completed') { fail(`R2 ${name}: job not completed (status ${job.status})`); continue; }
      if (required && job.conclusion !== 'success') { fail(`R2 ${name}: required acceptance job concluded "${job.conclusion}"`); continue; }
      if (!required && !['success', 'failure'].includes(job.conclusion)) { fail(`R2 ${name}: job concluded "${job.conclusion}" (cancelled/skipped/timed out jobs leave coverage unproven)`); continue; }

      const aName = artifactName(bucket, project, input.sha);
      const art = (input.artifacts || {})[aName];
      if (!art) { fail(`R3 ${name}: evidence artifact ${aName} missing`); continue; }
      row.artifact = 'present';
      if (!art.uploadOk) fail(`R3 ${name}: UPLOAD_OK marker absent in ${aName} (finalize did not succeed)`);
      if (art.inventoryOk !== true) fail(`R3 ${name}: INVENTORY.sha256 did not verify in ${aName}${typeof art.inventoryOk === 'string' ? ` (${art.inventoryOk})` : ''}`);
      const ctx = art.context;
      if (!ctx) fail(`R4 ${name}: run.context missing in ${aName}`);
      else {
        if (ctx.sha !== input.sha) fail(`R4 ${name}: artifact sha ${ctx.sha} != candidate ${input.sha}`);
        if (input.headSha && ctx.head_sha !== input.headSha) fail(`R4 ${name}: artifact head_sha ${ctx.head_sha} != ${input.headSha}`);
        if (String(ctx.run_id) !== String(input.runId)) fail(`R4 ${name}: artifact run_id ${ctx.run_id} != ${input.runId}`);
        if (String(ctx.run_attempt) !== String(input.attempt)) fail(`R4 ${name}: artifact run_attempt ${ctx.run_attempt} != ${input.attempt} (stale artifact from another attempt)`);
        if (ctx.event !== input.event) fail(`R4 ${name}: artifact event ${ctx.event} != ${input.event}`);
        if (ctx.project !== project || ctx.bucket !== bucket) fail(`R4 ${name}: artifact context project/bucket ${ctx.project}/${ctx.bucket} mismatch`);
        if ((ctx.grep || '') !== '') fail(`R5 ${name}: a dispatch grep "${ctx.grep}" narrowed the selection`);
        if (String(ctx.repeat) !== String(repeat)) fail(`R4 ${name}: repeat ${ctx.repeat} != expected ${repeat}`);
      }
      if (!expected) { fail(`R5 ${name}: no source-derived membership available`); done(); continue; }
      if (!art.results) { fail(`R5 ${name}: results.json ${art.resultsProblem || 'missing/unparseable'} in ${aName}`); done(); continue; }
      const shape = validateResultsShape(art.results);
      if (shape) { fail(`R6 ${name}: ${shape}`); done(); continue; }
      // .last-run.json: present, parseable, schema-valid — in every bucket (F4).
      let lastRun = null;
      if (!art.lastRun) fail(`R6 ${name}: .last-run.json ${art.lastRunProblem || 'missing/unparseable'} in ${aName} (no verdict can stand without a valid last-run record)`);
      else { const lp = validateLastRunShape(art.lastRun); if (lp) fail(`R6 ${name}: ${lp}`); else lastRun = art.lastRun; }

      // Strict identity multiset (F3). Foreign-project rows are rejected BEFORE any filtering.
      const all = walkSpecs(art.results, null);
      const foreign = all.filter((g) => g.project !== project);
      if (foreign.length) fail(`R5 ${name}: results.json contains ${foreign.length} test row(s) of other project(s) (${[...new Set(foreign.map((g) => g.project))].join(', ')}); only ${project} may appear`);
      const got = all.filter((g) => g.project === project);
      const expSet = new Set(expected.ids);
      const counts = new Map();
      for (const g of got) counts.set(g.id, (counts.get(g.id) || 0) + 1);
      const missing = expected.ids.filter((x) => !counts.has(x));
      const extra = [...counts.keys()].filter((x) => !expSet.has(x));
      const dup = [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id);
      row.executed = got.reduce((n, g) => n + g.test.results.length, 0);
      if (missing.length || extra.length) fail(`R5 ${name}: executed identities != membership (missing ${missing.length}, extra ${extra.length}); selection was narrowed or membership drifted${missing.length ? ` — first missing: ${expected.labels[missing[0]] || missing[0]}` : ''}`);
      if (dup.length) fail(`R5 ${name}: ${dup.length} identity(ies) appear more than once in results.json (duplicate executions; repeat is ${repeat})`);
      // stats must agree with the per-test outcomes.
      const tally = { expected: 0, unexpected: 0, skipped: 0, flaky: 0 };
      for (const g of all) tally[g.test.status] += 1;
      for (const k of Object.keys(tally)) if (art.results.stats[k] !== tally[k]) fail(`R6 ${name}: results.json stats.${k}=${art.results.stats[k]} but ${tally[k]} test(s) have that outcome (inconsistent report)`);
      if (art.results.errors.length) fail(`R6 ${name}: results.json reports ${art.results.errors.length} run-level error(s)`);
      // .last-run.json reconciliation (F4).
      if (lastRun) {
        const expectFailed = new Set(all.filter((g) => isFailedForLastRun(g.test)).map((g) => g.id));
        const recorded = new Set(lastRun.failedTests);
        const notRecorded = [...expectFailed].filter((x) => !recorded.has(x));
        const unknown = [...recorded].filter((x) => !expectFailed.has(x));
        if (notRecorded.length || unknown.length) fail(`R6 ${name}: .last-run.json failedTests do not reconcile with results.json (${notRecorded.length} failed/not-run test(s) not recorded, ${unknown.length} recorded id(s) not failed in results)`);
        if (lastRun.status === 'interrupted' || lastRun.status === 'timedout') fail(`R6 ${name}: .last-run.json status ${lastRun.status} (run did not complete; coverage unproven)`);
        const shouldFail = expectFailed.size > 0 || art.results.errors.length > 0;
        if (lastRun.status === 'passed' && shouldFail) fail(`R6 ${name}: .last-run.json status passed although results.json shows failures/errors`);
        if (lastRun.status === 'failed' && !shouldFail) fail(`R6 ${name}: .last-run.json status failed although results.json shows no failure or error`);
        if (required && lastRun.status !== 'passed') fail(`R6 ${name}: .last-run.json status ${lastRun.status}`);
        if (required && lastRun.failedTests.length) fail(`R6 ${name}: .last-run.json records ${lastRun.failedTests.length} failed test id(s)`);
        // Job conclusion: evidence.sh run exits with the test status, so failed tests fail the job.
        if (!required && lastRun.status === 'failed' && job.conclusion === 'success') fail(`R2 ${name}: job concluded success although .last-run.json status is failed (inconsistent evidence)`);
        if (!required && lastRun.status === 'passed' && job.conclusion === 'failure') row.notes.push('job concluded failure although its browser tests passed (a non-test step failed)');
      }
      if (expected.ids.length === 0) {
        // Legitimate empty selection: no test row of ANY project, zero results, clean last-run.
        if (all.length !== 0) fail(`R5 ${name}: membership is empty but results.json contains ${all.length} test row(s)`);
        if (lastRun && (lastRun.status !== 'passed' || lastRun.failedTests.length)) fail(`R5 ${name}: empty selection but .last-run.json is not a clean pass (status ${lastRun.status}, ${lastRun.failedTests.length} failed id(s))`);
        row.passed = 0; row.failed = 0;
        row.verdict = reasons.length > before ? 'FAIL' : 'OK (legitimately empty: 0 selected, 0 executed, 0 passed)';
        continue;
      }
      let passed = 0, failed = 0, incomplete = 0;
      for (const { label, test } of got) {
        const results = test.results;
        const completed = results.length === repeat && results.every((r) => COMPLETED_RESULT_STATUSES.has(r.status));
        if (!completed) {
          incomplete += 1;
          fail(`R6 ${name}: "${label}" was not executed to completion (${results.length} result(s) [${results.map((r) => r.status).join(',')}], test status ${test.status}; ${repeat} completed result(s) required) — selection is not coverage`);
          continue;
        }
        if (results.every((r) => r.status === 'passed') && test.status === 'expected') passed += 1; else failed += 1;
        if (required) {
          for (const r of results) if (r.status !== 'passed') fail(`R6 ${name}: "${label}" result status ${r.status}`);
          if (test.status !== 'expected') fail(`R6 ${name}: "${label}" test status ${test.status}`);
        }
      }
      row.passed = passed; row.failed = failed;
      if (incomplete) row.notes.push(`${incomplete} selected test(s) not executed to completion`);
      if (required && (art.results.stats.unexpected || art.results.stats.skipped || art.results.stats.flaky)) fail(`R6 ${name}: stats unexpected=${art.results.stats.unexpected} skipped=${art.results.stats.skipped} flaky=${art.results.stats.flaky}`);
      row.verdict = reasons.length > before ? 'FAIL' : (required ? 'OK' : `OK (coverage complete: ${passed + failed} of ${expected.ids.length} executed to completion; ${failed} failing ${bucket} test(s) visible, not blocking${row.notes.length ? '; ' + row.notes.join('; ') : ''})`);
    }
  }
  return { eligible: reasons.length === 0, reasons, rows, sha: input.sha, headSha: input.headSha, event: input.event, runId: input.runId, attempt: input.attempt, repeat };
}

// ---- input gathering (CLI) --------------------------------------------------------------
// Walk the artifact's retained roots (hidden files included; symlinks and non-regular files rejected,
// never followed, so validation never reads outside the artifact root).
function walkRetained(dir, rel, out, problems) {
  for (const entry of readdirSync(join(dir, rel))) {
    const r = posix.join(rel, entry);
    const st = lstatSync(join(dir, r));
    if (st.isSymbolicLink()) { problems.push(`retained path ${r} is a symbolic link (rejected, not followed)`); continue; }
    if (st.isDirectory()) walkRetained(dir, r, out, problems);
    else if (st.isFile()) out.push(r);
    else problems.push(`retained path ${r} is not a regular file (rejected)`);
  }
  return out;
}
// Canonical in-artifact path, or null. Pure string check; never touches the filesystem.
export function canonicalInventoryPath(p, stripPrefix = INVENTORY_PREFIX) {
  if (typeof p !== 'string' || !p || p.includes('\\') || p.includes('\0') || p.startsWith('/')) return null;
  if (!p.startsWith(stripPrefix)) return null;
  const parts = p.slice(stripPrefix.length).split('/');
  if (parts.some((s) => s === '' || s === '.' || s === '..')) return null;
  if (!ARTIFACT_ROOTS.includes(parts[0]) || parts.length < 2) return null;
  return parts.join('/');
}
export function readArtifactDir(dir, { stripPrefix = INVENTORY_PREFIX } = {}) {
  const out = { uploadOk: false, inventoryOk: 'no inventory', inventory: { listed: 0, retained: 0, problems: [] }, context: null, results: null, resultsProblem: 'missing', lastRun: null, lastRunProblem: 'missing' };
  const problems = out.inventory.problems;
  if (!existsSync(dir) || !lstatSync(dir).isDirectory()) { out.inventoryOk = 'artifact directory missing'; return out; }
  const realDir = realpathSync(dir);
  const isRegular = (rel) => { const f = join(dir, ...rel.split('/')); return existsSync(f) && lstatSync(f).isFile(); };
  out.uploadOk = isRegular('ci-evidence/UPLOAD_OK') && lstatSync(join(dir, 'ci-evidence', 'UPLOAD_OK')).size > 0;
  // Retained payload: every regular file under the roots (hidden included) except the self-exclusions.
  for (const entry of readdirSync(dir)) if (!ARTIFACT_ROOTS.includes(entry)) problems.push(`unexpected top-level entry in artifact: ${entry}`);
  const retained = [];
  for (const root of ARTIFACT_ROOTS) {
    const p = join(dir, root);
    if (!existsSync(p)) continue;
    if (lstatSync(p).isSymbolicLink() || !lstatSync(p).isDirectory()) { problems.push(`artifact root ${root} is not a real directory`); continue; }
    walkRetained(dir, root, retained, problems);
  }
  const payload = retained.filter((r) => !INVENTORY_SELF_EXCLUSIONS.has(r));
  out.inventory.retained = payload.length;
  if (!isRegular('ci-evidence/INVENTORY.sha256')) problems.push('no inventory (ci-evidence/INVENTORY.sha256 missing or not a regular file)');
  else {
    // Grammar: every non-comment, non-blank line is "<64 lowercase hex><two spaces><path>"; canonical, in-artifact, unique.
    const listed = new Map();
    readFileSync(join(dir, 'ci-evidence', 'INVENTORY.sha256'), 'utf8').split('\n').forEach((l, i) => {
      if (l === '' || l.startsWith('#')) return;
      const m = /^([0-9a-f]{64})  (.+)$/.exec(l);
      if (!m) { problems.push(`inventory line ${i + 1} is malformed`); return; }
      const canon = canonicalInventoryPath(m[2], stripPrefix);
      if (!canon) { problems.push(`inventory line ${i + 1} path is not a canonical in-artifact path (${stripPrefix}{${ARTIFACT_ROOTS.join('|')}}/…): ${m[2].slice(0, 80)}`); return; }
      if (listed.has(canon)) { problems.push(`inventory lists ${canon} more than once`); return; }
      if (INVENTORY_SELF_EXCLUSIONS.has(canon)) { problems.push(`inventory lists its own self-exclusion ${canon}`); return; }
      listed.set(canon, m[1]);
    });
    out.inventory.listed = listed.size;
    if (!listed.size) problems.push('inventory has no digest lines');
    const payloadSet = new Set(payload);
    for (const r of payload) if (!listed.has(r)) problems.push(`retained file ${r} is NOT listed in the inventory (unlisted payload)`);
    for (const [canon, digest] of listed) {
      if (!payloadSet.has(canon)) { problems.push(`listed file ${canon} is missing from the artifact`); continue; }
      const f = join(dir, ...canon.split('/'));
      const real = realpathSync(f);
      if (real !== realDir && !real.startsWith(realDir + sep)) { problems.push(`listed path ${canon} resolves outside the artifact`); continue; }
      if (createHash('sha256').update(readFileSync(f)).digest('hex') !== digest) problems.push(`digest mismatch for ${canon}`);
    }
    for (const req of REQUIRED_EVIDENCE_FILES) if (!listed.has(req) || !payloadSet.has(req)) problems.push(`required evidence file ${req} is absent or unlisted`);
  }
  out.inventoryOk = problems.length === 0 ? true : `${problems.length} inventory problem(s): ${problems.slice(0, 3).join('; ')}${problems.length > 3 ? '; …' : ''}`;
  // Decision inputs are read only from regular in-artifact files (never through links).
  if (isRegular('ci-evidence/run.context')) out.context = parseContext(readFileSync(join(dir, 'ci-evidence', 'run.context'), 'utf8'));
  const readJson = (rel, key, problemKey) => {
    if (!isRegular(rel)) { out[problemKey] = 'missing'; return; }
    try { out[key] = JSON.parse(readFileSync(join(dir, ...rel.split('/')), 'utf8')); out[problemKey] = null; } catch (e) { out[key] = null; out[problemKey] = `unparseable (${String(e.message).slice(0, 60)})`; }
  };
  readJson('test-results/results.json', 'results', 'resultsProblem');
  readJson('test-results/.last-run.json', 'lastRun', 'lastRunProblem');
  return out;
}

// Source-derived membership from `playwright --list` on the candidate checkout. Fails closed (throws) on
// any collector failure: spawn error, nonzero exit/signal, unparseable/invalid report, JSON errors[], a
// test row of another project, a missing/duplicate stable id, a bucket partition that does not equal the
// unfiltered selection, or an empty acceptance selection. `--pass-with-no-tests` makes a LEGITIMATELY empty
// selection exit 0 with errors[] empty (verified on Playwright 1.64: phone diagnostic/obsolete), so the
// former tolerance of exit 1 + "No tests found" — which also trusted genuine failures — is gone.
export function listMembership(e2eDir, { spawn = spawnSync } = {}) {
  const collect = (project, bucket) => {
    const where = `playwright --list ${project}/${bucket}`;
    const r = spawn('npx', ['playwright', 'test', '--list', '--reporter=json', `--project=${project}`, '--pass-with-no-tests'], { cwd: e2eDir, encoding: 'utf8', env: { ...process.env, E2E_BUCKET: bucket, E2E_GREP: '' }, maxBuffer: 64 * 1024 * 1024 });
    if (r.error) throw new Error(`${where}: could not spawn collector (${r.error.message})`);
    if (r.status !== 0 || r.signal) throw new Error(`${where}: collector exited ${r.status}${r.signal ? ` (signal ${r.signal})` : ''}: ${String(r.stderr || '').slice(0, 300)}`);
    let report;
    try { report = JSON.parse(r.stdout); } catch { throw new Error(`${where}: collector output is not JSON`); }
    if (!report || typeof report !== 'object' || !Array.isArray(report.suites) || !Array.isArray(report.errors)) throw new Error(`${where}: collector output is not a Playwright list report`);
    if (report.errors.length) throw new Error(`${where}: collector reported ${report.errors.length} error(s): ${String(report.errors[0] && report.errors[0].message).slice(0, 200)}`);
    const rows = walkSpecs(report, null);
    if (rows.some((g) => g.project !== project)) throw new Error(`${where}: list output contains test(s) of other project(s)`);
    const ids = rows.map((g) => g.id);
    if (ids.some((x) => !x)) throw new Error(`${where}: a listed spec has no stable id`);
    if (new Set(ids).size !== ids.length) throw new Error(`${where}: list output contains duplicate test ids`);
    return { ids, labels: Object.fromEntries(rows.map((g) => [g.id, g.label])) };
  };
  const membership = {};
  for (const project of PROJECTS) {
    membership[project] = {};
    for (const bucket of BUCKETS) membership[project][bucket] = collect(project, bucket);
    // The three buckets must be disjoint and together equal the unfiltered selection (E2E_BUCKET=all).
    const all = collect(project, 'all');
    const union = BUCKETS.flatMap((b) => membership[project][b].ids);
    const allSet = new Set(all.ids), unionSet = new Set(union);
    if (unionSet.size !== union.length) throw new Error(`membership ${project}: buckets overlap (a test is in more than one bucket)`);
    if (all.ids.length !== union.length || all.ids.some((x) => !unionSet.has(x))) throw new Error(`membership ${project}: buckets (${union.length}) do not partition the full selection (${all.ids.length})`);
    if (membership[project].acceptance.ids.length === 0) throw new Error(`membership ${project}: acceptance selection is EMPTY on this checkout (collection failure or removed tests); refusing to evaluate`);
  }
  return membership;
}

export async function fetchJobs(repo, runId, attempt, token) {
  const jobs = [];
  for (let page = 1; page <= 10; page += 1) {
    const url = `https://api.github.com/repos/${repo}/actions/runs/${runId}/attempts/${attempt}/jobs?per_page=100&page=${page}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
    if (!resp.ok) throw new Error(`jobs API ${resp.status} for run ${runId} attempt ${attempt}`);
    const body = await resp.json();
    if (!body || !Array.isArray(body.jobs)) throw new Error('jobs API returned no jobs[]');
    for (const j of body.jobs) {
      if (!j || typeof j.name !== 'string' || typeof j.status !== 'string') throw new Error('jobs API returned a malformed job entry');
      jobs.push({ name: j.name, status: j.status, conclusion: j.conclusion });
    }
    if (body.jobs.length < 100) break;
  }
  return jobs;
}

const argv = (flag, dflt) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : dflt; };
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  (async () => {
    const sha = argv('--sha'); const headSha = argv('--head-sha', ''); const event = argv('--event'); const runId = argv('--run-id'); const attempt = argv('--attempt', '1');
    const artifactsDir = argv('--artifacts'); const e2eDir = argv('--e2e', 'e2e'); const outDir = argv('--out', 'gate'); const expectedRepeat = Number(argv('--expected-repeat', '1'));
    const repo = process.env.GITHUB_REPOSITORY; const token = process.env.GITHUB_TOKEN;
    mkdirSync(outDir, { recursive: true });
    const artifacts = {};
    const gatherErrors = [];
    if (artifactsDir && existsSync(artifactsDir)) {
      for (const d of readdirSync(artifactsDir)) {
        const p = join(artifactsDir, d);
        if (lstatSync(p).isSymbolicLink() || !lstatSync(p).isDirectory()) { gatherErrors.push(`artifacts entry ${d} is not a directory`); continue; }
        try { artifacts[d] = readArtifactDir(p); } catch (e) { gatherErrors.push(`artifact ${d}: ${e.message}`); }
      }
    } else gatherErrors.push(`artifacts directory ${artifactsDir || '(none)'} does not exist`);
    let jobs = [];
    try { jobs = await fetchJobs(repo, runId, attempt, token); } catch (e) { gatherErrors.push(`jobs API: ${e.message}`); }
    let membership = {};
    try { membership = listMembership(e2eDir); } catch (e) { gatherErrors.push(`membership: ${e.message}`); }
    const verdict = evaluate({ sha, headSha, event, runId, attempt, expectedRepeat, jobs, membership, artifacts });
    if (gatherErrors.length) { verdict.eligible = false; verdict.reasons.unshift(...gatherErrors.map((g) => `R7 could not gather inputs (fail closed): ${g}`)); }
    writeFileSync(join(outDir, 'merge-eligibility.json'), JSON.stringify({ ...verdict, gatherErrors, artifactsSeen: Object.keys(artifacts), jobsSeen: jobs }, null, 2));
    const table = ['| job | conclusion | artifact | selected | executed | passed | failed | verdict |', '|---|---|---|---:|---:|---:|---:|---|',
      ...verdict.rows.map((r) => `| ${r.job} | ${r.job_conclusion} | ${r.artifact} | ${r.selected ?? '-'} | ${r.executed ?? '-'} | ${r.passed ?? '-'} | ${r.failed ?? '-'} | ${r.verdict} |`)];
    const head = `## ${CHECK_NAME}: ${verdict.eligible ? 'ELIGIBLE' : 'INELIGIBLE'}\n\ncandidate ${sha} (head ${headSha || 'n/a'}), event ${event}, run ${runId} attempt ${attempt}, expected repeat ${expectedRepeat}\n\n`;
    const reasonsMd = verdict.reasons.length ? `\n\n### Reasons\n${verdict.reasons.map((r) => `- ${r}`).join('\n')}\n` : '\n\nAll required acceptance jobs completed successfully with complete, source-verified selections on this exact commit; every evidence artifact finalized, fully inventoried and verified.\n';
    const md = head + table.join('\n') + reasonsMd;
    writeFileSync(join(outDir, 'merge-eligibility.md'), md);
    if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, md, { flag: 'a' });
    const esc = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    if (verdict.eligible) console.log(`::notice title=${CHECK_NAME}::ELIGIBLE — ${sha} (${event}, run ${runId}/${attempt}): all 12 jobs completed, 4 acceptance jobs green with complete selections, 12 evidence artifacts fully inventoried and verified`);
    else console.log(`::error title=${CHECK_NAME}::INELIGIBLE — ${sha} (${event}, run ${runId}/${attempt}): ${esc(verdict.reasons.slice(0, 8).join(' | '))}${verdict.reasons.length > 8 ? ` | +${verdict.reasons.length - 8} more` : ''}`);
    process.exit(verdict.eligible ? 0 : 1);
  })().catch((e) => { console.log(`::error title=${CHECK_NAME}::INELIGIBLE — gate crashed (fail closed): ${String(e.message).slice(0, 300)}`); process.exit(1); });
}
