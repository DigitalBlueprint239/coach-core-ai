# 09 — Implementation Task Backlog (dependency order)

Format: `T-id · task · requirement · depends · acceptance`. Status: ☐ open · ◐ in progress · ☑ done (with evidence in 12).

## Phase 1 — critical path

| T | Task | Req | Depends | Acceptance |
|---|---|---|---|---|
| ◐ T-101 (PR, CI pending) | **Versioned rule profiles** in `football-core/rules`; `validateFormation(f, profile?)` default reproduces today exactly; `eleven-player@1` profile (draft until sourced) | V12 | — | AT-13 (this PR) |
| ☐ T-102 | Source rule profiles: 11-player (NFHS/NCAA), 8-, 9-, 6-player, 7v7, NFL FLAG 5v5 — each with registry sources; draft until sourced | V12, V20 | T-101, T-105 | AT-14, AT-15 |
| ☐ T-103 | Canonical model v3 types: Assignment union (`run-track`, typed `block`, `protect`, `motion`, `ball`), Concept.family, Play v3 with overrides/revision/status | V03, V04 | ADR-001 approval | AT-05 |
| ☐ T-104 | `migrateV2toV3` + version-dispatching reader; fixtures; round-trip tests; v1 untouched | V03 | T-103 | AT-07, AT-08 |
| ☐ T-105 | Source registry types + independence groups + 5 knowledge categories; migrate existing `Verification` | V20 | ADR-005 | AT-36, AT-37 |
| ☐ T-106 | `installConcept` with conflicts (missing-slot, ineligible, spacing, collision) + override storage | V10 | T-101, T-103 | AT-06 |
| ☐ T-107 | Run-game engine v1: IZ, Power with OL block rules vs 4-3 Over (deterministic), RB track, mesh/handoff event | V11 | T-103 | AT-09, AT-10 |
| ☐ T-108 | Editor: draw/edit run tracks and block assignments; route control points; multi-select; zoom/pan | V01 | T-103 | AT-01..04 |
| ☐ T-109 | Revision concurrency rule (port #53) + revisions subcollection + rules tests | V16, V03 | T-103 | AT-48 |
| ☐ T-110 | Play card PDF export from canonical play (team terminology) | V19 | T-103 | AT-25 |
| ☐ T-111 | Deprecation plan for v1 Smart Playbook (read-only import of v1 plays via coordinate profile) | V03 | T-104 | AT-08 |

## Phase 2

T-201 timeline builder (Tier A) · T-202 2D playback controls (play/pause/step/scrub/slow) · T-203 port #95 adapter/view machine/cameras into `features/playbook3d` on the canonical model · T-204 QB-eye & position cameras · T-205 frame-time + memory benchmarks on 4 device classes · T-206 AT-20…24 end-to-end test.

## Phase 3+

See `08_…ROADMAP.md`; tasks are broken down at each phase gate (T-3xx…).

## Next five (dependency order)

1. T-101 rule profiles (this PR) → 2. T-105 source registry → 3. T-103 model v3 types (after ADR-001 approval)
→ 4. T-104 migration + fixtures → 5. T-106 concept install with conflicts.
