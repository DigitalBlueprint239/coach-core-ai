// Focused checks for B15 evidence retention. Run: `node e2e/scripts/evidence.test.mjs`
// (no browser, no emulator; one real `playwright test` of a no-op spec to prove cleanup).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const e2e = resolve(here, '..');
const repo = resolve(e2e, '..');
const script = join(here, 'evidence.sh');
const sh = (args, opts = {}) => spawnSync('bash', [script, ...args], { encoding: 'utf8', ...opts });

test('Playwright "clear output" deletes files in outputDir (even via a still-open fd) but cannot touch a sibling evidence dir', () => {
  const fx = join(e2e, 'b15-fixture-tmp'); rmSync(fx, { recursive: true, force: true });
  mkdirSync(join(fx, 'tests'), { recursive: true }); mkdirSync(join(fx, 'out')); mkdirSync(join(fx, 'evidence'));
  writeFileSync(join(fx, 'tests', 'noop.spec.ts'), "import { test, expect } from '@playwright/test';\ntest('noop', async () => { expect(1).toBe(1); });\n");
  writeFileSync(join(fx, 'pw.config.ts'), "import { defineConfig } from '@playwright/test';\nexport default defineConfig({ testDir: './tests', outputDir: './out', reporter: [['list']], projects: [{ name: 'noop' }] });\n");
  writeFileSync(join(fx, 'out', 'run.log'), 'doomed\n'); writeFileSync(join(fx, 'out', 'release-build-manifest.sha256'), 'doomed\n');
  try {
    // Write through evidence.sh so run.log in the EVIDENCE dir is open during the run, like CI's tee.
    const r = sh(['run', join(fx, 'evidence'), '--', 'npx', 'playwright', 'test', '-c', join(fx, 'pw.config.ts')], { cwd: e2e });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(!existsSync(join(fx, 'out', 'run.log')), 'outputDir/run.log must have been deleted by Playwright');
    assert.ok(!existsSync(join(fx, 'out', 'release-build-manifest.sha256')), 'outputDir manifest must have been deleted');
    const kept = readFileSync(join(fx, 'evidence', 'run.log'), 'utf8');
    assert.match(kept, /1 passed/);
    assert.equal(readFileSync(join(fx, 'evidence', 'run.exit'), 'utf8').trim(), 'exit=0');
  } finally { rmSync(fx, { recursive: true, force: true }); }
});

test('run: preserves the command exit status (failing command -> non-zero), with the log retained', () => {
  const d = mkdtempSync(join(tmpdir(), 'ev-'));
  const ok = sh(['run', d, '--', 'bash', '-c', 'echo passing-output; exit 0']);
  assert.equal(ok.status, 0); assert.match(readFileSync(join(d, 'run.log'), 'utf8'), /passing-output/);
  const bad = sh(['run', d, '--', 'bash', '-c', 'echo failing-output >&2; exit 7']);
  assert.equal(bad.status, 7, 'tee must not mask the command exit code');
  assert.match(readFileSync(join(d, 'run.log'), 'utf8'), /failing-output/);
  assert.equal(readFileSync(join(d, 'run.exit'), 'utf8').trim(), 'exit=7');
});

