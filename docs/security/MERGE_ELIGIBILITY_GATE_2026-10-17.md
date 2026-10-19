# Coach Core merge eligibility — aggregate release check (delivery, not acceptance)

Date: 2026-10-17 (revised 2026-10-18 for F1–F4 and N1/N2). Author: Claude (independent test/evidence owner), as a bounded repair on top of the
accepted B11+B15 integration. **Draft only. Nothing here changes repository settings.** MVP remains NO-GO.

## Why

The independent review of PR #75 ([comment 6243036404](https://github.com/DigitalBlueprint239/coach-core-ai/pull/75#issuecomment-6243036404))
demonstrated live that a one-test `workflow_dispatch` produces green check runs named exactly
`E2E acceptance (chromium|firefox|phone-chromium|phone-firefox)` on the candidate commit. Those names
prove a job ran, not that the complete acceptance selection ran. It also found no `merge_group`
coverage, cancel-in-progress leaving cancelled check runs, and that PR #75's frozen target triggers no
workflow at all. No branch protection or rulesets are active on any target (read-only check, 2026-10-17).

## Base and dependencies (stated before editing)

- Base: **`efc9116cf93c5d235b0b2edeb4d7be03a4e73cdc`** = PR #75 head (accepted B11 `f2e1fed` + B15 `ffb4045`
  on harness `7d56300`), runtime `518e9e5` unchanged.
- Branch: `claude/ci-merge-eligibility-gate`; draft PR targets `codex/integrate-b11-b15-2026-10-17` so the
  diff is exactly this slice. Merging this slice depends on PR #75 landing first (and PR #75's own
  sequencing onto `recovery/coach-core-mvp-2026`).
- Not included, by design: PR #72 (`35e0d77`), default-off import configuration, any runtime repair.
  D10-08a is a known failure on runtime `518e9e5`; this gate does **not** carve it out. On the current
  runtime the acceptance bucket cannot be green, so the aggregate will (correctly) report INELIGIBLE
  until Codex's runtime/import candidate is integrated and validated.

## What the aggregate is

One job, `merge-eligibility`, check context **`Coach Core merge eligibility`**, `needs: e2e`,
`if: always() && !cancelled()`, `permissions: contents: read, actions: read`. It reads what the twelve
`E2E <bucket> (<project>)` jobs produced and decides. It runs nothing of the suite itself, adds no
retries, changes no selection. Decision logic lives in `e2e/scripts/merge-eligibility.mjs`
(`evaluate()` is pure and fixture-tested); the workflow calls it with the run's identity.

Inputs it gathers on the runner:
1. Job conclusions for **this run attempt** via the Actions API (`GITHUB_TOKEN`, read-only).
2. The twelve evidence artifacts `e2e-results-<bucket>-<project>-<github.sha>` (download-artifact
   pattern bound to `github.sha`), each read for `UPLOAD_OK`, `INVENTORY.sha256` re-verified against the
   retained bytes, `run.context`, `results.json`, `.last-run.json`.
3. Source-derived membership: `playwright test --list --reporter=json` for every project × bucket on the
   very checkout being judged (no hard-coded test counts; today 65/10/1 desktop, 15/0/0 phone).

Each e2e job now writes `e2e/ci-evidence/run.context` (`sha, head_sha, event, run_id, run_attempt,
project, bucket, repeat, grep`) before the browser run; B15 inventories and hashes it like any other
retained file. This is the only change inside the e2e job.

## Success / failure rules (fail closed; any reason ⇒ INELIGIBLE, exit 1, `::error`)

Repaired 2026-10-18 after the independent review of `dbf7a9a` (c-6256897327, F1–F4). The consumer no
longer trusts anything it has not authenticated (complete inventory) and validated (schema).

