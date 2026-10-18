#!/usr/bin/env node
/* eslint-disable no-console */
// Release-proof for the legacy-import default-OFF decision (PR #78, fourth revision, 2026-10-18).
//
// WHY THIS REVISION EXISTS. Revisions c9d49dd, 905b1d4, d14aa7b and cab8cab tried to prove, from the
// minified SHIPPED chunk alone, that the import UI handlers are inert ("OFF by executing/inspecting the
// shipped code"). Four independent reviews showed the same defect each time with new inputs: the
// verifier accepted a static MODEL of JavaScript (whitelisted grammar, "verified" setters, "native"
// Error, strict-mode `this`, predicate synthesis) while the ENGINE evaluates setters, valueOf coercion,
// accessor properties, aliased Reflect, explicit global receivers, duplicate JSX keys, enclosing
// finally blocks and unverified module factories. A behavioural property of arbitrary compiled code is
// not decidable by a syntactic whitelist; every added exception widened the accepted language without
// re-establishing soundness. This revision therefore makes NO behavioural claim from output analysis.
//
// THE CONTRACT (three decidable legs; the proof is the conjunction, reported by `gate`):
//   L1 configuration  `resolve`  — the effective build-time REACT_APP_ENABLE_LEGACY_IMPORT for the release
//                      build is exactly "false" from a committed-basename file, by an independent dotenv
//                      resolution AND CRA's own loader in the same environment the build then runs in.
//                      verify-release-build.sh refuses to build otherwise.
//   L2 inlining       `canary`   — the chunks index.html actually ships contain, as STRING LITERALS in
//                      parsed code (never comments), the build-time marker `coachcore:import-config=<v>`
//                      with exactly one distinct <v>, equal to the resolved value. The source scope check
//                      requires the flag to be read in exactly one place (isLegacyImportEnabled) and the
//                      marker to be derived from the same variable, so webpack's DefinePlugin substituted
//                      the SAME value into every read of the flag in this compilation.
//   L3 behaviour      real browser — the SAME commit, built by the SAME toolchain with the flag OFF and
//                      emulator wiring on, is driven by Playwright against the Firebase emulators
//                      (e2e/tests/release-import-off.spec.ts): owner signed in, device plays and an
//                      unfinished claim seeded; the UI shows the disabled notice and no import/decline/
//                      resume control, no `plays` document is written, device state is byte-identical.
//                      The ON control is the ACCEPTED import suite (D10-01/D10-02) on the same-commit
//                      opted-in build: real arguments, real predicates, nothing synthesised.
//                      `gate` consumes both Playwright results files and refuses to PASS without them.
//
// WHAT THE PROOF ESTABLISHES: for the inspected commit and toolchain, the release-shaped build was
// produced with the flag OFF (L1), that value is what the compiler inlined (L2), and the application
// compiled from that source with that value exhibits the disabled behaviour under real execution (L3).
// HOST ASSUMPTIONS (stated, not verified here): (a) webpack DefinePlugin substitutes one value per
// compilation for `process.env.<FLAG>` (toolchain integrity: react-scripts 5.0.1 / webpack 5 / terser
// as pinned by package-lock.json; versions are recorded in release-build.context); (b) the emulator
// build and the release build differ only by the emulator/project env values (same source, same
// toolchain, same flag value) — the proof does NOT execute the release bundle itself; (c) the shipped
// bundle is the one the proof built (hashes retained; deployment comparison is out of scope).
// NOT ESTABLISHED: any property of a bundle not produced by this proof from this commit, and any
// claim about handler inertness derived from minified output (retired as unsound).
//
//   resolve [--root <dir>] [--node-env production]
//   canary  <build-dir> [--root <dir>] [--expect false|true]
//   gate    --canary <canary.json> --off <off-results.json> --on <on-results.json> [--out <gate.json>]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const acorn = require('acorn');

