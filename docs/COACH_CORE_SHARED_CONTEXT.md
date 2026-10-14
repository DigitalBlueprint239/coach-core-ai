# Coach Core AI — Shared Recovery Context
Updated: 2026-10-13. Canonical project status for Codex, Claude, and human team. This file is versioned project context, NOT a claim of updating anyone's personal AI memory.

## North star
Ship a **restricted private coaching MVP** by 2026-10-20 if and only if safety and functional gates pass. No false "launch ready" claims; defer release or reduce scope when necessary. One codebase and one deployment pipeline eventually; avoid premature merge. Original branches, environments, secrets, and Firestore records are protected.

## Repositories
- Main (candidate canonical): https://github.com/DigitalBlueprint239/coach-core-ai, default `master`; working recovery branch `recovery/coach-core-mvp-2026`.
- Smart Playbook (source of selective proven modules): https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook- (private); create dedicated recovery branch before changes.
- V3 repository reported empty: `DigitalBlueprint239/Coach-Core-Smart-Playbook-V3-`.
- Target architecture *proposed, not deployed*: one consolidated GitHub app, Firebase Hosting + Auth + Firestore + server-side AI endpoint. Firebase staging project `coach-core-mvp-staging-239` seen in UI, with Firestore present but no visible data collections, 0 Auth users, and Hosting Get Started. Original `coach-core-ai` Firebase project referenced in repo; access and hosting unverified.

## Original Codex audit — imported in Issue #38 task PR
- Both apps produce builds.
- Main platform: 338 tests pass, 2 fail, 1 test suite does not load.
- Standalone Smart Playbook: 810 TypeScript errors; broken drag undo; partial storage validation; export defects.
- Authentication and security problems block beta.
- Claimed reports in Codex workspace: `outputs/COACH_CORE_RECOVERY_AUDIT.md`, `outputs/MVP_FEATURE_TEST_MATRIX.md`, `outputs/SECURITY_FINDINGS.md`, `outputs/MVP_RECOVERY_ROADMAP.md`. **Imported byte-for-byte with sanitized evidence under outputs/ on codex/issue-38-tests-audit; review and merge into the recovery base are pending.** See docs/ISSUE_38_DAY_1_EVIDENCE.md and its SHA-256 manifest. Original baseline results remain unchanged.

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

## Issue #38 milestones — 2026-10-13 / Codex
- Milestone 1: four original reports and evidence imported; unchanged report hashes verified.
- Milestone 2: test-only fixes for logger environment setup and FieldMemo import/canvas assertions. Full main Jest: 16 suites / 344 tests pass; main TypeScript exit 0; production build succeeds with 15 existing lint warnings. Existing App.test AuthProvider crash still logs despite its passing assertion; real dashboard/login remain unverified.
- Milestone 3: standalone tsc rerun confirms 810 errors across 30 files: 807 missing DefaultTheme augmentation, 1 required GlobalStyles theme prop, 2 missing SVG prop interfaces. Classification complete; repairs proposed but not applied.
- Branch: codex/issue-38-tests-audit; target recovery/coach-core-mvp-2026. PR [#40](https://github.com/DigitalBlueprint239/coach-core-ai/pull/40) review/merge pending. Evidence and commands: [Day 1 evidence](ISSUE_38_DAY_1_EVIDENCE.md); [Playbook classification](SMART_PLAYBOOK_TYPESCRIPT_CLASSIFICATION.md).
- Claude retains independent security/auth review. No production, Firebase, auth/rules, or AI credential implementation changes. MVP remains NO-GO pending security and critical workflow verification.