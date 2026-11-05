# 03 — Competitor Parity Matrix

Inputs: `C:\Projects\coach-core-research\reports\Football playbook competitor baseline.md` (2026-11-02, five
research passes) + a 2026-11-03 revalidation search. Evidence labels: **C** confirmed capability (vendor/app-store
source) · **L** documented limitation · **N** not publicly documented · **U** unverified/conflicting.
"Coach Core" column reflects trunk `ef7b061` (see `04_FEATURE_GAP_MATRIX.md` for status codes).

## Correction to the baseline report

The report states no football 3D product was found. **Incorrect.** GoArmy Edge Football (U.S. Army, free; App
Store listing updated 2026-03-02) draws plays on a 2D whiteboard and plays them back in 3D, with first-person /
any-position views and a VR version (Quest 2). Sources: https://apps.apple.com/us/app/id968154309 ·
https://apps.microsoft.com/detail/9nblggh5xd4p · https://www.higherechelon.com/?p=6266 . Usage is modest
(third-party estimate ~905 MAU, unofficial: https://appgoblin.info/apps/968154309). **Implication:** 3D playback
is parity with a free product, not a differentiator. Football-correct, model-driven 3D (assignments, reads,
rules) is the differentiation bet and must be demonstrated.

## Parity requirements (SP-P)

| ID | Capability | FirstDown PlayBook | Hudl Play Tools | Football Play Card | Playmaker X | GoArmy Edge | Coach Core today |
|---|---|---|---|---|---|---|---|
| SP-P01 | Professional play editor | C | C | C | C | C (2D whiteboard) | Partial |
| SP-P02 | Formation editing / templates | C (library) | C (templates) | C (36 formations) | C | C | Partial (2 verified + custom) |
| SP-P03 | Flip / mirror | C | U | U | C | U | Implemented |
| SP-P04 | Basic 2D animation | U | U | C | C (one-tap) | C | Partial (route draw-on) |
| SP-P05 | 3D playback | N | N | N | N | **C** | Prototype (#95, isolated) |
| SP-P06 | Wristbands | C (3 sizes) | U | C | C | N | Missing |
| SP-P07 | Call sheets | U | U | C (mid/top tiers) | C | N | Missing |
| SP-P08 | PDF / PowerPoint export | C (PDF) | U | U | U | C (import/export) | Missing |
| SP-P09 | Player playbook access | C | C | C | U | C | Missing |
| SP-P10 | Study tracking | U | C ("who's studying what") | C (activity dashboard, "At risk") | L (none) | U | Missing |
| SP-P11 | Quizzes / knowledge checks | L (manual copy-and-strip) | U | C (AI-graded, Aug 2026) | L (none) | U | Missing |
| SP-P12 | Practice scripts | C | C (+ scout film) | U | U | C (drills) | Partial (legacy planner) |
| SP-P13 | Organization, sharing, collaboration | C | C | C | C (multi-team) | U | Partial (owner-only team) |

Pricing (sourced in report): FirstDown $250 single / $750 team per yr (U: blog says $700) · Hudl Play Tools $199/yr
add-on · Football Play Card $36–$948/yr · Playmaker X $7–$11/mo · GoArmy Edge free · GoRout hardware $1,125+.

## Content parity (by audience)

| Content | Competitor evidence | Coach Core today |
|---|---|---|
| Large library | FirstDown 35–40k plays (C) | 6 verified items |
| Youth systems (Double Wing, Wing-T, Power I, Single Wing) | Sold as PDFs by named coaches (C) | Missing |
| Flag rule-aware plays | NFL FLAG/USA Football resources; Playwrist (C) | Missing |
| HS spread, IZ/OZ, gap runs, RPO | Library vendors (C); scheme sources | Pass only (Smash) |
| Fronts / coverages / pressures | Partial in vendors (U) | Cover 2/3 verified, 4-3 only |
| Special teams | FirstDown, Hudl (C) | Missing |

## Differentiators — hypotheses with measures (none yet proven)

| ID | Hypothesis | How we will measure | Current evidence |
|---|---|---|---|
| SP-D01 | One concept installs across formations without redrawing | Time-to-install a concept into 5 formations vs redraw; coach usability test; FPC review complaint ("not intuitive how to use the same formation… to make several plays") | Engine supports it (tests); no user study |
| SP-D02 | Verified content (3 independent sources) | Count of Verified items; audit trail per claim | 6 items |
| SP-D03 | Explainable "what beats this" for tackle football | Coach-rated usefulness; correctness review by named coaches | 1 verified matchup |
| SP-D04 | Football-correct, model-driven 3D (not cosmetic) | 2D↔3D sync error ≤ 0.01 yd; assignment fidelity checks; coach comparison vs GoArmy Edge | Prototype only |
| SP-D05 | Step-through QB read tied to the play | Player quiz accuracy before/after | Implemented (2D), unmeasured |
| SP-D06 | Team terminology across every surface | Terminology coverage tests (labels, reads, quizzes, exports) | Partial |

**Not claimed:** that Coach Core exceeds any competitor today. On parity it trails every paid competitor
(exports, wristbands, player access, quizzes are missing).
