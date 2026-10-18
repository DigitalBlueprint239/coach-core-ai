#!/usr/bin/env node
/* eslint-disable no-console */
// Release-proof repair (2026-10-18): the legacy-import feature must be OFF in every
// release-shaped build, and that must be proven from the ACTUAL build inputs and the
// ACTUAL build output — not from .env.production alone. Finding (evidence 73): a
// git-ignored .env.local (or a shell variable) overrides .env.production in a CRA
// production build, and the previous proof still passed.
//
// Build-time precedence audited from react-scripts/config/env.js (CRA 5.0.1):
//   shell environment  >  .env.production.local  >  .env.local  >  .env.production  >  .env
// (dotenv never overwrites a variable that is already set, so the FIRST file in that
// order wins; the shell wins over every file; .env.local is skipped only for NODE_ENV=test).
//
//   node release-import-config.js resolve [--root <dir>] [--node-env production]
//       Resolves the effective build-time value of REACT_APP_ENABLE_LEGACY_IMPORT twice —
//       independently (dotenv, same precedence) and with CRA's own loader in a child
//       process — and requires: both agree, the value is exactly "false", and it comes from
//       a committed file (.env.production or .env). Anything else exits 1 with reasons.
//   node release-import-config.js scan <build-dir>
//       Requires the shipped JS to carry the literal canary coachcore:import-config=false,
//       no coachcore:import-config=true, no inlined REACT_APP_ENABLE_LEGACY_IMPORT:"true",
//       and the disabled-state copy. Missing canary => inconclusive => exit 1.
//   node release-import-config.js negative-control <emulator-build-dir>
//       Requires the same scan to DETECT an enabled (emulator/test) build, proving the
//       patterns are live. Exits 1 if the enabled build is not detected.
// Prints names, sources and the two allowed values only — never other env values.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const FLAG = 'REACT_APP_ENABLE_LEGACY_IMPORT';
const CANARY_OFF = 'coachcore:import-config=false';
const CANARY_ON = 'coachcore:import-config=true';
const INLINED_ON = `${FLAG}:"true"`;
const DISABLED_COPY = 'Device-play import is disabled in this build';
const COMMITTED = new Set(['.env.production', '.env']);

function arg(flag, dflt) { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : dflt; }

// Independent resolution with the same precedence CRA documents and implements.
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

// CRA's own loader, in a child process so nothing leaks into this process.
function resolveWithCra(root, nodeEnv, shellEnv) {
  const envJs = require.resolve('react-scripts/config/env', { paths: [path.resolve(__dirname, '..', '..')] });
  const code = `process.chdir(${JSON.stringify(root)}); require(${JSON.stringify(envJs)}); process.stdout.write(JSON.stringify({ has: Object.prototype.hasOwnProperty.call(process.env, ${JSON.stringify(FLAG)}), value: process.env[${JSON.stringify(FLAG)}] }));`;
  const env = { ...shellEnv, NODE_ENV: nodeEnv };
  const r = spawnSync(process.execPath, ['-e', code], { cwd: root, env, encoding: 'utf8' });
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
  else if ((cra.has ? cra.value : undefined) !== eff.value) reasons.push(`inconclusive: CRA loader resolves ${FLAG}=${cra.has ? JSON.stringify(cra.value) : 'unset'} but independent resolution gives ${eff.value === undefined ? 'unset' : JSON.stringify(eff.value)} (${eff.source})`);
  if (eff.value === 'true') reasons.push(`${FLAG} is ENABLED for this build by ${eff.source}`);
  else if (eff.value !== 'false') reasons.push(`${FLAG} is not pinned to exactly "false" for this build (effective: ${eff.value === undefined ? 'unset' : JSON.stringify(eff.value)} from ${eff.source}); release builds must be unambiguous`);
  if (eff.value === 'false' && !COMMITTED.has(eff.source)) reasons.push(`${FLAG} is pinned by ${eff.source}, not by a committed file (${[...COMMITTED].join(' or ')}); local/shell pins are not release configuration`);
  for (const s of mine.all.slice(1)) if (s.value === 'true') reasons.push(`note: ${s.source} would enable import if ${eff.source} were removed`);
  const prod = path.join(root, '.env.production');
  if (!fs.existsSync(prod) || !fs.readFileSync(prod, 'utf8').split(/\r?\n/).includes(`${FLAG}=false`)) reasons.push(`.env.production does not contain the exact line ${FLAG}=false`);
  const hard = reasons.filter((r) => !r.startsWith('note:'));
  const report = { flag: FLAG, nodeEnv, effective: eff, sources: mine.all.map((s) => `${s.source}=${JSON.stringify(s.value)}`), cra: cra.error ? cra.error : (cra.has ? cra.value : 'unset'), ok: hard.length === 0, reasons };
  console.log(JSON.stringify(report));
  return hard.length === 0 ? 0 : 1;
}

function listJs(dir) {
  const out = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.isFile() && /\.(js|mjs)$/.test(e.name)) out.push(p); } };
  if (fs.existsSync(dir)) walk(dir);
  return out;
}
function count(files, needle) { let n = 0; for (const f of files) { const t = fs.readFileSync(f, 'utf8'); let i = -1; while ((i = t.indexOf(needle, i + 1)) !== -1) n += 1; } return n; }

function scan(dir) {
  const files = listJs(dir);
  const reasons = [];
  if (!files.length) reasons.push(`inconclusive: no JS files under ${dir}`);
  const off = count(files, CANARY_OFF), on = count(files, CANARY_ON), inl = count(files, INLINED_ON), copy = count(files, DISABLED_COPY);
  if (files.length && off === 0) reasons.push(`inconclusive: canary ${CANARY_OFF} not found in the shipped JS (unpinned build, toolchain change or marker removed) — cannot prove import is OFF`);
  if (on > 0) reasons.push(`import is ENABLED in the shipped JS: ${CANARY_ON} found ${on}x`);
  if (inl > 0) reasons.push(`inlined build env shows ${INLINED_ON} (${inl}x)`);
  if (files.length && copy === 0) reasons.push('inconclusive: disabled-state copy not present in the shipped JS (import module missing or changed)');
  const report = { dir, jsFiles: files.length, canaryOff: off, canaryOn: on, inlinedTrue: inl, disabledCopy: copy, ok: reasons.length === 0, reasons };
  console.log(JSON.stringify(report));
  return reasons.length === 0 ? 0 : 1;
}

function negativeControl(dir) {
  const files = listJs(dir);
  const on = count(files, CANARY_ON);
  const ok = files.length > 0 && on > 0;
  console.log(JSON.stringify({ dir, jsFiles: files.length, canaryOn: on, ok, reasons: ok ? [] : [`negative control failed: an enabled (emulator/test) build must carry ${CANARY_ON}`] }));
  return ok ? 0 : 1;
}

if (require.main === module) {
  const cmd = process.argv[2];
  const root = path.resolve(arg('--root', path.resolve(__dirname, '..', '..')));
  if (cmd === 'resolve') process.exit(resolve(root, arg('--node-env', 'production')));
  else if (cmd === 'scan') process.exit(scan(path.resolve(process.argv[3] || 'build')));
  else if (cmd === 'negative-control') process.exit(negativeControl(path.resolve(process.argv[3] || 'e2e/.app-build')));
  else { console.error('usage: release-import-config.js resolve [--root dir] [--node-env production] | scan <build-dir> | negative-control <emulator-build-dir>'); process.exit(2); }
}
module.exports = { resolveIndependently, resolveWithCra, FLAG, CANARY_OFF, CANARY_ON, INLINED_ON, DISABLED_COPY };
