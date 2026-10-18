# Release-proof repair: import default-OFF proven from build inputs AND shipped output

Date: 2026-10-18 (revised after the independent FAIL reviews of `c9d49dd` c-6243708455, `905b1d4` c-6246331436 and `d14aa7b` c-6248146409). Author: Claude.
**Delivery, not independent acceptance. No merge/deploy; MVP NO-GO.**

## Finding (evidence 73, PR #76 review)
`scripts/security/verify-release-build.sh` pinned the emulator flag but never looked at
`REACT_APP_ENABLE_LEGACY_IMPORT`. A git-ignored `.env.local` (or a shell variable) overrides
`.env.production` in a CRA production build, so a release build could ship with import ON while the
proof still reported 13/13 PASS.

## Build-time precedence (audited: react-scripts 5.0.1 `config/env.js`, dotenv never overwrites set vars)
`shell environment` > `.env.production.local` > `.env.local` > `.env.production` > `.env`
(`.env.local` is skipped only for NODE_ENV=test). Confirmed empirically by the regression check
"precedence audit matches CRA", which runs CRA's own loader in a child process.

## Base and scope
Base **`61448f0feee198a8796f4077f32a52f7b863f90d`** (PR #76, reviewed PASS). Branch
`ci/release-proof-import-off` (deliberately outside `claude/**` so no full matrix auto-starts).
Changed files: `scripts/security/verify-release-build.sh`, new `scripts/security/release-import-config.js`,
new `scripts/security/release-import-config.test.mjs`, `src/features/legacy-import/import-legacy.ts`
(+5 lines: `IMPORT_CONFIG_MARKER`), `src/features/legacy-import/LegacyImport.tsx` (`data-import-config`
attribute), new `src/features/legacy-import/__tests__/import-config-marker.test.tsx`,
`.github/workflows/e2e-emulator.yml` (+1 step running the self-checks before the proof), this doc and the
two support drafts under `docs/support/`. **Unchanged:** the enable check
(`=== 'true'`), every import/recovery behaviour and test, `.env.production`/`.env.test`/`build-app.sh`
opt-ins, identity UI, e2e tests/config/reporter/evidence scripts, membership (76/15), execution settings.
PR #77 (aggregate gate) is separate and untouched.

## Design rationale (third revision — effects around the throw, constructor binding, actual arguments)

The third review showed that "first statement throws" is not enough when code *around* the throw can run:
argument getters, default parameters, handler parameters, extra reads in the onClick wrapper, and
destructured locals that are not React setters — plus a computed `globalThis["Error"]` replacement, an
unresolved `CustomError` trusted as native, and an ON control that invoked the callee with synthetic
arguments where the real UI passed `false`.

The repair recognises the **complete supported compiled path** and rejects everything else:
- accept onClick must be exactly `()=>{y()}` to a component-local **zero-parameter** handler; the decline
  onClick is itself the handler and must have no parameters; the OFF callee must have **zero parameters**
  (so no default/destructuring initialisation can run) — the real compiled handlers are
  `async function(){throw new Error(zv)}(localStorage)`;
- every node evaluated before the import call, and the enclosing try's catch/finally, must fit an
  effect-free grammar: literals, local reads, `ref.current` of a **verified React `useRef`**, calls to
  **verified React `useState` setters** (the destructuring's initialiser is `(0, r.useState)(…)` where `r`
  is `n(<id>)` and module `<id>` is checked to be React by its own source) with effect-free arguments;
  import-call arguments must be effect-free (so `argBox.value` getters and `i.copy(...)` arguments fail);
- `Error` must be the engine binding: exactly that name, not shadowed, and not assigned/redefined as a
  global anywhere in any entry chunk — identifier, member, computed-literal (`globalThis["Error"]`),
  static-key (`window[k]` where `k` resolves to a literal through consts or IIFE arguments),
  `Object.defineProperty/assign` and `Reflect.*` on global objects; any `eval`/`Function` other than
  webpack's `new Function("return this")` distrusts all globals. Writes of non-constructible values
  (arrows, literals, object/array literals) cannot hijack `new Error` and are not counted;
- ON detection executes the callee with the **actual call-site arguments mapped by role** (literals as
  themselves — so an explicit `false` is passed as `false`), only plain identifier parameters, and counts
  reads/copies/writes; unmappable shapes are inconclusive.

Host assumptions stated narrowly: the chunk is strict mode (`this` is never the global object in plain
calls; `this.method()[k]=v` is an ordinary object write), the runtime is native and not rewritten by code
outside the shipped entry chunks, and no dynamic code other than webpack's global fallback exists (any
other is rejected). The retained shipped JS exists so a reviewer can inspect exactly what was judged.

## Design rationale (second revision)

The second review showed that *executing a reconstructed closure* can never be trusted to say OFF: a
reconstruction can omit later initialisation (`cfg.enabled = true`), substitute an empty VM for shipped
global state (`globalThis.proofEnabled`), drop actual call arguments, ignore an unresolved call that runs
first, or pick one of two handlers. Every one of those produced a false OFF while the real button copied.

Options considered:
- **Real browser, real UI wiring.** The import section renders only for an authenticated coach with a
  selected team; the release-shaped bundle targets the staging project with a placeholder key and has no
  emulator wiring, so driving it requires faking Firebase Auth and Firestore protocols under Playwright.
  Not feasible as a bounded repair, and still would not isolate the component from the parent's state.
