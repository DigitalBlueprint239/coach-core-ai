// Focused checks for the merge-eligibility aggregate. Run: `node e2e/scripts/merge-eligibility.test.mjs`
// These are EXECUTABLE FIXTURES against the pure evaluate() decision and the artifact reader — not
// GitHub Actions executions. What Actions itself does (job conclusions, cancellation, download) is
// evidenced separately by bounded workflow runs and stated as such in the delivery record.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { evaluate, readArtifactDir, parseContext, walkSpecs, PROJECTS, BUCKETS, jobName, artifactName, TRUSTED_EVENTS } from './merge-eligibility.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const SHA = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);
const RUN = '123456789';

// Source-shaped membership: desktop 65/10/1, phone 15/0/0 (counts as verified on efc9116; identities synthetic).
const ids = (prefix, n, tag = '') => Array.from({ length: n }, (_, i) => `${prefix}.spec.ts:${10 + i}:1 ${prefix.toUpperCase()}-${String(i).padStart(2, '0')}${tag} does the thing`);
const membershipFor = () => {
  const m = {};
  for (const p of PROJECTS) {
    const phone = p.startsWith('phone-');
    m[p] = {
      acceptance: ids(phone ? 'phone' : 'acc', phone ? 15 : 65),
      diagnostic: phone ? [] : ids('diag', 10, ' [diagnostic]'),
      'obsolete-fault-model': phone ? [] : ids('obs', 1, ' [obsolete-fault-model]'),
    };
  }
  return m;
};
// results.json shaped like Playwright 1.64 JSON, built from identities.
const resultsFor = (project, identities, { repeat = 1, status = 'passed', testStatus = 'expected', dropLast = 0 } = {}) => {
  const specs = identities.slice(0, identities.length - dropLast).map((id) => {
    const [loc, ...title] = id.split(' '); const [file, line, column] = loc.split(':');
    return { title: title.join(' '), file, line: Number(line), column: Number(column), tests: [{ projectName: project, expectedStatus: 'passed', status: testStatus, results: Array.from({ length: repeat }, () => ({ status, duration: 5 })) }] };
  });
  const unexpected = specs.filter((s) => s.tests[0].status !== 'expected').length;
  return { config: {}, suites: [{ title: 'root', file: 'x', specs, suites: [] }], errors: [], stats: { expected: specs.length - unexpected, unexpected, skipped: 0, flaky: 0 } };
};
const ctxFor = (project, bucket, over = {}) => ({ sha: SHA, head_sha: HEAD, event: 'pull_request', run_id: RUN, run_attempt: '1', project, bucket, repeat: '1', grep: '', ...over });
const goodJobs = () => PROJECTS.flatMap((p) => BUCKETS.map((b) => ({ name: jobName(b, p), status: 'completed', conclusion: b === 'acceptance' ? 'success' : (p.startsWith('phone-') ? 'success' : 'failure') })));
const goodArtifacts = (m) => {
  const a = {};
  for (const p of PROJECTS) for (const b of BUCKETS) {
    const idsPB = m[p][b];
    // Desktop diagnostic/obsolete: one failing test to prove visible-but-not-blocking.
    const failing = b !== 'acceptance' && idsPB.length > 0;
    const results = resultsFor(p, idsPB, failing ? { status: 'timedOut', testStatus: 'unexpected' } : {});
    a[artifactName(b, p, SHA)] = { uploadOk: true, inventoryOk: true, context: ctxFor(p, b), results, lastRun: { status: failing ? 'failed' : 'passed', failedTests: [] } };
  }
  return a;
};
const base = (over = {}) => { const m = membershipFor(); return { sha: SHA, headSha: HEAD, event: 'pull_request', runId: RUN, attempt: '1', expectedRepeat: 1, jobs: goodJobs(), membership: m, artifacts: goodArtifacts(m), ...over }; };
const reasonsOf = (v) => v.reasons.join('\n');

