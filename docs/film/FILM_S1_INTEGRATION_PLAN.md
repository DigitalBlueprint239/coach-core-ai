# FILM-S1 exact backend + client integration plan

**Plan only; no combined branch/candidate created.** User gate: combine only after both exact slices receive independent PASS. No PR merge or change to acceptedPR79. No decoder, ready/playback/frames/UI/navigation/AI work, deployment, live Firebase changes, spend or activation. **MVP NO-GO.**

## Pinned sources and review gates

| Source | Exact pin / review state |
|---|---|
| Accepted core PR79 | 515dc1d92bf237dae4d70ff2cc38c2aee07d5ae1, testedmerge950addf164e4f789c6488bf5af7dd60dc2e43ce8; preserve unchanged |
| Shared contract r3 | 8f7723952bdf38c18d12d8f2611e87830b658467; C1–C4 agreed in issue39comment6278629571 |
| PR81 backend | 9912f85992b9623a6e7fd95fa42289fae7f53bf8, base515dc1d; handoff6279101928 is **delivery, not acceptance**. No independent PASS found on PR81 or in inspected later issue39 records at plan preparation |
| PR80 client reviewed version | 5e0bc7726f3e2ef33120bb4ccac5a43220187fda, base8f77239; review5578562458 **PASS for contract parity**, P1 to fix before CI-backed claim |
| Client functional delta | 4303e7e78efb8623c929a92983b2e67256c825fc adds only contracts.ts + focused tests;9ea9ed1 +5e0bc77 add docs/evidence. Current bounded follow-up adds dedicated CI, explicit-exit evidence and this plan; final exact follow-up head/run must be pinned in issue39/PR80 before integration |

**Go condition:** backend reviewer explicitly PASSes9912f85 (or a newly pinned successor) and adjudicates R1 switch-OFF sanitizedinternal deviation; client reviewer confirms CI/evidence correction and actual clean-run evidence on the pinned follow-up head while retaining parity PASS. A COMMENTED review containing a scoped PASS is evidence; a handoff, green checks or delivery is not a substitute. If either head changes after review, stop and obtain a scoped delta review. No silent acceptance/integration while a review is pending.

## Commits and exact assembly method after the gate

Create `codex/film-s1-combined-<review-date>` in a new worktree **at accepted backend9912f85**, after verifying its independent PASS and source pin. PR81 already includes the agreed r3 contract and fixes after it. Its history from515dc1d is:

`f641d3d` contract →`aea8121` backend →`3a07ab2`rules →`72ff8f4`CI →`7553a05`r2 →`09fad91`reconciliation →`8f77239`r3 →`18e4272`R1–R8repairs →`283e731`generation-emulator observations →`9912f85`version-aware generation proof/limitation.

Onto that backend base, cherry-pick **only the PR80 delta after8f77239**:4303e7e,9ea9ed1,5e0bc77 and the reviewed CI/evidence/plan follow-up commit(s). Enumerate fullSHAs with `git rev-list --reverse 8f7723952bdf38c18d12d8f2611e87830b658467..<reviewed-client-head>`; verify their paths against the reviewed delta before applying. Never merge the whole client branch's inherited backend history or replay older backend files over9912f85. Record old→newcommit mapping, final sourceSHA and testcommit/tree before any validation claim. Preserve PR80/81 originals. Do not retarget/merge PR79.

Proposed combined review target: a new immutable `review/film-s1-combined-base-9912f85` at9912f85, only after the go condition. Draft combined PR compares backend with the client delta. Its focused client workflow can run on this PR; no production/recovery branch or protection modification is required. Keep combined evidence separate from final film/release acceptance.

## Overlaps and what must survive

- **No direct functional-file overlap:** backend changes functions/index.js append-only exports, functions/src/film/{handlers,storage-adapter,terms}.js, deployguard, firebase.json predeploy, storage/rules/tests/backenddocs; client adds unmounted `src/features/film-analyzer/contracts.ts` and tests.
- Client shared-context/tracker notes are additive. Docs are separate filenames; resolve any context overlap by keeping both accurate scoped records, not replacing backend status with client PASS.
- New client CI has its own `film-client-contract.yml`; it **avoids security-rules.yml overlap**, preserving backend film-emulator step and accepted core workflows. No dependency/lockfile/package change is introduced by the client fix; functions deps remain authoritative at their own lockfile.
- Do not overwrite firebase.json from the older client base. Preserve backend's functions.predeploy `film-terms-guard.js`, default-OFF `COACH_CORE_FILM_ENABLED`, generation-aware storage adapter, additive rules and all207/36/68 backend checks.
- Preserve test-only `PENDING_D3`/`PENDING_D7`, terms status and rights-v1 placeholder labeling. Contractagreement is not policyadoption. `--check` on the guard is informational (exit0 while pending); ordinary guard must exitnonzero. It guards **functions predeploy**, not all possible Hosting/Storage-only deployment commands; no deployment is authorized regardless of hook scope.

## Contract/fixture alignment — verified now

`git diff 8f77239 9912f85 -- functions/src/film/contract.js docs/film/COACH_FILM_V1_CONTRACT.md tests/fixtures/coach-film.v1` is **empty**. All86 fixture JSON files, generated schema/index/checksums and r3 contract surface remain unchanged. Client contracts.ts/tests are unchanged from independent parity PASS; local146/0/0 and TypeScript0 reproduce after functions dependency install.

