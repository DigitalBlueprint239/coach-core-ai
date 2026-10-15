# Coach Core AI — Master Tracker

> 2026-10-14 / PR #67 narrow-preview correction: prior visual approval REJECTED; current revision awaits Coach Drew. Calendar switches to an agenda below 900px of content width; timed-grid specificity is fixed. Compact next practice has one action; raised navy cards and rows, opaque navigation with measured safe-area clearance. Only three UI source files changed this pass. Final: 443/443 Jest, TypeScript 0, production build PASS with inherited warnings. Chromium/Firefox at five widths PASS, axe 0, no fragmented words; 19 content controls clear navigation at each phone width. Additional 32px inset simulation and a 490px calendar inside a wide viewport also PASS. Actual reference/implementation comparisons: docs/NARROW_PREVIEW_REVIEW.md. Auth, data, saving, recovery, backend, AI and acceptance repairs unchanged. No merge, deployment, rollout, physical-device or authenticated acceptance. Independent Claude review remains pending; acceptance work retains priority. MVP readiness percentage NOT MEASURED.

> PR #67 visual fidelity revision, 2026-10-14: prior design not approved; current revision awaits Coach Drew's approval. Full-width desktop calendar + selected practice below; phone Today/primary action first, compact sample label; deeper navy/quieter borders/tighter spacing. Saved-plan information is projected read-only with no mutation/fabrication. 443/443 tests, TypeScript0; 18 Chromium/Firefox viewport layouts pass axe/overflow/placement/focus/motion/isolation checks. Reference/implementation boards and current evidence: docs/VISUAL_FIDELITY_REVIEW.md. No acceptance code, backend, auth, persistence or rollout changes. Independent workflow review remains separate/pending; no merge/deploy. MVP percentage NOT MEASURED.

> 2026-10-14 UI milestone: draft PR #67, source `ca5ca7296858f5dcde5dd353d9172d4884c767cb`, isolated from frozen PR #64/candidate `4757eaf`. Responsive shell/My Week/Today with honest empty/sample states; 441/441 Jest, TypeScript0, production buildPASS with existing warnings. Shared-component preview: Chromium/Firefox ×8 widths, axe0, no page overflow; keyboard/dialog/reduced-motionPASS. Local UI measurements, not authenticated, device or independent acceptance. Claude review requested #39 and pending. Scheduling/assignments/film/AI remain unavailable or preview-only. R1c/acceptance repairs retain priority. MVP NO-GO; readiness percentage NOT MEASURED. See docs/VISUAL_DASHBOARD_HANDOFF.md. No broader rollout/merge/deploy.

> 2026-10-14 CC-007: current MVP NO-GO; readiness percentage NOT MEASURED (no accepted weighted denominator). Historical feature-complete labels below do not establish independent, staging or physical-device acceptance. Canonical recovery status: docs/COACH_CORE_SHARED_CONTEXT.md and docs/CC_007_STAGING_READINESS.md. Candidate runtime/evidence remains frozen;416/416 implementation tests,TS0,buildPASS and18/18 emulator browser measurements are historical, not new CC-007 tests.

## Historical completion claim: 80% (not current MVP readiness)

| Feature | Status | Notes |
|---------|--------|-------|
| Firebase Auth | ✅ Complete | AuthProvider, useAuth hook, login/signup flows |
| Team Management | ✅ Complete | TeamContext, TeamManagement UI, CRUD operations |
| Roster Management | ✅ Complete | Player CRUD, position management, roster utils |
| Smart Playbook | ✅ Complete | Canvas-based play designer, touch support, save/load |
| Practice Planner UI | ✅ Complete | Duration, goals, AI generation button, feedback loop |
| AI Brain | ✅ Complete | All 8 methods implemented with real AI proxy calls |
| Dashboard | ✅ Complete | Stats cards, quick actions, tab navigation |
| PWA Support | ✅ Complete | Service worker, install prompt, offline detection |
| Onboarding | ✅ Complete | Modal flow, persona selection, demo mode |
| Firestore Integration | ⚠️ Partial | Schema defined, services built, plays save to localStorage only |
| Analytics Dashboard | ❌ Not Started | ProgressAnalytics component exists but not wired |
| Test Suite | ✅ Complete | 122 tests across 6 files — all passing |

---

## AI Brain — Method Details

All 8 methods in `src/ai-brain/core/AIBrain.ts` are fully implemented:

