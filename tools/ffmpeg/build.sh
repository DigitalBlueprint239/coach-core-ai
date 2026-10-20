#!/usr/bin/env bash
# FILM-S2a: reproducible LGPL-only FFmpeg build from the verified tarball.
# Usage: build.sh <work-dir>   (run verify-source.sh first)
# Produces <work>/out/bin/{ffmpeg,ffprobe} and <work>/provenance/*.
# No installation outside <work>; no network use after verify-source.sh.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="${1:?work dir}"
SRC="$WORK/src"; PROV="$WORK/provenance"; OUT="$WORK/out"; BUILD="$WORK/build"
VERSION="$(node -e "console.log(require('$HERE/SOURCE.json').version)")"
TARBALL="$SRC/ffmpeg-$VERSION.tar.xz"
[ -f "$PROV/source.json" ] || { echo "run verify-source.sh first" >&2; exit 1; }
rm -rf "$BUILD" "$OUT"; mkdir -p "$BUILD" "$OUT" "$PROV"

# Reproducibility: fixed timestamp (the release date from SOURCE.json, NOT the
# downloaded file's mtime), no build host paths, C locale.
export SOURCE_DATE_EPOCH="$(node -e "console.log(require('$HERE/SOURCE.json').sourceDateEpoch)")"
[[ "$SOURCE_DATE_EPOCH" =~ ^[0-9]+$ ]] || { echo "bad sourceDateEpoch in SOURCE.json" >&2; exit 1; }
export LC_ALL=C TZ=UTC
tar -C "$BUILD" -xJf "$TARBALL"
SRCDIR="$BUILD/ffmpeg-$VERSION"

mapfile -t FLAGS < <(grep -vE '^\s*(#|$)' "$HERE/configure.flags")
PREFIX_MAP="-ffile-prefix-map=$SRCDIR=/ffmpeg-src -ffile-prefix-map=$BUILD=/build"
cd "$SRCDIR"
./configure --prefix="$OUT" "${FLAGS[@]}" \
  --extra-cflags="$PREFIX_MAP -O2" --extra-cxxflags="$PREFIX_MAP" \
  > "$PROV/configure.log" 2>&1 || { tail -50 "$PROV/configure.log" >&2; exit 1; }
# Fail closed if configure resolved to a GPL/nonfree build for any reason.
if grep -qE '^(CONFIG_GPL|CONFIG_NONFREE|CONFIG_VERSION3)=yes' ffbuild/config.mak; then
  echo "::error title=licence::configure enabled GPL/VERSION3/NONFREE" >&2; exit 6
fi
make -j"$(nproc)" V=0 > "$PROV/make.log" 2>&1 || { tail -50 "$PROV/make.log" >&2; exit 1; }
mkdir -p "$OUT/bin"
cp ffmpeg "$OUT/bin/ffmpeg"; cp ffprobe "$OUT/bin/ffprobe"
strip --strip-all "$OUT/bin/ffmpeg" "$OUT/bin/ffprobe"
# Licence texts shipped beside the binary (LGPL notice + source offer).
cp COPYING.LGPLv2.1 LICENSE.md "$OUT/"
cp ffbuild/config.mak "$PROV/config.mak"

B="$OUT/bin/ffmpeg"; P="$OUT/bin/ffprobe"
"$B" -hide_banner -version   > "$PROV/ffmpeg-version.txt" 2>&1
"$B" -hide_banner -buildconf > "$PROV/ffmpeg-buildconf.txt" 2>&1
"$B" -hide_banner -L         > "$PROV/ffmpeg-L.txt" 2>&1
for kind in demuxers muxers decoders encoders parsers bsfs protocols filters; do
  "$B" -hide_banner -$kind > "$PROV/ffmpeg-$kind.txt" 2>&1 || true
done
"$P" -hide_banner -version > "$PROV/ffprobe-version.txt" 2>&1
( cd "$OUT/bin" && sha256sum ffmpeg ffprobe ) > "$PROV/BINARY_SHA256SUMS.txt"
ldd "$B" > "$PROV/ffmpeg-ldd.txt" 2>&1 || true   # "not a dynamic executable" expected
# Structured provenance (JSON.stringify, never string substitution), then
# re-read and validated: an invalid or inconsistent record fails the build.
export TC_EXTRA_CFLAGS="$PREFIX_MAP -O2"
export TC_GCC="$(gcc --version | head -1)" TC_MAKE="$(make --version | head -1)"
export TC_NASM="$(nasm -v 2>/dev/null || echo none)" TC_BINUTILS="$(ld --version | head -1)"
export TC_OS="$(. /etc/os-release && echo "$PRETTY_NAME")" TC_KERNEL="$(uname -srm)"
export TC_RUNNER_IMAGE="${ImageOS:-unknown}/${ImageVersion:-unknown}"
node "$HERE/provenance.mjs" write-build "$WORK"
node "$HERE/provenance.mjs" validate "$WORK"
echo "[build] done: $(cat "$PROV/BINARY_SHA256SUMS.txt" | tr '\n' ' ')"
