#!/usr/bin/env bash
# FILM-S2a: download the official FFmpeg source tarball and verify it.
#   1. fetch the FFmpeg release signing key from ffmpeg.org and REFUSE it unless
#      its fingerprint equals the pin in SOURCE.json;
#   2. fetch tarball + detached signature and verify the signature with that key;
#   3. compute the tarball sha256 and compare with SOURCE.json when pinned.
# Writes <work>/provenance/source.json. Never builds, never installs anything
# outside <work>. Usage: verify-source.sh <work-dir>
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="${1:?work dir}"
SRC="$WORK/src"; PROV="$WORK/provenance"
mkdir -p "$SRC" "$PROV"

j() { node -e "const s=require('$HERE/SOURCE.json'); console.log(eval('s.'+process.argv[1]))" -- "$1"; }
VERSION="$(j version)"; TARBALL_URL="$(j tarball)"; SIG_URL="$(j signature)"
KEY_URL="$(j signingKey.url)"; PIN_FPR="$(j signingKey.pinnedFingerprint)"; PIN_SHA="$(j tarballSha256)"
TARBALL="$SRC/ffmpeg-$VERSION.tar.xz"; SIG="$TARBALL.asc"; KEY="$SRC/ffmpeg-devel.asc"

fetch() { curl --fail --silent --show-error --location --retry 3 --retry-delay 5 --max-time 600 -o "$2" "$1"; }
echo "[verify-source] downloading $TARBALL_URL"
fetch "$TARBALL_URL" "$TARBALL"; fetch "$SIG_URL" "$SIG"; fetch "$KEY_URL" "$KEY"

export GNUPGHOME="$(mktemp -d)"; chmod 700 "$GNUPGHOME"
gpg --batch --quiet --import "$KEY"
# Every primary fingerprint in the downloaded key file; refuse unless exactly the pin.
FPRS="$(gpg --batch --with-colons --list-keys | awk -F: '$1=="fpr"{print $10}' | sort -u)"
PRIMARY="$(gpg --batch --with-colons --list-keys | awk -F: '$1=="fpr"{print $10; exit}')"
echo "[verify-source] key fingerprints in $KEY_URL: $(echo "$FPRS" | tr '\n' ' ')"
if [ "$PRIMARY" != "$PIN_FPR" ]; then
  echo "::error title=FFmpeg signing key mismatch::downloaded key primary fingerprint $PRIMARY != pinned $PIN_FPR (SOURCE.json). Refusing to trust the source." >&2
  exit 2
fi
# Verify the detached signature and require the signing (sub)key to belong to the pinned primary.
VERIFY_OUT="$(gpg --batch --status-fd 1 --verify "$SIG" "$TARBALL" 2>/dev/null || true)"
if ! echo "$VERIFY_OUT" | grep -q '^\[GNUPG:\] VALIDSIG '; then
  echo "::error title=FFmpeg signature invalid::gpg did not report VALIDSIG for $TARBALL" >&2
  echo "$VERIFY_OUT" >&2; exit 3
fi
SIG_PRIMARY="$(echo "$VERIFY_OUT" | awk '/^\[GNUPG:\] VALIDSIG /{print $NF}')"
if [ "$SIG_PRIMARY" != "$PIN_FPR" ]; then
  echo "::error title=FFmpeg signature by unexpected key::VALIDSIG primary $SIG_PRIMARY != pinned $PIN_FPR" >&2; exit 4
fi
SHA="$(sha256sum "$TARBALL" | cut -d' ' -f1)"
if [ "$PIN_SHA" != "PENDING_FIRST_VERIFIED_BUILD" ] && [ "$SHA" != "$PIN_SHA" ]; then
  echo "::error title=FFmpeg tarball digest changed::sha256 $SHA != pinned $PIN_SHA. Review required." >&2; exit 5
fi
# Structured record (JSON.stringify via provenance.mjs), not a heredoc.
node -e '
const [, out, ...kv] = process.argv;
const o = {};
for (let i = 0; i < kv.length; i += 2) o[kv[i]] = kv[i + 1];
o.tarballBytes = Number(o.tarballBytes); o.signatureValid = o.signatureValid === "true";
require("fs").writeFileSync(out, JSON.stringify(o, null, 2) + "\n");
' -- "$PROV/source-fields.json" \
  version "$VERSION" tarball "$TARBALL_URL" tarballSha256 "$SHA" tarballBytes "$(stat -c %s "$TARBALL")" \
  signature "$SIG_URL" signatureValid true signingKeyPrimaryFingerprint "$SIG_PRIMARY" \
  pinnedFingerprint "$PIN_FPR" pinnedTarballSha256 "$PIN_SHA" \
  verifiedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" gpg "$(gpg --version | head -1)"
node "$HERE/provenance.mjs" write-source "$WORK" "$PROV/source-fields.json"
rm -f "$PROV/source-fields.json"
echo "[verify-source] OK sha256=$SHA signed-by=$SIG_PRIMARY"
