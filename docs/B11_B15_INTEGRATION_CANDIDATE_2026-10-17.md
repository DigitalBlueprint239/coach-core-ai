# B11 + B15 isolated integration candidate — delivery, not acceptance

MVP NO-GO. No merge, deployment, protection change, production change or AI activation.

## Target and provenance decided before editing

- Repository: DigitalBlueprint239/coach-core-ai.
- Task branch: `codex/integrate-b11-b15-2026-10-17`.
- Exact candidate base: `7d56300c2a59ee0081a9971036e83599ccfff217`.
- Narrow draft-review target: `claude/n2-repair-acceptance-518e9e5`, observed at that same SHA.
- Eventual recovery target: `recovery/coach-core-mvp-2026`, observed at
  `3992d8d58ae0bb28490cfdfc48ed66e86b4ffd53`. No recovery update is proposed by this delivery.
- Tested implementation commit: `fd933ed30f814b22c095f0a69149f254971ec190`.
  The delivery head adds documentation/evidence only; obtain its exact SHA from the draft PR and issue39 handoff.
- Application source remains byte-identical to runtime
  `518e9e5817abd2a0e1bf1308468928f238fa8533`.

Read before editing: base AGENTS.md, shared context, MVP sprint, the existing
`docs/security/INTEGRATION_REPORT_2026-10-13.md` and
`docs/security/COMBINED_REGRESSION_PLAN.md`; issue39's later sequencing and founder
decisions; the posted B11/B15 acceptance reviews. The older plan describes an
evidence-only trial candidate and eventual PR-by-PR recovery integration. Its
historical D10-pending/client-not-built statuses are superseded by later source
and issue39 evidence, not silently carried forward as current facts. No newer
dedicated B11+B15 integration plan was found in the inspected sources; this
document makes the bounded next step concrete. The older root
INTEGRATION_PLAN.md concerns open-source/AI libraries and is not this release plan.

The narrow target is a deliberate exception to AGENTS.md's general request to
submit toward recovery: a direct recovery PR would expose substantial inherited
candidate history outside this authorization and trigger an unchanged full E2E
matrix. This stacked review PR approves none of that inherited history for merge.
The original PR branches are preserved. No branch was merged into another branch;
only the six accepted bounded commits were cherry-picked onto a new branch.

Acceptance sources:

