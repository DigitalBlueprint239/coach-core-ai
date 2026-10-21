# PR88 independent review at C

**Non-D8 bounded verdict: FAIL** at `c413019303f5fb7aa2039259ff1cd0b72a273484`, base A7 `638631b939d60f22030291897d517f607404442d`. Two acceptance-test defects remain. No confirmed new runtime product defect was found in this review. **D8 author validation: PASS**, not independent D8 acceptance. MVP remains NO-GO.

Reviewed handoff PR88 #6326383757, r3/r3.1/r3.2/r3.3 scope and owner records. Read candidate source, new compatibility/guard/listing tests and workflow. Review-only detached worktree; no candidate edits. Evidence branch contains documentation/probes only.

## Blocking non-D8 findings

### R88-1: post-call no-write snapshot cannot detect error-path mutation

In `functions/test/film-int-compat.test.js`, CT-4.5 ready/rejected abandon first calls `await w.abandon(...)`, then in its invalid-state branch takes `const snap = snapshot(w,f)` and immediately compares the same snapshot. It never compares the film/job state to the pre-call state. Slot comparison remains meaningful, but the claimed film/job no-write check is vacuous.

Executable reproduction, without modifying candidate files:

```
node --require /path/to/mutate-invalid-state.cjs --test --test-reporter=spec functions/test/film-int-compat.test.js
```

The preload wrapper calls the real frozen handler and then deliberately changes `fileName` on ready/rejected films after an invalid-state result. Both mutations are observed, yet **36 passed / 0 failed / 0 skipped**, exit0. Retained mutation log and preload are included. This is a test-reliability defect, not a claim that the actual frozen handler performs those writes.

Minimum correction: snapshot film+job before invoking abandon, assert it unchanged on the invalid-state branch, and retain meaningful slot/obligation checks. The same mutation must then fail. Only new D7 tests need change; no accepted assertion or frozen source needs repair.

### R88-2: I-9 class(d) composed reconciler acceptance case is absent

Agreed r3 I-9/CT-4.4 requires no-decision/no-write/no-delete/no-evidence behavior for every class(a)-(d). Current CT-4.4 contains(a),(b),(c) only. Class(d), ready/rejected with no quarantine cleanup intent, is exercised by hand-seeded listing classification, not the combined reconciler world. Thus the listing test cannot establish the promised same-generation source/job behavior.

Minimum correction: add the planned new-D7 composed case with an r4-valid worker document and a same-generation source present but no quarantine cleanup intent. Assert duplicate-event, no S1 record/delete/evidence and unchanged job/source for the claimed ready/rejected variants. Treat this as an anomalous stored-state visibility fixture; invent no new durable field or authority.

Both findings were sent directly to builder on #39 comment6326521054. A repaired head needs a new source-pinned verdict; green C counts do not close these gaps.

## Accepted-file and ownership preservation

C contains exact A4 `19cca9848a2ace52f4f56153f6585259b4a76f90`, A5 `da13f834676d778953a403dfad75a7f1cc955ffc`, A7 and K `c1c57e5422dc3f96e0d96af2080f3d0d46e2cbc0` as ancestors. C and K have identical tree `2108b71e4564aaa95b95e98d236b278b91480236`; D8 is unedited.

The owner-map checker reports0 problems. An independent git tree **mode and blob** comparison using an explicit31-path approved exception set also found0 unexpected changes: A4 22 paths, A5 23, A7 1311. Frozen handlers, cleanup, storage adapter, exports, contracts, worker, transport, fixtures, decoder, rules/config, manifests/locks and legacy workflows remain at their assigned accepted SHAs.

Read each exception diff. D1 is the worker-first guard union, retaining the A7 C1/LFS block; D3 changes only dependencies/events and the r3.2 sandbox/import setup; r3.3 changes only its authorized ready fixture. AST comparison independently confirms assertion/test membership preservation for all eight D3 files plus r3.3, normalizing only the specifically permitted event.bucket addition. The checker’s line comparison is supplemented by that AST/diff review; it is not claimed as a general tamper-proof enforcement system.

