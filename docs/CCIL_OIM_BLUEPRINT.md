# Executive Architecture Overview

- CCIL is the intelligence orchestration layer; domain modules (OIM now, DIM/STIM later) are plug-ins behind one dispatcher contract.
- CanonicalPlay is the universal domain payload with `phase`-aware schema; offense does not leak into core contracts.
- OIM implements analyzers (concept, spacing, timing, coverage stress stub), recommendation engines, coaching cues, and adapters.
- Hybrid UX is rendered from one `IntelligenceAnalysis<TDomain>` object through deterministic Assist and Coach views.
- Confidence gating occurs in CCIL core to enforce consistent behavior across all modules.

# CCIL Core Contracts (TS)

See: `src/modules/intelligence/contracts/intelligence.ts`

# CanonicalPlay Type

See: `src/modules/intelligence/domains/canonicalPlay.ts`

# OIM Module Architecture

See directories:
- `src/modules/intelligence/oim/analysis`
- `src/modules/intelligence/oim/recommendations`
- `src/modules/intelligence/oim/coaching`
- `src/modules/intelligence/oim/adapters`
- `src/modules/intelligence/oim/api`
- `src/modules/intelligence/oim/tests`

# CCIL Dispatcher Design

See: `src/modules/intelligence/core/analyze.ts`

# Hybrid Rendering Policy (Exact Logic)

See: `src/modules/intelligence/core/renderingPolicy.ts`

Thresholds:
- `>= 0.85` high confidence surfaced fully in Assist.
- `0.65–0.84` represented as subtle chip/limited recommendation surface.
- `< 0.65` hidden from Assist, available in Coach.

# Folder Structure (Full Tree)

```text
src/modules/intelligence/
  contracts/
    intelligence.ts
  domains/
    canonicalPlay.ts
  core/
    analyze.ts
    renderingPolicy.ts
  oim/
    analysis/
      conceptDetection.ts
      spacingEngine.ts
      timingEngine.ts
      coverageStressEngine.ts
    recommendations/
      smartRouting.ts
      adjustmentSuggestions.ts
    coaching/
      installCues.ts
      qbProgressionBuilder.ts
    adapters/
      smartPlaybookAdapter.ts
    api/
      analyzePlay.ts
    tests/
      oim.intelligence.test.ts
      fixtures/
        mesh.json
        smash.json
        flood.json
        verts.json
        stick.json
        expected-analysis.json
  index.ts
```

# Adapter Layer

- Adapter contract: `SmartPlaybookState` → `CanonicalPlay`.
- Implemented in `src/modules/intelligence/oim/adapters/smartPlaybookAdapter.ts`.
- Handles incomplete UI state with safe defaults, preserving metadata for future DIM/STIM parity.

# Phased Implementation Plan

## Phase 1 — Platform Stabilization
- Created contracts, canonical schema, dispatcher, OIM wrapper, adapter, rendering policy, fixtures, and unit tests.
- Risks: concept detection currently route-token based (not topology aware).
- Tests: concept recognition + gating + false-positive prevention + adapter checks.

## Phase 2 — Intelligence Expansion
- Add realistic coverage stress calculations and situation-aware metrics from `fieldContext`.
- Extend QB progression with coverage shell assumptions and leverage outcomes.
- Integrate install cue packs per concept and personnel package.

## Phase 3 — Personalization & Analytics
- Add player-trait calibration inputs into recommendation ranking.
- Add install mastery and practice hooks via shared analytics envelope in `rawMetrics`.
- Add export-targeted DTO builders for reporting/monetization surfaces.

# Testing Plan

Unit tests (current):
- Concept detection correctness for mesh/smash/flood/verts/stick fixtures.
- Spacing false positive prevention.
- Smart routing ranking confidence checks.
- Assist gating correctness.
- Adapter conversion checks.

Golden fixtures:
- `mesh.json`
- `smash.json`
- `flood.json`
- `verts.json`
- `stick.json`
- expected summary: `expected-analysis.json`

# Performance Strategy

- Run analysis only on stable canonical hash changes (caller responsibility).
- Memoization rule: memoize by `(play.id, serialized structural snapshot)`.
- In React callers:
  - Use `useMemo` to build `CanonicalPlay`.
  - Use `useEffect` with stable dependencies (avoid object literal deps).
  - Never write analyzed output back into dependency source without guard.
- Prevent re-analysis loops via immutable input snapshots and idempotent adapter output.
- Large playbooks: batch analyze off main interaction path (e.g. idle/worker in future phase).

# Future Expansion Hooks

- Dispatcher already branches by `play.phase`; DIM/STIM analyzers can be plugged in without contract changes.
- `IntelligenceScores` supports additional score keys.
- `rawMetrics` is internal extensibility envelope for module-specific telemetry.
- CanonicalPlay includes non-offense-friendly fields (defensive personnel/specialist scaffolding).
- Shared rendering policy applies uniformly to OIM/DIM/STIM.

# Risk Prevention Notes

- Keep CCIL core module-agnostic; forbid offense terms in core files.
- Maintain fixture-based regression snapshots before expanding heuristics.
- Keep adapter defaults explicit; reject hidden implicit assumptions.
- Add confidence calibration tests when adding new detectors.
- Preserve deterministic output ordering to avoid UI thrash and flaky tests.
