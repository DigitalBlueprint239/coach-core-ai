# Enforcement validation plan — preparation only

Implementation acceptance of PR77 and a successful PR79 evaluator do not establish required-check enforcement. No settings changes or extra platform test workflows are executed by this plan.

Owner: Coach Drew/repository administrator authorizes and configures any future disposable protected validation target; Claude/workflow owner implements reviewed fixtures; independent reviewer verifies API evidence. Production/recovery protection remains untouched until separately authorized. Record target SHA, source head, synthetic merge/queue SHA, GitHub App id, check-run id, workflow run/attempt, conclusion and observed merge eligibility for every case. No merge is needed to observe blocked eligibility.

Proposed authoritative check: exactly `Coach Core merge eligibility`, expected GitHub Actions app, intended eventual target `recovery/coach-core-mvp-2026`. Existing named acceptance contexts are visible but insufficient as required proof. Owner must choose up-to-date-branch policy or queue; no queue is assumed.

| Case | Bounded evidence to obtain after authorization | Required result / disposition |
|---|---|---|
| Positive trusted PR | Complete unfiltered same-attempt source membership,12 artifacts,four acceptance success, realpull_request; exact merge/head binding | evaluator ELIGIBLE and check success; protected target permits checks requirement only (not release approval) |
| Failed acceptance / failed evaluator / missing artifact | Reviewed synthetic test fixture or bounded candidate, not loosening actual tests | required check failure; merge eligibility blocked; preserve named reasons/report/exit |
| Missing authoritative check | No-run/filtered/invalid workflow or renamed context fixture on disposable protected target | absent/pending expected app-bound check blocks; no fallback to a same-name status from another app or old SHA |
| Timed-out matrix | Controlled bounded fixture that times out a prerequisite | aggregate runs, explicitly rejects incomplete coverage and fails; protected target blocks |
| Timed-out aggregate / lost runner | Reviewed short-timeout fixture separate from actual acceptance settings | no successful evaluator; terminal timed_out/cancelled or missing check must block; no need to raise production test limits |
| Cancel before aggregate | Normal/concurrency/API cancel while matrix active | aggregate guard/evaluator fail or hard terminalcancelled; no skipped-success; protected target blocks |
| Late normal cancel | Cancel only after entry guard skipped, using otherwise fully eligible trusted evidence; capture exact step timing | establish actual terminal check and protected target result. Entry guard is not a continuous cancellation latch. If cancellation policy requires blocking regardless of a completed eligible evaluation, review/implement terminal guard/design before enforcement acceptance |
| Force cancel during aggregate | Authorized force-cancel on disposable fixture after checks start | cancelled/no completed verdict cannot satisfy required check; actual platform blocking demonstrated |
| Same-SHA prior success + failed/cancelled rerun | Preserve old success, then controlled bounded rerun/newattempt; inspect selected requiredcheck and expected app | stale success cannot mask newer invalid/missing eligibility; R4 rejects oldattempt payloads; document GitHub selection. Full/failed-job upload semantics separately observed before claiming retry support |
| Diagnostic/obsolete completed failures | Complete true membership+terminalresults with allowed non-required failure, no missing outcomes | visible diagnostic failures remain reported without falsifying acceptance; legitimatephoneempty remains0selected/0executed/0passed |
| Narrow dispatch / push | Already modeled/observed; retain app/run binding | evaluatorINELIGIBLE despite green name-only acceptance checks; cannot satisfy protected target |
| Merge queue — only if intended | Actual merge_group:checks_requested on queue SHA, superseded group and rebuild, failed/cancelled/missing groupcheck | exact queue/head/provenance validated; requiredchecks block bad queuecandidate; if noqueueintended record N/A and verify up-to-date policy instead |
| Bypass/review/admin policy | Read-back approved intended rule and expected app id/bypass/review settings | owner-approved enforceable policy, not merely no naming collision; no routine bypass; independent read-back before activation |

Current observed protection absence and no configured GitHub environments/deployments are not proof about Firebase or hosted output. Source conditions, fixture results, Actions conclusions and actual protected-branch behavior must remain separate evidence categories.
