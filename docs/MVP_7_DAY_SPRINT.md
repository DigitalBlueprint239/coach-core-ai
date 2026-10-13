# Coach Core AI — Seven-Day MVP Recovery Sprint
Original window: **Oct 13–20, 2026**. Founder-required Film Analyzer rebaseline below supersedes the original release target. One status document shared through GitHub.

## Required film rebaseline — 2026-10-13 / Codex / Issue #50

Documentation branch `codex/issue-50-film-plan`, stacked on docs PR #45 to preserve prior milestones; retarget after #45 is reviewed/lands. Changed files: this sprint, shared context and new [FILM_ANALYZER_MVP_SPEC.md](FILM_ANALYZER_MVP_SPEC.md). Source inventory only: neither app contains a functional film workflow. No film tests/build newly run; all film acceptance tests planned, not PASS. Claude PR #49 inspected as an unmerged dependency, not integrated.

Revised sequence: Oct 13–14 contracts/security/media spike; Oct 15–19 new UI and secured backend/persistence; Oct 20 optional local synthetic demo; Oct 20–23 frame privacy/OpenAI suggestions and editable saved practice/play links; Oct 24–27 emulator/browser/physical tablet and independent security acceptance. Conditional full MVP assessment **Oct 27–30**, subject to prerequisites and review. 88–134 added engineer-hours, 106–161 with contingency, plus existing security work. No deployment authorized by schedule.

Codex proposes `src/features/film-analyzer/**`; Claude owns auth/Storage/Firestore/functions/gateway and frame-processing security. Shared App/Dashboard/PracticePlanner files sequenced after #49 and explicit ownership agreement. Request posted #39; confirmation pending. Product owner supplies footage rights/consent, upload limits, retention, acceptable AI errors and budget. Film now required but unimplemented/unverified; **MVP remains NO-GO**. Prior seven-day tasks remain historical context, not release permission.

## Day 1: Evidence and blockers

### P0 follow-up / 2026-10-13 / CC-CODEX-01/02/03

Codex read PR #52 `e0e842864f963295ab6602b7dc96d1931052acdd`, accepted ownership on #39, and reconciled film spec. D1–D10 PENDING; no decision-dependent film code. CC-CODEX-01 isolated standalone save/status and checkpoint investigation underway; exact Linux141 environment unavailable on Windows and requested from Claude. CC-CODEX-02/03 BLOCKED on reviewed lossless DTO/revision-rule/sign-out contract; no shared interfaces edited. [Detailed contract/dependency handoff](RELEASE_BLOCKER_CONTRACT_HANDOFF.md). Targets Oct15/16 23:59 America/New_York remain proposed until Coach Drew confirms. Security gap escalated immediately: existing cloud helpers/global queue and rule allowlists do not satisfy conflict-safe complete save/reopen. MVP NO-GO, no merge/deploy/live changes.
**Codex owns:** import four previous audit reports into `outputs/` with raw commands, tool versions, reproducible test evidence; fix 2 failing main tests and unloaded suite, or attach reproducible cause. Inventory 810 TS errors by category, not file count alone.
**Claude owns:** independent *read-only* review of auth, Firestore rules, AI secret exposure, minimum secure beta architecture. Produce a PR touching documentation only, no production secrets.
**Gate:** both agents report precise blockers, sources, commands, baselines.

## Day 2: Fix unsafe gates
Codex: test and correct build/typecheck configs and targeted frontend reliability. Claude: implement security repairs only on an explicitly assigned security branch after agreeing non-overlapping files with Codex.
Gate: prioritized blockers fixed or scoped out from shipping.

