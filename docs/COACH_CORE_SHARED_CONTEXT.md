# Coach Core AI — Shared Recovery Context
Updated: 2026-10-13. Canonical project status for Codex, Claude, and human team. This file is versioned project context, NOT a claim of updating anyone's personal AI memory.

## North star
Ship a **restricted private coaching MVP** by 2026-10-20 if and only if safety and functional gates pass. No false "launch ready" claims; defer release or reduce scope when necessary. One codebase and one deployment pipeline eventually; avoid premature merge. Original branches, environments, secrets, and Firestore records are protected.

## Repositories
- Main (candidate canonical): https://github.com/DigitalBlueprint239/coach-core-ai, default `master`; working recovery branch `recovery/coach-core-mvp-2026`.
- Smart Playbook (source of selective proven modules): https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook- (private); create dedicated recovery branch before changes.
- V3 repository reported empty: `DigitalBlueprint239/Coach-Core-Smart-Playbook-V3-`.
- Target architecture *proposed, not deployed*: one consolidated GitHub app, Firebase Hosting + Auth + Firestore + server-side AI endpoint. Firebase staging project `coach-core-mvp-staging-239` seen in UI, with Firestore present but no visible data collections, 0 Auth users, and Hosting Get Started. Original `coach-core-ai` Firebase project referenced in repo; access and hosting unverified.

## Latest Codex audit — USER-REPORTED, detailed reports not yet committed here
- Both apps produce builds.
- Main platform: 338 tests pass, 2 fail, 1 test suite does not load.
- Standalone Smart Playbook: 810 TypeScript errors; broken drag undo; partial storage validation; export defects.
- Authentication and security problems block beta.
- Claimed reports in Codex workspace: `outputs/COACH_CORE_RECOVERY_AUDIT.md`, `outputs/MVP_FEATURE_TEST_MATRIX.md`, `outputs/SECURITY_FINDINGS.md`, `outputs/MVP_RECOVERY_ROADMAP.md`. **These are not yet verified or copied to the GitHub recovery branch.** Import reports with evidence; no fabricated details.

## Private MVP must-have
1. Secure sign-in and authenticated team workspace (or an explicitly restricted demo mode isolated from real data).
2. Create/edit formations and routes, drag players, correct undo/redo.
3. Save/reopen plays reliably with ownership checks.
4. Generate/edit/save practice plans; AI credentials never in client bundle.
5. Mobile/tablet usable for core flows.
Defer film AI, NIL, blockchain, advanced analytics, billing, and broad public release.

## Gates
- Reproducible builds + typecheck; no unexplained high-severity errors in shipped surface.
- Passing main test suite including the 2 failures and unloaded suite, plus critical feature regression tests.
- Private beta auth, authorization, Firestore rules, and AI-secret handling verified.
- Play save/reopen, undo/redo, exports (if included in MVP), and practice plans pass end-to-end tests.
- Production data untouched and restricted preview with a rollback plan.
- Report blocked cases truthfully.

## Workflow / ownership
- Codex = implement and test core feature repairs / integration; Claude = parallel independent security/auth review and test plans, NOT simultaneous edits to Codex-owned files.
- GitHub issues/PRs and this document are the only canonical status. Each agent reads this file and `AGENTS.md` before work, logs commands + test evidence, notes blockers, and proposes concise updates via PR to this file.
- Two agents never push to the same branch or edit overlapping files without assigned ownership. Separate work branches, PR review, explicit integration owner. No merges to `master` without approval.
- Daily single update in `docs/MVP_7_DAY_SPRINT.md`; do not claim cross-product AI memory auto-synchronizes.


## 2026-10-14 — #65 Phase A isolated review milestone

Inventory completed before changes: recovery/charter has only legacy model CI; reviewed unmerged stack also has Claude's security and emulator gates. No duplicate CI/command center or acceptance suite. Phase A extends #66 with docs/agents/AGENT_RUNBOOK.md, missing issue/PR templates, private SECURITY.md routing, machine-readable test-summary.json and read-only evidence-format checks in existing model workflow. Legacy compute quarantined; credential-file Firestore/comment writes removed. Permissions contents:read, public standard Ubuntu runner capped5minutes; costs/retention documented before activation. No nightly agents/models/settings/deployments activated. See docs/agents/PHASE_A_VALIDATION.md for exact local and hosted observations.

Acceptance repair first: R1c owner-resume code82d46cc33b7933d4de19b84a0acc553553c51d44 on isolated codex/r1c-owner-resume; #64 remains8f0d9f7 frozen. Independent candidate8 pending Claude; #63 at16e6067 classifies N1/helper races and F1 mock connection while N2/H2/FX-02 stay open. Earlier failed evidence and missing initial L1 ZIP/PNG remain disclosed in #68.

F01–04 code fixes reported in #52 are distinct from unverified live prerequisites. Ordinary coaching protections independently verified on specific #63 candidates, not shipped acceptance. D1–D9 directions settled per founder; detailed existing approval source still required (#61 reconciliation), not nine reopened decisions. D10 implementation/testing approved; no deletion. Film Analyzer remains MVP-required #50, blocked; untested film/AI/staging/physical metrics NOT MEASURED. MVP NO-GO; AI generation disabled; BDN-AEO-001 queued. No protected merge, spending, live data/configuration, deployment or branch-protection change.
