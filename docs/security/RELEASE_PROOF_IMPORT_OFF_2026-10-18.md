# Release proof: legacy-import default-OFF — fourth revision (verification contract reassessed)

Date: 2026-10-18 (revised after the independent FAIL reviews of `c9d49dd` c-6243708455, `905b1d4`
c-6246331436, `d14aa7b` c-6248146409 and `cab8cab` c-6254186547). Author: Claude.
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
`ci/release-proof-import-off`. Files in this revision: `scripts/security/release-import-config.js`
(rewritten: `resolve`, `canary`, `gate`; `scan`/`negative-control` removed),
`scripts/security/release-import-config.test.mjs` (65 checks), `scripts/security/verify-release-build.sh`,
`e2e/scripts/build-app.sh` (+ `E2E_IMPORT_OFF=1` mode), new `e2e/playwright.release-proof.config.ts`,
new `e2e/tests/release-import-off.spec.ts`, `e2e/playwright.config.ts` (+ `testIgnore` for that one
spec), `e2e/package.json` (+3 scripts), `.github/workflows/e2e-emulator.yml` (+ import-OFF build, L3 run,
gate steps in the desktop acceptance jobs; notice elsewhere), this doc. **Unchanged since `c9d49dd`:**
`src/features/legacy-import/import-legacy.ts` (`IMPORT_CONFIG_MARKER`), `LegacyImport.tsx`
(`data-import-config`), the marker unit test, `.env.production`/`.env.test`, every import/recovery
behaviour and test, identity UI, the B11 suite (182 tests listed before and after), reporter/evidence
scripts, execution settings, the two corrected support drafts. PR #77 is separate and untouched.

## Why the verifier repeatedly accepted behaviour its model did not represent (root cause)

Every revision from `c9d49dd` to `cab8cab` tried to answer one question from the minified shipped chunk
alone: *is the import handler inert?* Each repair added a recogniser for the construct the previous
review used — string counting → reconstructed closures → "first statement throws" with an effect-free
grammar around it → verified React bindings, constructor-binding index, strict-`this` exemptions,
predicate mapping. Each time the next review found a construct **the engine evaluates and the model does
not**: setter arguments that are functions (React invokes them), `+evil` (valueOf), accessor properties,
`poison.call(globalThis)`, `const R = Reflect`, a tampered `require`, an outer `finally`, a duplicate JSX
key, a stale `ref.current` that the ON control replaced with `()=>true`.

That is not a sequence of bugs; it is the shape of the problem. "No backend effect is reachable from this
handler" is a semantic property of arbitrary JavaScript. A syntactic whitelist over compiled output can
only be sound if it enumerates every evaluation point of the language (every coercion, accessor, call,
binding resolution and control-flow edge) — and each exemption added to make the *real* bundle pass
(`Error.prepareStackTrace=`, gtag `window[e]=t`, Firebase `Gf()[t]=…`, React `this.x=`) widened the
accepted language again without re-establishing soundness. The ON control had the mirror defect: to make
execution possible outside the browser it synthesised environment (arguments, predicates, storage), so
it could "prove" ON for code the real UI never enables. Both legs were modelling the engine instead of
using it.

## The smallest defensible contract (chosen)

Stop asserting handler inertness from output. Prove three things that are each decidable, and only
their conjunction is called the proof:

| Leg | Claim | How it is decided | Decidable because |
|---|---|---|---|
| **L1 configuration** (`resolve`) | The release build's effective `REACT_APP_ENABLE_LEGACY_IMPORT` is exactly `"false"` from a committed-basename file. | Independent dotenv resolution + CRA's own `config/env.js` in a child process, in the same shell the build then runs in; the script refuses to build otherwise. | Finite file precedence + loader agreement; no code semantics. |
| **L2 inlining** (`canary`) | The chunks `index.html` ships contain the build-time marker `coachcore:import-config=<v>` as a **string-literal token in parsed code** (comments are not tokens), with exactly one distinct `<v>` equal to the resolved value; and `src/` reads the flag at exactly one boundary (`isLegacyImportEnabled`, `IMPORT_CONFIG_MARKER`, verbatim) with the accepted guards present verbatim (`importLegacy`/`declineImport` first-statement check, component `enabled` switch, `data-import-config`). | Token scan of the entry chunks (acorn tokenizer) + exact-line source scope check. | Literal presence/absence and exact text; webpack DefinePlugin substitutes one value per compilation, so one inlined value governs every read. |
| **L3 behaviour** (`e2e/tests/release-import-off.spec.ts` + `gate`) | The application compiled from this commit with the flag OFF behaves disabled under real execution: owner signed in, device plays seeded → notice only, `data-import-config=…=false`, **zero** buttons in the import region, no `plays` document for the team or coach, no claim/pending/decision key, originals byte-identical (RP-OFF-01); an **unfinished claim of this very coach and team** is neither resumed, postponed nor cleared and stays byte-identical (RP-OFF-02); no device data → no region, nothing written (RP-OFF-03). ON control = the **accepted** D10-01/D10-02 on the same-commit opted-in build (real UI, real arguments, real predicates, real emulator writes). | Playwright (Chromium and Firefox) against the Firebase emulators, both builds served side by side; `gate` reads `results.json` and requires every RP-OFF-* and D10-01/D10-02 execution to be `expected`/passed — a skip, a flaky pass, a missing title or a missing file is inconclusive. | Observation of the real bundle in a real browser; nothing modelled, nothing synthesised. |

