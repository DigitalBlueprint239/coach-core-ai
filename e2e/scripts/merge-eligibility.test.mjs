// Focused checks for the merge-eligibility aggregate. Run: `node e2e/scripts/merge-eligibility.test.mjs`
// EXECUTABLE FIXTURES against the pure evaluate() decision, the on-disk artifact reader, the membership
// collector (injected at its process boundary) and the full CLI (jobs API injected at its fetch boundary,
// collector injected via PATH) — not GitHub Actions executions. What Actions itself does (job
// conclusions, cancellation, download, reruns) is evidenced separately by bounded workflow runs.
//
// Repair of dbf7a9a (independent review c-6256897327, F1–F4): every reviewer reproduction is a regression
// here. Where git history is available, the dbf7a9a implementation is loaded from git and shown to have
// ACCEPTED the invalid input (the finding reproduced); the repaired implementation must REJECT it with a
// named reason. Without history those demonstration legs are SKIPPED (reported as skips, never passes).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync, appendFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { evaluate, readArtifactDir, listMembership, parseContext, walkSpecs, canonicalInventoryPath, PROJECTS, BUCKETS, jobName, artifactName, TRUSTED_EVENTS } from './merge-eligibility.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const gateScript = join(here, 'merge-eligibility.mjs');
const FAILED_HEAD = 'dbf7a9ae7dd51092f9ec2ac86f3c19a0d67b23f4';
const copy = (x) => JSON.parse(JSON.stringify(x));
const sha256 = (b) => createHash('sha256').update(b).digest('hex');

// The superseded implementation, loaded from git (demonstration legs only).
const OLD = await (async () => {
  if (spawnSync('git', ['-C', repo, 'cat-file', '-e', `${FAILED_HEAD}:e2e/scripts/merge-eligibility.mjs`]).status !== 0) return null;
  const d = mkdtempSync(join(tmpdir(), 'gate-old-')); const f = join(d, 'merge-eligibility.mjs');
  writeFileSync(f, spawnSync('git', ['-C', repo, 'show', `${FAILED_HEAD}:e2e/scripts/merge-eligibility.mjs`], { encoding: 'utf8' }).stdout);
  return { mod: await import(pathToFileURL(f)), file: f };
})();
// The b139d18 implementation (N1 demonstration legs only).
const PREV_HEAD = 'b139d18d5ea617fd4d505dbdd19ef1e0403662a9';
const PREV = await (async () => {
  if (spawnSync('git', ['-C', repo, 'cat-file', '-e', `${PREV_HEAD}:e2e/scripts/merge-eligibility.mjs`]).status !== 0) return null;
  const d = mkdtempSync(join(tmpdir(), 'gate-prev-')); const f = join(d, 'merge-eligibility.mjs');
  writeFileSync(f, spawnSync('git', ['-C', repo, 'show', `${PREV_HEAD}:e2e/scripts/merge-eligibility.mjs`], { encoding: 'utf8' }).stdout);
  return { mod: await import(pathToFileURL(f)), file: f };
})();
const PREV_SKIP = PREV ? false : `failed head ${PREV_HEAD.slice(0, 7)} not available in this clone (shallow checkout); the reproduction leg is SKIPPED, not passed`;
const OLD_SKIP = OLD ? false : `failed head ${FAILED_HEAD.slice(0, 7)} not available in this clone (shallow checkout); the reproduction leg is SKIPPED, not passed`;

const SHA = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);
const RUN = '123456789';

// Source-shaped membership: desktop 65/10/1, phone 15/0/0. Labels are file:line:column title; ids are
// Playwright-style stable ids (hash of label + project), as produced by --list and by the run.
const idOf = (label, project) => sha256(`${project}|${label}`).slice(0, 20) + '-' + sha256(label).slice(0, 20);
const labelsFor = (prefix, n, tag = '') => Array.from({ length: n }, (_, i) => `${prefix}.spec.ts:${10 + i}:1 ${prefix.toUpperCase()}-${String(i).padStart(2, '0')}${tag} does the thing`);
const memberOf = (project, labels) => ({ ids: labels.map((l) => idOf(l, project)), labels: Object.fromEntries(labels.map((l) => [idOf(l, project), l])) });
const membershipFor = () => {
  const m = {};
  for (const p of PROJECTS) {
    const phone = p.startsWith('phone-');
    m[p] = {
      acceptance: memberOf(p, labelsFor(phone ? 'phone' : 'acc', phone ? 15 : 65)),
      diagnostic: memberOf(p, phone ? [] : labelsFor('diag', 10, ' [diagnostic]')),
      'obsolete-fault-model': memberOf(p, phone ? [] : labelsFor('obs', 1, ' [obsolete-fault-model]')),
    };
  }
  return m;
};
const labelsOf = (m) => m.ids.map((id) => m.labels[id]);
// results.json shaped like Playwright 1.64 JSON, built from labels.
const resultsFor = (project, labels, { repeat = 1, status = 'passed', testStatus = 'expected', dropLast = 0 } = {}) => {
  const specs = labels.slice(0, labels.length - dropLast).map((label) => {
    const [loc, ...title] = label.split(' '); const [file, line, column] = loc.split(':');
    return { title: title.join(' '), ok: testStatus !== 'unexpected', id: idOf(label, project), file, line: Number(line), column: Number(column), tests: [{ projectName: project, projectId: project, expectedStatus: 'passed', status: testStatus, results: Array.from({ length: repeat }, () => ({ status, duration: 5 })) }] };
  });
  const tally = { expected: 0, unexpected: 0, skipped: 0, flaky: 0 }; for (const s of specs) tally[s.tests[0].status] += 1;
  return { config: {}, suites: [{ title: 'root', file: 'x', specs, suites: [] }], errors: [], stats: { startTime: '2026-10-18T00:00:00.000Z', duration: 1, ...tally } };
};
const lastRunFor = (results) => { const failed = walkSpecs(results, null).filter((g) => g.test.status === 'unexpected' || (g.test.status === 'skipped' && !g.test.results.some((r) => r.status === 'interrupted'))).map((g) => g.id); return { status: failed.length || results.errors.length ? 'failed' : 'passed', failedTests: failed }; };
const ctxFor = (project, bucket, over = {}) => ({ sha: SHA, head_sha: HEAD, event: 'pull_request', run_id: RUN, run_attempt: '1', project, bucket, repeat: '1', grep: '', ...over });
const goodJobs = () => PROJECTS.flatMap((p) => BUCKETS.map((b) => ({ name: jobName(b, p), status: 'completed', conclusion: b === 'acceptance' ? 'success' : (p.startsWith('phone-') ? 'success' : 'failure') })));
const goodArtifacts = (m) => {
  const a = {};
  for (const p of PROJECTS) for (const b of BUCKETS) {
    // Desktop diagnostic/obsolete: every test fails (completed) to prove visible-but-not-blocking.
    const labels = labelsOf(m[p][b]); const failing = b !== 'acceptance' && labels.length > 0;
    const results = resultsFor(p, labels, failing ? { status: 'timedOut', testStatus: 'unexpected' } : {});
    a[artifactName(b, p, SHA)] = { uploadOk: true, inventoryOk: true, context: ctxFor(p, b), results, lastRun: lastRunFor(results) };
  }
  return a;
};
const base = (over = {}) => { const m = membershipFor(); return { sha: SHA, headSha: HEAD, event: 'pull_request', runId: RUN, attempt: '1', expectedRepeat: 1, jobs: goodJobs(), membership: m, artifacts: goodArtifacts(m), ...over }; };
const reasonsOf = (v) => v.reasons.join('\n');
const A = (b, bucket, project) => b.artifacts[artifactName(bucket, project, SHA)];
// dbf7a9a used label identities (file:line:column title) in its membership.
const toOldInput = (input) => { const x = copy(input); for (const p of PROJECTS) for (const b of BUCKETS) { const mm = x.membership[p] && x.membership[p][b]; if (mm && !Array.isArray(mm)) x.membership[p][b] = labelsOf(mm); } return x; };
const expectOldEligible = (input, what) => { const v = OLD.mod.evaluate(toOldInput(input)); assert.equal(v.eligible, true, `${what}: dbf7a9a must show the false ELIGIBLE (reproduction): ${reasonsOf(v)}`); };
const expectIneligible = (input, re, what) => { const v = evaluate(input); assert.equal(v.eligible, false, `${what}: repaired gate must reject`); assert.match(reasonsOf(v), re, `${what}: reason`); return v; };

