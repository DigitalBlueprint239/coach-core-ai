# coach-film.v1 — FILM-S1 wire contract

> **CONTRACT HANDOFF ONLY.** This file, `functions/src/film/contract.js`, `functions/src/film/limits.js` and `tests/fixtures/coach-film.v1/` define the contract so the client mirror can start. **No backend behaviour is delivered or accepted by this commit**: the callables, Storage trigger and rules for FILM-S1 are not in it. Limit and rights values are **test placeholders** (PENDING_D3 / PENDING_D7), not approved terms. Emulator-only; nothing deployed, no AI, no spend.

Authority order if anything disagrees: `contract.js` (zod) → fixtures (validated against it by `functions/test/film-contract.test.js`) → this document → `contract.schema.json` (generated; cannot express cross-field rules).

## 1. Actions

| Callable (Firebase `onCall` name) | `action` value | Purpose |
|---|---|---|
| `reserveFilmUpload` | `"reserveFilmUpload"` | Reserve a cap slot and a quarantine upload path for one film |
| `abandonFilmUpload` | `"abandonFilmUpload"` | Cancel a reservation or an in-validation upload |

A callable accepts only its own `action`. Any other action → `invalid-argument / action-mismatch`. No other actions exist in FILM-S1.

## 2. Request envelope (strict; unknown keys at any level → `invalid-argument / schema-invalid`)

```
{ schemaVersion: "coach-film.v1",
  operationId:   <UUID v4, lowercase, client-generated, one per user intent>,
  action:        "reserveFilmUpload" | "abandonFilmUpload",
  payload:       <action payload> }
```

**reserveFilmUpload payload**

| Field | Type | Rule |
|---|---|---|
| `teamId` | string | 1–128, `[A-Za-z0-9_-]` |
| `declaredBytes` | integer | ≥ 1; > `maxBytes` → `limit-exceeded / bytes-over-limit` |
| `declaredContentType` | string | must be in `allowedContentTypes` (`video/mp4`) else `limit-exceeded / format-not-allowed` |
| `fileName` | string | trimmed, 1–120 chars (display only; never used in a path) |
| `rightsAcknowledged` | boolean | `false` → `invalid-argument / rights-acknowledgement-required` |
| `rightsWordingVersion` | string | must be in `acceptedRightsWordingVersions` else `failed-precondition / rights-wording-outdated` |

**abandonFilmUpload payload**: `{ teamId, filmId }` (`filmId` = UUID v4 returned by reserve).

## 3. Responses

Every contract outcome is **returned** (callable resolves). The callable never throws for a contract outcome.

```
success: { ok: true,  data: <action data> }
error:   { ok: false, error: { code, retryable, reason } }
```

**reserveFilmUpload data**: `{ filmId, uploadPath, expiresAt, film: FilmState }` with `uploadPath == film.uploadPath == "quarantine/{teamId}/{filmId}/source.mp4"` and `expiresAt == film.reservationExpiresAt`.

**Cancellation (abandonFilmUpload) data**: `{ filmId, previousStatus, film: FilmState }`
- `film.status` is always `"abandoned"`; `film.abandonedAt` is set.
- `previousStatus` ∈ `reserved` | `validating` | `abandoned`. `abandoned` means the film was already abandoned when this operation arrived under a **new** operationId; the film is unchanged and the call succeeds (idempotent cancel).
- Abandon from `ready`, `rejected` or `expired` → `failed-precondition / invalid-state`. Unknown film on an owned team → `failed-precondition / film-not-found`. Team not owned (or missing) → `permission-denied / not-team-owner` (no existence leak).
- Side effects on success: the quarantine object (if any) is deleted and the cap slot is released.

## 4. State representation

`FilmState` (strict) — returned by both callables and **identical field-for-field** to the Firestore document `teams/{teamId}/films/{filmId}` (owner may `get`/`list`; **no client writes**):

| Field | Wire type | Notes |
|---|---|---|
| `filmId`, `teamId`, `createdBy` | string | server-assigned |
| `status` | enum | see below |
| `createdAt`, `statusChangedAt`, `reservationExpiresAt`, `rightsAcknowledgedAt` | timestamp | |
| `abandonedAt` | timestamp \| null | non-null iff `status == "abandoned"` |
| `declaredBytes` | integer | |
| `declaredContentType`, `fileName`, `rightsWordingVersion`, `uploadPath` | string | |
| `objectGeneration` | decimal string \| null | set when an object finalized |
| `rejectionReason` | `size-mismatch` \| `content-type-mismatch` \| `signature-invalid` \| null | non-null iff `status == "rejected"` |

