# ARCHITECTURE MAP — coach-core-ai

Living document maintained by agents. Updated whenever folder structure, contracts/types, public APIs, or integration points change.

---

## Folder Structure (relevant modules)

```
src/
├── components/
│   └── SmartPlaybook/
│       ├── SmartPlaybook.tsx          # Main orchestrator component
│       ├── PlayController.js          # Pure utility functions (createPlayer, undo/redo, formations)
│       ├── PlayLibrary.js             # Saved plays list UI
│       ├── Field.js                   # Canvas rendering
│       ├── DebugPanel.js              # Debug overlay
│       ├── editorIntelligenceShim/    # ← TEMPORARY SHIM (SmartPlaybook-only)
│       │   ├── types.ts               # CanonicalPlay, IntelligenceIssue, AnalysisResult
│       │   ├── canonicalAdapter.ts    # toCanonicalPlay — UI state → CanonicalPlay
│       │   ├── analyzeEditorPlay.ts   # Heuristic editor analysis pipeline
│       │   └── useEditorCommitAnalysis.ts  # React hook: analysisRevision + commit()
│       └── components/
│           ├── CanvasArea.tsx
│           ├── SavePlayDialog.tsx
│           ├── PlayerControls.js
│           ├── RouteControls.js
│           ├── RouteEditor.js
│           ├── FormationTemplates.js
│           ├── SaveLoadPanel.js
│           ├── Toolbar.js
│           ├── Notification.js
│           └── Onboarding.js
├── types/
│   └── firestore-schema.ts           # Firestore types (Play, PlayPlayer, Route, AIInsight…)
├── ai-brain/
│   ├── AIContext.tsx                   # React context provider for AI services
│   └── core/AIBrain.ts               # Singleton AI service (skeleton)
└── services/
    ├── firestore.ts                   # Firestore CRUD adapter
    ├── ai-service.ts                  # Direct AI service hook
    └── ai-proxy.ts                    # Proxy AI service hook
```

---

## SmartPlaybook Intelligence Shim

> **STATUS: TEMPORARY SHIM — Do not import outside SmartPlaybook.**

The `editorIntelligenceShim/` directory provides SmartPlaybook-local play analysis heuristics. It is **NOT** the platform-level CCIL/OIM module. It exists to give the editor real-time quality feedback until the platform intelligence layer is built.

### Boundary rules

- Only `SmartPlaybook.tsx` may import from `editorIntelligenceShim/`
- No other component or module should depend on these types or functions
- When the platform `src/modules/intelligence/` is created, this shim should be migrated

### Extraction Plan (future)

When platform intelligence is built, the shim contents should migrate to:

| Shim file | Extraction target |
|-----------|-------------------|
| `types.ts` | `src/modules/intelligence/types.ts` |
| `canonicalAdapter.ts` | `src/modules/oim/adapters/smartPlaybookAdapter.ts` |
| `analyzeEditorPlay.ts` | `src/modules/intelligence/analyzePlay.ts` (platform-level) |
| `useEditorCommitAnalysis.ts` | `src/modules/oim/hooks/useCommitAnalysis.ts` |

After extraction, SmartPlaybook imports switch from `./editorIntelligenceShim/*` to `../../modules/oim/*` and the shim directory is deleted.

---

## Contracts / Types

### Editor Intelligence Types (`SmartPlaybook/editorIntelligenceShim/types.ts`)

| Type | Purpose |
|------|---------|
| `CanonicalPlay` | Normalized play snapshot consumed by analysis pipeline |
| `CanonicalPlayer` | Position-stripped player (id, x, y, position, number) |
| `CanonicalRoute` | Position-stripped route (id, playerId, points, type) |
| `IntelligenceIssue` | Single analysis finding (severity, category, description) |
| `AnalysisResult` | Container: issues[] + revision + score |
| `IssueSeverity` | `'info' \| 'warning' \| 'critical'` |
| `IssueCategory` | `'alignment' \| 'spacing' \| 'route_conflict' \| 'coverage_gap' \| 'personnel' \| 'formation' \| 'general'` |

### Firestore Types (`types/firestore-schema.ts`)

| Type | Purpose |
|------|---------|
| `Play` | Persisted play (Firestore document) |
| `PlayPlayer` | Player within a persisted play |
| `Route` | Route within a persisted play |
| `AIInsight` | AI-generated insight (Firestore document) |

