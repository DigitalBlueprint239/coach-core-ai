// Focused regression checks for the release-proof import-OFF repair (PR #78, fourth revision 2026-10-18).
// Run: node scripts/security/release-import-config.test.mjs            (fast: fixtures + fail-closed cases)
//      RELEASE_PROOF_BUILD=1 node scripts/security/release-import-config.test.mjs   (adds the real builds)
//
// Sections: (A) L1 resolve; (B) L2 canary + source scope on synthetic CRA-shaped bundles; (C) RETIRED-MODEL
// regressions: every adversarial fixture from the four independent reviews is executed by the reviewers'
// own "actual behaviour" harness to show the effect is real, the cab8cab/d14aa7b/905b1d4 scanners are shown
// to have returned the false verdicts, and the fourth-revision verifier is shown to make NO behavioural
// claim from any bundle (gate without executed browser evidence is always inconclusive); (D) gate contract
// on Playwright results; (E) source/workflow contract; (F) real-script fail-closed; (G) real builds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync, readdirSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const script = join(here, 'release-import-config.js');
const proof = join(here, 'verify-release-build.sh');
const FLAG = 'REACT_APP_ENABLE_LEGACY_IMPORT';
const cleanEnv = () => { const e = { ...process.env }; delete e[FLAG]; return e; };
const run = (args, env = {}, cwd = repo, scriptPath = script) => { const r = spawnSync(process.execPath, [scriptPath, ...args], { encoding: 'utf8', env: { ...cleanEnv(), NODE_PATH: join(repo, 'node_modules'), ...env }, cwd }); let json = null; try { json = JSON.parse(r.stdout.trim().split('\n').pop()); } catch { /* keep null */ } return { ...r, json }; };
const fixtureRoot = (files) => { const d = mkdtempSync(join(tmpdir(), 'rel-')); writeFileSync(join(d, 'package.json'), '{"name":"fixture","version":"0.0.0"}'); for (const [f, c] of Object.entries(files)) writeFileSync(join(d, f), c); return d; };
const PROD_OFF = `REACT_APP_USE_FIREBASE_EMULATORS=false\n${FLAG}=false\n`;
const oldScript = (sha) => { if (spawnSync('git', ['-C', repo, 'cat-file', '-e', `${sha}:scripts/security/release-import-config.js`]).status !== 0) return null; const f = join(mkdtempSync(join(tmpdir(), `old-${sha.slice(0, 7)}-`)), 'release-import-config.js'); writeFileSync(f, spawnSync('git', ['-C', repo, 'show', `${sha}:scripts/security/release-import-config.js`], { encoding: 'utf8' }).stdout); return f; };
const OLD_905 = oldScript('905b1d4b0e93d720cb4cf05b5746cb7a138e7884');
const OLD_D14 = oldScript('d14aa7bb9ec4442c3acca26b127b17f4194cbd64');
const OLD_CAB8 = oldScript('cab8cabe2baf00b8f3a37a36a88466f5c749613e');

// ------------------------------------------------------------------ (A) resolve ------------------
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
// Shaped like CRA's single main chunk (kept verbatim from the earlier revisions so every reviewer probe still
// applies): an IIFE with a numeric module map (950 -> 983 = a React-shaped module), webpack's require `n`, and
// the app entry IIFE holding the concatenated import module. `self.__fixtureComponent` exists only so the
// actual-behaviour harness can call the component; the real bundle exports nothing.
const DIS = 'Device-play import is disabled in this build. Originals preserved.';
const REACT_LIKE = `983:(e,t)=>{var n=Symbol.for("react.transitional.element"),i=Symbol.for("react.fragment");t.Fragment=i;t.useState=function(e){var s=[e,function(v){s[0]=v}];return s};t.useRef=function(e){return{current:e}};t.useEffect=function(){}},950:(e,t,n)=>{e.exports=n(983)}`;
const COMPONENT = ({ accept, decline, attr, prelude = '', wrap = (x) => x }) => `(()=>{"use strict";var e={${REACT_LIKE}},t={};function n(r){var i=t[r];if(void 0!==i)return i.exports;var s=t[r]={exports:{}};return e[r](s,s.exports,n),s.exports}
(()=>{"use strict";var r=n(950);const jsx=(a,b)=>({a,b}),zv=${JSON.stringify(DIS)},$v="smartPlaybook_plays",Bv=e=>\`coachcore:v1:\${e}:legacyImportDecision\`,qv="coachcore:v1:legacyImportClaim";
${prelude}
function Hv(e){const t=e.getItem($v);if(!t)return[];const n=JSON.parse(t);if(!Array.isArray(n))throw new Error("Invalid legacy library.");return n}
async function Kv(e,t,n,r){if(!n())throw new Error("Account or team changed.");const s=Hv(e);if(!s.length)return[];e.setItem(qv,JSON.stringify({uid:t.uid,status:"pending",teamId:t.teamId}));const a=[];for(const o of s){const i=await r.copy(t,o);await r.read(t,i);a.push(i)}return e.setItem(Bv(t.uid),JSON.stringify({decision:"imported",ids:a})),a}
function Jv(e,t){if(e.getItem(Bv(t.uid)))return"declined";return e.setItem(Bv(t.uid),JSON.stringify({decision:"declined"})),"declined"}
function Uv({uid:e,teamId:t,teamName:n,backend:i,onImported:s}){const a=\`\${e}:\${t}\`,o=(0,r.useRef)(a);o.current=a;const[l,c]=(0,r.useState)(1),[u,d]=(0,r.useState)(""),[h,f]=(0,r.useState)(!1),[p,m]=(0,r.useState)(!1);
const y=${wrap(`async()=>{f(!0),d("");try{await ${accept},o.current===a&&(c(0),null===s||void 0===s||s())}catch{o.current===a&&d("Import not completed.")}finally{o.current===a&&f(!1)}}`)};
return jsx("section",{"aria-label":"Import device plays","data-import-config":${JSON.stringify(attr)},children:[jsx("button",{disabled:h,onClick:()=>{y()},children:h?"Verifying copies\\u2026":"Import plays"}),jsx("button",{disabled:h,onClick:()=>{try{"postponed"===${decline}?m(!0):c(0)}catch{d("Decision could not be saved.")}},children:"Not now"})]})}
if(typeof self!=="undefined")self.__fixtureComponent=Uv})()})();`;
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
// Source-scope fixture root: the real boundary files copied so --root can be pointed at a mutated tree.
const srcRoot = (mutate = () => {}) => {
  const d = mkdtempSync(join(tmpdir(), 'src-'));
  mkdirSync(join(d, 'src', 'features', 'legacy-import'), { recursive: true });
  for (const f of ['import-legacy.ts', 'LegacyImport.tsx']) cpSync(join(repo, 'src', 'features', 'legacy-import', f), join(d, 'src', 'features', 'legacy-import', f));
  mutate(d);
  return d;
};

