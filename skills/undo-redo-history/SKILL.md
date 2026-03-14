# Undo/Redo History Skill

## Purpose

Documents the undo/redo system in Coach Core Smart Playbook. This is a **hook-based** implementation — fully built and tested. NOT a reducer. Any guidance referencing reducer cases, action types, or dispatch calls does not apply to this codebase.

---

## Implementation Status: FULLY BUILT AND TESTED

| What | Path | Status |
|------|------|--------|
| History hook | `src/hooks/useHistory.ts` | **Built** — fully implemented and working |
| History tests | `useHistory.test.ts` | **11 tests passing** |
| Consumer | `src/contexts/PlaybookContext.tsx` | **Built** — uses useHistory hook for state management |
| Keyboard shortcuts | Wired in `useKeyboardShortcuts.ts` | **Built** — Ctrl+Z / Cmd+Z |

---

## API Surface

```typescript
function useHistory<T>(initialState: T): {
  state: T;                              // Current state value
  setState: (
    newState: T | ((prev: T) => T),
    options?: { commit?: boolean }
  ) => void;                             // Update state, optionally skip history
  undo: () => void;                      // Revert to previous state
  redo: () => void;                      // Re-apply reverted state
  canUndo: boolean;                      // true if past[] is non-empty
  canRedo: boolean;                      // true if future[] is non-empty
}
```

The hook is generic — `useHistory<T>` works with any state type. PlaybookContext uses it as `useHistory<Playbook>`.

---

## Core Behaviors

### History Cap: MAX_HISTORY = 50

Every push to `past[]` is capped via `.slice(-MAX_HISTORY)`. This prevents memory leaks during long design sessions.

**Do not remove this cap.** A coach designing plays for 2 hours could generate hundreds of state changes without it.

### Commit Control: `{ commit: false }`

The `commit` option controls whether a state change creates a history entry:

```typescript
// Creates a history entry — undoable
setState(newPlaybook, { commit: true });   // default behavior
setState(newPlaybook);                      // same — commit defaults to true

// Does NOT create a history entry — silent update
setState(newPlaybook, { commit: false });
```

### localStorage Exclusion

`past[]` and `future[]` arrays are stored in **React state only**. They are never:
- Written to localStorage
- Serialized to Firestore
- Included in any persistence operation
- Passed to savePlaybookToCloud

Only the current `state` value is persisted. History is session-only.

### Redo Invalidation

Any new committed state change clears the `future[]` array. Once you make a new change after undoing, you cannot redo back to the abandoned branch.

---

## State Machine

```
                    commit: true
User Action ──────────────────────→ Push current to past[]
                                    Clear future[]
                                    Apply new state

                    commit: false
User Action ──────────────────────→ Apply new state only
                                    past[] unchanged
                                    future[] unchanged

Undo ─────────────────────────────→ Push current to future[]
                                    Pop from past[] → current state

Redo ─────────────────────────────→ Push current to past[]
                                    Pop from future[] → current state
```

---

## When to Use `commit: false`

| Scenario | commit | Why |
|----------|--------|-----|
| Player drag in progress (onDragMove) | `false` | Visual feedback only — not a design decision |
| Route waypoint hover preview | `false` | Ephemeral preview |
| Player drag completed (onDragEnd) | `true` | Intentional position change |
| Route assigned to player | `true` | Design decision |
| Formation loaded from formationService | `true` | Major state change |
| Auth-triggered playbook hydration | `false` | Loading persisted data — not a user action |
| Flip/mirror play | `true` | Destructive transformation — must be undoable |

---

## Keyboard Shortcuts

Wired in `useKeyboardShortcuts.ts`:

| Shortcut | Action | Platform |
|----------|--------|----------|
| `Ctrl+Z` | Undo | Windows / Linux |
| `Cmd+Z` | Undo | Mac |
| `Ctrl+Shift+Z` | Redo | Windows / Linux |
| `Cmd+Shift+Z` | Redo | Mac |
| `Ctrl+Y` | Redo (alternate) | Windows / Linux |
| `Cmd+Y` | Redo (alternate) | Mac |

**Implementation details:**
- Listens on `keydown`, not `keyup`
- Uses `event.metaKey` for Mac, `event.ctrlKey` for Windows
- Calls `event.preventDefault()` to block browser default undo
- Only active when canvas/playbook has focus — disabled inside text inputs

---

## Integration with PlaybookContext

```typescript
// In src/contexts/PlaybookContext.tsx
const {
  state: playbook,
  setState: setPlaybook,
  undo,
  redo,
  canUndo,
  canRedo
} = useHistory<Playbook>(initialPlaybook);
```

PlaybookContext exposes `undo`, `redo`, `canUndo`, `canRedo` through React context. Any component can access undo/redo via:

```typescript
const { undo, redo, canUndo, canRedo } = usePlaybook();
```

---

## Test Coverage (11 Tests Passing)

The useHistory.test.ts suite verifies:

1. **Initial state** — hook returns the initial value
2. **Basic setState** — updates state correctly
3. **Undo** — reverts to previous state
4. **Redo** — re-applies reverted state
5. **Undo/redo cycle** — full round trip
6. **History cap at 50** — past.length never exceeds MAX_HISTORY
7. **`commit: false` exclusion** — no-commit changes don't enter history
8. **Redo invalidation** — new commit after undo clears future
9. **canUndo/canRedo flags** — correct boolean values at each state
10. **Empty history guard** — undo with empty past is a no-op
11. **localStorage exclusion** — past/future not present in serialized output

---

## Forbidden Patterns

| Pattern | Why It's Wrong | What To Do |
|---------|---------------|------------|
| `useReducer` for history | Over-engineered, mixes concerns | useHistory hook already handles it |
| `dispatch({ type: 'UNDO' })` | Reducer pattern — does not exist here | Call `undo()` directly |
| Writing `past[]` to localStorage | Bloats storage, breaks on refresh, wastes I/O | Keep in React state only |
| Serializing `future[]` to Firestore | Network cost for ephemeral data | Keep in React state only |
| Removing the 50-entry cap | Memory leak on long sessions | Keep `MAX_HISTORY = 50` |
| `commit: true` during drag | Creates undo entry per pixel of movement | Use `commit: false` during drag, `true` on drop |
| Replacing useHistory with a state library | Adds dependency, changes working architecture | useHistory is simple, tested, sufficient |

---

## Pre-Session Checks

```bash
# Verify useHistory exists and is built
ls src/hooks/useHistory.ts && echo "EXISTS" || echo "MISSING — CRITICAL"

# Verify tests pass
npm run test -- --run 2>&1 | grep -i "useHistory\|history"

# Verify PlaybookContext uses it
grep "useHistory" src/contexts/PlaybookContext.tsx && echo "WIRED" || echo "NOT WIRED — INVESTIGATE"

# Verify keyboard shortcuts
grep -l "undo\|redo" src/hooks/useKeyboardShortcuts.ts 2>/dev/null || \
  grep -rl "Ctrl+Z\|metaKey.*undo" src/ --include="*.ts" --include="*.tsx" | head -3

# Full test suite (11 history tests within 60 total)
npm run test -- --run 2>&1 | tail -5
```
