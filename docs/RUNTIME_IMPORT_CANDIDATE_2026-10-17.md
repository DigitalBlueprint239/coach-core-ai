# Bounded runtime/import candidate — delivery, independent acceptance pending

MVP NO-GO. No merge, deployment, production/protection changes or AI activation.

## Exact inputs and scope

Base: accepted PR75 `efc9116cf93c5d235b0b2edeb4d7be03a4e73cdc`.
Branch: `codex/runtime-import-integration-2026-10-17`.
Narrow draft target: `codex/integrate-b11-b15-2026-10-17`, frozen at that same base.
Eventual recovery target remains `recovery/coach-core-mvp-2026`; no inherited
candidate history is proposed for direct merge by this stacked draft.

Read PR75 independent acceptance comment6243036404 and evidence71 at acceptance
branch commit7b38576. Accepted B11+B15 is inherited directly as the base, not
re-cherry-picked/recombined. Its workflow, reporter, config and evidence gates
are unchanged. Aggregate required-check implementation is deliberately excluded.

PR72 inspected at exact head `48f44730f6e300cd3085b51ffd2533a279988d44`, draft/open,
no formal submitted PR reviews at inspection. Its application repair source is
`35e0d77887ba87d2714706f0cdbb2511b442d1a2`; the later head is docs/evidence only
for src/. Its large inherited history is NOT included. Only that bounded source
commit was cherry-picked as `acc2368` (full SHA in Git history).
Issue39 comment6220459215 records independent targeted verification, including
owner/team isolation, original-data and failed-readback protection, and the
subsequent D10-11 readiness anchor verification. That evidence is not independent
acceptance of this combined candidate or the newly implemented configuration.

Configuration implementation: `882f584417c4827ff7ed81148a566ec35a49d344`.
The delivery head adds only docs/evidence/N2 history; final exact candidate SHA is
recorded in the draft PR and issue39 handoff. All browser validation is to run on
that exact final head, not an intermediate revision.

## Approved import policy implemented

Founder source: issue39 comment6224877757 (R3 ask-once private-beta limitation,
R4 default-off configuration with testing opt-in, ownership-verified support for
missing-original-team recovery). No new consent or recovery policy is inferred.

- Public build flag `REACT_APP_ENABLE_LEGACY_IMPORT`: only exact string `true`
  enables the flow. Missing, empty, false, uppercase TRUE and1 remain OFF.
- `.env.production` explicitly defaults false. The flag is not a credential,
  account authorization or consent. It cannot override server access controls.
- The emulator-only build script explicitly opts in. Its existing real-project
  emulator guard remains unchanged. Ordinary release builds do not inherit a
  previous shell script's exports; no production configuration is activated.
- `.env.test` is an explicit test-mode opt-in for the pre-existing enabled-import
  unit fixtures, so ordinary CI Jest commands preserve their original criteria.
  CRA does not load it for development/production builds; the configuration
  regression suite independently clears/varies the flag to prove default-OFF.
- Both UI and executor are gated; direct decline is gated too, so disabled mode
  cannot silently write a decision. Disabled mode exposes no Import/Not now
  action, explains that originals/unfinished state remain on-device, and leaves
  original library, claim, pending and decision bytes unchanged.
- Enabled mode preserves the approved fresh Not now ask-once limitation; there
  is no reset, automatic re-offer or new re-entry feature. Unfinished owner
  postponement remains distinct and recoverable under the existing criteria.
- The PR72 fallback restores matching status-less original-team recovery;
  explicit imported claims, no pending marker, conflicting team/account state
  remain terminal/blocked. Full verified readback and deterministic IDs remain.
- Missing original team remains blocked; UI directs ownership-verified support
  and says it cannot release or transfer an import. No claim deletion, reassignment,
  same-name replacement-team substitution, admin endpoint or support bypass exists.
- Approved identity/sign-in screen is preserved; no App/identity UI files or
  existing browser acceptance bodies/assertions are changed.

### Support boundary / unresolved operational dependency

Support must authenticate the requesting original coach, verify the original uid
and team identity against authorized backend ownership records, record the reason
the original team cannot be selected, and escalate to separately authorized
recovery operations. Device claims, a matching team name, screenshots or a
replacement team alone are not ownership proof. Preserve originals and claim/
pending/decision evidence; do not instruct the user to clear/edit them to bypass
the block. This candidate does not grant support new data access or implement
backend restoration. An approved operational runbook/access path is still needed
before performing actual missing-team recovery. Conflicting server copies still
fail verification after ownership/access restoration.

