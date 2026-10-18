// Focused regression checks for the release-proof import-OFF repair (re-review repair of c9d49dd).
// Run: node scripts/security/release-import-config.test.mjs
// Fast cases use fixture roots and SYNTHETIC SHIPPED BUNDLES shaped like CRA/terser output (index.html +
// webpack chunk with the compiled import component). Two end-to-end cases run the real
// verify-release-build.sh and must FAIL CLOSED before any build. RELEASE_PROOF_BUILD=1 adds the slow
// cases: one real release-shaped build asserting the REAL PROCESS EXIT STATUS, and a regression proving
// the suite rejects a nonzero proof (broken negative control) instead of only looking for PASS text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const script = join(here, 'release-import-config.js');
const proof = join(here, 'verify-release-build.sh');
const FLAG = 'REACT_APP_ENABLE_LEGACY_IMPORT';
const cleanEnv = () => { const e = { ...process.env }; delete e[FLAG]; return e; };
const run = (args, env = {}, cwd = repo, scriptPath = script) => { const r = spawnSync(process.execPath, [scriptPath, ...args], { encoding: 'utf8', env: { ...cleanEnv(), ...env }, cwd }); let json = null; try { json = JSON.parse(r.stdout.trim().split('\n').pop()); } catch { /* keep null */ } return { ...r, json }; };
const fixtureRoot = (files) => { const d = mkdtempSync(join(tmpdir(), 'rel-')); writeFileSync(join(d, 'package.json'), '{"name":"fixture","version":"0.0.0"}'); for (const [f, c] of Object.entries(files)) writeFileSync(join(d, f), c); return d; };
const PROD_OFF = `REACT_APP_USE_FIREBASE_EMULATORS=false\n${FLAG}=false\n`;

