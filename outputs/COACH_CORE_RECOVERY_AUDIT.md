# Coach Core AI recovery audit

Audit date: October 13, 2026 (America/New_York). **Private MVP readiness: NO-GO.** Both primary production builds succeed, but critical workflows and tenant isolation are not verified. This is an audit baseline, not a recovery implementation or deployment approval.

## Source identity and preservation

| Application | Audited source | Branch | Retrieval |
|---|---|---|---|
| Main platform | `898339a0d8bf6c0be5452cd781a9ac1ae90c54f7` | `recovery/coach-core-mvp-2026` | Git clone |
| Standalone Smart Playbook | `6b4c42c0d18a2a0364a3cf72f62bbc4535517e58` | `recovery/smart-playbook-mvp-2026` | Authenticated GitHub connector; 84 files retrieved at exact commit |

Main recovery branch already existed and pointed to the same commit as remote master at discovery. Production branches were not edited. A separate Smart Playbook recovery branch was created and confirmed with branch search. Its source was materialized locally as a snapshot because the shell lacked private-repository authentication; all 84 file bytes were subsequently verified against Git blob SHA-1 values. See [source manifest](evidence/SMART_SOURCE_MANIFEST.json).

No application changes, framework upgrades, merges, public deployments, paid infrastructure changes, or Firebase reads/writes/migrations were performed. The main checkout is clean. Audit-only harness files and generated dependencies exist under `work/`; reports and sanitized evidence are under `outputs/`. Browser tests used default synthetic plays. Existing browser data was not explicitly cleared. The isolated harness used a separate JSDOM storage instance.

Windows checkout initially failed on `src/components/Coach Core AI Brain /coach-core-ai-brain.py` because its parent directory ends with a space. A local sparse checkout excludes only that directory. `core.protectNTFS=false` was set only in this audit clone to allow Git to process that index entry; the invalid path was not materialized. Recommend renaming the tracked directory in a reviewed recovery change. No inference about that Python file's execution was made.

## Stack and entry points

| Item | Main platform | Standalone |
|---|---|---|
| Framework | React 19.1, Create React App/react-scripts 5.0.1, TypeScript 5.8 | React 19.2, Vite 6, TypeScript 5.8, Konva/react-konva 19, styled-components |
| Package manager | npm, tracked root package-lock.json | npm inferred from scripts; no tracked lockfile |
| Entry | `public/index.html` → `src/index.tsx` → `src/App.tsx` | `index.html` → `index.tsx` → `App.tsx` |
| Canvas | Custom canvas in `src/components/SmartPlaybook/Field.js` | `components/FieldCanvas.tsx`, `src/field`, `src/players`, `src/routes` |
| Persistence | Firebase Auth/Firestore plus browser storage | Browser localStorage; no implemented Firebase backend |
| Node declaration | No root pin; functions require Node 22 | No pin; installed Vite React plugin requires a recent supported Node release |
| Actual tools | Node 22.23.1; npm 10.9.8; Git 2.54.0.windows.1 | Same |

The session skill's React 18/Vite/44-test description does not describe this main recovery branch. Actual commands and source take precedence. No AGENTS.md was found in the retrieved trees. No offensive-engine or canvas implementation was modified.

Main also contains two nested package roots. `coach-core-ai/` is an unconnected CRA starter displaying “Learn React”; it is not the coaching platform. `src/components/SmartPlaybook/` contains a separate CRA package with Chakra 2/React 18 and a broken alternate `src/App.tsx`; its files are not the root entry point. These competing manifests are a maintenance hazard, not proof of multiple working coaching apps.

## Verified command outcomes

All application commands ran with credentials absent and without changing tracked manifests or lockfiles. Full outputs are in [evidence/logs](evidence/logs). A command wrapper prints the real command's exit status; wrapper success is not used as application success.