// ------------------------------------------------------------------ (B) canary + source scope ----------
test('canary: OFF bundle -> config-false; ON bundle -> config-true; --expect mismatch fails; claim is configuration-only', () => {
  const off = run(['canary', build({ 'main.abc.js': OFF_BUNDLE }), '--expect', 'false']);
  assert.equal(off.status, 0, off.stdout); assert.equal(off.json.verdict, 'config-false'); assert.equal(off.json.literals.length, 1);
  assert.match(off.json.claim, /NOT a behavioural claim/);
  assert.deepEqual(off.json.sourceScope.reads, ['src/features/legacy-import/import-legacy.ts:3', 'src/features/legacy-import/import-legacy.ts:8']);
  const on = run(['canary', build({ 'main.abc.js': ON_BUNDLE }), '--expect', 'true']);
  assert.equal(on.status, 0, on.stdout); assert.equal(on.json.verdict, 'config-true');
  const mis = run(['canary', build({ 'main.abc.js': ON_BUNDLE }), '--expect', 'false']);
  assert.equal(mis.status, 1); assert.match(mis.json.reasons.join('|'), /inlines import-config=true but the resolved build configuration is false/);
});
test('canary fails closed: marker only in a comment, no literal, orphan chunk, two values, undefined value, missing index.html / chunk, unparseable chunk', () => {
  const noLit = COMPONENT({ accept: ON_ACCEPT, decline: ON_DECLINE, attr: 'x' });
  assert.match(run(['canary', `/* coachcore:import-config=false */` && build({ 'main.abc.js': `/* coachcore:import-config=false */\n` + noLit })]).json.reasons.join('|'), /no coachcore:import-config literal/);
  assert.match(run(['canary', build({ 'main.abc.js': noLit, 'orphan.js': 'var a="coachcore:import-config=false";' })]).json.reasons.join('|'), /no coachcore:import-config literal/);
  const two = run(['canary', build({ 'main.abc.js': OFF_BUNDLE + '\n;var dup="coachcore:import-config=true";' })]);
  assert.equal(two.status, 1); assert.match(two.json.reasons.join('|'), /2 distinct import-config values/);
  const undef = run(['canary', build({ 'main.abc.js': COMPONENT({ accept: ON_ACCEPT, decline: ON_DECLINE, attr: 'coachcore:import-config=undefined' }) })]);
  assert.equal(undef.status, 1); assert.match(undef.json.reasons.join('|'), /neither "false" nor "true"/);
  assert.match(run(['canary', build({ 'main.abc.js': OFF_BUNDLE }, { html: false })]).json.reasons.join('|'), /index\.html missing/);
  assert.match(run(['canary', build({ 'other.js': OFF_BUNDLE })]).json.reasons.join('|'), /referenced script\(s\) missing/);
  assert.match(run(['canary', build({ 'main.abc.js': 'this is not javascript {' })]).json.reasons.join('|'), /failed to parse/);
  // Template-literal form (how CRA leaves the marker when not folded) is recognised too.
  assert.equal(run(['canary', build({ 'main.abc.js': OFF_BUNDLE.replace('"coachcore:import-config=false"', '`coachcore:import-config=false`') })]).json.verdict, 'config-false');
});
test('source scope fails closed: the flag read anywhere else under src/, a changed guard, a removed marker, or a missing boundary file -> inconclusive', () => {
  const dir = build({ 'main.abc.js': OFF_BUNDLE });
  assert.equal(run(['canary', dir, '--root', srcRoot()]).status, 0, 'unmodified boundary files pass');
  const extra = srcRoot((d) => writeFileSync(join(d, 'src', 'other.ts'), `export const on = process.env.${FLAG} === 'true';\n`));
  const r1 = run(['canary', dir, '--root', extra]); assert.equal(r1.status, 1); assert.match(r1.json.reasons.join('|'), /read outside the release boundary at src\/other\.ts:1/);
  const guard = srcRoot((d) => { const f = join(d, 'src', 'features', 'legacy-import', 'import-legacy.ts'); writeFileSync(f, readFileSync(f, 'utf8').replace("export async function importLegacy(storage: Storage, session: ImportSession, stillCurrent: () => boolean, backend: ImportBackend) {\n  if (!isLegacyImportEnabled()) throw new Error(DISABLED);", "export async function importLegacy(storage: Storage, session: ImportSession, stillCurrent: () => boolean, backend: ImportBackend) {\n  if (!isLegacyImportEnabled() && !globalThis.__override) throw new Error(DISABLED);")); });
  const r2 = run(['canary', dir, '--root', guard]); assert.equal(r2.status, 1); assert.match(r2.json.reasons.join('|'), /guard not found verbatim in src\/features\/legacy-import\/import-legacy\.ts: export async function importLegacy/);
  const marker = srcRoot((d) => { const f = join(d, 'src', 'features', 'legacy-import', 'LegacyImport.tsx'); writeFileSync(f, readFileSync(f, 'utf8').replace('data-import-config={IMPORT_CONFIG_MARKER}', 'data-import-config="coachcore:import-config=false"')); });
  const r3 = run(['canary', dir, '--root', marker]); assert.equal(r3.status, 1); assert.match(r3.json.reasons.join('|'), /guard not found verbatim in src\/features\/legacy-import\/LegacyImport\.tsx: data-import-config/);
  const missing = srcRoot((d) => rmSync(join(d, 'src', 'features', 'legacy-import', 'LegacyImport.tsx')));
  assert.equal(run(['canary', dir, '--root', missing]).status, 1);
  const noSrc = fixtureRoot({}); assert.match(run(['canary', dir, '--root', noSrc]).json.reasons.join('|'), /src missing/);
});