Each reviewer finding maps to a leg that no longer needs to model it:

| Finding (review 4) | Was modelled by | Now |
|---|---|---|
| F1 functional updater via verified setter (incl. real React 19) | "verified setter + effect-free argument" grammar | no setter grammar exists; real React runs in the browser (L3) |
| F1 `+evil` valueOf coercion | "effect-free unary" rule | no expression grammar exists (L3) |
| F2 `poison.call(globalThis)` / aliased `Reflect` / tampered `require` | constructor-binding index, strict-`this` exemption, module-source check | no Error/binding trust is required: nothing is executed in a VM |
| F2 `Object.defineProperty(ref,'current',{get})` | verified `useRef` | none |
| F3 outer `finally` after handled rejection | nearest-try path check | none |
| F4 duplicate `onClick` key | first-match prop lookup | the real DOM button is what Playwright clicks — and in the OFF build there is none to click |
| F5 ON predicate mapped to `()=>true` | synthetic ON execution | ON control is the accepted browser suite with the real predicate |
| F6 reporting | — | the shell script's RESULT line states "L1+L2 only; L3 decided by gate"; the gate reports executed titles per project and refuses on skips |

### What the proof establishes, precisely
For the inspected commit and toolchain (versions recorded in `release-build.context`): (1) the
release-shaped build was produced with the import flag OFF; (2) the compiler inlined that value into the
shipped entry chunks and the source reads the flag nowhere else; (3) the application compiled from that
source with that value exhibits the disabled behaviour in Chromium and Firefox, and the same commit
compiled with the opt-in exhibits the accepted enabled behaviour.

### Host assumptions (stated, not verified by the proof)
- **DefinePlugin single substitution:** webpack 5 / react-scripts 5.0.1 (lockfile-pinned) replaces every
  `process.env.REACT_APP_ENABLE_LEGACY_IMPORT` read with the same value in one compilation. This is the
  toolchain-integrity assumption any build proof makes; L2 corroborates it (one literal, one value).
- **Build equivalence:** the import-OFF emulator build and the release build are the same source, same
  toolchain and same flag value, differing only by the emulator/project environment values. The proof
  does **not** execute the release bundle itself (it has no emulator wiring and cannot be signed into
  without a real identity provider); it executes the same-commit OFF build with emulator wiring.
- **Artifact identity:** the shipped bundle is the one the proof built (all hashes retained; comparison
  with a deployment is out of scope — nothing is deployed).

### Not established
Any property of a bundle not built by this proof from this commit; any claim about handler inertness
derived from minified output (retired as unsound — the synthetic adversarial bundles from all four
reviews remain in the regression suite precisely to show the fourth revision makes no such claim and the
gate stays inconclusive for all of them).

## Alternative considered: a structural release boundary in the application (proposed, not implemented)

A refactor could make the OFF bundle contain **no import executor at all**, turning the output check into
a structural absence check instead of a behaviour claim:

