#!/usr/bin/env bash
# FILM-S2b additional synthetic media fixtures (package §B, "Worker media
# fixtures"). Same conventions as tools/ffmpeg/fixtures/generate.sh (S2a,
# frozen, not modified): DEVELOPMENT-ONLY full-featured generator FFmpeg,
# never shipped, never run by the app; 100% synthetic test patterns; the
# generator version is recorded in TOOLCHAIN.txt next to the digests.
#
# Usage: generate.sh <out-dir> [generator-ffmpeg]   (default: ffmpeg on PATH)
set -euo pipefail
OUT="${1:?out dir}"; GEN="${2:-ffmpeg}"
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$OUT"
DET=(-hide_banner -loglevel error -y)
DETOUT=(-threads 1 -fflags +bitexact -flags +bitexact -map_metadata -1)
X264=("${DETOUT[@]}" -c:v libx264 -preset veryfast -x264-params "threads=1:sliced-threads=0" -pix_fmt yuv420p)
v() { "$GEN" "${DET[@]}" "$@"; }

# s12: height-only over the PENDING_D3 placeholder (1920x1082; width at limit).
v -f lavfi -i "testsrc2=size=1920x1082:rate=10:duration=1" "${X264[@]}" \
  -movflags +faststart -f mp4 "$OUT/s12-height-over-1920x1082.mp4"
# s13: H.264 video + ALAC audio (audio codec not AAC) in MP4.
v -f lavfi -i "testsrc2=size=160x90:rate=10:duration=2" \
  -f lavfi -i "sine=frequency=440:sample_rate=48000:duration=2" \
  "${X264[@]}" -c:a alac -ac 1 -shortest -movflags +faststart -f mp4 \
  "$OUT/s13-audio-codec-alac.mp4"
# s14: two H.264 video streams, no audio.
v -f lavfi -i "testsrc2=size=160x90:rate=10:duration=1" \
  -f lavfi -i "testsrc2=size=160x90:rate=10:duration=1" \
  -map 0:v -map 1:v "${X264[@]}" -movflags +faststart -f mp4 \
  "$OUT/s14-two-video-streams.mp4"
# s15: external data reference. Base clip with moov at the END (no faststart,
# so chunk offsets stay valid when moov grows); dref.mjs then replaces each
# track's self-contained 'url ' entry with an external 'alis' reference to the
# sibling file "s15-dref-canary". With -enable_drefs 0 the decoder must never
# open it; tests place a FIFO there (a decoder that follows it blocks).
v -f lavfi -i "testsrc2=size=160x90:rate=10:duration=1" "${X264[@]}" \
  -f mp4 "$OUT/.s15-base.mp4"
node "$HERE/dref.mjs" "$OUT/.s15-base.mp4" "$OUT/s15-dref-external.mp4" \
  s15-dref-canary
rm -f "$OUT/.s15-base.mp4"

(cd "$OUT" && sha256sum s1[2-5]-*.mp4 > SHA256SUMS.txt)
{
  echo "generator: $("$GEN" -hide_banner -version | head -1)"
  echo "generator: $("$GEN" -hide_banner -version | sed -n 2p)"
  echo "host: $(. /etc/os-release && echo "$PRETTY_NAME")"
  echo "note: development-only generator; never shipped; never run by the app"
} > "$OUT/TOOLCHAIN.txt"
