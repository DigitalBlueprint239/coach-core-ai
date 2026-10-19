# coach-film.v1 — FILM-S1 wire contract (revision r3)

> **CONTRACT HANDOFF ONLY.** This document, `functions/src/film/contract.js`, `functions/src/film/limits.js` and `tests/fixtures/coach-film.v1/` define the contract the client mirror builds against. Contract agreement is not backend delivery or acceptance. Limit and rights values are **test placeholders** (PENDING_D3 / PENDING_D7), not approved terms. Emulator-only; nothing deployed, no AI, no spend.

Authority order if anything disagrees: `contract.js` (zod, executable) → fixtures (validated against it by `functions/test/film-contract.test.js`) → this document → `contract.schema.json` (generated; cannot express cross-field rules).

**r3 (Codex C4 at `7553a05`):** the 120 UTF-16-unit file-name bound is now enforced by an explicit `.length` refinement in both the request and stored schemas (zod's `.max` counts code points); UTF-16 boundary fixtures added. The limit is unchanged.

**r2 (Codex review C1–C3 at `f641d3d`):** client failures split from server errors (§6); state and response invariants enforced in the executable schemas, with negative mutation fixtures (§4.1, §3.1); replay window, operation tombstones, file-name canonicalization and receipt-vs-permission (§2, §7). Change log in §11.

## 1. Actions

| Callable (Firebase `onCall` name) | `action` value | Purpose |
|---|---|---|
| `reserveFilmUpload` | `"reserveFilmUpload"` | Reserve a cap slot and a quarantine upload path for one film |
| `abandonFilmUpload` | `"abandonFilmUpload"` | Cancel a reservation or an in-validation upload |

A callable accepts only its own `action`. Any other action → `invalid-argument / action-mismatch`.

## 2. Request envelope (strict; unknown keys at any level → `invalid-argument / schema-invalid`)

```
{ schemaVersion: "coach-film.v1",
  operationId:   <UUID v4, lowercase, client-generated, one per coach intent>,
  action:        "reserveFilmUpload" | "abandonFilmUpload",
  payload:       <action payload> }
```

**reserveFilmUpload payload**

| Field | Type | Rule |
|---|---|---|
| `teamId` | string | 1–128, `[A-Za-z0-9_-]` |
| `declaredBytes` | integer | ≥ 1; > `maxBytes` → `limit-exceeded / bytes-over-limit` |
| `declaredContentType` | string | must be in `allowedContentTypes` (`video/mp4`) else `limit-exceeded / format-not-allowed` |
| `fileName` | string | canonicalized (below); display only, never used in a path |
| `rightsAcknowledged` | boolean | `false` → `invalid-argument / rights-acknowledgement-required` |
| `rightsWordingVersion` | string | must be in `acceptedRightsWordingVersions` else `failed-precondition / rights-wording-outdated` |

**File-name canonicalization (exact):** `canonical = input.normalize("NFC").trim()` (JS `String.prototype.trim`). The canonical value must be 1–120 **UTF-16 code units** (`String.prototype.length`, measured after canonicalization; an astral character such as 😀 counts 2) and contain no C0/C1 control characters (U+0000–U+001F, U+007F–U+009F); otherwise `invalid-argument / schema-invalid`. The server stores, returns and **hashes the canonical form** for idempotency, so `"  Café.mp4 "` and `"Café.mp4"` under one operationId are the same payload. Stored/returned `fileName` is always canonical (the schema rejects a non-canonical stored value). The client mirror uses `canonicalizeFileName` semantics exactly. Boundaries: 60 × 😀 (120 units) accepted, 61 × 😀 (122 units) rejected, 120 ASCII accepted, 121 ASCII rejected, in both request and stored schemas. `contract.schema.json` cannot express a UTF-16 bound (JSON Schema `maxLength` counts code points), so it carries no `maxLength` for `fileName`; the bound is in `x-coach-film.limits.maxFileNameLength` and the zod schemas.

**abandonFilmUpload payload**: `{ teamId, filmId }` (`filmId` = UUID v4 returned by reserve).

## 3. Responses

Every contract outcome is **returned** (callable resolves). The callable never throws for a contract outcome; see §6 for what is thrown.

```
success: { ok: true,  data: <action data> }
error:   { ok: false, error: { code, retryable, reason } }
```

**reserveFilmUpload data — a reservation receipt**: `{ filmId, uploadPath, expiresAt, film: FilmState }`. `film` is the snapshot taken when the reservation was created. **A receipt is never permission to upload** (§7.3).

**Cancellation (abandonFilmUpload) data**: `{ filmId, previousStatus, film: FilmState }`
- `film.status` is `"abandoned"`; `film.abandonedAt == film.statusChangedAt`.
- `previousStatus` ∈ `reserved` | `validating` | `abandoned`. `abandoned` = already abandoned when this operation arrived under a **new** operationId; the call succeeds, the film is unchanged (idempotent cancel).
- Abandon from `ready`, `rejected` or `expired` → `failed-precondition / invalid-state`. A `reserved` film whose expiry time has passed but which the server has not yet marked `expired` may be abandoned (it stays unusable either way). Unknown film on an owned team → `failed-precondition / film-not-found`. Team not owned or missing → `permission-denied / not-team-owner` (no existence leak).
- Side effects on success: the quarantine object (if any) is deleted and the cap slot released.

### 3.1 Response invariants (enforced by `reserveData` / `abandonData` schemas)

| Rule | Invariant |
|---|---|
| R1 | reserve `data.filmId == data.film.filmId` |
| R2 | reserve `data.uploadPath == data.film.uploadPath` |
| R3 | reserve `data.expiresAt == data.film.reservationExpiresAt` |
| R4 | reserve receipt `data.film.status == "reserved"` |
| A1 | abandon `data.filmId == data.film.filmId` |
| A2 | abandon `data.film.status == "abandoned"` |
| A3 | `previousStatus == "reserved"` ⇒ `film.objectGeneration == null` |
| A4 | `previousStatus == "validating"` ⇒ `film.objectGeneration != null` |

Plus every FilmState invariant (§4.1) on the embedded `film`.

## 4. State representation

`FilmState` (strict) — returned by both callables and **identical field-for-field** to the Firestore document `teams/{teamId}/films/{filmId}` (owner may `get`/`list`; **no client writes**):

| Field | Wire type | Notes |
|---|---|---|
| `filmId`, `teamId`, `createdBy` | string | server-assigned |
| `status` | enum | see below |
| `createdAt`, `statusChangedAt`, `reservationExpiresAt`, `rightsAcknowledgedAt` | timestamp | |
| `abandonedAt` | timestamp \| null | |
| `declaredBytes` | integer | |
| `declaredContentType`, `rightsWordingVersion`, `uploadPath` | string | |
| `fileName` | string | canonical (§2) |
| `objectGeneration` | decimal string \| null | |
| `rejectionReason` | `size-mismatch` \| `content-type-mismatch` \| `signature-invalid` \| null | |

Absent values are `null`, never omitted.

**Statuses and transitions** (server-only):

```
reserved   → validating | rejected | abandoned | expired
validating → ready (decoder slice; never in FILM-S1) | rejected | abandoned
ready, rejected, abandoned, expired → (none in FILM-S1)
```
Slot-holding: `reserved`, `validating`, `ready`. `rejected`, `abandoned`, `expired` release the slot and are terminal. The server moves a lapsed `reserved` film to `expired` lazily (on the team's next reserve, or on a late finalize). The client treats `status == "reserved" && now ≥ reservationExpiresAt` as expired.

### 4.1 FilmState invariants (enforced by the `filmState` schema)

| Rule | Invariant |
|---|---|
| P1 | `uploadPath == "quarantine/{teamId}/{filmId}/source.mp4"` |
| S1 | `abandonedAt != null` ⇔ `status == "abandoned"` |
| S2 | `rejectionReason != null` ⇔ `status == "rejected"` |
| G1 | `objectGeneration == null` when `reserved` or `expired` |
| G2 | `objectGeneration != null` when `validating`, `ready` or `rejected` (`abandoned`: either) |
| T1 | `rightsAcknowledgedAt ≤ createdAt` |
| T2 | `createdAt < reservationExpiresAt` |
| T3 | `createdAt ≤ statusChangedAt` |
| T4 | `reserved` ⇒ `statusChangedAt == createdAt` |
| T5 | `expired` ⇒ `statusChangedAt ≥ reservationExpiresAt` |
| T6 | `validating` or `rejected` ⇒ `statusChangedAt < reservationExpiresAt` |
| T7 | `abandoned` ⇒ `abandonedAt == statusChangedAt` |
| F1 | `fileName` is canonical and 1–120 UTF-16 code units (§2) |

## 5. Encodings

- **Timestamps (wire):** ISO 8601 UTC, exactly three fractional digits, `Z` — `2026-10-19T21:15:00.000Z`; must round-trip through `new Date(s).toISOString()` unchanged.
- **Timestamps (Firestore doc):** same fields as Firestore `Timestamp`; convert with `ts.toDate().toISOString()`.
- **Storage generation:** decimal string (int64).
- **IDs:** UUID v4 lowercase for `operationId` and `filmId`.

## 6. Errors

### 6.1 Server errors (wire; `{ok:false, error}`)

| code | retryable | reasons (closed set; all server-emitted) | Client action |
|---|---|---|---|
| `unauthenticated` | false | `sign-in-required`, `account-disabled` | sign in / contact owner |
| `permission-denied` | false | `anonymous-not-allowed`, `email-not-verified`, `beta-access-required`, `not-team-owner` | explain access |
| `invalid-argument` | false | `schema-invalid`, `action-mismatch`, `rights-acknowledgement-required` | fix request / tick rights box |
| `limit-exceeded` | false | `bytes-over-limit`, `format-not-allowed` | show limit / conversion help |
| `team-cap-reached` | false | `team-film-cap` | remove a film first |
| `failed-precondition` | false | `rights-wording-outdated`, `film-not-found`, `invalid-state`, `operation-expired` | reload wording / refresh state / start a new intent |
| `conflict` | false | `operation-id-reused` | client bug: a new intent needs a new operationId |
| `unavailable` | **true** | `backend-unavailable` | coach may retry, **same** operationId |

`retryable` always equals the table; a reason outside its code's set is invalid. The server emits `unavailable / backend-unavailable` **only** for known-transient backend conditions (Firestore ABORTED/contention, DEADLINE_EXCEEDED, UNAVAILABLE). Any other unexpected server failure is **thrown** as a sanitized `HttpsError("internal", "internal")` with no details.

### 6.2 Client failures (NOT wire data; `{clientFailure}`)

When the client obtains no valid server envelope it produces, locally:

```
{ clientFailure: { kind, category, retryEligible } }
```

| kind | category | retryEligible | When |
|---|---|---|---|
| `protocol` | `response-invalid` | false | resolved value fails `RESPONSE_SCHEMAS` — a client protocol error, never a fabricated server outcome |
| `network` | `network` | **true** | no HTTP response (offline, DNS, reset) |
| `sdk` | the thrown SDK code, sanitized: one of `cancelled, unknown, invalid-argument, deadline-exceeded, not-found, already-exists, permission-denied, resource-exhausted, failed-precondition, aborted, out-of-range, unimplemented, internal, unavailable, data-loss, unauthenticated` | **true only** for `unavailable`, `deadline-exceeded`; false otherwise | callable threw |

Rules: keep only `kind` and `category` (no SDK message or details). Do not map an SDK category onto a server `reason`. **No automatic retry, ever.** A retry-eligible failure may be retried only by an explicit coach action, with the **same** operationId. The `clientFailure` key and the absence of `ok` mean a client failure can never parse as a server response and vice versa; fixture `invalid.response.client-transport-as-server.json` proves the old `unavailable/transport` shape is rejected as server data.

## 7. Idempotency, retry horizon and permission

### 7.1 Replay
- Key: **(authenticated uid, operationId)**. Another user's identical operationId is unrelated.
- Same key, same action, same canonical payload, within the replay window → the stored **success** response is replayed verbatim (byte-identical `data`).
- Same key, different action or canonical payload → `conflict / operation-id-reused` (at any age).
- Error responses are **not** stored; a retry re-evaluates.

### 7.2 After the window
- Replay window: `operationReplayWindowMs` = 24 h (DELEGATED), measured from the first success.
- At or after the window, the same key with the same payload → `failed-precondition / operation-expired`. The operation is **never re-executed**.
- Operation records are **not pruned** in FILM-S1. Any later retention change must keep a tombstone `{uid, operationId, action, payloadHash, replayableUntil}` so an old retry can never create a second reservation.
- On `operation-expired`, the client reads the current film document; a new upload needs a new operationId (new intent).

### 7.3 Receipt is not permission
- A reserve response (original or replayed) is a **receipt snapshot** (`film.status == "reserved"` at creation). After cancellation or expiry, a same-operation replay still returns that snapshot.
- **Permission to upload is decided only at upload time**, by Storage rules against the **current** film document: `status == "reserved"`, `request.time < reservationExpiresAt`, caller == `createdBy`, exact `declaredBytes`, `video/mp4`, create-only.
- Expired or abandoned reservations stay unusable: rules deny the upload, and an object that still finalizes is deleted without changing the terminal status.
- The client must read the current film document (or its listener) before starting an upload, and never infer permission from a receipt.

## 8. Upload (informative for the client)

Upload to `uploadPath` with the Firebase Storage SDK, `contentType: "video/mp4"`, exactly `declaredBytes`, while the current film document permits it (§7.3). No client read, update or delete under `quarantine/`, `films/`, `frames/`. "ready" exists only when the server sets it (never in FILM-S1). Watch the film document for `validating` / `rejected`.

## 9. Placeholders (not approved)

`maxBytes` 100,000,000 (PENDING_D3; bytes-vs-MiB unresolved), `maxDurationMs` 300,000, `maxWidth`×`maxHeight` 1920×1080, `teamFilmCap` 20, `allowedContentTypes` [`video/mp4`] (all PENDING_D3); `acceptedRightsWordingVersions` [`rights-v1`] (PENDING_D7); `reservationLifetimeMs` 3,600,000 and `operationReplayWindowMs` 86,400,000 (DELEGATED). Duration and resolution are published but enforced only by the later decoder slice. Fixtures carrying placeholder values are tagged `placeholder` in `index.json`.

## 10. Fixtures

`tests/fixtures/coach-film.v1/`: `index.json` (manifest: kind ∈ request | response | film-state | client-failure, action, valid, expected code/reason, `mutation` + `rule` for negatives), 86 fixture files, `contract.schema.json` (generated), `SHA256SUMS.txt`. Negative mutation fixtures (`invalid.mutation.*`) must be rejected by the executable schema **for the named rule**; M1–M8 are the reviewer's eight probes, X1–X15 extend coverage to the remaining invariants. Authoring script: `functions/scripts/film-fixtures.js` (the JSON files are authoritative). Regenerate schema/sums with `node functions/scripts/film-contract-schema.js`; `--check` fails on drift. Fixture changes need both owners' review on #39.

## 11. Change log

- **r1** `f641d3d` — initial handoff.
- **r2** — C1: removed server reason `unavailable/transport`; added `clientFailure` type (protocol / network / sdk) with only network, sdk `unavailable` and `deadline-exceeded` retry-eligible; server emits `backend-unavailable` only for known-transient conditions and throws sanitized `internal` otherwise. C2: invariants R1–R4, A1–A4, P1, S1–S2, G1–G2, T1–T7, F1 in the executable schemas; 21 negative mutation fixtures. C3: `operation-expired` reason, 24 h replay window, retained tombstones, exact file-name canonicalization, receipt-vs-permission rule.
- **r3** — C4: explicit UTF-16 `.length` bound in `canonicalFileName` and `storedFileName` (limit stays 120); 8 boundary fixtures (request: 60-emoji valid, 61-emoji invalid, 120-ASCII valid, 120-ASCII padded valid after trim; stored: 60-emoji valid, 120-ASCII valid, X14 61-emoji invalid, X15 121-ASCII invalid). The 78 r2 fixture files are byte-unchanged; `index.json`, `contract.schema.json` and `SHA256SUMS.txt` are regenerated.
