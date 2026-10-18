# Release-proof repair: import default-OFF proven from build inputs AND shipped output

Date: 2026-10-18. Author: Claude. **Delivery, not independent acceptance. No merge/deploy; MVP NO-GO.**

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
2. **Effective build-time value** resolved twice — independently (dotenv, CRA precedence) and by CRA's own
   loader in a child process — must agree, be exactly `"false"`, and come from a committed file
   (`.env.production` or `.env`). An enabling shell variable / `.env.local` / `.env.production.local`, a
   local pin to `false`, a malformed value (`TRUE`, `1`, `yes`, `False`, empty, padded), an unset flag, or
   a loader disagreement all FAIL — **before any build is produced** (no enabled bundle is ever written).
3. **Output-level canary.** The import module defines
   `IMPORT_CONFIG_MARKER = \`coachcore:import-config=${process.env.REACT_APP_ENABLE_LEGACY_IMPORT}\``,
   rendered as `data-import-config` on the import section. CRA/terser fold it into a literal, so the
   shipped JS of a release build contains `coachcore:import-config=false`. The scan requires: that
   literal present, `coachcore:import-config=true` absent, the inlined `REACT_APP_ENABLE_LEGACY_IMPORT:"true"`
   absent, and the disabled-state copy present (an enabled build DCEs it). A missing canary is
   **inconclusive → FAIL**.
4. **Negative control.** The same scan must DETECT the explicitly opted-in emulator build
   (`e2e/.app-build`, built by `build-app.sh` with the flag ON): `coachcore:import-config=true` must be
   found, proving the pattern is live. (Locally this requires a fresh emulator build from the same
   commit; CI always builds it in the same job first.)

## Validation
- `node scripts/security/release-import-config.test.mjs`: 12 fast checks + 1 slow (`RELEASE_PROOF_BUILD=1`):
  committed pin OK; `.env.local=true` FAIL; `.env.production.local=true` FAIL; shell `true` FAIL;
  shell/local `false` FAIL (not committed); eight malformed values FAIL; unset FAIL; `.env`-only FAIL;
  precedence audit = CRA; scan: OFF ok / ON fail / missing canary inconclusive / stray inlined true fail /
  =true alongside =false fail / no disabled copy fail / empty fail; negative-control both ways; source
  contract (marker, enable check unchanged, opt-ins preserved); **end-to-end real script with shell
  override → exit 1, refuses to build, no build dir; end-to-end real script with a temporary enabling
  `.env.local` in the repo root → the old check still PASSes, the new effective check FAILs, no build**;
  real release-shaped build → canary PASS. Result: 13/13 with the slow case, 12 pass + 1 skip without.
- `bash scripts/security/verify-release-build.sh coach-core-mvp-staging-239` on this head with a fresh
  emulator build: **17 passed, 0 failed** (was 13), incl. `effective build-time import config is OFF
  (.env.production="false"; CRA loader agrees: "false")`, `shipped JS proves import OFF (canary=false x1,
  =true x0, inlined true x0, disabled copy x2)` and `negative control: import canary detects the opted-in
  emulator build (=true)`.
- Import unit suites: 7 suites / 49 tests (47 accepted + 2 new marker checks); `tsc --noEmit` clean;
  reporter 10/10; evidence 19 (18 + root skip).
- Actual CI: see the handoff (bounded dispatch on this head; the release-proof step runs in every job).

## Independent Codex review checklist
1. Diff vs `61448f0` is the files above; the enable check and all accepted import/recovery behaviour are
   byte-for-byte unchanged apart from the marker constant and attribute.
2. Reproduce: shell override and `.env.local` end-to-end cases must refuse before building.
3. Build once; confirm the canary is a single literal in the shipped JS and that the enabled emulator
   build is detected by the negative control.
4. Probe `resolve` with your own fixtures (e.g. `.env` vs `.env.production` disagreement, CRLF files,
   quoted values `"false"` — dotenv strips quotes, so `"false"` passes; decide if that is acceptable).
5. Confirm the workflow step order (self-checks → release proof) and that nothing else in the workflow moved.
6. Review the two drafts in `docs/support/` as proposals only; confirm no channel/capability is implied.
