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