**Daily report — 2026-10-13 / Claude / #43 #46** | Branch `claude/day2-security-gateway` → recovery (PR pending review) | Passed (GitHub Actions, no secrets): rules emulator 30/30 (`npm --prefix tests/rules test`, `demo-coach-core-beta`), functions 69/69 + lint (`npm --prefix functions test`), web auth/AI client 21/21, bundle credential scan 10/10 (`bash .github/scripts/bundle-canary-scan.sh`; same script fails 4 checks on the base). Local: full web suite 360/360, `FieldMemo` suite load failure pre-exists (fixed in #40). Not tested: real-browser sign-in on a live project | Files: rules, `tests/rules/**`, `functions/**`, security workflow + scripts, auth/AI shared frontend files claimed on #39, `TeamContext.tsx`, `PracticePlanner.tsx`, `public/sw.js`, `firebase.json` headers, `package.json` prebuild line | Security: F-01..F-06, F-08, F-10 (partial), F-12 fixed; functions prod advisories 23→0; independent review M1/M3/M4/M5/L1–L3 fixed | Remaining: founder actions in `docs/security/CLAUDE_SECURITY_DAY2.md` §6; PR #47 ADR amendment (OpenAI-only); Playbook local storage per-user keys (Codex) | Next: founder §6 → approved staging deploy; Codex frontend AI screens on `coach-ai-client.ts`; Claude Day 3 diff review.

**Daily report — 2026-10-13 (Day 3) / Claude / #50 #39** | Branch `claude/day3-film-security-review` (docs only, stacked on #49) | Film Analyzer now required (founders). Reviewed Codex PR #51 spec: design accepted with required changes and 10 founder decisions; see `docs/security/FILM_SECURITY_REVIEW.md`. Ownership confirmed on #39 (owner-only tenancy; Claude: rules/functions/worker/playback/frame/AI; Codex: `src/features/film-analyzer/**`). Independent run of standalone PR #2: tsc 0, unit 18/18, canary 0, audit 0 = PASS; browser suite intermittent on Linux Chromium 141 (13/14 first run; route undo test 3/6 on repeat), likely a stale-"Saved" checkpoint race, so browser-PASS is not confirmed. Combined regression and staging smoke plans written (`COMBINED_REGRESSION_PLAN.md`, `STAGING_SMOKE_TEST_PLAN.md`). Status: security code PASS (unmerged); film, shared-device persistence and editable practice save FAIL (not implemented); staging BLOCKED. Next: founder decisions D1–D10; slices S1–S11. Oct 20 = conditional demo; Oct 27–30 = conditional full-MVP assessment, not a launch. MVP NO-GO.

## Day 3: Playbook reliability
Codex: drag + undo/redo, play loading/saving & validation, targeted regression tests. Claude: independent review of code diffs and negative tests. Gate: repeatable play workflow verified.

## Day 4: Authentication and persistence
Assigned developer: secure login/demo isolation, Firestore rules + ownership, save/reopen cross-session; preserve staging data. Gate: isolated test users cannot access other teams' resources.

## Day 5: Practice planner and integration
Selective Smart Playbook module integration into main app only if tests pass. AI must go server-side or be disabled in beta. Gate: end-to-end coach workflow.

## Day 6: Private deployment
Deploy a restricted staging preview with Firebase Hosting if credentials and plan are approved, capture exact URLs, config, rollback, logs. Test phone/tablet; perform security smoke tests. Never publish publicly without approval.

## Day 7: Coach acceptance / release decision
Run launch checklist. Ship ONLY if evidence passes all security + functional gates; otherwise demo known-good flows privately with mocks and publish a transparent blocker list.