// ------------------------------------------------------------------ resolve ------------------
test('resolve: committed .env.production pin -> OK; independent and CRA resolution agree on "false"', () => {
  const r = run(['resolve', '--root', fixtureRoot({ '.env.production': PROD_OFF })]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.json.effective.source, '.env.production'); assert.equal(r.json.effective.value, 'false'); assert.equal(r.json.cra, 'false');
});
test('resolve: enabling .env.local / .env.production.local / shell variable -> FAIL (precedence over .env.production)', () => {
  const a = run(['resolve', '--root', fixtureRoot({ '.env.production': PROD_OFF, '.env.local': `${FLAG}=true\n` })]);
  assert.equal(a.status, 1); assert.match(a.json.reasons.join('|'), /ENABLED for this build by \.env\.local/); assert.equal(a.json.cra, 'true');
  const b = run(['resolve', '--root', fixtureRoot({ '.env.production': PROD_OFF, '.env.local': `${FLAG}=false\n`, '.env.production.local': `${FLAG}=true\n` })]);
  assert.equal(b.status, 1); assert.match(b.json.reasons.join('|'), /ENABLED for this build by \.env\.production\.local/);
  const c = run(['resolve', '--root', fixtureRoot({ '.env.production': PROD_OFF })], { [FLAG]: 'true' });
  assert.equal(c.status, 1); assert.match(c.json.reasons.join('|'), /ENABLED for this build by shell/); assert.equal(c.json.cra, 'true');
});
test('resolve: shell/local "false" is not release configuration; malformed, unset and .env-only pins never PASS; ${VAR} expansion is reported inconclusive', () => {
  assert.match(run(['resolve', '--root', fixtureRoot({ '.env.production': PROD_OFF })], { [FLAG]: 'false' }).json.reasons.join('|'), /pinned by shell, not by a committed-basename file/);
  assert.match(run(['resolve', '--root', fixtureRoot({ '.env.production': PROD_OFF, '.env.local': `${FLAG}=false\n` })]).json.reasons.join('|'), /pinned by \.env\.local/);
  for (const v of ['TRUE', '1', 'yes', 'False', '', ' false', 'false ', 'off']) {
    const r = run(['resolve', '--root', fixtureRoot({ '.env.production': `REACT_APP_USE_FIREBASE_EMULATORS=false\n${FLAG}=${v}\n` })]);
    assert.equal(r.status, 1, `value ${JSON.stringify(v)} must not pass`);
  }
  assert.match(run(['resolve', '--root', fixtureRoot({ '.env.production': PROD_OFF, '.env.local': `${FLAG}=TRUE\n` })]).json.reasons.join('|'), /not pinned to exactly "false" .*from \.env\.local/);
  assert.match(run(['resolve', '--root', fixtureRoot({ '.env.production': 'REACT_APP_USE_FIREBASE_EMULATORS=false\n' })]).json.reasons.join('|'), /effective: unset/);
  assert.match(run(['resolve', '--root', fixtureRoot({ '.env.production': 'REACT_APP_USE_FIREBASE_EMULATORS=false\n', '.env': `${FLAG}=false\n` })]).json.reasons.join('|'), /\.env\.production does not contain the exact line/);
  // dotenv-expand: CRA resolves ${REVIEW_CHOICE}; the independent parser does not -> disagreement -> inconclusive FAIL (never a PASS).
  const x = run(['resolve', '--root', fixtureRoot({ '.env.production': PROD_OFF, '.env.local': `${FLAG}=\${REVIEW_CHOICE}\n` })], { REVIEW_CHOICE: 'true' });
  assert.equal(x.status, 1); assert.match(x.json.reasons.join('|'), /inconclusive: CRA loader resolves/);
  const y = run(['resolve', '--root', fixtureRoot({ '.env.production': PROD_OFF, '.env.local': `${FLAG}=\${REVIEW_CHOICE}\n` })], { REVIEW_CHOICE: 'false' });
  assert.equal(y.status, 1, 'expansion to false still fails: not a committed literal pin');
});
test('resolve: precedence audit matches CRA (shell > .env.production.local > .env.local > .env.production > .env)', () => {
  const root = fixtureRoot({ '.env': `${FLAG}=a\n`, '.env.production': `${FLAG}=b\n`, '.env.local': `${FLAG}=c\n`, '.env.production.local': `${FLAG}=d\n` });
  const order = (env) => run(['resolve', '--root', root], env).json;
  assert.deepEqual(order({}).sources, ['.env.production.local="d"', '.env.local="c"', '.env.production="b"', '.env="a"']);
  assert.equal(order({ [FLAG]: 'e' }).effective.source, 'shell'); assert.equal(order({ [FLAG]: 'e' }).cra, 'e');
  rmSync(join(root, '.env.production.local')); assert.equal(order({}).effective.source, '.env.local');
  rmSync(join(root, '.env.local')); assert.equal(order({}).effective.source, '.env.production');
});

