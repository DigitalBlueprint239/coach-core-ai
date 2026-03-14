# Football Engine Expansion Skill

## Purpose

Guides the expansion of Coach Core Smart Playbook's football engine — formations, routes, concepts, timing rules, and spacing rules. Documents current counts, file locations, and the correct patterns for adding new engine data.

---

## Current Engine State

### File Locations

| Data | File Path | Lines | Format |
|------|-----------|-------|--------|
| Formations | `src/services/formationService.ts` | — | TypeScript service, 53 formations |
| Routes | `src/services/routeDefinitions.ts` | — | TypeScript definitions, 13 routes |
| Concepts | `src/services/conceptService.ts` | — | TypeScript service, 7 concepts |
| Firestore Schema | `src/services/firebase/schema.ts` | 639 | TypeScript interfaces |
| AI Analysis | `src/services/ai/AIBrain.ts` | 1,188 | AIBrain singleton service |

### Current Counts

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| Formations | **53** (34 OFF / 17 DEF / 2 ST) | 53 | 0 — Complete |
| Routes | **13** | 18 | 5 |
| Concepts | **7** | 15 | 8 |
| Timing rules | **0** | TBD | All |
| Spacing rules | **0** | TBD | All |
| Concept detection | **0** | 1 engine | Not built |

---

## Routes: Current 13 and 5 Missing

### Existing Routes (in `src/services/routeDefinitions.ts`)

Verified by routeService.test.ts (7 tests passing). All 13 routes have required fields.

### Missing Routes (5 — Next Expansion Targets)

1. **Hitch** — Short comeback route, 5-yard depth
2. **Seam** — Vertical route between hash and numbers
3. **Shallow Cross** — Underneath crosser, 3-5 yard depth
4. **Option** — Stem route with read-based break
5. **Bubble Screen** — Lateral throw behind LOS

---

## Concepts: Current 7 and 8 Missing

### Existing Concepts (in `src/services/conceptService.ts`)

7 passing concepts verified by tests.

### Missing Concepts (8 — Next Expansion Targets)

1. **Y-Cross** — Deep crosser with underneath clear-out
2. **Mills** — Two-man concept: post + dig
3. **Drive** — Three-level concept: deep out, dig, drag
4. **Spacing** — Five-man horizontal stretch
5. **Four Verts** — Four vertical stems with option breaks
6. **Curl-Flat** — High-low concept: curl + flat
7. **Sail** — Three-level: go, corner, flat
8. **Snag** — Triangle concept: corner, snag, flat

---

## Formations: Current 53 (Complete)

**In `src/services/formationService.ts`:**
- 34 Offensive formations
- 17 Defensive formations
- 2 Special Teams formations

Verified by formationService.test.ts (9 tests passing). All 53 formations load with clean types.

---

## Files That Do NOT Exist Yet (TO BUILD)

| File | Purpose | Priority |
|------|---------|----------|
| `src/services/conceptDetection.ts` | Detect passing concepts from route combinations | P2 — Moat feature foundation |
| `src/services/spacingEngine.ts` | Spacing rule validation | Future |
| `src/services/timingEngine.ts` | Timing rule validation | Future |

These are confirmed gaps — not bugs, not broken features, just not built. Do not reference them as existing files.

---

## Adding Routes — Correct Pattern

New routes must be added to `src/services/routeDefinitions.ts` following the existing pattern:

**Rules:**
- Every route must have all required fields verified by routeService.test.ts
- Points use relative coordinates from the player's starting position
- Negative Y = upfield (toward opponent's end zone)
- Positive X = toward the right sideline
- Routes must have at least 2 waypoints (origin + terminal)
- Breaking routes (Post, Corner, Comeback) have 3+ waypoints
- Add corresponding test coverage in routeService.test.ts

---

## Adding Concepts — Correct Pattern

New concepts must be added to `src/services/conceptService.ts` following the existing pattern:

**Rules:**
- Each concept defines the route combination that triggers it
- Concepts reference routes by their ID from routeDefinitions.ts
- Must include formation context (which formations the concept applies to)
- Add corresponding test coverage

---

## Concept Detection Engine (TO BUILD — Priority 2)

When `conceptDetection.ts` is built, it should:
1. Accept an array of assigned routes from the current play
2. Match route combinations against known concept templates from conceptService.ts
3. Return detected concept(s) with confidence score
4. Account for formation context (e.g., trips vs. spread)

**Architecture constraint:** Concept detection is the foundation for AI coverage recommendations (Priority 5). Build it as a pure function — no side effects, no API calls. AIBrain.ts will consume it.

**Dependency chain:**
```
conceptService.ts (data, EXISTS)
    → conceptDetection.ts (engine, TO BUILD)
        → AIBrain.ts coverage recommendations (Priority 5)
```

---

## Schema Integration

The Firestore schema at `src/services/firebase/schema.ts` (639 lines) defines types for plays, formations, and routes. Any new engine data types must be consistent with this schema to maintain type safety across persistence.

The whole-document pattern means no field-level adapters are needed — the local Playbook type maps directly to the Firestore document structure.

---

## Pre-Session Checks for Engine Work

```bash
# Verify correct repo first
ls src/hooks/useHistory.ts && echo "CORRECT REPO" || echo "WRONG REPO — STOP"

# Formation count — must be 53 formations across service
grep -c "formation" src/services/formationService.ts || echo "CHECK MANUALLY"

# Route definitions exist
ls src/services/routeDefinitions.ts && echo "EXISTS" || echo "MISSING"

# Concept service exists
ls src/services/conceptService.ts && echo "EXISTS" || echo "MISSING"

# Concept detection engine (should not exist yet)
ls src/services/conceptDetection.ts 2>/dev/null || echo "NOT BUILT YET — Expected"

# Run engine-related tests
npm run test -- --run 2>&1 | grep -E "formation|route|concept"

# Full test suite baseline
npm run test -- --run 2>&1 | tail -5
```

---

## Expansion Priority Order

| Priority | Task | Files Involved | Tests Required |
|----------|------|---------------|----------------|
| 1 | Add 5 missing routes to reach 18 | `src/services/routeDefinitions.ts` | Update routeService.test.ts |
| 2 | Build concept detection engine | New: `src/services/conceptDetection.ts` | New test suite |
| 3 | Add 8 missing concepts to reach 15 | `src/services/conceptService.ts` | Update concept tests |
| 4 | Implement timing rules | New: `src/services/timingEngine.ts` | New test suite |
| 5 | Implement spacing rules | New: `src/services/spacingEngine.ts` | New test suite |

**Invariant:** Test count must never decrease below 60. Every expansion adds tests.
