# Issue #38 — Day 1 implementation evidence

Date: 2026-10-13. Owner: Codex. Task branch: `codex/issue-38-tests-audit`, based on recovery commit `3992d8d58ae0bb28490cfdfc48ed66e86b4ffd53`. PR targets `recovery/coach-core-mvp-2026`; no merge is authorized by this record.

## Milestone 1 — original reports imported

The four original reports are imported byte-for-byte under `outputs/`, together with their sanitized logs, exact standalone source manifest, isolated harness, and synthetic export samples. [SHA-256 import manifest](../outputs/evidence/issue-38/original-report-import-manifest.json) confirms unchanged report contents. These reports describe the earlier baseline main commit `898339a0d8bf6c0be5452cd781a9ac1ae90c54f7`, not this repair. Historical statements such as “checkout clean” apply to that audit run only.

- [Recovery audit](../outputs/COACH_CORE_RECOVERY_AUDIT.md)
- [Feature matrix](../outputs/MVP_FEATURE_TEST_MATRIX.md)
- [Original security findings](../outputs/SECURITY_FINDINGS.md)
- [Recovery roadmap](../outputs/MVP_RECOVERY_ROADMAP.md)

## Milestone 2 — main test repairs

Before: targeted logger/FieldMemo invocation reproduced two failed logger assertions, three passed logger tests, and an unloaded FieldMemo suite. [Before log](../outputs/evidence/issue-38/issue38-before.log).

Root causes and affected files:

- `src/utils/__tests__/logger.test.ts`: `Object.defineProperty` did not change reads from Jest's `process.env` proxy. A temporary assertion after setting development observed `test` instead. [Probe log](../outputs/evidence/issue-38/logger-env-probe.log). The probe temporarily added the same development assertion to all tests; its production assertions are diagnostic scaffolding, not final expectations. Final setup uses assignment and explicitly asserts the requested environment before importing the logger. All existing development, production, warn/error, and argument assertions remain. `src/utils/logger.ts` is unchanged.
- `src/components/SmartPlaybook/__tests__/FieldMemo.test.js`: malformed module path prevented loading. Fixed to `../Field`. A local mock 2D context lets the real component draw in JSDOM; callback-only updates now assert no additional `clearRect`, while player updates assert a redraw and the moved player arc. This verifies drawing calls and memo behavior, not browser pixels or pointer interactions.

After: targeted **2 suites / 9 tests pass**; full main **16 suites / 344 tests pass**, no skipped tests or snapshots. The four formerly unloaded tests account for 340 → 344 total tests. Main TypeScript exits 0. Production build exits 0 with the same 15 existing lint warnings and stale Browserslist data; main JavaScript gzip size is 224.69 kB. Evidence: [targeted](../outputs/evidence/issue-38/issue38-targeted.log), [full suite](../outputs/evidence/issue-38/main-tests.log), [typecheck](../outputs/evidence/issue-38/main-types.log), [build](../outputs/evidence/issue-38/main-build.log).

Important limits: full Jest output still records the existing AuthProvider mismatch/error boundary crash in `App.test.tsx` despite its passing assertion. React Testing Library 13 also warns about deprecated `ReactDOMTestUtils.act` with React 19. Other logged network errors belong to existing mocked failure tests. These repairs do not establish real authentication, dashboard rendering, tenant isolation, or Firebase behavior. Claude owns the independent review; no auth/rules/AI security implementation was edited.

## Milestone 3 — standalone diagnostic classification

Verified rerun counts 810 diagnostics across 30 files, matching the baseline. [Root causes and proposed repairs](SMART_PLAYBOOK_TYPESCRIPT_CLASSIFICATION.md): 807 missing DefaultTheme members, 1 required GlobalStyles theme prop, 2 missing SVG prop interfaces. Proposed standalone repairs are not implemented or verified in this PR. No compiler suppressions, framework changes, or lockfile changes were introduced.

## Exact substantive commands

Working directory for main commands: `work/main-platform` inside the original Codex audit workspace. Installed dependencies from the original audit were reused: Node `v22.23.1`, npm `10.9.8`, TypeScript `5.8.3`. Dependency install commands and their failures are preserved in the original audit and logs; no reinstall was required for this test-only repair.

```powershell
git fetch origin recovery/coach-core-mvp-2026
git switch -c codex/issue-38-tests-audit origin/recovery/coach-core-mvp-2026
# Canonical instructions read before edits (git show origin/recovery/coach-core-mvp-2026:<path>):
# AGENTS.md, CLAUDE.md, docs/COACH_CORE_SHARED_CONTEXT.md, docs/MVP_7_DAY_SPRINT.md
$env:CI='true'
npm test -- --watchAll=false --runInBand --runTestsByPath src/utils/__tests__/logger.test.ts src/components/SmartPlaybook/__tests__/FieldMemo.test.js *> ../issue38-before.log
# Temporary environment assertion probe, then removed in favor of final repair:
npm test -- --watchAll=false --runInBand --runTestsByPath src/utils/__tests__/logger.test.ts *> ../issue38-env-probe.log
npm test -- --watchAll=false --runInBand --runTestsByPath src/utils/__tests__/logger.test.ts src/components/SmartPlaybook/__tests__/FieldMemo.test.js *> ../issue38-targeted.log
Copy-Item -Path ../../outputs -Destination . -Recurse
New-Item -ItemType Directory -Force outputs/evidence/issue-38 | Out-Null
Copy-Item ../issue38-before.log,../issue38-targeted.log -Destination outputs/evidence/issue-38
npm test -- --watchAll=false --runInBand *> outputs/evidence/issue-38/main-tests.log
npx --no-install tsc --noEmit *> outputs/evidence/issue-38/main-types.log
$env:CI='false'
npm run build *> outputs/evidence/issue-38/main-build.log
npx --no-install tsc --version
node --version
npm --version
git diff --check
```

`CI=false` records CRA's warning-bearing production build; it does not claim a warning-free CI gate. A strict CI build may reject the already known lint warnings. See the retained build log for actual results.

Standalone working directory: `work/smart-playbook-source`:

```powershell
Move-Item -LiteralPath audit-harness.tsx -Destination ../issue38-audit-harness.tsx
npx --no-install tsc --noEmit *> ../issue38-smart-types.log
Move-Item -LiteralPath ../issue38-audit-harness.tsx -Destination audit-harness.tsx
```

The workspace-only `node ../issue38-report.cjs` parsed compiler diagnostics, copied evidence, generated the classification tables, and verified the four original report hashes. JSON counts allow independent recounting from raw compiler output without that scratch script. Discovery used `rg`, `Get-Content`, `git show`, `git status`, and `git diff`; no production data or credentials were queried.

## Handoff / readiness

Main test failures assigned here are repaired. Standalone diagnostic classification is complete. Private MVP remains **NO-GO** pending auth and authorization review, safe AI credential handling, and verified critical coaching workflows. Next owners: reviewer for this PR; Claude for independent security/auth review; Codex for a separately scoped standalone theme/icon repair and functional regressions. Keep applications separate and do not deploy from this milestone.
