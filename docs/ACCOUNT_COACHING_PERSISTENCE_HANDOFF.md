# CC-CODEX-02 / CC-CODEX-03 implementation handoff

2026-10-14. Status: implementation candidate, **MVP NO-GO**. Claude owns independent security and P10–P17 acceptance; Coach Drew owns acceptance. D10 remains approved for implementation/testing only. D1–D9 pending. No merge, deployment, live configuration/data, spending or deletion. BDN-AEO-001 remains queued.

## Discover / ownership

Read AGENTS.md, CLAUDE.md, shared context, sprint, #39 and #40/#53/#54/#55. Client branch `codex/account-coaching-persistence` starts from #55 `819802c81f7d3e08408b0287ec9fc87d4a60ed99`; incorporates the applicable #40 logger/FieldMemo tests unchanged. Merged Claude's #54 `ecc6400` (missing-ID rules fix and harness diagnostics) without modifying his files. His #39 ownership response explicitly accepts the client files, single Dashboard guard mount, and separate `tests/coaching-ui/**`. Auth/rules/functions/e2e code remains Claude-owned.

## Measure / diagnose

Baseline: 18/20 Jest suites pass, 376 passing / 2 failing tests plus an unloaded FieldMemo suite. TypeScript zero errors; build succeeds with warnings. After the exact #40 test repairs: 382/382 pass, including logger and FieldMemo. Added tests do not replace these assertions.

First browser probe: 0/8 pass. New-document transaction `get` was denied by rules dereferencing a missing resource. Mocked unit tests missed it. Preserved failures. Client now uses atomic Firestore REST `commit` with `currentDocument.exists=false` for creation, Firebase SDK ID-token authorization, server-time transforms and authorized read-back before acknowledgement. Existing-document saves use SDK transactions with revision checks. Claude independently repaired missing-ID reads in #53; that update is incorporated too. Please review the REST alternative specifically before acceptance.

Second browser run: 6/8 pass. Remaining two failures were the mixed-case `coachB` email fixture; Auth normalizes it to lowercase. Changed only our fixture to `coach-b`, retaining assertions. Shared-profile tabs also required per-editor writers; otherwise one tab's acknowledgement could remove another tab's recovery work. Writer keys, cloned-tab leases and explicit device recovery preserve both drafts. Sign-out Sync now needed acknowledgement propagation to the live editor so it would not falsely veto sign-out after persistence.

Frozen pre-review source `dacb1894467738f7771f8205d6b752e6c5b5a389`: 414/414 Jest; TypeScript zero; 12/12 real-browser checks (Chromium 156.0.8078.4, Firefox 157.0; no retries). Review repairs then added R1/R2/R5 coverage; full Jest 415/415, TypeScript zero. Final reviewed browser/build evidence is recorded separately in the evidence directory; do not substitute these results for Claude's acceptance.

## Implemented behavior

