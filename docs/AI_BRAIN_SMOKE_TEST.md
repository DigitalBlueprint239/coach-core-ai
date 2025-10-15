# AI Brain Smoke Test Harness

This smoke test exercises the end-to-end AIBrain practice-plan pipeline with deterministic mock data, validation, and visual diff tooling. Use it during development to verify scenario coverage whenever you update the AI integration, practice planner, or validation logic.

## What the harness provides

- Realistic mock team data (rosters, season context, facility constraints, focus areas).
- Edge-case scenarios (empty roster, solo player, 15-minute session, no equipment).
- Click-to-generate workflow that calls the live `aiService.generatePracticePlan` wrapper.
- Validation pass/fail summary covering duration alignment, drill coverage, structural flow, and age appropriateness.
- Visual diff between input context, raw AI plan, and computed transformations.
- Optional console logging for deeper debugging (toggleable in the UI).

## File overview

| File | Purpose |
| --- | --- |
| `src/test/mock-data-generator.ts` | Deterministic generator for mock teams, constraints, and AI requests. |
| `src/utils/plan-validator.ts` | Shared validation helpers that assert plan structure and age alignment. |
| `src/components/AI/AIBrainSmokeTest.tsx` | Development-only harness UI built with Chakra UI. |
| `docs/AI_BRAIN_SMOKE_TEST.md` | This guide. |

## Rendering the harness

The harness is disabled in production builds by default. To run it locally:

1. Ensure the development server is running (`npm run dev`).
2. Mount the component somewhere in a development-only surface, for example inside `src/pages/dashboard/MainDashboard.tsx`:

   ```tsx
   import { AIBrainSmokeTest } from '@components/AI/AIBrainSmokeTest';

   // ... inside the component render
   {process.env.NODE_ENV !== 'production' && (
     <AIBrainSmokeTest enabled autoStart />
   )}
   ```

   > The `enabled` prop overrides the production guard if you want to expose the tool in other environments. `autoStart` runs the first scenario immediately.

3. Reload the application. The “AI Brain Smoke Test” card will appear with scenario selectors and controls.

## Using the harness

1. Pick a scenario from the drop-down (standard cases plus edge cases).
2. Optionally toggle **Debug Logs** to emit detailed console output.
3. Click **Generate Practice Plan**. The harness will:
   - Call `aiService.generatePracticePlan` with the scenario payload.
   - Render the resulting practice plan, drill breakdown, and validation results.
   - Display input/output JSON alongside computed transformations (duration deltas, drill minutes).
4. Review pass/fail badges for each validation check. Hovering over results reveals actionable guidance for failed checks.

## Validation criteria

The validator currently asserts:

- **Duration Alignment** – total scheduled minutes within ±5 of the requested duration.
- **Drill Coverage** – at least 60% of requested time is covered by explicit drills.
- **Progressive Flow** – warm-up, high-intensity work, and cool-down phases appear in order.
- **Required Fields** – critical fields (title, goals, drills) are populated.
- **Age Appropriateness** – younger age groups avoid advanced terminology and lengthy drills.

All logic lives in `src/utils/plan-validator.ts`, with inline comments describing each check.

## Mock data customisation

`src/test/mock-data-generator.ts` exposes helpers that you can re-use in unit tests or other tooling:

- `generateMockTeamContext(options)` – returns a single mock team plus the corresponding AI request.
- `generateStandardScenarios(seed?)` – deterministic baseline scenarios.
- `generateEdgeCaseScenarios(seed?)` – edge conditions (empty roster, short session, missing equipment, etc.).
- `generateAllScenarios(seed?)` – convenience helper used by the harness.

Options include seed, age group, skill level, duration, facility type, supplied equipment, and focus areas.

## Debugging tips

- Toggle **Debug Logs** to inspect request payloads, raw AI responses, and validation summaries in the console.
- Use the edge-case scenarios to ensure fallbacks behave predictably.
- If validation fails, the message highlights the offending field or heuristic so you can iterate quickly.

## Maintenance checklist

- Update validation logic whenever practice plan structure changes.
- Extend the mock generator when new constraints or focus areas are introduced.
- Run `npm run typecheck` before committing to ensure strict-mode compatibility.

Happy testing!
