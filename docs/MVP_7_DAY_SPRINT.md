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

## One daily report format (commit or PR in this file)
Date/owner | GitHub branch & PR | Passed/failed/blocked tests + exact commands | Files changed | Security issues | What remains | Next owner. No unverified percentages.

## Strict controls
- Codex and Claude do not share hidden context or update each other's chat memory. Share decisions via this GitHub repository only.
- Do not add keys, personal player data, customer records, or credentials.
- Preserve `master`, Smart Playbook `main`, existing Firebase projects.
- If waiting on access or unresolved critical vulnerabilities, do not ship.

## Daily report — 2026-10-13 / Codex / Issue #38
Branch `codex/issue-38-tests-audit` → `recovery/coach-core-mvp-2026`; PR [#40](https://github.com/DigitalBlueprint239/coach-core-ai/pull/40) review pending. Three milestones: original four reports imported unchanged with evidence/hash manifest; logger and FieldMemo test repairs completed; 810 standalone TypeScript errors classified by root cause. Main targeted 9/9 tests and full 344/344 tests (16/16 suites) pass, main TypeScript exits 0; production build succeeds with 15 existing lint warnings. Build results and exact commands are retained in [Day 1 evidence](ISSUE_38_DAY_1_EVIDENCE.md). Files changed: two test files, outputs reports/evidence, this sprint log, shared context, Day 1 evidence, and diagnostic classification. No production application/security code or lockfile changes.

Security/functional blockers remain: App.test still logs the AuthProvider crash despite passing; mocked tests do not establish real auth, tenant isolation, or coaching workflows. Standalone theme/icon fixes are recommendations only; drag undo and export defects remain. Next owners: reviewer for task PR, Claude independent security/auth review, Codex for separately scoped Playbook repairs. No beta readiness or deployment approval claimed.