// ---- on-disk artifacts written exactly like evidence.sh finalize (complete inventory, e2e/ prefix) ----
const ALL_FILES = ['ci-evidence/run.log', 'ci-evidence/run.exit', 'ci-evidence/REDACTION.txt', 'ci-evidence/run.context', 'ci-evidence/release-build-manifest.sha256', 'test-results/results.json', 'test-results/.last-run.json'];
const writeInventory = (d, paths, lines = []) => writeFileSync(join(d, 'ci-evidence', 'INVENTORY.sha256'), ['# Upload-aligned inventory', '# paths: e2e/ci-evidence e2e/test-results', ...[...paths].sort().map((p) => `${sha256(readFileSync(join(d, p)))}  e2e/${p}`), ...lines].join('\n') + '\n');
const materialize = (art, { inventory = 'complete' } = {}) => {
  const d = mkdtempSync(join(tmpdir(), 'art-')); mkdirSync(join(d, 'ci-evidence')); mkdirSync(join(d, 'test-results'));
  const files = { 'ci-evidence/run.log': 'safe fixture log\n', 'ci-evidence/run.exit': 'exit=0\n', 'ci-evidence/REDACTION.txt': 'run.log redaction: bytes_before=17 bytes_after=17\n',
    'ci-evidence/run.context': Object.entries(art.context).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', 'ci-evidence/release-build-manifest.sha256': 'manifest\n',
    'test-results/results.json': JSON.stringify(art.results), 'test-results/.last-run.json': JSON.stringify(art.lastRun) };
  for (const [p, c] of Object.entries(files)) writeFileSync(join(d, p), c);
  if (inventory === 'complete') writeInventory(d, ALL_FILES);
  writeFileSync(join(d, 'ci-evidence', 'UPLOAD_OK'), 'ok\n');
  return d;
};
const onDisk = (b) => { const dirs = {}; for (const [k, a] of Object.entries(b.artifacts)) { dirs[k] = materialize(a); b.artifacts[k] = readArtifactDir(dirs[k]); } return dirs; };

// ======================================================================================== baseline (preserved behaviour)
test('complete successful acceptance (pull_request): ELIGIBLE; diagnostic/obsolete failures visible, not blocking; phone empties legitimately empty', () => {
  const v = evaluate(base());
  assert.equal(v.eligible, true, reasonsOf(v));
  assert.equal(v.rows.length, 12);
  assert.ok(v.rows.filter((r) => r.required).every((r) => r.verdict === 'OK' && r.passed === r.selected && r.failed === 0));
  assert.match(v.rows.find((r) => r.job === 'E2E diagnostic (chromium)').verdict, /coverage complete: 10 of 10 executed to completion; 10 failing diagnostic test\(s\) visible, not blocking/);
  const empty = v.rows.filter((r) => r.project.startsWith('phone-') && !r.required);
  assert.equal(empty.length, 4);
  for (const r of empty) { assert.equal(r.selected, 0); assert.equal(r.executed, 0); assert.equal(r.passed, 0); assert.match(r.verdict, /legitimately empty: 0 selected, 0 executed, 0 passed/); }
});

test('merge_group is a trusted event too; workflow_dispatch and push are NOT (bounded/manual runs cannot satisfy the gate)', () => {
  assert.deepEqual(TRUSTED_EVENTS, ['pull_request', 'merge_group']);
  const withEvent = (ev) => { const b = base({ event: ev }); for (const a of Object.values(b.artifacts)) a.context.event = ev; return b; };
  const mg = evaluate(withEvent('merge_group')); assert.equal(mg.eligible, true, reasonsOf(mg));
  for (const ev of ['workflow_dispatch', 'push']) expectIneligible(withEvent(ev), /R1 event "(workflow_dispatch|push)" is not a trusted merge event/, ev);
});

test('one failed required job (acceptance firefox) -> INELIGIBLE, named; other required rows unaffected', () => {
  const b = base(); b.jobs.find((j) => j.name === 'E2E acceptance (firefox)').conclusion = 'failure';
  const v = expectIneligible(b, /R2 E2E acceptance \(firefox\): required acceptance job concluded "failure"/, 'failed job');
  assert.ok(v.rows.filter((r) => r.job !== 'E2E acceptance (firefox)' && r.required).every((r) => r.verdict === 'OK'));
});

test('failing acceptance TESTS with a (hypothetically) green job are still caught from results.json (R6)', () => {
  const b = base(); const a = A(b, 'acceptance', 'chromium');
  a.results = resultsFor('chromium', labelsOf(b.membership.chromium.acceptance), { status: 'failed', testStatus: 'unexpected' }); a.lastRun = lastRunFor(a.results);
  expectIneligible(b, /R6 E2E acceptance \(chromium\): ".*" result status failed/, 'failing tests');
});

test('cancelled required job -> INELIGIBLE; cancelled NON-required job also blocks (coverage unproven)', () => {
  const b1 = base(); b1.jobs.find((j) => j.name === 'E2E acceptance (phone-chromium)').conclusion = 'cancelled';
  expectIneligible(b1, /R2 E2E acceptance \(phone-chromium\): required acceptance job concluded "cancelled"/, 'cancelled required');
  const b2 = base(); b2.jobs.find((j) => j.name === 'E2E diagnostic (firefox)').conclusion = 'cancelled';
  expectIneligible(b2, /R2 E2E diagnostic \(firefox\): job concluded "cancelled"/, 'cancelled diagnostic');
});

test('skipped job -> INELIGIBLE; in-progress (not completed) job -> INELIGIBLE', () => {
  const b1 = base(); b1.jobs.find((x) => x.name === 'E2E obsolete-fault-model (chromium)').conclusion = 'skipped';
  expectIneligible(b1, /R2 E2E obsolete-fault-model \(chromium\): job concluded "skipped"/, 'skipped');
  const b2 = base(); const k = b2.jobs.find((x) => x.name === 'E2E acceptance (chromium)'); k.status = 'in_progress'; k.conclusion = null;
  expectIneligible(b2, /R2 E2E acceptance \(chromium\): job not completed \(status in_progress\)/, 'in progress');
});

test('missing required job, duplicate job, and missing artifact -> INELIGIBLE', () => {
  const b1 = base(); b1.jobs = b1.jobs.filter((j) => j.name !== 'E2E acceptance (firefox)');
  expectIneligible(b1, /R2 E2E acceptance \(firefox\): job missing from this run/, 'missing job');
  const b2 = base(); b2.jobs.push({ name: 'E2E acceptance (firefox)', status: 'completed', conclusion: 'success' });
  expectIneligible(b2, /R2 E2E acceptance \(firefox\): 2 jobs with this name/, 'duplicate job');
  const b3 = base(); delete b3.artifacts[artifactName('acceptance', 'chromium', SHA)];
  expectIneligible(b3, /R3 E2E acceptance \(chromium\): evidence artifact e2e-results-acceptance-chromium-a{40} missing/, 'missing artifact');
});

test('finalize not successful (no UPLOAD_OK) or inventory problem in ANY job -> INELIGIBLE', () => {
  const b1 = base(); A(b1, 'diagnostic', 'chromium').uploadOk = false;
  expectIneligible(b1, /R3 E2E diagnostic \(chromium\): UPLOAD_OK marker absent/, 'no UPLOAD_OK');
  const b2 = base(); A(b2, 'acceptance', 'phone-firefox').inventoryOk = '1 inventory problem(s): digest mismatch for ci-evidence/run.log';
  expectIneligible(b2, /R3 E2E acceptance \(phone-firefox\): INVENTORY.sha256 did not verify .*digest mismatch/, 'inventory');
});

