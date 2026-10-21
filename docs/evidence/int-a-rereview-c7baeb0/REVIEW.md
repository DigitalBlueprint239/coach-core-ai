# PR88 bounded independent repair re-review

**Non-D8 independent verdict: PASS** at **c7baeb006a1fc01a6c9986088e1b1594927f9aba**, base A7 **638631b939d60f22030291897d517f607404442d**. **D8 author validation: PASS**; I remain recused from independent D8 acceptance. No remaining blocking finding in the reviewed TEST_ONLY INT-A scope. This is not activation, deployment or release approval. MVP NO-GO.

Reviewed repaired handoff PR88 #6327313475, external F-1b #6327104671, and exact5-path delta from 9912f74. Candidate files were not edited. Previous FAILs at c413019 and9912f74, their false-pass probes, original D4 baseline and STOP runs remain preserved.

## Closed R88 findings, with executable controls

**R88-1 remains closed.** Re-ran the original invalid-state filename mutation unchanged: **35 passed/2 failed/0 skipped**, exit1, precisely the ready/rejected pre-call film/job integrity assertions. Ordinary tests pass.

**Residual R88-2 is closed.** `passLeavesJob` now compares every object’s name, generation, SHA256 of contents and metadata before/after reconcile; it observes every deleteGeneration invocation before dispatch, including failed attempts, and requires none. Original duplicate-event, no-obligation/no-evidence and job-byte assertions remain. The same helper applies to all(a)-(d) cases, with ready/rejected variants in(c)/(d).

- Original class(d) source-byte mutation, unchanged from the prior FAIL evidence: **36 passed/1 failed/0 skipped**, exit1, `objects byte-unchanged`. The loop stops at its first injected failure; that count is not described as two separately executed branch failures.
- Derived all-I-9 source mutation control: selected4 tests, **0 passed/4 failed/0 skipped**, exit1. Every I-9 case rejects altered bytes while names/generations stay the same.
- Derived all-I-9 stray failed-delete control: selected4 tests, **0 passed/4 failed/0 skipped**, exit1. Every case rejects the attempted call, including failed backend attempts.

Preload probes alter behavior in memory only, never candidate files. These deliberately failing controls are proof of test sensitivity, not product failures or acceptance-pass credit. Probes/logs retained here. Prior false-PASS results remain at evidence commits c57835a and7f951de.

## F-1/F-1b recovery listing

Class(a) now covers active job.recovery **or** exhaustion.outcome=recovery-needed, for the film’s same-generation job. Marked states retain their reason; unmarked exhausted states report `exhaustion: recovery-needed (unmarked)` with recoveryReason=null. Running, resolved-only, unrelated-generation, non-validating and exhausted-rejected controls remain excluded as applicable. Query shape, hard read bounds, cursor, read-only and emulator-only boundaries are unchanged.

New11-test listing suite exercises all9 named marks, existing real-worker paths, the unmarked state and controls. Its real-worker reproduction changes ownership **after the third scripted pipeline returns**, allowing the actual frozen worker’s endAttempt/maybeExhaust path to persist recovery-needed without a recovery mark; the listing must expose it. This is actual worker orchestration over doubles, not only hand-seeded state and not live trigger evidence.

Regression control: new listing tests loaded with 9912f74’s old admin module give **9 passed/2 failed/0 skipped**, exit1 (seeded and real-worker unmarked cases). Current code passes11/0/0. The original external7-state probe is unchanged (SHA25655c2787bfb2f408907fe13e20b13ef573b360522e1b2cd5134504e654edcbd21): all7 marked states remain visible, running remains null. A separate direct unmarked-state assertion gives the expected class(a) result.

Focused **real demo Firestore emulator** tests pass **3/0/0**, exit0, including the new unmarked seed, bounded cross-team traversal, read-only checks and CLI. Objects are generation-true doubles; the decoder pipeline is scripted. These tests do not establish real GCS semantics, decoder delivery or real triggers.

## File preservation / D8

