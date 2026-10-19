# Film Analyzer — final owner decision sheet

2026-10-19. **For review, not blanket adoption or activation.** Previously settled D1–D9 directions are preserved. Every detailed term below is **PROPOSED / UNAPPROVED** unless already established by the founder scope. This sheet does not replace the reconciliation or claim to recover its missing approval payload. No historical search repeated.

Preserved: Film is MVP-required; OpenAI-only backend; no browser AI keys or youth PII by default; private team ownership; coach verification and honest uncertainty; manual workflow when AI is off. Reviewer remains review-only. No spending, deployment, accounts, footage or provider calls authorized. MVP NO-GO.

## Exact proposed terms — all UNAPPROVED

| Item | Proposed term, not an approval |
|---|---|
| D1 / D8 image boundary | Youth or mixed/unknown-age footage: no images to OpenAI in beta; use redacted coach tags/notes anchored to the approved preview. Build the image capability disabled. Adult-only footage: later allow one sanitized, explicitly approved frame only after documented rights/consent and account data-control review. Synthetic: later allow non-identifying, wholly synthetic frames with recorded origin; no real-person likeness/PII or youth-derived frame. Both adult and synthetic provider use need separate test/budget authorization. No raw video/audio, roster/name/jersey identification or automatic submission. Extraction/preview/approval remains required for all paths; output must say when the model did not see the image. |
| D2 playback | Owner-checked, generation-pinned GET signed URL, maximum 10 minutes, never persisted/logged/cached. Forwarded/already-issued links may work until expiry; revocation stops new issuance, not instant bearer-link access. Deletion stops access when the object is removed. No strict per-request revocation claim. |
| D3 upload | MP4, H.264 video with optional AAC; maximum **100,000,000 bytes**, **300,000 ms**, **1920×1080**, **20 slot-holding films/team**; reject HEVC/unsupported inputs with conversion guidance; no transcoding. Source limits remain TEST_PLACEHOLDER_NOT_APPROVED. |
| D4 retention | Failed/abandoned objects: remove immediately, retry/sweep within24h. Preview frames: expire within1h. Films and associated clip/results:30 days **from original upload receipt**, not from ready; coach may delete earlier; show expiry. Align stored timestamps, cleanup evidence and rights wording before activation. These are future requirements, not existing cleanup capability. |
| D5 staging | Intended project coach-core-mvp-staging-239 only. Proposed $50/month OpenAI project hard limit, $20/month Functions-service spend cap, project alerts at $25/$50/$100, global staging AI quota50/day. Mechanisms/limitations below; no total-bill guarantee and no current configuration claim. |
| D6 decoder | FFmpeg **9.0.2**, official authenticated source; minimal file-only build below, no GPL/nonfree components, no automatic dependency detection. Require signed-source verification, reproducible build, complete dependency/license inventory, binary hash, actual -buildconf/-L/component outputs and sandbox/security tests before use. |
| D7 rights | Full proposed rights-v1 text below; per-upload checkbox and server timestamp/version. Not approved wording; cannot be used to imply existing retention/privacy implementation. |
| D9 model | Recommend **gpt-6.1-sol** initially; **gpt-6-luna** only as an explicitly evaluated/configured alternative, never silent fallback. Availability to the actual project and film quality remain unverified. No accuracy promise or authorization to call either. |

## Full proposed rights-v1 wording — UNAPPROVED

Required checkbox on every upload (original packet §6, reproduced verbatim):

> I confirm that:
> 1. I, my team, or my organization owns this video or has permission to upload it to Coach Core for coaching review.
> 2. The people shown — and, for anyone under 18, their parent or guardian — have been informed of and agreed to this use under our league, school, or club media policy.
> 3. This video does not show anyone in a private setting (for example, a locker room) and does not include medical or other sensitive information.
> 4. I understand Coach Core keeps this video private to my team account and deletes it 30 days after upload, or sooner if I delete it.

