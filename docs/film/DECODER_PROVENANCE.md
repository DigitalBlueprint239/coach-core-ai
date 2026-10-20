# Film validator decoder — provenance record (FILM-S2a)

Status: **engineering record for independent review; not deployed, not published, not legally cleared.** The binary exists only as a repository-scoped GitHub Actions workflow artifact (14-day retention) produced by `.github/workflows/film-decoder-build.yml`. No release asset, package, image, bucket or repository vendoring. Licensing questions in `DECODER_LICENCE_INVENTORY.md` §4 are open.

## 1. Source

| Item | Value |
|---|---|
| Component | FFmpeg 9.0.2 "Lei" (9.0 branch released 2026-08-04; 9.0.2 patch 2026-09-18 per ffmpeg.org/download) |
| Tarball | `https://ffmpeg.org/releases/ffmpeg-9.0.2.tar.xz` |
| Detached signature | `https://ffmpeg.org/releases/ffmpeg-9.0.2.tar.xz.asc` |
| Signing key | `https://ffmpeg.org/ffmpeg-devel.asc`, primary fingerprint pinned in `tools/ffmpeg/SOURCE.json`: `FCF986EA15E6E293A5644F10B4322F04D67658D8` — **reviewer action: cross-check against the fingerprint printed on https://ffmpeg.org/download.html** (the implementer's container cannot reach ffmpeg.org) |
| Verification | `tools/ffmpeg/verify-source.sh`: refuses the key unless its primary fingerprint equals the pin; requires gpg `VALIDSIG` whose primary key equals the pin; records the tarball sha256 |
| Tarball sha256 (CI, both independent jobs) | `8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e` — pinned in `SOURCE.json` after the first verified build (TOFU on a signature-verified download; any later change fails the build) |

## 2. Build

| Item | Value |
|---|---|
| Script | `tools/ffmpeg/build.sh` with `tools/ffmpeg/configure.flags` (LGPL-only minimal recipe from the founder packet §5, plus `--disable-debug`, static link, `-ffile-prefix-map`, and the `null` muxer with its pass-through encoders) |
| Reproducibility controls | `SOURCE_DATE_EPOCH` = tarball mtime; `LC_ALL=C`, `TZ=UTC`; `-ffile-prefix-map` for source and build dirs; `strip --strip-all`; single toolchain image |
| Fail-closed | `build.sh` exits 6 if `ffbuild/config.mak` has `CONFIG_GPL`, `CONFIG_VERSION3` or `CONFIG_NONFREE` = yes |
| Toolchain | GitHub `ubuntu-latest` runner image (recorded per run in `provenance/build.json`: gcc, make, nasm, binutils, OS, kernel, `ImageOS/ImageVersion`); `nasm` installed from Ubuntu for x86 asm |
| Outputs | `out/bin/ffmpeg`, `out/bin/ffprobe` (static, stripped), `out/COPYING.LGPLv2.1`, `out/LICENSE.md`; `provenance/{source.json,build.json,config.mak,configure.log,make.log,ffmpeg-version.txt,ffmpeg-buildconf.txt,ffmpeg-L.txt,ffmpeg-{demuxers,muxers,decoders,encoders,parsers,bsfs,protocols,filters}.txt,ffprobe-version.txt,BINARY_SHA256SUMS.txt,ffmpeg-ldd.txt}` |

## 3. Reproducibility proof

Two independent jobs (`build a`, `build b`; separate runners, separate downloads, separate signature verifications) must produce byte-identical `ffmpeg` and `ffprobe` (`cmp`) and the same tarball digest; the `verify` job fails otherwise.

| Run | Candidate | Result |
|---|---|---|
| [39348016177](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39348016177) | `711702c` | builds a/b reproducible: `ffmpeg` sha256 `47ca0cd624c64139d776e1731a9fa612e10ede79267b0d56eb4636794e55c4b2`, `ffprobe` `76821950404431fb00e33dde895a4178b3a70eeec3152f345b43fe9ab1d0557a`; harness FAILED (no `null` muxer in the recipe → `-f null -` decode checks impossible) — fixed in `5879ff1` |
| final | see §6 | filled from the handoff run |

Binary digests change whenever `configure.flags` changes (the `null` muxer was added after run 1); the handoff SHA's digests are authoritative.

