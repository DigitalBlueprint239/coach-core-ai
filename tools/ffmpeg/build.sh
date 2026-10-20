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

# Reproducibility: fixed timestamp (tarball mtime), no build host paths, C locale.
export SOURCE_DATE_EPOCH="$(stat -c %Y "$TARBALL")"
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
cat > "$PROV/build.json" <<JSON
{
  "version": "$VERSION",
  "sourceDateEpoch": "$SOURCE_DATE_EPOCH",
  "configureFlags": $(node -e "console.log(JSON.stringify(process.argv.slice(1)))" "${FLAGS[@]}"),
  "extraCflags": "$PREFIX_MAP -O2",
  "toolchain": {
    "gcc": "$(gcc --version | head -1)",
    "make": "$(make --version | head -1)",
    "nasm": "$(nasm -v 2>/dev/null || echo none)",
    "binutils": "$(ld --version | head -1)",
    "os": "$(. /etc/os-release && echo "$PRETTY_NAME")",
    "kernel": "$(uname -srm)",
    "runnerImage": "${ImageOS:-unknown}/${ImageVersion:-unknown}"
  },
  "binaries": $(node -e "const fs=require('fs');const o={};for(const l of fs.readFileSync(process.argv[1],'utf8').trim().split('\n')){const [h,n]=l.split(/\s+/);o[n]={sha256:h,bytes:fs.statSync(process.argv[2]+'/'+n).size}};console.log(JSON.stringify(o))" "$PROV/BINARY_SHA256SUMS.txt" "$OUT/bin"),
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
echo "[build] done: $(cat "$PROV/BINARY_SHA256SUMS.txt" | tr '\n' ' ')"
