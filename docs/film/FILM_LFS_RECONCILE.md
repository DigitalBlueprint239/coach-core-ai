# LOST-FINALIZE-SOURCE — quarantine reconciler (TEST_ONLY)

**Authorization:** LFS-A (#39 c-6303891279). Scope: r2 c-6302707899 + r3 c-6303547094 + r3.1 c-6303586101 + r3.2 c-6303605492, consolidated by Codex in c-6303623216.
**Branch:** `claude/film-lfs-reconcile`, from the PASSed C1 head `7f3b757`.
**Implementer:** `session_018Dkini…`, who does not self-accept.
**Reviewers:** Codex and `session_01EUU9Xh8ytHDPZpzdekH5fT`.

**Not done / not authorized:**
- export, scheduling or activation of the sweep or the reconciler;
- platform retry; production constants; alert policies;
- live administration; bucket versioning, soft-delete or lifecycle work;
- live resources, real footage, spending, deploy, merge, AI.

These sit under C1-D1. MVP NO-GO.

## 1. What it does
A quarantine source can be left with no owner when its finalize event was lost before any decision. Causes include a configuration outage, an R3 transient read, instance loss, non-delivery, or an `ignored-bucket` during a wrong name. In that state there is no `filmCleanup` record, and lazy expiry frees the slot without a delete.

The reconciler lists live `quarantine/` objects in the configured default bucket. For each eligible object it builds a finalize event from **trusted listing metadata only** and re-presents it to the **unchanged** S1 `onQuarantineFinalized`.
- It makes **no decision of its own.**
- `handlers.js`, `cleanup.js`, `storage-adapter.js` and `index.js` are byte-unchanged.

**Product consequence (LFS-A):** a lost finalize for a still-live reservation is **recovered as intake** (`validating`). A lost finalize for a missing, expired or terminal reservation produces the same obligation a genuine late event would, through the accepted C1 machinery.

**Conditional claim:** this holds only once the slice is accepted *and* both the reconciler and the sweep are activated (C1-D1). Every **live** object under `quarantine/` in the configured bucket is then presented within one full pass after it is older than the minimum age. It ends in one of:
- intake;
- an S1 obligation, which then becomes deleted, `absent`, `mismatch`, `stuck` or `parked`;
- `duplicate-event`, where another owner holds it (S2b same generation, I-9);
- a bounded evidence entry for an operator.

**Not covered:**
- noncurrent or soft-deleted versions;
- foreign buckets;
- S2b same-generation ownership (I-9);
- S2b v2 documents, which need the r4 projection first (I-10).

Bucket versioning and soft-delete settings are a pre-activation check under C1-D1.

## 2. Transport boundary (acceptance item 1, the STOP gate): `functions/src/film/lfs-transport.js`
**The gate passed without changing frozen semantics.**

### Storage
The pinned `@google-cloud/storage` 8.4.0 request path (teeny-request 11.1.0 over node-fetch 3.3.2) has no abort hook and ignores `timeout` (reviewer LFS-10). So the **facade issues the three JSON-API requests itself:**
- list: `GET …/o?prefix&startOffset&maxResults`;
- ranged head read: `GET …/o/{name}?alt=media&generation=` with `Range`;
- generation-matched delete: `DELETE …/o/{name}?ifGenerationMatch=`.

Each call is **exactly one** `fetch`:
- no retry;
- an `AbortController` deadline owned by the facade (`storageRequestMs`, TEST 5 s, ≤ C1 `attemptBudgetMs`), which aborts the underlying request and its body;
- body caps: head = the range, list 1 MiB, delete 64 KiB.

It presents the `Bucket` / `File` surface that the frozen `readHead` and `deleteExactGeneration` call.

**Production auth:** a facade-owned, single-flight, cached metadata-server token provider, with an abort deadline on each request (`tokenRequestMs`, TEST 3 s). The emulator branch sends no credentials.

### Firestore
A dedicated pinned `@google-cloud/firestore` 9.3.1 client over gRPC.
- `clientConfig` sets a finite per-RPC deadline (`firestoreRpcMs`, TEST 2 s) and gax retry codes `none` for BatchGetDocuments, Commit, BeginTransaction, Rollback and RunQuery.
- Production auth comes from the bounded token provider.
- REST was rejected: the gax 6.12.1 fallback does not apply deadlines to server-streaming RPCs.

**Retry layers, measured on the real SDK (`FIRESTORE_LAYERS`):**

| Call | Attempts |
|---|---|
| Server-streaming read | `Firestore._retry` 5 × retry-request 9.1.0 (1 + 2) = **15** |
| Commit, hung (DEADLINE_EXCEEDED is not a commit retry code) | **1** |
| Commit, retryable error (e.g. UNAVAILABLE) | **≤ 5** |
| Rollback | runs **in the background after `runTransaction` rejects**, bounded by the unary envelope (disclosed post-return work) |
| Transaction | `maxAttempts` (db facade, TEST 1) × the above |

**Envelope** (`firestoreEnvelope(T)`, where C = T + 250 ms):
- `streamRead = 5·(3·C + 7998) + 12187.5`
- `unary = 5·C + 12187.5`
- `txAttempt(r) = r·streamRead + unary`

At T = 2 s this gives a stream read of about 86 s, a unary call of about 23 s, and a 3-read transaction attempt of about 281 s.

**Per object, worst case:** pre-read, verify, head (+ token), decision (3 reads), C1 admission, DELETE (+ token), C1 result, checkpoint. `RECONCILE_LIMITS.objectEnvelopeMs` ≈ **907 s**.
- **Admission reservation (PR87 F3):** `objectBudgetMs` defaults to the whole envelope (≈ 907 s). An object starts only if the remaining invocation budget covers it.
- **Invocation:** `invocationBudgetMs` = 1740 s and must be ≥ `objectBudgetMs` (enforced). The TEST trigger timeout is 1800 s; C1-D1 verifies the platform maximum.
- **Lease:** the envelope plus the SDK's background-rollback tail (≈ 23 s) plus a 60 s margin, ≈ **990 s**.
- The admission budget (`objectBudgetMs`) is **not a hard deadline.**
- **Local transport only:** an aborted DELETE or commit may still have taken effect remotely. That is the accepted C1 ambiguity; no rollback is claimed.

### Gate proofs (loopback; real pinned SDKs; every cut observed by the server)

| Suite | Count | What it proves |
|---|---|---|
| `lfs-gate-storage-https.test.js` | 5 | **Production branch on the default origins**, with no endpoint override: `https://storage.googleapis.com` and `http://metadata.google.internal`, reached through a controlled undici-dispatcher interceptor (a throwaway self-signed `storage.googleapis.com` certificate trusted only by that dispatcher). Origin, auth, range, generation and precondition are asserted. Hung list, head and DELETE are cut and the TLS close is server-observed; a hung metadata server is cut. |
| `lfs-gate-storage.test.js` | 35 | **Both branches:** hung list, head and DELETE are aborted at the deadline (socket close seen) with one request each; trickling and oversized heads are cut; short and slow-OK cases work; 404/412/5xx/429/408 give one request; the 20-digit generation stays a string; the frozen `readHead` / `deleteExactGeneration` work over the facade, and a hung DELETE is cut before the frozen race. **Production branch:** a hung metadata server is cut and no Storage request is sent. |
| `lfs-gate-firestore.test.js` (emulator branch) | 6 | 15 cut calls for a hung get and a hung query; hung Commit = 1 call, cut, with the background Rollback cut; UNAVAILABLE Commit ≤ 5; a hung transactional read with `maxAttempts` 2 ≤ 30 calls; all within the envelope. |
| `lfs-gate-firestore-prod.test.js` | 3 | TLS with the default `createSsl()` roots (a throwaway localhost certificate via `GRPC_DEFAULT_SSL_ROOTS_FILE_PATH`) and bounded-token call credentials; a hung read is cut; a hung metadata server is cut and no RPC is sent. |

## 3. State, progress and passes
`filmReconcile/quarantine` (strict `film-reconcile.v1`):
```
{project, bucket, prefix, policyRevision, passId, passStartedAtMs,
 afterName, listQuery{startOffset,pageToken}, passObjects, passEvidence,
 listStalls, lease{holder,fence,untilMs}, fence,
 lastError{code,atMs}, consecutiveFailures, previous{…}}
```
- **Binding:** project, bucket and policy (`lfs-r3.2`) are bound to the state. A change moves the old cursor into `previous` and starts a new pass.
- **Configuration missing:** no list call and no writes.
- **Target binding (PR87 F2):** if the facade's bucket differs from the configured bucket, the invocation fails closed (`targetMismatch`) **before any list or state write**. The bucket is pinned for the whole invocation, including the dedicated handler instance. A configuration change during a run stops it before the next object (`config-changed`), and records stay bound to the pinned bucket.
- **Progress:**
  - progress is keyed by object name: names at or before `afterName` are skipped, which covers the inclusive `startOffset` overlap and any re-fetched page;
  - **names are compared in the service order, UTF-8 bytes (`compareNames`, PR87 c-6312514310)**, the same order GCS uses for listing, `startOffset` and resume tokens. JavaScript's UTF-16 order differs above U+FFFF: with it, `quarantine/\u{10000}/…` sorted before `quarantine/\uE000/…` and was skipped forever. The JSON API returns well-formed UTF-8 names only;
  - **the list `nextPageToken` is authoritative (PR87 F1).** A short page is never treated as the end. `listQuery` stores the query of the page holding the next unprocessed object, and is persisted across invocations;
  - a fully processed page that has a token advances `listQuery` by that token, even when the page was empty or held only the overlap entry;
  - an invalid or expired token (400/410) clears `listQuery` with `lastError: page-token-invalid`, and the next run lists from `afterName`;
  - **non-advancing continuation (PR87 R-1):** a token page that yields no name past `afterName` is a stall, counted in `listStalls` (persisted; reset by any checkpoint or pass end). If the returned token equals the request token, or stalls reach `listStallMax` (3), the run records a fenced `lastError: list-no-progress`, increments `consecutiveFailures`, clears `listQuery` (so the next run lists from `afterName`) and stops with `list:no-progress`. A legitimate empty page with an advancing token is followed;
  - list size is `min(pageMax, remaining + 1)`; at most 2 lists and ≤ 100 objects per invocation;
  - a **fenced checkpoint per object** (and its evidence) is written in the same transaction.
- **Pass end:** only when a page has **no** continuation token **and** has been fully processed.
- **Lease:**
  - acquire, or take over after expiry with a higher fence;
  - a **fresh verify and renew immediately before every re-drive**, including the first;
  - fenced checkpoint, evidence and error writes; release at the end.
- **Ambiguous acquire (PR87 F4):** an acquire may commit remotely yet return DEADLINE locally. A best-effort release-if-mine (the holder is unique per invocation) then clears the lease. If that also fails, the orphaned lease is bounded by its expiry.
- **Reported leftovers (PR87 R-2):** a lease can outlive an invocation only after an `acquireError`, a `state:<code>` stop, or a `releaseError` (reported when both the fenced release and release-if-mine fail). The emulator test fails on any other leftover lease and resolves an explained one by expiry.
- **Contention:** contention or a transport failure in the acquire, verify, checkpoint or release transaction ends the invocation **bounded and without throwing** (`acquireError` or `stoppedFor: state:<code>`). This was observed on the real emulator, whose pessimistic locks make a contending reconciler hit its 2 s RPC deadline. The object is presented again on the next run.
- **Authority:** the lease covers discovery, checkpoint, evidence and errors only. An already-started stale re-drive finishes as a duplicate delivery and never writes reconciliation state.
- **Evidence:** `filmReconcile/quarantine/evidence/{sha256(project\nbucket\npolicy\nname\ngeneration)}`, a fixed field set. A repeat updates `count`, `lastAtMs` and `lastPassId`. There is no per-pass cap, and aggregate cardinality is **not globally bounded** (operator retention is C1-D1).
- **Fail closed:** listing metadata is refused with evidence when the name is non-canonical, the generation is not a decimal string, the size is not a decimal in `1..maxBytes`, the content type is missing or unsupported, or `timeCreated` is invalid or too far in the future.
- **Film validation:** the frozen v1 `FilmState` plus identity, expiry and generation checks. It runs as a pre-read **and** at every transactional read of a film document, retries included (`createDbFacade`). An ambiguous document produces evidence and no decision.
- **Coverage:** with a finite, quiescent N and at least one completed object per progress-making invocation, a pass needs at most N such invocations plus the pass-end listing. There is no bound under persistent failures, repeated lease loss or unlimited arrivals.

## 4. Cost (per invocation; constants are TEST placeholders)
- **List requests:** ≤ 2 per invocation, each with `maxResults` ≤ 101 (the `startOffset` overlap counts as 1). GCS may return short or empty pages with a token; each one still costs a request and advances the token. A late page after the budget is discarded with no progress. Each pass ends with one list response that has no token.
- **Per object:**
  - pre-read: 1 document read;
  - verify: 1 transaction, 1 read and 1 write;
  - head: 1 GET of ≤ 1 KiB, plus at most one cached token request;
  - frozen decision: 1 transaction (≤ 3 reads, ≤ 4 writes);
  - only if an obligation is newly created: ≤ 1 C1 attempt (2 transactions + 1 DELETE);
  - checkpoint: 1 transaction (1–2 reads, 1–2 writes).
  - On failure, Firestore retries multiply these as in §2.

| N live objects per pass | List requests | Object steps |
|---|---|---|
| 100 | ≈ 2 | ≈ 100 × the per-object steps |
| 1,000 | ≈ 11 | ≈ 1,000 × |
| 10,000 | ≈ 101 | ≈ 10,000 × |

N is **not** bounded by the 20-film active cap, because orphans accumulate across teams. **No spending is authorized.**

## 5. Operator tool (emulator-only): `functions/scripts/film-cleanup-admin.js`
- **Environment check:** every command refuses unless the project is `demo-*` **and** `FIRESTORE_EMULATOR_HOST` is set.
- **Read-only commands:** `list-parked`, `list-stuck`, `list-evidence` (bounded output).
- **`unpark --id --expect-parked-at --reason --bucket`** is one transaction:
  - CAS on `parked.atMs`;
  - pending only, with no live lease;
  - audit index count < 8; otherwise refused, never truncated;
  - reconstruct the candidate (drop `parked`, restore `sweepDueAtMs = max(original, now)`);
  - validate the complete candidate with the frozen `recordProblem`;
  - write the record, plus `filmCleanupAudit/{id}/events/{n}` containing the verbatim `parked`.
- **No automatic unpark.** A record that becomes invalid again is re-parked by the C1 admission.

## 6. Runbook and alert conditions (documented only; creating alert policies is C1-D1)
**Alert on:**
- `film.cleanup.record_invalid` with parking;
- `film.finalize` `ignored-bucket`;
- `film.cleanup.config_missing`;
- `film.reconcile.config_missing`;
- `stuck` records;
- reconciler `consecutiveFailures ≥ 3`;
- evidence with `count ≥ 3`.

**Default-bucket change:**
1. Stop the reconciler and the sweep (C1-D1 switch).
2. Records bound to the old bucket park as `bucket-mismatch`.
3. Decide per record: delete in the old bucket under a separate authorization, or unpark if the configuration was transient.
4. Restart. The reconciler starts a new pass and keeps `previous`.

## 7. Tests (L1–L19)

| File | Count | Covers |
|---|---|---|
| `lfs-reconcile.test.js` | 70 | L1–L8, L10, L14, L16–L19, plus PR87 F1–F4, UTF-8 order, R-1 and R-2 regressions |
| `lfs-reconcile-loopback.test.js` | 7 | L9 and L15 at reconciler level, real-facade pagination, UTF-8 order with tokens and partial budgets |
| `lfs-boundary.test.js` | 15 | L11, L12 |
| `lfs-gate-*` | 49 | L9, L15, L16 transport proofs |
| `emulator/lfs-reconcile.emulator.test.js` | 5 | L13: real Firestore emulator with the bounded client; operator CLI |
| `tests/rules/film-reconcile.rules.test.mjs` | 3 | additive denies |

The PR86 pinned "known gap" test is unchanged; it describes S1 without a reconciler.

**Limits:**
- The Storage emulator ignores generations, so listing and objects use doubles plus the loopback facade.
- No real GCP endpoint was exercised.
- The emulator doesn't enforce indexes.

## 8. Integration prerequisites
- **I-6:** S2b harnesses must pass `bucket` in finalize events.
- **I-9:** a named, tested owner for S2b same-generation recovery failures.
- **I-10:** the r4 `FilmDocument` projection must be used for pre-validation, so S2b v2 documents don't become evidence noise.
