# Retained Firefox navigation investigation / bounded test corrections

2026-10-14. Branch `codex/firefox-navigation-investigation`, isolated from frozen #59/#60, based on #60 `2cf1a5ca9be33500515b3abf331ca35e3d6df920`. This is not another readiness package. No application/auth/rules/functions/Claude harness edits, merge, deployment, spending, live-data changes or deletion. AI disabled, Film Analyzer blocked, MVP NO-GO; BDN-AEO-001 queued. D1–D9 directions settled per CC-007 reconciliation; detailed approval provenance still unavailable, not reopened.

## Review selection and provenance

Read #39 plus comments/reviews/review threads for #59/#60/#61: no new actionable Claude client review findings were available at start. Accordingly investigated the retained main-platform a91264c Firefox failures. Existing CC-007 auth cleanup/preservation blocker remains assigned to Claude; no ownership change inferred. #39 records diagnostic ownership and auth escalation.

Original traces remain local with original hashes, unchanged. The whitelist-only analyzer reads ZIPs directly and exports timings/action labels and query-free Auth request paths, never request bodies/headers/tokens. `original-trace-analysis.json` and original committed failure logs/contexts preserve the actual failures. No passing rerun substitutes for them.

Application runtime remains `da8ebe1c90a877102e1913770690ff98a3530d3f` / browser source `5d04077a1db88c8ea24ec2ee6ea3cae96d780ac2`. Reused that previously tested demo-only `.app-build`; every copied file hash matches (0 mismatches). New diagnostic source `4442f4977a87e6b7fa6c78b7efe260950855509e`; bounded existing-test correction `15e977c3e0bcdf0a120e28ce53400b78e7d7fdcb`. Diagnostic files/assertions unchanged between these commits; its phase deadlines were already10s. No fresh production build/Jest PASS claimed for test-only changes; historical416/416/TS0/build evidence remains scoped to its original source.

## FX-01 — transitional sign-in UI is a stale navigation checkpoint

**Reproduction:** original R1 trace: Sign out finishes its click at86232.299ms; the next automation goto starts86249.365ms and fails with `NS_BINDING_ABORTED` by86352.029ms. Sign-in DOM visibility was already satisfied. Controlled local browser reproduction holds the real CacheStorage cleanup on a promise barrier, clicks Sign out and observes sign-in UI while a marker in the old document remains. Releasing cleanup replaces the document; a new sign-in then succeeds. No time-based delay or fake Auth provider used.