```ts
// src/features/legacy-import/index.ts (proposal)
export default process.env.REACT_APP_ENABLE_LEGACY_IMPORT === 'true'
  ? require('./LegacyImport').default          // dead branch in release builds: webpack drops the module
  : require('./LegacyImportDisabled').default; // notice-only component, imports nothing from import-legacy/firebase-import
```
with `SmartPlaybook.tsx` importing the index. webpack evaluates the DefinePlugin constant before
dependency collection, so `LegacyImport.tsx` (and `import-legacy.ts`' executor) would leave the OFF graph
unless imported elsewhere — and `EarlierDrafts.tsx` already imports `firebaseImport` for accepted
recovery, so the **backend capability** stays in the bundle regardless; only the import UI wiring would be
absent. That makes the gain smaller than it looks, and the change touches accepted application code
(PR #76 runtime, reviewed PASS) and the accepted marker test. It is therefore **documented, not done**:
if Coach Drew wants it, it is a separate PR against `61448f0` with its own review; the L3 harness above
would still be the behavioural evidence for it.

Also considered and rejected: executing the real release bundle under Playwright with faked Firebase Auth
and Firestore protocols (large, brittle, and the fake is itself a model); evaluating the main chunk with
webpack's runtime in jsdom (the app mounts on evaluation; the component is not exported).

## What the proof now requires (fail closed)
1. `.env.production` contains the exact line `REACT_APP_ENABLE_LEGACY_IMPORT=false` (necessary, not sufficient).
2. **Effective build-time value** (L1) resolved independently and by CRA's loader: must agree, be exactly
   `"false"`, from a committed-basename file; otherwise FAIL **before any build**.
3. **Canary** (L2): one string-literal `coachcore:import-config=false` in the shipped entry chunks, no
   other value; source scope exact; the opted-in emulator build must read `config-true` (negative control
   of the check itself); the import-OFF emulator build, when present, must read `config-false` and is hashed.
4. **Behaviour** (L3): RP-OFF-01/02/03 and D10-01/D10-02 executed and passed in the release-proof config;
   `gate` writes `release-gate.json` with the executed titles per project, the verdict, the
   "establishes" statement and the reasons.
5. **Retention:** `RELEASE_RETAIN_DIR` keeps `index.html`, `static/js/*.js`, `asset-manifest.json`,
   `release-canary.json`, `import-off-build-manifest.sha256` and `release-build.context` (SHAs,
   run/attempt, matrix job, node/react-scripts/webpack/terser/react versions, effective config, canary
   verdict, both manifest hashes + full release manifest); no source maps, no `.env*`. CI retains under
   `e2e/ci-evidence/` (inventoried/hashed/uploaded by B15) and copies the release-proof `results.json`
   under `e2e/test-results/release-proof/`.
6. **Reporting:** the shell script's RESULT line names the legs it covers; the self-check step annotates
   tests/pass/fail/skipped; the gate step annotates the verdict with executed titles; jobs that do not run
   L3 say so and make no OFF-behaviour claim.

## Validation (this head)
- `node scripts/security/release-import-config.test.mjs`: **65 checks — 63 pass, 2 skipped** (the two
  real-build cases) locally with full history; with `RELEASE_PROOF_BUILD=1` the two real-build cases
  **pass** (19-PASS script line, canary/provenance retained, gate inconclusive without browser results;
  F2 broken-control regression non-zero). Sections: resolve (4); canary + source scope (3); retired-model
  regressions — 23 false-OFF fixtures from all four reviews (each: reviewers' actual-behaviour harness
  shows the effect; the fourth revision makes no behavioural claim; gate inconclusive), 2 false-ON
  fixtures, the real-React-19/jsdom updater; **review reproductions** — 22 false-OFF + 2 false-ON + 1
  real-React checks that the superseded `905b1d4`/`d14aa7b`/`cab8cab` scanners returned the false verdict
  (explicitly **skipped**, not passed, where git history is shallow); gate contract (2); source/workflow
  contract (1); real-script refusals (2); real builds (2).
- `verify-release-build.sh` on this head with fresh same-commit emulator and import-OFF builds:
  **19 passed, 0 failed (L1+L2 only)**.
- Playwright membership: main config lists **182 tests in 9 files before and after**; release-proof
  config lists RP-OFF-01/02/03 × {chromium, firefox} and D10-01/D10-02 × {chromium, firefox}.
- **L3 was NOT executed locally**: the Firebase emulator JARs cannot be downloaded from this workspace.
  The behavioural leg and the gate verdict come from the bounded CI run on this head (desktop acceptance
  jobs); see the evidence file for run ids and annotation text.

## Independent Codex re-review checklist
1. Re-run your nine probes and any new shape: confirm `canary` never reports behaviour and `gate` is
   inconclusive for every synthetic bundle (no `scan`/`negative-control` command exists).
2. Inspect the CI run: `release-gate.json` (executed titles per project, verdict), the release-proof
   `results.json`, `release-build.context` (both manifest hashes), the self-check annotation counts.
3. `RELEASE_PROOF_BUILD=1 node scripts/security/release-import-config.test.mjs` with full history (65/65).
4. Playwright `--list` for both configs (membership unchanged; OFF spec only in the release-proof config).
5. Drafts and application code unchanged from the accepted versions.
