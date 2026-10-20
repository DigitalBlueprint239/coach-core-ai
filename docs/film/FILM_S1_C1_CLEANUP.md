# FILM-S1-C1 — durable, generation-safe quarantine cleanup (TEST_ONLY)

**Scope:** proposal r3 (#39 c-6299776477) with Codex's normative T7-0 clarification (c-6299971919), under owner authorization C1-A (c-6300236512). Branch `claude/film-s1-cleanup-repair` from r4 `6764af9`. Implementer `session_018Dkini…` (does not self-accept). Reviewers: Codex and `session_01EUU9Xh8ytHDPZpzdekH5fT`.

**Not in scope / not done:** sweep export, scheduling or activation, platform retry, merge, deploy, staging or live resources, real footage, publication, spending, AI. **C1-D1 stays open** (production retry, budget and cap values, index re-verification, sweep activation) before real footage. MVP NO-GO.

## 1. Files
| File | Change |
|---|---|
| `functions/src/film/cleanup.js` | **New.** Strict record schema + binding, `obligate` (create-or-read in the caller's transaction), `admitAttempt`, `recordResult` (C8 predicate), `deleteExactGeneration`, `noRetryBucketFor`, bounded `retryPendingFilmCleanups`, unexported `defineCleanupSweepTrigger`, `testOnlyExportProblem`. |
| `functions/src/film/handlers.js` | Obligation on abandon and on **every** finalize `deleteAfter` branch, inside the existing transaction and before its writes; awaited immediate attempt; abandon-replay attempt; old swallow-all `deleteGeneration` removed. Outcome labels, responses, receipts, film state machine and slot handling unchanged. |
| `functions/index.js` | Injection only: `cleanupBucketName`, `cleanupBucket` (no-retry client). **No new export.** |
| `functions/scripts/film-terms-guard.js` | Additive block: deploy blocked (also with `--check`, regardless of terms) if `index.js` references the sweep **or** any **loaded** export carries the TEST_ONLY marker; failing to load the exports also blocks. |
| `functions/test/film-s1-cleanup.test.js`, `functions/test/film-cleanup-doubles.js` | **New.** T1–T12 on doubles (in-memory Firestore with optimistic transactions; bucket double with real generation semantics). |
| `functions/test/emulator/film-s1-cleanup.emulator.test.js` | **New.** T11b (real Firestore query semantics), T1/T2/T7-0 on real transactions. |
| `functions/test/emulator/film-s1.emulator.test.js` | **Harness wiring only** (no assertion changed): inject the two cleanup deps, include `bucket` in finalize events, clear `filmCleanup`, give the in-memory GCS double the `file().delete({ifGenerationMatch})` shape. |
| `tests/rules/film-cleanup.rules.test.mjs` | **New.** Additive deny tests; `firestore.rules` unchanged. |
| `.github/workflows/film-s1-c1-cleanup.yml` | **New.** Frozen-surface diff vs `6764af9`, focused unit tests + lint, C1 + affected S1 emulator suites, rules deny. Existing workflows unchanged. |

## 2. Record and mechanism (as r3 §2)
- `filmCleanup/{sha256(bucket\nname\ngeneration)}`; bound fields `bucket` (configured default bucket), `name` (canonical `quarantine/{team}/{film}/source.mp4`), `generation` (decimal string `/^[1-9][0-9]{0,19}$/`), `teamId`/`filmId` (must equal the name's), `origin`, `createdAtMs`.
- New records: `pending`, `attempts:0`, `fence:0`, `lease:null`, `history:[]`, `nextAttemptAtMs = sweepDueAtMs = createdAtMs`. Existing records are never rewritten by create-or-read.
- Validation on every read (schema + binding + consistency: `fence == attempts == history.length`, open entry ⇔ lease, pending ⇔ numeric due, terminal ⇒ null due). Invalid → no Storage call, no mutation, `film.cleanup.record_invalid`.
- `admitAttempt` (no I/O): terminal → no-op; live lease → skip; expired lease → close `unknown`; `attempts ≥ 8` → `stuck`; not due → not-due; else admit with `sweepDueAtMs = max(lease.untilMs, nextAttemptAtMs)`.
- `recordResult`: only `pending` + same holder + same fence (lease and record) + open last entry; otherwise a logged no-op.
- Delete: `bucket.file(name).delete({ifGenerationMatch})` on a client with `autoRetry:false`, raced against `attemptBudgetMs`. 404 → `absent`, 412 → `mismatch` (no claim about what exists), success → `deleted`, else `error` + code.
- Entry points: immediate (abandon: one admission; finalize: only when this invocation created the record), abandon replay (exact id from the film's recorded source; zero or one attempt), sweep (one query `where sweepDueAtMs <= now orderBy sweepDueAtMs limit n`, sequential, invocation budget).
- Constants `CLEANUP_LIMITS` are **TEST placeholders** (C1-D1): 8 attempts, backoff 60 s × 2^(n-1) capped at 6 h, attempt 10 s, lease margin 5 s, batch 25, invocation 60 s.

## 3. Implementation choices for reviewer attention
1. **No-retry client:** a new client of the same SDK class as the admin bucket (`bucket.storage.constructor`), `retryOptions.autoRetry=false`, application-default credentials (the Functions runtime). The shared admin client is not mutated (tested).
2. **`retry:false` for a scheduled definition** is expressed as `retryCount: 0` (`scheduleTrigger.retryConfig.retryCount`). The schedule string is a placeholder; the definition is never exported.
3. **Missing bucket configuration** at obligation time logs `film.cleanup.config_missing` and creates **no** record (no delete is attempted, the outcome is unchanged). `index.js` always injects it; flagged because it is a configuration-error path, not a storage-error path.
4. Abandon's immediate attempt goes through admission whether the record was created or already existed; a duplicate finalize never attempts.

## 4. Test map (r3 §4)
T1, T2 (+ timeout), T3, T4, T5, T6, T7-0 (abandon and four finalize origins; abandon replay eligible/not eligible per the clarification), T7a, T7b, T8 (all ten labels, forced transaction retry, duplicate), T9 (bucket, names, generation forms, 20-digit generation, exact options, nine invalid-record shapes, id mismatch, no-retry client), T10a–T10i, T11a, T11b (emulator), T12 (loaded exports, trigger retry 0 / default-OFF, guard sandbox with named, disguised and unloadable exports; rules deny file).

## 5. Verification limits
- The Firestore/Storage emulators cannot be downloaded in the implementer's sandbox (proxy); emulator suites run only in CI.
- The Storage emulator ignores generations and preconditions: 404/412 and generation semantics are proven on doubles; the emulator proves Firestore transactions and query semantics only.
- The emulator does not enforce indexes: the single-field index claim is static (C1-D1).
- No real Cloud Storage, no staging, no live project.
