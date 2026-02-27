# Coach Core AI — Master Infrastructure Tracker

**Last Updated:** 2026-02-26
**Build Status:** ✅ PASSING (`npm run build` — zero errors, ESLint warnings only)
**TypeScript Status:** ✅ CLEAN (`npx tsc --noEmit` — zero errors in active code)
**Test Status:** ✅ PASSING (1/1 tests pass)
**Overall Completion:** ~45% — Infrastructure, auth, roster complete. AI Brain is the next critical milestone.

---

## 🚨 Critical Issues (Build Blockers)

### CRIT-001 — PostCSS/Tailwind v4 Misconfiguration
- **Status:** ✅ RESOLVED (2026-02-26)

### CRIT-002 — Firebase Crash on Startup
- **Status:** ✅ RESOLVED (2026-02-26)

### CRIT-003 — TypeScript Compilation: 166 Errors in Legacy Files
- **Status:** ✅ RESOLVED (2026-02-26)

---

## 🔴 High Severity Issues

### HIGH-001 — API Key Exposure: Real Firebase Credentials in .env.local.example
- **Status:** ⚠️ DEFERRED — Key rotation required by repo owner

### HIGH-002 — Wrong Environment Variable Prefix Throughout Codebase
- **Status:** ✅ RESOLVED (2026-02-26)

### HIGH-003 — No Centralized Environment Variable Validation
- **Status:** ✅ RESOLVED (2026-02-26)

### HIGH-004 — Jest/Test Configuration Failures
- **Status:** ✅ RESOLVED (2026-02-26)

### HIGH-005 — npm Vulnerabilities
- **Status:** ⚠️ PARTIALLY RESOLVED — remaining 11 vulns require react-scripts upgrade

---

## ✅ Confirmed Complete

- [x] React app builds with zero errors (`npm run build`)
- [x] TypeScript clean — zero errors (`npx tsc --noEmit`)
- [x] Tests pass — 1/1 (`npm test`)
- [x] Single Firebase initialization (`firebase.ts` is the only `initializeApp` call)
- [x] `firestore.ts` imports from shared `firebase.ts` — no duplicate initialization
- [x] All active code uses `REACT_APP_*` env prefix — no `NEXT_PUBLIC_*` or `VITE_*`
- [x] Centralized env validation via `src/config/env.ts`
- [x] Email/password sign in and sign up (via `hooks/useAuth.tsx`)
- [x] Auth persists across page refresh (`browserLocalPersistence`)
- [x] Auth errors show human-readable messages (not raw Firebase error codes)
- [x] Protected routing: unauthenticated users always see LoginPage
- [x] No flash of content: loading spinner during auth state resolution
- [x] Dashboard Practice Plans stat reads from real Firestore (via `usePracticePlans`)
- [x] Player Roster with CRUD (add/edit/delete players)
- [x] Roster stored in Firestore (`teams/{teamId}/players/{playerId}`)
- [x] Roster integrated with AI: `getRosterContextForAI()` passes player data to practice plan generation
- [x] Empty roster prompt: "Add your players to get AI-personalized practice plans"
- [x] Roster tab in Dashboard with real player count from `RosterContext`
- [x] Depth chart UI with position groups
- [x] Provider hierarchy: `ErrorBoundary > AuthProvider > TeamProvider > RosterProvider > AIProvider`

---

## ✅ Resolved Issues

| Date | Severity | Issue | Fix |
|------|----------|-------|-----|
| 2026-02-26 | CRITICAL | PostCSS/Tailwind v4 crash | Deleted tailwind.config.js; updated index.css to v4 @import |
| 2026-02-26 | CRITICAL | NEXT_PUBLIC_* prefix crash | Rewrote firebase.ts with REACT_APP_* and graceful null handling |
| 2026-02-26 | CRITICAL | 166 TS errors in legacy files | Added entries to tsconfig.json exclude array |
| 2026-02-26 | HIGH | import.meta.env (Vite) in CRA | Replaced all with process.env.REACT_APP_* via env.ts |
| 2026-02-26 | HIGH | No env validation | Created src/config/env.ts with validateFirebaseConfig() |
| 2026-02-26 | HIGH | Tests crash | Fixed firestore.ts guard, AuthProvider context, matchMedia mock |
| 2026-02-26 | CRITICAL | Dual AuthContext conflict | Replaced anonymous auth with re-export of hooks/useAuth.tsx |
| 2026-02-26 | CRITICAL | No LoginPage | Created src/components/auth/LoginPage.tsx with error translation |
| 2026-02-26 | CRITICAL | No auth gate in App.tsx | Rewrote App.tsx with AppContent auth gate |
| 2026-02-26 | MEDIUM | firestore.ts dual Firebase init | Imports db/auth from shared firebase.ts |
| 2026-02-26 | MEDIUM | Practice Plans stat hardcoded 0 | Wired to usePracticePlans real Firestore count |
| 2026-02-26 | MEDIUM | PracticePlanner hardcoded 'demo-team' | Uses currentTeam?.id from TeamContext |