test('complete successful acceptance (pull_request): ELIGIBLE; diagnostic/obsolete failures visible, not blocking; phone empties legitimately empty', () => {
  const v = evaluate(base());
  assert.equal(v.eligible, true, reasonsOf(v));
  assert.equal(v.rows.length, 12);
  assert.ok(v.rows.filter((r) => r.required).every((r) => r.verdict === 'OK' && r.passed === r.selected && r.failed === 0));
  assert.ok(v.rows.filter((r) => r.job === 'E2E diagnostic (chromium)')[0].verdict.includes('10 failing diagnostic test(s) visible, not blocking'));
  const empty = v.rows.filter((r) => r.project.startsWith('phone-') && !r.required);
  assert.equal(empty.length, 4);
  for (const r of empty) { assert.equal(r.selected, 0); assert.equal(r.executed, 0); assert.equal(r.passed, 0); assert.match(r.verdict, /legitimately empty: 0 selected, 0 executed, 0 passed/); }
});

test('merge_group is a trusted event too; workflow_dispatch and push are NOT (bounded/manual runs cannot satisfy the gate)', () => {
  assert.deepEqual(TRUSTED_EVENTS, ['pull_request', 'merge_group']);
  const m = membershipFor();
  const mg = { ...base(), event: 'merge_group', artifacts: Object.fromEntries(Object.entries(goodArtifacts(m)).map(([k, a]) => [k, { ...a, context: { ...a.context, event: 'merge_group' } }])) };
  assert.equal(evaluate(mg).eligible, true, reasonsOf(evaluate(mg)));
  for (const ev of ['workflow_dispatch', 'push']) {
    const v = evaluate({ ...base(), event: ev, artifacts: Object.fromEntries(Object.entries(goodArtifacts(m)).map(([k, a]) => [k, { ...a, context: { ...a.context, event: ev } }])) });
    assert.equal(v.eligible, false);
    assert.match(reasonsOf(v), /R1 event "(workflow_dispatch|push)" is not a trusted merge event/);
  }
});

test('one failed required job (acceptance firefox) -> INELIGIBLE, named', () => {
  const b = base();
  b.jobs.find((j) => j.name === 'E2E acceptance (firefox)').conclusion = 'failure';
  const art = b.artifacts[artifactName('acceptance', 'firefox', SHA)];
  art.results = resultsFor('firefox', b.membership.firefox.acceptance, { status: 'failed', testStatus: 'unexpected' }); art.lastRun = { status: 'failed' };
  const v = evaluate(b);
  assert.equal(v.eligible, false);
  assert.match(reasonsOf(v), /R2 E2E acceptance \(firefox\): required acceptance job concluded "failure"/);
  assert.ok(v.rows.filter((r) => r.job !== 'E2E acceptance (firefox)' && r.required).every((r) => r.verdict === 'OK'), 'other required rows unaffected');
});

test('failing acceptance TESTS with a (hypothetically) green job are still caught from results.json (R6)', () => {
  const b = base();
  const art = b.artifacts[artifactName('acceptance', 'chromium', SHA)];
  art.results = resultsFor('chromium', b.membership.chromium.acceptance, { status: 'failed', testStatus: 'unexpected' });
  const v = evaluate(b);
  assert.equal(v.eligible, false);
  assert.match(reasonsOf(v), /R6 E2E acceptance \(chromium\): ".*" result status failed/);
});

test('cancelled required job -> INELIGIBLE; cancelled NON-required job also blocks (coverage unproven)', () => {
  const b1 = base(); b1.jobs.find((j) => j.name === 'E2E acceptance (phone-chromium)').conclusion = 'cancelled'; delete b1.artifacts[artifactName('acceptance', 'phone-chromium', SHA)];
  const v1 = evaluate(b1); assert.equal(v1.eligible, false); assert.match(reasonsOf(v1), /R2 E2E acceptance \(phone-chromium\): required acceptance job concluded "cancelled"/);
  const b2 = base(); b2.jobs.find((j) => j.name === 'E2E diagnostic (firefox)').conclusion = 'cancelled';
  const v2 = evaluate(b2); assert.equal(v2.eligible, false); assert.match(reasonsOf(v2), /R2 E2E diagnostic \(firefox\): job concluded "cancelled"/);
});

