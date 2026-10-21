# FILM-S2b r4 client contract delivery — 2026-10-20

## PR84 review P1 repair — current candidate

This section supersedes the earlier delivery's missing CI coverage and replay optionality. Original evidence below remains historical.
Claude's [bounded FAIL review6292704028](https://github.com/DigitalBlueprint239/coach-core-ai/pull/84#issuecomment-6292704028) reproduced the omission bug atcb2903a. Coach Drew authorized the client repair and existing-workflow extension; [file claim6292810418](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6292810418).

**Tested source/workflow commit:16e9dac0f989dfb82c019329ea963ed31fd33da1**, on the same isolated branch and server6764af9 base. Later commits add evidence only.

- `ReplayQuery.stored` is now required, and parsing requires the **own property**. Missing lookup result returns `invalid-input` for v1 and v2. Explicit `stored:null` and `stored:undefined` retain the agreed server semantics; no claim that undefined is JSON-wire data. `liveFilmStatus` remains optional. Accepted v1 contract behavior is unchanged.
- Reviewer N1: admission/exhaustion ceilings refer to `WORKER_ATTEMPT_POLICY.maxAdmittedAttempts`, still3; no retry engine or budget change.
- Added missing-key regressions for both versions, explicit null/undefined anchors, omission over every replay fixture, optional live-state and inherited-field guard tests. Pre-fix with new tests: **252PASS/36FAIL/0SKIP** (v2 only), retained. Final **434PASS/0FAIL/0SKIP** across both suites (146 unchanged v1 +288 v2), including all211 golden fixtures. TypeScript exit0/no diagnostics. Initial test-only TS2339 annotation failure is retained; fixed using an explicit Record<string,unknown> on the mutation fixture, without weakening assertions.
- Applied Claude's proposed workflow extension: seven extra PR path filters (v2 client/test/server schemas/legacy/limits/fixtures/doc) and both v1/v2 suites in the existing test command. YAML inspection verifies unchanged contents:read permissions, concurrency, ubuntu-latest runner,15-minute timeout, installation/typecheck/artifact steps,14-day retention and actual PIPESTATUS exit propagation. No secrets, emulators, provider calls, deployments or paid calls. No duplicate CI or manual dispatch. An initial inspection-script error on unnamed YAML steps is retained; fixed with optional name access.
- Client CI now runs automatically through PR84 synchronization. The **exact-head run ID, job exit, counts and artifact reference are reported on Issue39/PR84 after completion**, not inferred here. Local434 is distinct from CI. No repeated core/emulator matrix or production build; previous build evidence below is historical.

Commands: `CI=true node ../main-film-s1-client-final/node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand --runTestsByPath src/features/film-analyzer/__tests__/contracts.test.ts src/features/film-analyzer/__tests__/contracts-v2.test.ts`; `node ../main-film-s1-client-final/node_modules/typescript/bin/tsc --noEmit`; `node docs/evidence/film-r4-client-p1-2026-10-20/inspect-workflow.cjs`. Node22.23.1, existing unchanged-lockfile dependencies reused; no install or dependency updates locally.

Raw original/final logs and executable workflow inspection: `docs/evidence/film-r4-client-p1-2026-10-20/`, source-LF SHA256SUMS manifest. Diff against6764af9 is empty for server/shared fixtures/v1 client/v1 tests; no handler or worker change. Claude non-author re-review requested for P1, workflow and exact-head CI. Reviewer/owner worker gates remain pending; MVP NO-GO.

---

Contract-only implementation; **not worker/backend acceptance**. MVP NO-GO.
Owner authorization: Issue39, agreed A1 scope [6291585020](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6291585020), explicitly authorized by Coach Drew in the subsequent task and recorded [6291612849](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6291612849).

## Exact contract and independent review

**AGREE r4 @ 6764af9edd7ab258f55c4eeb19e80a4649b8c86b**, [review6292304060](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6292304060). Branch `codex/film-r4-client` stacks directly on that commit. Tested client source commit: **7b9fc814ed97c8fb7da607506219fbd88b5d5f1c**. Later evidence-only commits do not change the client module/tests.

Reviewed the six previous reproductions, strict wire/state invariants, T6′, immutable historical projection and closed version/replay errors. New `PIPELINE_STEPS`: probe-input, decode-input, normalize, probe-output, decode-output; these name resource-limited subprocess stages and **do not replace structural validation**. Structural validation plus full input and output validation remain mandatory for any future worker. No worker exists in this change.

Local independent server review, Node22.23.1 with existing installed Functions dependencies reused through NODE_PATH:

- `node --test functions/test/film-contract.test.js functions/test/film-contract-v2.test.js functions/test/film-legacy-r3.test.js functions/test/film-r4-review-regressions.test.js`: **408 PASS / 0 FAIL / 0 SKIP**.
- Original external `node --test ../../reports/r4-review-negative.test.cjs`: **6 PASS / 0 FAIL / 0 SKIP**, formerly 0/6/0 at1e8c699. Original failing log preserved.
- `node functions/scripts/film-fixtures-v2.js --check`:211 fixtures. `node functions/scripts/film-contract-schema-v2.js --check`: PASS.
- All211 v2 fixtures and all86 v1 fixtures/checksum records verified. Prior173 fixture payloads unchanged in Git; additions are reviewed negative cases.
- Initial Windows CRLF checkout attempt: **405 PASS / 3 FAIL / 0 SKIP**, checksum/schema consistency failures. Retained `r4-repaired-focused.log`; source-exact fixture extraction using `git show HEAD:<path>` bytes corrected the checkout, not the fixtures/checksums. Source-exact rerun408/0/0 retained separately. No assertions weakened or checksums regenerated.

