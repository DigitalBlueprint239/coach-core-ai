# Coach Core — PR #67 revised visual review

**Visual approval remains rejected/pending Coach Drew’s review.** This revision addresses the narrow-preview defects only. Live local preview: http://127.0.0.1:4317/ (isolated sample UI, no cloud/auth connection).

## Actual captures beside the approved concept

| Viewport | Reference / implementation | Selected agenda / clearance |
|---|---|---|
| 375 × 812 | [Comparison](375-reference-vs-implementation.png) | [Agenda comparison](375-agenda-reference-vs-implementation.png) |
| 430 × 932 | [Comparison](430-reference-vs-implementation.png) | [Agenda comparison](430-agenda-reference-vs-implementation.png) |
| 490 × 900 | [Comparison](490-reference-vs-implementation.png) | [Agenda comparison](490-agenda-reference-vs-implementation.png) |
| Tablet, 834 × 1112 | [Comparison](834-reference-vs-implementation.png) | [Selected day](834-agenda.png) |
| Desktop, 1440 × 1000 | [Comparison](1440-reference-vs-implementation.png) | [Full capture](1440-full.png) |

Each implementation image is an actual Chromium viewport screenshot. Reference images are proportionally resized crops of the supplied concept’s interface, excluding decorative hardware. There was no separate tablet reference; that comparison uses the desktop concept. Full-page and honest empty-state captures are also included.

## Changes and intentional differences

- Below **900px of calendar content width**, the time grid becomes seven compact day buttons plus a full-width selected-day agenda. This applies inside a wide viewport too. A CSS specificity defect that kept timed columns visible on phones is corrected. Event words use normal whole-word wrapping.
- Mobile next practice is 207px tall in these sample captures: icon, prominent time, name, date/location and one primary action. Playbook remains in navigation. Real missing times remain “Time not set”; no location is invented.
- Deep navy canvas, subtly raised gradient cards, quieter dividers and consistent Lucide icons. Cyan emphasizes the active day/selection and primary action. Assignments/upcoming use compact rows with at least 44px-high controls.
- Bottom navigation is opaque. Content clearance tracks the actual bar height, including safe-area padding; keyboard focus reveals covered controls. Additional 32px inset simulation is labeled as simulation, not device testing.
- Tablet intentionally uses the agenda because its seven time columns would be too narrow. Desktop retains the full-width calendar with selected practice beneath it. Today can truthfully have no scheduled event while the next practice is tomorrow.
- The concept’s attendance/film/report actions remain unavailable rather than appearing as functional destinations. Sample actions open read-only preview details. Scheduling and assignments remain preview-only; real accounts retain truthful empty/unavailable states and existing functional navigation.

## Boundaries

This pass changes only `src/ui/AppShell.tsx`, `WeekDashboard.tsx` and `coach-core.css`, plus review evidence/documentation. Authorized data projection, authentication, team isolation, saving, recovery/conflicts, backend rules, AI, acceptance repairs and test harness are unchanged. Existing functional editors are reached through the authenticated application; the isolated preview labels those destinations as preview-only.

Browser viewport checks and visual inspection do not establish physical-device or authenticated backend acceptance. Claude’s independent workflow review remains requested through issue #39 and is pending. No merge, deployment, paid assets, subscription or broader rollout.

## Verified results

443/443 tests across 31 suites; TypeScript 0; production build passes with inherited warnings only. Chromium and Firefox pass all five widths: zero overflow, fragmented words, axe violations, page errors or external requests. All 19 visible content controls clear navigation at each phone size, including an additional 32px inset simulation. Skip link, focus, modal/Escape, reduced motion and preview isolation pass. Minified production CSS also passes at all five widths. Detailed results: `checks.txt` and the verification JSON files.