Delta from9912f74 is exactly5 allowed paths: D5 admin, D7 compat/listing/emulator tests, D6 integration document. `git diff --exit-code` confirms functions/src, existing workflows, client source/tests, manifests and locks unchanged from the previously reviewed head. All other accepted files are unchanged by the5-path delta; the earlier independent mode/blob owner comparison remains applicable. Current owner-map/ancestry checker has0 problems: A4 22 paths, A5 23, A7 1311,31 allowlisted. No accepted assertion/fixture or frozen implementation was changed by these repairs.

D8 blob **c38a84fdd8f178543c96e9bc07ee2585b36dfda8** is exactly K c1c57e5422dc3f96e0d96af2080f3d0d46e2cbc0. Client schemas and all8 captures also match K byte-for-byte. Local D8 author check **112/0/0**, exit0; TypeScript0. Independent acceptance of D8/all candidate belongs to the non-author reviewer, not this author validation.

## Local checks

Node24.19.0, existing installed dependencies. Temporary dependency links removed after validation.

```
node --test --test-reporter=spec functions/test/film-int-compat.test.js functions/test/film-int-guard.test.js functions/test/film-int-listing.test.js functions/test/lfs-reconcile.test.js
npx --prefix tests/rules firebase emulators:exec --project demo-coach-core-beta --only firestore "node --test --test-concurrency=1 --test-reporter=spec functions/test/emulator/film-int.emulator.test.js"
CI=true node_modules/.bin/react-scripts test --watchAll=false --runInBand --runTestsByPath src/features/film-analyzer/__tests__/film-int-compat.test.ts
node_modules/.bin/tsc --noEmit
npm --prefix functions run lint
node functions/scripts/film-int-frozen-check.js
```

Ordinary focused non-D8 **129/0/0**, emulator **3/0/0**, D8 author **112/0/0**; lint0, TypeScript0, owner-map0. All failing mutation/baseline controls are separately labelled above. No unchanged browser/core matrix rerun; pinned suites were inspected in CI rather than rerun locally.

## Exact-head Actions and NEW decoder archive

Read actual logs and run metadata: **push**, attempt1, exact c7baeb006a1fc01a6c9986088e1b1594927f9aba checkout.

| Run | Verified outcomes |
|---|---|
|39681210152 INT-A|6 successful jobs; INT56, S1/C1/contracts531, S2b106, LFS145, Functions907, client546, S2a47, pinnedS2b41, emulator49+5, filmrules29; reported suites have0 failures/skips; lint/typecheck/owner-map success|
|39681210156 Security|Functions907, rules68, emulator36, web24, bundle scan success|

Downloaded **new artifact12385030529**, int-decoder-39681210152. ZIP SHA256 **d7c53be992d4f0df4d4c27cc2465f6f6b69ad2f1fb7aa063d4fc7dbf0fda7a21** matches GitHub metadata. Exactly ffmpeg/ffprobe; binary hashes match unchanged SOURCE.json:

- ffmpeg **1314ab3b558c48ce7ed4aa6efba5a68fefe30362f796e59ef017b17424436ff1**
- ffprobe **fd43ef9be4bb7d7fc821e1b25950efc6eb0aac586cabacd34a38fd52299f48e6**

No current ZIP-content access gap. Binaries and signed download URLs are not republished. This validates retained artifact bytes, not deployment or production execution.

Legacy PR LFS39681219731 and C1 39681219826 actually check out temporary merge **6b5e5a2**. Raw logs show only frozen jobs fail on the same3 A4/D8 client additions against pre-client r4; their worker-absence assumption is also incompatible with composition. Real jobs pass: LFS264/46/6, C1 119/41/3. These remain red and separate from literal-head evidence; no protected-branch eligibility is inferred. Cancelled E2E39681210193 is not acceptance.

## Remaining prerequisites / limits

No further code correction requested within this bounded scope. Obtain the other reviewer’s exact-head verdict on all of this candidate including D8. Worker indirect-export I-4 remains open by agreement; TEST_ONLY/unexported/default OFF/platform retry-off are preserved. C1-D1 migration/calibration/IAM/platform/bucket decisions, INT-B, real-GCS/trigger proofs, promotion/protection choices, staging/devices/deployment and founder release decision remain separate. CI Node22.x differs from local24.19.0. No merge, activation, deployment, live resources/settings, recovery action, spending or AI occurred. MVP NO-GO.