---

## Public APIs

### `analyzeEditorPlay(play: CanonicalPlay): AnalysisResult`
- **Location**: `SmartPlaybook/editorIntelligenceShim/analyzeEditorPlay.ts`
- Runs 6 heuristic checks, returns issues + score (0–100)
- Pure function, no side effects
- **Scope**: SmartPlaybook-only (temporary shim)

### `toCanonicalPlay(state): CanonicalPlay`
- **Location**: `SmartPlaybook/editorIntelligenceShim/canonicalAdapter.ts`
- Transforms SmartPlaybook internal state → CanonicalPlay
- Single translation boundary between UI and intelligence

### `useEditorCommitAnalysis(opts): { commit, analysisRevision, analysisResult, canonicalPlay }`
- **Location**: `SmartPlaybook/editorIntelligenceShim/useEditorCommitAnalysis.ts`
- React hook; `commit()` increments revision, memoised pipeline re-runs on `[analysisRevision]`
- **Scope**: SmartPlaybook-only (temporary shim)

### PlayController exports (`SmartPlaybook/PlayController.js`)
- `createPlayer`, `createRoute`, `addPlayer`, `removePlayer`
- `selectPlayer`, `deselectAll`, `updatePlayerPosition`
- `addRoute`, `removeRoute`, `savePlay`
- `undo`, `redo`
- `shotgunFormation`, `fourThreeFormation`
- `findPlayerAtPosition`, `calculateDistance`
- Constants: `PLAYER_POSITIONS`, `ROUTE_TYPES`, `ROUTE_COLORS`

---

## Integration Points

### SmartPlaybook ↔ Editor Intelligence Shim

```
SmartPlaybook.tsx
  │
  ├─ useEditorCommitAnalysis hook ──┐
  │   (analysisRevision state)      │
  │                                 ▼
  │                     canonicalAdapter.toCanonicalPlay()
  │                                 │
  │                                 ▼
  │                     analyzeEditorPlay()
  │                                 │
  │                                 ▼
  │                     AnalysisResult { issues, score }
  │                                 │
  ├─ [inline] Assist Mode panel ◄───┘  (right sidebar, desktop, hidden lg:block)
  └─ [inline] Coach Mode drawer ◄──    (overlay drawer, desktop, hidden lg:flex)
```

**Commit trigger**: Every `saveToUndoStack()` call is followed by `commit()`, which bumps `analysisRevision` and causes `useMemo` to re-derive the canonical play and analysis.

### SmartPlaybook ↔ AIProvider
- `SmartPlaybook` is wrapped in `<AIProvider>` via `WrappedSmartPlaybook`
- No direct coupling with editor intelligence shim (separate concerns)

---

## Desktop-only constraints

- Assist Mode panel — inlined in SmartPlaybook.tsx, rendered inside `<div className="hidden lg:block">`
- Coach Mode drawer — inlined in SmartPlaybook.tsx, uses `hidden lg:flex` and `hidden lg:block` for backdrop
- `TouchOptimizedPlaybook` is **not touched** by editor intelligence shim

---

## Build & Test Stability

### Build tooling

- **Bundler**: CRA 5 (react-scripts 5.0.1) with Webpack
- **CSS**: Tailwind CSS v3 via CRA's built-in PostCSS pipeline
- **TypeScript**: `module: "esnext"`, `moduleResolution: "node"`, `jsx: "react-jsx"`, `strict: true`
- **TS error handling**: `package.json` build script sets `TSC_COMPILE_ON_ERROR=true` — 166 pre-existing strict-mode TS errors in legacy files are emitted as warnings, not build failures
- **Type augmentation**: `src/env.d.ts` provides `ImportMeta.env` types for `import.meta.env` usage

### Test tooling

- **Runner**: Jest 27 via CRA
- **import.meta.env handling**: `config/jest/importMetaTransform.js` — custom Jest transformer that string-replaces `import.meta.env` → `process.env` before Babel processes files
- **Firebase stubs**: `src/setupTests.ts` sets dummy `NEXT_PUBLIC_FIREBASE_*` env vars so `firebase.ts` doesn't throw at import time
- **Jest config override**: `package.json` → `jest.transform` points JS/TS files to the custom transformer
