# Coach Core AI — Master Tracker

## Overall Completion: 72%

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
| Test Suite | ❌ Not Started | Only basic App.test.tsx exists |

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

## Build & TypeScript Status

| Check | Status | Notes |
|-------|--------|-------|
| `npx tsc --noEmit` | ✅ Pass | Zero errors, zero `@ts-nocheck` suppressions |
| `npm run build` | ✅ Pass | Clean CRA production build |
| `npm test -- --watchAll=false` | ✅ Pass | 1/1 test passing |
| `@ts-nocheck` count | **0** | All 20 suppressions removed — 7 files properly fixed, 13 excluded as legacy |
| `VITE_*` declarations | **0** | Removed from react-app-env.d.ts |
| `NEXT_PUBLIC_*` in active code | **0** | Fixed in firebase.ts |
| `tailwind.config.js` | Deleted | Tailwind v4 configured via src/index.css |

---

## Known Issues

### HIGH-006: @ts-nocheck Regression (RESOLVED)
**Status:** Resolved in session 2026-03-01

A previous session added `@ts-nocheck` to 20 files to silence TypeScript errors instead of fixing them. This disabled all type checking in those files — hiding real issues like null safety violations, missing types, and incorrect API usage. This session removed all 20 `@ts-nocheck` directives and fixed the underlying errors:

- **7 active files fixed properly:** `firestore.ts`, `useFirestore.ts`, `useAuth.tsx`, `TeamContext.tsx`, `SmartPlaybook.tsx`, `TouchOptimizedPlaybook.tsx`, `CanvasArea.tsx`
- **13 legacy files excluded from compilation** via tsconfig.json `exclude` array (verified not imported by active code)
- **Root causes:** `Firestore | null` and `Auth | null` types from null-safe firebase.ts exports; untyped JS component imports requiring `.d.ts` declarations; implicit `any` from `useState([])` needing explicit type parameters

---

## Session Log

### 2026-03-01 — TypeScript Integrity Repair

**What was done:**
- Removed all 20 `@ts-nocheck` suppressions from the codebase
- **firestore.ts:** Added `getDb()` null guard helper, typed `db`/`auth` as `Firestore | null`/`Auth | null`, fixed all `collection(db, ...)` calls to use `getDb()`, fixed `error.message` on `unknown` catch params
- **useAuth.tsx:** Added `getAuth_()` null guard, wrapped all Firebase Auth calls with null-checked auth instance
- **useFirestore.ts:** Fixed recursive `updatePlay` call (shadowed import), renamed to `updatePlayFn`/`updatePlayService`
- **TeamContext.tsx:** Added `getDb()`/`requireCurrentUser()` helpers, replaced all direct `db`/`auth.currentUser` with null-guarded versions
- **SmartPlaybook.tsx:** Added full type definitions for players/routes/state/notifications, typed all 20+ callback parameters, fixed dead-code `mode === 'delete'` inside `mode === 'view' || 'player'` block
- **CanvasArea.tsx:** Fixed broken import path (`../:components:SmartPlaybook:Field.js` → `../Field`), typed props properly
- **TouchOptimizedPlaybook.tsx:** Fixed `GameContext` missing required fields, typed `setCurrentPlay` callbacks
- Created 11 `.d.ts` declaration files for JS components (PlayController, Field, Toolbar, PlayerControls, RouteControls, RouteEditor, FormationTemplates, SaveLoadPanel, Notification, Onboarding, DebugPanel)
- Expanded tsconfig.json `exclude` array: added `coach-core-complete-integration.tsx`, `fixed-core-functionality.tsx`, `OfflineFallbacks.tsx`, `coach-core-ai/**/*`, `utils/**/*`
- Fixed `VITE_*` env var declarations in `react-app-env.d.ts` — removed all VITE_ prefixed declarations (CRA uses `process.env.REACT_APP_*`)
- Fixed `NEXT_PUBLIC_*` env vars in `firebase.ts` — replaced with `REACT_APP_*`
- Verified AI Brain implementation intact: zero stubs, proxy integration, correct env var prefix

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

## Next Session Starts Here

1. **Firestore Play Persistence** — Plays currently save to localStorage only. Wire SmartPlaybook's `saveCurrentPlay`/`loadPlay` to Firestore using the existing `src/services/firestore.ts` infrastructure (which now has proper null guards). The schema is defined in `src/types/firestore-schema.ts`. The `savePlay`/`getPlays` functions in `firestore.ts` are ready — they just need to be called from the SmartPlaybook component instead of localStorage.

2. **AI Brain Test Suite** — Add unit tests for all 8 AIBrain methods. Mock the AI proxy and verify: (a) correct proxy request type and prompt structure, (b) response parsing handles valid JSON, (c) fallbacks activate on proxy failure, (d) return shapes match what UI components render.

3. **Analytics Dashboard** — Wire the ProgressAnalytics component to real data. The component exists at `src/features/analytics/ProgressAnalytics.tsx` but isn't connected to the dashboard tabs.

4. **Convert JS Components to TypeScript** — The SmartPlaybook child components (Toolbar, PlayerControls, RouteControls, RouteEditor, FormationTemplates, SaveLoadPanel, Notification, Onboarding, DebugPanel, PlayLibrary, Field, PlayController) are all `.js` files with `.d.ts` shims. Converting them to `.tsx` with proper types would eliminate the need for separate declaration files.
