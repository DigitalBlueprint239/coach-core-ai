# Coach Core Agent Session Skill

## Purpose

Guides any AI agent through a development session on Coach Core Smart Playbook — a football play-design and coaching application built with Vite, React, TypeScript, and Konva. Every session follows a strict pre-flight → work → post-flight protocol to maintain the verified-clean codebase established across 8 prior merge sessions.

---

## Codebase Overview

**Repo:** Coach-Core-Smart-Playbook- (Vite / React / TypeScript / Konva)
**Build tool:** Vite (NOT CRA, NOT react-scripts)
**Test framework:** Vitest (NOT Jest)
**Baseline:** 0 TypeScript errors, 0 @ts-nocheck, 60 passing tests, 498 kB bundle

### Directory Structure (Merged)

```
src/
├── services/
│   ├── firebase/
│   │   ├── config.ts              # Firebase app init (33 lines)
│   │   ├── firestore.ts           # Full CRUD + addToOfflineQueue (466 lines, 1 def + 6 call sites)
│   │   ├── schema.ts              # Firestore type definitions (639 lines)
│   │   └── index.ts
│   ├── auth/
│   │   └── useAuth.tsx            # Auth hook — email + Google OAuth (115 lines)
│   ├── ai/
│   │   ├── AIBrain.ts             # 8 coaching methods, real prompt engineering (1,188 lines)
│   │   ├── AIContext.tsx           # React context wrapping AIBrain (92 lines)
│   │   ├── ai-proxy.ts            # HTTP proxy client with retry (134 lines)
│   │   └── index.ts
│   ├── installService.ts          # Playbook save/load
│   ├── persistence.ts             # Cloud persistence layer
│   ├── formationService.ts        # 53 formations (34 OFF / 17 DEF / 2 ST)
│   ├── routeDefinitions.ts        # 13 routes
│   └── conceptService.ts          # 7 passing concepts
├── hooks/
│   └── useHistory.ts              # Undo/redo — useHistory hook (ALREADY BUILT, 11 tests)
├── components/
│   ├── AppErrorBoundary.tsx       # Error boundary wrapping entire app
│   ├── FieldCanvas.tsx            # Main Konva canvas
│   ├── DesignPanel.tsx            # Route/formation design sidebar
│   ├── CoverageAnalysisPanel.tsx  # Shell — wired to AIBrain
│   ├── GamePlanPanel.tsx          # Shell — wired to AIBrain
│   └── SituationalPlayCallerPanel.tsx  # Shell — wired to AIBrain
├── contexts/
│   ├── PlaybookContext.tsx        # Main state — uses useHistory hook (NOT a reducer)
│   └── UIContext.tsx
├── styles/
│   └── theme.ts                   # AppTheme definition
├── types/
│   └── styled.d.ts                # DefaultTheme augmentation (fixes styled-components)
└── test/
    └── setup.ts                   # Vitest setup
```

---

## Phase 1: Pre-Flight Audit (MANDATORY — Run Before Any Code Changes)

Run every check below. Report all results before writing a single line of code.

```bash
# 1. Verify correct repo — STOP if any check fails
cat vite.config.ts | head -3
ls src/hooks/useHistory.ts && echo "CORRECT REPO" || echo "WRONG REPO — STOP"

# 2. @ts-nocheck scan — must be zero
grep -r "@ts-nocheck" src/ --include="*.ts" --include="*.tsx"

# 3. TypeScript errors — must be zero
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"

# 4. Test suite — must be 60+ passing
npm run test -- --run 2>&1 | tail -5

# 5. Build — must pass, bundle under 500 kB
npm run build 2>&1 | tail -3

# 6. addToOfflineQueue integrity — must be 7 (1 definition + 6 call sites)
grep -c "addToOfflineQueue" src/services/firebase/firestore.ts

# 7. Firebase auth configuration check
grep -l "initializeApp\|getAuth\|getFirestore" src/services/firebase/config.ts
```

**Expected results:**
- @ts-nocheck: 0
- TypeScript errors: 0
- Tests: 60 passing
- Build: PASS (498 kB main bundle, under 500 kB target)
- addToOfflineQueue: 7

If any check fails, diagnose and fix before proceeding. Do NOT work around failures.

---

## Phase 2: Development Work

### Architecture Rules (Non-Negotiable)

**State Management:**
- Undo/redo lives in `useHistory` hook at `src/hooks/useHistory.ts` — NOT a reducer
- The hook exposes `canUndo`, `canRedo`, and accepts `{ commit: false }` for minor changes
- History cap is 50 entries — do not remove this
- `past`/`future` arrays live in React state only — never serialized to localStorage
- `PlaybookContext.tsx` consumes `useHistory` — it is the main state container
- Auth-triggered playbook hydration uses `commit: false` to avoid polluting undo history

