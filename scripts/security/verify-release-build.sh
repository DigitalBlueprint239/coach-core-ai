#!/usr/bin/env bash
# Release-build proof (staging readiness, CC-NEXT-04 follow-up).
#
# Builds the web app exactly as a staging/production build would be built
# (no emulator flag; .env.production applies) with a PUBLIC project ID and a
# placeholder web key, then proves that no test hook, emulator wiring or
# demo-project value is in the shipped files. Also proves the guard refuses an
# emulator build aimed at a real project. Writes a SHA-256 manifest of the
# build so the deployed files can be compared byte-for-byte later.
#
# Legacy-import default-OFF (PR #78, fourth revision 2026-10-18): this script proves the
# CONFIGURATION legs only — effective build-time flag resolved OFF before building (L1) and
# inlined as a single import-config=false literal in the shipped entry chunks (L2). It makes NO
# behavioural claim from minified output. The behavioural leg (L3) is a real-browser run of the
# same-commit import-OFF emulator build plus the accepted ON control, judged by
# `release-import-config.js gate`. See docs/security/RELEASE_PROOF_IMPORT_OFF_2026-10-18.md.
#
# Usage: bash scripts/security/verify-release-build.sh [project-id]
# No credentials are used or needed; nothing is deployed.
set -euo pipefail
cd "$(dirname "$0")/../.."
PROJECT="${1:-coach-core-mvp-staging-239}"
OUT="${RELEASE_BUILD_DIR:-build}"
status=0; n=0
pass() { echo "PASS $1"; n=$((n + 1)); }
fail() { echo "FAIL $1 -- $2"; status=1; }

# 1. Guard: an emulator build for a real project must be refused.
if REACT_APP_USE_FIREBASE_EMULATORS=true REACT_APP_FIREBASE_PROJECT_ID="$PROJECT" \
   node scripts/security/check-client-env.js >/tmp/release-guard.log 2>&1; then
  fail "guard" "emulator flag accepted for $PROJECT"
else pass "guard refuses an emulator build for $PROJECT"; fi

# 2. .env.production pins the flag off.
if grep -qx 'REACT_APP_USE_FIREBASE_EMULATORS=false' .env.production; then pass ".env.production pins the emulator flag to false"
else fail ".env.production" "flag not pinned to false"; fi

# 2b. Import default OFF (founder decision R4; release-proof repair 2026-10-18). The
# committed .env.production pin is necessary but NOT sufficient: a git-ignored
# .env.local / .env.production.local or a shell variable overrides it in a CRA
# production build. Resolve the EFFECTIVE build-time value (independently and with
# CRA's own loader), require exactly "false" from a committed file, and refuse to
# build at all if import would be enabled or the resolution is inconclusive.
if grep -qx 'REACT_APP_ENABLE_LEGACY_IMPORT=false' .env.production; then pass ".env.production pins the import flag to false"
else fail ".env.production" "REACT_APP_ENABLE_LEGACY_IMPORT not pinned to false"; fi
if imp="$(node scripts/security/release-import-config.js resolve --node-env production)"; then
  pass "effective build-time import config is OFF ($(node -e 'const r=JSON.parse(process.argv[1]);console.log(r.effective.source+"="+JSON.stringify(r.effective.value)+"; CRA loader agrees: "+JSON.stringify(r.cra))' "$imp"))"
else
  fail "import config" "$(node -e 'const r=JSON.parse(process.argv[1]);console.log(r.reasons.join(" | "))' "$imp" 2>/dev/null || echo 'resolution failed')"
  echo "RESULT: $n passed, >=1 failed (refusing to build: import would not be provably OFF)"
  [[ -n "${GITHUB_ACTIONS:-}" ]] && echo "::error title=Release-build proof (${PROJECT}): import config::effective REACT_APP_ENABLE_LEGACY_IMPORT is not provably OFF for a release build; see job log"
  exit 1
fi

# 3. Release-shaped build. The shell must not override the flags.
if [[ "${REACT_APP_USE_FIREBASE_EMULATORS:-}" == "true" ]]; then fail "env" "REACT_APP_USE_FIREBASE_EMULATORS=true in shell"; exit 1; fi
rm -rf "$OUT"
BUILD_PATH="$OUT" CI=false GENERATE_SOURCEMAP=false \
REACT_APP_FIREBASE_PROJECT_ID="$PROJECT" \
REACT_APP_FIREBASE_AUTH_DOMAIN="$PROJECT.firebaseapp.com" \
REACT_APP_FIREBASE_STORAGE_BUCKET="$PROJECT.firebasestorage.app" \
REACT_APP_FIREBASE_API_KEY="release-proof-placeholder" \
  npm run build >/tmp/release-build.log 2>&1 || { tail -30 /tmp/release-build.log; fail "build" "npm run build failed"; exit 1; }
pass "release-shaped build for $PROJECT"

