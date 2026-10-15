// Evidence-format validation only. No model calls, credentials or product tests.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function validate(summary) {
  assert.equal(summary.schemaVersion, 1);
  assert.equal(summary.mvpStatus, 'NO-GO');
  assert.match(summary.updated, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Array.isArray(summary.runs) && summary.runs.length > 0, 'Missing measured runs');
  const ids = new Set();
  for (const run of summary.runs) {
    assert.ok(typeof run.id === 'string' && !ids.has(run.id), 'Duplicate/missing run id'); ids.add(run.id);
    assert.match(run.commit, /^[a-f0-9]{40}$/);
    assert.ok(['local', 'github-actions'].includes(run.environment));
    assert.ok(typeof run.owner === 'string' && run.owner.length > 0);
    assert.match(run.evidence, /^https:\/\/github\.com\/DigitalBlueprint239\/coach-core-ai\//);
    assert.ok(['PASS', 'FAIL', 'BLOCKED', 'NOT MEASURED'].includes(run.status));
    for (const key of ['passed', 'failed', 'blocked', 'skipped', 'total']) assert.ok(Number.isSafeInteger(run[key]) && run[key] >= 0, `Invalid ${key}`);
    assert.equal(run.total, run.passed + run.failed + run.blocked + run.skipped);
    if (run.status === 'PASS') assert.ok(run.total > 0 && run.failed === 0 && run.blocked === 0 && run.skipped === 0, 'Empty or incomplete run cannot PASS');
    if (run.failed > 0) assert.equal(run.status, 'FAIL', 'Preserve failures');
    if (run.total === 0) assert.notEqual(run.status, 'PASS');
  }
  for (const key of ['filmUpload', 'filmTagReopen', 'filmAccuracy', 'aiQuality', 'aiLatency', 'aiCost', 'staging', 'physicalTablet']) {
    assert.equal(summary.unmeasured[key], 'NOT MEASURED', `Unverified metric: ${key}`);
  }
  assert.ok(Array.isArray(summary.blockers) && summary.blockers.length > 0);
  assert.ok(summary.missingHistoricalEvidence.includes('ZIP/PNG'));
  return summary;
}

function selfTest() {
  const fixture = JSON.parse(readFileSync(new URL('../../docs/agents/test-summary.json', import.meta.url), 'utf8'));
  validate(fixture);
  const reject = mutate => { const copy = structuredClone(fixture); mutate(copy); assert.throws(() => validate(copy)); };
  reject(s => { s.runs[0].failed++; });
  reject(s => { s.runs[0].commit = 'unknown'; });
  reject(s => { s.runs.push(s.runs[0]); });
  reject(s => { s.runs[0].status = 'PASS'; s.runs[0].passed = 0; s.runs[0].total = 0; });
  reject(s => { const r = s.runs.find(r => r.failed > 0); r.status = 'PASS'; });
  reject(s => { s.unmeasured.filmAccuracy = 1; });
  reject(s => { delete s.unmeasured.aiCost; });
  reject(s => { s.runs = []; });
  reject(s => { s.runs[0].evidence = 'https://example.invalid'; });
  reject(s => { s.runs[0].skipped = -1; });
  reject(s => { s.missingHistoricalEvidence = ''; });
  return { passed: 12, failed: 0, kind: 'synthetic-format-tests', productAcceptance: false };
}

if (process.argv[2] === '--self-test') {
  console.log(JSON.stringify(selfTest()));
} else {
  const [, , input, output] = process.argv;
  assert.ok(input && output, 'Usage: node validate-test-summary.mjs INPUT UNIQUE_OUTPUT_DIRECTORY');
  // Refuse existing directories, including symlinks. Do not destroy earlier failures.
  const directory = resolve(output); mkdirSync(directory, { recursive: false });
  try {
    const summary = validate(JSON.parse(readFileSync(input, 'utf8')));
    writeFileSync(resolve(directory, 'test-summary.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
    writeFileSync(resolve(directory, 'validation.json'), JSON.stringify({ status: 'PASS', productAcceptance: false, runsValidated: summary.runs.length }) + '\n', { flag: 'wx' });
    console.log('Evidence format valid. Product acceptance remains NO-GO.');
  } catch (error) {
    // Do not echo input content, assertion operands or arbitrary secret-bearing error messages.
    writeFileSync(resolve(directory, 'validation.json'), '{"status":"FAIL","productAcceptance":false}\n', { flag: 'wx' });
    console.error('Evidence format validation failed. Preserve this output and inspect the input privately.');
    process.exitCode = 1;
  }
}
