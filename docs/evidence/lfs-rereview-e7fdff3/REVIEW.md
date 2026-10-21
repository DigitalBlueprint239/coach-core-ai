# Independent bounded PR87 re-review

Verdict: **PASS for the requested cursor, stalled-listing and L10 repairs**, pinned to `e7fdff33b38f4e9bae7a0276ff25fed6a8881040`. This is not full integration, transport-platform or activation acceptance. MVP remains NO-GO.

## Source and reproductions

Reviewed handoff #6313320662 and diff from prior FAIL `ff7ec5755e57d5088d4c1d0e2c3e6bd00956a649`. Previous FAILs remain recorded at evidence commits `d079710137ec4ee97402e3f3ad3b91db1835316e` and `a98e35bd1a6b84b9f9fe56b3920ba94ecbde3a7f`; they are not retroactively passed.

`functions/src/film/reconcile.js` now compares UTF-8 bytes for cursor exclusion. Unit and real-SDK loopback assertions check both U+E000 and U+10000 evidence across token pagination, limit=1 and invocation-budget stops, and assert zero media reads/deletes. The unchanged original Unicode probe now records both objects on each of three passes. Its old hardcoded field named `missing` is a target label, not a computed finding: the evidence array includes that name. Original short-page and bucket-binding reproductions also rerun unchanged and recover all three names / reject the wrong bucket.

Repeated tokens and bounded fresh-token stalls now transactionally persist `list-no-progress`, increment failures, clear continuation and resume from the durable name cursor. Advancing legitimate empty pages remain supported. State-write failures report state errors; no guarantee is made that an unavailable database can persist evidence. New tests assert durable error state before recovery and separately prove the legitimate-empty case.

L10 replaces the tautology with exactly one classified result per invocation, at most one processor, at most one initial delete, and an explicit error requirement before allowing a leftover lease. Recovery must clear the lease, delete exactly once, and retain exactly one deleted obligation. Deterministic release fault tests distinguish an unrecoverable release failure from a successful release-if-mine fallback. The absent-state guard supports both acquires failing before commit; it does not waive the final recovery assertions.

## Local validation

Node 24.19.0; candidate source unchanged. Commands:

```
cd functions
node --test --test-reporter=spec test/lfs-reconcile.test.js test/lfs-reconcile-loopback.test.js test/lfs-boundary.test.js
npm run lint
cd ..
npx --prefix tests/rules firebase emulators:exec --project demo-coach-core-beta --only firestore,storage "node --test --test-concurrency=1 --test-reporter=spec functions/test/emulator/lfs-reconcile.emulator.test.js functions/test/emulator/film-s1-cleanup.emulator.test.js functions/test/emulator/film-s1.emulator.test.js"
node /workspace/scratch/lfs-ff7/utf8-probe.cjs /workspace/coach-core-lfs-e7-review
node /workspace/scratch/lfs-review/repro.cjs /workspace/coach-core-lfs-e7-review
```

Affected selection: **92 passed, 0 failed, 0 skipped, exit 0**. Emulator: **46/0/0, exit 0**. Lint exit 0. Temporary dependency links use existing installed dependencies; initial commands ran before the links were correct and failed module resolution. Both setup failures are retained separately and are not counted as executed product tests. No unchanged core matrix rerun.

Frozen S1/C1 handlers, cleanup, storage adapter, exports and original tests remain byte-identical to `7f3b757b1e260105ac85f825bdbbfcbdb4110ae6`. r4 contract/fixtures/client/rules/config/decoder/package locks and workflow guards remain identical to `6764af9edd7ab258f55c4eeb19e80a4649b8c86b`. Transport and all `.github` files are unchanged from ff7ec57. These independent `git diff --exit-code` comparisons returned 0. No frozen semantics or activation surface changed.

## Actions evidence and preserved failure

Read actual job logs, not only green conclusions. Push run **39581459566**, attempt 1, checked out exact e7fdff33: focused **260/0/0**, emulator **46/0/0**, deny rules **6/0/0**, frozen comparison success. Push **39581459466**, attempt 1, exact head: rules **68/0/0**, S1 emulator **36/0/0**, functions/mock AI **741/0/0**, web **24 passed**, bundle scan success. CI Node differs from local (22.x versus 24.19.0). Selected log extracts are retained; original Actions logs remain the source.

Do not conflate PR metadata head with checkout: PR run **39581464447** actually checked out temporary merge **3e271ff** (e7fdff33 into 7f3b757). It failed the unchanged production-Firestore hung-read transport gate at `test/lfs-gate-firestore-prod.test.js:98`: observed **14**, expected **15** requests; 259 passed / 1 failed / 0 skipped. This is preserved as an unresolved transport/reliability observation, not explained away as scheduling without evidence. Builder asked directly on #39 comment 6313518734. PR run 39581464339 is a separate successful merge-context security run; cancelled E2E push 39581459664 is not acceptance evidence. No full matrix claim.

## Limitations / prerequisites

This bounded PASS closes the specified repair findings. The merge-context request-count failure still needs a bounded independent diagnosis before claiming all transport/integration gates satisfied. No real GCS generation semantics, noncurrent/soft-deleted enumeration, production IAM/bucket/platform timeout or deployment behavior was verified here. TEST_ONLY, unexported, default OFF and retry=0 remain required; C1-D1 production decisions and I-6/I-9/I-10 integration gates remain separate. This review does not substitute for Claude's separate independent verdict or claim both reviews PASS. No candidate repair, merge, deployment, live settings, recovery action, spending or AI activation occurred.
