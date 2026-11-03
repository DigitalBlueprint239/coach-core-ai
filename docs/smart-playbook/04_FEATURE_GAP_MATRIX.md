# 04 — Feature Gap Matrix

Statuses: **VC** verified complete · **IU** implemented but unverified · **PA** partial · **PR** prototype ·
**PL** planned · **MI** missing · **BL** blocked. Complexity S/M/L/XL. Priority P0 (critical path) … P3.
Origin: **B** = owner master brief 2026-11-03; **D** = approved design 2026-10-30; **R** = competitor research.
Acceptance tests: `11_ACCEPTANCE_TEST_MATRIX.md` (AT-ids). Owner: **K** = Kev's engineering lead lane;
**DX** = Drew's lane (Dex). No percentages are used; status is evidence-based.

## Vision requirements

| ID | Capability | Persona | Status | Evidence (code / tests) | Missing | Depends on | Cx | Pri | Path | AT | Owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SP-V01 | Pro 2D design | all coaches | PA | `features/playbook2/field/FieldSheet.tsx`, `editor/editorReducer.ts`; tests FieldSheet/editorReducer | route drawing & control points, custom routes, blocking paths, run tracks, stunts/blitz paths, coverage zones, multi-select, align/distribute, zoom/pan, snap, telestration, clipboard, stylus | SP-V04 model | XL | P1 | Extend v2 editor on canonical model (ADR-003) | AT-01..04 | K |
| SP-V02 | 2D→3D playback | coach, player | PR | PR #95 `experiments/smart-playbook-3d` (38 unit, browser suites) | integration with canonical model, timeline, playback controls, views, perf budgets on real devices | SP-V03, ADR-006 | XL | P1 | Port prototype architecture onto canonical model | AT-20..24 | K |
| SP-V03 | Shared play data | all | PA | football-core yards model + v2 `PlayV2`; v1 pixels separate | canonical model v3 (timeline, blocking, defense, rules), migration from v1/v2, serialization tests | ADR-001/002 | L | **P0** | Canonical model v3 + adapters | AT-05..08 | K |
| SP-V04 | Off/def representation | coaches | PA | `types.ts` Assignment (route/protect/block untyped); `defense.ts` 4-3 by coverage | run tracks, blocking schemes, protections, motions, fronts beyond 4-3, run fits, pressures | SP-V03 | XL | **P0** | Model v3 increments | AT-09..12 | K |
| SP-V05 | Position-specific views | player, position coach | MI | — | player lens over canonical play; coach-only note filtering | SP-V03, SP-V16 | M | P2 | Lens functions + UI | AT-40 | K |
| SP-V06 | QB read progression | QB, coach | IU→PA | `read/ReadSteps.tsx`, `ReadSteps.test.tsx`; staging walkthrough | coverage recognition, post-snap rotation, timing landmarks, hot answers, feedback | SP-V04, SP-V21 | L | P2 | Read model v2 on timeline | AT-41 | K |
| SP-V07 | Explainable matchups | coach | PA | `assistant.ts` `recommend()`; `AssistantCard`; 1 verified matchup | explanation schema (observed/rule/assumptions/evidence/trade-offs/counters), more matchups, offense-vs-front | SP-V20 content | L | P1 | Explanation contract + content | AT-30..32 | K |
| SP-V08 | AI play creation | coach | MI | `src/ai-brain/` (off), proxy contract (`services/ai-proxy.ts`) | server-side structured generation, schema validation, rules check, coach approval | SP-V03, SP-V04, ADR-004, AI policy | L | P2 | Genkit/Functions per approved design | AT-33..35 | K |
| SP-V09 | Team terminology | coach, player | PA | `terminology.ts`, `TerminologyPanel.tsx`; tests | formations, protections, defensive calls, signals, aliases, player explanations; exports/quizzes usage | SP-V19, SP-V14 | M | P2 | Extend terminology map | AT-42 | K |
| SP-V10 | Concepts across formations | coach | IU | `concepts.ts` `applyConcept`, `slotsFor`; concepts tests | override UX, conflict resolution, personnel restrictions, spacing checks | SP-V03 | M | P1 | Inheritance + override model | AT-06 | K |
| SP-V11 | Run/block/coverage/pressure intelligence | coach | MI (run) / PA (coverage) | `defense.ts` alignments only | run concepts, block rules vs fronts, protections, run fits, pressures | SP-V04 | XL | **P0** (run) | Model v3 + rules | AT-09..12 | K |
| SP-V12 | Youth/flag/HS/advanced | all | PA | `Level` youth/jv/varsity | rule profiles (11/8/9/7v7/flag), age guidance, flag constraints | rule sources | L | **P0** | Rule profiles (first slice) | AT-13..15 | K |
| SP-V13 | AI practice planning | coach | IU (legacy) | `features/practice-planner/` | link to plays/installs, AI drafting, period templates | SP-V08, SP-V14 | L | P3 | Rebuild on model | AT-50 | K |
| SP-V14 | Player learning & quizzes | player, coach | MI | — | assignments to players, quiz engine from saved play, mastery, spaced review, coach approval | SP-V05, SP-V16 | XL | P1 | Teaching engine | AT-43..46 | K |
| SP-V15 | Film-linked scouting | coach | MI (trunk) | Film work in DX lane (not on trunk) | port Film per #39; time-coded links; tendencies from real data only | DX port, rules | XL | P2 | DX ports; K integrates | AT-51..53 | DX/K |
| SP-V16 | Collaboration/versions/permissions | staff | PA | owner-only teams, rules | roles (HC/coord/position/player/admin), revisions, comments, approvals, team sharing | rules redesign | L | P1 | Roles model + rules | AT-47..49 | K |
| SP-V17 | Mobile/tablet | all | PA | 390/768/1440 screenshots (#102) | touch editing quality, tablet layouts, real-device tests | — | M | P1 | Continuous | AT-60 | K |
| SP-V18 | Offline | sideline | MI | SW retired; local draft only | cached playbooks, offline edits, sync/conflicts | SP-V16 revisions | L | P2 | Firestore persistence cache + generated SW | AT-61 | K |
| SP-V19 | Exports (PDF/PPT/wristbands/call sheets) | coach | MI | standalone `exportService.ts` (reference) | all export formats from canonical model | SP-V03 | L | P1 | Export module | AT-25..29 | K |
| SP-V20 | Verified knowledge system | all | PA | `verification.ts`, `library.ts`, `ContentReview.tsx`, `decisions.json` | source registry with rights, 5 knowledge categories, independence tracking, reviewer records | ADR-005 | L | **P0** | Registry + categories | AT-36..39 | K |
| SP-V21 | What-if / simulation | coach, QB | MI | — | timeline, Tier A playback, Tier B rule reactions | SP-V04, SP-V02 | XL | P2 | Fidelity tiers (ADR-007) | AT-24 | K |
| SP-V22 | Design/interaction quality | all | PA | approved "Sheet on the desk" design implemented | systematic usability tests, accessibility audit | — | M | P1 | Continuous | AT-62 | K |

## Parity requirements

| ID | Status | Note |
|---|---|---|
| SP-P01 editor | PA | see SP-V01 |
| SP-P02 formations | PA | 2 verified + custom formations (team settings) |
| SP-P03 flip | IU | "Flip" in More menu (#102) |
| SP-P04 2D animation | PA | route draw-on only; no playback timeline |
| SP-P05 3D | PR | #95 |
| SP-P06 wristbands | MI | |
| SP-P07 call sheets | MI | |
| SP-P08 PDF/PPT | MI | |
| SP-P09 player access | MI | |
| SP-P10 study tracking | MI | |
| SP-P11 quizzes | MI | |
| SP-P12 practice scripts | PA | legacy planner |
| SP-P13 sharing/collab | PA | owner-only |

## Capabilities lost or overlooked (recovered from history)

| Item | Where it existed | Status now |
|---|---|---|
| Quiz generation, install manager, game-plan & situational services, wristband UI, PDF/image export | standalone `main` | Not on trunk (reference) |
| Coverage analysis vs drawn play | standalone `coverageAnalysisService.ts` | Replaced by rule-based `recommend()` (narrower) |
| 2D→3D camera lift with verified sync | PR #95 | Isolated, unmerged |
| Revision concurrency (`revision + 1`), legacy-play preservation | PR #53 | Not ported (planned) |
| Practice-mode join codes, wristband/call sheet, whiteprint, offline, 3D | approved design §10 steps 3–7 | Not started |
