# Independent PR78 re-review evidence — cab8cabe

Reviewed source cab8cabe2baf00b8f3a37a36a88466f5c749613e, base61448f0feee198a8796f4077f32a52f7b863f90d; prior d14aa7bb9ec4442c3acca26b127b17f4194cbd64. Verdict FAIL; see ../../PR78_REREVIEW_CAB8CABE.md.

## Executable reproductions

Use a dependency-installed checkout of the exact reviewed head with full c9/905/d14 history available. The scripts use only local VM/jsdom and memory spies, not Firebase. From that checkout:

```sh
REVIEW_REPO="$PWD" REVIEW_EVIDENCE_DIR=/tmp/pr78-cab8-review node /path/to/independent-probes.cjs
REVIEW_REPO="$PWD" REVIEW_EVIDENCE_DIR=/tmp/pr78-cab8-review node /path/to/real-react-updater.cjs
```

The first script generates21 shipped-bundle fixtures and invokes both cab8 and the d14 verifier extracted from git. Reports include full generated code, both scanner exits/verdicts and whole-module/button side effects. Its seven prior false-OFF cases and explicit-false ON case are corrected on cab8; eight new false-OFF fixtures and one new false-ON fixture remain. Baselines and rejection controls are included. The second script mounts actual React19.1.0/ReactDOM hooks under jsdom and proves functional setter arguments execute (backend copies1 while scan exits0/off).

## Focused validation commands

```sh
npm --prefix e2e run build:app
RELEASE_PROOF_BUILD=1 node scripts/security/release-import-config.test.mjs
CI=true npm test -- --watchAll=false --runInBand --testPathPattern=src/features/legacy-import
node node_modules/typescript/bin/tsc --noEmit
node scripts/security/release-import-config.js negative-control e2e/.app-build
RELEASE_BUILD_DIR=/tmp/pr78-release-build RELEASE_RETAIN_DIR=/tmp/pr78-release-retained RELEASE_MANIFEST=/tmp/pr78-release-manifest.sha256 bash scripts/security/verify-release-build.sh
```

All37 focused checks passed, no skips, with full historical objects and both real-build checks. Dedicated release proof17passes/process0, import49/49, TS0. LocalNode24.19.0/npm11.9.0 versus CINode22.23.3/CRA5.0.1. Raw outputs and versions/history checks included. Failed independent probes are verifier defects despite passing submitted checks.

## CI and archive verification

All12 NEW39157201371 artifact ZIPs were downloaded through authenticated connector signed URLs, kept outside git, opened and independently verified. `artifacts.json` records GitHub archive SHA256/size; `artifact-verification.json` records all inventory/provenance/retained-build checks. Scripts record the review environment's absolute paths; adjust root/scratch paths to reproduce with downloaded ZIPs. Required job metadata/annotations, actual ZIP test results, membership/source-scope and exact retained-code checks are included. No signed URLs, raw unrelated job logs or credentials are included.

Archive binaries and duplicate minified builds are not committed here. GitHub artifacts expire after14days. Eight build-manifest files were never retained and remain unverified, as listed in the review. Rendered Actions summaries/deployed output were not inspected. Configured residual token-pattern scans are clear; this is not a universal secret audit. No external operations, full matrix or branch integration were performed.
