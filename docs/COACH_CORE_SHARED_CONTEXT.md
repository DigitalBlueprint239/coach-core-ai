# Coach Core AI — Shared Recovery Context

> 2026-10-15 / PR #67 implemented composition pass; visual approval PENDING Coach Drew. Compact header/week, stronger existing Coach Core typography and text navigation, emphasized selected practice, quieter support cards. Explicit fixed sample week October 12–18, 2026 opens on populated Wednesday 14; sample and live calendar states isolated, with a separate empty example. Real dates, saved selection and data remain unchanged. 445/445 tests (baseline443), TS0, final build PASS inherited warnings only. Chromium/Firefox at7 widths each PASS/axe0/whole words/overflow0; full practice details visible at1280×800 and1440×900, production CSS at7 widths PASS. Evidence: docs/COMPOSITION_PASS_REVIEW.md. Auth/backend/saving/recovery/accepted repair branches and e2e unchanged; no physical/authenticated acceptance claimed. Claude functional walkthrough coordinated separately through #39, still pending. No merge, deployment or rollout; MVP readiness percentage NOT MEASURED.

> 2026-10-14 / PR #67 narrow-preview correction: prior visual approval REJECTED; current revision awaits Coach Drew. Calendar switches to an agenda below 900px of content width; timed-grid specificity is fixed. Compact next practice has one action; raised navy cards and rows, opaque navigation with measured safe-area clearance. Only three UI source files changed this pass. Final: 443/443 Jest, TypeScript 0, production build PASS with inherited warnings. Chromium/Firefox at five widths PASS, axe 0, no fragmented words; 19 content controls clear navigation at each phone width. Additional 32px inset simulation and a 490px calendar inside a wide viewport also PASS. Actual reference/implementation comparisons: docs/NARROW_PREVIEW_REVIEW.md. Auth, data, saving, recovery, backend, AI and acceptance repairs unchanged. No merge, deployment, rollout, physical-device or authenticated acceptance. Independent Claude review remains pending; acceptance work retains priority. MVP readiness percentage NOT MEASURED.

## Current UI status — visual fidelity revision of #67

Coach Drew rejected the first implementation's visual fidelity and requested a shell/dashboard-only revision. Current visual approval is PENDING. Full-width My Week beside sidebar, selected practice beneath, compact mobile Today/next-practice/action, restrained navy/cyan; existing saved duration/periods/goals/notes displayed read-only. Code ownership: src/ui and Dashboard projection/tests, coordinated #39comment6180239134. No changes to acceptance repairs, auth/team context, persistence/import/recovery, rules/functions, AI/canvas/locks/e2e. 443/443 tests,TS0,18 viewport checksPASS; side-by-side source UI crops and implementation screenshots in docs/evidence/visual-fidelity. VISUAL_FIDELITY_REVIEW.md supersedes initial visual handoff for review. No physical/staging/authenticated acceptance or independent Claude sign-off claimed. No merge/deploy/rollout; acceptance work retains priority.

## Isolated first visual milestone — 2026-10-14 / Codex

Draft PR #67, `codex/visual-shell-dashboard`, application source `ca5ca7296858f5dcde5dd353d9172d4884c767cb` on frozen integrated candidate `4757eaf`. Shared tokens/shell, My Week/Today, existing functional navigation and honest empty/explicit sample states. App/Dashboard layout and onboarding copy only; auth, team scope, persistence, import, rules, Functions, locks, canvas and independent e2e unchanged. Ownership/review request #39comment6179875785. 441/441 Jest,TS0,production buildPASS with existing warnings; Chromium/Firefox8widths each,axe0,overflow0,keyboard/dialog/reduced-motionPASS. Standalone shared-component preview only; no new authenticated/physical/staging acceptance. Claude independent UI/workflow review PENDING after higher-priority R1c repairs. Screenshots/reproduction/limits: VISUAL_DASHBOARD_HANDOFF.md. Stop for Coach Drew's visual review; no broader rollout, merge, deployment, spending or AI activation. MVP NO-GO; readiness percentage not measured.