// ------------------------------------------------------------------ synthetic shipped bundles -------------
// Shaped like CRA/terser output: a webpack chunk whose module factory holds the concatenated import module
// (module-scope consts + the component) and the handlers exactly as terser folds them.
const DIS = 'Device-play import is disabled in this build. Originals preserved.';
const COMPONENT = ({ accept, decline, attr }) => `(self.webpackChunkfixture=self.webpackChunkfixture||[]).push([[179],{4:(e,t,n)=>{"use strict";
const jsx=(a,b)=>({a,b}),zv=${JSON.stringify(DIS)},$v="smartPlaybook_plays",Bv=e=>\`coachcore:v1:\${e}:legacyImportDecision\`,qv="coachcore:v1:legacyImportClaim";
function Hv(e){const t=e.getItem($v);if(!t)return[];const n=JSON.parse(t);if(!Array.isArray(n))throw new Error("Invalid legacy library.");return n}
async function Kv(e,t,n,r){if(!n())throw new Error("Account or team changed.");const s=Hv(e);if(!s.length)return[];e.setItem(qv,JSON.stringify({uid:t.uid,status:"pending",teamId:t.teamId}));const a=[];for(const o of s){const i=await r.copy(t,o);await r.read(t,i);a.push(i)}return e.setItem(Bv(t.uid),JSON.stringify({decision:"imported",ids:a})),a}
function Jv(e,t){if(e.getItem(Bv(t.uid)))return"declined";return e.setItem(Bv(t.uid),JSON.stringify({decision:"declined"})),"declined"}
function Uv({uid:e,teamId:t,teamName:n}){const o={current:"s"},a="s",[l,c]=[1,()=>{}],[u,d]=["",()=>{}],[h,f]=[!1,()=>{}],[p,m]=[!1,()=>{}];
const y=async()=>{f(!0),d("");try{await ${accept},o.current===a&&c(0)}catch{o.current===a&&d("Import not completed.")}finally{o.current===a&&f(!1)}};
return jsx("section",{"aria-label":"Import device plays","data-import-config":${JSON.stringify(attr)},children:[jsx("button",{disabled:h,onClick:()=>{y()},children:h?"Verifying copies\\u2026":"Import plays"}),jsx("button",{disabled:h,onClick:()=>{try{"postponed"===${decline}?m(!0):c(0)}catch{d("Decision could not be saved.")}},children:"Not now"})]})}
t.default=Uv}}]);`;
const OFF_ACCEPT = 'async function(){throw new Error(zv)}(localStorage)';
const OFF_DECLINE = 'function(){throw new Error(zv)}(localStorage)';
const ON_ACCEPT = 'Kv(localStorage,{uid:e,teamId:t,teamName:n},()=>o.current===a,i)';
const ON_DECLINE = 'Jv(localStorage,{uid:e,teamId:t})';
const OFF_BUNDLE = COMPONENT({ accept: OFF_ACCEPT, decline: OFF_DECLINE, attr: 'coachcore:import-config=false' });
const ON_BUNDLE = COMPONENT({ accept: ON_ACCEPT, decline: ON_DECLINE, attr: 'coachcore:import-config=true' });
const build = (files, { html = true } = {}) => {
  const d = mkdtempSync(join(tmpdir(), 'bundle-')); mkdirSync(join(d, 'static', 'js'), { recursive: true });
  for (const [f, c] of Object.entries(files)) writeFileSync(join(d, 'static', 'js', f), c);
  if (html) writeFileSync(join(d, 'index.html'), `<!doctype html><html><head><script defer="defer" src="/static/js/main.abc.js"></script></head><body><div id="root"></div></body></html>`);
  return d;
};

test('scan: a shipped OFF component (inlined throw, data-import-config=false) is proven OFF by EXECUTION; the same analysis finds the ON build enabled', () => {
  const off = run(['scan', build({ 'main.abc.js': OFF_BUNDLE })]);
  assert.equal(off.status, 0, off.stdout);
  assert.equal(off.json.verdict, 'off');
  assert.equal(off.json.components[0].exec.executor.outcome, 'disabled'); assert.equal(off.json.components[0].exec.decline.outcome, 'disabled');
  const on = run(['scan', build({ 'main.abc.js': ON_BUNDLE })]);
  assert.equal(on.status, 1); assert.equal(on.json.verdict, 'on');
  assert.match(on.json.reasons.join('|'), /import is ENABLED in the shipped executable code .*backend\.copy x1/);
  assert.equal(on.json.components[0].exec.executor.kind, 'module-function', 'module-scope executor resolved through the identifier and executed with its closure');
  assert.equal(run(['negative-control', build({ 'main.abc.js': ON_BUNDLE })]).status, 0);
  assert.equal(run(['negative-control', build({ 'main.abc.js': OFF_BUNDLE })]).status, 1);
});

