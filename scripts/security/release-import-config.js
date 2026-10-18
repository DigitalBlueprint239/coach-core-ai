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
// How `scan` decides (redesigned after the second independent review, R1–R3):
//   1. Only chunks referenced by <script src> in <build-dir>/index.html are considered.
//   2. Each chunk is PARSED (acorn; comments never reach the AST). The import UI component is
//      the single function containing the literal "Import plays".
//   3. The "Import plays" and "Not now" buttons' onClick handlers are followed with EVERY direct
//      call accounted for: an onClick may either perform the import call itself or call exactly
//      one component-local handler; inside that body exactly one call may be import code (an
//      inline function or a module-scope function); every other call must be a component-local
//      setter/prop; any member-expression call, unresolved callee, second handler, extra await
//      or ambiguity is INCONCLUSIVE (fails). Actual arguments are never substituted.
//   4. OFF is decided STATICALLY and soundly: the bound function's first statement must be an
//      unconditional `throw new <Ctor>(<msg>)` whose message is the disabled literal or a const
//      bound to that literal, with <Ctor> neither declared in scope nor assigned/redefined as a
//      global anywhere in the chunk. No closure is reconstructed, no environment is synthesised:
//      an unconditional first-statement throw cannot reach a backend whatever the arguments,
//      closures or global state are.
//   5. ON is proved by EXECUTION only when every free identifier of the bound function is a pure
//      builtin, a module-scope function, or a module-scope const bound to an immutable literal,
//      none reassigned or mutated anywhere (scope-aware). Backend reads, copies and storage
//      writes are all counted. Anything else is inconclusive.
//   6. The component's own "data-import-config" literal must agree with the verdict.
//   Decoy comments/orphans/prose, mutable or global-dependent closures, dropped arguments,
//   extra backend calls before an inlined throw, ambiguous handlers and backend reads all FAIL.
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
// Pure builtins the ON-detection execution may reference. Nothing that reads environment or
// mutable global state (no globalThis/window/self/document/localStorage/fetch/console).
const PURE_GLOBALS = new Set(['Object', 'Array', 'JSON', 'Error', 'TypeError', 'RangeError', 'Number', 'Date', 'Set', 'Map', 'Promise', 'Math', 'String', 'Boolean', 'Symbol', 'undefined', 'NaN', 'Infinity', 'isFinite', 'isNaN', 'parseInt', 'parseFloat', 'encodeURIComponent', 'decodeURIComponent']);
const isImmutableLiteral = (n) => n && ((n.type === 'Literal' && (typeof n.value === 'string' || typeof n.value === 'number' || typeof n.value === 'boolean' || n.value === null)) || (n.type === 'TemplateLiteral' && n.expressions.length === 0));
const declKind = (d) => { for (let p = d.parent; p; p = p.parent) if (p.type === 'VariableDeclaration') return p.kind; return null; };

