# L1 / R1b bounded repair handoff

Draft PR #64; branch `codex/l1-r1b-persistence-repairs`. Build/unit-tested client `f33a8a811f07f60a7e7074dcd54efc278675484f`; corrected browser-test candidate `ed4978b76819527516bb93a531b3a2cf3bfd858c` (one navigation-label change only; identical application source tree `652fc9d3d427c0b7ca35ec8cf57fcc606927e6cc` and lockfiles), agreed baseline `ddae645e1481ec12a54e18f1e930057509532ea5`. Claude requested this baseline on [#39](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6177072370). It includes his L0 (`12e386f`) and FX-03 (`dc36080`) repairs and his CC-L1 option-a acceptance anchor. No Codex edits to auth, rules, functions or `e2e/**`. #59 `c21c0c6` / #60 `2cf1a5c` remain frozen. This is a defect handoff, not another CC-007 readiness package.

## Reproductions, causes and bounded changes

**L1.** [Exact reproduction](https://github.com/DigitalBlueprint239/coach-core-ai/pull/59#issuecomment-6173243818): sign in with an owned team; seed `plays` and `coach-core-ai-<teamId>`; reload the dashboard and click Migrate Now. The old API deletes the source blob after legacy calls resolve, without verified readback. Thrown writes are caught and swallowed, so the promise still resolves and the banner reports success (that catch path retains the blob). When failed offline writes return synthetic IDs, deletion can follow without cloud persistence. Those synthetic IDs come from a global queue that is intentionally never replayed. Claude's retained original CC-L1 failed 10/10 on each engine, at both `709e0f4` and `c858d1d` ([report Ã‚Â§8.7](security/E2E_EMULATOR_REPORT_2026-10-13.md#87-independent-verification-and-final-run)).

Chosen review option (a): `MigrationBanner.tsx` renders no obsolete migration entry point; `migrateFromLocalStorage` rejects before parsing, writing or removing originals. The six legacy play/plan create/update/delete APIs reject when offline, propagate failed writes, and never enqueue or return synthetic success. Their online promises still await Firebase SDK backend acknowledgement (the installed SDK's `addDoc` declaration explicitly documents this). `addToOfflineQueue`, its stored bytes and the no-replay quarantine are unchanged. Delete branches are exercised only with mocked SDK functions; no data deletion occurs. Existing acknowledged, scoped ordinary coaching persistence remains intact.

D10 import is not rebuilt or disabled. Its existing `getDocFromServer` content/owner/team readback remains mandatory before completion; mismatched or unavailable copies cannot record completed consent. The old mixed-format `coach-core-ai-<teamId>` migration stays disabled; this PR does not invent a replacement mixed play/plan importer or normalize/truncate originals.

**R1b.** [Exact reproduction](https://github.com/DigitalBlueprint239/coach-core-ai/pull/59#issuecomment-6174486767): A imports three plays, hold copy 2, sign out before completion, then B signs in in the same browser and opens Playbook. Previously only A's per-account pending marker existed; the device claim was written after all readbacks, so B saw a new import offer.

`import-legacy.ts` now writes a device claim `{uid,status:'pending',teamId,teamName}` synchronously before the first cloud request. Any other account is blocked before offer or write. Same-account recovery remains restricted to the original team. The claim becomes `imported` only after every readback matches. Interrupted requests, denied readbacks and storage-write failures preserve the pending ownership and all originals; failed claim storage starts no cloud write. Existing completed claims without a status remain compatible. Pre-repair per-account pending markers are honored without rewriting them. Unrecognized claims fail closed. `LegacyImport.tsx` listens for storage events so an already-open foreign-account tab withdraws an obsolete offer; the command itself rechecks ownership even if UI state was stale.

No claim or original is automatically cleared to resolve conflicting old ownership markers. Multiple foreign unfinished markers require explicit review; the client blocks instead of choosing an owner. R3 (permanent Not now) and R4 (release constant) are unchanged and remain tracked by Claude.

## Measurements and evidence

Windows, Node 22.23.1, npm 10.9.8; safe `demo-coach-core-e2e` Auth/Firestore emulators only. Local root/e2e dependency junctions reuse installed dependencies whose lockfile SHA256s exactly match this candidate (root `1EAA4969D7D630D8DA98978A9776EC51D8EDFCF5218C701CAC1BC6A5AE1E0897`, e2e `E317702BBFC8CA6E58E572E70A2F2F45D32CE83DA86E8F07FAC6DD4F66DE6B04`). Clean-install independent integration verification remains Claude's next step.

Before implementation: application TypeScript 0; production build PASS with warnings. First focused regressions: 1 PASS / 7 FAIL. Expanded unchanged pre-fix assertions: 2 PASS / 14 FAIL. Instrumented full baseline: 418 PASS / 9 FAIL (two added suites; original 416 tests passed). Test discovery overlapped incremental regression additions, so these totals are distinct retained runs, not one fixed-count baseline. One further cross-tab regression was added after that baseline. After first application fix at `e3ae1b7`: 433/433 Jest, TS0, production build PASS; emulator build interrupted deliberately for Claude's requested baseline update and not counted as PASS.

Final `f33a8a8`: 434/434 Jest (417 existing, including Claude's new FX-03 test, plus 17 focused regressions), application TypeScript 0, focused browser-test TypeScript 0, production and emulator builds PASS with retained warnings. Credential canary 12/12 PASS. Production audit 0; full graph 98 (6 low / 14 moderate / 75 high / 3 critical), unchanged from the dependency candidate. No dependency or lockfile changes. Focused regressions 17/17 PASS. Initial real-browser run at f33a8a8: 32 PASS / 2 FAIL, retries 0, skips 0 (all 16 unchanged D10 cases PASS per engine; both FAIL are the added L1 test using the wrong button label). The two failure DOM snapshots show the real button Practice Plans; extracted traces show the attempted nonexistent Practice Planner button. ed4978b changes only that locator, with identical preservation/no-upload assertions and no sleeps/retries/timeout changes. Corrected L1 2/2 PASS (one per engine). Unchanged Claude CC-L0/CC-L1 anchors: 4/4 PASS at ed4978b, one run on each engine. All browser runs: retries 0, skips 0, Windows headless desktop, Chromium 156.0.8078.4 / Firefox 157.0. This is not independent acceptance; the original failed run remains 32 PASS / 2 FAIL. Evidence: [measurements and logs](evidence/l1-r1b-repairs/measurements.json), [initial full results](evidence/l1-r1b-repairs/browser-initial-results.json), [corrected L1](evidence/l1-r1b-repairs/browser-corrected-L1-results.json), [Claude anchors](evidence/l1-r1b-repairs/browser-Claude-anchors-results.json).

Retained setup failures: initial shell ran outside a Git checkout; relative junction target rejected, corrected to an absolute path; initial ESM browser collection failures occurred before any browser launch, corrected in an isolated ESM test lane; rebase paused for missing committer identity and was completed with explicit per-command identity. A duplicate baseline build was interrupted; the separate completed baseline build is the measured one. No assertions, retries or test timeouts were weakened to resolve these failures.

Cross-tab offer withdrawal is measured by a unit/DOM storage-event regression; simultaneous cross-tab starts are NOT MEASURED. Claims are a client consent/recovery guard, not a substitute for Claude-reviewed server authorization.

The source still has historical `@ts-nocheck` directives (archived/excluded code and an unused touch component); none introduced or expanded. TypeScript 0 refers to the actual configured application, not an unsuppressed check of every archived file. Existing build hook/unused-variable warnings and React/Jest act warnings remain visible.

## Reproducible commands

Run from repository root unless stated. No real credentials are needed. Check out the exact candidate on an isolated branch; preserve earlier evidence.

```powershell
# Baseline and final application checks (CI=false for the retained build warnings).
$env:CI='true'
npx --no-install tsc --noEmit
npm test -- --watchAll=false --runInBand
$env:CI='false'
$env:GENERATE_SOURCEMAP='false'
npm run build
# Focused regressions: same command used before and after source repair.
npm test -- --watchAll=false --runInBand --runTestsByPath src/services/__tests__/legacy-save-ack.test.ts src/features/legacy-import/__tests__/unfinished-claim.test.tsx src/components/__tests__/MigrationBanner.test.tsx
npx --no-install tsc --noEmit --target ES2022 --module ESNext --moduleResolution node --esModuleInterop --skipLibCheck tests/coaching-ui/legacy-repairs/playwright.config.ts tests/coaching-ui/legacy-repairs/legacy-migration.spec.ts
node e2e/node_modules/@playwright/test/cli.js test --config tests/coaching-ui/legacy-repairs/playwright.config.ts --list
npm audit --omit=dev --json
npm audit --json
# Git Bash path may differ on another host.
& 'C:/Users/drewl/AppData/Local/hermes/git/bin/bash.exe' .github/scripts/bundle-canary-scan.sh
```

The emulator build uses `REACT_APP_USE_FIREBASE_EMULATORS=true`, `REACT_APP_FIREBASE_PROJECT_ID=demo-coach-core-e2e`, `BUILD_PATH=e2e/.app-build`, and the documented fake/demo web configuration from `e2e/scripts/build-app.sh`; all configuration names are `REACT_APP_FIREBASE_API_KEY`, `REACT_APP_FIREBASE_AUTH_DOMAIN`, `REACT_APP_FIREBASE_STORAGE_BUCKET`, `REACT_APP_FIREBASE_APP_ID`. These are emulator fixtures, not credentials or live configuration. Then `npm run build`. Set `JAVA_HOME` to the local JDK21 directory and prepend its bin to PATH.

```powershell
node e2e/node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --project demo-coach-core-e2e --only auth,firestore 'node e2e/node_modules/@playwright/test/cli.js test --config tests/coaching-ui/legacy-repairs/playwright.config.ts'
# Locator-only corrected test; initial results retained separately.
node e2e/node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --project demo-coach-core-e2e --only auth,firestore 'node e2e/node_modules/@playwright/test/cli.js test --config tests/coaching-ui/legacy-repairs/playwright.config.ts --grep "L1 disabled"'
# Claude-authored anchors, unchanged; separate output directory.
node e2e/node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --project demo-coach-core-e2e --only auth,firestore 'node e2e/node_modules/@playwright/test/cli.js test --config e2e/playwright.config.ts --grep "CC-L[01]"'
```

The config runs Claude's existing D10 suite read-only plus the focused client L1 test. This is a Codex rerun of Claude's scenarios, not Claude's independent acceptance. No functions emulator, provider invocation, production data or youth media is involved. Original logs/results and DOM error snapshots are retained; published copies are redacted and checksum-addressed. **Retention limitation:** Playwright cleared the initial L1 raw trace ZIPs and PNG attachments when the same output directory was reused. Their SHA256s and extracted action selectors were captured beforehand, but the binary originals are NOT RETAINED. This is disclosed in initial-trace-metadata.json; the full failed results/logs/DOM snapshots remain. These navigation failures are not hidden or relabeled as product passes. Other historical recovery/Claude evidence is unchanged. Remaining runs use a separate output directory; do not reuse an output directory without archiving it first.

## Gate status

| Requirement | Status | Evidence / owner |
|---|---|---|
| L1 client disablement, rejected offline APIs, no false acknowledgement | VERIFIED locally | 17 unit regressions; corrected L1 and unchanged CC-L1 real-browser checks; Codex |
| R1b foreign-account offer/write block and interrupted original-team recovery | VERIFIED locally | D10-06c, 06/06b, 07/07b, 04/10/11 PASS each engine; unit storage-failure/pre-repair-marker coverage; Codex |
| L0 original quarantine retention/no replay | VERIFIED locally; independent new candidate PENDING REVIEW | Unchanged CC-L0 PASS both engines; inherited Claude L0 fix; Claude |
| Complete independent integration acceptance ×10 | PENDING REVIEW | Claude confirms candidate SHA and runs full suite with clean install |
| Staging / physical tablet / genuine hidden-tab / simultaneous cross-tab starts | NOT MEASURED | No new claim; staging/device authorization and execution outside this assignment |
| AI generation / Film Analyzer | BLOCKED | AI disabled; film implementation and required approvals incomplete; implementation owners and Coach Drew |
| Tooling advisories | BLOCKED for closure | Full audit 98 including 3 critical; production 0; dependency owner |
| Initial owned L1 raw ZIP/PNG retention | BLOCKED for recovery | Output cleanup removed binary archives; hashes/selectors/results/logs/DOM snapshots retained; Codex |

## Owner handoff and remaining gates

Claude: confirm the exact integrated candidate SHA, run clean npm ci / Jest / tsc / release proof / production audit, then CC-L1, CC-L0, unchanged D10-06c and the complete acceptance suite Ãƒâ€”10 on Chromium and Firefox, retries 0. Keep old failures and report every repeat. No independent PASS is inferred from Codex's run. Existing H2, FX-02 delay, true hidden-tab behavior, R3/R4, standalone touch exit, staging and physical devices remain open or NOT MEASURED; this assignment does not close them. Coach Drew retains product acceptance and any future operational authorization.

Rollback of review work is code-only on an isolated checkout: return to the agreed baseline in a separate worktree, retain this repair branch and all evidence, and do not revert cloud or device data. An operational rollback remains unauthorized and cannot re-enable the unsafe migration/queue paths; preserve L0 and pending ownership guards. Never delete originals, quarantined operations, imported copies or ownership markers as a rollback step.

CC-CODEX-02 / D10: bounded L1/R1b client repair delivered for independent repeat testing. CC-CODEX-03: legacy offline plan false-success dependency repaired; authorized editable planner unchanged. AI generation disabled; film blocked; MVP NO-GO. No protected merge, deployment, spending, live changes or deletion. BDN-AEO-001 remains queued.

## Integrated-candidate verification — 2026-10-14 / Codex

This section supplements the original repair evidence; it does not replace Claude's independent report §8.7 or declare independent acceptance. Codex authored the L1/R1b changes and executed Claude's unchanged acceptance tests. Independent security/product acceptance remains with Claude and Coach Drew. Claude has now supplied independent candidate-6/7 results; those are reconciled below. Original #59/#60/#64 heads remain unchanged.

### Discover and baseline

Tested integrated application/runtime commit: **4757eaffad31664dae727c34355aca8109fcc63c**, Claude's `claude/integration-candidate-2026-10-14d` (candidate 6). Coordination baseline: [#39 comment 6177781336](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6177781336). It contains final #64 `8f0d9f7c9494c46eddb6e81a31b0c8d22ea21ad0`, L0 `12e386f`, and FX-03 `dc36080bf4db6815c4ad7b420abd75578fed02bc`; both fixes pass ancestor checks. `src/` tree is `652fc9d3d427c0b7ca35ec8cf57fcc606927e6cc`; `e2e/` tree is `a388833f782475b6847b73ea11e045e206375ab6`. Source, rules, functions, lockfiles and acceptance harness are unchanged. Measurement branch: `codex/acceptance-verification-4757eaf`. Documentation-only review branch: `codex/acceptance-evidence-4757eaf`, based on recovery; that documentation branch is not the runtime candidate.

Environment: Windows desktop, Node 22.23.1, npm 10.9.8, Playwright 1.64.0, Chromium 156.0.8078.4, Firefox 157.0, firebase-tools 15.33.0, local JDK21. Headless desktop contexts, workers 1, test timeout 60s and expect timeout 10s unchanged. No physical-device or genuine hidden-tab measurement. This is not an exact OS match to Claude's CI environment. All backend interaction is synthetic `demo-coach-core-e2e` via local Auth, Firestore and Functions emulators. AI stays disabled; local provider-adapter unit tests use an HTTP mock, not an AI service.

### Clean installations, unit/type/release checks and audit

| Measurement | Result and limitation |
|---|---|
| Clean root/functions/e2e installation | PASS, each `npm ci`; no reused node_modules or dependency edits |
| Root Jest | PASS: 434 tests, 29 suites |
| TypeScript | PASS: exit 0, zero diagnostics |
| Functions npm test script | NOT A PASS: Windows single-quoted glob discovers zero tests despite exit 0 |
| Functions explicit files, default concurrency | FAIL retained: 72 PASS / 1 FAIL of 73; local practice_plan mock Responses roundtrip took 1713ms against unchanged 1000ms timeout |
| Functions explicit files, concurrency 1 | 73 PASS / 0 FAIL, unchanged assertions/timeout; does not resolve the earlier failure |
| Functions lint, initial CRLF checkout | FAIL retained: 2113 linebreak-style errors |
| Functions lint, exact committed LF blobs | PASS exit 0; Git diff zero, no lint suppression or semantic edit |
| Emulator application production build | PASS, existing warnings retained |
| Credential-canary production build/source/bundle scan | PASS12/12; no canary/provider secrets/endpoints/test hooks shipped |
| Local release-shaped production build/proof | PASS: 13/13; manifest covers 12 files; no staging deployment |
| Root production dependency audit | PASS: 0 vulnerabilities (`--omit=dev`) |
| Functions production dependency audit | PASS: 0 vulnerabilities (`--omit=dev`) |
| Full development dependency graph | NOT MEASURED this run; previously reported 98 findings including 3 critical remain disclosed, not closed by production-only audit |

The functions failure occurred while dependency installations were active; resource/timing pressure is plausible but unproved. Claude owns its classification. Initial CRLF lint failure was a checkout representation issue: 26 tracked files were restored byte-for-byte from committed LF Git blobs in the isolated worktree. The earlier failed lint output is retained.

Commands (from the isolated root unless otherwise stated):

```powershell
npm ci --legacy-peer-deps --no-audit --no-fund
npm ci --prefix functions --no-audit --no-fund
npm ci --prefix e2e --no-audit --no-fund
$env:CI='true'
npm test -- --watchAll=false --runInBand
npx --no-install tsc --noEmit
npm --prefix functions test
$taskFunctionTestFiles=@(rg --files functions/test -g '*.test.js')
node --test --test-reporter=spec $taskFunctionTestFiles
# From functions/:
$taskFunctionTestFiles=@(rg --files test -g '*.test.js')
node --test --test-concurrency=1 --test-reporter=spec $taskFunctionTestFiles
# Back at isolated root:
npm --prefix functions run lint
npm audit --omit=dev --json
npm audit --prefix functions --omit=dev --json
$env:CI='false'
& 'C:/Users/drewl/AppData/Local/hermes/git/bin/bash.exe' e2e/scripts/build-app.sh
$env:RELEASE_BUILD_DIR='release-proof-4757eaf'
$env:RELEASE_MANIFEST='../acceptance-4757eaf-preflight/release-manifest.sha256'
& 'C:/Users/drewl/AppData/Local/hermes/git/bin/bash.exe' scripts/security/verify-release-build.sh coach-core-mvp-staging-239
& 'C:/Users/drewl/AppData/Local/hermes/git/bin/bash.exe' .github/scripts/bundle-canary-scan.sh
```

Release configuration uses the repository's synthetic release-proof web configuration. No credentials or actual staging access were used. Required local emulator variables: `JAVA_HOME`, `PATH`, `GCLOUD_PROJECT`, `COACH_CORE_AI_ENABLED`, `COACH_CORE_ALLOWED_ORIGINS`, `FUNCTIONS_DISCOVERY_TIMEOUT`; `OPENAI_API_KEY` stays empty. The ignored functions emulator files contain only the documented placeholder, no real credential. Emulator build configuration is inherited from the unchanged `e2e/scripts/build-app.sh`.

### Repeat method and retained setup failures

The first emulator startup exceeded default 10s function discovery; the partial browser attempt was interrupted, retained separately and excluded from acceptance counts. A second startup loaded functions but the external runner's missing parent directory prevented any browser cases; its failed log is retained. The healthy run used Firebase's documented `FUNCTIONS_DISCOVERY_TIMEOUT=60` startup allowance and pre-created its evidence parent. No browser/test assertion timeout, retries, source or harness was changed. All functions, including coachAI, were then loaded; scheduled cleanup was not measured because Pub/Sub is not enabled.

Each repetition invokes the full unchanged suite once, both engines, and continues after failures. Unique output folders `run-01` through `run-10` were never reused or cleared. `--reporter=list,json` routes complete results into those folders; the optional GitHub annotation reporter is not used locally. Skip flags are removed. Results assert exactly one result per case and retry index zero.

```powershell
$env:JAVA_HOME=(Get-ChildItem ../java-runtime -Directory | Where-Object Name -like 'jdk*' | Select-Object -First 1).FullName
$env:PATH="$env:JAVA_HOME/bin;$env:PATH"
$env:GCLOUD_PROJECT='demo-coach-core-e2e'
$env:OPENAI_API_KEY=''
$env:COACH_CORE_AI_ENABLED='false'
$env:COACH_CORE_ALLOWED_ORIGINS='["http://localhost:3000"]'
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
node e2e/node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --project demo-coach-core-e2e --only auth,firestore,functions 'node ../acceptance-4757eaf-healthy-repeat.mjs'
# External runner child command for each unique run:
node e2e/node_modules/@playwright/test/cli.js test --config e2e/playwright.config.ts --retries=0 --repeat-each=1 --reporter=list,json --output <unique-run-directory>/artifacts
# Each child also sets PLAYWRIGHT_JSON_OUTPUT_FILE=<unique-run-directory>/results.json.
```

### Full-suite comparison (zero retries, zero skipped cases)

| Repeat | Chromium PASS / FAIL | Firefox PASS / FAIL |
|---|---|---|
| run-01 | 43 / 0 | 43 / 0 |
| run-02 | 43 / 0 | 42 / 1 |
| run-03 | 43 / 0 | 42 / 1 |
| run-04 | 43 / 0 | 43 / 0 |
| run-05 | 43 / 0 | 43 / 0 |
| run-06 | 43 / 0 | 43 / 0 |
| run-07 | 43 / 0 | 42 / 1 |
| run-08 | 42 / 1 | 43 / 0 |
| run-09 | 43 / 0 | 43 / 0 |
| run-10 | 43 / 0 | 42 / 1 |
| **Total** | **429 / 1** | **426 / 4** |

Every repeat has separate full JSON, browser log and exit metadata in `docs/evidence/acceptance-4757eaf/repeats/run-NN/`. `summary.json` includes per-case anchor totals; check individual failures before interpreting aggregate counts. Failed ZIP/PNG files are retained locally with published checksum/path metadata. Counts include timeouts as failures. No failed batch was discarded or retried.

| Blocker / acceptance protection | Chromium | Firefox | Status / evidence |
|---|---|---|---|
| L1 legacy migration preservation/no false success | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |
| R1b unfinished-import account isolation | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |
| L0 quarantine preservation/no replay | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |
| FX-03 sign-out/reload rapid sign-in protection | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |
| CC-P10 | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |
| CC-P10b | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |
| CC-P11 | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |
| CC-P12 | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |
| CC-P14 | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |
| CC-P15 | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |
| CC-P16 | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |
| CC-P16b | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |
| CC-P17 | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |
| D10-01 | 9 PASS / 1 FAIL | 8 PASS / 2 FAIL | FAIL retained; see classification including setup failures |
| D10-04 | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |
| D10-05 | 10 PASS / 0 FAIL | 9 PASS / 1 FAIL | FAIL retained; see classification including setup failures |
| D10-07 | 10 PASS / 0 FAIL | 9 PASS / 1 FAIL | FAIL retained; see classification including setup failures |
| D10-07b | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |
| D10-10 | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |
| D10-11 | 10 PASS / 0 FAIL | 10 PASS / 0 FAIL | PASS in local suite; Claude independent evidence linked below |

**Overall full-suite gate: FAIL.** Codex-run results do not constitute independent Claude acceptance; received Claude CI results are separately linked below. See open findings below. No build-only acceptance or MVP readiness claim.

### Diagnose and compare: open findings and limitations

**N1 — D10-01 library-read race (Firefox repeats2/7, Chromium repeat8). FAIL, not resolved.** At `e2e/tests/legacy-import.spec.ts:73`, `libraryNames()` returned `[]` instead of the three imported names. The preceding assertions proved complete cloud copies, imported decision IDs and byte-identical originals. The run-2 trace recorded an empty `.font-semibold` DOM read at 277268.804–277336.546ms; the later error DOM snapshot already shows all three names. Source inspection: `SmartPlaybook.tsx:523` calls `void persistence.reload()` on import completion, the gateway list is asynchronous, and `support/legacy.ts:79–83` waits only for dialog visibility before reading names. A content-readiness/checkpoint race is supported; whether the client needs a loading gate versus a positively anchored test must be reviewed. No code or harness change was made and no passing later batch closes this failure. Owner: Claude for fixture classification; Codex for any separately authorized bounded client correction. [Initial coordination](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6179127439), [repeat-7 reproduction](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6179786914), [Chromium repeat-8 reproduction and correction](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6179986571).

**H2 — Firefox D10-07 team-switch timeout (repeat 3). FAIL, cause unproved.** The unchanged 60s test timeout occurred waiting for `Switch to` at test line 194. Final Teams snapshot contains Alpha only, no Bravo or switch button. Last trace action starts at 341052.912ms and lasts56548.090ms to397601.002. Email-link-submit took102.674ms, so this local execution stalled at the missing Switch-to target, not the historical51secemail-click step. This does not identify the cause of older CI H2 failures. Import request-body evidence shows first play commit acknowledged 200 and next held (status -1), consistent with the intended paused import. This trace has not established a browser process exit. `createTeamViaUI()` waits for the generic repeated success toast; early return before the second team's readiness is a hypothesis, not a diagnosis. Full trace/screenshot/error context retained, no retries or timeout changes. Historical H2 remains open even when later repetitions pass. Owner: Claude (team/auth fixture and independent harness), Codex only if a client defect is established. [Classification request](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6179275687).

**N2 — Firefox D10-05 team-creation precondition (repeat10). FAIL, target assertions NOT REACHED.** coachWithTeam/createTeamViaUI failed the unchanged success-toast wait: Alpha notconfirmed after11648ms, modalOpen=true, creating=true, Adminteams=[Alpha Eagles]. UI remained Creating… despite a server team record. Test never reached changed-copy fixture creation or overwrite assertions; this does not demonstrate an overwrite. Browser/SDK acknowledgement timing, host delay or application state is unresolved. No timeout/assertion change, retries or later-pass resolution; rawtrace/PNG/context retained. Owner Claude for fixture/auth/team lifecycle classification; Codex if a bounded client defect is identified. [Escalation](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6180412850).

**F1 — functions local provider-adapter roundtrip. FAIL retained / later serial PASS.** Explicit default-concurrency discovery ran 73 tests, with one unavailable ProviderError in the local HTTP practice_plan roundtrip. Unchanged serial file-concurrency run passes all 73. Concurrent install/resource timing is plausible but not proven. The error classifier hides the underlying name beyond `Error`; no exception or timeout was weakened. Owner: Claude, functions tests/provider adapter. The Windows npm-script zero-discovery defect is separately disclosed; exit zero is not counted as verification.

**W1 — legacy profile-statistics trigger warnings. Observed failure; provisioning NOT MEASURED.** Emulator logs contain `5 NOT_FOUND` updating synthetic `userProfiles/<uid>` after play/practice-plan creation. Those save/reopen tests still pass, but statistics are not verified. The legacy profile-creation trigger watches Firestore `users/{userId}`, whereas these fixtures create Auth accounts and beta claims. Fixture/provisioning mismatch is supported by source inspection; no production provisioning claim is made. Owner: Claude (functions/schema/fixture). Logs retained; no suppression or functions edit.

**Historical evidence loss stays disclosed.** The initial owned L1 run on `f33a8a8` had 32 PASS / 2 navigation FAIL; its ZIP/PNG originals were removed by output-directory reuse before this assignment. Hashes, extracted selectors, full failed logs/results and DOM contexts remain in `docs/evidence/l1-r1b-repairs`. The binary originals are **NOT RETAINED** and cannot be recovered by this new acceptance batch. New run folders and new failed ZIP/PNG originals are retained separately, locally. Published redacted results/error contexts/trace summaries include hashes and relative raw paths; token-bearing ZIPs are not committed. New evidence is not substituted for missing history.

Other existing limitations remain open: genuine hidden/background-tab behavior, standalone retained touch failure, physical tablets and staging NOT MEASURED; FX-02 delay and D10 R3/R4 remain scoped historical/open findings, not closed by build success. Desktop emulation is not physical-device testing. The suite does not prove real Google/email delivery, live rules, real provider processing, or production-profile statistics. AI disabled; film blocked; MVP **NO-GO**.

### Independent results received and current blocker reconciliation

Claude report [§9/10 at exact #63 head7b4747f8d2883255758c31f8076a58a6fa379cfe](https://github.com/DigitalBlueprint239/coach-core-ai/blob/7b4747f8d2883255758c31f8076a58a6fa379cfe/docs/security/E2E_EMULATOR_REPORT_2026-10-13.md): candidate6 `4757eaf`, Actions run38632770550/job116088458893, **430 PASS / 0 FAIL each engine**, retries0; candidate7 `d12d273786ba76f76102ce0459e6bcb57cac0e2b`, same runtime plus hardened tests, run38638354889/job116107889507, **Chromium440 PASS/10 FAIL, Firefox439 PASS/11 FAIL**. [Claude coordination](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6179555595); [founder acceptance status relayed by Claude](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6179804879). L1/R1b/L0/FX-03 and CC02/CC03 protections are independently verified in those runs. The local Windows failures above are retained alongside that CI result, not overwritten. Known configuration distinction: Windows versus CI platform; browser versions/workers/timeouts match reported configuration, but full host/software equivalence is NOT MEASURED. Candidate7 adds CC-W0, D10-06d and hardens A10/bodyWatch; it is not substituted for our unchanged43-case4757eaf baseline.

**R1c: FAIL independently, local probe NOT RUN.** Interrupted import followed by Not now leaves pending ownership but permanently declines the owner offer; B remains blocked and A has no action. D10-06d fails10/10 each engine in candidate7. It is absent from the original43-case suite, so our ten-repeat measurement cannot establish a local R1c outcome. Originals preserved; no repair in this test-only assignment. Next bounded client repair owner Codex; Claude constructs candidate8 and independently reruns the hardened suite after an exact repair SHA. Do not release another account into an unfinished import or discard pending recovery.

**FX-02 whitelist request fulfilled, no new test:** `preflight/fx02-requested-whitelist.json`, original raw hashDCC5B745… verified. Callfcwl@56 logs at113977.692 waiting for Email me a sign-in link, at162362.190 locator resolved. Decoded phase-before snapshot contains that enabled submit button, but captured at162323.134ms near end ofstall, not at action start110957.378. This cannot prove continuous DOM presence across48sec. Only message texts/timestamps/button predicates exported, no bodies/tokens. [Handoff](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6180186216). H2/FX-02 cause remains open. Original archive is retained; distinct from missing initial L1 ZIP/PNG history.

### Handoff, ownership and preservation

Claude next: classify additional local N1/H2/N2/F1/W1 evidence alongside the received independent results; independently review a future R1c repair candidate8. Any fixture/auth/rules/functions adjustment belongs to Claude and needs a new explicitly identified candidate and fresh evidence, never an overwrite of the failed folders. Codex has not altered Claude's acceptance suite or security report §8.7; this existing repair handoff is updated with clearly attributed Codex-run results. Coach Drew retains product acceptance. No full-suite PASS or product acceptance is inferred from individual passing anchors.

Rollback for this **documentation/evidence-only** branch: discard it from consideration and use the retained `4757eaf` candidate in another isolated checkout; do not reset frozen branches or delete evidence. No data migration occurred. Preserve legacy originals, quarantine, account/team drafts, pending envelopes, imported copies and ownership markers. This assignment performs no operational rollback, protected merge, deployment, spending, live configuration/data change, deletion or new feature work. BDN-AEO-001 remains queued.
