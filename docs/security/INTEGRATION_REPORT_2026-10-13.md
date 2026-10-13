# Combined Integration Review — Candidate 1 (CC-NEXT-02)

Claude, 2026-10-13. An isolated integration candidate built only to test that the pieces work together. **No existing PR or shared branch was modified, nothing was merged into the recovery branch, and nothing was deployed.**

## 1. Candidate

- **Branch:** `claude/integration-candidate-2026-10-13` (pushed for CI only, no PR), head `32bd4e8`.
- **Base:** `origin/recovery/coach-core-mvp-2026` @ `3992d8d`.
- **Merge order** (each a `--no-ff` merge of the PR head at the time):

| # | PR | Branch @ commit | Result |
|---|---|---|---|
| 1 | #40 Codex test repair | `codex/issue-38-tests-audit` @ `dd7fe83` | clean |
| 2 | #42 Day 1 audit docs | `claude/security-audit-day1` @ `498c4cc` | clean |
| 3 | #45 Codex docs | `codex/issue-41-shared-docs` @ `503af06` | **doc conflict** (below) |
| 4 | #49 Day 2 security | `claude/day2-security-gateway` @ `341e95b` | clean |
| 5 | #51 Film spec | `codex/issue-50-film-plan` @ `2b804ad` | clean |
| 6 | #52 Day 3 docs | `claude/day3-film-security-review` @ `e1cebb8` | clean |
| 7 | #53 Persistence contract (draft) | `claude/persistence-contract-rules` @ `7267698` | clean |

**Integration finding.** #42 and #45 both append a section at the same spot in `docs/COACH_CORE_SHARED_CONTEXT.md`. In the candidate I kept both sections in full (documentation only, no code). The real merge needs the same manual resolution by whoever lands the second of the two.

## 2. Commands and results (candidate `32bd4e8`)