**Persistence:**
- `savePlaybookToCloud` is cloud-only — no double localStorage write
- `addToOfflineQueue` in `src/services/firebase/firestore.ts` handles offline retry
- It has exactly 1 definition and 6 call sites — verify this count if you touch firestore.ts
- Whole-document pattern — no field-level adapters between Playbook type and Firestore schema

**Bundle:**
- jsPDF and jsPDF-autotable are dynamic imports in `exportService.ts` — do not convert to static
- GSAP is a lazy import in `UIContext.tsx` — only loads on play animation
- Firebase has a manual chunk (`vendor-firebase`, 468 kB) — loads eagerly (known debt #4)
- `vite.config.ts` has `manualChunks` splitting: vendor-react, vendor-konva, vendor-styled, vendor-firebase, vendor-react-dnd

**TypeScript:**
- Zero `@ts-nocheck` — enforced, not negotiable
- Zero `React.FC<any>` — use `React.FC<React.SVGProps<SVGSVGElement>>` for icon maps
- `extractJSON<T>` generic pattern handles unknown property access in AIBrain — do not revert to `any`

**Canvas:**
- `FIELD_CENTER_X` derives from `fieldConfig` — never hardcoded
- Player positions and route waypoints stored in yards, converted to pixels at render
- `PreviewLayer` is ephemeral — nothing from it ever reaches PlaybookContext state

### Session Warning: AI Proxy Not Deployed (Debt Item #5 — CRITICAL)

The AIBrain proxy server (`ai-proxy.ts`) is NOT running in production. All AI features (Coverage Analysis, Game Plan, Situational Play Caller) are wired but will silently fail for all users.

**Do NOT:**
- Build features that depend on AI responses being real
- Write tests that assert on actual AI responses
- Assume AI works in any user-facing flow

**Do:**
- Mock AIBrain methods when testing AI-dependent features
- Guard AI-dependent UI with loading/error states

---

## Phase 3: Post-Session Verification (MANDATORY)

```bash
npx tsc --noEmit          # Must be 0 errors
npm run test -- --run     # Must be >= session-start count (60+)
npm run build             # Must pass
npm run dev               # Must start without console errors
```

Do not mark a session complete if any check regresses from the session-start baseline.

---

## Test Suite (60 tests, 7 suites)

| Suite | Tests | What It Covers |
|-------|-------|---------------|
| installService.test.ts | 19 | Playbook save/load |
| useHistory.test.ts | 11 | Undo/redo, history cap, localStorage exclusion |
| formationService.test.ts | 9 | All 53 formations load with clean types |
| types.test.ts | 9 | Type integrity |
| routeService.test.ts | 7 | All 13 routes, required fields |
| persistence.test.ts | 4 | Cloud persistence layer |
| exportService.test.ts | 1 | Export (dynamic import pattern) |

---

## Invariants

| Rule | Enforcement |
|------|------------|
| No `@ts-nocheck` | Pre-flight grep scan — must be 0 |
| No `any` type shortcuts | TypeScript strict mode + code review |
| Test count never decreases | Pre/post session comparison (baseline: 60) |
| `addToOfflineQueue` = 1 def + 6 calls | Pre-flight grep count on `src/services/firebase/firestore.ts` |
| No `console.log` in committed code | Code review |
| No TODO comments in production paths | Code review |
| Bundle under 500 kB | Build output check (current: 498 kB) |

---

## Known Debt (Do Not "Fix" Without Review)

| # | Item | Risk | Action |
|---|------|------|--------|
| 1 | Firebase `any` types in firestore.ts offline queue | Low | Leave as-is — matches Firebase SDK patterns |
| 2 | 3 `any` fields in schema.ts | Low | Leave as-is — flexible Firestore document fields |
| 3 | `process.env.NODE_ENV` in Firebase modules | Low | Vite handles it |
| 4 | Firebase chunk (468 kB) loads eagerly | Medium | Future session: lazy-load Firebase init |
| 5 | AIBrain proxy server not deployed | **HIGH** | Do not build features depending on real AI responses |

---

## Next Feature Priorities (After Skills Rewrite)

| Priority | Feature | Why First |
|----------|---------|-----------|
| 1 | Flip / Mirror Play | Table stakes — every competitor has it |
| 2 | Concept Detection Engine | Moat feature foundation — AI recommendations depend on it |
| 3 | Wristband / Call Sheet Export | #1 word-of-mouth driver — FirstDown charges $750/yr for this |
| 4 | Expand routes to 18 + concepts to 15 | Credibility threshold for serious OCs |
| 5 | Coverage Beater Recommendations | Requires concept detection (Priority 2) first |