test('skipped job -> INELIGIBLE; in-progress (not completed) job -> INELIGIBLE', () => {
  const b1 = base(); const j = b1.jobs.find((x) => x.name === 'E2E obsolete-fault-model (chromium)'); j.conclusion = 'skipped';
  const v1 = evaluate(b1); assert.equal(v1.eligible, false); assert.match(reasonsOf(v1), /R2 E2E obsolete-fault-model \(chromium\): job concluded "skipped"/);
  const b2 = base(); const k = b2.jobs.find((x) => x.name === 'E2E acceptance (chromium)'); k.status = 'in_progress'; k.conclusion = null;
  const v2 = evaluate(b2); assert.equal(v2.eligible, false); assert.match(reasonsOf(v2), /R2 E2E acceptance \(chromium\): job not completed \(status in_progress\)/);
});

test('missing required job, duplicate job, and missing artifact -> INELIGIBLE', () => {
  const b1 = base(); b1.jobs = b1.jobs.filter((j) => j.name !== 'E2E acceptance (firefox)');
  assert.match(reasonsOf(evaluate(b1)), /R2 E2E acceptance \(firefox\): job missing from this run/);
  const b2 = base(); b2.jobs.push({ name: 'E2E acceptance (firefox)', status: 'completed', conclusion: 'success' });
  assert.match(reasonsOf(evaluate(b2)), /R2 E2E acceptance \(firefox\): 2 jobs with this name/);
  const b3 = base(); delete b3.artifacts[artifactName('acceptance', 'chromium', SHA)];
  const v3 = evaluate(b3); assert.equal(v3.eligible, false); assert.match(reasonsOf(v3), /R3 E2E acceptance \(chromium\): evidence artifact e2e-results-acceptance-chromium-a{40} missing/);
});

test('finalize not successful (no UPLOAD_OK) or inventory mismatch in ANY job -> INELIGIBLE', () => {
  const b1 = base(); b1.artifacts[artifactName('diagnostic', 'chromium', SHA)].uploadOk = false;
  assert.match(reasonsOf(evaluate(b1)), /R3 E2E diagnostic \(chromium\): UPLOAD_OK marker absent/);
  const b2 = base(); b2.artifacts[artifactName('acceptance', 'phone-firefox', SHA)].inventoryOk = '1 of 6 listed digests do not match retained bytes';
  assert.match(reasonsOf(evaluate(b2)), /R3 E2E acceptance \(phone-firefox\): INVENTORY.sha256 did not verify .*1 of 6/);
});

test('narrowed dispatch selection: grep recorded in run.context AND identities != membership -> INELIGIBLE (even with all-green results)', () => {
  const b = base();
  const art = b.artifacts[artifactName('acceptance', 'chromium', SHA)];
  art.context = ctxFor('chromium', 'acceptance', { grep: 'D10-01' });
  art.results = resultsFor('chromium', b.membership.chromium.acceptance.slice(0, 1));
  const v = evaluate(b);
  assert.equal(v.eligible, false);
  assert.match(reasonsOf(v), /R5 E2E acceptance \(chromium\): a dispatch grep "D10-01" narrowed the selection/);
  assert.match(reasonsOf(v), /R5 E2E acceptance \(chromium\): executed identities != membership \(missing 64, extra 0\)/);
  // Narrowing WITHOUT a recorded grep (e.g. a hand-edited run) is still caught by the identity comparison alone.
  const b2 = base(); b2.artifacts[artifactName('acceptance', 'firefox', SHA)].results = resultsFor('firefox', b2.membership.firefox.acceptance, { dropLast: 3 });
  assert.match(reasonsOf(evaluate(b2)), /R5 E2E acceptance \(firefox\): executed identities != membership \(missing 3, extra 0\)/);
});

test('legitimate empty selection: membership 0 + results 0 -> OK; membership > 0 with zero executions -> INELIGIBLE (zero never masquerades as passing)', () => {
  const ok = evaluate(base());
  assert.match(ok.rows.find((r) => r.job === 'E2E diagnostic (phone-chromium)').verdict, /legitimately empty/);
  // Acceptance phone-chromium with zero executions although 15 tests are expected.
  const b = base(); b.artifacts[artifactName('acceptance', 'phone-chromium', SHA)].results = resultsFor('phone-chromium', []);
  const v = evaluate(b);
  assert.equal(v.eligible, false);
  assert.match(reasonsOf(v), /R5 E2E acceptance \(phone-chromium\): executed identities != membership \(missing 15, extra 0\)/);
  const row = v.rows.find((r) => r.job === 'E2E acceptance (phone-chromium)');
  assert.equal(row.executed, 0); assert.notEqual(row.verdict, 'OK');
  // Membership 0 but results contain tests -> also rejected (membership drift).
  const b2 = base(); b2.artifacts[artifactName('diagnostic', 'phone-firefox', SHA)].results = resultsFor('phone-firefox', ids('x', 1));
  assert.match(reasonsOf(evaluate(b2)), /R5 E2E diagnostic \(phone-firefox\): executed identities != membership \(missing 0, extra 1\)/);
});

