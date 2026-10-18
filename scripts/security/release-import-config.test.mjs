// Focused regression checks for the release-proof import-OFF repair.
// Run: node scripts/security/release-import-config.test.mjs
// Fast cases use fixture roots and synthetic bundles (no build). Two end-to-end cases run the
// real verify-release-build.sh and must FAIL CLOSED before any build starts. Set
// RELEASE_PROOF_BUILD=1 to also run one real release-shaped build (slow) and assert the canary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const script = join(here, 'release-import-config.js');
const proof = join(here, 'verify-release-build.sh');
const FLAG = 'REACT_APP_ENABLE_LEGACY_IMPORT';
// A clean shell for child processes: the flag must come only from what each case sets.
const cleanEnv = () => { const e = { ...process.env }; delete e[FLAG]; return e; };
const run = (args, env = {}, cwd = repo) => { const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env: { ...cleanEnv(), ...env }, cwd }); let json = null; try { json = JSON.parse(r.stdout.trim().split('\n').pop()); } catch { /* keep null */ } return { ...r, json }; };
const fixtureRoot = (files) => { const d = mkdtempSync(join(tmpdir(), 'rel-')); writeFileSync(join(d, 'package.json'), '{"name":"fixture","version":"0.0.0"}'); for (const [f, c] of Object.entries(files)) writeFileSync(join(d, f), c); return d; };
const PROD_OFF = `REACT_APP_USE_FIREBASE_EMULATORS=false\n${FLAG}=false\n`;

test('resolve: committed .env.production pin -> OK; independent and CRA resolution agree on "false"', () => {
  const root = fixtureRoot({ '.env.production': PROD_OFF });
  const r = run(['resolve', '--root', root]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.json.effective.source, '.env.production'); assert.equal(r.json.effective.value, 'false'); assert.equal(r.json.cra, 'false');
});

test('resolve: an enabling git-ignored .env.local overrides .env.production -> FAIL (the evidence-73 finding)', () => {
  const root = fixtureRoot({ '.env.production': PROD_OFF, '.env.local': `${FLAG}=true\n` });
  const r = run(['resolve', '--root', root]);
  assert.equal(r.status, 1);
  assert.match(r.json.reasons.join('|'), new RegExp(`${FLAG} is ENABLED for this build by \\.env\\.local`));
  assert.equal(r.json.cra, 'true', 'CRA loader independently confirms the override');
});

test('resolve: an enabling .env.production.local wins over .env.local and .env.production -> FAIL', () => {
  const root = fixtureRoot({ '.env.production': PROD_OFF, '.env.local': `${FLAG}=false\n`, '.env.production.local': `${FLAG}=true\n` });
  const r = run(['resolve', '--root', root]);
  assert.equal(r.status, 1);
  assert.match(r.json.reasons.join('|'), /ENABLED for this build by \.env\.production\.local/);
});

test('resolve: an enabling shell variable wins over every file -> FAIL', () => {
  const root = fixtureRoot({ '.env.production': PROD_OFF });
  const r = run(['resolve', '--root', root], { [FLAG]: 'true' });
  assert.equal(r.status, 1);
  assert.match(r.json.reasons.join('|'), /ENABLED for this build by shell/);
  assert.equal(r.json.cra, 'true');
});

test('resolve: a shell/local pin to "false" is not release configuration -> FAIL (must come from a committed file)', () => {
  const root = fixtureRoot({ '.env.production': PROD_OFF });
  const r1 = run(['resolve', '--root', root], { [FLAG]: 'false' });
  assert.equal(r1.status, 1); assert.match(r1.json.reasons.join('|'), /pinned by shell, not by a committed file/);
  const root2 = fixtureRoot({ '.env.production': PROD_OFF, '.env.local': `${FLAG}=false\n` });
  const r2 = run(['resolve', '--root', root2]);
  assert.equal(r2.status, 1); assert.match(r2.json.reasons.join('|'), /pinned by \.env\.local, not by a committed file/);
});

