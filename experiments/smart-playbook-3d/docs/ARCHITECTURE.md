# CC-SP3D-002 — Architecture

> **EXPERIMENT ONLY — DO NOT MERGE OR DEPLOY.** Isolated prototype. No Firebase, no auth, no persistence.

## The rule

**One play. One authoritative football data model. Multiple views.**

```
 StoredPlay (pixels, raw keys)         ← exactly what persistence holds; deep-frozen; never written by views
        │  + Provenance { profileId | null }   ← adapter INPUT, supplied beside the play, never persisted
        ▼
 projectPlays()  ── pure, read-only ──►  CanonicalScene (yards, frozen)   or   Unverified (no geometry)
        │                                       │
        ▼                                       ▼
 Field2D  (draws STORED pixels on the     Scene3D  (draws canonical yards in a Three.js world,
 600×300 authoring canvas)                 1 unit = 1 yd, +Y up, offense attacks −Z)
        ▲                                       ▲
        └──────────── View state (viewMachine) ─┘   phase · camera preset · selected uid · notice
                      presentation only; holds no football data
```

| Layer | File | Mutable? |
|---|---|---|
| Stored play + provenance | `src/model/types.ts`, `src/fixtures/plays.ts` | No (deep-frozen) |
| Coordinate profiles | `src/model/profiles.ts` | No |
| Adapter | `src/model/adapter.ts` | Pure function |
| Field geometry / markings | `src/model/field.ts`, `src/model/markings.ts` | Pure functions |
| Draft (explicit 2D edits only) | `src/model/workspace.ts` | New immutable draft per edit |
| View state machine | `src/view/viewMachine.ts` | Reducer over presentation state |
| Camera math | `src/view/camera.ts` | Pure functions |
| 2D renderer | `src/render2d/*` | Reads draft |
| 3D renderer | `src/render3d/*` | Reads canonical scene |

## Coordinate profiles (never inferred)

A profile is an explicit, versioned statement of how stored pixels map to yards:

| Profile | Origin (ball at LOS) | Scale | Certification | Source |
|---|---|---|---|---|
| `cc-halffield-px-v1` | (300, 190) | 10 px/yd, upfield = −y | **verified** | PR #91 `SmartPlaybook.tsx:462` loader + `Field.js:244` LOS |
| `legacy-shotgun-px-test-classification` | (300, 150) | 24 px/yd | **classified (test only)** | Hypothetical; legacy `Field.js` draws no LOS |
| *none* (`profileId: null`) | — | — | **unverified** | 3D withheld |

The adapter selects a profile **only** from `provenance.profileId`. Two plays with identical pixels but different provenance produce different results (unit-tested). A missing profile makes the whole result `unverified`: no yard geometry exists, so no renderer can present it as accurate. Classified never upgrades to verified; a composition takes its weakest member's certification.

Off-field and odd coordinates pass through unclamped and are reported as warnings. Routes are read from `points`, or from `path` when `points` is absent (same precedence as persistence `routesForView`), and the stored key is reported, never rewritten.

## Why switching views cannot mutate the saved play

1. The stored plays are `deepFreeze`d when the workspace is created; any write throws `TypeError` (unit-tested).
2. `projectPlays` returns a new frozen object and has no write path back.
3. The view reducer's state type has no football fields: phase, preset, selected uid, notice, epoch, counters.
4. The only producer of a new draft is `movePlayer()`, wired to 2D pointer/keyboard edits and gated to `phase === '2d'`.
5. There is no persistence in the experiment. `src/debug.ts` instruments fetch/XHR/beacon/WebSocket/localStorage/sessionStorage/IndexedDB and counts every write attempt; browser tests assert the count is 0 and that no non-GET or non-loopback request occurs across 10 round trips.

## The camera lift (States A–F)

| State | Phase | What happens |
|---|---|---|
| A | `2d` | 2D canvas visible; 3D canvas may already be mounted and prewarmed underneath (hidden). |
| B | `preparing` | Rig places the camera at the matched overhead pose; waits for **two presented frames** (program compile + proof of draw) before continuing. 2D stays visible, so no blank flash. |
| C | `handoff-in` | 3D layer shown underneath; it already equals the 2D picture. |
| D | `handoff-in` | 2D layer fades out over 220 ms (no dip: 3D is opaque beneath). |
| E | `lifting` | 820 ms ease-in-out: distance (log-space), polar, FOV interpolate; markers rise from flat discs to capsules; tags fade in. Football geometry never moves. |
| F | `3d` | OrbitControls (damped) + presets: Tactical, Overhead, Sideline, Defense. |
| ← | `lowering` → `handoff-out` | Reverse from wherever the camera is: markers flatten, camera returns to matched overhead (640 ms), 2D fades back in. |

**Why the overhead match is exact:** a pinhole camera looking straight down at a plane maps that plane with uniform scale. With vertical FOV *f* and distance *r = (H/2)/tan(f/2)* (H = 30 yd, the 300 px canvas at 10 px/yd), centred on the canvas centre's yard position, every ground point lands on the same pixel as the 2D diagram, provided both canvases share the same box. The stage is sized to an even whole-pixel width so the 2D canvas and the integer-sized WebGL canvas are exactly 2:1. Markers are 0.02 yd tall in this state, so parallax is ≤ 0.01 yd even at the sideline (unit-tested).

**Camera pose model:** `{target, r, polar, azimuth, fov}`, with an explicit roll-free up vector `(−cos p·sin a, sin p, −cos p·cos a)` that has no singularity at polar = 0. This is what lets one interpolation run from straight-down to tilted.

**Resilience:** reverse from any 3D-side phase; pointer/wheel during the lift hands control to the user at the current pose; reduced motion (system or toggle) swaps the camera move for a 160 ms dissolve with no intermediate poses; no WebGL → 3D button disabled with an explanation; `webglcontextlost` → back to 2D with a notice and a fresh context on the next entry (`sceneEpoch`); renderer errors are caught by an error boundary; geometries, materials and canvas textures are disposed on unmount (GPU counts are flat across round trips, browser-tested).

## Dependency choices

- `three` 0.187.0 (MIT), `@react-three/fiber` 9.8.2 (MIT, peer `react >=19 <19.4`), `react`/`react-dom` 19.3.1 (MIT).
- **Drei not used.** Its `Text` (troika) loads fonts from a CDN by default, which breaks offline isolation and the "no network" test, and the custom transition needs its own camera rig. `OrbitControls` comes from `three/examples`.
- All textures (turf grain, yard numbers, labels, tags, shadows) are generated on canvases at runtime from local system fonts. The experiment makes no remote requests.
- Dependencies are installed only in `experiments/smart-playbook-3d/` with its own lockfile. The root app's `package.json`/lockfile are untouched; an inline PostCSS config stops Vite from loading the root Tailwind config.
