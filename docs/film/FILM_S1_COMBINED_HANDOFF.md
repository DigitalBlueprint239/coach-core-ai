## FILM-S1 isolated combination delivered — focused CI green; local rules discrepancy retained

**Draft [PR82](https://github.com/DigitalBlueprint239/coach-core-ai/pull/82). Exact combined source `49bd3f3f1153d9d5d2637a39897b7c91be08b9fc`; exact backend base `9912f85992b9623a6e7fd95fa42289fae7f53bf8`; client `29dfce93f29b698cb6d199d38e62f47626f57ffc`. Tested PR merge `8368e01c9af1c9dcfb76d01b5367ed8f0cd1df6e`, tree identical to source head.** Accepted PR79 source515dc1d/tested950addf remains unchanged. No PR was merged.

### Review gate and client findings

Combination began only after both exact independent PASSes were posted:

- Backend [review5578729431](https://github.com/DigitalBlueprint239/coach-core-ai/pull/81#pullrequestreview-5578729431) at9912f85: bounded FILM-S1 PASS, explicit acceptance of the R1 switchOFF sanitizedinternal/nonretryable deviation; R2/R7 realCloudStorage/livecallcount limits preserved.
- Client [review5578760978](https://github.com/DigitalBlueprint239/coach-core-ai/pull/80#pullrequestreview-5578760978) at29dfce9: P1/P2 resolved, preserves earlier r3 parity PASS5578562458.

P1 was corrected with a dedicated client workflow: clean root+functions installs,146FS26 tests, actual process exit retained,tsc with explicit exit and focused artifacts. Backend-owned security-rules.yml was not edited. P2 gets a nonempty `exit=0` log while historical empty log/hash remain intact. No client implementation/test/fixture change was made to satisfy review. P3 later-UI wording remains informational; no UI started. P4 strict timing invariants remain.

Both standalone-client CI runs39338468243/39338472033 succeeded; both NEW ZIPs12227207957/12228380586 were downloaded, size/digest verified and146/0/0 +FS26/tscexit0 confirmed. Those contents were integrator-verified; the independent reviewer disclosed unavailable blob access. Immutable record d4617b664362ee183eb99933d564234e62e089a6 is outside PR80 source.

### Commits, overlap and r3 alignment

Started the new `codex/film-s1-combined-2026-10-19` branch at independently accepted backend9912f85. Comparison target `review/film-s1-combined-base-9912f85` is an immutable snapshot of that backend; no recovery/master/protection change. Applied only clientdelta after agreed r3 `8f7723952bdf38c18d12d8f2611e87830b658467`:

| Client original | Combined cherry-pick |
|---|---|
|4303e7e78efb8623c929a92983b2e67256c825fc|2b9a0eef89b2c0466db3113aa02ba745de8acd6a|
|9ea9ed174ce01feed02871d0906a83c0cbc7c975|0c37ab3a992a511115c6c7d67fb675a221431a8d|
|5e0bc7726f3e2ef33120bb4ccac5a43220187fda|5002fe88e07ffa79170be8680ffcb96f7e534f77|
|29dfce93f29b698cb6d199d38e62f47626f57ffc|2a27e748eb5e3abf4ba0ce0cba86765200e854b3|

Final49bd3f3 adds only the combination record. **No textual conflict occurred.** No inherited older backend files were replayed. New client CI avoids the shared securityworkflow overlap; shared-context/tracker notes and docs remain additive. Direct comparisons confirm backendfunctions/rules/fixtures/guard/firebase.json/securityworkflow byte-identical9912f85; clientcode/tests/clientworkflow byte-identical29dfce9; acceptedcoree2e/workflow/import/appentry/locks unchanged.

r3 contract module/document/schema/86goldenfixtures/index/checksums remain byte-identical to8f77239. Client strict keys/state/timing/identity/UTF16 bounds/replay receipt semantics stay aligned; no client relaxation, fabricated upload authority or retry executor. [Exact assembly plan at29dfce9](https://github.com/DigitalBlueprint239/coach-core-ai/blob/29dfce93f29b698cb6d199d38e62f47626f57ffc/docs/film/FILM_S1_INTEGRATION_PLAN.md) was prepared before the review gates completed; its historical “no candidate yet” status is superseded by [combined record at49bd3f3](https://github.com/DigitalBlueprint239/coach-core-ai/blob/49bd3f3f1153d9d5d2637a39897b7c91be08b9fc/docs/film/FILM_S1_COMBINED_CANDIDATE.md) and this handoff.

### Focused combined validation — actual results, not a new full matrix

| Check | Actual combined evidence |
|---|---|
| Local backend unit/lint/schema |207passed/0failed/0skipped; lint clear; schema/sums--check exit0 |
| Local FS26 /TypeScript/actionlint |146passed/0failed/0skipped; explicit exits0; workflowactionlint clear |
| Guards/placeholders | Ordinary film-terms-guard exit1 namingD3/D7pending;--check prints pending and exits0 informationally. Functions.predeploy and defaultOFF unchanged. No deploycommand run |
| [Security gates39339050594](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39339050594), dispatch on exact49bd3f3 |success: backend207/0/0, **rules68/0/0**, **film36/0/0**, mockedgateway/lint, webauth24/24 and browser-bundlecanary. Counts independently read from actual job logs/API annotations, not inferred from conclusion |
| [Client CI39339050996](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39339050996), realpull_request source49bd3f3/testedmerge8368e01 |success,146/0/0 and explicitFS26/typecheckexit0. NEWZIP12227158935 downloaded, APIhash/size verified; exactpayload fs26.log/fs26.exit/typescript.log verified |
| Local actual-handler/client-parser integration |Separate filmemulator run **36/0/0**, with verification-only preload invoking unchanged clientparser on **150 actual emissions**:134 callable responses+16 finalizedstoredstates. States:98reserved,16abandoned,4rejected,5validating,1expired plus26errorresponses. All150 parse/equality checks pass; actualdependencies/businesslogic not replaced; no clientadapter/UI installed |
| Local rules — NOT GREEN |First and explicit-GCLOUD_PROJECT retry each **65passed/3failed**, Storage-positive cases listed below. Exit1/rawlogs retained. Film command chained with&& did not run in those attempts; it passed only in the separately reported film run |

**Local discrepancy:** FS-15 declared-size upload, exactly-maxBytes upload and existing owner file upload return storage/unauthorized locally (Node24.19.0,Java21,Firestoreemulator1.22.0/Storagerules1.1.3). Explicitly setting demoGCLOUD_PROJECT did not resolve it. Same combined rules/fixtures are byte-identical to acceptedbackend; clean CI Node22 on this exact candidate passes68/68. Root cause remains **unresolved**; neither “integration product bug” nor “harmless environment issue” is established. Do not hide these failures or call all local checks green. Minimum bounded follow-up: compare these three cases on standalone9912f85 under the same local runtime, then inspect emulator cross-service/runtime differences; no need to rerun a full core matrix or weaken rules.

The added verification preload is evidence-only, not productionwiring. It transpiles the unchanged TSmodule toCommonJS for parser invocation, wraps real handler return values, and serializes actual Firestore timestamps with the existing wire serializer before checking finalizedstates. It preserves original outputs/errors/dependencies. Logs record only synthetic action/status counters, not tokens/realmedia. This is additional combined emission compatibility evidence, not realGCS/media validation.

### Scope/limits and independent combined-review handoff

- **No new fullcore acceptance matrix**. PR79 and standalone9912f85's160browserpasses retain their original scopes; they are not relabeled as newly executed combined browser acceptance. Securitydispatch is not a trusted merge-eligibility verdict; no aggregate success is claimed from it.
- D3/D7 remain **PENDING testplaceholders**, rights-v1 is not policyadoption. Functions.predeploy hook is preserved and blocks function deployment; it is not a global guarantee that every Hosting/Storage-only CLI path invokes that hook. No deployment is authorized regardless.
- Real Cloud Storage generation semantics/live cross-service rulecallcounts remain unverified. Storageemulator ignoresgeneration; version-aware fake+adapteroption tests are the supported scope. Eventarc retry remainsoff; orphanquarantinesweeper waits for retention slice/D4. Validating is only a1KiBcontainerheadercheck, never ready.
- No decoder, media processing, playback, frames, navigation/UI, provider calls, realauth/staging/device/footage, AIwork or activation. No policyplaceholder adopted, no spending/liveFirebase/protection/production change or recovery.

**Next reviewer:** independently assess PR82 at49bd3f3 against9912f85, review commitmapping/scope, actual combinedCI/logs/ZIP and150emissionchecks, and adjudicate whether the localrules discrepancy blocks bounded combination acceptance or remains a documented runtime limitation after attribution. Verify no oldbackend/rules/guard overwritten, r3fixturehashes unchanged, defaultOFF/deployblock intact. Standalone PASSes and green CI do **not** constitute independent combined acceptance. Keep exact-SHA evidence and any findings separate from later film/release acceptance.

**Delivery status:** integration plan implemented and focused validation recorded; combined independent review **pending**, localrules discrepancy **open**. PR80/81 remain unmerged; acceptedPR79 unchanged. **MVP NO-GO.**