Keep C1 sanitizedSDK failures separate from resolved server/protocol failures, C2 strict state/ack invariants, C3 replay not uploadpermission, C4 NFC+trim/UTF-16file-name bounds; generation is a decimal string, timestamps canonicalUTCmilliseconds. Client is stricter than plainzod on timing invariants; therefore combined emitted-handler states, not just schema fixtures, must be checked. Never relax the client to make a backend timing change pass without contract review.

## Focused combined validation checklist — run only on the pinned combined candidate

| Check | Command/evidence and acceptance criterion |
|---|---|
| Scope/assembly | Compare against9912f85 for client-only delta; compare protected core app/workflows/locks against515dc1d allowing only reviewedfilm/backend/clientCI additions. Record sourcehead/testedcommit; require clean tracked tree |
| Dependency prerequisites | Clean root `npm ci --legacy-peer-deps --no-audit --no-fund`; functions `npm ci --prefix functions --no-audit --no-fund`; rules test deps perlockfile. Node22 inCI. No new dependencies/lock rewrites or cloudcredentials |
| Contract/schema/sums | `node functions/scripts/film-contract-schema.js --check` must exit0; direct r3 contract/fixture byte comparison must remain identical. Do not regenerate approvedfixtures to hide drift |
| FS-26 | `CI=true npm test -- --watchAll=false --runInBand --runTestsByPath src/features/film-analyzer/__tests__/contracts.test.ts`:146pass/0fail/0skip expected. Retain actualprocess exit; `npx tsc --noEmit` with explicit exitlog; noempty-log-only claim |
| Backend unit/lint | `npm --prefix functions test` (207expected at9912f85) and `npm --prefix functions run lint`; actual counts/skips/failures recorded, not inferred from standalonehandoff |
| Film handler/rules emulators | Existing security workflow commands, explicit **demo-coach-core-beta** only: rules68 and filmemulator36 expected. Preserve no realFirebase/auth/provider access. Keep rules-before-handler test scopes separate and actualresult records |
| Cross-slice emitted payloads | Focused test-harness checks: actual reserve/new andsame-operationreplay, abandonfromreserved/fromvalidating, repeatedabandon, finalizevalidating/rejected, expired/lateevent/stalegeneration samples through unchanged client parsers. Check exact r3keys/timestamps/identity, preservedoperationIDs and receipt-not-uploadauthority. Use synthetichandler/emulator fixtures only; no SDKwiring/UI/storageuploadclient implemented |
| Disabled/deploy guards | Direct ordinary `node functions/scripts/film-terms-guard.js` must exit1 and namependingD3/D7; `--check` may exit0 but must still saypending. Verify predeployhook/defaultOFF bytes and no filmroutes/ready/decoder/playback exports. Do not run firebase deploy even as a negative test |
| R1 deviation / R2 limitation | Backend independent reviewer must decide internal-off semantics. Combined client must classify SDKinternal nonretryable, preserve sanitized/no rawdetails; no automatic retry. Storageemulator ignoresgenerations: version-aware teststore + adapteroptions are the supported evidence. Preserve explicit **realGCS generations unverified**, live rulecallcounts/realAuth unverified |
| CI composition | Actual focusedclientworkflow passes withclean installs, uploadedFS26/typecheck exits and86fixtures; relevant securitygates on exactcombinedSHA. Inspect workflowpaths/events/permissions/artifacts. Never treat dispatchaggregateR1INELIGIBLE as broken or as trusted acceptance |
| Existing core / evidence | PR79 exactevidence stays accepted at515dc1d; backend160acceptance result is standalone9912f85 evidence, not combinedevidence. Do not repeat an unchanged fullmatrix automatically. If source/dependency/workflow overlap invalidates inherited evidence, identify precise gap for bounded approval/verification instead of manufacturing a green aggregate |

After focused checks pass, ask an independent reviewer to judge combined source/evidence, including actual CI artifacts and guard behavior. Publish exactcandidateSHA, fullcommitmapping, local/CIcounts, checksum/provenance records, limitations and remaining gates on issue39 and the draftcombinedPR. CombinedFILM-S1PASS would cover reservation/cancellation/quarantine intake +clientcontractvalidation only; it does not establish decoding/ready/playback/UI, realGCS or filmfeature readiness. Stop on any mismatch and obtain a separately reviewed correction.

## Current next owners

- **Codex:** PR80 P1/P2 fix and local/actualCI evidence; preserve protocolcode/fixtures and report exacthead; prepare onlythisplan untilreviewgate satisfied.
- **Client independent reviewer:** focused CI/evidence delta review, retain scoped r3parity verdict.
- **Backend independent reviewer:** exact9912f85 review and R1–R8 adjudication, R2scope limitation; no acceptance inferred here.
- **Integration owner after bothPASS:** newbackend-basedworktree/cherry-picks/combinedfocusedvalidation and independenthandoff; not merge/deploy authority.
- **Coach Drew:** later merge/scope/policy/deployment decisions; D3/D7 remain testplaceholders. No decoder/playback/UI/AI work requested or started.
