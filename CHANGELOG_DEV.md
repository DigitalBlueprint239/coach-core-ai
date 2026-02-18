# CHANGELOG_DEV

Development changelog for coach-core-ai. Maintained by agents for cross-session continuity.

---

## 2026-02-18 — sp/commit-based-ccil-integration (shim isolation)

- **Branch**: `claude/setup-session-guidelines-CYPWq` (task ref: `sp/commit-based-ccil-integration`)
- **Agent**: Claude Code (Opus 4.6)

### Summary — Rename & Isolate (PATH B)

Architectural audit identified that `SmartPlaybook/ccil/` used platform-level names (`CCIL`, `analyzePlay`, `useCommitAnalysis`) for what is a SmartPlaybook-local temporary shim. This creates namespace collision risk when the real platform CCIL/OIM module is built.

This pass renames the directory and symbols to make the temporary nature explicit. **ZERO logic changes.**

### Changes

- Renamed directory: `ccil/` → `editorIntelligenceShim/`
- Renamed file: `analyzePlay.ts` → `analyzeEditorPlay.ts`
- Renamed file: `useCommitAnalysis.ts` → `useEditorCommitAnalysis.ts`
- Renamed export: `analyzePlay()` → `analyzeEditorPlay()`
- Renamed export: `useCommitAnalysis()` → `useEditorCommitAnalysis()`
- Added `@temporary-shim` JSDoc banners to all 4 shim files
- Updated all imports in `SmartPlaybook.tsx`
- Updated `ARCHITECTURE_MAP.md` with shim boundary docs + extraction plan

### Files touched

| File | Action |
|------|--------|
| `src/components/SmartPlaybook/ccil/` | **Deleted** (entire directory) |
| `src/components/SmartPlaybook/editorIntelligenceShim/types.ts` | **Created** (moved from ccil/) + shim banner |
| `src/components/SmartPlaybook/editorIntelligenceShim/canonicalAdapter.ts` | **Created** (moved from ccil/) + shim banner |
| `src/components/SmartPlaybook/editorIntelligenceShim/analyzeEditorPlay.ts` | **Created** (moved + renamed from ccil/analyzePlay.ts) + shim banner |
| `src/components/SmartPlaybook/editorIntelligenceShim/useEditorCommitAnalysis.ts` | **Created** (moved + renamed from ccil/useCommitAnalysis.ts) + shim banner |
| `src/components/SmartPlaybook/SmartPlaybook.tsx` | **Modified** — updated 2 import paths + 1 hook call site |
| `CHANGELOG_DEV.md` | **Updated** — this entry |
| `docs/ARCHITECTURE_MAP.md` | **Updated** — shim boundary + extraction plan |

### Tests run + results

- `npx tsc --noEmit` (scoped) — **0 errors in SmartPlaybook/editorIntelligenceShim files**
- `CI=true npm test -- --watch=false` — **Pre-existing failure**: `import.meta.env` in AIContext.tsx. Not caused by rename.
- `npm run build` — **Pre-existing failure**: Tailwind v4 PostCSS plugin. Not caused by rename.

---

## 2026-02-18 — sp/commit-based-ccil-integration (corrective pass)

- **Branch**: `claude/setup-session-guidelines-CYPWq` (task ref: `sp/commit-based-ccil-integration`)
- **Agent**: Claude Code (Opus 4.6)

### Summary

- Added CCIL (Core Coach Intelligence Layer) integration boundary at the SmartPlaybook level
- Introduced `CanonicalPlay` / `IntelligenceIssue` types for the intelligence pipeline contract
- Created `canonicalAdapter` to translate SmartPlaybook UI state → CanonicalPlay
- Created `analyzePlay` heuristic pipeline (6 checks: empty field, spacing, out-of-bounds, missing routes, personnel count, route crossings)
- Created `useCommitAnalysis` hook with `analysisRevision` counter and `commit()` wrapper; analysis triggered ONLY by `[analysisRevision]` (no deep deps)
- Wrapped all 13 state mutation handlers in SmartPlaybook.tsx with `commit()`
- **Assist Mode panel** inlined in SmartPlaybook.tsx, right sidebar above PlayLibrary (desktop only, `hidden lg:block`)
- **Coach Mode drawer** inlined in SmartPlaybook.tsx as fixed slide-in overlay from right (desktop only, `hidden lg:flex`)
- Deleted separate `AssistModePanel.tsx` and `CoachModeDrawer.tsx` — inlined per "prefer inline minimal components first" constraint

### Files touched

| File | Action |
|------|--------|
| `src/components/SmartPlaybook/ccil/types.ts` | **Created** — CanonicalPlay, IntelligenceIssue, AnalysisResult types |
| `src/components/SmartPlaybook/ccil/canonicalAdapter.ts` | **Created** — toCanonicalPlay adapter |
| `src/components/SmartPlaybook/ccil/analyzePlay.ts` | **Created** — analyzePlay heuristic pipeline |
| `src/components/SmartPlaybook/ccil/useCommitAnalysis.ts` | **Created** — useCommitAnalysis hook |
| `src/components/SmartPlaybook/SmartPlaybook.tsx` | **Modified** — Wired CCIL hook, commit() calls, inlined Assist + Coach panels |
| `src/components/SmartPlaybook/components/AssistModePanel.tsx` | **Deleted** — inlined into SmartPlaybook.tsx |
| `src/components/SmartPlaybook/components/CoachModeDrawer.tsx` | **Deleted** — inlined into SmartPlaybook.tsx |
| `CHANGELOG_DEV.md` | **Updated** — This file |
| `docs/ARCHITECTURE_MAP.md` | **Updated** — Removed separate file refs |

### Why

Wire the CCIL + OIM analysis pipeline into SmartPlaybook using commit-triggered analysis so coaches get real-time play quality feedback on desktop without modifying the intelligence modules themselves.

### Tests run + results

- `CI=true npm test -- --watch=false` — **Pre-existing failure**: `import.meta.env` in AIContext.tsx (SyntaxError in Jest CJS). Not caused by CCIL changes.
- `npm run build` — **Pre-existing failure**: Tailwind v4 PostCSS plugin misconfiguration. Not caused by CCIL changes.
- `npx tsc --noEmit` — **0 errors in CCIL/SmartPlaybook files** (166 pre-existing errors in `ai-brain-mvp-setup.ts` and `coach-core-integration.ts`)
