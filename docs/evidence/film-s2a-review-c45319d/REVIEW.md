# Codex bounded fixture / compatibility review — FAIL

Candidate **c45319df88d7433e063c8f3fe4c31c7330f34f0a**, base accepted PR82
**49bd3f3f1153d9d5d2637a39897b7c91be08b9fc**. Run39350690291, push, attempt1,
head matches, success. Authorization6280272237, handoff6280842742, proposed r4 /
S2b requirements6280217950 as amended6280252192 read. This is Codex's bounded
fixture/compatibility verdict, coordinated with the standing independent Claude
engineering/provenance reviewer on issue39 comments6290046561 and6290076013.
It does not replace that reviewer's wider engineering verdict or legal clearance.

## Blocking findings and minimum correction

1. **The frozen VFR fixture is CFR.** `fixtures/generate.sh:33` selects frames
   then resets timestamps with `setpts=N/30/TB`; frozen s3-vfr.mp4 has100frames
   and99 equal timestamp intervals of1/30s (rounded0.03333). The harness checks
   duration and decoding, not timestamp variation, so38 green checks do not prove
   VFR compatibility. Minimum: preserve/generate genuinely unequal presentation
   intervals, freeze replacement bytes/digest/expected facts, assert at least two
   meaningful positive interval values in the pinned runtime. Explicitly agree
   S2b's VFR policy; neither a shorter CFR file nor a label establishes it.
2. **Retained build provenance is malformed.** Every downloaded build.json
   has `"configureFlags": ,`; JSON parsing fails line4,column21. build.sh:53
   passes configure options to `node -e` without `--`, so Node consumes them as
   Node options. Reproducer `node -e 'console.log(JSON.stringify(process.argv.slice(1)))'
   --disable-everything` exits9 / bad option. Substitution inside the heredoc
   does not fail the build; artifact hashes faithfully cover broken bytes.
   Minimum: serialize using a structured writer or correct `--` delimiter,
   propagate failure, parse/assert required provenance fields and full flag array
   before success/upload. Retain new exact-candidate artifacts; do not rewrite
   old evidence. Actual flags remain separately inspectable in buildconf/config.mak,
   so this is not proof the binary was built with different flags.
3. **The authorized oversized-header adversarial fixture is absent.** All16
   frozen names and generator branches inspected; no oversized input-box/header
   fixture or targeted assertion exists. H0 FSIZE test limits child output writes,
   not malicious input declarations. Minimum: freeze synthetic MP4 malformed-size /
   oversized box-header input with digest and declared outcome, exercise pinned
   probe/decode with bounded termination and no false success. No allocation of
   an enormous real file is necessary. Record actual signal/exit distinctly from
   a successful parse. This is required authorization checklist7 coverage.
4. **HEVC decode failure is not asserted by the fixture test.** expected.json:7
   describes decode failure but has no decodeWithXerror field. H2 only runs decode
   when that field exists (harness.test.mjs:223). It probes this HEVC fixture and
   returns success without attempting the described decode. Independent pinned
   ffmpeg decode here exits234/no HEVC decoder, so the binary behaves correctly;
   the regression assertion is missing. Minimum: pinned-only explicit nonzero
   decode expectation, separate from developer-generator behavior, and ensure
   failure is decoder refusal rather than merely spawn/timeout error. The present
   decoder component-list assertion is useful but does not replace exercising input.

Executable reproductions: `python probes.py CHECKOUT EXTRACTED_ARTIFACT` in this
folder; actual output in probes.json. It reports observations without altering
source/tests. `CHECKOUT` must be c45319d, artifact must be39350690291.

## Positive evidence independently established

- Exact diff adds only29 files in tools/ffmpeg, DECODER docs and its new workflow.
  functions/,src/,rules,tests/r3 fixtures,existing workflows and accepted PR82
  untouched. No S2b/runtime/client integration or new rules policy adoption.
- All16 frozen files pass committed SHA256SUMS.txt; expected.json membership matches
  the frozen MP4/WebM set. TOOLCHAIN records dev-only FFmpeg6.1.1-3ubuntu5, GCC13
  (Ubuntu13.2.0-23ubuntu3), complete generator configuration and generation date.
  It includes GPL-enabled encoders for fixture generation only, not the artifact's
  pinned LGPL decoder. Generator outputs are synthetic patterns/tones; recipe
  inspection is not a claim of frame-by-frame human content audit. Cross-machine
  generator byte identity is explicitly disclaimed; frozen bytes are authoritative.
- New final ZIP12233535199 downloaded,4,369,319bytes, SHA256
  b32ee5252853af869b628d32b8305bf6198d2266f20c057522484423dad5284a.
  Both independent-build ZIPs also downloaded and matched API archive digests:
  12232967189 =0e5b045cb393496ee23cb0e8e9be8724427483280ac7cf1e021c9df7dad224dd;
  12232782350 =24677ae5c8804dd1e52157b92d8177c12aef9888dbbc801e31272b725953f389.
  No unsafe archive paths/symlinks found. Final inventory covers all30 payload files
  exactly, each digest verified; inventory excludes only itself. Final RUN.txt binds
  candidate c45319d/run39350690291/attempt1/push/ubuntu24 image20261012.334.1.
  Frozen hashes and TOOLCHAIN in final artifact match committed counterparts.
