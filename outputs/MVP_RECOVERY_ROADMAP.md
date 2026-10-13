# MVP recovery roadmap

October 13, 2026. **Recommendation: keep the main recovery branch as the platform foundation, conditionally; retain the standalone Playbook as a separately repaired component source. Neither is ready for private beta.** This is based on executed builds/tests plus explicitly labeled source inspection, not historical completion claims.

## Foundation decision

| Candidate | Demonstrated strengths | Current blockers | Decision |
|---|---|---|---|
| Main platform | Build and tsc pass; 338 unit tests pass; services, teams, practice and dashboard structure exist | Auth context exception; sign-in placeholder; 2 failed tests plus unloaded field suite; invalid repository rules; client AI secrets; advisory backlog; many workflows not exercised | Conditional platform foundation. Repair startup/auth/security before feature expansion |
| Standalone Playbook | Vite build and dev start; actual field renders at desktop size; real context formation/route/storage checks pass; downloadable PDF produced | 810 type errors; no existing tests/lock; drag undo and storage validation fail; cropped PDF and install export error; small-window layout; client Gemini key injection; no auth/backend | Preserve separately. Stronger visual component inventory, insufficient hosted MVP foundation |
| Nested main CRA starter | Build/types and one starter test pass | Only Learn React starter screen | Do not choose based on its easy build |
| Empty V3 repository | None assessed | User identifies it as empty; no source used | Excluded |

Main is recommended for its platform contracts and executed service tests, not because its dashboard works. If a minimal local play designer is the immediate product goal, standalone is the closer desktop demo candidate after the editing/export fixes; it must not silently replace the authenticated platform or be advertised as beta-ready.

## Components to retain

Keep standalone `components/FieldCanvas.tsx`, field/player/route/selection/annotation layers, formation catalogue/selector/thumbnail, route definitions/parser/service, install organizer, export/wristband components, and GSAP animation logic as candidates. Executed finite-coordinate and context tests support retaining their core data logic; visual/tactical correctness and animation are still open. Fix useHistory's interaction snapshot handling and storage validation before reuse. Exclude placeholder/empty hooks, empty functions/index.ts, and direct client AI calls from an integration production graph.

Keep main PlayController pure helpers and tested AI Brain/fallback/geometry services, types and Firestore service interfaces. Preserve the current main canvas/UI as a regression reference until replacements pass equivalent tests. Do not delete working components or select an alternate nested App merely because its manifest appears newer.

## What can be demonstrated now

- Local standalone desktop field rendering with existing synthetic players; this was visually observed at 1440×1000.
- Executed formation, generated route, editing and storage service behavior through the isolated harness; label this a component/service demonstration, not a complete user workflow.
- Main tested pure play helpers and mocked AI fallback/error behavior, with clear mock labeling.
- A generated sample PDF only as evidence of the cropping defect. It is not a usable coaching diagram at the tested small viewport.

A dependable coach-facing dashboard, private team collaboration, full play-edit/undo/save/animation/export journey, responsive tablet experience, and real AI assistant **cannot yet be promised**. Keep any immediate demo local, with synthetic data and AI disabled; no public deploy or real Firebase data changes.

## Ordered recovery work

### 1. Establish reproducible baselines

Work only in the named recovery branches. Normalize Windows-invalid path through a reviewed rename, preserve source identity, add appropriate Node/tool pins, resolve testing-library peers without a framework migration, and commit a reviewed standalone lockfile. Repair stale functions/nested lockfiles only for packages that will remain part of the supported build. Keep alternate starters clearly documented rather than deleting them during recovery.

Fix FieldMemo import and logger environment tests. Replace App fallback smoke with explicit dashboard/auth assertions. Add standalone context/history/storage tests as a real test script using the audit cases. Add theme augmentation and correct the three component prop errors. Gate the selected build on types, tests and production compilation; remove active type suppression only after underlying errors are addressed.

Acceptance: clean locked install; main root checks all pass including field suite; standalone zero unsuppressed diagnostics and tests execute. Record existing feature baselines before implementation.

### 2. Repair safe startup and identity

Consolidate main AuthProvider/useAuth. Implement usable signed-out login/signup or controlled private-beta sign-in UI; handle missing configuration without module-load crash. Correct CRA env template names. Connect explicitly to a demo/emulator project for recovery QA, with network guardrails preventing accidental production access. Do not load/migrate existing Firebase data. Remove or gate migration/PWA/notification prompts until their behavior is tested.