## 4. Isolation harness (`tools/ffmpeg/harness/`)

`run-decoder.mjs` policy, each point tested in `harness.test.mjs` (H0): argv array only (no shell; injection strings pass literally); **empty environment** unless explicitly listed; private temp cwd removed afterwards; stdin closed; wall-time limit with SIGTERM→SIGKILL on the **process group**; captured-output caps; `prlimit(1)` CPU / address-space / file-size / open-files / core limits when available (measured: `RLIMIT_FSIZE` stops a writer with `SIGXFSZ`, `RLIMIT_AS` fails a 1 GiB allocation under a 256 MiB cap).

Against the pinned build (H1, `HARNESS_PINNED=1`): version 9.0.2; `-buildconf` contains every flag in `configure.flags` and none of `--enable-gpl/--enable-nonfree/--enable-version3/libx264/libx265`; `-L` prints the LGPL notice; **protocols = {file}** only; decoders = {aac, h264}; encoders = {mjpeg, pcm_s16le, wrapped_avframe}; demuxer = {mov,…}; muxers = {image2, mov, mp4, null}; filters = the 4 requested (scale, crop, format, aresample) + 11 `configure` auto-selects + 4 unconditional graph endpoints (buffer/buffersink/abuffer/abuffersink), none from the GPL list; an `http://` input is refused.

Not provided by the harness (stated plainly): a kernel sandbox, seccomp or network namespace. "No network" is a property of the **build** (`--disable-network`, protocol=file only), asserted on the binary, not an OS-level guarantee around it. Cloud Functions egress controls remain a deploy-time concern (not authorized).

## 5. Synthetic fixtures (`tools/ffmpeg/fixtures/`)

Generated by `generate.sh` with a **development-only full FFmpeg** (the runner's Ubuntu `ffmpeg` package; locally FFmpeg 6.1.1), never the pinned binary and never shipped; recorded in `TOOLCHAIN.txt` beside `SHA256SUMS.txt`. Deterministic on one machine (bitexact, single-thread; generated twice per CI run and compared) but **not byte-identical across machines** (encoder CPU paths differ: runs 2/5 vs 7 produced different digests for the AAC-bearing and long clips), so the set is **frozen in git** under `tools/ffmpeg/fixtures/frozen/` (16 files, ~580 KB, generated locally with FFmpeg 6.1.1-3ubuntu5) with `SHA256SUMS.txt` verified on every run; the harness and S2b consume the frozen bytes. Content is test patterns and sine tones only; no people, no real footage. Set: 30/60 fps H.264+AAC, VFR, HEVC (when the generator has libx265), truncated, spoofed, empty, duration at/over the PENDING_D3 placeholder (300 000 / 300 500 ms), resolution at/over (1920×1080 / 1922×1080), GPS/device/creation-tag bearing, 13-stream, audio-only, WebM, known-good. Expected probe/decode outcomes in `expected.json` (H2); the normalizing remux (`-map_metadata -1 -map_metadata:s -1 -map_chapters -1 -c copy -movflags +faststart` + bitexact) is verified by **re-probing the output and scanning its bytes** for the injected values (H3), and is byte-deterministic across runs.

Observed with the development FFmpeg: a truncated faststart MP4 **probes successfully**; only a full decode with `-xerror` reports the error (exit 183). S2b must therefore decode, not just probe.

## 6. Handoff run (final SHA)

Filled by the implementer at handoff: candidate SHA, run id, build a/b digests, tarball digest, fixture file count and `SHA256SUMS` digest, harness counts (tests/pass/fail/skipped), artifact name. The reviewer re-reads these from the run's check-run annotations and the artifact.

## 7. Known limitations

- Builds and runs on GitHub-hosted `ubuntu-latest` only; no other OS or architecture; reproducibility is proven within one runner image, not across images.
- The signing-key fingerprint pin is from the implementer's knowledge of ffmpeg.org/download.html and must be independently confirmed by the reviewer (the signature itself verified in CI).
- No vulnerability scan beyond the release-notes check; FFmpeg advisories after 2026-10-19 are not covered.
- The harness cannot download the artifact from every network (blob storage is blocked from some agent containers); CI annotations carry the digests and counts for those cases.
- Licensing: engineering inventory only; specialist questions open; no distribution of the binary is permitted until cleared.
