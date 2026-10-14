# CC-NEXT-04: Real-browser tests on the Firebase Emulator Suite

Claude, 2026-10-13. PR #54 (`claude/e2e-emulator-harness`, stacked on #53 → #49).

Nothing was merged, deployed, billed or configured live. No real credentials or footage were used. AI stays off.

## 1. Tested commit, environment, commands

| | |
|---|---|
| Tested SHA | **`2f8c61e`** (final, ×10). Also `ea01bd4` (single pass and ×10, before the T03/C01 strengthening). At `2f8c61e` the rules, functions and web-auth+bundle checks are green. The push-triggered single E2E run was auto-cancelled by the ×10 dispatch (same concurrency group) |
| CI runs | Single pass: check run `115411684648` (push). Stability ×10: Actions run `38431303292`, job `115413877940` (`workflow_dispatch`, `repeat_each=10`) |
| Browsers | **Chromium 156.0.8078.4** and **Firefox 157.0** (Playwright 1.64.0 builds), Linux `ubuntu-latest`, desktop viewport, headless. `retries: 0`, `workers: 1` |
| Firebase | firebase-tools 15.33.0. Emulators: Auth, Firestore (repo `firestore.rules`), Functions (repo `functions/`, `COACH_CORE_AI_ENABLED=false`, placeholder key). Project `demo-coach-core-e2e` |
| App build | `npm --prefix e2e run build:app`, the production CRA build with the emulator flag and fake web config |
| Run | `npx --prefix e2e firebase emulators:exec --project demo-coach-core-e2e --only auth,firestore,functions "npm --prefix e2e run test:browser -- --repeat-each=N"` |
| Local (sandbox) | `E2E_SKIP_FIREFOX=1 E2E_NO_GOOGLE_SCRIPTS=1 E2E_CHROMIUM_PATH=… firebase emulators:exec --only auth "E2E_AUTH_ONLY=1 npm --prefix e2e run test:browser"`. Auth tests **40/40** (8 × 5) on Chromium 141. The Firestore emulator jar can't be downloaded here, so Firestore-dependent tests were SKIPPED locally and run in CI only |
| Evidence | Check-run annotations (per-test PASS/FAIL/BLOCKED per browser, readable through the Checks API) and the `e2e-results-<sha>` artifact (Playwright JSON + run log, 14-day retention) |

## 2. Results

| Run | Chromium 156 | Firefox 157 |
|---|---|---|
| Single pass `ea01bd4` | **14 PASS / 0 FAIL** / 8 BLOCKED | **14 PASS / 0 FAIL** / 8 BLOCKED |
| Stability ×10 `ea01bd4` | **140 PASS / 0 FAIL** / 80 BLOCKED | **140 PASS / 0 FAIL** / 80 BLOCKED |
| **Stability ×10 `2f8c61e` (final; strengthened T03/C01)** — run `38433054754`, job `115420408550` | **140 PASS / 0 FAIL** / 80 BLOCKED | **140 PASS / 0 FAIL** / 80 BLOCKED |

Earlier runs, kept for the record:

| SHA | Result | Cause |
|---|---|---|
| `bd3ddd1` | 13/14, AI01 failed in both browsers | Origin param written as a bare URL, so the gateway's CORS failed closed. A harness config fix, not a product change (§4) |
| `12ad4d3` | 13/14 | Same cause. Diagnostics added |

## 3. Matrix by requested area

Every sign-in is **emulator authentication**: the link is recorded, not emailed, and Google is the emulator's fake account picker. **SDK-in-browser** tests drive the app's own SDK session through a test-only hook for states with no UI path. They are not counted as UI workflows.

| Area | Test | Kind | Status |
|---|---|---|---|
| **Sign-in** | A01 signed-out sees only sign-in | UI | **PASS** ×10 both |
| | A02 email link → "Waiting for beta" → beta claim → dashboard | UI, emulator email link | **PASS** ×10 both |
| | A03 link opened on another device asks for the email | UI, emulator email link | **PASS** ×10 both |
| | A04 used link can't be replayed | UI, emulator email link | **PASS** ×10 both |
| | A09 "Continue with Google" popup → beta gate → dashboard | UI, **emulator Google IdP** | **PASS** ×10 both |
| | A05 unverified account held at "Verify your email" (even with beta claim) | SDK-in-browser | **PASS** ×10 both |
| | A06 anonymous session ended with notice | SDK-in-browser | **PASS** ×10 both |
| | A08 disabled account signed out at next access check | UI + emulator admin | **PASS** ×10 both |
| | Real Google OAuth / real email delivery | — | **BLOCKED**: needs approved staging (D5) |
| **Sign-out** | A07 returns to sign-in, survives reload, clears `currentTeamId`/`offline_operations`, legacy `smartPlaybook_plays` **byte-identical** (D10-pending policy) | UI | **PASS** ×10 both |
| | Unsynced-drafts guard UI (P-12b) | UI | **BLOCKED**: Codex client |
| **Account switching** | T02 coach A → sign out → coach B on the same profile sees none of A's team; B's team invisible to A | UI | **PASS** ×10 both |
| | Per-coach Playbook drafts (P-10/P-11) | UI | **BLOCKED**: Codex client (Playbook drafts are still global `localStorage`) |
| **Cloud save/reopen** | T01 team created in UI is in Firestore and reopens in a fresh browser profile (empty storage; same browser process, so a "new device" in data terms only) | UI | **PASS** ×10 both |
| | Playbook play save → reload → reopen (P-15) | UI | **BLOCKED**: Codex client (no cloud save for plays yet) |
| **Practice-plan edits** | AI01 planner POSTs to the real (emulated) gateway function, which refuses with "AI features are turned off" (kill switch). No provider request **from the browser**. The server-side provider call is not observable here; the functions unit test asserts `provider.calls.length === 0` when AI is disabled (`functions/test/gateway.test.js`) | UI | **PASS** ×10 both |
| | Plan edit → save → reload identical (P-16) | UI | **BLOCKED**: Codex client (planner has no save/edit); AI generation also gated by founder approval |
| **Concurrent edits** | C01 two devices of one coach load revision 1: first save accepted; stale second save and revision-less save denied; stored document equals device 1's edit with every other field unchanged (full-document equality) | SDK-in-browser (server half; no client transaction yet) | **PASS** ×10 both |
| | Conflict screen (reload / keep copy / export) (P-14) | UI | **BLOCKED**: Codex client |
| **Access denial** | T03 coach B is denied: reading A's team, an existing A play and an existing A plan; editing all three; creating a play or plan in team A. **Positive control:** the identical payloads succeed in B's own team, so the denials come from ownership, not malformed data. A's documents are unchanged and nothing was injected. B's UI never lists A's team | SDK-in-browser + UI | **PASS** ×10 both |
| **Other blocked** | Legacy-play import after D10 (P-13); offline replay per session (P-17) | UI | **BLOCKED**: D10 + Codex client |
| **Film** | all | — | **BLOCKED**: not implemented; D1–D7 |
| **Physical devices** | iPad / Android tablet | — | **NOT TESTED** (outstanding, Day 6) |

