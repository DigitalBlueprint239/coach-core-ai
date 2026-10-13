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
6. Required Film Analyzer: secure bounded video upload/playback, manual tags and save/reopen, safe optional selected-frame OpenAI suggestions, saved play and editable practice links. Founder [Issue #50](https://github.com/DigitalBlueprint239/coach-core-ai/issues/50) supersedes film deferral.
Defer autonomous whole-game film analysis, NIL, blockchain, advanced analytics, billing, and broad public release.

## Film scope rebaseline — Issue #50 / 2026-10-13

Code inventory finds no implemented Film Analyzer in either repository. Video URL types, feature flags and archived Hudl declarations are partial/stub references; no upload/player/film persistence/frame worker exists. Claude's PR #49 proposes owner-only beta auth and a text OpenAI gateway; neither its Storage rules nor its AI schema accepts film. These findings are source inspection, not film PASS results.

[Film MVP specification](FILM_ANALYZER_MVP_SPEC.md) records revisions, wireflow, proposed data/API contracts, privacy/upload/access design, cost/licensing constraints and planned acceptance tests. Reconciled to Claude PR #52: owner-only beta ownership accepted on #39; Claude retains auth/rules/functions/gateway and private media/frame security. D1–D10 all pending absent explicit founder decision. No decision-dependent film implementation. Shared client cloud/practice DTO/rules agreement is still pending; see [release blocker handoff](RELEASE_BLOCKER_CONTRACT_HANDOFF.md). Playbook recovery branches preserved.

Oct 20 is a possible synthetic local demo milestone, not a full MVP promise. Film adds an estimated 88–134 engineer-hours (106–161 with contingency), excluding existing security work/review delays. Conditional full assessment Oct 27–30 after film/device/end-to-end/security gates. Film required but not implemented/verified; **MVP NO-GO**. No production access, paid infrastructure or deployment.

## Gates
- Reproducible builds + typecheck; no unexplained high-severity errors in shipped surface.
- Passing main test suite including the 2 failures and unloaded suite, plus critical feature regression tests.
- Private beta auth, authorization, Firestore rules, and AI-secret handling verified.
- Play save/reopen, undo/redo, exports (if included in MVP), and practice plans pass end-to-end tests.
- Production data untouched and restricted preview with a rollback plan.
- Report blocked cases truthfully.

## Issue #41 — standalone Day 2 milestones (review pending)
- Standalone [PR #1](https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-/pull/1) targets `recovery/smart-playbook-mvp-2026` from `codex/issue-41-types-drag-history`. No application integration or automatic merge.
- Milestone 1: typed DefaultTheme augmentation, inferred GlobalStyles props, and standard SVG props. Verified compiler diagnostics **810 → 0**, including new tests; no suppressions or framework upgrades.
- Milestone 2: final player moves now commit the immutable pre-drag playbook snapshot. The same drag callback/state regressions fail 5/pass 2 against original context and pass **7/7** against the repair; canvas rendering/capability probing are mocked. Native pointer/touch gestures remain unverified.
- Clean `npm ci` and production build pass. Main chunk 1,448.88 kB (449.67 kB gzip); existing chunk warning remains. Original audit-locked dependency versions retained. Final dependency audit reports one existing critical jsPDF finding.
- Generic route/property interaction snapshot issue remains identified by inspection and unchanged. Storage validation/export defects and security gates remain. Claude owns authentication/security; no keys, Firebase/user data, deployments, or main auth/security implementation changes.
- Evidence and exact commands: [Issue #41 handoff](ISSUE_41_DAY_2_HANDOFF.md). The documentation-only draft is held until main PR #40 lands per Issue #41. Review and merge both PRs explicitly. **MVP remains NO-GO.**

## Latest standalone core workflows — Issue #48 (review pending)
- Focused [standalone PR #2](https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-/pull/2), stacked on PR #1. Branch `codex/playbook-core-workflows`; retarget to standalone recovery after #1 lands. Preserve both recovery branches and production branches; no automatic merge.
- Transactions/persistence: **18 unit tests pass**; original parent code fails 3 focused transaction cases. Pre-interaction snapshots, batched property commits, play-switch boundaries, autosave timing, complete schema/reference validation, failed-save status and original-byte preservation are repaired.
- Production preview: **14 real Edge/Chromium browser tests pass**, covering desktop mouse and tablet touch emulation, plus **3 consecutive tablet pan/export checks**. Physical tablets/other engines remain unverified. Corrected off-screen panels, V2 property access, drawing cancellation/touch controls and post-pan touch navigation.
- TypeScript **0 diagnostics**; clean npm ci/build pass. jsPDF 3.0.4 → 4.2.1; final npm audit **0 findings**. PDF/install downloads contain complete field diagrams/player pixels and correct labels; long notes paginate. Existing large-chunk warning remains (1,403.37 kB / gzip 436.44 kB).
- Latest founder MVP AI decision: **OpenAI-only**, per [#46](https://github.com/DigitalBlueprint239/coach-core-ai/issues/46#issuecomment-6146120833). Standalone browser AI is disabled; preserved legacy modules are excluded from Vite's active graph. Key/legacy-provider bundle canaries pass, and browser AI request attempts are zero. No credentials/provider calls or backend integration.
- [Evidence and ownership handoff](ISSUE_48_CORE_WORKFLOW_HANDOFF.md). This supersedes Issue #41's remaining standalone transaction/storage/export/jsPDF findings for the tested surface; historical baseline records remain unchanged. Claude retains independent auth/functions/rules/security ownership. **MVP remains NO-GO** pending security and authenticated end-to-end coaching/OpenAI gateway gates.

## Workflow / ownership
- Codex = implement and test core feature repairs / integration; Claude = parallel independent security/auth review and test plans, NOT simultaneous edits to Codex-owned files.
- GitHub issues/PRs and this document are the only canonical status. Each agent reads this file and `AGENTS.md` before work, logs commands + test evidence, notes blockers, and proposes concise updates via PR to this file.
- Two agents never push to the same branch or edit overlapping files without assigned ownership. Separate work branches, PR review, explicit integration owner. No merges to `master` without approval.
- Daily single update in `docs/MVP_7_DAY_SPRINT.md`; do not claim cross-product AI memory auto-synchronizes.

## P0 milestone — 2026-10-13 / Codex

CC-CODEX-01 draft standalone PR #3: source/test `04946b75c94a57f811875e7c50524928fa2d9a3e`, evidence head `32a9291d07ff634029918d3e3a3377ded2e92729`. Unit19/19; typecheck0; build/canary pass; full browser21/21. Ten repeats each of three persistence/history workflows: Chromium141 desktop30/30, Firefox157 desktop30/30, touch emulation29/30 first batch then unchanged30/30 confirmation. Retained failure is a browser exit during final screenshot after fidelity assertions. Exact Claude Linux configuration/artifacts and review remain BLOCKED; physical devices untested. Full commands/results: standalone docs/CC_CODEX_01_SAVE_DIAGNOSIS.md and evidence/cc-codex-01.

CC-CODEX-02/03 BLOCKED pending Claude-reviewed lossless DTO/revision rules/session contract, escalated #39. Inspection and consent/conflict/edit UX plan only; no shared source changes or two-account authorization acceptance claimed. Film PR #51 reconciles #52; D1–D10 PENDING. Ownership accepted #39, proposed dates unconfirmed. See RELEASE_BLOCKER_CONTRACT_HANDOFF.md. MVP NO-GO; no merge/deployment.