| Target/check | Result | Evidence and implication |
|---|---|---|
| Main `npm ci` | FAIL, exit 1 | ERESOLVE: testing-library/react 13.4 expects React 18; project has React 19.1 |
| Main `npm ci --legacy-peer-deps` | Diagnostic PASS, exit 0 | 1,540 installed packages; peer constraints bypassed, not repaired |
| Main `npm run build` | PASS with warnings, exit 0 | Optimized build; 15 lint warnings; main JS 224.69 kB gzip |
| Main `npx --no-install tsc --noEmit` | PASS, exit 0 | Zero diagnostics, with exclusions and suppressions described below |
| Main Jest | FAIL, exit 1 | 14 suites pass, 2 fail; 338 tests pass, 2 fail, 340 total; one failed suite never executes |
| Main dev server | PARTIAL | Compiles with warnings, “No issues found”; GET localhost:3101 returns HTTP 200 with root element. Does not prove dashboard runtime |
| Standalone `npm install` | PASS, exit 0 | 159 packages; generated local lockfile. Original source has no reproducible dependency lock |
| Standalone production build | PASS with warning, exit 0 | Vite 6.4.4; 544 modules; primary chunk 1,448.81 kB, 449.62 kB gzip |
| Standalone TypeScript | FAIL, exit 2 | 810 diagnostics: 807 DefaultTheme property errors; three other component prop errors |
| Standalone `npm test` | NOT IMPLEMENTED | Missing test script; TESTING.md is a proposed plan, not an implemented suite |
| Standalone dev server | PARTIAL | Starts in 774 ms; HTTP 200; actual field observed in browser; React console errors exist |
| Added isolated standalone harness | FAIL overall | 8 pass, 2 fail across 10 checks; real context, history and storage functions in JSDOM, without canvas or backend |
| Functions `npm ci` | FAIL | Lockfile out of sync; missing Jest 30 dependency tree from peer resolution |
| Functions `npm ci --legacy-peer-deps` | Diagnostic PASS | Installs without changing tracked lockfile |
| Functions lint | FAIL | 301 errors: 300 CRLF/LF linebreak mismatches and one max-len error at index.js:105 |
| Functions syntax/module load | PASS | `node --check index.js`; require exposes seven handlers. No handler invoked |
| Nested starter install/build/types/test | PASS | Locked install, build and tsc pass; one “Learn React” test passes; no coaching workflows |
| Nested alternate Playbook install | FAIL/BLOCKED | npm ci reports many missing packages in lockfile; no tests discovered under its src tree; alternate App has broken imports |
| Firestore emulator | BLOCKED | Java unavailable on PATH. Rule compiler and allow/deny integration tests not run |

Dependency audit results are package findings, not a count of exploitable deployed endpoints: main 107 (6 low, 16 moderate, 79 high, 6 critical); standalone 1 critical (jsPDF); functions 31 (1 low, 14 moderate, 11 high, 5 critical). Nested starter install reported 108. Exact advisory inventories are preserved for primary package roots. No npm audit fix or forced upgrade was applied.

## Failures, affected files, fixes

1. **Dependency conflict:** root package.json React 19 vs testing-library 13 and CRA's older TypeScript peer support. Choose and lock a compatible testing-library/runtime set with the current framework. Keep legacy-peer-deps as a diagnostic exception, not a readiness gate.
2. **Malformed test import:** `src/components/SmartPlaybook/__tests__/FieldMemo.test.js:10` imports `../:components:SmartPlaybook:Field.js`; intended sibling is `../Field`. Repair import and execute actual field test.
3. **Logger tests:** `src/utils/__tests__/logger.test.ts:28,64` expect development console.log calls; zero calls observed. Inspect CRA environment replacement vs logger's module-level environment decision. Do not change production logging merely to satisfy these tests.
4. **False-positive App smoke:** `src/App.test.tsx` passes while console records `useAuth must be used within an AuthProvider`. App mounts `components/AuthProvider`, but Dashboard consumes `hooks/useAuth`, a different context. Consolidate providers and assert that an actual dashboard/auth view renders and the error boundary is absent.
5. **Suppressions:** 14 `@ts-nocheck` files, including active `TouchOptimizedPlaybook.tsx`, excluded alternate App, and 12 archive files. Main tsc success does not cover these or unchecked JS. Audit-only scope did not remove suppressions or rewrite archived features.
6. **Standalone typing:** add styled-components DefaultTheme augmentation from AppTheme; repair GlobalStyles theme typing and icon style prop types in DrillFinder/GameScripter. Do not hide diagnostics or infer Vite build success means types pass.
7. **Drag history:** `contexts/PlaybookContext.tsx` uses minor updates for player movement; `hooks/useHistory.ts` overwrites present before commit captures it. Harness moved x=720 to x=760, committed, then undo left x=760. Preserve pre-interaction snapshot, commit one drag action, clear redo on new edits; test pointer, keyboard and multi-selection edits.
8. **Stored data validation:** `services/installService.ts` validates ids and player arrays but accepts a play with no routes. Harness reproduces acceptance. Validate all nested route/player/metadata fields, version the schema, quarantine invalid data without discarding the only copy. Current malformed-JSON fallback removes its browser key.
9. **Exports:** actual single-play PDF downloads and parses, but the 493×452 viewport output has no players and a cropped field. Export should fit content or use a separate diagram stage. Install-book export produced an error alert. Source calls `pdf.autoTable()` after a side-effect import; installed plugin smoke shows this method is undefined. Use the plugin's documented named autoTable API or explicit applyPlugin, then verify complete books.
10. **Responsive layout:** fixed floating panels overlap the field in small viewport; player coordinates lie outside the visible field. Desktop at 1440×1000 shows players; viewport changes do not relocate initial panel positions. Add fit-to-field bounds, panel clamping/reflow and touch testing.

