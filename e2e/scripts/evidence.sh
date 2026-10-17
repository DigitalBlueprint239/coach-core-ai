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
    # Fail-closed (Codex review of 04d4be8): every processing step is checked; any failure ->
    # exit 1, a ::error naming the step (never the content), and NO "UPLOAD_OK" marker. The
    # workflow uploads only when the marker exists, so an always() upload cannot publish an
    # unredacted log or an uninventoried directory.
    dir="$1"; results="$2"; shift 2
    marker="$dir/UPLOAD_OK"
    rm -f "$marker" 2>/dev/null || true
    fail() { echo "::error title=E2E evidence finalize failed::$1 (evidence NOT eligible for upload)"; exit 1; }
    mkdir -p "$dir" 2>/dev/null || fail "cannot create evidence dir"
    [ -w "$dir" ] || fail "evidence dir is not writable"
    missing=0
    for f in "$@"; do
      if [ ! -s "$f" ]; then echo "::error title=E2E evidence missing::required evidence file missing or empty: $f"; missing=1; fi
    done
    if [ -f "$dir/run.log" ]; then
      [ -r "$dir/run.log" ] && [ -w "$dir/run.log" ] || fail "run.log is not readable/writable; cannot sanitize"
      # Redact token-shaped material (emulator OOB codes, bearer/JWT strings, API keys) into a NEW
      # file, verify it, then replace. Synthetic emulator e-mail addresses used by the tests are not
      # personal data and are kept for diagnosis. Only run.log is sanitized by this step.
      before=$(wc -c < "$dir/run.log") || fail "cannot size run.log"
      tmp="$dir/.run.log.redacting"
      sed -E \
        -e 's/(oobCode=)[A-Za-z0-9_-]+/\1[REDACTED]/g' \
        -e 's/(Bearer )[A-Za-z0-9._-]+/\1[REDACTED]/g' \
        -e 's/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/[REDACTED-JWT]/g' \
        -e 's/([?&](key|apiKey|token|access_token|id_token|refresh_token)=)[^&[:space:]"]+/\1[REDACTED]/g' \
        "$dir/run.log" > "$tmp" || { rm -f "$tmp"; fail "redaction (sed) failed"; }
      # Post-redaction verification: none of the token shapes may remain. grep's status is
      # handled EXPLICITLY (Codex review of 3befdf1): 0 = prohibited pattern found -> reject;
      # 1 = clean scan -> continue; 2 or anything else = the verifier itself failed -> reject.
      # A verifier that could not run is never treated as a clean scan.
      grep -Eq 'oobCode=[A-Za-z0-9_-]|Bearer [A-Za-z0-9._-]{8,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|[?&](key|apiKey|token|access_token|id_token|refresh_token)=[^&[:space:]"\[]' "$tmp" 2>/dev/null
      vst=$?
      case "$vst" in
        0) rm -f "$tmp"; fail "redaction verification failed: token-shaped content remains" ;;
        1) ;;
        *) rm -f "$tmp"; fail "redaction verification could not run (grep exit $vst); sanitization is UNPROVEN" ;;
      esac
      mv -f "$tmp" "$dir/run.log" || { rm -f "$tmp"; fail "cannot replace run.log with the redacted copy"; }
      echo "run.log redaction: bytes_before=$before bytes_after=$(wc -c < "$dir/run.log")" > "$dir/REDACTION.txt" || fail "cannot write REDACTION.txt"
    fi
    inv="$dir/INVENTORY.sha256"
    tmpinv="$dir/.INVENTORY.sha256.tmp"
    (
      set -o pipefail
      echo "# Upload-aligned inventory: every regular file under the upload paths, hidden files INCLUDED (upload uses include-hidden-files: true)."
      echo "# paths: $dir $results"
      for root in "$dir" "$results"; do
        [ -d "$root" ] || { echo "# (absent) $root"; continue; }
        find "$root" -type f ! -name INVENTORY.sha256 ! -name '.INVENTORY.sha256.tmp' ! -name '.INVENTORY.entries.tmp' ! -name UPLOAD_OK -print0 | sort -z | xargs -0 -r sha256sum || exit 99
      done
    ) > "$tmpinv" || { rm -f "$tmpinv"; fail "inventory creation failed (find/sha256sum/write)"; }
    [ -s "$tmpinv" ] || { rm -f "$tmpinv"; fail "inventory is empty"; }
    mv -f "$tmpinv" "$inv" || { rm -f "$tmpinv"; fail "cannot write INVENTORY.sha256"; }
    # Re-verify every listed digest against the bytes on disk (post-redaction) before declaring
    # eligibility. Each verifier's status is handled explicitly: extracting the digest lines
    # (grep: 0 = lines found -> continue; 1 = NO digest lines -> reject; other = grep failed -> reject),
    # counting them, and sha256sum -c (0 = all match; anything else = reject). No pipelines, so no
    # status can be masked.
    entries="$dir/.INVENTORY.entries.tmp"
    grep -v '^#' "$inv" > "$entries" 2>/dev/null
    gst=$?
    case "$gst" in
      0) ;;
      1) rm -f "$entries"; fail "inventory has no digest lines (nothing was hashed)" ;;
      *) rm -f "$entries"; fail "inventory read failed (grep exit $gst); digests UNVERIFIED" ;;
    esac
    n=$(wc -l < "$entries") || { rm -f "$entries"; fail "cannot count inventory entries"; }
    case "$n" in ''|*[!0-9]*) rm -f "$entries"; fail "inventory entry count is not a number" ;; esac
    [ "$n" -ge 1 ] || { rm -f "$entries"; fail "inventory has no digest lines (nothing was hashed)"; }
    sha256sum -c --quiet --status -- "$entries" 2>/dev/null
    sst=$?
    rm -f "$entries"
    case "$sst" in
      0) ;;
      1) fail "inventory verification failed: a listed digest does not match the file" ;;
      *) fail "inventory verification could not run (sha256sum exit $sst); digests UNVERIFIED" ;;
    esac
    echo "evidence inventory: $n files listed in $inv"
    if [ "$missing" -ne 0 ]; then echo "::error title=E2E evidence finalize failed::required evidence missing (see above); evidence NOT eligible for upload"; exit 1; fi
    echo "ok: redacted and inventoried $n files at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$marker" || fail "cannot write UPLOAD_OK marker"
    exit 0
    ;;
  *) echo "usage: evidence.sh run <dir> -- <cmd...> | finalize <dir> <results-dir> <required>..." >&2; exit 2 ;;
esac
