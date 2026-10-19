# FILM-S1 — backend slice: upload reservation, cancellation, quarantine intake, rules

Status: **implemented on an isolated branch, NOT accepted, NOT deployable.**
Base `515dc1d92bf237dae4d70ff2cc38c2aee07d5ae1` (accepted core / PR79), on top
of the contract handoff `f641d3d` (`docs/film/COACH_FILM_V1_CONTRACT.md`,
`functions/src/film/contract.js`, `tests/fixtures/coach-film.v1/`).
Authorized by Coach Drew on issue #39 (2026-10-19) against the
[reconciliation](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6277269726).
Film Analyzer remains required for the MVP. MVP remains NO-GO.

The wire contract is defined in `docs/film/COACH_FILM_V1_CONTRACT.md` and is
not repeated here. This document covers the server behaviour behind it, the
rules, the placeholders, the deploy block and the checks to repeat when the
founder terms are attached.

## 1. What this slice is

A coach can reserve an upload slot for one film, upload exactly the reserved
object into quarantine, cancel, and read the server's truthful state.
Everything else — decoder, metadata-stripping remux, `ready`, playback links,
frames, clips, play/practice links, AI suggestions, deletion of ready films,
sweepers, UI — is a later slice and is **absent**, not stubbed.

Nothing in this slice can make a film playable. `ready` exists in the
contract's status enum for the decoder slice, but no code path in FILM-S1
writes it (asserted by a test).

## 2. Placeholders: NOT approved limits, NOT approved wording

`functions/src/film/limits.js` carries the founder-packet recommendations as
**test placeholders** tagged `PENDING_D3` / `PENDING_D7`; the status of the
terms they wait on lives in `functions/src/film/terms.js`.

| Placeholder | Value in code | Waits on |
|---|---|---|
| `maxBytes` | `100000000` (decimal; the older spec says 100 MiB) | D3 (gap G3) |
| `teamFilmCap` | `20` | D3 (G3) |
| `allowedContentTypes` | `["video/mp4"]` | D3 (G3) |
| `acceptedRightsWordingVersions` | `["rights-v1"]` — accepting it records an acknowledgement of **placeholder** wording | D7 (G7) |
| `reservationLifetimeMs` | 60 min | DELEGATED |

The same byte and content-type literals appear in `storage.rules`; test FS-25
(`functions/test/film-policy-pins.test.js`) fails if they drift apart.

### Visible deploy block

- `firebase.json` → `functions.predeploy` runs
  `functions/scripts/film-terms-guard.js`, which **exits 1 while any term in
  `terms.js` is PENDING**, so `firebase deploy` of this candidate fails with a
  banner. (The emulators do not run predeploy hooks.)
- `COACH_CORE_FILM_ENABLED` defaults to **false**. With it unset both
  callables return the contract error `unavailable / backend-unavailable`
  before touching identity or data. Only a local emulator `.env` may set it
  true.
- The quarantine Storage rule only admits an object for a `reserved` film
  document, and only the (default-off) callable can create one, so no client
  can reach quarantine while the switch is off.

Flipping a term to `SETTLED` requires the settled record link in `terms.js`,
the real values in `limits.js` and `storage.rules`, and the repeats in §8. The
guard is a safety net, not an approval mechanism.

## 3. Server-owned film record

`teams/{teamId}/films/{filmId}` is field-for-field the contract's `FilmState`
with Firestore `Timestamp` in place of ISO strings (asserted by tests):
`filmId, teamId, createdBy, status, createdAt, statusChangedAt,
reservationExpiresAt, declaredBytes, declaredContentType, fileName,
rightsWordingVersion, rightsAcknowledgedAt, uploadPath, objectGeneration,
rejectionReason, abandonedAt`. The owner may `get`/`list`; **no client may
write**.

Server-only, no client rules at all: `teams/{teamId}/filmLedger/counts`
(`active` = films in a slot-holding status) and
`filmOperations/{uid}__{operationId}` (idempotency records holding the first
success response).

## 4. State machine and accounting (server)

```
reserved ──finalize ok (size, type, ftyp)──▶ validating      (slot held)
reserved ──finalize mismatch──────────────▶ rejected        (slot released, object deleted)
reserved ──lifetime passed────────────────▶ expired         (slot released; lazily, see below)
reserved | validating ──abandon───────────▶ abandoned       (slot released; object deleted)
ready | rejected | expired ──abandon──────▶ failed-precondition / invalid-state
```

- **Expiry** is enforced three ways: the Storage rule
  (`reservationExpiresAt > request.time`), the team's next reserve
  transaction (every `reserved` film whose lifetime has passed is marked
  `expired` and its slot released, in the same transaction that may consume a
  slot; the query is an equality on `status`, bounded by the cap, so no
  composite index), and the finalize handler for a late object. There is no
  timer/sweeper in this slice.