const FLAG = 'REACT_APP_ENABLE_LEGACY_IMPORT';
const MARKER_PREFIX = 'coachcore:import-config=';
const CANARY_OFF = `${MARKER_PREFIX}false`;
const CANARY_ON = `${MARKER_PREFIX}true`;
const COMMITTED = new Set(['.env.production', '.env']);
// Behavioural leg: every title must be present and passed in the OFF run (release-import-off.spec.ts)
// and in the ON control run (the accepted D10 suite on the opted-in build).
const OFF_TESTS = ['RP-OFF-01', 'RP-OFF-02', 'RP-OFF-03'];
const ON_CONTROL_TESTS = ['D10-01', 'D10-02'];

function arg(flag, dflt) { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : dflt; }

// ---------------------------------------------------------------- L1: resolve --------------------
function resolveIndependently(root, nodeEnv, shellEnv) {
  const dotenv = require('dotenv');
  const files = [`.env.${nodeEnv}.local`, nodeEnv !== 'test' && '.env.local', `.env.${nodeEnv}`, '.env'].filter(Boolean);
  const seen = [];
  if (Object.prototype.hasOwnProperty.call(shellEnv, FLAG)) seen.push({ source: 'shell', value: shellEnv[FLAG] });
  for (const f of files) {
    const full = path.join(root, f);
    if (!fs.existsSync(full)) continue;
    const parsed = dotenv.parse(fs.readFileSync(full));
    if (Object.prototype.hasOwnProperty.call(parsed, FLAG)) seen.push({ source: f, value: parsed[FLAG] });
  }
  return { effective: seen.length ? seen[0] : { source: 'unset', value: undefined }, all: seen, files };
}
function resolveWithCra(root, nodeEnv, shellEnv) {
  const envJs = require.resolve('react-scripts/config/env', { paths: [path.resolve(__dirname, '..', '..')] });
  const code = `process.chdir(${JSON.stringify(root)}); require(${JSON.stringify(envJs)}); process.stdout.write(JSON.stringify({ has: Object.prototype.hasOwnProperty.call(process.env, ${JSON.stringify(FLAG)}), value: process.env[${JSON.stringify(FLAG)}] }));`;
  const r = spawnSync(process.execPath, ['-e', code], { cwd: root, env: { ...shellEnv, NODE_ENV: nodeEnv }, encoding: 'utf8' });
  if (r.status !== 0) return { error: `CRA loader failed (exit ${r.status}): ${(r.stderr || '').split('\n')[0]}` };
  try { return JSON.parse(r.stdout); } catch { return { error: 'CRA loader produced no parseable output' }; }
}
function resolve(root, nodeEnv) {
  const shellEnv = process.env;
  const reasons = [];
  const mine = resolveIndependently(root, nodeEnv, shellEnv);
  const cra = resolveWithCra(root, nodeEnv, shellEnv);
  const eff = mine.effective;
  if (cra.error) reasons.push(`inconclusive: ${cra.error}`);
  else if ((cra.has ? cra.value : undefined) !== eff.value) reasons.push(`inconclusive: CRA loader resolves ${FLAG}=${cra.has ? JSON.stringify(cra.value) : 'unset'} but independent resolution gives ${eff.value === undefined ? 'unset' : JSON.stringify(eff.value)} (${eff.source}); expansion or an unexpected source is involved`);
  if (eff.value === 'true') reasons.push(`${FLAG} is ENABLED for this build by ${eff.source}`);
  else if (eff.value !== 'false') reasons.push(`${FLAG} is not pinned to exactly "false" for this build (effective: ${eff.value === undefined ? 'unset' : JSON.stringify(eff.value)} from ${eff.source}); release builds must be unambiguous`);
  if (eff.value === 'false' && !COMMITTED.has(eff.source)) reasons.push(`${FLAG} is pinned by ${eff.source}, not by a committed-basename file (${[...COMMITTED].join(' or ')}); local/shell pins are not release configuration`);
  for (const s of mine.all.slice(1)) if (s.value === 'true') reasons.push(`note: ${s.source} would enable import if ${eff.source} were removed`);
  const prod = path.join(root, '.env.production');
  if (!fs.existsSync(prod) || !fs.readFileSync(prod, 'utf8').split(/\r?\n/).includes(`${FLAG}=false`)) reasons.push(`.env.production does not contain the exact line ${FLAG}=false`);
  const hard = reasons.filter((r) => !r.startsWith('note:'));
  console.log(JSON.stringify({ flag: FLAG, nodeEnv, effective: eff, sources: mine.all.map((s) => `${s.source}=${JSON.stringify(s.value)}`), cra: cra.error ? cra.error : (cra.has ? cra.value : 'unset'), ok: hard.length === 0, reasons }));
  return hard.length === 0 ? 0 : 1;
}

