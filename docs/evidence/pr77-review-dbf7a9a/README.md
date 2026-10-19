# Independent PR77 review evidence — dbf7a9a

Head dbf7a9ae7dd51092f9ec2ac86f3c19a0d67b23f4, base efc9116cf93c5d235b0b2edeb4d7be03a4e73cdc. Verdict FAIL; see ../../PR77_INDEPENDENT_REVIEW_DBF7A9A.md. PR78 remains accepted at4f6b901 for its bounded L1/L2/L3 scope; no integration performed.

## Executable adversarial reproductions

From the pinned checkout (Node22+):

```sh
REVIEW_REPO="$PWD" REVIEW_EVIDENCE_DIR=/tmp/pr77-review node /path/to/adversarial.mjs
node e2e/scripts/merge-eligibility.test.mjs
npm --prefix e2e run test:reporter
node e2e/scripts/evidence.test.mjs
```

The independent script reads the submitted fixture generator and invokes production evaluate/readArtifactDir/listMembership and the full CLI. Eighteen records cover positive baselines, wrong provenance/narrowed diagnostic rejection controls, empty acceptance, collector exit1/error JSON, inventory omission/path escape, missing/malformed last-run, duplicate and foreign identities, and zero completed diagnostic results. The full CLI uses an injected jobs API and npx process boundary, no real network/token, and produces exit0/ELIGIBLE on collector failure + zero acceptance. Reproduction process success means the defect reproduced; it is not a passing requirement test. cli-zero-verdict/ is SYNTHETIC, sha aaaa..., and must not be confused with the actual Actions aggregate-report/ at dbf7a9a.

Gate14/14, reporter10/10, evidence19/19 passed locally with no skips. These submitted tests omit the reproduced cases. Node24.19.0/npm11.9.0 locally; ActionsNode22. No full browser matrix or workflow dispatch was initiated.

## Source membership and actual Actions

membership.json + membership-summary.txt compare source base/head182 tests and complete non-overlapping B11 buckets, with phone/dispatch filters. gate-membership.json is the separate production gate's listMembership output used to reproduce the actual aggregate decision. Its name is intentionally distinct from the base/head comparison report. The current legitimate phone-diagnostic --list exits1 with JSON 'No tests found'; errors in a JSON report must not be generally trusted. A safe correction uses --pass-with-no-tests and rejects collection failures/errors.

All13 NEW39079754536 ZIPs were downloaded/opened and checked against GitHub full SHA256/size. All12 E2E actual inventories are complete and every retained hash/context/result/exit is valid. artifact-verification.json records checks and actual contexts/test executions. aggregate-report/ is copied byte-for-byte from the verified aggregate ZIP. Recomputation with all extracted artifacts, current source membership and per-attempt API jobs matches19 INELIGIBLE R1/R5 reasons and all12 rows exactly. Eight passing tests/four empty jobs are bounded evidence, not full acceptance. The cancelled run39079741112 has all13 jobs cancelled. No actual trusted-event ELIGIBLE or rerun evidence was established.

verify-artifacts.py/recompute.mjs/check-membership.py use this review environment's absolute paths; adjust root/scratch paths and provide downloaded ZIPs/extractions to rerun archive auditing elsewhere. ZIP binaries/raw run logs are not committed here; GitHub artifacts expire after14days. Source API annotations and retained summary Markdown inspected; rendered Actions summary UI not inspected. Configured textual token patterns clear, not a universal secret audit. No signed URLs or credentials included.

## Enforcement and integration

Read-only target/ruleset observation and official GitHub skipped-job semantics are preserved separately. The target is unprotected, rulesets including parents empty; no settings changed. Skipped required jobs can satisfy protections, so a source-level !cancelled condition is not proof of platform merge blocking. Actual observed cancellation was cancelled, not skipped. Workflow and e2e/package.json overlap accepted PR78; no branches combined. Exact release-artifact execution/deployment remain unverified. MVP NO-GO.
