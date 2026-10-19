# PR77 independent re-review evidence — b139d18

Headb139d18d5ea617fd4d505dbdd19ef1e0403662a9; baseefc9116cf93c5d235b0b2edeb4d7be03a4e73cdc; prior dbf7a9ae7dd51092f9ec2ac86f3c19a0d67b23f4. FAIL implementation acceptance for N1 retained-root no-follow violation; prior false-ELIGIBLE repairs verified. Enforcement readiness and combined-candidate review remain separate. Full review ../../PR77_REREVIEW_B139D18.md.

## Portable N1 reproduction

From a checkout of the pinned head (Node22+):

```sh
REVIEW_REPO="$PWD" REVIEW_EVIDENCE_DIR=/tmp/pr77-root-review node /path/to/root-containment.mjs
```

This creates only public sentinel files, then tests ci-evidence-root link, test-results-root link and both. Inventory is rejected, but outside context/JSON is parsed and an outside input prefix is returned in parser diagnostics. No eligibility bypass or access to any real secret is claimed. The actual14 ZIPs have no symlink entries. A successful reproduction process means the defect reproduced, not that containment passed.

## Original unchanged reproduction and compatible probes

original-adversarial.mjs is byte-for-byte the original immutable6d9fdf5 evidence program; its hash is recorded. unchanged-old.txt reproduces the old invalid ELIGIBLE verdicts; unchanged-new.txt is a fixture-extraction ReferenceError (changed fixture representation), not a gate verdict. Frozen original CLI files/jobs API/collector/args/environment replayed against both scripts give old0/ELIGIBLE versus new1/INELIGIBLE with R7. frozen-cli-* folders are synthetic, candidate aaaa..., not actual Actions verdicts. replay-and-containment.mjs records that comparison and the root-link finding; it uses original review environment paths, adjust them and first regenerate the old fixtures with the original harness if reproducing elsewhere.

controlled-probes.mjs uses a valid stable-ID fixture provider, then applies the original mutations and reader/collector conditions. Baseline stays eligible; zero acceptance, missing last-run, duplicate identity, foreign project and no-completed diagnostic results change oldtrue/newfalse. Partial/duplicate/malformed inventories, hidden unlisted payload, traversal, linked files and malformed last-run are rejected. These are labeled format-compatible rather than pretending the unchanged harness completed against the refactored new fixtures.

## Validation and actual Playwright semantics

```sh
node e2e/scripts/merge-eligibility.test.mjs
npm --prefix e2e run test:reporter
node e2e/scripts/evidence.test.mjs
```

Full history:29pass/0fail/0skip locally; CI each attempt24pass/0fail/5explicit historical skips (actual filtered log counts included). Reporter10/10; B15 evidence19/19 locally, no skips in this environment. LocalNode24.19.0/npm11.9.0, ActionsNode22.

playwright-semantics.mjs ran eight isolated Node-only Playwright1.64 probes (no browser/emulator) and checked stable IDs between list/run and the exact failedTests rule against actual last-run files. Pass/fail/expected-fail/skip/timeout/beforeAll-blocked/flaky/empty payloads and summary are included. These fixture-only retries/timeouts do not modify application or browser-test execution settings. Main membership remains182 and B11 partition/source settings unchanged.

## Actions, rerun and archive audit

All14 new39186218570 ZIPs downloaded/opened:12 E2E artifacts, two same-named aggregate reports. GitHub archive digests/size, complete inventories, every retained hash, contexts, result/last-run semantics and exits verified. actual-aggregate-attempt* are exact payloads from verified ZIPs. Both reports recompute identically with current source-derived stable IDs and actual per-attempt jobs:19 reasons on attempt1,31 on attempt2. Attempt2 carries the original12 matrix jobs with new IDs but identical start/end timestamps; stale attempt1 contexts are rejected. The second report upload succeeded, correcting a broad prior collision assumption. Cancelled push39186218419 has13cancelled jobs, not an observed skipped-check bypass.

Archive binaries/raw run logs not committed; GitHub14-day retention. No ZIP access gap now. Configured textual scans clear, not a universal secret audit or every nested binary trace inspection. Rendered Actions summaries not inspected; source Markdown/API metadata/job-log check counts inspected. Audit helpers use review environment absolute paths and need adjusted root/scratch paths plus original downloaded ZIPs to rerun elsewhere.

## Open boundaries

Current settings read-only observation is unprotected/rulesets[], not enforcement demonstrated. Official skipped-job rules are recorded separately; workflow !cancelled path remains an enforcement prerequisite. No actual trusted-event ELIGIBLE or queue execution established. PR78 remains accepted4f6b901 for its scoped L1/L2/L3 proof; exact release-artifact execution/deployment unverified. No branch integration, full matrix, merge, deploy, production/protection changes or AI activation. MVP NO-GO.
