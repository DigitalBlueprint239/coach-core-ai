# Coach Core Film Analyzer — Founder Decision Packet (D1–D10)

Prepared by Claude for Coach Drew (approval authority). 2026-10-13. Task CC-NEXT-03.

**Status of every decision: OPEN — NOT APPROVED.** Nothing in this packet is approved by inference. A decision counts as approved only when Coach Drew records it on Issue #50 (e.g. "D3: approve recommendation"). AI frame submission stays **off** regardless.

Facts marked ✔ were checked against the official pages linked in §9 on 2026-10-13. Facts marked ⚠ could not be confirmed and must not be relied on until checked.

## 1. Decision table

| # | Decision | Recommendation | Consequence if approved | Cost implication | Work it unlocks |
|---|---|---|---|---|---|
| **D1** | Send still frames of youth footage to OpenAI? | **No for the beta.** Ship text-only AI suggestions built from the coach's own tags and notes. Revisit images after D7 and D8 are settled and counsel has reviewed | AI suggestions can't "see" the frame; frame extraction is still built (preview only) | None extra. Images would add small per-frame token cost (§4) | S9 in text-only form. The image path stays built-but-disabled behind `COACH_CORE_FILM_AI_ENABLED=false` |
| **D2** | How private playback is authorized | **Signed links valid 10 minutes**, issued only to the verified team owner on each request (§3) | Anyone the coach forwards a live link to can watch for up to 10 min; no per-link revoke (§3) | +1 IAM grant (no direct cost); egress as in §4 | S4 (playback endpoint); unblocks S5 playback UI |
| **D3** | Accepted video | **MP4 with H.264 video (+ optional AAC audio), ≤ 100 MB (= 100,000,000 bytes), ≤ 5 min, ≤ 1920×1080, ≤ 20 films per team, no transcoding** | iPhone default (HEVC) uploads are rejected with "Export as Most Compatible / H.264" instructions. Some coach friction | Caps worst-case storage at ~20 GB for 10 teams (§4) | S1 rules constants, S2 reservation, S3 validator |
| **D4** | Retention | **Failed/abandoned uploads: deleted at once, swept ≤ 24 h. Frame previews: ≤ 1 h. Films: 30 days after upload, coach can delete sooner; expiry shown in the UI** | Coaches must re-upload film older than 30 days | Keeps storage bounded; the sweeper uses 1 Cloud Scheduler job (3 free per account) | S10 retention/delete jobs |
| **D5** | Billing for staging | **Approve Blaze on `coach-core-mvp-staging-239` only**, with the controls in §4: Google budget alerts at $25/$50/$100, a Firebase spend-cap budget on Cloud Functions, app-level quotas, and a separate OpenAI project with its own limit | Enables Storage, Functions, Secret Manager and Scheduler in staging | Estimated **$0–15/month infrastructure + OpenAI usage** (≤ ~$42/month at the proposed staging AI cap) (§4) | Every live test: staging smoke plan, real upload/playback, device tests |
| **D6** | FFmpeg build and license | **Build FFmpeg 9.0.2 from source, LGPL-only minimal configuration (§5)**; no `--enable-gpl`/`nonfree`. Do not use `ffmpeg-static` (GPLv3) or `ffprobe-static` (FFmpeg 4.0.2) | LGPL-2.1-or-later binary with only the MP4/H.264/AAC/MJPEG parts; much smaller attack surface | ~3–4 h extra build/CI work; no license fee | S3 validator/remux and frame extraction |
| **D7** | Upload rights and consent wording | **Adopt the text in §6** (per-upload checkbox; counsel review recommended) | Each upload records `rightsAcknowledgedAt` plus wording version. No upload without it | None | S2 reservation; UI copy in S5 |
| **D8** | Accept OpenAI's data handling for coaching text (and later images) | **Accept for text only** (✔ facts in §7). Revisit for images with D1 | Text prompts (no names, redacted) may be held up to 30 days for abuse monitoring | None | Enabling `coachAI` text tasks in staging; prerequisite for D1 |
| **D9** | Which OpenAI model | **`gpt-6.1-sol` for text tasks** (✔ exists, Structured Outputs, image-capable). Confirm the new OpenAI project lists it; `gpt-6-luna` as a cheaper fallback | Quality/cost balance; changing later is a config change (`COACH_CORE_OPENAI_MODEL`) | $2/M input, $10/M output tokens (✔) | Staging AI enablement; S9 |
| **D10** | Plays saved on a device before sign-in (legacy local data) | **Ask once per account: "Import N plays saved on this device?"**; never import automatically; remove the shared copy after a decision | No silent mixing of one coach's plays into another's account | None | S8 persistence migration path |

