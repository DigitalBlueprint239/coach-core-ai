# Film Analyzer — Security & Backend Review (Claude, Day 3)

| | |
|---|---|
| Reviewed | `docs/FILM_ANALYZER_MVP_SPEC.md` on PR #51 (`codex/issue-50-film-plan`), Issue #50 |
| Builds on | PR #49 (`claude/day2-security-gateway` @ `341e95b`, unmerged, preserved unchanged) |
| Date | 2026-10-13 |
| Status | **Design review only.** No film code, rules, deploy, live config, paid resource or real key. MVP **NO-GO**. |

## 1. Verdict

Codex's spec is careful and correct on the essentials:
- the server assigns IDs and paths;
- uploaded video sits in quarantine until the server validates it;
- the server owns film status;
- no bearer URLs are persisted;
- the frame job accepts only a timestamp from the client, never an image;
- AI drafts are kept separate from the coach's manual tags;
- retention uses tombstones;
- everything is tested against demo emulators.

I accept it as the base design **with the required changes in §3** and **ten founder decisions in §6**. Three of those decisions change scope or timeline: D1 (youth frames to OpenAI), D2 (how playback is authorized) and D3 (accepted video formats).

| Spec area | Verdict | Change required |
|---|---|---|
| Owner-only tenancy | **Accept** | Confirmed on #39; same model as PR #49 |
| Upload reservation + quarantine | **Accept with changes** | Storage rule binds the upload to the reservation document (§3.1); client never reads quarantine |
| Validation worker | **Accept with changes** | Parse the container with a pure-JS parser first; remux with `faststart` and **strip metadata (GPS/location)**; pin the decoder; no shell (§3.3) |
| Private playback | **Change** | Recommend short-lived (≤10 min) V4 signed URLs issued per request after live checks, not a cookie proxy, for the MVP timeline (§3.4, D2) |
| Selected-frame extraction | **Accept with changes** | Preview returned inline (no URL); frames server-only; explicit coach approval recorded server-side (§3.5) |
| OpenAI frame suggestions | **Accept behind a flag** | Additive `coach-ai.v1` task; `detail: "low"`; ≤768 px; no confidence %; youth-image policy is founder decision D1 (§3.6) |
| Retention/deletion | **Accept** | Values pending D4; add a Storage lifecycle backstop (live config, founder) |
| Data model / API | **Accept with changes** | Separate `coach-film.v1` contract; revision-checked clip edits; rules-verified same-team links (§4) |
| Limits (MP4/H.264, 100 MB (100,000,000 bytes), 5 min, 1080p) | **Founder decision D3** | iPhones record HEVC by default, so H.264-only will reject many coach uploads without conversion |
| Costs / FFmpeg licensing | **Founder decisions D5, D6** | — |

## 2. Threat model (film-specific)

