# Staging Smoke-Test Plan (Claude, Day 3)

**Not authorized to run yet.** This plan executes only after the founders approve:
- the staging project `coach-core-mvp-staging-239` on Blaze with a budget alert;
- a fresh OpenAI key placed in Secret Manager by a founder;
- the deploy itself.

Production project `coach-core-ai` is never used.

## 0. Preconditions (all must be true; record who confirmed each)

1. PR #49 plus the film/persistence slices are reviewed and merged to recovery. The combined regression R1–R14 passes on the exact SHA being deployed.
2. Founder actions from PR #49 report §6 are done:
   - old keys checked or rotated;
   - web keys restricted;
   - staging auth = Google + email link, **Anonymous OFF**, authorized domains set.
3. Any old HTTP `cleanupOldNotifications` is deleted from staging. The Storage→Firestore cross-service permission and the signed-URL `signBlob` permission are approved and granted.
4. `COACH_CORE_AI_ENABLED=false` and `COACH_CORE_FILM_AI_ENABLED=false` at first deploy; AI is enabled only for section 4.
5. **Test data is synthetic only:**
   - Generated test-pattern MP4s (`ffmpeg -f lavfi -i testsrc…`), or founder-owned footage with no minors.
   - No real roster or player names.

## 1. Accounts

| Account | State | Purpose |
|---|---|---|
| Coach A | Google, verified, `beta` granted | Primary workflows |
| Coach B | Email link, verified, `beta` granted | Cross-team attempts |
| Coach C | Verified, **no** beta | Gate check |
| Coach D | Password account with unverified email, created via the Admin SDK in staging only | Verification gate |
| Anonymous | `signInAnonymously` attempted from the browser console | Must fail (provider disabled) or be signed out |

## 2. Authentication (desktop Chrome + iPad Safari)