test('F1 regression (reviewer decoy 1): OFF strings in a COMMENT next to enabled executable code -> FAIL', () => {
  const decoy = `/* coachcore:import-config=false\n   Device-play import is disabled in this build */\n` + COMPONENT({ accept: ON_ACCEPT, decline: ON_DECLINE, attr: 'coachcore:import-config=true' });
  const r = run(['scan', build({ 'main.abc.js': decoy })]);
  assert.equal(r.status, 1); assert.equal(r.json.verdict, 'on');
});
test('F1 regression (reviewer decoy 2): enabled main.js + orphan.js carrying both OFF strings -> FAIL (orphan not in the entry graph)', () => {
  const r = run(['scan', build({ 'main.abc.js': ON_BUNDLE, 'orphan.js': `var a="coachcore:import-config=false";var b=${JSON.stringify(DIS)};` })]);
  assert.equal(r.status, 1); assert.equal(r.json.verdict, 'on'); assert.deepEqual(r.json.entryChunks, ['static/js/main.abc.js']);
});
test('F1 regression (reviewer decoy 3): enabled executable behaviour behind an OFF marker attribute and OFF prose -> FAIL (contradictory output)', () => {
  const decoy = COMPONENT({ accept: ON_ACCEPT, decline: ON_DECLINE, attr: 'coachcore:import-config=false' }) + `\n;var prose=${JSON.stringify(DIS)};`;
  const r = run(['scan', build({ 'main.abc.js': decoy })]);
  assert.equal(r.status, 1); assert.equal(r.json.verdict, 'inconclusive');
  assert.match(r.json.reasons.join('|'), /data-import-config literal is "coachcore:import-config=false" but executed behaviour is ON/);
});
test('F1 regression (reviewer decoy 4): negative-control rejects a comment-only ON marker over disabled executable behaviour', () => {
  const decoy = `/* coachcore:import-config=true */\n` + OFF_BUNDLE;
  const r = run(['negative-control', build({ 'main.abc.js': decoy })]);
  assert.equal(r.status, 1); assert.match(r.json.reasons.join('|'), /opted-in build executes as OFF/);
});
test('F1 regression: a decoy executor that throws the disabled message while the real wired executor is enabled -> FAIL (binding follows the button handler)', () => {
  const decoy = COMPONENT({ accept: ON_ACCEPT, decline: ON_DECLINE, attr: 'coachcore:import-config=true' }).replace('function Jv(', `async function Decoy(){throw new Error(zv)}\nfunction Jv(`);
  const r = run(['scan', build({ 'main.abc.js': decoy })]);
  assert.equal(r.status, 1); assert.equal(r.json.verdict, 'on');
});
test('scan fails closed when it cannot bind: no index.html, index.html referencing a missing chunk, no component, two components, unparseable chunk, executor rejecting with a different message', () => {
  assert.match(run(['scan', build({ 'main.abc.js': OFF_BUNDLE }, { html: false })]).json.reasons.join('|'), /index\.html missing/);
  assert.match(run(['scan', build({ 'other.js': OFF_BUNDLE })]).json.reasons.join('|'), /referenced script\(s\) missing/);
  assert.match(run(['scan', build({ 'main.abc.js': 'var x=1;' })]).json.reasons.join('|'), /component \("Import plays"\) was not found/);
  assert.match(run(['scan', build({ 'main.abc.js': OFF_BUNDLE + '\n' + OFF_BUNDLE.replace('Uv', 'Uw') })]).json.reasons.join('|'), /2 "Import plays" literals/);
  assert.match(run(['scan', build({ 'main.abc.js': 'this is not javascript {' })]).json.reasons.join('|'), /failed to parse/);
  const other = run(['scan', build({ 'main.abc.js': COMPONENT({ accept: 'async function(){throw new Error("Something else")}(localStorage)', decline: OFF_DECLINE, attr: 'coachcore:import-config=false' }) })]);
  assert.equal(other.status, 1); assert.match(other.json.reasons.join('|'), /inconclusive: executor rejected "Something else"/);
});

