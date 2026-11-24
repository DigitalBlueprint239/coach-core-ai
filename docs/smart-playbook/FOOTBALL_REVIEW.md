# Football review status

What the engine says about football, and how far each statement can be trusted. Nothing moves up a level without a
named, qualified reviewer.

| Item | Where | Status |
|---|---|---|
| Players per side, players on the line, unique roles | `rules.ts` (`eleven-player@1`) | Draft profile; rule-book citations pending |
| Receiver eligibility by alignment | `eligibility.ts` | Draft profile; jersey numbers not modelled; quarterback reported as undetermined |
| Out of bounds, from the stored ball spot and field profile | `checksV4.ts` | Geometry fact |
| Two routes finishing within 4 yards | `checksV4.ts` (`spacing.crowded-finish`) | **Provisional** coaching convention; the 4-yard value is unreviewed |
| Shapes and default depths of all routes, including slant, post, wheel and comeback | `routes.ts` (`cc-routes@2`) | **Provisional** teaching shapes |
| Playback speed (6 yd/s for everyone) | `timelineV4.ts` | Nominal; not timing advice |
| Concepts, coverages, matchups, formations | `content/` | Per-item `verification` status; unchanged here |

## Review process

1. A reviewer with high-school or college coaching experience checks an item against a cited source.
2. The decision goes in `content/decisions.json` (or the rule profile's `verification`) with name, date and source.
3. A changed shape, value or rule is a **new version**; existing versions are never edited.

## Not supported

Protection and run-fit correctness, defensive pursuit, player speed, and any prediction that a play will work.
