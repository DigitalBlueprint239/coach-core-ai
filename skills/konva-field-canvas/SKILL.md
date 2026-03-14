# Konva Field Canvas Skill

## Purpose

Guides development and maintenance of the football field canvas — the core visual component where coaches design plays. Documents component paths, coordinate systems, interaction patterns, and rendering architecture.

---

## Component Paths

| Component | Path | Lines | Purpose |
|-----------|------|-------|---------|
| SmartPlaybook | `src/components/SmartPlaybook/SmartPlaybook.tsx` | 703 | Main playbook component, state orchestration |
| TouchOptimizedPlaybook | `src/components/SmartPlaybook/TouchOptimizedPlaybook.tsx` | 658 | Touch-optimized variant for mobile |
| CanvasArea | `src/components/SmartPlaybook/components/CanvasArea.tsx` | 719 | Canvas rendering layer |
| FormationTemplates | `src/components/SmartPlaybook/components/FormationTemplates.js` | JS | Formation quick-load UI |
| RouteEditor | `src/components/SmartPlaybook/components/RouteEditor.js` | JS | Route editing interface |
| RouteControls | `src/components/SmartPlaybook/components/RouteControls.js` | JS | Route drawing controls |
| PlayerControls | `src/components/SmartPlaybook/components/PlayerControls.js` | JS | Player manipulation UI |
| SavePlayDialog | `src/components/SmartPlaybook/components/SavePlayDialog.tsx` | 3213 | Save/load dialog |
| Field | `src/components/SmartPlaybook/Field.js` | JS | Base field rendering |
| PlayController | `src/components/SmartPlaybook/PlayController.js` | JS | Play animation controller |

---

## Coordinate System

### Field Dimensions

The field canvas uses a coordinate system mapping football field dimensions to pixel space. Key constants are defined within the SmartPlaybook and CanvasArea components.

**Rules:**
- Player positions and route waypoints are stored in **relative coordinates** (not absolute pixels)
- Conversion to pixels happens at render time
- Field center X is derived from field configuration — **never hardcoded**
- Negative Y = upfield (toward opponent's end zone)

### Coordinate Conversion

When working with the canvas:
1. Store positions in yards/relative units
2. Convert to pixels only in the rendering layer (CanvasArea)
3. Never store pixel values in state or persistence

---

## Touch Interaction (Mobile Support)

The `TouchOptimizedPlaybook.tsx` (658 lines) provides mobile-optimized interactions:

### Minimum Requirements

| Interaction | Requirement |
|-------------|-------------|
| Hit targets | 44px minimum (Apple HIG compliance) |
| Pinch-to-zoom | Supported on canvas area |
| Long-press | Context menu / player selection |
| Drag | Player repositioning with visual feedback |
| Double-tap | Quick actions (e.g., toggle player type) |

### Touch Architecture

- Touch events are handled separately from mouse events
- Touch targets must be at least 44x44 pixels for accessibility
- Pinch-to-zoom uses two-finger gesture detection
- Long-press threshold: ~500ms before triggering context action
- Drag operations provide haptic/visual feedback during movement

---

## Rendering Architecture

### Layer Structure

The canvas uses a layered rendering approach:

1. **Field Layer** — Static field markings (yard lines, hash marks, sidelines)
2. **Formation Layer** — Player positions (draggable)
3. **Route Layer** — Route paths and waypoints
4. **Preview Layer** — Ephemeral preview elements (hover states, drag previews)

### Preview Layer Rules

The Preview Layer is **ephemeral** — nothing from it ever reaches persisted state.

**Correct:**
- Preview hover highlights
- Drag ghost rendering
- Route drawing preview (before commit)

**Forbidden:**
- Writing preview state to context
- Persisting preview data to Firestore
- Using preview layer for permanent visual elements

---

## Player Rendering

### Player Types

Players are rendered with position-specific styling:
- Offensive players: Circles with position labels
- Defensive players: Distinct shape/color scheme
- Routes: Lines with directional arrows

### Player Interaction

1. **Select** — Click/tap a player to select
2. **Drag** — Move player to reposition
3. **Route assign** — Draw or apply preset route
4. **Delete** — Remove player from formation

---

## SmartPlaybook State Flow

```
FormationTemplates → SmartPlaybook (state) → CanvasArea (render)
                          ↓
                    RouteEditor ←→ RouteControls
                          ↓
                    SavePlayDialog → Firestore
```

State is managed in `SmartPlaybook.tsx` and passed down to child components. The canvas (CanvasArea) is a pure rendering layer.

---

## Pre-Session Checks for Canvas Work

```bash
# Verify SmartPlaybook components exist
ls -la src/components/SmartPlaybook/SmartPlaybook.tsx
ls -la src/components/SmartPlaybook/TouchOptimizedPlaybook.tsx
ls -la src/components/SmartPlaybook/components/CanvasArea.tsx

# Check for @ts-nocheck (these files currently have them — track reduction)
grep -l "@ts-nocheck" src/components/SmartPlaybook/*.tsx src/components/SmartPlaybook/components/*.tsx 2>/dev/null

# Check component line counts
wc -l src/components/SmartPlaybook/SmartPlaybook.tsx src/components/SmartPlaybook/TouchOptimizedPlaybook.tsx src/components/SmartPlaybook/components/CanvasArea.tsx
```

---

## Forbidden Patterns

| Pattern | Why It's Wrong | Correct Alternative |
|---------|---------------|-------------------|
| Hardcoded field center X | Breaks on resize/different field sizes | Derive from `fieldConfig` |
| Storing pixel values in state | Breaks zoom/responsive | Store yards, convert at render |
| Preview data in persistent state | Pollutes undo history + Firestore | Keep preview in local component state only |
| Static imports of animation libs | Bloats initial bundle | Dynamic import (e.g., `import()`) |
| Inline styles for field elements | Inconsistent rendering | Use theme/constants |

---

## Testing Canvas Components

Canvas tests should:
1. Mock the canvas rendering context (Konva/HTML5 Canvas)
2. Test state changes, not pixel output
3. Verify coordinate conversions with unit tests
4. Test touch interactions with synthetic touch events
5. Never assert on visual rendering (snapshot tests are brittle for canvas)

---

## Known Issues

1. `SmartPlaybook.tsx` and `TouchOptimizedPlaybook.tsx` currently have `@ts-nocheck` — these need TypeScript migration in a future session
2. Several SmartPlaybook sub-components are `.js` files — migration to `.ts`/`.tsx` is tracked as future work
3. `SavePlayDialog.tsx` is 3,213 lines — candidate for decomposition in a future session
