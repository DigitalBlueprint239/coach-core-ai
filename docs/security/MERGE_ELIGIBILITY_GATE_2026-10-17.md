# Coach Core merge eligibility — aggregate release check (delivery, not acceptance)

Date: 2026-10-17. Author: Claude (independent test/evidence owner), as a bounded repair on top of the
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

| Rule | Requirement |
|---|---|
| R1 | event ∈ {`pull_request`, `merge_group`}. `workflow_dispatch` and `push` can never satisfy the gate. |
| R2 | every expected job (4 projects × 3 buckets) exists exactly once and is `completed`; the 4 **acceptance** jobs concluded `success`; diagnostic / obsolete-fault-model jobs may be `success` or `failure` (their test failures stay visible and non-blocking — approved B11 classification) but `cancelled` / `skipped` / in-progress / missing / duplicate blocks. |
| R3 | every expected job's artifact exists, carries `UPLOAD_OK`, and its `INVENTORY.sha256` verifies against the retained bytes (B15 fail-closed finalize is thereby re-checked by the consumer). |
| R4 | each artifact's `run.context` binds to this `sha`, `head_sha`, `run_id`, `run_attempt`, `event`, the right project/bucket, and `repeat` = 1; a stale artifact from another attempt or commit is rejected. |
| R5 | executed identities (`file:line:column title`, per project) in `results.json` **equal** the source-derived membership for that project × bucket. A dispatch `grep`, a narrowed project/bucket, or membership drift fails. Zero executions pass **only** when membership is itself empty **and** `results.json` holds zero tests — reported as "legitimately empty: 0 selected, 0 executed, 0 passed", never as passed tests. |
| R6 | acceptance results: every test `status: expected`, `results.length == repeat`, every result `passed`; no skipped / interrupted / timedOut; `errors[]` empty; `.last-run.json` status `passed`; stats unexpected/skipped/flaky = 0. |
| R7 | the aggregate never concludes on a cancelled run (`!cancelled()`), and if it cannot gather inputs (API, download, `--list`) it fails closed. |

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
- Concurrency: unchanged `cancel-in-progress`. A cancelled run cancels the matrix **and** skips the
  aggregate (`!cancelled()`), so no success verdict can remain from an incomplete run; the next run on the
  new head produces the verdict for that head. Artifact binding (R4) additionally rejects stale attempts.
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
- **Known limitation:** re-running jobs inside the same run re-uses artifact names that `upload-artifact@v4`
  refuses to overwrite (pre-existing B15 behaviour); R4 also rejects artifacts from another attempt. Fix by
  pushing a new commit (new run) rather than re-running; an `overwrite`/attempt-suffixed artifact scheme is a
  separate B15 follow-up if desired.

## Focused validation

- `node e2e/scripts/merge-eligibility.test.mjs` (also `npm --prefix e2e run test:gate`): 14 executable
  fixtures — complete success (pull_request; merge_group), one failed required job, failing acceptance tests
  under a green job, cancelled required / cancelled non-required, skipped, in-progress, missing / duplicate
  job, missing artifact, no `UPLOAD_OK`, inventory mismatch, narrowed grep (recorded and unrecorded),
  legitimate empty vs. zero-executions-with-membership, different sha / run / attempt / head, artifacts
  named for another sha, repeat mismatch, run-level errors, skipped status, real on-disk artifact reader
  (digests re-verified, tamper detected), workflow contract.
- Accepted suites unchanged and still passing on this tree: reporter 10/10, evidence 19 (18 pass + 1
  root-only skip; CI runs all 19).
- `listMembership()` on this checkout: 65/10/1 ×2 desktop, 15/0/0 ×2 phone (≈17 s, no browsers).
- **Simulated vs. actual:** the fixtures simulate job conclusions and artifacts. Actual Actions execution of
  the aggregate is evidenced by the bounded dispatch run recorded in the handoff (expected verdict:
  INELIGIBLE by R1/R5 — proving a bounded/manual run cannot satisfy the gate while exercising the real
  download, API and `--list` paths). An actual `pull_request` ELIGIBLE verdict cannot be produced on this
  runtime (D10-08a) and would require a full matrix; it is a dependency on Codex's runtime/import candidate.

## Independent Codex review checklist

1. Diff vs `efc9116` is five files: workflow, `e2e/package.json`, `merge-eligibility.mjs`,
   `merge-eligibility.test.mjs`, this doc. App code, browser tests, config, reporter, evidence script
   unchanged (byte-identical to PR #75).
2. The only e2e-job change is the `run.context` write (printf %s from env; inventoried by B15).
3. Run the 14 fixtures; probe `evaluate()` with your own cases (e.g., membership drift, extra project).
4. Confirm the aggregate cannot be satisfied by dispatch/push (R1) and that its `if:` skips on cancel.
5. Inspect the bounded dispatch run: aggregate INELIGIBLE with R1/R5 reasons, summary table, artifact.
6. Confirm `permissions` and that `GITHUB_TOKEN` is read-only; no secrets in output.
7. Judge the trigger set and the enforcement proposal against the owner's intended target and queue use.