// ------------------------------------------------------------------ (C) retired-model regressions -----------
// The reviewers' "actual behaviour" harness: execute the WHOLE module factory with a stubbed self/localStorage
// and the backend prop `i`, call the component, click the real returned button, count backend copies/reads and
// storage writes. CustomError is the fourth/third-review external constructor that reaches the backend.
const actualBehaviour = async (code, buttonIndex = 0) => {
  let copies = 0, reads = 0; const m = new Map([['smartPlaybook_plays', JSON.stringify([{ id: 'p', name: 'Proof', phase: 'offense', type: 'pass', players: [], routes: [] }])]]); const writes = [];
  const storage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { writes.push(k); m.set(k, v); }, removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i], get length() { return m.size; } };
  const context = { self: {}, localStorage: storage, i: { copy: async () => { copies += 1; return 'copy-id'; }, read: async () => { reads += 1; return {}; } } };
  context.CustomError = function (msg) { context.i.copy({}, { id: 'external-constructor' }); this.message = msg; };
  try {
    vm.runInNewContext(code, context);
    const ui = context.self.__fixtureComponent({ uid: 'u', teamId: 't', teamName: 'T', backend: context.i });
    ui.b.children[buttonIndex].b.onClick();
  } catch { /* a throwing handler is still observed through the counters */ }
  await new Promise((r) => setImmediate(r)); await new Promise((r) => setTimeout(r, 20));
  return { copies, reads, writes: writes.length };
};
const guard = (code) => code.replace('async function Kv(e,t,n,r){', 'async function Kv(e,t,n,r){if(!cfg.enabled)throw new Error(zv);').replace('function Jv(e,t){', 'function Jv(e,t){if(!cfg.enabled)throw new Error(zv);');
const GETTER = 'const argBox={get value(){i.copy({}, {id:"argument-getter"});return localStorage}};';
// [name, code, oldScannerThatGaveFalseOff | null]
const FALSE_OFF_FIXTURES = [
  ['F1 decoy 3: enabled behaviour behind an OFF marker attribute', COMPONENT({ accept: ON_ACCEPT, decline: ON_DECLINE, attr: 'coachcore:import-config=false' }) + `\n;var prose=${JSON.stringify(DIS)};`, null],
  ['R1 closure mutation: const cfg={enabled:false}; cfg.enabled=true', guard(COMPONENT({ accept: ON_ACCEPT, decline: ON_DECLINE, attr: 'coachcore:import-config=false' })).replace('function Hv(', 'const cfg={enabled:false};cfg.enabled=true;function Hv('), OLD_905],
  ['R1 global state read by the executor', guard(COMPONENT({ accept: ON_ACCEPT, decline: ON_DECLINE, attr: 'coachcore:import-config=false' })).replaceAll('cfg.enabled', 'globalThis.proofEnabled').replace('function Hv(', 'globalThis.proofEnabled=true;function Hv('), OLD_905],
  ['R2 actual call arguments dropped: fifth/third argument enables', COMPONENT({ accept: 'Kv(localStorage,{uid:e,teamId:t,teamName:n},()=>true,i,true)', decline: 'Jv(localStorage,{uid:e,teamId:t},true)', attr: 'coachcore:import-config=false' }).replace('async function Kv(e,t,n,r){', 'async function Kv(e,t,n,r,on){if(!on)throw new Error(zv);').replace('function Jv(e,t){', 'function Jv(e,t,on){if(!on)throw new Error(zv);'), OLD_905],
  ['R2 unresolved member await before the inlined throw', OFF_BUNDLE.replace('try{await async function', 'try{await i.copy({}, {id:"side-effect"});await async function'), OLD_905],
  ['R2 ambiguous onClick: enabled handler then disabled handler', ON_BUNDLE.replace('const y=async()=>', 'const deadOff=async()=>{try{await async function(){throw new Error(zv)}(localStorage)}catch{}};const y=async()=>').replace('onClick:()=>{y()}', 'onClick:()=>{y();deadOff()}').replace('"data-import-config":"coachcore:import-config=true"', '"data-import-config":"coachcore:import-config=false"').replace(ON_DECLINE, OFF_DECLINE), OLD_905],
  ['R3 backend read before the disabled throw', COMPONENT({ accept: 'ReadThenDisabled(localStorage,{uid:e,teamId:t},()=>true,i)', decline: OFF_DECLINE, attr: 'coachcore:import-config=false' }).replace('function Hv(', 'async function ReadThenDisabled(e,t,n,r){await r.read(t,"id");throw new Error(zv)}function Hv('), OLD_905],
  ['D1 argument getter evaluated before the throw', COMPONENT({ accept: 'async function(){throw new Error(zv)}(argBox.value)', decline: 'function(){throw new Error(zv)}(argBox.value)', attr: 'coachcore:import-config=false', prelude: GETTER }), OLD_D14],
  ['D1 default parameter runs before the body', COMPONENT({ accept: 'async function(x=i.copy({}, {id:"default"})){throw new Error(zv)}()', decline: 'function(x=i.copy({}, {id:"default"})){throw new Error(zv)}()', attr: 'coachcore:import-config=false' }), OLD_D14],
  ['D1 handler default-getter parameter', COMPONENT({ accept: OFF_ACCEPT, decline: OFF_DECLINE, attr: 'coachcore:import-config=false', prelude: GETTER, wrap: (h) => h.replace('async()=>', 'async(x=argBox.value)=>') }), OLD_D14],
  ['D1 onClick wrapper reads an effectful getter', COMPONENT({ accept: OFF_ACCEPT, decline: OFF_DECLINE, attr: 'coachcore:import-config=false', prelude: GETTER }).replace('onClick:()=>{y()}', 'onClick:()=>{y();argBox.value}'), OLD_D14],
  ['D1 destructured local that is backend code, not a verified setter', COMPONENT({ accept: OFF_ACCEPT, decline: OFF_DECLINE, attr: 'coachcore:import-config=false' }).replace('[h,f]=(0,r.useState)(!1)', '[h,f]=[!1,()=>i.copy({}, {id:"local"})]'), OLD_D14],
  ['D2 computed literal global replacement globalThis["Error"]', COMPONENT({ accept: OFF_ACCEPT, decline: OFF_DECLINE, attr: 'coachcore:import-config=false', prelude: 'globalThis["Error"]=function(msg){i.copy({}, {id:"constructor"});this.message=msg};' }), OLD_D14],
  ['D2 unresolved constructor is not trusted as native', COMPONENT({ accept: 'async function(){throw new CustomError(zv)}(localStorage)', decline: 'function(){throw new CustomError(zv)}(localStorage)', attr: 'coachcore:import-config=false' }), OLD_D14],
  // Fourth review (Codex, PR #78 comment 6254186547, evidence c319c0b independent-probes.cjs): cab8cab said OFF.
  ['Q1 React state functional updater passed to a verified setter', OFF_BUNDLE.replace('s[0]=v', 's[0]=typeof v==="function"?v(s[0]):v').replace('f(!0),d("")', 'f(()=>{i.copy({}, {id:"updater"});return true}),d("")'), OLD_CAB8],
  ['Q2 valueOf coercion of a local value (+evil)', OFF_BUNDLE.replace('function Hv(', 'const evil={valueOf(){i.copy({}, {id:"coercion"});return 1}};function Hv(').replace('f(!0),d("")', 'f(+evil),d("")'), OLD_CAB8],
  ['Q3 explicit global receiver defeats the strict-this assumption (poison.call(globalThis))', OFF_BUNDLE.replace('function Hv(', 'function poison(){this.Error=function(msg){i.copy({}, {id:"this-global"});this.message=msg}}poison.call(globalThis);function Hv('), OLD_CAB8],
  ['Q4 aliased Reflect rewrites Error', OFF_BUNDLE.replace('function Hv(', 'const R=Reflect;R.set(globalThis,"Error",function(msg){i.copy({}, {id:"reflect-alias"});this.message=msg});function Hv('), OLD_CAB8],
  ['Q5 unverified require function returns malicious hooks', OFF_BUNDLE.replace('return e[r](s,s.exports,n),s.exports', 'return e[r](s,s.exports,n),r===950?{...s.exports,useState:x=>[x,()=>globalThis.i.copy({}, {id:"require"})]}:s.exports'), OLD_CAB8],
  ['Q6 ref.current accessor installed in the component', OFF_BUNDLE.replace('o.current=a;', 'Object.defineProperty(o,"current",{get(){i.copy({}, {id:"ref-getter"});return a}});'), OLD_CAB8],
  ['Q7 outer finally executes after the inner rejection', OFF_BUNDLE.replace('try{await', 'try{try{await').replace('finally{o.current===a&&f(!1)}}', 'finally{o.current===a&&f(!1)}}finally{i.copy({}, {id:"outer-finally"})}}'), OLD_CAB8],
  ['Q8 duplicate onClick key selects the uninspected handler', OFF_BUNDLE.replace('onClick:()=>{y()},children', 'onClick:()=>{y()},onClick:()=>{i.copy({}, {id:"duplicate"})},children'), OLD_CAB8],
];
const FALSE_ON_FIXTURES = [
  ['D3 ON control must not drop explicit false arguments', COMPONENT({ accept: 'Kv(localStorage,{uid:e,teamId:t,teamName:n},()=>true,i,false)', decline: 'Jv(localStorage,{uid:e,teamId:t},false)', attr: 'coachcore:import-config=true' }).replace('async function Kv(e,t,n,r){', 'async function Kv(e,t,n,r,on=true){if(!on)throw new Error(zv);').replace('function Jv(e,t){', 'function Jv(e,t,on=true){if(!on)throw new Error(zv);'), OLD_D14],
  ['Q9 ON predicate mapping is not faithful (o.current="stale")', ON_BUNDLE.replace('o.current=a;', 'o.current="stale";'), OLD_CAB8],
];
test('retired-model regression: baselines really behave as labelled (ON copies/reads/writes; OFF does nothing)', async () => {
  assert.deepEqual(await actualBehaviour(ON_BUNDLE), { copies: 1, reads: 1, writes: 2 });
  assert.deepEqual(await actualBehaviour(OFF_BUNDLE), { copies: 0, reads: 0, writes: 0 });
  assert.deepEqual(await actualBehaviour(OFF_BUNDLE, 1), { copies: 0, reads: 0, writes: 0 });
});
const historySkip = (old, sha) => (old ? false : `superseded scanner ${sha} not available in this clone (shallow checkout); the reproduction leg is SKIPPED, not passed`);
for (const [name, code, old] of FALSE_OFF_FIXTURES) {
  test(`retired-model regression (false OFF) — ${name}: the real button reaches the backend; the fourth revision makes no behavioural claim and the gate stays inconclusive`, async () => {
    const real = await actualBehaviour(code);
    assert.ok(real.copies + real.reads + real.writes > 0, `the fixture must really be enabled/side-effecting: ${JSON.stringify(real)}`);
    const dir = build({ 'main.abc.js': code });
    const c = run(['canary', dir, '--expect', 'false']);
    assert.match(c.json.claim, /NOT a behavioural claim/, 'the output check never asserts OFF behaviour');
    assert.ok(!('components' in c.json) && !('exec' in c.json), 'no handler execution/inspection result exists any more');
    const canaryFile = join(mkdtempSync(join(tmpdir(), 'gate-')), 'canary.json'); writeFileSync(canaryFile, c.stdout);
    const g = run(['gate', '--canary', canaryFile, '--off', '/nonexistent/off.json', '--on', '/nonexistent/on.json']);
    assert.equal(g.status, 1, 'no bundle can pass the proof without executed browser evidence');
    assert.equal(g.json.verdict, 'inconclusive'); assert.match(g.json.reasons.join('|'), /behaviour leg .*results file missing/);
  });
}
for (const [name, code, old] of FALSE_OFF_FIXTURES.filter(([n]) => !n.startsWith('F1'))) {
  const sha = old === OLD_905 || name.startsWith('R') ? '905b1d4' : old === OLD_D14 || name.startsWith('D') ? 'd14aa7b' : 'cab8cab';
  test(`review reproduction (false OFF) — ${name}: the superseded ${sha} scanner returned OFF for this bundle`, { skip: historySkip(old, sha) }, () => {
    const o = run(['scan', build({ 'main.abc.js': code })], {}, repo, old);
    assert.equal(o.status, 0, `${name}: the superseded scanner must show the false OFF (reproduces the review finding): ${o.stdout.slice(0, 160)}`); assert.equal(o.json.verdict, 'off');
  });
}
for (const [name, code, old] of FALSE_ON_FIXTURES) {
  test(`retired-model regression (false ON) — ${name}: the real UI performs no backend call; the fourth revision's ON control is the accepted browser suite, not output synthesis`, async () => {
    const real = await actualBehaviour(code); assert.equal(real.copies + real.reads, 0, JSON.stringify(real));
    const r = run(['negative-control', build({ 'main.abc.js': code })]); assert.equal(r.status, 2, 'negative-control by output execution no longer exists (usage error)');
    const g = run(['gate', '--canary', '/nonexistent', '--off', '/nonexistent', '--on', '/nonexistent']); assert.equal(g.status, 1);
  });
  const sha = name.startsWith('D3') ? 'd14aa7b' : 'cab8cab';
  test(`review reproduction (false ON) — ${name}: the superseded ${sha} negative control returned ON for this bundle`, { skip: historySkip(old, sha) }, () => {
    const o = run(['negative-control', build({ 'main.abc.js': code })], {}, repo, old);
    assert.equal(o.status, 0, `${name}: the superseded negative control must show the false ON`); assert.equal(o.json.verdict, 'on');
  });
}
test('retired-model regression — Q1 with REAL React 19 under jsdom (reviewer harness real-react-updater.cjs): the functional updater reaches the backend; cab8cab said OFF', { skip: !existsSync(join(repo, 'node_modules', 'jsdom')) || !existsSync(join(repo, 'node_modules', 'react-dom', 'client.js')) ? 'jsdom/react-dom not installed' : false }, () => {
  const code = OFF_BUNDLE.replace('t.useState=function(e){var s=[e,function(v){s[0]=v}];return s}', 't.useState=function(e){return globalThis.realReact.useState(e)}').replace('t.useRef=function(e){return{current:e}}', 't.useRef=function(e){return globalThis.realReact.useRef(e)}').replace('f(!0),d("")', 'f(()=>{i.copy({}, {id:"updater"});return true}),d("")');
  const harness = `const vm=require('vm');const {JSDOM}=require('jsdom');const React=require('react');const dom=new JSDOM('<!doctype html><div id="root"></div>');global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true;const {createRoot}=require('react-dom/client');
let copies=0,ui;const ctx={self:{},realReact:React,localStorage:{getItem:()=>null},i:{copy:async()=>{copies++;return 'copy-id'}}};vm.runInNewContext(${JSON.stringify(code)},ctx);
function Parent(){ui=ctx.self.__fixtureComponent({uid:'u',teamId:'t',teamName:'T',backend:ctx.i});return null}
(async()=>{const root=createRoot(document.getElementById('root'));await React.act(async()=>root.render(React.createElement(Parent)));await React.act(async()=>{ui.b.children[0].b.onClick();await new Promise(r=>setImmediate(r))});console.log(JSON.stringify({react:React.version,copies}));await React.act(async()=>root.unmount());})();`;
  const f = join(mkdtempSync(join(tmpdir(), 'rr-')), 'h.cjs'); writeFileSync(f, harness);
  const r = spawnSync(process.execPath, [f], { encoding: 'utf8', env: { ...cleanEnv(), NODE_PATH: join(repo, 'node_modules') }, cwd: repo });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.match(out.react, /^19\./); assert.equal(out.copies, 1, 'real React invokes the updater: the backend is reached');
});
test('review reproduction — Q1 real-React bundle: the superseded cab8cab scanner returned OFF', { skip: historySkip(OLD_CAB8, 'cab8cab') }, () => {
  const code = OFF_BUNDLE.replace('t.useState=function(e){var s=[e,function(v){s[0]=v}];return s}', 't.useState=function(e){return globalThis.realReact.useState(e)}').replace('t.useRef=function(e){return{current:e}}', 't.useRef=function(e){return globalThis.realReact.useRef(e)}').replace('f(!0),d("")', 'f(()=>{i.copy({}, {id:"updater"});return true}),d("")');
  const o = run(['scan', build({ 'main.abc.js': code })], {}, repo, OLD_CAB8); assert.equal(o.status, 0); assert.equal(o.json.verdict, 'off');
});
test('retired-model regression: the fourth revision has no scan/negative-control output-execution commands at all (usage error), so none of the above can be re-accepted by a model', () => {
  assert.equal(run(['scan', build({ 'main.abc.js': OFF_BUNDLE })]).status, 2);
  assert.equal(run(['negative-control', build({ 'main.abc.js': ON_BUNDLE })]).status, 2);
});

