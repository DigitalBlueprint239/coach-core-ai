# Film F1 — team-saved review of synthetic film (preview)

Branch `drew/film-analyzer` from checkpoint `0f0f9138f12c02d9bf1b6df534ee3be5116a3a96` (Elite Broadcast + Playbook formations). Owner: Drew (Film Analyzer track). Draft only: no merge, no deployment. **MVP NO-GO.**

## Scope
Choose a verified synthetic sample → play / seek / change speed → mark start and end → label, tags and notes → save to the selected team → hard reload → reopen exactly. Inside the Coach Core app with the Elite Broadcast design.

Out of scope and unchanged: real footage, uploads, the S1/S2b pipeline, Functions, `storage.rules`, paid AI, new dependencies, Playbook, shared persistence (`src/features/persistence/**`).

## Coordination and ownership (recorded before shared edits)
- Branch and base confirmed on GitHub: `drew/film-analyzer` = `kev/playbook-improvements` = `0f0f913`; no commits on either since the checkpoint; no other branch touched the shared files after it.
- Issue #39: no active claim on `AppShell`, `Dashboard`, `firestore.rules` or `tests/rules` after 2026-10-22. The checkpoint handoff assigns Film sections of the rules to Drew; navigation is shared with Kev.
- Proposed shared edits (additive): optional Film destination in `AppShell` (prop, default off) and its 5-column bar; lazy Film screen in `Dashboard`; `REACT_APP_FILM_PREVIEW=false` in `.env.production`; new `filmAnnotations` block in the Film section of `firestore.rules`; new rules test file plus one entry in `tests/rules/package.json`. The coordination comment for #39 is prepared in this PR's description; it could not be posted from the delivery machine (no GitHub sign-in). Kev: reply there before editing navigation.

