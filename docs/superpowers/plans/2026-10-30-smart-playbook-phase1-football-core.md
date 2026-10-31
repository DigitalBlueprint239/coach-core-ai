# Smart Playbook Phase 1 — Football Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pure TypeScript football engine (`src/football-core/`) with formations, receiver numbering, a route library, concepts that translate across formations, 4-3 defensive alignment by coverage, verification rules, a deterministic assistant, team terminology, and a first content slice whose every published item is verified against multiple reliable sources.

**Architecture:** No React, no Firebase, no I/O: plain functions over plain data, so 2D, 3D, print and practice mode can all use it later. Content lives in typed TS modules under `content/`; every item carries a `verification` record, and only publishable items reach `publishedLibrary()`. All functions that rank or filter take the library as a parameter, so tests use small fixtures and never depend on research results.

**Tech Stack:** TypeScript 5.8 (repo `tsconfig.json`: `strict`, `isolatedModules`), Jest via `react-scripts` 5 (CRA). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-30-smart-playbook-design.md` (approved 2026-10-30). This plan implements §10 step 1 ("football-core model + first researched content slice … with tests") and the model parts of §4.1–4.2, §5.0 (terminology), §5.5 (translation) and §6 (verification).

## Global Constraints

- Work on a task branch off `recovery/coach-core-mvp-2026` (e.g. `smart-playbook/phase1-football-core`); PRs target `recovery/coach-core-mvp-2026`; never push to `master`; no merge or deploy without the owner.
- This branch no longer contains the trailing-space path, so a normal (non-sparse) checkout works on Windows.
- No new npm dependencies; do not edit the root `package.json` or lockfile.
- No React, DOM, Firebase or network imports anywhere in `src/football-core/`.
- Coordinates are **yards**: `x` lateral from the ball (positive = offense's right), `y` from the line of scrimmage (positive = downfield, negative = offensive backfield). Field width 53.33 yd; high-school hash marks 17.78 yd from each sideline (53′4″ field, 53′4″ from the sideline).
- Levels, in order: `'youth' < 'jv' < 'varsity'`.
- Verification (spec §6): an item is publishable when `verified` with ≥ 2 sources from distinct publishers (≥ 3 for a matchup), or `approved` by a named reviewer with a date. `draft` and `rejected` items never reach coaches or the assistant.
- Acceptable sources (spec §6): coaching associations and clinics (e.g. AFCA, state coaching associations, USA Football), published coaching books and manuals by established coaches, college and professional coaching material, long-standing coaching education sites. Never forums, anonymous posts or AI-generated pages. No copying of proprietary playbooks or diagrams; record facts and cite.
- Run tests with: `set CI=true&& npx react-scripts test --watchAll=false --testPathPattern src/football-core` (cmd) or `CI=true npx react-scripts test --watchAll=false --testPathPattern src/football-core` (bash).
- Commit messages end with the session attribution lines given to the executing agent.
- The dev machine has 6 GB RAM: run one test command at a time; prefer a cloud session for long research (Task 9).

## Review Focus

1. **Left-strength formations.** A coach flips Trips Right to Trips Left: slots, routes and the defense must mirror exactly (x negated), never point a route toward the wrong sideline. → tests in Tasks 2, 3, 5.
2. **A concept run from a formation that lacks a slot it needs** (Flood from Doubles has no `strong-3`): must return `{ ok: false, missing: ['strong-3'] }`, never throw or silently drop a route. → Task 4.
3. **Coach-built formations that are illegal** (10 or 12 players, fewer than 7 on the line, duplicate role ids): `validateFormation` must name each problem in plain words. → Task 2.
4. **Messy opponent profiles** (shares summing to 70 or 1.4, an unknown coverage id, an empty list): `recommend` normalises shares, ignores unknown ids, returns `[]` for nothing usable, never throws. → Task 6.
5. **Draft or rejected content leaking** into the library or a recommendation. → Tasks 6 and 8.
6. **Terminology replacing inside words** ("H" must not change "Hit" or "Hash"). → Task 7.

---

## File Structure

```
src/football-core/
  types.ts            all shared types (Task 1)
  verification.ts     isPublishable, publishableBy (Task 1)
  formations.ts       slotsFor, mirrorFormation, validateFormation (Task 2)
  routes.ts           ROUTES, routePath (Task 3)
  concepts.ts         applyConcept (Task 4)
  defense.ts          alignDefense (Task 5)
  assistant.ts        recommend (Task 6)
  terminology.ts      applyTerminology, labelFor (Task 7)
  library.ts          publishedLibrary, draftQueue (Task 8)
  index.ts            public exports (Task 8)
  content/
    formations.spread.ts   Doubles, Trips Right, Trey Right, Empty (Task 2, verified in Task 9)
    concepts.pass.ts       7 pass concepts (Task 4, verified in Task 9)
    defense.43.ts          4-3 Over front + Cover 0/1/2/3/4 (Task 5, verified in Task 9)
    matchups.ts            concept-vs-coverage claims (Task 6, verified in Task 9)
  __tests__/              one test file per module + content.test.ts
