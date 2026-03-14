# TypeScript Audit — Coach Core AI Skill

## Purpose

Guides TypeScript auditing and error remediation for Coach Core AI. Documents correct fix patterns, forbidden shortcuts, file locations, and the integrity checks that prevent regression.

---

## Current State

### Error Landscape

The codebase has TypeScript errors concentrated in:
1. **`src/setupTests.ts`** — References `jest` globals (CRA test setup vs Vitest types conflict)
2. **`src/types/firestore-schema.ts`** — Missing `firebase/firestore` module declarations
3. **`src/components/SmartPlaybook/`** — Multiple files use `@ts-nocheck` (excluded from compilation via tsconfig)
4. **`src/_archived/`** — Archived files excluded from compilation

### tsconfig.json Exclusions

The following paths are excluded from TypeScript compilation:
- `src/components/SmartPlaybook/src/**/*`
- `src/_archived/**/*`

This means errors in these directories do not block the build but should be tracked for future cleanup.

### Key File Locations

| File | Lines | TypeScript Relevance |
|------|-------|---------------------|
| `src/types/firestore-schema.ts` | 639 | Firestore type definitions — 3 `any` fields (known debt #2) |
| `src/services/firestore.ts` | 466 | CRUD + offline queue — `addToOfflineQueue` uses Firebase `any` patterns (known debt #1) |
| `src/ai-brain/core/AIBrain.ts` | 1,188 | AI singleton — uses `unknown` with narrowing for API responses |
| `src/ai-brain/AIContext.tsx` | 414 | React context wrapping AIBrain |
| `src/hooks/useAuth.tsx` | 115 | Auth hook — properly typed |
| `src/hooks/useFirestore.ts` | 199 | Firestore hooks — properly typed |
| `src/firebase.ts` | 33 | Firebase app initialization |

---

## Correct Fix Patterns

### 1. Unknown Property Access (extractJSON Pattern)

**Problem:** AI responses return untyped JSON that needs property access.

**Forbidden:**
```typescript
// NEVER do this
const data = response as any;
const name = data.formation.name;
```

**Correct:**
```typescript
// Use generic extraction with narrowing
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
  const name = data.formation.name; // Safe
}
```

### 2. Firebase SDK Types (Known Debt — Leave As-Is)

**Context:** Firebase SDK methods return `DocumentData` which is inherently `any`-typed. The offline queue in `firestore.ts` accepts `any` for operation payloads because Firebase documents are schema-flexible.

**Rule:** Do NOT try to strongly type the Firebase offline queue parameters. This matches Firebase SDK patterns and is documented as known debt item #1.

### 3. Firestore Schema Flexible Fields (Known Debt — Leave As-Is)

**Context:** `src/types/firestore-schema.ts` has 3 fields typed as `any` to accommodate flexible Firestore document structures.

**Rule:** Leave these as-is. They are documented as known debt item #2.

### 4. React Component Props

**Forbidden:**
```typescript
// NEVER
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

---

## Firestore Integrity Check

The `addToOfflineQueue` function in `src/services/firestore.ts` is a critical persistence path. Any TypeScript audit touching this file must verify:

```bash
# Must return 7 (1 definition + 6 call sites)
grep -c "addToOfflineQueue" src/services/firestore.ts
```

If this count changes, something is wrong. Investigate before proceeding.

---

## Forbidden Shortcuts

| Shortcut | Why It's Forbidden | What To Do Instead |
|----------|-------------------|-------------------|
| `@ts-nocheck` | Disables all type checking for the file | Fix the actual errors |
| `as any` | Bypasses type system entirely | Use `unknown` and narrow |
| `// @ts-ignore` on production code | Hides real bugs | Fix the underlying type error |
| `React.FC<any>` | No prop type safety | Define a proper Props interface |
| `(x as SomeType)` without validation | Runtime crashes when wrong | Use type guards or `unknown` narrowing |

---

## Pre-Session Audit Sequence

```bash
# 1. Count current TypeScript errors
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"

# 2. Scan for @ts-nocheck in active code (exclude archived + SmartPlaybook)
grep -r "@ts-nocheck" src/ --include="*.ts" --include="*.tsx" | grep -v "_archived" | grep -v "SmartPlaybook"

# 3. Scan for 'as any' usage in active code
grep -rn "as any" src/ --include="*.ts" --include="*.tsx" | grep -v "_archived" | grep -v "SmartPlaybook" | grep -v "node_modules"

# 4. Verify firestore.ts integrity
grep -c "addToOfflineQueue" src/services/firestore.ts  # Expected: 7

# 5. Check schema file integrity
wc -l src/types/firestore-schema.ts  # Expected: 639
```

Record all numbers. After your session, every number must be equal or better (fewer errors, fewer `any` casts, same offline queue count).

---

## Error Remediation Priority

When reducing TypeScript errors, work in this order:

1. **Type definition errors** — Missing interfaces, wrong property types
2. **Import errors** — Missing module declarations, wrong paths
3. **Generic constraint errors** — Incorrect generic parameters
4. **Implicit any** — Functions missing return types or parameter types
5. **Strict null checks** — Potentially undefined values used without guards

Never batch-fix errors with `@ts-nocheck` or `as any`. Fix each error individually with the correct pattern.

---

## Post-Audit Verification

```bash
# Error count must be <= pre-session count
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"

# No new @ts-nocheck
grep -r "@ts-nocheck" src/ --include="*.ts" --include="*.tsx" | grep -v "_archived" | grep -v "SmartPlaybook"

# Offline queue unchanged
grep -c "addToOfflineQueue" src/services/firestore.ts  # Still 7

# Tests still pass
npm run test -- --run 2>&1 | tail -10
```
