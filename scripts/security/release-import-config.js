#!/usr/bin/env node
/* eslint-disable no-console */
// Release-proof repair (2026-10-18; re-review repair of PR #78 c9d49dd): the legacy-import
// feature must be OFF in every release-shaped build, proven from the ACTUAL build inputs and
// the ACTUAL shipped executable code — never from .env.production alone and never from
// strings that happen to appear somewhere in the output.
//
// Build-time precedence audited from react-scripts/config/env.js (CRA 5.0.1):
//   shell environment  >  .env.production.local  >  .env.local  >  .env.production  >  .env
// (dotenv never overwrites a variable that is already set, so the FIRST file in that order
// wins; the shell wins over every file; .env.local is skipped only for NODE_ENV=test.) The
// independent resolver below does NOT implement dotenv-expand; CRA's own loader does, so any
// disagreement (e.g. a `${VAR}` expression) is reported as inconclusive and FAILS.
//
//   resolve [--root <dir>] [--node-env production]
//       Effective build-time value of REACT_APP_ENABLE_LEGACY_IMPORT, resolved independently
//       and by CRA's loader in a child process. PASS only if both agree, the value is exactly
//       "false", and it comes from a committed-basename file (.env.production or .env).
//       NOTE: "committed" is a basename allowlist, not a git-tracking check.
//   scan <build-dir>            -> PASS only if the SHIPPED import implementation is OFF
//   negative-control <build-dir> -> PASS only if the SHIPPED import implementation is ON
//
// How `scan` binds to executable behaviour (F1 of the independent review):
//   1. Only chunks referenced by <script src> in <build-dir>/index.html are considered
//      (orphan/decoy files are ignored; no index.html => inconclusive).
//   2. Each chunk is PARSED (acorn). Comments never reach the AST. The import UI component is
//      located as the single function containing the string literal "Import plays".
//   3. From that component's "Import plays" button the onClick handler is followed to the
//      accept function, and inside it to the awaited call: the callee is the shipped import
//      EXECUTOR (an inline function after terser folding, or a module-scope function). The
//      "Not now" button yields the shipped DECLINE function the same way.
//   4. Both functions are extracted with the transitive closure of the module-scope
//      declarations they reference and EXECUTED in a fresh VM context against an in-memory
//      storage, a session and a spy backend. OFF means: the executor rejects with the
//      disabled message before any storage write or backend call AND decline throws the same;
//      ON means: the executor reaches backend.copy. Anything else is inconclusive.
//   5. The component's own "data-import-config" literal must agree with the executed verdict.
//   Decoy comments, orphan files, OFF prose next to enabled code, or an enabled executor
//   behind an OFF marker all FAIL; a scan that cannot bind to the component FAILS (closed).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');
const acorn = require('acorn');
const walk = require('acorn-walk');

const FLAG = 'REACT_APP_ENABLE_LEGACY_IMPORT';
const CANARY_OFF = 'coachcore:import-config=false';
const CANARY_ON = 'coachcore:import-config=true';
const DISABLED_MSG = 'Device-play import is disabled in this build. Originals preserved.';
const COMMITTED = new Set(['.env.production', '.env']);
const BUTTON_ACCEPT = 'Import plays';
const BUTTON_DECLINE = 'Not now';

function arg(flag, dflt) { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : dflt; }

// ---------------------------------------------------------------- resolve ----------------
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

