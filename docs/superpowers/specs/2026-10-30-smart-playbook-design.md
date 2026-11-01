# Smart Playbook — design

Status: **approved by the owner** · 2026-10-30 · Coach Core AI (`DigitalBlueprint239/coach-core-ai`)

## 1. Intent

The Smart Playbook is the Coach Core AI feature where a football coach builds, learns and uses a
playbook. It has to be more than a place to draw plays. Staffs are short, so it acts like the
assistant coach a program doesn't have: it brings a deep, researched library of formations and plays,
tells a coach what beats the defense they're facing (or what to run on defense against an offense),
explains why in plain words, carries a play across formations, and turns the playbook into the
printouts, game plans and player practice a season actually needs.

It must serve two coaches at once:

- **The veteran** (20 years in): wants speed, depth and control. The library is a head start, the
  assistant is a second opinion, and nothing gets in the way.
- **The first-year coach** (maybe put in charge because nobody else would): may know one side of the
  ball or neither. Every suggestion explains itself, vocabulary can be plain, and the tool teaches as
  it goes.

Level: youth and high school first, under high-school rules by default; college later.

The bar the owner set: visually and functionally ahead of everything coaches use today (Hudl,
FirstDown PlayBook and similar), recognizably Coach Core, never cluttered.

## 2. Goals, non-goals, anti-goals

**Goals**

1. A researched starter library large enough that no coach starts from a blank page (target in §6).
2. A coaching assistant that answers "what beats this?" for offense and defense, with reasons.
3. Plays stored as assignments by role, so one play runs from many formations.
4. The chosen look (§3) applied across the Smart Playbook, uncluttered, on desktop, tablet and phone.
5. Every upgrade the owner approved (§5), each usable by a first-year coach without training.
6. The coach owns everything: any formation or play can be created from scratch or from any library
   item, and every part of it can be edited, renamed and re-labelled in the team's own language (§5.0).
   The library is a baseline, never a requirement.

**Non-goals (for this design)**

- College-specific rules and content (designed for, not built).
- Open-ended AI chat. AI stays disabled in the app; the assistant is curated and rule-based. A later
  AI layer may only rephrase vetted answers.
- Film breakdown / Film Analyzer integration (the opponent card takes manual input first).
- Changes to other Coach Core AI features.
- Special teams (designed for later; the model allows it).

**Anti-goals (would make it a failure even if it works)**

- Wrong football advice presented with confidence, above all to a first-year coach.
- Clutter: more panels, toolbars and labels than the moment needs.
- Losing or silently changing a coach's saved plays.
- Content copied from proprietary playbooks or competitor products.
- A generic sports look (Bebas-style headlines, team red) that could be anyone's.

## 3. Look and feel — "Sheet on the desk"

Chosen by the owner from the mockups (A Blueprint + B Chalk talk, layout 1). Reference mockup:
`ab-combined.html` (the visual companion session), layout 1.

**Principle:** the field gets the room; everything else steps back until it's needed. The dark
blueprint sheet is the one bold thing on screen; the workspace around it is calm and light.

**Layout (desktop/tablet landscape)**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▣  Offense ▾ / Trips Right ▾ / FLOOD          [2D|3D] [Run from…] [⋯]   │  top bar: path + 2 actions
├───────────────────────────────────────────────┬──────────────────────────┤
│                                               │ Westfield plays Cover 3  │
│          BLUEPRINT SHEET (the play)           │ 31 of 44 snaps           │
│     numbered read badges ①②③ on the field     │ ┌──────────────────────┐ │
│     one handwritten coach note                │ │ FLOOD      JV and up │ │  one recommendation,
│                          [title block]        │ │ coach's handwriting  │ │  in handwriting
│                                               │ └──────────────────────┘ │
├───────────────────────────────────────────────┤ Also beats Cover 3       │  two alternatives
│ ① Eyes on SS  │ ② SS jumps Y? │ ③ SS sinks?   │  Curl-flat · Varsity…    │
└───────────────────────────────────────────────┤ [Show it in 3D from QB]  │  one primary action
                                                └──────────────────────────┘
```

- Phone: the sheet takes the full width; the read steps become a swipeable row under it; the
  assistant is a bottom sheet with the one recommendation visible when collapsed.
- The library lives behind the path dropdowns and a full-screen library view (§5.1), not an
  always-open rail.

**Tokens**

| Role | Value |
|---|---|
| Workspace ground | `#F5F7FA` |
| Surface | `#FFFFFF`, border `#E3E8EE` |
| Ink | `#14202E`; secondary `#536173` |
| Blueprint sheet | `#123B6D`; linework `#DCE8FA` at 40–50% |
| Signal (key route, LOS, primary action) | `#FF8A3D` on dark; `#1A0E05` text on it |
| Coach note on dark | chalk yellow `#F4D35E` |
| Print ("whiteprint") | paper `#FBFCFE`, linework `#1F4E8C`, red pencil `#C8322B` |
| Display type | Saira Stencil One — play names, title block, yard numbers only |
| UI type | Public Sans 400/500/600/700 |
| Coach voice | Caveat — only for coach notes and the assistant's tip, never UI |

