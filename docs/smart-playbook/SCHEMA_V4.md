# Smart Playbook — canonical play schema v4

Status: **implemented behind tests, not wired into the editor, not deployed.** Owner approved the direction on
2026-11-10. This file is the single authoritative description of the contract. Code:
`src/football-core/playDocumentV4.ts`, `src/football-core/interpretations/v1.ts`,
`src/features/playbook2/playStoreV4.ts`, `firestore.rules`.

## 1. Why v4

v2 and v3 plays store `{ slot, route name, depth }`. Which player fills a slot, which side is strong, and what the
route looks like were recomputed from code every time the play was drawn. Two consequences, both reproduced in
tests:

- dragging a receiver past another one renumbers the slots, so the two players swap routes;
- any change to the route library or the slot logic redraws every saved play.

## 2. The document

```
plays/{playId}                       PlayDocV4 (+ updatedAt)
plays/{playId}/revisions/{n}         immutable copy of revision n
publishedPlays/{playId}_r{n}         immutable published snapshot of revision n
```

| Field | Meaning |
|---|---|
| `schemaVersion: 4` | |
| `teamId`, `createdBy` | Set on create; never changed by an update (store and rules). |
| `coordinateProfile: 'cc-yards-v1'` | x = yards right of the ball, y = yards downfield of the line of scrimmage. |
| `fieldProfileId` | Versioned field dimensions (`hs-11@1`). |
| `ruleProfileId` | Versioned rule profile (`eleven-player@1`). |
| `ball.hash` | Lateral ball spot: left, middle, right. |
| `formation` | `{ sourceId?, name, personnel, strength }`. Strength is stored, not recomputed. |
| `players[]` | `{ id, role, at, onLine, label?, rosterRef? }`. |
| `playerSeq` | Highest player number ever issued; ids are never reused. |
| `assignments[]` | Each has a `playerId`. Kinds: route, run-track, block, protect, motion, read. |
| `defense?` | `{ coverageId?, frontId?, alignedBy, defenders[] }` — the resolved look, stored. |
| `concept?`, `read[]`, `level`, `tags[]`, `notes` | As in v3. |
| `provenance` | created / duplicated (source id + revision) / migrated (see section 4). |
| `unresolved[]` | Source assignments migration could not attach with certainty. Kept verbatim, never drawn. |
| `revision` | Starts at 1; every save is exactly +1. |

There is **no `status` field**. A play cannot declare itself published.

### Player identity

Ids are `p1`, `p2`, … issued in order and never reused within a play. Role (`X`, `QB`) and label are attributes a
coach can change freely; nothing references them. `rosterRef` is reserved for a later link to a roster entry and
is not read or written by anything yet — no player data is collected by this schema.

### Routes: hybrid representation

```
{ kind: 'route', playerId: 'p7',
  points: [{ x: 0, y: 7 }, { x: 6, y: 12 }],                     // authoritative
  template: { routeId: 'corner', side: 'right', interpretation: 'cc-interp@1' } }   // optional, editing aid
```

`points` are offsets in yards from the player's alignment. They are the only thing a renderer uses. Because they
are relative to the player, moving the player moves his route with him and nothing else. `template` records which
library route the shape came from so the editor can offer "change depth"; applying a template writes new `points`
as an explicit edit. A free-drawn route simply has no template.

Alternatives considered: template-only (the v2/v3 defect); absolute field points (every player move must rewrite
the path, and the "path starts at the player" invariant can be violated); template plus overrides (still depends
on live library code). Relative resolved points have none of these problems and cost roughly 30 bytes per point.

### One geometry for every renderer

`resolveGeometry(play)` returns absolute player positions, route paths and defenders from the stored document
alone. The 2D sheet, print card, playback and any future 3D view must consume this and nothing else.

## 3. Persistence contract

- **Atomic history.** Every save commits the play and `revisions/{n}` together. The rules refuse a v4 play write
  whose matching copy is not in the same commit, and refuse a copy that differs from the play.
- **Optimistic concurrency.** An update must carry `revision = stored + 1`. The store checks in a transaction and
  throws `PlayConflict` without writing; the rules enforce the same thing for any client.
- **Immutable history.** Revision copies cannot be updated. The coach can delete them (pruning, play deletion).
- **Retention.** The newest 25 copies are kept (`REVISION_RETENTION`); the oldest is deleted in the same
  transaction as the save that supersedes it.
- **Publishing.** `publishedPlays/{playId}_r{n}` is create-only, must equal the stored revision `n`, and its id is
  derived, so a revision can be published once and never replaced. It can be withdrawn (deleted) by the coach. It
  survives later edits and deletion of the play.
- **Access.** Plays, revisions and snapshots are readable and writable by the team's owner only. Listed team
  members, other coaches and signed-out visitors are denied. There is no public or player access; that needs the
  access-model review first.