// Scope-aware assignment tracking. Minified names are reused across scopes, so an assignment
// counts against a binding only when the assignment target RESOLVES to that same declaration.
//   decls   : Set of declaration ranges that are reassigned/updated (or whose object is mutated)
//   globals : names assigned as globals — bare `Error = ...`, or `globalThis.Error = ...`,
//             `self.x = ...`, `window.x = ...`, `global.x = ...` anywhere in the chunk
const GLOBAL_OBJECTS = new Set(['globalThis', 'self', 'window', 'global']);
function assignmentIndex(ast) {
  const decls = new Set(); const globals = new Set();
  const mark = (t) => {
    if (!t) return;
    if (t.type === 'Identifier') { const r = resolveName(t.name, t); if (r) decls.add(r.decl.node.range[0]); else globals.add(t.name); return; }
    if (t.type === 'MemberExpression') {
      let o = t; while (o.type === 'MemberExpression') o = o.object;
      if (o.type === 'Identifier') {
        const r = resolveName(o.name, o);
        if (r) decls.add(r.decl.node.range[0]);                       // object held by a binding is mutated
        else if (GLOBAL_OBJECTS.has(o.name) && t.object === o && !t.computed && t.property.type === 'Identifier') globals.add(t.property.name); // globalThis.X = ... REPLACES a global
        // A property assignment on an unresolved global (e.g. Error.stackTraceLimit = 10) mutates the
        // object but does not replace the binding; `throw new Error(...)` still throws. Not recorded.
      }
      return;
    }
    if (t.type === 'ObjectPattern' || t.type === 'ArrayPattern' || t.type === 'AssignmentPattern' || t.type === 'RestElement') {
      walk.full(t, (n) => { if (n.type === 'Identifier' && isReference(n) === false && n.parent && (n.parent.type !== 'Property' || n.parent.value === n)) { const r = resolveName(n.name, n); if (r) decls.add(r.decl.node.range[0]); else globals.add(n.name); } });
    }
  };
  walk.full(ast, (n) => {
    if (n.type === 'AssignmentExpression') mark(n.left);
    else if (n.type === 'UpdateExpression') mark(n.argument);
    else if ((n.type === 'ForInStatement' || n.type === 'ForOfStatement') && n.left.type !== 'VariableDeclaration') mark(n.left);
    else if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && !n.callee.computed && n.callee.object.type === 'Identifier' && n.callee.property.type === 'Identifier') {
      // Object.defineProperty(globalThis, 'Error', ...) / Reflect.set(self, 'Error', ...) / Object.assign(window, {...})
      const obj = n.callee.object.name, fn = n.callee.property.name, a0 = n.arguments[0];
      if (((obj === 'Object' && (fn === 'defineProperty' || fn === 'defineProperties' || fn === 'assign')) || (obj === 'Reflect' && (fn === 'set' || fn === 'defineProperty'))) && a0 && a0.type === 'Identifier' && GLOBAL_OBJECTS.has(a0.name) && !resolveName(a0.name, a0)) {
        const a1 = n.arguments[1];
        if (a1 && a1.type === 'Literal' && typeof a1.value === 'string') globals.add(a1.value);
        else if (a1 && a1.type === 'ObjectExpression') for (const pr of a1.properties) { if (pr.type === 'Property' && !pr.computed) globals.add(pr.key.type === 'Identifier' ? pr.key.name : String(pr.key.value)); }
        else globals.add('*'); // dynamic redefinition of globals: trust nothing builtin
      }
    }
  });
  return { decls, globals };
}

// ---- OFF contract (static, environment-independent) ---------------------------------------
// A function is provably OFF iff its body's FIRST statement is an unconditional
//     throw new <Ctor>(<msg>)
// where <msg> is the disabled string literal itself or an identifier bound by a `const` whose
// initializer is that string literal (primitive const bindings cannot change), and <Ctor> is an
// identifier that is neither declared nor assigned anywhere in the chunk (so it is the engine's
// own constructor; even if it were not, `throw` still ends the function before any backend use).
// No closure is reconstructed and no argument is synthesized: an unconditional first-statement
// throw cannot reach a backend regardless of arguments, closures or global state.
function provablyOff(fnNode, idx) {
  if (!fnNode.body || fnNode.body.type !== 'BlockStatement') return { off: false, why: 'function has an expression body (no statements to inspect)' };
  const first = fnNode.body.body[0];
  if (!first || first.type !== 'ThrowStatement') return { off: false, why: `first statement is ${first ? first.type : 'absent'}, not an unconditional throw` };
  const arg = first.argument;
  if (!arg || arg.type !== 'NewExpression' || arg.callee.type !== 'Identifier' || arg.arguments.length !== 1) return { off: false, why: 'throw argument is not `new <Ctor>(<msg>)`' };
  const ctor = arg.callee.name;
  if (resolveName(ctor, arg.callee)) return { off: false, why: `thrown constructor "${ctor}" is declared in scope (not the engine builtin)` };
  if (idx.globals.has(ctor) || idx.globals.has('*')) return { off: false, why: `global "${ctor}" is assigned or redefined somewhere in the chunk (not trusted as the engine builtin)` };
  const m = arg.arguments[0];
  if (m.type === 'Literal' && m.value === DISABLED_MSG) return { off: true, why: 'first statement throws the disabled message literal' };
  if (m.type !== 'Identifier') return { off: false, why: 'thrown message is neither the disabled literal nor an identifier' };
  const r = resolveName(m.name, m);
  if (!r || r.decl.kind !== 'var') return { off: false, why: `thrown message identifier "${m.name}" does not resolve to a variable declaration` };
  const d = r.decl.node;
  if (declKind(d) !== 'const') return { off: false, why: `"${m.name}" is a ${declKind(d)} binding (mutable), not const` };
  if (!(d.init && d.init.type === 'Literal' && d.init.value === DISABLED_MSG)) return { off: false, why: `const "${m.name}" is not initialised with the disabled message literal` };
  if (idx.decls.has(d.range[0])) return { off: false, why: `"${m.name}" is assigned somewhere in the chunk` };
  return { off: true, why: `first statement throws const ${m.name} = disabled message literal` };
}

