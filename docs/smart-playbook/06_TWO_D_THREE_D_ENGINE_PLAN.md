# 06 — 2D / 3D Engine Plan

Status: proposed (ADR-006). Evidence base: PR #95 prototype (measured on this project's own low-end laptop).

## 1. Technology evaluation

| Option | Fit with our stack | Evidence | Verdict |
|---|---|---|---|
| **React Three Fiber + three.js** | Same React 19 tree, declarative scene from model data, large ecosystem (drei), MIT | Prototype built and tested in #95: 0.01 yd 2D↔3D match, ≈1.1 s camera lift, WebGL2 on Intel HD 4000 | **Recommended** |
| Babylon.js | Strong engine, built-in physics/inspector; imperative, separate from React tree | Not prototyped | Alternative if R3F perf fails budgets |
| Raw three.js (no R3F) | Max control, more glue code | — | Use inside R3F where hot paths need it |
| WebGPU | Faster future path | Browser support still uneven on school hardware | Optional backend later (three.js WebGPU renderer); WebGL2 baseline |
| Konva (2D) | Used by standalone repo; imperative canvas | Not on trunk | **Not adopted** — trunk 2D is SVG (`FieldSheet`), accessible and already tested |
| GSAP | Timeline tweening | Standalone repo uses it | Optional for UI transitions only; football timeline is our own deterministic clock |

Assets: glTF/GLB players (low-poly, instanced), licensed CC0/purchased with recorded licences; LOD and
instancing for 22 players; no third-party asset without a licence entry in `10_RISKS…`.

## 2. Architecture

```
Canonical Play (05)  ──►  timeline.build(play, defenseLook, ruleProfile)  ──►  Timeline {events, keyframes per player}
                                                                                   │
                         ViewState (presentation only: view, camera, t, playing, selectedPlayerId, overlays)
                                   │                                              │
                    Field2D (SVG, yards→px via profile)             Scene3D (R3F, 1 unit = 1 yd)
```

- **Single clock** `t` (seconds from snap; negative = pre-snap). Both renderers sample the same timeline at `t`;
  switching view never re-creates the play (pattern from #95: frozen stored play, pure projection, view reducer
  without football fields).
- Shared selection: `selectedPlayerId` is a canonical player id; preserved across views.
- Ball state is an event-derived track (carrier per t).

## 3. Views

Coaching (elevated tactical) · Sideline · End zone · Quarterback eye · Position eyes (WR, RB, OL, LB, S, CB) ·
Free orbit. Cameras are pure functions of (view, play, t, selected player) — unit-testable (#95 pattern).

## 4. Motion and fidelity (ADR-007)

| Tier | What | Claimed as | Phase |
|---|---|---|---|
| A — Assignment playback | Players follow assignment paths with speed profiles (accel/decel, route breaks), snap/handoff/pass events, coverage drops to landmarks | "Teaching animation" | 2 |
| B — Rule-based reactions | Defenders respond to events per coverage/fit rules (match, carry, wall); blocks engage by scheme rules | "Rule-based simulation" | 3 |
| C — Advanced tactical | Leverage, pursuit angles, timing windows, engagement outcomes, alternatives | "Exploratory simulation" | 6 |

Never presented as outcome prediction without a validated, calibrated model.

## 5. Performance budgets (to be benchmarked, not promised)

Measure on: this i5-3230M/HD 4000 laptop (low bar), a mid iPad, a mid Android phone, a current desktop.
Targets to validate: desktop 60 fps p95 frame ≤ 16.7 ms at 22 players; adaptive quality (DPR cap, shadows off,
LOD) on low-end; view switch ≤ 300 ms ready (prototype measured 31–35 ms ready p50); 2D↔3D sync error
≤ 0.01 yd (prototype measured); memory ceiling per device class. #95 measured readiness, transition and frame times
(≈ 18–33 ms desktop on HD 4000, ≈ 24 ms emulated tablet/phone; not 60 FPS on HD 4000) on one limited machine — these
do not establish production performance; memory, GPU stability and real-device playback under football workloads
remain to be measured.

## 6. First 3D acceptance scenario (AT-20…AT-24)

Coach designs a pass concept in 2D → adds a coverage → 3D view → play → pause during the QB progression →
switch to QB eye → change the defensive look → replay comparison; all state synchronized; evidence recorded
(video frames + timeline hashes + sync error).

## 7. Migration path

1. Land canonical timeline (Tier A) in `football-core/timeline` with tests (no 3D yet) and drive 2D playback.
2. Port #95's adapter/view-machine/camera modules into `features/playbook3d` reading the canonical model
   (coordinate profiles only for legacy v1 plays).
3. Lazy-load the 3D bundle (code-split; flagged `REACT_APP_ENABLE_PLAYBOOK_3D`).
