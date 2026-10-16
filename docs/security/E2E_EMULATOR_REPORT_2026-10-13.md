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

### 10.5 Classification of Codex's local findings (#68 `d617d2c`, §11 appendix)

Codex's §11 preserves §§1–10 of `7b4747f` unchanged apart from two blank lines at the join (checked by diff). Its local results are Codex-run, Windows-host evidence. They are linked here, not merged into the independent counts.

| Item | Evidence | Classification | Action (owner) |
|---|---|---|---|
| **H2 local** (D10-07 Firefox run03, `4757eaf`) | `d10-07-run03-last-actions.json`: the Bravo "Team created successfully!" expect started **100 ms** after the Create click. "Switch to" was then missing for 56.5 s; the final Teams DOM was Alpha-only | **Harness false confirmation (Claude).** The generic toast lives 5 s, so Alpha's toast confirmed Bravo while Bravo was still being created. The underlying stall is the team-creation client completion (as N2), cause unresolved. The older CI H2 failures may be this or an FX-02-type stall; still unconfirmed without the §10.2 artifacts | **Fixed in harness** `5752d2b`: `createTeamViaUI` now requires the dialog closed **and** a heading with exactly that team's name. A real stall now fails *at team creation*, with modal/creating/Firestore diagnostics. H2 stays **OPEN** |
| **N2** (D10-05 Firefox run10) | Team in Firestore; UI still "Creating…" after 11.6 s | `createTeam` resolved late or never in the client after the server write. App/SDK timing (TeamContext, Codex client) versus host: **unresolved**. Not a data or overwrite defect: those assertions were not reached | Tracked **OPEN** (Codex client / Claude harness). The new helper diagnostics apply |
| **N1** (D10-01 FF02/07, Chromium08) | One-shot `allInnerTexts` returned `[]` 68 ms into opening the library; server copies, decision and originals all verified | **Harness race (Claude).** "No plays saved." renders both while the cloud query loads and when the list is empty | **Fixed** `5752d2b`: positive library checks poll. The **negative** checks (D10-02, D10-06), which could have passed vacuously, now first wait for a server-seeded control play of the same coach and team |
| **F1** (functions, explicit parallel discovery, Windows) | First integration request: `ProviderError unavailable "openai error: Error"`; serial run 73/73 | **Test-environment connection failure to the local mock server.** An `APIConnectionError` produces exactly that message and category (reproduced locally). The product failed closed as designed. Not a provider call, not a product defect | `5752d2b`: the test now records the raw SDK error and its cause chain (canary redacted). Also `npm test` discovered **0 tests on Windows** (quoted glob, cmd.exe); now unquoted, Node 22 expands it. 73/73, lint clean |
| **W1** (NOT_FOUND on `userProfiles/<uid>`) | `onPlayCreated`/`onPracticePlanCreated` update `userProfiles`, which is created only by `createUserProfile` on `users/{uid}` | **Dormant product feature, not just a fixture gap.** Nothing creates `users/{uid}`: clients are denied by rules and there is no server path. Per-user stats are therefore never recorded in any environment. The errors are caught and logged. No data loss, no security impact; no client can read `userProfiles` | Recorded. Remove the dead stats updates or provision profiles at beta grant: a product decision, **not** changed now (no new features) |

The acceptance-branch push CI on `5752d2b` (job `116161937978`): every test that uses the changed helpers passes in both engines. The only failures are the expected pre-#64 CC-L1 and D10-06c. Rules, functions, web-auth and bundle-scan jobs are green. This is harness validation, **not** acceptance.

## 12. R1c repair (#69) and integrated candidate 8 (2026-10-15)

§11 is reserved for Codex's attributed appendix (#68). Nothing earlier in this report is rewritten.

### 12.1 Exact SHAs

| | SHA |
|---|---|
| R1c repair, #69 | source **`82d46cc`**, final docs head `1500dbc`, base frozen #64 `8f0d9f7` (Codex) |
| Acceptance head | **`30b3d2b`**: hardened team and library helpers `5752d2b`, reporter diagnostics, D10-06c, D10-06d (unchanged), new **D10-06e** (Claude) |
| **Integrated candidate 8** (test-only, never merged) | **`069c8f1`** on `claude/integration-candidate-2026-10-14f` = candidate 7 `d12d273` + #69 `1500dbc` + `30b3d2b`. `src/`, `functions/src`, rules and packages are identical to `82d46cc`; `e2e/`, functions tests and `.github/` are identical to `30b3d2b` |
| Discrimination run (diagnostic, **not counted**) | `ed528ed` on `claude/discrimination-pre-r1c-2026-10-15` = pre-R1c runtime (`src` identical to `8f0d9f7`) + `30b3d2b` tests |

### 12.2 Code review of #69

- "Not now" on an **unfinished** import returns `postponed`. It records **no** decline and keeps the device claim and the pending marker, so other accounts stay blocked (R1b).
- `hasUnfinishedImport` re-offers the import to the original account on the original team, including devices left in the pre-repair "declined but pending" state.
- Resume reuses deterministic copy ids, and completion still requires verified server readback.
- A fresh decline (R3) is unchanged. A malformed pending marker now fails closed.
- **Residual, tracked:** if the original team no longer exists, the device shows a permanent visible block. There is no release and no deletion, so data is safe but there is no exit.

### 12.3 New positive test D10-06e

The test interrupts the import mid-copy, then requires:
1. "Not now" shows **"Unfinished import postponed"** and **Resume import**, and no decline is recorded. Resume returns to the offer.
2. After a reload, the owner on the original team is re-offered the import. Originals are byte-identical.
3. Coach B sees "unfinished import by another account" and gets no Import button.
4. Coach A signs back in, is auto-selected onto the original team, and finishes with **exactly the 3 verified copy ids**, decision `imported`, originals byte-identical.

**Discrimination** (evidence 27, ×1, not counted): on the pre-R1c runtime, D10-06e **FAILS** in both engines at step 1 (`legacy-import.spec.ts:404`) and D10-06d **FAILS** in both. The other 44 tests pass.

### 12.4 Results, candidate 8 `069c8f1`, retries 0, workers 1

**Clean preflight** (evidence 25):
- `npm ci` OK;
- jest **440/440** (30 suites);
- tsc **0**;
- functions **73/73**;
- root and functions production audits **0**.

**×10, run `38659607413`, job `116177633665`** (evidence 26):

| | Chromium 156.0.8078.4 | Firefox 157.0 |
|---|---|---|
| PASS / FAIL / BLOCKED / SKIPPED | **460 / 0 / 0 / 0** | **460 / 0 / 0 / 0** |
| Steps ≥ 10 s (all executions) | **0 of 460** | **0 of 460** |
| Release-build proof | 13/13 | |