- ffmpeg and ffprobe bytes identical across all3 archives, hashes respectively
  1314ab3b558c48ce7ed4aa6efba5a68fefe30362f796e59ef017b17424436ff1 and
  fd43ef9be4bb7d7fc821e1b25950efc6eb0aac586cabacd34a38fd52299f48e6.
  GNU compiler13.3.0,make4.3,nasm2.16.01,binutils2.42,Ubuntu24.04.5 and source epoch
  are recorded in the malformed provenance text plus individual build evidence.
  This review compared downloaded binaries; it did not independently rebuild source.
- Actual downloaded binary harness locally: **38pass/0fail/0skip/0cancelled, exit0**,
  Node24.19.0,Linux,prlimit available. Command:
  `FFMPEG_BIN=ARTIFACT/out/bin/ffmpeg FFPROBE_BIN=ARTIFACT/out/bin/ffprobe
  FIXTURES_DIR=CHECKOUT/tools/ffmpeg/fixtures/frozen HARNESS_PINNED=1
  HARNESS_RESULT=local-result.json node --test --test-reporter=spec
  tools/ffmpeg/harness/harness.test.mjs` (absolute binary/fixture paths required).
  CI retained log independently records38/0/0, not the developer32/0/6 run.
  Pinned harness confirms only file protocol, h264/aac decoders, actual expected
  component lists, resource-limit mechanics, metadata fixture removal/re-probe/byte
  scan and deterministic remux. Harness is not a kernel/network sandbox.
- Independent malformed/unsupported probes: truncated probe0/decode183; spoofed
  probe1/decode183; empty probe1/decode183; WebM probe1/decode183; HEVC probe0 /
  decode234. Therefore probing alone is insufficient (truncated faststart passes
  probe); S2b must fully decode with strict errors and validate output separately.
  Normal H264/AAC,30/60fps and at/over placeholder dimension/duration facts are
  exercised by the real pinned harness. Over-limit files decoding successfully
  is expected: the decoder is not the future policy validator.13-stream and
  audio-only inputs likewise require S2b policy rejection, not decoder failure.

## Signing-key and source-download boundary

Rendered https://ffmpeg.org/download.html returned403; www endpoint failed502.
However official website source is accessible at
https://github.com/FFmpeg/web/blob/0e960d6d77b6d6ef73e11e10957f5ec3cb8f7b41/src/download#L267
and prints **FCF986EA15E6E293A5644F10B4322F04D67658D8**. Independently downloaded
https://ffmpeg.org/ffmpeg-devel.asc and gpg --with-colons --show-keys confirms
that primary (subkey5F2EDE9A44501BB559871F8650EE8DF19C3345A2). Thus the pin is
independently anchored to the official website source and official downloaded key;
not merely implementer memory. This closes that fingerprint-confirmation action
with the stated route, not a claim the rendered page was accessible.

Direct release tarball and detached-signature downloads returned502; no local
source-byte checksum or fresh PGP verification claimed. CI source.json records
VALIDSIG primary and pinned tarball8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e.
Script inspection checks pin+VALIDSIG primary+digest, but retained source.json is
recorded CI evidence, not a substitute for a new successful local download.
No archive access gap remains for the3 reported workflow artifacts. Binaries stay
local/repository-scoped workflow artifacts only; none is committed or redistributed
by this review. No public release/package/image/bucket publication.

## Accepted S1 compatibility and proposed S2b contract prerequisites

S1 implementation/strict r3 contract unchanged and not rerun; PR82 accepted scope
preserved. Decoder only produces probe JSON/remux bytes, not application FilmState;
no worker contract compatibility is established from38 harness passes.

Proposed r4 fields (readyAt,normalizedGeneration,media,expiresAt) and closed new
rejection reasons cannot be emitted through existing strict r3 parsers. Both server
schema and client mirror reject unknown fields/reasons; coordinate exact version /
migration, all-null nonready keys, r4 fixtures and FS26 before S2b. Keep objectGeneration
bound to quarantine; normalizedGeneration separate; no client object paths or URLs.
Ready requires actual successful decoding/normalization and generation-safe commit,
not ffprobe success or ftyp. T6 currently requires rejected.statusChangedAt < original
reservationExpiresAt; later asynchronous rejection can violate it. Amend the shared
invariant deliberately and add both server/client boundary fixtures; never weaken
only one parser. Missing D4 retention remains null, not invented expiry promise.

These are **S2b entry requirements, not permission to implement now**, nor defects
in unchanged S1. Proposed r4 design is not yet an agreed tested SHA. Agree VFR
handling, HEVC/non-AAC/extra-stream reason mapping, exact units/dimension policy,
missing/NaN probe metadata rejection and full-decode/output-validation requirement.
300500ms/1922width fixtures cover one frame/even-pixel overage, not arbitrary
+1ms/+1px nor height-only boundary; add those policy/unit cases where meaningful
in the later worker suite. S2a does not implement transaction leases, retries,
promotion, output path authorization, cleanup or ready metadata.

## Verdict / next action

**FAIL for bounded S2a fixture/compatibility/evidence scope at c45319d** until the
four corrections above receive a new source-pinned focused run/artifact and
independent review. Green38/38 remains valid evidence of exactly its assertions,
not coverage of missing/mislabeled cases. No unchanged core matrix requested.
Primary engineering/licensing reviewer retains wider review ownership. No S2b,
merge,deployment,spending,AI activation; MVP **NO-GO**.
