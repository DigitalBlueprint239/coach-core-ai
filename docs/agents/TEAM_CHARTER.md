# Coach Core AI — Agent Engineering Command Center (Design v1)
Date: 2026-10-14
Status: **Phase A implementation in isolated review; broader automation proposed, not deployed.** See [runbook](AGENT_RUNBOOK.md) and [validation](PHASE_A_VALIDATION.md) for exact implemented scope/results.
Product: Coach Core AI (main `DigitalBlueprint239/coach-core-ai`, recovery branch `recovery/coach-core-mvp-2026`; standalone `DigitalBlueprint239/Coach-Core-Smart-Playbook-`).
Founder decision: Film Analyzer is MVP-required (Issue #50); OpenAI-only product API for MVP (Issue #46), while Claude Code remains a development/security agent. Do not confuse provider integrations with development agents.

## Mission
Build a traceable, continually improving coaching platform from code submissions, automated test results, security findings, permitted synthetic evaluation data, and explicit coach feedback. **Continuous improvement means continuous measurement and reviewed changes, not self-modifying production code.**

## Agent roster and skills
| Role | Accountable for | Required skills/tools | Output |
| --- | --- | --- | --- |
| Commander / Technical Program Manager (ChatGPT + human) | triage, ownership, milestones, release criteria | GitHub Issues/PRs, roadmap, evidence verification | prioritized issues, daily decision log |
| Builder (Codex) | implementation, regressions, migration adapters | React/TS, Konva, Firebase client, tests, git | scoped PR + tests |
| Security Guardian (Claude Code) | auth/rules/secrets/PII, threat modeling, secure API gateway | Firebase emulator, secret scanners, npm audit, threat models | security PR + negative tests |
| Football Intelligence Evaluator | correctness of football outputs | coach-curated golden fixtures, rubric for formations/drills/film, model eval harness | scored eval report and coach-review queue |
| Film Lab Engineer | video tagging, clip navigation, frame extraction and AI cost | browser video, FFmpeg, OpenCV, synthetic/licensed film | film tests, performance and accuracy report |
| QA / Release Engineer | CI, browser/device tests, regressions, rollback | Jest/Vitest, Playwright, GitHub Actions, emulators | reproducible CI report |
| Research Scout (Muse) | OSS component/license diligence | GitHub research, SPDX license evidence, maintenance assessment | adopt/adapt/study/reject shortlist |

## Core event-driven loop
1. **Trigger:** PR opened/updated, issue/bug created, CI fails, security alert, approved coach feedback or scheduled eval.
2. **Intake:** assign unique issue ID; classify component, severity, repro steps, consent/PII sensitivity, owner; deduplicate against existing issues.
3. **Analysis:** agents read `AGENTS.md`, `CLAUDE.md`, `docs/COACH_CORE_SHARED_CONTEXT.md`, and this charter. Check exact branch and SHA, do not trust stale chat memory.
4. **Plan:** propose smallest repair and test, record expected acceptance. Single agent owns each file; coordinate overlaps in GitHub.
5. **Implement:** task branch, small commits, reproducible logs, dependency/license review, no production writes.
6. **Gate:** install/build/typecheck/lint, unit/integration tests, Firebase emulator deny/allow tests, Playwright desktop/tablet, bundle-secret canary scan, AI/film golden eval, regression comparison. Required gates depend on affected component.
7. **Review:** second agent reviews risk and code; founder/human approves merges affecting auth, data, AI behavior, film processing, pricing or production. No auto-merge to `master`.
8. **Release:** staging deployment only after approval; smoke tests; manual approval for production with rollback plan. No release if any critical security gate fails.
9. **Learn:** record regression fixture, root cause, changed behavior, measured result, owner, date, PR SHA in versioned GitHub docs; add new cases to permanent test suites. Never train on private youth footage by default.

## GitHub-first source of truth
- Existing: `AGENTS.md`, `CLAUDE.md`, `docs/COACH_CORE_SHARED_CONTEXT.md`, `docs/MVP_7_DAY_SPRINT.md`.
- Phase A: this charter, `docs/agents/AGENT_RUNBOOK.md` and `docs/agents/test-summary.json` extend those authorities. Reuse #39 / the founder decision packet for decisions and #61 CC-007 for the release/rollback checklist; no parallel decision log or release package. Film/AI evaluation remains proposed and NOT MEASURED.
- Every agent session starts by reading canonical files and issue/PR status. No system can guarantee that private memories in ChatGPT, Codex, Claude, Muse, or other providers are synchronized. PRs update GitHub docs; never silently rewrite cross-platform memory.

## Proposed CI pipeline (requires implementation PR and founder approval)
`pull_request` on recovery and protected branches:
- Node setup/pinned toolchain, clean install, typecheck, lint, unit tests; retain machine-readable JUnit/test evidence.
- Emulator rules tests against `demo-*` project only; no real Firebase credentials.
- Playwright smoke paths: signed-out denied, authorized coach login (emulator), play create/drag/undo/save/reopen, film clip tag/reopen, practice plan mock.
- Secret scanning of source and generated bundles with dummy canaries; dependency/license scan and allowlist; artifact retention without secrets.
- Risk score and PR summary comment, human reviewer for security-sensitive changes.
`schedule` nightly (after CI established): extended regression, dependency advisories, performance/bundle budget, AI golden set with mock/provider sandbox and bounded cost; report issues only when actionable.
`workflow_dispatch`: approved full staging smoke and release candidate evaluation.
**No workflow may auto-push fixes, auto-merge, rotate keys, modify live Firestore, or deploy production.**

## Coach feedback learning loop
- Only opt-in feedback and licensed/synthetic film in evaluation datasets. Never collect or replay identifiable minors' video or personal records into external LLMs by default.
- Normalize feedback to: component, reproducible input (redacted), expected vs observed, severity, consent, reviewer, and linked issue.
- Coach domain expert labels golden answers for football play concepts, formation annotations, age-appropriate drills and film suggestions.
- Maintain immutable golden examples with versioned scoring rubric; record precision/recall where labels exist, false positives, latency, inference cost and coach acceptance.
- Do not change AI prompts/models automatically based on a single coach rating; require A/B or offline eval and human review.

## Scorecard (baseline, not fabricated live metrics)
- Build/typecheck pass; test suites pass; zero critical unresolved security findings; cross-team access denial.
- Film: upload/playback/clip tag/reopen success, error rate, video processing time and cost, human-verified accuracy.
- Playbook: save/reopen fidelity, route/drag undo, export correctness, tablet touch success.
- AI: coach-reviewed usefulness and hallucination rate, structured output validity, response latency, cost per request.
- Product: activated coaches, week-4 retention, repeat play/film workflows, support tickets and time-to-resolution.
Set numeric thresholds only after baseline collection and founders' approval.

## Release gates and responsibilities
- **No-go now:** #52 reports F-01..F-04 fixed in code/emulator tests, with live/staging prerequisites still outstanding. #63 verifies L1/R1b/L0/FX-03 and ordinary play/plan protections on exact unmerged candidates; R1c and retained browser instability block acceptance. Required Film Analyzer (#50) remains unimplemented/unvalidated; film/AI metrics NOT MEASURED. See runbook evidence reconciliation; no blanket unresolved historical claims or shipped-functionality inference.
- Required approvals: security lead for auth/rules/keys; QA lead for tests; product/founder for MVP acceptance; operator for production release.
- All new third-party OSS code must have license verification and dependency security review before adoption.
- Seven-day Oct 20 target is a milestone, not permission to bypass security or film scope.

## Initial 3-phase rollout
**Phase A (now):** inventory + charter/runbook + missing issue/PR templates + machine-readable evidence + smallest safe improvement to existing CI. Labels/branch protection remain proposed; no settings changes. Product/security CI stays with existing owners. No deployment.
**Phase B:** automatic PR test summaries and daily issue triage; targeted browser/rules/AI/film evals; human-reviewed repair PRs.
**Phase C (after MVP):** opt-in coach feedback ingestion, nightly extended regression, measured experimentation, dashboards, guarded staging rollouts.
