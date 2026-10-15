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


## 2026-10-14 — #65 Phase A isolated review milestone

Inventory completed before changes: recovery/charter has only legacy model CI; reviewed unmerged stack also has Claude's security and emulator gates. No duplicate CI/command center or acceptance suite. Phase A extends #66 with docs/agents/AGENT_RUNBOOK.md, missing issue/PR templates, private SECURITY.md routing, machine-readable test-summary.json and read-only evidence-format checks in existing model workflow. Legacy compute quarantined; credential-file Firestore/comment writes removed. Permissions contents:read, public standard Ubuntu runner capped5minutes; costs/retention documented before activation. No nightly agents/models/settings/deployments activated. See docs/agents/PHASE_A_VALIDATION.md for exact local and hosted observations.

Acceptance repair first: R1c owner-resume code82d46cc33b7933d4de19b84a0acc553553c51d44 on isolated codex/r1c-owner-resume; #64 remains8f0d9f7 frozen. Independent candidate8 pending Claude; #63 at16e6067 classifies N1/helper races and F1 mock connection while N2/H2/FX-02 stay open. Earlier failed evidence and missing initial L1 ZIP/PNG remain disclosed in #68.

F01–04 code fixes reported in #52 are distinct from unverified live prerequisites. Ordinary coaching protections independently verified on specific #63 candidates, not shipped acceptance. D1–D9 directions settled per founder; detailed existing approval source still required (#61 reconciliation), not nine reopened decisions. D10 implementation/testing approved; no deletion. Film Analyzer remains MVP-required #50, blocked; untested film/AI/staging/physical metrics NOT MEASURED. MVP NO-GO; AI generation disabled; BDN-AEO-001 queued. No protected merge, spending, live data/configuration, deployment or branch-protection change.

Phase A observed follow-up: draft #70; head724f1a7, PR merge21a635f, Actions38658177801/job116172824702 PASS12/12 format checks, legacy model job quarantined/SKIPPED. Initial38657911581 checkout FAIL preserved separately; inherited gitlink auth-cleanup cause, no module deletion. R1c client repair prioritized in #69 (source82d46cc), independent candidate8 pending. Evidence-format PASS is not product acceptance.
