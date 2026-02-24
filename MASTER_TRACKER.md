# Coach Core AI — Master Tracker
> Living source of truth for project state. Read this first at the start of every session.
> Last updated: 2026-02-24

---

## 1. Project Overview

**What it is:** AI-powered football coaching web app. Coaches plan practices, design plays, manage teams, and get AI-generated insights.

**Tech stack:**
- React 19 + TypeScript (strict mode)
- Firebase (Auth + Firestore)
- Create React App / react-scripts (NOT Vite, NOT Next.js)
- Tailwind CSS
- State-based routing (no React Router — intentional)

**Env vars:** `REACT_APP_*` prefix, via `process.env.REACT_APP_*`. See `.env.local.example`.

---

## 2. File Index (Active App — Production Code Path)

| File | Purpose | Status |
|------|---------|--------|
| `src/App.tsx` | App shell: auth gate → LoginPage or Dashboard | ✅ Healthy |
| `src/components/auth/LoginPage.tsx` | Email/password login + signup form | ✅ Healthy |
| `src/hooks/useAuth.tsx` | Auth context + email/password auth, browserLocalPersistence | ✅ Healthy |
| `src/components/AuthProvider.tsx` | Re-exports from hooks/useAuth.tsx (backward compat shim) | ✅ Healthy |
| `src/services/firebase.ts` | Single Firebase initialization. All modules import from here | ✅ Healthy |
| `src/services/firestore.ts` | Firestore CRUD + real-time subscriptions. Imports db/auth from firebase.ts | ✅ Healthy |
| `src/hooks/useFirestore.ts` | React hooks wrapping firestore.ts service functions | ✅ Healthy |
| `src/contexts/TeamContext.tsx` | Team management context. Imports auth/db from firebase.ts | ✅ Healthy |
| `src/components/Dashboard.tsx` | Main dashboard with tab navigation + real Practice Plans count | ✅ Healthy |
| `src/features/practice-planner/PracticePlanner.tsx` | AI-powered practice plan generator | ⚠️ Partially Built |
| `src/components/SmartPlaybook/SmartPlaybook.tsx` | Play design canvas. Saves to localStorage (not Firestore yet) | ⚠️ Partially Built |
| `src/components/SmartPlaybook/src/services/firebase.ts` | Consolidated to re-export from shared firebase.ts | ✅ Healthy |
| `src/components/common/ErrorBoundary.tsx` | Simple error boundary used by App.tsx and SmartPlaybook | ✅ Healthy |
| `src/components/ErrorBoundary.tsx` | Advanced error boundary with reporting (used by index.ts) | ✅ Healthy |
| `src/components/ToastManager.tsx` | Toast notification context | ✅ Healthy |
| `src/components/TeamManagement.tsx` | Team create/join UI | ⚠️ Partially Built |
| `.env.local.example` | Environment variable template with REACT_APP_ prefix | ✅ Healthy |

**Orphaned / Dead Code (do not delete without investigation):**
- `src/components/Coach Core AI Brain /` — not imported by active app, has TS errors
- `src/components/coach-core-integration.ts` — not imported, has TS errors
- `src/components/SmartPlaybook/src/` — nested sub-project directory; only the firebase.ts was consolidated; rest is unused

---

## 3. Auth Architecture

```
App.tsx
  └── AuthProvider (from hooks/useAuth.tsx via components/AuthProvider.tsx re-export)
        └── AppContent
              ├── [authLoading] → LoadingSpinner
              ├── [!user]       → LoginPage
              └── [user]        → TeamProvider → AIProvider → Dashboard
```

**Key facts:**
- Firebase persistence: `browserLocalPersistence` (page refresh keeps user signed in)
- Auth errors: translated from Firebase error codes to human-readable messages in LoginPage.tsx
- `TeamContext` mounts only after auth resolves — `auth.currentUser` is always set when TeamContext initializes
- Only ONE Firebase app instance exists (initialized in firebase.ts, guarded with `getApps()`)

---

## 4. ✅ Confirmed Complete