| Rule | Requirement |
|---|---|
| R1 | event ∈ {`pull_request`, `merge_group`}. `workflow_dispatch` and `push` can never satisfy the gate. |
| R2 | every expected job (4 projects × 3 buckets) exists exactly once and is `completed`; the 4 **acceptance** jobs concluded `success`; diagnostic / obsolete-fault-model jobs may be `success` or `failure` (completed test failures stay visible and non-blocking — approved B11) but `cancelled` / `skipped` / in-progress / missing / duplicate blocks. A non-required job that concluded `success` while its own `.last-run.json` says `failed` is inconsistent evidence and blocks. |
| R3 (F2) | every expected job's artifact exists, carries `UPLOAD_OK`, and its `INVENTORY.sha256` is **complete and authentic**: every non-comment line is `<64 hex><2 spaces>e2e/{ci-evidence\|test-results}/<canonical path>` (malformed lines are rejected, not filtered); no duplicates; no absolute, `..`, `.`, empty-segment or backslash paths; every retained regular file under `ci-evidence/` and `test-results/` (hidden files included) is listed except the documented self-exclusions `ci-evidence/INVENTORY.sha256` and `ci-evidence/UPLOAD_OK` (exactly B15's `find` exclusions); every listed file exists as a regular in-artifact file and its digest matches; symlinks are rejected and never followed, unexpected top-level entries are rejected, and `run.context`, `run.log`, `run.exit`, `results.json`, `.last-run.json` must be present and listed. Path validation is a string check before any filesystem access. **Containment first (N1 repair of `b139d18`):** the artifact directory and both retained roots must be real directories (lstat, never followed) resolving to exactly `<artifact>/<root>`; otherwise the record is rejected immediately and nothing under the artifact is opened — no `UPLOAD_OK` probe, no inventory, no provenance/results/last-run read. Only files found by the no-follow walk are ever read (realpath re-checked, opened `O_NOFOLLOW`); `run.context`, `results.json` and `.last-run.json` are parsed only after the inventory verified completely; parser exception text is never copied into diagnostics. |
| R4 | each artifact's `run.context` binds to this `sha`, `head_sha`, `run_id`, `run_attempt`, `event`, the right project/bucket, and `repeat` = 1; a stale artifact from another attempt or commit is rejected. |
| R5 (F1, F3) | identities are Playwright's **stable test ids** (`spec.id`; identical in `--list` and in a run of the same config — verified on 1.64 — and what `.last-run.json` references); the identities in `results.json` must equal the source membership for that project × bucket as a **strict multiset**: no missing, no extra, no duplicate, and **no test row of another project** (checked before any filtering). Acceptance membership must be **non-empty** for every project. Zero executions pass **only** for a legitimately empty non-required selection: membership empty **and** `results.json` holds no test row of any project **and** a clean last-run — reported "legitimately empty: 0 selected, 0 executed, 0 passed". |
| R6 (F3, F4) | `results.json` must be schema-valid (suites/errors/stats; every spec has id/file/line/column/title, every test a projectName and a known status, every result a known status) with `errors[]` empty and `stats` equal to the per-test outcome tally. **Every** expected identity in **every** bucket must have `repeat` completed results (`passed`/`failed`/`timedOut`); skipped, interrupted or absent results are reported as "not executed to completion — selection is not coverage". Acceptance additionally requires `status: expected` and all results `passed`. `.last-run.json` must be a parsed, schema-valid record (`status` ∈ passed/failed/timedout/interrupted; `failedTests` an array of unique ids) in every bucket; its `failedTests` must equal Playwright's own rule over `results.json` (unexpected + did-not-run), `passed`/`failed` must agree with failures/errors, `interrupted`/`timedout` block; acceptance requires `passed` with no failed ids. |
| R7 (F1, N2) | the authoritative job has **no conditional-skip path**: job-level `if: ${{ always() }}`, every step `always()`, a first step that fails the job when the run was cancelled or the matrix result is `cancelled`/`skipped`, and an artifact download that cannot skip the evaluation (`continue-on-error`, so missing artifacts become named R3 reasons). Its only successful outcome is a successful evaluation. Any gathering failure is a reason and a nonzero exit: collector spawn error, nonzero exit or signal, non-JSON or non-report output, non-empty `errors[]`, foreign-project rows, missing/duplicate ids, bucket partition ≠ unfiltered selection, **empty acceptance selection**, unreadable artifact, malformed jobs API response. `--list` now runs with `--pass-with-no-tests`, so a legitimately empty bucket exits 0 with `errors: []` (verified for the phone diagnostic/obsolete buckets) and the former "exit 1 + JSON is fine" tolerance — which also trusted genuine collection failures — is removed. No test counts are hard-coded. |

Output: step summary table (job, conclusion, artifact, selected, executed, passed, failed, verdict), a
`::notice`/`::error`, and artifact `merge-eligibility-<sha>` (`merge-eligibility.json|md`).

