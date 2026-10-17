# N2 — recoverable team creation

Owner: Codex client repair. Independent diagnostics/acceptance: Claude. Release authority: Coach Drew. MVP NO-GO.

## Frozen base and scope

Exact base: `186a7435ef2236470a2ed9e2f94e8f614f6e6feb`, candidate 10,
`claude/identity-visibility-2026-10-15`. This test-only reference remains unchanged.
Repair branch: `codex/n2-team-creation-reliability`.
Claim: #39 comment 6195431324; transport/harness coordination: 6195501031.
Candidate 9b and #67 `dd1fe0a73e44450a433bc64bd68dda32fe912696` are preserved.
No identity UI, auth, rules, functions, existing coaching persistence or Claude E2E edits.

## Discover / measure / diagnose

Read #39 comments 6193045248 and 6194907639. D1 proves a reset Write
WebChannel can leave the SDK write unsent and unretried for at least 32 seconds;
the natural CI N2 trigger remains unproven. D2 proves local modal state plus a
fresh `addDoc` ID permits duplicates after cancellation/navigation. N3 is a
separate Firefox no-request/no-Creating observation with unproven cause.

Untouched base: 453/453 Jest, TypeScript zero, production build passes. Existing
React act/lint warnings and archived/legacy TypeScript suppression are retained,
not repaired by this task. Legacy `offline_operations` remains quarantined and
is not replayed or deleted.

## Implement

Before any request, persist one pending operation under project + authenticated
uid, with a random Firestore document ID and the original name/code. A provider
owns this operation across modal navigation; reload restores the journal.
Another team cannot be submitted until this operation is confirmed.

Reuse the existing coaching client's authenticated Firestore REST create-only
pattern: `documents:commit` with `currentDocument.exists=false`. No new team
fields, rules, network toggles or SDK settings. Retrying reuses the same ID and
never overwrites an existing record. This bypasses the particular SDK Write
WebChannel mechanism; it does not prove or fix that SDK's natural stall cause.

Success requires matching authoritative readback (owner/id/name/code/timestamps)
or a matching server listener snapshot with neither cache nor pending-write
metadata. Commit responses and cached snapshots alone are insufficient.
After 10 seconds, an unconfirmed request is aborted locally and the operation is
retained with Still saving / Check and retry. A timed-out request may still have
committed; the create-only retry and readback handle that ambiguity.

Account changes dispose the old controller, suppress stale responses and hide
the previous account's Teams/modal data. Its journal remains for that same coach.
Unreadable journals/storage failures fail closed instead of inventing a new ID.

## Test evidence and commands