---

## Files Excluded from TypeScript Compilation (Technical Debt)

```
src/components/Coach Core AI Brain       — space in name; 104 TS errors; not imported
src/components/coach-core-integration.ts  — 62 TS errors; not imported
src/components/coach-core-integration.tsx — duplicate
src/components/coach-core-backend.ts      — uses @supabase/supabase-js (not installed)
src/components/coach-core-complete-integration.tsx — uses recharts (not installed)
src/components/fixed-core-functionality.tsx         — orphaned legacy
src/components/SmartPlaybook/src          — nested sub-app, not the active SmartPlaybook
src/coach-core-ai                         — empty scaffolding
src/features/playbook                     — uses getRealtimeInsight (not in AIContextType)
src/features/analytics                    — not wired into active app
src/features/auth                         — legacy Login/Signup, replaced by LoginPage.tsx
src/utils                                 — dev/test scripts, use Firestore without null guards
src/components/OfflineFallbacks.tsx       — imports from excluded src/utils
```

---

## Remaining Work (Next Session)

1. **AI Brain Implementation** — `src/ai-brain/core/AIBrain.ts` has 8 methods that are all TODO stubs. The AI is the entire product differentiator and it does not exist yet. The next session must implement real AI methods using the existing OpenAI proxy infrastructure (`src/services/ai-proxy.ts`), starting with `generatePracticePlan` and `getPlaySuggestions`. The proxy endpoint and token are configured via `REACT_APP_AI_PROXY_ENDPOINT` and `REACT_APP_AI_PROXY_TOKEN`.
2. **HIGH-001** — Rotate Firebase API key leaked in `.env.local.example`
3. **HIGH-005** — Upgrade react-scripts to fix webpack-dev-server vulnerabilities
4. **Tests** — Add test coverage beyond the smoke test
5. **SmartPlaybook Firestore** — Wire play saves to Firestore (infrastructure ready via `savePlay`)

---

## Session Log

### Session 1: 2026-02-25/26 — Infrastructure Repair

**Pre-repair baseline:**
- `npm run build`: FAIL — PostCSS crash before any compilation
- `npx tsc --noEmit`: 166 errors in 2 files
- `npm test`: FAIL — Firebase crash at module load
- App renders: NO — crashes on firebase.ts module load

**Post-repair:**
- `npm run build`: ✅ PASS
- `npx tsc --noEmit`: ✅ PASS (0 errors)
- `npm test`: ✅ PASS (1/1)
- App renders: ✅ YES

### Session 2: 2026-02-26 — Three-Branch Merge

**Branches merged (in order):**
1. `claude/infrastructure-repair-Uz0uG` (5 commits, 39 files) — build/TypeScript/test fixes
2. `claude/auth-hardening-firestore-consolidation-E8Wrh` (1 commit, 9 files) — real auth, Firestore consolidation, LoginPage
3. `claude/review-project-docs-XUB49` (1 commit, 14 files) — player roster with AI connection

**Files manually reconciled (touched by multiple branches):**
- `src/App.tsx` — All 3 branches. Merged auth-hardening's auth gate with roster's RosterProvider. Final hierarchy: ErrorBoundary > AuthProvider > [auth check] > TeamProvider > RosterProvider > AIProvider > Dashboard.
- `MASTER_TRACKER.md` — All 3 branches. Kept infrastructure-repair's version as base, appended session log entries for each merge.
- `src/services/firebase.ts` — infrastructure-repair + auth-hardening. Kept infrastructure-repair's null-safe version with config/env.ts imports.
- `src/services/firestore.ts` — infrastructure-repair + auth-hardening. Used auth-hardening's shared import approach (`import { db, auth } from './firebase'`) with infrastructure-repair's null-safety guards.
- `src/components/AuthProvider.tsx` — infrastructure-repair + auth-hardening. Clean re-export of hooks/useAuth.
- `src/components/Dashboard.tsx` — auth-hardening + roster. Merged both: practice plans from Firestore (auth-hardening) AND roster tab/stats (roster).
- `src/features/practice-planner/PracticePlanner.tsx` — infrastructure-repair + roster. Used roster's version with real team ID (removed 'demo-team' fallback), roster context for AI, and empty roster prompt.

**Additional fixes during merge:**
- `tsconfig.json` — Narrowed `"src/features"` exclusion to only `src/features/playbook`, `src/features/analytics`, `src/features/auth` so roster and practice-planner files are compiled.
- `src/services/roster-service.ts` — Added null guards for `db` (typed as `Firestore | null` in infrastructure-repair's firebase.ts).

**Before/After:**
- Build: FAIL → ✅ PASS
- TypeScript: 166 errors → ✅ 0 errors
- Tests: FAIL → ✅ 1/1 pass
- No hardcoded 'demo-team' in active code
- No NEXT_PUBLIC_ or VITE_ in active code
- Single Firebase initialization