All 46 tests pass 10/10 per engine, including:
- D10-06c, D10-06d and **D10-06e**;
- D10-01, D10-02 and D10-06 with the hardened library checks;
- D10-05 and D10-07, which use the team-specific confirmation;
- CC-L1, L0 and A10.

D10-07 durations: Firefox 8.6–10.1 s, Chromium 6.4–7.3 s.

### 12.5 Status after candidate 8

| Item | Status |
|---|---|
| **R1c** | **Verified fixed (emulator)** at `069c8f1` (D10-06e 10/10 per engine, and it FAILS on the pre-repair runtime) |
| L1, R1b, FX-03 | **Passed** (founder-accepted, §10), re-confirmed 10/10 per engine |
| R0, R1, R2, R5, L0, CC02/CC03 | Verified, re-confirmed 10/10 per engine |
| H2, N1, N2 | No recurrence in 920 executions, with 0 steps ≥ 10 s. The harness causes of the N1 and H2-local signatures are fixed. The **underlying team-creation/client stall (N2) and the older CI H2 cause remain OPEN**: passing batches do not close them |
| FX-02 | **OPEN** |
| Missing-original-team permanent block (R1c residual); R3; R4; touch exit | **OPEN / tracked** |
| W1 dormant per-user stats | Recorded; product decision |
| Genuine hidden-tab behaviour, physical devices, staging | **NOT MEASURED** |

These are emulator results with demo data, and they do not establish production behaviour. **MVP: NO-GO.** No merge, deploy, spend, live change or AI activation.

### 12.6 Independent verification of §12

A separate agent re-checked §12 against git, the Checks API and the code. **Nothing was refuted.** It confirmed:
- every SHA and empty diff;
- both jobs' per-test results;
- the D10-07 durations;
- the evidence checksums, with files 01–24 unchanged;
- that the #69 code has no bypass. B is never offered the import, resume still requires verified readback, postponing never writes a decline, and status-less legacy claims are handled correctly.

It reported these **coverage gaps** (tracked, not fixed now):
1. **Browser coverage of the pre-repair "declined but pending" state.** Its recovery is covered only by Codex's jest test (`owner-resume.test.tsx`). No browser test seeds that state.
2. **Multi-team owner.** In D10-06e, A owns one team, so the original-team selection is trivial. Recovery when A has several teams and another one is selected is not browser-tested.
3. **"Resume import" after a reload.** The button is only exercised in-session. After a reload the offer is recomputed, which is by design.

## 13. Independent workflow review of #67 (revised shell and dashboard) on integration candidate 9 (2026-10-15)

Scope: workflows through the revised UI. **Visual approval is not assessed here; it remains pending Coach Drew.** Candidate 8 (`069c8f1`) and its evidence are preserved unchanged.

### 13.1 Exact SHAs

