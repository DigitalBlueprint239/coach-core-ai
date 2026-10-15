# Phase A validation record

Owner: Codex. 2026-10-14. Application review heads #59/#60/#64 unchanged; Phase A is governance tooling stacked on charter3cfd9c6, not a runtime candidate. #39 coordination records file scope.

| Measurement | Observed result | Evidence / limitation |
|---|---|---|
| Node syntax | PASS | `node --check .github/scripts/validate-test-summary.mjs` |
| Format regression | PASS 12/12 | `node .github/scripts/validate-test-summary.mjs --self-test`; synthetic schema checks only |
| Versioned index | PASS | `node .github/scripts/validate-test-summary.mjs docs/agents/test-summary.json ../phase-a-local-validation-01`; no install/network/models |
| Reused output | Expected FAIL exit1 | Same command/output refused, original index retained; `../phase-a-collision.log` |
| YAML/forms | PASS parsing/invariants | Python/PyYAML6.0.3, contents:read, modeljobif:false, no credential-file Firestore/createComment/schedule/push; structural parse is not GitHub runtime validation |
| Diff check initial | FAIL retained | One new blank line at workflow EOF; normalized EOF only, no test/assertion changes |
| Diff check corrected | PASS | `git diff --check` |
| Product tests for governance-only change | NOT MEASURED | No product source/package/test changes; existing #63/#68 indexed with failures |
| Hosted evidence-format job | NOT MEASURED before PR | Exact run/commit/result will be appended after observation; no claim of running CI until observed |
| Film/AI/staging/physical devices | NOT MEASURED | Not implemented/executed by Phase A |

No real credentials, model/provider calls, youth media, production configuration/data access, protected merge, deployment or billing changes. Public standard-runner policy and 5-minute cap documented in runbook before PR trigger; actual billing/storage usage NOT MEASURED. Auth-bearing browser archives are not uploaded by this workflow.

## Known limits and next owner

Templates and private policy are files in an unmerged recovery PR, not installed repository-wide/default-branch issue UI. Private reporting availability is not verified; Coach Drew must arrange the private channel if needed. Claude owns independent security/emulator CI; unchanged. Phase A does not assert seven agents running or continuous feedback/evaluation. #65's complete baseline product CI remains dependent on reviewed security/harness stack. R1c candidate8, N2/H2/FX-02, required Film #50, live prerequisites and physical acceptance keep MVP NO-GO.

## First hosted failure and bounded checkout correction

Run [38657911581](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/38657911581), job116171968157, head63101e7fe40da17130dc9728a9089f4397e2c210, PR merge7c44aa0115c42c0fee214f645bb04af52870817d: **FAIL** before tests. `actions/checkout@v5`, with persist-credentials:false, successfully fetched/checked out the commit but its auth cleanup invoked submodule foreach and failed: `No url found for submodule path 'src/components/Coach's Corner/Practice Plan Generator' in .gitmodules`. Inherited gitlink c8dd7cd1f65d99a426a6fd52887e5515a3d5b5a9 remains untouched. All validation steps skipped; model job SKIPPED as intended. No artifact created because checkout preceded directory allocation; full sanitized job log is retained under unique failed-run directory. Node20-action/punycode warnings retained.

A local sparse-checkout experiment did **not** resolve gitlink metadata cleanup; retained as failed/inconclusive strategy (Windows additionally rejects an unrelated inherited trailing-space path unless command-local core.protectNTFS=false). No production/module edits or global Git settings were made.

Smallest job-local correction: allocate evidence before checkout; public unauthenticated git fetch of **GITHUB_SHA**, detached checkout and exact SHA assertion. No checkout token, no submodule setup/cleanup, no arbitrary ref input, no module deletion or bypass of test assertions. Contents stays read-only; fetching public Git is not a production credential. Linux hosted rerun will validate this path; earlier failure is preserved, not rerun over.
