# Film validator decoder — provenance record (FILM-S2a)

Status: **engineering record for independent review; not deployed, not published, not legally cleared.** The binary exists only as a repository-scoped GitHub Actions workflow artifact (14-day retention) produced by `.github/workflows/film-decoder-build.yml`. No release asset, package, image, bucket or repository vendoring. Licensing questions in `DECODER_LICENCE_INVENTORY.md` §4 are open.

## 1. Source

| Item | Value |
|---|---|
| Component | FFmpeg 9.0.2 "Lei" (9.0 branch released 2026-08-04; 9.0.2 patch 2026-09-18 per ffmpeg.org/download) |
| Tarball | `https://ffmpeg.org/releases/ffmpeg-9.0.2.tar.xz` |
| Detached signature | `https://ffmpeg.org/releases/ffmpeg-9.0.2.tar.xz.asc` |
| Signing key | `https://ffmpeg.org/ffmpeg-devel.asc`, primary fingerprint pinned in `tools/ffmpeg/SOURCE.json`: `FCF986EA15E6E293A5644F10B4322F04D67658D8` — **independently confirmed 2026-10-20**: by the Claude reviewer against the rendered https://ffmpeg.org/download.html (#39 c-6290077471) and by Codex against the official website source `FFmpeg/web@0e960d6` and the downloaded key file (PR83 review 5584543124) |
| Verification | `tools/ffmpeg/verify-source.sh`: refuses the key unless its primary fingerprint equals the pin; requires gpg `VALIDSIG` whose primary key equals the pin; records the tarball sha256 |
| Tarball sha256 (CI, both independent jobs) | `8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e` — pinned in `SOURCE.json` after the first verified build (TOFU on a signature-verified download; any later change fails the build) |

## 2. Build

