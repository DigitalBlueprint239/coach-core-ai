# CC-NEXT-04: Real-browser tests on the Firebase Emulator Suite

Claude, 2026-10-13. PR #54 (`claude/e2e-emulator-harness`, stacked on #53 → #49).

Nothing was merged, deployed, billed or configured live. No real credentials or footage were used. AI stays off.

## 1. Tested commit, environment, commands

| | |
|---|---|
| Tested SHA | **`ea01bd4`** |
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
| **Cloud save/reopen** | T01 team created in UI is in Firestore and reopens on a fresh device (new browser profile) | UI | **PASS** ×10 both |
| | Playbook play save → reload → reopen (P-15) | UI | **BLOCKED**: Codex client (no cloud save for plays yet) |
| **Practice-plan edits** | AI01 planner reaches the real gateway function, which refuses with "AI features are turned off" (kill switch); no provider request | UI | **PASS** ×10 both |
| | Plan edit → save → reload identical (P-16) | UI | **BLOCKED**: Codex client (planner has no save/edit); AI generation also gated by founder approval |
| **Concurrent edits** | C01 two devices of one coach load revision 1: first save accepted, stale second save and revision-less save denied, stored doc = first save | SDK-in-browser (server half) | **PASS** ×10 both |
| | Conflict screen (reload / keep copy / export) (P-14) | UI | **BLOCKED**: Codex client |
| **Access denial** | T03 coach B can't read, edit, or write plays/plans into coach A's team; A's team unchanged | SDK-in-browser + UI | **PASS** ×10 both |
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

## 5. Regression on this branch

- Web jest: 362/362. The one suite-load failure (FieldMemo) also fails on the base branch and is fixed by #40, which is not in this stack.
- tsc: 0.
- CI: rules emulator, functions, web auth and bundle scan all **success** at `ea01bd4`.
