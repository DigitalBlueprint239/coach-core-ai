# D10 consent import — implementation and review handoff

> CC-007 current status (2026-10-14): earlier blanket D1–D9-pending statements below are historical and superseded. Coach Drew reports those directions settled; the detailed settled approval record is unavailable in inspected sources. See [decision provenance reconciliation](CC_007_DECISION_RECONCILIATION.md). No new spending, deployment, AI/film activation or deletion approval is inferred. Current MVP NO-GO; original evidence preserved.

2026-10-13. Coach Drew explicitly approved implementation/testing in the Codex task; recorded on Issue #39. No merge, deployment, spending or deletion is approved. D1–D9 remain pending. Claude reviews authorization and activates real-browser/rules P13 acceptance.

## Implemented

- Explicit prompt for the main application's pre-account `smartPlaybook_plays`, only with a signed-in coach and selected owner team. No import on sign-in alone. Accept / Not now recorded per account, after exact verification for accept. A failed batch remains retryable.
- Validate the entire batch before writes; preserve every supported player/route/property and canonical optional createdAt/updatedAt timestamp. Unsupported/malformed records fail visibly without rewriting originals. Standalone `coachcore-playbook` has a different schema: remains untouched, no cross-application conversion in this PR.
- Create-only Firestore transaction copies under immutable uid/team, revision1. Stable SHA256 IDs include account/team/full source content. Optional timestamp flags in the ID retain field absence without new rule fields. Retry after a lost acknowledgement reads an existing identical copy; edited copies fail rather than being overwritten.
- Server read-back and full-content equality before decision acknowledgement. No offline queue or offline fake success. Capture account/team and discard stale completions. New account requires independent consent; declined/completed account receives no repeat automatic prompt.
- Imported copies reload from cloud into the main Playbook library. Shared legacy originals never become an authenticated library automatically. Existing newly created local plays remain explicitly labelled scoped device drafts until CC02 cloud editing is completed. Library mount waits for draft loading before writes; account/team switches remount editor/history. No imported cloud-copy deletion enabled.

## Tested revision and evidence

Source/test SHA `6a412e71993038069882920c9c16ba30914534bc`, branch `codex/d10-consent-import`, stacked on draft #54 `66dfadf6c8416914c78f90002181bdbcf6a22047`. Dependency manifests unchanged; reused the existing main-platform node_modules via local junction, not a new clean-install claim. Windows Node22.23.1/npm10.9.8. All test fixtures synthetic.

- **16/16 unit/DOM/mocked-SDK tests PASS**. Accept, decline, repeat, two-account consent, switch during pending copy, retry after read failure, mismatched verification, validation-before-write, actual consent buttons, stable transaction IDs, changed-copy refusal, anonymous/account mismatch, simulated permission denial, exact timestamps and absent timestamps. Both original storage keys asserted byte-identical. These do NOT prove server authorization or physical-browser acceptance.
- TypeScript zero diagnostics; production build PASS with existing lint/Browserslist warnings. A newly introduced effect-dependency warning was corrected without suppression.
- Full suite retains logger's two failures and FieldMemo's broken import from the #54 base (unmerged #40 fixes these files). No skipped/suppressed assertions; raw final totals in `d10-full-source-final.log`. This is not an all-green product acceptance claim.
- Initial focused failures retained: CRA resets mocks before each test, so setup was corrected to recreate mock implementations; waiting for the renamed busy button was replaced with awaiting recorded verification. Timestamp flag index error was exposed by a real-format fixture and corrected; dated and undated cases both now pass. Logs retained.
- Real-browser/Firestore emulator P13 **NOT RUN locally**: Java unavailable (`java -version` command fails). Claude's #54 harness owns that acceptance layer. No live Firebase/provider calls, credentials, youth media or deployment used.

```powershell
git worktree add --no-checkout -b codex/d10-consent-import ../main-d10-import origin/pr54
git -C ../main-d10-import sparse-checkout init --no-cone
git -C ../main-d10-import sparse-checkout set '/*' '!/src/components/Coach Core AI Brain /'
git -C ../main-d10-import checkout codex/d10-consent-import
New-Item -ItemType Junction -Path ../main-d10-import/node_modules -Target (Resolve-Path ../main-platform/node_modules)
$env:CI='true'
npm test -- --watchAll=false --runInBand --testPathPattern=import-legacy
npm test -- --watchAll=false --runInBand --testPathPattern=legacy-import
npm test -- --watchAll=false --runInBand
npx tsc --noEmit
$env:CI='false'
npm run build
java -version
git diff --check
```

## Remaining acceptance / Claude

P13 must run actual UI→authorized create→server read→reopen against demo emulators for accept, decline, repeat/retry, two coaches sharing one browser profile, account/team switch during an in-flight write, cross-team denial and original-byte preservation. Verify partial copies survive failure, are not overwritten, and no successful consent is recorded before all copies verify. Test original canonical timestamp fidelity and optional field absence. Integration with #52's existing founder packet requires retaining the explicit D10 decision and all unrelated decisions.

CC02 normal cloud edit/conflict/sign-out recovery and CC03 editable practice save/reopen are not completed by this import slice. Claude's PR53 a4cea1e resolves prior field disagreements; old contract escalation paused. Retained standalone browser exit remains OPEN; subsequent passes do not close it. MVP NO-GO pending security and end-to-end acceptance.
