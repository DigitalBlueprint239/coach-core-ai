# Film Analyzer: inventory and proposed private MVP

2026-10-13 / Codex / [Issue #50](https://github.com/DigitalBlueprint239/coach-core-ai/issues/50). Film is now required; this supersedes earlier film deferral. **MVP NO-GO.** This is a planning milestone, not a completed film implementation or release approval.

## Inspected revisions and evidence limits

- Main recovery: `3992d8d58ae0bb28490cfdfc48ed66e86b4ffd53`. Also inspected documentation branch `503af06704639a06f777dcd46721b9f19ae32c69` and Claude's proposed PR #49 head `341e95bff7f6507716b10c5533d843e089b7cdd8` using git objects. PR code is not assumed merged.
- Standalone: `aea4fd952ad579d014964f12f2e2767fe72f2871`, PR #2 on `codex/playbook-core-workflows`; recovery baseline `6b4c42c0d18a2a0364a3cf72f62bbc4535517e58`. No standalone edits in this milestone.
- Read AGENTS.md, CLAUDE.md and both shared context/sprint documents before inventory. Inspected tracked source, archives, nested app scaffolds, package declarations and tracked media filenames. No production data, real film, credentials or Firebase console accessed.
- Findings below are **source inspection**, not film functional PASS results. No film tests exist to run. Prior Playbook build/test evidence remains historical and does not establish film readiness. No application build rerun for this documentation-only change.

## Code inventory

| Surface | Actual implementation | Film status / reuse decision |
| --- | --- | --- |
| Main `src/App.tsx`, `src/components/Dashboard.tsx` | App view state and dashboard tabs; practice tab imports planner | No film view, video element or upload flow. Add lazy film feature through sequenced navigation change after Claude's auth wiring. |
| Main `src/firebase.ts` | Firebase Storage SDK instance initialization | Reusable SDK capability; no film uploader, progress, private playback or decoder validation. |
| Main `src/types/firestore-schema.ts` | `Play.video?: string`, Play/PracticePlan/period/drill types | Video URL field only; no film/clip/tag/job schema. Do not persist bearer video URLs here. |
| Main `src/services/firestore.ts` | Play and practice CRUD, subscriptions, local offline queue and migration helper | Potential adapters; no film persistence. Do not call migration helper. Queue is not a safe place for video bytes or access tokens; tenancy/sign-out requires separate work. |
| Main practice UI, recovery baseline | Duration/goals, AI generation and feedback; hardcoded demo team | Partial planner; no editable saved-film-linked workflow. |
| Main PR #49 practice UI | Age/skill input, current-team gateway result display | Proposed improvement, still no editable plan save/reopen/link UI in this component. Needs explicit integration task after review. |
| Main PR #49 `functions/src/ai/*`, `src/services/coach-ai-client.ts` | Authenticated OpenAI-only structured text gateway, privacy/quota/schema boundaries | Reuse security boundary after Claude review. Tasks are practice_plan, drill_recommendations, coach_assistant. Adapter serializes input as text; no image/frame task or extraction worker. |
| Main Storage rules, recovery | Authenticated cross-team media paths, <10 MB images/PDF/text | Unsafe tenant boundary and videos rejected; not reusable as film authorization. |
| Main PR #49 Storage/Firestore rules | Proposed verified-email, beta, nonanonymous owner-only teams; 5 MB image/PDF files; strict field allowlists | Security dependency, not video-ready. New film paths/metadata/link fields need reviewed rules and server authorization. Existing deployed configuration unknown. |
| Main archived `coach-core-integration.ts[x]` | Hudl endpoint strings, including videos/import | Declaration, not working importer. No OAuth/media adapter. Do not revive archived integration or accept arbitrary URLs. |
| Main archived complete/config/seeding files | Camera/Video imports, aspect-video placeholders, example.com video links, marketing claims | Stubs/mock content, no verified playback/analysis. Skills for video scripts are authoring tools, not product modules. |
| Main nested SmartPlaybook environment/docs | videoAnalysis feature flag and unchecked roadmap items | Flag only; no implementation. |
| Standalone `types.ts`, `services/installService.ts`, contexts | Saved Play/Playbook schema, validated local persistence and existing play selection | Useful reference/selector UX, not shared cloud tenancy. Keep standalone untouched; no app merge. Stable server play IDs must be agreed before cross-app linking. |
| Standalone `components/PracticePlanModal.tsx` | Editable drill/reps/minutes/cues/quiz state and print | Reusable interaction design only. Done closes modal; no save callback/persistence or film link. Shape differs from main PracticePlan and gateway v1. |
| Standalone `components/ai/PracticePlanner.tsx` | Practice generator UI; legacy AI service excluded/disabled by PR #2 | No active AI or saved film workflow. Do not re-enable Gemini. |
| Both manifests/assets | No film decoder, FFmpeg, dedicated video player or frame processing dependency; no tracked mp4/webm/mov sample fixtures found | Missing. Native HTML video can cover playback; server decoder must be selected, pinned and audited. No repository LICENSE file found in inspected trees; archived license claims are insufficient. |

All required film workflows are **NOT IMPLEMENTED** in the inspected product surfaces: secure upload, private playback, frame navigation, clip marking, film tags, film save/reopen, frame extraction/AI, and film-to-play/practice links. Existing Firebase/auth/gateway scaffolds are **PARTIAL** dependencies, with live configuration **BLOCKED/unverified**. No film workflow is labeled PASS.

## Proposed scope and wireflow

Coach signs in → selects owned team → opens Film library → chooses a rights-cleared clip → sees file limits and upload progress → validation pending → ready playback → marks start/end → edits formation/down/distance/result/notes → saves → reopens identical clip/tags → links a saved play → creates/edits/saves a practice draft → optional selected-frame suggestion → accepts edits or rejects suggestion → saved manual record remains authoritative.

MVP starts with bounded clips, not full games or third-party URL import. Proposed limits, pending product/security agreement: MP4 with H.264 video, optional AAC audio, <=100 MiB, <=5 minutes, <=1080p, one upload at a time, <=20 retained clips/team. Browser metadata is an early usability check; server checks are authoritative. Unsupported codecs/formats get a clear conversion instruction; no automatic transcoding in first MVP. Native play/pause/seek/speed and time-step controls; exact frame stepping is only claimed when decoder/browser evidence supports it. Markers are milliseconds, not assumed frame indices. 44 px touch controls and keyboard alternatives.

AI assistance is optional per clip; required MVP infrastructure includes safe selected-frame extraction and reviewed suggestions. Manual film review must work during gateway failures. Fully automatic game tagging, player/jersey recognition, coverage classification, bulk ingestion, Hudl OAuth, predictive analytics and public sharing remain deferred.

## Architecture spike and security decisions to validate first

### Reconciled security review — PR #52 (supersedes draft details below)

Read Claude's review at `e0e842864f963295ab6602b7dc96d1931052acdd`: [FILM_SECURITY_REVIEW.md](https://github.com/DigitalBlueprint239/coach-core-ai/blob/e0e842864f963295ab6602b7dc96d1931052acdd/docs/security/FILM_SECURITY_REVIEW.md). Codex accepts owner-only beta tenancy and ownership on #39. Shared client persistence and editable planner ownership are accepted, but cloud DTO/rules agreement remains required before editing shared interfaces.

- Upload authorization must bind the create-only quarantine path to the unexpired server reservation, its creator, status, declared byte count and approved limits. Clients cannot read, update or delete quarantine; cancellation uses `abandonFilmUpload`.
- Validation order is bounded pure-JS container parse, pinned probe, metadata-stripping remux (`-map_metadata -1`, `+faststart`), generation-idempotent promotion. Decoder/parser selection and licensing remain Claude's ownership; no installation/processing authorized here.
- Film documents are server-write-only. Clips have strict client rules, revision +1, immutable authorship and bounds against ready-film duration. Link target tenancy is checked in rules. Server suggestion output is immutable; only coach review state can change.
- Claude recommends <=10-minute V4 signed playback URLs. **D2 pending**: this is not approved or implemented. Signed URLs remain bearer capabilities until expiry; strict per-request revocation is not claimed. Cookie proxy is an alternative, not the committed architecture. Authenticated getBlob fallback is removed from the plan because client film reads allow download-token access. No film/frames client Storage reads.
- Separate `coach-film.v1` callable envelope; proposed `reserveFilmUpload`, `abandonFilmUpload`, `getFilmPlaybackUrl`, `requestFramePreview`, `approveFrame`, `deleteFilm`. Clip/link writes follow reviewed rules; older `finalizeFilmUpload`, media proxy, saveClip/linkClip names below are historical proposals, not agreed endpoints. Do not implement DTOs until Claude's schemas are agreed.
- Inline frame preview <=300 KB, <=768 px, server-only expiring frame plus server-recorded approval. Additive `film_frame_suggestion` within `coach-ai.v1`, OpenAI image detail low, bounded outputs/quota, separate flag default off. No youth frames transmitted absent D1/D7/D8 decisions; no film/provider implementation in this follow-up. Text-only manual review can remain the safe path.
- D10 pending: prepare consent UX only behind an inactive gate. Preserve anonymous/local original plays byte-for-byte; never auto-import or remove originals after a mere prompt or before verified explicit consent/import fidelity. Do not treat a recommendation in #52 as founder approval.

| Decision | Current status | Explicit founder decision evidence |
| --- | --- | --- |
| D1 Youth frames to OpenAI | PENDING; default off | None found |
| D2 Signed playback URL vs cookie proxy and acceptance interpretation | PENDING | None found |
| D3 Formats/size/duration/resolution/team cap | PENDING; values are proposals | None found |
| D4 Retention/deletion intervals | PENDING | None found |
| D5 Paid staging budget/Blaze | PENDING; no activation | None found |
| D6 Exact decoder build/licensing | PENDING | None found |
| D7 Upload rights/consent and minor-footage policy | PENDING | None found |
| D8 Provider data-control acceptance | PENDING | None found |
| D9 Image model/access | PENDING | None found |
| D10 Explicit legacy-play import activation | PENDING; gate inactive | None found |

Film being required and OpenAI being the sole MVP provider are explicit founder directions; they do not decide D1–D10. October dates remain proposed until Coach Drew accepts them. No decision-dependent film implementation begins here.

This is an architecture/test spike design, not executed decoder or playback evidence. First implementation milestone is a local synthetic-media spike: measure authenticated range playback, decoder limits and timestamp accuracy before committing infrastructure.

1. Authenticated upload reservation validates beta identity, team ownership, limits and rights acknowledgment. Server allocates UUID film ID and fixed quarantine path; do not trust client owner/path fields. Resumable Storage upload is restricted to that reservation and byte/type ceilings. Cancel/error keeps a recoverable state, never a false Saved status. No overwrite of an existing ready object's generation.
2. Quarantine is unreadable for playback. A bounded worker verifies magic bytes/container, codec, duration, dimensions and object generation; MIME/extension alone cannot establish validity. Run decoder with fixed arguments, no shell interpolation, network disabled, bounded CPU/memory/time/output and patched pinned binary. Reject corrupt, oversized, unexpected streams and malicious containers; do not run arbitrary remote media fetches. Promote server-owned validated object and metadata atomically/idempotently; clients cannot mark ready or edit processing fields.
3. Prefer authenticated same-origin media proxy with byte-range support and per-request ownership checks. HTML video cannot attach an arbitrary Authorization header: spike short-lived secure HttpOnly session handling, CSRF protection for mutations, CORS/Range/206 behavior and logout/revocation. Avoid long-lived Firebase download tokens. A signed URL is a bearer capability until expiry: do not treat it as strict unsigned-access denial. If signed access is proposed instead, Claude/product must explicitly reconcile that acceptance requirement and expiry/revocation tests. Small authenticated getBlob/object-URL playback is a bounded spike fallback, with full-download/memory cost measured and URLs revoked at team switch/sign-out. No persistent tokens/URLs in metadata, logs or service-worker caches.
4. Frame job accepts an owned ready film ID, object generation and bounded timestamp/crop, never a caller URL or base64 frame. Server extracts one JPEG from that generation, strips metadata/audio, downsizes (proposed <=1024 px, <=1 MiB), and records actual decoded timestamp. Coach previews a sanitized frame and explicitly approves its use. Faces/names/jerseys can identify youth: merely removing metadata is insufficient. Crop/redact or refuse identifiable footage by default; uncertain redaction requires manual review, no silent provider transmission.
5. Extend Claude's OpenAI-only gateway with versioned film_frame_suggestion schema and server-created image input. Keep provider secret server-only; quota per coach/team, bounded timeout, idempotency, limited retries, refusal handling and sanitized logs. No raw video/audio, roster or youth PII by default. Output observations with uncertainty/limitations and suggested tags, no fabricated confidence percentage. Treat embedded image text/notes as untrusted; no tools or autonomous changes. Persist acceptance/rejection separately from coach-owned tags. No promise of automatic motion/result inference from one still.
6. Film metadata lives in Firestore; bytes in Storage. All reads, lists, writes, media access, jobs, linked resources and deletion independently check the same tenant. Start with PR #49's owner-only beta model unless Claude explicitly changes it. Team IDs and owner IDs immutable. No raw video in Firestore/browser localStorage. Signed-in device switch and sign-out clear only session media/caches, preserving unrelated local Playbook data.
7. Retention proposal: failed/orphan uploads 24 hours, extracted frames immediately after completed request or <=1 hour expiry, film <=30 days with coach-visible expiry. Product/Claude must approve policy before rollout. Server-managed deletion tombstones first, blocks reads/jobs, deletes only the exact film assets and metadata, and retries idempotently. Never broad-delete existing team/Firebase data. Tests use demo emulators only.

## Proposed data/API contract (not implemented)

- `teams/{teamId}/films/{filmId}`: schemaVersion=1, createdBy, createdAt/updatedAt, revision, title, rightsAcknowledgedAt, status(uploading/validating/ready/rejected/deleting), server-controlled object path/generation, bytes, durationMs, width/height, codec, expiresAt, safe error code. Clients cannot set ready, dimensions, generation or owner.
- Film `clips/{clipId}`: startMs/endMs within verified duration, formation <=80 chars, down null or 1..4, distance null or 0..100 yards, result <=120 chars, notes <=2000 chars, revision and authorship. Unknown fields rejected; server timestamps. AI draft and manual values remain separate.
- Clip `links/{linkId}`: kind=play|practicePlan, resourceId, optional periodId, teamId, createdBy; server resolves existing canonical resource and same-team ownership. Deleted targets show unavailable without erasing film. No eager import/conversion of standalone play geometry.
- Suggestion job: filmId/clipId, generation, selectedTimestampMs, approved sanitized frame reference, requestId, state, expiresAt. Result: schemaVersion, observations[], suggestedTags, uncertainty[], limitations[], reviewState=pending|accepted|edited|rejected. Never let AI overwrite saved manual tags.
- Proposed endpoints: reserveFilmUpload, finalizeFilmUpload, getFilm/listFilms, saveClip(expectedRevision), linkClip, createPracticeDraftFromClip, requestFramePreview, requestFilmSuggestion, deleteFilm. Streaming media is an HTTP range endpoint, not a large callable response. Idempotent request IDs; stale edits return conflict with a reload/resolve UI; typed unauthenticated/forbidden/validation/quota/timeout/unavailable errors.
- APIs are proposals for Claude review, not extensions secretly added to coach-ai.v1. Add new DTOs in `src/features/film-analyzer/contracts.ts`; map to canonical saved plays/practice plans through adapters. Existing rules' hasOnly fields require explicit reviewed changes; a new type alone will not enable persistence.

## Ownership and review slices

Coordination posted to [Issue #39](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6147806398); Claude confirmation still pending.

- Codex now: this spec and shared documentation only, branch `codex/issue-50-film-plan`. Proposed subsequent ownership: new `src/features/film-analyzer/**`, client contracts/adapters, feature unit/browser tests and synthetic fixtures.
- Claude: rules, `functions/**`, decoder/storage/private media access, OpenAI extension, security tests, retention design and `docs/security/**`. Do not edit these on Codex branches.
- Shared App/Dashboard/auth/TeamContext/PracticePlanner/AI files remain Claude's PR #49 claim. Sequence navigation/plan/link adapters on #39/#46 before touching them. No standalone Playbook edits; no application merger.
- PR slices: (1) contracts + synthetic player/tag UI; (2) Claude upload/private access/worker/rules + negative tests; (3) Codex persistence and playback wired to reviewed backend; (4) Claude sanitized frame/OpenAI task + Codex coach-review UI; (5) canonical play/practice links and editable save/reopen; (6) recorded end-to-end/security/device acceptance. Each targets recovery, with explicit prerequisites and review; no blind merge.

## Revised effort and timeline

Engineering estimate from missing code, not a promise: contracts/media spike 8–12 h; UI playback/marking/tags 12–18 h; upload/access/decoder/security 20–30 h; metadata persistence/conflicts 8–12 h; frame privacy/gateway/review 12–20 h; play/practice adapters/edit/save 12–18 h; emulator/browser/device/regression evidence 16–24 h. **Total 88–134 engineer-hours**, plus existing auth/security fixes, approvals and review delays; add 20% contingency (106–161 h). Two owners can parallelize non-overlapping work after contracts agree, not simply halve the schedule.

- Oct 13–14: inventory/spec/security contracts + synthetic spike, product limits/rights decisions.
- Oct 15–19: parallel feature UI and secured upload/worker/metadata, auth prerequisite review; no deployment.
- Oct 20: possible private local core-product/film UI demonstration with labeled synthetic mocks only. **Not full MVP readiness.**
- Oct 20–23: selected-frame safe gateway + editable canonical practice/Playbook links; integration after reviewed prerequisites.
- Oct 24–27: full emulator/production-build browser workflow, physical tablet checks, independent security acceptance and fixes.
- Earliest conditional full MVP assessment: **Oct 27–30**, subject to all gates and owner availability. Paid environment or deployment approval delays can move this further. Film is required but not yet implemented/verified in investor messaging.

## Costs, licensing and unresolved product decisions

No paid service activated. [Firebase Storage setup](https://firebase.google.com/docs/storage/web/start) requires Blaze; founders must approve any billed staging environment. Cost model: retained GB-month + uploads/metadata operations + repeated playback GB egress + decoder compute + frame image tokens. Example proposed ceiling: 10 teams ×20 clips ×100 MiB ≈19.5 GiB retained; three full views ≈58.6 GiB transferred before overhead. These are quantity estimates, not a quoted bill; region/bucket class/free tiers, concurrency and AI model remain undecided. Budget alerts do not replace application quota limits. Use [current Firebase pricing](https://firebase.google.com/pricing) before environment approval.

Native video adds no player dependency. FFmpeg build licensing varies with enabled libraries: review exact binary provenance/configuration and obligations using [FFmpeg legal documentation](https://www.ffmpeg.org/legal.html); don't assume any downloaded build is freely redistributable. Repository license/source ownership and sample footage rights remain unresolved. Avoid Hudl credentials/import/licensing in MVP.

OpenAI supports [image inputs](https://developers.openai.com/api/docs/guides/images-vision); that does not verify football inference accuracy. Review account-specific [data controls](https://developers.openai.com/api/docs/guides/your-data) with Claude; do not promise zero retention by default. Product owner must provide rights-cleared sample footage/user journey, permissible AI errors, youth consent/data policy, limits, retention and budget. Synthetic fixtures unblock engineering without waiting on real footage.

## Test plan and release gates

All tests here are **PLANNED / NOT RUN**. Film build/typecheck counts are unavailable until code exists. No film PASS based on inspection.

| Layer | Required cases and evidence |
| --- | --- |
| Contracts/unit | Bounds, invalid markers, exact tag roundtrip, revisions/conflicts, unknown fields, stale/deleted links, failed-save status, pause/cancel/resume, AI edit/reject preserves manual record. |
| Decoder spike/worker | Rights-cleared synthetic MP4, corrupt/truncated bytes, spoofed MIME, oversized file, >duration/resolution limit, unsupported codec, timestamps at first/last/keyframe/VFR, timeout/memory ceilings, generation race, idempotent retries, no remote network. Record extracted actual timestamp/hash/dimensions, not assumed frame number. |
| Auth/rules/emulators | demo-* only, unsigned/anonymous/non-beta/unverified denied; team A cannot list/read/upload/update/delete/link/extract team B; forged metadata/path/owner/generation/ready rejected; quarantine unplayable; exact limits at boundary; expired/revoked media denied; cross-team practice/play IDs denied. |
| Private media HTTP | Unauthorized URL doesn't expose bytes; authenticated Range gives correct 206/Content-Range; invalid ranges bounded; logout/expiry/revocation, cache exclusions, CORS/CSRF and no URL/token leakage in logs/storage. |
| Persistence E2E | Upload → validate → play → mark/tag → save → hard reload/new session → unchanged tags/markers → saved play link → editable practice save/reopen → follow links back. Simulated disconnect/retry, quota/full storage, concurrent edit, broken target and sign-out/team switch. |
| AI tests | Mock server provider only in CI: no consent/no approved sanitized frame=no call; youth identifier case refused; safe image input only, no audio/raw film/roster; unsupported task/model, schema-invalid result, refusal, timeout, rate limit, idempotency, retry budget; edit/reject suggestions. Real provider evaluation requires separate approved safe fixture/account, no secrets logged. |
| Browser/device | Production build desktop mouse/keyboard and touch-emulated tablet playback/seek/markers/form/tagging; physical iPad Safari and Android tablet playback/touch/background-resume before claiming device PASS. Codec/range/cookie compatibility must be measured; no autoplay assumption. |
| Preservation | Existing main unit/type/build suite and standalone PR #2's 18 unit/14 browser +3 repeated touch cases on reviewed integrated revisions; no Playbook regressions, no synthetic migration of existing records. Secret/provider bundle canaries; independent Claude security review. |

Record revision, commands, environment, exact counts, real-vs-mocked provider/media, redacted failures and screenshots/downloads. Do not skip failing tests to reach a release claim. Full MVP remains NO-GO until four existing critical security blockers plus film, editable practice and end-to-end coaching gates pass. Deployment remains a separate founder-approved action.

## Inventory commands and outcomes

Executed read-only on main/standalone checkouts (PowerShell, Node 22.23.1/npm 10.9.8 from prior audit):

```powershell
Get-Content AGENTS.md, CLAUDE.md, docs/COACH_CORE_SHARED_CONTEXT.md, docs/MVP_7_DAY_SPRINT.md
$env:GIT_TERMINAL_PROMPT='0'
$env:GCM_INTERACTIVE='Never'
git -c credential.helper= -c credential.helper=manager fetch origin
git -c credential.helper= -c credential.helper=manager fetch origin recovery/coach-core-mvp-2026
git show FETCH_HEAD:AGENTS.md
git show FETCH_HEAD:CLAUDE.md
git show FETCH_HEAD:docs/COACH_CORE_SHARED_CONTEXT.md
git show FETCH_HEAD:docs/MVP_7_DAY_SPRINT.md
rg --files -g '!outputs/**' -g '!node_modules/**' -g '!docs/evidence/**' | rg -i 'film|video|storage|practice|upload|gateway|analy'
rg -n -i 'film|video|ffmpeg|react-player|uploadBytes|getDownloadURL|getStorage|captureStream|requestVideoFrameCallback' src functions public storage.rules package.json firebase.json --glob '!*.map'
git -c credential.helper= -c credential.helper=manager fetch origin pull/49/head:refs/remotes/origin/pr49
git rev-parse origin/pr49
git ls-tree -r --name-only origin/pr49 | Select-String -Pattern 'film|video|gateway|functions/|LICENSE|storage.rules'
git show origin/pr49:src/features/practice-planner/PracticePlanner.tsx
git show origin/pr49:storage.rules
git show origin/pr49:functions/src/ai/schemas.js | Select-String -Pattern 'action|practice_plan|play_suggestion|image|frame' -Context 2,2
git show origin/pr49:functions/src/ai/providers/openai.js | Select-String -Pattern 'fetch|responses|chat|image|content|model' -Context 1,2
git show origin/pr49:firestore.rules | Select-String -Pattern 'practicePlans|plays|ownerId|films' -Context 2,4
rg --files -g '*LICENSE*' -g '*.mp4' -g '*.webm' -g '*.mov' -g '!node_modules/**' -g '!outputs/**'
# standalone
rg -n -i 'video|film|ffmpeg|react-player|mediainfo|uploadBytes|getStorage' --glob '!package-lock.json' --glob '!docs/**' --glob '!node_modules/**' --glob '!dist/**'
Get-Content components/ai/PracticePlanner.tsx, components/PracticePlanModal.tsx
rg -n 'onSave|onClose|useState|window.print' components/PracticePlanModal.tsx
git rev-parse HEAD
```

Main source search finds only the partial/stub references listed above; standalone film-content search exits 1 (no matches). Media/license searches found no matching tracked fixtures/licenses. GitHub Issue #50 and #39 comments read through connector; ownership request posted. Initial root-level AGENTS/CLAUDE read failed because those files are in repo checkout, then successfully read there. One main-only git revision/schema probe was accidentally run in standalone and failed unknown refs; rerun in main, no state affected. Broad source output was truncated; followed with targeted file/schema searches. No secrets were printed or included here.