## Triggers (workflow edits in this slice)

- `pull_request` → `recovery/coach-core-mvp-2026`, types `opened, synchronize, reopened, ready_for_review`
  (ready_for_review added so a draft promoted to ready is re-validated on its current head).
- `merge_group: types: [checks_requested]` — **applies only if the owner enables a merge queue on
  `recovery/coach-core-mvp-2026`; none exists today.** Declared so a queue's candidate commit receives the
  same validation and verdict; harmless when no queue is configured (the event never fires).
- `push` (claude/**, recovery) and `workflow_dispatch` unchanged: still run the matrix for evidence, but
  the aggregate reports INELIGIBLE on them by rule R1 (so bounded runs are visibly red on the aggregate
  and green/red on the informative per-job checks).
- Concurrency: unchanged `cancel-in-progress`. **N2 repair (review of `b139d18`):** the former job condition
  `always() && !cancelled()` let the authoritative job end **skipped**, and GitHub reports a skipped job as
  Success for required-check purposes ([docs](https://docs.github.com/en/pull-requests/reference/status-checks):
  "A job that is skipped will report its status as "Success"… It will not prevent a pull request from merging,
  even if it is a required check."). The job now always runs and fails closed (see R7). What remains possible:
  a **hard cancellation or termination of the aggregate job itself** (e.g. a cancel that reaches it while it
  runs, force-cancel, runner loss) ends it `cancelled` — never `success`. GitHub's status-check reference
  does **not** state whether a required `cancelled` check blocks merging; that is therefore an enforcement
  property to verify on the protected target, not a property this workflow can guarantee. Observed Actions
  behaviour for normal, cancelled-run and concurrency-cancelled cases is recorded in the delivery evidence
  (ev. 80), separately from the static workflow-logic check. Artifact binding (R4) additionally rejects stale
  attempts.
- Not added: a trigger for PRs targeting the frozen harness branch `claude/n2-repair-acceptance-518e9e5`
  (it would start full matrices for stacked review PRs; owner decision).

## Required-check enforcement proposal (NOT applied)

- **Target branch:** `recovery/coach-core-mvp-2026` (observed `3992d8d`; currently "Branch not protected";
  repository rulesets: 0).
- **Required status check:** exactly one — `Coach Core merge eligibility` (GitHub Actions app). The four
  `E2E acceptance (*)` contexts stay visible but are **not** proposed as required (name-only checks are
  satisfiable by a one-test dispatch, as demonstrated).
- **Events that produce it:** `pull_request` to recovery (incl. ready_for_review), `merge_group` if a
  queue is enabled. Push/dispatch runs also produce the context but always as failure.
- **Settings to consider together (owner decision, not performed):** require branches up to date before
  merging or enable a merge queue (either forces the verdict onto the exact merge candidate); require at
  least one approving review; no bypass for routine use; do not enable the rule until this slice and PR #75
  are merged into recovery (otherwise every PR is blocked by a context that never appears).
- **Reruns (narrowed to observed behaviour):** an aggregate-only rerun (attempt 2 of run 39186218570) found
  all twelve matrix jobs carried forward under attempt 2 by the per-attempt jobs API, downloaded the attempt-1
  artifacts and was INELIGIBLE with 12 additional `R4 … run_attempt 1 != 2` reasons; its report upload under
  the same name **succeeded** (two same-named report artifacts, one per attempt). Upload behaviour for a
  full-matrix or failed-jobs rerun is **not observed** and not claimed. The supported path to a verdict is a
  fresh run; an attempt-aware retry scheme would be a separate change with its own review.
- **Unverified until demonstrated (stated explicitly):** an actual `pull_request` or `merge_group`
  **ELIGIBLE** verdict on an appropriate candidate (requires the combined runtime/CI candidate and a full
  acceptance run); merge-queue execution; GitHub required-check selection across reruns on the same SHA;
  how required-check rules treat a `cancelled` aggregate; required-check binding to the GitHub Actions app; up-to-date/queue policy. **Enforcement readiness is not claimed.** No green verdict is manufactured here.

## Focused validation

- `node e2e/scripts/merge-eligibility.test.mjs` (also `npm --prefix e2e run test:gate`): **33 checks** (29 from the F1–F4 repair + 4 for N1/N2: root-link no-read with an fs tracer — the link target and everything below a rejected root are never stat-ed, listed, opened or read, and no outside content reaches the record or diagnostics; artifact-dir link, sub-directory link, missing / non-directory root, parse errors not echoed, valid artifact reads stay inside; a `b139d18` reproduction showing it parsed outside run.context/results and echoed outside content; a static workflow-logic check of the no-skip path, which is **not** an Actions observation).
  Preserved (11): complete success (pull_request; merge_group), dispatch/push rejected, failed required job,
  failing tests under a green job, cancelled required / non-required, skipped, in-progress, missing /
  duplicate job, missing artifact, no `UPLOAD_OK`, inventory problem, narrowed grep recorded/unrecorded
  (acceptance and diagnostic), different sha / run / attempt / head, repeat mismatch, run-level errors,
  skipped/repeated results. New per finding: **F1** collector healthy/partition/`--pass-with-no-tests`,
  12 collector fail-closed cases, all-zero acceptance in `evaluate`, **full CLI** positive control (exit 0
  ELIGIBLE), the reviewer's erroring collector + zero results (exit 1, R7 named), a collector listing
  nothing (exit 1); **F2** reader baseline, 17 inventory cases (run.log-only + tampered unlisted results,
  digest mismatch, unlisted payload incl. hidden, listed-missing, duplicate, malformed, single space,
  `../` escape with matching digest, in-prefix traversal, absolute, symlink to outside, self-exclusion
  listed, stray top-level entry, missing required evidence, no inventory, empty inventory) each rejected
  by the reader **and** the evaluator, canonical-path unit cases, twelve on-disk artifacts end to end;
  **F3** 10 identity cases (duplicate execution, foreign failed row in an empty artifact, all-skipped
  diagnostic, foreign row next to complete acceptance, interrupted, extra identity, duplicate source id,
  missing id, stats mismatch, unknown status) with completed diagnostic failures still non-blocking;
  **F4** 11 last-run cases plus a real malformed `.last-run.json` under a matching complete inventory.
  **Reproduction checks (5 covering 6 reproductions; plus 1 for N1 against `b139d18`):** the `dbf7a9a` implementation is loaded from git and shown to accept the
  reviewer's invalid inputs (F1 all-zero acceptance; F1 full CLI exit 0 ELIGIBLE; F2 run.log-only
  inventory → ELIGIBLE and `../` escape authenticated; F3 duplicate / foreign / zero-completed → ELIGIBLE;
  F4 null and malformed last-run → ELIGIBLE). They are **skipped** (never passed) when history is shallow,
  as in the CI checkout.
- Accepted suites unchanged and still passing on this tree: reporter 10/10, evidence 19 (18 pass + 1
  root-only skip locally; CI runs all 19).
- Real `listMembership()` on this checkout (repaired collector): 65/10/1 ×2 desktop, 15/0/0 ×2 phone =
  182, partition verified.
- **Simulated vs. actual:** fixtures simulate job conclusions and artifacts; the full-CLI cases execute the
  real CLI, reader, collector and evaluator with only the jobs API (fetch) and `npx` replaced. Actual
  Actions behaviour of this revision (real download, real artifacts under the stricter inventory rules,
  dispatch rejection, cancellation and rerun) is recorded in the delivery evidence. An actual trusted-event
  ELIGIBLE verdict remains **unverified**.

## Independent Codex review checklist

1. Diff vs `efc9116` is five files: workflow, `e2e/package.json`, `merge-eligibility.mjs`,
   `merge-eligibility.test.mjs`, this doc. App code, browser tests, config, reporter, evidence script
   unchanged (byte-identical to PR #75).
2. The only e2e-job change is the `run.context` write (printf %s from env; inventoried by B15).
3. Run the 33 checks with full git history (so the 6 failed-head reproduction checks execute); rerun `adversarial.mjs`-style probes against the CLI, reader and collector.
4. Confirm the aggregate cannot be satisfied by dispatch/push (R1) and that its `if:` skips on cancel.
5. Inspect the bounded dispatch run: aggregate INELIGIBLE with R1/R5 reasons, summary table, artifact.
6. Confirm `permissions` and that `GITHUB_TOKEN` is read-only; no secrets in output.
7. Judge the trigger set and the enforcement proposal against the owner's intended target and queue use.
