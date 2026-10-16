# Release-gate investigation: D10-06e, FX-02, N3

Date: 2026-10-15 (America/New_York). MVP **NO-GO**. Investigation/evidence only;
no production application, auth, rules, functions, acceptance harness, dependencies,
or settings changed. New app-owned readiness unit diagnostic is not acceptance.

## Exact baselines and ownership

- Application: `518e9e5817abd2a0e1bf1308468928f238fa8533`.
- Preserved PR71 head: `280ee484cf0b24ba2fb0eb7d803ea9c85c743489`.
- CI test-only candidate: `cf6377f8bca24acb678e41bb6a60098a9e8fdf4b`;
  source/functions/rules/package diff against application is empty (verified Git).
- Investigation branch: `codex/release-gate-d10-fx02-2026-10-15`, based on280ee48.
  Candidate10/9b/#67 and PR71 are not updated. Independent acceptance belongs to
  Claude, including any readiness checkpoint correction. Claims/findings:
  [6207489934](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6207489934),
  [6207519021](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6207519021).
- Latest Claude handoff read: [6206907655](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6206907655).

## D10-06e: premature team-readiness checkpoint in this captured failure

[Run38842101522/job116784614845](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/38842101522/job/116784614845),
phone Chromium156.0.8078.4, Linux, Playwright1.64.0, repeat10, retries0.
Job:149 PASS/1 FAIL. Full run was still in progress when inspected; this is not a
full-matrix result. [Artifact12021584689](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/38842101522/artifacts/12021584689)
ZIP SHA256 `7b8988f4ff7d2812ff1d48e200659b1f29eb20b1b8ff1e5088bb932690b83063`
matches CI's upload digest. The original ZIP, embedded trace and screenshot remain
private and unchanged. provenance.json records hashes; redacted timeline published.

| Recorded event | Trace time, ms | Observation |
|---|---:|---|
| Welcome assertion after snapshot, seoc@2563 |30117.941|Identity visible; Active team: No team selected; authorized plans loading|
| Immediate storage read, seoc@2565 |30118.775 start; client ends30126.032|currentTeamId undefined; after DOM snapshot30125.790 still no selected team|
| Next diagnostic before snapshot, seoc@2567 |30137.801|Active team: Alpha Eagles already present|
| Existing diagnostic read, seoc@2569 |31667.186 start|currentTeamId JSqVLPKPE13MkAFuCUkb, the original team|

The coach's original team exists on the server and becomes selected. The test
reads storage after identity readiness and before team readiness; the trace shows
selection visible about12ms after the storage snapshot, not a proven1.5s delay.
The1.5s observation is only an upper bound for the storage recovery, not a remedy.

Source at the exact CI candidate:
- `e2e/tests/support/app.ts:49-59`: signInAsBetaCoach awaits Welcome and returns;
  no team-ready wait. `dashboardFor` is an identity locator, not a team signal.
- `e2e/tests/legacy-import.spec.ts:423-435`: immediate storage read, diagnostic
  delayed second read, then assertion against the first value (assertion preserved).
- Runtime `src/hooks/useAuth.tsx:98-115,298-325`: currentTeamId is intentionally
  cleared on sign-out; previous account selection must not survive as authority.
- `src/contexts/TeamContext.tsx:299-333`: resets owned team state, subscribes
  asynchronously, then selects an owned team and stores its ID; exposes loading.
- `src/components/Dashboard.tsx:36-55`: identity shell renders before teamLoading
  settles; the overview receives the loading state. Welcome does not promise a team.

**Classification:** premature harness checkpoint for this execution, not evidence
of lost selection, wrong-team persistence or cross-account access. This does not
classify every historical line425 failure or close D10 acceptance. The line30
post-create variant is separate and was addressed by518e9e5; low-frequency absence
in later runs is not proof by itself. App UX limitation: No team selected appears
transiently while loading; no approved identity UI was changed to mask it.

**Claude next:** establish an existing observable owned-team readiness anchor
(e.g. exact Active team identity / owned-team surface) within the existing timeout,
then read/poll for the exact original ID and retain all import assertions. Distinguish
loading, genuine no-team and query failure. Preserve this failure and helper contract
change separately; no unconditional sleep, timeout increase, retries or assertion
weakening. Re-run the affected repeated case and full matrix independently. If the
team never becomes ready, or the wrong ID is selected after readiness, reopen as an
app defect. Codex did not edit the harness.

## FX-02: requested texts and decoded DOM recovered

Original retained source:
`work/coaching-browser-reviewed-results/coaching-P14-shared-profil-a2551--recover-conflict-as-a-copy-firefox/trace.zip`.
SHA256 `dcc5b745bff5f31d8ff7659a89dc038dcb6633785b7c447e32286f028382cbb0`
reverified. No archive mutation/replay. Full redacted action log (11 messages):
`docs/evidence/release-gate-d10-fx02/fx02-action-log.json`.
Requested decoded before DOM:
`docs/evidence/release-gate-d10-fx02/fx02-before-dom.json`.
Snapshot presence census: `fx02-snapshot-census.json`.

- Callfcwl@56 starts110957.378ms; logs waiting113977.692, resolves162362.190;
  click completes162509.789, action ends162526.644 (51.569s).