test('resolve: malformed or unexpected values never PASS (TRUE, 1, yes, False, "", " false", "false ") and a missing pin fails', () => {
  for (const v of ['TRUE', '1', 'yes', 'False', '', ' false', 'false ', 'off']) {
    const root = fixtureRoot({ '.env.production': `REACT_APP_USE_FIREBASE_EMULATORS=false\n${FLAG}=${v}\n` });
    const r = run(['resolve', '--root', root]);
    assert.equal(r.status, 1, `value ${JSON.stringify(v)} must not pass`);
    assert.match(r.json.reasons.join('|'), /not pinned to exactly "false"|does not contain the exact line/);
  }
  // Malformed override in .env.local on top of a correct .env.production: effective value is the malformed one -> FAIL.
  const root = fixtureRoot({ '.env.production': PROD_OFF, '.env.local': `${FLAG}=TRUE\n` });
  const r = run(['resolve', '--root', root]);
  assert.equal(r.status, 1); assert.match(r.json.reasons.join('|'), /not pinned to exactly "false" .*from \.env\.local/);
  // No pin anywhere -> unset -> FAIL.
  const r2 = run(['resolve', '--root', fixtureRoot({ '.env.production': 'REACT_APP_USE_FIREBASE_EMULATORS=false\n' })]);
  assert.equal(r2.status, 1); assert.match(r2.json.reasons.join('|'), /effective: unset/);
  // Pinned only in .env (committed) but .env.production lacks the exact line -> FAIL.
  const r3 = run(['resolve', '--root', fixtureRoot({ '.env.production': 'REACT_APP_USE_FIREBASE_EMULATORS=false\n', '.env': `${FLAG}=false\n` })]);
  assert.equal(r3.status, 1); assert.match(r3.json.reasons.join('|'), /\.env\.production does not contain the exact line/);
});

test('resolve: precedence audit matches CRA (shell > .env.production.local > .env.local > .env.production > .env)', () => {
  const root = fixtureRoot({ '.env': `${FLAG}=a\n`, '.env.production': `${FLAG}=b\n`, '.env.local': `${FLAG}=c\n`, '.env.production.local': `${FLAG}=d\n` });
  const order = (env) => run(['resolve', '--root', root], env).json;
  assert.deepEqual(order({})?.sources, ['.env.production.local="d"', '.env.local="c"', '.env.production="b"', '.env="a"']);
  assert.equal(order({ [FLAG]: 'e' }).effective.source, 'shell');
  assert.equal(order({ [FLAG]: 'e' }).cra, 'e', 'CRA loader agrees the shell wins');
  rmSync(join(root, '.env.production.local')); assert.equal(order({}).effective.source, '.env.local');
  rmSync(join(root, '.env.local')); assert.equal(order({}).effective.source, '.env.production');
});

const bundle = (files) => { const d = mkdtempSync(join(tmpdir(), 'bundle-')); mkdirSync(join(d, 'static', 'js'), { recursive: true }); for (const [f, c] of Object.entries(files)) writeFileSync(join(d, 'static', 'js', f), c); return d; };
const OFF_JS = 'var a="coachcore:import-config=false";var b="Device-play import is disabled in this build. Originals preserved.";';

test('scan: shipped JS with canary=false + disabled copy -> OK; canary=true -> FAIL enabled; missing canary -> FAIL inconclusive; stray inlined true -> FAIL; empty -> FAIL', () => {
  assert.equal(run(['scan', bundle({ 'main.js': OFF_JS })]).status, 0);
  const on = run(['scan', bundle({ 'main.js': 'var a="coachcore:import-config=true";' })]);
  assert.equal(on.status, 1); assert.match(on.json.reasons.join('|'), /import is ENABLED in the shipped JS/);
  const none = run(['scan', bundle({ 'main.js': 'var a="Device-play import is disabled in this build";' })]);
  assert.equal(none.status, 1); assert.match(none.json.reasons.join('|'), /inconclusive: canary coachcore:import-config=false not found/);
  const inl = run(['scan', bundle({ 'main.js': OFF_JS + 'var c={REACT_APP_ENABLE_LEGACY_IMPORT:"true"};' })]);
  assert.equal(inl.status, 1); assert.match(inl.json.reasons.join('|'), /inlined build env shows REACT_APP_ENABLE_LEGACY_IMPORT:"true"/);
  const both = run(['scan', bundle({ 'main.js': OFF_JS + 'var d="coachcore:import-config=true";' })]);
  assert.equal(both.status, 1, 'an =true anywhere fails even when =false is present');
  const nocopy = run(['scan', bundle({ 'main.js': 'var a="coachcore:import-config=false";' })]);
  assert.equal(nocopy.status, 1); assert.match(nocopy.json.reasons.join('|'), /disabled-state copy not present/);
  const empty = run(['scan', mkdtempSync(join(tmpdir(), 'empty-'))]);
  assert.equal(empty.status, 1); assert.match(empty.json.reasons.join('|'), /inconclusive: no JS files/);
});

test('negative-control: an enabled build is detected (OK) and an OFF build is not mistaken for one (FAIL)', () => {
  assert.equal(run(['negative-control', bundle({ 'main.js': 'var a="coachcore:import-config=true";' })]).status, 0);
  assert.equal(run(['negative-control', bundle({ 'main.js': OFF_JS })]).status, 1);
});

