# 01 — Smart Playbook: Vision and Product Principles

Status: living document · Owner: Kev (product) · Maintained by Kev's engineering lead · Created 2026-11-03
Sources: owner's master brief of 2026-11-03 ("Smart Playbook Master Vision Recovery…"), approved design
`docs/superpowers/specs/2026-10-30-smart-playbook-design.md`, competitor baseline
`C:\Projects\coach-core-research\reports\Football playbook competitor baseline.md` (2026-11-02).

## Product principle

Smart Playbook does not just show a coach what a play looks like. It helps the coach **create** the play,
**understand** its football logic, **explore** how it interacts with defenses, **teach** every player's
assignment, **visualize** its execution, **prepare** the team to run it, and **improve** the coaching process.

## Owner decisions (final, 2026-11-03 "Intelligence-First Foundation" directive)

1. **First audiences:** youth tackle and high school, treated as different coaching contexts (progressive
   disclosure: simple by default, advanced on demand). Architecture extends to flag, 6/8/9-player, 7v7, college.
   No league-compliance claim until that league's versioned rule profile is verified against its governing source.
2. **AI strictly on demand:** no unsolicited recommendations, popups or background calls on edits. Deterministic
   validation warnings are normal app behaviour, not AI.
3. **AI never modifies plays:** it explains, analyses, identifies weaknesses, recommends and teaches; the coach makes
   every change by hand. No AI write operations at this stage.
4. **Run and pass both demonstrated** on one model: run-game slice first, then passing.
5. **Qualified football review group** to be recruited (proposal in 07 section 6); no existing collaborator is
   assumed to be the whole group; no spending without approval.
6. **Coaches first;** players later receive only coach-approved material: no private analysis, unapproved AI output,
   opponent information or open AI access for players.

Three layers: **A** deterministic football engine (authoritative) / **B** read-only AI advisor (explains the engine
and verified knowledge) / **C** presentation and teaching (2D, 3D, cards, quizzes). One football meaning, many views.

## Audiences

| Persona | Needs first | Source |
|---|---|---|
| Youth tackle volunteer coach (first-year) | A small, age-appropriate, complete *system*: run-first plays with blocking rules, a defense, practice plans, printable wristbands. Minimal controls. | Owner brief; research (youth playbooks are sold as whole systems) |
| Flag coach | Rule-aware plays for their league (NFL FLAG 5v5, others), simple teaching | Owner brief; research (NFL FLAG rules shape content) |
| High school staff | Spread + multiple, zone/gap runs, quick/dropback/PA/RPO, protections, run fits, 4-2-5 / 3-down fronts, match coverages, special teams, situational calling, player install | Owner brief; research |
| College / advanced staff | Complex installs, coverage rules, staff roles, personnel/formation tagging, scouting, film workflows, terminology management, approvals | Owner brief; research |
| Player | Their own assignment, alignment, reads, coaching points; free access; quizzes | Owner brief |

## The 22 non-negotiable capabilities (requirement IDs)

These are the vision requirements. Each is tracked in `04_FEATURE_GAP_MATRIX.md` and tested via `11_ACCEPTANCE_TEST_MATRIX.md`.

| ID | Capability |
|---|---|
| SP-V01 | Professional 2D football play design |
| SP-V02 | Seamless transformation into high-quality 3D playback |
| SP-V03 | Shared play data across 2D, 3D, AI, teaching and exports |
| SP-V04 | Intelligent offensive and defensive football representations |
| SP-V05 | Position-specific play and assignment visualization |
| SP-V06 | Interactive quarterback read progression |
| SP-V07 | Explainable defensive and offensive matchup analysis |
| SP-V08 | AI-assisted play creation and optimization |
| SP-V09 | Team-owned terminology and play-calling language |
| SP-V10 | Plays and concepts that carry across multiple formations |
| SP-V11 | Run-game, blocking, coverage and pressure intelligence |
| SP-V12 | Youth, flag, high school and advanced football support |
| SP-V13 | AI-supported practice planning and player development |
| SP-V14 | Player learning, quizzes and mastery tracking |
| SP-V15 | Film-connected scouting and game planning |
| SP-V16 | Collaboration, version history and permission controls |
| SP-V17 | Excellent mobile and tablet experiences |
| SP-V18 | Reliable offline and low-bandwidth workflows |
| SP-V19 | Professional exports: PDF, PowerPoint, wristbands, call sheets |
| SP-V20 | A grounded, coach-verified knowledge system |
| SP-V21 | Interactive what-if comparisons and tactical simulation |
| SP-V22 | Design and interaction quality that credibly competes with the strongest products |

Competitive-parity requirements (SP-P01…SP-P13) are listed in `03_COMPETITOR_PARITY_MATRIX.md`.

## Design principles

1. **One play, one model, many views.** 2D, 3D, AI, teaching, quizzes and exports read the same canonical,
   versioned play. No feature keeps its own copy of football meaning. (ADR-001)
2. **Football meaning is explicit, not drawn.** Assignments, rules, reads and responsibilities are data;
   coordinates are a presentation of them. (ADR-002)
3. **Deterministic where football is deterministic.** Legality, eligibility, slot mapping, assignment conflicts
   and coverage responsibilities are rules with tests. AI interprets, drafts and explains; it never decides
   legality and never invents evidence. (ADR-004)
4. **Honest labels.** Verified / expert-reviewed / coach-authored / provisional AI / insufficient evidence are
   always visible. The three-source rule for **Verified** is never lowered. Animation is never presented as a
   validated outcome prediction. (ADR-005)
5. **The coach stays in control.** AI recommends; the coach decides and approves anything players see.
6. **Progressive disclosure.** A youth coach sees a simple tool; advanced controls appear when needed.
7. **Field-ready.** Phone, tablet, sideline, press box, poor connectivity; touch-first and offline-tolerant.
8. **Private by default.** Team data is the team's; players see what they're assigned; youth data is minimized.

## Anti-goals (failure even if it "works")

Cosmetic 3D without football behavior · separate 2D and 3D play models · invented evidence or fake opponent
data · incomplete assignments shown as complete plays · silently lowered verification · destructive rewrites
without migration · features marked complete because a component exists · unlicensed redistribution of
coaching material · provider keys in the browser · player data outside team permissions · claims of beating
every competitor without evidence.

## Differentiation hypotheses (to be proven, not claimed)

Measured in `03_COMPETITOR_PARITY_MATRIX.md` §Differentiators. Note: free 2D→3D playback already exists
(GoArmy Edge Football), so 3D alone is **not** a differentiator; football-correct, model-driven 3D is the bet.
