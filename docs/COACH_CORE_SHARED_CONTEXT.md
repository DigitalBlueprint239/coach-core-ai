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


## Integrated-candidate repeat verification — 2026-10-14 / Codex

Application/runtime tested: `4757eaffad31664dae727c34355aca8109fcc63c`, includes #64 `8f0d9f7`, L0 `12e386f` and FX-03 `dc36080`; frozen #59/#60/#64 unchanged. Measurement checkout `codex/acceptance-verification-4757eaf`; separate docs-only review branch `codex/acceptance-evidence-4757eaf`, based on recovery, is not a runtime candidate. Clean installs; Jest434/434; TS0; emulator and local release-shaped builds PASS, release proof13/13, credential-canary12/12; both production audits0. Windows functions npm-script discovers0 (not PASS); explicit tests72PASS/1FAIL retained, then73/73 serial unchanged. CRLF lint2113 failures retained; exact committed LF blobs lintPASS, no source diff.

Full unchanged Claude-authored suite x10 each engine, retries0/skips0: Chromium 429PASS/1FAIL; Firefox 426PASS/4FAIL. L1/R1b/L0/FX-03 anchors and ordinary play/plan protection totals in existing `L1_R1B_REPAIR_HANDOFF.md` and `evidence/acceptance-4757eaf/summary.json`. N1 D10-01 library read (Firefox02/07, Chromium08; full matrix authoritative) and H2 D10-07 timeout (run03), plus N2 D10-05 team-setup failure (run10, overwrite assertions NOT REACHED), remain FAIL; later passes do not resolve them. Functions timing failure and profile-statistics NOT_FOUND warnings retained, owner Claude. Codex execution is not Claude independent acceptance. Claude #63 candidate6 independently430/0 each; hardenedcandidate7 R1cFAIL10/10 each plus H2Firefox1/10; references and comparison in existing handoff.

All new runs use unique output folders with retained failed raw ZIP/PNG and published redacted results/hash metadata. Old initial L1 raw ZIP/PNG remain NOT RETAINED; earlier logs/results/DOM/hashes remain and new runs do not replace that history. Claude next: classify local N1/H2/N2/functions/provisioning findings alongside his independent results; futureR1c repair Codex, candidate8 Claude. Staging/physical/genuine hidden tabs/standalone retained touch NOT MEASURED or open. AI disabled, film blocked, MVP NO-GO; BDN-AEO-001 queued. No merge/deploy/spend/live changes/deletion/new features.
