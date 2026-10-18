Independent review of PR78 c9d49dd367933a92039ba40478d80ffe3a6af987 against61448f0feee198a8796f4077f32a52f7b863f90d. Evidence-only branch; no application, proof or workflow repair included.

Local commands: npm --prefix e2e run build:app; node scripts/security/release-import-config.test.mjs; RELEASE_PROOF_BUILD=1 node scripts/security/release-import-config.test.mjs; RELEASE_BUILD_DIR=<scratch>/fresh-release RELEASE_MANIFEST=<scratch>/fresh-release-manifest.sha256 bash scripts/security/verify-release-build.sh coach-core-mvp-staging-239; CI=true npm test -- --watchAll=false --runInBand --testPathPattern=src/features/legacy-import; node node_modules/typescript/bin/tsc --noEmit.

Probe.cjs contains independent resolver/string-decoy fixtures; adjust its workspace paths to reproduce. check-membership.py uses discovery only, not browser execution. For the status-gap test, replace only the isolated local e2e/.app-build with static/js/main.js containing an ON-canary comment and no emulator hook/port/demo strings; the real proof exits1 while all13 focused checks pass. Restore the original build afterward. No tracked source was mutated.

Real-enabled-bundle decoy: copy the freshly opted-in emulator output to scratch; replace coachcore:import-config=true with =false and REACT_APP_ENABLE_LEGACY_IMPORT:"true" with :"false"; append a disabled-copy comment. No executable renderer/executor branch-body change. The scanner accepts it.

Artifact binaries remain in CI with14-day retention; full artifact digests and exact IDs are pinned in artifacts.json. All12 ZIPs were actually downloaded and opened; SHA256/size, inventory completeness, every retained-file digest, required evidence and configured sanitized-log token shapes verified. CI release outputs are not in those ZIPs, so their individual manifest entries were not rehashed. Fresh local11-file manifest was independently checked against actual output; pre-seeded stale.js was removed.

SHA256SUMS.txt covers all files here except itself. Empty types.txt is the successful compiler diagnostic output. No signed download URLs or whole Actions logs are retained here.
