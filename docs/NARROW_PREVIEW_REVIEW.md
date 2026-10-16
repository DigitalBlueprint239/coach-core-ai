# PR #67 — narrow-preview correction, visual approval pending

Coach Drew rejected the prior visual revision. This pass addresses the specified narrow layout, next-practice hierarchy, surface depth, compact support rows and navigation clearance. The new revision is submitted for review; it is not visually approved.

## Implementation

- `src/ui/coach-core.css`: a named calendar container query replaces time columns below 900px of **calendar content width**, including within a wide viewport. The narrow hide rule now matches the timed-grid selector specificity. Whole-word event wrapping replaces `anywhere`. Cards have restrained navy gradients/shadows and quiet dividers; support rows are compact.
- `src/ui/WeekDashboard.tsx`: the narrow selected-day agenda opens the existing read-only details dialog without relying on viewport media matching. The mobile next-practice card contains a compact Lucide icon, prominent time, practice/date/location and one primary action. Existing Playbook navigation remains available.
- `src/ui/AppShell.tsx`: opaque bottom navigation; its measured border-box height includes safe-area padding and sets content clearance. Focused content controls are revealed above the bar. Main-region navigation focus is excluded from control scrolling; observers/listeners are cleaned up.

No auth, team context, authorized data projection, saving, recovery/conflicts, rules, functions, AI, acceptance repair or e2e changes. No rollout, merge, deploy or spending. Branch ownership continued in #39 comment 6181083701; frozen acceptance base remains 4757eaf.

## Visual evidence

`docs/evidence/narrow-review/Review.html` and `Review.md` index reference/implementation comparisons at 375×812, 430×932, 490×900, 834×1112 and 1440×1000. The original interface crops are resized proportionally; decorative laptop/phone frames are excluded. There is no separate supplied tablet reference.

Top, full-page, selected agenda, page-bottom clearance and honest empty-state captures accompany the comparisons. `desktop-with-490-calendar.png` proves the container breakpoint inside a 1440px browser. `375-simulated-safe-area.png` uses an additional 32px inset, explicitly simulated.

Codex visually inspected all five sizes, selected agendas and bottom captures for wrapping, hierarchy and clearance. Automated checks supplement this inspection. The implementation intentionally omits stadium imagery, unavailable attendance/film actions and fictional account activity. Sample actions say “View practice preview”; saved plans use existing plan-library navigation and truthful missing information. Tablet adopts the day agenda for legibility while retaining selected practice beneath.

## Verification

Commands and results are recorded in evidence `checks.txt`, `verification.json` and `extra-verification.json`. Portable browser runners accept `COACH_CORE_PLAYWRIGHT_MODULE` for an installed Playwright module and `COACH_CORE_UI_OUTPUT` for an output directory. They access only the local isolated preview and make no cloud requests. Start it with `node scripts/visual-preview.cjs 4317`.

Earlier baseline: 443/443 Jest, TypeScript 0, production build PASS with inherited warnings. An intermediate build exposed a CSS minifier warning for a nested fallback expression; that expression was simplified before the final verification. Original and final logs are retained separately. No acceptance assertion, timeout or retry changed.

Browser viewport and simulated-inset checks are **not physical-device testing**, authenticated backend acceptance or independent Claude approval. Claude workflow review remains requested through #39 and pending behind acceptance-blocking work. Current MVP readiness is not inferred from this visual pass.

Final results: 443/443 tests across 31 suites; TypeScript 0; production build PASS with inherited SmartPlaybook warnings only (JS 225.42kB, CSS 4.43kB). Chromium and Firefox at all five widths PASS: axe 0, no fragmented words or horizontal page overflow; all 19 visible content controls clear navigation at each phone width. Both engines also pass an additional 32px inset simulation and a 490px calendar inside a 1440px viewport. Minified production CSS passes at all five widths. Source fingerprints, provenance and checksums accompany the screenshots.