- The enabled email-link submit button is present in the prior fcwl@54 after
  snapshot110907.004, about50ms before action starts, and in fcwl@56 before
  snapshot162323.134, captured near the END of the gap. It has no disabled attribute.
- There are no intervening main-frame DOM snapshots in that51.416s interval.
  These samples do not prove continuous presence or rule out remove/reinsert,
  browser/event-loop suspension, driver stall, or re-render. Absence of a log is
  not proof of DOM absence. FX-02 cause **UNRESOLVED**, not repaired by later passes.
- Decoder follows Playwright1.64.0 `coreBundle.js` snapshotNodes postorder references
  and per-frame snapshot deltas. Initial extractor failed on an empty child array;
  corrected handling before export. The outputs match the earlier predicate-only
  whitelist (same timestamp, button text and disabled absence), and full log texts
  match original archive records. No HTML is executed.
- Export excludes URL/value/src/href attributes, scripts/styles/head, headers,
  requests/responses and image pixels; email/JWT text is redacted. Raw auth traces
  remain private. This recovered trace is distinct from the missing original L1
  ZIP/PNG archives, which remain missing and disclosed.

## N3: coordinate probes before any app repair

Claude6206907655 reports two Firefox symptoms in run38835170412 (D10-06c/UI-02):
raw auth signed in, DOM submitFired0, creatingSeenfalse, no commit/toast, modal open.
This is a reproduced symptom, not a diagnosed application defect or the SDK stall.
Candidatecf6377f adds input length/validity, form validity, tagged-node survival and
button-disabled diagnostics. Desktop jobs were still in progress when inspected;
no new N3 discriminator result was available on39. No speculative app repair.

Claude owns interpreting that probe and acceptance. Codex requested handoff on39.
If evidence shows empty input/invalid form/disabled control/replaced node, diagnose
and repair the owned client path on a separate candidate, without changing auth or
harness. If those are healthy, investigate Firefox/driver event dispatch. Agreed
post-fix criterion from Claude: no recurrence in at least2,000 Firefox creations;
not performed here. N3 and natural SDK stall cause remain open.

## Validation, commands, limitations

- `git status --short`, `git rev-parse HEAD`, `git diff 518e9e5 cf6377f --stat -- src functions/src firestore.rules package.json package-lock.json`: runtime diff empty.
- GitHub connector: read39/comments page2, run38842101522, job116784614845 logs,
  jobs and artifact12021584689. Raw logs/trace bodies are not public reports.
- `Invoke-WebRequest -Uri <temporary artifact URL> -OutFile work/release-gate-2026-10-15/d10-38842101522.zip`; `Get-FileHash <ZIP>`: digest matches CI. Signed URL not retained publicly.
- `python <extract.py> --fx <private FX02 ZIP> --d10 <private embedded D10 ZIP> --output <new output directory>`: read-only decode/redaction; outputs/hash manifest in evidence folder. No HAR assumption, no REA install/run.
- Focused app diagnostic: `CI=true npm test -- --watchAll=false --runInBand --runTestsByPath src/contexts/TeamContext.readiness.test.tsx`. Auth-ready/teams-delayed is represented explicitly, then original selection restores on delivered snapshot without sleeps or create requests. Result in unit.log/final handoff. This is mocked app evidence, not browser acceptance.
- `node node_modules/typescript/bin/tsc --noEmit`: result in types.log/final handoff.
- Existing installed runtime reused through worktree-local node_modules junction; no dependency installation/change. First unit invocation had wrong log redirection path and did not execute tests; corrected and retained as setup limitation.
- No production source changed; no new production build or acceptance matrix claimed. Previous480 unit/TS/build results belong to518e9e5 and earlier independent results remain Claude's evidence, not new runs here.
- No hidden-tab/device/staging/production measurement; no athlete media, paid AI or live backend. AI off, film required/blocked. No merge/deploy/delete. MVP NO-GO.

Rollback: abandon this investigation branch if rejected; do not change baseline
refs or clear/replay any device journals. Evidence must remain retained.


## Closeout update - 2026-10-16 (America/New_York)

Focused diagnostic: **1/1 PASS**, original runner elapsed28123.533s, case743ms;
direct rerun `CI=true node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand --runTestsByPath src/contexts/TeamContext.readiness.test.tsx --watchman=false`
**1/1 PASS**, runner4.842s, case105ms. This repeat resolves concern about the
unexplained walltime; neither timing establishes production performance. Both
logs retained. Attempted stopping original processes found they had already
exited; none were killed. TypeScript **0 diagnostics/exit0**. Unit warnings are
existing React testing-library act deprecation. No new build or browser suite.

Firefox job116784614848 now completed (same run/candidate):669 PASS/11 FAIL total.
Log classification:610/0 acceptance;54/6 diagnostic (N2-D2);5/5 obsolete N2-A2.
N3-D5 PASS10/10 (8 creations/execution), D10-06c/UI-02 PASS10/10, no n3={ failure
record. This does not diagnose or close N3. The full run's other jobs and historical
results remain intact; this is a retrieved Claude-run result, not Codex-run
independent acceptance. Coordination comment6214505153 requests Claude's review
of the classification and the next discriminating recurrence; no client fix made.

The shared files contain a pre-existing non-UTF8 byte. The initial attempted UTF8
read failed before writing; final updates append ASCII bytes, preserving existing
bytes. Original raw trace hashes and PR71 head rechecked; no evidence rewritten.
