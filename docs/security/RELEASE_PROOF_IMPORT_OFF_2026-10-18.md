# Release-proof repair: import default-OFF proven from build inputs AND shipped output

Date: 2026-10-18 (revised after the independent FAIL review of `c9d49dd`, comment 6243708455). Author: Claude.
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

## What the proof now requires (fail closed)
1. `.env.production` contains the exact line `REACT_APP_ENABLE_LEGACY_IMPORT=false` (necessary, not sufficient).
2. **Effective build-time value** resolved twice — independently (dotenv, CRA precedence; no dotenv-expand) and
   by CRA's own loader in a child process — must agree, be exactly `"false"`, and come from a committed-basename
   file (`.env.production` or `.env`; this is a basename allowlist, not a git-tracking check). An enabling
   shell variable / `.env.local` / `.env.production.local`, a local pin to `false`, a malformed value, an unset
   flag, or a loader disagreement (e.g. `${VAR}` expansion) all FAIL **before any build is produced**.
3. **Executable output verification (F1 repair).** Only the chunks `index.html` actually ships are considered.
   Each is parsed (acorn; comments never reach the AST). The import UI component is located as the single
   function containing the literal `"Import plays"`; its accept button's `onClick` is followed to the accept
   handler and to the awaited call, whose callee is the compiled import EXECUTOR (inline after terser folding,
   or a module-scope function resolved by identifier); the `"Not now"` button yields the compiled DECLINE
   function the same way. Both are extracted with the transitive closure of the module-scope declarations they
   reference and **executed in a fresh VM** against in-memory storage, a session and a spy backend. OFF ⇔ the
   executor rejects with the disabled message before any storage write or backend call AND decline throws it
   too; ON ⇔ the executor reaches `backend.copy`. The component's own `data-import-config` literal must agree
   with the executed verdict. Comments, orphan files, OFF prose beside enabled code, an enabled executor behind
   an OFF marker, a decoy rejecting function that is not wired to the button, two components, an unparseable
   chunk or an unbindable handler all FAIL (inconclusive = FAIL).
4. **Negative control (now required, not optional).** The same executable analysis must find the explicitly
   opted-in emulator build (`EMULATOR_BUILD_DIR`, default `e2e/.app-build`) **ON**; a missing emulator build
   fails the proof. The legacy hook/port/demo string controls remain.
5. **Retention (F3 repair).** With `RELEASE_RETAIN_DIR` set (CI: `e2e/ci-evidence/release-build`), the exact
   inspected output is kept: `index.html`, `static/js/*.js`, `asset-manifest.json` and `release-build.context`
   (candidate/head sha, run id/attempt, matrix project/bucket, node/react-scripts versions, effective import
   config, executable verdict, sha256 of the build manifest and the full manifest). No source maps are generated
   and no `.env*` file is ever copied. B15 inventories, hashes and uploads the directory with the job's evidence.

## Validation (head after repair)
- `node scripts/security/release-import-config.test.mjs` — 15 fast + 2 slow (`RELEASE_PROOF_BUILD=1`), **17/17**:
  resolve (pin OK; `.env.local`/`.env.production.local`/shell enabling FAIL; shell/local false FAIL; 8 malformed,
  unset, `.env`-only FAIL; `${VAR}` expansion inconclusive FAIL; precedence = CRA); synthetic CRA/terser-shaped
  bundles: OFF proven by execution, ON detected, module-scope executor resolved and executed with its closure;
  **reviewer decoys 1–4** (comment-only OFF strings beside enabled code; enabled `main.js` + orphan with OFF
  strings; enabled behaviour behind OFF marker + prose; comment-only ON marker in negative-control) all FAIL;
  decoy rejecting function not wired to the button FAILS; fail-closed cases (no `index.html`, missing referenced
  chunk, no component, two components, unparseable chunk, other rejection message); **old scanner (`c9d49dd`)
  demonstrably passes decoys 1–2 while the repaired scanner fails them**; source contract; two end-to-end real
  script refusals (shell override; temporary enabling `.env.local`); **real build asserting process exit 0**,
  the 17-PASS RESULT line, executed-OFF line, ON negative control and the retained output (files, provenance,
  retained JS byte-identical to the manifest); **F2 regression: a broken negative control (comment-only ON
  marker fixture) makes the real proof exit non-zero and the check asserts that status** even though every OFF
  PASS line is still printed.
- `bash scripts/security/verify-release-build.sh coach-core-mvp-staging-239` with a fresh same-commit emulator
  build: **17 passed, 0 failed**, incl. `shipped executable import code is OFF (static/js/main.<hash>.js:
  executor inline -> disabled, decline inline -> disabled, data-import-config=coachcore:import-config=false)` and
  `negative control: executable analysis detects the opted-in emulator build as ON`. The same analysis on the
  enabled emulator build: verdict ON (executor `backend.copy x1`, decline returned "declined").
- Import unit suites 49/49; `tsc --noEmit` clean; reporter 10/10; evidence 19.

## Independent Codex re-review checklist
1. Diff vs `61448f0`; the application change is still only the marker constant + `data-import-config`.
2. Re-run the reviewer decoys from the FAIL review against `scan`/`negative-control`; try new ones (e.g. a
   component whose handler calls through a MemberExpression, a chunk-split executor) — these must be
   inconclusive-FAIL, never PASS.
3. Run `RELEASE_PROOF_BUILD=1 node scripts/security/release-import-config.test.mjs` (two real builds).
4. Confirm the F2 regression: a broken `EMULATOR_BUILD_DIR` makes the proof exit 1 and the suite fails.
5. Inspect the CI-retained `ci-evidence/release-build/` in the ZIPs: run `scan` on it yourself; recompute the JS
   hash against `release-build.context`'s manifest; confirm no `.env*`, no source maps.
6. Read the two drafts against the authoritative boundary (issue #39 c-6224877757; RUNTIME_IMPORT_CANDIDATE
   §support boundary): no bypass, no invented verification, existing/proposed/decisions clearly separated.