```

---

### Task 1: Types and verification rules

**Files:**
- Create: `src/football-core/types.ts`, `src/football-core/verification.ts`
- Test: `src/football-core/__tests__/verification.test.ts`

**Interfaces:**
- Produces (in `types.ts`, all exported; use `export type` for re-exports because of `isolatedModules`):
  - `Yards = { x: number; y: number }`
  - `Level = 'youth' | 'jv' | 'varsity'`; `LEVEL_ORDER: readonly Level[] = ['youth','jv','varsity']`
  - `OffenseRole = 'LT'|'LG'|'C'|'RG'|'RT'|'QB'|'RB'|'FB'|'TE'|'X'|'Z'|'H'|'Y'|'F'`
  - `Slot = 'strong-1'|'strong-2'|'strong-3'|'weak-1'|'weak-2'|'weak-3'|'back'|'back-2'|'qb'`
  - `Source = { title: string; publisher: string; url: string; accessed: string /* YYYY-MM-DD */; kind: 'association'|'book'|'college-pro'|'coaching-education' }`
  - `Verification = { status: 'verified'; sources: Source[] } | { status: 'draft'; sources: Source[]; note: string } | { status: 'approved'; reviewer: string; date: string; sources: Source[] } | { status: 'rejected'; reviewer: string; date: string; reason: string }`
  - `FormationPlayer = { role: OffenseRole; at: Yards; onLine: boolean }`
  - `Formation = { id: string; name: string; personnel: '10'|'11'|'12'|'20'|'21'; strength: 'left'|'right'; players: FormationPlayer[]; levels: Level[]; verification: Verification }`
  - `Assignment = { slot: Slot; kind: 'route'; route: RouteId; depth?: number } | { slot: Slot; kind: 'protect' } | { slot: Slot; kind: 'block' }`
  - `RouteId = 'go'|'seam'|'sail'|'flat'|'arrow'|'curl'|'hitch'|'corner'|'stick'|'snag'|'drag'|'out'|'dig'|'swing'`
  - `ReadStep = { focus: string; text: string }`
  - `Concept = { id: string; name: string; minLevel: Level; assignments: Assignment[]; read: ReadStep[]; verification: Verification }`
  - `CoverageId = 'cover-0'|'cover-1'|'cover-2'|'cover-3'|'cover-4'`
  - `DefenderRole = 'DE-S'|'DT-S'|'NT'|'DE-W'|'SAM'|'MIKE'|'WILL'|'CB-S'|'CB-W'|'SS'|'FS'`
  - `Defender = { role: DefenderRole; at: Yards; deep: boolean }`
  - `Coverage = { id: CoverageId; name: string; deepDefenders: 0|1|2; verification: Verification }`
  - `Front = { id: string; name: string; verification: Verification }`
  - `Matchup = { concept: string; beats: CoverageId; stressedDefender: string; reason: string; verification: Verification }`
  - `Library = { formations: Formation[]; concepts: Concept[]; fronts: Front[]; coverages: Coverage[]; matchups: Matchup[] }`
- Produces (in `verification.ts`): `isPublishable(v: Verification, kind: 'item' | 'matchup'): boolean`

- [ ] **Step 1: Write the failing tests** in `verification.test.ts`:
  - `verified with 2 sources from 2 publishers is publishable as an item` → `true`
  - `verified with 2 sources from the same publisher is not publishable` → `false`
  - `a matchup needs 3 distinct publishers`: 2 publishers → `false`, 3 → `true`
  - `approved with reviewer and date is publishable regardless of source count` → `true` (with `sources: []`)
  - `approved with an empty reviewer is not publishable` → `false`
  - `draft and rejected are never publishable` → both `false`
  - Publisher comparison is case- and whitespace-insensitive (`'USA Football'` equals `' usa football '`).
- [ ] **Step 2: Run the tests**; expected FAIL (module not found).
- [ ] **Step 3: Implement** `types.ts` and `isPublishable` (count distinct normalised `publisher` values; thresholds 2 for `'item'`, 3 for `'matchup'`).
- [ ] **Step 4: Run the tests**; expected PASS.
- [ ] **Step 5: Commit** `feat(football-core): types and verification rules`.

---

### Task 2: Formations — receiver numbering, mirroring, legality

**Files:**
- Create: `src/football-core/formations.ts`, `src/football-core/content/formations.spread.ts`
- Test: `src/football-core/__tests__/formations.test.ts`

**Interfaces:**
- Consumes: `Formation`, `FormationPlayer`, `Slot`, `Yards` (Task 1).
- Produces:
  - `slotsFor(f: Formation): Map<Slot, FormationPlayer>`
  - `strengthOf(f: Formation): 'left' | 'right'`
  - `mirrorFormation(f: Formation, id: string, name: string): Formation`
  - `validateFormation(f: Formation): string[]` (empty = legal)
  - `SPREAD_FORMATIONS: Formation[]` (ids `doubles`, `trips-right`, `trey-right`, `empty`), each with `verification: { status: 'draft', sources: [], note: 'awaiting research (Task 9)' }`

**Numbering rules** (the algorithm the tests pin):
1. Linemen (`LT LG C RG RT`) and `QB` get no receiver slot; `QB` gets `qb`.
2. A back is any non-lineman, non-QB player with `|x| <= 4` and `y <= -3`: the first back by role order `RB, FB, F` is `back`, the next `back-2`.
3. Everyone else is a receiver on the side of the sign of `x` (`x > 0` right).
4. Strength = the side with more receivers; on a tie, `f.strength`.
5. On each side, sort receivers by `|x|` descending; number them 1, 2, 3 → `strong-n` / `weak-n`.

**Content positions** (alignments for the slice; Task 9 verifies them, adjust only with sources): line at `y = -0.5`, tackles ±4.6, guards ±2.3, center 0; QB shotgun `(0, -5)`; RB beside QB `(-2.6, -5)` (`(2.6, -5)` when strength is left). Doubles: X `(-19, -0.8)` onLine, H `(-13.5, -1.6)`, Y `(13.5, -1.6)`, Z `(19, -0.8)` onLine, strength `right`. Trips Right: X `(-19, -0.8)` onLine, Y `(8.5, -1.6)`, H `(13.5, -1.6)`, Z `(19, -0.8)` onLine. Trey Right: TE `(6.9, -0.5)` onLine, H `(13.5, -1.6)`, Z `(19, -0.8)` onLine, X `(-19, -0.8)` onLine. Empty (3x2, strength `right`): X `(-19, -0.8)` onLine, H `(-13.5, -1.6)`, Y `(13.5, -1.6)`, Z `(19, -0.8)` onLine, and the RB detached at `(8.5, -1.6)` as a receiver.

- [ ] **Step 1: Write the failing tests:**
  - `trips right numbers Z, H, Y as strong-1, strong-2, strong-3 and X as weak-1` (assert roles via `slotsFor`).
  - `doubles is 2x2 and uses the declared strength on a tie` → `strengthOf` `'right'`; `strong-3` absent.
  - `the shotgun RB is the back, not a receiver` → `slotsFor(doubles).get('back')?.role === 'RB'`.
  - `empty numbers the detached RB as strong-3` (RB at x 8.5 is a receiver; no `back` slot).
  - `mirrored trips is trips left`: `mirrorFormation(tripsRight, 'trips-left', 'Trips Left')` negates every `x`, flips `strength`, and `slotsFor` gives the same roles in the same slots (Review Focus 1).
  - `every content formation is legal` → `validateFormation` returns `[]` for all four.
  - `illegal formations are named in plain words` (Review Focus 3): 10 players → contains `'Needs 11 players (has 10).'`; 6 on the line → `'Needs at least 7 players on the line (has 6).'`; two `QB` roles → `'Role QB is used twice.'`.
- [ ] **Step 2: Run the tests**; expected FAIL.
- [ ] **Step 3: Implement** the four functions and `SPREAD_FORMATIONS` per the rules and positions above.
- [ ] **Step 4: Run the tests**; expected PASS.
- [ ] **Step 5: Commit** `feat(football-core): formations, receiver numbering and legality`.

---

### Task 3: Route library

**Files:**
- Create: `src/football-core/routes.ts`
- Test: `src/football-core/__tests__/routes.test.ts`

**Interfaces:**
- Consumes: `RouteId`, `Yards` (Task 1).
- Produces:
  - `ROUTES: Record<RouteId, { name: string; plainName: string; defaultDepth: number; shape: (depth: number) => Array<{ o: number; d: number }> }>` — points relative to the start; `o` positive = toward the receiver's own sideline (outside), `d` = downfield.
  - `routePath(route: RouteId, from: Yards, side: 'left' | 'right', depth?: number): Yards[]` — first point is `from`; `x = from.x + o * (side === 'right' ? 1 : -1)`, `y = from.y + d`.

**Shapes to encode** (depth `D` = `depth ?? defaultDepth`; `plainName` is the Youth-level word from spec §5.4):

| id | name | plainName | default D | shape (after the start point) |
|---|---|---|---|---|
| go | Go | Straight up | 20 | (0.5, D) |
| seam | Seam | Up the seam | 20 | (−2, D) |
| sail | Sail | Deep out | 12 | (0, D−3), (7, D) |
| flat | Flat | Out to the flat | 3 | (2, 2.5), (10, D) |
| arrow | Arrow | Angled to the flat | 4 | (7, D) |
| curl | Curl | Curl back | 12 | (0, D), (−1.5, D−1.5) |
| hitch | Hitch | Quick stop | 5 | (0, D), (0, D−1) |
| corner | Corner | Corner | 12 | (0, D−5), (6, D) |
| stick | Stick | Stop and sit | 6 | (0, D), (−1, D) |
| snag | Snag | Stop inside | 6 | (−3, D) |
| drag | Drag | Shallow across | 2 | (−4, D), (−18, D) |
| out | Out | Quick out | 5 | (0, D), (6, D) |
| dig | Dig | Deep in | 12 | (0, D), (−11, D) |
| swing | Swing | Swing out | 1 | (3, −0.5), (9, D) |

- [ ] **Step 1: Write the failing tests:**
  - `a right-side sail breaks toward the right sideline`: last point `x` > start `x`, last `y` = start `y` + 12.
  - `the same sail on the left breaks toward the left sideline` (Review Focus 1): last `x` < start `x`, same `y`.
  - `depth override moves the break`: `routePath('curl', p, 'right', 8)` reaches `y = p.y + 8`.
  - `every route starts at the player`: for every `RouteId`, `routePath(id, p, 'right')[0]` equals `p`.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** `ROUTES` from the table and `routePath`.
- [ ] **Step 4: Run**; expected PASS.
- [ ] **Step 5: Commit** `feat(football-core): route library`.

---

### Task 4: Concepts and translation across formations

**Files:**
- Create: `src/football-core/concepts.ts`, `src/football-core/content/concepts.pass.ts`
- Test: `src/football-core/__tests__/concepts.test.ts`

**Interfaces:**
- Consumes: `slotsFor`, `strengthOf` (Task 2); `routePath` (Task 3); `Concept`, `Formation` (Task 1).
- Produces:
  - `applyConcept(c: Concept, f: Formation): { ok: true; routes: Array<{ role: OffenseRole; slot: Slot; route: RouteId; points: Yards[] }>; protectors: OffenseRole[] } | { ok: false; missing: Slot[] }`
  - `PASS_CONCEPTS: Concept[]` (ids `flood`, `curl-flat`, `four-verticals`, `smash`, `stick`, `snag`, `mesh`), all `draft` until Task 9.

**Rules:** a route's side is the side its slot is on (`strong-*` → `strengthOf(f)`, `weak-*` → the other side, `back` → the strong side for swings). Collect every assignment whose slot is missing into `missing` (in assignment order) and return `ok: false` if any. `protect` assignments list the role in `protectors`.

**Content assignments** (candidates; Task 9 confirms with sources):
- flood (`minLevel: 'jv'`): strong-1 go, strong-2 sail, strong-3 flat, weak-1 dig, back protect. Read: SS/flat defender → sail → flat.
- curl-flat (`youth`): strong-1 curl, strong-2 flat, weak-1 curl, weak-2 flat, back protect. Read: flat defender.
- four-verticals (`varsity`): strong-1 go, strong-2 seam, weak-1 go, weak-2 seam, back protect.
- smash (`jv`): strong-1 hitch, strong-2 corner, weak-1 hitch, weak-2 corner, back protect.
- stick (`jv`): strong-1 go, strong-2 stick, strong-3 flat, weak-1 hitch, back protect.
- snag (`jv`): strong-1 corner, strong-2 snag, back swing, weak-1 hitch.
- mesh (`varsity`): strong-1 corner, strong-2 drag, weak-2 drag, weak-1 go, back protect (`weak-2` required: use from Doubles/Empty).

- [ ] **Step 1: Write the failing tests:**
  - `flood from trips right sends Z deep, H on the sail and Y to the flat` → roles per slot; H's last point `x` > H's start `x`.
  - `flood from trips left mirrors every route` (Review Focus 1): each route's points equal the trips-right points with `x` negated.
  - `flood from doubles reports the missing slot` (Review Focus 2) → `{ ok: false, missing: ['strong-3'] }`.
  - `curl-flat runs from every content formation` → `ok: true` for all four.
  - `protect assignments become protectors` → curl-flat from doubles: `protectors` is `['RB']`.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** `applyConcept` and `PASS_CONCEPTS`.
- [ ] **Step 4: Run**; expected PASS.
- [ ] **Step 5: Commit** `feat(football-core): concepts that translate across formations`.

---

### Task 5: 4-3 defense alignment by coverage

**Files:**
- Create: `src/football-core/defense.ts`, `src/football-core/content/defense.43.ts`
- Test: `src/football-core/__tests__/defense.test.ts`

**Interfaces:**
- Consumes: `slotsFor`, `strengthOf` (Task 2); `Defender`, `CoverageId`, `Formation` (Task 1).
- Produces:
  - `alignDefense(coverage: CoverageId, f: Formation): Defender[]` (always 11, ordered as `DefenderRole` is declared)
  - `FRONT_43_OVER: Front`; `COVERAGES: Coverage[]` (cover-0 … cover-4, `deepDefenders` 0, 1, 2, 1, 2), all `draft` until Task 9.

**Alignment rules** (`s` = +1 if strength is right, −1 if left; `p(slot)` = that receiver's position; `deep` = `y >= 10`; candidates confirmed in Task 9):
- Front (all coverages): DE-S `(s·5.6, 1.3)`, DT-S `(s·2.9, 1.3)`, NT `(−s·0.8, 1.3)`, DE-W `(−s·5.6, 1.3)`; MIKE `(s·1.5, 4.5)`, WILL `(−s·3.5, 4.5)`; SAM apexes strong-2: `(midpoint of p(strong-2).x and s·4.6, 4.5)`, or `(s·5, 4.5)` if no strong-2.
- CB-S / CB-W over strong-1 / weak-1, 1 yd outside: cover-0 and cover-1 at depth 1 (press), cover-2 at 5, cover-3 and cover-4 at 7.
- cover-0: SS over strong-2 at 5, FS over the back at 6. cover-1: SS over strong-2 at 6, FS `(0, 13)`. cover-2: SS `(s·8.9, 12)`, FS `(−s·8.9, 12)`. cover-3: SS rolled down `(midpoint of p(strong-2).x and s·4.6, 6)`, FS `(0, 13)`. cover-4: SS `(p(strong-2).x·0.6, 10)`, FS `(p(weak-2)?.x·0.6 ?? −s·8.9, 10)`.

- [ ] **Step 1: Write the failing tests:**
  - `every coverage puts 11 defenders on the field` for every coverage × content formation.
  - `deep defenders match the coverage`: count of `deep` equals `deepDefenders` for cover-0..4 vs Trips Right.
  - `cover-3 has its single deep defender between the hashes` (`|x| <= 8.89`).
  - `cover-2 safeties sit on the hashes` (`|x| ≈ 8.9`, both sides).
  - `defense mirrors with the formation` (Review Focus 1): `alignDefense('cover-3', tripsLeft)` equals trips-right alignment with `x` negated.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** `alignDefense`, `FRONT_43_OVER`, `COVERAGES`.
- [ ] **Step 4: Run**; expected PASS.
- [ ] **Step 5: Commit** `feat(football-core): 4-3 over alignment by coverage`.

---

### Task 6: Matchups and the deterministic assistant

**Files:**
- Create: `src/football-core/assistant.ts`, `src/football-core/content/matchups.ts`
- Test: `src/football-core/__tests__/assistant.test.ts`

**Interfaces:**
- Consumes: `isPublishable` (Task 1); `Library`, `Matchup`, `Concept`, `CoverageId`, `Level`, `LEVEL_ORDER` (Task 1).
- Produces:
  - `type OpponentProfile = { coverages: Array<{ id: string; share: number }> }`
  - `type Recommendation = { concept: Concept; score: number; beats: CoverageId; reason: string; stressedDefender: string; read: ReadStep[]; inPlaybook: boolean }`
  - `recommend(opp: OpponentProfile, opts: { level: Level; playbook?: string[]; limit?: number }, lib: Library): Recommendation[]`
  - `MATCHUPS: Matchup[]` — candidate claims, all `draft` until Task 9: flood→cover-3, curl-flat→cover-3, four-verticals→cover-3, snag→cover-3, smash→cover-2, stick→cover-3, mesh→cover-1, mesh→cover-0. Each `reason` in plain words (e.g. flood: "Two receivers on the flat defender, one high and one low. He can only take one."), each with `stressedDefender`.

**Ranking rules:**
1. Drop coverage ids not in `lib.coverages`; drop shares ≤ 0; normalise the rest to sum 1. Nothing left → `[]`.
2. Use only matchups where `isPublishable(m.verification, 'matchup')` and both the concept and the coverage are publishable items.
3. Concept allowed when `LEVEL_ORDER.indexOf(c.minLevel) <= LEVEL_ORDER.indexOf(opts.level)`.
4. `score` = sum of normalised shares of the coverages the concept beats; drop score 0.
5. Sort: score desc, then `inPlaybook` first, then `concept.name` asc. Return the first `opts.limit ?? 3`.
6. `beats`, `reason`, `stressedDefender` come from the beaten coverage with the largest share.

- [ ] **Step 1: Write the failing tests** (build a small fixture `Library` in the test with `verified` items and 3-publisher matchups; do not use the real content):
  - `ranks concepts by how much of the opponent's defense they beat`: 70% cover-3, 30% cover-2 → a cover-3 beater ranks above a cover-2 beater; score `0.7`.
  - `normalises messy shares and ignores unknown coverages` (Review Focus 4): `[{id:'cover-3', share:70}, {id:'cover-9', share:30}]` gives score `1` for a cover-3 beater; `[]` and `[{id:'cover-9', share:1}]` both return `[]`.
  - `respects the coach's level`: a `varsity` concept is absent at `youth`, present at `varsity`.
  - `prefers the coach's own plays on a tie` → equal scores, the one in `opts.playbook` comes first.
  - `never recommends draft or rejected content` (Review Focus 5): the same fixture with the matchup changed to `draft`, then `rejected`, then 2 publishers → excluded each time.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** `recommend` and `MATCHUPS`.
