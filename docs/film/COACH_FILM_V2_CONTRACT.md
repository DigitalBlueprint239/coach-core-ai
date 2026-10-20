# coach-film.v2 — FILM-S2b wire contract (revision r4)

> **CONTRACT AUTHORING ONLY. Not agreed until Codex records `AGREE r4 @ <exact SHA>`.** Authorized 2026-10-20 by Coach Drew (#39 c-6291585020) under scope A1 (#39 c-6291542143).
>
> This slice is **additive**. The accepted v1 contract — `functions/src/film/contract.js`, `docs/film/COACH_FILM_V1_CONTRACT.md` and the 86 fixtures in `tests/fixtures/coach-film.v1/` — is byte-unchanged. No handler, trigger, rule or index export uses v2. **Excluded:** worker or trigger code, handler cutover, calibration, merge, deployment, publication, spending and AI. Limits stay **PENDING_D3 test placeholders**, and platform retry stays **OFF**. **MVP NO-GO.**

**Authority order:**
1. `functions/src/film/contract-v2.js` and `functions/src/film/legacy-r3.js` (executable)
2. `tests/fixtures/coach-film.v2/` (validated by `functions/test/film-contract-v2.test.js` and `film-legacy-r3.test.js`)
3. this document
4. the generated `contract.schema.json`

## 1. What changes from v1

| Area | v1 (r3) | v2 (r4) |
|---|---|---|
| Request `schemaVersion` | `"coach-film.v1"` | `"coach-film.v2"`. Actions, payloads (and so canonical payload identity) and idempotency are **unchanged** |
| `FilmState` | 16 keys | Same 16 keys, then **`readyAt`, `normalizedGeneration`, `media`, `retentionExpiresAt`**. All four are always present on the wire and `null` unless `status == "ready"`; `retentionExpiresAt` is **always `null`** in r4 (D4 pending) |
| Reserve `data.expiresAt` | Reservation expiry | **Unchanged.** Still the reservation expiry; `FilmState` has no `expiresAt` |
| Rejection reasons | `size-mismatch`, `content-type-mismatch`, `signature-invalid` | The same three (S1 intake), **plus** the worker reasons in §3 |
| Error reasons | v1 table | v1 table **plus** `invalid-argument / unsupported-version` and `failed-precondition / legacy-record-invalid`. Both are non-retryable; only `unavailable` is retryable |
| Invariants | P1, S1, S2, G1, G2, T1–T7, R1–R4, A1–A4 | All of them, with **T6 → T6′**, plus **R5–R9** (§4) |
| Stored documents | — | `FilmDocument` reader: the four new keys may be **absent** (read as `null`) for non-`ready` statuses only. It is never used for callable responses |

## 2. `media` (normalized-output facts; strict)

```
{ bytes: int ≥ 1, durationMs: int ≥ 1, width: int ≥ 2, height: int ≥ 2,
  videoCodec: "h264", audioCodec: "aac" | null, frameRateMode: "cfr" | "vfr",
  sha256: 64 lowercase hex }
```

## 3. Worker rejection reasons (closed set)

| Reason | Meaning |
|---|---|
| `container-invalid` | Structural box-size check failed, including oversized declarations. Example: s11a, which the pinned decoder accepts with probe 0 and decode 0 |
| `metadata-invalid` | A probe value is missing, NaN or non-positive |
| `video-stream-missing` | No video stream |
| `video-codec-not-allowed` | Video codec is not H.264 |
| `audio-codec-not-allowed` | Audio codec is not AAC |
| `stream-count-exceeded` | More than one video stream, more than one audio stream, or more than two streams in total |
| `duration-over-limit` | Duration over the limit |
| `resolution-over-limit` | Width **or** height over the limit |
| `media-corrupt` | The strict full decode (`-xerror`) reported an error |
| `output-invalid` | The normalized output failed independent validation |
| `processing-limit-exceeded` | Only under the attempt policy (§6) |

## 4. Invariants

- **R5:** `readyAt`, `normalizedGeneration` and `media` are non-null ⇔ `status == "ready"`.
- **R6:** `ready` ⇒ `readyAt == statusChangedAt`.
- **R7:** `retentionExpiresAt == null` (all statuses, r4).
- **R8:** `ready` ⇒ `objectGeneration != null`.
- **R9:** `media.bytes ≤ maxBytes`, `durationMs ≤ maxDurationMs`, `width ≤ maxWidth`, `height ≤ maxHeight`. These are PENDING_D3 placeholders; exactly at the limit is accepted.
- **T6′:** `statusChangedAt < reservationExpiresAt` is required for `validating`, and for `rejected` **with an S1 intake reason** only.
  - A worker rejection, or `ready`, may come later. They need only T3: `createdAt ≤ statusChangedAt`.
- **Unchanged from v1:**
  - The P, S, G and T rules are restated in v2, because v1 does not export them; fixtures prove parity.
  - R1–R4 and A1–A4 are unchanged.
  - The UTF-16 file-name bound and canonical form are reused from v1 field definitions.

## 5. Stored r3 receipts and v2 replay (A1 R3)

**Identity.** The (uid, operationId) lookup is done by the caller. The record is compared by **action** and **canonical payload hash**; the envelope version is excluded.

`decideReplay` (pure) gives:

| Request | Stored operation | Result |
|---|---|---|
| v2, same action and payload | r3 success receipt, unexpired | **Projection** (below) |
| v1, same action and payload | r3 success receipt, unexpired | The **original v1 receipt, verbatim** (byte-equal string) |
| v2 | v2 receipt (`schemaVersion: "coach-film.v2"` on the stored record) | The stored v2 receipt |
| v1 | v2 receipt | `invalid-argument / unsupported-version`. No v1 shape is invented for a v2 receipt |
| either version, changed payload or action | any | `conflict / operation-id-reused` |
| either version, `now ≥` the **original** `replayableUntil` | any | `failed-precondition / operation-expired`. The version never renews the window |
| v1, no stored operation | — | `invalid-argument / unsupported-version` (**future cutover only**) |
| v2, no stored operation | — | new operation (normal handling) |
| unknown version | — | `invalid-argument / schema-invalid` |
| v2 | unparseable by the **pinned v1 schema**, unknown fields, an error receipt, or an impossible legacy `ready` | `failed-precondition / legacy-record-invalid` |

**Projection** (`projectR3SuccessToV2`):
1. Parse the stored string with the strict v1 schema.
2. Require the supported receipt state: reserve → `reserved`, abandon → `abandoned`.
3. Deep-copy it, then add the four new keys to `data.film` as `null`, after `abandonedAt`.

Every other value, ID and timestamp is kept, including `data.expiresAt` (the reservation expiry). The stored record is never modified. The result is the **historical** receipt. It is never current state, never renewed permission to upload, and never a new film or slot. No version field is added to responses.

**Worked example.** The stored receipt is the v1 golden `reserve.response.ok.json` (operation O, recorded 2026-10-19T21:00:00.000Z).

| Request | Result | Fixture |
|---|---|---|
| v2 operation O at +1 h | `v2-replay.expected.reserve-projection.json`: identical, plus four `null` keys | `v2-replay-r3-reserve-receipt` |
| v2 operation O after the live film became `ready` | The same historical projection | `v2-replay-r3-live-film-now-ready` |
| v1 operation O | The stored bytes | `v2-replay-v1-same-operation-verbatim` |
| `declaredBytes` 48211955 | `conflict` | `v2-replay-r3-changed-payload` |
| At +24 h | `operation-expired` | `v2-replay-r3-at-expiry` |
| At +24 h − 1 ms | The projection | `v2-replay-r3-just-before-expiry` |

**Stored film documents.** `FilmDocument` reads an r3 document with the four keys absent, for non-`ready` statuses only. A `ready` document without them is invalid: no media is invented. Documents are never rewritten in this slice.

**Accepted v1 handlers are unchanged.** They still accept v1 requests and replay v1 receipts; nothing above is wired.

## 6. Worker attempt policy (A1 R1) — design of record, data and pure helpers only

`WORKER_ATTEMPT_POLICY = {status: "TEST_ONLY", maxAdmittedAttempts: 3, admissionHorizonMs: 21600000, platformRetry: false}`

**`admissionDecision`:**
- **Admission:** one cumulative ceiling of **3 admitted attempts, including the first**. An attempt is consumed when it is admitted, so a crash after admission still consumes it.
- **Not counted:** duplicate deliveries and lease contention never admit and never consume.
- **Configuration preflight failure** (decoder digest, limits) → `stalled-configuration`, with nothing consumed.
- **Six-hour horizon:** no admission at or after job creation + 6 h.
- **Platform retry is OFF.** Further attempts come only from an explicit synthetic redrive.

**`exhaustionOutcome`:**
- A media verdict rejects at once with its reason.
- **`processing-limit-exceeded`** applies only when the **final** attempt **and** at least one earlier attempt ended in a classified own-limit kill on the **same** pipeline step. Classified kills are `SIGXCPU`, `wall-time`, `SIGXFSZ` and `allocation-failure`.
- Everything else — infrastructure failure, unknown, an undifferentiated `SIGKILL`, or a crash — is **recovery-needed**: the film stays `validating` and slot-holding, and is never rejected as bad media.

No admission engine, lease, retry or trigger exists in this slice.

## 7. Fixtures

`tests/fixtures/coach-film.v2/` contains 173 fixtures plus `index.json`, `contract.schema.json` and `SHA256SUMS.txt`, generated by `functions/scripts/film-fixtures-v2.js` (which reads v1 read-only) and `film-contract-schema-v2.js`.

| Group | What it holds |
|---|---|
| Re-emitted v1 set | Every v1 fixture except the error table, as `v2-<v1 name>` |
| Error table | The full v2 error table (20 pairs: the original 18 plus the 2 new reasons) |
| Ready states | Including at-limit, VFR, no-audio and late `ready` |
| Worker rejections | One per worker reason, plus a late worker rejection |
| Negative mutations | Named R5–R9, T6′, T3, reason set, `media` strictness and wire-missing-key cases. Includes +1 ms, +1 px width and +1 px height |
| Stored documents | Legacy r3 documents (valid) and impossible legacy `ready` (invalid) |
| Replay table | 19 cases |
| Attempt policy | 8 admission and 7 exhaustion cases |

Expected projections are built in the generator **independently** of `legacy-r3.js`.

**Fixture changes need Codex's review** before consumption (#39 A1 R4).

## 8. Ownership (A1 R4)

- **Claude** owns this document, `contract-v2.js`, `legacy-r3.js`, the two v2 generators, `tests/fixtures/coach-film.v2/**`, and the two v2 tests.
- **Codex** owns the client mirror `src/features/film-analyzer/contracts-v2.ts` and its parity tests, stacked on the exact SHA of this contract.
- **Frozen:** the v1 contract and fixtures, S1 handlers, `index.js`, rules, `contracts.ts`, `tools/ffmpeg/**`.
