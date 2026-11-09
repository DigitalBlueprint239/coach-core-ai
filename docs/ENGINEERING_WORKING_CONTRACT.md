# Shared engineering working contract

Version: 2026-11-02 • Andrew “Coach Drew” Layton and Kevin (“Kev”)

Status: proposed workflow contract for review through this PR. The dual-owner approval direction is already recorded in [issue #65](https://github.com/DigitalBlueprint239/coach-core-ai/issues/65). Creating this file does not install automation, acknowledge an assignment for another engineer, or authorize a merge/deployment.

## 1. One engineering record

- Integration repository: DigitalBlueprint239/coach-core-ai.
- Integration trunk: recovery/coach-core-mvp-2026. Never push work directly to master.
- Start each change from a recorded full trunk SHA on a separate feature branch.
- Use existing coordination issue #39 for cross-lane technical handoffs and #65 for workflow/governance. Link focused task issues; avoid duplicate trackers.
- Issues hold current task state; PRs hold changes, review and exact-revision evidence; Actions hold execution results; deployment records hold actual deployed revisions.
- This contract holds durable rules, not a running status log. Google Docs remain meeting reference; do not require Coach to synchronize engineering records by hand.
- Read this contract, applicable AGENTS.md, linked task and current source before work. Historical documentation does not override newer explicit founder decisions. Surface unresolved conflicts rather than silently inventing a resolution.

## 2. Approval authority

Either Andrew or Kev may provide owner approval for merges, rules deployments and releases. Two human approvals are not automatically required. Record the approving human, exact SHA/artifact, operation, scope, date and conditions.

Eligibility to approve is not blanket approval of pending work. Required checks, independent review, native permissions, bounded attempts/budgets and current release holds remain. No autonomous agent merge, deployment, spend, live AI activation or credential change follows from this contract.

GitHub sees the authenticated account. Shared DigitalBlueprint239 access cannot establish two distinct native reviewers. Do not impersonate a human, self-approve as an independent reviewer, guess usernames, disable protections or bypass a native gate. Native reviewer/admin settings are separate configuration and are not changed by this file.

## 3. Ownership

| Result | Accountable execution lane |
| --- | --- |
| Smart Playbook, football-core and approved design implementation | Kev’s engineering lead |
| Authentication, shared rules, CI and release engineering | Kev’s engineering lead; coordinate affected contracts with Dex |
| Film source recovery, Film/retention qualification and proposed selective ports of older repairs | Dex |
| Independent acceptance | Named non-author reviewer for the specific change |
| Product scope and material business decisions | Andrew and Kev within their agreed business remit; escalate disagreement |
| Editorial/operations coordination | Drew 2.0; no implied code or release authority |

Lane split is the proposed coordination arrangement, requiring both engineers’ acknowledgment. One accountable author per task. Do not modify another engineer’s branch. Coordinate shared files first: firestore.rules, storage.rules, firebase.json, package manifests/locks, workflows, App, Dashboard and shared auth/team code. Use small separate PRs for shared infrastructure changes.

## 4. Required task record

Reuse an existing issue where applicable. Each actionable issue contains:

- Outcome and acceptance criteria.
- Accountable engineer/lane and independent reviewer; GitHub assignee only when username is verified.
- Current state: Ready, In progress, Blocked, In review or Accepted.
- Repository, branch, full source SHA and linked PR.
- Authority and limits; dependencies and exact blocked reason.
- Latest actual activity/evidence, next action and responsible party.
- Remaining FAIL/UNRUN and acceptance/release distinction.

At work start, record the claim/ownership before overlapping edits. At a meaningful checkpoint, blocker, handoff or session end, update the same issue with the exact resume point. “Working” requires actual activity; a schedule or assignment alone is not execution.

Handoff receipt: prepared → saved → acknowledged → started → delivered → independently verified. Record only observed stages. Use authorized GitHub handoffs, not routine founder relays. A posted issue is not proof an external agent was awakened.

## 5. Change and evidence workflow

1. Read current authority, dependencies and exact baseline; check whether another worker owns the area.
2. Make a focused change on an isolated branch; use test-first regressions for behavior repairs.
3. Link its issue in the PR. State purpose, changed areas, provenance, decisions not settled by the plan, dependencies and rollback.
4. Record exact commands, environment, tested source SHA, results and safe durable evidence links. Preserve failures and invalid attempts separately.
5. Run applicable current lint/type/unit/build/rules checks and authorized preview/browser acceptance. Local PASS does not establish hosted acceptance. Do not exceed protected hosted-attempt limits.
6. Non-author reviewer gives PASS, FAIL or BLOCKED against the exact candidate. New source changes require proportionate revalidation.
7. An eligible human owner approves the specific merge. Merge may trigger staging; account for that effect before merging.
8. Verify integrated behavior and deployment outcome separately. Close the task only when its acceptance criteria pass.

Merged, accepted, staged and released are distinct states. Do not auto-close an end-to-end acceptance issue merely because one component PR merged.

## 6. Toolchain and data contracts

React remains the interface framework. Vite builds, Vitest tests and browser import.meta.env are the current stack; REACT_APP_ prefix and build/ output are retained. Server/Node process.env remains valid where appropriate. Do not port the old react-scripts/CRA/Jest stack wholesale.

Before porting, reconcile team ownership, account isolation/linking, play/practice-plan schemas, revision/concurrency, draft recovery, sign-out behavior, V1/V2 readers and flags. Preserve saved-data compatibility and security protections. Only publishedLibrary() content reaches coaches; drafts stay in review. Live AI stays off.

Firebase remains the host. [RELEASING.md](RELEASING.md) describes the existing release path. Staging currently shares production accounts/data per that runbook; hosting separation is not data isolation. Use isolated synthetic emulators for tests unless broader access is explicitly authorized. Rules, Functions and Storage deployment are separate from hosting. Admin SDK backend access requires its own authorization checks.

## 7. Reconciliation before older-code integration

- Dex verifies and preserves reported Film app 52eef94, rules eebc21b and harness 6c0e392, resolving full SHAs and checking source-to-test correspondence. These short references are supplied reports, not preservation receipts.
- Preserve dirty index/working tree. No reset/clean/stash/checkout or blanket commit as a cleanup shortcut. Inspect source and reachable history for secrets/private material before any remote preservation.
- Use an authorized private destination where needed; do not publish private snapshots or change access settings. Verify remote refs against source SHAs. Recover uncommitted-only source separately.
- Inventory relevant branches/PRs with dependencies, divergence, evidence, shared files and disposition: retain/port, already covered, superseded, evidence-only or unresolved.
- Kev’s lead records current trunk and #102/#103 state. Do not assume b1ae308 remains current.
- Both leads reconcile Film collections, Functions, storage/IAM dependencies and rules tests. Distinguish observed live resources from proposed/emulator resources.
- Record whether persistence contract #53 protections remain needed and where they are covered.
- Retire stale branches only after preserved provenance, unique-change/dependency review and explicit housekeeping authority.
- Record one jointly acknowledged baseline, contract version and port order before shared integration.

January Smart Playbook-only beta is a recommendation, not an adopted scope change. Film remains required under the existing MVP scope until explicitly amended by the proper owner. Component acceptance does not clear MVP NO-GO.

## 8. Automation boundary

Existing CI/previews/deployments provide machine evidence; inspect their actual runs rather than assume success. Reuse an existing Project board if present.

Proposed follow-up: automate supported Ready/In progress/In review board transitions, required issue/PR fields, preview/evidence links and deployment receipts. Do not mark a task Accepted from merge alone. Each workflow change needs scoped review, permissions/cost assessment and observed verification. This documentation PR installs no board, worker, reminder or workflow and changes no protection.

## 9. Privacy and recovery

Keep secrets, tokens, personal records, private footage and youth information out of public issues, source and artifacts. Link an authorized private evidence location where necessary. Avoid showing secret values while diagnosing.

Stop the affected operation on missing source, ambiguous evidence binding, unsafe publication, destructive cleanup, incompatible data contracts, exhausted limits or platform denial. Continue unaffected authorized work. Never repeat an unchanged failed action or weaken safeguards to obtain PASS.

## 10. Adoption and first verification

- [ ] Both engineering leads acknowledge the same contract revision in this PR.
- [ ] Current full trunk SHA and pending dependency order are recorded.
- [ ] Source-preservation receipt and older-work inventory are linked from existing coordination records.
- [ ] Beta scope and remaining acceptance gates are explicit.
- [ ] One real task completes the issue → PR → checks → independent review → owner decision → verified outcome path without Coach relaying messages.

Until observed, these remain unchecked. Neither a contract merge nor these checkboxes alone proves external agents are running.
