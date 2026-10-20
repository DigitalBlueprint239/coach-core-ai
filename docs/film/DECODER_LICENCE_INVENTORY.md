# Film validator decoder — licence inventory (FILM-S2a)

Status: **engineering inventory, not legal advice.** Prepared for the FILM-S2a review (issue #39). The specialist questions in §4 remain **open** and must be cleared before any binary distribution, repository vendoring or public release. Until then the binary is used only for synthetic test material in CI and on developer machines, and retained only as a 14-day repository-scoped workflow artifact.

## 1. What is built

FFmpeg **9.0.2** ("Lei"), official tarball, PGP-verified against the FFmpeg release signing key (fingerprint pinned in `tools/ffmpeg/SOURCE.json`, cross-check against https://ffmpeg.org/download.html), configured with `tools/ffmpeg/configure.flags`:

```
--disable-everything --disable-autodetect --disable-network --disable-doc --disable-ffplay
--enable-ffmpeg --enable-ffprobe --enable-protocol=file --enable-demuxer=mov
--enable-muxer=mp4,image2,null --enable-decoder=h264,aac --enable-encoder=mjpeg,wrapped_avframe,pcm_s16le
--enable-parser=h264,aac --enable-bsf=h264_mp4toannexb --enable-swscale
--enable-filter=scale,crop,format,aresample --enable-static --disable-shared --enable-small
--disable-debug --extra-ldflags=-static --pkg-config-flags=--static
```

**Absent by design:** `--enable-gpl`, `--enable-version3`, `--enable-nonfree`, every external library (no libx264/libx265/libvpx/libfdk-aac/openssl/…). `build.sh` fails if `configure` resolves `CONFIG_GPL`, `CONFIG_VERSION3` or `CONFIG_NONFREE` to `yes`. The harness asserts the same from the binary (`-buildconf`, `-L`, `-protocols`, component lists).

## 2. Enabled components and their source licence (FFmpeg tag `n9.0.2`)

Licence lines read from the file headers at `https://raw.githubusercontent.com/FFmpeg/FFmpeg/n9.0.2/<path>` on 2026-10-19 (all: "GNU Lesser General Public License … version 2.1 of the License, or (at your option) any later version").

| Component (configure name) | Source file(s) | Licence |
|---|---|---|
| `ffmpeg`, `ffprobe` tools | `fftools/ffmpeg.c`, `fftools/ffprobe.c` | LGPL-2.1-or-later |
| protocol `file` | `libavformat/file.c` | LGPL-2.1-or-later |
| demuxer `mov` (mov,mp4,m4a,3gp,3g2,mj2) | `libavformat/mov.c` | LGPL-2.1-or-later |
| muxers `mp4` and `mov` (`mp4` selects `mov`; one source file) | `libavformat/movenc.c` | LGPL-2.1-or-later |
| muxer `image2` | `libavformat/img2enc.c` | LGPL-2.1-or-later |
| muxer `null` (full-decode check, no output file) | `libavformat/nullenc.c` | LGPL-2.1-or-later |
| encoders `wrapped_avframe`, `pcm_s16le` (the `null` muxer's pass-through defaults; no compression) | `libavcodec/wrapped_avframe.c`, `libavcodec/pcm.c` | LGPL-2.1-or-later |
| decoder `h264` | `libavcodec/h264dec.c` (+ `h264_*.c`) | LGPL-2.1-or-later |
| decoder `aac` | `libavcodec/aac/aacdec.c` | LGPL-2.1-or-later |
| encoder `mjpeg` | `libavcodec/mjpegenc.c` | LGPL-2.1-or-later; uses the libjpeg-derived DCT files below |
| parsers `h264`, `aac` | `libavcodec/h264_parser.c`, `libavcodec/aac_parser.c` | LGPL-2.1-or-later |
| bsf `h264_mp4toannexb` | `libavcodec/bsf/h264_mp4toannexb.c` | LGPL-2.1-or-later |
| filters `scale`, `crop`, `format` | `libavfilter/vf_scale.c`, `vf_crop.c`, `vf_format.c` | LGPL-2.1-or-later |
| graph endpoints always compiled into libavfilter: `buffer`, `buffersink`, `abuffer`, `abuffersink` | `libavfilter/buffersrc.c`, `buffersink.c` | LGPL-2.1-or-later |
| filters auto-selected by `configure` for the `ffmpeg` tool (`ffmpeg_select`, configure line 4378): `aformat anull atrim crop format hflip null rotate transpose trim vflip` | `libavfilter/af_aformat.c`, `af_anull.c`, `trim.c`, `vf_crop.c`, `vf_format.c`, `vf_hflip.c`, `vf_null.c`, `vf_rotate.c`, `vf_transpose.c`, `vf_vflip.c` | LGPL-2.1-or-later (libavfilter core; none is in LICENSE.md's GPL list) |
| filter `aresample` + `libswresample` (decoded AAC → the null sink; no output ever written) | `libavfilter/af_aresample.c`, `libswresample/*` | LGPL-2.1-or-later |
| `libswscale` | `libswscale/swscale.c` | LGPL-2.1-or-later |
| `libavutil` (always) | `libavutil/*` | LGPL-2.1-or-later |
| libjpeg-derived forward DCT (`fdctdsp`, used by the `mjpeg` encoder) | `libavcodec/jfdctfst.c`, `libavcodec/jfdctint_template.c` | IJG (libjpeg) licence — **documentation credit to the IJG required if executables are distributed** (LICENSE.md "other licensing terms") |
| libjpeg-derived inverse DCT (`idctdsp`) | `libavcodec/jrevdct.c` | IJG (libjpeg) licence, same credit obligation. LICENSE.md names **three** IJG files; `jrevdct.c` was missing from this inventory at c45319d (independent review F4). It is compiled iff `CONFIG_IDCTDSP=yes` (`libavcodec/Makefile` @ n9.0.2: `OBJS-$(CONFIG_IDCTDSP) += idctdsp.o simple_idct.o jrevdct.o`). `provenance.mjs` now records the IJG files actually compiled (from `config.mak`) in `build.json` and **fails the build** if any compiled IJG file is absent from this inventory. |

Project statement (`LICENSE.md` in the tarball): "Most files in FFmpeg are under the GNU Lesser General Public License version 2.1 or later … In combination the LGPL v2.1+ applies to FFmpeg. Some optional parts … are licensed under the GNU General Public License … None of these parts are used by default, you have to explicitly pass `--enable-gpl`." None of the GPL-listed files (x86 `idct_mmx.c`/`flac_dsp_gpl.asm`/`vf_removegrain.asm`, the GPL filters) is enabled by this configuration; the harness verifies the filter list is exactly the requested four, the eleven `configure` auto-selects and the four unconditional graph endpoints, and nothing from the GPL list.

**Resulting binary licence (engineering reading):** LGPL-2.1-or-later for the FFmpeg parts, with the IJG credit obligation attached to the libjpeg-derived DCT files, **statically linked** (`--extra-ldflags=-static`) against the runner's glibc (LGPL-2.1-or-later) and the GCC runtime support objects (`libgcc`/`libgcc_eh`, GPL-3.0 with the GCC Runtime Library Exception). `COPYING.LGPLv2.1` and `LICENSE.md` are copied next to the binary in the artifact. The static-link components are **not yet inventoried by version**; see §4 questions 4–5.

## 3. Notice and source-offer text (proposed; ship with any distribution)

> This product includes FFmpeg (https://ffmpeg.org), version 9.0.2, licensed under the GNU Lesser General Public License version 2.1 or later. The complete corresponding source code, the exact configure flags and the build script are available at `tools/ffmpeg/` in the Coach Core repository and from https://ffmpeg.org/releases/ffmpeg-9.0.2.tar.xz (sha256 recorded in `tools/ffmpeg/SOURCE.json`). This software is based in part on the work of the Independent JPEG Group. No part of FFmpeg has been modified.

## 4. Questions that need a licensing specialist (open; deferred by Coach Drew on 2026-10-19)

1. **H.264/AVC and AAC patent licensing.** Decoding H.264 and AAC commercially on Coach Core's servers may require a licence from the relevant patent pools (Via LA for AVC; Via LA / VoiceAge for AAC) independently of FFmpeg's copyright licence. Is Coach Core's beta volume and use covered by a free tier, or is a licence required before production use?
2. **LGPL-2.1 obligations for a server-side child process.** The binary is executed by Cloud Functions and never delivered to coaches. Confirm that no "distribution" obligation arises from running it server-side, and whether publishing the notice/source offer in §3 (proposed regardless) is sufficient.
3. **Repository vendoring / release assets.** The `coach-core-ai` repository is public. Committing the binary, or attaching it as a release asset, is distribution: the LGPL notice/source offer and the IJG credit would then be required, and question 1 becomes relevant to anyone who downloads it. This is why FILM-S2a retains the binary only as a workflow artifact.
4. **Static linking with glibc (corrected framing, independent review F5).** The binary statically links glibc (LGPL-2.1-or-later). The GPL "system library" exception is not the relevant mechanism for an LGPL library linked *statically*: if the executable is ever distributed, LGPL-2.1 §6 obligations apply to the combined work (for example, providing the means to relink against a modified glibc — object files or source — and the glibc notice and source offer). Engineering view: there is no distribution in S2a or in server-side execution. Confirm whether any obligation arises from server-side use, and what must accompany any future distribution.
5. **GCC runtime support objects.** Static linking also pulls in `libgcc`/`libgcc_eh` (GPL-3.0 with the GCC Runtime Library Exception). Confirm that the exception covers this build (an eligible compilation process with GCC, no GPL-incompatible plugins) and record the exact GCC and glibc versions from `provenance/build.json` (`toolchain.gcc`, `toolchain.os`) in any notice.

## 5. What this inventory does not cover

- Static-link components by exact version (glibc, libgcc): recorded per build in `provenance/build.json`, but not yet listed here line by line (see §4 questions 4–5).

Vulnerability review of FFmpeg 9.0.2 beyond the release-notes check recorded in `DECODER_PROVENANCE.md`; the development-only generator FFmpeg (distro package, recorded in the fixture `TOOLCHAIN.txt`, never shipped); any future change to `configure.flags`, which re-opens this inventory.
