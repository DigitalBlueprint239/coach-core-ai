# CC-SP3D-002 — Smart Playbook 2D → 3D "Camera Lift" (prototype)

> **EXPERIMENT ONLY — DO NOT MERGE OR DEPLOY.** Isolated, non-production prototype. No Firebase, no auth, no
> persistence, no AI / Film Analyzer. Nothing here is wired into the live Smart Playbook editor.

One play, one authoritative data model, two views. A coach opens a play in the 2D diagram, presses **3D Field**
(or `V`), and the 3D field appears pixel-aligned under the diagram, then the camera lifts into a tactical view.
Returning to 2D reverses the move. Switching views never changes the saved play. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design.

## Run it

```bash
cd experiments/smart-playbook-3d
npm install
npm run build && npm run preview     # http://127.0.0.1:5179
```

URL options: `?scenario=matchup|offense|legacy-classified|legacy-ambiguous`, `?prewarm=0` (cold 3D start),
`?hold=1` (pause at the aligned overhead frame).

Keys: `V` 2D/3D · `Esc` back to 2D · `1–4` Tactical / Overhead / Sideline / Defense · arrows orbit · `+`/`−` zoom ·
arrows in 2D nudge the selected player (an in-memory draft only).

## Tests

```bash
npm test                                   # unit (vitest)
npx playwright test --project=desktop      # browser; also --project=tablet / --project=phone
```

Playwright uses the installed Google Chrome (`channel: 'chrome'`) with the GPU enabled. Run one project at a
time on low-memory machines (`workers: 1`).

## Results (2026-10-30, executed on the dev machine)

Machine: Intel i5-3230M, Intel HD Graphics 4000 (ANGLE D3D11, WebGL2), 6 GB RAM, Windows 10, Chrome.
Tablet and phone are **emulated viewports on the same laptop**, not physical devices.

| Suite | Result |
|---|---|
| Unit (coordinates, legacy safety, immutability over 12 round trips, camera match, state machine) | 33 / 33 passed |
| Browser · desktop 1440×900 | 17 passed, 1 skipped (touch-only test) |
| Browser · tablet (iPad gen 7 landscape, emulated) | 15 passed, 3 skipped (mouse orbit / resize / pointer drag: desktop-only) |
| Browser · phone (Pixel 7, emulated) | 15 passed, 3 skipped (same) |

Key measured properties (browser tests):

- Matched overhead: every 3D player lands within 0.01 yd of its 2D position; whole-frame pixel difference
  2D vs 3D is under 6/255 mean with under 2% of pixels differing by more than 48; resize keeps it aligned.
- 10 × 2D→3D→2D round trips: play fingerprint, ids and coordinates unchanged; 0 write attempts
  (fetch/XHR/beacon/WebSocket/storage/IndexedDB); no non-GET or non-loopback request; GPU geometry/texture counts flat.
- Ambiguous legacy play: stays usable in 2D, 3D withheld with an explanation. Classified legacy play: opens in 3D,
  never labelled verified.
- WebGL context loss returns to 2D intact and 3D can be reopened; reduced motion replaces the move with a 160 ms dissolve.

Performance (`evidence/perf-*.json`; ms):

| Viewport | 3D appears, warm (p50 / p95) | Full lift until orbit (p95) | Return to 2D (p95) | Cold first 3D | Orbit frame p50 |
|---|---|---|---|---|---|
| Desktop (real GPU) | 23–31 / 39–51 | 1111–1163 | 892–910 | 0.7–1.5 s | 18–33 ms (≈ 30–57 FPS) |
| Tablet (emulated) | 30 / 44 | 1120 | 922 | 0.8 s | 24 ms (≈ 41 FPS) |
| Phone (emulated) | 35 / 43 | 1122 | 899 | 0.8 s | 24 ms (≈ 42 FPS) |

The camera move is ~1.06 s by design (220 ms crossfade + 820 ms lift), so "full lift" is choreography, not load time.
Desktop ranges span four runs; orbit frame rate on this machine varies with memory pressure (one run had a single
2.6 s stall) and does **not** reliably reach 60 FPS on HD 4000.

Evidence: `evidence/` holds screenshots for each viewport (2D, aligned overhead, tactical, sideline, defense), both
legacy policy screens, a frame strip of the lift (`transition-frame-strip.jpg`), perf JSON, and the test logs.
No video: Playwright's video capture needs a separate ffmpeg download, which was not installed.

## Fixed during validation

- An orbit drag that ended over a player selected it. 3D clicks now ignore presses that travel more than 6 px.
- Re-choosing the current camera preset after orbiting did nothing. Every preset request now re-frames.

## Limitations (read before drawing conclusions)

- **Prototype only**, not production-ready. Not integrated with the live editor, Firestore, or the persisted schema.
- The 22-player scene is a **preview composition** of two separate stored plays; the saved-play model has no
  single play with both sides. Routes are illustrative.
- Reference formations (`formationReferences.json` v1.1) are pending Coach Drew review. `display_offsets` are not
  applied, so DL one yard off the ball can overlap OL markers.
- Only the `cc-halffield-px-v1` profile is verified (from PR #91's loader and LOS). The legacy classification profile
  is hypothetical and test-only; real legacy plays without provenance get no 3D.
- Ball spot / rules (HS/NCAA/NFL hashes) are view-only settings.
- On phones the 3D player tags are small and crowded; routes are hairline-thin in the phone overhead (same width
  as the 2D diagram).
- After an orbit, the controls' damping momentum continues briefly past a preset, leaving it up to ~1° short.
- Bundle is large (~1.2 MB JS, ~335 kB gzip) with no code-splitting.
- Firefox, Safari and physical tablets/phones are untested. REA is not connected.
- The recovery branch contains a path with a trailing space (`src/components/Coach Core AI Brain /…`) that
  blocks normal checkouts on Windows; this worktree used a sparse checkout to avoid it.

## Dependencies (this folder only; MIT unless noted)

three 0.187.0 · @react-three/fiber 9.8.2 · react / react-dom 19.3.1 — dev: vite 8.3.5, @vitejs/plugin-react 6.1.2,
typescript 5.9.3, vitest 5.0.5, @playwright/test 1.64.1 (Apache-2.0), @types/react 19.3.0, @types/react-dom 19.3.0,
@types/three 0.186.0, @types/node 22.19.1. The root app's `package.json` and lockfile are untouched.
