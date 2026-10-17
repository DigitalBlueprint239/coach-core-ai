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

// ---------------------------------------------------------------------------
// Failure-path regression checks (Codex review of 04d4be8): processing errors must
// return non-zero, leave NO UPLOAD_OK marker, report a clear ::error that names the
// step but never the content, and never alter the test command's own exit status.
// ---------------------------------------------------------------------------
import { chmodSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SENTINEL = 'Bearer SYNTHETIC-SENTINEL-TOKEN-0123456789';
const fixture = () => {
  const d = mkdtempSync(join(tmpdir(), 'ev-')); const ev = join(d, 'ci-evidence'); const res = join(d, 'test-results');
  mkdirSync(ev); mkdirSync(res);
  writeFileSync(join(ev, 'run.log'), `line ${SENTINEL}\n`); writeFileSync(join(ev, 'release-build-manifest.sha256'), 'abc  f\n'); writeFileSync(join(res, 'results.json'), '{}');
  return { d, ev, res, req: [join(ev, 'run.log'), join(ev, 'release-build-manifest.sha256'), join(res, 'results.json')] };
};
const runningAsRoot = typeof process.getuid === 'function' && process.getuid() === 0;

test('REGRESSION: redaction failure (evidence dir unwritable) -> non-zero, ::error naming the step, no UPLOAD_OK, sentinel not echoed', { skip: runningAsRoot && 'root ignores directory permissions; covered by the other failure-path checks' }, () => {
  const { ev, res, req } = fixture();
  chmodSync(ev, 0o555);
  try {
    const r = sh(['finalize', ev, res, ...req]);
    assert.notEqual(r.status, 0, 'finalize must fail when it cannot write');
    assert.match(r.stdout + r.stderr, /::error title=E2E evidence finalize failed::/);
    assert.ok(!existsSync(join(ev, 'UPLOAD_OK')), 'no eligibility marker');
    assert.ok(!(r.stdout + r.stderr).includes('SYNTHETIC-SENTINEL-TOKEN'), 'error output must not echo the sensitive content');
  } finally { chmodSync(ev, 0o755); }
});

test('REGRESSION: redaction failure (sed unavailable) -> non-zero, clear ::error, no UPLOAD_OK, run.log left as-is but ineligible', () => {
  const { ev, res, req } = fixture();
  // A PATH with no sed makes the redaction step fail outright.
  const bin = mkdtempSync(join(tmpdir(), 'bin-'));
  for (const t of ['bash', 'rm', 'mkdir', 'wc', 'grep', 'mv', 'find', 'sort', 'xargs', 'sha256sum', 'date', 'cat', 'test']) {
    const p = spawnSync('bash', ['-c', `command -v ${t}`], { encoding: 'utf8' }).stdout.trim(); if (p) spawnSync('ln', ['-s', p, join(bin, t)]);
  }
  const r = sh(['finalize', ev, res, ...req], { env: { ...process.env, PATH: bin } });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /::error title=E2E evidence finalize failed::redaction \(sed\) failed \(evidence NOT eligible for upload\)/);
  assert.ok(!existsSync(join(ev, 'UPLOAD_OK')));
  assert.ok(!existsSync(join(ev, 'INVENTORY.sha256')), 'no inventory is produced when sanitization failed');
  assert.ok(!(r.stdout + r.stderr).includes('SYNTHETIC-SENTINEL-TOKEN'));
});

test('REGRESSION: redaction that leaves a token shape behind fails verification -> non-zero, no UPLOAD_OK', () => {
  const { ev, res, req } = fixture();
  // Simulate a defective sed that passes bytes through unchanged.
  const bin = mkdtempSync(join(tmpdir(), 'bin-'));
  writeFileSync(join(bin, 'sed'), '#!/usr/bin/env bash\nwhile [ "$1" != "" ] && [ "$1" != "${1#-}" ]; do if [ "$1" = "-e" ]; then shift; fi; shift; done\ncat "$1"\n'); chmodSync(join(bin, 'sed'), 0o755);
  const r = sh(['finalize', ev, res, ...req], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /redaction verification failed: token-shaped content remains/);
  assert.ok(!existsSync(join(ev, 'UPLOAD_OK')));
  assert.ok(!(r.stdout + r.stderr).includes('SYNTHETIC-SENTINEL-TOKEN'));
});