**Cause:** `useAuth.logout` sets `wasSignedIn=false`, awaits SDK sign-out, then asynchronous cache cleanup, then `window.location.assign('/')`. The Auth observer can render signed-out UI before that final navigation. Visibility alone does not mean the app-owned hard navigation finished; another goto can overlap it. The original trace is consistent with this test-navigation collision, not evidence of a failed play commit or browser-process exit. `NS_BINDING_ABORTED` alone is not a unique diagnosis; [Mozilla's navigation investigation](https://bugzilla.mozilla.org/show_bug.cgi?id=1914407) documents interruption by window.location updates. Our barrier confirms the stale checkpoint mechanism; it does not prove every abort has this cause.

**Smallest own fix:** keep the already-published `signOutViaUI` helper for ordinary sign-out; add a callback-based document-replacement checkpoint for our existing **Sign out anyway** and **Sync now** workflows. Wait for the old document marker to disappear and new document `readyState=complete`, then retain the sign-in assertion. No auth change, retries, sleep, weakened assertion or independent-harness edit.

**Validation:** lifecycle barrier distinction confirmed5/5 Chromium and5/5 Firefox; next sign-in succeeds after completion. Selected original coaching regression runs separately on corrected source15e977c (results in manifest). This is implementation/diagnostic evidence, not Claude's acceptance.

**Limits:** not evidence that all browser navigation failures are resolved. Actual slow cache/storage behavior on physical/shared devices and staging is NOT MEASURED. The separate interactive-form defect below remains open.

## FX-02 — original “background reload hang” label is unsupported by its trace

**Reproduction/evidence:** original P14 reload starts170095.105ms and is cancelled by whole-test timeout at170189.818ms: **94.713ms**, not60seconds. Earlier email-link button click runs110957.378→162526.644ms: **51,569.266ms**. Locator wait log113977.692→locator resolution162362.190 spans48,384.498ms. Actual Auth `sendOobCode` response is200 in **2.339ms**. The remaining steps consume the test budget before reload can be assessed.

**Cause classification:** terminal reload failure is whole-test budget exhaustion after a large earlier automation/locator-readiness delay. Backend Auth latency does not explain that interval. Origin of the earlier delay (browser/driver/host/application readiness) remains **OPEN**; no CPU or render profiling was captured then. Do not assert that foregrounding repaired a browser or persistence defect.

**Smallest own correction:** source-specific forensic classification plus10s action/navigation deadlines in our config, matching its existing10s expectation budget while leaving whole-test timeout60s and retries0. Future action delays fail at the responsible phase rather than masking as reload failure. Bounds are stricter, not longer, and no “noWaitAfter”, forced clicks or failures-as-PASS catches are added. [Playwright's action/navigation option reference](https://playwright.dev/docs/api/class-testoptions) distinguishes these bounds from the whole-test timeout.

**Validation:**5 focus/no-explicit-focus comparisons per engine:5/5 each configuration for Chromium and Firefox; own draft survives refresh and stale save shows conflict (20 positive checks total). However **every logged document.visibilityState was visible**. Original diagnostic case names say background/foreground; those are nominal focus configurations, not proof of a genuinely hidden tab. Beforeunload dialogs were handled explicitly. The50s delay was not reproduced; that absence does not close it.

**Limits:** genuine hidden-tab, physical-device and loaded-host behavior remains NOT MEASURED. Original failure is retained; no blanket “Firefox fixed” claim. Standalone touch/browser-exit evidence is untouched and not investigated by these main-platform probes.

## FX-03 — real auth-owned input loss during pending logout

**Reproduction:** sign in a synthetic coach; hold `window.caches.keys()` on a controllable promise; click Sign out; type `next-coach@e2e.coachcore.test` in the visible sign-in input; release cleanup and wait for actual document replacement. Assert the entered email is preserved. **FAIL5/5 Chromium and5/5 Firefox**, received empty string. All10 failures and their traces/contexts remain retained; the assertion is not changed to expect loss.

**Cause:** interactive sign-in form is exposed before an already-scheduled hard reload. That reload clears the new input. This is a reproducible application UX defect under controlled cleanup delay, distinct from automation's competing goto and from any saved-play/data loss. Natural cache latency frequency is not measured.

**Smallest proposed application fix / ownership:** Claude owns `src/hooks/useAuth.tsx` and auth UI. Coordinate a noninteractive signing-out state until document replacement, including the Auth observer, while keeping private data hidden and recovery bytes intact. Do not merely retain the prior authenticated screen, remove the safety reload or delete drafts. Scope requested in [#39](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6172893033). **BLOCKED on ownership-coordinated auth correction; no auth code changed here.**

**Affected validation:** keep this failing regression; Claude should independently check real/cache-failure logout, guard Cancel/Sync/Anyway, next-account sign-in, expired sessions and lossless drafts. This focused fault-injection probe does not duplicate his acceptance suite. Draft test-correction PR is not a product-fix or release approval.

## FX-04 — own test configuration lost server type information

**Reproduction:** targeted test-file TypeScript check originally reportsTS2769: spread `(base.webServer as object)` loses required `command`. Initial ES2020 checker also reportsTS2554 in Claude's existing `new Error(message,{cause})`, a checker-target mismatch with Node22 rather than a harness edit request.

**Cause/fix:** narrow our imported server to the supported single-server object and spread its real type; fail explicitly if absent/array. Use ES2022 for test tooling running on Node22. No any/suppression/framework change, no edits to Claude's config/helpers.

**Validation:** targeted TypeScript check of own diagnostic/checkpoint/config and existing coaching spec: **0 errors**. First errors retained. No claim to have audited the entire independent suite's types.

## Measurement summary and commands

Local Windows Node22.23.1, Playwright1.64.0, Chromium156.0.8078.4 / Firefox157.0, workspace Java21.0.12.1; service workers blocked as in published baseline. Actual Firebase SDK/Auth/Firestore demo emulators with repository rules; only localhost synthetic reset/seed helpers, no live project or provider call. No Functions/staging/physical acceptance claimed.

| Diagnostic case | Chromium | Firefox | Classification |
|---|---|---|---|
| UI visible before logout navigation completes |5PASS|5PASS| Confirms stale visibility checkpoint, not product acceptance |
| Email input survives pending logout reload |5FAIL|5FAIL| Auth-owned application regression, still red |
| No-explicit-focus reload/draft/conflict |5PASS|5PASS| Headless documents measured visible |
| Explicit-focus reload/draft/conflict |5PASS|5PASS| Headless documents measured visible |
| Total diagnostic run |15PASS/5FAIL|15PASS/5FAIL|30PASS/10FAIL, zero skips/retries; CLIexit1 retained |

Corrected existing coaching spec at15e977c: **18/18PASS** (9 per engine;16UI+2explicit SDK-negative checks), zero retries/skips,93.7s. This validates the bounded test corrections and does not make the10 new auth-regression failures pass. Upstream delay is not declared repaired; true hidden-tab/physical/staging/independent acceptance remains unavailable.

```powershell
# Initial diagnostic checker (errors retained), then corrected Node22 target:
npx tsc --noEmit --target ES2020 --module commonjs --esModuleInterop --skipLibCheck tests/coaching-ui/navigationCheckpoint.ts tests/coaching-ui/navigation-investigation.config.ts tests/coaching-ui/navigation-investigation.spec.ts
npx tsc --noEmit --target ES2022 --module commonjs --esModuleInterop --skipLibCheck tests/coaching-ui/navigationCheckpoint.ts tests/coaching-ui/navigation-investigation.config.ts tests/coaching-ui/navigation-investigation.spec.ts tests/coaching-ui/coaching.spec.ts
# JAVA_HOME/PATH set to workspace-local Java21; no system/live configuration change.
node e2e/node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --project demo-coach-core-e2e --only auth,firestore 'node e2e/node_modules/@playwright/test/cli.js test --config tests/coaching-ui/navigation-investigation.config.ts --repeat-each=5'
node e2e/node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --project demo-coach-core-e2e --only auth,firestore 'node e2e/node_modules/@playwright/test/cli.js test tests/coaching-ui/coaching.spec.ts --config tests/coaching-ui/playwright.config.ts'
& tests/coaching-ui/analyze-retained-traces.ps1 -TraceDirectory ../coaching-browser-reviewed-results -Output docs/evidence/firefox-navigation/original-trace-analysis.json
```

The second browser command deliberately runs the existing coaching spec to validate its bounded checkpoint changes; it is not “the entire new suite passes”. All diagnostic cases have already executed, with10FAIL explicitly retained and reported. Publishing sanitized logs/results/contexts and hashes; raw Auth-bearing ZIPs remain local, not token publication. No retries/skip/loosened assertions or independent Claude tests added/modified.

Rollback: drop/revert this isolated test/report branch; no deployment, schema or data migration exists. Do not delete evidence/drafts or revert frozen #59/#60. Next: Claude reviews the test corrections, owns FX-03 auth fix and independent acceptance; shared-device legacy queue deletion blocker from CC-007 remains open. Upstream51.6s delay and physical hidden-tab behavior remain unresolved. Coach Drew remains acceptance authority; MVP NO-GO.

Published evidence copies are credential-redacted and LF-normalized for review; original CLI logs and raw trace ZIPs remain untouched locally. An initial evidence diff-check flagged CRLF as whitespace; normalization corrected publication formatting only, not test results/assertions.

