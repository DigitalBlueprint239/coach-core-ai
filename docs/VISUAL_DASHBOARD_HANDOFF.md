# Coach Core — first visual milestone

Draft [PR #67](https://github.com/DigitalBlueprint239/coach-core-ai/pull/67), branch `codex/visual-shell-dashboard`; [ownership and Claude review request on #39](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6179875785).

Application source: **`ca5ca7296858f5dcde5dd353d9172d4884c767cb`**. Later evidence/docs commits leave application files identical. Base: **`4757eaffad31664dae727c34355aca8109fcc63c`**, frozen integrated PR #64 candidate. This is a stacked UI diff; do not merge its test-only base. Reconcile/retarget toward recovery after reviewed acceptance integration. R1c and other acceptance-blocking repairs retain priority.

## Implemented versus preview

| Implemented | Preview only / unavailable |
|---|---|
| Shared navy/cyan tokens, panels, actions and empty states | Raster reference supplies direction, not original font/source measurements |
| Desktop sidebar, My Week, upcoming dated plans, Today/next plan | Scheduling has no connected backend; no event times are invented |
| Tablet compact sidebar; phone Today first, day picker, bottom navigation | Assignments have an honest unavailable state |
| Existing Teams, Practice Plans, Smart Playbook and guarded Sign out | Film, roster/attendance, development and analytics are static roadmap text |
| Existing authorized read-only `cloud.list` for practice plans | AI stays disabled; no backend/rules change |
| Scope checks, stale-response cancellation/render keys, valid-date filtering | No fake players, grades, activity or counts |
| Skip link, focus movement, native dialog/Escape/focus return, reduced motion | Physical-device and authenticated end-to-end acceptance are not measured |
| Accurate onboarding copy | Existing editor surfaces are retained, not redesigned |

The opt-in sample banner stays visible while fictional events/tasks are shown. Dates follow the review day. Sample details cannot be saved/imported; checklist changes are temporary and reset on exiting/re-entering preview. Nothing is written to cloud or browser persistence. In the authenticated application, working navigation still leads to the real workspace.

The separate localhost harness renders the **same shell/dashboard components**, with no auth/Firebase modules. Its non-dashboard destinations explicitly say visual preview only; it does not impersonate a working authenticated editor. No production auth bypass was added.

## Reproduce

Use Node 22/npm 10 and the existing lockfile:

```powershell
npm ci --legacy-peer-deps --no-audit --no-fund
npx tsc --noEmit
$env:CI='true'
npm test -- --watchAll=false --runInBand
$env:CI='false'
npm run build
node scripts/visual-preview.cjs 4317
```

Open `http://127.0.0.1:4317/`; the server binds only to localhost. Choose `Exit sample preview` for empty states. The authenticated application uses `npm start`; this session also compiled it successfully on localhost port 4321. Existing Firebase/access requirements apply. No production data was used for preview.

The portable browser runner in `evidence/visual-dashboard/verify-visual.cjs` uses the existing e2e Playwright package (`npm --prefix e2e ci` plus installed Chromium/Firefox). An optional `COACH_CORE_PLAYWRIGHT_MODULE` can point to an existing local installation. With the preview running:

```powershell
node docs/evidence/visual-dashboard/verify-visual.cjs
```

## Verification

| Check | Untouched baseline | UI |
|---|---|---|
| Clean npm ci | PASS, 1,540 packages | Dependencies/lock unchanged |
| TypeScript | 0 diagnostics | 0 diagnostics |
| Jest | 29 suites, 434/434 | 31 suites, **441/441** |
| New targeted behavior tests | — | 7/7 |
| Production build | PASS, existing warnings | PASS, same warning files, no new UI warnings |
| Shared-component layouts | — | 8 widths × Chromium/Firefox, all PASS |
| axe WCAG A/AA | — | 0 violations at all 16 layouts |
| Horizontal page overflow | — | None, 320–1920px |
| Keyboard, skip link, dialog focus/Escape, reduced motion | — | PASS both engines |
| Sample persistence / external requests | — | 0 writes / 0 external requests |
| Actual development server | — | Compiles on 127.0.0.1:4321; existing warnings |
| Claude UI/workflow review | — | **REQUESTED, PENDING** |
| Devices / staging | NOT MEASURED | NOT MEASURED |

These headless browser checks exercise the standalone shared-component preview, **not authenticated backend workflow acceptance**. Existing workflow unit tests pass, and auth/persistence files are unchanged; that alone does not establish end-to-end preservation. Claude was asked to check navigation, Teams, practice/play saving, recovery, conflicts and sign-out after higher-priority repairs.

Actual application startup was additionally checked in Chromium. The first boot without Firebase configuration failed with `auth/invalid-api-key`; retained in `dev-startup-initial.json`. After restarting with demo-only placeholder public configuration, the private-beta sign-in screen rendered with **zero page errors** while external requests were blocked. No real sign-in or backend action was attempted. `dev-startup-configured.json` records that limited result. The configured development server was then stopped; the working standalone visual preview remains on port 4317. Supply approved Firebase configuration for authenticated application use. A focused additional Chromium/Firefox check verifies that closing sample details returns focus to the opener (`dialog-focus.json`).

Two premature checks while npm ci was incomplete failed because executables/files were not yet available. These are setup failures, not test passes. The completed-install measurements above establish the baseline. First visual pass succeeded, then a phone spacing/duplicate-action refinement was verified again. Final screenshots/results reflect the refinement. Raw logs remain in the local task's `work/` directory; concise check summaries are committed alongside evidence.

Production gzip: JS 224.74 kB, CSS 4.61 kB. Warning files match the baseline: existing SmartPlaybook DebugPanel, SmartPlaybook, Notification, PlayerControls, RouteControls, RouteEditor and SaveLoadPanel. Jest retains existing React test-utils deprecation messages. No check was skipped, weakened or suppressed.

## Isolation and review boundary

Auth/gate, team context, persistence/drafts/conflicts/recovery, legacy import, rules, Functions, AI, package/lockfiles, canvas and Claude's e2e harness are unchanged. Existing legacy/embedded `@ts-nocheck` suppressions remain under Coach Drew's isolation instruction. The deliberately quarantined legacy offline queue is unchanged; no retry/replay logic was introduced. PR #64 head remains `8f0d9f7c9494c46eddb6e81a31b0c8d22ea21ad0`.

R1c and other inherited acceptance issues remain with the acceptance owners. Independent Claude review is pending; MVP remains NO-GO, readiness percentage not measured. Coach Drew reviews this first visual milestone before broader rollout. No merge, deployment, paid assets, subscriptions, live-data changes or AI activation. Rollback is to use the frozen base; never reset protected/shared branches or delete recovery data.

## Evidence

[Exact tokens](COACH_CORE_VISUAL_TOKENS.md). Screenshots in `evidence/visual-dashboard/`: phone375×812, tablet834×1112, desktop1440×1000; full-page versions and phone/desktop empty states. `ui-verification.json` records final viewport results; `checks.txt`, portable runner and SHA-256 manifest accompany them.
