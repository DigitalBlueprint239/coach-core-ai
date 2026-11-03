# ADR-004 — Deterministic rules decide; AI drafts and explains
Status: Accepted in principle (design 2026-10-30), detailed here. Date: 2026-11-03.
Decision: legality, eligibility, slot mapping, conflicts and coverage responsibilities are deterministic football-core rules with tests. AI runs server-side only (Functions + Genkit + Anthropic), returns schema-validated structured drafts that pass the same rules, cites registry sources, and requires coach approval. No invented tendencies; no unsupported probabilities. Live AI stays off until owners enable it.
Consequences: AI work starts after model v3 (T-103) and registry (T-105).
