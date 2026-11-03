# 08 — Development Roadmap (dependency-ordered)

> **Superseded ordering (owner directive 2026-11-03, "Intelligence-First Foundation"):** football intelligence is
> built into the foundation. The phase table below is kept for history; the authoritative order is:
>
> | Milestone | Outcome | Gate |
> |---|---|---|
> | **M0** Reconcile and protect | Decisions recorded; trunk/PR state verified; staging and persistence risks documented; lane boundaries confirmed | Agreed source of truth, safe path |
> | **M1** Intelligence contracts | Model v3 assignments, rule profiles, findings, eligibility, install with conflicts, read-only advisory contract, non-destructive migration infrastructure, knowledge/evidence metadata | Engine represents and validates meaningful assignments without AI |
> | **M2** Run-game slice | Inside Zone vs a defined front: block rules resolved to defenders, mesh, RB track, timing events, save/reopen, 2D, play card; then Power | Engine understands run assignments, not arrows |
> | **M3** Pass-game slice | Smash with eligibility, protection, coverage rules, QB drop and progression, timing; preserves read and assistant | Run and pass on one system |
> | **M4** Shared timeline + 3D | Tier A playback in 2D and R3F 3D from one timeline; fidelity, determinism, perf measured | Same plays consistent in 2D and 3D; no view-caused mutation |
> | **M5** Requested AI assistance | Server-side read-only advisor on the canonical model and evidence; AI-off fallback; no-write guarantee | Grounded answers; coach keeps control |
> | **M6** Coaching utility | Play cards, wristbands, call sheets, limited coach-approved player sharing, basic study/quiz tracking | Create, teach, distribute approved material |
>
> Later: more football systems, advanced defense, film, collaboration, analytics, offline, Tier B/C simulation.

Each phase ends in a **working, tested vertical slice** on staging. Estimates assume cloud sessions for builds
and the current two-lane team; they are ranges, re-estimated at each phase gate. Production release of any phase
is an owner decision. Film (SP-V15) runs in Drew's lane in parallel (issue #39).

| Phase | Outcome (vertical slice) | Key requirements | Depends on | Est. |
|---|---|---|---|---|
| **0 — Audit & stabilization** | This document set; trunk green; rules live; source of truth agreed | all (docs) | — | done 2026-11-03 (this PR) |
| **1 — Canonical model & 2D excellence** | A coach builds a structurally valid **run or pass** play (IZ, Power, Smash…) on any formation under a rule profile, saves, reopens, flips, installs it on 5 formations with conflicts shown, and prints a play card | SP-V03, V04, V10, V11 (run/protect), V12 (profiles), V01 core editor, V19 (play card PDF), V20 registry | ADR-001/002/005 | 4–6 wks |
| **2 — Timeline & first 3D slice** | Same play animates (Tier A) in 2D and 3D with one clock; QB eye view; the AT-20 scenario passes with measured perf | SP-V02, V21 (A), V06 on timeline, perf budgets | Phase 1 model + timeline | 3–5 wks |
| **3 — Football intelligence** | Blocking rules resolve vs 4-3/4-2-5/3-down fronts; coverages with rules; run fits; matchup explanations with the explanation contract; Tier B reactions for a few coverages | SP-V07, V11, V21 (B), V20 content growth | Phases 1–2; content sprint | 5–8 wks |
| **4 — Coaching workflows** | Players get assigned plays (free accounts), position lens, quizzes from saved plays with coach approval, mastery; wristbands/call sheets/PPT; roles & permissions; revisions | SP-V05, V09, V14, V16, V19, P06–P11 | Phase 1; rules redesign | 6–8 wks |
| **5 — Scouting & game planning** | Film-linked plays (DX port), coach-entered/film tendencies with provenance, situational packages, AI game-plan suggestions (grounded) | SP-V15, V08 (server), V13 | DX Film port; AI policy | 6–10 wks |
| **6 — Advanced simulation** | Tier C exploratory simulation, interactive QB training in 3D, optional VR; predictive models only if validated | SP-V21 (C), V06 advanced | Phases 2–5; data | ongoing |

**Content sprint** (parallel from Phase 1): source registry + advisory panel → run game (IZ, OZ, Power, Counter,
Trap, Sweep, Dive/Iso, Wedge, Jet), youth systems, fronts (6-2, 5-3, 4-4, 4-2-5, Tite), coverages (0,1,4/Quarters
family), matchups; flag rule profiles. Verified only at the bar; Expert-reviewed meanwhile.

**Parity timing:** wristbands/call sheets/PDF appear in Phase 1 (play card) and Phase 4 (full suite); player access
& quizzes in Phase 4. Until then Coach Core trails paid competitors on parity — accepted risk (RK-02).

**Phase-boundary change vs. brief:** rule profiles and the source registry move **into Phase 1** (brief lists them
later) because run content, flag/youth support and verified explanations all depend on them.