- [x] React app loads without crashing
- [x] Single Firebase initialization (firebase.ts is the only `initializeApp` call)
- [x] Email/password sign in and sign up
- [x] Auth persists across page refresh (browserLocalPersistence)
- [x] Auth errors surface human-readable messages (no silent failures, no raw error codes)
- [x] Protected routing: unauthenticated users always see LoginPage
- [x] No flash of content: loading spinner shown during auth state resolution
- [x] Dashboard Practice Plans stat reads from real Firestore (via usePracticePlans)
- [x] SmartPlaybook orphaned Firebase config consolidated to shared instance
- [x] Firestore service layer imports from shared firebase.ts (no double initialization)
- [x] Environment variable prefix documented and consistent (REACT_APP_)
- [x] Zero TypeScript errors in active app code

---

## 5. ⚠️ Partially Built

- **Practice Planner** — AI generation works (calls ai-brain), but plans are NOT saved to Firestore. The form generates a plan in memory but has no "save" button wired to Firestore. The `usePracticePlans` hook exists and is ready; it just needs to be called in PracticePlanner.tsx.
- **SmartPlaybook** — Design canvas works and saves to `localStorage`. Not yet wired to Firestore. `usePlaybook` hook exists and is ready.
- **Team Management** — Create team and join team UI exists. Listing and switching teams works. Player roster management does NOT exist yet.
- **Analytics Tab** — Tab exists in Dashboard but content is commented out.
- **Dashboard "Plays Created" stat** — Still hardcoded to 0. Needs `usePlaybook` hook wired in when SmartPlaybook moves to Firestore.

---

## 6. ❌ Not Started

- Player roster UI (no component exists)
- Player performance tracking
- Analytics dashboard
- Push notifications (infrastructure exists but no content)
- Google Sign-In (provider exists in useAuth.tsx but no button in LoginPage)

---

## 7. ✅ Resolved Issues

| Date | Severity | Issue | File | Fix |
|------|----------|-------|------|-----|
| 2026-02-24 | CRITICAL | `firebase.ts` used `NEXT_PUBLIC_*` env prefix (Next.js) instead of `REACT_APP_*` (CRA), causing throw on startup | `src/services/firebase.ts` | Changed to `REACT_APP_*`, removed throw, replaced with warning log |
| 2026-02-24 | CRITICAL | Two separate AuthContext instances: anonymous auth in `components/AuthProvider.tsx` and email/password in `hooks/useAuth.tsx`. Dashboard read from the email/password context but App.tsx provided the anonymous one — every Dashboard mount threw | `src/components/AuthProvider.tsx` | Replaced anonymous auth provider with re-export of hooks/useAuth.tsx. One context, one source of truth. |
| 2026-02-24 | CRITICAL | No LoginPage existed — "Sign In" button showed a toast saying "Authentication coming soon!" | `src/components/Dashboard.tsx` | Created `src/components/auth/LoginPage.tsx` with email/password, signup/login toggle, and Firebase error code → human message translation |
| 2026-02-24 | CRITICAL | No auth gate in App.tsx — unauthenticated users could reach (a broken) Dashboard | `src/App.tsx` | Rewrote App.tsx to include `AppContent` component that gates on `useAuth().user` |
| 2026-02-24 | MEDIUM | `firestore.ts` self-initialized Firebase with `VITE_*` env vars instead of importing from shared `firebase.ts` | `src/services/firestore.ts` | Removed self-initialization, imports `db` and `auth` from `./firebase` |
| 2026-02-24 | MEDIUM | `SmartPlaybook/src/services/firebase.ts` was an orphaned second Firebase app initialization | `src/components/SmartPlaybook/src/services/firebase.ts` | Consolidated: file now re-exports from shared firebase.ts |
| 2026-02-24 | MEDIUM | Dashboard Practice Plans stat hardcoded to `0` | `src/components/Dashboard.tsx` | Wired to `usePracticePlans(currentTeam?.id).plans.length` — real-time Firestore count |
| 2026-02-24 | LOW | `.env.local.example` used `NEXT_PUBLIC_*` prefix | `.env.local.example` | Updated to `REACT_APP_*` with explanation of why |

---

