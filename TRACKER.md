# Coach Core AI - Master Tracker
Last Audited: 2026-02-24

## Current Completion: ~38%

**Tech Stack:** React 19 + TypeScript | Firebase (Auth, Firestore, Cloud Functions) | OpenAI GPT-4 | Tailwind CSS + Chakra UI | PWA

---

## Confirmed Complete

1. **Firebase Infrastructure** - App init, Firestore config, security rules, indexes, emulator support, env templates (`.env.local.example`, `env.production.example`)
2. **Cloud Functions** - `onUserCreated` (profile setup), `onTeamMemberAdded` (notifications), `onPracticePlanCreated` / `onPlayCreated` (stat counters), `cleanupOldNotifications`, `healthCheck`
3. **Firestore Service Layer** (`src/services/firestore.ts`) - Full CRUD for practice plans and plays, offline queue with localStorage persistence, network monitoring, auto-sync on reconnect
4. **Firestore Hooks** (`src/hooks/useFirestore.ts`) - `usePracticePlans` and `usePlays` with real-time `onSnapshot` subscriptions, create/update/delete wrappers
5. **TypeScript Schema** (`src/types/firestore-schema.ts`) - Comprehensive interfaces for all 15+ collections: users, teams, players, practicePlans, plays, aiInsights, aiConversations, analytics, notifications, feedback, etc.
6. **AI Service Layer** (`src/services/ai-service.ts`) - 6 request types (practice_plan, play_suggestion, performance_analysis, drill_suggestions, conversation, safety_validation), 5-min cache TTL, retry with exponential backoff, confidence scoring
7. **AI Proxy Server** (`src/server/ai-proxy-server.js`) - Express server, bearer token auth, rate limiting (100 req/15 min), request routing to OpenAI, health endpoint, cost/latency tracking
8. **AI Context Provider** (`src/ai-brain/AIContext.tsx`) - Full React context wrapping both direct AI service and proxy modes, all 6 methods wired, suggestion/insight state management, cache stats
9. **Team Management** (`src/components/TeamManagement.tsx`, `src/contexts/TeamContext.tsx`) - Create team (generates 6-char code), join via code, switch active team, leave team, real-time Firestore listeners, TeamSelector dropdown
10. **Smart Playbook Core** (`src/components/SmartPlaybook/`) - Interactive 100-yard field canvas, drag-and-drop player placement, route drawing (Bezier curves), formation templates (Shotgun, 4-3, I-Formation, 3-4), play library save/load to localStorage, undo/redo stack, mobile touch optimization
11. **Toast Notification System** (`src/components/Toast.tsx`, `ToastManager.tsx`) - Success/error/info/warning variants, auto-dismiss, context provider with `useToast` hook
12. **Error Boundary** (`src/components/ErrorBoundary.tsx`, `common/ErrorBoundary.tsx`) - Catches React errors, retry mechanism, error reporting with component stack traces
13. **PWA Support** - Service worker (`public/sw.js`), `manifest.json`, `PWAInstallPrompt.tsx` with install detection
14. **Onboarding Modal** (`src/components/OnboardingModal.tsx`) - 8-step walkthrough, skip option, demo mode trigger, persists completion to localStorage
15. **Loading States** (`src/components/LoadingSpinner.tsx`, `LoadingStates.tsx`) - Multiple sizes (sm/md/lg), contextual text
16. **Push Notifications Service** (`src/services/push-notifications.ts`) - VAPID key auth, subscribe/unsubscribe, permission request, test notification
17. **Offline Persistence Utils** (`src/utils/offline-persistence.ts`) - Queue management, sync interval, cache strategies
18. **Migration Banner** (`src/components/MigrationBanner.tsx`) - Prompts localStorage-to-Firestore migration per team
19. **Offline Fallbacks** (`src/components/OfflineFallbacks.tsx`) - Offline indicator, stale data warnings, pending ops counter
20. **Data Utilities** (`src/utils/`) - backup-automation.ts, data-migration.ts, data-seeding.ts, data-validation.ts, performance-optimization.ts, performance-testing.ts, security-verification.ts, multi-user-testing.ts

---

## Partially Built (needs finishing)