Absent values are `null`, never omitted.

**Statuses and transitions** (server-only):

```
reserved   → validating | rejected | abandoned | expired
validating → ready (decoder slice; never in FILM-S1) | rejected | abandoned
ready, rejected, abandoned, expired → (none in FILM-S1)
```
Slot-holding: `reserved`, `validating`, `ready`. `rejected`, `abandoned`, `expired` release the slot and are terminal. A reservation whose `reservationExpiresAt` has passed with no finalized upload is moved to `expired` by the server (lazily, on the team's next reserve or on a late finalize); the client should treat `status == "reserved" && now ≥ reservationExpiresAt` as "expired, pending server update" and must not start an upload.

## 5. Encodings

- **Timestamps (wire):** ISO 8601 UTC, exactly three fractional digits, `Z` — `2026-10-19T21:15:00.000Z`. Must round-trip through `new Date(s).toISOString()` unchanged. No offsets, no epoch numbers.
- **Timestamps (Firestore doc):** the same fields are Firestore `Timestamp`; convert with `ts.toDate().toISOString()` (millisecond precision).
- **Storage generation:** decimal string (int64).
- **IDs:** UUID v4 lowercase for `operationId` and `filmId`.

## 6. Error codes, retryable and reasons

| code | retryable | reasons (closed set) | Client action |
|---|---|---|---|
| `unauthenticated` | false | `sign-in-required`, `account-disabled` | sign in / contact owner |
| `permission-denied` | false | `anonymous-not-allowed`, `email-not-verified`, `beta-access-required`, `not-team-owner` | explain access |
| `invalid-argument` | false | `schema-invalid`, `action-mismatch`, `rights-acknowledgement-required` | fix request / tick rights box |
| `limit-exceeded` | false | `bytes-over-limit`, `format-not-allowed` | show limit / conversion help |
| `team-cap-reached` | false | `team-film-cap` | remove a film first |
| `failed-precondition` | false | `rights-wording-outdated`, `film-not-found`, `invalid-state` | reload wording / refresh state |
| `conflict` | false | `operation-id-reused` | client bug: new intent needs a new operationId |
| `unavailable` | **true** | `backend-unavailable`; `transport` (**client-only**) | retry with the **same** operationId |

`retryable` is always exactly `RETRYABLE[code]`; a response violating that, or a reason outside its code's set, is invalid.

**Client-only `transport`:** the server never sends it. The client mirror maps any of the following to `{code:"unavailable", retryable:true, reason:"transport"}`: network failure, callable timeout, any thrown `HttpsError` (including `internal`), or a resolved value that fails the response schema.

## 7. Idempotency

- Key: **(authenticated uid, operationId)**. Another user's identical operationId is unrelated.
- Same key, same action, same canonical payload → the stored **success** response is replayed verbatim (byte-identical `data`, same timestamps). One film, one slot.
- Same key, different action or payload → `conflict / operation-id-reused`.
- Error responses are **not** stored; a retry re-evaluates (e.g. `team-cap-reached` may succeed after a slot frees).
- Operation records are kept at least 24 h (DELEGATED).

## 8. Upload (informative for the client)

After reserve, upload to `uploadPath` with the Firebase Storage SDK, `contentType: "video/mp4"`, exact `declaredBytes`, before `reservationExpiresAt`. Rules allow **create only**, by `createdBy`, while `status == "reserved"`. No client read, update or delete under `quarantine/`, `films/`, `frames/`. Progress = SDK bytes transferred; "ready" exists only when the server sets it (never in FILM-S1). Watch the film document for `validating` / `rejected`.

## 9. Placeholders (not approved)

`maxBytes` 100,000,000 (PENDING_D3; bytes-vs-MiB unresolved), `maxDurationMs` 300,000, `maxWidth`×`maxHeight` 1920×1080, `teamFilmCap` 20, `allowedContentTypes` [`video/mp4`] (all PENDING_D3); `acceptedRightsWordingVersions` [`rights-v1`] (PENDING_D7); `reservationLifetimeMs` 3,600,000 (DELEGATED). Duration/resolution are published but enforced only by the later decoder slice. When the settled D3/D7 record is attached, only `limits.js` changes; fixtures carrying placeholder values are marked `placeholder` in `index.json` and are regenerated.

## 10. Fixtures

`tests/fixtures/coach-film.v1/`: `index.json` (manifest: kind, action, valid, expected code/reason), 45 fixture files, `contract.schema.json` (generated), `SHA256SUMS.txt`. Regenerate schema/sums with `node functions/scripts/film-contract-schema.js`; `--check` fails on drift. Fixture changes need the other owner's review on #39.
