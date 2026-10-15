# Phase A — operate the existing recovery process

Issue [#65](https://github.com/DigitalBlueprint239/coach-core-ai/issues/65), charter [#66](https://github.com/DigitalBlueprint239/coach-core-ai/pull/66). Inventory date: 2026-10-14. Owner: Codex; independent security/acceptance reviewer: Claude; product acceptance: Coach Drew. **MVP NO-GO.** AI generation disabled. Film Analyzer remains required under [#50](https://github.com/DigitalBlueprint239/coach-core-ai/issues/50), blocked pending implementation and approvals. BDN-AEO-001 queued.

This runbook extends the charter, #39 and shared project documentation. It does not create another dashboard, decision authority, product test suite or autonomous agent service.

## Discover: inventory before editing

| Existing asset / inspected reference | Actual behavior | Phase A treatment / owner |
|---|---|---|
| `AGENTS.md`, `CLAUDE.md`, `docs/COACH_CORE_SHARED_CONTEXT.md`, `docs/MVP_7_DAY_SPRINT.md`, `MASTER_TRACKER.md` | Versioned instructions/status; older completion claims coexist with later corrections | Append dated superseding milestones; no readiness percentage. Codex / Claude coordinate on #39 |
| `.github/workflows/security-rules.yml` at `8f0d9f7` | Three credential-free jobs: emulator rules, Functions lint/tests, selected web-auth tests + bundle canary. `contents:read`; 20/10/20-minute caps | Preserve unchanged. Claude owns CI/security; no duplicate baseline pipeline |
| `.github/workflows/e2e-emulator.yml` at `8f0d9f7` | Auth/Firestore/Functions demo emulators; two browsers; dispatch repeats; 120-minute job, artifacts; cancels superseded same-ref runs | Preserve unchanged. Claude owns harness/reporters. Its SHA-only artifact naming/cancellation does not establish immutable evidence across all reruns |
| `.github/workflows/model-optimization.yml` at charter `3cfd9c6` | Unpinned Python/PyTorch installs; synthetic formula presented as accuracy; credential-file live Firestore write; PR comment write; deprecated artifact v3; no job cap | Quarantine compute job (`if:false`), remove live-write/comment steps, replace automatic heavy triggers with bounded evidence-format validation in this same workflow. Old source retained in Git history; no model executed |
| `.github/scripts/bundle-canary-scan.sh`, `annotate-reporter.mjs` at `8f0d9f7` | Existing security evidence tooling on unmerged client/security stack | Leave with owners; not copied into the charter branch |
| Issue forms / PR template / `SECURITY.md` | Absent at charter/reviewed baseline | Add only missing bug/work intake, PR checklist and private-report routing |
| [#61 CC-007](https://github.com/DigitalBlueprint239/coach-core-ai/pull/61), `3c7c4b0` | Existing staging readiness, release/rollback procedures, preservation requirements and desktop/tablet checklist | Reuse; do not create a second release package |
| [#52 security](https://github.com/DigitalBlueprint239/coach-core-ai/pull/52), `bb6483d`; [#63 independent report](https://github.com/DigitalBlueprint239/coach-core-ai/pull/63), `16e6067` | Security status and §9–10 acceptance, including failures/classification | Link authoritative reports; do not duplicate Claude's acceptance suite |
| [#68 local evidence](https://github.com/DigitalBlueprint239/coach-core-ai/pull/68), `d617d2c` | Exact application `4757eaf`: 434 unit passes, 10 repeats/engine with retained failures; separate evidence folders/checksums | Index in `test-summary.json`, never aggregate across candidates or replace failed history |

`git ls-tree -r --name-only 3992d8d .github` and the same command at `3cfd9c6` show **only the legacy model workflow** on recovery/charter. Security/emulator workflows exist on the unmerged reviewed stack, not on recovery yet. This distinction prevents claims that all gates already run on the default branch. No templates/SECURITY file were found by `rg --files`/tree inventory. Main platform is CRA/Jest, not the standalone Vite/Vitest app; no package script or framework was upgraded.

Inventory commands: `git worktree list`; `git status --short`; `git ls-tree -r --name-only <SHA> .github`; `rg --files .github docs/agents`; read all three workflows, current context/sprint/tracker, #39/#64 comments and PR metadata #52/#53/#54/#55/#59/#60/#61/#63/#66; `git show <SHA>:<report>`. These were read-only. See #39 ownership comments [6181053507](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6181053507), [6181086775](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6181086775), [6181109493](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6181109493).

## Measure / diagnose: reconcile current evidence

| Requirement | Classification and evidence | Next owner |
|---|---|---|
| F-01–F-04 historical code blockers | **VERIFIED (reported code/emulator checks)** in #52 `CLAUDE_SECURITY_DAY2.md`: fixes in code, not deployed. The charter's blanket “unresolved” claim was stale. Live key history/rotation, staging auth and live rules remain unverified | Claude / Coach Drew; sensitive details private |
| Ordinary play/plan protections, L1/R1b/L0/FX-03 | **VERIFIED at candidate6/7**, #63 §9: each 10/10 per engine. Unmerged evidence, not full product acceptance | Claude repeats after bounded client repair |
| R1c unfinished-import “Not now” | **BLOCKED**, candidate7 D10-06d 10/10 failures per engine; founder owner/team-resume guidance in #64 comment6179690643 | Codex client repair first; independent repeat Claude |
| H2/FX-02, local N2 | **BLOCKED**, retained timeout/stall/team-ack failures. #63 §10.5 confirms local H2 setup false-positive helper; N2 app/SDK/host cause remains unresolved | Claude harness / Codex client as classified |
| Local N1 / F1 | **PENDING REVIEW**: Claude classified N1 as library-check harness race; helper hardened. F1 local mock-server connection failure; discovery glob repaired. New tests do not erase original failures or establish candidate8 acceptance | Claude candidate8 |
| Stats profile writes | **BLOCKED / deferred product decision**: #63 §10.5 W1 dormant provisioning path, not working statistics; no false dashboard metric | Coach Drew / Claude |
| D1–D9 | **PENDING REVIEW (provenance)**: founder says directions settled, per [#61 reconciliation](https://github.com/DigitalBlueprint239/coach-core-ai/blob/3c7c4b008e1c03c681bc5806cc59ece4c233d8f5/docs/CC_007_DECISION_RECONCILIATION.md). Latest #52 packet still says OPEN. Missing exact existing approval record; do not reopen nine decisions or infer details/spending authorization | Claude / Coach Drew supply one source link/version |
| D10 | **VERIFIED implementation/testing approval**; originals preserved, deletion disabled; R1c repair follows founder guidance. Not deployment approval | Codex / Claude |
| Film / AI quality, latency, cost | **NOT MEASURED**. Required Film #50 remains blocked. Synthetic pipeline formulas and format tests are not evaluations | Film/football owners unassigned; Coach Drew assigns |
| Staging / physical tablets / genuine hidden tabs | **NOT MEASURED**. Local/emulated touch is not a physical-device result | Claude / Coach Drew authorize later |
| Missing original failed L1 ZIP/PNG | **BLOCKED evidence gap**, disclosed in #64/#68. Earlier logs/results/DOM/hashes retained. New runs cannot recover the originals | Codex retains disclosure |

`test-summary.json` is a dated, machine-readable **index** of these reports. It intentionally keeps failing and succeeding batches separate; totals overlap and must not be summed. It is not a live test execution or acceptance score. An evidence-format CI PASS means only the index is internally valid. Film/AI values stay literal `NOT MEASURED`, never zero or fabricated percentages.

## Implement: intake, ownership and review loop

1. Read instructions/context and #39; inspect exact heads before edits. Discover → Measure → Diagnose → Implement → Test → Compare → Document.
2. Search existing issues; use the missing-work or synthetic-defect form only when needed. Record severity, owner, exact file scope, baseline SHA, repro, expected outcome and acceptance cases. Opt-in feedback uses redacted/synthetic reproductions; permission records remain private. Security findings use `SECURITY.md`, never a public exploit/secret report.
3. Claim files on #39 before editing shared interfaces. Codex owns bounded client repairs and this Phase A governance tooling; Claude owns auth, rules, Functions, independent E2E/reporters and security review. Founder decides product directions/acceptance. The other charter roles are proposed responsibilities, **not running agents or assigned people**.
4. Acceptance blockers take priority. Keep #59/#60/#64 frozen; branch from pinned SHA, produce focused commits/draft PR and exact handoff. No edits to Claude's harness to make own client green.
5. Use task-appropriate existing tests. Record clean install versus reused dependencies, commands, Node/browser versions, retries/skips and unreachable assertions. No arbitrary sleeps, assertion weakening or green claims from later passes alone.
6. Preserve every failed run. Allocate `evidence/<issue>/<SHA>/<run-id>/<attempt>/<engine>` **before** invoking a tool that cleans its output. Refuse reused directories. Retain logs/results/trace/PNG, SHA256 manifest and failure classification. Raw traces may contain tokens: private reviewer storage only; publish sanitized copies/checksums. Actions in this public repository are not private storage.
7. Document before/after results, root cause, smallest fix, rollback and limitations in existing handoff/shared context/sprint. Hand exact application + harness SHA to Claude; Coach Drew accepts product behavior. GitHub remains shared memory; cross-chat synchronization is not promised.

## Test / compare: implemented versus proposed automation

Implemented in this PR head (not merged):

- Existing `model-optimization.yml` now runs only **evidence-format validation** on relevant PRs targeting recovery or the charter branch. No push/nightly/manual-model trigger. Its old compute job is unconditionally skipped; Firestore and PR-comment write steps removed. No product build/test gate is replaced.
- Built-in Node validator checks exact commit formats, source links, unique run IDs, nonnegative balanced counts, zero-test/skip false passes, preserved failures and unmeasured metrics. Twelve synthetic format checks cover invalid input; these are not coaching acceptance.
- `contents:read`, checkout without persisted credentials, no OIDC, write token, secrets, model packages, provider calls, production project or credentials. One standard `ubuntu-latest` runner, Node22, **5-minute cap**. No concurrency cancellation of prior evidence runs.
- Output allocated as `phase-a-<run_id>-<run_attempt>-<job>-<SHA>`, with separate self-test log and validation subdirectory. `upload-artifact@v4`, always attempted, 14 days. Early runner/checkout failure may leave no artifact; retain the Actions run/log and mark missing evidence. Do not rerun over the original directory.

Before activation: repository metadata confirms **public**. [GitHub's standard runner documentation](https://docs.github.com/en/actions/reference/runners/github-hosted-runners) states standard hosted runners are free for public repositories. [Billing documentation](https://docs.github.com/en/billing/concepts/product-billing/github-actions) governs storage/allowances. This job uploads only a small sanitized index/log, no cache or large traces. Actual account billing/storage usage **NOT MEASURED**; do not infer permission to spend, switch to paid/larger/private runners, or increase retention. No billing settings changed. Activation here means a PR check, never deployment/model enablement.

Proposed, **not activated**: nightly regression/evals, daily triage, risk/comment bots, automatic feedback ingestion, golden film/AI sets, AI/model budgets, OSS research automation, branch protection/labels, deployment/staging automation. Human review and separate permissions/cost approval required. No agents launched, automatic issue creation, merges, credential rotation, live writes or paid model calls.

Local format commands (Node22; no install needed):

```sh
node .github/scripts/validate-test-summary.mjs --self-test
node .github/scripts/validate-test-summary.mjs docs/agents/test-summary.json ../phase-a-local-validation-01
# Must fail without altering the existing output:
node .github/scripts/validate-test-summary.mjs docs/agents/test-summary.json ../phase-a-local-validation-01
```

Evidence and observed hosted result are recorded in `PHASE_A_VALIDATION.md`. The schema is enforced by the validator; future importer adapters need source-specific tests and reviewer ownership before automation. Missing input/malformed/empty test lists fail validation. Do not paste arbitrary raw reports into the public index.

## Dependency order / release / rollback

Phase A is stacked on #66 `3cfd9c6`; no application stack is silently integrated. Future authorized integration: approved security baseline #49 → contract #53 `3ec22cd` → harness #54 `ecc6400` → D10 #55 `819802c` → client #59 `c21c0c6` → dependency #60 `2cf1a5c`. #40's applicable logger/FieldMemo repairs are already included in #59; do not duplicate them. #61 `3c7c4b0` supplies the readiness package. Claude's #63 L0/FX-03 fixes plus #64 `8f0d9f7` and the focused R1c repair require a newly pinned **test-only** candidate, not merging the acceptance branch. #68 is evidence only. Standalone application remains separate; #67 visual design is not approved. Review/resolve dependencies before any retarget/merge; no merge is authorized here.

Use [#61's existing staging/rollback and preservation package](https://github.com/DigitalBlueprint239/coach-core-ai/blob/3c7c4b008e1c03c681bc5806cc59ece4c233d8f5/docs/CC_007_STAGING_READINESS.md) and Claude's smoke plan for later authorized operations. Preserve account/team drafts, pending imports, original legacy bytes and revision semantics. Phase A adds **no data migration**. Never replay/delete quarantined queues or roll data back with code.

Before merge, rollback is simply leave this isolated PR unmerged; frozen candidates remain intact. After a future authorized merge, revert the governance commit via reviewed PR. **Do not restore the legacy credential-file/live-write model workflow**: retain its quarantine while reverting optional evidence automation. No production/deployment rollback is executed by this runbook. Artifacts expire; an authorized reviewer must preserve sanitized evidence/checksums in version control before expiry, raw sensitive evidence in approved restricted storage. No automatic deletion introduced.

## Phase A completion boundary

Delivers inventory, charter reconciliation, existing-process runbook, missing intake/PR templates, versioned machine-readable evidence and one safe observed governance CI improvement. Does not satisfy independent product acceptance, film/AI evaluation, staging/physical-device readiness, a running seven-agent service or release authorization. Remaining work stays in #39/#50/#65, not a competing command center.