test('narrowed dispatch selection: grep recorded in run.context AND identities != membership -> INELIGIBLE (even with all-green results); diagnostic narrowing rejected too', () => {
  const b = base(); const a = A(b, 'acceptance', 'chromium');
  a.context = ctxFor('chromium', 'acceptance', { grep: 'D10-01' }); a.results = resultsFor('chromium', labelsOf(b.membership.chromium.acceptance).slice(0, 1)); a.lastRun = lastRunFor(a.results);
  const v = expectIneligible(b, /R5 E2E acceptance \(chromium\): a dispatch grep "D10-01" narrowed the selection/, 'recorded grep');
  assert.match(reasonsOf(v), /R5 E2E acceptance \(chromium\): executed identities != membership \(missing 64, extra 0\)/);
  const b2 = base(); const a2 = A(b2, 'acceptance', 'firefox'); a2.results = resultsFor('firefox', labelsOf(b2.membership.firefox.acceptance), { dropLast: 3 }); a2.lastRun = lastRunFor(a2.results);
  expectIneligible(b2, /R5 E2E acceptance \(firefox\): executed identities != membership \(missing 3, extra 0\)/, 'unrecorded narrowing');
  const b3 = base(); A(b3, 'diagnostic', 'chromium').context.grep = 'N2-D0';
  expectIneligible(b3, /R5 E2E diagnostic \(chromium\): a dispatch grep "N2-D0" narrowed/, 'recorded diagnostic grep');
  const b4 = base(); const a4 = A(b4, 'diagnostic', 'chromium'); a4.results.suites[0].specs.pop(); a4.results.stats.unexpected -= 1; a4.lastRun = lastRunFor(a4.results);
  expectIneligible(b4, /R5 E2E diagnostic \(chromium\): executed identities != membership \(missing 1, extra 0\)/, 'unrecorded diagnostic narrowing');
});

test('results belonging to a different sha / run / attempt / head -> INELIGIBLE', () => {
  const other = 'c'.repeat(40);
  for (const [field, value, re] of [['sha', other, new RegExp(`artifact sha ${other} != candidate ${SHA}`)], ['run_attempt', '2', /artifact run_attempt 2 != 1 \(stale artifact from another attempt\)/], ['run_id', '42', /artifact run_id 42 != 123456789/], ['head_sha', other, new RegExp(`artifact head_sha ${other} != ${HEAD}`)]]) {
    const b = base(); A(b, 'acceptance', 'chromium').context[field] = value; expectIneligible(b, re, field);
  }
  const b5 = base(); b5.artifacts = Object.fromEntries(Object.entries(b5.artifacts).map(([k, v]) => [k.replace(SHA, other), v]));
  const v5 = evaluate(b5); assert.equal(v5.eligible, false); assert.equal(v5.reasons.filter((r) => /R3 .*artifact .* missing/.test(r)).length, 12);
});