| ID | Step | Expected |
|---|---|---|
| AUTH-01 | Open the staging URL signed out | Sign-in screen only; no coaching UI or data requests |
| AUTH-02 | Coach A signs in with Google | Dashboard loads; reload keeps the session |
| AUTH-03 | Coach B uses an email link on the same device, and again opened on a second device | Signed in; the second device asks to confirm the email |
| AUTH-04 | Coach C signs in | "Waiting for beta access"; grant beta via script → "Check again" → dashboard |
| AUTH-05 | Coach D signs in | "Verify your email" |
| AUTH-06 | Anonymous attempt from the console | Error or immediate sign-out; no data |
| AUTH-07 | Revoke Coach B with the script while B is signed in | B returns to sign-in within ~1 h for data and **immediately** for AI calls (`session-revoked` / `beta-access-required`) |
| AUTH-08 | Coach A signs out on a shared tablet; Coach B signs in | **UI/account isolation:** B sees no A team, drafts, plays, plans or cached responses, and cannot read or write A's data (rules). **Amended 2026-10-14 (#61):** A's own scoped recovery drafts (`coachcore:v1:<A>:*`) and the quarantined legacy `offline_operations` bytes **remain on the device by design** (agreed draft-retention contract; no deletion of legacy data). This is same-origin plaintext storage: anyone with DevTools on that device can read it. **Proposed** as an accepted private-beta risk (Claude's recommendation, **not yet a recorded Coach Drew decision**); until he records it, report their presence as a finding rather than a pass/fail criterion. `currentTeamId` must be cleared |

## 3. Team isolation (scripted with the Firebase Web SDK in the console, as Coach B)

| ID | Attempt | Expected |
|---|---|---|
| ISO-01 | Read A's team, plays and practice plans by ID | `permission-denied` |
| ISO-02 | Query plays with `teamId == A` | `permission-denied` |
| ISO-03 | Write a play into A's team, or change own play's `teamId` to A | denied |
| ISO-04 | Upload to `teams/{A}/files/` or `quarantine/{A}/…` | denied |
| ISO-05 | Call `coachAI` / film callables with A's `teamId` | `team-access-denied` |
| ISO-06 | Request a playback URL for A's film | denied; no URL in the response |
| ISO-07 | Link B's clip to A's practice plan | denied |

## 4. Coaching workflows (Coach A)

| ID | Step | Expected |
|---|---|---|
| COACH-01 | Create team | Appears; owner-only |
| COACH-02 | Draw a play, drag players, undo/redo, save; reload | Identical after reload |
| COACH-03 | Enable `COACH_CORE_AI_ENABLED` (staging only). Generate a 10U 60-minute practice plan | Structured plan shown with the privacy notice; durations add up or a warning is shown |
| COACH-04 | Edit the plan, save, reload, reopen | Identical; a second-tab edit gives a conflict, not an overwrite |
| COACH-05 | Drill recommendations and assistant question | Structured responses; limitations shown |
| COACH-06 | Exceed the per-minute quota | Friendly quota message; no extra OpenAI calls (check usage) |
| COACH-07 | Set `COACH_CORE_AI_ENABLED=false` | "AI is turned off"; Playbook and saved plans still work |

## 5. Film acceptance (Coach A; desktop Chrome, iPad Safari, Android Chrome tablet)

| ID | Step | Expected |
|---|---|---|
| FILM-01 | Upload a valid synthetic H.264 MP4 (≤100 MB = 100,000,000 bytes, ≤5 min) | Progress shown → validating → ready; GPS/metadata absent in the stored object (check with `ffprobe` from an admin machine) |
| FILM-02 | Upload a corrupt file, HEVC (if D3 rejects it), >100,000,000 bytes, >5 min, or a `.mov` renamed `.mp4` | Rejected with a clear message; nothing playable; quarantine emptied |
| FILM-03 | Cancel mid-upload, then retry | No false "Saved"; retry works; orphan removed by the sweeper ≤24 h |
| FILM-04 | Play, seek, change speed, step by time | Smooth on all three devices; range requests return 206 |
| FILM-05 | Copy the playback URL; open after 11 minutes, and in a signed-out browser | Expired → 403. Within 10 min it works (documented bearer limitation, D2) |
| FILM-06 | Mark start/end; tag formation/down/distance/result/notes; save; hard reload; new session | Identical markers and tags |
| FILM-07 | Link the clip to a saved play and to the saved practice plan; follow the links back | Links resolve; deleting the target shows "unavailable" without breaking the film |
| FILM-08 | Frame preview (with film AI on, only if D1 allows) → approve → suggestion → edit, then reject | Suggestion marked AI with uncertainty; manual tags unchanged until accepted |
| FILM-09 | Film AI off, or provider timeout | Manual review fully works; clear message |
| FILM-10 | Delete the film | Gone from the library; URL issuance fails at once; Storage objects removed |

## 6. Platform and security checks

| ID | Check | Expected |
|---|---|---|
| SEC-01 | Response headers on `/` | nosniff, `X-Frame-Options: DENY`, HSTS, referrer, permissions, COOP, `noindex`, CSP report-only. Record CSP reports, then promote to enforcing |
| SEC-02 | Download the deployed JS bundle; grep for provider hosts, key shapes, signed-URL hosts | None |
| SEC-03 | `firebase functions:list` | Only expected functions; only `healthCheck` is public HTTP; `coachAI` is the only function with the OpenAI secret |
| SEC-04 | Deployed rules match the repository | Diff the console rules against `firestore.rules` and `storage.rules` at the deployed SHA |
| SEC-05 | Function logs during the run | No prompts, keys, signed URLs, emails or frames logged |
| SEC-06 | Billing/usage after the run | Within budget; OpenAI usage matches the request count |
| SEC-07 | Call `coachAI` (preflight + POST) from an **unlisted** origin, e.g. a page on `http://localhost:8000` | Refused by CORS (no `access-control-allow-origin` for that origin). **Not testable in the emulator**, which allows any origin (`enableCors` debug flag) |
| SEC-08 | Call `coachAI` with a syntactically valid but **forged/unsigned** ID token | `unauthenticated` (`sign-in-required`). **Not testable in the emulator** (`skipTokenVerification`) |
| SEC-09 | Gateway from the staging site with `COACH_CORE_ALLOWED_ORIGINS` set | Works. The param is a **JSON array** in `.env.<project>`, e.g. `["https://coach-core-mvp-staging-239.web.app","https://coach-core-mvp-staging-239.firebaseapp.com"]`; a bare URL fails to parse and refuses every origin (found by E2E harness, 2026-10-13) |
| SEC-10 | Spend controls exist before any test traffic | OpenAI staging project hard limit ($50) enforced; Firebase spend cap ($20, Cloud Functions) **Configured**; budget alerts $25/$50/$100 — recorded as *alerts*, not caps (Founder Decision Packet §4) |

## 7. Exit and rollback

**PASS:** every row passes on all listed devices, with screenshots or recordings and the SHA recorded in `docs/security/STAGING_SMOKE_RESULTS.md`.

**Any FAIL in AUTH, ISO, SEC or FILM-05/10 means NO-GO:**
- set both AI flags false;
- redeploy the previous rules/functions SHA (`firebase deploy --only firestore:rules,storage,functions --project coach-core-mvp-staging-239` from the prior tag);
- open an issue with the redacted evidence.

Nothing in this plan touches `coach-core-ai` (production).