## Decision status (reconciled, not assumed)
| Source | Recorded state |
|---|---|
| D10 (2026-10-13, shared context) | Explicit founder approval for consent-based legacy import **implementation/testing only**; activation not approved. |
| CC-007 reconciliation (2026-10-14, shared context) | Earlier blanket "D1–D9 pending" statements are historical; Coach Drew reports those directions settled, but the detailed approval record is unavailable. No spending, deployment or AI/film activation is inferred. |
| FILM-FR1 r2.2 (#39 c-6340778849, 2026-10-22) | D2 playback (signed bearer link or proxy), D3 limits, D4 retention, D5 budget and D7 rights wording are **proposed terms, not capabilities or settings**; each needs a recorded owner decision before real footage. A0 was authorized separately. |
| This phase | Depends on none of D1–D9: synthetic, allowlisted media only; no upload, playback URL, retention, AI or spend. |

No newer recorded owner decision for D2/D3/D4/D5/D7 was found in #39 through 2026-10-22T23:17Z.

## Design
- **Contract** `src/features/film-analyzer/review/annotation.ts` — `coach-film-annotation.v1`: `schemaVersion, teamId, createdBy, source {kind:'synthetic', sampleId, durationMs, sha256[] sorted}, startMs, endMs, label (1–80, trimmed), tags (≤8, 1–24 chars, unique case-insensitively), notes (≤2000), revision, createdAt, updatedAt`. Integer milliseconds, `0 ≤ start`, `end ≤ duration`, `end − start ≥ 100 ms`; control characters rejected; stored records are decoded strictly and never repaired.
- **Pinned source** — the sample identity (id, 8000 ms, both encoding hashes) is stored with every mark and pinned in `firestore.rules`; a unit test checks the rules literal equals the client manifest. Reopen requires the record's source to equal the current sample's identity, and marks enter the editor only after the media bytes, SHA-256 and duration are verified (Film A0 finding A0-1).
- **Rules** `teams/{teamId}/filmAnnotations/{id}`: beta user and team owner (the app's owner-only model) for get/list/create/update/delete; strict keys; `createdBy == auth.uid`; immutable `teamId/createdBy/createdAt/source/schemaVersion`; revision 1 on create and +1 on update; server timestamps; bounds and tag checks.
- **Persistence** `annotationStore.ts` (feature folder only): team ownership checked inside the transaction, stale revision → conflict with the remote copy, lost-acknowledgement retry, and server readback must equal what was sent before the UI says "Saved". Delete is revision-checked and confirmed by absence.
- **UI** `FilmReview.tsx` + `film-review.css`: Elite panels; sample picker; Play/Pause, ±0.5 s, speed 0.25–2×, seek slider, "Play marked interval" (HTML media events, not frame-accurate); marks from the playhead or numeric inputs; label, tags (Enter/comma, suggestions, remove), notes with counters; validation messages; status only says "Saved … (confirmed on the server)" after readback. Conflicts offer "Load the saved version", "Save mine as a new mark" or "Keep editing". Unsaved edits are offered back when returning to Film for the same account and team (memory only — never persisted, never shown to another team or after reload); leaving the page with unsaved edits triggers the browser's warning. Keyboard on the focused video area: Space/K, ←/→, I/O, Home/End.
- **Access** `Dashboard` lazy-loads the screen only when `REACT_APP_FILM_PREVIEW=true` and emulator mode at build time, plus a `demo-*` project at runtime. `.env.production` sets the flag false, so webpack removes the Film chunk, sample paths and the navigation entry from production bundles.
- **Samples** `src/features/film-analyzer/review/samples/` — the two A0 files, byte-identical to PR #89's manifest (MP4 25,146 B `a3b42854…`, WebM 49,584 B `a74f85cb…`; original synthetic diagram, generator on the A0 branch). They are never imported; `tests/film-f1/build-preview.sh` copies them into the preview build only.

## Film A0 reuse
Reused A0's verified-media approach (fetch, size + SHA-256, duration check, blob URL), interaction model and sample. Review findings applied: A0-1 (no positive state before media verification, late responses cannot resurrect stale marks) and A0-2 (samples never in the ordinary build). Not reused: localStorage persistence (replaced by team saves) and A0's separate entry point.

## Run the preview (emulators only)
```sh
node e2e/scripts/isolated-emulator-config.mjs 127.0.0.7
REACT_APP_FIREBASE_EMULATOR_HOST=127.0.0.7 E2E_BUILD_PATH=/tmp/coach-core-film-preview bash tests/film-f1/build-preview.sh
npx --prefix e2e firebase emulators:exec --config firebase.isolated.json --project demo-coach-core-e2e --only auth,firestore,functions "<serve /tmp/coach-core-film-preview on 127.0.0.7:3000>"
FILM_HOST=127.0.0.7 node tests/film-f1/workflow.cjs chromium /tmp/film-f1-evidence
npm run build && node tests/film-f1/production-exclusion.cjs build
```

## Evidence (2026-10-23, Windows 11, Node 22.23.1, Playwright 1.64 Chromium/Firefox)
New results:
- Browser workflow `tests/film-f1/workflow.cjs`: **Chromium 31/31, Firefox 31/31** on the final build — playback, speed, keyboard, marks, tags, notes, invalid times, offline save failure, confirmed save, exact server copy, hard reload → exact reopen, revision conflict (other version preserved, "save as new"), revision 2 update, unsaved-change restore across destinations, no cross-team draft or list, tampered and missing samples blocked with stored marks unchanged, 390 px layout and five-item phone bar, another coach sees nothing, zero requests to 127.0.0.1.
- Rules (isolated emulators): **96/96** — 28 new `film-annotations` cases plus 68 existing unchanged.
- Unit: **1073/1074** — 29 new contract tests; the single failure is the known CRLF `film-int-compat` case (see below).
- Production exclusion `tests/film-f1/production-exclusion.cjs`: **9/9** on an ordinary build; control: the preview build fails all 9.
- TypeScript 0 errors; no new lint warnings in changed files.
- Existing browser specs on the default (non-Film) build: see the PR description for the counts.

Preserved existing failures (reported separately, unchanged): `film-int-compat` 1/112 under `core.autocrlf=true` (passes 112/112 from a clean LF checkout); CC-E4 test setup (Playbook tour); Functions film unit tests on Windows: 4 CRLF hash checks (pass from LF checkout) and 2 symlink-privilege errors.

## Limitations
Synthetic media only; no upload, transcoding, playback URL, retention or deletion policy for real film; marks are not linked to plays or practices yet; HTML media timing is not frame-accurate; physical devices, Safari and staging not measured; no independent review yet.
