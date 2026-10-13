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

## Strict controls
- Codex and Claude do not share hidden context or update each other's chat memory. Share decisions via this GitHub repository only.
- Do not add keys, personal player data, customer records, or credentials.
- Preserve `master`, Smart Playbook `main`, existing Firebase projects.
- If waiting on access or unresolved critical vulnerabilities, do not ship.

## P0 milestone — 2026-10-13 / Codex

CC-CODEX-01 draft standalone PR #3: source/test `04946b75c94a57f811875e7c50524928fa2d9a3e`, evidence head `32a9291d07ff634029918d3e3a3377ded2e92729`. Unit19/19; typecheck0; build/canary pass; full browser21/21. Ten repeats each of three persistence/history workflows: Chromium141 desktop30/30, Firefox157 desktop30/30, touch emulation29/30 first batch then unchanged30/30 confirmation. Retained failure is a browser exit during final screenshot after fidelity assertions. Exact Claude Linux configuration/artifacts and review remain BLOCKED; physical devices untested. Full commands/results: standalone docs/CC_CODEX_01_SAVE_DIAGNOSIS.md and evidence/cc-codex-01.

CC-CODEX-02/03 BLOCKED pending Claude-reviewed lossless DTO/revision rules/session contract, escalated #39. Inspection and consent/conflict/edit UX plan only; no shared source changes or two-account authorization acceptance claimed. Film PR #51 reconciles #52; D1–D10 PENDING. Ownership accepted #39, proposed dates unconfirmed. See RELEASE_BLOCKER_CONTRACT_HANDOFF.md. MVP NO-GO; no merge/deployment.

## Contract reconciliation — 2026-10-13 / Codex

PR #53 `7267698ae890662281ff4510a4d232954e9f1190` reviewed: account/team DTO, revision transactions, scoped drafts and sign-out guard ACCEPTED on #39/#53. The prior blanket missing-contract blocker is superseded. Two exact practice bounds disagree: gateway title200 vs stored name120; gateway unbounded notes vs stored5000. Proposed Claude fixes and boundary tests in PERSISTENCE_CONTRACT_RECONCILIATION.md. D10 gates import only, not isolation or practice editing. Client acceptance remains outstanding; no shared source changes in this review milestone.

CC01 Claude reports140/140 Linux Chromium on source04946b7; links now alongside Codex Firefox30/30 and retained touch29/30 failure/30/30 confirmation. Raw Linux log paths absent in published tree; requested artifacts plus remaining configuration mismatch/exit trace classification. Physical tablet untested. Proposed Oct14 noon ET contract checkpoint and Oct16 implementation targets retained. MVP NO-GO.