test('REGRESSION: inventory creation failure (sha256sum unavailable) -> non-zero, clear ::error, no UPLOAD_OK; redacted log already safe', () => {
  const { ev, res, req } = fixture();
  const bin = mkdtempSync(join(tmpdir(), 'bin-'));
  for (const t of ['bash', 'rm', 'mkdir', 'wc', 'grep', 'mv', 'find', 'sort', 'xargs', 'sed', 'date', 'cat', 'test']) {
    const p = spawnSync('bash', ['-c', `command -v ${t}`], { encoding: 'utf8' }).stdout.trim(); if (p) spawnSync('ln', ['-s', p, join(bin, t)]);
  }
  const r = sh(['finalize', ev, res, ...req], { env: { ...process.env, PATH: bin } });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /::error title=E2E evidence finalize failed::inventory creation failed/);
  assert.ok(!existsSync(join(ev, 'UPLOAD_OK')));
  assert.ok(!existsSync(join(ev, 'INVENTORY.sha256')));
  assert.match(readFileSync(join(ev, 'run.log'), 'utf8'), /Bearer \[REDACTED\]/, 'redaction happened before the inventory step failed');
});

test('REGRESSION: inventory digest mismatch (file changed after hashing) is caught by verification', () => {
  const { ev, res, req } = fixture();
  // A sha256sum that lies about digests makes verification fail even though the inventory was written.
  const bin = mkdtempSync(join(tmpdir(), 'bin-'));
  writeFileSync(join(bin, 'sha256sum'), `#!/usr/bin/env bash\nif [ "$1" = "-c" ]; then exec /usr/bin/sha256sum "$@"; fi\nfor f in "$@"; do echo "0000000000000000000000000000000000000000000000000000000000000000  $f"; done\n`); chmodSync(join(bin, 'sha256sum'), 0o755);
  const r = sh(['finalize', ev, res, ...req], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /inventory verification failed: a listed digest does not match the file/);
  assert.ok(!existsSync(join(ev, 'UPLOAD_OK')));
});

test('success path: UPLOAD_OK written; every inventory digest independently recomputed from the final (post-redaction) bytes', () => {
  const { ev, res, req } = fixture();
  const r = sh(['finalize', ev, res, ...req]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(existsSync(join(ev, 'UPLOAD_OK')));
  const inv = readFileSync(join(ev, 'INVENTORY.sha256'), 'utf8').split('\n').filter((l) => /^[0-9a-f]{64}  /.test(l));
  const listed = inv.map((l) => l.slice(66).split('/').pop()).sort();
  assert.deepEqual(listed, ['REDACTION.txt', 'release-build-manifest.sha256', 'results.json', 'run.log'], 'exactly the final files, nothing missing or extra');
  const { createHash } = require('node:crypto');
  for (const line of inv) {
    const [digest, file] = [line.slice(0, 64), line.slice(66)];
    assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), digest, `digest must match final bytes of ${file}`);
  }
  assert.match(readFileSync(join(ev, 'run.log'), 'utf8'), /Bearer \[REDACTED\]/);
  assert.ok(!inv.some((l) => /UPLOAD_OK|INVENTORY\.sha256/.test(l)), 'marker and inventory are not self-listed');
});

test('workflow: the upload is gated on the finalize eligibility output, and a withheld-evidence step reports the gate', () => {
  const wf = readFileSync(join(repo, '.github', 'workflows', 'e2e-emulator.yml'), 'utf8');
  const upload = /uses: actions\/upload-artifact@v4[\s\S]*?retention-days: \d+/.exec(wf)[0];
  assert.match(upload, /if: always\(\) && steps\.finalize\.outputs\.eligible == 'true'/);
  assert.match(wf, /id: finalize\n\s+if: always\(\)/);
  assert.match(wf, /test -s e2e\/ci-evidence\/UPLOAD_OK/);
  assert.match(wf, /echo "eligible=true" >> "\$GITHUB_OUTPUT"/);
  assert.match(wf, /if: always\(\) && steps\.finalize\.outputs\.eligible != 'true'[\s\S]*?::error title=E2E evidence withheld/);
});
