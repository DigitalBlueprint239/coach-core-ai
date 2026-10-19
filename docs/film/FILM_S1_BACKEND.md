# FILM-S1 backend — reservation, cancellation, quarantine intake

> **Backend slice. Not deployable. Not accepted.** Implements `coach-film.v1` (contract r3, `docs/film/COACH_FILM_V1_CONTRACT.md`). Limit and rights values are TEST PLACEHOLDERS (PENDING_D3 / PENDING_D7). Emulator-only. Film Analyzer remains MVP-required; MVP remains NO-GO.

## What exists

| Piece | File | Notes |
|---|---|---|
| Callables `reserveFilmUpload`, `abandonFilmUpload` | `functions/src/film/handlers.js`, exported (appended) in `functions/index.js` | Contract outcomes returned; one transaction per operation (op record + team ownership + ledger + film doc) |
| Quarantine intake `onFilmQuarantineFinalized` | same | `quarantine/{teamId}/{filmId}/source.mp4` only; size, content type and first-box `ftyp` check; never sets `ready` |
| Storage adapter | `functions/src/film/storage-adapter.js` | every delete/read targets one exact generation |
| Deploy block | `functions/src/film/terms.js`, `functions/scripts/film-terms-guard.js`, `firebase.json` `functions.predeploy` | `firebase deploy` exits 1 while D3/D7 are PENDING |
| Film switch | `COACH_CORE_FILM_ENABLED` (default **false**) in `functions/index.js` | callables refuse while off |
| Rules | `firestore.rules` (film docs owner-readable, no client writes), `storage.rules` (quarantine create-only) | additive |

## Review findings R1–R8 (review session, #39 c-6278181708) — resolution

| # | Resolution |
|---|---|
| R1 HIGH | **Fixed.** Default-off `COACH_CORE_FILM_ENABLED` and a `functions.predeploy` guard. Both are lifted from `claude/film-s1-backend-b` @ `d052244`. One deviation from the suggestion: while off, the callables **throw a sanitized `internal`** (client `sdk/internal`, not retry-eligible) instead of returning `unavailable/backend-unavailable`. A disabled feature is a configuration state, and contract r3 §6 (C1) reserves the retryable code for known-transient conditions. The guard prints "DEPLOY BLOCKED: FILM TERMS PENDING". |
| R2 MEDIUM | **Fixed.** Deletes use `ifGenerationMatch` with the generation string; 404 and 412 are treated as "left alone". Each path deletes only one generation: finalize deletes the event's generation, and abandon deletes only `objectGeneration` when it was recorded. An object whose finalize has not yet been processed is deleted by its own late event when that event sees the terminal status. |
| R3 MEDIUM | **Fixed.** The head read is generation-specific. If the generation is gone, the outcome is `object-gone` and the reservation is untouched. Any other read error **throws**: no state change, nothing deleted, the reservation stays open until it expires. A signature rejection happens only after a successful read of a non-`ftyp` head. The trigger keeps `retry: false`; enabling event retry is a deploy-time decision. |
| R4 LOW | **Fixed.** The read is 1 KiB. A box passes if it is complete within the read, 16 ≤ size ≤ 1024, `(size−16) % 4 == 0`, the type is `ftyp` and the major brand is printable. That allows up to 252 compatible brands. |
| R5 LOW | **Fixed.** Lazy expiry reads each lapsed film document first. An orphan slot, or one whose document is no longer `reserved`, is dropped instead of updated. |
| R6 LOW | **No change.** The second emulator step completes well inside the rules job's 20-minute timeout (job ≈ 1 min). |
| R7 INFO | **Fixed.** The Storage rule evaluates the film document once, as a value: one `exists` plus one `get` on the same path, plus `ownsTeam`. It also binds `film.teamId` and `film.filmId` to the path. Live-project call-count behaviour remains unverified, and any live deploy needs founder approval anyway. |
| R8 INFO | **Fixed.** Storage rules tests cover an upload at exactly `maxBytes` (allowed) and at `maxBytes + 1` (denied even when the film document declares it). |

## Deferred (explicit)

- **Retention sweeper** for orphaned quarantine objects: an upload whose finalize event failed, or a reservation that expired with an object present. This belongs to the retention slice and waits on D4.
- **Event retry policy** for the finalize trigger.
- Media validation, decoder, `ready`, playback, frames, UI and AI: later slices.

## Policy-dependent checks to repeat when D3/D7 settle

1. Replace the values in `functions/src/film/limits.js` and the `storage.rules` literals.
2. Set D3/D7 to `SETTLED` with the record link in `functions/src/film/terms.js`.
3. Regenerate the contract fixtures that carry placeholder values (`index.json` `placeholder` tag).
4. Rerun FS-06..10, FS-25, R8 and the contract tests.
5. Deploying still needs separate founder approval.

## Evidence

Evidence is posted on issue #39 per SHA: functions suite, Security gates (rules emulator, film handler emulator), and the single bounded E2E acceptance-bucket run. The handoff SHA is reviewed independently; contract agreement is not backend acceptance.
