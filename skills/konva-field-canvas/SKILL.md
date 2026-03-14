# Konva Field Canvas Skill

## Purpose

Guides development and maintenance of the football field canvas — the core visual component where coaches design plays. Built with Konva (React-Konva). Documents component paths, coordinate systems, interaction patterns, and rendering architecture in the Coach-Core-Smart-Playbook- repo.

---

## Component Locations

| Component | Path | Purpose |
|-----------|------|---------|
| FieldCanvas | `src/components/FieldCanvas.tsx` | Main Konva canvas — field rendering, player placement, route drawing |
| DesignPanel | `src/components/DesignPanel.tsx` | Route/formation design sidebar |
| CoverageAnalysisPanel | `src/components/CoverageAnalysisPanel.tsx` | Shell — wired to AIBrain |
| GamePlanPanel | `src/components/GamePlanPanel.tsx` | Shell — wired to AIBrain |
| SituationalPlayCallerPanel | `src/components/SituationalPlayCallerPanel.tsx` | Shell — wired to AIBrain |
| PlaybookContext | `src/contexts/PlaybookContext.tsx` | Main state — uses useHistory hook |
| UIContext | `src/contexts/UIContext.tsx` | UI state + lazy GSAP loading |
| AppErrorBoundary | `src/components/AppErrorBoundary.tsx` | Error boundary wrapping entire app |

---

## Coordinate System

### Field Configuration

Field dimensions derive from a `fieldConfig` object. Key constants:

- `FIELD_CENTER_X` — **derived from fieldConfig, never hardcoded**
- Yard-to-pixel conversion via a `yardToPx` constant/function

**Critical rule:** Verify actual constant names in the codebase match what you reference. The handoff documents `FIELD_DIM` and `DEFAULTS.yardToPx` as naming patterns — confirm against the actual FieldCanvas.tsx implementation before using.

### Storage vs. Rendering

| What | Stored As | Rendered As |
|------|-----------|-------------|
| Player positions | Yards (relative to field) | Pixels (converted at render) |
| Route waypoints | Yards (relative to player origin) | Pixels (converted at render) |
| Field markings | Field config constants | Pixels (derived from config) |

**Rules:**
- Store in yards, convert at render — never store pixel values in state or Firestore
- Negative Y = upfield (toward opponent's end zone)
- Positive X = toward the right sideline
- All conversions happen in the rendering layer, not in state management

---

## Touch Interaction (Mobile Support)

### Minimum Requirements

| Interaction | Requirement |
|-------------|-------------|
| Hit targets | **44px minimum** (Apple HIG compliance) |
| Pinch-to-zoom | Supported on canvas area via two-finger gesture |
| Long-press | Context menu / player selection (~500ms threshold) |
| Drag | Player repositioning with visual feedback |
| Double-tap | Quick actions (e.g., toggle player type) |

### Touch Architecture Rules

- Touch events are handled separately from mouse events — no unified handler that breaks either
- Touch targets must be at least 44x44 pixels for accessibility
- Pinch-to-zoom uses two-finger gesture detection on the Konva Stage
- Long-press threshold: ~500ms before triggering context action
- Drag operations provide visual feedback during movement
- `{ commit: false }` on useHistory during drag — only commit on drop

---

## Rendering Architecture

### Layer Structure (Konva Layers)

1. **Field Layer** — Static field markings (yard lines, hash marks, sidelines, end zones)
2. **Formation Layer** — Player positions (draggable Konva nodes)
3. **Route Layer** — Route paths and waypoints (Konva Lines + circles)
4. **Preview Layer** — Ephemeral preview elements (hover states, drag ghosts, route drawing preview)

### PreviewLayer Rules (Critical)

The PreviewLayer is **ephemeral** — nothing from it ever reaches PlaybookContext state.

**Correct uses:**
- Hover highlight on player nodes
- Drag ghost during repositioning
- Route drawing preview (line follows cursor before commit)
- Formation placement preview before confirming

**Forbidden:**
- Writing preview state to PlaybookContext
- Persisting preview data to Firestore
- Reading preview state in other components
- Using preview layer for any permanent visual element

---

## State Flow

```
formationService.ts (53 formations)
    ↓
PlaybookContext.tsx (useHistory hook)
    ↓
FieldCanvas.tsx (Konva render)
    ↕
DesignPanel.tsx (route/formation selection)
    ↓
routeDefinitions.ts (13 routes) + conceptService.ts (7 concepts)
```

**PlaybookContext** is the single source of truth for the current play state. It uses the `useHistory` hook for undo/redo. FieldCanvas reads from context and dispatches updates through context setters.

---

## Interaction Patterns

### Player Drag

1. `onDragStart` → visual feedback (highlight, shadow)
2. `onDragMove` → update preview position, `setState({ commit: false })`
3. `onDragEnd` → commit final position, `setState({ commit: true })`

### Route Drawing

1. Click player → enter route drawing mode
2. Click waypoints on field → add to route path (preview layer)
3. Double-click or press Enter → commit route to state
4. Escape → cancel, clear preview

### Formation Loading

1. Select formation from DesignPanel
2. Formation loads all 11 player positions from formationService.ts
3. State update with `commit: true` — undoable action
4. Previous state enters undo history

---

## Bundle Considerations

- **Konva** has its own vendor chunk (`vendor-konva`) via `vite.config.ts` manualChunks
- **GSAP** is lazily imported in `UIContext.tsx` — only loads when a coach triggers play animation
- **react-dnd** has its own vendor chunk (`vendor-react-dnd`)

Do not convert lazy imports to static. Do not merge vendor chunks.

---

## Pre-Session Checks for Canvas Work

```bash
# Verify correct repo
ls src/hooks/useHistory.ts && echo "CORRECT REPO" || echo "WRONG REPO — STOP"

# Verify canvas components exist
ls src/components/FieldCanvas.tsx
ls src/components/DesignPanel.tsx
ls src/contexts/PlaybookContext.tsx

# Check for hardcoded field center (forbidden)
grep -n "FIELD_CENTER_X.*=" src/components/FieldCanvas.tsx

# Check pixel values in state (forbidden pattern)
grep -n "px\|pixel" src/contexts/PlaybookContext.tsx || echo "Clean — no pixel values in state"

# Full test suite
npm run test -- --run 2>&1 | tail -5
```

---

## Forbidden Patterns

| Pattern | Why It's Wrong | Correct Alternative |
|---------|---------------|-------------------|
| Hardcoded `FIELD_CENTER_X = 300` | Breaks on resize / different field sizes | Derive from `fieldConfig` |
| Storing pixel values in PlaybookContext | Breaks zoom, responsive, export | Store yards, convert at render |
| Preview data in PlaybookContext | Pollutes undo history + Firestore | Keep in FieldCanvas local state only |
| Static import of GSAP | Bloats initial bundle by ~50 kB | Lazy import in UIContext.tsx |
| `onDragMove` with `commit: true` | Creates undo entry per pixel of movement | Use `commit: false` during drag, `true` on drop |
| Touch handler that replaces mouse handler | Breaks desktop experience | Handle touch and mouse separately |
