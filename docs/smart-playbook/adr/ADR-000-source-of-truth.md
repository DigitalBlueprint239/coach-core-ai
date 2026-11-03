# ADR-000 — Source of truth
Status: Accepted (owners via #104/#39, 2026-11-02). Date: 2026-11-03.
Context: three repos (coach-core-ai, Coach-Core-Smart-Playbook-, V3) and several branches held Smart Playbook work.
Decision: `coach-core-ai` branch `recovery/coach-core-mvp-2026` is the only integration trunk. The standalone repo is reference-only (its recent branches are Drew-lane evidence receipts). V3 is empty and unused.
Consequences: ideas from the standalone repo are ported as small tested PRs; nothing is merged wholesale; the standalone build must never be deployed (it inlines GEMINI_API_KEY into the client bundle).