absent() {
  local label="$1" pattern="$2" hits
  hits="$(grep -rIlE "$pattern" "$OUT" || true)"
  if [[ -n "$hits" ]]; then fail "$label" "found in: $(echo "$hits" | tr '\n' ' ')"; else pass "$label"; fi
}
absent "no test-hook marker (__coachCoreE2E)" "__coachCoreE2E"
absent "no test-hook module (e2e-support / emulator-hooks)" "e2e-support|emulator-hooks|installEmulatorHooks"
# Matches minified emulator wiring such as `http://${e}:9099` or (db,e,8080);
# verified to hit the emulator build and not the release build.
absent "no emulator ports (Auth 9099, Firestore 8080, Functions 5001, Storage 9199)" "[:,](9099|9199|5001|8080)[^0-9]"
absent "no demo-* project values" "demo-coach-core|demo-e2e"
absent "no emulator test password or placeholder secret" "e2e-not-a-secret|e2e-placeholder-not-a-key"
if grep -rqF "$PROJECT" "$OUT"; then pass "bundle targets $PROJECT"; else fail "project" "$PROJECT not found in bundle"; fi
# Output-level check (fourth revision, 2026-10-18): CONFIGURATION INLINING ONLY. The shipped entry
# chunks must carry the build-time marker as a string literal in parsed code (never a comment) with a
# single value equal to the resolved configuration, and the source must read the flag at exactly one
# boundary (isLegacyImportEnabled + IMPORT_CONFIG_MARKER) with the accepted guards present verbatim.
# This is NOT a behavioural claim about minified handlers (that claim was retired as unsound after
# four independent reviews); the behavioural leg is the real-browser run gated separately below.
CANARY_JSON="${RELEASE_CANARY_JSON:-/tmp/release-canary.json}"
if sc="$(node scripts/security/release-import-config.js canary "$OUT" --expect false)"; then
  printf '%s\n' "$sc" > "$CANARY_JSON"
  pass "source scope: import flag read only at the release boundary ($(node -e 'const r=JSON.parse(process.argv[1]);console.log(r.sourceScope.reads.join(", ")+"; guards verbatim")' "$sc"))"
  pass "shipped entry chunks inline import-config=false ($(node -e 'const r=JSON.parse(process.argv[1]);console.log(r.literals.map(l=>l.chunk+"@"+l.offset).join(", ")+"; "+r.literals.length+" literal(s), 1 value; configuration inlining, not a behaviour claim")' "$sc"))"
else
  printf '%s\n' "$sc" > "$CANARY_JSON"
  fail "import canary" "$(node -e 'const r=JSON.parse(process.argv[1]);console.log(r.reasons.join(" | "))' "$sc" 2>/dev/null || echo 'canary failed')"
fi
js=$(find "$OUT" -name '*.js' | wc -l | tr -d ' ')
if [[ "$js" -ge 1 ]]; then pass "$js JS files scanned"; fi

# Same-commit import-OFF emulator build (behavioural leg input, built by `npm --prefix e2e run
# build:app:import-off`): hashed here so the browser run is tied to an inspected artifact, and its
# canary must read config-false (it carries the release value of the flag plus emulator wiring).
IMPORT_OFF="${IMPORT_OFF_BUILD_DIR:-e2e/.app-build-import-off}"
IMPORT_OFF_MANIFEST="${IMPORT_OFF_MANIFEST:-/tmp/import-off-build-manifest.sha256}"
if [[ -d "$IMPORT_OFF/static/js" ]]; then
  (cd "$IMPORT_OFF" && find . -type f | sort | xargs sha256sum) > "$IMPORT_OFF_MANIFEST"
  if oc="$(node scripts/security/release-import-config.js canary "$IMPORT_OFF" --expect false)"; then pass "import-OFF emulator build (behavioural-leg input) inlines import-config=false; $(wc -l < "$IMPORT_OFF_MANIFEST") files hashed"
  else fail "import-OFF emulator build" "$(node -e 'const r=JSON.parse(process.argv[1]);console.log(r.reasons.join(" | "))' "$oc" 2>/dev/null || echo 'canary failed')"; fi
else
  rm -f "$IMPORT_OFF_MANIFEST"
  echo "NOTE import-OFF emulator build absent at $IMPORT_OFF (behavioural leg cannot run in this job; gate will report inconclusive)"
