# Coach Core AI — Seven-Day MVP Recovery Sprint
Window: **Oct 13–20, 2026** (aggressive target, not guaranteed launch). One status document shared through GitHub.

## Day 1: Evidence and blockers
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