- [ ] **Step 4: Run**; expected PASS.
- [ ] **Step 5: Commit** `feat(football-core): matchups and deterministic assistant`.

---

### Task 7: Team terminology

**Files:**
- Create: `src/football-core/terminology.ts`
- Test: `src/football-core/__tests__/terminology.test.ts`

**Interfaces:**
- Produces:
  - `type Terminology = Readonly<Record<string, string>>` (baseline term → team term)
  - `applyTerminology(text: string, t: Terminology): string`
  - `labelFor(role: OffenseRole | DefenderRole, t: Terminology): string`

**Rules:** whole-word, case-sensitive replacement; longer keys first (so `"Four verticals"` wins over `"Four"`); keys are regex-escaped; a single pass (a replacement is never re-replaced).

- [ ] **Step 1: Write the failing tests:**
  - `renames whole words only` (Review Focus 6): `{ H: 'F' }` turns `"Throw H on the sail. Hit the hash."` into `"Throw F on the sail. Hit the hash."`.
  - `longer terms win`: `{ 'Four verticals': 'All Go', Four: '4' }` on `"Four verticals"` → `"All Go"`.
  - `no chained replacement`: `{ H: 'Y', Y: 'H' }` on `"H and Y"` → `"Y and H"`.
  - `labelFor falls back to the baseline` → `labelFor('QB', {})` is `'QB'`; `labelFor('TE', { TE: 'Sniffer' })` is `'Sniffer'`.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run**; expected PASS.