test('results belonging to a different sha / run / attempt / head -> INELIGIBLE', () => {
  const other = 'c'.repeat(40);
  const b1 = base(); b1.artifacts[artifactName('acceptance', 'chromium', SHA)].context = ctxFor('chromium', 'acceptance', { sha: other });
  assert.match(reasonsOf(evaluate(b1)), new RegExp(`R4 E2E acceptance \\(chromium\\): artifact sha ${other} != candidate ${SHA}`));
  const b2 = base(); b2.artifacts[artifactName('acceptance', 'chromium', SHA)].context = ctxFor('chromium', 'acceptance', { run_attempt: '2' });
  assert.match(reasonsOf(evaluate(b2)), /artifact run_attempt 2 != 1 \(stale artifact from another attempt\)/);
  const b3 = base(); b3.artifacts[artifactName('acceptance', 'chromium', SHA)].context = ctxFor('chromium', 'acceptance', { run_id: '42' });
  assert.match(reasonsOf(evaluate(b3)), /artifact run_id 42 != 123456789/);
  const b4 = base(); b4.artifacts[artifactName('acceptance', 'chromium', SHA)].context = ctxFor('chromium', 'acceptance', { head_sha: other });
  assert.match(reasonsOf(evaluate(b4)), new RegExp(`artifact head_sha ${other} != ${HEAD}`));
  // Artifacts named for another sha are simply not found for this candidate.
  const b5 = base(); b5.artifacts = Object.fromEntries(Object.entries(b5.artifacts).map(([k, v]) => [k.replace(SHA, other), v]));
  const v5 = evaluate(b5); assert.equal(v5.eligible, false); assert.equal(v5.reasons.filter((r) => /R3 .*artifact .* missing/.test(r)).length, 12);
});

test('repeat mismatch and run-level errors -> INELIGIBLE; non-expected test status in acceptance -> INELIGIBLE', () => {
  const b1 = base(); b1.artifacts[artifactName('acceptance', 'chromium', SHA)].context = ctxFor('chromium', 'acceptance', { repeat: '10' });
  assert.match(reasonsOf(evaluate(b1)), /R4 E2E acceptance \(chromium\): repeat 10 != expected 1/);
  const b2 = base(); b2.artifacts[artifactName('acceptance', 'firefox', SHA)].results.errors = [{ message: 'global setup failed' }];
  assert.match(reasonsOf(evaluate(b2)), /R6 E2E acceptance \(firefox\): results.json reports 1 run-level error/);
  const b3 = base(); b3.artifacts[artifactName('acceptance', 'firefox', SHA)].results = resultsFor('firefox', b3.membership.firefox.acceptance, { status: 'skipped', testStatus: 'skipped' });
  assert.match(reasonsOf(evaluate(b3)), /R6 E2E acceptance \(firefox\): ".*" result status skipped/);
  const b4 = base(); b4.artifacts[artifactName('acceptance', 'firefox', SHA)].results = resultsFor('firefox', b4.membership.firefox.acceptance, { repeat: 2 });
  assert.match(reasonsOf(evaluate(b4)), /has 2 result\(s\), expected 1/);
});