Acceptance: signed-out screen → synthetic emulator login → dashboard → team creation/selection → logout/refresh. Test rejected credentials and configuration failure without an error-boundary false positive.

### 3. Close backend security blockers

Repair Firestore syntax, role/query alignment and immutable tenant identity. Enforce ownership/membership on Storage. Protect notification cleanup and review Admin SDK invoker assumptions. Remove browser model keys/shared proxy token; implement authenticated AI boundary or defer AI. Triage direct/runtime critical advisories with narrow compatibility tests.

Acceptance: emulator compiler success plus allowed/denied cases for anonymous, owner, invited member, foreign team and malicious owner/team field changes; no secret canary in client build; no public destructive handler reachable without explicit authority. Live Firebase/IAM review is a separate read-only audit; deploying rules must be reviewed and approved, not bundled into this baseline audit.

### 4. Make one complete play workflow dependable

Repair drag history at interaction start/commit boundaries, redo invalidation and route anchoring. Validate versioned storage and preserve invalid backups. Fit field/players to viewport; clamp or reflow floating panels. Exercise individual add/select/drag/delete, generated/freehand routes, vertex edit, undo/redo and reload. Verify real GSAP movement, pause/seek/reset and canonical saved coordinates. Fix PDF content bounds, named autoTable usage, render callback failures/timeouts and wristband print layout.

Acceptance: create play → offensive/defensive formation → players/routes → undo/redo → save/reopen → animate → full PDF/install/wristband export with visibly correct players/routes. Repeat across desktop and tablet/mobile touch. Inspect output files, not only download events. Include corrupt/quota storage and refresh tests.

### 5. Deliver the coaching platform's critical beta scope

Wire team-aware practice editing/save/reopen with real currentTeam instead of demo-team. Implement the roster UI from validated services rather than treating .jsx.txt artifacts as shipped. Confirm onboarding demo behavior and Dashboard navigation. Keep analytics and assistant unavailable until they have a trustworthy backend and accurate failure/fallback messaging.

Acceptance: an invited synthetic coach can complete dashboard → team → roster → practice plan → playbook without console crashes or cross-team access. Document data retention/backup and recovery behavior before introducing real coaching data.

### 6. Private-beta gate and controlled release

Only after gates 1–5 pass, propose the concrete private deployment configuration and test evidence for approval. Define invite-only access, approved Firebase project, bounded AI cost/rate limits, rollback and monitoring. No approval is implied by the audit request for public deployment, merging apps, or paid infrastructure.

## Defer from the initial beta

Advanced analytics, quizzes/assignments, automated game scripting, situational model recommendations, multi-agent/Python optimization prototypes, public marketing deployment, PWA/push notification expansion, and app merging. AI can remain deferred while manual coaching workflows are stabilized. Keep exports in the core if coaches rely on them; otherwise explicitly exclude the unverified formats from beta scope.

## Can the apps be integrated safely?

**Potentially, after repair and contract tests; not safely in their current state.** Main plays use `playerId` routes and football-field canvas coordinates; standalone uses `fromId`, installs/plays maps, formation/personnel/hash metadata, route points and field constants with a different orientation. Both use browser-global persistence; main also has tenant-scoped Firestore expectations. A simple component copy or storage-key reuse can lose route labels, misplace players or cross account boundaries.

Keep applications separate now. Later define a versioned canonical PlayDTO with units/axis/origin, stable ids, player team/offense flags, route labels/geometry, install/team ownership and timestamps. Build an explicit adapter with round-trip fixtures and unsupported-field rejection; test against existing saved plays without migrating them. Select one auth/data owner and one isolated persistence boundary. Audit React/Konva dependencies and contexts before embedding the standalone canvas; remove client AI and duplicate alternate entry points from the selected bundle only after acceptance tests.

Integration acceptance: old main fixtures and standalone fixtures round-trip without coordinate/label loss, undo state remains ephemeral, team authorization holds, exports match rendered diagrams, and all baseline features continue to work. Review a concrete recovery-branch diff before any merge.

## Completion assessment

Both primary repositories were retrieved and audited, production builds and available web tests executed, additional isolated tests run, and feasible functional checks recorded. Emulator/live backend and remaining pointer/touch/animation/wristband tests are documented blockers, not hidden passes. The audit assessment is delivered; the recovery implementation and MVP-readiness gates remain open. See [feature matrix](MVP_FEATURE_TEST_MATRIX.md) and [security findings](SECURITY_FINDINGS.md).
