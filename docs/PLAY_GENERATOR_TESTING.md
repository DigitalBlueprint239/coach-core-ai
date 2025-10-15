# AI Play Generator Smoke Test

This harness validates the `aiService.generateCustomPlay` pipeline against curated late-game and special-situation scenarios. It complements automated tests by letting coaches and developers inspect generated play calls, fallback quality, and validation output in one place.

## Components

| File | Purpose |
| --- | --- |
| `src/test/play-scenarios.ts` | Scenario library with game context, defensive schemes, and player considerations. |
| `src/utils/play-validator.ts` | Heuristics that assert structural and contextual quality of generated plays. |
| `src/components/AI/PlayGeneratorTestHarness.tsx` | Chakra-based UI for scenario selection, generation, validation, and rating. |

## Rendering the harness

The harness is intended for development use. Wrap it in an environment guard to avoid shipping to production:

```tsx
import { PlayGeneratorTestHarness } from '@components/AI/PlayGeneratorTestHarness';

function DashboardDevPane() {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return <PlayGeneratorTestHarness enabled autoStart />;
}
```

Props:
- `enabled` – override the production guard when you must expose the tool elsewhere.
- `autoStart` – immediately generate the first scenario on mount.

## Scenario library

`PLAY_SCENARIOS` currently exposes 11 high-leverage situations, including:

1. Down by 3 with 30 seconds left (need quick 3).
2. Up by 1 with 10 seconds (baseline inbound secure).
3. Tied vs 2–3 zone (need zone buster).
4. 3-on-2 fast break opportunity.
5. Full-court press break out of timeout.
6. Isolation for last shot.
7. Post mismatch exploitation.
8. Corner three vs 1–3–1 at the buzzer.
9. Protect star player in foul trouble.
10. Injury adjustment set without primary ball-handler.
11. Sideline out-of-bounds vs switching defense.

Each scenario defines `teamProfile`, `requirements`, and `situation` metadata so the harness can validate alignment between the request and the generated play.

## Validation heuristics

`validatePlayCall` checks:

- **Defense Alignment** – play text references the targeted scheme (e.g. “zone” when facing a zone).
- **Player Positions** – 3–5 labeled roles with responsibilities for traditional positions (PG through C).
- **Step Count** – between 3 and 7 actionable coaching points (balanced detail).
- **Timing Cues** – shot-clock or timing directives present in description/points.
- **Age Appropriateness** – filters advanced terminology for younger teams (≤ U12).

Failed checks surface actionable guidance in the harness. All heuristics are pure functions, enabling use in automated tests if desired.

## Using the harness

1. Select a scenario from the drop-down.
2. Toggle **Force Offline** to simulate the fallback pathway (no network required).
3. Toggle **Debug Logs** for console-level request/response insight.
4. Click **Generate Play**. The harness:
   - Calls the AI service (unless Force Offline is enabled).
   - Renders player responsibilities, coaching points, variations, and success factors.
   - Runs validation and displays pass/fail badges.
   - Exposes raw JSON for both the scenario and generated play.
5. Optionally rate the play’s quality (1–5) using the star controls.

### Fallback mode

When **Force Offline** is enabled, the harness produces a deterministic, coach-friendly fallback action (`Fallback Motion Set`). Use this to confirm transitions between offline and online behaviour remain smooth.

## Expected play call structure

Generated plays should follow this envelope:

```ts
interface GeneratedPlay {
  id: string;
  name: string;
  description: string; // Overall summary with situational intent
  formation?: string;  // e.g., "4-out 1-in"
  positions?: Array<{
    position: string;            // e.g., "Point Guard"
    movement: string;            // Initial alignment/movement
    responsibility: string;      // Decision rule / role
    keyPoints?: string[];        // Optional quick reminders
  }>;
  coachingPoints?: string[];     // 3–7 sequenced instructions
  variations?: string[];         // Counters / alternative looks
  adjustments?: string[];        // Scheme-specific tweaks
  keySuccessFactors?: string[];  // Emphasis items for staff
  confidence?: number;           // 0–1 confidence estimate
}
```

The validator assumes this structure but remains tolerant of partial responses—the harness highlights missing sections rather than crashing.

## Maintenance tips

- Extend `PLAY_SCENARIOS` when new tactical situations emerge.
- Update `play-validator.ts` as play response structure evolves.
- Keep fallback content helpful but neutral (no opponent-specific language).
- Run `npm run typecheck` to ensure the harness stays strict-mode compliant.

Use this harness during feature work and before releases involving the AI play call stack.