## 2. Size limit: one unit everywhere

**100 MB = 100,000,000 bytes** (decimal), used identically in Storage rules, the reservation check, the validator, tests and UI copy ("Max 100 MB").
- Decimal is chosen because iPhone/iPad and Mac Finder show decimal MB, so the number a coach sees on their device matches ours.
- Windows Explorer shows binary units, so a 100,000,000-byte file appears as "95.3 MB" there. The UI will reject with the exact byte count.

The earlier review docs said "100 MiB" (104,857,600 bytes); they are corrected in this PR. Boundary tests: 100,000,000 bytes accepted; 100,000,001 rejected.

## 3. Signed playback links: what they do and don't protect

- **What gives team isolation is the server's check, not the expiry.** A link is issued only after the server verifies, on that request:
  - signed in, not anonymous, verified email, live beta claim;
  - the account is not disabled or revoked;
  - the caller owns the team;
  - the film is `ready`.

  Coaches B and C can never obtain a link to coach A's film through the app.
- **A link itself is a bearer pass.** ✔ Google states anyone holding a signed URL can use it until it expires, without a Google account. The 10-minute expiry only limits how long a leaked or forwarded link works. If coach A forwards a live link, the recipient can watch for up to 10 minutes. Nothing technical prevents that, or screen recording.
- **No per-link revocation.** ✔ Google documents revocation only by rotating the signing key, which would break every outstanding link for every team. In practice:
  - **Deleting a film** removes the object, so its links stop working (expected behavior; ⚠ not stated on Google's signed-URL page, so it will be verified by test FILM-10).
  - **Revoking a coach** stops new links immediately, but a link issued in the previous ≤10 minutes keeps working until it expires.
- **Mitigations in the design:**
  - Links are signed for one object at a pinned generation, GET only.
  - Links are never stored in Firestore, logs or the service worker cache.
  - Each request is re-checked.
  - TTL can be lowered to 5 minutes at the cost of more frequent refreshes during long sessions.
- **The alternative** (cookie-authenticated same-origin proxy) checks every byte-range request and has no bearer link. It adds about 3–5 days and runs video egress through functions.

## 4. Staging cost estimate and controls

**Assumptions** (beta upper bound): 10 teams × 20 films × 100 MB = 20 GB stored; each film viewed 3× = 60 GB downloaded/month; 200 validations/month; AI text tasks only.

| Item | Unit price (✔ official) | Monthly estimate |
|---|---|---|
| Storage, `*.firebasestorage.app` bucket in us-central1/us-east1/us-west1 | No-cost 5 GB-month, then Standard ≈ $0.020/GiB-month (us-central1) | ~15 GB billable → **≈ $0.30** |
| Downloads | No-cost 100 GB/month for these buckets; then $0.12/GiB | 60 GB → **$0** (up to ~$7 if the free tier doesn't apply) |
| Upload/download operations | No-cost 5K uploads + 50K downloads/month | **$0** |
| Cloud Functions (gen 2 = Cloud Run) | Free 180,000 vCPU-s, 360,000 GiB-s, 2M requests per billing account | ~200 × 60 s validations ≈ 12,000 vCPU-s → **$0** |
| Firestore | Free 50K reads / 20K writes / 20K deletes per day, 1 GiB | **$0** |
| Cloud Scheduler | 3 free jobs per billing account, then $0.10/job/31 days | 2 jobs → **$0** |
| Secret Manager | 6 active versions + 10K accesses free | **$0** |
| Build artifacts (Cloud Build / Artifact Registry for function deploys) | ⚠ not priced here | small; **≈ $0–2** |
| **Infrastructure subtotal** | | **≈ $0–15/month** |
| OpenAI text (`gpt-6.1-sol`, $2/M in, $10/M out) | ~1.5K in + 2.5K out tokens ≈ $0.028/request | Realistic 20/day → **≈ $17/month**. Worst case at the proposed **staging cap of 50/day → ≈ $42/month** (the production default of 300/day would allow ≈ $250/month) |

Monthly estimates, not quotes. Prices vary by region and change over time. Region must be us-central1, us-east1 or us-west1 for the Storage no-cost tier (✔).

**Controls: alerts vs. enforcement**

| Control | Type | What it does |
|---|---|---|
| Google Cloud budget + alerts ($25/$50/$100) | **Alert only** | ✔ Budgets don't cap spending; reports can lag by hours |
| Firebase spend-cap budget | **Enforcement, partial** | ✔ Pauses covered services (incl. Cloud Functions for Firebase) at 100% for the rest of the month. **Does not cover Storage or Firestore** |
| App quotas (in code) | **Enforcement** | AI per-user 5/min and daily cap, global daily cap (set `COACH_CORE_AI_GLOBAL_DAILY_LIMIT=50` in staging), ≤20 films/team, 100 MB/file, 5 min, kill switches |
| OpenAI project limit | **Founder to verify** | ⚠ Set a monthly limit on the new OpenAI project; confirm in the dashboard whether it blocks requests or only notifies before relying on it |
| Automatic "disable billing" function | **Hard stop, destructive** | ✔ Stops all services, can lead to resources being deleted, and may still overshoot. **Not recommended** |

## 5. FFmpeg: exact build and remaining review

**Proposed configuration:**
- FFmpeg **9.0.2 "Lei"** (✔ latest stable on ffmpeg.org, 2026-09-18).
- Built from the official source tarball with checksum and signature verified, in CI, statically linked, and checked into the functions deploy as a pinned binary with its SHA-256 recorded.

```
./configure --disable-everything --disable-autodetect --disable-network \
  --disable-doc --disable-ffplay --enable-ffmpeg --enable-ffprobe \
  --enable-protocol=file --enable-demuxer=mov \
  --enable-muxer=mp4,image2 --enable-decoder=h264,aac --enable-encoder=mjpeg \
  --enable-parser=h264,aac --enable-bsf=h264_mp4toannexb \
  --enable-swscale --enable-filter=scale,crop,format \
  --enable-static --disable-shared --enable-small
# deliberately NOT: --enable-gpl, --enable-version3, --enable-nonfree, libx264/x265
```

**License:**
- ✔ FFmpeg is LGPL-2.1-or-later by default. GPL applies only with `--enable-gpl` or GPL libraries (notably libx264). `--enable-nonfree` makes a build unredistributable.
- ✔ The native H.264 decoder, the MOV/MP4 demuxer and muxer, and the MJPEG encoder are LGPL.
- Result: an LGPL-2.1-or-later binary that can decode only the formats we accept.

**Rejected options:**
- `ffmpeg-static` 5.3.0: ✔ GPL-3.0-or-later, full-feature johnvansickle builds.
- `ffprobe-static` 3.1.0: ✔ ships FFmpeg 4.0.2 from 2018, with an unknown build license.

**Pure-JS parser:** `mp4box` 2.4.1 (✔ BSD-3-Clause) for the first validation pass.

**Remaining review before S3 merges:**
1. Counsel confirms LGPL obligations for server-side use. We host it and don't distribute it, but keep the notice and source offer anyway. This is not legal advice.
2. Security check of the 9.0.2 advisories at build time.
3. Confirm the `scale`/`crop`/`format` filters and libswscale are LGPL in that release (⚠ expected; verify in `configure --list-filters` output with `--enable-gpl` absent).
4. Reproducible build log and binary hash committed with S3.

## 6. Proposed consent wording (D7)

Counsel review is recommended; this is not legal advice. The wording is versioned (`rights-v1`) and stored with each upload.

**Upload checkbox (required on every upload):**

> I confirm that:
> 1. I, my team, or my organization owns this video or has permission to upload it to Coach Core for coaching review.
> 2. The people shown — and, for anyone under 18, their parent or guardian — have been informed of and agreed to this use under our league, school, or club media policy.
> 3. This video does not show anyone in a private setting (for example, a locker room) and does not include medical or other sensitive information.
> 4. I understand Coach Core keeps this video private to my team account and deletes it 30 days after upload, or sooner if I delete it.

**AI image consent (shown only if D1 is approved later; per frame, opt-in, default unchecked):**

> Send this one still image to our AI provider, OpenAI, for coaching suggestions? It may show people who can be identified. OpenAI does not use this data to train its models by default and may keep it for up to 30 days for abuse monitoring. Only continue if your team's consent policy allows it.

## 7. OpenAI facts verified (2026-10-13)

✔ confirmed on the official pages:
- **Training:** API data is not used for training unless the organization opts in.
- **Abuse monitoring:** logs are kept up to 30 days.
- **Zero Data Retention / Modified Abuse Monitoring:** require OpenAI's prior approval. Even then, images are scanned for CSAM, and flagged images are retained for review.
- **Stored responses:** kept 30 days when stored. Our code sends `store: false` explicitly (⚠ the documented default value of `store` was not confirmed, which is why we set it).
- **Data residency:** US processing is available; other regions have conditions.
- **Models:** `gpt-6-astra`, `gpt-6.1-sol` and `gpt-6-luna` exist. All accept image input and support the Responses API and Structured Outputs. Per 1M tokens:

  | Model | Input | Output |
  |---|---|---|
  | `gpt-6-astra` | $10 | $50 |
  | `gpt-6.1-sol` | $2 | $10 |
  | `gpt-6-luna` | $0.10 | $0.50 |

- **Usage policies:** extra protection for minors; prohibits facial recognition databases without consent and classifying people by biometric data. Our prompts forbid identifying people.

Founder check (D9): the new OpenAI project must list the chosen model before AI is enabled.

## 8. Not yet decidable (needs input beyond this packet)

- Real rights-cleared sample footage for device tests. Synthetic test-pattern video covers engineering until then.
- Acceptable AI error tolerance for suggestions (product owner).

## 9. Sources

- Storage, Firebase and Cloud pricing:
  - Firebase pricing: https://firebase.google.com/pricing
  - Cloud Storage pricing: https://cloud.google.com/storage/pricing
  - Cloud Run pricing: https://cloud.google.com/run/pricing
  - Cloud Scheduler pricing: https://cloud.google.com/scheduler/pricing
  - Secret Manager pricing: https://cloud.google.com/secret-manager/pricing
  - Firestore pricing: https://cloud.google.com/firestore/pricing
- Budgets and caps:
  - Budgets: https://docs.cloud.google.com/billing/docs/how-to/budgets
  - Firebase "avoid surprise bills": https://firebase.google.com/docs/projects/billing/avoid-surprise-bills
  - Disable billing with notifications: https://docs.cloud.google.com/billing/docs/how-to/disable-billing-with-notifications
- Signed URLs:
  - Overview: https://docs.cloud.google.com/storage/docs/access-control/signed-urls
  - Signing helpers: https://docs.cloud.google.com/storage/docs/access-control/signing-urls-with-helpers
- Hosting cookies (`__session`): https://firebase.google.com/docs/hosting/manage-cache
- OpenAI:
  - Data controls: https://developers.openai.com/api/docs/guides/your-data
  - Models: https://developers.openai.com/api/docs/models
  - Vision: https://developers.openai.com/api/docs/guides/images-vision
  - Usage policies: https://openai.com/policies/usage-policies/
- FFmpeg:
  - Legal: https://www.ffmpeg.org/legal.html
  - License: https://github.com/FFmpeg/FFmpeg/blob/master/LICENSE.md
  - Download page (9.0.2): https://ffmpeg.org/download.html
- npm packages:
  - `ffmpeg-static`: https://www.npmjs.com/package/ffmpeg-static
  - `ffprobe-static`: https://github.com/joshwnj/ffprobe-static
  - `mp4box`: `npm view mp4box` → 2.4.1, BSD-3-Clause