| Method | What It Does | Proxy Type |
|--------|-------------|------------|
| `generatePracticePlan` | Produces structured practice plans with periods, drills, coaching points, and football-specific terminology (route trees, personnel packages) | `practice_plan` |
| `getPlaySuggestions` | Suggests 3-4 situational play calls with formation, concept, reasoning, and confidence — references real coverage shells and route concepts | `play_suggestion` |
| `analyzeFormation` | Identifies personnel package, strengths/weaknesses, likely defensive adjustments, and 2-3 recommended concepts that attack common coverages | `performance_analysis` |
| `getCoverageRecommendation` | Identifies most likely defensive coverage and recommends route combinations (with route tree numbering) that stress it | `play_suggestion` |
| `generateDrillSuggestions` | Returns 3-5 position-specific drills with setup instructions, rep counts, coaching points, and variations | `drill_suggestions` |
| `assessPlayerDevelopment` | Creates individualized development plans with priorities, drill recommendations, and strength/improvement areas by position | `performance_analysis` |
| `generateGamePlan` | Produces 3-5 offensive concepts, personnel package distribution, and situational recommendations (red zone, 3rd down, 2-minute) | `play_suggestion` |
| `getMotivationalInsight` | Generates authentic coaching insights grounded in team context — surfaces on the dashboard AI insight card | `conversation` |

**Prompt Strategy:** Every prompt follows [ROLE] → [CONTEXT] → [TASK] → [FORMAT] → [CONSTRAINTS] structure. All prompts use real football terminology (personnel packages, coverage shells, route tree numbers, real concept names).

**Response Validation:** Every method validates the AI response shape before returning. Malformed responses fall back to meaningful football-specific defaults.

**Fallback Behavior:** Every method has a dedicated fallback that returns real coaching content (not empty objects) so the UI never crashes or shows blank data.

---

## Session Log

### 2026-02-27 — AI Brain Implementation

**What was done:**
- Implemented all 8 AIBrain methods with real AI proxy integration
- Updated AIContext.tsx to expose new methods (generateSmartPractice, getRealtimeInsight, analyzeFormation, getCoverageRecommendation, generateDrillSuggestionsForFocus, assessPlayerDevelopment, generateGamePlan, getMotivationalInsight)
- Verified PracticePlanner.tsx and PlayAISuggestion.tsx call the correct methods
- Fixed pre-existing build blockers: Tailwind v4 + CRA config, React hooks ordering in DebugPanel.js, style jsx removal, CRA-compatible tsconfig, ImportMeta type declarations
- Zero TODO/mock/stub/placeholder comments remain in AIBrain.ts
- All 8 methods use the AI proxy — no direct OpenAI browser calls
- All 8 methods have try/catch with meaningful football-specific fallbacks

**Known Limitations:**
- AI proxy server must be running at REACT_APP_AI_PROXY_ENDPOINT for live AI responses
- Fallback responses are used when proxy is unavailable — they contain real football content but are static
- Environment variables use `process.env.REACT_APP_*` (CRA standard) in new code; legacy code still uses `import.meta.env.VITE_*`

---

---

## Session 8 — 2026-03-10 — Tier 1 Verification & Test Hardening

### Bugs Fixed

**BLOCKER: `addToOfflineQueue` missing from `src/services/firestore.ts`**
- Function was called 6 times but never defined
- Caused `npm run build` to fail with TS2552 error
- Fixed by implementing `addToOfflineQueue(operation)` that pushes to `offlineQueue` and saves to localStorage

**BLOCKER: Test suite completely non-functional**
- Firebase's `getAuth()` called at module level crashed Jest before any test ran
- Fixed by adding comprehensive Firebase mocks to `src/setupTests.ts`
- Fixed by adding `AbortSignal.timeout` polyfill for JSDOM

### Tests Added (122 total, all passing)

| File | Tests | What's Covered |
|------|-------|----------------|
| `src/components/SmartPlaybook/__tests__/PlayController.test.js` | 46 | All PlayController pure functions |
| `src/services/__tests__/firestore.test.ts` | 18 | Offline queue, service exports, auth guard |
| `src/components/common/__tests__/ErrorBoundary.test.tsx` | 6 | Error catching, fallback UI |
| `src/services/__tests__/ai-proxy.test.ts` | 17 | Request handling, retry logic, all request types |
| `src/ai-brain/__tests__/AIBrain.test.ts` | 21 | All 8 methods: request type, success parsing, fallback |
| `src/App.test.tsx` | 1 | App renders without crashing |

