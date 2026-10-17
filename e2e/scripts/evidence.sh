#!/usr/bin/env bash
# B15 (2026-10-17): retain raw execution logs and the release-build manifest in a
# directory Playwright never clears, preserve the test process's exit status, and
# produce an upload-aligned inventory with full SHA-256 digests.
#
#   evidence.sh run <evidence-dir> -- <command...>
#       Runs the command with stdout+stderr tee'd to <evidence-dir>/run.log and exits
#       with the COMMAND's status (not tee's). <evidence-dir> must not be a Playwright
#       outputDir: Playwright's "clear output" task deletes outputDir at run start.
#
#   evidence.sh finalize <evidence-dir> <results-dir> <required-file>...
#       Redacts token-shaped strings in run.log, writes INVENTORY.sha256 covering every
#       file (hidden files included) under <evidence-dir> and <results-dir>, and FAILS
#       (exit 1, ::error) if any required file is missing or empty. Never exposes secrets.
set -u
cmd="${1:-}"; shift || true
case "$cmd" in
  run)
    dir="$1"; shift
    [ "${1:-}" = "--" ] && shift
    mkdir -p "$dir"
    set -o pipefail
    "$@" 2>&1 | tee "$dir/run.log"
    status=${PIPESTATUS[0]}
    echo "exit=$status" > "$dir/run.exit"
    exit "$status"
    ;;
  finalize)
    dir="$1"; results="$2"; shift 2
    mkdir -p "$dir"
    missing=0
    for f in "$@"; do
      if [ ! -s "$f" ]; then echo "::error title=E2E evidence missing::required evidence file missing or empty: $f"; missing=1; fi
    done
    if [ -f "$dir/run.log" ]; then
      # Redact token-shaped material (emulator OOB codes, bearer/JWT strings, API keys). Synthetic
      # emulator e-mail addresses used by the tests are not personal data and are kept for diagnosis.
      before=$(wc -c < "$dir/run.log")
      sed -E -i \
        -e 's/(oobCode=)[A-Za-z0-9_-]+/\1[REDACTED]/g' \
        -e 's/(Bearer )[A-Za-z0-9._-]+/\1[REDACTED]/g' \
        -e 's/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/[REDACTED-JWT]/g' \
        -e 's/([?&](key|apiKey|token|access_token|id_token|refresh_token)=)[^&[:space:]"]+/\1[REDACTED]/g' \
        "$dir/run.log"
      echo "run.log redaction: bytes_before=$before bytes_after=$(wc -c < "$dir/run.log")" > "$dir/REDACTION.txt"
    fi
    inv="$dir/INVENTORY.sha256"
    {
      echo "# Upload-aligned inventory: every regular file under the upload paths, hidden files INCLUDED (upload uses include-hidden-files: true)."
      echo "# paths: $dir $results"
      for root in "$dir" "$results"; do
        [ -d "$root" ] || { echo "# (absent) $root"; continue; }
        find "$root" -type f ! -name INVENTORY.sha256 -print0 | sort -z | xargs -0 -r sha256sum
      done
    } > "$inv"
    echo "evidence inventory: $(grep -vc '^#' "$inv") files listed in $inv"
    exit "$missing"
    ;;
  *) echo "usage: evidence.sh run <dir> -- <cmd...> | finalize <dir> <results-dir> <required>..." >&2; exit 2 ;;
esac
