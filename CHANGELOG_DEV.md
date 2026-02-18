# CHANGELOG_DEV

Development changelog for coach-core-ai. Maintained by agents for cross-session continuity.

---

## 2026-02-18 — sp/commit-based-ccil-integration

- **Branch**: `claude/setup-session-guidelines-CYPWq` (task ref: `sp/commit-based-ccil-integration`)
- **Agent**: Claude Code (Opus 4.6)

### Summary

- Added CCIL (Core Coach Intelligence Layer) integration boundary at the SmartPlaybook level
- Introduced `CanonicalPlay` / `IntelligenceIssue` types for the intelligence pipeline contract
- Created `canonicalAdapter` to translate SmartPlaybook UI state → CanonicalPlay
- Created `analyzePlay` heuristic pipeline (6 checks: empty field, spacing, out-of-bounds, missing routes, personnel count, route crossings)
- Created `useCommitAnalysis` hook with `analysisRevision` counter and `commit()` wrapper for memoised analysis triggering
- Wrapped all 13 state mutation handlers in SmartPlaybook.tsx with `commit()`
- Added **Assist Mode panel** (minimal surface) in right sidebar above PlayLibrary (desktop only, `hidden lg:block`)
- Added **Coach Mode drawer** (full diagnostics) as slide-in overlay from right (desktop only, `hidden lg:flex`)

### Files touched

| File | Action |
|------|--------|
| `src/components/SmartPlaybook/ccil/types.ts` | **Created** — CanonicalPlay, IntelligenceIssue, AnalysisResult types |
| `src/components/SmartPlaybook/ccil/canonicalAdapter.ts` | **Created** — toCanonicalPlay adapter |
| `src/components/SmartPlaybook/ccil/analyzePlay.ts` | **Created** — analyzePlay heuristic pipeline |
| `src/components/SmartPlaybook/ccil/useCommitAnalysis.ts` | **Created** — useCommitAnalysis hook |
| `src/components/SmartPlaybook/components/AssistModePanel.tsx` | **Created** — Assist Mode panel component |
| `src/components/SmartPlaybook/components/CoachModeDrawer.tsx` | **Created** — Coach Mode drawer component |
| `src/components/SmartPlaybook/SmartPlaybook.tsx` | **Modified** — Wired CCIL hook, commit() calls, rendered panels |
| `CHANGELOG_DEV.md` | **Created** — This file |
| `docs/ARCHITECTURE_MAP.md` | **Created** — Architecture reference |

### Why

Wire the existing CCIL + OIM analysis pipeline into SmartPlaybook using commit-triggered analysis so coaches get real-time play quality feedback on desktop without modifying the intelligence modules themselves.

### Tests run + results

- `npm test -- --watchAll=false` — (see test step output)
- `npx tsc --noEmit` — (see test step output)