CI separately: inspected run [39432095737](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39432095737), exact6764af9 head and success conclusion. CI per-suite counts are **not independently claimed** from that metadata. Claude reports full Functions516/0/0 locally; Codex did not repeat the unchanged full Functions suite. No local emulator, staging, physical-device or worker result is claimed.

Client CI is NOT RUN: the existing film-client workflow path filter names v1 files only, and its push branch is the old S1 branch. This v2-only stacked PR does not match those triggers. No workflow change or manual activation is included in this scope. Reviewer must distinguish local parity evidence from CI and may propose a separately coordinated bounded CI extension; no duplicate workflow is created.

## Client scope and validation

Only new browser module `src/features/film-analyzer/contracts-v2.ts` and its focused test are added. The module is not imported by application entry points or handlers. No server module, zod, Firebase SDK or provider client is imported by it. The frozen v1 parser is reused solely for validating historical v1 receipt projection; v1 source is unchanged.

The module supplies typed requests/responses/state/media/errors, strict runtime validation, stored-document-only legacy missing-key handling, pure immutable receipt projection/replay compatibility and pure attempt-policy calculations. No transaction/admission engine, executor, lease, trigger, retry loop, storage mutation or handler cutover is implemented. Only unavailable is a retryable returned server error; malformed resolved responses stay non-retryable protocol failures. SDK authorization/configuration failures are not guessed to be transport failures.

`retentionExpiresAt` is always null in this slice. Reserve `data.expiresAt` retains its reservation meaning. Historical receipt replay never renews upload authority. Three-total-admitted-attempt/six-hour/OFF policy is test-only data, not activation. Policy limits remain explicitly TEST_PLACEHOLDER_NOT_APPROVED/PENDING_D3/D7.

Client commands (from the new worktree; existing dependency directories reused with local junctions, no install or lockfile edits):

```text
CI=true node ../main-film-s1-client-final/node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand --runTestsByPath src/features/film-analyzer/__tests__/contracts.test.ts src/features/film-analyzer/__tests__/contracts-v2.test.ts
node ../main-film-s1-client-final/node_modules/typescript/bin/tsc --noEmit
```

Results: **392 PASS / 0 FAIL / 0 SKIP** (146 unchanged v1 +246 new v2); TypeScript exit0, no diagnostics. Initial390/0/0 run precedes the two additional boundary tests and is retained. A second runner invocation was started while the first appeared pending; both390-case runs passed, neither is treated as additional coverage or acceptance evidence. No retry setting or assertion change.

The 211 shared fixture cases compare independent client parsing/results against authoritative server schemas/helpers, plus expected outcomes. Additional tests cover constant-table equality, all five step names/classified versus unknown kills, NaN/infinities/unsafe/negative/fractional values, closed verdicts, unknown nested keys, malformed responses, strict helper boundaries, timestamp mutations, immutable originals and all86 v1 hashes. JSON fixture hashing normalizes Windows CRLF to Git LF; the separate server review used exact Git bytes.

`npm.cmd run build`: **PASS**, exit0, client-env prebuild guard PASS;16 lint warnings in unchanged SmartPlaybook files, none in the new module/tests. Production bundle main.68934db9.js227.73kB gzip. Nothing deployed. This build is not feature acceptance; the new module remains unreferenced by entry points.

Raw evidence: `docs/evidence/film-r4-client-2026-10-20/` with SHA256SUMS manifest (UTF-8 source text, CRLF normalized to Git LF). Original external logs remain retained as captured; tracked log text is source-normalized by Git. Logs contain synthetic fixtures only. The original prior failure is retained, not replaced by passing runs.

## Preservation, review and rollback

Diff against6764af9 changes no Functions, handlers, rules, workflows, fixtures, lockfiles, v1 module or v1 tests. Shared context is updated through this owned evidence handoff and Issue39; no simultaneous edits to Claude's files. Frozen-path diff againstdcf26be also exits0 for original contracts/handlers/limits/index/rules/workflows/fixtures/decoder/v1 client surfaces. No type suppressions or `any` shortcuts introduced. Existing root and Functions dependency junctions were reused; package lockfiles unchanged, zod4.6.7 verified. No global Git configuration changed; established Codex identity used as command-local commit options after Git reported no configured author.

Claude lead must give a **non-author client-only exact-SHA review**. Requested checks: all211 fixture parity, new exported constants/types/helpers, strict unknown-field handling, version/replay and invalid-input outcomes, unchanged v1 surfaces, no server imports in browser code, no runtime integration. No self-acceptance by Codex. Independent worker reviewer acknowledgement remains pending and is not fabricated.

Rollback for later authorization: this is additive and unreferenced; abandoning the unmerged branch has no application/data effect. If ever incorporated by a separately authorized action, remove/revert only this client/evidence delta after dependency inspection; no data migration/deletion is required or authorized here. Do not reset frozen branches or remove historical evidence.

No worker, handler cutover, calibration, merge, deployment, publication, spending, live Firebase change or AI activation. Film remains MVP-required; MVP NO-GO.
