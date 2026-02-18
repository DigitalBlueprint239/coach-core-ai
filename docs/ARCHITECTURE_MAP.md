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
│       ├── ccil/                      # ← CCIL integration boundary (NEW)
│       │   ├── types.ts               # CanonicalPlay, IntelligenceIssue, AnalysisResult
│       │   ├── canonicalAdapter.ts    # toCanonicalPlay — UI state → CanonicalPlay
│       │   ├── analyzePlay.ts         # Heuristic analysis pipeline
│       │   └── useCommitAnalysis.ts   # React hook: analysisRevision + commit()
│       └── components/
│           ├── AssistModePanel.tsx     # ← Minimal CCIL surface (NEW)
│           ├── CoachModeDrawer.tsx     # ← Full diagnostics drawer (NEW)
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

## Contracts / Types

### CCIL Types (`SmartPlaybook/ccil/types.ts`)

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

### `analyzePlay(play: CanonicalPlay): AnalysisResult`
- **Location**: `SmartPlaybook/ccil/analyzePlay.ts`
- Runs 6 heuristic checks, returns issues + score (0–100)
- Pure function, no side effects

### `toCanonicalPlay(state): CanonicalPlay`
- **Location**: `SmartPlaybook/ccil/canonicalAdapter.ts`
- Transforms SmartPlaybook internal state → CanonicalPlay
- Single translation boundary between UI and intelligence

### `useCommitAnalysis(opts): { commit, analysisRevision, analysisResult, canonicalPlay }`
- **Location**: `SmartPlaybook/ccil/useCommitAnalysis.ts`
- React hook; `commit()` increments revision, memoised pipeline re-runs on `[analysisRevision]`

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

### SmartPlaybook ↔ CCIL

```
SmartPlaybook.tsx
  │
  ├─ useCommitAnalysis hook ─────┐
  │   (analysisRevision state)    │
  │                               ▼
  │                     canonicalAdapter.toCanonicalPlay()
  │                               │
  │                               ▼
  │                     analyzePlay.analyzePlay()
  │                               │
  │                               ▼
  │                     AnalysisResult { issues, score }
  │                               │
  ├─ AssistModePanel ◄────────────┘  (right sidebar, desktop)
  └─ CoachModeDrawer ◄───────────    (overlay drawer, desktop)
```

**Commit trigger**: Every `saveToUndoStack()` call is followed by `commit()`, which bumps `analysisRevision` and causes `useMemo` to re-derive the canonical play and analysis.

### SmartPlaybook ↔ AIProvider
- `SmartPlaybook` is wrapped in `<AIProvider>` via `WrappedSmartPlaybook`
- No direct coupling with CCIL layer (separate concerns)

---

## Desktop-only constraints

- `AssistModePanel` — rendered inside `<div className="hidden lg:block">`
- `CoachModeDrawer` — uses `hidden lg:flex` and `hidden lg:block` for backdrop
- `TouchOptimizedPlaybook` is **not touched** by CCIL integration
