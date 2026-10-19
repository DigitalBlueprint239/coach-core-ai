# FILM-S1 client mirror — review handoff

2026-10-19. **Delivered for review, not film/backend acceptance. MVP NO-GO.**

Tested source contents committed as **4303e7e78efb8623c929a92983b2e67256c825fc**. Isolated branch `codex/film-s1-client-contract-final`; immutable review base `codex/film-s1-contract-r3-base` at **8f7723952bdf38c18d12d8f2611e87830b658467**, descended from accepted515dc1d92bf237dae4d70ff2cc38c2aee07d5ae1. Inherited backend files are NOT accepted by this client delivery. PR79 and prior client worktrees remain unchanged.

## Contract and ownership

Agreement on r3: [#39/6278585608](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6278585608). C1–C3 resolved by r2; C4 explicit UTF-16 bound fixed by Claude in r3. All86 shared fixtures consumed unchanged. No backend, rules, acceptance harness, fixture, package or workflow edit. Client module has no Firebase/provider imports, network operations, retries, UI or side effects.

`contracts.ts` provides strict request/response/state/error/client-failure parsers and TypeScript types, canonical filenames, state/error tables and prominently labelled policy placeholders. Malformed resolutions become nonretryable protocol failures. SDK failures keep sanitized code only, with no raw messages/details; unknown failures are not presumed transient. Network classification is explicit, for callers that established no HTTP response. No automatic retries, new operation IDs, readiness or upload permission are synthesized. Structurally valid but policy-invalid requests remain parseable for authoritative server rejection; the client does not pretend to execute business policy.

## Focused checks

Node22.23.1, existing dependencies including zod4.6.7; no installation. Commands from repository root:

```powershell
$env:CI='true'
npm test -- --watchAll=false --runInBand --runTestsByPath src/features/film-analyzer/__tests__/contracts.test.ts
./node_modules/.bin/tsc.cmd --noEmit
```

Final **146 passed /0 failed /0 skipped**,1 suite; TypeScript exit0. No unchanged core suite or acceptance matrix rerun. Every fixture is parsed by both the independent client mirror and the authoritative server schema; valid normalized output and roundtrips agree. Tests cover closed errors/SDK categories, all mutation fixtures, strict nested keys, malformed versions/values, timestamps, canonicalization, UTF-16 filename bounds, opaque-string code-point bounds, stale receipts and retained operation identity. They do NOT prove server transaction replay, rules authorization, expiry cleanup or provider behavior.

Checksums are verified over **LF-canonical source text**, explicitly accounting for Windows Git autocrlf; working-tree CRLF hashes differ from Claude's LF manifest. Shared files were not edited. Test-only server imports are absent from the browser module. Final source matches the tested file contents; later commits contain docs/evidence only.

## Retained failures and limits

Raw evidence: [evidence/client-s1](evidence/client-s1/). r1 eight mutation probes all accepted; r2 all eight rejected. First client r2 run135pass/2fail: CRLF checksum handling and newly discovered C4; TypeScript2352 was corrected locally. Second r2 run137pass/1fail: C4 only. r3 run146pass/0fail. No failure skipped or assertion weakened. The checksum adjustment handles checkout encoding, not a changed fixture hash/content. C4 failure and exact repro remain [#39/6278192556](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6278192556).

No new production build or dev server was run: this unmounted contract module changes no shipped route/UI. Prior untouched-base CI=true build failed from inherited SmartPlaybook lint warnings (not new film code); raw baseline/build.log remains outside Git worktrees under reports/film-s1-client-2026-10-19. This delivery claims type/contract tests only, not build/staging/browser/film acceptance. Emulator, physical-device, hosted/provider and film-quality metrics NOT MEASURED. Existing inherited suppressions were reported in the baseline; none added.

## Reviewer next steps / rollback

Claude reviewer is **review-only**: independently inspect the client delta, rerun focused commands, verify hashes/negative coverage and API separation. Do not modify the lead's backend/fixtures or execute cloud operations. Lead Claude reconciles any confirmed mismatch through #39 and pins changes before fixture consumption. Backend review waits for a completed identified candidate and its own evidence; reported09fad91/CI39329317633 is not client or backend acceptance here.

Proposed owner policy sheet: [OWNER_DECISION_SHEET_2026-10-19.md](OWNER_DECISION_SHEET_2026-10-19.md). Its recommendations remain unapproved and are not runtime configuration. No blanket adoption requested.

Rollback before integration: leave this draft unmerged. If later incorporated with approval, revert only the client source commit; no persistent data, schema, package or configuration migration exists in this delta. No deletion, deploy, billing, provider call or AI activation was performed or authorized.

## PR80 independent review findings addressed (2026-10-19 UTC)

Review5578562458 at5e0bc77: independent **PASS for r3 contract parity**, with P1 CI prerequisite/coverage and P2 empty-typecheck-log findings. The client module and its146 tests remain unchanged.

- **P1:** added dedicated `.github/workflows/film-client-contract.yml`, leaving Claude-owned `security-rules.yml` untouched. Clean CI installs root dependencies with `npm ci --legacy-peer-deps --no-audit --no-fund` **and** `npm ci --prefix functions --no-audit --no-fund` before FS-26. The server-schema oracle is test-only and needs functions' zod. This install is also a required local prerequisite; do not claim a clean-checkout run after installing only root dependencies. New workflow covers relevant PR paths, this client branch's pushes and bounded manual dispatch. It never deploys/builds/runs emulators or reads secrets.
- **P2:** retained `review-fix-typescript.log` with explicit `exit=0`; historical empty r3 log/hash remains unchanged. New FS-26 log also records exit0; summary hashes updated.
- **P3 info only:** switch-OFF `sdk/internal` is non-retryable. Later UI wording must describe unavailable/not-enabled film, not invent a transient retry; no UI implemented. Backend R1 deviation still needs independent backend adjudication.
- **P4 info only:** strict client timing invariants remain; any backend timing change requires fixture/emission parity review, not client relaxation.

Local Node24.19.0:146pass/0fail/0skip; tsc exit0, actionlint1.7.7 clean. Existing shared root dependencies were linked; functions dependencies were installed from their own lockfile. Clean-root CI evidence is pending until its actual exact-head run completes; no CI claim is inferred from workflow source alone. No unrelated unchanged test matrix rerun.

This update needs focused independent review of the CI/evidence fix and its actual run. It does not give PR81 backend PASS or permit combination before both exact slices have independent PASS. See FILM_S1_INTEGRATION_PLAN.md. D3/D7 placeholders and PR79 remain unchanged.
