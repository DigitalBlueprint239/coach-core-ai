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

## Security status — Issue #39 / Claude — 2026-10-13
Report: [`docs/security/CLAUDE_SECURITY_AUDIT_DAY1.md`](security/CLAUDE_SECURITY_AUDIT_DAY1.md) (branch `claude/security-audit-day1`, docs-only PR to recovery). **Security gate: FAIL — private beta blocked.**
- Blockers: F-01 AI keys compiled into client bundles (OpenAI/proxy token in main, Gemini in Smart Playbook) — canary builds reproduced; F-02 no working sign-in, only anonymous auth, dual auth contexts (crash reproduced); F-03 Storage rules allow any signed-in user to read/write every team's files; F-04 `firestore.rules` uses invalid `else error()` syntax, so deployed rules are unknown.
- Full git history of both repos scanned (gitleaks + fingerprinting): no OpenAI/Gemini/Anthropic/GitHub secret values ever committed; 2 Firebase web keys (public by design) need API restrictions.
- Rules-emulator compile/tests BLOCKED in agent sandbox (egress to storage.googleapis.com denied); propose a GitHub Actions emulator workflow on Day 2.
- Owner actions pending (human only): check hosting env vars for AI keys and rotate if ever set; restrict Firebase web keys / confirm Generative Language API status; confirm enabled sign-in providers and deployed rules. Details in report §4.
- Independent cross-check of Codex `outputs/SECURITY_FINDINGS.md`: agree with S01–S09, S11, S12, S14, S15; adds anonymous-auth exposure, history scan, Gemini-via-web-key path, youth-data-to-AI privacy, Functions PII.

## Workflow / ownership
- Codex = implement and test core feature repairs / integration; Claude = parallel independent security/auth review and test plans, NOT simultaneous edits to Codex-owned files.
- GitHub issues/PRs and this document are the only canonical status. Each agent reads this file and `AGENTS.md` before work, logs commands + test evidence, notes blockers, and proposes concise updates via PR to this file.
- Two agents never push to the same branch or edit overlapping files without assigned ownership. Separate work branches, PR review, explicit integration owner. No merges to `master` without approval.
- Daily single update in `docs/MVP_7_DAY_SPRINT.md`; do not claim cross-product AI memory auto-synchronizes.
