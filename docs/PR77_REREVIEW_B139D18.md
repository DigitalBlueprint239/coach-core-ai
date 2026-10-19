## Independent re-review — FAIL — PR #77 at b139d18

**Head `b139d18d5ea617fd4d505dbdd19ef1e0403662a9`; base `efc9116cf93c5d235b0b2edeb4d7be03a4e73cdc`; previous failed head `dbf7a9ae7dd51092f9ec2ac86f3c19a0d67b23f4`.** Read [latest handoff6257885462](https://github.com/DigitalBlueprint239/coach-core-ai/pull/77#issuecomment-6257885462) and [previous FAIL6256897327](https://github.com/DigitalBlueprint239/coach-core-ai/pull/77#issuecomment-6256897327). Reviewed actual dispatch39186218570 attempts1/2, cancelled push39186218419, and all14 new artifact ZIPs. **MVP remains NO-GO.**

| Review dimension | Verdict |
|---|---|
| Previous F1–F4 false-ELIGIBLE findings | Corrected in the exercised cases |
| Implementation acceptance | **FAIL: residual retained-root symlink read, N1 below** |
| Required-check enforcement readiness | **NOT READY: skipped-check path remains, and platform enforcement is not demonstrated** |
| Combined candidate / PR78 integration | Not performed or accepted here |

No new false-ELIGIBLE verdict was reproduced from the repaired invalid-input cases. N1 does **not** bypass eligibility: it violates the reader's separate containment/no-follow guarantee and exposes outside-file data in its returned inputs/diagnostics. This distinction matters.

### N1 / P2 — rejected retained-root symlinks are nevertheless followed

[Reader295–344](https://github.com/DigitalBlueprint239/coach-core-ai/blob/b139d18d5ea617fd4d505dbdd19ef1e0403662a9/e2e/scripts/merge-eligibility.mjs#L295-L344): `isRegular()` uses lstat on the final component, which does not protect against symlinked **parent directories**. At304 the reader correctly records `ci-evidence` or `test-results` as an invalid symlinked root, but only continues the root-walk loop. It subsequently reads the inventory at313 and decision files at338–344 through those same parents. Upload-marker probing at297 also happens before retained-root validation.

Executable reproductions in the portable `root-containment.mjs` and `replay-and-containment.mjs` (ci-evidence only, test-results only and both roots): create controlled outside `ci-evidence/` and `test-results/` directories, then symlink both retained roots to them. `readArtifactDir()` reports inventory failure **but still**:

- parses outside run.context into `out.context` (`sha=PUBLIC_OUTSIDE_CONTEXT_SENTINEL`);
- parses outside results.json into `out.results`;
- reads the malformed outside last-run file and embeds its input prefix (`PUBLIC_OUT…`) in `lastRunProblem` via `JSON.parse`'s exception message.

Only public fixture sentinels were used; no real secret was accessed. The final gate remains INELIGIBLE due to R3. The14 actual ZIPs contain no symlink entries; this is not an observed attack in those archives, but it contradicts the implementation's explicit “never followed / never reads outside” boundary. Existing symlink tests cover a linked file, not these linked roots.

**Minimum implementation correction:** validate the artifact directory and both retained-root ancestors as real in-artifact directories **before any marker/inventory/content access**; return a rejected record immediately for invalid roots. Read decision payloads only after containment and complete-inventory validation, using the same no-follow/contained-path policy. Do not copy untrusted file contents from JSON parser exceptions into diagnostics. Add ci-evidence-root and test-results-root link cases, with sentinel/outside-read assertions, not merely an INELIGIBLE assertion. Preserve valid inventories, regular-file artifacts and completed diagnostic failure handling.

### Original reproductions and repaired behavior

I ran the **unchanged original adversarial.mjs** from immutable review6d9fdf5590b67cff52901fc0ddf6a50db22ceab6 against both heads; its hash is recorded. On dbf7a9a it reproduces the previous results, including full CLI exit0/ELIGIBLE. On b139d18 it exits1 during **fixture extraction** (`sha256` absent in the old harness sandbox because the test-file fixture representation changed). That harness error is **not** counted as a repair or a candidate INELIGIBLE verdict.

To obtain a meaningful unchanged-input comparison, I replayed the original frozen full-CLI artifacts, jobs-API preload, erroring collector, arguments and environment against both production scripts, changing only the script under test: **dbf7a9a exits0/ELIGIBLE; b139d18 exits1/INELIGIBLE**, with `R7 … membership … collector exited1`. No acceptance row is called legitimately empty. The frozen artifacts have zero test rows, so the new stable-ID format does not confound this comparison.

I additionally used a valid new-schema positive fixture and applied the original mutations, comparing both evaluators with their respective identity representation. Baseline remains ELIGIBLE on both; zero acceptance, missing last-run, duplicate passing identity, foreign row in an empty artifact and selected-but-unexecuted diagnostic tests change from old ELIGIBLE to new INELIGIBLE. Independent on-disk probes reject partial inventories, duplicate/malformed entries, hidden unlisted payload, traversal, linked files and malformed last-run under a matching inventory. These are explicitly format-compatible probes, not a claim that the unmodified old harness successfully ran past its extraction error on the new tree.

**F1:** collection spawn/nonzero/signal/JSON/report errors are rejected, and empty acceptance is refused. The actual collector uses `--pass-with-no-tests`; legitimate phone empties now return clean0/empty errors. Bucket union/disjointness is checked against the unfiltered selection, not hard-coded counts.

**F2:** ordinary complete coverage, canonical path strings, duplicate entries, hidden/unlisted files and linked-file rejection are materially fixed. N1 is the remaining root-ancestor access defect; valid actual inventories below all pass.

**F3:** stable spec.id membership, foreign-project rejection before filtering, identity multiplicity, outcome/stat reconciliation and actual completed results in every bucket correct the exercised selection/execution defects. Completed diagnostic/obsolete failures remain non-blocking; skipped/interrupted/absent outcomes do not become complete coverage.

**F4:** absent/malformed/schema-invalid last-run records are rejected in every bucket; failedTests and terminal status reconcile with outcomes and job conclusions. A successful non-required job with last-run failed is rejected; a non-required job failing after genuinely passing browser tests is explicitly noted as a non-test-step failure rather than inventing test failures.

### Actual Playwright semantics, checks and preserved membership

Independently inspected installed **Playwright1.64's LastRunReporter** (`!t.ok() || didNotRun(t)`) and ran eight isolated **Node-only Playwright probes**, with no browser or emulator: pass, fail, expected failure, explicit skip, timeout, beforeAll failure/blocked test, flaky retry and legitimate empty. Stable ids match between `--list` and execution in every case; the production failedTests rule exactly matches each actual `.last-run.json`. In particular expected skips and flaky tests can yield last-run passed/empty failedTests: the additional completion/repeat/acceptance rules correctly remain necessary. These temporary probe timeouts/retries are not changes to Coach Core's browser settings or tests.

Local full-history gate checks: **29passed/0failed/0skipped**; all five failed-head reproduction tests execute. Reporter **10/10**, B15 evidence **19/19**, no local skips in this environment. Actual aggregate job logs, inspected separately for **both attempts**, report **29tests /24passes /0failures /5skips**. Those five are explicitly historical reproductions unavailable in shallow CI, not passes. The requested historical coverage is established locally. The29 checks meaningfully cover the prior failures; they omit retained-root symlink no-read assertions and platform skipped-check enforcement.

Real source-derived membership remains **182:76/76/15/15**, complete non-overlapping buckets65/65/15/15 +10/10/0/0 +1/1/0/0. Independent base/head discovery and phone/dispatch filtering agree. Actual new stable-ID membership also reproduces the CI rows/reasons below.

Scope vsdbf7a9a is exactly the three declared gate source/test/doc files; vsbase remains the same five-file slice. Workflow, application/browser bodies/assertions/config, B11 reporter, B15 implementation and evidence tests are byte-identical to the failed head; accepted application/tests/config/reporter/B15/lockfiles remain unchanged againstefc9116. Existing workers1/retries0/repetitions/test60s/expect10s/server30s/job120min are preserved. No application test or assertion was weakened.

### All new artifacts and actual aggregate-only rerun

Downloaded/opened **all14 new ZIPs** from39186218570: twelve E2E artifacts and **two same-named aggregate report artifacts**, ids12158247066 (attempt1) and12158665378 (attempt2). Every GitHub archive SHA-256/size matches; every E2E inventory is complete and every final retained hash matches. Required logs, manifests, contexts, exits, results and last-run files are present. No ZIP access gap remains.

All E2E contexts bind b139d18, run39186218570, **attempt1**, dispatch, correct project/bucket, repeat1 and grep `D10-01|N2-D0|N2-A2`. Eight tests complete: seven passed and one **N2-A2 obsolete-chromium timedOut**, retry0, with `.last-run` failed/that stable id and retained `run.exit=1`. Other exits are0. Four phone diagnostic/obsolete artifacts are genuinely empty. This is narrowed evidence, not full acceptance. The failed obsolete job is the approved non-required/completed-failure case, not an acceptance pass; the repaired gate reconciles it correctly.

Using the new production reader, independently collected stable-ID membership and actual per-attempt job metadata, I recomputed **both** reports exactly, including every row:

- **Attempt1:** INELIGIBLE,19 reasons = R1 dispatch +12 recorded-grep reasons +6 narrowed identity sets. No R2/R3/R4/R6/R7 reasons.
- **Aggregate-only attempt2:** INELIGIBLE,31 reasons = those19 + **12 R4 stale-attempt reasons**. Attempt1 payloads cannot establish attempt2 evidence.

The per-attempt API carries all twelve prior matrix jobs forward with new ids but identical start/end times; only the aggregate executes again. This is actual evidence, not an assumption that the API omits prior successful jobs. The attempt2 aggregate upload also **succeeds**, leaving two artifacts with the same report name across attempts. My earlier broad statement that SHA-only report names necessarily collide on reruns was too strong; this observation corrects it. The current doc's general overwrite/collision wording should likewise be narrowed to demonstrated behavior. Full matrix/failed-job rerun upload behavior and GitHub required-check selection across success/failure/skip on one SHA remain unverified. No retry scheme was changed here.

Configured scans of retained text files are clear; this is not a universal secret audit or inspection of every nested binary trace. API metadata/annotations, job-log test counts and retained summary Markdown were inspected; rendered Actions summary UI was not. ZIP retention remains14days.

### Skipped aggregate: enforcement readiness is separately NOT ACCEPTED

**Yes: a conditionally skipped required job can satisfy GitHub required-check rules without a successful eligibility evaluation.** [GitHub's job-condition documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions) states that skipped jobs report Success and do not prevent merging even when required. A skipped job is different from an absent workflow check or a cancelled job.

The workflow is unchanged at [line202](https://github.com/DigitalBlueprint239/coach-core-ai/blob/b139d18d5ea617fd4d505dbdd19ef1e0403662a9/.github/workflows/e2e-emulator.yml#L202): `if: always() && !cancelled()`. It deliberately removes the evaluation path on cancellation. The corrected doc acknowledges that safe skipped/cancelled terminal handling is an open prerequisite; it does not fix that workflow path.

Actual new cancelled push39186218419 has all13 jobs **cancelled**, not skipped, and no eligibility verdict. That is a safe observed terminal instance, **not** a demonstration of what every cancellation/conditional-skip case produces under required-check enforcement. I did not observe an actual skipped-check merge bypass, and no protection rule was enabled to test one.

**Minimum before accepting enforcement readiness:** remove the job-level skip path for this authoritative check (for example job `if: always()`), ensure cancellation or missing/unexecuted evaluation explicitly yields failure/cancelled rather than skipped/success, and make successful eligibility evaluation the only path to a successful required check. Add focused workflow-condition coverage and then demonstrate terminal conclusions/required-check behavior on the intended trusted-event candidate. Merely documenting skipped status as unverified is honest, but not an enforceable gate guarantee. No workflow or settings change is performed in this review.

Read-only observation still shows recovery target3992d8d58ae0bb28490cfdfc48ed66e86b4ffd53, protected:false and rulesets including parents[]. This establishes current absence of enforcement, not successful protection behavior. Trusted-event **ELIGIBLE**, merge-queue execution, enforcement/application binding and same-SHA required-check selection remain separately unverified. The current stacked PR target is outside the workflow's pull_request filter; no trusted-event acceptance is inferred from this delivery.

### Required next steps, kept separate

1. **Implementation:** fix N1's root-ancestor no-follow access/diagnostics, add root-link no-read regressions, and obtain a new pinned review. Previous F1–F4 repairs should be retained.
2. **Enforcement:** implement and validate a non-skippable fail-closed authoritative check; establish trusted-event ELIGIBLE and cancelled/skip/missing/rerun behavior before separately approved protection activation. Correct rerun documentation to the actual observations. No unchanged full matrix is requested now.
3. **Combined candidate:** reconcile only through a separately authorized integration review, preserving accepted **PR78 `4f6b901b6c4141f88f5d884af0d67d62b28f40c1`** L1/L2/L3, B11/B15 and new provenance. Overlap remains workflow +e2e/package.json. Do not silently include raw PR72, remove failing acceptance tests or manufacture green dispatch acceptance. Validate/review the exact combined SHA when that work is authorized.
4. **Release:** PR78's bounded acceptance is unchanged; exact release-artifact execution and deployment remain unverified. Support/disclosure/security/staging/real-provider/device/product/founder prerequisites remain separate.

No branches combined, new full matrix, merge, deployment, production/protection change or AI activation. **MVP remains NO-GO.**
