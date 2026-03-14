# Coach Core AI — Agent Session Skill

## Purpose

Guides any AI agent through a development session on the Coach Core AI football coaching application. Every session follows a strict pre-flight → work → post-flight protocol to maintain the verified-clean codebase established across 8 prior merge sessions.

---

## Codebase Overview

**Repo:** coach-core-ai (CRA / React 19 / TypeScript 5.8 / Firebase 11)

### Directory Structure

```
src/
├── ai-brain/
│   ├── core/AIBrain.ts          # 8 coaching methods, real prompt engineering (1,188 lines)
│   ├── AIContext.tsx             # React context wrapping AIBrain (414 lines)
│   └── __tests__/AIBrain.test.ts
├── services/
│   ├── firestore.ts             # Full CRUD + addToOfflineQueue (466 lines)
│   ├── ai-proxy.ts              # HTTP proxy client with retry (134 lines)
│   ├── ai-service.ts            # AI service layer (943 lines)
│   ├── firebase.ts              # Firebase re-export stub (3 lines)
│   ├── push-notifications.ts    # Push notification handling
│   └── __tests__/
│       ├── ai-proxy.test.ts
│       └── firestore.test.ts
├── hooks/
│   ├── useAuth.tsx              # Auth hook — email + Google OAuth (115 lines)
│   └── useFirestore.ts          # Custom hooks: usePracticePlans, usePlaybook, useMigration (199 lines)
├── components/
│   ├── SmartPlaybook/
│   │   ├── SmartPlaybook.tsx    # Main playbook component (703 lines)
│   │   ├── TouchOptimizedPlaybook.tsx  # Touch-optimized variant (658 lines)
│   │   ├── components/          # CanvasArea, SavePlayDialog, RouteEditor, etc.
│   │   └── src/                 # Embedded app structure
│   ├── common/
│   │   ├── ErrorBoundary.tsx    # Reusable error boundary (111 lines)
│   │   └── __tests__/ErrorBoundary.test.tsx
│   ├── Dashboard.tsx
│   ├── AuthProvider.tsx
│   ├── TeamManagement.tsx
│   ├── OnboardingModal.tsx
│   ├── LoadingStates.tsx
│   ├── PWAInstallPrompt.tsx
│   └── index.ts
├── contexts/
│   └── TeamContext.tsx          # Team context provider (335 lines)
├── types/
│   └── firestore-schema.ts     # Firestore type definitions (639 lines)
├── firebase.ts                  # Firebase app init (33 lines)
├── App.tsx                      # Root app component (124 lines)
└── setupTests.ts                # Test setup with Firebase mocks (75 lines)
```

---

## Phase 1: Pre-Flight Audit (MANDATORY — Run Before Any Code Changes)

Run every check below. Report all results before writing a single line of code.

```bash
# 1. @ts-nocheck scan — target: zero in non-archived files
grep -r "@ts-nocheck" src/ --include="*.ts" --include="*.tsx" | grep -v "_archived" | grep -v "SmartPlaybook"

# 2. TypeScript errors — track count, target is zero
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"

# 3. Test suite — record baseline count
npm run test -- --run 2>&1 | tail -10

# 4. Build check
npm run build 2>&1 | tail -5

# 5. addToOfflineQueue integrity — must be 7 (1 definition + 6 call sites)
grep -c "addToOfflineQueue" src/services/firestore.ts

# 6. Firebase auth configuration check
grep -l "initializeApp\|getAuth\|getFirestore" src/firebase.ts src/services/firebase.ts
```

If any check regresses from the previous session baseline, diagnose and fix before proceeding.

---

## Phase 2: Development Work

### Architecture Rules (Non-Negotiable)

**State Management:**
- Team/playbook state managed via React Context (TeamContext, AIContext)
- useFirestore hook provides CRUD operations (usePracticePlans, usePlaybook, useMigration)
- Auth state managed via useAuth hook

**Persistence:**
- `addToOfflineQueue` in `src/services/firestore.ts` handles offline retry
- It has exactly 1 definition and 6 call sites — if you touch firestore.ts, verify this count
- Firestore is the single source of truth for persisted data

**TypeScript:**
- Zero `@ts-nocheck` in active (non-archived) code — enforced, not negotiable
- Zero `React.FC<any>` — use proper typed props
- Use `unknown` and narrow, never `any` as a shortcut

**Bundle / Imports:**
- Dynamic imports for heavy libraries (jsPDF, GSAP) — do not convert to static
- Firebase is eagerly loaded (known debt item #4)

### Session Warning: AI Proxy Not Deployed (Debt Item #5)

The AIBrain proxy server (`ai-proxy.ts`) is NOT running in production. All AI features (Coverage Analysis, Game Plan, Situational Play Caller) are wired but will silently fail.

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
# Must not regress from pre-flight baseline
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"
npm run test -- --run 2>&1 | tail -10
npm run build 2>&1 | tail -5
```

Do not mark a session complete if any check regresses from the session-start baseline.

---

## Invariants

| Rule | Enforcement |
|------|------------|
| No `@ts-nocheck` in active code | Pre-flight grep scan |
| No `any` type shortcuts | TypeScript strict mode + code review |
| Test count never decreases | Pre/post session comparison |
| `addToOfflineQueue` = 1 def + 6 calls | Pre-flight grep count |
| No `console.log` in committed code | Code review |
| No TODO comments in production paths | Code review |

---

## Known Debt (Do Not "Fix" Without Review)

| # | Item | Risk | Action |
|---|------|------|--------|
| 1 | Firebase `any` types in firestore.ts offline queue | Low | Leave as-is — matches Firebase SDK patterns |
| 2 | 3 `any` fields in firestore-schema.ts | Low | Leave as-is — flexible Firestore document fields |
| 3 | `process.env.NODE_ENV` in Firebase modules | Low | CRA handles it via react-scripts |
| 4 | Firebase loads eagerly | Medium | Future session: lazy-load Firebase init |
| 5 | AIBrain proxy server not deployed | **HIGH** | Do not build features depending on real AI responses |

---

## Next Feature Priorities (After Skills Rewrite)

| Priority | Feature | Dependency |
|----------|---------|------------|
| 1 | Flip / Mirror Play | None — table stakes |
| 2 | Concept Detection Engine | None — moat feature foundation |
| 3 | Wristband / Call Sheet Export | jsPDF already available |
| 4 | Expand routes to 18 + concepts to 15 | Credibility threshold |
| 5 | Coverage Beater Recommendations | Requires Priority 2 |
