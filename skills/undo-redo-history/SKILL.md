# Undo/Redo History Skill

## Purpose

Documents the undo/redo implementation in Coach Core AI. This is a **hook-based** implementation — NOT a reducer. Any guidance referencing reducer cases, action types, or dispatch calls does not apply to this codebase.

---

## Implementation Location

| What | Path | Status |
|------|------|--------|
| History hook | `src/hooks/useHistory.ts` | **TO BUILD** — not yet implemented |
| Keyboard shortcuts | `src/hooks/useKeyboardShortcuts.ts` | **TO BUILD** — not yet implemented |
| SmartPlaybook (consumer) | `src/components/SmartPlaybook/SmartPlaybook.tsx` | Exists (703 lines) — no undo/redo wired yet |

### Current State

The `useHistory` hook does **not exist yet** in this codebase. It is a planned implementation from the merged Coach-Core-Smart-Playbook architecture. This skill documents the **target architecture** for when it is built.

---

## Target Architecture: useHistory Hook

### API Surface

```typescript
function useHistory<T>(initialState: T): {
  state: T;                              // Current state
  setState: (newState: T | ((prev: T) => T), options?: { commit?: boolean }) => void;
  undo: () => void;                      // Revert to previous state
  redo: () => void;                      // Re-apply reverted state
  canUndo: boolean;                      // Whether undo is available
  canRedo: boolean;                      // Whether redo is available
}
```

### Key Behaviors

1. **History cap:** `MAX_HISTORY = 50` — enforced via `.slice(-MAX_HISTORY)` on every push to the `past` array
2. **Commit control:** `setState(value, { commit: false })` updates state WITHOUT creating a history entry — used for minor changes (drag previews, hover states)
3. **localStorage exclusion:** `past` and `future` arrays live in React state ONLY — they are never serialized to localStorage or Firestore
4. **Redo invalidation:** Any new committed state change clears the `future` array

### State Flow

```
User action (commit: true)
  → Push current state to past[]
  → Clear future[]
  → Apply new state

User action (commit: false)
  → Apply new state only
  → past[] and future[] unchanged

Undo
  → Push current state to future[]
  → Pop from past[] → becomes current state

Redo
  → Push current state to past[]
  → Pop from future[] → becomes current state
```

---

## When to Use `commit: false`

| Scenario | commit | Why |
|----------|--------|-----|
| Player drag in progress | `false` | Visual feedback only, not a design decision |
| Route waypoint hover | `false` | Ephemeral preview |
| Player drag completed (drop) | `true` | Intentional position change |
| Route assigned to player | `true` | Design decision |
| Formation loaded | `true` | Major state change |
| Auth-triggered playbook hydration | `false` | Loading persisted data, not a user action |

---

## Keyboard Shortcuts (Target)

When `useKeyboardShortcuts.ts` is built:

| Shortcut | Action | Platform |
|----------|--------|----------|
| `Ctrl+Z` / `Cmd+Z` | Undo | Windows / Mac |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo | Windows / Mac |
| `Ctrl+Y` / `Cmd+Y` | Redo (alternate) | Windows / Mac |

**Implementation notes:**
- Listen on `keydown`, not `keyup`
- Use `event.metaKey` for Mac, `event.ctrlKey` for Windows
- `event.preventDefault()` to avoid browser default undo behavior
- Only active when canvas/playbook has focus (not in text inputs)

---

## Forbidden Patterns

| Pattern | Why It's Wrong | What To Do |
|---------|---------------|------------|
| Reducer with action types | Over-engineered for this use case | Use the `useHistory` hook |
| `dispatch({ type: 'UNDO' })` | Reducer pattern — does not exist here | Call `undo()` directly |
| Writing `past[]` to localStorage | Bloats storage, breaks on refresh | Keep in React state only |
| Serializing `future[]` to Firestore | Same problem, worse (network cost) | Keep in React state only |
| Removing the 50-entry cap | Memory leak on long sessions | Keep `MAX_HISTORY = 50` |
| Using `useReducer` for history | Mixes concerns, harder to maintain | `useHistory` hook separates history logic cleanly |

---

## Integration with PlaybookContext

When both `useHistory` and `PlaybookContext` are built, the integration should look like:

```typescript
// In PlaybookContext.tsx
const { state: playbook, setState: setPlaybook, undo, redo, canUndo, canRedo } =
  useHistory<Playbook>(initialPlaybook);

// Expose undo/redo through context
<PlaybookContext.Provider value={{
  playbook,
  setPlaybook,
  undo,
  redo,
  canUndo,
  canRedo
}}>
```

---

## Testing Requirements

When `useHistory.ts` is built, tests must cover:

1. **Basic undo/redo cycle** — set → undo → verify previous state → redo → verify restored state
2. **History cap at 50** — push 60 states, verify `past.length <= 50`
3. **`commit: false` exclusion** — verify no-commit changes don't create history entries
4. **Redo invalidation** — undo → new commit → verify redo is unavailable
5. **Empty history guards** — undo with empty past → no error, state unchanged
6. **localStorage exclusion** — verify `past`/`future` not present in any serialized output

---

## Pre-Session Checks

```bash
# Check if useHistory exists yet
ls src/hooks/useHistory.ts 2>/dev/null || echo "NOT BUILT YET"

# Check if keyboard shortcuts exist yet
ls src/hooks/useKeyboardShortcuts.ts 2>/dev/null || echo "NOT BUILT YET"

# Check current hooks
ls -la src/hooks/

# Verify SmartPlaybook doesn't have stale reducer references
grep -n "useReducer\|dispatch.*UNDO\|dispatch.*REDO" src/components/SmartPlaybook/SmartPlaybook.tsx || echo "Clean — no reducer pattern"
```

---

## Build Priority

The `useHistory` hook is a prerequisite for:
1. **Flip / Mirror Play** (Priority 1 feature) — needs undo support for destructive operations
2. **Concept Detection** (Priority 2 feature) — route changes need undo capability
3. **Any drag-and-drop work** — needs `commit: false` for drag previews

Build `useHistory.ts` before starting feature work that involves state mutations.
