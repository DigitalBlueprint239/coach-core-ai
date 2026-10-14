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

**Verdict: FAIL**, with 2 open founder-rule defects (R1, R2) in Codex-owned client code. The core import is verified in real browsers against real rules **only after** a Claude rules fix. Mocked-SDK tests did not and could not prove server authorization.

### 7.1 What was tested

| Item | SHA |
|---|---|
| PR #55 reported source | `6a412e7` (code), docs/evidence head `819802c` |
| PR #55 base | #54 `66dfadf` (stale: my later #54 commits show as "removed" in GitHub's diff; a real merge keeps both, clean) |
| Acceptance branch (this test layer, no Codex files changed) | `claude/d10-p13-acceptance`. ×10 at **`e4e139f`**; later head `7d718e1` adds only failure diagnostics |
| Rules fix | #53 **`51760a4`** (measurement test `89617d4`) → #54 `ea721e1` |
| Combined candidate | `claude/integration-candidate-2026-10-14`. ×10 at **`e43b525`** (code = acceptance branch + #40's 2 test-file repairs) |

**Environment:** Chromium 156.0.8078.4 and Firefox 157.0 (Playwright 1.64.0) on Linux `ubuntu-latest`. Firebase emulators via firebase-tools 15.33.0, project `demo-coach-core-e2e`, repo `firestore.rules`. `retries: 0`, `workers: 1`. Synthetic data only. Emulator authentication only. No provider calls.

**Commands:**
- the CI workflow `e2e-emulator.yml` (push = ×1; `workflow_dispatch repeat_each=10`);
- locally `CI=true npx react-scripts test --watchAll=false`, `npx tsc --noEmit`, `bash scripts/security/verify-release-build.sh`.

### 7.2 Review of the implementation (code, not report)

| Requirement | Finding |
|---|---|
| Explicit account/team consent | ✔ The prompt only appears for a signed-in coach whose selected team they own, and names the team. Nothing is written before "Import plays" |
| Create-only, idempotent copies | ✔ Deterministic id = SHA-256 of uid + team + full source play. A transaction creates the copy, or verifies an identical existing one. **But it was blocked by the rules (R0, fixed)** |
| Exact server read-back before success | ✔ `getDocFromServer` plus canonical full-content comparison for every copy; the decision is written only after all copies verify (D10-10) |
| Property and optional-timestamp fidelity | ✔ All player/route properties, including extras, are kept. Timestamps keep millisecond precision. Absence is encoded in the id flags (D10-01, D10-11) |
| Partial failure and safe retry | ✔ D10-04: kept partial copy, no decision, retry without rewrite |
| Account/team switch while pending | ✔ Stale completions are discarded and nothing is attributed to another coach (D10-07, D10-08). ✗ The interrupted import is re-offered as new in the other team (**R2**) |
| Refusal to overwrite a changed remote copy | ✔ D10-05 |
| Both legacy formats preserved, no cross-format conversion | ✔ `smartPlaybook_plays` and `coachcore-playbook` are byte-identical in every test; the standalone format is never read |
| Real legacy format accepted | ✔ `PlayController.savePlay` writes exactly the accepted keys with canonical ISO timestamps. Any other shape fails the whole batch visibly (originals kept) |
| Cross-account exposure | ✔ Coach B cannot see or read A's copies (D10-06, D10-09). ✗ B is still **offered** the device plays A already imported (**R1**) |

### 7.3 Defects

| ID | Severity | Owner | Status | Detail |
|---|---|---|---|---|
| R0 | **Blocker** | Claude (rules) | **FIXED** `51760a4` | `get` on a missing play id was denied (`resource.data` on a null resource), so `copy()`'s first transactional read failed: **0 copies in every import** (CI `3806f40`; rules test `89617d4` FAIL). Fix: `allow get: if isBetaUser() && (resource == null || ownsTeam(resource.data.teamId))` for plays and practicePlans; `list` unchanged; negative controls pass; rules 48/48 |
| R1 | High (founder rule) | Codex | OPEN | D10-06b FAIL 10/10 on both engines. Bounded fix: a device-level claim after a verified import, so another account is not offered the same originals |
| R2 | High (founder rule) | Codex | OPEN | D10-07b FAIL 10/10 on both engines. Bounded fix: a pending marker before the first write; another team's prompt must point back to the unfinished team |
| R3 | Low | Codex | OPEN | "Not now" is stored as a permanent decline with no later re-offer. Rename it or add a re-entry point |
| R4 | Info | Codex / deploy decision | OPEN | `D10_APPROVED = true` is a build constant, so the prompt ships in release builds |
| H1 | Intermittent | Claude (harness) | OPEN | Firefox only, 3 of 20 ×10 repeats: "Team created successfully!" not seen within 10 s at team creation (D10-09, T02, D10-02). Chromium 0/20. Cause not established; diagnostics added in #54 `3989218`. No timeout raised, no retry added |

### 7.4 Results

| Run | Chromium 156 | Firefox 157 |
|---|---|---|
| ×1 before rules fix `3806f40` | 16 PASS / 11 FAIL (D10 import never creates copies) | same |
| ×1 after fix `9aa2666` | 26 PASS / 2 FAIL (06b, 07b) / 7 BLOCKED | same |
| ×10 acceptance `e4e139f` (job `115645207229`) | **260 PASS / 20 FAIL** / 70 BLOCKED. FAIL = 06b 10/10 + 07b 10/10 | **258 PASS / 22 FAIL**. FAIL = 06b 10/10, 07b 10/10, D10-09 1/10 (H1), T02 1/10 (H1) |
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

`docs/evidence/d10-acceptance/` contains 13 files plus `SHA256SUMS.txt`:
- the CI annotations of every run listed above, including the failing ones and the truncated first ×10;
- baseline jest/tsc at `52fc3d9`;
- candidate-3 jest/tsc/release proof/manifest.

Job logs and Playwright artifacts (traces, screenshots) are kept by GitHub for 14 days under each run's `e2e-results-<sha>` artifact. **NOT MEASURED:** physical devices; real Auth/email/Google; staging; performance.

### 7.6 Scope reminder

D10 is one slice. CC02 (ordinary cloud editing, conflict recovery, sign-out recovery) and CC03 (practice-plan save/reopen) are **not implemented**, and their 7 tests remain BLOCKED. **MVP stays NO-GO.**