- [B11 PASS at f2e1fed](https://github.com/DigitalBlueprint239/coach-core-ai/pull/73#issuecomment-6238489931).
- [B15 PASS at ffb40455](https://github.com/DigitalBlueprint239/coach-core-ai/pull/74#issuecomment-6242108352).

## Included commits and conflict resolution

| Accepted source commit | Candidate commit |
|---|---|
| e25272b7ebdd9d4ccf9f27e45364141716e8ea66 | c2e750f8745da3cfccfbda42c6980ec28b3b6fff |
| e5b33ef38bda252405b8be98f10a0511a5c80b8c | 4e1abaad6d5319701cbea1400094b8f7a851560d |
| f2e1fed1241590c5afa4073938d3dae7d0809199 | 521659128e0ec07e1a995155373666d725c24dcd |
| 04d4be80bd55a0131e51daa1b9235fa1e603cff9 | fc518dfc87ccb3b32d6082db4c327b44dedc49b5 |
| 3befdf1ed439c8e69a0dfa5f67352c6edef41e0a | 45346893e82504efaab482f333616b8715817364 |
| ffb40455c266c6d12171d5ce71923fe9313155f2 | fd933ed30f814b22c095f0a69149f254971ec190 |

The runtime/CI diff from the exact base is eight infrastructure files. Both
overlapping files were union-resolved, not replaced wholesale:

- Workflow keeps B11's 12 project×bucket jobs, E2E_BUCKET, reporter self-checks,
  bucket-qualified check/artifact names, dispatch grep and all original limits.
- It also keeps B15's evidence self-checks, sibling `e2e/ci-evidence` directory,
  release digest destination, exit-preserving run wrapper, checked finalization,
  explicit withheld-evidence step, current-step eligibility output and gated upload.
- Upload includes both directories and hidden files, fails on no files, and retains
  evidence for 14 days. A browser failure stays red while sanitized evidence can upload.
- The B11 results-directory diagnostic notice remains before finalization. It is
  not a ZIP inventory or the authoritative complete upload inventory. B15's later
  full inventory hashes final sanitized bytes over both retained directories.
- Package scripts retain BOTH `test:reporter` and `test:evidence`, using the accepted
  direct Node invocations; no dependency/lockfile changes.
- Playwright config, reporter and its ten checks are byte-identical to accepted B11.
  Evidence script and its nineteen checks are byte-identical to accepted B15.
- Existing browser test bodies, assertions, application/backend/rules source and
  approved identity surface are unchanged. No PR72 source or configuration is added.

## Validation delivered

Local Linux, Node v24.19.0, Playwright 1.64.0; isolated dependency reuse, no lockfile edits.

| Check | Result |
|---|---|
| `npm --prefix e2e run test:reporter` | 10 passed, zero failures/skips |
| `npm --prefix e2e run test:evidence` | 19 passed, zero failures/skips |
| Real no-op Playwright cleanup proof | included in those 19 checks; passed |
| Extracted finalize run block, failure/output gate, final-byte hashes | included in those 19 checks; passed against combined workflow |
| Actual Playwright JSON discovery, base vs combined | exact identities equal; zero duplicates |
| Application/source limits and accepted-file identity | unchanged as specified above |

Discovery ran `node node_modules/playwright/cli.js test --list --reporter=json`
from isolated base/candidate e2e directories, with and without
`E2E_GREP='N2-|D10-0'`. Candidate was separately listed with E2E_BUCKET unset,
all, acceptance, diagnostic and obsolete-fault-model. File/line/column/title/project
tuples were sorted and compared. The three-bucket union equals base and unset/all.

| Each project | Base | Acceptance / diagnostic / obsolete | Dispatch-filtered base and buckets |
|---|---:|---:|---:|
| chromium, firefox | 76 | 65 / 10 / 1 | 38 = 32 / 5 / 1 |
| phone-chromium, phone-firefox | 15 | 15 / 0 / 0 | 2 = 2 / 0 / 0 |

Effective discovery config: workers1, repeatEach1, retries0, per-test60000ms on
all four projects, equal to base. Source limits stay expect10000ms,
webServer30000ms, job120min. Workflow repeat input remains unchanged.

Raw focused outputs, sorted discovery manifests and effective config comparison:
`docs/evidence/b11-b15-integration-2026-10-17/` with SHA256SUMS.txt.
This is delivery testing, NOT independent combined-candidate acceptance. No full
browser/emulator matrix, release build, deployed test or new combined ZIP run is
claimed. Previous standalone artifact verifications do not verify a new candidate.

## Runtime and import dependencies for an eventual release candidate

The inherited runtime is preserved for this infrastructure comparison; its ancestry
is not newly approved by this PR. The existing plan and review handoffs identify:

| Repair/policy | Source / disposition |
|---|---|
| Ordinary account/team persistence and conflict-safe saving | inherited reviewed coaching-client line; preserve account/team scope, verified readback, original data and legacy queue quarantine |
| L1/R1b legacy claim/account isolation | `ed4978b` handoff line, inherited; no claim clearing or foreign-account re-offer |
| R1c unfinished owner resume | `82d46cc33b7933d4de19b84a0acc553553c51d44` handoff, inherited; original coach/team only |
| N2 recoverable team creation | `bdb06ae6d39ff9ed3fee7000f93468c8cf2f8fe7` plus final runtime `518e9e5`; preserve same-operation REST create/readback and same-name confirmation |
| PR72 status-less claim repair | `35e0d77887ba87d2714706f0cdbb2511b442d1a2`, docs head `48f44730f6e300cd3085b51ffd2533a279988d44`; independently targeted evidence exists, but NOT included here; inherited PR history is not approved for direct merge |
| R3 fresh Not now | founder accepted ask-once for private beta; disclose it; unfinished postponement remains separate |
| R4 import configuration | founder approved default-off build configuration with explicit testing opt-in; implementation NOT present here |
| Missing original team | block automatic recovery; authenticated support verifies ownership; detailed support procedure/evidence requirements still needed |

Policy provenance: issue39 comments
[6221265245](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6221265245)
and [6224877757](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6224877757).
Manual re-save is an accepted disclosed private-beta limitation only within the
tested CC-E3/E4 scope; no broader draft-durability claim is added.

Current `src/features/legacy-import/import-legacy.ts:1` still says
`D10_APPROVED=true`. Do not call that the approved default-off release configuration.
The reviewed proposal was public `REACT_APP_ENABLE_LEGACY_IMPORT`, exact `true`
opt-in/default off, consumed by UI and executor, disabled/enabled build coverage,
and explicit opt-in in authorized emulator tests. The founder approved that direction,
not an already-tested implementation or production activation. Implement/review it
as a separate bounded change before the eventual release candidate; preserve all
originals/claims/pending state while off. PR72 + this configuration + runtime base
must receive their own exact combined-candidate validation. D10-08a/08d remain
known missing-behavior failures on this candidate's pre-PR72 runtime.

Physical-device/staging/security/founder gates, required product/film scope, and
unresolved N3/FX-02 observations remain separate. No feature or runtime repair was
silently selected merely because it appears in a branch's inherited history.

## Required-check enforcement proposal — NOT implemented or enabled

Target: `recovery/coach-core-mvp-2026` (observed base3992d8d). The temporary harness
target is for bounded review only. The last inspected read-only snapshot reported
no active protection/required checks; it is not a fresh settings audit. An owner
must review/approve the following after independent candidate acceptance.

Proposed required contexts, bound to the GitHub Actions app:

1. `E2E acceptance (chromium)`
2. `E2E acceptance (firefox)`
3. `E2E acceptance (phone-chromium)`
4. `E2E acceptance (phone-firefox)`
5. `Coach Core merge eligibility` — NEW aggregate check proposed, not present here.

The aggregate must be separately implemented/reviewed BEFORE these settings are
enabled. Requiring only the four names is insufficient: a targeted dispatch on
the same SHA can produce green checks with incomplete/empty coverage. It must
verify the trusted event, run ID, head/tested merge SHA, selection and evidence,
not merely look at the latest same-name status.

Proposed triggers (explicit future workflow edits, not made in this candidate):

- `pull_request` to recovery, types opened/synchronize/reopened/ready_for_review;
  full selection, repeat1, no dispatch grep, no path filters that strand required checks.
- `merge_group` checks_requested if merge queue is enabled; verify exact group SHA.
- Push to recovery is post-merge audit only, not pre-merge eligibility.
- workflow_dispatch is bounded diagnostic evidence only and cannot satisfy the
  aggregate's merge proof, even if its job names match required contexts.

Current accepted workflow remains unchanged in this respect: pull_request to recovery,
push to claude/** or recovery, and workflow_dispatch; no merge_group trigger yet.
This codex/** branch and harness-target draft do not automatically run the E2E matrix.

Aggregate policy on the trusted PR/merge-group run:

- Require exactly one completed job for every bucket/project combination (12 total),
  with both focused self-check steps and release-proof evidence successful.
- Four acceptance jobs must conclude success with complete expected execution
  identities/repeats, no unexpected skip/block, no partial result and nonzero selection.
  The current inventory is 65 acceptance tests per desktop engine, 15 per phone;
  future changes require a reviewed source-derived inventory, not a hard-coded allowance.
- Empty phone diagnostic/obsolete jobs may succeed ONLY with proven zero selection
  and execution, explicit empty annotation, valid results and complete sanitized evidence.
  Unexpected empty desktop/acceptance jobs block. Targeted grep never proves merge coverage.
- Every job must finalize successfully and retain verifiable inventory, full hashes,
  logs/exit/manifests/results. A finalize failure/withheld or missing artifact blocks,
  including failures in diagnostic/obsolete jobs whose test failures are otherwise known.
- Diagnostic/obsolete test failures remain red and visible. They are not raw required
  success contexts because known N2-D2/N2-A2 would block every candidate. Aggregate may
  accept ONLY independently adjudicated, source-pinned known fault-model signatures;
  any new/unclassified failure blocks pending review. Do not create an automatic blanket waiver.
- Failed acceptance, cancelled/timed-out/interrupted jobs, neutral/skipped/missing checks,
  missing/duplicate jobs, stale SHA/run, absent finalization evidence or untrusted event
  keep merge ineligible. Fail closed if the aggregate cannot query/verify evidence.
- Require the aggregate's own success plus an independent approval, review of latest
  updates and current trusted-base/merge-group evidence. Do not grant routine bypass.

Exact non-acceptance names to inventory (not proposed as raw success requirements):
`E2E diagnostic (chromium)`, `E2E diagnostic (firefox)`,
`E2E diagnostic (phone-chromium)`, `E2E diagnostic (phone-firefox)`,
`E2E obsolete-fault-model (chromium)`, `E2E obsolete-fault-model (firefox)`,
`E2E obsolete-fault-model (phone-chromium)`, `E2E obsolete-fault-model (phone-firefox)`.

This proposal is concrete review input, not an assertion of existing enforcement.
The current candidate intentionally cannot meet release acceptance without the
separate runtime/import dependencies. Do not enable a policy and claim gates passed.

## Independent combined-candidate review checklist / next owner

- Independently verify the final PR SHA/base, eight infrastructure-file diff, docs-only
  tail, original branch preservation and the six source-to-candidate commit mappings.
- Confirm accepted config/reporter/checks and evidence script/checks are byte-identical
  to f2e1fed and ffb40455 respectively; inspect BOTH overlapping files' union resolution.
- Run ten reporter and nineteen evidence checks; inspect exact workflow-block emulation,
  failed verifier/no eligibility, stale marker, partial inventory and exit0/7 behavior.
- Reproduce base/candidate --list equality for all four projects and both grep modes;
  inspect complete identities, not counts alone. Confirm settings and unchanged app/tests.
- On a separately authorized bounded repeat1 dispatch of this exact combined SHA,
  cover D10-01, N2-D0 and N2-A2 to exercise passing, empty and failing bucket jobs;
  preserve all 12 outcomes and investigate differences. No unchanged full matrix.
- Download all NEW combined-run ZIPs, verify archive digests and exact inventory coverage,
  sanitized final-byte hashes, release manifest/log/exit and failure outputs. Existing
  standalone ZIP acceptance is not combined-run evidence. Real withheld-branch Actions
  execution is optional when exact script/condition evidence remains adequate and disclosed.
- Review the enforcement proposal independently; implement any aggregate/event changes
  as a separate reviewed slice and change settings only with explicit authorization.
- Keep PR72/default-off import/recovery-support and full release-gate validation separate.

Next owner: independent reviewer for this delivery, then Coach Drew for sequencing.
This author is the integrator and does not independently accept this candidate.
