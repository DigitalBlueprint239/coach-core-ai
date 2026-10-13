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