Browser startup initially timed out twice, then attached through Codex's browser panel. After install-book export's alert, further UI inspection timed out. Do not interpret attempted formation clicks with unchanged UI, or their timeouts, as feature passes. Wristband, animation, pointer drawing, individual player interaction, smartphone touch and tablet interaction remain incompletely tested.

## Missing configuration

Main requires `REACT_APP_FIREBASE_API_KEY`, `REACT_APP_FIREBASE_AUTH_DOMAIN`, `REACT_APP_FIREBASE_PROJECT_ID`, `REACT_APP_FIREBASE_STORAGE_BUCKET`, `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`, `REACT_APP_FIREBASE_APP_ID`; measurement ID is optional analytics configuration. Environment example uses NEXT_PUBLIC names, which CRA will not substitute. No real configuration was supplied. `src/firebase.ts` eagerly initializes auth; startup without a valid configuration is not handled safely. Emulator connections in firestore.ts are commented out.

AI uses `REACT_APP_AI_PROXY_ENDPOINT` (default /api/ai), `REACT_APP_AI_PROXY_TOKEN` and a dangerous client `REACT_APP_OPENAI_API_KEY` path. Do not supply the latter two secrets to a browser build. Root AIProvider defaults to direct service rather than proxy. Hosting configuration has only an SPA rewrite, not an implemented /api/ai backend route. VAPID public key, error reporting endpoint, and build metadata are optional feature configuration; subscription backend wiring is not verified.

Standalone GEMINI_API_KEY is substituted into `process.env.API_KEY` and `process.env.GEMINI_API_KEY` by vite.config.ts. **Leave it unset until AI is behind an authenticated server.** `/api/ai/practice-plan`, `/api/ai/drill-recommendations`, `/api/ai/game-script` have client callers but no implemented handlers; functions/index.ts is empty. No Firebase configuration/rules/dependency are implemented in this app.

## Command ledger

Paths below are relative to the session directory. Commands are PowerShell. `*>` captures combined output in the audit workspace. Tool-based retrieval and browser steps are listed separately. Exploratory source reads used Get-Content and rg; no configuration values were printed unredacted.