// ---- ON detection (execution) -------------------------------------------------------------
// Used ONLY to prove an opted-in build is enabled (negative control) and to report "on" for an
// enabled build. The extracted closure is accepted only when every free identifier is (a) a
// pure builtin, (b) a module-scope FunctionDeclaration / const-bound function (recursively
// checked), or (c) a module-scope const bound to an immutable literal, and none of them is
// assigned anywhere in the chunk. Any let/var binding, object/array/call initialiser, global
// (globalThis/window/self/localStorage/...), `this`, `arguments` or unknown name is REJECTED as
// inconclusive. Backend reads, copies and storage writes are all counted.
function closureFor(fnNode, code, idx) {
  const decls = []; const seen = new Set(); const problems = [];
  const collect = (node, container) => {
    walk.full(node, (n) => {
      if (n.type === 'ThisExpression') { problems.push('`this` is referenced (environment-dependent)'); return; }
      if (n.type !== 'Identifier' || !isReference(n)) return;
      const r = resolveName(n.name, n);
      if (!r) { if (!PURE_GLOBALS.has(n.name)) problems.push(`free identifier "${n.name}" is not a module-scope declaration or a pure builtin`); else if (idx.globals.has(n.name) || idx.globals.has('*')) problems.push(`builtin "${n.name}" is assigned or redefined as a global in the chunk`); return; }
      if (within(r.decl.node, container)) return;
      if (r.decl.kind !== 'var' && r.decl.kind !== 'function') { problems.push(`"${n.name}" resolves to a ${r.decl.kind} outside the function (not a module-scope const/function)`); return; }
      if (idx.decls.has(r.decl.node.range[0])) { problems.push(`"${n.name}" is assigned or mutated after declaration (mutable binding)`); return; }
      const key = `${r.decl.node.range[0]}:${n.name}`; if (seen.has(key)) return; seen.add(key);
      if (r.decl.kind === 'function') { const d = r.decl.node; decls.push({ pos: d.range[0], text: code.slice(d.range[0], d.range[1]) + '\n' }); collect(d, d); return; }
      const d = r.decl.node;
      if (declKind(d) !== 'const' || !d.init) { problems.push(`"${n.name}" is not a const with an initialiser`); return; }
      if (isFn(d.init)) { decls.push({ pos: d.range[0], text: `const ${n.name} = ${code.slice(d.init.range[0], d.init.range[1])};` }); collect(d.init, d.init); return; }
      if (isImmutableLiteral(d.init)) { decls.push({ pos: d.range[0], text: `const ${n.name} = ${code.slice(d.init.range[0], d.init.range[1])};` }); return; }
      problems.push(`"${n.name}" is a const bound to a ${d.init.type} (mutable or environment-dependent value); refusing to reconstruct`);
    });
  };
  collect(fnNode, fnNode);
  decls.sort((a, b) => a.pos - b.pos);
  return { preamble: decls.map((d) => d.text).join('\n'), problems, declCount: decls.length };
}
function evaluateFunction(fnNode, code, idx) {
  const { preamble, problems, declCount } = closureFor(fnNode, code, idx);
  if (problems.length) return { error: [...new Set(problems)].join('; '), declCount };
  const src = `${preamble}\n(${code.slice(fnNode.range[0], fnNode.range[1])})`;
  try { const fn = vm.runInNewContext(src, {}, { timeout: 5000 }); if (typeof fn !== 'function') return { error: 'extracted node did not evaluate to a function', declCount }; return { fn, declCount }; }
  catch (e) { return { error: `extraction failed to evaluate: ${String(e && e.message).slice(0, 160)}`, declCount }; }
}

