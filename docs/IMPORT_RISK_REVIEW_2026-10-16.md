# Import R3, R4 and R1c release-risk review - 2026-10-16

MVP **NO-GO**. Isolated branch `codex/import-risks-2026-10-16`, based on frozen
PR71 head `280ee484cf0b24ba2fb0eb7d803ea9c85c743489`; baseline runtime
`518e9e5817abd2a0e1bf1308468928f238fa8533` is not modified. Bounded repair source:
`35e0d77887ba87d2714706f0cdbb2511b442d1a2`.

## Records and scope

Read latest39 handoff6206907655 and later coordination, plus
`docs/security/MVP_RELEASE_GATE_QUEUE_2026-10-15.md` on Claude's security branch
`46cd807991f1a7681bf27cf2e0b00a266be3d890` (B1-B3). Queue stays Claude-owned.
Claims:39/6214694174, repair refinement6214767118. No e2e/auth/rules/functions,
approved identity UI, candidate10/9b/#67 or PR71 edits. Claude retains readiness,
SDK-fault diagnostics, N3 and independent acceptance. FX02 artifacts delivered at
ba881bdbb646d29091ee42f5ab2f43921f9969af; its unsampled gap remains unresolved.

Settled approvals are not reopened:
- [D10 approval6150970144](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6150970144), mirrored in `docs/security/FOUNDER_DECISION_PACKET.md:244-246`: ask-once per-account accept/decline; explicit selected authorized team; full readback; idempotence; isolation; originals unchanged. Implementation/testing only; no merge/deploy/spend/delete authority.
- [R1c founder guidance6179690643](https://github.com/DigitalBlueprint239/coach-core-ai/pull/64#issuecomment-6179690643): unfinished Not now postpones with original-coach/team recovery; fresh R3 remains tracked.
- [Claude review6181436974](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6181436974) and [acceptance6182247091](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6182247091): normal R1c accepted; missing-team residual expressly open.

## R3 - fresh Not now is a lasting local per-account decline

**Exact behavior, source at518e9e5:** `import-legacy.ts:3,92-102` writes
`coachcore:v1:<uid>:legacyImportDecision = {decision:'declined'}` for a fresh offer.
`LegacyImport.tsx:13-18,43` hides it immediately and on remount; the executor checks
the decision before reading/copying the library. No supported re-entry control.
Switching teams, signing out/in or replacing library contents does not reset this
account-wide key. It is same-browser local state, not cloud-wide consent: a new
browser has independent state. No cloud writes, claim creation or original deletion
happen on fresh decline. Another account can get its own fresh consent only when
no unfinished/completed foreign claim blocks it. Clearing storage manually is not
a supported remedy and can remove ownership evidence; do not instruct coaches to do so.

**Unfinished differs:** `hasUnfinishedImport` plus `declineImport` returns postponed
without writing a fresh decline. Resume import is immediate; remount re-offers the
import for the original account/team. The new repair below changes only an older
unfinished-state detection gap, not fresh-decline semantics.

**Evidence:** Existing app tests `import-legacy.test.tsx` decline/no-write and second
account cases, `owner-resume.test.tsx` fresh permanent decline; independent D10-02
on candidate8 `069c8f11cc42c4a2672db9441b84ad8e0319e695` passed10/10 both engines
with its full460/0 per engine run (Claude6182247091, report section12). New mocked
characterizations cover remount/team-switch and changed library after decline.
They do not establish physical-device/staging behavior or an implemented re-entry.

**Smallest recommendation / Coach Drew choice:** retain the recorded ask-once
behavior for MVP and explicitly disclose that fresh Not now suppresses this device's
future offers; consider clearer wording separately. Alternative: expressly authorize
an original-coach "Review device plays" re-entry control for a future scoped task,
requiring fresh affirmative consent, never auto-resetting imported decisions or
bypassing pending ownership. No approval for that changed product behavior was found;
it is not implemented here. D10 implementation approval remains settled.

## R4 - literal approval constant, no release environment switch

**Exact behavior:** `src/features/legacy-import/import-legacy.ts:1` exports
`D10_APPROVED = true` with the implementation/testing-only approval comment. Its
only production consumers are UI offer logic (`LegacyImport.tsx:17`) and executor
(`import-legacy.ts:100` before this repair;106 after). No environment/config input
controls it. A production build keeps import enabled in code wherever authenticated
owner/team/original-data/consent checks allow it. This is source inspection, not a
new deployed-exposure measurement. The constant does not bypass auth/rules or upload
automatically. D10 is approved for implementation/testing; approval for a release
configuration remains a separate operational gate.

**Evidence / missing:** release proof13/13 on existing candidates does not inspect
D10 enablement (queueB2). No import-off release build or runtime-shutdown test exists.
An initial trivial constant assertion was removed as inadequate configuration
coverage; its initial35-test log is retained, not treated as release-gating proof.

**Smallest proposed configuration (NOT implemented):** use a public boolean such
as `REACT_APP_ENABLE_LEGACY_IMPORT`, enabled only for exact string true, otherwise
off. Preserve the approval record as a record, not a live deployment toggle. Gate
both UI offers and executor; retain ownership notices and all originals/pending
markers while off. Return an accurate disabled message, not account-changed. Keep
a pending import resumable after an explicitly enabled rebuild; no deletion,
replay or reassignment. This public switch is not a security permission or secret,
and is not an immediate kill switch for already-loaded tabs.

**Verification after a decision:** app enabled/disabled/unset/invalid-value tests;
credential-free builds for both settings; prove no import request/decision mutation
while off and exact readback/idempotence on re-enable. Coordinate explicit test-build
opt-in and release-proof coverage with Claude before touching his CI/harness.
**Coach Drew choice:** approve default-off build config with test-only opt-in, or
accept literal-on as a disclosed MVP release limitation. Neither choice authorizes
a deployment. Current settings/constant are unchanged pending this choice.

## R1c - two distinct recovery findings

### Normal owner recovery and missing-original-team residual

**Behavior:** Original owner/team can postpone, remount and resume with deterministic
IDs and full readback. `import-legacy.ts:6-35` checks the device claim and pending
marker before offering/reading/copying; another account or wrong team is blocked.
`firebase-import.ts:25-50` checks current uid/nonanonymous state, create-only ID,
existing content on conflict and authoritative readback. `SmartPlaybook.tsx:729-734`
requires an owned selected team before mounting the importer. If A has no authorized
team, only Select or create your authorized team appears; there is no importer
recovery notice. If A selects a replacement team, the importer directs A to the
unavailable original team and offers no Import button. B remains blocked. No TTL,
release, automatic transfer, support link or missing-team detection is implemented.

`firestore.rules:38-41` requires the original team to exist and be owned for play
access; `:93-104` denies client team deletion and prevents ownerId changes through
valid updates. Missing original team therefore requires out-of-band removal or
other loss of authorized access, not a supported client deletion workflow.

**Reproduction here:** seeded synthetic pending claim pointing to original-alpha,
render owner with replacement-beta, then B: no Import button, execution rejects,
backend.copy never called, claim/pending/decision/original bytes unchanged. Restore
same owner's original-alpha access in the mock: original deterministic copy is
read and verified once, one logical copy remains. This reproduces the conditional
client dead end; no real team was deleted and no live or emulator missing-team
authorization scenario was run. A same-name new team has a different ID and cannot
resume the original operation.

**Existing evidence:** normal R1c #69 source82d46cc33b7933d4de19b84a0acc553553c51d44;
Claude candidate8 D10-06e10/10 per engine, discriminates against pre-repair source;
current518e9e5 later line425 readiness failures remain separately owned by Claude.
Existing owner-resume/unfinished-claim tests cover partial retries, failed readback,
wrong owner/team and legacy declined state. Report section12 additionally notes
missing browser coverage for legacy declined+pending and multi-team owner recovery.
No independent missing-team recovery or authorized unblock acceptance exists.

**Smallest recommendation / decision:** preserve fail-closed behavior and provide
private support triage plus a written limitation for an irretrievable team. Triage
must authenticate the original coach and verify original team ownership against
trusted backend/audit records; client storage alone is not proof. Any later
restoration must be separately authorized, preserve original IDs/copies/data and
have Claude review authorization. Do not create a same-ID replacement or erase the
claim as an informal repair. If recovery is impossible, no supported client
continuation currently exists. **Coach Drew must choose** whether to accept this
conditional limitation for private beta, or require a separately reviewed backend
recovery policy before beta. Explicit claim release/transfer into another team is
a new policy, not authorized by existing D10/R1c approvals; not implemented here. Restoring access is not a guarantee of completion: if an existing
copy was changed elsewhere, firebaseImport intentionally rejects it rather than
overwriting (existing D10-05/app adapter tests). Malformed metadata or another
account's pending marker also remains fail-closed. Support must diagnose those
states separately and cannot treat a client-side marker edit as authorization.

### Authorized repair: legacy status-less claim masks pending owner recovery

**Reproduced defect:** a legacy claim without status + a matching original-team
pending marker + a prior decline yields no resume prompt. `hasUnfinishedImport`
previously returned status==='pending' as soon as any claim existed, ignoring the
pending marker. New app test on unchanged518e9e5:3 PASS/1 FAIL, missing Import plays.

**Provenance:** older producer `8dcf9a793910845f332fc6a56d5ee019d7e7ed4f` writes a
status-less claim after verifying copies but BEFORE recording the decision and
clearing pending. Interruption/storage failure between these writes can retain
both; an older decline can suppress subsequent resume. Producer ordering verified
in Git; a real historical crash/customer occurrence is NOT MEASURED. The seeded
client failure is reproducible. This falls under the existing6179690643/#69
pre-repair declined-but-pending owner-recovery requirement, not fresh re-entry.

**Smallest implemented repair:** six-line fallback in `hasUnfinishedImport`:
explicit pending/imported status retains its current behavior; a legacy status-less
claim may consult the existing pending marker only when its claim team equals the
current team. `importNotice` still validates owner, original pending team and
malformed data before this fallback. Explicit imported claims, no marker,
conflicting-team metadata and foreign accounts remain blocked/terminal. Fresh
R3 and R4 unchanged. No migration/deletion/release/transfer or new backend interface.
The same deterministic copy/readback contract still governs completion.

**Validation / missing:** new negative app cases cover other account/team,
conflicting marker, explicit imported and no pending. Full results and raw failures
in docs/evidence/import-risks-2026-10-16; no independent browser acceptance claimed.
Claude next: seed this exact legacy combination, assert owner can explicitly resume,
failed readback cannot acknowledge, correct readback yields exact IDs without
rewrite/duplication, B and replacement team cannot act, originals/claims preserved
on failure; repeat10 per engine on source35e0d77, then full candidate matrix. Do not
edit/reuse Codex assertions as independent acceptance. No further founder decision
is needed for this narrow already-authorized repair; missing-team policy stays open.

## Commands, preservation and rollback

Read39 and queue first; Git source/history checks and path searches recorded above.
Validation commands from isolated worktree, reusing installed node_modules through
a local junction (no install/lockfile changes):

- `CI=true node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand --runTestsByPath <five legacy-import test paths>`: initial35 PASS included trivial constant assertion; refined34 PASS removed it. No product failure suppressed.
- Same direct Jest command with only risk-characterization:3 PASS/1 FAIL on pre-fix implementation, raw statusless-before.log retained before any production edit.
- `CI=true node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand`: repaired full result in full-unit.log/final handoff.
- `node node_modules/typescript/bin/tsc --noEmit`: types-repair.log/final handoff.
- `CI=false GENERATE_SOURCEMAP=false npm run build`: build.log/final handoff.

No live credentials/backend/data/config used; synthetic fixtures only. No new
browser/device/staging result. No readiness/N3/FX02 fix claimed. AI disabled, film
required/blocked, MVP NO-GO. No merge/deploy/spend. Rollback: keep the new draft
unmerged; any future revert of35e0d77 restores the legacy-state dead end and must
be reviewed/retested. Do not clear originals, decisions, claims or pending markers
as rollback. PR71 and frozen candidates remain intact.


## Final implementation handoff

Draft PR72; exact tested source35e0d77887ba87d2714706f0cdbb2511b442d1a2.
**489/489 PASS**,38 suites, no skips; **TypeScript0/exit0**; **production build
PASS/exit0**, inherited SmartPlaybook ESLint warnings retained (no new warning in
changed import code). Existing raw before failure remains preserved. Build
main.82f56b00.js; this is a local release build, not deployment or acceptance.

GitHub workflows observed automatically running on the PR source: E2E38896591284,
Security gates38896591362; no new workflow/config activated by this assignment.
No final CI PASS or new independent legacy-state/browser claim is made here.
Claude must test this source with his reviewed harness and report exact integrated
candidate SHA; inherited PR workflow results are not that new independent proof.

R3 re-entry decision, R4 release-config choice, and missing-original-team recovery
policy remain open, with concrete choices above. Only the already-authorized
legacy pending-state detection repair is implemented. No merge/deployment or MVP GO.

Evidence-export correction: initial scan found one synthetic example.test address
in full-unit.log (zero JWT/Bearer matches). It is redacted in the final export;
original raw logs and their hashes are unchanged. No actual credential was found.
Final SHA256SUMS and Git-blob verification follow the corrected export.