test('source contract: the import module defines the build-time canary from the flag and the section renders it', () => {
  const mod = readFileSync(join(repo, 'src', 'features', 'legacy-import', 'import-legacy.ts'), 'utf8');
  assert.match(mod, /export const IMPORT_CONFIG_MARKER = `coachcore:import-config=\$\{process\.env\.REACT_APP_ENABLE_LEGACY_IMPORT\}`/);
  assert.match(mod, /isLegacyImportEnabled = \(\) => process\.env\.REACT_APP_ENABLE_LEGACY_IMPORT === 'true'/, 'enable check unchanged');
  const cmp = readFileSync(join(repo, 'src', 'features', 'legacy-import', 'LegacyImport.tsx'), 'utf8');
  assert.match(cmp, /data-import-config=\{IMPORT_CONFIG_MARKER\}/);
  assert.match(readFileSync(join(repo, '.env.production'), 'utf8'), new RegExp(`^${FLAG}=false$`, 'm'));
  assert.match(readFileSync(join(repo, 'e2e', 'scripts', 'build-app.sh'), 'utf8'), new RegExp(`^export ${FLAG}=true$`, 'm'), 'explicit emulator opt-in preserved');
  assert.match(readFileSync(join(repo, '.env.test'), 'utf8'), new RegExp(`^${FLAG}=true$`, 'm'), 'explicit unit-test opt-in preserved');
});

test('END-TO-END (real script, fails closed BEFORE building): shell override -> exit 1, no build directory, no import-OFF PASS line', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'rb-')), 'build');
  const r = spawnSync('bash', [proof, 'coach-core-mvp-staging-239'], { cwd: repo, encoding: 'utf8', env: { ...cleanEnv(), [FLAG]: 'true', RELEASE_BUILD_DIR: out, RELEASE_MANIFEST: join(out + '-manifest') } });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /FAIL import config -- REACT_APP_ENABLE_LEGACY_IMPORT is ENABLED for this build by shell/);
  assert.match(r.stdout, /refusing to build/);
  assert.doesNotMatch(r.stdout, /PASS effective build-time import config is OFF/);
  assert.doesNotMatch(r.stdout, /PASS release-shaped build/);
  assert.ok(!existsSync(out), 'no build output may exist after a refused proof');
});

test('END-TO-END (real script, fails closed BEFORE building): a temporary enabling .env.local in the repo root -> exit 1, no build', { skip: existsSync(join(repo, '.env.local')) ? 'a real .env.local exists; not touching it' : false }, () => {
  const local = join(repo, '.env.local');
  writeFileSync(local, `${FLAG}=true\n`);
  try {
    const out = join(mkdtempSync(join(tmpdir(), 'rb-')), 'build');
    const r = spawnSync('bash', [proof, 'coach-core-mvp-staging-239'], { cwd: repo, encoding: 'utf8', env: { ...cleanEnv(), RELEASE_BUILD_DIR: out } });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /PASS \.env\.production pins the import flag to false/, 'the old check alone would have passed');
    assert.match(r.stdout, /FAIL import config -- REACT_APP_ENABLE_LEGACY_IMPORT is ENABLED for this build by \.env\.local/);
    assert.ok(!existsSync(out));
  } finally { rmSync(local, { force: true }); }
});

test('REAL release-shaped build (slow; RELEASE_PROOF_BUILD=1): proof passes and the shipped JS carries exactly the OFF canary', { skip: process.env.RELEASE_PROOF_BUILD ? false : 'set RELEASE_PROOF_BUILD=1 to run the real build' }, () => {
  const out = join(mkdtempSync(join(tmpdir(), 'rb-')), 'build');
  const r = spawnSync('bash', [proof, 'coach-core-mvp-staging-239'], { cwd: repo, encoding: 'utf8', env: { ...cleanEnv(), RELEASE_BUILD_DIR: out, RELEASE_MANIFEST: out + '-manifest.sha256' } });
  assert.match(r.stdout, /PASS effective build-time import config is OFF \(\.env\.production="false"; CRA loader agrees: "false"\)/);
  assert.match(r.stdout, /PASS shipped JS proves import OFF \(canary=false x[1-9]\d*, =true x0, inlined true x0, disabled copy x[1-9]\d*\)/);
  const s = run(['scan', out]); assert.equal(s.status, 0, s.stdout);
  // The proof's overall status also depends on the emulator negative control, which needs a fresh e2e/.app-build.
  if (existsSync(join(repo, 'e2e', '.app-build', 'static', 'js'))) assert.match(r.stdout, /negative control: import canary detects the opted-in emulator build/);
});
