# TypeScript Audit — Coach Core Smart Playbook Skill

## Purpose

Guides TypeScript auditing and error remediation for Coach Core Smart Playbook. Documents correct fix patterns, forbidden shortcuts, file locations, and the integrity checks that prevent regression.

**Repo:** Coach-Core-Smart-Playbook- (Vite / React / TypeScript / Konva)
**Current state:** 0 TypeScript errors, 0 @ts-nocheck suppressions

---

## Error History

| Session | Errors | Key Fix |
|---------|--------|---------|
| Session 1A | 185 | Added `src/types/styled.d.ts` — single file fixed all 185 styled-components theme errors |
| Current | **0** | Clean — all errors resolved |

The styled-components theme error pattern is **permanently fixed** via `src/types/styled.d.ts` which augments `DefaultTheme`. Do not re-introduce this pattern. Do not remove `styled.d.ts`.

---

## Key File Locations

| File | Path | Lines | TypeScript Relevance |
|------|------|-------|---------------------|
| Firestore CRUD | `src/services/firebase/firestore.ts` | 466 | `addToOfflineQueue` uses Firebase `any` (known debt #1) |
| Firestore Schema | `src/services/firebase/schema.ts` | 639 | 3 `any` fields (known debt #2) |
| Firebase Config | `src/services/firebase/config.ts` | 33 | App initialization |
| AIBrain | `src/services/ai/AIBrain.ts` | 1,188 | Uses `extractJSON<T>` for unknown property access |
| AIContext | `src/services/ai/AIContext.tsx` | 92 | React context wrapping AIBrain |
| Auth Hook | `src/services/auth/useAuth.tsx` | 115 | Properly typed |
| PlaybookContext | `src/contexts/PlaybookContext.tsx` | — | Uses useHistory hook, fully typed |
| useHistory | `src/hooks/useHistory.ts` | — | Generic hook `useHistory<T>`, fully typed |
| Theme Augmentation | `src/types/styled.d.ts` | — | `DefaultTheme` augmentation — DO NOT REMOVE |
| Formation Service | `src/services/formationService.ts` | — | 53 formations, typed |
| Route Definitions | `src/services/routeDefinitions.ts` | — | 13 routes, typed |
| Concept Service | `src/services/conceptService.ts` | — | 7 concepts, typed |

---

## Correct Fix Patterns

### 1. Unknown Property Access — extractJSON<T> Pattern

**Problem:** AI responses return untyped JSON that needs property access.

**Forbidden:**
```typescript
const data = response as any;
const name = data.formation.name;
```

**Correct (used in AIBrain.ts):**
```typescript
function extractJSON<T>(raw: unknown): T | null {
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

interface FormationAnalysis {
  formation: { name: string };
}
const data = extractJSON<FormationAnalysis>(response);
if (data) {
  const name = data.formation.name; // Type-safe
}
```

This is the established pattern in AIBrain.ts. Do not revert to `any`. Do not use `as unknown as T` without validation.

### 2. styled-components Theme — SOLVED

**The fix:** `src/types/styled.d.ts` augments `DefaultTheme` with the `AppTheme` type from `src/styles/theme.ts`.

```typescript
// src/types/styled.d.ts
import 'styled-components';
import { AppTheme } from '../styles/theme';

declare module 'styled-components' {
  export interface DefaultTheme extends AppTheme {}
}
```

This permanently resolves all `theme.xxx` property errors in styled-components. Do not delete this file. Do not remove the augmentation.

### 3. React Component Props

**Forbidden:**
```typescript
const MyComponent: React.FC<any> = (props) => { ... }
```

**Correct:**
```typescript
interface MyComponentProps {
  title: string;
  onAction: () => void;
}
const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => { ... }

// For SVG icon maps:
const Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => { ... }
```

### 4. Firebase SDK Types (Known Debt — Leave As-Is)

Firebase SDK methods return `DocumentData` which is inherently `any`-typed. The offline queue in `firestore.ts` accepts `any` for operation payloads because Firebase documents are schema-flexible.

**Rule:** Do NOT try to strongly type the Firebase offline queue parameters. This matches Firebase SDK patterns and is documented as known debt item #1.

### 5. Firestore Schema Flexible Fields (Known Debt — Leave As-Is)

`src/services/firebase/schema.ts` has 3 fields typed as `any`. These accommodate flexible Firestore document structures.

**Rule:** Leave as-is. Documented as known debt item #2.

---

## Firestore Integrity Check

The `addToOfflineQueue` function in `src/services/firebase/firestore.ts` is a critical persistence path.

```bash
# Must return 7 (1 definition + 6 call sites)
grep -c "addToOfflineQueue" src/services/firebase/firestore.ts
```

If this count changes after a TypeScript audit, something is wrong. A type fix should never add or remove call sites.

---

## Forbidden Shortcuts

| Shortcut | Why It's Forbidden | What To Do Instead |
|----------|-------------------|-------------------|
| `@ts-nocheck` | Disables all type checking — hides real bugs | Fix the actual type errors |
| `as any` | Bypasses type system entirely | Use `unknown` and narrow with type guards |
| `// @ts-ignore` | Hides specific errors without fixing them | Fix the underlying type error |
| `React.FC<any>` | No prop type safety at all | Define a proper Props interface |
| `(x as SomeType)` without validation | Runtime crash when type is wrong | Use type guards or `extractJSON<T>` pattern |
| Removing `styled.d.ts` | Re-introduces 185 theme errors | Leave the file in place — it's the fix |

---

## Pre-Session Audit Sequence

```bash
# 1. Verify correct repo
ls src/hooks/useHistory.ts && echo "CORRECT REPO" || echo "WRONG REPO — STOP"

# 2. TypeScript errors — must be 0
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"

# 3. @ts-nocheck — must be 0
grep -r "@ts-nocheck" src/ --include="*.ts" --include="*.tsx"

# 4. 'as any' scan — record count, reduce over time
grep -rn "as any" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# 5. styled.d.ts exists — must be present
ls src/types/styled.d.ts && echo "Theme fix in place" || echo "MISSING — CRITICAL"

# 6. Firestore integrity
grep -c "addToOfflineQueue" src/services/firebase/firestore.ts  # Expected: 7

# 7. Test baseline
npm run test -- --run 2>&1 | tail -5  # Expected: 60 passing
```

Record all numbers. After your session, every number must be equal or better.

---

## Post-Audit Verification

```bash
# Error count must remain 0
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"

# No new @ts-nocheck
grep -r "@ts-nocheck" src/ --include="*.ts" --include="*.tsx"

# styled.d.ts still present
ls src/types/styled.d.ts

# Offline queue unchanged
grep -c "addToOfflineQueue" src/services/firebase/firestore.ts  # Still 7

# Tests still pass (60+)
npm run test -- --run 2>&1 | tail -5

# Build still passes
npm run build 2>&1 | tail -3
```

---

## Known Debt Summary

| # | Item | Status | Action |
|---|------|--------|--------|
| 1 | Firebase `any` in firestore.ts offline queue | Known — Low risk | Leave as-is |
| 2 | 3 `any` fields in schema.ts | Known — Low risk | Leave as-is |
| 3 | `process.env.NODE_ENV` in Firebase modules | Known — Low risk | Vite handles it |
| 4 | Firebase chunk loads eagerly (468 kB) | Known — Medium risk | Future: lazy-load |
| 5 | AI proxy not deployed | Known — **HIGH** risk | Do not depend on AI responses |
