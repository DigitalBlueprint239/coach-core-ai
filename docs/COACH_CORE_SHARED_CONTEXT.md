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

**AI decision (founders, 2026-10-13):** OpenAI is the only active provider for the MVP, called only through the authenticated `coachAI` Cloud Function (contract `coach-ai.v1`). No Gemini, no Anthropic API, no coach-facing model picker. Details: `docs/security/CLAUDE_SECURITY_DAY2.md` §5.
**Security status (Claude, Day 2, issues #43/#46):** F-01..F-04 fixed in code on `claude/day2-security-gateway` with no real credentials. CI evidence: rules emulator 30/30, functions gateway 69/69, web auth 21/21, bundle credential scan 10/10. Deployment-level gate still BLOCKED on founder actions (old-key check, web-key restriction, staging auth setup, fresh OpenAI key in Secret Manager, approved staging deploy). MVP remains NO-GO.

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

## D10 founder approval and implementation — 2026-10-13 / Codex

Coach Drew explicitly approved consent-based legacy import implementation/testing only, recorded #39 and docs/security/FOUNDER_DECISION_PACKET.md. NO merge/deployment/spending/deletion. D1–D9 pending. Source6a412e71993038069882920c9c16ba30914534bc on codex/d10-consent-import, stacked #54. Sixteen unit/DOM/mocked-SDK tests pass, TypeScript0, build PASS; originals preserved. Full-suite known logger/FieldMemo failures retained. Real browser/rules P13 awaits Claude; Java absent locally. D10_IMPORT_HANDOFF.md records commands/evidence/limitations and accept/decline/repeat/account-switch scenarios. CC02 normal cloud edits/sign-out conflicts and CC03 plan persistence remain outstanding. PR53 bounds amendments accepted; no contract disagreement remains, checkpoint escalation paused. MVP NO-GO.

## CC-CODEX-02/03 implementation milestone — 2026-10-14 / Codex

Draft PR59 implements ordinary authorized play save/reopen and editable manual/prior-AI practice persistence, scoped per-editor device recovery, truthful acknowledgements, revision conflicts, sign-out and retry. AI generation disabled; film-dependent connections blocked. Applicable PR40 tests incorporated unchanged: logger and FieldMemo failures disappear (382/382 existing tests). Reviewed source a91264c / application code8dcf9a7:415/415 total implementation tests, TypeScript0, production/emulator buildsPASS with retained warnings; credential canary12/12PASS. Frozen dacb189 browser12/12PASS (Chromium156/Firefox157); reviewed18-case run16PASS2FAIL (Firefox sign-out navigation and background-tab reload), retained and being investigated with explicit navigation checkpoints. These are Codex implementation measurements, not independent acceptance. PR54ecc6400 incorporated; Claude retains auth/rules/functions/e2e and will independently write P10–P17. D10 reviewed device claim/pending-team/no-team repairs included without rebuilding import or deleting originals. R3/R4 remain documented limitations.

Separate draft PR60: production dependency findings10→4→0; full graph107→98 still unresolved. No framework upgrade or force. Commands, failures, acceptance labels, rollback and evidence in ACCOUNT_COACHING_PERSISTENCE_HANDOFF.md and COACHING_DEPENDENCY_REPAIR.md (dependency branch). Final source IDs/results will accompany handoff. D1–D9 pending; D10 implementation/testing approval unchanged. BDN-AEO-001 queued. No production merge, deployment, spending, live data/configuration or deletion. MVP NO-GO pending security and independent coaching acceptance; October16 targets remain proposed.

Final client milestone: PR59 sourceff9b421669c1154ab52288f9cda1c7516bfb1ed5,416/416PASS,TS0,production buildPASS (warnings retained). Browser checkpoint06e222e18/18PASS on Chromium156.0.8078.4/Firefox157.0, no retries; preceding16/18/6/8/0/8 failures retained. This does not close Firefox reload stability or independent acceptance. Source/evidence manifest and acceptance labels in docs/ACCOUNT_COACHING_PERSISTENCE_HANDOFF.md. Claude owns independent P10–P17/P13/security. PR60 integrated final-source dependency testing continues. NO-GO; BDN-AEO-001 queued.