1. **Authentication Flow** - `AuthProvider` works but uses **anonymous auth only** (`signInAnonymously`). Login.tsx and Signup.tsx exist with email/password + Google OAuth, but Dashboard's "Sign In" button shows a toast "Authentication coming soon!" instead of routing to the login page. No React Router routes connect them.
2. **Practice Planner** (`src/features/practice-planner/PracticePlanner.tsx`) - AI generation UI works (duration, goals, generate button, result display with feedback), but uses hardcoded `'demo-team'` instead of actual `currentTeam.id`. Generated plans are **not saved to Firestore**. No list view of saved plans.
3. **Dashboard Overview Stats** (`src/components/Dashboard.tsx:137`) - "Practice Plans" and "Plays Created" are **hardcoded to 0**. "Active Teams" only shows 1 or 0 based on `currentTeam` existence. Should query actual Firestore counts.
4. **Analytics Tab** - Import is **commented out** (`// import AnalyticsDashboard`). `ProgressAnalytics.tsx` is a **placeholder** that displays "Analytics data will be displayed here once the feature is fully implemented."
5. **Play AI Suggestion** (`src/features/playbook/PlayAISuggestion.tsx`) - Component exists but calls `ai.getRealtimeInsight()` which **does not exist** on AIContext (should be `generatePlaySuggestion`). Not integrated into SmartPlaybook UI.
6. **AI Brain Singleton** (`src/ai-brain/core/AIBrain.ts`) - All 7 methods are **stubs returning TODO placeholders** (generateSmartPractice, getRealtimeInsight, analyzeProgress, processMessage, personalizeOnboarding, getSmartNotification, predictChurn).
7. **Smart Playbook Persistence** - Save/load uses **localStorage only**. Firestore play CRUD exists in `firestore.ts` but is **not wired** into SmartPlaybook component.
8. **Firestore Security Rules** (`firestore.rules`) - Only `ownerId` can read/write team data. **Team members** (non-owners) have no access. Rules should check `memberIds` array for read access.
9. **Python Integrations** (`integrations/`) - Phase 0 (Optuna, Sony MCT) and Phase 1 (CrewAI, Sports Vision) have **standalone demo files** but are not integrated into the main app or any API endpoints.
10. **AI Insight Card** (`src/ai-brain/components/AIInsightCard.tsx`) - File exists but is **empty** (1 line). Never rendered anywhere.

---

## Not Started

### Priority 1 - Core User Flows
- **Real Auth Routing** - React Router setup connecting Login/Signup pages to Dashboard, protected routes, email verification flow, password reset
- **Player/Roster Management UI** - CRUD interface for adding/editing/removing players on a team (schema exists in `firestore-schema.ts`, no UI)
- **Saved Practice Plans List** - Browse, view, edit, delete previously generated/saved practice plans
- **Saved Plays Browser** - Grid/list view to browse plays stored in Firestore (beyond SmartPlaybook's localStorage library)
- **AI Chat Interface** - `processConversation` method exists in AIContext, but there is no chat/messaging UI component
- **Connect Practice Planner to Firestore** - Wire AI-generated plans to save via `savePracticePlan()`, use real team context

### Priority 2 - Important Features
- **Game/Season Schedule** - `gameSchedule` collection defined in schema, no UI for creating or viewing games
- **Attendance Tracking UI** - `attendance` collection and `AttendanceRecord` type defined, no check-in/tracking UI
- **User Profile / Settings Page** - No page for editing user info, preferences, timezone, notification settings
- **Team Settings / Admin** - No UI for editing team sport, age group, season, location; no member role management
- **Notification Center / Inbox** - Push notification service exists, but no UI to view/manage notification history
- **Drill Library Browser** - `drillLibrary` collection defined, no browsing/searching/favoriting UI
- **Player Stats & Performance UI** - `PlayerStats`, `PlayerAchievement` types defined, no charts or data entry forms

### Priority 3 - Advanced / Future
- **Multi-Sport Support** - Schema supports football, basketball, soccer, baseball, etc. UI is football-only (field, formations)
- **Video / Diagram Upload** - `diagram` and `video` URL fields exist on Play type, no upload or media player
- **Stripe / Subscription Billing** - `Subscription` type in schema, no Stripe integration or paywall
- **Admin Panel** - No superuser dashboard for managing users, reviewing feedback, system health
- **Equipment Management UI** - `equipment` collection defined, no inventory UI
- **Badge / Achievement System** - `badges` and `achievements` collections defined, no earning/display logic
- **Feedback / Bug Report UI** - `feedback` collection with types/statuses defined, no submission form
- **CI/CD Pipeline** - Only `model-optimization.yml` exists; no build, test, lint, or deploy workflows
- **Test Suite** - Only `App.test.tsx` and `setupTests.ts` exist; no unit/integration/e2e tests for features
- **Production Deployment** - Guides exist (PRODUCTION_SETUP_GUIDE.md) but no evidence of a live deployment

---

## Next Session Starts Here

**Wire real authentication into the app and connect the Practice Planner to Firestore.** The biggest gap right now is that the app auto-signs in anonymously and the fully-built Login/Signup pages are orphaned. Set up React Router with `/login`, `/signup`, and `/dashboard` routes, protect the dashboard behind real auth, and replace the anonymous sign-in. Then fix the Practice Planner to use `currentTeam.id` instead of `'demo-team'` and save generated plans to Firestore via the existing `savePracticePlan()` service, adding a "My Plans" list view. These two changes unlock the core loop: sign in, pick a team, generate a plan, save it, find it later.

---

## Session Log
- 2026-02-24: Initial full-codebase audit completed. 38% overall completion estimated. Core infrastructure and services are solid; main gaps are in user-facing flows (auth routing, saving data, analytics, player management) and connecting existing backend services to the frontend.