test('readArtifactDir: real on-disk artifact layout (ci-evidence + test-results, inventory paths prefixed e2e/) -> UPLOAD_OK, verified digests, parsed context/results', () => {
  const d = mkdtempSync(join(tmpdir(), 'art-')); mkdirSync(join(d, 'ci-evidence')); mkdirSync(join(d, 'test-results'));
  const files = { 'ci-evidence/run.log': 'line Bearer [REDACTED]\n', 'ci-evidence/run.exit': 'exit=0\n', 'ci-evidence/run.context': `sha=${SHA}\nhead_sha=${HEAD}\nevent=pull_request\nrun_id=${RUN}\nrun_attempt=1\nproject=chromium\nbucket=acceptance\nrepeat=1\ngrep=\n`, 'ci-evidence/release-build-manifest.sha256': 'abc  f\n', 'test-results/results.json': JSON.stringify(resultsFor('chromium', ids('acc', 2))), 'test-results/.last-run.json': '{"status":"passed","failedTests":[]}' };
  for (const [p, c] of Object.entries(files)) writeFileSync(join(d, p), c);
  const inv = ['# comment', ...Object.keys(files).map((p) => `${createHash('sha256').update(readFileSync(join(d, p))).digest('hex')}  e2e/${p}`)].join('\n') + '\n';
  writeFileSync(join(d, 'ci-evidence', 'INVENTORY.sha256'), inv); writeFileSync(join(d, 'ci-evidence', 'UPLOAD_OK'), 'ok\n');
  const a = readArtifactDir(d);
  assert.equal(a.uploadOk, true); assert.equal(a.inventoryOk, true);
  assert.equal(a.context.sha, SHA); assert.equal(a.context.grep, ''); assert.equal(a.context.bucket, 'acceptance');
  assert.equal(walkSpecs(a.results, 'chromium').length, 2); assert.equal(a.lastRun.status, 'passed');
  // Tamper with a retained file after hashing -> inventory no longer verifies; no UPLOAD_OK -> uploadOk false.
  writeFileSync(join(d, 'ci-evidence', 'run.log'), 'changed\n');
  assert.match(String(readArtifactDir(d).inventoryOk), /1 of 6 listed digests do not match/);
  writeFileSync(join(d, 'ci-evidence', 'UPLOAD_OK'), '');
  assert.equal(readArtifactDir(d).uploadOk, false);
  assert.equal(parseContext('a=1\nb=x=y\n').b, 'x=y');
});

test('workflow contract: aggregate job exists with the exact check name, needs the matrix, never runs on a cancelled run, downloads only this sha\'s artifacts, triggers cover pull_request (incl. ready_for_review) and merge_group, and every e2e job writes run.context', () => {
  const wf = readFileSync(join(repo, '.github', 'workflows', 'e2e-emulator.yml'), 'utf8');
  assert.match(wf, /merge-eligibility:\n\s+name: Coach Core merge eligibility\n\s+needs: e2e\n(?:\s+#.*\n)*\s+if: \$\{\{ always\(\) && !cancelled\(\) \}\}/);
  assert.match(wf, /pattern: e2e-results-\*-\$\{\{ github\.sha \}\}/);
  assert.match(wf, /node e2e\/scripts\/merge-eligibility\.mjs \\\n\s+--sha "\$GITHUB_SHA" --head-sha "\$CANDIDATE_HEAD_SHA" --event "\$GITHUB_EVENT_NAME"/);
  assert.match(wf, /--run-id "\$GITHUB_RUN_ID" --attempt "\$GITHUB_RUN_ATTEMPT"/);
  assert.match(wf, /node e2e\/scripts\/merge-eligibility\.test\.mjs/);
  assert.match(wf, /pull_request:\n\s+branches: \[recovery\/coach-core-mvp-2026\]\n(?:\s+#.*\n)*\s+types: \[opened, synchronize, reopened, ready_for_review\]/);
  assert.match(wf, /merge_group:\n\s+types: \[checks_requested\]/);
  assert.match(wf, /> e2e\/ci-evidence\/run\.context/);
  assert.match(wf, /CANDIDATE_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.event\.merge_group\.head_sha \|\| github\.sha \}\}/);
  // B11/B15 accepted contract untouched: 12-job matrix, bucket env, gated upload, both upload paths.
  assert.match(wf, /project: \[chromium, firefox, phone-chromium, phone-firefox\]\n\s+bucket: \[acceptance, diagnostic, obsolete-fault-model\]/);
  assert.match(wf, /if: always\(\) && steps\.finalize\.outputs\.eligible == 'true'/);
  assert.match(wf, /permissions:\n\s+contents: read\n\s+actions: read/);
});
