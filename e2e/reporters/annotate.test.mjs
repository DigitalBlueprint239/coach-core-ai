// Focused checks for the CI annotation reporter (B11 review, 2026-10-17).
// Run: `node --test e2e/reporters/annotate.test.mjs`. No browser, no emulator.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Reporter from './annotate.mjs';

const fakeTest = (title, project, annotations = []) => ({
  title, annotations, repeatEachIndex: 0,
  parent: { project: () => ({ name: project }) },
  outcome: () => 'expected',
});
const fakeResult = (status, extra = {}) => ({ status, duration: 1234, steps: [], errors: [], annotations: [], ...extra });

/** Run the reporter in a GitHub-Actions-shaped environment and capture stdout + the summary file. */
function run({ env = {}, begin, ends = [], runStatus = 'passed' }) {
  const saved = { ...process.env };
  const dir = mkdtempSync(join(tmpdir(), 'annotate-'));
  const summaryPath = join(dir, 'summary.md');
  writeFileSync(summaryPath, '');
  Object.assign(process.env, { GITHUB_ACTIONS: 'true', GITHUB_STEP_SUMMARY: summaryPath }, env);
  for (const k of ['E2E_BUCKET', 'PROJECT']) if (!(k in env)) delete process.env[k];
  const out = [];
  const write = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk) => { out.push(String(chunk)); return true; };
  try {
    const r = new Reporter();
    if (begin) r.onBegin(begin.config, begin.suite);
    for (const [t, res] of ends) r.onTestEnd(t, res);
    r.onEnd({ status: runStatus });
  } finally {
    process.stdout.write = write;
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
  return { stdout: out.join(''), summary: readFileSync(summaryPath, 'utf8') };
}
const emptySuite = { allTests: () => [] };
const config = { projects: [{ name: 'chromium' }, { name: 'phone-chromium' }] };

test('empty job: explicit zero-tests annotation and summary row; never "passed"', () => {
  const { stdout, summary } = run({ env: { E2E_BUCKET: 'diagnostic', PROJECT: 'phone-chromium' }, begin: { config, suite: emptySuite } });
  assert.match(stdout, /::notice title=E2E phone-chromium \[diagnostic\]: 0 tests selected \(empty selection; nothing ran\)::/);
  assert.match(stdout, /0 tests selected%2C 0 executed%2C 0 passed%2C 0 failed|0 tests selected, 0 executed, 0 passed, 0 failed/);
  assert.match(stdout, /no "diagnostic" tests exist for this project/);
  assert.doesNotMatch(stdout, /\d+ passed \/ \d+ failed/, 'an empty job must not print a pass/fail tally');
  assert.match(summary, /\| phone-chromium \[diagnostic\] \| 0 tests selected \| — \| — \| — \| empty selection/);
  assert.doesNotMatch(summary, /\| phone-chromium \[diagnostic\] \| [1-9]/);
});

test('empty job without a bucket (local/all) still names the project and reason', () => {
  const { stdout } = run({ env: { PROJECT: 'phone-firefox' }, begin: { config, suite: emptySuite } });
  assert.match(stdout, /E2E phone-firefox: 0 tests selected/);
  assert.match(stdout, /the filters selected no tests/);
});

test('passing job: tally annotation, acceptance bucket count, summary row; no empty-selection notice', () => {
  const t = fakeTest('UI-01 identity strip visible', 'chromium');
  const { stdout, summary } = run({ env: { E2E_BUCKET: 'acceptance', PROJECT: 'chromium' }, begin: { config, suite: { allTests: () => [t] } }, ends: [[t, fakeResult('passed')]] });
  assert.match(stdout, /::notice title=E2E chromium \[acceptance\]: 1 passed \/ 0 failed \/ 0 blocked \/ 0 skipped · acceptance 1\/0 · diagnostic 0\/0 · obsolete-fault-model 0\/0/);
  assert.match(stdout, /PASS 1\/1 UI-01/);
  assert.doesNotMatch(stdout, /0 tests selected/);
  assert.match(summary, /\| chromium \[acceptance\] \| 1 \| 0 \| 0 \| 0 \|/);
});

test('failing job: error-level annotation, FAIL line with the first error, diag annotation; buckets split by tag', () => {
  const acc = fakeTest('N2-R1 [acceptance] held commit', 'firefox');
  const diag = fakeTest('N2-D2 [diagnostic] write held', 'firefox');
  const obs = fakeTest('N2-A2 [obsolete-fault-model] cancel while pending', 'firefox');
  const fail = fakeResult('timedOut', { error: { message: 'Test timeout of 60000ms exceeded.' }, errors: [{ message: 'Test timeout of 60000ms exceeded.' }] });
  const { stdout, summary } = run({ env: { PROJECT: 'firefox' }, begin: { config, suite: { allTests: () => [acc, diag, obs] } },
    ends: [[acc, fakeResult('passed')], [diag, fail], [obs, fail]] });
  assert.match(stdout, /::error title=E2E firefox: 1 passed \/ 2 failed \/ 0 blocked \/ 0 skipped · acceptance 1\/0 · diagnostic 0\/1 · obsolete-fault-model 0\/1/);
  assert.match(stdout, /FAIL 1\/1 N2-D2 .*Test timeout of 60000ms exceeded/);
  assert.match(stdout, /::warning title=E2E firefox diag: 2 failed executions::/);
  assert.match(summary, /\| firefox \| 1 \| 2 \| 0 \| 0 \|/);
});

test('interrupted run: an error annotation marks results as partial, in addition to any per-test rows', () => {
  const t = fakeTest('CC-P10 shared profile', 'chromium');
  const { stdout, summary } = run({ env: { E2E_BUCKET: 'acceptance', PROJECT: 'chromium' }, begin: { config, suite: { allTests: () => [t] } }, ends: [[t, fakeResult('passed')]], runStatus: 'interrupted' });
  assert.match(stdout, /::error title=E2E run interrupted \[acceptance\]::.*PARTIAL/);
  assert.match(summary, /run interrupted: partial results/);
  assert.match(stdout, /1 passed \/ 0 failed/);
});

test('outside GitHub Actions the reporter is silent', () => {
  const saved = process.env.GITHUB_ACTIONS; delete process.env.GITHUB_ACTIONS;
  const out = []; const write = process.stdout.write.bind(process.stdout);
  process.stdout.write = (c) => { out.push(String(c)); return true; };
  try { const r = new Reporter(); r.onBegin(config, emptySuite); r.onEnd({ status: 'passed' }); } finally { process.stdout.write = write; if (saved !== undefined) process.env.GITHUB_ACTIONS = saved; }
  assert.equal(out.join(''), '');
});
