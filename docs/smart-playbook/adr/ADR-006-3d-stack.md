# ADR-006 — 3D: React Three Fiber + three.js, single clock with 2D
Status: Proposed (RD-07). Date: 2026-11-03.
Evidence: PR #95 prototype (R3F 9.8 / three 0.187): 0.01 yd 2D-3D match, ~1.1 s camera lift, WebGL2 on Intel HD 4000; unit and browser suites passing. Frame times not yet measured.
Decision: R3F + three for 3D, lazy-loaded behind a flag; both renderers sample one deterministic timeline; view state is presentation-only. Babylon.js is the fallback if measured budgets fail.
Consequences: timeline (T-201) precedes 3D integration (T-203).
