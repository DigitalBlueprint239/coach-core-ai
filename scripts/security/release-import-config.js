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
// How `scan` decides (third revision, after independent reviews R1–R3 and D1–D3):
//   1. Only chunks referenced by <script src> in <build-dir>/index.html are considered; a scope-aware
//      assignment/redefinition index is built over ALL of them (identifier and member assignments,
//      computed keys resolved statically, Object.defineProperty/assign/Reflect.* on global objects,
//      eval/Function presence). Writes of non-constructible values (arrows, literals, objects) cannot
//      hijack `new Error`, so only constructible writes under unknown/relevant keys distrust globals.
//   2. Each chunk is parsed (comments never reach the AST). The import UI component is the single
//      function containing the literal "Import plays"; its props are read from its destructured
//      first parameter (uid/teamId/teamName/backend/onImported).
//   3. The accept button's onClick must be exactly `()=>{y()}` to a component-local zero-parameter
//      handler; the decline onClick is itself the handler. In the handler EVERY node evaluated before
//      the single import call, plus the enclosing try's catch/finally, must fit a recognised
//      effect-free grammar: literals, local reads, `ref.current` reads of a verified React useRef,
//      calls to verified React useState setters (`const [s, set] = (0, r.useState)(x)` where r is
//      the webpack-required React module, checked by its own source) with effect-free arguments.
//      Member reads, unverified calls, parameters/defaults on the onClick/handler/callee, extra
//      awaits or second handlers are INCONCLUSIVE. Import-call arguments must be effect-free too.
//   4. OFF is decided statically: the callee has ZERO parameters and its first statement is
//      `throw new Error(<msg>)` with <msg> the disabled literal or a const bound to it, and `Error`
//      exactly the engine binding (not shadowed, not assigned/redefined as a global anywhere).
//      Nothing is reconstructed or synthesised for OFF.
//   5. ON is proved by executing the callee with the ACTUAL call-site arguments mapped by role
//      (localStorage, backend prop, uid/teamId/teamName, literals, `()=>ref.current===x`) under an
//      immutable closure (pure builtins, module functions, literal consts, none reassigned); plain
//      identifier parameters only. Backend reads, copies and storage writes are all counted.
//   6. The component's "data-import-config" literal must agree with the verdict.
//   Documented host assumptions: a strict-mode chunk (`this` is never the global in plain calls;
//   this.method()[k]=v is an object write), a native runtime whose globals are not rewritten by
//   code outside the shipped entry chunks, and no dynamic code other than webpack's
//   `new Function("return this")` (any other eval/Function call fails closed).
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
// Generic parent linking over EVERY node (acorn-walk's full walk skips pattern identifiers such as
// assignment targets and declaration ids, which scope resolution needs).
function setParents(node, parent) {
  node.parent = parent;
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const v = node[key];
    if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') setParents(c, node); }
    else if (v && typeof v === 'object' && typeof v.type === 'string') setParents(v, node);
  }
}
function parseChunk(code) {
  const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', ranges: true, allowHashBang: true });
  setParents(ast, null);
  return ast;
}
// Visit every node (patterns included), unlike acorn-walk's full walk.
function eachNode(node, fn) { fn(node); for (const key of Object.keys(node)) { if (key === 'parent') continue; const v = node[key]; if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') eachNode(c, fn); } else if (v && typeof v === 'object' && typeof v.type === 'string') eachNode(v, fn); } }
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
const declCache = new WeakMap();
function declsOf(scope) {
  if (declCache.has(scope)) return declCache.get(scope);
  const m = new Map();
  const add = (name, decl) => { if (!m.has(name)) m.set(name, decl); };
  const addDeclaration = (s) => {
    if (s.type === 'VariableDeclaration') for (const d of s.declarations) { if (d.id.type === 'Identifier') add(d.id.name, { kind: 'var', node: d }); else for (const n of patternNames(d.id)) add(n, { kind: 'pattern', node: d }); }
    else if (s.type === 'FunctionDeclaration' && s.id) add(s.id.name, { kind: 'function', node: s });
    else if (s.type === 'ClassDeclaration' && s.id) add(s.id.name, { kind: 'class', node: s });
  };
  // Hoisted `var` (and function declarations) anywhere inside a function body, excluding nested functions.
  const hoisted = (root) => { walk.full(root, (n) => { if (n !== root && isFn(n)) return; if (n.type === 'VariableDeclaration' && n.kind === 'var' && enclosingFn(n) === (isFn(root) ? root : enclosingFn(root))) addDeclaration(n); if (n.type === 'FunctionDeclaration' && n !== root && enclosingFn(n) === (isFn(root) ? root : enclosingFn(root))) addDeclaration(n); }); };
  if (isFn(scope)) {
    for (const p of scope.params) for (const n of patternNames(p)) add(n, { kind: 'param', node: scope });
    if (scope.type === 'FunctionExpression' && scope.id) add(scope.id.name, { kind: 'function', node: scope });
    if (scope.body && scope.body.type === 'BlockStatement') { for (const st of scope.body.body) addDeclaration(st); hoisted(scope); }
  } else if (scope.type === 'Program') { for (const st of scope.body) addDeclaration(st); walk.full(scope, (n) => { if (n.type === 'VariableDeclaration' && n.kind === 'var' && !enclosingFn(n)) addDeclaration(n); if (n.type === 'FunctionDeclaration' && !enclosingFn(n)) addDeclaration(n); }); }
  else if (scope.type === 'BlockStatement') { for (const st of scope.body) if (st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration' || (st.type === 'VariableDeclaration' && st.kind !== 'var')) addDeclaration(st); }
  else if (scope.type === 'CatchClause' && scope.param) for (const n of patternNames(scope.param)) add(n, { kind: 'param', node: scope });
  else if ((scope.type === 'ForStatement' || scope.type === 'ForInStatement' || scope.type === 'ForOfStatement')) { const init = scope.init || scope.left; if (init && init.type === 'VariableDeclaration' && init.kind !== 'var') addDeclaration(init); }
  declCache.set(scope, m);
  return m;
}
const isScope = (n) => isFn(n) || n.type === 'Program' || n.type === 'BlockStatement' || n.type === 'CatchClause' || n.type === 'ForStatement' || n.type === 'ForInStatement' || n.type === 'ForOfStatement';
function resolveName(name, from) {
  for (let p = from.parent; p; p = p.parent) {
    if (!isScope(p)) continue;
    const d = declsOf(p).get(name);
    if (d) return { decl: d, scope: p };
  }
  return null;
}
const within = (node, container) => node.range[0] >= container.range[0] && node.range[1] <= container.range[1];
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
const enclosingFn = (n) => { for (let p = n.parent; p; p = p.parent) if (isFn(p)) return p; return null; };
const declKind = (d) => { for (let p = d.parent; p; p = p.parent) if (p.type === 'VariableDeclaration') return p.kind; return null; };
const isImmutableLiteral = (n) => n && ((n.type === 'Literal' && (typeof n.value === 'string' || typeof n.value === 'number' || typeof n.value === 'boolean' || n.value === null)) || (n.type === 'TemplateLiteral' && n.expressions.length === 0));
const PURE_GLOBALS = new Set(['Object', 'Array', 'JSON', 'Error', 'TypeError', 'RangeError', 'Number', 'Date', 'Set', 'Map', 'Promise', 'Math', 'String', 'Boolean', 'Symbol', 'undefined', 'NaN', 'Infinity', 'isFinite', 'isNaN', 'parseInt', 'parseFloat', 'encodeURIComponent', 'decodeURIComponent']);
const GLOBAL_OBJECTS = new Set(['globalThis', 'self', 'window', 'global']);

// Scope-aware assignment / redefinition index, unioned over every entry chunk.
//   decls   : declaration ranges that are reassigned/updated or whose object is mutated
//   globals : global names assigned or redefined: `Error = ...`, `globalThis.Error = ...`,
//             `globalThis["Error"] = ...`, Object.defineProperty/defineProperties/assign or
//             Reflect.set/defineProperty on a global object ('*' when the key is not a literal)
function assignmentIndex(ast, into = { decls: new Set(), globals: new Set() }) {
  const { decls, globals } = into;
  // Pass 1: every assignment/update target and global-redefinition call in this chunk.
  const targets = []; const calls = []; const valueOf = new Map();
  eachNode(ast, (n) => {
    if (n.type === 'AssignmentExpression') { targets.push(n.left); valueOf.set(n.left, n.right); }
    else if (n.type === 'UpdateExpression') { targets.push(n.argument); valueOf.set(n.argument, { type: 'Literal', value: 0 }); }
    else if ((n.type === 'ForInStatement' || n.type === 'ForOfStatement') && n.left.type !== 'VariableDeclaration') targets.push(n.left);
    else if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && !n.callee.computed && n.callee.object.type === 'Identifier' && n.callee.property.type === 'Identifier') calls.push(n);
    else if ((n.type === 'CallExpression' || n.type === 'NewExpression') && n.callee.type === 'Identifier' && (n.callee.name === 'eval' || n.callee.name === 'Function') && !resolveName(n.callee.name, n.callee)) {
      // Dynamic code can rewrite anything. The only tolerated form is webpack's global-object fallback
      // `new Function("return this")`; every other eval/Function call distrusts all globals ('*').
      const a0 = n.arguments[0];
      if (!(n.callee.name === 'Function' && n.arguments.length === 1 && a0 && a0.type === 'Literal' && a0.value === 'return this')) globals.add('*');
    }
  });
  const rootOf = (t) => { let o = t; while (o.type === 'MemberExpression') o = o.object; return o; };
  const markDecl = (id) => { const r = resolveName(id.name, id); if (r) decls.add(r.decl.node.range[0]); else globals.add(id.name); };
  // Pass 2a: binding-level effects (so `decls` is complete before any key is resolved).
  for (const t of targets) {
    if (t.type === 'Identifier') markDecl(t);
    else if (t.type === 'MemberExpression') { const o = rootOf(t); if (o.type === 'Identifier') { const r = resolveName(o.name, o); if (r) decls.add(r.decl.node.range[0]); } }
    else if (t.type === 'ObjectPattern' || t.type === 'ArrayPattern' || t.type === 'AssignmentPattern' || t.type === 'RestElement') eachNode(t, (n) => { if (n.type === 'Identifier' && n.parent && n.parent.type !== 'MemberExpression' && (n.parent.type !== 'Property' || n.parent.value === n) && !(n.parent.type === 'AssignmentPattern' && n.parent.right === n)) markDecl(n); });
  }
  // Static string value of a key expression: literal, no-expression template, a never-reassigned binding
  // initialised with such a literal, or a parameter of an immediately-invoked function whose matching
  // argument is such a value. null when it cannot be determined.
  const staticString = (e, depth = 0) => {
    if (!e || depth > 6) return null;
    if (e.type === 'Literal') return typeof e.value === 'string' ? e.value : String(e.value);
    if (e.type === 'TemplateLiteral' && e.expressions.length === 0) return e.quasis.map((q) => q.value.cooked).join('');
    if (e.type !== 'Identifier') return null;
    const r = resolveName(e.name, e); if (!r) return null;
    if (r.decl.kind === 'var') { const d = r.decl.node; if (decls.has(d.range[0])) return null; return staticString(d.init, depth + 1); }
    if (r.decl.kind === 'param') { const fn = r.decl.node; const i = fn.params.findIndex((p) => p.type === 'Identifier' && p.name === e.name); const call = fn.parent; if (i < 0 || !call || call.type !== 'CallExpression' || call.callee !== fn) return null; return staticString(call.arguments[i], depth + 1); }
    return null;
  };
  const propName = (m) => { if (!m.computed && m.property.type === 'Identifier') return m.property.name; const v = staticString(m.property); return v === null ? '*' : v; };
  // Pass 2b: global-object writes and redefinition calls.
  // In a strict-mode chunk `this` is never the global object in plain calls, so `this.x = ...` is an
  // ordinary object write. Non-strict chunks (or other non-identifier roots such as f().x = ...) are '*'.
  const strict = (() => { const st = ast.body[0]; const e = st && st.type === 'ExpressionStatement' ? st.expression : null; const fn = e && e.type === 'CallExpression' && isFn(e.callee) ? e.callee : null; const first = fn && fn.body && fn.body.type === 'BlockStatement' ? fn.body.body[0] : null; return !!(first && first.type === 'ExpressionStatement' && first.directive === 'use strict') || !!(st && st.directive === 'use strict'); })();
  const RELEVANT = new Set(['Error', 'localStorage']);
  // `new X(...)` can only run user code when X is constructible. Arrow functions, literals, object and
  // array literals, template strings and arithmetic results are not, so writing them to a global —
  // even under an unknown key — cannot hijack `throw new Error(...)`. Anything else might.
  const mayBeConstructible = (v) => { if (!v) return true; switch (v.type) { case 'ArrowFunctionExpression': case 'Literal': case 'TemplateLiteral': case 'ObjectExpression': case 'ArrayExpression': case 'UnaryExpression': case 'BinaryExpression': case 'UpdateExpression': return false; case 'ConditionalExpression': return mayBeConstructible(v.consequent) || mayBeConstructible(v.alternate); case 'LogicalExpression': return mayBeConstructible(v.left) || mayBeConstructible(v.right); case 'SequenceExpression': return mayBeConstructible(v.expressions[v.expressions.length - 1]); case 'AssignmentExpression': return mayBeConstructible(v.right); default: return true; } };
  for (const t0 of targets) {
    if (t0.type !== 'MemberExpression') continue;
    let t = t0; let o = rootOf(t);
    while (o.type === 'AssignmentExpression') { o = o.left.type === 'MemberExpression' ? rootOf(o.left) : o.left; } // (d = expr).prop = v -> binding d
    const key = propName(t);
    const constructible = mayBeConstructible(valueOf.get(t0));
    if (o.type === 'ThisExpression' && strict) continue;                 // ordinary object write in a strict chunk
    // this.method(...)[k] = v in a strict chunk: a write through the current object's own method result
    // (Firestore's internal field maps); treated as a non-global receiver.
    if (strict && (o.type === 'CallExpression') && o.callee.type === 'MemberExpression' && rootOf(o.callee) && rootOf(o.callee).type === 'ThisExpression') continue;
    if (o.type === 'Identifier') {
      if (resolveName(o.name, o)) continue;                             // a local binding's object: already in decls
      if (GLOBAL_OBJECTS.has(o.name)) {
        // globalThis.X = ..., or window.self.X = ... (chain of global aliases only)
        let chainIsGlobal = true; for (let m = t.object; m !== o; m = m.object) { if (!(m.type === 'MemberExpression' && !m.computed && m.property.type === 'Identifier' && GLOBAL_OBJECTS.has(m.property.name))) { chainIsGlobal = false; break; } }
        if (chainIsGlobal) { if (key !== '*') globals.add(key); else if (constructible) globals.add('*'); else globals.add('*:non-constructible'); }
        else if (key === '*' && constructible) globals.add('*');
      } else globals.add(`${o.name}.${key}`);                            // e.g. Error.prepareStackTrace = v (property write, not a replacement)
      continue;
    }
    // Property write on a value produced by a call/new/other expression: could only matter if the key
    // is a trusted name (or unknown) AND the value were the global object — recorded conservatively.
    if (key === '*' || RELEVANT.has(key)) { if (constructible) globals.add(key === '*' ? '*' : key); else globals.add(`${key === '*' ? '*' : key}:non-constructible`); }
  }
  for (const n of calls) {
    const obj = n.callee.object.name, fn = n.callee.property.name, a0 = n.arguments[0];
    if (!(((obj === 'Object' && (fn === 'defineProperty' || fn === 'defineProperties' || fn === 'assign' || fn === 'setPrototypeOf')) || (obj === 'Reflect' && (fn === 'set' || fn === 'defineProperty' || fn === 'setPrototypeOf'))) && a0)) continue;
    if (a0.type === 'Identifier' && GLOBAL_OBJECTS.has(a0.name) && !resolveName(a0.name, a0)) {
      const a1 = n.arguments[1];
      if (a1 && (a1.type === 'Literal' || a1.type === 'TemplateLiteral' || a1.type === 'Identifier')) { const v = staticString(a1); globals.add(v === null ? '*' : v); }
      else if (a1 && a1.type === 'ObjectExpression') for (const pr of a1.properties) { if (pr.type === 'Property' && !pr.computed) globals.add(pr.key.type === 'Identifier' ? pr.key.name : String(pr.key.value)); else globals.add('*'); }
      else globals.add('*');
    } else if (a0.type === 'Identifier' && !resolveName(a0.name, a0)) globals.add(`${a0.name}.*`);
  }
  return into;
}
const globalReplaced = (idx, name) => idx.globals.has(name) || idx.globals.has('*');

// ---- Module map / trusted React binding -----------------------------------------------------
// CRA main chunk: (()=>{ var e={ <id>:(e,t,n)=>{...}, ... }, t={}; function n(r){...} ... (()=>{ app })() })()
function moduleMap(ast) {
  let best = null;
  walk.full(ast, (n) => {
    if (n.type !== 'ObjectExpression' || n.properties.length < 1) return;
    const ok = n.properties.every((p) => p.type === 'Property' && !p.computed && p.key.type === 'Literal' && typeof p.key.value === 'number' && isFn(p.value));
    if (ok && (!best || n.properties.length > best.properties.length)) best = n;
  });
  if (!best) return null;
  const m = new Map(); for (const p of best.properties) m.set(p.key.value, p.value); return m;
}
function moduleFactory(map, id, depth = 0) {
  const f = map && map.get(id); if (!f || depth > 4) return null;
  // Pure re-export: (e,t,n)=>{e.exports=n(983)}
  const body = f.body && f.body.type === 'BlockStatement' ? f.body.body : null;
  if (body && body.length === 1 && body[0].type === 'ExpressionStatement' && body[0].expression.type === 'AssignmentExpression') {
    const a = body[0].expression;
    if (a.left.type === 'MemberExpression' && a.right.type === 'CallExpression' && a.right.callee.type === 'Identifier' && a.right.arguments.length === 1 && a.right.arguments[0].type === 'Literal' && typeof a.right.arguments[0].value === 'number') return moduleFactory(map, a.right.arguments[0].value, depth + 1) || f;
  }
  return f;
}
// `ident` must be a module-level binding `var/const r = n(<id>)` where n is webpack's require (a
// one-parameter FunctionDeclaration or a factory parameter) and module <id> is React itself.
function verifyReactBinding(ident, ctx) {
  const r = resolveName(ident.name, ident);
  if (!r || r.decl.kind !== 'var' || !r.decl.node.init) return `"${ident.name}" is not a variable bound to a required module`;
  if (ctx.idx.decls.has(r.decl.node.range[0])) return `"${ident.name}" is reassigned`;
  const init = r.decl.node.init;
  if (init.type !== 'CallExpression' || init.callee.type !== 'Identifier' || init.arguments.length !== 1 || init.arguments[0].type !== 'Literal' || typeof init.arguments[0].value !== 'number') return `"${ident.name}" is not initialised as require(<module id>)`;
  const req = resolveName(init.callee.name, init.callee);
  if (!req || !((req.decl.kind === 'function' && req.decl.node.params.length === 1) || req.decl.kind === 'param')) return `"${init.callee.name}" is not webpack's require`;
  const fac = moduleFactory(ctx.map, init.arguments[0].value);
  if (!fac) return `module ${init.arguments[0].value} not found in the chunk's module map`;
  const src = ctx.code.slice(fac.range[0], fac.range[1]);
  if (!(src.includes('Symbol.for("react.fragment")') && /\.useState\s*=/.test(src) && /\.useRef\s*=/.test(src))) return `module ${init.arguments[0].value} does not look like React (no react.fragment symbol / useState / useRef definitions)`;
  return null;
}
// (0, r.useState)(x) | r.useState(x)  ->  { binding: r-identifier, hook: 'useState' }
function hookCall(expr) {
  if (!expr || expr.type !== 'CallExpression') return null;
  let c = expr.callee;
  if (c.type === 'SequenceExpression' && c.expressions.length === 2 && c.expressions[0].type === 'Literal' && c.expressions[0].value === 0) c = c.expressions[1];
  if (c.type !== 'MemberExpression' || c.computed || c.object.type !== 'Identifier' || c.property.type !== 'Identifier') return null;
  return { binding: c.object, hook: c.property.name, call: expr };
}
// A verified React useState setter: `const [state, c] = (0, r.useState)(init)` with r = React.
function verifiedSetter(id, ctx) {
  const r = resolveName(id.name, id);
  if (!r || r.decl.kind !== 'pattern') return null;
  const d = r.decl.node;
  if (d.id.type !== 'ArrayPattern' || d.id.elements.length !== 2 || !d.id.elements[1] || d.id.elements[1].type !== 'Identifier' || d.id.elements[1].name !== id.name) return null;
  const h = hookCall(d.init); if (!h || h.hook !== 'useState') return null;
  if (verifyReactBinding(h.binding, ctx)) return null;
  if (ctx.idx.decls.has(d.range[0])) return null;
  return d;
}
// A verified React ref: `const o = (0, r.useRef)(x)`; reading o.current has no accessor.
function verifiedRef(id, ctx) {
  const r = resolveName(id.name, id);
  if (!r || r.decl.kind !== 'var' || !r.decl.node.init) return null;
  const h = hookCall(r.decl.node.init); if (!h || h.hook !== 'useRef') return null;
  if (verifyReactBinding(h.binding, ctx)) return null;
  return r.decl.node;
}

// ---- Effect-free expression grammar ---------------------------------------------------------
// Returns null when evaluating `n` can have no side effect beyond reading bindings, else a reason.
const HOST_READS = new Set(['localStorage']);
function unsafeExpr(n, ctx) {
  switch (n.type) {
    case 'Literal': return null;
    case 'TemplateLiteral': for (const e of n.expressions) { const u = unsafeExpr(e, ctx); if (u) return u; } return null;
    case 'Identifier': {
      if (!isReference(n)) return null;
      const r = resolveName(n.name, n);
      if (r) return null;
      if (PURE_GLOBALS.has(n.name) && !globalReplaced(ctx.idx, n.name)) return null;
      if (HOST_READS.has(n.name) && !globalReplaced(ctx.idx, n.name)) return null;
      return `read of unresolved/redefined global "${n.name}"`;
    }
    case 'UnaryExpression': return ['!', '-', '+', 'typeof', 'void'].includes(n.operator) ? unsafeExpr(n.argument, ctx) : `unary ${n.operator}`;
    case 'BinaryExpression': if (n.operator === 'in' || n.operator === 'instanceof') return `operator ${n.operator} can invoke user code`; return unsafeExpr(n.left, ctx) || unsafeExpr(n.right, ctx);
    case 'LogicalExpression': return unsafeExpr(n.left, ctx) || unsafeExpr(n.right, ctx);
    case 'ConditionalExpression': return unsafeExpr(n.test, ctx) || unsafeExpr(n.consequent, ctx) || unsafeExpr(n.alternate, ctx);
    case 'SequenceExpression': for (const e of n.expressions) { const u = unsafeExpr(e, ctx); if (u) return u; } return null;
    case 'ArrowFunctionExpression': case 'FunctionExpression': return null; // created, not evaluated
    case 'ObjectExpression': for (const p of n.properties) { if (p.type !== 'Property' || p.computed || p.kind !== 'init' || p.method) return 'object literal with spread/computed/accessor/method'; const u = unsafeExpr(p.value, ctx); if (u) return u; } return null;
    case 'ArrayExpression': for (const e of n.elements) { if (!e) continue; if (e.type === 'SpreadElement') return 'array spread'; const u = unsafeExpr(e, ctx); if (u) return u; } return null;
    case 'MemberExpression': {
      if (!n.computed && n.property.type === 'Identifier' && n.property.name === 'current' && n.object.type === 'Identifier' && verifiedRef(n.object, ctx)) return null;
      return `member access ${n.object.type === 'Identifier' ? n.object.name : n.object.type}.${n.property.type === 'Identifier' ? n.property.name : '[computed]'} (possible accessor)`;
    }
    case 'CallExpression': {
      if (n.callee.type === 'Identifier' && verifiedSetter(n.callee, ctx)) { for (const a of n.arguments) { const u = unsafeExpr(a, ctx); if (u) return u; } return null; }
      return `call ${n.callee.type === 'Identifier' ? n.callee.name + '()' : n.callee.type} is not a verified React state setter`;
    }
    default: return `${n.type} is outside the recognised effect-free grammar`;
  }
}

// ---- OFF contract (static) -----------------------------------------------------------------
// provably OFF iff: zero parameters (nothing is evaluated on entry) and the FIRST statement is
//     throw new Error(<msg>)
// with <msg> the disabled literal or a const bound to it, and `Error` exactly the engine binding:
// not declared in any enclosing scope and not assigned/redefined as a global in any entry chunk.
function provablyOff(fnNode, ctx) {
  if (fnNode.params.length !== 0) return { off: false, why: `function has ${fnNode.params.length} parameter(s); parameter/default initialisation runs before the body` };
  if (!fnNode.body || fnNode.body.type !== 'BlockStatement') return { off: false, why: 'function has an expression body' };
  const first = fnNode.body.body[0];
  if (!first || first.type !== 'ThrowStatement') return { off: false, why: `first statement is ${first ? first.type : 'absent'}, not an unconditional throw` };
  const arg = first.argument;
  if (!arg || arg.type !== 'NewExpression' || arg.callee.type !== 'Identifier' || arg.arguments.length !== 1) return { off: false, why: 'throw argument is not `new <Ctor>(<msg>)`' };
  if (arg.callee.name !== 'Error') return { off: false, why: `thrown constructor "${arg.callee.name}" is not the engine's Error (only the native Error binding is trusted)` };
  if (resolveName('Error', arg.callee)) return { off: false, why: '"Error" is declared in an enclosing scope (shadowed)' };
  if (globalReplaced(ctx.idx, 'Error')) return { off: false, why: 'global "Error" is assigned or redefined somewhere in the shipped chunks (not trusted as the engine builtin)' };
  const m = arg.arguments[0];
  if (m.type === 'Literal' && m.value === DISABLED_MSG) return { off: true, why: 'zero-parameter function whose first statement throws the disabled message literal' };
  if (m.type !== 'Identifier') return { off: false, why: 'thrown message is neither the disabled literal nor an identifier' };
  const r = resolveName(m.name, m);
  if (!r || r.decl.kind !== 'var') return { off: false, why: `thrown message identifier "${m.name}" does not resolve to a variable declaration` };
  const d = r.decl.node;
  if (declKind(d) !== 'const') return { off: false, why: `"${m.name}" is a ${declKind(d)} binding (mutable), not const` };
  if (!(d.init && d.init.type === 'Literal' && d.init.value === DISABLED_MSG)) return { off: false, why: `const "${m.name}" is not initialised with the disabled message literal` };
  if (ctx.idx.decls.has(d.range[0])) return { off: false, why: `"${m.name}" is assigned somewhere in the chunk` };
  return { off: true, why: `zero-parameter function whose first statement throws const ${m.name} = disabled message literal` };
}

// ---- Handler path validation ---------------------------------------------------------------
// The supported compiled shapes (what CRA/terser emit for this component) are recognised; anything
// else is inconclusive. `handler` is the function whose direct code is judged; `A` is the single
// import call inside it. Reachable nodes = everything evaluated before A starts, plus catch/finally
// blocks of the try statement that encloses A. Nodes after A inside that try (or after the try, or
// after A when there is no try) are unreachable when A throws, so they are not judged for OFF.
function pathCheck(handler, A, ctx, label) {
  const problems = [];
  if (handler.params.length !== 0) problems.push(`${label}: handler has ${handler.params.length} parameter(s) (parameter/default initialisation is not analysed)`);
  let tryStmt = null; for (let p = A.parent; p && p !== handler; p = p.parent) if (p.type === 'TryStatement' && within(A, p.block)) { tryStmt = p; break; }
  const reachable = (n) => {
    if (within(n, A)) return false;                          // A itself and its arguments are judged separately
    if (n.range[0] < A.range[0]) return true;               // evaluated before A starts (ancestors included, structurally)
    if (tryStmt && ((tryStmt.handler && within(n, tryStmt.handler)) || (tryStmt.finalizer && within(n, tryStmt.finalizer)))) return true;
    return false;                                            // after A: skipped by the throw
  };
  const isAncestorOfA = (n) => within(A, n);
  const STRUCTURAL = new Set(['BlockStatement', 'ExpressionStatement', 'TryStatement', 'CatchClause', 'AwaitExpression', 'SequenceExpression', 'ConditionalExpression', 'LogicalExpression', 'BinaryExpression', 'IfStatement', 'ReturnStatement', 'VariableDeclaration', 'VariableDeclarator', 'EmptyStatement']);
  walk.full(handler, (n) => {
    if (n === handler) return;
    const ef = enclosingFn(n); if (ef !== handler) return;   // inside a nested function: not evaluated here
    if (!reachable(n)) return;
    if (isAncestorOfA(n)) { if (!STRUCTURAL.has(n.type)) problems.push(`${label}: ${n.type} wraps the import call (unsupported shape)`); return; }
    // Statements
    if (n.type === 'ExpressionStatement' || n.type === 'BlockStatement' || n.type === 'TryStatement' || n.type === 'EmptyStatement') return;
    if (n.type === 'CatchClause') { if (n.param && n.param.type !== 'Identifier') problems.push(`${label}: destructured catch parameter`); return; }
    if (n.type === 'VariableDeclaration') return;
    if (n.type === 'VariableDeclarator') { if (n.id.type !== 'Identifier') problems.push(`${label}: destructuring declaration in handler (possible accessor)`); if (n.init) { const u = unsafeExpr(n.init, ctx); if (u) problems.push(`${label}: ${u}`); } return; }
    if (n.type === 'IfStatement') { const u = unsafeExpr(n.test, ctx); if (u) problems.push(`${label}: ${u}`); return; }
    if (n.type === 'ReturnStatement') { if (n.argument) { const u = unsafeExpr(n.argument, ctx); if (u) problems.push(`${label}: ${u}`); } return; }
    // Expressions: judged once at the top of each expression tree (unsafeExpr recurses).
    const pe = n.parent; const topExpr = pe && (pe.type === 'ExpressionStatement' || pe.type === 'SequenceExpression' || pe.type === 'LogicalExpression' || pe.type === 'ConditionalExpression' || pe.type === 'BinaryExpression' || pe.type === 'UnaryExpression' || pe.type === 'AwaitExpression' || pe.type === 'VariableDeclarator' || pe.type === 'IfStatement' || pe.type === 'ReturnStatement' || pe.type === 'CallExpression' || pe.type === 'ObjectExpression' || pe.type === 'Property' || pe.type === 'ArrayExpression' || pe.type === 'TemplateLiteral' || pe.type === 'MemberExpression');
    if (pe && pe.type === 'ExpressionStatement') { const u = unsafeExpr(n, ctx); if (u) problems.push(`${label}: ${u}`); return; }
    if (!topExpr && !STRUCTURAL.has(n.type)) problems.push(`${label}: ${n.type} is outside the recognised grammar`);
  });
  return [...new Set(problems)];
}
// Direct calls (not inside nested functions) in `fn` whose callee is import code.
function importCalls(fn, component) {
  const out = [];
  walk.full(fn, (n) => {
    if (n.type !== 'CallExpression' || enclosingFn(n) !== fn) return;
    const c = n.callee;
    if (isFn(c)) { out.push({ call: n, node: c, kind: 'inline' }); return; }
    if (c.type !== 'Identifier') return;
    const r = resolveName(c.name, c); if (!r || within(r.decl.node, component)) return;
    if (r.decl.kind === 'function') out.push({ call: n, node: r.decl.node, kind: 'module-function', name: c.name });
    else if (r.decl.kind === 'var' && r.decl.node.init && isFn(r.decl.node.init)) out.push({ call: n, node: r.decl.node.init, kind: 'module-const', name: c.name });
  });
  return out;
}
// Accept button: onClick must be `()=>{y()}` / `()=>y()` calling one component-local zero-arg handler.
function acceptHandlerOf(onClick, component, label) {
  const errors = [];
  if (onClick.params.length !== 0) errors.push(`${label}: onClick has parameters`);
  const calls = []; walk.full(onClick, (n) => { if (n.type === 'CallExpression' && enclosingFn(n) === onClick) calls.push(n); });
  if (calls.length !== 1) return { errors: [...errors, `${label}: onClick must contain exactly one call, found ${calls.length}`] };
  const c = calls[0];
  if (c.arguments.length !== 0 || c.callee.type !== 'Identifier') return { errors: [...errors, `${label}: onClick call is not a zero-argument call to an identifier`] };
  const r = resolveName(c.callee.name, c.callee);
  if (!r || !within(r.decl.node, component) || r.decl.kind !== 'var' || !r.decl.node.init || !isFn(r.decl.node.init)) return { errors: [...errors, `${label}: onClick callee "${c.callee.name}" is not a component-local const handler function`] };
  // Nothing else may be evaluated in the onClick: its body must be exactly that call.
  const body = onClick.body.type === 'BlockStatement' ? onClick.body.body : [{ type: 'ExpressionStatement', expression: onClick.body }];
  if (body.length !== 1 || body[0].type !== 'ExpressionStatement' || body[0].expression !== c) errors.push(`${label}: onClick body is more than the single handler call`);
  return { handler: r.decl.node.init, errors };
}
function bindComponent(ast, code, ctx) {
  const accepts = []; walk.full(ast, (n) => { if (n.type === 'Literal' && n.value === BUTTON_ACCEPT) accepts.push(n); });
  if (accepts.length === 0) return null;
  if (accepts.length > 1) return { error: `${accepts.length} "${BUTTON_ACCEPT}" literals in one chunk (ambiguous)` };
  const acceptLit = accepts[0];
  const component = enclosingFn(acceptLit);
  if (!component) return { error: 'import UI literal is not inside a function' };
  const out = { component, markerAttr: null, executor: null, decline: null, errors: [], props: {} };
  // Props mapping from the component's destructured first parameter.
  const p0 = component.params[0];
  if (p0 && p0.type === 'ObjectPattern') for (const pr of p0.properties) if (pr.type === 'Property' && pr.key.type === 'Identifier') { const v = pr.value.type === 'AssignmentPattern' ? pr.value.left : pr.value; if (v.type === 'Identifier') out.props[pr.key.name] = v.name; }
  walk.full(component, (n) => { if (n.type === 'Property' && !n.computed && n.key.type === 'Literal' && n.key.value === 'data-import-config' && n.value.type === 'Literal') out.markerAttr = n.value.value; });
  const propsObjectOf = (lit) => { for (let p = lit.parent; p; p = p.parent) { if (p.type === 'ObjectExpression') return p; if (isFn(p)) return null; } return null; };
  const propOf = (obj, key) => (obj.properties || []).find((p) => p.type === 'Property' && !p.computed && ((p.key.type === 'Identifier' && p.key.name === key) || (p.key.type === 'Literal' && p.key.value === key)));
  const bind = (handler, label, wantAwait) => {
    const ics = importCalls(handler, component);
    if (ics.length !== 1) { out.errors.push(`${label}: expected exactly one import call in the handler, found ${ics.length}`); return null; }
    const t = ics[0];
    const awaited = t.call.parent && t.call.parent.type === 'AwaitExpression';
    if (wantAwait && !awaited) out.errors.push(`${label}: the import call is not awaited`);
    if (!wantAwait && awaited) out.errors.push(`${label}: unexpected awaited import call`);
    const awaits = []; walk.full(handler, (n) => { if (n.type === 'AwaitExpression' && enclosingFn(n) === handler) awaits.push(n); });
    if (awaits.some((a) => a.argument !== t.call)) out.errors.push(`${label}: an await in the handler is not the single import call`);
    for (const a of t.call.arguments) { const u = unsafeExpr(a, ctx); if (u) out.errors.push(`${label}: import call argument is not effect-free (${u})`); if (a.type === 'SpreadElement') out.errors.push(`${label}: spread argument`); }
    out.errors.push(...pathCheck(handler, t.call, ctx, label));
    return t;
  };
  const acceptProps = propsObjectOf(acceptLit); const onAccept = acceptProps && propOf(acceptProps, 'onClick');
  if (!onAccept || !isFn(onAccept.value)) out.errors.push('accept button has no onClick function');
  else { const h = acceptHandlerOf(onAccept.value, component, 'accept'); out.errors.push(...h.errors); if (h.handler) out.executor = bind(h.handler, 'accept', true); }
  const declLits = []; walk.full(component, (n) => { if (n.type === 'Literal' && n.value === BUTTON_DECLINE) declLits.push(n); });
  if (declLits.length !== 1) out.errors.push(`expected one "${BUTTON_DECLINE}" literal in the component, found ${declLits.length}`);
  else {
    const props = propsObjectOf(declLits[0]); const onDecline = props && propOf(props, 'onClick');
    if (!onDecline || !isFn(onDecline.value)) out.errors.push('decline button has no onClick function');
    else { if (onDecline.value.params.length !== 0) out.errors.push('decline: onClick has parameters'); out.decline = bind(onDecline.value, 'decline', false); }
  }
  return out;
}

// ---- ON detection (execution with the ACTUAL call-site arguments) ---------------------------
// Only used to prove an opted-in build enabled. The callee must have plain identifier parameters
// (no defaults/patterns/rest); every actual argument is mapped by role from the component's props
// (localStorage -> in-memory storage, backend prop -> spy, uid/teamId/teamName -> session values,
// literals -> themselves, `()=>ref.current===x` / `()=>true` -> a still-current predicate). Any
// other argument shape is inconclusive, so no synthetic invocation can stand in for the real one.
function closureFor(fnNode, code, ctx) {
  const decls = []; const seen = new Set(); const problems = [];
  const collect = (node, container) => {
    walk.full(node, (n) => {
      if (n.type === 'ThisExpression') { problems.push('`this` is referenced'); return; }
      if (n.type !== 'Identifier' || !isReference(n)) return;
      const r = resolveName(n.name, n);
      if (!r) { if (!PURE_GLOBALS.has(n.name)) problems.push(`free identifier "${n.name}" is not a module-scope declaration or a pure builtin`); else if (globalReplaced(ctx.idx, n.name)) problems.push(`builtin "${n.name}" is assigned or redefined as a global`); return; }
      if (within(r.decl.node, container)) return;
      if (r.decl.kind !== 'var' && r.decl.kind !== 'function') { problems.push(`"${n.name}" resolves to a ${r.decl.kind} outside the function`); return; }
      if (ctx.idx.decls.has(r.decl.node.range[0])) { problems.push(`"${n.name}" is assigned or mutated after declaration`); return; }
      const key = `${r.decl.node.range[0]}:${n.name}`; if (seen.has(key)) return; seen.add(key);
      if (r.decl.kind === 'function') { const d = r.decl.node; decls.push({ pos: d.range[0], text: code.slice(d.range[0], d.range[1]) + '\n' }); collect(d, d); return; }
      const d = r.decl.node;
      if (declKind(d) !== 'const' || !d.init) { problems.push(`"${n.name}" is not a const with an initialiser`); return; }
      if (isFn(d.init)) { decls.push({ pos: d.range[0], text: `const ${n.name} = ${code.slice(d.init.range[0], d.init.range[1])};` }); collect(d.init, d.init); return; }
      if (isImmutableLiteral(d.init)) { decls.push({ pos: d.range[0], text: `const ${n.name} = ${code.slice(d.init.range[0], d.init.range[1])};` }); return; }
      problems.push(`"${n.name}" is a const bound to a ${d.init.type} (mutable or environment-dependent value)`);
    });
  };
  collect(fnNode, fnNode);
  decls.sort((a, b) => a.pos - b.pos);
  return { preamble: decls.map((d) => d.text).join('\n'), problems: [...new Set(problems)], declCount: decls.length };
}
function memStorage(seed) {
  const m = new Map(Object.entries(seed)); const writes = [];
  return { writes, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { writes.push(['set', k]); m.set(k, String(v)); }, removeItem: (k) => { writes.push(['remove', k]); m.delete(k); }, key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, clear: () => { writes.push(['clear']); m.clear(); } };
}
const PLAY = { id: 'proof-p1', name: 'Proof Mesh', phase: 'offense', type: 'pass', players: [], routes: [] };
function mapArgument(a, env, ctx) {
  const { props, session, storage, backend } = env;
  if (a.type === 'Literal') return { value: a.value };
  if (a.type === 'Identifier') {
    const r = resolveName(a.name, a);
    if (!r && a.name === 'localStorage' && !globalReplaced(ctx.idx, 'localStorage')) return { value: storage };
    if (r && r.decl.kind === 'param' && r.decl.node === ctx.component) {
      if (a.name === props.backend) return { value: backend };
      if (a.name === props.uid) return { value: session.uid };
      if (a.name === props.teamId) return { value: session.teamId };
      if (a.name === props.teamName) return { value: session.teamName };
    }
    if (r && r.decl.kind === 'var' && isImmutableLiteral(r.decl.node.init) && !ctx.idx.decls.has(r.decl.node.range[0])) return { value: r.decl.node.init.type === 'Literal' ? r.decl.node.init.value : r.decl.node.init.quasis.map((q) => q.value.cooked).join('') };
    return { error: `argument identifier "${a.name}" has no faithful mapping` };
  }
  if (a.type === 'ObjectExpression') { const o = {}; for (const p of a.properties) { if (p.type !== 'Property' || p.computed || p.kind !== 'init') return { error: 'object argument with spread/computed/accessor' }; const k = p.key.type === 'Identifier' ? p.key.name : String(p.key.value); const v = mapArgument(p.value, env, ctx); if (v.error) return v; o[k] = v.value; } return { value: o }; }
  if (a.type === 'ArrowFunctionExpression' && a.params.length === 0 && a.body.type !== 'BlockStatement') {
    const b = a.body;
    if (b.type === 'Literal' && b.value === true) return { value: () => true };
    if (b.type === 'BinaryExpression' && b.operator === '===' && b.left.type === 'MemberExpression' && !b.left.computed && b.left.property.name === 'current' && b.left.object.type === 'Identifier' && verifiedRef(b.left.object, ctx) && b.right.type === 'Identifier') return { value: () => true };
    return { error: 'arrow argument is not a recognised still-current predicate' };
  }
  return { error: `argument of type ${a.type} has no faithful mapping` };
}
async function proveOn(target, code, ctx, which) {
  const fn = target.node;
  if (fn.params.some((p) => p.type !== 'Identifier')) return { outcome: 'inconclusive', detail: 'callee has default/destructured/rest parameters (their initialisation is not analysed)' };
  const ev = (() => { const c = closureFor(fn, code, ctx); if (c.problems.length) return { error: c.problems.join('; ') }; try { const f = vm.runInNewContext(`${c.preamble}\n(${code.slice(fn.range[0], fn.range[1])})`, {}, { timeout: 5000 }); return typeof f === 'function' ? { fn: f, declCount: c.declCount } : { error: 'not a function' }; } catch (e) { return { error: `extraction failed: ${String(e && e.message).slice(0, 120)}` }; } })();
  if (ev.error) return { outcome: 'inconclusive', detail: `cannot reconstruct a faithful closure (${ev.error})` };
  const session = { uid: 'release-proof-uid', teamId: 'release-proof-team', teamName: 'Release Proof' };
  const storage = memStorage({ smartPlaybook_plays: JSON.stringify([PLAY]) });
  const backend = { copies: 0, reads: 0, copy: async (_s, p) => { backend.copies += 1; return `srv-${p.id}`; }, read: async () => { backend.reads += 1; return PLAY; } };
  const args = []; for (const a of target.call.arguments) { const m = mapArgument(a, { props: ctx.props, session, storage, backend }, ctx); if (m.error) return { outcome: 'inconclusive', detail: `actual argument not faithfully mappable: ${m.error}` }; args.push(m.value); }
  const side = () => `backend.copy x${backend.copies}, backend.read x${backend.reads}, storage writes ${storage.writes.length}`;
  try {
    const r = which === 'executor' ? await Promise.race([ev.fn(...args), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))]) : ev.fn(...args);
    const reached = which === 'executor' ? backend.copies > 0 : (r === 'declined' || r === 'postponed') && storage.writes.length > 0;
    return { outcome: reached ? 'enabled' : 'inconclusive', detail: `executed with ${args.length} actual-mapped argument(s): resolved ${JSON.stringify(r)}; ${side()}`, declCount: ev.declCount };
  } catch (e) {
    return { outcome: backend.copies > 0 ? 'enabled' : 'inconclusive', detail: `executed with ${args.length} actual-mapped argument(s): threw "${String(e && e.message).slice(0, 100)}"; ${side()}`, declCount: ev.declCount };
  }
}
async function judge(target, code, ctx, which) {
  const st = provablyOff(target.node, ctx);
  if (st.off) return { outcome: 'disabled', basis: 'static', detail: st.why, kind: target.kind };
  const on = await proveOn(target, code, ctx, which);
  return { ...on, basis: on.outcome === 'enabled' ? 'execution' : 'none', detail: `not provably OFF (${st.why}); ${on.detail}`, kind: target.kind };
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
  const parsed = [];
  const idx = { decls: new Set(), globals: new Set() };
  for (const f of entries.files) {
    const code = fs.readFileSync(f, 'utf8');
    try { const ast = parseChunk(code); assignmentIndex(ast, idx); parsed.push({ f, code, ast }); }
    catch (e) { report.reasons.push(`inconclusive: ${path.relative(dir, f)} failed to parse: ${String(e.message).slice(0, 120)}`); }
  }
  let found = null;
  for (const { f, code, ast } of parsed) {
    const ctx = { idx, code, map: moduleMap(ast), component: null, props: {} };
    const b = bindComponent(ast, code, ctx);
    if (!b) continue;
    if (b.error) { report.reasons.push(`inconclusive: ${b.error}`); continue; }
    if (found) { report.reasons.push('inconclusive: import UI component found in more than one entry chunk'); continue; }
    ctx.component = b.component; ctx.props = b.props;
    const exec = { executor: b.executor ? await judge(b.executor, code, ctx, 'executor') : null, decline: b.decline ? await judge(b.decline, code, ctx, 'decline') : null };
    found = { chunk: path.relative(dir, f), componentRange: b.component.range, markerAttr: b.markerAttr, props: b.props, errors: b.errors, exec };
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
