# Coach Core AI — Master Integration Tracker

> Living document tracking the wiring status of every major feature, provider,
> service, and component in the Coach Core AI codebase.

---

## 1. Auth System

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| `AuthProvider` (email/password + Google) | `src/hooks/useAuth.tsx` | **ACTIVE** | Wraps the app in `App.tsx`; supports `signup`, `login`, `loginWithGoogle`, `logout` |
| `Login` page | `src/features/auth/Login.tsx` | **ACTIVE** | Rendered when user is unauthenticated; switched via state in `App.tsx` |
| `Signup` page | `src/features/auth/Signup.tsx` | **ACTIVE** | Rendered when user is unauthenticated; includes password confirmation + Google OAuth |
| Old anonymous `AuthProvider` | `src/components/AuthProvider.tsx` | **ORPHANED** | Replaced by `hooks/useAuth.tsx`; no longer imported |
| SmartPlaybook `LoginForm` | `src/components/SmartPlaybook/src/features/auth/LoginForm.tsx` | **ORPHANED** | Chakra UI version, not integrated |
| SmartPlaybook `SignupForm` | `src/components/SmartPlaybook/src/features/auth/SignupForm.tsx` | **ORPHANED** | Chakra UI version, not integrated |

---

## 2. Context Providers

| Provider | File | Status | Consumers |
|----------|------|--------|-----------|
| `AuthProvider` | `src/hooks/useAuth.tsx` | **ACTIVE** | `App.tsx` (root level) |
| `TeamProvider` | `src/contexts/TeamContext.tsx` | **ACTIVE** | `App.tsx` (inside authenticated branch); consumed by `Dashboard`, `MigrationBanner`, `TeamManagement`, `PracticePlanner` |
| `AIProvider` | `src/ai-brain/AIContext.tsx` | **ACTIVE** | `App.tsx` (inside authenticated branch); consumed by `SmartPlaybook`, `PracticePlanner`, `PlayAISuggestion` |
| `ToastManager` | `src/components/ToastManager.tsx` | **ACTIVE** | `App.tsx` (outermost) |

### Provider Hierarchy (App.tsx)

```
ErrorBoundary
  └─ ToastManager
     └─ AuthProvider
        └─ AppContent
           ├─ (unauthenticated) → Login / Signup
           └─ (authenticated)
              └─ TeamProvider
                 └─ AIProvider
                    └─ Dashboard
```

---

## 3. Firebase / Firestore Configuration

| File | Env Prefix | Status | Notes |
|------|-----------|--------|-------|
| `src/services/firebase.ts` | `REACT_APP_` | **ACTIVE** | Single shared Firebase app instance; exports `app`, `auth`, `db`, `analytics` |
| `src/services/firestore.ts` | *(imports from firebase.ts)* | **ACTIVE** | CRUD for `practicePlans` and `plays`; offline queue; real-time subscriptions |
| `src/components/SmartPlaybook/src/services/firebase.ts` | `VITE_` | **ORPHANED** | Separate init in SmartPlaybook sub-directory; not used by main app |

### Required Environment Variables

```
REACT_APP_FIREBASE_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN
REACT_APP_FIREBASE_PROJECT_ID
REACT_APP_FIREBASE_STORAGE_BUCKET
REACT_APP_FIREBASE_MESSAGING_SENDER_ID
REACT_APP_FIREBASE_APP_ID
REACT_APP_FIREBASE_MEASUREMENT_ID   # optional — Analytics
```

---

## 4. Practice Planner

| Aspect | Status | Details |
|--------|--------|---------|
| AI generation | **ACTIVE** | Uses `ai.generatePracticePlan()` from `AIContext` with real `TeamContext` |
| Team binding | **FIXED** | Uses `useTeam().currentTeam.id` — no longer hardcoded `'demo-team'` |
| Save to Firestore | **ACTIVE** | "Save Plan" button calls `savePracticePlan()` from `firestore.ts` |
| Saved plans list | **ACTIVE** | Fetches and displays plans via `getPracticePlans()` |
| Feedback loop | **ACTIVE** | Records outcome via `ai.recordOutcome()` |

---

## 5. Routing / Navigation

| Aspect | Status | Notes |
|--------|--------|-------|
| React Router | **NOT INSTALLED** | No URL-based routing |
| Navigation approach | State-based | `App.tsx` uses auth state to decide Login/Signup vs Dashboard; `Dashboard` uses internal tab state |

---

## 6. Known Issues & Tech Debt

| Issue | Severity | Location |
|-------|----------|----------|
| `Coach Core AI Brain` directory contains `.ts` file with JSX (should be `.tsx`) | Medium | `src/components/Coach Core AI Brain/ai-brain-mvp-setup.ts` |
| SmartPlaybook sub-directory has its own Firebase config using `VITE_` prefix | Low | `src/components/SmartPlaybook/src/services/firebase.ts` |
| Old anonymous `AuthProvider` still exists but is unused | Low | `src/components/AuthProvider.tsx` |
| `AIProvider` reads `import.meta.env.VITE_OPENAI_API_KEY` (Vite-style) in a CRA project | Medium | `src/ai-brain/AIContext.tsx:73` |
| No React Router — deep-linking and browser back/forward not supported | Medium | App-wide |
| `firestore.ts` `PracticePeriod` type has `intensity: number` but AI returns `intensity: string` | Low | `src/services/firestore.ts` |

---

## 7. File Index — Key Files

```
src/
├─ App.tsx                          # Root component, auth gating, provider tree
├─ index.tsx                        # React entry point
├─ hooks/
│  └─ useAuth.tsx                   # AuthProvider + useAuth hook (email/Google)
├─ contexts/
│  └─ TeamContext.tsx                # TeamProvider + useTeam hook
├─ ai-brain/
│  ├─ AIContext.tsx                  # AIProvider + useAI hook
│  └─ core/AIBrain.ts               # Singleton AI brain (stubs)
├─ features/
│  ├─ auth/
│  │  ├─ Login.tsx                   # Login page
│  │  └─ Signup.tsx                  # Signup page
│  └─ practice-planner/
│     └─ PracticePlanner.tsx         # AI practice generator + Firestore save
├─ services/
│  ├─ firebase.ts                   # Shared Firebase init (REACT_APP_ env vars)
│  └─ firestore.ts                  # Firestore CRUD + offline queue
├─ components/
│  ├─ Dashboard.tsx                  # Main dashboard with tabs
│  ├─ AuthProvider.tsx               # (ORPHANED) old anonymous auth
│  ├─ ToastManager.tsx               # Toast notifications
│  ├─ LoadingSpinner.tsx             # Loading spinner
│  └─ SmartPlaybook/                 # Sub-app (partially orphaned)
└─ types/
   └─ firestore-schema.ts           # TypeScript types for all Firestore collections
```