- **Server-side boundary.** The project is on the Spark plan with no server code in this path, so the Firestore
  rules are the enforcement point. They are covered by emulator tests, including denial cases.

### Size and growth

| Item | Size |
|---|---|
| Typical play (11 players, 5 routes, full defense, notes) | 3–4 KB (asserted under 8 KB in tests) |
| Hard limit per play (`LIMITS.bytes`) | 64 KB |
| History per play at retention 25 | about 100 KB typical |
| 300-play playbook with full history | about 30 MB |
| Firestore document limit | 1 MiB (a revision copy or snapshot holds one play, so at most ~64 KB) |
| Writes per save | 2, or 3 when pruning (transaction limit is 500) |
| Rule document reads per save | 3 (limit 20 for a multi-document commit) |

On the free plan (1 GiB) that is room for roughly 30 full playbooks with maximum history. If that becomes a
constraint, lower `REVISION_RETENTION`; published snapshots are unaffected.

## 4. Migration

`migratePlayToV4(raw, sourceId)` is pure and deterministic, never modifies its input, and never rewrites a stored
play. Saving the result creates a **new** v4 document with:

```
provenance: { origin: 'migrated', fromSchemaVersion: 2 | 3, sourceId, interpretation: 'cc-interp@1',
              migration: 'v4-migrate@1', sourceStatus? }
```

**Historical interpretation.** Old plays do not record how they were drawn. Git history shows the route shapes
and the slot-resolution logic had exactly one version from the first possible v2 play (2026-11-01) to v4, so there
is one historical interpretation, frozen as `cc-interp@1` in `interpretations/v1.ts`. Migration uses that frozen
copy and never the live library. A test proves that, for every library concept on every library formation, the
migrated play draws exactly what the old renderer drew. If the old behaviour is ever found to have varied, add a
second interpretation and select by date; do not edit the frozen file.

**Outcomes.**

| Input | Result |
|---|---|
| v2 / v3, everything binds | `ok` |
| v2 / v3 with an assignment that cannot be bound with certainty (slot not in the formation, route that did not exist, unusable depth, second route for one player, line position held by two players) | `ok`, with that assignment preserved under `unresolved` and a warning finding. It is not drawn. |
| Damaged formation, unknown coordinate profile, damaged v3 | `unsupported` |
| Version-1 pixel drawing, unknown version | `unsupported` |

Existing v2 and v3 plays stay readable: `loadPlayDocsV4` converts them in memory and flags them so the editor
saves them as new plays. The rules forbid changing `schemaVersion` in place.

## 5. Acceptance tests

`src/football-core/__tests__/playDocumentV4.test.ts`

| Test | Requirement |
|---|---|
| AT-1 | Stable, persistent player identity; ids never reused. |
| AT-2 | Roles and labels are not assignment keys. |
| AT-3 | Moving players never moves a route to another player (v2 defect reproduced, then shown absent). |
| AT-4 | Geometry survives route-library edits and deletions. |
| AT-5 | Save and reload returns the same play. |
| AT-6 | Migration is pure, deterministic and records provenance. |
| AT-7 | Unsupported or ambiguous input is never guessed. |
| AT-8 | Migrated plays draw exactly what the old renderer drew. |
| AT-9 | Offensive and defensive alignment are both stored. |
| AT-10 | Explicit, versioned coordinate, field and rule profiles. |
| AT-11 | One resolved geometry for every renderer. |

`src/features/playbook2/__tests__/playStoreV4.test.ts` covers atomic saves, conflicts, retention, non-destructive
migration, history, deletion and publishing against an in-memory store.
`rules-tests/firestore.v4.rules.test.ts` covers the same guarantees, and the denials, against the emulator.

## 6. Dependency register

| Consumer | Depends on | State |
|---|---|---|
| Package 3 editor (route editing, duplicate, delete, print) | `PlayDocV4`, `resolveGeometry`, `playStoreV4` | Not started; the editor still reads v2/v3. |
| Package 4 football checks | `formationOf(play)` feeds the existing legality and eligibility checks | Available. |
| Package 5 timeline and 2D playback | `resolveGeometry` | Not started. |
| Package 5 advisory | Must send a v4 play, never mutate one | Not started. |
| 3D experiment (#95) | Must be ported to `resolveGeometry`; its own pixel model is not canonical | Not started. |
| Security PRs #123 / #128 | Also edit `firestore.rules` (plays `status` guard). v4 has no `status`, so the changes are compatible but will conflict textually; whichever merges second needs a rebase and a rules-test run. | Open. |
| Production | No v4 write reaches production until the rules in this branch are released through the approved rules gate. | Blocked on owner approval. |

## 7. Not in this change

Editor wiring, route-editing UI, print, playback, roster links, player or public access to published plays, and
any production deployment.