## Day 2 report — 2026-10-13 / Codex / Issue #41
Standalone branch `codex/issue-41-types-drag-history` → `recovery/smart-playbook-mvp-2026`, [PR #1](https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-/pull/1). Main documentation branch `codex/issue-41-shared-docs` targets `recovery/coach-core-mvp-2026`; documentation-only draft held until PR #40 lands.

Verified: standalone diagnostics 810 → 0; same drag regressions 5 failed/2 passed → 7 passed; clean npm ci and production build pass. Build warning: main chunk 1,448.88 kB / gzip 449.67 kB. [Commands, evidence, changed files, and limits](ISSUE_41_DAY_2_HANDOFF.md). Standalone changes: theme declaration/global styles, SVG interfaces, final player-move commit/no-op guard, regression test/config, package scripts/dev tooling/lockfile, and evidence docs. Main changes are documentation only.

Remaining: native pointer/touch testing, generic route/property transaction snapshots, storage/export defects, one existing critical jsPDF finding, authentication/authorization and AI credential gates. Claude retains authentication/security ownership. Next owners: PR reviewer; Codex for separately scoped route/property history and native gesture tests; Claude for independent security review. No application merge, production changes, Firebase access, or deployment. MVP remains NO-GO.

## Core workflow follow-up — 2026-10-13 / Codex / Issue #48
Implementation [standalone PR #2](https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-/pull/2), branch `codex/playbook-core-workflows`, stacked on reviewed/unmerged PR #1. Shared documentation is updated in main draft PR #45, held for #40 landing. No production/recovery base overwrite or automatic merge.

Results: **18/18 unit tests**, **14/14 real production browser tests** across desktop mouse/tablet touch emulation, **3/3 repeated tablet pan/export cases**, **0 TypeScript diagnostics**, clean install/build pass, **0 npm audit findings**, **0 provider canary/legacy graph violations**. Main chunk 1,403.37 kB / gzip 436.44 kB retains the existing warning. Original context/history fails 3 focused transaction regressions. [Exact commands, artifacts, files and limitations](ISSUE_48_CORE_WORKFLOW_HANDOFF.md).

Repaired: route/property snapshots and batching; complete play/reference validation and safe failed saves; canonical PDF/install rendering and note pagination; jsPDF advisory; V2 editor/panels/drawing/touch controls. Latest OpenAI-only boundary disables browser AI pending an agreed protected gateway; no provider key/call or application integration. Remaining owners/gates: reviewer for PRs, Claude for auth/security/gateway, Codex for explicitly agreed integration; physical device/other engine and full authenticated coaching acceptance remain. **MVP NO-GO; no deployment.**

## One daily report format (commit or PR in this file)
Date/owner | GitHub branch & PR | Passed/failed/blocked tests + exact commands | Files changed | Security issues | What remains | Next owner. No unverified percentages.

## Daily report — 2026-10-13 / Claude / Issue #39
Branch `claude/security-audit-day1` → `recovery/coach-core-mvp-2026` (documentation only). **Passed:** none of the security gates. **Reproduced:** canary builds put `REACT_APP_OPENAI_API_KEY`, `REACT_APP_AI_PROXY_TOKEN` (main, `react-scripts build`) and `GEMINI_API_KEY` (Smart Playbook, `vite build`, ×6) into shipped JS; scratch render test fails with `useAuth must be used within an AuthProvider`; gitleaks over all refs: 24 findings in main = 2 Firebase web keys, 0 in Smart Playbook, no AI secret values. **Blocked:** Firestore/Storage emulator download (403, sandbox egress), so rules are not compiler-verified. **Files changed:** `docs/security/CLAUDE_SECURITY_AUDIT_DAY1.md` (new), this log, shared context. **Security issues:** 4 blockers (F-01..F-04), 2 high, 5 medium, 2 low — see report. **What remains:** owner console checks (report §4); Day 2 file-ownership agreement with Codex in #39 before any rules/auth/AI edits; emulator CI. **Next owner:** human owner for §4 checks; Claude for Day 2 security branch once ownership is agreed; Codex for dependency triage (F-11). No beta readiness claimed.

## Strict controls
- Codex and Claude do not share hidden context or update each other's chat memory. Share decisions via this GitHub repository only.
- Do not add keys, personal player data, customer records, or credentials.
- Preserve `master`, Smart Playbook `main`, existing Firebase projects.
- If waiting on access or unresolved critical vulnerabilities, do not ship.

## Daily report — 2026-10-13 / Codex / Issue #38
Branch `codex/issue-38-tests-audit` → `recovery/coach-core-mvp-2026`; PR [#40](https://github.com/DigitalBlueprint239/coach-core-ai/pull/40) review pending. Three milestones: original four reports imported unchanged with evidence/hash manifest; logger and FieldMemo test repairs completed; 810 standalone TypeScript errors classified by root cause. Main targeted 9/9 tests and full 344/344 tests (16/16 suites) pass, main TypeScript exits 0; production build succeeds with 15 existing lint warnings. Build results and exact commands are retained in [Day 1 evidence](ISSUE_38_DAY_1_EVIDENCE.md). Files changed: two test files, outputs reports/evidence, this sprint log, shared context, Day 1 evidence, and diagnostic classification. No production application/security code or lockfile changes.

Security/functional blockers remain: App.test still logs the AuthProvider crash despite passing; mocked tests do not establish real auth, tenant isolation, or coaching workflows. Standalone theme/icon fixes are recommendations only; drag undo and export defects remain. Next owners: reviewer for task PR, Claude independent security/auth review, Codex for separately scoped Playbook repairs. No beta readiness or deployment approval claimed.

## P0 milestone — 2026-10-13 / Codex

CC-CODEX-01 draft standalone PR #3: source/test `04946b75c94a57f811875e7c50524928fa2d9a3e`, evidence head `32a9291d07ff634029918d3e3a3377ded2e92729`. Unit19/19; typecheck0; build/canary pass; full browser21/21. Ten repeats each of three persistence/history workflows: Chromium141 desktop30/30, Firefox157 desktop30/30, touch emulation29/30 first batch then unchanged30/30 confirmation. Retained failure is a browser exit during final screenshot after fidelity assertions. Exact Claude Linux configuration/artifacts and review remain BLOCKED; physical devices untested. Full commands/results: standalone docs/CC_CODEX_01_SAVE_DIAGNOSIS.md and evidence/cc-codex-01.

CC-CODEX-02/03 BLOCKED pending Claude-reviewed lossless DTO/revision rules/session contract, escalated #39. Inspection and consent/conflict/edit UX plan only; no shared source changes or two-account authorization acceptance claimed. Film PR #51 reconciles #52; D1–D10 PENDING. Ownership accepted #39, proposed dates unconfirmed. See RELEASE_BLOCKER_CONTRACT_HANDOFF.md. MVP NO-GO; no merge/deployment.

## Contract reconciliation — 2026-10-13 / Codex

PR #53 `7267698ae890662281ff4510a4d232954e9f1190` reviewed: account/team DTO, revision transactions, scoped drafts and sign-out guard ACCEPTED on #39/#53. The prior blanket missing-contract blocker is superseded. Two exact practice bounds disagree: gateway title200 vs stored name120; gateway unbounded notes vs stored5000. Proposed Claude fixes and boundary tests in PERSISTENCE_CONTRACT_RECONCILIATION.md. D10 gates import only, not isolation or practice editing. Client acceptance remains outstanding; no shared source changes in this review milestone.

CC01 Claude reports140/140 Linux Chromium on source04946b7; links now alongside Codex Firefox30/30 and retained touch29/30 failure/30/30 confirmation. Raw Linux log paths absent in published tree; requested artifacts plus remaining configuration mismatch/exit trace classification. Physical tablet untested. Proposed Oct14 noon ET contract checkpoint and Oct16 implementation targets retained. MVP NO-GO.

**Daily report — 2026-10-13 (CC-NEXT) / Claude / #39** | PR #52 (`f154e05`), draft PR #53, candidate `claude/integration-candidate-2026-10-13` @ `32bd4e8` (no PR) | Passed: Playbook PR #3 browser ×10 140/140 (Linux Chromium 141, desktop + touch emulation); candidate web 366/366, tsc 0, build, rules emulator 43/43 (CI), functions 69/69, bundle scan 10/10. Failed: none. Blocked: second browser engine (sandbox), physical devices, emulator E2E R10–R13, film (D1–D7), staging (D5), client persistence P-10..P-16 (Codex) | Files: `docs/security/{INTEGRATION_REPORT_2026-10-13,FOUNDER_DECISION_PACKET}.md`, `docs/evidence/integration/*` | Security: no new blockers; main-app prod advisories 10 open | Next: Codex Firefox ×10 + #53 confirmation; founder D1–D10.

**Daily report — 2026-10-13 (CC-NEXT-04) / Claude / #39** | PR #54 `claude/e2e-emulator-harness` @ `2f8c61e` (stacked on #53 `a4cea1e` → #49); docs #52 | Passed: E2E on Firebase emulators, Chromium 156 + Firefox 157, ×10 140/140 each (14 runnable incl. 4 SDK-in-browser), rules (with P-08b), functions 73/73, bundle scan 12/12 | Blocked: 8 client workflows (Codex P-10..P-17) and D10; film (D1–D7); real Google/email auth + CORS/token checks (staging, D5); physical devices | Files: `e2e/**`, `src/firebase.ts` emulator block, `src/e2e-support/**`, `.env.production`, workflow, guard/scan lines | Security: production bundle leak of test hooks caught by new scan check and fixed pre-merge; `COACH_CORE_ALLOWED_ORIGINS` must be a JSON array (smoke SEC-09) | Next: Codex flips P-10..P-17 to real tests; founder D5/D10.
