# PR88 independent bounded re-review

**Non-D8 verdict: FAIL** at **9912f74b7ae43a421427afd96012cb3ef00b888e**. R88-1 and the recovery-listing F-1 defect are corrected. R88-2 has its new class(d) cases but retains a source-integrity assertion gap. **D8 author validation: PASS**, not independent acceptance. No actual runtime source mutation defect was found. MVP NO-GO.

Read repaired handoff PR88 #6326885408 and external F-1 review #6326638892. Previous C c413019 FAIL remains preserved. Review-only worktree; candidate files unchanged.

## R88-1: closed

CT-4.5 now snapshots film/job and cleanup records before abandon and compares after invalid-state. Reran the **unchanged** original `mutate-invalid-state.cjs` from the prior review: it still injects ready/rejected filename changes after the real handler returns invalid-state. On C it falsely passed36/0; here it exits1 with **35 passed /2 failed /0 skipped**. Both failures are the intended `no write (film + job)` assertions. The ordinary suite passes. The original probe and current log are retained, not replaced by a green count.

## R88-2: partial repair; residual blocking evidence defect

New CT-4.4 class(d) cases use real worker ready/rejected documents, retain the same-generation source via cleanup503, then remove the quarantine intent as an anomalous stored-state fixture. Job-byte, duplicate-event, no-evidence and no-obligation assertions are meaningful.

But `passLeavesJob` snapshots **only object keys**. It does not compare source bytes/generation/metadata or count delete attempts. This cannot establish the handoff's “objects byte-unchanged / no delete” claim or the agreed unchanged-source property.

Executable review-only reproduction:

```
node --require /path/to/mutate-class-d-source.cjs --test --test-reporter=spec functions/test/film-int-compat.test.js
```

The preload wraps the actual reconciler handler's duplicate-event path and changes class(d) source bytes to `FAULT-INJECTED SOURCE BYTES`, preserving its name. It logs both ready/rejected mutations, yet the full compatibility file **passes37/0/0, exit0**. The preload does not edit candidate files. This is a false acceptance result under deliberate test fault injection, not a claim that the frozen runtime currently performs such writes.

Minimum correction (new D7 only): snapshot actual source/object contents, generations and metadata before reconcile and compare afterward; separately observe deleteGeneration invocations, including failed attempts, and assert zero new deletes. Preserve job/evidence/obligation checks. The same byte mutation must then fail; ordinary(a)-(d) cases must pass. Sent directly to builder on #39 **6326994194**. No frozen change or scope expansion is needed.

## Recovery-listing F-1: closed

The classifier now uses any active `job.recovery` for validating films, reports recoveryReason and retains exhaustion only as detail. Running/no-job/resolved-only controls are excluded; same-generation lookup remains via jobIdFor and the query/read/cursor bounds are unchanged. Source diff is limited to classification and comments.

Extracted the external reviewer's original `s2bclass-probe.cjs` and verified exact SHA256 **55c2787bfb2f408907fe13e20b13ef573b360522e1b2cd5134504e654edcbd21**. Reran unchanged against both heads: C lists1 of7 recovery states; 9912f74 lists all7 with correct reasons; running control remains null. New seeded coverage includes all9 named worker recovery reasons;4 real-worker execution paths verify marks from the actual frozen worker. A test-only loader runs the new listing tests against C's original admin code: **4 pass/6 fail/0 skip, exit1**, preserving the regression baseline. On the current code they pass.

Focused **actual Firestore emulator** execution also passes **3/0/0**, exit0: lost-finalize composition and recovery listing/CLI, including non-exhaustion and resolved controls, bounded cross-team pagination and unchanged updateTimes. Demo-only setup, generation-true object doubles and scripted pipeline; not real GCS or trigger verification.

## Preservation and retained evidence

Diff from C is exactly5 allowed paths: admin D5;3 new D7 tests (compat/listing/emulator); D6 integration document. All accepted source, contracts, worker, handlers, transport, rules/config, manifests/locks, existing workflows and accepted test files remain byte-identical to the previously fully reviewed C. Thus the prior independent mode/blob owner comparison remains applicable outside those5 paths. Current owner-map/ancestry checker:0 problems (A4 22; A5 23; A7 1311;31 allowlisted). D8 remains byte-identical to K c1c57e5422dc3f96e0d96af2080f3d0d46e2cbc0.

Original D4 baseline remains in unchanged D6 material, hash9b9c428381542f333e82a613bfa02bbd1af3620d131f270badb61ec0322fedfa, verified in the C review. Original C false-pass reproduction is retained at evidence commit c57835a; both FAILs and STOP runs remain on record. Current corrected/uncorrected probes and logs are retained in this evidence directory. No green run erases failures.

## Local verification (Node24.19.0)

- Ordinary changed INT/guard/listing + LFS checks: **128/0/0**, exit0.
- Original invalid-state mutation: **35/2/0**, exit1 as required.
- New class(d) byte mutation: **37/0/0**, exit0 demonstrating the residual false PASS.
- Old-classifier baseline with current listing tests: **4/6/0**, exit1 as required.
- Focused demo Firestore emulator: **3/0/0**, exit0.
- D8 author check: **112/0/0**, exit0; TypeScript0; lint0; frozen checker0.

No unchanged browser/core matrix rerun. Existing installed dependency links were temporary and removed at closeout. CI uses Node22.x; local environment differs.

## Exact-head Actions and current artifact

Read raw job logs and metadata for both **push** runs at exact9912f74, attempt1:

| Run | Verified outcomes |
|---|---|
|39677894980 INT-A|6 jobs success; INT55, contracts531, worker106, LFS145, Functions906, client546, S2a47, pinnedS2b41, emulator49+5, filmrules29; zero failures/skips in reported suites; typecheck/lint/owner-map success|
|39677894905 Security|Functions906, rules68, emulator36, web24 and bundle scan success|

Downloaded **new** artifact **12382911916**, int-decoder-39677894980. ZIP SHA256 **b0a5bd3374e1507be41f4013160efc87ae2ad051c754afdaeeedfa242e7603e0** matches GitHub metadata. Exactly ffmpeg and ffprobe; binary hashes respectively **1314ab3b558c48ce7ed4aa6efba5a68fefe30362f796e59ef017b17424436ff1** and **fd43ef9be4bb7d7fc821e1b25950efc6eb0aac586cabacd34a38fd52299f48e6**, matching unchanged SOURCE.json. No ZIP-content access gap for this artifact; binaries/download URLs not republished.

Current legacy PR LFS39677902608 and C1 39677902655 actually check out temporary merge **c807266**. Raw logs show only frozen jobs fail on the same3 A4/D8 client files against r4; the worker-absence assumption is also incompatible with composition. Their real test jobs pass: LFS264/46/6, C1 119/41/3. These remain red and are separate from literal-head acceptance evidence. Do not infer protected-branch eligibility. Cancelled E2E39677894510 is not acceptance.

## Disposition

Fix only the residual new-D7 assertion gap, retain the executable reproduction and obtain a new exact-head bounded verdict. D8 independent acceptance belongs to the non-author reviewer. Worker indirect-export I-4, C1-D1 migration/calibration/IAM/platform/bucket decisions, INT-B, real-GCS and trigger proofs, promotion/protection choices, staging/devices/deployment and founder release decision remain separate. No merge, activation, deployment, live resources/settings or spending occurred. MVP NO-GO.