> CC-007 current status (2026-10-14): earlier blanket D1–D9-pending statements below are historical and superseded. Coach Drew reports those directions settled; the detailed settled approval record is unavailable in inspected sources. See [decision provenance reconciliation](CC_007_DECISION_RECONCILIATION.md). No new spending, deployment, AI/film activation or deletion approval is inferred. Current MVP NO-GO; original evidence preserved.
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
6. Required Film Analyzer: secure bounded video upload/playback, manual tags and save/reopen, safe optional selected-frame OpenAI suggestions, saved play and editable practice links. Founder [Issue #50](https://github.com/DigitalBlueprint239/coach-core-ai/issues/50) supersedes film deferral.
Defer autonomous whole-game film analysis, NIL, blockchain, advanced analytics, billing, and broad public release.

## Film scope rebaseline — Issue #50 / 2026-10-13

Code inventory finds no implemented Film Analyzer in either repository. Video URL types, feature flags and archived Hudl declarations are partial/stub references; no upload/player/film persistence/frame worker exists. Claude's PR #49 proposes owner-only beta auth and a text OpenAI gateway; neither its Storage rules nor its AI schema accepts film. These findings are source inspection, not film PASS results.

[Film MVP specification](FILM_ANALYZER_MVP_SPEC.md) records revisions, wireflow, proposed data/API contracts, privacy/upload/access design, cost/licensing constraints and planned acceptance tests. Reconciled to Claude PR #52: owner-only beta ownership accepted on #39; Claude retains auth/rules/functions/gateway and private media/frame security. D1–D10 all pending absent explicit founder decision. No decision-dependent film implementation. Shared client cloud/practice DTO/rules agreement is still pending; see [release blocker handoff](RELEASE_BLOCKER_CONTRACT_HANDOFF.md). Playbook recovery branches preserved.

Oct 20 is a possible synthetic local demo milestone, not a full MVP promise. Film adds an estimated 88–134 engineer-hours (106–161 with contingency), excluding existing security work/review delays. Conditional full assessment Oct 27–30 after film/device/end-to-end/security gates. Film required but not implemented/verified; **MVP NO-GO**. No production access, paid infrastructure or deployment.

**AI decision (founders, 2026-10-13):** OpenAI is the only active provider for the MVP, called only through the authenticated `coachAI` Cloud Function (contract `coach-ai.v1`). No Gemini, no Anthropic API, no coach-facing model picker. Details: `docs/security/CLAUDE_SECURITY_DAY2.md` §5.
**Security status (Claude, Day 2, issues #43/#46):** F-01..F-04 fixed in code on `claude/day2-security-gateway` with no real credentials. CI evidence: rules emulator 30/30, functions gateway 69/69, web auth 21/21, bundle credential scan 10/10. Deployment-level gate still BLOCKED on founder actions (old-key check, web-key restriction, staging auth setup, fresh OpenAI key in Secret Manager, approved staging deploy). MVP remains NO-GO.

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

## Issue #38 milestones — 2026-10-13 / Codex
- Milestone 1: four original reports and evidence imported; unchanged report hashes verified.
- Milestone 2: test-only fixes for logger environment setup and FieldMemo import/canvas assertions. Full main Jest: 16 suites / 344 tests pass; main TypeScript exit 0; production build succeeds with 15 existing lint warnings. Existing App.test AuthProvider crash still logs despite its passing assertion; real dashboard/login remain unverified.
- Milestone 3: standalone tsc rerun confirms 810 errors across 30 files: 807 missing DefaultTheme augmentation, 1 required GlobalStyles theme prop, 2 missing SVG prop interfaces. Classification complete; repairs proposed but not applied.
- Branch: codex/issue-38-tests-audit; target recovery/coach-core-mvp-2026. PR [#40](https://github.com/DigitalBlueprint239/coach-core-ai/pull/40) review/merge pending. Evidence and commands: [Day 1 evidence](ISSUE_38_DAY_1_EVIDENCE.md); [Playbook classification](SMART_PLAYBOOK_TYPESCRIPT_CLASSIFICATION.md).
- Claude retains independent security/auth review. No production, Firebase, auth/rules, or AI credential implementation changes. MVP remains NO-GO pending security and critical workflow verification.

## P0 milestone — 2026-10-13 / Codex

CC-CODEX-01 draft standalone PR #3: source/test `04946b75c94a57f811875e7c50524928fa2d9a3e`, evidence head `32a9291d07ff634029918d3e3a3377ded2e92729`. Unit19/19; typecheck0; build/canary pass; full browser21/21. Ten repeats each of three persistence/history workflows: Chromium141 desktop30/30, Firefox157 desktop30/30, touch emulation29/30 first batch then unchanged30/30 confirmation. Retained failure is a browser exit during final screenshot after fidelity assertions. Exact Claude Linux configuration/artifacts and review remain BLOCKED; physical devices untested. Full commands/results: standalone docs/CC_CODEX_01_SAVE_DIAGNOSIS.md and evidence/cc-codex-01.

CC-CODEX-02/03 BLOCKED pending Claude-reviewed lossless DTO/revision rules/session contract, escalated #39. Inspection and consent/conflict/edit UX plan only; no shared source changes or two-account authorization acceptance claimed. Film PR #51 reconciles #52; D1–D10 PENDING. Ownership accepted #39, proposed dates unconfirmed. See RELEASE_BLOCKER_CONTRACT_HANDOFF.md. MVP NO-GO; no merge/deployment.

## Contract reconciliation — 2026-10-13 / Codex

PR #53 `7267698ae890662281ff4510a4d232954e9f1190` reviewed: account/team DTO, revision transactions, scoped drafts and sign-out guard ACCEPTED on #39/#53. The prior blanket missing-contract blocker is superseded. Two exact practice bounds disagree: gateway title200 vs stored name120; gateway unbounded notes vs stored5000. Proposed Claude fixes and boundary tests in PERSISTENCE_CONTRACT_RECONCILIATION.md. D10 gates import only, not isolation or practice editing. Client acceptance remains outstanding; no shared source changes in this review milestone.

CC01 Claude reports140/140 Linux Chromium on source04946b7; links now alongside Codex Firefox30/30 and retained touch29/30 failure/30/30 confirmation. Raw Linux log paths absent in published tree; requested artifacts plus remaining configuration mismatch/exit trace classification. Physical tablet untested. Proposed Oct14 noon ET contract checkpoint and Oct16 implementation targets retained. MVP NO-GO.

## D10 founder approval and implementation — 2026-10-13 / Codex

Coach Drew explicitly approved consent-based legacy import implementation/testing only, recorded #39 and docs/security/FOUNDER_DECISION_PACKET.md. NO merge/deployment/spending/deletion. D1–D9 pending. Source6a412e71993038069882920c9c16ba30914534bc on codex/d10-consent-import, stacked #54. Sixteen unit/DOM/mocked-SDK tests pass, TypeScript0, build PASS; originals preserved. Full-suite known logger/FieldMemo failures retained. Real browser/rules P13 awaits Claude; Java absent locally. D10_IMPORT_HANDOFF.md records commands/evidence/limitations and accept/decline/repeat/account-switch scenarios. CC02 normal cloud edits/sign-out conflicts and CC03 plan persistence remain outstanding. PR53 bounds amendments accepted; no contract disagreement remains, checkpoint escalation paused. MVP NO-GO.

## CC-CODEX-02/03 implementation milestone — 2026-10-14 / Codex

Draft PR59 implements ordinary authorized play save/reopen and editable manual/prior-AI practice persistence, scoped per-editor device recovery, truthful acknowledgements, revision conflicts, sign-out and retry. AI generation disabled; film-dependent connections blocked. Applicable PR40 tests incorporated unchanged: logger and FieldMemo failures disappear (382/382 existing tests). Reviewed source a91264c / application code8dcf9a7:415/415 total implementation tests, TypeScript0, production/emulator buildsPASS with retained warnings; credential canary12/12PASS. Frozen dacb189 browser12/12PASS (Chromium156/Firefox157); reviewed18-case run16PASS2FAIL (Firefox sign-out navigation and background-tab reload), retained and being investigated with explicit navigation checkpoints. These are Codex implementation measurements, not independent acceptance. PR54ecc6400 incorporated; Claude retains auth/rules/functions/e2e and will independently write P10–P17. D10 reviewed device claim/pending-team/no-team repairs included without rebuilding import or deleting originals. R3/R4 remain documented limitations.

Separate draft PR60: production dependency findings10→4→0; full graph107→98 still unresolved. No framework upgrade or force. Commands, failures, acceptance labels, rollback and evidence in ACCOUNT_COACHING_PERSISTENCE_HANDOFF.md and COACHING_DEPENDENCY_REPAIR.md (dependency branch). Final source IDs/results will accompany handoff. D1–D9 pending; D10 implementation/testing approval unchanged. BDN-AEO-001 queued. No production merge, deployment, spending, live data/configuration or deletion. MVP NO-GO pending security and independent coaching acceptance; October16 targets remain proposed.

Final client milestone: PR59 sourceff9b421669c1154ab52288f9cda1c7516bfb1ed5,416/416PASS,TS0,production buildPASS (warnings retained). Browser checkpoint06e222e18/18PASS on Chromium156.0.8078.4/Firefox157.0, no retries; preceding16/18/6/8/0/8 failures retained. This does not close Firefox reload stability or independent acceptance. Source/evidence manifest and acceptance labels in docs/ACCOUNT_COACHING_PERSISTENCE_HANDOFF.md. Claude owns independent P10–P17/P13/security. PR60 integrated final-source dependency testing continues. NO-GO; BDN-AEO-001 queued.

CC-CODEX-02/03 + F-11 final candidate milestone (2026-10-14): PR59 client ff9b421 (416/416,TS0,buildPASS), PR60 integrated runtime da8ebe1 / browser5d04077 (416/416,TS0,production/emulator buildPASS,18/18Chromium156/Firefox157,retries0). Production dependency10→4→0; all-graph107→98 (including3critical tooling entries) remains open. Applicable40 logger/FieldMemo failures disappear. docs/COACHING_DEPENDENCY_REPAIR.md and docs/evidence/coaching-dependencies contain commands/versions/before-after failures/results/hashes/rollback. Claude next: independent P10–P17/P13×10, REST protocol/authorization/account cache/conflict review. Previous Firefox failures, standalone touch/exit, physical/staging/security gates remain unresolved. AIgenerationoff; Film Analyzer required but blocked pending implementation/approvals (D1–D9pending); D10 approved implementation/testing only, originals intact. CC02/03 implemented, acceptancePENDING; MVP NO-GO. BDN-AEO-001queued, October16targetsproposed. No protected merge/deploy/spending/live changes/deletion.

## CC-007 — staging-readiness / rollback package — 2026-10-14 / Codex

Separate codex/cc-007-staging-readiness based on frozen60@2cf1a5c. #59c21c0c6/#60 2cf1a5c unchanged; tested ff9b421/da8ebe1/5d04077 retained. Documentation-only; runtime/evidence/security/test trees unchanged. CC_007_STAGING_READINESS.md records PR graph/config/access/evidence owners, future deployment/rollback/data preservation and desktop/tablet checklist. CC_007_DECISION_RECONCILIATION.md supersedes blanket pending directions with settled founder direction + one missing detailed-record provenance handoff, without reopening decisions or editing Claude's packet.

New concrete blocker: Claude-owned auth cleanup removes quarantined offline_operations on sign-out, contrary to stated retention; escalated #39comment6170214736, no auth edits. Old smoke no-A-keys/delete steps conflict with preservation/no-deletion boundary. #59/#60 reviews/comments/threads empty at initial read; rechecked at closeout. No runtime tests repeated for docs; prior416/416,TS0,buildPASS,18/18emulatorbrowser remain scoped historical evidence. Staging/physical/rollback rehearsal NOT MEASURED; independent acceptance PENDING REVIEW. Package review Claude; provenance/acceptance Coach Drew. AIoff/filmblocked/MVP NO-GO, BDN-AEO-001queued. No protected merge/deploy/spend/live change/deletion.

## L1 / R1b bounded repairs — 2026-10-14 / Codex

Draft PR #64 uses `codex/l1-r1b-persistence-repairs`, rebased onto Claude's agreed `ddae645` (includes L0 and FX-03). Frozen #59 `c21c0c6` and #60 `2cf1a5c` are unchanged; no Codex edits to auth, rules, functions or e2e tests. Client `f33a8a8`: 434/434 Jest, TypeScript 0, production/emulator builds PASS with retained warnings, canary 12/12, production audit 0 / full graph 98 unchanged. Browser candidate `ed4978b` changes only a test navigation label; application source and lockfiles are identical. Initial browser run: 32 PASS / 2 FAIL (all 32 unchanged D10 checks pass; two owned L1 wrong-label failures). Corrected L1: 2/2 PASS; unchanged Claude L0/L1 anchors: 4/4 PASS. Chromium 156 / Firefox 157, Windows desktop, retries 0, skips 0.

L1 disables obsolete destructive migration and rejects offline legacy writes without queue mutation. R1b records pending device ownership before a cloud request, blocking other accounts while preserving original-team recovery. Originals and quarantined data remain intact. Commands, SHAs, causes, limitations and rollback are in `L1_R1B_REPAIR_HANDOFF.md` and `evidence/l1-r1b-repairs`. Earlier failures/results/DOM snapshots/hashes are retained; the initial owned test's raw ZIP/PNG archives were lost to Playwright output cleanup and that limitation is explicitly disclosed.

Claude next: confirm integrated SHA, clean integration checks and independent acceptance ×10 on both engines. H2, FX-02, genuine hidden tabs, R3/R4 and standalone touch remain tracked; physical devices and staging NOT MEASURED. AI disabled; film blocked; MVP NO-GO. No protected merge, deployment, spending, live changes or data deletion. BDN-AEO-001 remains queued.
