#!/usr/bin/env bash
# FILM-S2a synthetic fixture generator.
#
# IMPORTANT: this script uses a DEVELOPMENT-ONLY, full-featured FFmpeg (the
# runner's distro package or an official build) because the pinned LGPL-only
# validator build has no H.264/HEVC *encoder* and cannot create test clips.
# That generator FFmpeg is never shipped, never run by the app and never part
# of the decoder artifact. Its exact version is recorded in TOOLCHAIN.txt next
# to the fixture digests. Fixtures are 100% synthetic (test patterns), no
# people, no real footage.
#
# Usage: generate.sh <out-dir> [generator-ffmpeg]   (default: ffmpeg on PATH)
set -euo pipefail
OUT="${1:?out dir}"; GEN="${2:-ffmpeg}"
mkdir -p "$OUT"
# Deterministic encoding: single thread, bitexact flags, no metadata, fixed
# timestamps. (The metadata fixture intentionally keeps tags; see below.)
DET=(-hide_banner -loglevel error -y)
# output-side determinism options (must follow the inputs)
DETOUT=(-threads 1 -fflags +bitexact -flags +bitexact -map_metadata -1)
X264=("${DETOUT[@]}" -c:v libx264 -preset veryfast -x264-params "threads=1:sliced-threads=0" -pix_fmt yuv420p)
AAC=(-c:a aac -b:a 48k -ac 1 -ar 48000)
MP4=(-movflags +faststart -f mp4)

v() { "$GEN" "${DET[@]}" "$@"; }

# S1: 30 fps test pattern with the built-in frame/time counter, 4 s, H.264 + AAC.
v -f lavfi -i "testsrc=size=320x180:rate=30:duration=4" -f lavfi -i "sine=frequency=440:sample_rate=48000:duration=4" \
  "${X264[@]}" "${AAC[@]}" -shortest "${MP4[@]}" "$OUT/s1-30fps-counter.mp4"
# S2: same at 60 fps.
v -f lavfi -i "testsrc=size=320x180:rate=60:duration=4" "${X264[@]}" -an "${MP4[@]}" "$OUT/s2-60fps.mp4"
# S3: variable frame rate (drop frames by a selection expression).
v -f lavfi -i "testsrc=size=320x180:rate=30:duration=4" -vf "select='not(mod(n\,3))*not(mod(n\,2))+mod(n\,5)',setpts=N/30/TB" -vsync vfr \
  "${X264[@]}" -an "${MP4[@]}" "$OUT/s3-vfr.mp4"
# S4: HEVC in MP4 (must be REJECTED by the validator: video codec not allowed).
if "$GEN" -hide_banner -encoders 2>/dev/null | grep -q libx265; then
  v -f lavfi -i "testsrc=size=320x180:rate=30:duration=2" -c:v libx265 -preset ultrafast -x265-params "log-level=error:pools=1" -pix_fmt yuv420p -an "${MP4[@]}" "$OUT/s4-hevc.mp4"
else
  echo "libx265 not available in generator; s4-hevc.mp4 NOT generated" > "$OUT/s4-hevc.MISSING"