D4 validates the entire timestamp-projected stored document with the accepted r4 reader, retaining identity/path/expiry/generation checks and old malformed-record cases. Decoded the retained original baseline from FILM_INTEGRATION.md: **9164 bytes**, SHA256 **9b9c428381542f333e82a613bfa02bbd1af3620d131f270badb61ec0322fedfa**, matching the handoff; it records1 pass/10 failures. This closes the previous original-baseline access gap. Prior STOP failures remain disclosed, not erased.

## Local checks on C

Node24.19.0 and existing installed dependencies; CI uses Node22.x. Temporary dependency links were removed at closeout.

```
node --test --test-reporter=spec functions/test/film-int-compat.test.js functions/test/film-int-guard.test.js functions/test/film-int-listing.test.js functions/test/lfs-reconcile.test.js
CI=true node_modules/.bin/react-scripts test --watchAll=false --runInBand --runTestsByPath src/features/film-analyzer/__tests__/film-int-compat.test.ts
node_modules/.bin/tsc --noEmit
npm --prefix functions run lint
node functions/scripts/film-int-frozen-check.js
```

Ordinary affected non-D8 checks: **121/0/0**, exit0. D8: **112/0/0**, exit0 (**author validation only**); TypeScript0, lint0, frozen checker0. Fault-injected36/0/0 is an intentionally demonstrated false PASS, not extra acceptance credit. No unchanged core/browser matrix rerun; emulator and pinned-decoder runtime evidence below is Actions evidence rather than a local rerun.

## Literal-head CI and actual downloaded decoder

Read actual logs and metadata; runs are push events, attempt1, exact C checkout:

| Run | Verified results |
|---|---|
|39673473437 INT-A|6 successful jobs; focused48/0/0; S1/C1/contracts531/0/0; S2b106/0/0; LFS145/0/0; Functions899/0/0; client546 passed; TypeScript0; owner-map0; S2a47/0/0; S2b pinned41/0/0; emulator49/0/0 and5/0/0; film rules29/0/0|
|39673473514 Security|Functions899/0/0; rules68/0/0; film emulator36/0/0; web24 passed; bundle scan success|

Downloaded **new artifact12379134568**, `int-decoder-39673473437`. ZIP SHA256 **b771adef0ce03e74e87a9e1d396231925818a0668f6ae7ddd9e8e599d2c99ded** matches GitHub artifact metadata. Exactly two members, ffmpeg and ffprobe. Their SHA256 values match unchanged SOURCE.json:

- ffmpeg `1314ab3b558c48ce7ed4aa6efba5a68fefe30362f796e59ef017b17424436ff1`
- ffprobe `fd43ef9be4bb7d7fc821e1b25950efc6eb0aac586cabacd34a38fd52299f48e6`

No ZIP-content access gap for this artifact. Signed download URLs are not retained. The binaries are not republished with this evidence. This validates retained bytes, not deployment or a rerun on production hardware.

## Disclosed legacy failures, accurately separated

PR runs39674170823 (LFS) and39674170876 (C1) actually check out temporary merge **0fec201**, not literal C. Each has only its frozen job fail. Logs show the failing diff compares the A4/D8 client paths to r4 base6764af9, from before those accepted additions. The listed changes are exactly contracts-v2.ts, contracts-v2.test.ts and film-int-compat.test.ts. Their worker-absence assertion would also fail on A5 composition; it is independently reproduced locally, though errexit stops the observed job at the earlier client diff.

Their real test jobs pass: LFS264/0/0, emulator46/0/0, rules6/0/0; C1 119/0/0, emulator41/0/0, rules3/0/0. These are legacy workflow assumptions incompatible with composition, not unexpected edits to frozen accepted implementation. Preserve the failures; do not relabel them green, change their frozen files or infer branch-protection enforcement. Git exit128 submodule cleanup and Node20-deprecation warnings are separate from test failures. Cancelled E2E39673473461 is not acceptance.

## Limits and next step

Builder may repair only the new D7 gaps within existing scope and provide a new exact head with affected proof. D8 requires the non-author reviewer’s independent acceptance. Worker indirect-export I-4 remains open by agreement; TEST_ONLY/default OFF/unexported/retry-off remains in force. C1-D1 migration/calibration/IAM/platform/bucket checks, INT-B cutover, real-GCS generations, real trigger delivery, recovery actions, promotion to recovery/protection settings, staging/devices/deployment and founder release decision are not established. No merge, activation, deployment, live resource/config changes or spending occurred. MVP NO-GO.