- Ordinary Playbook creates/edits/saves/reopens only within the signed-in owner/team. Metadata, players, route geometry and supported optional fields survive round trips. Legacy `path` routes adapt reversibly to canvas `points`; original timestamps are retained on reopening, createdAt stays immutable on edits, updatedAt is server-acknowledged. Undo history is not serialized. Opening another document clears transient selections/drawing/history.
- Device envelopes include UID, team, kind, document ID, expected revision and editor writer. Foreign or malformed envelopes are not adopted or overwritten. Account/team remounts and async generation guards prevent stale completions populating another workspace. Different tabs retain separate copies. Earlier account-scoped drafts are explicitly recoverable; anonymous originals remain untouched.
- Status is unsaved/saving/saved/failed. Saved means the acknowledged content matches the editor. Editing during an in-flight save preserves the later draft. Network restore retries pending work; errors keep recovery data. Unsupported/oversized data fails visibly, never truncates.
- Stale revisions show **Conflicting edits / This was changed elsewhere** with **Reload remote**, **Keep my version as a copy**, and **Export my version**. Reload requires explicit confirmation; copy gets a new ID rather than overwriting the server.
- Root sign-out recovery offers **Sync now**, **Export drafts**, **Sign out anyway**, **Cancel**. Sync must acknowledge all this account's scopes; failure cancels sign-out. Anyway retains scoped drafts for that account. Old unscoped `offlineQueue` bytes are quarantined: no trustworthy owner/team/revision exists, so automatic upload is disabled, not silently migrated.
- Practice Planner edits manual plans and existing supported saved AI-plan fields. Titles 200, notes 5,000. Recursive editing preserves periods, drills, activities, goals, safety, hydration and ordering; provenance IDs remain unchanged. Lossless `planFromResult` is a pure adapter, not working generation. **AI generation is disabled. Film connections are blocked.**
- Reviewed D10 repair: verified completion writes the requested device claim; another UID sees **already imported by another account**, no Import button. Pending original-team marker is written before the first copy; another team sees its name and no Import button. Originals and stable IDs are retained. No-team Playbook shows **Select or create your authorized team before editing plays. No play has been saved.**, with no editing/save action. R3's permanent **Not now** and R4's approval build constant remain documented review/deployment limitations, not new founder decisions.

## Test commands and evidence classification

Commands run from candidate root unless specified. Root client node_modules reuses the installed matching baseline lockfile; dependency repair has its own installation. Java is workspace-local Adoptium 21.0.12.1, not a live/system configuration change.

```powershell
npx tsc --noEmit
$env:CI='true'
npm test -- --watchAll=false --runInBand
$env:CI='false'
$env:GENERATE_SOURCEMAP='false'
npm run build
npm ci --prefix e2e --ignore-scripts
npm ci --prefix functions --ignore-scripts
# Emulator build (only demo data; generation off)
$env:REACT_APP_USE_FIREBASE_EMULATORS='true'
$env:REACT_APP_FIREBASE_PROJECT_ID='demo-coach-core-e2e'
$env:REACT_APP_FIREBASE_API_KEY='demo-e2e-web-key'
$env:REACT_APP_FIREBASE_AUTH_DOMAIN='demo-coach-core-e2e.firebaseapp.com'
$env:REACT_APP_FIREBASE_STORAGE_BUCKET='demo-coach-core-e2e.appspot.com'
$env:REACT_APP_FIREBASE_APP_ID='1:000000000000:web:e2e'
$env:BUILD_PATH='e2e/.app-build'
npm run build
# JAVA_HOME/PATH point to the local Java21 download
node e2e/node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --project demo-coach-core-e2e --only auth,firestore 'node e2e/node_modules/@playwright/test/cli.js test --config tests/coaching-ui/playwright.config.ts'
```

Tests use real UI/browser → real Firebase SDK → local Auth/Firestore emulators and repository rules, with no retries or arbitrary sleeps. The explicitly named SDK-in-browser negative case uses the published emulator test hooks; it is not UI acceptance. Admin helpers seed/check only demo data. Mocked/JSDOM unit tests are implementation evidence, never end-to-end acceptance. First probe's Functions emulator timed out loading; final client runs exclude Functions because AI is disabled. No AI/backend acceptance claimed.

Raw local failure logs/artifacts are retained. Published logs/results are credential-redacted copies (including synthetic emulator OOB codes). Auth-bearing raw traces stay local; hashes identify originals. Do not publish token values from them.

## Claude's independent scenarios / selectors

Use the final source SHA in the evidence manifest and fresh emulator reset. `tests/coaching-ui/coaching.spec.ts` provides labels, not the independent harness implementation.

