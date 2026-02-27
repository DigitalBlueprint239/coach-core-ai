# Coach Core AI — Master Tracker

**Overall Completion: ~35%**

The foundation is in place: authentication, team management, AI service layer, Smart Playbook canvas, and now a fully functional player roster with AI integration. The next major milestones are saved practice plans, game schedule, and analytics.

---

## Confirmed Complete

- [x] Firebase setup (auth, Firestore, analytics)
- [x] Authentication flow (email/password, Google OAuth, persistence)
- [x] Team management (create, join via code, switch, leave)
- [x] Team context with real-time Firestore listener
- [x] AI service layer (OpenAI integration with caching, retries, safety validation)
- [x] AI context provider wrapping the app
- [x] Smart Playbook visual editor (canvas, formations, routes)
- [x] Toast notification system
- [x] Error boundary component
- [x] PWA install prompt and service worker registration
- [x] Onboarding modal
- [x] Migration banner (localStorage to Firestore)
- [x] Offline queue for Firestore writes
- [x] **Player Roster — full CRUD with Firestore subcollection** (`teams/{teamId}/players/{playerId}`)
- [x] **Roster types**: FootballPosition enum (22 positions), PositionGroup enum, RosterPlayer interface
- [x] **Roster UI**: Depth-chart layout grouped by Offense/Defense/Special Teams, position-sorted, experience-level-sorted
- [x] **Add Player**: slide-over form with position dropdown, experience level, jersey number uniqueness validation
- [x] **Edit Player**: slide-over with all fields including availability, injury note, coach notes
- [x] **Delete Player**: confirmation step before removal
- [x] **Roster Summary Bar**: total players, available today, injured/limited, position group counts
- [x] **Dashboard roster stat card**: live player count from Firestore
- [x] **AI-Roster connection**: `getRosterContextForAI()` feeds structured roster summary into practice plan prompts
- [x] **Practice Planner roster awareness**: shows empty-roster prompt when no players; shows connected roster indicator with availability counts
- [x] **Real-time Firestore listener** with proper cleanup on component unmount
- [x] **Jersey number uniqueness** enforced with clear error messaging

## In Progress

- [ ] Saved practice plans list (plans generated but not persisted to a viewable list)
- [ ] Analytics dashboard (component exists but is commented out)

## Not Started

- [ ] Game schedule management
- [ ] Attendance tracking per practice session
- [ ] Player performance metrics over time
- [ ] Opponent scouting / game prep module
- [ ] Push notifications (infrastructure exists, no triggers)
- [ ] Subscription/billing integration
- [ ] Multi-sport support (currently football-focused)

## Known Issues

| Severity | File | Issue |
|----------|------|-------|
| Low | `src/components/Coach Core AI Brain/` | Directory with spaces in name contains broken .ts files with JSX syntax errors. Not imported by the app — legacy artifacts. |
| Low | `src/components/coach-core-integration.ts` | Pre-existing TS errors (broken JSX in a .ts file). Not imported by the app. |
| Low | `src/services/firebase.ts` | Uses `process.env.NEXT_PUBLIC_*` env vars (Next.js pattern) but app is CRA. The active Firestore init in `src/services/firestore.ts` uses `import.meta.env.VITE_*` correctly. |
| Medium | `src/components/Coach's Corner/Roster Management/` | Contains `.jsx.txt` reference files from a prior prototype. These are not imported and can be deleted. |
| Low | `src/services/firestore.ts:244` | `error.message` accessed without narrowing — pre-existing. |

## Next Session Starts Here

The roster is live and feeding the AI. The natural next step is a two-part feature:

1. **Saved Practice Plans List** — When the AI generates a practice plan, the coach should be able to save it. Build a list view showing saved plans by date, with the ability to view, edit, and delete. Store at `teams/{teamId}/practicePlans/{planId}`. The Firestore service layer (`src/services/firestore.ts`) already has `savePracticePlan` and `getPracticePlans` — wire them into the PracticePlanner UI.

2. **Basic Game Schedule** — Coaches need to know what they're preparing for. A simple schedule showing upcoming opponents with date/location gives the AI context for game-prep practice plans. The `TeamSchedule` and `GameSchedule` interfaces already exist in `src/types/firestore-schema.ts`. Build a minimal schedule view and feed upcoming-game context into the AI prompt alongside roster data.

Together these give the coach a complete loop: roster → AI practice plan → save plan → prepare for next game.

---

## Session Log

### 2026-02-24 — Player Roster + AI Connection

**Built:**
- Complete player roster feature: types (`src/types/roster.ts`), Firestore service (`src/services/roster-service.ts`), React context (`src/contexts/RosterContext.tsx`), and five UI components under `src/features/roster/`
- Dashboard integration with Roster tab and live player count stat card
- AI connection: `getRosterContextForAI()` produces a structured natural-language summary of roster state (positions, availability, injuries) that is injected into the practice plan prompt via `TeamContext.rosterSummary`
- Fixed PracticePlanner to use the correct `generatePracticePlan` method (was calling nonexistent `generateSmartPractice`)

**Explicitly deferred:**
- Saved practice plans list (Firestore functions exist, no UI)
- Attendance tracking per practice
- Player performance metrics

**AI connection implementation:** The `RosterContext` exposes `getRosterContextForAI()` which builds a single-paragraph summary (e.g., "Roster: 28 players total, 24 fully available. Offense: 12/14 available (2/3 WR, 1/1 QB...). Injury report: J. Smith #12 WR - limited (knee)."). The PracticePlanner passes this as `teamContext.rosterSummary` which the AI service injects into the prompt via `buildPracticePlanPrompt`. No new dependencies were added.