| Gate | Command | Result |
|---|---|---|
| R1 Web suite incl. #40 repair | `CI=true npx react-scripts test --watchAll=false` | **PASS**: 18/18 suites, **366/366** tests. `FieldMemo` now loads. No `useAuth must be used within an AuthProvider` log |
| R2 Typecheck | `npx tsc --noEmit` | **PASS**, 0 diagnostics |
| R3 Production build (runs the prebuild secret guard) | `CI=false npm run build` | **PASS**; compiled with existing ESLint warnings (7 files, none in files changed by #49/#53) |
| R4 Rules emulator | CI job *Firestore & Storage rules* on `32bd4e8` (`demo-coach-core-beta`) | **PASS 43/43**: 30 existing + 13 persistence-contract cases |
| R5 Functions | `npm --prefix functions run lint && npm --prefix functions test` | **PASS**, lint clean, **69/69** |
| R6 Bundle credential scan | `bash .github/scripts/bundle-canary-scan.sh` | **PASS 10/10** |
| R14 Production dependency audit | `npm audit --omit=dev` | functions **0**; tests/rules **0**; main app **10 (3 critical, 5 high, 2 moderate)**. **OPEN**: Codex triage, mostly build-time `react-scripts` chain |
| Web auth (CI) | CI job *Web auth tests* | **PASS** |
| R7–R9 Standalone Playbook | See §4 | See §4 |
| R10–R13 Real-browser emulator E2E (auth, coaching, film, negative) | — | **BLOCKED**: harness not built; needs Auth/Storage/Functions emulators wired to the production build |

## 3. Gates requested in CC-NEXT-02

| Gate | Status | Evidence / reason |
|---|---|---|
| Sign-in states (signed-out, Google/email-link, unverified, not-beta, anonymous blocked, expired, revoked) | **PASS (mocked SDK)** | `useAuth.test.tsx` 15 cases. Real Firebase Auth emulator in a browser: **BLOCKED** (R10) |
| Sign-out clears only session data; recovery guard can cancel | **PASS (unit)** | `useAuth.test.tsx` (sign-out cleanup; guard cancel, throw and proceed) |
| Account switching with unsynced drafts on one device | **BLOCKED** | Client implementation (Codex, P-10/P-11) not built |
| Cross-team denial | **PASS (rules + gateway)** | Emulator: teams/plays/plans/storage/persistence cases; gateway `team-access-denied` tests. UI E2E: **BLOCKED** (R13) |
| Legacy local-play import consent | **BLOCKED** | Founder decision D10 pending; client not built. Policy: originals preserved byte-for-byte, no import while pending (`PERSISTENCE_CONTRACT.md` §4) |
| Save/reopen fidelity | **PASS (data layer)**; UI **BLOCKED** | P-03 emulator write→read field equality. UI round-trip (P-15) not built |
| Concurrent-edit protection | **PASS (rules)**; client **BLOCKED** | P-04..P-07: stale second writer denied, skip/backwards/omitted revision denied. Conflict UI (P-14) not built |
| Editable AI practice-plan save | **PASS (rules)**; UI **BLOCKED** | P-08 lossless fields; client adapter (Codex) not built |
| Film Analyzer: upload, validation, private playback, tags, links, frames, AI, retention | **BLOCKED** | Not implemented; founder decisions D1–D7 pending (`FOUNDER_DECISION_PACKET.md`) |
| Staging smoke tests | **BLOCKED** | No approved environment (D5) |

## 4. Standalone Playbook (CC-NEXT-01 evidence)

Repo `Coach-Core-Smart-Playbook-`. Environment: Linux, Playwright bundled **Chromium 141.0.7390.37**. `tablet-touch` is **touch emulation** (`hasTouch`), not a physical device. `retries: 0`.

| Run | Commit | Result |
|---|---|---|
| Baseline, original test ×10 per project | PR #2 `aea4fd9` | **FAIL 10/20** (desktop-mouse 3, tablet-touch 7). Log: `docs/evidence/integration/playbook-pr2-aea4fd9-chromium141-x10.log` |
| Root-cause instrumentation (DIAG3: unmodified test + in-page timeline) | `aea4fd9` | 5/20 failed, all at an Undo checkpoint. In every failure the test read storage **+43 to +74 ms** after Undo, while the label still said **"Saved"** from the previous save; the label changed to "Unsaved changes" only at +65 to +83 ms. Undo itself was never lost (DIAG2: 20/20 persisted after settling). **Demonstrated cause:** the save-status label lags the state by one effect, and the test checkpoint trusted the label |
| Codex correction, full browser suite ×10 | PR #3 `04946b7` | **PASS 140/140** (7 tests × 10 × `chromium-desktop` + `chromium-tablet-touch`), 11.3 min, `EXIT=0`. Log: `docs/evidence/integration/playbook-pr3-04946b7-chromium141-x10.log` |
| PR #3 unit / typecheck / canary | `04946b7` | 19/19 · tsc 0 · canary 0 violations |

**Independent review of PR #3:**
- **Product fix.** `saveStatus` is derived during render (`savedSnapshot === playbook`), so the label can no longer show "Saved" for unsaved state.
- **Test fix.** Every checkpoint now polls until the **entire stored playbook** equals the expected book after each drag, undo, redo, depth edit and flip. On failure it attaches the persisted book.
- No `waitForTimeout` or sleeps were added. Retries stay 0. All 4 removed per-route `expect`s are retained verbatim on the replacement lines, and 26 net assertions were added. **Assertions were strengthened, not weakened.**
- **Observation (not a blocker).** The drag now aims at the left half of the player disc because the disc centre overlaps a defender at the fixture scale. Worth a UX check on real tablets: overlapping players can hijack touch drags.

**Two-engine requirement:** the second engine is **BLOCKED in this sandbox**, because Firefox/WebKit downloads are refused by the network allowlist. Codex's Firefox ×10 logs will be reviewed when posted. **Physical iPad/Android: NOT TESTED** (Day 6 staging task).

## 5. Not done / escalations

- R10–R13 need an emulator E2E harness. I propose building it as a separate Claude slice once #53 is confirmed. It is not built yet.
- Main-app production advisories remain open (Codex dependency triage).
- The candidate branch is for evidence only. It must not be merged; the real merges happen PR by PR after review.