Rules: one primary action per screen; handwriting only where a coach would write; offense as O's,
defense as X's (the coaching convention), skill players labelled, linemen unlabelled; routes draw on
once per play view (respect reduced motion); 44px minimum touch targets (48px on the sideline
layout); WCAG AA contrast; works in sunlight via the whiteprint mode (§5.8).

## 4. Architecture

```
football-core (pure TS, no UI)          app (React, inside coach-core-ai)
  formations   (roles → yards)    ───►    Playbook screen (§3), Library, Scout, Game plan, Print
  plays        (assignments)      ───►    2D renderer (blueprint) + 3D view mode
  defenses     (fronts, coverages)───►    Assistant panel
  concepts + matchups (+ reasons, review status)
  rules engine (assistant)        ───►    Practice mode (players)
```

1. **football-core.** A standalone TypeScript module with no React, so it is unit-testable and reusable
   by 2D, 3D, print and practice mode.
   - *Formations* are role → alignment in yards (`x` lateral from the ball, `y` depth), with a
     strength (left/right), personnel (e.g. 11, 12, 21) and level tags. Mirroring is a function.
   - *Plays* are assignments by role, not drawn lines: e.g. `{ role: 'slot-1', route: 'sail', depth: 12 }`,
     `{ role: 'rb', action: 'check-release-protect' }`. A route library defines each route as a
     relative path from the player's alignment (with stem/break rules), so a play renders in any
     compatible formation. Free-drawn routes stay possible as an explicit "custom path" assignment.
   - *Defenses* are fronts (4-3, 3-4, 4-2-5, 3-3 stack, 5-3, 6-2 for youth) plus coverages (0, 1, 2,
     3, 4, and their common rotations), each with alignment rules relative to the offensive formation.
   - *Concepts and matchups*: each concept (Flood, Smash, Stick, Mesh, Four verticals, Inside zone,
     Power, Counter, Jet sweep, and so on) carries which coverages/fronts it attacks, the stressed
     defender, the read progression, a plain-language reason, a level, and a **review status**
     (`draft` | `reviewed`, reviewer, date).
