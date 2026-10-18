# Independent PR78 re-review — 4f6b901

Head4f6b901b6c4141f88f5d884af0d67d62b28f40c1, base61448f0feee198a8796f4077f32a52f7b863f90d. PASS for the redesigned L1/L2/L3 configuration-specific proof; NOT release acceptance. Full review: ../../PR78_REREVIEW_4F6B901.md.

## Reproduce the independent contract probes

From a dependency-installed checkout of the pinned head:

```sh
REVIEW_REPO="$PWD" REVIEW_EVIDENCE_DIR=/tmp/pr78-4f6-review L3_ARTIFACT_DIR=/path/to/this-evidence/ci-chromium node /path/to/this-evidence/independent-contract-probes.cjs
```

The included prior-fixtures.json is copied from immutable review c319c0bd1c99051ca4311f027043047637c7cf17 and contains21 whole-bundle fixtures and their prior actual-effect observations. The current probe checks that canary makes no behavioral claim, gate without executed L3 stays inconclusive, retired commands exit2; it then uses the real retained CI Chromium results for a positive gate and seven interrupted/missing/failed/skipped/flaky mutations. This does not execute Firebase or production services.

## Local focused commands and counts

```sh
npm --prefix e2e run build:app
npm --prefix e2e run build:app:import-off
RELEASE_PROOF_BUILD=1 node scripts/security/release-import-config.test.mjs
CI=true npm test -- --watchAll=false --runInBand --testPathPattern=src/features/legacy-import
node node_modules/typescript/bin/tsc --noEmit
npx --prefix e2e playwright test -c e2e/playwright.release-proof.config.ts --list
```

65passes/0failures/0skips, both real-build focused checks and required history present. Separate local verify-release-build.sh invocation uses RELEASE_BUILD_DIR, RELEASE_RETAIN_DIR, RELEASE_MANIFEST, RELEASE_CANARY_JSON and IMPORT_OFF_MANIFEST under the review scratch directory:19passes/L1+L2 only, exit0. Import49/49; TS0. LocalNode24.19.0/shared dependency links; CINode22.23.3. Local build byte hashes differ from CI; no exact cross-environment reproducible-build claim. L3 was not executed locally; it is verified from actual CI results in each browser.

## CI/archive evidence

All12 NEW39163048438 ZIPs were downloaded, opened and verified against GitHub archive SHA256/size and complete B15 final-file inventories. Two ci-browser subdirectories preserve exact sanitized gate/canary/results/context/OFF-manifest payloads from the corresponding archives. They are subsets for reproducible gate inspection, not complete ZIPs. artifact-verification.json records every archive/inventory/provenance check, retained release chunk canaries and exact L3 executions/gate recomputation. Scripts for the review environment use absolute root/scratch paths; adjust these to audit downloaded ZIPs elsewhere. Complete source scope and main/new membership listings are included.

Actual CI: main180passes/2N2-D2 diagnostic timeouts, plus10 L3 passes. Both diagnostics retain exit1; all12 finalization/uploads succeed. CI selfchecks39pass/26explicit skips, compared with65/65 local full-history/real-build coverage. API annotations/job metadata are included; rendered summaries were not inspected.

ZIP binaries/duplicate minified bundles are not committed. GitHub artifacts expire after14days. OFF emulator executables were never retained (manifest only), as were eight release-build manifest entries; their original CI bytes cannot be independently rehashed from ZIPs. Configured text token scans are clear, not a universal secret audit. Source/handoff evidence78:6cd23dfd893f849b3248ceac34403e290be3e633; historical N2-D2 evidence64 at the same commit confirms prior symptoms, not a new root-cause diagnosis. No signed URLs, credentials, full unrelated job logs or external operations are included.