```powershell
git --version
node --version
npm --version
gh --version # unavailable
git ls-remote --heads https://github.com/DigitalBlueprint239/coach-core-ai.git
git ls-remote --heads https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-.git
git clone --single-branch --branch recovery/coach-core-mvp-2026 https://github.com/DigitalBlueprint239/coach-core-ai.git work/main-platform
git clone https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-.git work/smart-playbook # authentication blocked
$env:GIT_TERMINAL_PROMPT='0'; $env:GCM_INTERACTIVE='never'
git -c credential.interactive=never ls-remote --symref https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-.git HEAD
git -c credential.helper= -c core.askPass= ls-remote https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-.git

# Main checkout workaround, cwd work/main-platform
git sparse-checkout init --no-cone # initially failed
git config core.sparseCheckout true
git config core.sparseCheckoutCone false
@('/*','!/src/components/Coach Core AI Brain /') | Set-Content -Encoding utf8NoBOM .git/info/sparse-checkout
git read-tree -mu HEAD # initially rejected invalid path
git config core.protectNTFS false
git read-tree -mu HEAD
git branch --show-current
git rev-parse HEAD
git status --short
rg --files -g AGENTS.md -g package.json -g '*lock*' -g '*config*' -g '*rules*' -g '.nvmrc' -g '.node-version'
rg -n '@ts-nocheck' src
npm ci *> ../../work/main-install.log
npm ci --legacy-peer-deps *> ../../work/main-install-legacy.log
npm run build *> ../main-build.log
npx --no-install tsc --noEmit *> ../main-types.log
$env:CI='true'; npm test -- --watchAll=false --runInBand *> ../main-tests.log
$env:BROWSER='none'; $env:HOST='127.0.0.1'; $env:PORT='3101'; npm start *> ../main-dev.log
npm audit --json *> ../main-audit.json
java -version # unavailable

# Functions, cwd work/main-platform/functions
npm ci *> ../../functions-install.log
npm ci --legacy-peer-deps *> ../../functions-install-legacy.log
npm run lint *> ../../functions-lint.log
node --check index.js
node -e "const f=require('./index.js'); console.log(Object.keys(f))" *> ../../functions-load.log
npm audit --json *> ../../functions-audit.json

# Nested starter, cwd work/main-platform/coach-core-ai
npm ci *> ../../nested-starter-install.log
npm run build *> ../../nested-starter-build.log
npx --no-install tsc --noEmit *> ../../nested-starter-types.log
$env:CI='true'; npm test -- --watchAll=false --runInBand *> ../../nested-starter-tests.log

# Nested alternate package, cwd work/main-platform/src/components/SmartPlaybook
npm ci *> ../../../../nested-playbook-install.log

# Standalone exact source snapshot, cwd work/smart-playbook-source
npm install *> ../../work/smart-install.log
npm run build *> ../smart-build.log
npx --no-install tsc --noEmit *> ../smart-types.log
npm test *> ../smart-tests.log
npm run dev -- --host 127.0.0.1 --port 3102 *> ../smart-dev.log
npm audit --json *> ../smart-audit.json
node ../run-smart-harness.cjs *> ../smart-harness.log
node -e "const P=require('jspdf').jsPDF;require('jspdf-autotable'); const p=new P(); console.log(JSON.stringify({autoTable:typeof p.autoTable,pdfSignature:p.output().slice(0,8)}))"

# Session cwd: HTTP and PDF evidence
Invoke-WebRequest http://127.0.0.1:3101 -TimeoutSec 15
Invoke-WebRequest http://127.0.0.1:3102 -TimeoutSec 15
python -m pip install --target work/qa-python pymupdf *> work/pdf-tool-install.log
$env:PYTHONPATH=(Resolve-Path work/qa-python).Path
python -c "import fitz; d=fitz.open('outputs/evidence/SMART_PLAYBOOK_SAMPLE.pdf'); print({'pages':len(d),'text':d[0].get_text()[:240],'images':len(d[0].get_images())}); d[0].get_pixmap(matrix=fitz.Matrix(0.5,0.5)).save('outputs/evidence/SMART_PLAYBOOK_SAMPLE.png')"
```

Connector operations: github_search_repositories(query=Coach-Core-Smart-Playbook-, org=DigitalBlueprint239); github_fetch(git/trees/main?recursive=1); github_fetch(branches/main); github_fetch_file for each of 84 tree paths with ref fixed to the standalone SHA; github_create_branch with branch_name=recovery/smart-playbook-mvp-2026 and that SHA; github_search_branches confirms the recovery branch. A subsequent branch GET with encoded slash was unsuccessful; branch search confirmation is the usable result. V3 was returned by repository search but was not used.

Harness development had an initial incorrect formation export import and a subsequent missing test import; both corrected before the final 10-check run. A Node-bundled PDF service experiment hit jsPDF module-interoperability error and was removed; it is **not** counted as a product defect. Browser install export failure and installed-plugin smoke are separate evidence. The [harness](evidence/audit-harness.tsx) and [runner](evidence/run-smart-harness.cjs) are copies of audit tooling; to rerun, place harness in the source snapshot and runner in its parent work directory after dependencies are installed.

Browser sequence: open localhost:3102, inspect AX/DOM and screenshot, set viewport 1440×1000 and inspect full-page field, attempt formation selection (no confirmed application), reset/reload to native 493×452, Package → Export → Export as PDF, capture downloaded New_Play.pdf, then Export Install Book → error alert. Subsequent dialog/DOM inspection failed with browser focus timeouts. Viewport override was reset. Main browser tab request queued but no runtime dashboard observation obtained.

See [feature matrix](MVP_FEATURE_TEST_MATRIX.md), [security findings](SECURITY_FINDINGS.md), and [roadmap](MVP_RECOVERY_ROADMAP.md) for acceptance gates. Builds alone do not establish MVP readiness.

Final verification: main git status --porcelain remained empty; 84 standalone source blob hashes matched; output reports/logs contained no credential-shaped values under the scan patterns. Audit dev servers and stalled private Git commands were stopped with Ctrl+C through their command sessions. Generated outputs and source snapshots were preserved. All build logs copied into evidence after completion.
