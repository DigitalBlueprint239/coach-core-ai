# Coach Core AI — Continuous Improvement Agent System
**Status:** Proposed architecture, not active automation. **Date:** 2026-10-14. **Owner:** Andrew and Kevin (release authority). **Target:** `recovery/coach-core-mvp-2026`.

## Goal
Build once; every submission, test, coach-reported issue, and film-analysis correction becomes a reproducible improvement with evidence. **No unsupervised production merges, releases, real-data access, paid resource creation, or secret changes.** GitHub issues/PRs, tests, and versioned docs are the system of record, not AI chat memory.

## Agents and ownership
| Agent | Trigger | Tools / scope | Artifact |
| --- | --- | --- | --- |
| Orchestrator / triage | New issue, PR, failing check, approved feedback | GitHub issue templates, labels, code ownership; no production access | Prioritized ticket, reproduction, owner, risk |
| Codex Build | Assigned issue | Isolated task branch, local tests, GitHub PR | Small fix + tests + evidence |
| Claude Security | Security-sensitive PR, scheduled dependency review | Read-only static/security review, Firebase emulators with `demo-*`, canary scans | Security findings + approval/block |
| QA Regression | Every PR | CI test, typecheck, lint, browser smoke, negative rules tests | Status checks + artifacts |
| Playbook Domain | Playbook PR/bug | Canvas/route/undo/persistence fixtures and real desktop/tablet checks | Playbook acceptance evidence |
| Film Domain | Film PR/bug | Synthetic or licensed film, frame extraction, tag accuracy review, upload/tenant tests | Film benchmark + coach-reviewed corrections |
| AI Quality | Prompt/model/config change or curated feedback | Offline sanitized evaluation set, accuracy and safety rubrics, spend limits | Eval report; rollback recommendation |
| Release / Reliability | Approved staging release | Staging smoke, metrics, cost, rollback plan; human release gate | Release checklist and rollback |

**MVP phase:** start with three actual automation roles: QA CI, security checks, and issue triage. Codex/Claude coding remains human-launched or connector-authorized; do not claim agents run continuously until workflows are installed and demonstrated.

## Trigger-to-outcome workflow
1. **Intake:** PR opened/updated, failing CI, manual coach feedback, or consented anonymized film-analysis correction. Create/associate GitHub issue with severity, reproduction, environment, affected feature and owner. Do not collect youth PII.
2. **Reproduce:** write failing test or isolated fixture; mark `blocked` when access is missing. Baseline test count, errors, and logs (redacted).
3. **Repair:** Codex works on separate branch with minimal changes; no overlap with Claude-owned auth/rules/functions without agreed ownership in Issue #39.
4. **Validate:** CI on PR: deterministic install, TypeScript, lint, unit, integration, build; Firebase emulator negative auth/tenant tests; canary checks for leaked provider secrets; browser E2E on supported desktop/tablet for affected flows; film/AI evals on approved non-sensitive fixtures.
5. **Review:** Claude reviews security-impacting changes; one designated human/code-owner reviews PR. Branch protections require checks and review. No agent self-approves own code.
6. **Integrate:** reviewed PR merges to recovery branch first; staging deploy requires founder approval while security gates are unresolved; production promotion always requires explicit Andrew/Kev approval and rollback.
7. **Learn:** update test suite, docs, issue resolution, known regressions and benchmark results. Improvements are measured over time; feedback is not silently used to train provider models.

## PR acceptance matrix
| Area | Required gate |
| --- | --- |
| All PRs | reproducible `npm ci`, typecheck, tests, build, no new critical dependency exposures, no secrets in diff/bundle |
| Auth/Firestore/Storage | deny-by-default tests: anonymous, unapproved, owner A, owner B, immutable tenant IDs; use emulator `demo-*` only |
| Smart Playbook | create/edit, undo/redo for players/routes/properties, save/reopen, exports, pointer/touch regressions |
| Film Analyzer | owner-scoped upload/clip/tag/reopen, authorized storage, file limits, redaction, consent/rights, video cost/retention; reviewed frame-analysis accuracy |
| OpenAI gateway | authenticated, server-only new key, rate/token/spend limits, no youth PII, structured error handling, sanitized logging, offline eval and canary bundle scan |
| Release | approved staging smoke, monitoring and rollback, human approval, no unresolved critical security issues |

## Repository layout to propose (not yet implemented)
`.github/workflows/coach-core-ci.yml` — CI on pull_request and recovery branch push (read-only default token, minimum permissions, concurrency cancellation).
`.github/workflows/security-rules.yml` — Firebase emulators against `demo-*`, Java setup, no real secrets.
`.github/ISSUE_TEMPLATE/bug_report.yml` and `feature_request.yml` — structured intake without player PII.
`.github/pull_request_template.md` — reproduction, tests, risk, rollback, screenshot/fixture evidence.
`tests/evals/` — licensed/synthetic video clips, golden coaching outputs, versioned scoring rubric; never private youth footage.
`docs/agents/AGENT_OWNERSHIP.md`, `docs/agents/QUALITY_SCORECARD.md` — shared ownership, measured reliability.

## Initial measurable KPIs
- Build pass rate and median time to green.
- Number of open critical/high defects and mean time to resolve.
- Playbook save/reopen success and regression counts.
- Film upload/clip/tag success, coach agreement with suggested tags, and processing latency.
- Auth and tenant isolation test pass rate (must be 100% on mandatory cases).
- AI cost per successful coaching task and failure rate.
- Reopened issues after release; rollback count.
**Never invent baselines or claim improvement without before/after evidence.**

## First three implementation sprints
1. **Foundation:** inspect current CI and branch protections; introduce PR template + issue templates + read-only QA workflow on a new branch. Avoid duplicate workflows. Run against open recovery PR and document result.
2. **Security and domain tests:** add emulator tests and approved Playbook/Film regression fixtures; keep test video synthetic/licensed and size-limited. Claude reviews. Fail closed on any security regression.
3. **Feedback loop:** coach beta feedback form -> sanitized GitHub issue (human moderation) -> reproduction -> PR -> tests -> changelog. Start manual triage before automatic agent code-writing.

## Existing constraints
- Main repo: `DigitalBlueprint239/coach-core-ai`, recovery branch `recovery/coach-core-mvp-2026`.
- Standalone: `DigitalBlueprint239/Coach-Core-Smart-Playbook-`; preserve until integration verified.
- OpenAI-only MVP, new server-side credential; no Gemini/Anthropic product API, no coach model selector.
- Film Analyzer is required for full MVP: see Issue #50.
- Four security blockers F-01–F-04 from Claude's Day 1 audit; beta NO-GO.
- Coordinate existing PRs #40, #42, #45, #47 and standalone PR #1; never overwrite unmerged work.
- First install requires owner approval of GitHub Actions execution/billing, access permissions and branch protections.

## Founder decision checklist
1. Approve this architecture as a documentation proposal (not automatic deployment).
2. Authorize an initial read-only PR CI workflow in a separate implementation PR.
3. Assign Kevin as technical integration reviewer (or nominate another engineer) and Andrew as product acceptance reviewer.
4. Approve restricted, synthetic coach-feedback capture and retention policy before automation.
