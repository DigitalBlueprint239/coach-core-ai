# Independent PR87 bounded re-review

**PASS at `638631b939d60f22030291897d517f607404442d`**, base `7f3b757b1e260105ac85f825bdbbfcbdb4110ae6`, for the empty-page recovery and transport-attempt/deadline repair scope. No new blocking implementation defect found. This is not integration, deployment, platform or activation acceptance. MVP remains NO-GO.

Read builder handoff #6314362342 and independent FAIL #6313674964. No previous test processes were running when this review resumed; all newly started tests were collected before closeout. Candidate source was not edited. Temporary dependency links only, using installed pinned Firestore9.3.1, grpc-js1.14.6 and gax6.12.1; local Node24.19.0 differs from CI22.x.

## N-1: advancing empty pages

The unchanged external review probes were extracted from the posted FAIL, and their exact hashes verified: `empty-run.cjs` SHA256 `11147bfeabeede40fc1be7d176e1959acf93bb2a085872df63f25a335328cbde`; `r2-probes.cjs` SHA256 `b64017f2ad563e80aaaa6caa12c9ab351e6648e58a0fe12eee9061727fd3f784`.

Independently reproduced the old defect: e7fdff3 reaches objects behind 1/2 empty pages but not 3/5 within six runs; the latter alternate list-limit and list:no-progress. At 638631b all four cases reach the object: k=3 ends on invocation2; k=5 on invocation3. Prior Codex bounded PASS at e7 did not cover this long-empty-page regression; the independent FAIL is acknowledged and preserved, not retroactively passed.

New code falls back only for a repeated request/remembered token; advancing empties retain continuation. Persisted bounded token hashes detect short cycles across invocations; checkpoint/pass-end/fallback resets them. Fresh-token nonprogress is durably reported as list-stalled with rising failures and no false pass end. Focused assertions verify 3/5 legitimate empties, cycling-token recovery and fresh-token warnings. r2-probes independently verifies durable list-no-progress before fallback, then name-cursor recovery; Unicode limit1/budget-stop preserves both evidence records with zero media downloads/deletes. Initial repeated-token state has lastError=list-no-progress, consecutiveFailures=1, listQuery=null and lease=null; subsequent successful progress clears it.

Documented limitation: an endless stream of fresh tokens is observationally indistinguishable from legitimate empty pages. Cycles longer than the remembered16 tokens may remain stalled; they are visible, not counted as completed coverage. This limitation is explicit and acceptable for this bounded TEST_ONLY claim, not a claim of exhaustive coverage under an arbitrarily broken listing service.

## N-2: client attempts, server observations and deadlines

Inspected the pinned grpc-js implementation: callInvocationTransformer runs before the call starts; the recorder attaches a status listener and returns the original call properties without changing execution. Gax forwards the option. Tests require every recorded attempt to finalize, reconcile sent attempts with server counts, and allow unsent attempts only when status4 reports Waiting for LB pick. Hung reads/queries assert exactly15 client attempts; commits/rollbacks/transaction reads retain explicit retry bounds. Server cancellation timings and complete operation envelopes remain asserted.

The deterministic slow-first-TLS test passed locally: exactly15 client attempts, all DEADLINE_EXCEEDED; at least one unsent; fewer than15 server observations; every sent attempt cut within configured deadline+300ms; logical elapsed time within streamRead envelope. This directly demonstrates why a server-only count can undercount without invalidating the client retry upper bound. It supplies a sufficient mechanism consistent with historical 14/15; historical raw logs do not prove the exact cause of that old individual attempt, and this review does not claim forensic certainty.

The answered-call warm-up and 1000ms functional/Commit-test deadlines do not change application transport limits: production transport is byte-identical to e7fdff3. Hung-read tests retain200ms; Commit cuts/envelopes are checked against their actual1000ms test configuration. This avoids a precondition timeout preventing the intended Commit behavior from being exercised. Both emulator and TLS production-shaped paths were actually executed locally. These are loopback tests, not live Firestore/platform measurements; deadlines remain subject to host scheduling assumptions already stated in the transport design.

## Commands and outcomes

```
node --test --test-reporter=spec functions/test/lfs-reconcile.test.js functions/test/lfs-gate-firestore.test.js functions/test/lfs-gate-firestore-prod.test.js
npm --prefix functions run lint
node empty-run.cjs /workspace/coach-core-lfs-e7-review
node empty-run.cjs /workspace/coach-core-lfs-638-review
node r2-probes.cjs /workspace/coach-core-lfs-638-review
```

Local affected checks **83 passed / 0 failed / 0 skipped**, exit0, ~112s. Lint exit0. No unchanged full matrix or emulator suite repeated locally. Existing tests/assertions were not edited or weakened by the reviewer.

Read actual Actions job logs and metadata, not conclusions alone:

| Run | Event/checkout | Evidence |
|---|---|---|
|39588742194 attempt1|push; exact638631b|focused264/0/0; emulator46/0/0; deny6/0/0; frozen comparison success|
|39588742625 attempt1|push; exact638631b|functions745/0/0; rules68/0/0; S1emu36/0/0; web24 passed; bundle scan success|
|39588751228|pull_request; temporary merge d5cb3d5|focused264/0/0 independently read in job119184117512; not substituted for standalone-head evidence|

Selected checkout/count/proof extracts are retained alongside local logs and probe results. Cancelled E2E39588742185 is not acceptance evidence. Earlier failures (0c93, ff7, 1675 emulator45/1, e7 long-empty regression and merge3e271ff transport259/1) remain preserved; no green rerun erases them.

## Frozen surfaces and remaining prerequisites

Independent git diff --exit-code comparisons returned0 for S1/C1 handlers/cleanup/storage adapter/exports/original suites/workflow against7f3b757; r4 contract/fixtures/client/rules/config/decoder/package locks/workflow guards against6764af9; and transport, all.github files, functions package/lock againste7fdff3. Only the bounded reconciler repair, focused gate/test helpers and documentation differ from e7. L10 is unchanged from the previously reviewed meaningful assertions and exact-head CI46/0 supports it.

Nonblocking documentation nits sent directly to builder on #39 comment6315853164: gate-* table still says49 (new regression makes50), and historic-cause wording should distinguish reproduced mechanism from proof of the old run's exact cause. Coordination status: #39 comment6315826421. No builder response was available when review closed.

Pre-activation: resolve schema version/migration for required listStalls/stallTokens under film-reconcile.v1; production C1-D1 values/platform/IAM/bucket checks and I-6/I-9/I-10 remain separate. No real-GCS generation, noncurrent/soft-deleted enumeration, live scheduling, deployment or activation evidence is established. Separate Claude verdict is still required; this review does not speak for it. No source repair, merge, deployment, live settings, resource creation, spending or AI activation occurred.
