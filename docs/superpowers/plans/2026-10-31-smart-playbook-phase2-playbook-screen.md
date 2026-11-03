# Smart Playbook Phase 2 — Playbook Screen + Owner Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Behind a feature flag, coaches get the new "Sheet on the desk" Smart Playbook: browse the verified library, create and edit plays and formations from scratch or any template, use their team's terminology, see the coaching assistant and the step-through read, and save to their team. The owner gets a content review screen that approves or rejects drafts.

**Architecture:** A new feature folder `src/features/playbook2/` built on `src/football-core/` (phase 1). Editing is a pure reducer with undo/redo; the field is an SVG renderer in yards; persistence writes version-2 plays to the existing `plays` collection and team settings to the team document, so **no Firestore security-rule changes** are needed. Owner decisions live in a committed `decisions.json` that `fullLibrary()` applies, so approving content is a reviewed code change, not a database write.

**Tech Stack:** React 19, Vite + Vitest (jsdom) + React Testing Library 16 (already installed by the foundation work, PR #101), TypeScript 5.8, Tailwind 4 (existing, now actually generated) plus CSS variables for the look, Firebase 11 (existing), `@fontsource` font packages (new).

**Spec:** `docs/superpowers/specs/2026-10-30-smart-playbook-design.md` (approved). This plan implements §10 step 2 and the owner review queue from §6, with §3 (look), §4 (architecture), §5.0–5.4 and §7 (data).

**Where to run:** a cloud Claude Code session (claude.ai/code) on branch `smart-playbook/phase2-screen`, with `npm ci`, `npm test` and `npm run dev` for visual checks. The owner's laptop is not used for builds or tests.

**Rebased 2026-11-01 onto the foundation trunk (PR #101).** What changed for this plan: env flags are read with `import.meta.env` (prefix still `REACT_APP_`); tests use Vitest (`vi.*`, `vi.stubEnv`); CI also runs `npm run lint` (zero warnings), `npm run typecheck`, and the `firestore-rules` emulator job; coaches now sign in with real accounts (`useAuth()` from `src/components/AuthProvider` gives `user`, `isAuthenticated`); `firestore.rules` now forbids changing a play's `teamId` or `createdBy` on update and a team's `ownerId`. The old Task 1 install fix is done and removed from this plan.

## Global Constraints

- Branch `smart-playbook/phase2-screen` from `recovery/coach-core-mvp-2026` (at or after `b1ae308`); PR into `recovery/coach-core-mvp-2026` as a draft; no merge or deploy without the owner.
- Everything new is behind `REACT_APP_ENABLE_PLAYBOOK_V2 === 'true'`; with the flag off, the app behaves exactly as today. The owner review screen is behind `REACT_APP_ENABLE_CONTENT_REVIEW === 'true'` (dev and preview builds only).
- Do not change `firestore.rules`, authentication, or the persisted fields of existing (version-1) plays. Existing plays are never rewritten.
- Library content reaching coaches comes only from `publishedLibrary()`; drafts and rejected items never appear outside the review screen.
- Look (spec §3): workspace `#F5F7FA`, surface `#FFFFFF` with border `#E3E8EE`, ink `#14202E`, secondary `#536173`, sheet `#123B6D`, linework `#DCE8FA` at 40–50%, signal `#FF8A3D` (text on it `#1A0E05`), coach note on dark `#F4D35E`. Saira Stencil One only for play names, title block and yard numbers; Public Sans for UI; Caveat only for coach notes and the assistant tip. Offense as O's, defense as X's; skill players labelled, linemen unlabelled; one primary action per screen.
- Touch targets ≥ 44 px; WCAG AA contrast; keyboard path for every action; routes draw on once per play view and not at all under `prefers-reduced-motion`.
- AI stays off: nothing in this phase calls `AIProvider`, `CoachCoreAIBrain` or the AI proxy.
- Tests: `npx vitest run src/features/playbook2 src/football-core` while working; before each commit `npm run lint && npm run typecheck && npm test`. CI on the PR runs `test-and-build` (lint, typecheck, full suite, build), `firestore-rules` and `preview`; all three are required to merge.
- Flags are read only through `flags.ts` (`import.meta.env.REACT_APP_*`), never `process.env` (it doesn't exist in the Vite bundle).
- Commit messages end with the session attribution lines given to the executing agent.

## Review Focus

1. **Editing a library template must never change the template.** A coach drags a player in "Smash from Doubles" and saves; the library item and every other coach's copy are untouched. → Task 4.
2. **Nothing lost mid-edit.** Closing the tab or switching views with unsaved changes keeps a local draft that is offered back on return. → Task 4.
3. **Illegal formations while editing.** Dragging a receiver off the line so only 6 remain shows the plain-language problem at once; saving is still allowed (the coach owns the play) and the warning stays visible. → Tasks 4 and 6.
4. **Terminology everywhere the coach reads.** After renaming H to F, the field label, read steps, assistant text and library cards all say F; "Hit" and "hash" stay as they are. → Task 8.
5. **Signed out, no team selected, or a Firestore permission error.** The screen explains what to do (sign in, pick a team, or "Couldn't save: only the team's coach can edit plays") and keeps the unsaved play; it never crashes. → Tasks 3 and 6.
6. **Phone layout.** At 390 px the sheet fills the width, read steps scroll sideways, the assistant is a bottom sheet with the recommendation visible when collapsed, and nothing overflows horizontally. → Task 6.

---

## File Structure

```
src/features/playbook2/
  flags.ts                 isPlaybookV2Enabled, isContentReviewEnabled (Task 1)
  theme.css                CSS variables and font imports for the look (Task 1)
  playModel.ts             PlayV2, TeamPlaybookSettings, fromTemplate, toTemplateCopy (Task 2)
  playStore.ts             Firestore read/write for v2 plays and team settings (Task 3)
  editor/editorReducer.ts  editing state, actions, undo/redo, legality (Task 4)
  editor/useAutosave.ts    local draft autosave and restore (Task 4)
  field/FieldSheet.tsx     SVG blueprint field: players, routes, defense, badges, note (Task 5)
  field/MiniDiagram.tsx    thumbnail renderer for cards (Task 5)
  PlaybookScreen.tsx       layout: top bar, sheet, read steps, assistant card, phone sheet (Task 6)
  library/LibraryView.tsx  browse, filter, "Use this" (Task 7)
  terminology/TerminologyPanel.tsx  team terminology editor + level (Task 8)
  assistant/AssistantCard.tsx       opponent profile, recommendation, alternatives (Task 9)
  read/ReadSteps.tsx       numbered steps + badge highlight (Task 10)
  review/ContentReview.tsx owner draft queue with approve/reject/export (Task 11)
  __tests__/               one test file per module
src/football-core/content/decisions.json   owner decisions, applied by fullLibrary() (Task 11)
src/components/Dashboard.tsx               flag-gated entry (Task 1) and Content review tab (Task 11)
src/components/SmartPlaybook/SmartPlaybook.tsx  hide v2 plays from the old screen (Task 3)
```

---

### Task 1: Flag, entry point and theme

**Files:** Create `src/features/playbook2/flags.ts`, `src/features/playbook2/theme.css`, `src/features/playbook2/PlaybookScreen.tsx` (placeholder heading only); Modify `src/components/Dashboard.tsx`, `src/vite-env.d.ts` (declare `REACT_APP_ENABLE_PLAYBOOK_V2` and `REACT_APP_ENABLE_CONTENT_REVIEW` if missing), `package.json` and `package-lock.json` (fonts); Test `src/features/playbook2/__tests__/flags.test.tsx`.

**Interfaces:**
- Produces: `isPlaybookV2Enabled(): boolean` (`import.meta.env.REACT_APP_ENABLE_PLAYBOOK_V2 === 'true'`), `isContentReviewEnabled(): boolean` (`import.meta.env.REACT_APP_ENABLE_CONTENT_REVIEW === 'true'`); `PlaybookScreen: React.FC` (default export, lazy-loadable). Flags are read at call time (not module load) so tests can `vi.stubEnv` them.
- `Dashboard.tsx`: the "Smart Playbook" tab (`activeTab === 'playbook'`, where coaches actually reach the playbook) lazily renders `PlaybookScreen` (inside `React.Suspense` + the existing `ErrorBoundary`) when the flag is on, the existing `SmartPlaybook` otherwise. Leave `App.tsx`'s unreachable `'playbook'` view alone (its `currentView` has no setter).

- [ ] **Step 1: Failing tests** — `flags off by default`; `flag on reads 'true' only` (`'1'` and `'TRUE'` stay off); `the Dashboard's Smart Playbook tab renders the old Smart Playbook when the flag is off and PlaybookScreen when on` (signed-in user from the mocked auth) (mock both lazy modules; assert by test id).
- [ ] **Step 2: Run**; expected FAIL (module missing).
- [ ] **Step 3: Implement.** Add `@fontsource/saira-stencil-one`, `@fontsource/public-sans`, `@fontsource/caveat` (import the weights used) in `theme.css`; define the §3 tokens as CSS variables scoped under `.pb2`.
- [ ] **Step 4: Run**; expected PASS. Run the full suite once; expected no new failures.
- [ ] **Step 5: Commit** `feat(playbook2): flag-gated entry and theme`.

---

### Task 2: Version-2 play model

**Files:** Create `src/features/playbook2/playModel.ts`; Test `__tests__/playModel.test.ts`.

**Interfaces:**
- Consumes: `Formation`, `Concept`, `Assignment`, `ReadStep`, `Level`, `Terminology` from `src/football-core`.
- Produces:
  - `type PlayV2 = { id?: string; teamId: string; schemaVersion: 2; coordinateProfile: 'cc-yards-v1'; name: string; formation: Formation; conceptId?: string; assignments: Assignment[]; read: ReadStep[]; level: Level; tags: string[]; notes: string; fromLibrary?: { kind: 'concept' | 'formation'; id: string }; createdBy?: string; createdAt?: Date; updatedAt?: Date }`
  - `type TeamPlaybookSettings = { terminology: Terminology; level: Level; formations: Formation[] }` (custom formations; ids prefixed `team:`)
  - `newBlankPlay(teamId: string, formation: Formation): PlayV2`
  - `playFromConcept(teamId: string, concept: Concept, formation: Formation): PlayV2`
  - `formationCopy(f: Formation, name: string): Formation` (new `team:` id, verification `{ status: 'approved', reviewer: 'team', date, sources: [] }` so the coach's own items are usable by the engine)
  - `isPlayV2(doc: unknown): doc is PlayV2`

- [ ] **Step 1: Failing tests** — `playFromConcept deep-copies the template` (mutating the result's formation players or assignments leaves the library concept and formation unchanged — Review Focus 1); `newBlankPlay uses schemaVersion 2 and cc-yards-v1`; `formationCopy gives a team: id and keeps positions`; `isPlayV2 rejects version-1 play documents`.
- [ ] **Step 2: Run**; FAIL. **Step 3: Implement** (structured clone of template data). **Step 4: Run**; PASS.
- [ ] **Step 5: Commit** `feat(playbook2): version-2 play model`.

---

### Task 3: Persistence (no rule changes) and hiding v2 plays from the old screen

**Files:** Create `src/features/playbook2/playStore.ts`; Modify `src/components/SmartPlaybook/SmartPlaybook.tsx` (filter only), `rules-tests/firestore.rules.test.ts` (new cases only); Test `__tests__/playStore.test.ts`, `__tests__/oldScreenFilter.test.ts`.

**Interfaces:**
- Consumes: `db` from `src/firebase`; `PlayV2`, `TeamPlaybookSettings`, `isPlayV2` (Task 2).
- Produces:
  - `listPlaysV2(teamId: string): Promise<PlayV2[]>` — query `plays` where `teamId ==` and keep `isPlayV2`.
  - `savePlayV2(play: PlayV2, uid: string): Promise<string>` — add (with `createdBy: uid`, timestamps) or update by id. Updates never write `teamId` or `createdBy` with a different value than the stored doc (the rules deny it); send only the editable fields plus `updatedAt`.
  - `loadTeamSettings(teamId: string): Promise<TeamPlaybookSettings>` — reads `teams/{teamId}.playbook`, defaults `{ terminology: {}, level: 'jv', formations: [] }`.
  - `saveTeamSettings(teamId: string, s: TeamPlaybookSettings): Promise<void>` — `updateDoc(teams/{teamId}, { playbook: s })`.
  - `type StoreError = { kind: 'signed-out' | 'no-team' | 'permission' | 'network'; message: string }`; every function rejects with a `StoreError` whose `message` is plain words (e.g. `'Couldn't save: only the team's coach can edit plays.'` for `permission-denied`).
- Old screen: where it loads plays, drop documents with `schemaVersion === 2`.

- [ ] **Step 1: Failing tests** (mock `firebase/firestore` calls): `listPlaysV2 returns only version-2 plays`; `savePlayV2 sets createdBy and schemaVersion`; `updating a play sends neither teamId nor createdBy`; `loadTeamSettings defaults when the team has no playbook field`; `permission-denied becomes a plain-language StoreError` (Review Focus 5); `the old Smart Playbook never lists a version-2 play`. Rules (test-only, no rule change) — add to `rules-tests/firestore.rules.test.ts`: `the coach can list plays with where('teamId','==','t1')` (assertSucceeds), `another coach's list query for t1 is denied`, `the owner can update teams/t1 with only a playbook field` (assertSucceeds). If the list case fails, stop and report it to the owner: it means rules need a change, which this plan does not allow.
- [ ] **Step 2: Run**; FAIL. **Step 3: Implement.** **Step 4: Run**; PASS.
- [ ] **Step 5: Commit** `feat(playbook2): persistence without rule changes`.

---

### Task 4: Editor reducer, undo/redo and autosave

**Files:** Create `editor/editorReducer.ts`, `editor/useAutosave.ts`; Test `__tests__/editorReducer.test.ts`, `__tests__/useAutosave.test.tsx`.

**Interfaces:**
- Consumes: `PlayV2` (Task 2); `validateFormation`, `mirrorFormation`, `applyConcept` (football-core).
- Produces:
  - `type EditorState = { play: PlayV2; past: PlayV2[]; future: PlayV2[]; dirty: boolean; problems: string[]; selectedRole?: OffenseRole }`
  - `type EditorAction = { type: 'load'; play: PlayV2 } | { type: 'movePlayer'; role: OffenseRole; at: Yards } | { type: 'setOnLine'; role: OffenseRole; onLine: boolean } | { type: 'setAssignment'; assignment: Assignment } | { type: 'removeAssignment'; slot: Slot } | { type: 'rename'; name: string } | { type: 'flip' } | { type: 'setRead'; read: ReadStep[] } | { type: 'select'; role?: OffenseRole } | { type: 'undo' } | { type: 'redo' } | { type: 'saved'; id: string }`
  - `editorReducer(s: EditorState, a: EditorAction): EditorState`; `initEditor(play: PlayV2): EditorState`
  - `useAutosave(key: string, play: PlayV2, dirty: boolean): { restorable: PlayV2 | null; discard(): void }` — writes to `localStorage` (debounced 500 ms) while dirty; offers the draft back on next mount.
- Rules: `movePlayer` snaps to 0.5 yd; every edit pushes the previous play on `past` (max 100), clears `future`, sets `dirty`, and recomputes `problems = validateFormation(play.formation)`; `select`, `undo`, `redo` and `saved` do not push history; `flip` uses `mirrorFormation`.
- (The repo has a skill for this pattern: `anthropic-skills:undo-redo-reducer`.)

- [ ] **Step 1: Failing tests** — `move then undo restores the position and redo reapplies it`; `a new edit clears redo`; `history is capped at 100`; `taking a receiver off the line reports "Needs at least 7 players on the line (has 6)."` (Review Focus 3); `flip mirrors every player`; `editing a play loaded from a template leaves the template untouched` (Review Focus 1); `autosave writes while dirty and offers the draft back after remount` (Review Focus 2); `discard clears the stored draft`.
- [ ] **Step 2: Run**; FAIL. **Step 3: Implement.** **Step 4: Run**; PASS.
- [ ] **Step 5: Commit** `feat(playbook2): editor with undo/redo and autosave`.

---

### Task 5: FieldSheet and MiniDiagram

**Files:** Create `field/FieldSheet.tsx`, `field/MiniDiagram.tsx`; Test `__tests__/FieldSheet.test.tsx`.

**Interfaces:**
- Consumes: `applyConcept`/route points, `alignDefense`, `applyTerminology`, `labelFor` (football-core); `PlayV2` (Task 2).
- Produces:
  - `FieldSheet(props: { play: PlayV2; terminology: Terminology; defense?: CoverageId; highlightStep?: number; selectedRole?: OffenseRole; onMovePlayer?(role: OffenseRole, at: Yards): void; onSelect?(role?: OffenseRole): void; reducedMotion?: boolean }): JSX.Element` — SVG `viewBox` in yards (1 yd = 10 units, the phase-1 mockup geometry: x = 300 + 10·x, y = 320 − 10·y, 600×480); blueprint sheet per tokens; offense O's, defense X's (labels from `labelFor`), linemen unlabelled; key route (the first read step's focus) in signal orange; read badges ①②③ at the route breaks; drag a player with pointer or move with arrow keys (0.5 yd) when `onMovePlayer` is set; each player is a focusable button with an accessible name like "H, slot receiver, 13.5 yards right".
  - `MiniDiagram(props: { formation: Formation; routes?: Yards[][]; size?: number })` — non-interactive thumbnail, `role="img"` with an accessible name.

- [ ] **Step 1: Failing tests** — `skill players are labelled with team terminology and linemen are not` (`{ H: 'F' }` → a label "F", no "LT"); `renders one path per route plus defenders when a coverage is given`; `arrow keys move the focused player by half a yard`; `under reduced motion routes are drawn without the draw-on animation class`.
- [ ] **Step 2: Run**; FAIL. **Step 3: Implement.** **Step 4: Run**; PASS.
- [ ] **Step 5: Commit** `feat(playbook2): blueprint field sheet`.

---

### Task 6: PlaybookScreen layout

**Files:** Modify `PlaybookScreen.tsx`; Test `__tests__/PlaybookScreen.test.tsx`.

**Interfaces:**
- Consumes: `useAuth` (`src/components/AuthProvider`), `useTeam` (`src/contexts/TeamContext`), Tasks 3–5, and the components of Tasks 7–10 (render placeholders until those tasks land).
- Produces the screen: top bar (path dropdowns Side ▾ / Formation ▾ / Play name in Saira Stencil One; 2D/3D toggle with 3D disabled and the tooltip "3D view arrives in a later update"; one primary action "Save play"; a "More" menu holding New play, New formation, Library, Terminology, Rename, Flip, Undo, Redo); main area: the sheet (left) with read steps under it, the assistant card (right, 340 px). Below 768 px: sheet full width, read steps as a horizontal scroller, assistant as a bottom sheet. Problems from the editor show as a plain banner above the sheet. Signed out → "Sign in to build your playbook."; no team → "Pick a team to build its playbook." (Review Focus 5). Save errors appear beside the Save button with the `StoreError.message`; the play stays in the editor. "New formation" starts from a blank legal set (the 5 linemen, a QB and 5 eligible players) or a copy of any formation via `formationCopy`, is edited with the same reducer, and "Save formation" appends it to `settings.formations` through `saveTeamSettings`.

- [ ] **Step 1: Failing tests** — `asks a signed-out coach to sign in`; `asks for a team when none is selected`; `shows the formation problem banner when a play is illegal and still allows saving` (Review Focus 3); `a failed save shows the plain message and keeps the edits` (Review Focus 5); `at phone width the assistant renders as a bottom sheet` (set `window.innerWidth = 390`, assert the bottom-sheet test id; Review Focus 6); `Save is the only primary button`; `a new formation is saved to the team's formations and appears in the Formation dropdown`.
- [ ] **Step 2: Run**; FAIL. **Step 3: Implement.** **Step 4: Run**; PASS.
- [ ] **Step 5: Commit** `feat(playbook2): playbook screen layout`.

---

### Task 7: Library view

**Files:** Create `library/LibraryView.tsx`; Test `__tests__/LibraryView.test.tsx`.

**Interfaces:**
- Consumes: `publishedLibrary`, `applyConcept` (football-core); `MiniDiagram` (Task 5); `playFromConcept`, `newBlankPlay`, `formationCopy` (Task 2); team custom formations from `TeamPlaybookSettings`.
- Produces: `LibraryView(props: { settings: TeamPlaybookSettings; onUse(play: PlayV2): void; onClose(): void })` — full-screen view with two tabs (Plays, Formations); every card has a `MiniDiagram`, never a bare name; filters: level (from settings), "Beats" (coverage), personnel; a play card offers "Use this" for each formation it runs from (`applyConcept(...).ok`); the coach's own formations appear first, marked "Yours"; empty state when filters match nothing ("No verified plays match these filters yet.").

- [ ] **Step 1: Failing tests** — `shows only published library items` (inject a library with a draft concept: it is absent); `every card has a diagram`; `Use this creates a copy, not the template` (Review Focus 1); `a play is offered only from formations it can run from` (Flood is not offered from Doubles); `filters to nothing show the empty-state sentence`.
- [ ] **Step 2: Run**; FAIL. **Step 3: Implement** (accept an optional `library` prop defaulting to `publishedLibrary()` so tests can inject). **Step 4: Run**; PASS.
- [ ] **Step 5: Commit** `feat(playbook2): library view`.

---

### Task 8: Team terminology and level

**Files:** Create `terminology/TerminologyPanel.tsx`; Test `__tests__/TerminologyPanel.test.tsx`.

**Interfaces:**
- Consumes: `applyTerminology`, `labelFor` (football-core); `TeamPlaybookSettings`, `saveTeamSettings` (Tasks 2–3).
- Produces: `TerminologyPanel(props: { settings: TeamPlaybookSettings; onChange(s: TeamPlaybookSettings): void })` — rows "Our word → Your word" for positions (X, Z, H, Y, F, TE, RB, QB, defenders), route names and concept names; a live preview sentence from a read step; level select Youth / JV / Varsity (spec §5.4; vocabulary swap is phase 3). The screen passes `settings.terminology` to every text it shows (field labels, read steps, assistant reason, library names).

- [ ] **Step 1: Failing tests** — `renaming H to F updates the preview and leaves "Hit" alone` (Review Focus 4); `clearing a row restores our word`; `changing level calls onChange with the new level`; and in `PlaybookScreen.test.tsx`: `team terminology reaches the field labels, read steps and assistant reason` (Review Focus 4).
- [ ] **Step 2: Run**; FAIL. **Step 3: Implement.** **Step 4: Run**; PASS.
- [ ] **Step 5: Commit** `feat(playbook2): team terminology and level`.

---

### Task 9: Assistant card

**Files:** Create `assistant/AssistantCard.tsx`; Test `__tests__/AssistantCard.test.tsx`.

**Interfaces:**
- Consumes: `recommend`, `OpponentProfile`, `publishedLibrary` (football-core); team level and playbook concept ids.
- Produces: `AssistantCard(props: { level: Level; playbookConceptIds: string[]; terminology: Terminology; onAdd(conceptId: string): void; library?: Library })` — opponent input as coverage chips (Cover 0–4) each with Mostly / Sometimes / Rarely (shares 0.6 / 0.3 / 0.1, normalised by `recommend`); shows one recommendation (play name in Saira Stencil One, level tag, the reason in Caveat, "Add to my playbook") and up to two alternatives as rows; with nothing to recommend: "No verified play beats this defense at your level yet." Never shows draft content (it only calls `recommend`).

- [ ] **Step 1: Failing tests** — `Mostly Cover 2 recommends Smash with its reason` (inject the phase-1 published slice); `a youth coach sees the not-yet message` (current slice has no youth matchup); `Add to my playbook calls onAdd with the concept id`; `the reason uses team terminology`.
- [ ] **Step 2: Run**; FAIL. **Step 3: Implement.** **Step 4: Run**; PASS.
- [ ] **Step 5: Commit** `feat(playbook2): assistant card`.

---

### Task 10: Step-through read

**Files:** Create `read/ReadSteps.tsx`; Test `__tests__/ReadSteps.test.tsx`.

**Interfaces:**
- Consumes: `ReadStep` (football-core); `FieldSheet.highlightStep` (Task 5).
- Produces: `ReadSteps(props: { steps: ReadStep[]; terminology: Terminology; active: number; onSelect(index: number): void })` — numbered steps (this is a real sequence, so numbers are correct here) matching the badges on the field; selecting a step highlights its badge and route on the sheet; arrow keys move between steps.

- [ ] **Step 1: Failing tests** — `clicking step 2 makes it active and highlights badge 2 on the field` (render with FieldSheet); `arrow keys move between steps`; `step text uses team terminology`.
- [ ] **Step 2: Run**; FAIL. **Step 3: Implement.** **Step 4: Run**; PASS.
- [ ] **Step 5: Commit** `feat(playbook2): step-through read`.

---

### Task 11: Owner content review (C)

**Files:** Create `src/football-core/content/decisions.json` (`{ "decisions": [] }`), `review/ContentReview.tsx`; Modify `src/football-core/library.ts` (apply decisions), `src/components/Dashboard.tsx` (flag-gated "Content review" tab); Test `src/football-core/__tests__/decisions.test.ts`, `__tests__/ContentReview.test.tsx`.

**Interfaces:**
- Produces:
  - `type ContentDecision = { kind: DraftItem['kind']; id: string; decision: 'approve' | 'reject'; reviewer: string; date: string; reason?: string }`
  - `applyDecisions(lib: Library, decisions: ContentDecision[]): Library` in `library.ts`: an `approve` turns a matching draft into `{ status: 'approved', reviewer, date, sources }` (sources kept); a `reject` turns it into `{ status: 'rejected', reviewer, date, reason }`; decisions for unknown ids or non-draft items are ignored. `fullLibrary()` returns `applyDecisions(<content>, decisions.json)`.
  - `ContentReview(props: { reviewer: string; queue?: DraftItem[] })` — lists `draftQueue()` items: a `MiniDiagram` (formations and concepts), the claim text (matchups), the note, and the sources found as links; Approve / Reject (reject asks for a one-line reason); a running list of decisions this session; "Download decisions" saves `decisions.json` with existing plus new decisions. The owner commits that file in a PR (the README section added in this task explains the steps in plain words).
- Dashboard: when `isContentReviewEnabled()`, a "Content review" tab is added to the tab list and opens `ContentReview` with `reviewer` = the signed-in user's display name, or "Owner".

- [ ] **Step 1: Failing tests** — `an approve decision publishes a draft` (`publishedLibrary(applyDecisions(...))` now contains it); `a reject decision removes it from the queue and from coaches`; `decisions for unknown or already-verified items are ignored`; `ContentReview lists every draft with its note and sources`; `Download decisions produces JSON with the existing and new decisions`; `rejecting requires a reason`.
- [ ] **Step 2: Run**; FAIL. **Step 3: Implement.** **Step 4: Run**; PASS (and every phase-1 test still passes).
- [ ] **Step 5: Commit** `feat(playbook2): owner content review`.

---

### Task 12: Visual check and draft PR

**Files:** none new (screenshots go in the PR description).

- [ ] **Step 1:** `REACT_APP_ENABLE_PLAYBOOK_V2=true REACT_APP_ENABLE_CONTENT_REVIEW=true npm run dev` in the cloud session; with the Firebase emulators (`npx firebase emulators:start --only auth,firestore --project demo-coach-core`, app pointed at them for this check only — no emulator wiring committed unless already present) or the PR preview link (flags are on there; sign-in needs the owner's Firebase Auth setup), walk through: open library → use Smash from Doubles → move a player → undo → rename H to F → see the assistant for "Mostly Cover 2" → step through the read → save → reload and see the play → open Content review and approve one draft. Capture screenshots at 1440, 768 and 390 px.
- [ ] **Step 2:** Compare against the approved mockup (layout 1, "Sheet on the desk"): one bold element (the sheet), calm workspace, handwriting only for the note and tip, no overflow at 390 px. Fix what differs, with a test where behaviour changed.
- [ ] **Step 3:** `npm run lint && npm run typecheck && npm test && npm run build && npm run test:rules`; expected all green, zero lint warnings.
- [ ] **Step 4:** Push and open a draft PR into `recovery/coach-core-mvp-2026` with screenshots, the flag names, and what is not in this phase.

## Not in this phase

One play across formations (overlay view), level vocabulary swap, whiteprint and print (§10 step 3); the assistant recommending the coach's own tagged plays and coach-built defensive calls (§5.0, with step 5); library expansion and run plays (step 4); opponent card and weekly game plan (step 5); 3D (step 6); offline and practice mode (step 7); AI (step 8).