// ---- Component / handler binding --------------------------------------------------------
function literalNodes(ast, value) { const out = []; walk.full(ast, (n) => { if ((n.type === 'Literal' && n.value === value)) out.push(n); }); return out; }
const enclosingFn = (n) => { for (let p = n.parent; p; p = p.parent) if (isFn(p)) return p; return null; };
const propsObjectOf = (lit) => { for (let p = lit.parent; p; p = p.parent) { if (p.type === 'ObjectExpression') return p; if (isFn(p)) return null; } return null; };
const propOf = (obj, key) => (obj.properties || []).find((p) => p.type === 'Property' && !p.computed && ((p.key.type === 'Identifier' && p.key.name === key) || (p.key.type === 'Literal' && p.key.value === key)));
const directCalls = (fn) => { const out = []; walk.full(fn, (n) => { if ((n.type === 'CallExpression' || n.type === 'NewExpression') && enclosingFn(n) === fn) out.push(n); }); return out; };
// Classify one direct call inside a handler. Returns { role, node, kind, why }.
//   'import'  : callee is an inline function or a module-scope function/const-function (the import code)
//   'local'   : callee is a component-local setter/prop (ArrayPattern/ObjectPattern/param binding) — harmless
//   'handler' : callee is a component-local const function (a second handler) — ambiguous
//   'unknown' : member expression, unresolved, computed, new-expression on non-builtin, ... — unresolved relevant call
function classifyCall(call, component) {
  const c = call.callee;
  if (call.type === 'NewExpression') return (c.type === 'Identifier' && !resolveName(c.name, c) && PURE_GLOBALS.has(c.name)) ? { role: 'local', node: call } : { role: 'unknown', node: call, why: 'constructor call to a non-builtin' };
  if (isFn(c)) return { role: 'import', node: c, kind: 'inline' };
  if (c.type !== 'Identifier') return { role: 'unknown', node: call, why: `callee is a ${c.type}` };
  const r = resolveName(c.name, c);
  if (!r) return { role: 'unknown', node: call, why: `callee "${c.name}" is unresolved (global?)` };
  if (within(r.decl.node, component)) {
    if (r.decl.kind === 'pattern' || r.decl.kind === 'param') return { role: 'local', node: call, name: c.name };
    if (r.decl.kind === 'var' && r.decl.node.init && isFn(r.decl.node.init)) return { role: 'handler', node: r.decl.node.init, name: c.name };
    return { role: 'unknown', node: call, why: `callee "${c.name}" is a component-local ${r.decl.kind} that is not a setter/prop/handler` };
  }
  if (r.decl.kind === 'function') return { role: 'import', node: r.decl.node, kind: 'module-function', name: c.name };
  if (r.decl.kind === 'var' && r.decl.node.init && isFn(r.decl.node.init)) return { role: 'import', node: r.decl.node.init, kind: 'module-const', name: c.name };
  return { role: 'unknown', node: call, why: `callee "${c.name}" resolves to a ${r.decl.kind} outside the component` };
}
// From a button's onClick, find THE handler body that performs the import call, rejecting ambiguity.
function followButton(onClickFn, component, label) {
  const errors = [];
  const calls = directCalls(onClickFn);
  const imports = calls.filter((c) => classifyCall(c, component).role === 'import');
  const handlers = calls.map((c) => classifyCall(c, component)).filter((x) => x.role === 'handler');
  const unknown = calls.map((c) => classifyCall(c, component)).filter((x) => x.role === 'unknown');
  if (unknown.length) errors.push(`${label}: ${unknown.length} unresolved call(s) directly in onClick (${unknown.map((u) => u.why).join('; ')})`);
  // Either the onClick itself holds the import call (decline shape), or it calls exactly one component-local handler (accept shape).
  if (imports.length && handlers.length) errors.push(`${label}: onClick both calls a handler and performs an import call (ambiguous)`);
  if (handlers.length > 1) errors.push(`${label}: onClick calls ${handlers.length} component-local handlers (ambiguous: ${handlers.map((h) => h.name).join(', ')})`);
  let body = onClickFn;
  if (handlers.length === 1 && !imports.length) body = handlers[0].node;
  else if (!imports.length && !handlers.length) errors.push(`${label}: onClick neither performs an import call nor calls a handler`);
  return { body, errors };
}
// Within the chosen body, every direct call is accounted for; exactly one import call; awaited iff `wantAwait`.
function importCallIn(body, component, label, wantAwait) {
  const errors = [];
  const cls = directCalls(body).map((c) => ({ ...classifyCall(c, component), call: c }));
  const unknown = cls.filter((x) => x.role === 'unknown');
  if (unknown.length) errors.push(`${label}: ${unknown.length} unresolved call(s) in the handler (${[...new Set(unknown.map((u) => u.why))].join('; ')}) — every call must be accounted for`);
  const handlers = cls.filter((x) => x.role === 'handler');
  if (handlers.length) errors.push(`${label}: handler calls other component-local handler(s) (${handlers.map((h) => h.name).join(', ')}) — ambiguous`);
  const imports = cls.filter((x) => x.role === 'import');
  if (imports.length !== 1) errors.push(`${label}: expected exactly one import call in the handler, found ${imports.length}`);
  const awaited = imports.filter((x) => x.call.parent && x.call.parent.type === 'AwaitExpression');
  if (wantAwait && imports.length === 1 && awaited.length !== 1) errors.push(`${label}: the import call is not awaited`);
  if (!wantAwait && awaited.length) errors.push(`${label}: unexpected awaited call`);
  // Any await of something that is not the import call is an unaccounted asynchronous step.
  const awaits = []; walk.full(body, (n) => { if (n.type === 'AwaitExpression' && enclosingFn(n) === body) awaits.push(n); });
  if (awaits.some((a) => !(a.argument.type === 'CallExpression' && imports.length === 1 && a.argument === imports[0].call))) errors.push(`${label}: an await in the handler is not the single import call`);
  return { target: imports.length === 1 ? imports[0] : null, errors };
}
function bindComponent(ast, code) {
  const accepts = literalNodes(ast, BUTTON_ACCEPT);
  if (accepts.length === 0) return null;
  if (accepts.length > 1) return { error: `${accepts.length} "${BUTTON_ACCEPT}" literals in one chunk (ambiguous)` };
  const acceptLit = accepts[0];
  const component = enclosingFn(acceptLit);
  if (!component) return { error: 'import UI literal is not inside a function' };
  const out = { component, markerAttr: null, executor: null, decline: null, errors: [] };
  walk.full(component, (n) => { if (n.type === 'Property' && !n.computed && n.key.type === 'Literal' && n.key.value === 'data-import-config' && n.value.type === 'Literal') out.markerAttr = n.value.value; });
  const acceptProps = propsObjectOf(acceptLit); const onAccept = acceptProps && propOf(acceptProps, 'onClick');
  if (!onAccept || !isFn(onAccept.value)) out.errors.push('accept button has no onClick function');
  else { const f = followButton(onAccept.value, component, 'accept'); out.errors.push(...f.errors); if (!f.errors.length) { const t = importCallIn(f.body, component, 'accept', true); out.errors.push(...t.errors); out.executor = t.target; } }
  const declLits = literalNodes(component, BUTTON_DECLINE);
  if (declLits.length !== 1) out.errors.push(`expected one "${BUTTON_DECLINE}" literal in the component, found ${declLits.length}`);
  else {
    const props = propsObjectOf(declLits[0]); const onDecline = props && propOf(props, 'onClick');
    if (!onDecline || !isFn(onDecline.value)) out.errors.push('decline button has no onClick function');
    else { const f = followButton(onDecline.value, component, 'decline'); out.errors.push(...f.errors); if (!f.errors.length) { const t = importCallIn(f.body, component, 'decline', false); out.errors.push(...t.errors); out.decline = t.target; } }
  }
  return out;
}