### Known Technical Debt (not fixed, logged for next session)

- 19 legacy files contain `@ts-nocheck` (all pre-existing in utility/integration files)
- `npx tsc --noEmit` shows 1500+ errors in legacy SmartPlaybook JS files (CRA build succeeds regardless)
- Nested `coach-core-ai` directories need cleanup

---

## Next Session Starts Here

1. **Firestore Play Persistence** — Plays currently save to localStorage only. Wire `savePlay` to Firestore using the existing `src/services/firestore.ts` infrastructure. The schema is defined in `src/types/firestore-schema.ts`.

2. **Analytics Dashboard** — Wire the ProgressAnalytics component to real data. The component exists at `src/features/analytics/ProgressAnalytics.tsx` but isn't connected to the dashboard tabs.

3. **Environment Variable Cleanup** — Migrate remaining `import.meta.env.VITE_*` references to `process.env.REACT_APP_*` for full CRA compatibility.

4. **Legacy File Cleanup** — Remove nested `coach-core-ai/` directories and fix `@ts-nocheck` suppressions in utility files.

## CC-007 — staging-readiness / rollback package — 2026-10-14 / Codex

Separate codex/cc-007-staging-readiness based on frozen60@2cf1a5c. #59c21c0c6/#60 2cf1a5c unchanged; tested ff9b421/da8ebe1/5d04077 retained. Documentation-only; runtime/evidence/security/test trees unchanged. CC_007_STAGING_READINESS.md records PR graph/config/access/evidence owners, future deployment/rollback/data preservation and desktop/tablet checklist. CC_007_DECISION_RECONCILIATION.md supersedes blanket pending directions with settled founder direction + one missing detailed-record provenance handoff, without reopening decisions or editing Claude's packet.

New concrete blocker: Claude-owned auth cleanup removes quarantined offline_operations on sign-out, contrary to stated retention; escalated #39comment6170214736, no auth edits. Old smoke no-A-keys/delete steps conflict with preservation/no-deletion boundary. #59/#60 reviews/comments/threads empty at initial read; rechecked at closeout. No runtime tests repeated for docs; prior416/416,TS0,buildPASS,18/18emulatorbrowser remain scoped historical evidence. Staging/physical/rollback rehearsal NOT MEASURED; independent acceptance PENDING REVIEW. Package review Claude; provenance/acceptance Coach Drew. AIoff/filmblocked/MVP NO-GO, BDN-AEO-001queued. No protected merge/deploy/spend/live change/deletion.

## L1 / R1b bounded repairs — 2026-10-14 / Codex

Draft PR #64 uses `codex/l1-r1b-persistence-repairs`, rebased onto Claude's agreed `ddae645` (includes L0 and FX-03). Frozen #59 `c21c0c6` and #60 `2cf1a5c` are unchanged; no Codex edits to auth, rules, functions or e2e tests. Client `f33a8a8`: 434/434 Jest, TypeScript 0, production/emulator builds PASS with retained warnings, canary 12/12, production audit 0 / full graph 98 unchanged. Browser candidate `ed4978b` changes only a test navigation label; application source and lockfiles are identical. Initial browser run: 32 PASS / 2 FAIL (all 32 unchanged D10 checks pass; two owned L1 wrong-label failures). Corrected L1: 2/2 PASS; unchanged Claude L0/L1 anchors: 4/4 PASS. Chromium 156 / Firefox 157, Windows desktop, retries 0, skips 0.

L1 disables obsolete destructive migration and rejects offline legacy writes without queue mutation. R1b records pending device ownership before a cloud request, blocking other accounts while preserving original-team recovery. Originals and quarantined data remain intact. Commands, SHAs, causes, limitations and rollback are in `L1_R1B_REPAIR_HANDOFF.md` and `evidence/l1-r1b-repairs`. Earlier failures/results/DOM snapshots/hashes are retained; the initial owned test's raw ZIP/PNG archives were lost to Playwright output cleanup and that limitation is explicitly disclosed.

Claude next: confirm integrated SHA, clean integration checks and independent acceptance ×10 on both engines. H2, FX-02, genuine hidden tabs, R3/R4 and standalone touch remain tracked; physical devices and staging NOT MEASURED. AI disabled; film blocked; MVP NO-GO. No protected merge, deployment, spending, live changes or data deletion. BDN-AEO-001 remains queued.

Current MVP readiness percentage: NOT MEASURED; independent acceptance remains pending.