| Threat | Control |
|---|---|
| Coach B reads, lists or plays coach A's film | Firestore rules owner-only; Storage client read **denied** on `films/` and `frames/`; signed URL issued only after live identity + ownership check |
| Long-lived bearer link leaks (Firebase download token) | Client never gets read permission on film objects, so `getDownloadURL` is impossible. Server copies strip `firebaseStorageDownloadTokens`. URLs are never stored in Firestore, logs or the service worker cache (PR #49's SW already ignores cross-origin requests) |
| Malicious or oversized upload (decoder exploit, zip-bomb-style container, DoS) | Size/type ceiling in rules; quarantine unreadable; pure-JS container parse before any native decode; pinned decoder with argument array, `-protocol_whitelist file`, CPU/time/memory caps; one worker per object generation |
| Client marks its own upload "ready" or edits dimensions/owner | Film documents are server-write-only |
| Location/identity leakage in video metadata | Remux with `-map_metadata -1` (drops GPS/device tags) before promotion |
| Minors identifiable in frames sent to OpenAI | Feature flag; explicit per-frame approval; downscale; founder policy D1/D7; no names or roster sent; prompt forbids identifying people |
| Prompt injection via text visible in a frame | Server-owned instructions; image text treated as untrusted; structured output only; no tools; output never overwrites manual tags |
| Cost blow-up (storage, egress, decode, AI) | Per-team clip cap, per-user and global AI frame quotas, decoder caps, budget alerts (founder) |
| Stale access after revoke/delete | Signed URL ≤10 min. A deleted film is tombstoned and blocks new URLs at once. Revoked beta claims cut AI immediately (live record) and rules within ≤1 h (token refresh) |

## 3. Required design changes

### 3.1 Upload

1. **`reserveFilmUpload`** (callable):
   - Checks: live beta identity (same `assertBetaIdentity` as `coachAI`), team owned, team clip cap not reached, `rightsAcknowledged === true`.
   - Creates `teams/{teamId}/films/{filmId}` with `status: 'uploading'`, `createdBy`, `reservationExpiresAt = now + 30 min`, and declared `bytes` ≤ limit.
   - Returns `{filmId, uploadPath: "quarantine/{teamId}/{filmId}/source.mp4", expiresAt}`.
2. **Storage rule for `quarantine/{teamId}/{filmId}/source.mp4`**, create only. It requires:
   - `resource == null` (no overwrite);
   - a beta user who owns the team;
   - a film document that exists with `status == 'uploading'`, `createdBy == request.auth.uid` and `request.time < reservationExpiresAt`;
   - `0 < size ≤ 100,000,000 bytes (100 MB)` and `contentType == 'video/mp4'`.

   Read, update and delete are denied to clients. Resumable upload (`uploadBytesResumable`) works under these rules.
3. **`abandonFilmUpload`** lets the coach cancel; the sweeper also expires reservations. A stuck reservation never shows as "Saved".

### 3.2 Firestore metadata

Client may read only; **all film-document writes are server-side**. Clients write clips and links with strict rules (§4.2).

### 3.3 Validation worker (`onObjectFinalized`, quarantine prefix only)

- Gen 2, `concurrency: 1`, `maxInstances: 2`, 2 GiB memory, 300 s timeout, no secrets bound.
- **Step 1, pure-JS parse** (e.g. `mp4box`, BSD-3; to be pinned and audited). Checks, all of which must pass before any native decode:
  - ISO-BMFF brand;
  - exactly one H.264 video track and at most one AAC audio track;
  - duration ≤ limit and dimensions ≤ limit;
  - no extra/unknown tracks (subtitle, data or timed-metadata tracks);
  - bytes match the reservation.
- **Step 2, pinned `ffprobe`** cross-check, run with an argument array: `-v error -protocol_whitelist file -show_streams -show_format`, plus a wall-clock kill.
- **Step 3, remux without transcoding:** `ffmpeg -nostdin -protocol_whitelist file -i in -map 0:v:0 -map 0:a:0? -c copy -map_metadata -1 -movflags +faststart out.mp4`. This strips GPS/device metadata and enables progressive playback.
- **Step 4, promote atomically:** write `films/{teamId}/{filmId}/v1.mp4` (server only, no download token), then set `status: 'ready'` with server-measured `durationMs`, `width`, `height`, `codec`, `objectGeneration` and `expiresAt`. Delete the quarantine object.
- **Rejection:** `status: 'rejected'` with a safe `errorCode` (`unsupported_codec`, `too_long`, `too_large`, `corrupt`, `unexpected_streams`). Quarantine is deleted immediately.
- **Idempotent:** keyed on object generation, so re-delivery and retries are safe and a later generation never revives an older one.

### 3.4 Playback: recommendation for D2

| Option | Security | Build cost | Notes |
|---|---|---|---|
| **A. V4 signed URL, ≤10 min, per request** (recommended) | Bearer capability until expiry. Issued only to a verified owner, never persisted, single object, GET only | ~4 h | Native range streaming; works with `<video>`. Needs a live IAM change: the function service account needs `iam.serviceAccounts.signBlob`, so the founder must approve |
| B. Same-origin range proxy with `__session` cookie | Strongest (per-request check) | +3–5 days | Firebase Hosting forwards only the `__session` cookie to functions; needs a session-cookie flow, CSRF protection and egress through functions |
| C. `getBlob` via Storage SDK | Rules-enforced per fetch | ~2 h | Downloads the whole file into memory (up to 100 MB on a tablet). Requires client read on `films/`, which re-opens `getDownloadURL` tokens; **rejected** |

**Acceptance interpretation for Issue #50's "unauthorized video URLs not exposed" (needs founder sign-off):**
- No URL is ever issued to a non-owner, anonymous or non-beta caller.
- No URL is stored or logged.
- URLs expire in ≤10 minutes.
- Unsigned or expired requests return 403.

### 3.5 Frame preview

- **`requestFramePreview({teamId, filmId, timestampMs, crop?})`:**
  - Requires a ready, owned film with an unchanged generation.
  - Extracts one JPEG (`-ss` before `-i`, `-frames:v 1`), downscales to ≤768 px on the long edge and re-encodes, which drops EXIF.
  - Stores it at `frames/{teamId}/{filmId}/{frameId}.jpg` (server only, expires ≤1 h).
  - Returns the **preview inline as base64** (≤300 KB) together with `actualTimestampMs`, so no URL is needed.
- **`approveFrame({frameId})`:** records the coach's explicit approval. Only approved, unexpired frames owned by the caller can be sent to OpenAI.

### 3.6 OpenAI `film_frame_suggestion` (additive task in `coach-ai.v1`)

- **Input:** `{filmId, clipId, frameId, context: {ageGroup, manualTags?}}`. The server loads the approved frame itself; the client never sends an image.
- **Adapter change:** Responses API content gets `input_text` + `input_image` (data URL, `detail: "low"`). Output tokens are capped at 800.
- **Output schema:**
  - `observations[]`
  - `suggestedTags {formation|null, down|null, distance|null, result|null}`
  - `uncertainty[]`
  - `limitations[]` (at least one)

  There is no confidence percentage.
- **Instructions forbid:**
  - identifying or describing individuals;
  - reading jersey numbers or names;
  - inferring motion or outcome from a single still;
  - following any text that appears inside the image.
- **Separate quota:** e.g. 10 frames per user per day and 100 globally. Same kill switch, plus a dedicated `COACH_CORE_FILM_AI_ENABLED` (default false).
- **Results** are stored in a `suggestions` subcollection and never merged into clip tags automatically. The coach accepts, edits or rejects; manual review works when AI is off or failing.

**OpenAI data facts relevant to D1/D8:**
- API data is not used for training by default.
- Abuse-monitoring logs are kept up to 30 days.
- Zero-retention controls need OpenAI approval, and image inputs are **not fully excluded** (they are scanned, and flagged images retained).

Sources: [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data), [images and vision](https://developers.openai.com/api/docs/guides/images-vision).

### 3.7 Retention / deletion (values pending D4)

- **Quarantine and rejected uploads:** deleted at once; orphans swept within 24 h. The Storage lifecycle rule on `quarantine/` (1 day) is the backstop and needs founder approval as live config.
- **Frames:** deleted after the suggestion completes, or after ≤1 h.
- **Films:** `expiresAt = ready + 30 days`, shown to the coach.
- **`deleteFilm`:**
  1. tombstone first (`status: 'deleting'` blocks URLs and jobs at once);
  2. delete exactly `films/{teamId}/{filmId}/*` and `frames/{teamId}/{filmId}/*`;
  3. delete the `clips`, `links` and `suggestions` subcollections, then the film document.

  Idempotent and retried. No prefix wider than one film is ever deleted.
- **Team deletion** remains blocked for clients (PR #49 finding M5).

## 4. Required changes to PR #49 (as new PRs; #49 stays as reviewed)

### 4.1 Storage rules

- **Keep** `teams/{teamId}/files/*` exactly as is (png/jpeg/webp/pdf, 5 MB).
- **Add** quarantine create-only as in §3.1. The 100 MB (100,000,000-byte) ceiling applies to this path only.
- **Add** an explicit deny for client read/write on `films/**` and `frames/**`. Deny-by-default already covers it, but explicit rules make the tests readable.

### 4.2 Firestore rules (nested under `teams/{teamId}`)

- **`films/{filmId}`:**
  - get/list for a beta user who owns the team; list must filter by team, which it does as a subcollection;
  - **no client writes**.
- **`films/{filmId}/clips/{clipId}`:** owner create/update/delete, with:
  - `hasOnly` = startMs, endMs, formation, down, distance, result, notes, revision, createdBy, createdAt, updatedAt;
  - `0 ≤ startMs < endMs ≤ film.durationMs` (via `get()`), and film status `ready`;
  - `down` null or 1–4; `distance` null or 0–100;
  - string caps of 80/120/2000;
  - create with `revision == 1`; update requires `revision == resource.revision + 1` (optimistic concurrency);
  - `createdBy` and `createdAt` immutable.
- **`.../clips/{clipId}/links/{linkId}`:** create/delete only, `kind in ['play','practicePlan']`. The target must exist and `get(target).data.teamId == teamId`, so cross-team links are impossible.
- **`.../clips/{clipId}/suggestions/{sid}`:** owner read. The owner may update only `reviewState` (`accepted|edited|rejected`) and `reviewedAt`; the AI output itself is immutable.
- **`practicePlans` allowlist for editable AI plans:** add `safetyConsiderations` (list ≤20), `aiRequestId` (string ≤64) and `revision` (int). Warm-up and cool-down map into `periods` with a `kind` field. Rules don't validate inside list items, so the adapter must.
- **`plays`:** add `revision` for conflict detection when Playbook cloud persistence lands (§5).

### 4.3 Functions and gateway

- New callables use the `coach-film.v1` envelope: `{schemaVersion, op, teamId, ...}`, strict zod, same error style as `coach-ai.v1`.
- The gateway gains the `film_frame_suggestion` task (§3.6). The adapter gains image content. Text tasks are unchanged and existing clients unaffected.
- No new secret. Frame and worker functions don't bind the OpenAI key; only `coachAI` does.

### 4.4 CI

- About 25 new rules-emulator cases (owner, foreign, anonymous and non-beta × films/clips/links/suggestions/quarantine), plus boundary cases at 100,000,000 and 100,000,001 bytes and the reservation expiry.
- Worker tests generate **synthetic, rights-free MP4s at test time**: `ffmpeg -f lavfi -i testsrc`, H.264 and HEVC variants, too long, too large, corrupt/truncated, extra data track, GPS metadata present. These are written to a temp dir and never committed.
- Bundle scan gains: no `storage.googleapis.com` signed-URL strings and no `firebaseStorageDownloadTokens` in shipped JS.

## 5. Shared-device Playbook persistence & editable practice plans (coordination with Codex)

**Current state:**
- Main `SmartPlaybook.tsx` stores all plays in a global `localStorage['smartPlaybook_plays']`, not keyed by user.
- Standalone uses a global `coachcore-playbook`, which is acceptable for a standalone app with no accounts, but not once integrated.
- `PracticePlanner.tsx` (PR #49) shows AI plans but cannot save or reopen them.

**Security requirements** (Codex implements in `src/services/firestore.ts`, `SmartPlaybook.tsx`, `PracticePlanner.tsx`; Claude reviews and owns the rules):
1. For signed-in coaches, the **source of truth is Firestore** (`plays`, `practicePlans`, already owner-only in PR #49). Local storage is only an unsynced-draft buffer, keyed `coachcore:v1:{uid}:…`.
2. Never read another user's keys. On sign-out:
   - if unsynced drafts exist, warn and offer "sync now";
   - then remove that user's keys; **(superseded 2026-10-14: the agreed contract keeps the signed-out coach's own uid+team-scoped recovery drafts on the device, never shown to another account; see PERSISTENCE_CONTRACT §4 and smoke AUTH-08)**
   - the offline queue (`offline_operations`) becomes per-user, and replay checks that the queued `uid` equals the current user.
   - **Amended 2026-10-14 (#59/#61):** the legacy global `offline_operations` queue is now **quarantined** (never replayed) and **preserved byte-for-byte** on sign-out; current editors use uid+team+writer-scoped recovery drafts instead. If replay is ever re-enabled, it must be per-user with owner/team checks, because the legacy array can hold entries from more than one account on a shared device.
3. The legacy global `smartPlaybook_plays` is **never auto-imported**. On first sign-in after the upgrade, the coach is asked once: "Import N plays saved on this device into your account?" Then the global key is removed. **(Superseded by D10, approved 2026-10-13: originals are preserved byte-for-byte; no deletion.)**
4. **Editable practice plan:** AI result → adapter → `practicePlans` (`source: 'ai'`, `aiRequestId`) → edit → save (`revision`) → reopen identical → link to a film clip. Stale revision gives a conflict UI, never a silent overwrite.
5. **Tests** (Codex, run against the emulator rules):
   - user A's drafts are invisible to user B on the same browser profile;
   - sign-out clears only the signed-out user's keys;
   - the import prompt appears once;
   - save → reload → reopen is byte-identical;
   - a conflict on concurrent edit is detected;
   - a link to another team's plan is denied.

## 6. Founder decisions required

| # | Decision | Recommendation | Blocks |
|---|---|---|---|
| D1 | Send youth game frames to OpenAI at all in the beta? | **Default off.** Build the text-only path first: suggestions from the coach's manual tags and notes through the existing safe gateway. Enable images only after D7 consent policy, per-frame approval, ≤768 px, and D8 accepted | S9 |
| D2 | Playback authorization: signed URL ≤10 min vs cookie proxy | **Signed URL** with the §3.4 acceptance interpretation | S4 |
| D3 | Formats/limits | MP4 H.264/AAC, ≤100 MB (100,000,000 bytes), ≤5 min, ≤1080p, ≤20 films per team, no transcoding in the MVP, with clear "export as H.264/Most Compatible" guidance. Alternative: accept HEVC (Safari plays it; Chrome support varies), which needs a transcode later | S1, S3 |
| D4 | Retention | 24 h orphans; frames ≤1 h; films 30 days; coach can delete any time | S10 |
| D5 | Blaze + budget for **staging only** | Approve with alerts and the app quotas above. Storage, Functions, Scheduler and egress are billable | All live testing |
| D6 | FFmpeg build/licensing | Counsel review of the exact binary (GPL vs LGPL build); server-side use only, not redistributed. This is not legal advice | S3 |
| D7 | Rights/consent text at upload; policy for footage of minors | Coach attests rights + league/guardian consent; synthetic or no-minor footage in the beta | S2, S9 |
| D8 | OpenAI data controls acceptable (30-day abuse logs; images not fully ZDR-excluded)? | Decide before D1 is turned on | S9 |
| D9 | Model ID for image suggestions | Confirm access in the new OpenAI project | S9 |
| D10 | Import of legacy local plays | One-time explicit prompt (§5.3) | S8 |

## 7. Smallest reviewable implementation slices

Each slice is a separate PR to recovery with its own tests. **No slice deploys.** Estimates are engineer-hours, not promises.

| Slice | Owner | Depends on | Est. | Exit test |
|---|---|---|---|---|
| S1 Film Firestore/Storage rules + emulator tests | Claude | D3 values (rules read limits from constants) | 4–6 h | ~25 new emulator cases + existing 30 green |
| S2 `reserveFilmUpload` / `abandonFilmUpload` | Claude | S1, D7 text | 5–7 h | Mocked + emulator tests: foreign team, expired reservation, cap, idempotency |
| S3 Validation worker (parse → probe → remux/strip → promote) | Claude | S2, D6 | 10–14 h | Synthetic fixture matrix (§4.4), generation race, timeouts |
| S4 Playback URL callable | Claude | S3, D2 | 3–5 h | Non-owner/anonymous/non-beta denied; expiry; tombstone blocks; no logging of URLs |
| S5 Film UI: library, upload progress, player, markers, tags | Codex | S1–S4 contracts (can start against emulator mocks now) | 12–18 h | Unit + browser tests; desktop + tablet emulation |
| S6 Clip save/reopen + revisions + links | Codex UI / Claude rules (in S1) | S5 | 8–12 h | Reload-identical; conflict UI; cross-team link denied |
| S7 Editable AI practice-plan save/reopen | Codex | PR #49 merged; rules allowlist (+1 h Claude) | 6–9 h | Save → reload → identical; revision conflict |
| S8 Playbook cloud persistence + per-user drafts + sign-out | Codex, Claude review | PR #49 merged, D10 | 6–9 h | §5.5 tests |
| S9 Frame preview + `film_frame_suggestion` (flagged) + review UI | Claude backend / Codex UI | S3, D1, D8, D9 | 8–12 h + 6 h | Mock-provider tests; no call without approval; refusal/timeout; edit/reject |
| S10 Retention sweeper + `deleteFilm` | Claude | S3, D4 | 4–6 h | Exact-prefix deletion; tombstone; retry idempotency |
| S11 Combined regression + staging smoke | Both | All above + approvals | 12–16 h | `COMBINED_REGRESSION_PLAN.md`, `STAGING_SMOKE_TEST_PLAN.md` |

Claude backend total is about 38–56 h, consistent with Codex's 88–134 h total estimate. S1, S2 and S5 can start in parallel once D3 and D7 are answered. S9 is the only slice that depends on the youth-image decision.

## 8. Status (PASS / FAIL / BLOCKED)

| Gate | Status | Evidence |
|---|---|---|
| F-01..F-04 security fixes (code) | **PASS, unmerged** | PR #49 CI: rules 30/30, functions 69/69, web 21/21, bundle 10/10 |
| Security gates on a live environment | **BLOCKED** | Founder actions (PR #49 report §6) |
| Film Analyzer implementation | **FAIL (not implemented)** | Codex inventory, PR #51; confirmed by review |
| Film security design | **PASS with required changes** | This document §3–§4 |
| Shared-device Playbook persistence | **FAIL** | Global `smartPlaybook_plays`; S8 |
| Editable practice-plan save/reopen | **FAIL (not implemented)** | S7 |
| Playbook PR #2 | **PARTIAL** | Type/unit/canary/audit reproduced PASS; browser suite intermittent on Linux Chromium (see `COMBINED_REGRESSION_PLAN.md`) |
| PR #40 test repair | **BLOCKED (unmerged)** | `FieldMemo` suite still fails to load on recovery |
| Staging smoke tests | **BLOCKED** | No approved environment (D5) |