// ---- Verdict per bound function -------------------------------------------------------------
function memStorage(seed) {
  const m = new Map(Object.entries(seed)); const writes = [];
  return { writes, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { writes.push(['set', k]); m.set(k, String(v)); }, removeItem: (k) => { writes.push(['remove', k]); m.delete(k); }, key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, clear: () => { writes.push(['clear']); m.clear(); } };
}
const PLAY = { id: 'proof-p1', name: 'Proof Mesh', phase: 'offense', type: 'pass', players: [], routes: [] };
async function judge(target, code, idx, which) {
  // 1. Static OFF contract (sound, no execution).
  const st = provablyOff(target.node, idx);
  if (st.off) return { outcome: 'disabled', basis: 'static', detail: st.why, kind: target.kind };
  // 2. Not provably OFF: try to PROVE it is ON by execution with a verified immutable closure.
  const ev = evaluateFunction(target.node, code, idx);
  if (ev.error) return { outcome: 'inconclusive', basis: 'none', detail: `not provably OFF (${st.why}); cannot reconstruct a faithful closure for execution (${ev.error})`, kind: target.kind };
  const session = { uid: 'release-proof-uid', teamId: 'release-proof-team', teamName: 'Release Proof' };
  const stor = memStorage({ smartPlaybook_plays: JSON.stringify([PLAY]) });
  const backend = { copies: 0, reads: 0, copy: async (_s, p) => { backend.copies += 1; return `srv-${p.id}`; }, read: async () => { backend.reads += 1; return PLAY; } };
  const side = () => `backend.copy x${backend.copies}, backend.read x${backend.reads}, storage writes ${stor.writes.length}`;
  try {
    const r = which === 'executor' ? await Promise.race([ev.fn(stor, session, () => true, backend), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))]) : ev.fn(stor, session);
    const reached = which === 'executor' ? backend.copies > 0 : (r === 'declined' || r === 'postponed') && stor.writes.length > 0;
    return { outcome: reached ? 'enabled' : 'inconclusive', basis: 'execution', detail: `not provably OFF (${st.why}); executed: resolved ${JSON.stringify(r)}; ${side()}`, kind: target.kind, declCount: ev.declCount };
  } catch (e) {
    const msg = String(e && e.message);
    return { outcome: backend.copies > 0 ? 'enabled' : 'inconclusive', basis: 'execution', detail: `not provably OFF (${st.why}); executed: threw "${msg.slice(0, 100)}"; ${side()}`, kind: target.kind, declCount: ev.declCount };
  }
}
async function executeBindings(binding, code, idx) {
  return { executor: binding.executor ? await judge(binding.executor, code, idx, 'executor') : null, decline: binding.decline ? await judge(binding.decline, code, idx, 'decline') : null };
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
    const idx = assignmentIndex(ast);
    found = { chunk: path.relative(dir, f), componentRange: b.component.range, markerAttr: b.markerAttr, errors: b.errors, exec: await executeBindings(b, code, idx) };
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