## Evidence71 and its 24 NEW archives

Downloaded all12 artifacts of run39078328001 and all12 of run39078584595.
For all24: ZIP SHA-256 and size equal GitHub metadata; exact inventory coverage
(except inventory/marker self-exclusions); every retained-file hash matches final
bytes; required logs, release manifests, exit files, results and markers are
nonempty; configured residual token-shape scan of run.log is clear. Retained
exits:22 exit0 and2 exit1 (the expected D10-08a desktop failures on pre-PR72 runtime).
There is no remaining access gap for those24. Report/metadata/evidence71 are
retained under `docs/evidence/runtime-import-integration-2026-10-17/`.
This does not retroactively recover older missing manifests or verify future
candidate artifacts. Release manifest entries were not checked against absent
release build files, and the pattern scan is not a universal secret audit.

## Validation and unchanged acceptance criteria

Local delivery checks before remote validation: 496/496 full web Jest tests in39
suites with explicit testing opt-in;47/47 import tests in6 suites; new default-off
configuration suite7/7; TypeScript exit0; reporter10/10; evidence19/19. No skips.
Node24.19.0/npm11.9.0 locally; remote workflow pins Node22. Original warnings and
raw outputs are retained. Initial local browser dependency install via su was
unavailable; remote Actions is the intended real-browser validation environment.
No failed browser test is omitted or converted to a passing result by this note.

Planned bounded validations on the final published SHA through the unchanged
accepted B15 workflow (final run IDs/results/ZIP verification in issue39 handoff):

1. Repeat10, grep `D10-08[a-d]`: both desktop engines execute all four PR72
   legacy-state cases; phone filters legitimately select zero. D10-08a must
   offer the original owner's resume, finish with exact verified deterministic
   copies, preserve originals, clear pending only after verified completion and
   remain idempotent. D10-08b/c forbid other teams/accounts with no writes.
   D10-08d must surface verification failure, not success, never overwrite the
   conflicting server copy, and preserve pending ownership/originals.
2. Repeat1, grep `D10-`: all existing import/recovery criteria, including fresh
   Not now, partial failure/retry, idempotence, cross-account/team isolation,
   in-flight sign-out/team switch, readback ordering, postponed original owner
   resume and cloud reopen/readiness. No assertions/timeouts/retries weakened.

Do not launch these concurrently on one ref: accepted concurrency cancellation
would cancel the earlier run. Preserve all12 job outcomes, including legitimate
empty jobs, through finalization and gated upload. Verify every new bounded-run
archive independently; prior PR75 ZIP results are not new-candidate evidence.
No unchanged full product matrix is requested. A grep-limited green context is
targeted delivery evidence, never aggregate/full acceptance or merge eligibility.

## N2/N3 history and exclusions

N2-A2 alone-in-bucket passed in PR75 run39078328001 after observed timeouts when
following other tests in earlier reviewed runs. Recorded in
`docs/N2_TEAM_CREATION_HANDOFF.md` as diagnostic order/state dependence, not a
new cause determination, N3 fix or acceptance result. Earlier occasional Firefox
passes remain part of history. No N2/N3/FX-02 implementation or probe is changed.

Included without standalone acceptance: the new build configuration, disabled UI/
executor behavior, recovery-support copy and their combined runtime integration.
PR72 has targeted independent evidence but no formal submitted PR approval and
is not automatically accepted wholesale. Independent review of this candidate
is required. Existing backend rules/access, identity UI and CI implementations
are preserved, not re-approved by this author.

## Independent reviewer checklist

- Verify accepted PR75 base and unchanged source branches; inspect only the narrow
  PR72 source cherry-pick, configuration commit and docs/evidence tail.
- Reproduce full/targeted unit checks, default-OFF state preservation, exact opt-in,
  unchanged fresh-decline and original-team ownership/readback criteria.
- Confirm unchanged identity/App/backend/rules/browser acceptance files and
  unchanged workers/retries/repetitions/timeouts/phone and bucket filters.
- Inspect both exact-head bounded runs, all12 jobs each, their expected selected
  identities/repetitions and every NEW ZIP digest/inventory/sanitized log/exit/
  release manifest. Investigate any failure on its tested runtime; do not waive it.
- Independently test release default-off and explicit testing-on behavior. Do not
  activate a provider or production setting to test configuration.
- Keep support runbook/backend ownership verification, aggregate required-check
  implementation, recovery-target integration, staging/physical/security/founder
  gates and required product scope as separate unresolved prerequisites.

Delivery is not independent acceptance. MVP remains NO-GO.