| | SHA |
|---|---|
| #67 head reviewed | **`7f22c7a`** (`codex/visual-shell-dashboard`, based on candidate 6 `4757eaf`) |
| **Candidate 9** (test-only, never merged) | **`6d613a8`** on `claude/integration-candidate-2026-10-15-ui67` = candidate 8 `069c8f1` (accepted R1c #69 `82d46cc`) + #67 `7f22c7a` + harness `8185d3d` |
| Candidate 9b (harness-only follow-up) | **`2446df2`** = `6d613a8` + harness `2966f38`. Runtime identical to `6d613a8` |

`src` in candidate 9 differs from candidate 8 **only** in #67's 10 UI files (`App.tsx`, `Dashboard.tsx` and its test, `OnboardingModal.tsx`, `src/ui/*`), which are byte-identical to `7f22c7a`. Persistence, auth, import, team context, rules, functions and packages are identical to candidate 8. The only merge conflict was `.gitattributes`, resolved as the union.

### 13.2 Code review of #67 (workflow-relevant)

- **Navigation:** one `AppShell`, with each destination as a button in the desktop sidebar and in the phone bottom bar (≤767 px). Accessible names: Teams, Practice Plans, Smart Playbook, Overview · My Week.
- **Sign out:** the top-bar button calls `logout()`. That still runs every registered sign-out guard, and `DraftSignOut` is still mounted, so the unsynced-draft dialog cannot be bypassed. Confirmed in the browser by CC-P12 and A10.
- **Dashboard data:** it only **reads** saved plans (`cloud.list`, and only for a team the coach owns). Sample preview is static, labelled "Sample data · preview", and never writes.
- **Removed:** the old in-page tabs and the obsolete `MigrationBanner` mount (it already rendered nothing).

### 13.3 Harness changes for this review (Claude files; no assertion weakened)

- `openTab` clicks the **visible** navigation button, falling back to the pre-#67 tabs.
- New `phone-chromium` and `phone-firefox` projects run the 15 UI workflow tests at **390×844**: A07, A10, CC-P10, P11, P12, P14, P15, P16, P17, L0, L1, T01, T02, D10-01 and D10-06e. These are desktop engines at phone width, **not device emulation and not physical phones**.
- An optional `grep` dispatch input (passed as data through env) allows targeted re-runs.
- After the first run, two locators were rescoped (§13.5).

### 13.4 Results (retries 0, workers 1, Chromium 156.0.8078.4 / Firefox 157.0)

**Clean preflight `6d613a8`** (evidence 28):
- `npm ci` OK;
- jest **449/449** (32 suites, including #67's new UI tests);
- tsc 0;
- functions 73/73;
- production audit 0.

**×10, run `38721496752`, job `116377013111`** (evidence 29):

| Project | PASS / FAIL | Failures |
|---|---|---|
| Desktop Chromium (46 tests) | 450 / 10 | E2E-T02 10/10 |
| Desktop Firefox (46 tests) | 449 / 11 | E2E-T02 10/10; CC-P16 1/10 (**N2**) |
| Phone Chromium (15 workflows) | 130 / 20 | E2E-T02 10/10; CC-L1 10/10 |
| Phone Firefox (15 workflows) | 130 / 20 | E2E-T02 10/10; CC-L1 10/10 |
| Release-build proof | 13/13 | |

**Targeted ×10 after the locator fixes, `2446df2`, run `38730605415`, job `116407177855`** (evidence 30): CC-L1 and E2E-T02 pass **10/10 in all four projects**, with 0 steps ≥ 10 s.

Workflows exercised through the revised UI, all 10/10 in every project where they ran:
- **Team switching:** CC-P11, T01, T02.
- **Practice save and reopen:** P16, P16b.
- **Play save and reopen:** P15.
- **Recovery:** P10, P12, P17, L0, D10-01, D10-06e.
- **Conflicts:** P14, C01.
- **Sign-out:** A07, A10, P12.

### 13.5 Classification

**A. #67 regressions in workflows: none found.**

**B. Test-harness adjustments caused by #67's markup** (not product defects; fixed, re-measured):

| Test | Cause | Fix |
|---|---|---|
| E2E-T02 | "No team selected" now appears twice (new top bar and Teams page), so the locator was ambiguous. Both copies correctly showed that B has no team | Scoped to the main content |
| CC-L1 (phone) | The team-name anchor matched the top-bar label, which #67 hides at ≤767 px | Anchor requires the team name rendered (attached); the visible-dashboard anchor stays |

**C. #67 observations for Coach Drew's review** (new behaviour, not workflow failures; evidence 31, local probe):

| Width | Signed-in account ("Welcome, email") | Active team name |
|---|---|---|
| 1440 px | Visible | Visible (top bar) |
| 834 px (tablet) | **Not rendered** (`display:none`; not even screen readers get it) | Visible (top bar) |
| 390 px (phone) | **Visually hidden** (1 px clip; screen readers only) | **Not displayed** on the dashboard (top-bar label and heading suffix hidden) |

Before #67 (`069c8f1`) the account email showed at every width. On a **shared device**, which the D10 rules are built around, a coach on a tablet or phone can't see which account, and on a phone which team, is active before editing. **Recommendation:** a compact account and team indicator at every width. This is a product/UI decision; nothing was changed.

**D. Inherited open issues seen in this run** (not #67: the files involved are unchanged):
- **N2:** desktop Firefox CC-P16, repeat 1. The Create Team click completed quickly. Then the dialog stayed "Creating…" for 10.1 s while `teams` in Firestore already held "Owls". This is the first N2 capture in CI with diagnostics. `TeamContext.createTeam` is unchanged since before #67, and Codex saw the same signature on `4757eaf`. **OPEN.**
- H2, FX-02, the R1c missing-team residual, R3, R4 and the standalone touch exit: unchanged, **OPEN**.
- Genuine hidden tabs, physical devices and staging: **NOT MEASURED**.

**MVP NO-GO.** #67 visual approval is pending Coach Drew. No merge, deploy, spend, live change or AI activation.

## 14. Candidate 9b continuation: identity visibility, N2 investigation, full regression (2026-10-15)

Coach Drew directive "Candidate 9b continuation". Controlled development, no production release. Coach Drew keeps final release and design approval.

### 14.1 Baselines preserved

| | SHA | Status |
|---|---|---|
| Candidate 8 | `069c8f1` (`claude/integration-candidate-2026-10-14f`) | Unchanged, evidence 25–27 unchanged |
| Candidate 9b | `2446df2` (`claude/integration-candidate-2026-10-15-ui67`) | Unchanged, evidence 28–31 unchanged |
| Design source | #67 `7f22c7a` | Codex's later #67 commits `6ee47fd..dd1fe0a` are **not** included |
| **Candidate 10** (test-only, never merged) | **`186a743`** on `claude/identity-visibility-2026-10-15` = 9b + identity change (`d69ef8e`, `dec1ce1`) + tests/docs | Runtime differs from 9b in **3 source files** (`src/ui/AppShell.tsx`, `src/ui/coach-core.css`, `src/components/Dashboard.tsx` one prop) plus the new unit test `src/ui/AppShell.test.tsx` |

No change to authentication, permissions, team data, persistence, rules, functions or server behaviour. Earlier evidence checksums are unchanged; new files were added only.

### 14.2 Phase 1: identity visibility

- **Account:** "Welcome, *email*" is displayed at desktop, tablet and phone widths.
  - On narrow screens long addresses are shortened with an ellipsis; the full text stays in the DOM (screen readers) and the `title`.
  - Only the coach's own email is shown, as on desktop before #67. No uid, claims or other account data.
- **Team:** the top-bar team chip is displayed at every width.
  - Screen readers hear the prefix "Active team:".
  - With no team it shows the explicit "No team selected".
- **Sample vs saved:** the top bar shows **"Sample preview · not saved"** only while sample data is on the dashboard. It never appears on saved team data or on the editors. The existing "Sample data · preview" / "Team workspace" label is unchanged.
- **Phone layout:** the top bar becomes two rows (brand, account and Sign out; then team and badge). "Sign out" is kept on one line.
- **Tests:**
  - unit `AppShell.test.tsx`: account, team, no-team, preview, and no uid/claims exposure;
  - e2e **UI-01**: account and explicit no-team **displayed** (box ≥ 24 px) and accessible at 1440, 834 and 390 px;
  - e2e **UI-02**: active team at every width, the sample marker shown only while preview is on, and gone on editors.
- **Screenshots:** `docs/evidence/identity-visibility-2026-10-15/` (README and checksums).
  - Real app: no-team, saved and sample-preview, at 1440, 834 and 390 px.
  - Labelled component harness: active team "Alpha Eagles", saved and sample, at each width.
  - The real-app active-team proof is UI-02 in CI.

### 14.3 Phase 2: N2 investigation (evidence; **root cause not proven**)

Instrumentation (harness only, metadata only, no bodies):
- a Firestore channel lifecycle logger;
- `createTeamViaUI` records it when a creation is not confirmed;
- the reporter publishes `diag-data`.

Diagnostic tests in `e2e/tests/n2.spec.ts`, reported separately from acceptance. Runs `38736770151`, `38738745657` and `38740685365` (evidence 34–36, **not acceptance**), plus 10/10 inside the full run.

| Test | Fault injected | Observation (all executions) |
|---|---|---|
| **N2-D0** baseline | none | Write WebChannel: handshake POST, then back-channel GET (stays open), then the POST carrying the write. Server has the team at ~100–600 ms; the dialog closes at about the same time (from a few ms before the 50 ms admin poll first sees the team, to ~235 ms after). 1 team |
| **N2-D3** | write POST delivered, its **HTTP response held** (until the dialog closes, cap 8 s) | Dialog closes ~150–360 ms **while the response is still held**, so the **acknowledgement travels on the back channel**, not on the POST response |
| **N2-D4** | back-channel GET **held 8 s**, then released | The write is **not sent until the back channel opens**; nothing on the server for 8 s. After release, normally the dialog closes at ~8.1 s with 1 team. **But in Chromium, at least 2 of 25 executions (16 of 25 visible in the truncated annotations; a third is inferred from a 40.7 s duration) the write was committed (teams = 1) and the dialog stayed open for ≥ 32 s after release. That is the N2 state ("Creating…" text itself not re-checked after release). Firefox: 0 of 25 (all ≤ 9.9 s).** The injection replays the held GETs late with stale channel parameters, which may itself contribute. In both stuck executions with full data, the stale first back channel finished after the new write exchange. So did 12 of 30 executions that recovered, so that ordering is **not sufficient** and not a root cause |
| **N2-D1** | back channel **reset** twice right after opening (selective per-request resets, not a full loss of connectivity) | **The write is never sent and never retried for ≥ 32 s after the injected resets stop**; the dialog stays open ("Creating…" checked at 8 s), nothing saved, no false success. An error toast was not checked. Every execution in every run, both engines. Whether this is SDK or app behaviour is not separated |
| **N2-D2** | write held (pending); the coach cancels, leaves Teams, returns, creates again | **Cancel and ✕ are enabled while "Creating…"**; the new dialog accepts the same submission, so **2 teams with the same name** after delivery. Every execution, both engines. The in-dialog double click *is* blocked |

**Conclusion.**
- **Mechanism (narrowed):** the N2 state (team committed, dialog stuck) occurs when the write's acknowledgement on the Write stream's back channel is not delivered to, or not processed by, the client after a back-channel disruption. A comparable state is reproduced under fault injection in Chromium, though the injection itself may contribute.
- **The natural CI occurrence** (candidate 9, Firefox, no injected fault) has no network trace, so **its trigger is not proven**. The SDK-internal reason the acknowledgement is lost is also **not proven**.
- **Proven related gaps**, in Codex's client `TeamContext`/`TeamManagement`:
  - no recovery after back-channel resets (D1; SDK versus app not separated; feedback not measured);
  - duplicate teams on retry while a write is pending or unacknowledged (D2).

  Together: a coach facing a stuck dialog who retries creates a **duplicate team**.
- **Proposed** (on #39), **not implemented**:
  - (a) a pending-creation state that survives navigation, with duplicate-name confirmation;
  - (b) "Still saving…" after ~10 s, and reconciling with the teams listener;
  - (c) recovery after back-channel resets, for example an online/visibility `disableNetwork`/`enableNetwork` cycle or long-polling auto-detection.

  Product decisions belong to Coach Drew.

### 14.4 Phase 3: full regression on `186a743` (complete matrix, no targeted substitution)

Clean preflight (evidence 32):
- `npm ci` OK;
- jest **453/453** (33 suites);
- tsc 0;
- functions 73/73;
- root and functions production audits 0.

**Run `38741662437`, job `116444776707`** (evidence 33):
- `repeat_each=10`, retries 0, workers 1, no `grep` filter;
- Playwright 1.64.0, Linux `ubuntu-latest`, headless;
- 2026-10-15 13:19–14:38 UTC.

| Project | Browser | Viewport | Tests selected | Executions | PASS / FAIL / BLOCKED / SKIPPED |
|---|---|---|---|---|---|
| chromium | Chromium 156.0.8078.4 | 1280×720 desktop (UI-01/UI-02 set 1440, 834 and 390 px themselves) | all 53 (46 acceptance, UI-01, UI-02, 5 N2 diagnostics) | 530 | **530 / 0 / 0 / 0** |
| firefox | Firefox 157.0 | 1280×720 desktop | all 53 | 530 | **529 / 1 / 0 / 0** |
| phone-chromium | Chromium 156 | 390×844 (desktop engine at phone width, not emulation) | 15 UI workflows | 150 | **150 / 0 / 0 / 0** |
| phone-firefox | Firefox 157 | 390×844 (same) | 15 UI workflows | 150 | **150 / 0 / 0 / 0** |
| Release-build proof | | | | | 13/13 |

Phone workflows: A07, A10, CC-P10, P11, P12, P14, P15, P16, P17, L0, L1, T01, T02, D10-01, D10-06e.

**Totals: acceptance 1,259 / 1,260** (desktop 48 tests × 10 × 2 + phone 15 × 10 × 2). **N2 diagnostics 100 / 100** pass their *safety* assertions, but they record defects. D1 passes only because its assertion was narrowed to safety facts in `d989f3e`; under the original assertion it failed 10/10 (run `38736770151`). Steps ≥ 10 s: 1 of 1,360 executions (the failure below).

**The one failure: D10-06b, Firefox, repeat 5** (new intermittent **N3**):
- creating team "Bravo Bulldogs", the dialog was still open after 10.1 s;
- **not** in the "Creating…" state;
- **no team on the server**;
- the captured trace shows **zero Firestore requests after the submit click**.

So team creation never started. That differs from N2 (server write present).
- The cause is **not proven**. Two candidates fit: the click did not submit, or `createTeam` failed before any request. For example, it throws "User must be authenticated" when `auth.currentUser` is null, which gives exactly `creating=false` and no request. The on-screen message was truncated; `ac2dae1` (acceptance branch, **not** in `186a743`) now records it for the next occurrence.
- It is **not attributable** to the identity change, which touches only the top bar; the dialog and `TeamContext` are unchanged.
- D10-06b passed 10/10 on candidates 6–9.

Every other acceptance test passed 10/10 in every project where it ran: the D10 import set (including R1b and R1c), CC02/CC03 (team switching, plan and play save/reopen, recovery, conflicts, sign-out), L0, L1, A10, UI-01, UI-02 and T01–T03. H2's D10-07 passed 10/10 in both engines.

### 14.5 Phase 4: open inventory (explicit)

| Item | Status |
|---|---|
| H2 Firefox D10-07 timeout | **OPEN** (0/10 here; 2/50 counted Firefox executions historically; cause unexplained) |
| FX-02 51 s delay | **OPEN** |
| **N2** team saved but "Creating…" | **OPEN.** Mechanism narrowed and signature reproduced (Chromium 3/25 under fault); natural trigger and SDK cause not proven |
| **N2-D1** no recovery after back-channel resets | **OPEN** (new, proven, client) |
| **N2-D2** duplicate team on retry while pending | **OPEN** (new, proven, client) |
| **N3** submit produced no request (D10-06b 1/10 Firefox) | **OPEN** (new, cause not proven) |
| R1c residual: device blocked when the original team is gone | **OPEN** |
| R3 "Not now" permanent on a fresh offer | **OPEN** |
| R4 `D10_APPROVED` release control | **OPEN** |
| Standalone touch exit | **OPEN** |
| Background / hidden-tab behaviour | **NOT MEASURED** |
| Real devices | **NOT MEASURED** |
| Staging acceptance | **NOT MEASURED** |
| W1 dormant per-user stats | Recorded (product decision) |
| #67 visual approval, identity design approval | **Pending Coach Drew** |

### 14.6 GO / NO-GO

**MVP: NO-GO.**
- Emulator acceptance is strong: **1,259/1,260** acceptance executions on candidate 10, with every workflow passing through the revised UI at desktop and phone widths.
- But team creation has proven reliability gaps: a stuck "Creating…" with no recovery or feedback, and duplicate teams on retry, plus the unexplained N2 and N3 intermittents.
- Staging, real devices and background tabs are not measured.
- H2, FX-02, R1c residual, R3, R4 and touch exit remain open.

No merge, deploy, live-data change or AI activation.

### 14.7 Independent verification of §14

A separate agent re-checked §14 against git, the Checks API, the evidence and the code. It **confirmed**:
- the baselines and the code-change scope; the identity change is presentational only, with no auth or data changes;
- that no CSS hides identity at any width;
- all CI counts, the D10-06b failure data, D10-07 and UI-01/02 10/10;
- that the run included the full test inventory (53 + 15 distinct tests, so no filter), and the 1280×720 desktop viewports;
- the D1, D2 and D4-Firefox observations, and the "12 of 30" ordering statistic;
- the N2 mechanism reasoning;
- the evidence checksums, with files 01–31 unchanged.

It **refuted** some D0/D3 timing ranges, the D3 "held 8 s" wording and the exact Chromium D4 count. All were corrected above.

Weaknesses it recorded:
- UI-01/02 do not check in-viewport position or how much of the email is readable after the ellipsis.
- The unit test's "no uid" check is a text pattern.
- Some "every execution" statements rest on truncated annotations.

The corrected headline is **acceptance 1,259/1,260; diagnostics 100/100 (safety assertions only)**.

### 14.8 N2 repair test preparation (2026-10-15; Codex owns the repair, Claude owns tests and evidence)

Historical runs and failures in §14.3–14.7 and evidence 33–36 are unchanged.

**New tests** (acceptance head `c4e087f`; contract posted on #39 for Codex):
- **N2-A1 [acceptance]**, D1 fault (back channel reset during an 8 s outage, then restored). Requires:
  - an explicit `role=status`/`alert` matching `/saving|connection|offline|retry/i` during the outage;
  - the write sent after restore, within 30 s;
  - **saved exactly once**, after a 3 s window;
  - the UI recovered: dialog closed and the team heading shown.
- **N2-A2 [acceptance]**, D2 fault (write held, so the create is pending). The coach cancels if possible, leaves Teams, returns and retries the same name if the UI allows it. Requires **exactly 1 team** after delivery and a 5 s window.
- **N3 probe:** every `createTeamViaUI` call records, on failure only:
  - signed-in at submit (boolean only);
  - whether the DOM `submit` event fired;
  - whether "Creating…" ever appeared;
  - toast/alert texts;
  - the Firestore request lifecycle;
  - server persistence.

  No uids, emails or tokens.
- **N3-D5 [diagnostic]:** the D10-06b pattern of create, sign out, sign in as another coach, create immediately; 8 creations per execution.
- The reporter now prints **acceptance** and **diagnostic** totals separately.

**Pre-repair baseline**, to prove the tests discriminate:
- Branch `claude/n2-baseline-pre-repair-2026-10-15` @ `a61dfcb`: runtime identical to candidate 10 `186a743`, which is itself unchanged.
- Run `38758608712`, job `116504388863`, ×5, retries 0, filter `N2-|N3-`, Chromium 156 and Firefox 157 desktop (evidence 37, **not acceptance**).

| Test | Chromium | Firefox |
|---|---|---|
| N2-A1 | **FAIL 5/5**: no status, write never sent after restore, 0 teams, no recovery | **FAIL 5/5** (same) |
| N2-A2 | **FAIL 5/5**: 2 teams | **FAIL 5/5**: 2 teams |
| N2-D0, D1, D2, D3, D4 | 25/25 (same behaviour as §14.3) | 25/25 |
| N3-D5 | 5/5: 40 creations, **N3 not reproduced** | 5/5: 40 creations, not reproduced |

**Status:** N2 repair **pending Codex's exact SHA**. N2's natural CI trigger is **not proven**. **N3 unresolved** (not reproduced in 80 targeted creations). MVP **NO-GO**.

### 14.9 Independent validation of the N2 repair (PR #71, runtime `bdb06ae`) (2026-10-15)

§14.1–14.8 and evidence 33–37 are unchanged. Candidate 10 `186a743`, candidate 9b, #67 and Codex's app files were not edited.

**What was tested**
- Runtime under test: `bdb06ae6d39ff9ed3fee7000f93468c8cf2f8fe7` (#71). The PR documentation head `dde8be9` was not tested as a runtime; relative to `bdb06ae` it changes only files under `docs/`, verified with `git diff --name-only`.
- Candidate: `claude/n2-repair-acceptance-2026-10-15` @ `8ff5521`. Its `src/`, `functions/`, `public/`, `firestore.rules` and build configuration are byte-identical to `bdb06ae` (evidence 38).
- Test harness: `26f7df8`, Claude files only.
- Bounded source diff `186a743..bdb06ae`: 8 files under `src/`, +661/−76, plus Codex's own Playwright suite `tests/team-creation/` (3 files, +119; not run by this harness):
  - `teamCreation.ts`, `teamCreationGateway.ts`, `TeamContext.tsx`, `TeamManagement.tsx`;
  - their unit tests.
- Inherited unmerged history on #71 was not treated as N2 work.
- Implementation verified by reading the source. Team creation is a REST `POST …/documents:commit` with `currentDocument.exists=false` to the fixed path `teams/{operationId}`, followed by an authoritative `GET …/documents/teams/{id}` readback:
  - success requires owner, name and code to match;
  - `ALREADY_EXISTS` or `FAILED_PRECONDITION` is never treated as success without a matching readback.
- The operation journal `coachcore:v1:{project}:{uid}:team-create` is written before the request.
- The listener confirms a team only from server snapshots: not from cache, no pending writes.

**Harness changes (no product code, no assertion, timeout or retry changes)**
- New REST-path acceptance tests N2-R1…R6 in `e2e/tests/n2.spec.ts`. They inject faults with `page.route` on the REST commit and readback URLs, not on the old WebChannel.
- The original N2-A1 and N2-A2, and D0–D5, are kept byte-identical in their bodies.
- Added `adminTeamsFull`, and an `R` kind for REST readbacks in the network log.
- CI is split into 4 parallel per-project jobs, because the full ×10 suite was projected at roughly the unchanged 120-minute job limit (an estimate, not measured: candidate 10 took 79 min, plus about 42 min of new R tests; the split run's jobs took 47, 57, 7 and 10 min). `--pass-with-no-tests` covers grep runs that select no phone tests.
- Status requirement is unchanged: `role=status` or `role=alert` matching `/saving|connection|offline|retry/i` within **8 s**.

| Test | Fault | Required |
|---|---|---|
| N2-R1 | commit held 8 s (not at server) | status ≤ 8 s; recovers; exactly one team = journal op (id, name, code, owner) |
| N2-R1b | commit reset during 8 s outage | same |
| N2-R1c | commit reaches server, response dropped | commit 200 at server; status ≤ 8 s; UI recovers; exactly one team at original id (no explicit no-false-success assertion) |
| N2-R2 | commit pending → Cancel → My Week → Teams → retry | pending + Resume visible; same op id; exactly one team |
| N2-R3 | commit pending → page reload | pending survives; same op id; exactly one team |
| N2-R4 | A pending → sign out → B → A | B sees no Resume and no A team; nothing is created under B; A recovers once |
| N2-R5 | fake commit 200, nothing on server | readback blocks success; recovers once at original id |
| N2-R6 | different team pre-placed at op id | no success shown; alert shown; Check and retry is clicked *if present* (the click itself is not asserted); existing doc unchanged; nothing created with submitted name |

**Results (retries 0, workers 1, Chromium 156.0.8078.4 and Firefox 157.0, Playwright 1.64.0, demo-project emulators)**

*Diagnostics:* N2 and N3 tests ×10, desktop. Run `38767248279`, evidence 39, **not acceptance**.

| | Chromium | Firefox |
|---|---|---|
| N2-R1…R6 (8 tests) | 80/80 | 80/80 |
| original N2-A1 | 10/10 | 10/10 |
| original N2-A2 | **FAIL 10/10** | **FAIL 10/10** |
| N2-D0, D1, D3, D4 | 40/40 | 40/40 |
| N2-D2 | **FAIL 10/10** | **FAIL 10/10** |
| N3-D5 (8 creations each) | 10/10, 80 creations, N3 not reproduced | 10/10, 80 creations, N3 not reproduced |

*Full acceptance matrix:* ×10, no grep, retries 0. Run `38774326491`, evidence 40.

| Job | Total pass/fail | Acceptance | Diagnostic | Failures |
|---|---|---|---|---|
| chromium 1280×720 | 626/14 | 570/10 | 56/4 | N2-A2 10/10; N2-D2 4/10 |
| firefox 1280×720 | 626/14 | 570/10 | 56/4 | N2-A2 10/10; N2-D2 4/10 |
| phone-chromium 390×844 | 149/1 | 149/1 | 0/0 | D10-06e 1/10 (line 425) |
| phone-firefox 390×844 | 150/0 | 150/0 | 0/0 | none |
| **Total** | **1551/29** | **1439/21** | **112/8** | |

- In both desktop engines, N2-R1…R6 passed 10/10 each.
- N3-D5 passed 10/10 per engine: another 160 creations, N3 not reproduced.
- Release-build proof: 13/13 in every job.

**Classification (evidence-based; causes stated only where shown)**

1. **8-second status: met in every R1/R1b/R1c execution.** The qualifying status is the dialog's `role=status` "Saving your team. You may leave this dialog…", which appears at submit. Codex's 10-second "Still saving…" escalation is not what satisfies the requirement. Screenshots are in `docs/evidence/n2-repair-validation-2026-10-15/`.
2. **Original N2-A2 (acceptance) fails 10/10 on `bdb06ae`. Recorded as a failure, not relabelled.** Its fault holds the SDK WebChannel Write stream, which the repaired REST path does not use, so the first create is confirmed at once. The test then shows one of two things:
   - a 60 s timeout at the Cancel step (`n2.spec.ts:211–212`, `isEnabled` or click), because the dialog has already closed; or
   - `teams=2` after it submits the same name again as a new, deliberate creation (`savedAfterRelease` 2–5 ms).

   No duplicate of a *pending* operation was observed. N2-R2 and N2-R3, which hold the real REST commit, pass 10/10 in both runs. **Open product question for Coach Drew and Codex:** should a coach be able to create two teams with the same name? Today they can.
3. **N2-D2 (diagnostic):** same fault-model mismatch, 10/10 and 4/10.
4. **D10-06e line 425, "original team selected": inherited intermittent failure, not introduced by #71.**
   - Targeted D10-06e ×50 on `8ff5521` (evidence 41): chromium 2/50 failures at line 425; phone-chromium 1/50, a different assertion at line 30 (`currentTeamId` undefined right after team creation); firefox and phone-firefox 50/50.
   - Same ×50 on the **pre-repair runtime** `a61dfcb` = `186a743`, with an identical D10-06e test and `legacy.ts` helper (`support/app.ts` differs by one network-log classifier line, which shifts its line numbers) (evidence 42): chromium **2/50 at line 425**; the other three projects 50/50.
   - Both checks read `localStorage.currentTeamId` once, right after a UI step. Whether the cause is a harness timing race or app-side lag in persisting the selection is **not proven**.
   - The line-30 variant was seen only on `bdb06ae` (1 of 200 executions versus 0 of 200 on the baseline). This is too few to call a regression. `bdb06ae` does move the `currentTeamId` write into the snapshot handler, and the team confirmed by the create path does not write it. Codex should review this.
5. **Not tested:** a network failure *of the readback request itself*. R5 and R6 cover readback that finds no team and readback that finds a different team. Natural (unfaulted) SDK stalls were not reproduced.

**Observations for Codex (not N2 acceptance results)**
- The alert shows the raw browser text "Failed to fetch".
- The Teams panel and the create dialog render unstyled. This is identical on `069c8f1`, `186a743` and `bdb06ae`, so it predates #71.

**Status**
- REST transport repair: **passes every REST-path acceptance test 10/10 in both desktop engines.**
- The full matrix is **not clean**: 21 acceptance failures, all classified above. Original N2-A2 stays a recorded failure pending a decision on its fault model.
- N3: not reproduced in 320 targeted creations on `bdb06ae` (D5 ×10 × 2 engines × 2 runs), plus 80 on the pre-repair baseline (§14.8). **Not claimed fixed.**
- Natural SDK stall cause: **unresolved**.
- No merge, deployment or live-data testing. MVP **NO-GO**.

### 14.10 Coach Drew's decisions on same-name teams and the obsolete N2-A2 fault model (2026-10-15)

**Decisions (Coach Drew, 2026-10-15; not to be re-asked):**
1. Same-name teams are allowed **only after an explicit confirmation** that the coach intends a separate team.
2. Pending-save retry stays separate: **a retry of one operation must never create a second team.**
3. Original **N2-A2 is reported as an obsolete fault model**, not a repair failure: its SDK-WebChannel fault no longer affects the REST save path. Its body is unchanged, it still runs, and the reporter counts it in its own column (`obsolete-fault-model`). Evidence 37, 39 and 40 are kept as recorded.
4. Add a separate test for the intentional-duplicate confirmation, and the missing test for a failed server readback.

**Harness** (candidate branch `claude/n2-repair-acceptance-2026-10-15`, harness `f325a23`; runtime still `bdb06ae`; no product code, assertion, timeout or retry change):

| Test | Fault / scenario | Required |
|---|---|---|
| N2-R7 | coach already owns team X, submits X again | confirmation prompt (role alertdialog/dialog/alert/status matching `/already have a team (named\|called)\|already exists\|same name/i`) within 8 s; nothing written while open; decline creates nothing; confirm creates exactly one separate team (new id and code), original untouched, no pending op left |
| N2-R7b | confirmed same-name creation, commit reset during an 8 s outage | status ≤ 8 s; journalled before request; nothing new during outage; recovered as the **same** operation; exactly 2 teams, never 3 |
| N2-R8 | commit answered 200 by the fault, readback connection reset, nothing on server | status ≤ 8 s; no false success at 8 s; after restore exactly one team = the operation |
| N2-R8b | commit reaches the server, readback returns 503 | status ≤ 8 s; the committed team is not overwritten; UI recovers; exactly one team = the operation |

The UI wording for R7 is Codex's choice; the contract (locators above, confirm `/create (another|a separate|…)|create anyway|yes,? create/i`, decline or the dialog's Cancel) is posted on #39.

**First run `38796970604` on `56b0948` (evidence 43):** R7/R7b results are **invalid**: the test's own team name "N2 Same Name FC" matched the prompt regex via the "Pending team: …" status, so the tests timed out instead of asserting. Fixed in `f325a23` (names changed; a vanished match or missing confirm control now fails the assertion). R8/R8b passed 10/10 in both engines in that run. N2-A2 appeared in the new `obsolete-fault-model` column: 0/10 per engine, as before.

**Run `38807699055` on `f325a23`, ×10, retries 0, grep `N2-R7|N2-R8` (evidence 44):**

| Test | Chromium | Firefox | Observation |
|---|---|---|---|
| N2-R7 | **FAIL 10/10** | **FAIL 10/10** | `promptAt=-1`, `teamsBeforeAnswer=2`: no confirmation exists; the second same-name team is created immediately |
| N2-R7b | **FAIL 10/10** | **FAIL 10/10** | same: no confirmation to give |
| N2-R8 | PASS 10/10 | PASS 10/10 | readback network failure never shown as success; same op created once |
| N2-R8b | PASS 10/10 | PASS 10/10 | readback 503: no overwrite, same op confirmed once |

**Classification.** R7/R7b failures are a **product gap on `bdb06ae`** (the confirmation decided in (1) is not implemented), not a regression of the REST repair. R8/R8b close the "readback failure not tested" limitation from §14.9. The §14.9 full-matrix totals are unchanged; re-counting that run under the new column would give acceptance 1,439/1 (D10-06e, inherited) and obsolete-fault-model 0/20, but that is a re-labelling of evidence 40, not a new run.

**Status:** REST repair holds on every REST-path test, including readback failure. The same-name confirmation is **not implemented**. The full matrix on the final harness has not yet been re-run. N3 unresolved; MVP **NO-GO**.

### 14.11 Independent validation of the #71 follow-up runtime `518e9e5` (2026-10-15)

**Supersession note.** §14.10's finding "same-name confirmation unimplemented" is a finding **on `bdb06ae`**. It is superseded by the implementation in `518e9e5`, verified below. §14.9–14.10 and evidence 37–44 are unchanged.

**What was tested** (handoff: #39 comment 6202191138; evidence 45)
- Runtime: `518e9e5817abd2a0e1bf1308468928f238fa8533`. Docs/evidence head `280ee484…` differs from it only under `docs/` (verified).
- Harness: `f325a23` (unchanged from §14.10; no assertion, timeout or retry change).
- Candidate: `5911f7e` on `claude/n2-repair-acceptance-518e9e5`: `src/`, `functions/`, `public/`, rules, indexes, `package*.json`, `tsconfig.json` byte-identical to `518e9e5`; `e2e/`, `.github/` byte-identical to `f325a23`; no other paths differ.
- Bounded diff `bdb06ae..518e9e5`: `TeamManagement.tsx` (+24/−5), `TeamContext.tsx` (+15/−1), two unit-test files (4 files, +78/−8 in total). Also present: a `submitting` re-entry guard and a `{...doc.data(), id}` ordering change. Nothing outside `src/` and `docs/`.
- Implementation read: a `role="alertdialog"` "You already have a team named X. Do you intend to create a separate team?" with **Go back** / **Create a separate team**, shown only when `!pending` and a *confirmed* team has the same trimmed name (so a journalled retry never prompts); `confirmedTeams` is fed only from non-cache, non-pending snapshots or the confirmed REST readback; `currentTeamId` is now persisted by an effect on `currentTeam` (either path), not only by the SDK listener.

**Stage 1: N2/N3 ×10, grep `N2-|N3-`, retries 0.** Run `38811068246`, evidence 46.

| Test | Chromium | Firefox |
|---|---|---|
| N2-R7 same-name confirmation | **PASS 10/10** (asserted every execution: 1 team while the prompt is open; decline → 1; confirm → exactly 2 with distinct ids/codes; prompt at 56 ms in the captured #0) | **PASS 10/10** (76 ms in #0) |
| N2-R7b confirmed same-name, commit reset → same op | **PASS 10/10** (asserted: fault applied, status within 8 s, recovered as the journalled op, exactly 2 teams; `reprompts` is recorded only, 0 in the captured #0) | **PASS 10/10** |
| N2-R8 / R8b readback failure | PASS 10/10 / 10/10 | PASS 10/10 / 10/10 |
| N2-R1…R6 (8 tests), N2-A1 | 90/90 | 90/90 |
| N3-D5 (diagnostic) | 10/10, 80 creations, N3 not reproduced | 10/10, 80 creations, not reproduced |
| N2-D0/D1/D3/D4 (diagnostic) | 40/40 | 40/40 |
| N2-D2 (diagnostic, WebChannel fault) | FAIL 6/10 | FAIL 10/10 |
| N2-A2 (obsolete fault model) | 3/7 | 0/10 |

Acceptance **130/0** per engine. Harness label note: the R7 `declineButton=Cancel` diag string is read after the decline click dismissed the dialog; the control present and clicked was "Go back" (its text is in the captured prompt). The assertion `teamsAfterDecline=1` is unaffected.

**Stage 2: selected-team persistence, D10-06e ×50 per project.** Run `38818999500`, evidence 47.

| Project | `518e9e5` | `bdb06ae` (ev. 41) | pre-repair `186a743` (ev. 42) |
|---|---|---|---|
| chromium | 2/50 fail @425 | 2/50 @425 | 2/50 @425 |
| phone-chromium | 1/50 fail @425 | 1/50 **@30** | 0/50 |
| firefox, phone-firefox | 50/50 | 50/50 | 50/50 |

- The **line-30 variant** (`currentTeamId` unset immediately after creation), seen 1/200 on `bdb06ae` only, did **not** recur in 200 executions on `518e9e5`. Consistent with the persistence fix; 1 → 0 in 200 is not statistical proof.
- The **line-425 variant** (returning coach A, selected team ≠ A's team) is unchanged at 2/50 on all three runtimes: **inherited, cause not proven**, not addressed by #71. Its `Received` value is truncated in the annotation and the CI artifact/log store is not reachable from this workspace; the artifacts remain in CI for Codex.

**Stage 3: full matrix ×10, no filter, retries 0.** Run `38820119320`, evidence 48. Chromium 156.0.8078.4, Firefox 157.0, Playwright 1.64.0.

| Job | Acceptance | Diagnostic | Obsolete fault model (N2-A2) | Release proof |
|---|---|---|---|---|
| chromium 1280×720 | **610/0** | 54/6 (N2-D2 6/10) | 4/6 | 13/13 |
| firefox 1280×720 | **610/0** | 54/6 (N2-D2 6/10) | 5/5 | 13/13 |
| phone-chromium 390×844 | **150/0** | — | — | 13/13 |
| phone-firefox 390×844 | **150/0** | — | — | 13/13 |
| **Total** | **1,520/0** | **108/12** | **9/11** | |

- Every acceptance test, including D10-06e (10/10 in all four projects this run), N2-R1…R8b and N2-A1, passed.
- N2-D2 and N2-A2 failures are the WebChannel-hold fault model (§14.9 item 2–3), reported separately and not counted against the repair. N2-A2's partial passes on `518e9e5` are a side effect of the new confirmation blocking its second submit; the body is unchanged.
- N3-D5: 10/10 per engine, another 160 creations. **N3 is kept separate from the original N2 SDK stall**: N3 (submit produced no request, 1/10 Firefox on `186a743`) has not recurred in 800 targeted creations (480 on `bdb06ae`: evidence 39, 40, 43; 320 on `518e9e5`: evidence 46, 48); it is **not claimed fixed**. The natural cause of the original N2 SDK stall is likewise **unresolved**; the repair routes around the SDK write path rather than explaining it.

**Status:** All three GitHub runs conclude `failure` because the diagnostic/obsolete buckets (N2-D2, N2-A2) and stage 2's D10-06e are red; the reporter's buckets are what separate them. On `518e9e5` the **acceptance** bucket is clean (1,520/0) and all REST-path, same-name-confirmation and readback-failure tests pass 10/10 per engine. Inherited: D10-06e line-425 intermittent (not N2). Open: N3 (not reproduced), natural SDK stall cause, Codex's observations (raw "Failed to fetch" text, unstyled team UI). No merge, deployment or live-data testing. **MVP NO-GO** until the release gates in the readiness checklist are closed.

### 14.12 Reconciliation of N2-R8b: the readback-503 fault was not deciding the earlier passes (2026-10-15)

**Finding (harness, Claude).** In evidence 44, 46 and 48, N2-R8b's diag line reads `readbacksFailed=0` in 19 of the 24 captured executions across both engines (evidence 44: 0 in 7/10 Chromium and 9/10 Firefox; evidence 46 and 48 capture only execution #0 per engine), and R8b had no assertion that the fault was applied. Those passes therefore proved only that a real server commit is confirmed; they did **not** prove the app's handling of a failed readback. The §14.10–14.11 statements "R8b PASS 10/10" are retained as recorded but are **downgraded to vacuous for the readback-failure claim**. R8 (fake commit, readback reset, nothing on the server) is unaffected: it asserted `readbacksFailed > 0` and shows 1 in every captured execution.

**Why.** `TeamCreation.start` races the REST request against the SDK listener's confirmation; after a *real* commit the Listen channel delivers the document in milliseconds, `confirm()` wins and `finally` aborts the readback before it is issued, so the route never sees it. Where the 503 was served (7/20 in evidence 49) the listener still confirmed first (`recovery=automatic` in 4–12 ms).

**Correction, two steps, runtime `518e9e5` unchanged throughout** (`src` byte-identical to `518e9e5` at each harness commit):
1. Harness `d5864e9` added `expect(readbacksFailed > 0)` and `expect(noFalseSuccess)` plus a mid-test hold of the Listen channel. Run `38832121304`, evidence 49 (**not acceptance**): R8b **FAIL 10/10 per engine** on the new assertion, `listenHeld=0` everywhere — consistent with a route installed after sign-in being unable to interrupt the listener's long-poll already in flight (inference from `listenHeld=0`, not measured directly). This is the harness failing to apply its fault, not an app defect.
2. Harness `4cc7ccf` blocks the Listen channel from **before sign-in** (`connectionrefused`; the SDK falls back to from-cache snapshots, which the app never treats as confirmation), serves 503 to the readback during the 8 s window, releases both, and asserts: listener fault applied, readback fault served, status ≤ 8 s, commit on the server, **no success shown at 8 s**, recovery after restore, exactly one team = the journalled operation, committed document unchanged. Nothing relaxed; relative to `f325a23` three assertions are added (`readbacksFailed > 0`, `noFalseSuccess`, `listenBlocked > 0`). Run `38833204215` (all four jobs green; phone jobs select no R8b test), evidence 50:

| | Chromium | Firefox |
|---|---|---|
| N2-R8b | **PASS 10/10** — `listenBlocked` 5–6, `readbacksFailed=1`, `noFalseSuccessAt8s=true`, recovery automatic 0.35–5.8 s after restore | **PASS 10/10** — same, recovery 0.54–5.6 s |

**Result.** On `518e9e5`, with the listener unavailable and the authoritative readback returning 503, the app shows no success, creates no duplicate, overwrites nothing, and confirms the same operation once when connectivity returns. The readback-failure requirement is now **proven for every execution**, not inferred. The 1,520/0 full-matrix figure in §14.11 stands numerically, but its R8b component is vacuous for this claim; the proof is evidence 50. The full matrix has **not** been re-run on harness `4cc7ccf`.
