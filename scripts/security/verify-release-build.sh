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
# Output-level proof: the SHIPPED JS must carry the build-time canary
# coachcore:import-config=false, no "=true", no inlined REACT_APP_ENABLE_LEGACY_IMPORT:"true",
# and the disabled-state copy. A missing canary is inconclusive and FAILS (fail closed).
if sc="$(node scripts/security/release-import-config.js scan "$OUT")"; then
  pass "shipped JS proves import OFF ($(node -e 'const r=JSON.parse(process.argv[1]);console.log("canary=false x"+r.canaryOff+", =true x"+r.canaryOn+", inlined true x"+r.inlinedTrue+", disabled copy x"+r.disabledCopy)' "$sc"))"
else fail "import canary" "$(node -e 'const r=JSON.parse(process.argv[1]);console.log(r.reasons.join(" | "))' "$sc" 2>/dev/null || echo 'scan failed')"; fi
js=$(find "$OUT" -name '*.js' | wc -l | tr -d ' ')
if [[ "$js" -ge 1 ]]; then pass "$js JS files scanned"; fi

MANIFEST="${RELEASE_MANIFEST:-/tmp/release-build-manifest.sha256}"
(cd "$OUT" && find . -type f | sort | xargs sha256sum) > "$MANIFEST"
echo "manifest: $MANIFEST ($(wc -l < "$MANIFEST") files)"
# Negative control: the same patterns MUST match an emulator build if present.
if [[ -d e2e/.app-build/static/js ]]; then
  for pat in "__coachCoreE2E" "[:,](9099|9199|5001|8080)[^0-9]" "demo-coach-core"; do
    if grep -rqIE "$pat" e2e/.app-build/static/js; then pass "negative control: pattern detects emulator build ($pat)"
    else fail "negative control" "pattern $pat does not detect the emulator build"; fi
  done
  # The import canary must DETECT the explicitly opted-in emulator build (coachcore:import-config=true).
  if node scripts/security/release-import-config.js negative-control e2e/.app-build >/dev/null; then pass "negative control: import canary detects the opted-in emulator build (=true)"
  else fail "negative control" "import canary does not detect the opted-in emulator build"; fi
fi
echo "RESULT: $n passed, $([[ $status -eq 0 ]] && echo 0 || echo '>=1') failed"
if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
  lvl=$([[ $status -eq 0 ]] && echo notice || echo error)
  echo "::${lvl} title=Release-build proof (${PROJECT}): ${n} passed::No test hooks/emulator wiring/demo values in a release-shaped build; import proven OFF in the shipped JS (effective build config + canary); guard refuses emulator mode for real projects."
fi
exit $status