- [ ] **Step 5: Commit** `feat(football-core): team terminology`.

---

### Task 8: Library assembly, draft queue and public API

**Files:**
- Create: `src/football-core/library.ts`, `src/football-core/index.ts`
- Test: `src/football-core/__tests__/library.test.ts`, `src/football-core/__tests__/content.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `fullLibrary(): Library` (all content, any status)
  - `publishedLibrary(lib?: Library): Library` — keeps publishable items; drops matchups whose concept or coverage was dropped
  - `type DraftItem = { kind: 'formation' | 'concept' | 'front' | 'coverage' | 'matchup'; id: string; name: string; verification: Extract<Verification, { status: 'draft' }> }`
  - `draftQueue(lib?: Library): DraftItem[]` (drafts only; rejected items appear in neither list)
  - `index.ts` re-exports the public functions and types (use `export type` for types).

- [ ] **Step 1: Write the failing tests:**
  - `library.test.ts` with fixtures: `publishedLibrary` keeps verified/approved, drops draft/rejected, and drops a verified matchup whose concept is a draft (Review Focus 5); `draftQueue` lists drafts with kind, id and name and excludes rejected.
  - `content.test.ts` against `fullLibrary()`: ids unique per kind; every matchup's `concept` and `beats` exist; every formation passes `validateFormation`; every concept runs (`applyConcept` ok) from at least one content formation; every `Source.url` starts with `https://`; every `accessed` matches `/^\d{4}-\d{2}-\d{2}$/`.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** `library.ts` and `index.ts`.
