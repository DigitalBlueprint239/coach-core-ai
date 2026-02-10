# Product Standards (Coach Core)

## 3-Tap Rule (Top Workflows)
From first app screen, coaches must reach each workflow in <= 3 taps:
- Today’s Schedule
- Send Message
- Start Practice Plan
- Take Attendance

No blocking interstitials are allowed in these paths.

## Performance targets (p75)
Measured in-app using local render timing instrumentation:
- Schedule screen render: <= 300ms
- Chat screen render: <= 300ms
- Practice Planner render: <= 350ms

Measurement source:
- `src/utils/performanceInstrumentation.ts`
- Diagnostics panel in Home view

## Reliability targets
- No silent failures: every caught error must show a readable fallback message.
- Error reports include context:
  - route
  - team/user identifiers when available
  - app version + commit hash when available
  - recent breadcrumbs
- Crash handling must remain recoverable (retry, reload, back navigation).

## AI output contract (Practice Suggestions)
Input must include:
- sport, ageGroup, skillLevel
- rosterSize, durationMinutes
- equipmentAvailable, focusGoals
- coachStyleProfile (tone + philosophy)

Output must include:
- title
- 4–8 segments with `id`, `minutes`, `setup`, `coachingPoints`, `variations`
- `whyThisPlan` referencing input constraints
- editability via segment IDs (single-segment regeneration)

Safety:
- Medical/injury advice requests must be refused and redirected to qualified professionals.