test('repeat mismatch and run-level errors -> INELIGIBLE; skipped / repeated results in acceptance -> INELIGIBLE', () => {
  const b1 = base(); A(b1, 'acceptance', 'chromium').context.repeat = '10';
  expectIneligible(b1, /R4 E2E acceptance \(chromium\): repeat 10 != expected 1/, 'repeat');
  const b2 = base(); const a2 = A(b2, 'acceptance', 'firefox'); a2.results.errors = [{ message: 'global setup failed' }]; a2.lastRun = { status: 'failed', failedTests: [] };
  expectIneligible(b2, /R6 E2E acceptance \(firefox\): results.json reports 1 run-level error/, 'errors');
  const b3 = base(); const a3 = A(b3, 'acceptance', 'firefox'); a3.results = resultsFor('firefox', labelsOf(b3.membership.firefox.acceptance), { status: 'skipped', testStatus: 'skipped' }); a3.lastRun = lastRunFor(a3.results);
  expectIneligible(b3, /R6 E2E acceptance \(firefox\): ".*" was not executed to completion \(1 result\(s\) \[skipped\]/, 'skipped results');
  const b4 = base(); const a4 = A(b4, 'acceptance', 'firefox'); a4.results = resultsFor('firefox', labelsOf(b4.membership.firefox.acceptance), { repeat: 2 }); a4.lastRun = lastRunFor(a4.results);
  expectIneligible(b4, /was not executed to completion \(2 result\(s\)/, 'repeat 2');
});

// ======================================================================================== F1 membership collection
const fakeSpawn = (behaviour) => (cmd, args, opts) => behaviour(args.find((a) => a.startsWith('--project=')).slice(10), opts.env.E2E_BUCKET, args);
const listReport = (project, labels) => JSON.stringify({ config: {}, suites: [{ title: 'root', specs: labels.map((label) => { const [loc, ...t] = label.split(' '); const [file, line, column] = loc.split(':'); return { title: t.join(' '), id: idOf(label, project), file, line: Number(line), column: Number(column), tests: [{ projectName: project, results: [], status: 'skipped' }] }; }), suites: [] }], errors: [] });
const srcLabels = (project, bucket) => { const m = membershipFor()[project]; return bucket === 'all' ? BUCKETS.flatMap((b) => labelsOf(m[b])) : labelsOf(m[bucket]); };
const goodSpawn = fakeSpawn((p, b) => ({ status: 0, stdout: listReport(p, srcLabels(p, b)), stderr: '' }));

test('F1 collector: a healthy source checkout yields per-bucket membership, partition verified, legitimate empty phone diagnostic/obsolete preserved; --pass-with-no-tests is used', () => {
  const seen = [];
  const m = listMembership('.', { spawn: (c, a, o) => { seen.push(a); return goodSpawn(c, a, o); } });
  for (const p of PROJECTS) for (const b of BUCKETS) assert.deepEqual(m[p][b].ids, membershipFor()[p][b].ids);
  assert.equal(m['phone-chromium'].diagnostic.ids.length, 0);
  assert.ok(seen.every((a) => a.includes('--pass-with-no-tests')), 'legitimately empty buckets exit 0 instead of being tolerated as failures');
  assert.equal(seen.length, PROJECTS.length * (BUCKETS.length + 1));
});

test('F1 collector fails CLOSED: nonzero exit (even with JSON), errors[] with exit 0, spawn error, signal, non-JSON, non-report, foreign project, missing/duplicate ids, partition mismatch, overlap, empty acceptance', () => {
  const cases = [
    ['exit 1 + JSON errors[] (reviewer injection)', fakeSpawn(() => ({ status: 1, stdout: JSON.stringify({ suites: [], errors: [{ message: 'INTENTIONAL REVIEW collection failure' }] }), stderr: '' })), /collector exited 1/],
    ['exit 0 but errors[]', fakeSpawn(() => ({ status: 0, stdout: JSON.stringify({ suites: [], errors: [{ message: 'Error: No tests found' }] }), stderr: '' })), /collector reported 1 error\(s\): Error: No tests found/],
    ['spawn error', fakeSpawn(() => ({ error: new Error('ENOENT npx'), status: null, stdout: '', stderr: '' })), /could not spawn collector \(ENOENT npx\)/],
    ['killed by signal', fakeSpawn(() => ({ status: null, signal: 'SIGKILL', stdout: '', stderr: '' })), /signal SIGKILL/],
    ['non-JSON', fakeSpawn(() => ({ status: 0, stdout: 'Listing tests:\n', stderr: '' })), /not JSON/],
    ['JSON but not a report', fakeSpawn(() => ({ status: 0, stdout: '{"suites":"x"}', stderr: '' })), /not a Playwright list report/],
    ['foreign project row', fakeSpawn((p, b) => ({ status: 0, stdout: listReport('foreign-project', srcLabels(p, b)), stderr: '' })), /test\(s\) of other project/],
    ['spec without id', fakeSpawn((p, b) => ({ status: 0, stdout: listReport(p, srcLabels(p, b)).replace(/"id":"[^"]+",/, ''), stderr: '' })), /no stable id/],
    ['duplicate ids', fakeSpawn((p, b) => { const l = srcLabels(p, b); return { status: 0, stdout: listReport(p, l.length ? [...l, l[0]] : l), stderr: '' }; }), /duplicate test ids/],
    ['bucket partition mismatch (unfiltered has an extra test)', fakeSpawn((p, b) => ({ status: 0, stdout: listReport(p, b === 'all' ? [...srcLabels(p, b), 'x.spec.ts:1:1 X-00 stray'] : srcLabels(p, b)), stderr: '' })), /do not partition the full selection/],
    ['bucket overlap', fakeSpawn((p, b) => ({ status: 0, stdout: listReport(p, b === 'diagnostic' ? srcLabels(p, 'acceptance').slice(0, 1).concat(srcLabels(p, b)) : srcLabels(p, b)), stderr: '' })), /buckets overlap/],
    ['empty acceptance (every bucket empty, exit 0, no errors)', fakeSpawn((p) => ({ status: 0, stdout: listReport(p, []), stderr: '' })), /acceptance selection is EMPTY on this checkout/],
  ];
  for (const [what, spawn, re] of cases) assert.throws(() => listMembership('.', { spawn }), re, what);
});

const zeroAcceptance = () => { const b = base(); for (const p of PROJECTS) for (const k of BUCKETS) { b.membership[p][k] = { ids: [], labels: {} }; const a = A(b, k, p); a.results = resultsFor(p, []); a.lastRun = { status: 'passed', failedTests: [] }; } return b; };
test('F1 evaluate: empty ACCEPTANCE membership is never eligible (all-zero acceptance, reviewer fixture) — while empty non-required phone buckets stay legitimately empty', () => {
  const v = expectIneligible(zeroAcceptance(), /R5 E2E acceptance \(chromium\): acceptance membership is EMPTY for chromium/, 'all-zero acceptance');
  assert.equal(v.reasons.filter((r) => /acceptance membership is EMPTY/.test(r)).length, 4, 'each required project is named');
  const ok = evaluate(base()); assert.equal(ok.eligible, true); assert.match(ok.rows.find((r) => r.job === 'E2E obsolete-fault-model (phone-firefox)').verdict, /legitimately empty/);
});
test('F1 reproduction on dbf7a9a: all-zero acceptance was ELIGIBLE', { skip: OLD_SKIP }, () => { expectOldEligible(zeroAcceptance(), 'all-zero acceptance'); });

// Full CLI: jobs API injected at the fetch boundary (preload), collector injected via PATH (fake npx).
const cliFixture = ({ collector, zeroResults = false, jobs = null }) => {
  const root = mkdtempSync(join(tmpdir(), 'cli-')); const arts = join(root, 'artifacts'); mkdirSync(arts);
  const input = base();
  for (const p of PROJECTS) for (const k of BUCKETS) {
    const name = artifactName(k, p, SHA); const a = input.artifacts[name];
    if (zeroResults) { a.results = resultsFor(p, []); a.lastRun = { status: 'passed', failedTests: [] }; }
    renameSync(materialize(a), join(arts, name));
  }
  const bin = join(root, 'bin'); mkdirSync(bin);
  writeFileSync(join(root, 'membership.json'), JSON.stringify(Object.fromEntries(PROJECTS.map((p) => [p, Object.fromEntries([...BUCKETS, 'all'].map((b) => [b, srcLabels(p, b)]))]))));
  const behaviours = {
    good: `const m=JSON.parse(require('fs').readFileSync(${JSON.stringify(join(root, 'membership.json'))}));const L=m[p][b];const c=require('crypto');const h=(s)=>c.createHash('sha256').update(s).digest('hex');const id=(l)=>h(p+'|'+l).slice(0,20)+'-'+h(l).slice(0,20);process.stdout.write(JSON.stringify({config:{},suites:[{title:'r',specs:L.map(l=>{const [loc,...t]=l.split(' ');const [f,ln,col]=loc.split(':');return {title:t.join(' '),id:id(l),file:f,line:+ln,column:+col,tests:[{projectName:p,results:[],status:'skipped'}]}}),suites:[]}],errors:[]}));`,
    failing: `process.stdout.write(JSON.stringify({suites:[],errors:[{message:"INTENTIONAL REVIEW collection failure"}]}));process.exit(1);`,
    allEmpty: `process.stdout.write(JSON.stringify({config:{},suites:[],errors:[]}));`,
  };
  writeFileSync(join(bin, 'npx'), `#!/usr/bin/env node\nconst a=process.argv.slice(2);const p=a.find(x=>x.startsWith('--project=')).slice(10);const b=process.env.E2E_BUCKET;\n${behaviours[collector]}\n`, { mode: 0o755 });
  const preload = join(root, 'jobs.mjs');
  writeFileSync(preload, `globalThis.fetch=async()=>({ok:true,json:async()=>(${JSON.stringify({ jobs: jobs || input.jobs })})});\n`);
  return { root, arts, bin, preload };
};
const runCli = (fx, script = gateScript) => {
  const out = join(fx.root, 'out-' + Math.random().toString(16).slice(2));
  const env = { ...process.env, PATH: fx.bin + ':' + process.env.PATH, GITHUB_REPOSITORY: 'review/fixture', GITHUB_TOKEN: 'fixture-not-a-credential' }; delete env.GITHUB_STEP_SUMMARY;
  const r = spawnSync(process.execPath, ['--import', fx.preload, script, '--sha', SHA, '--head-sha', HEAD, '--event', 'pull_request', '--run-id', RUN, '--attempt', '1', '--artifacts', fx.arts, '--e2e', fx.root, '--out', out], { encoding: 'utf8', env });
  return { exit: r.status, stdout: r.stdout + r.stderr, verdict: JSON.parse(readFileSync(join(out, 'merge-eligibility.json'), 'utf8')) };
};
const allGreen = () => goodJobs().map((j) => ({ ...j, conclusion: 'success' }));
test('F1 FULL CLI positive control: healthy collector + twelve complete on-disk artifacts + jobs -> exit 0 ELIGIBLE', () => {
  const r = runCli(cliFixture({ collector: 'good' }));
  assert.equal(r.exit, 0, r.stdout + r.verdict.reasons.join('\n')); assert.equal(r.verdict.eligible, true); assert.match(r.stdout, /::notice title=Coach Core merge eligibility::ELIGIBLE/);
});
test('F1 FULL CLI: erroring collector (exit 1 + JSON errors[]) with zero-result artifacts and twelve green jobs -> nonzero exit, INELIGIBLE, R7 named (reviewer reproduction)', () => {
  const r = runCli(cliFixture({ collector: 'failing', zeroResults: true, jobs: allGreen() }));
  assert.equal(r.exit, 1); assert.equal(r.verdict.eligible, false);
  assert.match(r.verdict.reasons[0], /^R7 could not gather inputs \(fail closed\): membership: playwright --list chromium\/acceptance: collector exited 1/);
  assert.ok(!r.verdict.rows.some((x) => x.required && /legitimately empty/.test(x.verdict)), 'no acceptance row is labelled legitimately empty');
  assert.match(r.stdout, /::error title=Coach Core merge eligibility::INELIGIBLE/);
});
test('F1 FULL CLI: collector that lists NOTHING anywhere (exit 0, no errors) -> nonzero exit, INELIGIBLE (empty acceptance never trusted)', () => {
  const r = runCli(cliFixture({ collector: 'allEmpty', zeroResults: true, jobs: allGreen() }));
  assert.equal(r.exit, 1); assert.match(r.verdict.reasons.join('\n'), /R7 .*acceptance selection is EMPTY on this checkout/);
});
test('F1 FULL CLI reproduction on dbf7a9a: the same erroring collector + zero results gave exit 0 ELIGIBLE', { skip: OLD_SKIP }, () => {
  const r = runCli(cliFixture({ collector: 'failing', zeroResults: true, jobs: allGreen() }), OLD.file);
  assert.equal(r.exit, 0); assert.equal(r.verdict.eligible, true);
});

// ======================================================================================== F2 inventories
test('F2 reader: an artifact written like evidence.sh (complete inventory incl. hidden .last-run.json, e2e/ prefix) verifies; context/results/last-run parsed', () => {
  const d = materialize(A(base(), 'acceptance', 'chromium')); const a = readArtifactDir(d);
  assert.equal(a.uploadOk, true); assert.equal(a.inventoryOk, true, a.inventoryOk); assert.equal(a.inventory.listed, ALL_FILES.length); assert.equal(a.inventory.retained, ALL_FILES.length);
  assert.equal(a.context.sha, SHA); assert.equal(a.lastRun.status, 'passed'); assert.equal(walkSpecs(a.results, 'chromium').length, 65);
  writeFileSync(join(d, 'ci-evidence', 'UPLOAD_OK'), ''); assert.equal(readArtifactDir(d).uploadOk, false);
  assert.equal(parseContext('a=1\nb=x=y\n').b, 'x=y');
});
const f2Cases = () => {
  const art = A(base(), 'acceptance', 'chromium');
  const bare = () => materialize(art, { inventory: 'none' });
  return [
    ['inventory covers ONLY run.log; unlisted results.json then modified (reviewer reproduction)', () => { const d = bare(); writeInventory(d, ['ci-evidence/run.log']); appendFileSync(join(d, 'test-results', 'results.json'), '\n '); return d; }, /retained file test-results\/results\.json is NOT listed/],
    ['listed digest mismatch (tamper after hashing)', () => { const d = materialize(art); appendFileSync(join(d, 'ci-evidence', 'run.context'), 'x=1\n'); return d; }, /digest mismatch for ci-evidence\/run\.context/],
    ['unlisted extra payload file', () => { const d = materialize(art); writeFileSync(join(d, 'test-results', 'smuggled.json'), '{}'); return d; }, /retained file test-results\/smuggled\.json is NOT listed/],
    ['unlisted hidden payload file', () => { const d = materialize(art); writeFileSync(join(d, 'ci-evidence', '.hidden'), 'x'); return d; }, /retained file ci-evidence\/\.hidden is NOT listed/],
    ['listed file missing', () => { const d = materialize(art); rmSync(join(d, 'ci-evidence', 'REDACTION.txt')); return d; }, /listed file ci-evidence\/REDACTION\.txt is missing/],
    ['duplicate inventory entry', () => { const d = bare(); writeInventory(d, ALL_FILES, [`${sha256(readFileSync(join(d, 'ci-evidence', 'run.log')))}  e2e/ci-evidence/run.log`]); return d; }, /inventory lists ci-evidence\/run\.log more than once/],
    ['malformed inventory line (no longer silently filtered)', () => { const d = bare(); writeInventory(d, ALL_FILES, ['not-a-digest  e2e/ci-evidence/run.log']); return d; }, /inventory line \d+ is malformed/],
    ['single-space separator', () => { const d = bare(); writeInventory(d, ALL_FILES, [`${'0'.repeat(64)} e2e/ci-evidence/x`]); return d; }, /inventory line \d+ is malformed/],
    ['path escape ../outside-proof.txt with a matching digest (reviewer reproduction)', () => { const d = bare(); writeFileSync(join(dirname(d), `outside-proof-${process.pid}.txt`), 'public review data'); writeInventory(d, ALL_FILES, [`${sha256('public review data')}  ../outside-proof-${process.pid}.txt`]); return d; }, /path is not a canonical in-artifact path .*\.\.\/outside-proof/],
    ['traversal inside the prefix (e2e/ci-evidence/../../x)', () => { const d = bare(); writeInventory(d, ALL_FILES, [`${'0'.repeat(64)}  e2e/ci-evidence/../../x`]); return d; }, /not a canonical in-artifact path/],
    ['absolute path', () => { const d = bare(); writeInventory(d, ALL_FILES, [`${'0'.repeat(64)}  /etc/hostname`]); return d; }, /not a canonical in-artifact path .*\/etc\/hostname/],
    ['symlink payload pointing outside the artifact', () => { const root = mkdtempSync(join(tmpdir(), 'lnk-')); writeFileSync(join(root, 'secret'), 's'); const d = bare(); symlinkSync(join(root, 'secret'), join(d, 'test-results', 'linked.txt')); writeInventory(d, ALL_FILES, [`${sha256('s')}  e2e/test-results/linked.txt`]); return d; }, /retained path test-results\/linked\.txt is a symbolic link \(rejected, not followed\)/],
    ['inventory lists its own self-exclusion', () => { const d = bare(); writeInventory(d, ALL_FILES, [`${sha256('ok\n')}  e2e/ci-evidence/UPLOAD_OK`]); return d; }, /lists its own self-exclusion ci-evidence\/UPLOAD_OK/],
    ['unexpected top-level entry', () => { const d = materialize(art); writeFileSync(join(d, 'stray.txt'), 'x'); return d; }, /unexpected top-level entry in artifact: stray\.txt/],
    ['required evidence file absent (no .last-run.json at all)', () => { const d = materialize(art); rmSync(join(d, 'test-results', '.last-run.json')); writeInventory(d, ALL_FILES.filter((f) => !f.endsWith('.last-run.json'))); return d; }, /required evidence file test-results\/\.last-run\.json is absent or unlisted/],
    ['no inventory at all', () => bare(), /no inventory/],
    ['empty inventory (comments only)', () => { const d = bare(); writeInventory(d, []); return d; }, /inventory has no digest lines/],
  ];
};
test('F2 reader + evaluator: incomplete, tampered, malformed, duplicate, escaping, symlinked, self-listing or missing inventories -> inventory rejected AND verdict INELIGIBLE (named R3)', () => {
  const k = artifactName('acceptance', 'chromium', SHA);
  for (const [what, mk, re] of f2Cases()) {
    const a = readArtifactDir(mk());
    assert.notEqual(a.inventoryOk, true, `${what}: reader must not verify`); assert.match(a.inventory.problems.join('\n'), re, `${what}: problem named`);
    const b = base(); b.artifacts[k] = a; expectIneligible(b, /R3 E2E acceptance \(chromium\): INVENTORY\.sha256 did not verify/, what);
  }
  assert.equal(canonicalInventoryPath('e2e/ci-evidence/run.log'), 'ci-evidence/run.log');
  for (const p of ['../x', 'e2e/../x', 'e2e/ci-evidence/./x', 'e2e//ci-evidence/x', 'e2e/other/x', 'ci-evidence/run.log', 'e2e\\ci-evidence\\x', 'e2e/ci-evidence', '/e2e/ci-evidence/x']) assert.equal(canonicalInventoryPath(p), null, p);
});
test('F2 reproduction on dbf7a9a: a run.log-only inventory with tampered unlisted results (then ELIGIBLE) and a ../ escape were accepted', { skip: OLD_SKIP }, () => {
  const cases = f2Cases(); const k = artifactName('acceptance', 'chromium', SHA);
  const d1 = cases.find(([w]) => w.startsWith('inventory covers ONLY'))[1]();
  assert.equal(OLD.mod.readArtifactDir(d1).inventoryOk, true); const b = base(); b.artifacts[k] = OLD.mod.readArtifactDir(d1); expectOldEligible(b, 'run.log-only inventory');
  const d2 = cases.find(([w]) => w.startsWith('path escape'))[1]();
  assert.equal(OLD.mod.readArtifactDir(d2).inventoryOk, true, 'dbf7a9a authenticated a file outside the artifact');
});
test('F2 real reader end to end: twelve complete on-disk artifacts -> ELIGIBLE; the same set with one run.log-only inventory -> INELIGIBLE', () => {
  const b = base(); const dirs = onDisk(b);
  const v = evaluate(b); assert.equal(v.eligible, true, reasonsOf(v));
  const k = artifactName('acceptance', 'chromium', SHA); writeInventory(dirs[k], ['ci-evidence/run.log']); b.artifacts[k] = readArtifactDir(dirs[k]);
  expectIneligible(b, /R3 E2E acceptance \(chromium\): INVENTORY\.sha256 did not verify .*NOT listed/, 'run.log-only');
});

// ======================================================================================== N1 retained-root containment
// Filesystem tracer: every path handed to the node:fs calls the reader can use is recorded (CJS fs patched,
// then syncBuiltinESMExports() so the gate's ESM named imports see the patched functions). This proves the
// symlink TARGET is never touched — not merely that the final verdict is INELIGIBLE.
const fsCjs = createRequire(import.meta.url)('node:fs');
const TRACED = ['lstatSync', 'statSync', 'existsSync', 'readdirSync', 'readFileSync', 'openSync', 'realpathSync', 'opendirSync', 'accessSync'];
const traceFs = (fn) => {
  const seen = []; const orig = {};
  for (const k of TRACED) { orig[k] = fsCjs[k]; fsCjs[k] = function traced(p, ...rest) { if (typeof p === 'string' || p instanceof URL || Buffer.isBuffer(p)) seen.push(String(p)); return orig[k].call(this, p, ...rest); }; }
  const origNative = fsCjs.realpathSync.native; fsCjs.realpathSync.native = (p, ...r) => { seen.push(String(p)); return origNative(p, ...r); };
  syncBuiltinESMExports();
  try { return { value: fn(), seen }; } finally { for (const k of TRACED) fsCjs[k] = orig[k]; fsCjs.realpathSync.native = origNative; syncBuiltinESMExports(); }
};
const SENTINEL = 'PUBLIC_OUTSIDE_SENTINEL_' + process.pid;
// A complete, valid outside copy of an artifact (so a follower WOULD find well-formed evidence there).
const rootLinkCase = (roots) => {
  const parent = mkdtempSync(join(tmpdir(), 'rootlink-'));
  const art = A(base(), 'acceptance', 'chromium');
  const outside = materialize({ ...art, context: { ...art.context, sha: SENTINEL } });
  writeFileSync(join(outside, 'test-results', '.last-run.json'), SENTINEL + ' not json'); writeInventory(outside, ALL_FILES);
  const d = join(parent, 'artifact'); renameSync(materialize(art), d);
  for (const r of roots) { rmSync(join(d, r), { recursive: true }); symlinkSync(join(outside, r), join(d, r), 'dir'); }
  return { d, outside };
};
// Any read of a link target goes through a path below the link (or names the target directly); both are traced.
const touched = (seen, outside) => seen.filter((p) => p === outside || p.startsWith(outside + '/'));
test('N1: a symlinked retained root (ci-evidence, test-results, or both) is rejected BEFORE any evidence read — the outside target is never stat-ed, listed, opened or read; no outside content reaches the record or its diagnostics', () => {
  for (const roots of [['ci-evidence'], ['test-results'], ['ci-evidence', 'test-results']]) {
    const { d, outside } = rootLinkCase(roots);
    const { value: a, seen } = traceFs(() => readArtifactDir(d));
    assert.deepEqual(touched(seen, outside), [], `${roots}: outside paths touched: ${touched(seen, outside).join(', ')}`);
    assert.equal(a.containment, 'rejected'); assert.match(a.inventoryOk, new RegExp(`artifact rejected before any evidence read: artifact root ${roots[0]} is a symbolic link`));
    assert.equal(a.uploadOk, false, 'marker not probed through the link'); assert.equal(a.context, null); assert.equal(a.results, null); assert.equal(a.lastRun, null);
    assert.ok(!JSON.stringify(a).includes(SENTINEL) && !JSON.stringify(a).includes('PUBLIC_OUT'), 'no outside content in the record or diagnostics');
    assert.equal(seen.filter((p) => p.startsWith(d + '/ci-evidence/') || p.startsWith(d + '/test-results/')).length, 0, `${roots}: nothing below the roots was accessed`);
    const b = base(); b.artifacts[artifactName('acceptance', 'chromium', SHA)] = a;
    const v = expectIneligible(b, /R3 E2E acceptance \(chromium\): INVENTORY\.sha256 did not verify .*artifact rejected before any evidence read/, `${roots} verdict`);
    assert.ok(!reasonsOf(v).includes(SENTINEL));
  }
});
test('N1: symlinked artifact directory, a symlinked sub-directory inside a root, a missing root and a non-directory root are rejected without following; a valid artifact still verifies and is read only after its inventory verified', () => {
  const art = A(base(), 'acceptance', 'chromium');
  // Artifact directory itself is a link.
  const outside = materialize(art); const p1 = mkdtempSync(join(tmpdir(), 'dirlink-')); symlinkSync(outside, join(p1, 'artifact'), 'dir');
  let r = traceFs(() => readArtifactDir(join(p1, 'artifact')));
  assert.match(r.value.inventoryOk, /artifact directory is not a real directory/); assert.deepEqual(touched(r.seen, outside), []);
  // Sub-directory link inside test-results, with a file under it listed in the inventory.
  const d2 = materialize(art); const o2 = mkdtempSync(join(tmpdir(), 'sublink-')); writeFileSync(join(o2, 'x.json'), SENTINEL);
  symlinkSync(o2, join(d2, 'test-results', 'sub'), 'dir'); writeInventory(d2, ALL_FILES, [`${sha256(SENTINEL)}  e2e/test-results/sub/x.json`]);
  r = traceFs(() => readArtifactDir(d2));
  assert.deepEqual(touched(r.seen, o2), []); assert.match(r.value.inventory.problems.join('\n'), /retained path test-results\/sub is a symbolic link \(rejected, not followed\)/); assert.match(r.value.inventory.problems.join('\n'), /listed file test-results\/sub\/x\.json is missing from the artifact/);
  assert.equal(r.value.context, null, 'unauthenticated evidence is not parsed'); assert.match(r.value.contextProblem, /inventory did not verify/);
  // Missing root / non-directory root.
  const d3 = materialize(art); rmSync(join(d3, 'test-results'), { recursive: true }); assert.match(readArtifactDir(d3).inventoryOk, /artifact root test-results is missing/);
  const d4 = materialize(art); rmSync(join(d4, 'test-results'), { recursive: true }); writeFileSync(join(d4, 'test-results'), 'x'); assert.match(readArtifactDir(d4).inventoryOk, /artifact root test-results is not a directory/);
  // Valid artifact: every read stays inside, decision payloads parsed.
  const d5 = materialize(art); r = traceFs(() => readArtifactDir(d5));
  assert.equal(r.value.inventoryOk, true); assert.equal(r.value.context.sha, SHA); assert.equal(r.value.lastRun.status, 'passed');
  const realD5 = fsCjs.realpathSync(d5); assert.ok(r.seen.every((p) => p === d5 || p.startsWith(d5 + '/') || p === realD5 || p.startsWith(realD5 + '/') || /^\d+$/.test(p)), `every traced access is inside the artifact: ${r.seen.filter((p) => !p.startsWith(d5)).join(', ')}`);
  // Parser exceptions are not echoed into diagnostics.
  const d6 = materialize(art); writeFileSync(join(d6, 'test-results', '.last-run.json'), SENTINEL); writeInventory(d6, ALL_FILES);
  const a6 = readArtifactDir(d6); assert.equal(a6.lastRunProblem, 'unparseable JSON (parser message not echoed)'); assert.ok(!JSON.stringify(a6).includes(SENTINEL.slice(0, 10)));
});
test('N1 reproduction on b139d18: the same root links were followed — outside run.context / results.json parsed and the outside parse error echoed', { skip: PREV_SKIP }, () => {
  const { d, outside } = rootLinkCase(['ci-evidence', 'test-results']);
  const { value: a, seen } = traceFs(() => PREV.mod.readArtifactDir(d));
  assert.notEqual(a.inventoryOk, true, 'b139d18 did reject the inventory');
  const throughLink = seen.filter((p) => p.startsWith(d + '/ci-evidence/') || p.startsWith(d + '/test-results/'));
  assert.ok(throughLink.some((p) => p.endsWith('/run.context')) && throughLink.some((p) => p.endsWith('/results.json')), `b139d18 opened evidence through the linked roots: ${throughLink.join(', ')}`);
  assert.equal(a.context.sha, SENTINEL, 'b139d18 parsed the outside run.context'); assert.match(a.lastRunProblem, /PUBLIC_OUT/, 'b139d18 echoed outside content in diagnostics');
});

// ======================================================================================== F3 identities
const f3Cases = () => [
  ['duplicate acceptance identity with an extra passing execution (reviewer reproduction)', (b) => { const a = A(b, 'acceptance', 'chromium'); a.results.suites[0].specs.push(copy(a.results.suites[0].specs[0])); a.results.stats.expected += 1; }, /R5 E2E acceptance \(chromium\): 1 identity\(ies\) appear more than once/],
  ['foreign-project FAILED test in an allegedly empty phone-diagnostic artifact (reviewer reproduction)', (b) => { const a = A(b, 'diagnostic', 'phone-chromium'); a.results = resultsFor('foreign-project', ['foreign.spec.ts:1:1 foreign test'], { status: 'failed', testStatus: 'unexpected' }); a.lastRun = { status: 'passed', failedTests: [] }; }, /R5 E2E diagnostic \(phone-chromium\): results\.json contains 1 test row\(s\) of other project\(s\) \(foreign-project\)/],
  ['all ten desktop diagnostic identities present but results:[] / skipped (reviewer reproduction)', (b) => { const a = A(b, 'diagnostic', 'chromium'); for (const sp of a.results.suites[0].specs) { sp.tests[0].results = []; sp.tests[0].status = 'skipped'; } a.results.stats = { ...a.results.stats, unexpected: 0, skipped: 10 }; a.lastRun = lastRunFor(a.results); }, /R6 E2E diagnostic \(chromium\): ".*" was not executed to completion \(0 result\(s\)/],
  ['foreign-project row next to a complete acceptance selection', (b) => { const a = A(b, 'acceptance', 'firefox'); a.results.suites[0].specs.push(resultsFor('chromium', ['acc.spec.ts:10:1 ACC-00 does the thing']).suites[0].specs[0]); a.results.stats.expected += 1; }, /R5 E2E acceptance \(firefox\): results\.json contains 1 test row\(s\) of other project\(s\) \(chromium\)/],
  ['interrupted obsolete-fault-model execution', (b) => { const a = A(b, 'obsolete-fault-model', 'firefox'); const t = a.results.suites[0].specs[0].tests[0]; t.results = [{ status: 'interrupted' }]; t.status = 'skipped'; a.results.stats = { ...a.results.stats, unexpected: 0, skipped: 1 }; a.lastRun = { status: 'interrupted', failedTests: [] }; }, /R6 E2E obsolete-fault-model \(firefox\): ".*" was not executed to completion \(1 result\(s\) \[interrupted\]/],
  ['unexpected extra identity in acceptance', (b) => { const a = A(b, 'acceptance', 'phone-firefox'); a.results.suites[0].specs.push(resultsFor('phone-firefox', ['x.spec.ts:1:1 X-99 surprise']).suites[0].specs[0]); a.results.stats.expected += 1; }, /R5 E2E acceptance \(phone-firefox\): executed identities != membership \(missing 0, extra 1\)/],
  ['duplicate identity in the SOURCE membership', (b) => { b.membership.chromium.diagnostic.ids.push(b.membership.chromium.diagnostic.ids[0]); }, /R5 E2E diagnostic \(chromium\): source membership lists a duplicate identity/],
  ['spec without a stable id', (b) => { delete A(b, 'acceptance', 'chromium').results.suites[0].specs[3].id; }, /R6 E2E acceptance \(chromium\): spec ".*" has no stable id/],
  ['stats disagree with per-test outcomes', (b) => { A(b, 'acceptance', 'chromium').results.stats.expected = 99; }, /R6 E2E acceptance \(chromium\): results\.json stats\.expected=99 but 65 test\(s\)/],
  ['unknown result status', (b) => { A(b, 'acceptance', 'chromium').results.suites[0].specs[0].tests[0].results[0].status = 'great'; }, /result with status "great"/],
];
test('F3: duplicate, foreign-project, unexpected, unexecuted, interrupted and malformed identities -> INELIGIBLE with named reasons; completed diagnostic failures remain visible and non-blocking', () => {
  for (const [what, mut, re] of f3Cases()) { const b = base(); mut(b); expectIneligible(b, re, what); }
  const ok = evaluate(base()); assert.equal(ok.eligible, true); assert.match(ok.rows.find((r) => r.job === 'E2E obsolete-fault-model (chromium)').verdict, /1 failing obsolete-fault-model test\(s\) visible, not blocking/);
});
test('F3 reproduction on dbf7a9a: duplicate identity, foreign-project row in an empty artifact and zero completed diagnostic results were ELIGIBLE', { skip: OLD_SKIP }, () => {
  for (const [what, mut] of f3Cases().slice(0, 3)) { const b = base(); mut(b); expectOldEligible(b, what); }
});

// ======================================================================================== F4 last-run
const f4Cases = () => [
  ['acceptance .last-run.json missing (lastRun:null; reviewer reproduction)', (b) => { const a = A(b, 'acceptance', 'chromium'); a.lastRun = null; a.lastRunProblem = 'missing'; }, /R6 E2E acceptance \(chromium\): \.last-run\.json missing/],
  ['acceptance .last-run.json unparseable', (b) => { const a = A(b, 'acceptance', 'chromium'); a.lastRun = null; a.lastRunProblem = 'unparseable (Unexpected token)'; }, /R6 E2E acceptance \(chromium\): \.last-run\.json unparseable/],
  ['status not in the schema', (b) => { A(b, 'acceptance', 'chromium').lastRun = { status: 'ok', failedTests: [] }; }, /\.last-run\.json status "ok" is not one of/],
  ['failedTests not an array', (b) => { A(b, 'acceptance', 'chromium').lastRun = { status: 'passed' }; }, /failedTests is not an array of test ids/],
  ['acceptance last-run failed while results are all green', (b) => { A(b, 'acceptance', 'firefox').lastRun = { status: 'failed', failedTests: [] }; }, /R6 E2E acceptance \(firefox\): \.last-run\.json status failed although results\.json shows no failure/],
  ['acceptance last-run passed but records failed ids', (b) => { const a = A(b, 'acceptance', 'firefox'); a.lastRun = { status: 'passed', failedTests: [a.results.suites[0].specs[0].id] }; }, /failedTests do not reconcile .*1 recorded id\(s\) not failed/],
  ['acceptance last-run interrupted', (b) => { A(b, 'acceptance', 'phone-chromium').lastRun = { status: 'interrupted', failedTests: [] }; }, /\.last-run\.json status interrupted \(run did not complete/],
  ['diagnostic last-run omits one of its failing tests', (b) => { const a = A(b, 'diagnostic', 'chromium'); a.lastRun = { status: 'failed', failedTests: a.lastRun.failedTests.slice(1) }; }, /R6 E2E diagnostic \(chromium\): \.last-run\.json failedTests do not reconcile .*1 failed\/not-run test\(s\) not recorded/],
  ['diagnostic last-run passed although its tests failed', (b) => { A(b, 'diagnostic', 'firefox').lastRun = { status: 'passed', failedTests: [] }; }, /R6 E2E diagnostic \(firefox\): \.last-run\.json status passed although results\.json shows failures/],
  ['diagnostic job concluded success although its last-run failed (job conclusion reconciliation)', (b) => { b.jobs.find((j) => j.name === 'E2E diagnostic (chromium)').conclusion = 'success'; }, /R2 E2E diagnostic \(chromium\): job concluded success although \.last-run\.json status is failed/],
  ['legitimately empty bucket with a failed last-run', (b) => { A(b, 'obsolete-fault-model', 'phone-firefox').lastRun = { status: 'failed', failedTests: [] }; }, /R5 E2E obsolete-fault-model \(phone-firefox\): empty selection but \.last-run\.json is not a clean pass/],
];
test('F4: missing, malformed, schema-invalid or inconsistent last-run records (vs results.json and job conclusion) -> INELIGIBLE with named reasons', () => {
  for (const [what, mut, re] of f4Cases()) { const b = base(); mut(b); expectIneligible(b, re, what); }
});
test('F4 real reader: a malformed .last-run.json with a MATCHING complete inventory is still rejected (hash integrity is not validity)', () => {
  const b = base(); const k = artifactName('acceptance', 'chromium', SHA); const d = materialize(A(b, 'acceptance', 'chromium'));
  writeFileSync(join(d, 'test-results', '.last-run.json'), '{invalid'); writeInventory(d, ALL_FILES);
  const a = readArtifactDir(d); assert.equal(a.inventoryOk, true, 'inventory itself verifies'); assert.equal(a.lastRun, null); assert.match(a.lastRunProblem, /^unparseable/);
  b.artifacts[k] = a; expectIneligible(b, /R6 E2E acceptance \(chromium\): \.last-run\.json unparseable/, 'malformed last-run, matching hashes');
});
test('F4 reproduction on dbf7a9a: lastRun:null and a real malformed .last-run.json with a matching inventory were ELIGIBLE', { skip: OLD_SKIP }, () => {
  const b1 = base(); A(b1, 'acceptance', 'chromium').lastRun = null; expectOldEligible(b1, 'lastRun null');
  const b2 = base(); const k = artifactName('acceptance', 'chromium', SHA); const d = materialize(A(b2, 'acceptance', 'chromium'));
  writeFileSync(join(d, 'test-results', '.last-run.json'), '{invalid'); writeInventory(d, ALL_FILES);
  b2.artifacts[k] = OLD.mod.readArtifactDir(d); expectOldEligible(b2, 'malformed last-run');
});

// ======================================================================================== workflow contract
test('workflow contract: aggregate job exists with the exact check name, needs the matrix, never runs on a cancelled run, downloads only this sha\'s artifacts, triggers cover pull_request (incl. ready_for_review) and merge_group, every e2e job writes run.context, and the inventory the gate requires is the one B15 writes', () => {
  const wf = readFileSync(join(repo, '.github', 'workflows', 'e2e-emulator.yml'), 'utf8');
  assert.match(wf, /merge-eligibility:\n\s+name: Coach Core merge eligibility\n\s+needs: e2e\n(?:\s+#.*\n)*\s+if: \$\{\{ always\(\) \}\}\n/);
  assert.match(wf, /pattern: e2e-results-\*-\$\{\{ github\.sha \}\}/);
  assert.match(wf, /node e2e\/scripts\/merge-eligibility\.mjs \\\n\s+--sha "\$GITHUB_SHA" --head-sha "\$CANDIDATE_HEAD_SHA" --event "\$GITHUB_EVENT_NAME"/);
  assert.match(wf, /--run-id "\$GITHUB_RUN_ID" --attempt "\$GITHUB_RUN_ATTEMPT"/);
  assert.match(wf, /node e2e\/scripts\/merge-eligibility\.test\.mjs/);
  assert.match(wf, /pull_request:\n\s+branches: \[recovery\/coach-core-mvp-2026\]\n(?:\s+#.*\n)*\s+types: \[opened, synchronize, reopened, ready_for_review\]/);
  assert.match(wf, /merge_group:\n\s+types: \[checks_requested\]/);
  assert.match(wf, /> e2e\/ci-evidence\/run\.context/);
  assert.match(wf, /CANDIDATE_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.event\.merge_group\.head_sha \|\| github\.sha \}\}/);
  // B11/B15 accepted contract untouched: 12-job matrix, bucket env, gated upload, both upload paths incl. hidden files.
  assert.match(wf, /project: \[chromium, firefox, phone-chromium, phone-firefox\]\n\s+bucket: \[acceptance, diagnostic, obsolete-fault-model\]/);
  assert.match(wf, /if: always\(\) && steps\.finalize\.outputs\.eligible == 'true'/);
  assert.match(wf, /path: \|\n\s+e2e\/test-results\n\s+e2e\/ci-evidence\n\s+include-hidden-files: true/);
  assert.match(wf, /permissions:\n\s+contents: read\n\s+actions: read/);
  const ev = readFileSync(join(repo, 'e2e', 'scripts', 'evidence.sh'), 'utf8');
  assert.match(ev, /find "\$root" -type f ! -name INVENTORY\.sha256 ! -name '\.INVENTORY\.sha256\.tmp' ! -name '\.INVENTORY\.entries\.tmp' ! -name UPLOAD_OK/);
});

test('N2 workflow logic (static check of the workflow file, NOT an Actions observation): the authoritative job has no conditional-skip path — job and every step run under always(), a cancelled run or a cancelled/skipped matrix fails the job explicitly, an unavailable artifact download cannot skip the evaluation, and only the evaluation step can make the job succeed', () => {
  const wf = readFileSync(join(repo, '.github', 'workflows', 'e2e-emulator.yml'), 'utf8');
  const job = wf.slice(wf.indexOf('  merge-eligibility:\n'));
  assert.ok(job.length > 100, 'aggregate job present and last in the file');
  const jobIf = /\n    if: (.*)\n/.exec(job)[1];
  assert.equal(jobIf, '${{ always() }}', 'job-level condition is exactly always(): no !cancelled(), success() or other skip path');
  assert.doesNotMatch(job.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n'), /!cancelled\(\)|if: \$\{\{ success\(\)|if: success\(\)|if: \$\{\{ github\.event_name/, 'no condition anywhere in the job can skip it on cancel/event');
  const steps = job.split('\n      - ').slice(1);
  assert.ok(steps.length >= 8, `steps found: ${steps.length}`);
  const guard = steps[0];
  assert.match(guard, /^name: Fail closed when the run was cancelled or the matrix did not complete/);
  // Status functions are valid only in `if:` (an env use of cancelled() is rejected by Actions at parse time — observed).
  assert.match(guard, /\n        if: \$\{\{ cancelled\(\) \|\| needs\.e2e\.result == 'cancelled' \|\| needs\.e2e\.result == 'skipped' \}\}\n/);
  assert.match(guard, /\n          exit 1(\n|$)/); assert.doesNotMatch(guard, /\$\{\{ cancelled\(\) \}\}/);
  for (const st of steps.slice(1)) assert.match(st, /\n        if: (\$\{\{ always\(\) \}\}|always\(\))(\n|$)/, `every other step runs under always(): ${st.split('\n')[0]}`);
  assert.doesNotMatch(job.replace(/\n\s*#.*/g, ''), /env:\n(?:\s+\w+: .*\n)*\s+\w+: \$\{\{ (cancelled|success|failure|always)\(\)/, 'no status function outside if:');
  const dl = steps.find((st) => st.startsWith('uses: actions/download-artifact@v4'));
  assert.match(dl, /continue-on-error: true/, 'missing artifacts reach the evaluator (R3) instead of skipping it');
  assert.equal(steps.filter((st) => /continue-on-error: true/.test(st)).length, 1, 'only the download may continue on error; the guard, self-checks and evaluation cannot');
  assert.match(steps.find((st) => st.startsWith('name: Evaluate merge eligibility')), /node e2e\/scripts\/merge-eligibility\.mjs/);
  // The evaluator itself exits nonzero for every non-ELIGIBLE verdict and on crash (fail closed).
  const gate = readFileSync(join(here, 'merge-eligibility.mjs'), 'utf8');
  assert.match(gate, /process\.exit\(verdict\.eligible \? 0 : 1\)/); assert.match(gate, /gate crashed \(fail closed\).*\n?.*process\.exit\(1\)/);
});

