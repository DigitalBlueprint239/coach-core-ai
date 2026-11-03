# ADR-002 — Yards as canonical coordinates; explicit coordinate profiles
Status: Proposed. Date: 2026-11-03.
Decision: canonical geometry is yards from the ball on the LOS (+x offense right, +y downfield), as football-core already uses. Pixel data (v1 plays) is read only through explicit, versioned coordinate profiles; a missing profile means 'unverified geometry' and 3D is withheld (pattern proven and tested in PR #95).
Consequences: renderers convert at the edge; no renderer writes football data.
