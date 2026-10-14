# Coach Core AI — Master Tracker

## Overall Completion: 80%

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

## Retained Firefox navigation investigation — 2026-10-14 / Codex

Separate codex/firefox-navigation-investigation from frozen60@2cf1a5c; #59c21c0c6/#602cf1a5c untouched. No new client review findings on #39/#59/#60/#61, so retained failures investigated. Original P14 trace: reload cancelled at94.713ms after earlier51.569s email-button locator/action delay, Auth response2.339ms; background-hang claim unsupported, upstream delaycauseOPEN. Sign-out UI can precede application hard reload; owned test callbacks now wait for document replacement and actions/navigation bound10s (not60), unchanged assertions/retries0. Controlled diagnostics30PASS/10FAIL across Chromium156/Firefox157 (5repeats/case/engine): all10FAIL reproduce real pending-logout sign-in input loss. Claude-owned auth correction requested #39comment6172893033; no auth/rules/functions/e2e edits. Selected existing coaching regression18/18PASS; new test tooling type errors2→0. Headless focus variants allreportedvisible; genuinely hidden/physical/staging NOT MEASURED. FIREFOX_NAVIGATION_FINDINGS.md and new evidence retain every result, originaltracehashes andcausalbarrier reproductions; no all-green or blanketfixclaim. AIoff,filmblocked,MVP NO-GO,BDN-AEO-001queued. D1–D9 directionssettled perCC007/currentfounderinstruction, detailedrecordprovenancegap remains; no reapproval requested. Independentacceptancepending. No protectedmerge/deploy/spend/livechanges/deletion.
