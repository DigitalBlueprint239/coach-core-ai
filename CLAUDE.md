# Agent Instructions — Coach Core AI Recovery
**First read:** `docs/COACH_CORE_SHARED_CONTEXT.md` and `docs/MVP_7_DAY_SPRINT.md`.
These versioned files are canonical shared project context for Codex, Claude, and maintainers. Chat memory is not authoritative.
## Branch protection and collaboration
Work in task-specific branches, submit PRs toward `recovery/coach-core-mvp-2026`; do not push directly to `master`. Coordinate owners in GitHub issues. Never edit a file actively owned by another agent, and never merge branches without review.
## Verify, don't assume
Record commands, versions, failing stack traces (redacted), and test counts. Distinguish reproducible tests from static inspection. Do not suppress, skip, or loosen tests without documented approval.
## Safety
No secrets in frontend code, GitHub reports, or logs. Do not touch real Firebase data or deploy without authorization. Restrict preview access. Validate auth/rules and restore paths before beta.
## Deliverables
At each PR, update shared context or sprint log with changed files, evidence, remaining blockers, next task owner.


## Football intelligence knowledge source (private)
The canonical research/evidence vault is `DigitalBlueprint239/Coach-Core-Football-Knowledge-` (note the final hyphen). Bootstrap import: `bootstrap/football-knowledge-v1`, reviewed in vault PR #1. Do not assume it is available on vault `main` before that PR is merged.

Before modifying the deterministic football engine, football content, AI football explanations, rule profiles, play assignments or tactical tests:
1. Check that the agent's GitHub identity has **read access** to the private vault. If not, report the access blocker; never invent evidence or place access tokens in code.
2. Read the vault's `AGENTS.md`, `docs/source-policy.md`, `docs/architecture.md`, and only the task-relevant `sources/`, `claims/`, `football/`, `decision-tables/` and `test-fixtures/` records.
3. Treat the initial records as **research-backed but unreviewed**, including the official-rule source leads. No rule, tactic or test is automatically Verified by being in GitHub. Exact official editions and claim-level locators require review.
4. Cite a **specific immutable vault commit SHA or approved release tag**, plus source/claim IDs, rule-profile edition, named coaching variant, evidence status and fixture IDs in each implementation PR. Never use floating vault `main` as a production dependency.
5. Missing rule evidence, defender technique, scheme variant, read key or authorized access means `unsupported` or `needs-input`, not a guessed football answer.
6. Keep deterministic football logic independent of on-demand, read-only AI and 2D/3D renderers.

The vault is a research dependency only; it does not authorize a production deployment, migration, paid content import, or changes to the separate Smart Playbook PR #106. Keep existing branch-protection, lane-ownership and independent review rules in force.
