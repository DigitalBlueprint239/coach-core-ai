# Isolated combined runtime / release-proof / aggregate candidate

Delivery for independent review, not release approval. MVP NO-GO. No merge, deployment, recovery, production/protection change or AI activation.

## Sources and isolation

Exact integration starting base: `4f6b901b6c4141f88f5d884af0d67d62b28f40c1` (accepted PR78), containing accepted runtime PR76 `61448f0feee198a8796f4077f32a52f7b863f90d` and B11/B15 PR75 `efc9116cf93c5d235b0b2edeb4d7be03a4e73cdc`. Accepted aggregate PR77 `bb157ba057913bd0835db8df9ca5eb569df0011f` is based on efc9116.

Accepted reviews: PR76 comment6243437733, PR78 comment6255494407, PR77 comment6259083011 and issue39 comment6259083215 (closure checklist). Accepted standalone scope does not imply combined acceptance or release approval.

Branch: `codex/combined-runtime-release-gate-2026-10-19`. Dedicated non-production review target: `review/coach-core-combined-2026-10-19`, frozen at efc9116. It is a comparison/event target only; no recovery/master branch is modified. This explicit user-requested isolated target supersedes the default AGENTS recovery target for this review. Original PR branches remain intact. A future recovery-target integration still requires its own exact candidate and review.

PR78 is retained by ancestry, including its superseded proof-repair history; its final accepted implementation is used. PR77 commits are cherry-picked without changing their source implementations:

| Original | Candidate commit | Purpose |
|---|---|---|
| dbf7a9ae7dd51092f9ec2ac86f3c19a0d67b23f4 | 36bc7a0 | initial aggregate |
| b139d18d5ea617fd4d505dbdd19ef1e0403662a9 | 656ef6d | F1–F4 repairs |
| 9f6cb69 | 80b7db6 | N1 containment / N2 always-run |
| bb157ba057913bd0835db8df9ca5eb569df0011f | 4cda712 | valid cancellation guard |

No textual cherry-pick conflict occurred. Reviewed semantic overlaps: workflow retains both PR78's L1/L2/L3 build/proof/gate steps and PR77's run.context/aggregate job; package scripts retain reporter/evidence/release-proof/import-OFF build and add test:gate. No lockfile, browser body/assertion, accepted runtime or execution-limit change.

Integration-only addition: include the isolated target in pull_request branches alongside recovery. The exact static workflow assertion is updated to require both literal target names, preserving the event/type checks. Initial focused run's exact-branch-regex failure is retained and is not counted as a pass. No test is removed or weakened.

## Validation protocol

Run focused reporter10/evidence19/gate33, release65 with full history and real ON/OFF builds, applicable import unit suites/typecheck, actionlint and membership/settings comparison. Preserve initial failures and actual skips. Then open this draft PR to trigger a real pull_request full selection (repeat1, workers1/retries0, unchanged timeouts); keep diagnostics/obsolete failures visible and separate. Do not use a narrowed workflow_dispatch to establish eligibility.

Record separately the exact source head and GitHub synthetic merge SHA. Workflow checks out the PR merge candidate by default; run.context binds github.sha to inspected/tested output and head_sha to the PR source head. Download all retained artifacts, compare archive and final-byte inventory hashes, contexts/manifests/exits/release gates and recompute aggregate membership/verdict. Same-commit import-OFF emulator behavior is not execution of the release-shaped artifact. No deployment proof is claimed.

An independent reviewer must assess the exact combined source/merge SHA and actual evidence. A green aggregate does not approve beta. Platform enforcement still needs missing-check, timeout, late-cancellation, same-SHA/rerun and protected-branch tests; queue tests apply only if the owner intends a queue. No settings changes are authorized here.

## Closure owners and status at candidate creation

| Item | Status/type | Owner | Required evidence / next action |
|---|---|---|---|
| Accepted runtime/import | standalone PASS61448f0; combined pending | Codex integration / independent reviewer | preserve exact repair/config/identity boundary; run unchanged D10-08a/08d and complete acceptance on combined SHA |
| PR78 L1/L2/L3 | standalone PASS4f6b901; combined pending | Codex build / independent reviewer | effective release OFF/config inlining plus same-commit browser OFF and accepted ON controls; retain hashes/provenance; no release-executable claim |
| Aggregate implementation | standalone PASSbb157ba; combined pending | Claude gate / independent reviewer | focused checks, complete membership/current-attempt evidence and real pull_request verdict |
| Required-check enforcement | untested platform gate; settings absent | Coach Drew/repository admin; Claude evidence | exact app-bound check on intended recovery target; missing/failure/cancel/timeout/late cancel/stale success blocking under separately approved validation; queue only if intended |
| Firebase/project/access/security | untested/release prerequisite | Coach Drew + designated security/deployment owner | read-only project/access/auth/provider/key restriction/rotation/origin/rules/preview controls; approved staging access and data-preserving rollback; no configuration change here |
| Kev audit | audit access incomplete, not assumed passed | Coach Kev / Coach Drew coordination | preserve/share audit outside damaged Windows checkout; source-pinned findings and evidence review, no apparent-deletion commits (issue39 comment6221265245); track each finding |
| Support recovery | owner decisions + unavailable capability | Coach Drew; designated support/security owner once chosen | approve credible ownership verification/channel/operator/escalation decisions and operational proof before promising recovery; no clearing/transfer/bypass or recovery action |
| Beta disclosure | draft/owner decision | Coach Drew | approve default-OFF/testing opt-in, fresh Not now ask-once, unfinished original-owner recovery and missing-team support limitation; manual re-save is already approved within its tested scope (6221265245), do not reopen or broaden it |
| Physical devices/accessibility/identity | untested device gates | Coach Drew + test owner | exact candidate on required phone/tablet/desktop/Windows touch; preserve approved identity UI, record scoped exclusions/visual decisions |
| Deployment/hosted artifact | untested; not authorized | designated deploy owner + independent reviewer | separately approved restricted staging deployment, hosted-byte/config comparison, real-provider auth/security smoke, cache/service-worker behavior and rollback verification; exact release-artifact execution remains unverified |
| H2/FX-02/N3/N2 observations | unresolved risks/history; not all confirmed app defects | Claude classification; Codex if app defect; Coach Drew disposition | retain diagnostic classification and N2-A2 order/state history; attribute recurrence or approved scoped disclosure; no speculative repair/non-recurrence closure |
| Dependencies/film/product/privacy | separate technical/owner gates | Codex/Claude technical; Coach Drew scope | exact-candidate audit/security disposition; reconcile settled founder decisions and remaining film/device/privacy/product prerequisites; no AI activation |
| Final release decision | NO-GO | Coach Drew after independent acceptance | all applicable gates/evidence/decisions closed; green aggregate alone is insufficient |

Final source/run/artifact verdicts and updated closure statuses will be posted in the evidence handoff on issue39 and linked from the draft PR, without altering the frozen tested source head merely to add reports.