2. **Assistant (rules engine).** Deterministic: given an opponent profile (coverages/fronts with
   frequencies, or an offense's tendencies), rank concepts from the matchup table, filter by the
   coach's level and what's already in their playbook, and return reasons and read steps. No
   generated text. Every answer traces to reviewed content.
3. **App.** Built inside the existing Coach Core AI React app (React 19, CRA, Firebase 11, Tailwind 4
   on `recovery/coach-core-mvp-2026`), behind a feature flag until the owner switches it on. The
   current Smart Playbook stays available until then.
4. **3D view.** The CC-SP3D-002 prototype (`experiments/smart-playbook-3d`, draft PR #95) is the
   reference: matched-overhead camera lift, verified coordinate profile, tag declutter. In the app it
   renders football-core yards directly, so it needs no pixel-profile inference for library plays.

## 4a. AI brain (owner decisions, 2026-10-30)

- **Which brain:** the existing TypeScript `CoachCoreAIBrain` (`src/ai-brain/`, 8 methods) is Coach Core's
  AI layer. The old Python draft (`src/components/Coach Core AI Brain /`, a generic chatbot with no football
  content that cannot run), with its companion `src/components/setup_script.py` and
  `src/components/integration_package.py`, is **retired (owner approved, 2026-10-30)**; removing it also removes the
  trailing-space path that breaks Windows checkouts.
- **Route:** Genkit flows in Firebase Cloud Functions (v2 callable functions, existing `functions/`,
  Node 22), calling **Anthropic Claude**. Keys live in Secret Manager; callers are authenticated by
  Firebase Auth and App Check. The client keeps the 8 method names but calls the functions instead of
  the old `/api/ai` proxy.
- **Security fix (required before any AI goes live):** remove `REACT_APP_AI_PROXY_TOKEN`; any
  `REACT_APP_*` value ships inside the public bundle.
- **Layering:** the football engine decides what is true and what is recommended; the AI only
  explains, drafts and searches over verified content. Outputs are schema-checked; any play the AI
  names must exist in the engine or the coach's playbook or it is dropped; AI drafts are labelled
  and never saved without the coach accepting them; no player names or ages are sent to the model.
- **Launch mode: live AI off.** At launch nothing calls the model per use. The rules engine answers
  the assistant; explanations at each level, coaching tips and the practice-mode quiz bank are
  generated **once, before launch** (Claude, batch pricing, a capped one-time budget), verified like
  the rest of the content, and shipped with the library. Team terminology is applied by substitution,
  not AI. Firebase stays within the Blaze plan's free allowance with a budget alert.
- **Later (owner switch):** live features (plain-language search, custom game-plan drafting,
  formation critique) are built behind a flag with per-team limits, an organization spend limit and
  caching, and turned on only when the owner decides. The model mix (all Opus 5.5, or Opus for game
  and practice plans with Haiku 5.5 for quick tasks) is chosen then; estimates were roughly
  $1.60–3.80 per active coach per in-season month.

## 5. Features (all approved by the owner)

**5.0 Your playbook, your words (owner requirement).** Coaches never have to use our plays or
formations.

- *Create from anything:* a new play from a blank field, from any library formation, from any library
  play, or from one of their own. A new formation from scratch or by editing any formation.
- *Edit everything:* player alignments (drag, nudge, mirror, flip strength), routes and assignments
  (pick from the route library, adjust depth and break, or draw a custom path), blocking, motion,
  notes, read steps, tags, level and which coverages it's meant to beat.
- *Rename everything:* play names, formation names, position labels (their "F" instead of our "H",
  "Sniffer" instead of "TE"), concept names and route names. A team **terminology** setting maps our
  baseline words to theirs once, and the whole app (field labels, assistant tips, read steps,
  wristbands, practice quizzes) speaks the team's language from then on.
- *Their own numbering:* play-call numbers and wristband numbering follow the coach's system.
- *Library items stay intact:* editing a library item always works on the coach's own copy; the
  coach can see where a play came from and reset their copy to the baseline if they want.
- *Their plays work everywhere:* custom plays and formations get the same features as library ones:
  translation across formations (§5.5), print (§5.7), 3D (§5.11), practice mode (§5.9). The assistant
  can recommend the coach's own plays when they carry the concept/coverage tags, labelled as theirs.
- *Defense too:* coaches build their own defensive calls the same way: front, coverage, stunts and
  blitzes, alignments adjusted by hand, all renamed in their terminology.
- Edits are undoable (multi-step undo/redo) and autosaved.

**5.1 Library.** Formations, plays and defenses with mini-diagram thumbnails everywhere (never a bare
name). Filters: side of ball, level, personnel, concept, "beats …". Picking a template copies it into
the coach's playbook as their own editable play (§5.0); the template itself never changes. A first-run path asks level and offensive
style (spread, pro, Wing-T, Double Wing, Pistol, Flexbone…) and proposes a starter playbook.

**5.2 Coaching assistant.** Offense: "what beats this defense?" Defense: "what should I run against
this offense?" One recommendation shown, two alternatives a tap away, each with the reason in plain
words and its level. "Add to my playbook" on every suggestion.

**5.3 Step-through read.** The read is numbered steps (①②③) shown under the field and as badges on
it. Tapping a step animates that moment: the defender's choice and the throw that beats it. Works in
2D and in 3D "from the QB's eyes".

**5.4 Level switch.** Youth / JV / Varsity filters content and changes vocabulary (e.g. "sail" →
"deep out"; "Cover 3" explained once). Per coach, changeable any time.

**5.5 One play, every formation.** After a play is built or picked, show it carried into the other
formations in the playbook as faint overlays or side-by-side thumbnails; flag formations where a role
is missing or a route no longer makes sense; the coach keeps the versions they want.

**5.6 Opponent card and weekly game plan.** Enter what a team runs (coverages, fronts, or offensive
tendencies with rough frequencies). The assistant builds a short game plan: plays by situation
(1st and 10, 3rd and short, red zone, two-minute), each with its reason. Exportable to the call sheet.

**5.7 Wristband and call sheet.** One tap prints a wristband card (numbered plays, standard 3- and
4-panel sizes) and a call sheet grouped by situation, in the whiteprint style; play numbers stay
consistent between the two.

**5.8 Whiteprint mode.** The same drawing as blue linework on white with red-pencil notes, for
printing and for reading a tablet in daylight. A toggle, not a separate theme to maintain.

**5.9 Practice mode for players.** Quizzes built from the playbook ("Where does H go against Cover
3?", tap the route or the spot), on a phone, with per-player progress for the coach. Players join
with a per-team join code (§9).

**5.10 Built for real conditions.** One-hand tablet use, large targets, works offline on a field
with no signal and syncs later; nothing is lost if the app closes mid-edit.

**5.11 3D view.** Toggle 2D/3D on any play: matched-overhead lift, presets (Tactical, Overhead,
Sideline, Defense, QB's eyes), step-through read in 3D, phone tag declutter.

## 6. Content: research and review

**Target for launch** (my call; the owner may raise it): about 40 formations, 25 defensive
fronts/coverage packages, and 150+ plays across the main youth and high-school systems: spread
(10/11 personnel), pro-style (I, Pro, Ace), Pistol, Wing-T, Double Wing, Flexbone/option, and the
standard defensive families. Each play has the concept, assignments, read steps, the coverages/fronts
it beats, level, and a reason.

**Research method.** Deep research across public coaching material (clinic notes, coaching
associations, published coaching books and reputable coaching sites), cross-checked across at least
two sources per concept. Generic football concepts and terminology are free to use; no copying of
proprietary playbooks, diagrams or a competitor's library. Sources are recorded per concept.

**Verification (owner decision, 2026-10-30).** Every play, formation, defense and matchup is
cross-referenced against multiple reliable, professional football sources before it can appear in
the library.

- *Verified:* confirmed by at least two independent reliable sources (three for a "what beats what"
  claim). It is published to the library with its sources recorded.
- *Not verified:* anything that can't be confirmed that way is saved to a **draft queue** instead.
- *Draft queue:* an admin screen where the owner (or a reviewer the owner names) sees each draft with
  its diagram, its claims and the sources found so far, and chooses **Approve** or **Reject**.
  Approve adds it to the library (marked as approved by the reviewer, with the date). Reject removes
  it from the queue and the app; a record of the rejection is kept (my call) so the same item is not
  researched and re-queued again.
- *Coaches never see drafts.* The library and the assistant use verified or approved content only.
- *Reliable sources:* coaching associations and clinics (e.g. AFCA, state coaching associations,
  USA Football), published coaching books and manuals by established coaches, college and
  professional coaching material, and long-standing coaching education sites. Forums, anonymous
  posts and AI-generated pages never count toward verification.

## 7. Data and persistence

- **Library content** is static, versioned data bundled with the app (not written to Firestore).
- **A coach's plays and formations** (from templates or drawn), plus the team terminology, must store assignments and a coordinate profile so
  they translate across formations and render in 3D correctly. This is a change to the persisted play
  schema and needs the owner's explicit approval (§9). Existing saved plays are never rewritten:
  they keep working in 2D as they are; a coach can opt to convert one, which creates a new play.
- Offline: Firestore offline persistence plus a service worker for the app shell; edits queue and
  sync; conflict rule is last-write-wins per play with the previous version kept.
- No change to authentication or security rules in this design, except what §9's practice-mode
  decision may require (separately approved).

## 8. Constraints

- Lives in `coach-core-ai`; branches off `recovery/coach-core-mvp-2026`; PRs target that branch;
  nothing merges, deploys or touches production Firebase without the owner's approval.
- AI stays disabled; no secrets in the client.
- The recovery branch had a path with a trailing space that breaks Windows checkouts; it is removed
  with the retired Python draft (§4a).
- The local machine is low on memory: heavy builds and test runs go to cloud sessions or CI.
- Accessibility: WCAG AA, keyboard paths for every action, reduced motion respected.

## 9. Open decisions (owner)

1. ~~Saved-data change~~ **Approved by the owner (2026-10-30):** new plays store assignments and a
   coordinate profile; custom formations and team terminology are saved.
2. ~~Practice mode access~~ **Decided (2026-10-30): a join code per team.** Players enter the team's
   code (no full account); the coach can rotate the code and remove players. Security rules for this
   are a separate, approved change.
3. ~~Review~~ **Decided (2026-10-30):** cross-reference verification with a draft queue the owner
   approves or rejects (§6). Unverified content is never shown to coaches.

## 10. Order of work (my call)

1. football-core model + first researched content slice (one offensive system, one defense family,
   the matchup table for them) with tests.
2. The Sheet-on-the-desk Playbook screen behind a flag: create and edit plays and formations from
   scratch or any template, team terminology, library, assistant and step-through read.
3. Level switch, one-play-every-formation, whiteprint and print (wristband, call sheet).
4. Content expansion to the full launch target, through review.
5. Opponent card and weekly game plan.
6. 3D view in the app (from the prototype).
7. Offline, then practice mode.
8. AI brain on Genkit + Claude (security fix first); pre-generated content before launch; live
   features stay off until the owner switches them on.

## 11. Left to the builder

Component structure, state management, file layout, the route-library math, the print layout
details, test strategy and exact copy, within the rules above.

## 12. Calls made in this document (for the owner to check)

- Launch content target of about 40 formations, 25 defensive packages and 150+ plays (§6).
- Rule-based assistant at launch; live AI built but off (§4a).
- One-time pre-generation of explanations and quiz banks before launch (§4a).
- Rejected drafts are kept as a record so they aren't re-researched (§6).
- New Smart Playbook built behind a feature flag, with the current one kept until switched (§4).
- Offline conflict rule: last write wins per play, previous version kept (§7).
- Special teams out of launch scope (§2).
- Order of work (§10).