- **Whole-module execution with webpack's own runtime.** The main chunk is a self-contained IIFE whose app
  module runs `createRoot(...).render(<App/>)` on evaluation; the component is not exported. Executing it
  needs a DOM and the same auth state. Same problem.
- **Static, environment-independent OFF contract + execution only for ON.** Chosen. The release build's
  compiled handlers are `async function(){throw new Error(zv)}(localStorage)` — an *unconditional first
  statement throw*. Such a function cannot reach a backend regardless of its arguments, closures, globals
  or later initialisation; the only things that must hold are that the thrown message really is the
  disabled constant (a `const` bound to the string literal — primitives bound by `const` cannot change) and
  that `Error` has not been replaced (not declared in scope; not assigned/`defineProperty`'d as a global
  anywhere in the chunk). No argument is synthesised and no environment is reconstructed for OFF.
  Handler binding accounts for **every** direct call (setters/props allowed; any member-expression call,
  unresolved callee, second handler, extra await or ambiguity is inconclusive). ON is proved by execution
  only when every free identifier is a pure builtin, a module-scope function or an immutable-literal
  const, none reassigned/mutated (scope-aware), and backend reads, copies and storage writes are all
  counted; otherwise inconclusive. The data attribute must agree with the verdict.

Residual limits stated plainly: static analysis cannot exclude dynamic code (`eval`/`new Function`) that
rewrites behaviour at run time; the retained shipped JS (below) exists so a reviewer can inspect exactly
what was judged. The proof is a release-*shaped* build, not a deployment.

## What the proof now requires (fail closed)
1. `.env.production` contains the exact line `REACT_APP_ENABLE_LEGACY_IMPORT=false` (necessary, not sufficient).
2. **Effective build-time value** resolved independently and by CRA's loader (child process): must agree, be
   exactly `"false"`, from a committed-basename file. Enabling shell/local files, local pins, malformed/unset
   values or loader disagreement (e.g. `${VAR}` expansion) FAIL **before any build**.
3. **Shipped import implementation OFF** by the static contract above, bound through the real button
   handlers of the single `"Import plays"` component in the chunks `index.html` ships.
4. **Negative control (required):** the same analysis must find the opted-in emulator build ON by execution.
5. **Retention:** `RELEASE_RETAIN_DIR` keeps `index.html`, `static/js/*.js`, `asset-manifest.json` and
   `release-build.context` (SHAs, run/attempt, matrix job, versions, effective config, verdict, manifest
   hash + full manifest); no source maps, no `.env*`. CI retains under `e2e/ci-evidence/release-build`,
   inventoried/hashed/uploaded by B15. Not retained: CSS, `sw.js`, headers/redirects, robots/sitemap,
   LICENSE (manifest-only).

## Validation
- `node scripts/security/release-import-config.test.mjs`: 37 checks — 35 fast + 2 real-build
  (`RELEASE_PROOF_BUILD=1`) → **37/37, 0 skipped** locally. Adds the third review's seven false-OFF probes
  (each asserting the real button reaches the backend, the repaired scanner refuses OFF, and the `d14aa7b`
  scanner gave the false OFF), the false-ON probe (explicit `false` arguments: real UI makes no call, the
  control must not report ON — `d14aa7b` did), actual-argument execution (5 mapped args; unmappable →
  inconclusive), surrounding-path grammar cases and the eval/Function rule. Includes: resolve cases; synthetic CRA/terser-shaped
  bundles (OFF decided on a *static* basis, ON by execution); first-review decoys 1–4 + unwired decoy;
  **second-review probes R1–R3 (all six)**, each asserting (a) the whole-module "actual behaviour" harness
  really copies/reads/writes, (b) the repaired scanner refuses OFF, (c) the `905b1d4` scanner (from git) gave a
  false OFF; baselines; replaced/redefined/shadowed `Error` and `let` message rejected; mutable closure makes
  ON detection fail closed; fail-closed binding cases; old `c9d49dd` scanner vs new; source contract; two
  end-to-end real-script refusals; real build asserting **process exit 0**, the 17-PASS line, static-OFF line,
  ON control and retained output; F2 regression (broken ON control → non-zero exit asserted).
- `verify-release-build.sh` on this head with a fresh same-commit emulator build: **17 passed, 0 failed**.
- Import suites 49/49; `tsc` clean; reporter 10/10; evidence 19.
- In CI the self-check step annotates `tests/pass/fail/skipped` explicitly; its real-build cases and the
  old-commit comparisons are **skipped there** (shallow checkout; the proof step builds anyway) — skips are
  reported as skips, never as passes.

## Independent Codex re-review checklist
1. Re-run your six probes and the whole-module harness against `scan`; add new shapes (member-expression
   callee, second awaited call, `Object.defineProperty(globalThis,'Error',…)`, `let` message) — none may PASS.
2. Confirm the real OFF build is decided `[static]` and the real emulator build is `on` by execution with
   reads counted.
3. `RELEASE_PROOF_BUILD=1 node scripts/security/release-import-config.test.mjs` (26/26 with full history).
4. Inspect the CI-retained `ci-evidence/release-build/` and the self-check annotation counts.
5. Drafts unchanged from the corrected `905b1d4` versions.