## 8. Known Tech Debt (Active)

| ID | Severity | Issue | File | Decision |
|----|----------|-------|------|----------|
| TD-01 | LOW | `TeamContext.tsx` reads `auth.currentUser` directly in `useEffect` rather than subscribing to `onAuthStateChanged`. This is safe because TeamContext now only mounts after auth resolves (App.tsx auth gate), but it's fragile — if TeamProvider is ever moved above the auth gate, it silently fails to load teams. | `src/contexts/TeamContext.tsx` | Deferred. The architectural fix (refactoring to onAuthStateChanged) risks breaking working team features. Address in a dedicated TeamContext hardening session. |
| TD-02 | LOW | Pre-existing TypeScript errors in two dead-code files: `src/components/Coach Core AI Brain/ai-brain-mvp-setup.ts` and `src/components/coach-core-integration.ts`. Neither is imported by the active app. | Legacy files | Deferred. These files are not in the production code path. They should be deleted or moved to an archive folder, but doing so during an auth session risks disrupting the git history unexpectedly. |
| TD-03 | MEDIUM | `PracticePlanner.tsx` hardcodes `teamId: 'demo-team'` in its AI generation call. The real teamId is available from `useTeam().currentTeam?.id` but is not passed. | `src/features/practice-planner/PracticePlanner.tsx` | Deferred. Fixing this requires wiring `useTeam` into PracticePlanner, which is a feature-layer change (not infrastructure). |
| TD-04 | MEDIUM | SmartPlaybook saves plays to `localStorage` only. Firestore infrastructure (`usePlaybook` hook, `savePlay` service) is ready and waiting but not wired in. | `src/components/SmartPlaybook/SmartPlaybook.tsx` | Deferred. This is the next natural step after the player roster is built (roster items become players in plays). |
| TD-05 | LOW | `src/components/ErrorBoundary.tsx` (the advanced one) uses `import.meta.env.VITE_*` which doesn't work in CRA. The values silently return `undefined`. | `src/components/ErrorBoundary.tsx` | Low risk — `import.meta.env.VITE_VERSION` just returns `undefined`, which doesn't crash anything. Fix when error reporting infrastructure is set up. |

---

## 9. Session Log

### 2026-02-24 — Auth Hardening & Firestore Consolidation
**Fixed:** All 6 critical/medium infrastructure issues: incorrect env var prefix crashing Firebase init, dual AuthContext conflict causing every Dashboard mount to throw, missing LoginPage (auth was a stub), no auth gate in App.tsx, Firestore self-initialization with wrong vars, and orphaned SmartPlaybook Firebase config creating a second app instance. Also connected the Dashboard Practice Plans stat to real Firestore data.

**Confirmed working:** Single Firebase instance, email/password sign in/signup, auth persists across page refresh (browserLocalPersistence), auth errors show human-readable messages, unauthenticated users see LoginPage (never a broken Dashboard), Practice Plans count reflects real Firestore data.

**Deferred:** TeamContext auth race condition (safe with current auth gate), PracticePlanner hardcoded teamId, SmartPlaybook Firestore wiring, pre-existing TS errors in dead-code files.

---

## 10. Next Session Starts Here

**Next step: Player Roster UI**

The player roster is the foundational piece that unblocks multiple dependent features:
- Team management is currently a stub (you can create/join teams but can't add players)
- Play design in SmartPlaybook currently uses generic player positions — real roster data would let coaches drag actual players onto the field
- Practice planning could target specific players ("WR routes drill — Johnson, Williams, Davis")
- Player performance analytics can't exist without a player list to attach metrics to

**Recommended scope for next session:**
1. Create `src/components/roster/PlayerRoster.tsx` — list players for the current team
2. Create `src/services/players.ts` — Firestore CRUD for players collection
3. Create `src/hooks/usePlayers.ts` — React hook wrapping the players service
4. Add "Roster" tab to Dashboard (already has a tab row — add a 6th tab)
5. Wire SmartPlaybook to read from roster instead of creating anonymous players

**Do not start on analytics or Google Sign-In until the roster exists** — both depend on having real player identities in the system.