fi
# S5: truncated copy of S1 (cut at 60%), spoofed MIME (plain text named .mp4), empty file.
BYTES=$(stat -c %s "$OUT/s1-30fps-counter.mp4"); head -c $((BYTES * 6 / 10)) "$OUT/s1-30fps-counter.mp4" > "$OUT/s5-truncated.mp4"
printf 'this is not a video, just text pretending to be an mp4 container\n' > "$OUT/s5-spoofed.mp4"
: > "$OUT/s5-empty.mp4"
# S6: duration boundary (PENDING_D3 placeholder 300000 ms). 64x64 at 2 fps keeps the file tiny.
v -f lavfi -i "testsrc=size=64x64:rate=2:duration=300" "${X264[@]}" -an "${MP4[@]}" "$OUT/s6-duration-at-limit-300000ms.mp4"
v -f lavfi -i "testsrc=size=64x64:rate=2:duration=300.5" "${X264[@]}" -an "${MP4[@]}" "$OUT/s6-duration-over-limit-300500ms.mp4"
# S6: resolution boundary (PENDING_D3 placeholder 1920x1080). H.264 needs even dimensions, so "over" is 1922x1080.
v -f lavfi -i "testsrc=size=1920x1080:rate=5:duration=1" "${X264[@]}" -an "${MP4[@]}" "$OUT/s6-res-at-limit-1920x1080.mp4"
v -f lavfi -i "testsrc=size=1922x1080:rate=5:duration=1" "${X264[@]}" -an "${MP4[@]}" "$OUT/s6-res-over-limit-1922x1080.mp4"
# S6: metadata-bearing clip: GPS (ISO 6709), creation time, device make/model, comment.
# Not bitexact on purpose (bitexact suppresses tags); the validator must strip ALL of these.
"$GEN" -hide_banner -loglevel error -y -f lavfi -i "testsrc=size=320x180:rate=30:duration=2" \
  -threads 1 -c:v libx264 -preset veryfast -x264-params "threads=1:sliced-threads=0" -pix_fmt yuv420p -an -movflags +faststart+use_metadata_tags \
  -metadata "location=+37.7749-122.4194/" -metadata "location-eng=+37.7749-122.4194/" \
  -metadata "com.apple.quicktime.location.ISO6709=+37.7749-122.4194/" \
  -metadata "creation_time=2026-01-02T03:04:05.000000Z" -metadata "make=SyntheticPhone" -metadata "model=SP-1" \
  -metadata "comment=synthetic metadata fixture" -metadata "artist=Synthetic Person" \
  -f mp4 "$OUT/s6-metadata-tags.mp4"
# S7: excessive stream count: 1 video + 12 audio streams.
MAPS=(); INPUTS=(-f lavfi -i "testsrc=size=160x90:rate=10:duration=1")
for i in $(seq 1 12); do INPUTS+=(-f lavfi -i "sine=frequency=$((200 + i * 50)):sample_rate=48000:duration=1"); MAPS+=(-map "$i:a"); done
v "${INPUTS[@]}" -map 0:v "${MAPS[@]}" "${X264[@]}" "${AAC[@]}" "${MP4[@]}" "$OUT/s7-excess-streams.mp4"
# S8: audio-only MP4 (no video stream) and S9: WebM container (wrong container).
v -f lavfi -i "sine=frequency=440:sample_rate=48000:duration=2" "${DETOUT[@]}" "${AAC[@]}" -vn "${MP4[@]}" "$OUT/s8-audio-only.mp4"
v -f lavfi -i "testsrc=size=160x90:rate=10:duration=1" "${DETOUT[@]}" -c:v libvpx-vp9 -b:v 100k -an -f webm "$OUT/s9-wrong-container.webm" 2>/dev/null \
  || echo "libvpx not available; s9 NOT generated" > "$OUT/s9-wrong-container.MISSING"
# S10: known-good small clip for determinism/remux checks (H.264 + AAC, 2 s).
v -f lavfi -i "testsrc=size=160x90:rate=10:duration=2" -f lavfi -i "sine=frequency=440:sample_rate=48000:duration=2" \
  "${X264[@]}" "${AAC[@]}" -shortest "${MP4[@]}" "$OUT/s10-known-good.mp4"

{
  echo "generator: $("$GEN" -hide_banner -version | head -1)"
  "$GEN" -hide_banner -version | sed -n '2,3p' | sed 's/^/generator: /'
  echo "generatedAt: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "note: development-only generator; never shipped; never run by the app"
} > "$OUT/TOOLCHAIN.txt"
( cd "$OUT" && sha256sum *.mp4 *.webm 2>/dev/null | sort -k2 ) > "$OUT/SHA256SUMS.txt"
echo "[fixtures] $(wc -l < "$OUT/SHA256SUMS.txt") files in $OUT"