- **Cap**: `active >= teamFilmCap` → `team-cap-reached / team-film-cap`.
  Increment/decrement is in the same transaction as the status change; a
  retried attempt never double-counts (tested with forced retries). The cap
  is per team.
- **Idempotency**: key `(uid, operationId)`; same action + same canonical
  payload → the stored success response is replayed verbatim with no writes;
  different action/payload → `conflict / operation-id-reused`; errors are not
  stored.
- **Cleanup** targets only `quarantine/{teamId}/{filmId}/source.mp4`, with
  `ifGenerationMatch` whenever a generation is known. A stale precondition
  never removes a newer object. No code path lists or deletes anything else.
- **Identity**: token checks plus the live user record (disabled, revoked,
  beta claim), mapped to the contract's closed reason set:
  `sign-in-required` (no auth, unknown account, revoked session),
  `account-disabled`, `anonymous-not-allowed`, `email-not-verified`,
  `beta-access-required`; team not owned or missing → `not-team-owner`.

## 5. Quarantine intake (`onFilmQuarantineFinalized`)

Handles only `quarantine/{teamId}/{filmId}/source.mp4`; every other path is
ignored and never deleted. Checks: object size == `declaredBytes`, content
type == `declaredContentType` (and allowed), first 64 bytes start with a
plausible `ftyp` box. **This is a container-signature check, not media
validation.** Outcomes: `validating` (best case, generation recorded),
`rejected` (`rejectionReason` ∈ `size-mismatch | content-type-mismatch |
signature-invalid`, exact-generation delete, slot released once), `expired`
(late object: status expired, `rejectionReason` null, object deleted, slot
released), `duplicate-event` (same generation already recorded: no-op),
`stray-*` (missing/abandoned/rejected/expired/other-generation reservation:
exact-generation delete, status unchanged), `object-missing` (probe found no
such generation: reservation left open, nothing deleted), `ignored`.

## 6. Rules (additive; existing matches untouched)

- `firestore.rules`: `match /teams/{teamId}/films/{filmId}` — owner
  get/list; create/update/delete `false`.
- `storage.rules`: `quarantine/{teamId}/{filmId}/source.mp4` — **create
  only**, by the beta team owner, while the Firestore reservation is
  `reserved`, `createdBy == uid`, `reservationExpiresAt > request.time`, size
  == `declaredBytes`, size ≤ placeholder limit, content type `video/mp4`. No
  client read/update/delete under `quarantine/`, `films/`, `frames/`.
  Existing `teams/{teamId}/files/*` rules are regression-tested unchanged.

## 7. Tests

- `functions/test/film-reservation.test.js` (33), `film-quarantine.test.js`
  (14), `film-policy-pins.test.js` (6), `film-index-wiring.test.js` (6): in-
  memory doubles that enforce read-before-write and retry semantics; no
  project, no network, no media.
- `functions/test/film-contract.test.js` (from the contract handoff): every
  golden fixture against the zod schemas, JSON-schema/SHA256 drift.
- `tests/rules/film.rules.test.mjs`: Firestore + Storage emulator (demo
  project) — FS-12..FS-18, FS-23, at-limit/over-limit uploads. Runs in the
  `Security gates` workflow; the development container cannot download the
  emulator jars.

## 8. Policy-dependent checks to repeat when the settled terms are attached

| When | Repeat | Why |
|---|---|---|
| D3 limits attached | FS-06/FS-10 (`film-reservation.test.js`), FS-25 (`film-policy-pins.test.js`), rules FS-06/FS-25 (`film.rules.test.mjs` at-limit / over-limit uploads), `film-contract.test.js` + `node functions/scripts/film-contract-schema.js` (fixtures marked `placeholder` regenerate) | literals change in `limits.js`, `storage.rules`, fixtures |
| D3 content types attached | FS-07, rules FS-16 content-type cases, quarantine content-type test; the single-literal Storage rule must become a list match | `allowedContentTypes` may widen or transcoding may be required |
| D7 wording attached | FS-08/FS-09, fixtures `reserve.request.*`, rules seed `rightsWordingVersion` | the accepted version string changes; acknowledgements recorded under `rights-v1` placeholder wording are **not** approved acknowledgements |
| Any term flips to SETTLED | `film-terms-guard.js` (exit 0) and the wiring test | the deploy block lifts only when all terms are settled |
| D4 retention attached | `reservationLifetimeMs` and the future sweeper | the lifetime is delegated today; D4 may constrain it |

## 9. Known limitations of this slice

- No decoder: a `validating` film has passed a 64-byte signature check only.
- No sweeper: an expired reservation's slot is released lazily, not on a
  timer.
- Rules tests execute only in CI (emulator jars unreachable from the dev
  container); functions tests use fakes, not the Firestore engine.
- No client, UI or navigation; nothing is reachable from the app.
- The kill-switch response reuses the contract's `unavailable /
  backend-unavailable` (retryable) rather than adding a reason to the
  published contract; the deploy guard is the visible block.
