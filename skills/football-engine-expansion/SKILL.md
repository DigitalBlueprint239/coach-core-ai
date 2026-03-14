# Football Engine Expansion Skill

## Purpose

Guides the expansion of Coach Core AI's football engine — formations, routes, concepts, timing rules, and spacing rules. Documents current counts, file locations, and the correct patterns for adding new engine data.

---

## Current Engine State

### File Locations

| Data | File Path | Format |
|------|-----------|--------|
| Formations | `src/components/SmartPlaybook/components/FormationTemplates.js` | JS array of formation objects |
| Routes (presets) | `src/components/SmartPlaybook/components/RouteEditor.js` | PRESET_ROUTES array |
| Firestore Schema | `src/types/firestore-schema.ts` (639 lines) | TypeScript interfaces |
| AI Analysis | `src/ai-brain/core/AIBrain.ts` (1,188 lines) | AIBrain singleton service |

### Current Counts

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| Formations | 4 (Shotgun, 4-3, I-Formation, 3-4) | 53 (34 OFF / 17 DEF / 2 ST) | 49 |
| Routes | 7 (Slant, Post, Corner, Out, In, Hitch, Go) | 18 | 11 |
| Concepts | 0 | 15 | 15 |
| Timing rules | 0 | TBD | All |
| Spacing rules | 0 | TBD | All |

### Current Routes (7 of 18)

Present in `RouteEditor.js` PRESET_ROUTES:
1. Slant
2. Post
3. Corner
4. Out
5. In
6. Hitch
7. Go

### Missing Routes (11 — Next Expansion Targets)

1. Curl
2. Comeback
3. Drag
4. Wheel
5. Flat
6. Seam
7. Shallow Cross
8. Option
9. Bubble Screen
10. Dig
11. Fade

### Current Formations (4 of 53)

Present in `FormationTemplates.js`:
1. Shotgun (OFF)
2. I-Formation (OFF)
3. 4-3 Defense (DEF)
4. 3-4 Defense (DEF)

### Missing Concepts (15 — All TO BUILD)

No concept detection engine exists yet. Target concepts:
1. Smash
2. Mesh
3. Flood
4. Y-Cross
5. Mills
6. Drive
7. Spacing
8. Four Verts
9. Curl-Flat
10. Sail
11. Snag
12. Levels
13. Dagger
14. Hoss
15. Seattle

---

## Files That Do NOT Exist Yet (TO BUILD)

| File | Purpose | Priority |
|------|---------|----------|
| `src/services/conceptDetection.ts` | Detect passing concepts from route combinations | P2 — Moat feature foundation |
| `src/services/formationService.ts` | Typed formation data service (replace JS array) | P4 |
| `src/services/routeDefinitions.ts` | Typed route definitions service | P4 |
| `src/services/conceptService.ts` | Concept data and metadata | P4 |
| `src/services/spacingEngine.ts` | Spacing rule validation | Future |
| `src/services/timingEngine.ts` | Timing rule validation | Future |

These files are confirmed gaps — not broken features, just not built yet. Do not reference them as existing.

---

## Route Definition Pattern

When adding routes, follow the existing pattern in `RouteEditor.js`:

```javascript
{
  id: 'route-name',        // lowercase kebab-case
  name: 'Route Name',      // Display name
  points: [                // Waypoints in relative coordinates
    { x: 0, y: 0 },       // Origin (player position)
    { x: 20, y: -10 },    // Intermediate waypoint
    { x: 40, y: -30 }     // Terminal waypoint
  ]
}
```

**Rules:**
- Points use relative coordinates from the player's starting position
- Negative Y = upfield (toward opponent's end zone)
- Positive X = toward the right sideline
- Routes must have at least 2 points (origin + terminal)
- Breaking routes (Post, Corner, Comeback) have 3+ points

---

## Formation Definition Pattern

When adding formations, follow the existing pattern in `FormationTemplates.js`:

```javascript
{
  id: 'formation-id',           // lowercase kebab-case
  name: 'Formation Name',       // Display name
  description: 'Brief description',
  icon: Users,                   // lucide-react icon (Users for OFF, Shield for DEF)
  color: 'blue',                 // Theme color
  positions: ['QB', 'RB', ...]  // 11 position labels
}
```

**Rules:**
- Every formation must have exactly 11 positions
- Offensive formations use `Users` icon, defensive use `Shield`
- Position labels must match standard football abbreviations

---

## Concept Detection Pattern (TO BUILD)

When `conceptDetection.ts` is built, it should:
1. Accept an array of assigned routes
2. Match route combinations against known concept templates
3. Return detected concept(s) with confidence score
4. Account for formation context (e.g., trips vs. spread)

**Architecture constraint:** Concept detection is the foundation for AI coverage recommendations. Build it as a pure function — no side effects, no API calls.

---

## Schema Integration

The Firestore schema (`src/types/firestore-schema.ts`, 639 lines) defines types for plays, formations, and routes. Any new engine data types must be added here to maintain type safety across persistence.

---

## Pre-Session Checks for Engine Work

```bash
# Verify current formation count
grep -c "id:" src/components/SmartPlaybook/components/FormationTemplates.js

# Verify current route count
grep -c "id:" src/components/SmartPlaybook/components/RouteEditor.js | head -1

# Verify schema integrity
wc -l src/types/firestore-schema.ts

# Check for concept detection (should not exist yet)
ls src/services/conceptDetection.ts 2>/dev/null || echo "NOT BUILT YET"
```

---

## Expansion Priority Order

1. **Routes to 18** — Add 11 missing routes to PRESET_ROUTES in RouteEditor.js
2. **Formations to 53** — Expand FormationTemplates.js (34 OFF / 17 DEF / 2 ST)
3. **Concept detection engine** — New file: `src/services/conceptDetection.ts`
4. **Concepts to 15** — New file: `src/services/conceptService.ts`
5. **Timing rules** — New file: `src/services/timingEngine.ts`
6. **Spacing rules** — New file: `src/services/spacingEngine.ts`

Each expansion must include corresponding test coverage. Test count must never decrease.