// ------------------------------------------------------------------ (D) gate on Playwright results ---------
const OFF_TITLES = ['RP-OFF-01 [release proof] owner with device plays', 'RP-OFF-02 [release proof] unfinished import', 'RP-OFF-03 [release proof] owner without device plays'];
const ON_TITLES = ['D10-01 accept: explicit consent copies', 'D10-02 decline: "Not now" writes nothing'];
const results = (specs) => ({ stats: { expected: specs.filter((s) => s.status === 'expected').length }, suites: [{ specs: specs.map((s) => ({ title: s.title, tests: [{ projectName: s.project || 'import-off-chromium', status: s.status, results: s.results === undefined ? [{ status: 'passed' }] : s.results.map((x) => ({ status: x })) }] })) }] });
const writeJson = (obj) => { const f = join(mkdtempSync(join(tmpdir(), 'res-')), 'results.json'); writeFileSync(f, JSON.stringify(obj)); return f; };
const CANARY_FALSE = () => { const c = run(['canary', build({ 'main.abc.js': OFF_BUNDLE }), '--expect', 'false']); const f = join(mkdtempSync(join(tmpdir(), 'can-')), 'canary.json'); writeFileSync(f, c.stdout); return f; };
test('gate: config-false canary + all RP-OFF-* and D10-01/D10-02 passed -> off (exit 0) with the establishes/assumptions statement', () => {
  const all = writeJson(results([...OFF_TITLES.map((title) => ({ title, status: 'expected' })), ...ON_TITLES.map((title) => ({ title, status: 'expected', project: 'on-control-chromium' }))]));
  const out = join(mkdtempSync(join(tmpdir(), 'gate-')), 'gate.json');
  const g = run(['gate', '--canary', CANARY_FALSE(), '--off', all, '--on', all, '--out', out]);
  assert.equal(g.status, 0, g.stdout); assert.equal(g.json.verdict, 'off');
  assert.match(g.json.establishes, /release bundle itself was not executed/); assert.match(g.json.establishes, /DefinePlugin single substitution/);
  assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')).legs.behaviourOff.executed, ['RP-OFF-01@import-off-chromium:expected', 'RP-OFF-02@import-off-chromium:expected', 'RP-OFF-03@import-off-chromium:expected', 'D10-01@on-control-chromium:expected', 'D10-02@on-control-chromium:expected']);
});
test('gate fails closed: skipped OFF test, failed ON control, missing OFF test, not-executed test (no results), flaky pass, missing/unparseable files, config-true canary', () => {
  const can = CANARY_FALSE();
  const ok = (titles, project) => titles.map((title) => ({ title, status: 'expected', project }));
  const onOk = ok(ON_TITLES, 'on-control-chromium');
  const skipped = writeJson(results([{ title: OFF_TITLES[0], status: 'expected' }, { title: OFF_TITLES[1], status: 'skipped', results: [] }, { title: OFF_TITLES[2], status: 'expected' }, ...onOk]));
  let g = run(['gate', '--canary', can, '--off', skipped, '--on', skipped]); assert.equal(g.status, 1); assert.match(g.json.reasons.join('|'), /RP-OFF-02 was not executed|was skipped, not executed/);
  const failedOn = writeJson(results([...ok(OFF_TITLES), { title: ON_TITLES[0], status: 'expected', project: 'on-control-chromium' }, { title: ON_TITLES[1], status: 'unexpected', results: ['failed'], project: 'on-control-chromium' }]));
  g = run(['gate', '--canary', can, '--off', failedOn, '--on', failedOn]); assert.equal(g.status, 1); assert.match(g.json.reasons.join('|'), /ON control .*D10-02 \(on-control-chromium\) did not pass: unexpected \[failed\]/);
  const missingOff = writeJson(results([...ok(OFF_TITLES.slice(0, 2)), ...onOk]));
  g = run(['gate', '--canary', can, '--off', missingOff, '--on', missingOff]); assert.equal(g.status, 1); assert.match(g.json.reasons.join('|'), /RP-OFF-03 was not executed/);
  const flaky = writeJson(results([{ title: OFF_TITLES[0], status: 'flaky', results: ['failed', 'passed'] }, ...ok(OFF_TITLES.slice(1)), ...onOk]));
  g = run(['gate', '--canary', can, '--off', flaky, '--on', flaky]); assert.equal(g.status, 1); assert.match(g.json.reasons.join('|'), /RP-OFF-01 .* did not pass: flaky \[failed,passed\]/);
  g = run(['gate', '--canary', can, '--off', '/nonexistent', '--on', '/nonexistent']); assert.equal(g.status, 1); assert.match(g.json.reasons.join('|'), /results file missing/);
  const bad = join(mkdtempSync(join(tmpdir(), 'res-')), 'results.json'); writeFileSync(bad, '{not json');
  g = run(['gate', '--canary', can, '--off', bad, '--on', bad]); assert.equal(g.status, 1); assert.match(g.json.reasons.join('|'), /unparseable/);
  const all = writeJson(results([...ok(OFF_TITLES), ...onOk]));
  const canTrue = run(['canary', build({ 'main.abc.js': ON_BUNDLE })]); const ct = join(mkdtempSync(join(tmpdir(), 'can-')), 'c.json'); writeFileSync(ct, canTrue.stdout);
  g = run(['gate', '--canary', ct, '--off', all, '--on', all]); assert.equal(g.status, 1); assert.match(g.json.reasons.join('|'), /canary verdict is config-true/);
  g = run(['gate', '--canary', '/nonexistent', '--off', all, '--on', all]); assert.equal(g.status, 1); assert.match(g.json.reasons.join('|'), /canary report missing/);
});