Tested source: `bdb06ae6d39ff9ed3fee7000f93468c8cf2f8fe7` (draft PR #71).
Full final Jest **477/477** (37 suites); TypeScript **0**; production and demo
emulator builds **PASS**, inherited SmartPlaybook warnings only. The four runtime
files match byte-for-byte between the clean-install branch and measurement build.
Real browser implementation tests: **8/8 PASS**, Chromium156.0.8078.4 and
Firefox157.0, Windows desktop, retries0/skips0. These are local emulator tests,
not independent acceptance or physical-device evidence. Five modal regressions
fail5/5 on frozen pre-repair source. Initial owned fixture failures remain in
[evidence](evidence/n2-team-creation/summary.json), with sanitized logs/hashes.
Development server (`npm start`, demo env, HOST127.0.0.1/PORT4320/BROWSERnone)
compiled with inherited warnings and no type issues; HTTP200. An initial45s HTTP
probe while compilation was still running timed out and is retained separately.
Temporary dev/emulator process trees were verified as task-owned and stopped;
no listeners remained on8080/9099/4320. No files/data were deleted in cleanup.
No new N2 runtime failure occurred in the focused browser run; this does not close
historic failures. No full independent acceptance suite was duplicated.

```powershell
npm ci --legacy-peer-deps --ignore-scripts
$env:CI='true'
npm test -- --watchAll=false --runInBand
node node_modules/typescript/bin/tsc --noEmit
$env:CI='false'
$env:GENERATE_SOURCEMAP='false'
npm run build
```

The clean install leaves package/lock files unchanged and reports 98 existing
full-graph advisories (6 low, 14 moderate, 75 high, 3 critical); no force upgrade.
An early validation before installation completed is invalid setup evidence,
not a product baseline. The separate unchanged measurement worktree uses the
existing dependency runtime with the identical lockfile; this is disclosed.

Focused browser implementation tests live at `tests/team-creation/`, reusing
Claude's support helpers read-only. Run only against isolated local Auth and
Firestore emulators, project `demo-coach-core-n2`, ports 9099/8080, app 3000.
Build with the existing `e2e/scripts/build-app.sh` and demo environment values,
setting `E2E_PROJECT_ID=demo-coach-core-n2`. The PowerShell equivalent sets the
same REACT_APP demo config, emulator flag, BUILD_PATH=e2e/.app-build, and runs build.

```powershell
$env:E2E_PROJECT_ID='demo-coach-core-n2'
$env:N2_OUTPUT='<unique absolute private output directory>'
node e2e/node_modules/@playwright/test/cli.js test -c tests/team-creation/playwright.config.ts
```

This task used the existing installed Playwright/Firebase CLI runtime via an
ignored junction in a separate validation checkout, not new e2e dependencies.
The app branch itself completed clean npm ci. Emulator build command (PowerShell):

```powershell
$env:REACT_APP_USE_FIREBASE_EMULATORS='true'
$env:REACT_APP_FIREBASE_PROJECT_ID='demo-coach-core-n2'
$env:REACT_APP_FIREBASE_API_KEY='demo-n2-web-key'
$env:REACT_APP_FIREBASE_AUTH_DOMAIN='demo-coach-core-n2.firebaseapp.com'
$env:REACT_APP_FIREBASE_STORAGE_BUCKET='demo-coach-core-n2.appspot.com'
$env:REACT_APP_FIREBASE_APP_ID='1:000000000000:web:n2'
$env:BUILD_PATH='e2e/.app-build'
$env:GENERATE_SOURCEMAP='false'
$env:CI='false'
npm run build
```

Emulators were launched using Firebase CLI15.33.0, Java21, an external config
pointing at this unchanged firestore.rules, Auth9099/Firestore8080, UIoff,
project demo-coach-core-n2. They were not connected to a live Firebase project.
No deployment command was executed. Example emulator config/launch from the
repository root, after checking these ports are free (separate terminal):

```powershell
$n2ConfigPath=Join-Path $env:TEMP 'coach-core-n2-emulators.json'
@{firestore=@{rules=(Resolve-Path firestore.rules).Path};emulators=@{
  auth=@{host='127.0.0.1';port=9099};firestore=@{host='127.0.0.1';port=8080}
  hub=@{host='127.0.0.1';port=4400};logging=@{host='127.0.0.1';port=4500}
  ui=@{enabled=$false};singleProjectMode=$true
}} | ConvertTo-Json -Depth 6 | Set-Content $n2ConfigPath -Encoding utf8
node e2e/node_modules/firebase-tools/lib/bin/firebase.js emulators:start --project demo-coach-core-n2 --only auth,firestore --config $n2ConfigPath
```

Use Java21 and the e2e lockfile's Playwright1.64.0/Firebase CLI15.33.0 runtime.
Do not reuse an emulator containing someone else's test session. The focused
suite resets only its isolated demo project's synthetic accounts/documents.
Compare only the N2 patch for review:
https://github.com/DigitalBlueprint239/coach-core-ai/compare/186a7435ef2236470a2ed9e2f94e8f614f6e6feb...codex/n2-team-creation-reliability
The draft recovery PR includes inherited unmerged candidate history; it is NOT
permission to merge that history or modify the frozen test-only branch.

No acceptance retries or timeout/assertion changes. The owned 12-second assertion
measures the new specified 10-second UI threshold; it does not relax Claude's
acceptance. Desktop Chromium/Firefox are not physical-device coverage. Raw browser
traces can contain synthetic Auth tokens and stay private; publish redacted results
and checksums, never raw auth payloads. Every browser run uses a unique folder.

## Independent pre-repair discrimination

Claude's #39 comment6196011205 reports N2-A1 and N2-A2 FAIL5/5 per engine on
runtime identical to candidate10 (diagnostic a61dfcb, run38758608712), and N3-D5
80 creations without reproducing N3. Those are Claude's baseline results, not
acceptance of this repair. Final source/transport/UI handoff is #39comment6196238621.

## Claude next / limitations

Keep `e2e/tests/n2.spec.ts` and its original results. Its Write/channel interception
does not fault the new REST transport; a passing old diagnostic alone cannot
establish this repair. Independently inject REST commit loss/held response,
readback failure, pending navigation/reload and account switches. Verify exactly
one authoritative team at the original ID and no stale owner UI or success.
Then rerun the unchanged coaching/identity matrix on a separate candidate.

N3, H2, FX-02, natural SDK stall cause, original-team import residual, R3/R4,
standalone touch exit and missing original ZIP/PNG evidence are not closed.
Genuine hidden tabs, physical devices and staging remain NOT MEASURED.
The journal is same-origin plaintext, not encrypted per-user storage; simultaneous
cross-tab first-submission races are not claimed solved. Corrupt/lost journals
need explicit recovery/support; no discard/release/deletion path is introduced.

Rollback: retain the frozen base and the repair commit. If review rejects the
transport, do not merge or deploy it. Do not clear journals or replay an older
random-ID create while an operation is unconfirmed; reconcile its ID with the
server first. No rollback deployment or data operation is authorized here.

## 2026-10-17/18 — N2-A2 bucket/order observation (diagnostic only)

Independent PR75 review, comment6243036404, evidence71 on accepted
`efc9116cf93c5d235b0b2edeb4d7be03a4e73cdc`, recorded N2-A2
`[obsolete-fault-model]` passing in 6.2s Chromium / 7.2s Firefox when it ran
alone in its bucket in run39078328001. It had timed out at60s in reviewed
runs39059137056/39062364060 where it followed other tests. Older runs also
contain occasional Firefox passes; do not generalize this observation into an
all-runs rule. The task integrator verified all24 new PR75 artifacts, including
that run and failing-acceptance run39078584595, with their exact digests/inventories.

Inference: timeout may depend on order, prior state or browser lifecycle. Cause
is NOT established. N2-A2 intercepts SDK WebChannel traffic and is obsolete for
the repaired REST creation path; passing it is NOT acceptance of a new runtime
repair. Keep N2-D2 and N3 (separate no-submit symptom) distinct. No timeout,
assertion, routing, reset behavior or production fix is changed by recording this.
N3/FX-02 stay open under their existing discriminating probes. Any experiment to
isolate order/state is a separately scoped investigation, not part of this import
integration candidate.