fi
MANIFEST="${RELEASE_MANIFEST:-/tmp/release-build-manifest.sha256}"
(cd "$OUT" && find . -type f | sort | xargs sha256sum) > "$MANIFEST"
echo "manifest: $MANIFEST ($(wc -l < "$MANIFEST") files)"
# Retain the EXACT inspected output for independent inspection (F3 repair 2026-10-18): only
# index.html, the shipped JS and asset-manifest.json (no source maps are generated, no .env*
# files, nothing outside the build), plus a provenance record. In CI this lands under
# e2e/ci-evidence so B15 inventories/hashes/uploads it with the rest of the evidence.
if [[ -n "${RELEASE_RETAIN_DIR:-}" ]]; then
  rm -rf "$RELEASE_RETAIN_DIR"; mkdir -p "$RELEASE_RETAIN_DIR/static/js"
  cp "$OUT/index.html" "$RELEASE_RETAIN_DIR/index.html"
  [[ -f "$OUT/asset-manifest.json" ]] && cp "$OUT/asset-manifest.json" "$RELEASE_RETAIN_DIR/asset-manifest.json"
  find "$OUT/static/js" -maxdepth 1 -type f -name '*.js' -exec cp {} "$RELEASE_RETAIN_DIR/static/js/" \;
  { echo "release-build provenance"; echo "candidate_sha=${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}";
    echo "head_sha=${CANDIDATE_HEAD_SHA:-}"; echo "run_id=${GITHUB_RUN_ID:-local}"; echo "run_attempt=${GITHUB_RUN_ATTEMPT:-}";
    echo "job=${GITHUB_JOB:-local} matrix_project=${MATRIX_PROJECT:-} matrix_bucket=${MATRIX_BUCKET:-}"; echo "built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)";
    echo "node=$(node --version) react_scripts=$(node -p "require('react-scripts/package.json').version") webpack=$(node -p "require('webpack/package.json').version") terser=$(node -p "require('terser/package.json').version") react=$(node -p "require('react/package.json').version")";
    echo "target_project=$PROJECT"; echo "effective_import_config=$(node -e 'const r=JSON.parse(process.argv[1]);console.log(r.effective.source+"="+JSON.stringify(r.effective.value))' "$imp")";
    echo "canary_verdict=$(node -e 'let r={};try{r=JSON.parse(process.argv[1])}catch{}console.log((r.verdict||"n/a")+" literals="+((r.literals||[]).length)+" claim=configuration-inlining-only")' "${sc:-}")";
    echo "behaviour_leg=real-browser run of e2e/tests/release-import-off.spec.ts on the same-commit import-OFF emulator build + D10-01/D10-02 ON control; verdict issued by release-import-config.js gate (see release-gate.json)";
    if [[ -f "$IMPORT_OFF_MANIFEST" ]]; then echo "import_off_build_manifest_sha256=$(sha256sum "$IMPORT_OFF_MANIFEST" | cut -c1-64) ($(wc -l < "$IMPORT_OFF_MANIFEST") files; $IMPORT_OFF)"; else echo "import_off_build_manifest_sha256=absent (import-OFF emulator build not present when the proof ran)"; fi;
    echo "build_manifest_sha256=$(sha256sum "$MANIFEST" | cut -c1-64)"; echo "--- full build manifest (all $(wc -l < "$MANIFEST") files) ---"; cat "$MANIFEST"; } > "$RELEASE_RETAIN_DIR/release-build.context"
  cp "$CANARY_JSON" "$RELEASE_RETAIN_DIR/release-canary.json"
  [[ -f "$IMPORT_OFF_MANIFEST" ]] && cp "$IMPORT_OFF_MANIFEST" "$RELEASE_RETAIN_DIR/import-off-build-manifest.sha256"
  echo "retained: $RELEASE_RETAIN_DIR ($(find "$RELEASE_RETAIN_DIR" -type f | wc -l) files; JS + index.html + asset-manifest + provenance; no env files)"
fi
# Negative control: the same patterns MUST match an emulator build if present.
# EMULATOR_BUILD_DIR exists so the focused checks can point this at a fixture; CI uses the
# same-commit e2e/.app-build produced earlier in the job.
EMU="${EMULATOR_BUILD_DIR:-e2e/.app-build}"
if [[ -d "$EMU/static/js" ]]; then
  for pat in "__coachCoreE2E" "[:,](9099|9199|5001|8080)[^0-9]" "demo-coach-core"; do
    if grep -rqIE "$pat" "$EMU/static/js"; then pass "negative control: pattern detects emulator build ($pat)"
    else fail "negative control" "pattern $pat does not detect the emulator build"; fi
  done
  # The canary must read the explicitly opted-in emulator build as config-true (the check can tell the builds apart).
  if nc="$(node scripts/security/release-import-config.js canary "$EMU" --expect true)"; then pass "negative control: canary reads the opted-in emulator build as import-config=true"
  else fail "negative control" "canary does not read the opted-in emulator build as config-true: $(node -e 'const r=JSON.parse(process.argv[1]);console.log(r.reasons.join(" | "))' "$nc" 2>/dev/null)"; fi
else
  fail "negative control" "no emulator build at $EMU (build it with npm --prefix e2e run build:app first); the ON-detection control is required"
fi
echo "RESULT: $n passed, $([[ $status -eq 0 ]] && echo 0 || echo '>=1') failed (legs L1 configuration + L2 inlining; L3 behaviour is decided by 'release-import-config.js gate' after the browser run and is NOT claimed here)"
if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
  lvl=$([[ $status -eq 0 ]] && echo notice || echo error)
  echo "::${lvl} title=Release-build proof L1+L2 (${PROJECT}): ${n} passed::No test hooks/emulator wiring/demo values in a release-shaped build; import flag resolved OFF before building and inlined as import-config=false in the shipped entry chunks (configuration proof only); the behavioural leg (real browser, import-OFF emulator build + ON control) is reported by the release gate step."
fi
exit $status
