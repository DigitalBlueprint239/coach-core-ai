# Coach Core AI — Master Tracker

## Overall Completion: 92%

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
| Test Suite | ✅ Complete | 209 tests across 18 files — all passing |
| **Flip / Mirror Play** | ✅ Complete | `mirrorPlay()` utility, undoable via PlaybookContext, 7 tests |
| **Concept Detection Engine** | ✅ Complete | `detectConcepts()` with disambiguation, `useConceptDetection` hook, 14 tests |
| **Wristband PDF Export** | ✅ Complete | `exportWristbandPDF()` with dynamic jsPDF, B&W mode, 6 tests |
| **Route Library** | ✅ Complete | 18 routes (13 baseline + 5 added), 11 tests |
| **Concept Library** | ✅ Complete | 15 concepts (7 baseline + 8 added), 13 tests |
| **Coverage Beater Engine** | ✅ Complete | `getPlaysVsCoverage()` — offline, no AI required, 9 tests |
| **Firebase Lazy Init** | ✅ Complete | `getFirebaseServices()` async, dynamic imports, main bundle 214 kB, 2 tests |
| **useHistory Hook** | ✅ Complete | Generic undo/redo with commit control, 8 tests |
| **PlaybookContext** | ✅ Complete | State management wrapping useHistory, flipCurrentPlay, route assignment |

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

## Session 9 — 2026-03-14 — Sessions 6–11 Feature Implementation

### What was done (all in one session):

**Foundation Built:**
- `src/hooks/useHistory.ts` — Generic undo/redo hook with commit control
- `src/contexts/PlaybookContext.tsx` — Playbook state management wrapping useHistory
- `src/config/fieldConfig.ts` — Field dimensions (53.333 yards) + conversion helpers
- `src/types/playbook.ts` — EnginePlay, EnginePlayer, FootballRouteId, ConceptDefinition, etc.

**Session 6: Flip/Mirror Play**
- `src/utils/mirrorPlay.ts` — Reflects all X coordinates across field center, negates waypoint dx
- 7 tests in `src/utils/mirrorPlay.test.ts` — all passing
- Wired to PlaybookContext as `flipCurrentPlay()` (undoable)

**Session 7: Concept Detection Engine**
- `src/services/conceptDetection.ts` — `detectConcepts()` with priority-based disambiguation
- `src/hooks/useConceptDetection.ts` — Pure derived-state React hook
- 14 tests in `src/services/conceptDetection.test.ts` — all passing

**Session 8: Wristband PDF Export**
- `src/services/exportService.ts` — `exportWristbandPDF()` with dynamic jsPDF import
- Supports 8/12/16 plays per card, color/B&W mode, team name
- 6 tests in `src/services/exportService.test.ts` — all passing
- jsPDF installed as dependency (dynamic import, not in main bundle)

**Session 9: Route + Concept Expansion**
- Routes expanded from 13 → 18: added seam, shallow_cross, option, bubble_screen, streak
- Concepts expanded from 7 → 15: added spacing, stick, y_cross, mills, four_verticals, curl_flat, sail, snag
- 11 route tests + 13 concept tests — all passing
- Every concept includes coverageBeaters, weakVs, mechanism, coachingCue

**Session 10: Coverage Beater Recommendations**
- `src/services/coverageBeater.ts` — `getPlaysVsCoverage()` scores plays against 8 coverage shells
- Works 100% offline — no AI proxy required
- 9 tests in `src/services/coverageBeater.test.ts` — all passing

**Session 11: Firebase Bundle Optimization**
- `src/firebase.ts` — Converted to lazy init via `getFirebaseServices()` with dynamic imports
- `src/hooks/useAuth.tsx` — Updated to call `getFirebaseServices()` on mount
- Backward-compatible sync exports via Proxy for existing consumers
- Main bundle: 214.83 kB (down from ~966 kB estimated)
- 2 tests in `src/services/firebase.test.ts` — all passing

### Metrics
- **191 tests** across 14 test files — all passing
- **0 TypeScript errors** in new code
- **0 `@ts-nocheck`** in new files
- **0 `any` types** in new files
- **Build: PASS** — 214.83 kB main bundle
- **18 routes**, **15 concepts**

---

## Session 12 — 2026-03-14 — UI Wiring (All Engines Connected)

### What was done:

**Bridge Utility:**
- `src/utils/playbookBridge.ts` — Maps SmartPlaybook's pixel-based local state to EnginePlay types for detection engines. Includes `toEnginePlay()`, `savedPlaysToEngine()`, and `mirrorPlaybookState()`.

**Surface 1: Flip Button**
- Added to Toolbar.js with `FlipHorizontal2` icon from lucide-react
- Mirrors all player X coordinates and route point X across field center
- Disabled when no players on field, action is undoable via Cmd+Z
- Wired via `mirrorPlaybookState()` operating on SmartPlaybook's local state

**Surface 2: Concept Detection Banner**
- `ConceptBanner.tsx` — renders detected concept below route editor
- Shows concept name (bold uppercase), coverage beater tags, coaching cue
- Appears automatically when routes matching a concept are assigned
- Disappears when routes change and no concept matches
- Green accent styling with fade transition

**Surface 3: Wristband Export Modal**
- `WristbandExportModal.tsx` — full modal with play selection, color mode, export
- Checkbox list with detected concept labels per play
- Pre-selects first 16 plays, warns when >16 selected
- Loading spinner during PDF generation
- Accessible from Export button in toolbar (disabled when no saved plays)

**Surface 4: Coverage Beater Panel**
- `CoverageBeaterPanel.tsx` — collapsible panel with coverage dropdown (8 shells)
- Ranks saved plays by how well they attack selected coverage
- Star ratings (1–3 stars), coaching reasoning per recommendation
- Empty state with concept suggestions
- 100% offline — no network request

**SmartPlaybook.tsx Integration:**
- Imported all 4 new components + bridge utility
- Added `showExportModal` state and `handleFlipPlay` callback
- Toolbar receives `onFlip`, `canFlip`, `onExport`, `canExport` props
- ConceptBanner + CoverageBeaterPanel rendered in left sidebar
- WristbandExportModal rendered as overlay when triggered

### Metrics
- **209 tests** across 18 test files — all passing
- **0 TypeScript errors** in new code
- **0 `@ts-nocheck`** in new files
- **Build: PASS** — 220.46 kB main bundle (under 300 kB target)

---

## Next Session Starts Here

1. **Firestore Play Persistence** — Plays currently save to localStorage only. Wire `savePlay` to Firestore using the existing `src/services/firestore.ts` infrastructure.

2. **Analytics Dashboard** — Wire the ProgressAnalytics component to real data.

3. **Environment Variable Cleanup** — Migrate remaining `import.meta.env.VITE_*` references to `process.env.REACT_APP_*` for full CRA compatibility.

4. **Legacy File Cleanup** — Remove nested `coach-core-ai/` directories and fix `@ts-nocheck` suppressions in utility files.