| Item | Value |
|---|---|
| Script | `tools/ffmpeg/build.sh` with `tools/ffmpeg/configure.flags` (LGPL-only minimal recipe from the founder packet §5, plus `--disable-debug`, static link, `-ffile-prefix-map`, and the `null` muxer with its pass-through encoders) |
| Reproducibility controls | `SOURCE_DATE_EPOCH` = **1789689600 (2026-09-18T00:00:00Z, the release date, fixed in `SOURCE.json`)**; `LC_ALL=C`, `TZ=UTC`; `-ffile-prefix-map` for source and build dirs; `strip --strip-all`; runner image pinned to `ubuntu-24.04`; expected binary digests pinned in `SOURCE.json` (a change fails the build as a review event). *Correction:* up to c45319d the epoch was the downloaded file's mtime (`curl` without `-R`), i.e. the download time; binaries were identical regardless, so FFmpeg does not embed it, but the recorded value was misleading (independent review F2). |
| Fail-closed | `build.sh` exits 6 if `ffbuild/config.mak` has `CONFIG_GPL`, `CONFIG_VERSION3` or `CONFIG_NONFREE` = yes |
| Toolchain | GitHub `ubuntu-24.04` runner image (pinned; was `ubuntu-latest` up to c45319d — those runs were on ubuntu24 image 20261012.334.1 per Codex's artifact inspection); recorded per run in `provenance/build.json`: gcc, make, nasm, binutils, OS, kernel, `ImageOS/ImageVersion`; `nasm` installed from Ubuntu for x86 asm |
| Outputs | `out/bin/ffmpeg`, `out/bin/ffprobe` (static, stripped), `out/COPYING.LGPLv2.1`, `out/LICENSE.md`; `provenance/{source.json,build.json,config.mak,configure.log,make.log,ffmpeg-version.txt,ffmpeg-buildconf.txt,ffmpeg-L.txt,ffmpeg-{demuxers,muxers,decoders,encoders,parsers,bsfs,protocols,filters}.txt,ffprobe-version.txt,BINARY_SHA256SUMS.txt,ffmpeg-ldd.txt}` |
| Provenance integrity | `source.json` and `build.json` are written with `JSON.stringify` by `tools/ffmpeg/provenance.mjs` (no shell heredocs) and **validated before upload** (`provenance.mjs validate`): both parse; version, signing-key and tarball pins; `configureFlags` equals `configure.flags`; fixed epoch; licence guards false; toolchain fields present; binary digests equal the files, `BINARY_SHA256SUMS.txt` and the `SOURCE.json` pins; every IJG file compiled per `config.mak` is named in the licence inventory. The verify job re-validates both builds and then validates the **assembled** artifact (provenance plus a complete, verified `ARTIFACT_SHA256SUMS.txt`) before uploading it. *Correction:* every `build.json` up to c45319d contains `"configureFlags": ,` (invalid JSON) because `node -e … "${FLAGS[@]}"` lacked `--` (Codex PR83 review, blocker 2). Those artifacts are retained unchanged as history; the actual flags of those builds remain inspectable in their `ffmpeg-buildconf.txt` and `config.mak`. |

## 3. Reproducibility proof

Two independent jobs (`build a`, `build b`; separate runners, separate downloads, separate signature verifications) must produce byte-identical `ffmpeg` and `ffprobe` (`cmp`) and the same tarball digest; the `verify` job fails otherwise.

| Run | Candidate | Result |
|---|---|---|
| [39348016177](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39348016177) | `711702c` | builds a/b reproducible: `ffmpeg` sha256 `47ca0cd624c64139d776e1731a9fa612e10ede79267b0d56eb4636794e55c4b2`, `ffprobe` `76821950404431fb00e33dde895a4178b3a70eeec3152f345b43fe9ab1d0557a`; harness FAILED (no `null` muxer in the recipe → `-f null -` decode checks impossible) — fixed in `5879ff1` |
| [39348453561](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39348453561) `5879ff1` | + `null` muxer | reproducible (`3f8563be…`, `e8645b52…`); harness step aborted before reporting (bash -e) — fixed |
| [39348796862](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39348796862) `bb286ba` | same flags | reproducible; harness 23/15: missing pass-through encoders for `-f null`, quoted `-buildconf` values, wrapped `-L` text |
| [39349144271](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39349144271) `1b7e96e` | + `wrapped_avframe,pcm_s16le` | reproducible (`34fea15f…`, `0408d71d…`); harness 32/6: `aresample` needed for AAC; `mov` muxer selected by `mp4` |
| [39349445007](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39349445007) `ee3f8b4` | + `aresample` (**final flag set**) | reproducible: `ffmpeg` **`1314ab3b558c48ce7ed4aa6efba5a68fefe30362f796e59ef017b17424436ff1`**, `ffprobe` **`fd43ef9be4bb7d7fc821e1b25950efc6eb0aac586cabacd34a38fd52299f48e6`**; harness 37/1 (graph-endpoint filters not in the expected list) |
| [39349763926](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39349763926) `5cbaf72` | same | same digests; harness 37/1 (list parser) |
| [39350044354](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39350044354) `2e573ba` | same | same digests; **harness 38/38, 0 skipped** |
| [39350436723](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39350436723) `3aba793` | same; frozen fixtures | same digests; harness 38/38 on the frozen set; frozen digests verified |
| [39350690291](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39350690291) `c45319d` | same (first handoff SHA) | same digests; harness 38/38; artifact `12233535199` (inventory of 30 payload files verified by Codex) |
| [39351040405](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39351040405) `c45319d` (pull_request, merge commit `2af487d5`) | same | same digests from a different checkout; harness 38/38 |
| repaired candidate (exact SHA and run in the #39 handoff) | same `configure.flags`; fixed epoch; pinned image | expected: same binary digests (enforced by `SOURCE.json`); see the handoff for counts |

With the final flag set, **twelve independent builds across six runs** (through c45319d) produced the identical `ffmpeg`/`ffprobe` bytes; the tarball digest `8c385028…002e` was reproduced by sixteen independent downloads, each signature-verified against the pinned key.

## 4. Isolation harness (`tools/ffmpeg/harness/`)

`run-decoder.mjs` policy, each point tested in `harness.test.mjs` (H0): argv array only (no shell; injection strings pass literally); **empty environment** unless explicitly listed; private temp cwd removed afterwards; stdin closed; wall-time limit with SIGTERM→SIGKILL on the **process group**; captured-output caps; `prlimit(1)` CPU / address-space / file-size / open-files / core limits (measured: `RLIMIT_FSIZE` stops a writer with `SIGXFSZ`, `RLIMIT_AS` fails a 1 GiB allocation under a 256 MiB cap). **Fail-closed (since the repair):** when `prlimit(1)` is unavailable `runDecoder` refuses to run (`spawnError: "limits-unavailable"`) unless the caller passes `allowNoLimits: true` (development only; recorded as `unlimitedByRequest`), and a pinned harness run fails if `prlimit` is missing. Up to c45319d it ran with no CPU/memory/file-size limits in that case (independent review F1).

`mp4-boxes.mjs` (H4 and every H2 fixture): an independent structural check that walks ISO-BMFF box headers without the decoder and rejects any declared size that does not fit the bytes present (32-bit and 64-bit `largesize`, nested containers, size-0 only for the last top-level box, `ftyp` first, exactly one `moov`). It exists because the decoder **tolerates** some oversized declarations (see §5, s11a).

Against the pinned build (H1, `HARNESS_PINNED=1`): version 9.0.2; `-buildconf` contains every flag in `configure.flags` and none of `--enable-gpl/--enable-nonfree/--enable-version3/libx264/libx265`; `-L` prints the LGPL notice; **protocols = {file}** only; decoders = {aac, h264}; encoders = {mjpeg, pcm_s16le, wrapped_avframe}; demuxer = {mov,…}; muxers = {image2, mov, mp4, null}; filters = the 4 requested (scale, crop, format, aresample) + 11 `configure` auto-selects + 4 unconditional graph endpoints (buffer/buffersink/abuffer/abuffersink), none from the GPL list; an `http://` input is refused.

Not provided by the harness (stated plainly): a kernel sandbox, seccomp or network namespace. "No network" is a property of the **build** (`--disable-network`, protocol=file only), asserted on the binary, not an OS-level guarantee around it. Cloud Functions egress controls remain a deploy-time concern (not authorized).

## 5. Synthetic fixtures (`tools/ffmpeg/fixtures/`)

Generated by `generate.sh` with a **development-only full FFmpeg** (the runner's Ubuntu `ffmpeg` package; locally FFmpeg 6.1.1), never the pinned binary and never shipped; recorded in `TOOLCHAIN.txt` beside `SHA256SUMS.txt`. Deterministic on one machine (bitexact, single-thread; generated twice per CI run and compared) but **not byte-identical across machines** (encoder CPU paths differ: runs 2/5 vs 7 produced different digests for the AAC-bearing and long clips), so the set is **frozen in git** under `tools/ffmpeg/fixtures/frozen/` (16 files, ~580 KB, generated locally with FFmpeg 6.1.1-3ubuntu5) with `SHA256SUMS.txt` verified on every run; the harness and S2b consume the frozen bytes. Content is test patterns and sine tones only; no people, no real footage. Set (19 files): 30/60 fps H.264+AAC, **genuine VFR**, HEVC, truncated, spoofed, empty, duration at/over the PENDING_D3 placeholder (300 000 / 300 500 ms), resolution at/over (1920×1080 / 1922×1080), GPS/device/creation-tag bearing, 13-stream, audio-only, WebM, known-good, and three **oversized box-size headers**. Expected probe/decode/structural outcomes in `expected.json` (H2); in pinned mode every listed fixture is required (no optional skips); the normalizing remux (`-map_metadata -1 -map_metadata:s -1 -map_chapters -1 -c copy -movflags +faststart` + bitexact) is verified by **re-probing the output and scanning its bytes** for the injected values (H3), and is byte-deterministic across runs.

Observed with the development FFmpeg: a truncated faststart MP4 **probes successfully**; only a full decode with `-xerror` reports the error (exit 183). S2b must therefore decode, not just probe.

**Repairs after the c45319d reviews (2026-10-20):**
- **VFR (Codex blocker 1).** The c45319d `s3-vfr.mp4` was CFR: `setpts=N/30/TB` reset every interval to 1/30 s (100 frames, 99 equal intervals). It is replaced by presentation times `(N+floor(N/2)+floor(N/5))/30` s with `-fps_mode passthrough`: 120 frames with intervals of 33/67/100 ms (48/60/11). H2 reads per-frame `best_effort_timestamp_time` from the binary under test (JSON) and asserts strictly increasing times, at least 3 distinct intervals and the exact histogram. This fixture establishes decoder compatibility only; **S2b's VFR policy is not decided here.**
- **Oversized headers (checklist 7, Codex blocker 3; independent review B1).** `s11a` (valid file, `moov` declares ~2 GiB), `s11b` (header-only `moov` with 64-bit largesize 2^62) and `s11c` (`ftyp` declares 4 GiB), derived from `s10` by `fixtures/oversize.mjs`. H2 asserts that the probe and the `-xerror` decode **terminate inside the harness limits** (no timeout, signal, spawn error or limits refusal; exits recorded), that the structural check rejects each with the expected reason, and that the harness verdict (structure ok AND probe ok AND decode ok) is never success. **Finding:** with the development FFmpeg, `s11a` probes (2 streams) and decodes with exit 0 — the decoder alone gives a false success on an oversized `moov` declaration; `s11b` probes with exit 0 and **zero streams** and fails to decode; `s11c` fails both. The pinned build's exits are recorded in the run annotations ("Harness key facts").
- **HEVC (Codex blocker 4).** In pinned mode H2 now runs `ffmpeg -xerror -i s4-hevc.mp4 -f null -` and asserts a non-zero exit with the "no decoder found for: hevc" error, after asserting the run was not a timeout, signal or spawn error. The same pinned refusal is asserted for the WebM fixture. Missing HEVC/WebM fixtures fail a pinned run instead of being skipped.
- `TOOLCHAIN.txt` records the amendment. The 15 unchanged fixtures were regenerated on the amending host with the same generator (`6.1.1-3ubuntu5`) and were **byte-identical** to the frozen set; `generate.sh` is deterministic across two runs there (19/19).

## 6. Handoff run (final SHA)

The handoff comment on issue #39 names the exact candidate SHA and its run id; the reviewer re-reads the digests and counts from that run's check-run annotations (`Decoder reproducible`, `Isolation harness (pinned build)`, `Frozen fixtures verified`) and the retained artifact `film-decoder-9.0.2-<sha>-<run>-<attempt>` (binary, `provenance/`, `harness.log`, `harness-result.json`, `fixtures/SHA256SUMS.txt`, `ARTIFACT_SHA256SUMS.txt`, `RUN.txt`). Expected on a handoff SHA: `ffmpeg` `1314ab3b…436ff1`, `ffprobe` `fd43ef9b…f48e6`, tarball `8c385028…002e` (corrected: §6 previously abbreviated the ffmpeg digest as `…41e8`, the tail of the superseded `34fea15f…` build — independent review F3); 19 frozen fixtures; harness and provenance counts as reported in that SHA's handoff (skipped tests are not passes).

## 7. Known limitations

- Builds and runs on GitHub-hosted `ubuntu-24.04` only; no other OS or architecture; reproducibility is proven within one runner image, not across images, and no independent off-CI rebuild has been done (neither reviewer could download the FFmpeg source tarball from their environment).
- No vulnerability scan beyond the release-notes check; FFmpeg advisories after 2026-10-19 are not covered.
- The harness cannot download the artifact from every network (blob storage is blocked from some agent containers); CI annotations carry the digests and counts for those cases.
- Licensing: engineering inventory only; specialist questions open; no distribution of the binary is permitted until cleared.

## 8. Fixed in the repaired candidate vs required before S2b

| Item | Source | Status |
|---|---|---|
| VFR fixture was CFR | Codex blocker 1 | **Fixed** (genuine VFR fixture; interval assertions on the pinned binary) |
| Malformed `build.json`; provenance not validated | Codex blocker 2 | **Fixed** (`provenance.mjs`: structured writer, validation in the build, on both builds and on the assembled artifact before upload; failure evidence uploaded only under a `FAILED` name; 11 unit tests including the exact c45319d shape) |
| Oversized-header fixture absent | Codex blocker 3; Claude B1 | **Fixed** (s11a/b/c; bounded-termination, structural-rejection and never-success assertions) |
| HEVC refusal not exercised | Codex blocker 4 | **Fixed** (pinned decode refusal asserted for HEVC and WebM; pinned mode forbids skips) |
| Artifact contents unverified by the Claude reviewer | Claude B2 | **Closed for c45319d** with Codex's evidence (30/30 payload files; 3 archives). The repaired candidate's new artifacts need fresh verification by a reviewer |
| `runDecoder` fails open without `prlimit` | Claude F1 | **Fixed in the harness** (fail-closed; pinned runs require `prlimit`). **Required before S2b:** prove that the S2b runtime (Cloud Functions image) provides `prlimit`, or an equivalent enforced limit, and fail closed there too |
| `SOURCE_DATE_EPOCH` = download time | Claude F2 | **Fixed** (release date, validated) |
| §6 digest typo | Claude F3 | **Fixed** |
| `jrevdct.c` missing from the licence inventory | Claude F4 | **Fixed** (inventory row; build fails if a compiled IJG file is not inventoried; actual `CONFIG_IDCTDSP` recorded in `build.json`) |
| Static glibc / libgcc framing | Claude F5 | **Fixed in docs** (inventory §4 questions 4–5). **Required before any distribution:** licensing specialist clearance |
| `ubuntu-latest` drift | Claude F6 | **Fixed** (`ubuntu-24.04`; expected binary digests pinned) |
| Actions pinned by major tag | Claude F7 | Unchanged (repository convention); revisit with the repository's workflow policy |
| **Decoder tolerates an oversized `moov` declaration (s11a)** | new, from the repair | **Required before S2b:** the S2b validator must apply a structural check (as `mp4-boxes.mjs` does) and must not treat a decoder exit 0 as proof of a well-formed container |
| Kernel sandbox / seccomp / network namespace / uid separation / filesystem confinement | checklist 6 gaps | **Required before S2b** (deployment design), or an explicit owner-accepted risk |
| `-protocol_whitelist file` and disabled `mov` external data references | Claude review | **Required before S2b** (assert in the worker) |
| VFR policy; HEVC / non-AAC / extra-stream reason mapping; exact units and dimension policy including height-only and +1 ms boundaries; missing/NaN probe metadata rejection; full decode plus output validation | Codex S2b prerequisites | **Required before S2b** (r4 contract agreement, r4 fixtures, FS-26) |
| r4 fields (`readyAt`, `normalizedGeneration`, `media`, `expiresAt`), closed new rejection reasons, T6 invariant amendment on both parsers | Codex S2b prerequisites | **Required before S2b** (versioned contract change; never weaken one parser alone) |
| Fuzzing / sanitizer builds; CVE monitoring beyond a light search | Claude review | **Required before production use** |
| Licensing specialist clearance (§4 questions 1–5) | authorization | **Required before any binary distribution or public release** |