| Case | Scenario / expected UI |
|---|---|
| P10 | Same browser A draft → sign-out anyway → B account/team: blank B fields, no A content/upload. Actual rules deny B reading A plan or writing A team. |
| P11 | A scoped pending envelope stays under A UID/team/writer; B has no draft key. Test team switching and account switching while an acknowledgement is delayed. |
| P12 | Unsynced draft recovery: Cancel retains editor; Sync now persists before sign-out; failure stays signed in; Export drafts downloads recovery; Anyway preserves own drafts. |
| P13 | Re-run Claude's D10 suite on reviewed candidate: accept, decline, repeats, R1 account claim, R2 interrupted-team notice, R5 no-team guard, held final acknowledgement, originals byte-identical. |
| P14 | Two tabs in the **same profile** edit one saved plan. First saves; second refreshes with its private draft, stale save conflicts, copy saves both versions. Also test Reload remote and Export my version. |
| P15 | Smart Playbook Shotgun → name field placeholder `Enter play name...` → Save Play dialog → property edit → save → hard reload → Load Play / Load. Compare full payload/geometry/revision/timestamps, not just visible name. |
| P16 | Practice Plans → heading Practice Planner. `Plan.name`, `Plan.notes`, `Plan.periods.2.focus`; Save practice plan; status `Practice save status`. Fresh profile same UID opens `Open <name>` with exact content. Exercise all supported fields/reordering, existing AI provenance without calling AI. |
| P17 | Offline save captures pending before request; status cannot be saved offline. Restore connection → acknowledgement; delayed save + later edits retained; wrong UID retry refused. Legacy global queue never replayed. |

Remaining independent acceptance: broader full-route/property fidelity, team changes in flight, save failure/conflict UI recovery paths, download contents, clean-browser account isolation across every workflow, repeated-run stability, rules/security approval, physical tablet/touch, approved staging auth. Physical device testing, production behavior and youth-media processing are **NOT MEASURED**. Existing standalone touch failure/browser exit remains open; a passing batch does not erase it.

## Rollback

Drop the isolated candidate or revert its small client commits after review. No server migration exists. Preserve `coachcore:v1:*` device bytes and both legacy originals; do not replay the quarantined global queue or delete drafts. Revert dependency package/lock commit separately, reinstall its previous lock with the existing legacy-peer-deps setting. Do not merge any recovery branch into production without explicit approval.

Protocol references: [Firestore preconditions](https://firebase.google.com/docs/firestore/reference/rest/v1/Precondition), [atomic commit](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/commit), [Firebase ID-token rules authorization](https://firebase.google.com/docs/firestore/use-rest-api).

## Final client handoff snapshot

Draft PR59. Application source ff9b421669c1154ab52288f9cda1c7516bfb1ed5: **416/416 Jest (26 suites), TypeScript0**. The added test verifies restoring a revision-null legacy draft upgrades through the authorized revision contract instead of treating it as a new document. Build result is retained in coaching-release-build.log. Node22.23.1/npm10.9.8; Playwright1.64; Java21.0.12.1. Production credential canary12/12 measured on application8dcf9a7 (subsequent source change is the revision-null restoration fix).

Real-browser checkpoint source06e222e410640e91fea98deae34bbe901b081379 (application8dcf9a7): **18/18 PASS** (9 per engine, Chromium156.0.8078.4 / Firefox157.0, retries0). Two cases are explicitly SDK-in-browser denial checks; other16 exercise the UI. Includes R1 imported-account notice, R5 no-team guard and actual complete legacy route payload/property save. Reviewed predecessora91264c:16PASS2FAIL. R1 Firefox trace shows NS_BINDING_ABORTED when a new goto overlaps sign-out reload; using Claude's published reload-completion helper replaces a stale checkpoint. P14 Firefox timeout occurred reloading a background tab; bringing that tab to front passes this batch, but the exact timeout cause/stability remains **OPEN**, not resolved merely by a subsequent pass. First0/8 and second6/8 measurements also remain available. Claude should repeat independently; standalone retained touch failure/browser exit is unchanged.

D10 R2 is covered in implementation unit/DOM tests (pending marker before backend copy, original-team notice, no alternate-team Import). Claude's real interrupted-operation P13 acceptance remains pending. No independent/security acceptance is claimed from Codex evidence. Exact final integrated dependency candidate and its browser/build/unit results are recorded in the separate PR60 handoff.