// ------------------------------------------------------------------ (E) source / workflow contract ----------
test('source contract: boundary unchanged, committed pin and explicit opt-ins preserved, import-OFF build mode, separate release-proof config, main suite excludes the OFF spec, workflow wiring', () => {
  const mod = readFileSync(join(repo, 'src', 'features', 'legacy-import', 'import-legacy.ts'), 'utf8');
  assert.match(mod, /isLegacyImportEnabled = \(\) => process\.env\.REACT_APP_ENABLE_LEGACY_IMPORT === 'true'/);
  assert.match(mod, /export const IMPORT_CONFIG_MARKER = `coachcore:import-config=\$\{process\.env\.REACT_APP_ENABLE_LEGACY_IMPORT\}`/);
  assert.match(readFileSync(join(repo, 'src', 'features', 'legacy-import', 'LegacyImport.tsx'), 'utf8'), /data-import-config=\{IMPORT_CONFIG_MARKER\}/);
  assert.match(readFileSync(join(repo, '.env.production'), 'utf8'), new RegExp(`^${FLAG}=false$`, 'm'));
  const ba = readFileSync(join(repo, 'e2e', 'scripts', 'build-app.sh'), 'utf8');
  assert.match(ba, new RegExp(`^  export ${FLAG}=true$`, 'm')); assert.match(ba, new RegExp(`^  export ${FLAG}=false$`, 'm')); assert.match(ba, /E2E_IMPORT_OFF/);
  assert.match(readFileSync(join(repo, '.env.test'), 'utf8'), new RegExp(`^${FLAG}=true$`, 'm'));
  assert.match(readFileSync(join(repo, 'e2e', 'playwright.config.ts'), 'utf8'), /testIgnore: \['\*\*\/release-import-off\.spec\.ts'\]/);
  const rp = readFileSync(join(repo, 'e2e', 'playwright.release-proof.config.ts'), 'utf8');
  assert.match(rp, /\.app-build-import-off 3100/); assert.match(rp, /\(D10-01\|D10-02\) /);
  const spec = readFileSync(join(repo, 'e2e', 'tests', 'release-import-off.spec.ts'), 'utf8');
  for (const t of ['RP-OFF-01', 'RP-OFF-02', 'RP-OFF-03']) assert.match(spec, new RegExp(`test\\('${t} `));
  const wf = readFileSync(join(repo, '.github', 'workflows', 'e2e-emulator.yml'), 'utf8');
  assert.match(wf, /node scripts\/security\/release-import-config\.test\.mjs/);
  assert.match(wf, /RELEASE_RETAIN_DIR=e2e\/ci-evidence\/release-build/);
  assert.match(wf, /npm --prefix e2e run build:app:import-off/); assert.match(wf, /npm --prefix e2e run test:release-proof:browser/);
  assert.match(wf, /release-import-config\.js gate --canary e2e\/ci-evidence\/release-canary\.json/);
  assert.match(wf, /Release gate not run in this job/);
});