// ---------------------------------------------------------------- AST helpers ------------
const isFn = (n) => n && (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression' || n.type === 'FunctionDeclaration');
function parseChunk(code) {
  const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', ranges: true, allowHashBang: true });
  walk.fullAncestor(ast, (node, _st, ancestors) => { node.parent = ancestors.length > 1 ? ancestors[ancestors.length - 2] : null; });
  return ast;
}
function patternNames(p, out = []) {
  if (!p) return out;
  switch (p.type) {
    case 'Identifier': out.push(p.name); break;
    case 'ObjectPattern': for (const q of p.properties) patternNames(q.type === 'RestElement' ? q.argument : q.value, out); break;
    case 'ArrayPattern': for (const e of p.elements) patternNames(e, out); break;
    case 'AssignmentPattern': patternNames(p.left, out); break;
    case 'RestElement': patternNames(p.argument, out); break;
    default: break;
  }
  return out;
}
// Declarations visible in a scope-creating node, by name.
function declsOf(scope) {
  const m = new Map();
  const add = (name, decl) => { if (!m.has(name)) m.set(name, decl); };
  const fromStatements = (stmts) => {
    for (const s of stmts || []) {
      if (s.type === 'VariableDeclaration') for (const d of s.declarations) { if (d.id.type === 'Identifier') add(d.id.name, { kind: 'var', node: d }); else for (const n of patternNames(d.id)) add(n, { kind: 'pattern', node: d }); }
      else if (s.type === 'FunctionDeclaration' && s.id) add(s.id.name, { kind: 'function', node: s });
      else if (s.type === 'ClassDeclaration' && s.id) add(s.id.name, { kind: 'class', node: s });
    }
  };
  if (isFn(scope)) { for (const p of scope.params) for (const n of patternNames(p)) add(n, { kind: 'param', node: scope }); if (scope.type === 'FunctionExpression' && scope.id) add(scope.id.name, { kind: 'function', node: scope }); if (scope.body && scope.body.type === 'BlockStatement') fromStatements(scope.body.body); }
  else if (scope.type === 'Program' || scope.type === 'BlockStatement') fromStatements(scope.body);
  else if (scope.type === 'CatchClause' && scope.param) for (const n of patternNames(scope.param)) add(n, { kind: 'param', node: scope });
  else if ((scope.type === 'ForStatement' || scope.type === 'ForInStatement' || scope.type === 'ForOfStatement')) { const init = scope.init || scope.left; if (init && init.type === 'VariableDeclaration') fromStatements([init]); }
  return m;
}
const isScope = (n) => isFn(n) || n.type === 'Program' || n.type === 'BlockStatement' || n.type === 'CatchClause' || n.type === 'ForStatement' || n.type === 'ForInStatement' || n.type === 'ForOfStatement';
// Resolve an identifier name from a node upward; returns { decl, scope } or null (global/unresolved).
function resolveName(name, from) {
  for (let p = from.parent; p; p = p.parent) {
    if (!isScope(p)) continue;
    const d = declsOf(p).get(name);
    if (d) return { decl: d, scope: p };
  }
  return null;
}
const within = (node, container) => node.range[0] >= container.range[0] && node.range[1] <= container.range[1];
// Identifier nodes that are variable REFERENCES (not property keys, member property names, labels or declarations).
function isReference(id) {
  const p = id.parent;
  if (!p) return false;
  if (p.type === 'MemberExpression' && p.property === id && !p.computed) return false;
  if ((p.type === 'Property' || p.type === 'PropertyDefinition' || p.type === 'MethodDefinition') && p.key === id && !p.computed) return p.shorthand === true && p.value === id;
  if (p.type === 'LabeledStatement' || p.type === 'BreakStatement' || p.type === 'ContinueStatement') return false;
  if (p.type === 'VariableDeclarator' && p.id === id) return false;
  if ((p.type === 'FunctionDeclaration' || p.type === 'FunctionExpression' || p.type === 'ClassDeclaration') && p.id === id) return false;
  if (isFn(p) && p.params.includes(id)) return false;
  if (p.type === 'AssignmentPattern' && p.left === id) return false;
  if (p.type === 'RestElement' || p.type === 'ArrayPattern' || p.type === 'ObjectPattern') return false;
  if (p.type === 'CatchClause' && p.param === id) return false;
  return true;
}
const GLOBALS = new Set(['Object', 'Array', 'JSON', 'Error', 'TypeError', 'RangeError', 'Number', 'Date', 'Set', 'Map', 'WeakMap', 'WeakSet', 'Promise', 'Math', 'String', 'Boolean', 'Symbol', 'undefined', 'NaN', 'Infinity', 'isFinite', 'isNaN', 'parseInt', 'parseFloat', 'encodeURIComponent', 'decodeURIComponent', 'Reflect', 'Proxy', 'arguments', 'globalThis']);

// Source closure: the function text plus every outer (module-scope) declaration it needs, transitively.
function closureFor(fnNode, code) {
  const decls = [];
  const seen = new Set();
  const problems = [];
  const collect = (node, container) => {
    walk.full(node, (n) => {
      if (n.type !== 'Identifier' || !isReference(n)) return;
      const r = resolveName(n.name, n);
      if (!r) { if (!GLOBALS.has(n.name)) problems.push(`free identifier "${n.name}" is not a module-scope declaration or a known global`); return; }
      if (within(r.decl.node, container) || r.decl.kind === 'param' && within(r.decl.node, container)) return; // local to the function being extracted
      if (r.decl.kind === 'param' || r.decl.kind === 'pattern') { problems.push(`"${n.name}" resolves to a ${r.decl.kind} outside the import code (component-local state?) — cannot extract`); return; }
      const key = `${r.decl.node.range[0]}:${n.name}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (r.decl.kind === 'var') { const d = r.decl.node; decls.push({ pos: d.range[0], text: d.init ? `const ${n.name} = ${code.slice(d.init.range[0], d.init.range[1])};` : `let ${n.name};` }); if (d.init) collect(d.init, d.init); }
      else if (r.decl.kind === 'function' || r.decl.kind === 'class') { const d = r.decl.node; decls.push({ pos: d.range[0], text: code.slice(d.range[0], d.range[1]) + '\n' }); collect(d, d); }
    });
  };
  collect(fnNode, fnNode);
  decls.sort((a, b) => a.pos - b.pos);
  return { preamble: decls.map((d) => d.text).join('\n'), problems, declCount: decls.length };
}
function evaluateFunction(fnNode, code) {
  const { preamble, problems, declCount } = closureFor(fnNode, code);
  if (problems.length) return { error: problems.join('; '), declCount };
  const src = `${preamble}\n(${code.slice(fnNode.range[0], fnNode.range[1])})`;
  try { const fn = vm.runInNewContext(src, {}, { timeout: 5000 }); if (typeof fn !== 'function') return { error: 'extracted node did not evaluate to a function', declCount }; return { fn, declCount }; }
  catch (e) { return { error: `extraction failed to evaluate: ${String(e && e.message).slice(0, 160)}`, declCount }; }
}

// Locate component + bound executor/decline function nodes inside one parsed chunk.
function literalNodes(ast, value) { const out = []; walk.full(ast, (n) => { if ((n.type === 'Literal' && n.value === value)) out.push(n); }); return out; }
const enclosingFn = (n) => { for (let p = n.parent; p; p = p.parent) if (isFn(p)) return p; return null; };
const propsObjectOf = (lit) => { for (let p = lit.parent; p; p = p.parent) { if (p.type === 'ObjectExpression') return p; if (isFn(p)) return null; } return null; };
const propOf = (obj, key) => (obj.properties || []).find((p) => p.type === 'Property' && !p.computed && ((p.key.type === 'Identifier' && p.key.name === key) || (p.key.type === 'Literal' && p.key.value === key)));
function calleeFunction(call, component) {
  const c = call.callee;
  if (isFn(c)) return { node: c, kind: 'inline' };
  if (c.type === 'Identifier') {
    const r = resolveName(c.name, c);
    if (!r) return null;
    if (within(r.decl.node, component)) return null; // component-local (state setter etc.)
    if (r.decl.kind === 'function') return { node: r.decl.node, kind: 'module-function' };
    if (r.decl.kind === 'var' && r.decl.node.init && isFn(r.decl.node.init)) return { node: r.decl.node.init, kind: 'module-const' };
  }
  return null;
}
function bindComponent(ast, code) {
  const accepts = literalNodes(ast, BUTTON_ACCEPT);
  if (accepts.length === 0) return null;
  if (accepts.length > 1) return { error: `${accepts.length} "${BUTTON_ACCEPT}" literals in one chunk (ambiguous)` };
  const acceptLit = accepts[0];
  const component = enclosingFn(acceptLit);
  if (!component) return { error: 'import UI literal is not inside a function' };
  const out = { component, markerAttr: null, executor: null, decline: null, errors: [] };
  // data-import-config literal on the component's section (an AST Property, never a comment).
  walk.full(component, (n) => { if (n.type === 'Property' && !n.computed && n.key.type === 'Literal' && n.key.value === 'data-import-config' && n.value.type === 'Literal') out.markerAttr = n.value.value; });
  // Accept button -> onClick -> y() -> resolve y -> awaited call -> callee.
  const acceptProps = propsObjectOf(acceptLit); const onAccept = acceptProps && propOf(acceptProps, 'onClick');
  if (!onAccept || !isFn(onAccept.value)) out.errors.push('accept button has no onClick function');
  else {
    const calls = []; walk.full(onAccept.value, (n) => { if (n.type === 'CallExpression') calls.push(n); });
    let acceptFn = null;
    for (const c of calls) { const f = c.callee.type === 'Identifier' ? resolveName(c.callee.name, c.callee) : null; if (f && f.decl.kind === 'var' && f.decl.node.init && isFn(f.decl.node.init)) acceptFn = f.decl.node.init; else if (isFn(c.callee)) acceptFn = c.callee; }
    if (!acceptFn) out.errors.push('could not follow the accept onClick to its handler function');
    else {
      // Only awaits DIRECTLY in the accept handler (not inside the inlined executor's own body).
      const awaited = []; walk.full(acceptFn, (n) => { if (n.type === 'AwaitExpression' && n.argument.type === 'CallExpression' && enclosingFn(n) === acceptFn) awaited.push(n.argument); });
      const bound = awaited.map((c) => calleeFunction(c, component)).filter(Boolean);
      if (bound.length !== 1) out.errors.push(`expected exactly one awaited executor call in the accept handler, found ${bound.length} (of ${awaited.length} awaited calls)`);
      else out.executor = bound[0];
    }
  }
  // Decline button -> onClick -> the one call whose callee is import code (inline or module-scope), not component state.
  const declLits = literalNodes(component, BUTTON_DECLINE);
  if (declLits.length !== 1) out.errors.push(`expected one "${BUTTON_DECLINE}" literal in the component, found ${declLits.length}`);
  else {
    const props = propsObjectOf(declLits[0]); const onDecline = props && propOf(props, 'onClick');
    if (!onDecline || !isFn(onDecline.value)) out.errors.push('decline button has no onClick function');
    else {
      // Only calls DIRECTLY in the onClick (not inside the inlined decline function's own body).
      const calls = []; walk.full(onDecline.value, (n) => { if (n.type === 'CallExpression' && enclosingFn(n) === onDecline.value) calls.push(n); });
      const bound = calls.map((c) => calleeFunction(c, component)).filter(Boolean);
      if (bound.length !== 1) out.errors.push(`expected exactly one import call in the decline handler, found ${bound.length}`);
      else out.decline = bound[0];
    }
  }
  return out;
}

// Execute the bound functions against in-memory state and a spy backend.
function memStorage(seed) {
  const m = new Map(Object.entries(seed)); const writes = [];
  return { store: m, writes, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { writes.push(['set', k]); m.set(k, String(v)); }, removeItem: (k) => { writes.push(['remove', k]); m.delete(k); }, key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, clear: () => { writes.push(['clear']); m.clear(); } };
}
const PLAY = { id: 'proof-p1', name: 'Proof Mesh', phase: 'offense', type: 'pass', players: [], routes: [] };
async function executeBindings(binding, code) {
  const session = { uid: 'release-proof-uid', teamId: 'release-proof-team', teamName: 'Release Proof' };
  const result = { executor: null, decline: null };
  if (binding.executor) {
    const ev = evaluateFunction(binding.executor.node, code);
    if (ev.error) result.executor = { outcome: 'inconclusive', detail: ev.error, declCount: ev.declCount };
    else {
      const st = memStorage({ smartPlaybook_plays: JSON.stringify([PLAY]) });
      const backend = { copies: 0, reads: 0, copy: async (_s, p) => { backend.copies += 1; return `srv-${p.id}`; }, read: async () => { backend.reads += 1; return PLAY; } };
      let outcome, detail;
      try { const r = await Promise.race([ev.fn(st, session, () => true, backend), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))]); outcome = backend.copies > 0 ? 'enabled' : 'inconclusive'; detail = `resolved ${JSON.stringify(r)}; backend.copy x${backend.copies}, writes ${st.writes.length}`; }
      catch (e) { const msg = String(e && e.message); if (msg === DISABLED_MSG && backend.copies === 0 && st.writes.length === 0) { outcome = 'disabled'; detail = 'rejected with the disabled message before any storage write or backend call'; } else { outcome = backend.copies > 0 ? 'enabled' : 'inconclusive'; detail = `rejected "${msg.slice(0, 120)}"; backend.copy x${backend.copies}, writes ${st.writes.length}`; } }
      result.executor = { outcome, detail, kind: binding.executor.kind, declCount: ev.declCount };
    }
  }
  if (binding.decline) {
    const ev = evaluateFunction(binding.decline.node, code);
    if (ev.error) result.decline = { outcome: 'inconclusive', detail: ev.error, declCount: ev.declCount };
    else {
      const st = memStorage({ smartPlaybook_plays: JSON.stringify([PLAY]) });
      let outcome, detail;
      try { const r = ev.fn(st, session); outcome = (r === 'declined' || r === 'postponed') ? 'enabled' : 'inconclusive'; detail = `returned ${JSON.stringify(r)}; writes ${st.writes.length}`; }
      catch (e) { const msg = String(e && e.message); if (msg === DISABLED_MSG && st.writes.length === 0) { outcome = 'disabled'; detail = 'threw the disabled message; no storage write'; } else { outcome = 'inconclusive'; detail = `threw "${msg.slice(0, 120)}"`; } }
      result.decline = { outcome, detail, kind: binding.decline.kind, declCount: ev.declCount };
    }
  }
  return result;
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
async function analyze(dir) {
  const entries = entryChunks(dir);
  if (entries.error) return { ok: false, verdict: 'inconclusive', reasons: [entries.error], dir };
  const report = { dir, entryChunks: entries.files.map((f) => path.relative(dir, f)), components: [], verdict: 'inconclusive', reasons: [] };
  let found = null;
  for (const f of entries.files) {
    const code = fs.readFileSync(f, 'utf8');
    let ast; try { ast = parseChunk(code); } catch (e) { report.reasons.push(`inconclusive: ${path.relative(dir, f)} failed to parse: ${String(e.message).slice(0, 120)}`); continue; }
    const b = bindComponent(ast, code);
    if (!b) continue;
    if (b.error) { report.reasons.push(`inconclusive: ${b.error}`); continue; }
    if (found) { report.reasons.push('inconclusive: import UI component found in more than one entry chunk'); continue; }
    found = { chunk: path.relative(dir, f), componentRange: b.component.range, markerAttr: b.markerAttr, errors: b.errors, exec: await executeBindings(b, code) };
    report.components.push(found);
  }
  if (!found) { report.reasons.push('inconclusive: the import UI component ("Import plays") was not found in any entry chunk'); return { ...report, ok: false }; }
  for (const e of found.errors) report.reasons.push(`inconclusive: ${e}`);
  const ex = found.exec.executor, dc = found.exec.decline;
  if (!ex) report.reasons.push('inconclusive: executor not bound'); else if (ex.outcome === 'inconclusive') report.reasons.push(`inconclusive: executor ${ex.detail}`);
  if (!dc) report.reasons.push('inconclusive: decline not bound'); else if (dc.outcome === 'inconclusive') report.reasons.push(`inconclusive: decline ${dc.detail}`);
  if (ex && dc && ex.outcome !== 'inconclusive' && dc.outcome !== 'inconclusive') {
    if (ex.outcome !== dc.outcome) report.reasons.push(`contradictory shipped code: executor is ${ex.outcome} but decline is ${dc.outcome}`);
    else report.verdict = ex.outcome === 'disabled' ? 'off' : 'on';
  }
  const expectedAttr = report.verdict === 'off' ? CANARY_OFF : report.verdict === 'on' ? CANARY_ON : null;
  if (expectedAttr && found.markerAttr !== expectedAttr) report.reasons.push(`data-import-config literal is ${JSON.stringify(found.markerAttr)} but executed behaviour is ${report.verdict.toUpperCase()} (contradictory output)`);
  if (report.reasons.length) report.verdict = 'inconclusive';
  report.ok = report.reasons.length === 0;
  return report;
}
async function scan(dir) {
  const r = await analyze(dir);
  const ok = r.ok && r.verdict === 'off';
  const reasons = ok ? [] : (r.verdict === 'on' ? [`import is ENABLED in the shipped executable code (${r.components[0] && r.components[0].exec.executor.detail})`] : r.reasons.length ? r.reasons : [`verdict ${r.verdict}`]);
  console.log(JSON.stringify({ ...r, ok, reasons }));
  return ok ? 0 : 1;
}
async function negativeControl(dir) {
  const r = await analyze(dir);
  const ok = r.ok && r.verdict === 'on';
  const reasons = ok ? [] : (r.verdict === 'off' ? ['negative control failed: the opted-in build executes as OFF'] : r.reasons.length ? r.reasons : [`verdict ${r.verdict}`]);
  console.log(JSON.stringify({ ...r, ok, reasons }));
  return ok ? 0 : 1;
}

if (require.main === module) {
  const cmd = process.argv[2];
  const root = path.resolve(arg('--root', path.resolve(__dirname, '..', '..')));
  (async () => {
    if (cmd === 'resolve') process.exit(resolve(root, arg('--node-env', 'production')));
    else if (cmd === 'scan') process.exit(await scan(path.resolve(process.argv[3] || 'build')));
    else if (cmd === 'negative-control') process.exit(await negativeControl(path.resolve(process.argv[3] || 'e2e/.app-build')));
    else { console.error('usage: release-import-config.js resolve [--root dir] [--node-env production] | scan <build-dir> | negative-control <build-dir>'); process.exit(2); }
  })().catch((e) => { console.log(JSON.stringify({ ok: false, verdict: 'inconclusive', reasons: [`crashed (fail closed): ${String(e && e.message).slice(0, 200)}`] })); process.exit(1); });
}
module.exports = { resolveIndependently, resolveWithCra, analyze, FLAG, CANARY_OFF, CANARY_ON, DISABLED_MSG };