- [ ] **Step 4: Run all football-core tests**; expected PASS.
- [ ] **Step 5: Commit** `feat(football-core): library, draft queue and public API`.

---

### Task 9: Research and verify the content slice

**Files:**
- Modify: `src/football-core/content/formations.spread.ts`, `concepts.pass.ts`, `defense.43.ts`, `matchups.ts`
- Test: `src/football-core/__tests__/content.test.ts` (add the publication assertions below)

**Interfaces:** consumes `Verification`, `Source` (Task 1); no new code.

This task is research, done with web search in a cloud session. For each of the 4 formations, 7 concepts, the front, 5 coverages and 8 matchups:

- [ ] **Step 1: Research each item** against acceptable sources (Global Constraints). Confirm the alignment, assignments, read, level and, for matchups, the claim and stressed defender. Record each source as a `Source` (title, publisher, https URL, access date, kind).
- [ ] **Step 2: Set its verification.** Enough distinct publishers (2 for items, 3 for matchups) and the sources agree → `{ status: 'verified', sources }`. Otherwise → `{ status: 'draft', sources, note }` where `note` says in one sentence what is unconfirmed. Where sources agree on a different alignment, depth, route or read than this plan's candidate, change the content to match the sources and say so in the commit message. Never mark anything `approved` (that is the owner's action in the draft queue).
- [ ] **Step 3: Add to `content.test.ts`:**
  - `every published item really meets the verification bar` → for every item in `publishedLibrary()`, `isPublishable` is true with distinct publishers counted.
  - `the slice is usable`: `publishedLibrary()` has at least 1 formation, 1 coverage and 1 matchup, or the test name and failure message say the slice is not ready to show coaches (a clear failure, never a silent pass).
- [ ] **Step 4: Run all football-core tests**; expected PASS. Write the counts (verified vs draft per kind) into the PR description.
- [ ] **Step 5: Commit** `content(football-core): verify the first content slice` and open a draft PR to `recovery/coach-core-mvp-2026` listing every item still in draft and why.

---

## Not in this plan (later phase plans)

Run plays (inside zone, power, counter), more systems and the full launch library (§6 target); the Playbook screen, editor and print (§10 steps 2–3); the owner's draft-queue screen; opponent card; 3D; offline; practice mode; the AI brain work (§4a). Each gets its own plan when its phase starts.