// ------------------------------------------------------------------ (F) end-to-end (real script) -----------
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

// ------------------------------------------------------------------ (G) slow: real builds ------------------
const SLOW = process.env.RELEASE_PROOF_BUILD ? false : 'set RELEASE_PROOF_BUILD=1 to run the real builds';
const runProof = (env) => { const out = join(mkdtempSync(join(tmpdir(), 'rb-')), 'build'); const r = spawnSync('bash', [proof, 'coach-core-mvp-staging-239'], { cwd: repo, encoding: 'utf8', env: { ...cleanEnv(), RELEASE_BUILD_DIR: out, RELEASE_MANIFEST: out + '-manifest.sha256', RELEASE_CANARY_JSON: out + '-canary.json', ...env } }); return { ...r, out }; };

test('REAL release-shaped build: the script EXITS 0 for L1+L2, claims no behaviour, retains output + canary + provenance; the gate on that canary WITHOUT browser results is inconclusive', { skip: SLOW }, () => {
  assert.ok(existsSync(join(repo, 'e2e', '.app-build', 'static', 'js')), 'needs a fresh same-commit emulator build (npm --prefix e2e run build:app) for the required negative control');
  const hasOff = existsSync(join(repo, 'e2e', '.app-build-import-off', 'static', 'js'));
  const retain = join(mkdtempSync(join(tmpdir(), 'retain-')), 'release-build');
  const r = runProof({ RELEASE_RETAIN_DIR: retain });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, new RegExp(`RESULT: ${hasOff ? 19 : 18} passed, 0 failed \\(legs L1 configuration \\+ L2 inlining; L3 behaviour is decided by 'release-import-config.js gate'`));
  assert.match(r.stdout, /PASS effective build-time import config is OFF \(\.env\.production="false"; CRA loader agrees: "false"\)/);
  assert.match(r.stdout, /PASS source scope: import flag read only at the release boundary \(src\/features\/legacy-import\/import-legacy\.ts:3, src\/features\/legacy-import\/import-legacy\.ts:8; guards verbatim\)/);
  assert.match(r.stdout, /PASS shipped entry chunks inline import-config=false \(static\/js\/main\.[0-9a-f]+\.js@\d+; 1 literal\(s\), 1 value; configuration inlining, not a behaviour claim\)/);
  assert.match(r.stdout, /PASS negative control: canary reads the opted-in emulator build as import-config=true/);
  if (hasOff) assert.match(r.stdout, /PASS import-OFF emulator build \(behavioural-leg input\) inlines import-config=false; \d+ files hashed/);
  assert.doesNotMatch(r.stdout, /proven OFF by execut|executable import code is OFF/);
  // Retained output: index.html + shipped JS + asset-manifest + canary + provenance; no env files; hashes match the manifest.
  const files = readdirSync(retain); assert.ok(files.includes('index.html') && files.includes('release-build.context') && files.includes('release-canary.json') && files.includes('static'));
  assert.ok(!files.some((f) => f.startsWith('.env')));
  const ctx = readFileSync(join(retain, 'release-build.context'), 'utf8');
  assert.match(ctx, /candidate_sha=[0-9a-f]{40}/); assert.match(ctx, /canary_verdict=config-false literals=1 claim=configuration-inlining-only/); assert.match(ctx, /webpack=5\./); assert.match(ctx, /terser=5\./); assert.match(ctx, /build_manifest_sha256=[0-9a-f]{64}/);
  assert.match(ctx, hasOff ? /import_off_build_manifest_sha256=[0-9a-f]{64}/ : /import_off_build_manifest_sha256=absent/);
  const manifest = readFileSync(r.out + '-manifest.sha256', 'utf8');
  for (const js of readdirSync(join(retain, 'static', 'js'))) { const h = createHash('sha256').update(readFileSync(join(retain, 'static', 'js', js))).digest('hex'); assert.ok(manifest.includes(`${h}  ./static/js/${js}`), `retained ${js} must be byte-identical to the manifest entry`); }
  const canaryJson = JSON.parse(readFileSync(join(retain, 'release-canary.json'), 'utf8')); assert.equal(canaryJson.verdict, 'config-false');
  const g = run(['gate', '--canary', join(retain, 'release-canary.json'), '--off', '/nonexistent', '--on', '/nonexistent']);
  assert.equal(g.status, 1, 'a passing L1+L2 script is NOT the proof: without executed browser results the gate is inconclusive');
});
test('F2 regression: a nonzero real proof (broken negative control: comment-only ON marker, no hooks/ports/demo) is REJECTED by status, even though every OFF PASS line is present', { skip: SLOW }, () => {
  const fake = build({ 'main.abc.js': `/* coachcore:import-config=true */ var noop=1;` });
  const r = runProof({ EMULATOR_BUILD_DIR: fake });
  assert.notEqual(r.status, 0, 'the suite must not call a failing proof a pass');
  assert.match(r.stdout, /PASS shipped entry chunks inline import-config=false/, 'OFF configuration evidence is still printed');
  assert.match(r.stdout, /FAIL negative control -- pattern __coachCoreE2E does not detect the emulator build/);
  assert.match(r.stdout, /FAIL negative control -- canary does not read the opted-in emulator build as config-true: .*no coachcore:import-config literal/);
  assert.match(r.stdout, /RESULT: \d+ passed, >=1 failed/);
});
