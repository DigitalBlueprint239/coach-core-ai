# FILM-S1 isolated combined candidate

Delivery for combined validation/review only; not deployment/film acceptance. No decoder/playback/UI/AI. D3/D7 remain test placeholders; MVP NO-GO.

Independent go gate is now satisfied:
- Backend **9912f85992b9623a6e7fd95fa42289fae7f53bf8**: [PASS review5578729431](https://github.com/DigitalBlueprint239/coach-core-ai/pull/81#pullrequestreview-5578729431), including R1 sanitizedinternal switchOFF deviation and R2/R7 scope limits.
- Client **29dfce93f29b698cb6d199d38e62f47626f57ffc**: [PASS delta review5578760978](https://github.com/DigitalBlueprint239/coach-core-ai/pull/80#pullrequestreview-5578760978), resolves P1/P2 and preserves [r3 parity PASS5578562458](https://github.com/DigitalBlueprint239/coach-core-ai/pull/80#pullrequestreview-5578562458).
- Client exact-head clean CI push39338468243 +PR39338472033 success; integrator downloaded both newZIPs12227207957/12228380586, verified digest/size and146/0/0 +explicitFS26/TypeScriptexit0. Reviewer could not accessZIPcontents; this is integrator-verified, not retroactively attributed toreviewer. Immutable CI evidence is on d4617b664362ee183eb99933d564234e62e089a6, outside the client source branch.

## Exact assembly

Branch `codex/film-s1-combined-2026-10-19`, exact **backend base9912f85992b9623a6e7fd95fa42289fae7f53bf8**. Accepted core515dc1d92bf237dae4d70ff2cc38c2aee07d5ae1 and originalPR80/81 branches are unchanged.

| Client original | Combined cherry-pick |
|---|---|
|4303e7e78efb8623c929a92983b2e67256c825fc|2b9a0eef89b2c0466db3113aa02ba745de8acd6a|
|9ea9ed1|0c37ab3a992a511115c6c7d67fb675a221431a8d|
|5e0bc7726f3e2ef33120bb4ccac5a43220187fda|5002fe88e07ffa79170be8680ffcb96f7e534f77|
|29dfce93f29b698cb6d199d38e62f47626f57ffc|2a27e748eb5e3abf4ba0ce0cba86765200e854b3|

No textual conflicts occurred. No old inherited backend files were replayed. Only the reviewed clientdelta was applied afterr3; backendfunctions/rules/guards/fixturefiles retain9912f85 bytes. New focused clientworkflow is separate from security-rules.yml, avoiding that ownership overlap. Context/tracker notes/docfiles are additive. This candidate adds only this integration record beyond reviewed source; final exactSHA will be posted beforeCIvalidation.

Contract r3module/document/schema/goldens/index/checksums unchanged against8f7723952bdf38c18d12d8f2611e87830b658467;86fixtures consumed. Preserve strict client timing/identity/receipt semantics, SDK/protocol distinction and no automatic retry. Do not promote validating to ready; intake is only a 1KiB container-header check.

## Bounded validation protocol

Follow FILM_S1_INTEGRATION_PLAN.md. Actual results will be pinned in issue39/evidence after execution: FS26/tsc; schema--check; backend207/lint; rules68/film36 on explicitdemo; ordinaryguardexit1andstatus--checkexit0; sourcebyte/placeholder/defaultOFF/predeploy checks; actualcleanCIartifactverification. Cross-slice verification passes realhandler/emulator outputs andfinalizedstoredstates through the unchanged clientparser, without replacing businesslogic or weakeningexistingtests. Any verification-only preload is retained as evidence and explicitly distinguished from productionwiring.

No unchangedfullcorematrix. PR79 and standalonebackend160acceptance evidence are historicalscoped evidence, not a newly run combinedmatrix or filmfeatureacceptance. Existingcorecode/workflows/settings remain unchanged outside reviewedfilmadditions.

Deploymentguard is functions.predeploy-scoped; no Firebase deploycommand is authorized even if another deploymentpath could omit it. Never markPENDING_D3/PENDING_D7SETTLED based on contract agreement or tests. DefaultOFF remains. Preserve realGCSgeneration/live rulecall-count unverified, Eventarcretrydisabled, orphanquarantinesweeper deferred. No staging, devices, provider, footage, decoder, playback, frames, UI or AI work.

Once bounded combinedvalidation finishes, post exactsource/testedSHA, commitmapping, local/CIcounts includingfailures/skips, artifacthashes, newlimitations and independentcombinedreviewhandoff. StandaloneslicePASSes do not replace combinedreview or authorize merge/deploy.
