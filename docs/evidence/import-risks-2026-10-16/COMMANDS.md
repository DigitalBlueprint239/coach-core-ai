# Exact validation commands (PowerShell)

Working directory: `work/main-import-risks` on isolated branch. Installed runtime
reused through a local node_modules junction; no install, dependency/config change.
All raw logs retained outside repo; published text normalizes line endings.

```powershell
$env:CI='true'
node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand --runTestsByPath src/features/legacy-import/__tests__/risk-characterization.test.tsx src/features/legacy-import/__tests__/owner-resume.test.tsx src/features/legacy-import/__tests__/unfinished-claim.test.tsx src/features/legacy-import/__tests__/import-legacy.test.tsx src/features/legacy-import/__tests__/firebase-import.test.ts
node node_modules/typescript/bin/tsc --noEmit
```

Before production edit: unit.log35 PASS (includes trivial constant assertion),
unit-final.log34 PASS after removing that assertion as inadequate config coverage.
R4 remains code inspection/untested release config, never an acceptance PASS.

Added legacy-state regression while production source remained518e9e5:

```powershell
$env:CI='true'
node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand --runTestsByPath src/features/legacy-import/__tests__/risk-characterization.test.tsx
```

statusless-before.log:3 PASS/1 FAIL (owner's Import plays missing).
This is a characterization failure for a seeded legacy state, not an independent
browser result or observed real customer's crash. Raw failure preserved.

After bounded hasUnfinishedImport repair and five negative cases, exact source
35e0d77887ba87d2714706f0cdbb2511b442d1a2:

```powershell
$env:CI='true'
node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand
node node_modules/typescript/bin/tsc --noEmit
$env:CI='false'
$env:GENERATE_SOURCEMAP='false'
npm run build
```

full-unit.log:489/489,38 suites; types-repair.log:empty/exit0.
Production build result in build.log and final summary/report.
React test-library act deprecation warnings retained. No tests skipped, no
acceptance timeout/assertion/reporting edits; Claude's harness untouched.

Read-only source/provenance checks:

```powershell
git show 8dcf9a793910845f332fc6a56d5ee019d7e7ed4f:src/features/legacy-import/import-legacy.ts
git diff 280ee484cf0b24ba2fb0eb7d803ea9c85c743489 35e0d77887ba87d2714706f0cdbb2511b442d1a2 -- src/features/legacy-import/import-legacy.ts
git diff --check
git status --short
```

GitHub39 approval/coordination and queue references are in the risk review.
No new browser/emulator/staging/physical-device run. Normal-path independent
history stays attributed to Claude. Raw JSON/logs are not promoted to E2E proof.