test('F1 demonstration: the OLD scanner (c9d49dd) accepted the reviewer decoys; the repaired scanner rejects them', { skip: spawnSync('git', ['-C', repo, 'cat-file', '-e', 'c9d49dd367933a92039ba40478d80ffe3a6af987:scripts/security/release-import-config.js']).status !== 0 ? 'old implementation not available in this clone' : false }, () => {
  const old = join(mkdtempSync(join(tmpdir(), 'old-')), 'release-import-config.js');
  writeFileSync(old, spawnSync('git', ['-C', repo, 'show', 'c9d49dd367933a92039ba40478d80ffe3a6af987:scripts/security/release-import-config.js'], { encoding: 'utf8' }).stdout);
  const decoy1 = build({ 'main.abc.js': `/* coachcore:import-config=false\n   Device-play import is disabled in this build */\n` + COMPONENT({ accept: ON_ACCEPT, decline: ON_DECLINE, attr: 'coachcore:import-config=true' }).replace('"data-import-config":"coachcore:import-config=true"', '') });
  const decoy2 = build({ 'main.abc.js': COMPONENT({ accept: ON_ACCEPT, decline: ON_DECLINE, attr: 'x' }), 'orphan.js': `var a="coachcore:import-config=false";var b=${JSON.stringify(DIS)};` });
  for (const [name, dir] of [['comment decoy', decoy1], ['orphan decoy', decoy2]]) {
    assert.equal(run(['scan', dir], {}, repo, old).status, 0, `${name}: old scanner must (wrongly) pass to demonstrate the finding`);
    assert.equal(run(['scan', dir]).status, 1, `${name}: repaired scanner must fail`);
  }
});

test('source contract: enable check unchanged, build-time marker rendered, committed pin and explicit opt-ins preserved', () => {
  const mod = readFileSync(join(repo, 'src', 'features', 'legacy-import', 'import-legacy.ts'), 'utf8');
  assert.match(mod, /isLegacyImportEnabled = \(\) => process\.env\.REACT_APP_ENABLE_LEGACY_IMPORT === 'true'/);
  assert.match(mod, /export const IMPORT_CONFIG_MARKER = `coachcore:import-config=\$\{process\.env\.REACT_APP_ENABLE_LEGACY_IMPORT\}`/);
  assert.match(readFileSync(join(repo, 'src', 'features', 'legacy-import', 'LegacyImport.tsx'), 'utf8'), /data-import-config=\{IMPORT_CONFIG_MARKER\}/);
  assert.match(readFileSync(join(repo, '.env.production'), 'utf8'), new RegExp(`^${FLAG}=false$`, 'm'));
  assert.match(readFileSync(join(repo, 'e2e', 'scripts', 'build-app.sh'), 'utf8'), new RegExp(`^export ${FLAG}=true$`, 'm'));
  assert.match(readFileSync(join(repo, '.env.test'), 'utf8'), new RegExp(`^${FLAG}=true$`, 'm'));
  const wf = readFileSync(join(repo, '.github', 'workflows', 'e2e-emulator.yml'), 'utf8');
  assert.match(wf, /node scripts\/security\/release-import-config\.test\.mjs/);
  assert.match(wf, /RELEASE_RETAIN_DIR=e2e\/ci-evidence\/release-build/);
});

// ------------------------------------------------------------------ end-to-end (real script) --------------
test('END-TO-END (real script, fails closed BEFORE building): shell override -> exit 1, no build directory', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'rb-')), 'build');
  const r = spawnSync('bash', [proof, 'coach-core-mvp-staging-239'], { cwd: repo, encoding: 'utf8', env: { ...cleanEnv(), [FLAG]: 'true', RELEASE_BUILD_DIR: out, RELEASE_MANIFEST: out + '-manifest' } });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /FAIL import config -- REACT_APP_ENABLE_LEGACY_IMPORT is ENABLED for this build by shell/);
  assert.match(r.stdout, /refusing to build/); assert.doesNotMatch(r.stdout, /PASS release-shaped build/);
  assert.ok(!existsSync(out));
});
test('END-TO-END (real script, fails closed BEFORE building): a temporary enabling .env.local in the repo root -> exit 1, no build', { skip: existsSync(join(repo, '.env.local')) ? 'a real .env.local exists; not touching it' : false }, () => {
  const local = join(repo, '.env.local');
  writeFileSync(local, `${FLAG}=true\n`);
  try {
    const out = join(mkdtempSync(join(tmpdir(), 'rb-')), 'build');
    const r = spawnSync('bash', [proof, 'coach-core-mvp-staging-239'], { cwd: repo, encoding: 'utf8', env: { ...cleanEnv(), RELEASE_BUILD_DIR: out } });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /PASS \.env\.production pins the import flag to false/);
    assert.match(r.stdout, /FAIL import config -- REACT_APP_ENABLE_LEGACY_IMPORT is ENABLED for this build by \.env\.local/);
    assert.ok(!existsSync(out));
  } finally { rmSync(local, { force: true }); }
});