// ---------------------------------------------------------------- L2: canary ----------------------
// Source scope: the flag must be read in exactly these two source lines (and nowhere else under src/),
// so that one DefinePlugin substitution governs both the behaviour switch and the output marker.
const SOURCE_SCOPE = {
  file: path.join('src', 'features', 'legacy-import', 'import-legacy.ts'),
  lines: [
    `export const isLegacyImportEnabled = () => process.env.${FLAG} === 'true';`,
    `export const IMPORT_CONFIG_MARKER = \`${MARKER_PREFIX}\${process.env.${FLAG}}\`;`,
  ],
  // Every import/decline entry point consults the switch before any effect; the component renders the
  // marker and gates its offer on the same switch. Exact lines, so a changed guard is inconclusive.
  guards: [
    [path.join('src', 'features', 'legacy-import', 'import-legacy.ts'), 'export function declineImport(storage: Storage, session: ImportSession) {\n  if (!isLegacyImportEnabled()) throw new Error(DISABLED);'],
    [path.join('src', 'features', 'legacy-import', 'import-legacy.ts'), 'export async function importLegacy(storage: Storage, session: ImportSession, stillCurrent: () => boolean, backend: ImportBackend) {\n  if (!isLegacyImportEnabled()) throw new Error(DISABLED);'],
    [path.join('src', 'features', 'legacy-import', 'LegacyImport.tsx'), 'const enabled = isLegacyImportEnabled();'],
    [path.join('src', 'features', 'legacy-import', 'LegacyImport.tsx'), 'data-import-config={IMPORT_CONFIG_MARKER}'],
    [path.join('src', 'features', 'legacy-import', 'LegacyImport.tsx'), "if (!enabled) {\n          if (localStorage.getItem(LEGACY_KEY)) setError('Device-play import is disabled in this build. Original plays and unfinished imports remain on this device.');\n          return;\n        }"],
  ],
};
function listFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    // Test files are never part of the webpack entry graph (CRA builds from src/index only).
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '__tests__') listFiles(p, out); } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name) && !/\.test\.|\.spec\./.test(e.name)) out.push(p);
  }
  return out;
}
function sourceScope(root) {
  const reasons = [];
  const src = path.join(root, 'src');
  if (!fs.existsSync(src)) return { ok: false, reasons: [`inconclusive: ${src} missing`] };
  const reads = [];
  for (const f of listFiles(src)) {
    const text = fs.readFileSync(f, 'utf8');
    if (!text.includes(FLAG)) continue;
    text.split(/\r?\n/).forEach((line, i) => { if (line.includes(FLAG)) reads.push({ file: path.relative(root, f), line: i + 1, text: line.trim() }); });
  }
  const expected = SOURCE_SCOPE.lines;
  const inFile = reads.filter((r) => r.file === SOURCE_SCOPE.file && expected.includes(r.text));
  const other = reads.filter((r) => !(r.file === SOURCE_SCOPE.file && expected.includes(r.text)) && !/^\/\//.test(r.text));
  if (inFile.length !== expected.length) reasons.push(`inconclusive: expected exactly ${expected.length} flag reads in ${SOURCE_SCOPE.file}, found ${inFile.length}`);
  for (const r of other) reasons.push(`inconclusive: ${FLAG} is read outside the release boundary at ${r.file}:${r.line} (${r.text.slice(0, 80)})`);
  for (const [file, snippet] of SOURCE_SCOPE.guards) {
    const full = path.join(root, file);
    if (!fs.existsSync(full) || !fs.readFileSync(full, 'utf8').includes(snippet)) reasons.push(`inconclusive: guard not found verbatim in ${file}: ${snippet.split('\n')[0].slice(0, 70)}...`);
  }
  return { ok: reasons.length === 0, reasons, reads: reads.map((r) => `${r.file}:${r.line}`) };
}
function entryChunks(dir) {
  const html = path.join(dir, 'index.html');
  if (!fs.existsSync(html)) return { error: 'inconclusive: index.html missing — cannot determine the shipped entry graph' };
  const text = fs.readFileSync(html, 'utf8');
  const srcs = [...text.matchAll(/<script[^>]*\ssrc="([^"]+\.js)"[^>]*>/g)].map((m) => m[1]).filter((s) => !/^https?:/.test(s));
  if (!srcs.length) return { error: 'inconclusive: index.html references no local script' };
  const files = srcs.map((s) => path.join(dir, s.replace(/^\//, '')));
  const missing = files.filter((f) => !fs.existsSync(f));
  if (missing.length) return { error: `inconclusive: referenced script(s) missing: ${missing.map((f) => path.relative(dir, f)).join(', ')}` };
  return { files };
}
// Marker literals in PARSED code only: string Literals and TemplateLiteral quasis (comments are not tokens).
function markerLiterals(code) {
  const found = [];
  const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true, allowReturnOutsideFunction: true, onToken: (t) => {
    if (t.type.label === 'string' && typeof t.value === 'string' && t.value.includes(MARKER_PREFIX)) found.push({ value: t.value, start: t.start });
    if (t.type.label === 'template' && typeof t.value === 'string' && t.value.includes(MARKER_PREFIX)) found.push({ value: t.value, start: t.start });
  } });
  void ast;
  return found;
}
function canary(dir, root, expect) {
  const report = { dir, entryChunks: [], literals: [], verdict: 'inconclusive', claim: 'configuration literal in shipped code; NOT a behavioural claim (see gate)', reasons: [] };
  const entries = entryChunks(dir);
  if (entries.error) { report.reasons.push(entries.error); return report; }
  report.entryChunks = entries.files.map((f) => path.relative(dir, f));
  const values = new Set();
  for (const f of entries.files) {
    const code = fs.readFileSync(f, 'utf8');
    let lits;
    try { lits = markerLiterals(code); } catch (e) { report.reasons.push(`inconclusive: ${path.relative(dir, f)} failed to parse: ${String(e.message).slice(0, 120)}`); continue; }
    for (const l of lits) {
      const m = /coachcore:import-config=([^\s"'`]*)/.exec(l.value);
      const v = m ? m[1] : '';
      values.add(v);
      report.literals.push({ chunk: path.relative(dir, f), offset: l.start, value: l.value.slice(0, 60) });
    }
  }
  const scope = sourceScope(root);
  report.sourceScope = scope;
  for (const r of scope.reasons) report.reasons.push(r);
  if (!report.literals.length) report.reasons.push('inconclusive: no coachcore:import-config literal in any shipped entry chunk (flag not inlined, or component not shipped)');
  if (values.size > 1) report.reasons.push(`contradictory output: ${values.size} distinct import-config values in shipped code (${[...values].join(', ')})`);
  const v = [...values][0];
  if (values.size === 1 && v !== 'false' && v !== 'true') report.reasons.push(`inconclusive: import-config value ${JSON.stringify(v)} is neither "false" nor "true" (unpinned build inlines "undefined")`);
  if (values.size === 1 && expect && v !== expect) report.reasons.push(`shipped code inlines import-config=${v} but the resolved build configuration is ${expect}`);
  if (!report.reasons.length) report.verdict = v === 'false' ? 'config-false' : 'config-true';
  report.ok = report.reasons.length === 0;
  return report;
}

// ---------------------------------------------------------------- L3 + gate -----------------------
function playwrightResults(file) {
  if (!file || !fs.existsSync(file)) return { error: `results file missing: ${file || '(none)'}` };
  let json;
  try { json = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return { error: `results file unparseable: ${file}` }; }
  const tests = [];
  const walk = (suite) => {
    for (const spec of suite.specs || []) for (const t of spec.tests || []) tests.push({ title: spec.title, project: t.projectName, status: t.status, results: (t.results || []).map((r) => r.status) });
    for (const s of suite.suites || []) walk(s);
  };
  for (const s of json.suites || []) walk(s);
  return { tests, stats: json.stats || null };
}
function requireTests(results, prefixes, label) {
  const reasons = [];
  if (results.error) return [`inconclusive: ${label}: ${results.error}`];
  const executed = results.tests.filter((t) => t.results.length);
  for (const p of prefixes) {
    const hits = executed.filter((t) => t.title.startsWith(`${p} `) || t.title === p);
    if (!hits.length) { reasons.push(`inconclusive: ${label}: ${p} was not executed`); continue; }
    for (const h of hits) if (h.status !== 'expected' || h.results.some((s) => s !== 'passed')) reasons.push(`${label}: ${p} (${h.project}) did not pass: ${h.status} [${h.results.join(',')}]`);
  }
  const skipped = results.tests.filter((t) => t.status === 'skipped' && prefixes.some((p) => t.title.startsWith(`${p} `)));
  for (const s of skipped) reasons.push(`inconclusive: ${label}: ${s.title.slice(0, 40)} (${s.project}) was skipped, not executed`);
  return reasons;
}
function gate(canaryFile, offFile, onFile, outFile) {
  const report = { verdict: 'inconclusive', legs: {}, reasons: [], establishes: null };
  let can = null;
  try { can = JSON.parse(fs.readFileSync(canaryFile, 'utf8')); } catch { report.reasons.push(`inconclusive: canary report missing/unparseable: ${canaryFile}`); }
  if (can) { report.legs.canary = { verdict: can.verdict, literals: can.literals.length, chunks: can.entryChunks }; if (can.verdict !== 'config-false') report.reasons.push(`configuration leg: canary verdict is ${can.verdict}: ${can.reasons.join(' | ')}`); }
  const off = playwrightResults(offFile), on = playwrightResults(onFile);
  report.legs.behaviourOff = off.error ? { error: off.error } : { executed: off.tests.filter((t) => t.results.length).map((t) => `${t.title.split(' ')[0]}@${t.project}:${t.status}`), stats: off.stats };
  report.legs.behaviourOnControl = on.error ? { error: on.error } : { executed: on.tests.filter((t) => t.results.length).map((t) => `${t.title.split(' ')[0]}@${t.project}:${t.status}`), stats: on.stats };
  report.reasons.push(...requireTests(off, OFF_TESTS, 'behaviour leg (import-OFF emulator build)'));
  report.reasons.push(...requireTests(on, ON_CONTROL_TESTS, 'ON control (opted-in emulator build, accepted D10 suite)'));
  if (!report.reasons.length) {
    report.verdict = 'off';
    report.establishes = 'release-shaped build configured OFF (L1), OFF value inlined by the compiler (L2), disabled behaviour observed in a real browser on the same-commit OFF build with a passing same-commit ON control (L3). Host assumptions: DefinePlugin single substitution; emulator build differs from the release build only by emulator/project env; the release bundle itself was not executed.';
  }
  report.ok = report.verdict === 'off';
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  return report.ok ? 0 : 1;
}

if (require.main === module) {
  const cmd = process.argv[2];
  const root = path.resolve(arg('--root', path.resolve(__dirname, '..', '..')));
  try {
    if (cmd === 'resolve') process.exit(resolve(root, arg('--node-env', 'production')));
    else if (cmd === 'canary') { const r = canary(path.resolve(process.argv[3] || 'build'), root, arg('--expect', null)); console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 1); }
    else if (cmd === 'gate') process.exit(gate(arg('--canary'), arg('--off'), arg('--on'), arg('--out')));
    else { console.error('usage: release-import-config.js resolve [--root dir] [--node-env production] | canary <build-dir> [--root dir] [--expect false|true] | gate --canary <json> --off <results.json> --on <results.json> [--out <json>]'); process.exit(2); }
  } catch (e) { console.log(JSON.stringify({ ok: false, verdict: 'inconclusive', reasons: [`crashed (fail closed): ${String(e && e.message).slice(0, 200)}`] })); process.exit(1); }
}
module.exports = { resolveIndependently, resolveWithCra, canary, sourceScope, gate, FLAG, CANARY_OFF, CANARY_ON, OFF_TESTS, ON_CONTROL_TESTS };