Source: [packet §6 at accepted515dc1d](https://github.com/DigitalBlueprint239/coach-core-ai/blob/515dc1d92bf237dae4d70ff2cc38c2aee07d5ae1/docs/security/FOUNDER_DECISION_PACKET.md). The retention sentence depends on D4; private playback must disclose the proposed forwarded-link TTL. Reviewer must reconcile those promises before wording adoption.

Separate proposed AI checkbox (adult/synthetic only under proposed boundary; not part of upload consent, unchecked, per frame):

> Send this approved still image to OpenAI for coaching suggestions. I confirm this is adult-only footage with the necessary consent, or wholly synthetic non-identifying material, and contains no youth or sensitive personal information. API data is not used for training by default unless our organization opts in. Content may be retained for abuse monitoring for up to 30 days, or longer for legal/safety exceptions. Images are safety-scanned; flagged images may be retained for review even with special retention controls. I may continue manual review without sending it.

Official [data controls](https://developers.openai.com/api/docs/guides/your-data) confirm default no-training, abuse-retention exceptions and prior approval for ZDR/MAM; `store:false` is not zero retention. This proposal does not assert our account has special controls.

## Verification: decoder and gateway

Official [download page](https://ffmpeg.org/download.html) lists9.0.2, released2026-09-18. The [n9.0.2 license](https://raw.githubusercontent.com/FFmpeg/FFmpeg/n9.0.2/LICENSE.md) permits an LGPL2.1+ configuration; optional GPL/external libraries alter that. Tagged [scale](https://raw.githubusercontent.com/FFmpeg/FFmpeg/n9.0.2/libavfilter/vf_scale.c), [crop](https://raw.githubusercontent.com/FFmpeg/FFmpeg/n9.0.2/libavfilter/vf_crop.c) and [format](https://raw.githubusercontent.com/FFmpeg/FFmpeg/n9.0.2/libavfilter/vf_format.c) headers are LGPL2.1+. **Source verification only:** no binary built/downloaded/executed; whole-build licensing, dependencies, security advisories and functional completeness NOT VERIFIED.

Proposed build recipe (not executed or certified):
```sh
./configure --disable-everything --disable-autodetect --disable-network \
  --disable-doc --disable-ffplay --enable-ffmpeg --enable-ffprobe \
  --enable-protocol=file --enable-demuxer=mov --enable-muxer=mp4,image2 \
  --enable-decoder=h264,aac --enable-encoder=mjpeg --enable-parser=h264,aac \
  --enable-bsf=h264_mp4toannexb --enable-swscale --enable-filter=scale,crop,format \
  --enable-static --disable-shared --enable-small
```
No --enable-gpl, --enable-version3, --enable-nonfree, libx264 or libx265. Runtime network isolation is still required; configure flags alone are not a sandbox. Security reviewer checks full artifact/licensing; no package/binary installation authorized here.

Official [Sol model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol) and [catalog](https://developers.openai.com/api/docs/models) list the proposed models, Responses API and structured-output support. Actual gateway at515dc1d (`functions/index.js`, `functions/src/ai/providers/openai.js`) defaults to gpt-6.1-sol, is OFF by default, sends JSON **text**, store:false, maxRetries:0. It has **no film task/image-input adapter**. Catalog existence is not account access or film integration. No authenticated model listing/inference run; access/quality/cost NOT MEASURED. No current price table is adopted here.

## Spending controls — all amounts/configuration UNAPPROVED

| Proposed control | Enforced mechanism / when reached | Limits and verified status |
|---|---|---|
| OpenAI $50/month | Project hard limit with **Enforce a hard limit** enabled; affected requests return429/project_spend_limit_exceeded. Otherwise a spend alert only notifies. | Scope only traffic billed to that project; propagation may overshoot. Monthly reset resumes traffic; raising/removing limit needs owner approval. Official [spend limits](https://developers.openai.com/api/docs/guides/spend-limits); actual account configuration NOT VERIFIED. |
| Functions $20/month | Service-level Cloud Billing spend-cap budget; pauses new covered Functions usage when enforced. | Reporting delay/overage, in-flight work and ongoing storage costs; not a total Firebase cap. Pauses validation/reservation/cleanup too; show unavailable and preserve drafts. Automatic monthly reset resumes; no automatic lifting by agents. [Firebase scope/limitations](https://firebase.google.com/docs/projects/billing/spend-caps), [Cloud limitations](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps). Not configured/verified here. |
| Project alerts $25/$50/$100 | Email/contact notifications to named billing operator. | **Do not stop usage.** Operator follows separately approved response; no billing-disconnect automation. [Budget alerts](https://docs.cloud.google.com/billing/docs/how-to/budgets). |
| AI50/day staging | Existing server transaction quota, later configured globalDaily50, refuses before provider call once exhausted; user limits25/day and5/min remain proposed defaults. | Request counts, not dollars; failures consume quota. Does not cover bypass traffic/cloud media. Current source global default300, not50; actual runtime unknown. Manual workflow must remain available. |
| Film20/team,100MB/object | Reviewed cap ledger + authoritative reservation/rules/decoder bounds reject new over-cap uploads. | Bounds stored capacity, not repeated egress, operations or whole bill. Retention needs functioning cleanup; never delete existing data to enforce a new cap. Test placeholders only. |
| Kill switches / instance/output limits | OFF rejects new gated AI work; concurrency/time/output bounds constrain individual work. | Not a dollar cap; no refund/cancellation guarantee for in-flight work. Current AI source OFF; live state unknown. Film guard is separate Claude-owned work. |

**For Coach Drew:** no blanket adoption requested. This is the concrete term/wording/control sheet for later item-specific reconciliation with the settled record. Reviewer checks facts only; operators cannot activate from this sheet. Continue authorized FILM-S1 mechanics with marked placeholders; keep deployment guard closed, AI off and MVP NO-GO.
