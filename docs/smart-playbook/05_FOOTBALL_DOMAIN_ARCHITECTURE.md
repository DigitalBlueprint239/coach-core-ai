# 05 — Football Domain Architecture (canonical play model)

Status: **proposed** (ADR-001, ADR-002 pending owner approval) · Builds on `src/football-core/` (keep, extend).

## 1. Principles

- One canonical, versioned play document consumed by 2D, 3D, AI, teaching, quizzes and exports.
- **Concept ≠ presentation.** A *concept* is football meaning by role/slot; a *play* is a concept installed on a
  formation (+ motions, tags, overrides) for a team; renderers derive geometry.
- Coordinates: **yards**, origin at the ball on the line of scrimmage; +x offense's right, +y downfield
  (existing football-core convention). Pixel formats exist only behind explicit, versioned coordinate
  profiles (pattern proven in PR #95).
- Football meaning lives in typed data + deterministic rules; never only in drawn coordinates.
- Every library item carries a knowledge category (ADR-005) and source citations.

## 2. Domain objects (target)

```
Team ─┬─ Playbook ─┬─ Play (team-owned, revisioned) ── references ─► Concept@version, Formation@version
      │            └─ Install, CallSheet, Wristband (views over Plays)
      ├─ TerminologyMap (canonical id → team words, aliases, player-friendly text)
      └─ Members (role: head|coordinator|position|player|admin)

Library (Coach Core, verified/draft) : Formation, FormationVariant, Personnel, Concept (pass/run/RPO/screen/ST),
  RouteDef, BlockingScheme, Protection, Front, Coverage (+rules), Pressure, Matchup, RuleProfile, Source
```

| Object | Key fields (abridged) | Exists today |
|---|---|---|
| RuleProfile | `id` (e.g. `nfhs-11@1`), players per side, min on line, max backs, eligibility rule, field dims, hash widths, flag constraints (no-run zones, rushers, blocking) , `verification` | **No → first slice** |
| Personnel | code (10/11/12/20/21/…), role counts | string union |
| Formation / FormationVariant | players {role, at, onLine}, strength, personnel, ruleProfile, levels | yes (no variant/profile) |
| PlayerRole / Slot | role (LT…F), slot (#1–#3 strong/weak, back, back-2, qb) | yes |
| Concept | family (pass/run/rpo/screen/st), assignments by slot/role, read, tags, minLevel, verification | pass only |
| Assignment | discriminated union: `route` (routeId, depth, conversion rules) · `run-track` (path type, aiming point, mesh) · `block` (scheme rule e.g. zone-playside, down, pull, combo, reach; target rule) · `protect` (slide/man/BOB, responsibility) · `motion` (type, timing) · `ball` (snap, handoff, pitch, pass, fake) · `read` (key defender, rule) | route only typed |
| Front / DefensiveAlignment | front id, technique per position, gap responsibilities | 4-3 alignment only |
| Coverage | shell, rules per role (zone landmark / man / match rule), rotation | shape + deep count |
| RunFit, Pressure | gap → defender, rusher paths, coverage behind | no |
| Timeline / Event | phases (pre-snap, snap, development, ball event), events with t (s), per-player keyframes derived from assignments | no |
| Situation | down, distance, field zone, hash, clock, score context | no |
| Play (team) | `schemaVersion`, `id`, `teamId`, conceptRef@ver, formationRef@ver, overrides, motions, tags, situation, notes (coach-only / player), terminology snapshot ref, `revision`, createdBy/At, updatedAt, status draft/published | v2 (`PlayV2`) |
| Source / Citation / Verification | registry (see 07), category, reviewer | partial |

## 3. Concept inheritance across formations (SP-V10)

`installConcept(concept, formation, profile) → { play, conflicts[] }`:
1. Number slots for the formation (existing `slotsFor`).
2. Map each concept assignment to a slot; check **eligibility** under the rule profile, **personnel**
   restrictions, and **spacing** (min split between receivers; landmark collisions).
3. Return conflicts as data (`missing-slot`, `ineligible`, `spacing`, `landmark-collision`, `protection-short`)
   — never a silently broken play. UI offers: pick a substitute player, convert route, or keep as override.
4. Overrides are stored on the play (`overrides[]`), so re-installing the concept preserves coach edits.

## 4. Rules and validation (SP-V12)

Versioned `RuleProfile`s (`id@version`) with sources. Validation returns plain-language problems with codes
(`formation.too-few-on-line`, …). Deterministic and tested; AI never overrides. Profiles are **draft** until their
rules are sourced (NFHS / NCAA / NFL FLAG / league rulebooks); the default 11-player profile reproduces today's
behaviour exactly.

## 5. Durability (SP-V03)

- `schemaVersion` on every stored document; readers dispatch by version; v1 docs are read-only and never
  rewritten; `migrateV2toV3` is pure and tested; round-trip serialization tests on fixtures.
- Concurrency: port PR #53's rule — update must set `revision == resource.revision + 1` (opt-in for docs without
  revision). Revision history in a `revisions` subcollection (append-only).
- Draft/published separation for library items (existing) and for team plays (published to players).
- Undo/redo stays in the editor reducer (existing); autosave keeps the local draft (existing).

## 6. Module boundaries (logical, one deployable)

`football-core/model` (types, schema, migrations) · `football-core/rules` (profiles, validation) ·
`football-core/install` (concept→formation) · `football-core/timeline` (assignments→events/keyframes) ·
`football-core/defense` (fronts, coverages, fits) · `football-core/knowledge` (sources, categories) ·
renderers (`features/playbook2/field` 2D; future `features/playbook3d`) · `teaching` · `exports` · `ai` (server).
Rule: renderers and AI import from `football-core`; `football-core` imports nothing from UI/Firebase.

## 7. Definition of done (model)

One play can be created, saved, transformed to another formation, loaded, rendered in 2D and 3D, exported and
taught with no contradictory assignments or data loss (AT-05…AT-08, AT-20).

## 8. Integration contract v1 for other lanes (Film, exports, teaching) — proposed

- **Version:** play documents carry `schemaVersion` (3); consumers must reject or ignore versions they do not know.
- **Identity:** a play's stable id is its Firestore document id; never reused; migration creates a new id and records
  `provenance.sourceId` of the original.
- **Ownership:** `football-core` (Kev's lane) owns `PlayDocV3`, `AssignmentV3`, `RuleProfile`, findings and the run/pass
  resolvers. Other lanes read through `readPlayDocument`; they never write play semantics. Film links reference
  `{ playId, revision }` and keep their own collections (rules added by PR with emulator tests).
- **Permissions:** team-scoped; a consumer must hold the team-owner (later: role-based) permission to read plays;
  player-facing consumers receive only coach-published material.
- **Backward compatibility:** additive changes only within a schema version; breaking changes create a new version with
  a pure migration; v1/v2 originals are never rewritten.
- **Writes:** only `savePlayDocV3` (revision-checked). No lane writes `plays` directly.
This section is our proposal; Drew-owned files and PR #104 are not modified by this lane.