test('finalize: inventory lists every file (hidden included) under both upload paths with full SHA-256; required files present -> exit 0', () => {
  const d = mkdtempSync(join(tmpdir(), 'ev-')); const ev = join(d, 'ci-evidence'); const res = join(d, 'test-results');
  mkdirSync(ev); mkdirSync(join(res, 'failed-x'), { recursive: true });
  writeFileSync(join(ev, 'run.log'), 'line\n'); writeFileSync(join(ev, 'release-build-manifest.sha256'), 'abc  f\n');
  writeFileSync(join(res, 'results.json'), '{}'); writeFileSync(join(res, '.last-run.json'), '{}'); writeFileSync(join(res, 'failed-x', 'trace.zip'), 'zip');
  const r = sh(['finalize', ev, res, join(ev, 'run.log'), join(ev, 'release-build-manifest.sha256'), join(res, 'results.json')]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const inv = readFileSync(join(ev, 'INVENTORY.sha256'), 'utf8');
  for (const f of ['run.log', 'release-build-manifest.sha256', 'results.json', '.last-run.json', 'failed-x/trace.zip', 'run.exit']) assert.ok(inv.includes(f) || f === 'run.exit', `inventory must list ${f}`);
  assert.match(inv, /hidden files INCLUDED/);
  assert.ok(inv.split('\n').filter((l) => /^[0-9a-f]{64}  /.test(l)).length >= 5, 'full 64-hex SHA-256 per file');
  assert.doesNotMatch(inv, /INVENTORY\.sha256$/m, 'the inventory does not hash itself');
});

test('finalize: missing or empty required evidence is reported with ::error and a non-zero exit', () => {
  const d = mkdtempSync(join(tmpdir(), 'ev-')); const ev = join(d, 'ci-evidence'); const res = join(d, 'test-results');
  mkdirSync(ev); mkdirSync(res); writeFileSync(join(ev, 'release-build-manifest.sha256'), '');
  const r = sh(['finalize', ev, res, join(ev, 'run.log'), join(ev, 'release-build-manifest.sha256')]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /::error title=E2E evidence missing::required evidence file missing or empty: .*run\.log/);
  assert.match(r.stdout, /release-build-manifest\.sha256/);
});

test('finalize: token-shaped strings in run.log are redacted; synthetic e-mail addresses are kept', () => {
  const d = mkdtempSync(join(tmpdir(), 'ev-')); const ev = join(d, 'ci-evidence'); mkdirSync(ev);
  writeFileSync(join(ev, 'run.log'), 'GET /auth?oobCode=ABCdef123_-x&apiKey=fake-key-123 Authorization: Bearer abc.def.ghi eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJlLXNpZ25hdHVyZQ coach-d10a@example.test\n');
  const r = sh(['finalize', ev, mkdtempSync(join(tmpdir(), 'res-')), join(ev, 'run.log')]);
  assert.equal(r.status, 0);
  const log = readFileSync(join(ev, 'run.log'), 'utf8');
  assert.match(log, /oobCode=\[REDACTED\]/); assert.match(log, /apiKey=\[REDACTED\]/); assert.match(log, /Bearer \[REDACTED\]/); assert.match(log, /\[REDACTED-JWT\]/);
  assert.doesNotMatch(log, /ABCdef123|fake-key-123|abc\.def\.ghi|eyJhbGci/);
  assert.match(log, /coach-d10a@example\.test/);
  assert.match(readFileSync(join(ev, 'REDACTION.txt'), 'utf8'), /bytes_before=/);
});

test('workflow: evidence dir is outside every Playwright outputDir, upload paths include it with hidden files, and artifact names carry every matrix dimension', () => {
  const wf = readFileSync(join(repo, '.github', 'workflows', 'e2e-emulator.yml'), 'utf8');
  const cfg = readFileSync(join(e2e, 'playwright.config.ts'), 'utf8');
  const outputDir = /outputDir:\s*'([^']+)'/.exec(cfg)[1].replace(/^\.\//, '');
  assert.equal(outputDir, 'test-results');
  // The retained directory used by the workflow.
  const evMatches = [...wf.matchAll(/e2e\/ci-evidence/g)];
  assert.ok(evMatches.length >= 3, 'workflow must reference e2e/ci-evidence for run, finalize and upload');
  assert.ok(!wf.includes('e2e/test-results/run.log'), 'run.log must no longer be written inside outputDir');
  assert.ok(!wf.includes('RELEASE_MANIFEST=e2e/test-results'), 'release manifest must no longer be written inside outputDir');
  // Upload block: both paths, hidden files included, and if-no-files-found is not silent.
  const upload = /uses: actions\/upload-artifact@v4[\s\S]*?retention-days: \d+/.exec(wf)[0];
  assert.match(upload, /path:\s*\|\s*\n\s*e2e\/test-results\s*\n\s*e2e\/ci-evidence/);
  assert.match(upload, /include-hidden-files: true/);
  assert.match(upload, /if-no-files-found: error/);
  assert.match(upload, /if: always\(\)/);
  // Artifact name uniqueness: every matrix dimension appears in the artifact name.
  const matrix = /matrix:\s*\n((?:\s+\w+: \[[^\]]*\]\s*\n)+)/.exec(wf)[1];
  const dims = [...matrix.matchAll(/^\s+(\w+): \[/gm)].map((m) => m[1]);
  const name = /name: (e2e-results-[^\n]+)/.exec(upload)[1];
  for (const d of dims) assert.ok(name.includes(`matrix.${d}`), `artifact name must include matrix.${d}`);
  assert.ok(name.includes('github.sha'));
});