**Totals per engine per pass:** 14 runnable (10 UI or UI+admin, 4 SDK-in-browser) **PASS**; 8 BLOCKED. A BLOCKED entry is a `test.fixme` naming its dependency; it never runs and is never counted.

## 4. Findings

1. **Production bundle leak, caught and fixed before push.** The first version shipped the test-hook chunk in normal builds, because webpack can't prove an *undefined* flag false. Fixed in two ways:
   - `.env.production` pins `REACT_APP_USE_FIREBASE_EMULATORS=false`;
   - the flag is compared inline.

   The bundle scan now asserts that no hooks and no emulator endpoints ship (12/12 checks, CI green). The prebuild guard and the app both refuse emulator mode for a non-`demo-*` project.
2. **Config trap for staging.** `COACH_CORE_ALLOWED_ORIGINS` is a list param: in `.env` it must be a JSON array. A bare URL fails to parse, and CORS then refuses every browser, which fails closed but breaks AI for all coaches. Added as staging smoke check SEC-09 (PR #52).
3. **Emulator blind spots.** The Functions emulator sets `enableCors` and `skipTokenVerification`, so these tests prove **neither** the origin allowlist **nor** ID-token signature checks. Added as staging smoke checks SEC-07 and SEC-08. Firestore rules are fully enforced in the emulator.
4. **Contract bounds** raised by Codex are resolved in #53 `a4cea1e` (plan name ≤200, gateway notes ≤5000). The CI rules job is green with the new boundary tests, and functions pass 73/73.

## 4a. Open intermittent failure: A09 (emulator Google popup)

- **The failure:** one Chromium failure on integration candidate 2 `c112b68` (check run `115430223852`). The beta-gate heading did not appear within 10 s after submitting in the emulator popup. Firefox passed in the same run.
- **The app code is identical to #54.** #40 changes only two test files.
- **No recurrence** in 40 later runs (×10 on PR #54 `f9ba83c` run `38436733211` and on candidate 2 `9b84573` run `38436729577`, both engines: 140/140 each). About 1 failure in about 90 A09 executions overall.
- **Cause not established.** A09 is the only test that depends on an external host (`apis.google.com`, which the SDK loads for the popup flow), but that is a hypothesis, not a finding.
- `f9ba83c` adds failure diagnostics: visible headings/alerts, popup state, and a network/console timeline in the CI annotation.
- **Status: OPEN.** No timeout was raised and no retry was added. It will be classified from the next occurrence.

## 5. Independent verification

A separate agent that had not seen this work checked the report against the Checks API and the code at `ea01bd4`. It confirmed every count, browser version, run ID and event, `retries: 0`, fixme-only BLOCKED entries, the hook gating, the demo-only guard, `.env.production`, the bundle-scan checks, the rules (45/45) and functions (73/73) annotations, and that no secrets or real project IDs were committed.

It flagged three tests whose wording claimed more than they asserted:
- **AI01:** server-side provider not observable from the browser. The wording is corrected above.
- **T03:** lacked existing-document reads/edits and a positive control.
- **C01:** used a partial match.

T03 and C01 were **strengthened** (not reworded) and the ×10 run was repeated on the new SHA (§2, final row).

## 6. Regression on this branch

- Web jest: 362/362. The one suite-load failure (FieldMemo) also fails on the base branch and is fixed by #40, which is not in this stack.
- tsc: 0.
- CI: rules emulator, functions, web auth and bundle scan all **success** at `ea01bd4`.

## 7. D10 legacy import (PR #55): independent review and real P13 acceptance (2026-10-14)

> **Historical record, preserved unchanged.** This was the verdict on PR #55 as delivered (FAIL: R1/R2 10/10 on both engines; R0 rules blocker fixed). R1, R2 and R5 were re-tested against the #59/#60/#61 stack in **§8**; the failures below remain the evidence of the original defects. "CC02/CC03 not implemented" in §7.6 was true at that time; see §8 for the current status.

**Verdict: FAIL**, with 2 open founder-rule defects (R1, R2) in Codex-owned client code. The core import is verified in real browsers against real rules **only after** a Claude rules fix. Mocked-SDK tests did not and could not prove server authorization.

### 7.1 What was tested

| Item | SHA |
|---|---|
| PR #55 reported source | `6a412e7` (code), docs/evidence head `819802c` |
| PR #55 base | #54 `66dfadf` (stale: my later #54 commits show as "removed" in GitHub's diff; a real merge keeps both, clean) |
| Acceptance branch (this test layer, no Codex files changed) | `claude/d10-p13-acceptance`. ×10 at **`e4e139f`**; later heads add diagnostics and the §7.7 test hardening |
| Rules fix | #53 **`51760a4`** (measurement test `89617d4`) → #54 `ea721e1` |
| Combined candidate | `claude/integration-candidate-2026-10-14`. ×10 at **`e43b525`** (code = acceptance branch + #40's 2 test-file repairs; plus docs and a 4-line `.gitattributes` union) |

**Environment:** Chromium 156.0.8078.4 and Firefox 157.0 (Playwright 1.64.0) on Linux `ubuntu-latest`. Firebase emulators via firebase-tools 15.33.0, project `demo-coach-core-e2e`, repo `firestore.rules`. `retries: 0`, `workers: 1`. Synthetic data only. Emulator authentication only. No provider calls.

**Commands:**
- the CI workflow `e2e-emulator.yml` (push = ×1; `workflow_dispatch repeat_each=10`);
- locally `CI=true npx react-scripts test --watchAll=false`, `npx tsc --noEmit`, `bash scripts/security/verify-release-build.sh`.

### 7.2 Review of the implementation (code, not report)

| Requirement | Finding |
|---|---|
| Explicit account/team consent | ✔ The prompt only appears for a signed-in coach whose selected team they own, and names the team. Nothing is written **to the cloud or to the originals** before "Import plays". The Playbook does write its own scoped drafts key, `[]`, on mount |
| Create-only, idempotent copies | ✔ Deterministic id = SHA-256 of uid + team + full source play. A transaction creates the copy, or verifies an identical existing one. **But it was blocked by the rules (R0, fixed)** |
| Exact server read-back before success | ✔ `getDocFromServer` plus canonical full-content comparison for every copy; the decision is written only after all copies verify (D10-10) |
| Property and optional-timestamp fidelity | ✔ All player/route properties, including extras, are kept. Timestamps keep millisecond precision. Absence is encoded in the id flags (D10-01, D10-11) |
| Partial failure and safe retry | ✔ D10-04: kept partial copy, no decision, retry without rewrite |
| Account/team switch while pending | ✔ Stale completions are discarded and nothing is attributed to another coach (D10-07, D10-08). ✗ The interrupted import is re-offered as new in the other team (**R2**) |
| Refusal to overwrite a changed remote copy | ✔ D10-05 |
| Both legacy formats preserved, no cross-format conversion | ✔ `smartPlaybook_plays` and `coachcore-playbook` are byte-identical in every test; the standalone format is never read |
| Real legacy format accepted | ✔ `PlayController.savePlay` writes exactly the accepted keys with canonical ISO timestamps. The parser is stricter than the app's own validators: it requires `player.number`/`id` and `route.id`/`type`, which today's UI always sets. Other shapes fail the whole batch visibly (originals kept) |
| Cross-account exposure | ✔ Coach B cannot see or read A's copies (D10-06, D10-09). ✗ B is still **offered** the device plays A already imported (**R1**) |

### 7.3 Defects

| ID | Severity | Owner | Status | Detail |
|---|---|---|---|---|
| R0 | **Blocker** | Claude (rules) | **FIXED** `51760a4` (comment corrected `3ec22cd`) | `get` on a missing play id was denied (`resource.data` on a null resource), so `copy()`'s first transactional read failed: **0 copies in every import** (CI `3806f40`; rules test `89617d4` FAIL). Fix: `allow get: if isBetaUser() && (resource == null || ownsTeam(resource.data.teamId))` for plays and practicePlans; `list` unchanged; negative controls pass; rules 48/48. **Side effect:** a beta user can tell whether an id exists (not-found vs permission-denied); accepted because copy ids are SHA-256 of uid + team + content and other ids are random |
| R1 | High (founder rule) | Codex | OPEN | D10-06b FAIL 10/10 on both engines. Bounded fix: a device-level claim after a verified import, so another account is not offered the same originals |
| R2 | High (founder rule) | Codex | OPEN | D10-07b FAIL 10/10 on both engines. Bounded fix: a pending marker before the first write; another team's prompt must point back to the unfinished team |
| R3 | Low | Codex | OPEN | "Not now" is stored as a permanent decline with no later re-offer. Rename it or add a re-entry point |
| R4 | Info | Codex / deploy decision | OPEN | `D10_APPROVED = true` is a build constant, so the prompt ships in release builds |
| R5 | Medium (data loss) | Codex | OPEN | Code review (found by the independent verifier): a signed-in coach with no team, or not owning the selected team, gets `libraryKey = null`. Saving a play still says "kept as a device draft; cloud save pending", but nothing is stored, so the play is lost on reload. Not yet covered by an E2E test (needs canvas player placement) |
| H1 | Intermittent | Claude (harness) | OPEN | Firefox only, **3 occurrences** across two ×10 runs (0 in the two final ×10 runs): "Team created successfully!" not seen within 10 s at team creation (D10-09, T02, D10-02). Chromium 0/20. Cause not established; diagnostics added in #54 `3989218`. No timeout raised, no retry added |

### 7.4 Results

| Run | Chromium 156 | Firefox 157 |
|---|---|---|
| ×1 before rules fix `3806f40` | 16 PASS / 11 FAIL (D10 import never creates copies) | same |
| ×1 after fix `9aa2666` | 26 PASS / 2 FAIL (06b, 07b) / 7 BLOCKED | same |
| ×10 acceptance `e4e139f` (job `115645207229`) | **260 PASS / 20 FAIL** / 70 BLOCKED. FAIL = 06b 10/10 + 07b 10/10 | **258 PASS / 22 FAIL**. FAIL = 06b 10/10, 07b 10/10, D10-09 1/10 (H1), T02 1/10 (H1) |
| **×10 FINAL, hardened tests**, acceptance `e095c3d` (job `115657677831`) | **260 PASS / 20 FAIL** / 70 BLOCKED. FAIL = 06b 10/10 + 07b 10/10 | **260 PASS / 20 FAIL**. FAIL = 06b 10/10 + 07b 10/10 (H1 did not recur) |
| **×10 FINAL**, candidate 3 `c144cfc` (job `115657693030`) | **260 PASS / 20 FAIL**. Same two tests | **260 PASS / 20 FAIL**. Same two tests |
| ×10 candidate 3 `e43b525` (job `115645212221`) | **260 PASS / 20 FAIL**. FAIL = 06b 10/10, 07b 10/10 | **259 PASS / 21 FAIL**. FAIL = 06b, 07b 10/10; D10-02 1/10 (H1) |

**Per test (×10, both engines, both runs):**
- PASS 10/10: D10-00, 01, 03, 04, 05, 06, 07, 08, 10, 11.
- D10-02: 10/10 except one Firefox H1 occurrence.
- D10-09: 10/10 except one Firefox H1 occurrence.
- All 14 earlier harness tests: PASS 10/10, except T02's one Firefox H1 occurrence.
- **BLOCKED (7, Codex CC02/CC03):** P-10, P-11, P-12b, P-14, P-15, P-16, P-17. P-13 is now real.

**Combined candidate 3 `121264f`:**
- web jest **382/382**, 20/20 suites (#40 fixes FieldMemo);
- tsc 0;
- release-build proof **13/13**: no hooks, emulator wiring or demo values; the guard refuses emulator mode for staging. Also 13/13 in CI.

### 7.5 Evidence

`docs/evidence/d10-acceptance/` contains 15 files plus `SHA256SUMS.txt` (files 14–15 are the final hardened ×10 runs):
- the CI annotations of every run listed above, including the failing ones and the truncated first ×10;
- baseline jest/tsc at `52fc3d9`;
- candidate-3 jest/tsc/release proof/manifest.

Job logs and Playwright artifacts (traces, screenshots) are kept by GitHub for 14 days under each run's `e2e-results-<sha>` artifact. **NOT MEASURED:** physical devices; real Auth/email/Google; staging; performance.

### 7.6 Scope reminder

D10 is one slice. CC02 (ordinary cloud editing, conflict recovery, sign-out recovery) and CC03 (practice-plan save/reopen) are **not implemented**, and their 7 tests remain BLOCKED. **MVP stays NO-GO.**

### 7.7 Independent verification and test hardening

A separate agent that had not seen this work checked §7 against the Checks API and the code. It **confirmed**:
- every count, run ID, SHA and workflow_dispatch event;
- R0's measurement and fix, with tenancy unchanged for existing documents and lists;
- R1 and R2 as real code behaviour;
- the evidence checksums, and no secrets;
- that the acceptance branch changes no Codex-owned file.

It found weaker-than-titled tests. They were fixed, not reworded away:

| Test | Problem | Change |
|---|---|---|
| D10-06b, D10-07b | Could pass silently after a fix (checks that ran once, without waiting) | Positive anchors: the import region must show the agreed notice (R1: "already imported by another account"; R2: names the unfinished team) **and** offer no Import button |
| D10-07 | Checked before the stale completion could land | Keeps holding later commits, waits for the held copy to land (copies = 2), then a documented **5 s observation window** for the negative claim (no 3rd commit, no decision). This is the only timed wait; it is not a retry |
| D10-08 | Title claimed an in-session account switch | Retitled: sign-out reloads the page by design. An in-session switch without a reload is unreachable in the current UI |
| D10-01 | Title claimed decision ordering | Retitled; the ordering is proven by D10-10 |

The rules comment was corrected (existence oracle), and R5 was added to §7.3.


## 8. Re-review of #59 / #60 / #61: CC02/CC03 delivered, D10 R1/R2/R5 repairs (2026-10-14 afternoon)

**Status: implementation delivered; independent acceptance pending.** Most scenarios pass ×10 on both engines, but two Codex-owned defects fail 10/10 (**L1**, **R1b**), and Firefox showed one more intermittent timeout. **MVP stays NO-GO.**

### 8.1 Exact SHAs

| Item | SHA |
|---|---|
| #59 CC02/CC03 client (docs head) / tested application | `c21c0c6` / `ff9b421` |
| #60 dependency repair (docs head) / runtime | `2cf1a5c` / `da8ebe1` (dependency commit `92d162c`) |
| #61 staging-readiness docs (stack head) | `3c7c4b0`. Its runtime is identical to #60 |
| #53 rules fix present in the stack | `51760a4` (+ comment `3ec22cd`), via #54 `ecc6400`. Verified: `allow get … resource == null` at `firestore.rules` lines 137 and 187 |
| Changes to Claude-owned files in #59/#60/#61 | none (empty diff for rules, functions, auth, `src/firebase.ts`, `e2e-support`, `e2e/`, `scripts/security`, `.github`) |
| Acceptance branch (#61 + #56 + this review's tests and fixes) | `claude/cc-acceptance-2026-10-14`. ×10 at `6f6544d`; **final ×10 at `709e0f4`** (strengthened tests, §8.7) |
| Combined candidate (test-only, never merge) | `claude/integration-candidate-2026-10-14b`. ×10 at `9b5780e`; **final ×10 at `c858d1d`** (code = acceptance branch; docs union) |

### 8.2 Code review (implementation, not reports)

| Area | Finding |
|---|---|
| REST create-only (`createOnly.ts`) | ✔ Atomic `documents:commit` with `currentDocument.exists=false`. The ID token is sent only to Firestore and rules are enforced (create rule). `ALREADY_EXISTS` leads to read-back and compare, never an overwrite. The emulator endpoint sits behind the compile-time flag and is **absent from release builds** (release proof 13/13). ⚠ The code comment still says missing-document reads are denied, which is outdated since #53 |
| Existing-document saves (`gateway.ts`) | ✔ Transaction checks team ownership and revision; acknowledgement read-back from the server; a lost acknowledgement after a successful commit is detected as a safe retry; stale revision raises `Conflict` |
| Drafts (`drafts.ts`, `useDocument.ts`) | ✔ uid + team + kind + writer envelopes; foreign or corrupt envelopes are never adopted or overwritten; generation guards discard stale completions; per-tab writers |
| D10 R1 / R2 / R5 | ✔ Device claim written only after full verification; pending marker written before the first copy; no-team guard |
| Legacy global queue | ✔ Replay disabled (quarantined). ✗ My sign-out cleanup still deleted it (**fixed**, §8.3). ✗ The legacy `savePlay`/`savePracticePlan` offline branches still **append** to it (part of L1) |
| Migration Banner (legacy `coach-core-ai-<teamId>`) | ✗ **L1**: uploads without consent read-back, swallows errors, shows success regardless, and **deletes the original** |

### 8.3 Defects, by status

| ID | Owner | Verified status | Tested SHA | Evidence |
|---|---|---|---|---|
| R0 rules missing-id get | Claude | **VERIFIED FIXED**, present in the stack | `6f6544d` / `9b5780e` | D10-00 PASS 10/10 both engines |
| R1 cross-account offer, **finished import** | Codex | **VERIFIED FIXED** | same | D10-06b PASS 10/10 ×2 engines ×2 runs (positive anchor: "already imported by another account") |
| **R1b** cross-account offer while A's import is **unfinished** | Codex | **STILL FAILING** (new; found by the independent verifier) | `709e0f4` / `c858d1d` | D10-06c FAIL 10/10, both engines, both runs. The claim is written only on completion. Bounded repair on #59 (device-level in-progress claim) |
| R2 interrupted import re-offered | Codex | **VERIFIED FIXED** | same | D10-07b PASS 10/10 (names the unfinished team, no Import button) |
| R5 no-team silent loss | Codex | **VERIFIED FIXED** | same | D10-12 PASS 10/10 (truthful block, no Save, no drafts) |
| L0 sign-out deleted the quarantined legacy queue (#61 escalation) | Claude (auth) | **VERIFIED FIXED** in `12e386f` | same | CC-L0 FAIL ×1 on `13af9e4` (both engines) → PASS 10/10. Unit test and A07 updated to the preservation contract |
| **L1 Migration Banner deletes legacy data / false success** | Codex | **STILL FAILING** (new) | same | CC-L1 FAIL 10/10, both engines, both runs. Bounded repair requested on #59 |
| R3 "Not now" is permanent | Codex / Coach Drew | OPEN (disclosed limitation) | — | — |
| R4 `D10_APPROVED` constant in release builds | Codex / deploy decision | OPEN | — | — |
| H1 Firefox team-creation toast | Claude | OPEN; 0 occurrences in 1,660 Firefox executions this afternoon (2 × 410 + 2 × 420) | `6f6544d` / `9b5780e` / `709e0f4` / `c858d1d` | annotations 03/04/14/15 |
| **H2** Firefox D10-07 test timeout (60 s) | Claude (harness) | OPEN, new: **1/10** on Firefox at `709e0f4`; 0/10 on candidate `c858d1d`; Chromium 0/20. Cause not established; no retry or timeout change | `709e0f4` | annotation 14 |
| Codex P14 Firefox background-tab reload timeout | Codex | Not reproduced by CC-P14 (10/10 ×2 Firefox); cause not established, kept OPEN | same | — |
| Standalone Playbook touch exit (Windows) | Codex | OPEN (separate repo) | — | — |
| Physical devices, staging, real auth/CORS/token | — | **NOT MEASURED** | — | — |

**Legacy queue.** It is still appended to by the legacy offline save branches (part of L1). After the sign-out fix it survives across accounts, so on a shared device the one array can hold entries from more than one coach. Nothing replays it today (CC-L0 and CC-P17 watch request bodies for the planted marker). If replay is ever re-enabled, it must be per-user with owner and team checks.

**AI01 contract change.** #59 removed the planner's "Generate with AI" button, so the old AI01 timed out (both engines, `13af9e4`). It now asserts that no AI action is offered and no AI request is made. **AI01b** (SDK-in-browser, via the app's own AI client) asserts that the emulated gateway refuses with `ai-disabled` and that no **browser-side** provider request is made. Server-side provider calls are not observable from the browser; the functions unit test asserts `provider.calls.length === 0` when AI is disabled. Both PASS 10/10.

### 8.4 Results (retries 0, workers 1, Chromium 156.0.8078.4 / Firefox 157.0)

| Run | Chromium | Firefox |
|---|---|---|
| ×1 measurement `13af9e4` (before the auth fix) | 37 PASS / 3 FAIL (AI01 old contract, L0, L1) | same |
| ×1 `12e386f` | 40 PASS / 1 FAIL (L1) | same |
| **×10 acceptance `6f6544d`** (job `115973570012`) | **400 PASS / 10 FAIL** (L1 10/10) | **400 PASS / 10 FAIL** (L1 10/10) |
| **×10 candidate 4 `9b5780e`** (job `115973617866`) | **400 PASS / 10 FAIL** (L1 10/10) | **400 PASS / 10 FAIL** (L1 10/10) |

**PASS 10/10 in every engine and run:**
- **CC02/CC03:** CC-P10, P10b, P11, P12, P14, P15, P16, P16b, P17, L0.
- **D10:** D10-00..12.
- **Harness:** E2E-A01..A09, AI01, AI01b, C01, T01..T03.

**Nothing is BLOCKED any more** (the P-placeholders were replaced by real tests).

**Candidate 4 `951e583`/`9b5780e`, clean `npm ci --legacy-peer-deps` from its own lockfile:**
- jest **416/416** (26 suites), tsc 0;
- release-build proof **13/13**;
- production `npm audit` **0**. Full-graph dev/tooling advisories remain as disclosed in #60.

### 8.5 What the tests cover (independent of Codex's `tests/coaching-ui/**`)

- **CC-P10:** shared profile, A "Sign out anyway". B gets a blank planner, no A records, no recoverable A drafts, no B drafts, and nothing uploaded. A's draft is retained under A.
- **CC-P10b** (SDK-in-browser): B is denied read/update of A's plan and create into A's team; the same payload in B's team succeeds.
- **CC-P11:** team switch while the create commit is held. The copy lands in team A only; team B shows nothing; no A content under team B's keys.
- **CC-P12:** Cancel keeps edits. A failing Sync shows an error, keeps the coach signed in and the draft retained, with nothing uploaded. Export downloads only this coach's drafts, with content. Sync now uploads, then signs out.
- **CC-P14:** two tabs in one profile. Stale save leads to the conflict dialog. Export my version contains my fields and the remote revision. Keep a copy gives both documents with the server copy unchanged. Reload remote shows the server version, at revision 3.
- **CC-P15:** Shotgun play (11 players) at revision 1. Rename → revision 2; players and routes identical; createdAt unchanged; updatedAt advances. Fresh-profile reopen does not write.
- **CC-P16:** 200-character name, 5000-character notes, focus edit and reorder are exact in Firestore and after a fresh-profile reopen.
- **CC-P16b:** seeded AI plan. A notes edit keeps every other field, including `source`/`aiRequestId`/safety/hydration, at revision 2. No AI request.
- **CC-P17:** offline save is pending and never shown as "saved"; reconnect acknowledges it. A's stranded pending envelope is not uploaded while B is signed in. The legacy queue is not replayed.
- **CC-L0:** quarantined queue bytes survive sign-in, reconnect, sign-out and reload; nothing is replayed.
- **CC-L1:** the "Migrate Now" original must be preserved, and success must mean a verified cloud copy.

**Timed waits:** the only one is D10-07's documented 5 s negative window. **Codex's P14 background-tab note:** CC-P14 brings each tab to the front before acting, so it does not prove behaviour for background tabs.

### 8.6 Evidence

`docs/evidence/cc-acceptance-2026-10-14/` contains 12 files plus `SHA256SUMS.txt`:
- CI annotations for every run above, including failures;
- rules and web/bundle checks;
- candidate-4 `npm ci`, jest, tsc, release proof, manifest and production audit.

Historical D10 evidence stays in `docs/evidence/d10-acceptance/`.

### 8.7 Independent verification and final run

A separate agent re-checked §8 against the Checks API and the code. It **confirmed**:
- every SHA, run ID, count and code-review claim;
- R1, R2, R5, R0, L0 and L1.

It found weaker-than-claimed tests and stale or overstated wording. All were addressed:
- **Replay probes (CC-L0, CC-P17):** the planted queue entries were rule-invalid, so a replay would not have been visible. Now **rule-valid entries plus a request-body watch** for the marker.
- **CC-P10:** "nothing uploaded" is checked across plays and plans, by name, and by request body.
- **CC-P11:** a **positive** check that A's pending draft is kept under team A.
- **CC-P14:** after Reload remote the client is at the server revision (a follow-up save becomes revision 4, with no conflict).
- **CC-L1:** records which toast the app actually showed, so there is no silent skip. Result: the app reported **success** and deleted the original.
- **R1 gap:** measured as **R1b** (D10-06c).
- **CC-P17:** the stranded-envelope step is retitled as a structural guard, because the app never retries other accounts' envelopes.
- **AI01b:** wording now says browser-side only.
- **Docs:** smoke AUTH-08's retention is marked as a *proposed* risk, not a founder decision. The film review's queue and deletion requirements are marked superseded. The tsc evidence now records its exit code (0).

**Final ×10, retries 0:**

| Run | Chromium 156 | Firefox 157 |
|---|---|---|
| Acceptance `709e0f4` (job `116004898887`) | **400 PASS / 20 FAIL** (CC-L1 10/10, D10-06c 10/10) | **399 PASS / 21 FAIL** (CC-L1 10/10, D10-06c 10/10, D10-07 1/10 timeout = H2) |
| Candidate 4 `c858d1d` (job `116005526509`) | **400 PASS / 20 FAIL** (same two) | **400 PASS / 20 FAIL** (same two) |

Every other test, 40 per engine, passes 10/10 in both runs. The only exception is Firefox D10-07 (9/10) on the acceptance run. Evidence files 13–15 are in `docs/evidence/cc-acceptance-2026-10-14/`.

## 9. FX-03 fix, L1/R1b repairs, integrated candidate 6 (2026-10-14 evening)

§7 and §8 stay as historical evidence. Their failures (CC-L1 10/10, D10-06c 10/10, H2 1/10) are not rewritten.

### 9.1 Exact SHAs

| | SHA | Owner |
|---|---|---|
| Acceptance head (L0, FX-03, CC-L1 re-anchor, A10) | `ddae645` (`dc36080` FX-03, `12e386f` L0) | Claude |
| L1/R1b repairs, PR #64 final | `8f0d9f7` (application `f33a8a8`, plus Codex test-lane label fix `ed4978b`, plus docs); contains `ddae645` | Codex |
| **Integrated candidate 6** (test-only, never merged) | **`4757eaf`** on `claude/integration-candidate-2026-10-14d` = candidate 4 `c858d1d` + #52 `50ae718` + #64 `8f0d9f7`. `src/`, `e2e/`, `tests/`, `firestore.rules`, `functions/`, `package*.json` and `.github/` are byte-identical to #64 `8f0d9f7` | Claude |
| Frozen, unchanged | #59 `c21c0c6`, #60 `2cf1a5c`, #61 `3c7c4b0` | Codex |

### 9.2 FX-03 (Claude, auth/UI): sign-in form shown before logout's reload

**Defect (#62, Codex probe FAIL 5/5 per engine).** `logout` → `signOut` → SDK `onAuthStateChanged(null)` rendered the interactive sign-in form in the *old* document, while `clearUserScopedState` and `location.assign('/')` were still pending. Input typed there was lost on the reload.

**Fix.** `useAuth` sets a `signing_out` status before `signOut()`. `AuthGate` renders only a neutral "Signing out…" status: no form, no buttons, no coaching content. `onAuthStateChanged` is ignored for the rest of that sign-out. The DraftSignOut guard still runs first. Recovery data is unchanged: scoped drafts and the quarantined `offline_operations` are preserved, and only `currentTeamId` is cleared.

Files: `src/hooks/useAuth.tsx`, `src/components/auth/AuthGate.tsx`, `src/hooks/__tests__/useAuth.test.tsx`, `e2e/tests/auth.spec.ts`.

**Test: E2E-A10.** It holds CacheStorage cleanup, the same lifecycle point as #62.

While the old document is alive it asserts:
- status "Signing out";
- 0 email inputs, 0 Google buttons, 0 "Welcome,".

After the reload it asserts:
- the typed email survives and no further reload occurs;
- draft and queue are byte-identical;
- `currentTeamId` is removed.

| | Result |
|---|---|
| Before fix, local Chromium | **FAIL 3/3** (evidence 17) |
| After fix, local Chromium | **PASS 5/5** (evidence 18) |
| After fix, CI ×1 `ddae645` | PASS 1/1 per engine (evidence 16) |
| Candidate 6 ×10 | **PASS 10/10 Chromium, 10/10 Firefox** |

### 9.3 L1 and R1b (Codex), independently reviewed and tested

**L1 contract**, agreed on #39 as option (a):
- `MigrationBanner` renders null.
- `migrateFromLocalStorage` throws and never deletes.
- The six legacy plan/play save, update and delete paths reject when offline instead of queueing and reporting success.

CC-L1 was re-anchored to this contract. Its positive anchors are:
- the signed-in dashboard for the team is rendered;
- the legacy `coach-core-ai-<teamId>` blob is present.

It then requires:
- no Migrate Now or Migrate Your Data, and no success toast;
- the blob byte-identical after navigation;
- no cloud copy, and no POST carrying the legacy play.

The new CC-L1 **FAILED 1/1 per engine on the pre-repair code** (`ddae645`, `Migrate Now` count 1), so it discriminates.

**R1b.** `importLegacy` writes a device-level `legacyImportClaim {status:'pending', uid, teamId}` before any cloud request. `importNotice` then:
- blocks any other account while the claim is pending;
- also blocks on another account's pre-repair per-account pending marker;
- fails closed on a malformed claim;
- lets only the same account and original team resume.

The `storage` event refreshes the offer across tabs.

**D10-06c is byte-identical** to the version that failed 10/10 at `709e0f4` and `c858d1d`: `e2e/tests/legacy-import.spec.ts` and `e2e/tests/support/` show no diff `709e0f4..4757eaf`. Since `709e0f4`, the only e2e changes are A10 (added) and the CC-L1 re-anchor.

Code review found no remaining path in `src/` (excluding `_archived`, which is not imported) that deletes legacy originals or queues a legacy write.

### 9.4 Results, candidate 6 `4757eaf`, retries 0, workers 1

**Clean preflight** (evidence 20):
- `npm ci --legacy-peer-deps` OK;
- jest **434/434** (29 suites);
- tsc **0**;
- `npm audit --omit=dev` **0 vulnerabilities**.

Codex's `docs/evidence/l1-r1b-repairs/SHA256SUMS.txt` verifies.

**×10, Actions run `38632770550`, job `116088458893`** (evidence 21):

| | Chromium 156.0.8078.4 | Firefox 157.0 |
|---|---|---|
| PASS / FAIL / BLOCKED / SKIPPED | **430 / 0 / 0 / 0** | **430 / 0 / 0 / 0** |
| Release-build proof | 13/13 | |

All 43 tests pass 10/10 in each engine:
- **Previously failing, now verified fixed on this SHA:** CC-L1, D10-06c.
- **Fixed by Claude:** E2E-A10 (FX-03), CC-L0.
- **Still verified:** D10-06b, D10-07, D10-07b, D10-12, CC-P10..P17, AI01, AI01b, A01..A09.

The job took 28 m 50 s, against 42–49 min for earlier ×10 runs. **This is not explained** and is recorded only as an observation.

The ×1 sanity run on candidate 5 `f85cde2` (same runtime, before Codex's final docs head) was green. It is **not counted** (evidence 19).

### 9.5 Status after candidate 6

| Item | Status |
|---|---|
| R0, R1, R2, R5, L0, CC02/CC03 scenarios | **Verified fixed** (unchanged from §8, re-confirmed 10/10 per engine at `4757eaf`) |
| **L1** | **Verified fixed** at `4757eaf` (CC-L1 10/10 per engine; FAIL on pre-repair) |
| **R1b** | **Verified fixed** at `4757eaf` (D10-06c 10/10 per engine; same test FAILED 10/10 before) |
| **FX-03** | **Verified fixed** at `4757eaf` (A10 10/10 per engine; FAIL 3/3 before) |
| **H2**, Firefox D10-07 timeout | **OPEN.** 1/10 at `709e0f4`, then 0/10 at `c858d1d` and 0/10 at `4757eaf`. The cause is unexplained, so passing batches do not close it |
| **FX-02**, unexplained 51 s locator delay (Codex) | **OPEN** |
| Genuine hidden or background-tab behaviour | **NOT MEASURED** (CC-P14 and the probes bring tabs to the front; visibility was always `visible`) |
| R3 "Not now" permanent; R4 `D10_APPROVED` release constant; standalone touch exit | **OPEN / tracked** |
| Physical devices, staging | **NOT MEASURED** |

These are emulator results with demo data. They do not establish production behaviour. **MVP: NO-GO.** No merge, deploy, spend, live configuration change, real credentials or footage. AI stays off.

### 9.6 Evidence (`docs/evidence/cc-acceptance-2026-10-14/`, SHA256SUMS updated; files 01–15 unchanged)

| File | Contents |
|---|---|
| 16 | ×1 CI on pre-repair `ddae645`: CC-L1 and D10-06c FAIL, A10 PASS, both engines |
| 17 / 18 | Local A10 before (FAIL 3/3) and after (PASS 5/5) the FX-03 fix |
| 19 | ×1 sanity, candidate 5 (not counted) |
| 20 | Candidate 6 clean preflight |
| 21 | **Candidate 6 ×10 final annotations** |

### 9.7 Independent verification of §9, test hardening, and candidate 7

A separate agent re-checked §9 against the Checks API, git and the code. It found **no refuted facts**: every SHA, ancestry claim, run, count, duration and hash was confirmed. It raised weaknesses, all addressed or recorded:

1. **A10's "before" evidence was weaker than stated.** On pre-fix code, file 17 failed at the *new* "Signing out" status. That shows the fix is absent, not that the test catches the defect. A10 now:
   - checks the defect's symptoms first (no "Welcome,", no sign-in email field, no Google button);
   - runs a **MutationObserver in the old document** that records any sign-in form, including late renders;
   - re-checks at the end that no later reload happened.

   Against pre-fix `src` (`dda4107`), it **FAILS 3/3 at the sign-in email field**, which is the defect itself (evidence 22). On the fix, the auth suite passes ×5, 45/45 (evidence 23).
2. **`bodyWatch` was possibly vacuous.** Firestore WebChannel bodies are form-urlencoded, and every marker contains spaces. The watch now matches raw *and* URL-decoded bodies, and CC-L1 uses it. **CC-W0 positive control:** a marker with spaces is detected on both the app's plan save and an SDK WebChannel write.

   The earlier L0, P17 and L1 conclusions did not depend on the watch: each also checks the server through the Admin SDK, which is unaffected.
3. **New defect R1c (Codex, `src/features/legacy-import/**`).** `declineImport` keeps the pending device claim and A's pending marker. If A clicks "Not now" on an interrupted import, A is never offered again, and every other account is told to return to A. That is a **dead end no account can act on**. Originals are kept. A pending claim whose original team is gone has the same problem. Probe **D10-06d**: it does not prescribe the fix, only that A is re-offered *or* B is offered.
4. **Not covered by a test:** the malformed-claim fail-closed branch is confirmed by code reading only.
5. **The 28 m 50 s duration is partly explained.** Earlier ×10 runs had 20–21 failing tests consuming timeouts.
6. **The `repeat_each=10` dispatch input** is not returned by the REST API. It is inferred from 430 = 43 × 10 and from the reporter's "10/10" counts.
7. **Low, pre-existing:** `loadOfflineQueue()` parses `offline_operations` without a try/catch at module load, so malformed bytes would crash start-up. Also, if sign-out cleanup ever hung, "Signing out…" has no timeout. No realistic path to that was found.

**Candidate 7 `d12d273`** on `claude/integration-candidate-2026-10-14e` = candidate 6 + acceptance `e9952db`. It adds tests and docs only: `src/`, `functions/`, `firestore.rules`, `package*.json`, `tests/` and `.github/` are identical to `4757eaf`.

**×10, retries 0, run `38638354889`, job `116107889507`** (evidence 24):

| | Chromium 156.0.8078.4 | Firefox 157.0 |
|---|---|---|
| PASS / FAIL / BLOCKED / SKIPPED | **440 / 10 / 0 / 0** | **439 / 11 / 0 / 0** |
| Failures | D10-06d 10/10 (**R1c**) | D10-06d 10/10 (**R1c**); **D10-07 1/10 timeout (H2 recurred)** |
| Release-build proof | 13/13 | |

All other 44 tests per engine pass 10/10, including hardened A10, CC-W0, CC-L1 and D10-06c.

**H2 recurred** on the same runtime that passed 10/10 at `4757eaf`. Firefox D10-07 has now failed 2 of 40 counted executions: 1/10 at `709e0f4`, 0/10 at `c858d1d`, 0/10 at `4757eaf`, 1/10 at `d12d273`. The annotation records only "Test timeout of 60000ms". The run's results artifact holds the step detail (14-day retention) but cannot be downloaded from this workspace. Cause **OPEN**.

### 9.8 Status after candidate 7

| Item | Status |
|---|---|
| R0, R1, R2, R5, L0, CC02/CC03 scenarios, **L1, R1b, FX-03** | **Verified fixed** (10/10 per engine at `4757eaf` and `d12d273`) |
| **R1c** "Not now" on an interrupted import leaves a dead end | **FAIL 10/10** both engines (D10-06d). Codex repair requested on #64 |
| **H2** Firefox D10-07 timeout | **OPEN.** Recurred 1/10 at `d12d273` |
| FX-02 delay; genuine hidden-tab; R3; R4; touch exit | **OPEN / NOT MEASURED** as in §9.5 |
| Physical devices, staging | **NOT MEASURED** |

**MVP: NO-GO.** The test-only candidates are not to be merged.

## 10. H2 and FX-02 investigation from retained evidence (2026-10-14 night)

Founder decision (Coach Drew, 2026-10-14): **L1, R1b and FX-03 are accepted as PASSED** on independent testing (§9). That record stands. **MVP remains NO-GO.** No test was repeated for this investigation.

### 10.1 What the retained evidence shows

**FX-02** (Codex, `docs/evidence/firefox-navigation/original-trace-analysis.json` on `codex/firefox-navigation-investigation` `bd341f7`; original Firefox P14 trace, sha256 `DCC5B745…`):

| t (ms, trace clock) | Event |
|---|---|
| 110013 → 110449 | `goto('/')` completes (436 ms) |
| 110957 | Click on "Email me a sign-in link" starts |
| 113977 | Playwright's first "waiting for locator" log, **3.0 s after the action started** |
| 162362 | Locator resolved, **48.4 s later** |
| 162510 | Click done. The action took 51.6 s in total |
| — | Auth `sendOobCode` 200 in **2.3 ms**; all Auth calls 1.7–2.8 ms |

Code reading (`src/components/auth/AuthGate.tsx`, `SignInScreen`): that button is rendered statically with the form and is disabled **only** while `busy`, which is set only during a submit. The sign-in screen itself had already been asserted visible and the email field filled. No app state hides or replaces the button at this point.

So the 48 s was spent before Playwright could even *find* a statically present button, and a further 3 s passed before its first wait log. **Assessment (not proof):** the stall is in browser, driver or host responsiveness, not in app logic or the Auth emulator. It was measured on Codex's local Windows host, not CI.

**H2** (Claude CI, Linux, Firefox 157). D10-07 timed out at the 60 s test limit:
- 1/10 at `709e0f4` (job `116004898887`);
- 0/10 at `c858d1d`;
- 0/10 at `4757eaf`;
- 1/10 at `d12d273` (job `116107889507`).

Annotations record only "Test timeout of 60000ms exceeded." That is the message Playwright gives when the pending operation has **no deadline of its own**, and D10-07 has three such points:
- `net.waitFor(2)`, a custom promise;
- every action, since `actionTimeout` is unset and actions are bounded only by the test timeout;
- the 5 s observation sleep.

D10-07 also begins with the same email-link sign-in as FX-02. **Hypothesis:** H2 is the same kind of stall as FX-02. One ~48 s stall during D10-07's sign-in would exhaust its 60 s budget. **Not confirmed:** the retained annotations have no per-step timings.

### 10.2 Exact artifacts needed (no new runs required)

Both are retained until **2026-10-28**. They live in GitHub's blob storage, which this workspace cannot reach; anyone with repository access can download them.

| Defect | Artifact | File inside | Question it answers |
|---|---|---|---|
| H2 (2nd) | Run `38638354889`, artifact **`11930869453`** `e2e-results-d12d273786ba76f76102ce0459e6bcb57cac0e2b` | `test-results/results.json` (D10-07 Firefox entries) and `test-results/legacy-import-D10-07-*-firefox-repeat*/trace.zip` for the failed repeat | Which step was open at 60 s? Was it one long stall or general slowness? What did the DOM look like at the time? What do the 9 passing durations look like? |
| H2 (1st) | Run `38608330808`, artifact **`11920325300`** `e2e-results-709e0f4baf9e076a703649bbb892ec5d40a8f1c4` | Same files | Same step as the 2nd occurrence? |
| FX-02 | Codex's local raw trace, sha256 `DCC5B745…` (deliberately not published: it carries Auth tokens) | Action `fcwl@56`: the action-log *texts* between 113977 and 162362, and the "before" DOM snapshot | Was the button in the DOM during the 48 s (browser or driver stall), or absent (app re-render)? |

### 10.3 Diagnostics added for the next counted run (`303f178`, observability only)

These add no assertion, timeout or retry change, so candidate 8 diagnoses itself without extra runs.

The CI reporter now emits:
1. per-test min/median/max duration;
2. for every failed execution: the step still open at the end (with spec:line), the slowest steps and every error line;
3. a census of every action or expect step ≥ 10 s across **all** executions, passes included, so an FX-02-like stall is visible even when the test passes.

D10-07's custom waits and the sign-in phases are now named steps. All of this was self-tested locally with a hung custom wait and a hung locator, and both were attributed correctly.

A stricter `actionTimeout` (Codex used 10 s in their own lane) would make a stall fail *at* the responsible step. It is **not** applied: it would change the acceptance suite's failure semantics against every earlier run. It is offered as an option instead.

**Status:** H2 OPEN. FX-02 OPEN. Genuine hidden-tab behaviour, devices and staging NOT MEASURED.

### 10.4 First CI run with the diagnostics (push run `38647098863`, job `116136925139`, acceptance branch `183ff6a`)

This was the normal push run of the acceptance branch. That branch **does not contain #64**, so CC-L1 and D10-06c fail there as expected. It is a reporter validation, **not acceptance evidence**.
- **D10-07 baseline duration: 7.2 s in Firefox, 6.3 s in Chromium.** A 60 s timeout therefore implies ~53 s of extra time in one execution. That matches the size of the FX-02 stall (51.6 s for one click) and is **not** consistent with general slowness. H2 = FX-02-type stall remains a hypothesis; the artifacts in §10.2 or the next failure's diag annotation would confirm or refute it.
- **D10-06d passes on code without #64.** With R1b broken, coach B is simply offered the plays. D10-06d is meaningful **only together with D10-06c** (R1b 10/10). For candidate 8 it will be paired with positive anchors for the owner's resume path, per the founder's R1c guidance.
- Reporter fix: "last step" now ranks by end time, with a step still open at the end ranked last. It had named an instant check instead of the failing 10 s expect in one Chromium case. Re-self-tested locally.
