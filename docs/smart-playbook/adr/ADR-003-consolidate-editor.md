# ADR-003 — Consolidate on the v2 (SVG) editor; deprecate v1 canvas editor
Status: Proposed. Date: 2026-11-03.
Context: v1 canvas editor (legacy JS, 3 tests) and v2 SVG editor (TS, 14 test files, verified on staging). Standalone uses Konva.
Decision: extend v2 FieldSheet (SVG; accessible DOM nodes, keyboard paths, testable) for professional editing. Retire v1 in production after parity (RD-08); import v1 plays read-only via a coordinate profile. Konva not adopted; revisit only if SVG performance fails measured budgets at full editor complexity.
Consequences: editor features (T-108) build on playbook2.