// ------------------------------------------------------------------ slow: real builds --------------------
const SLOW = process.env.RELEASE_PROOF_BUILD ? false : 'set RELEASE_PROOF_BUILD=1 to run the real builds';
const runProof = (env) => { const out = join(mkdtempSync(join(tmpdir(), 'rb-')), 'build'); const r = spawnSync('bash', [proof, 'coach-core-mvp-staging-239'], { cwd: repo, encoding: 'utf8', env: { ...cleanEnv(), RELEASE_BUILD_DIR: out, RELEASE_MANIFEST: out + '-manifest.sha256', ...env } }); return { ...r, out }; };

test('REAL release-shaped build: the proof EXITS 0, proves OFF by execution, retains the inspected output with provenance (F2: real status asserted)', { skip: SLOW }, () => {
  assert.ok(existsSync(join(repo, 'e2e', '.app-build', 'static', 'js')), 'needs a fresh same-commit emulator build (npm --prefix e2e run build:app) for the required negative control');
  const retain = join(mkdtempSync(join(tmpdir(), 'retain-')), 'release-build');
  const r = runProof({ RELEASE_RETAIN_DIR: retain });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /RESULT: 17 passed, 0 failed/);
  assert.match(r.stdout, /PASS effective build-time import config is OFF \(\.env\.production="false"; CRA loader agrees: "false"\)/);
  assert.match(r.stdout, /PASS shipped executable import code is OFF \(static\/js\/main\.[0-9a-f]+\.js: executor inline -> disabled, decline inline -> disabled, data-import-config=coachcore:import-config=false\)/);
  assert.match(r.stdout, /PASS negative control: executable analysis detects the opted-in emulator build as ON/);
  const s = run(['scan', r.out]); assert.equal(s.status, 0, s.stdout);
  // Retained output: index.html + shipped JS + asset-manifest + provenance; no env files; hashes match the build manifest.
  const files = readdirSync(retain); assert.ok(files.includes('index.html') && files.includes('release-build.context') && files.includes('static'));
  assert.ok(!files.some((f) => f.startsWith('.env')));
  const ctx = readFileSync(join(retain, 'release-build.context'), 'utf8');
  assert.match(ctx, /candidate_sha=[0-9a-f]{40}/); assert.match(ctx, /executable_verdict=off executor=disabled decline=disabled/); assert.match(ctx, /build_manifest_sha256=[0-9a-f]{64}/);
  const manifest = readFileSync(r.out + '-manifest.sha256', 'utf8');
  for (const js of readdirSync(join(retain, 'static', 'js'))) { const h = createHash('sha256').update(readFileSync(join(retain, 'static', 'js', js))).digest('hex'); assert.ok(manifest.includes(`${h}  ./static/js/${js}`), `retained ${js} must be byte-identical to the manifest entry`); }
});
test('F2 regression: a nonzero real proof (broken negative control: comment-only ON marker, no hooks/ports/demo) is REJECTED by status, even though every OFF PASS line is present', { skip: SLOW }, () => {
  const fake = build({ 'main.abc.js': `/* coachcore:import-config=true */ var noop=1;` });
  const r = runProof({ EMULATOR_BUILD_DIR: fake });
  assert.notEqual(r.status, 0, 'the suite must not call a failing proof a pass');
  assert.match(r.stdout, /PASS shipped executable import code is OFF/, 'OFF evidence is still printed');
  assert.match(r.stdout, /FAIL negative control -- pattern __coachCoreE2E does not detect the emulator build/);
  assert.match(r.stdout, /FAIL negative control -- executable analysis does not detect the opted-in emulator build as ON/);
  assert.match(r.stdout, /RESULT: \d+ passed, >=1 failed/);
  assert.doesNotMatch(r.stdout, /RESULT: 17 passed, 0 failed/);
});
