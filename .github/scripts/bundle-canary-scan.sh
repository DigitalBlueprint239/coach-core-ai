#!/usr/bin/env bash
# Browser-bundle credential scan (Day 1 F-01, Day 2 acceptance T15).
#
# 1. Source check: active app code must not read AI-secret env variables.
# 2. Guard check: `npm run build` must REFUSE to build when a secret-like
#    REACT_APP_* variable is present (CRA would publish it in the bundle).
# 3. Bundle check: build with canary values in every server-side/legacy AI
#    variable and fail if any canary, provider endpoint, provider SDK marker
#    or key-shaped string appears in the shipped files.
# Canary values are not secrets. No real key is ever used.
set -euo pipefail

BUILD_DIR="build"
CANARY="CANARY_NOT_A_SECRET"
status=0
passed=0
pass() { echo "PASS $1"; passed=$((passed + 1)); }
fail() { echo "::error title=Bundle scan FAIL - $1::$2"; status=1; }

# --- 1. source check -------------------------------------------------------
refs="$(grep -rnE "REACT_APP_(OPENAI|AI_PROXY_TOKEN|GEMINI|CLAUDE|ANTHROPIC)[A-Z_]*" src \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  | grep -vE '/_archived/|/__tests__/|\.test\.' || true)"
if [[ -n "$refs" ]]; then fail "source reads AI secret env vars" "$(echo "$refs" | cut -d: -f1,2 | tr '\n' ' ')"
else pass "no active source reads AI secret env variables"; fi

# --- 2. guard check --------------------------------------------------------
if REACT_APP_OPENAI_API_KEY="${CANARY}_GUARD" CI=false npm run build >/tmp/guard.log 2>&1; then
  fail "prebuild guard" "build succeeded with REACT_APP_OPENAI_API_KEY set"
elif grep -q "Build blocked" /tmp/guard.log && ! grep -q "${CANARY}_GUARD" /tmp/guard.log; then
  pass "prebuild guard blocks secret-like REACT_APP_* variables (value not printed)"
else
  fail "prebuild guard" "build failed for an unexpected reason"; tail -20 /tmp/guard.log
fi

# --- 3. canary bundle check ------------------------------------------------
export CI=false GENERATE_SOURCEMAP=false
export OPENAI_API_KEY="${CANARY}_OPENAI"
export GEMINI_API_KEY="${CANARY}_GEMINI"
export ANTHROPIC_API_KEY="${CANARY}_ANTHROPIC"
export COACH_CORE_OPENAI_API_KEY="${CANARY}_SERVER_OPENAI"
export VITE_OPENAI_API_KEY="${CANARY}_VITE_OPENAI"
export VITE_GEMINI_API_KEY="${CANARY}_VITE_GEMINI"
# Firebase web config is public by design; demo values let the build run.
export REACT_APP_FIREBASE_API_KEY="demo-web-key"
export REACT_APP_FIREBASE_PROJECT_ID="demo-coach-core-beta"
npm run build >/tmp/build.log 2>&1 || { tail -40 /tmp/build.log; fail "build" "npm run build failed"; exit 1; }

check() {
  local label="$1" pattern="$2" hits
  hits="$(grep -rIlE "$pattern" "$BUILD_DIR" || true)"
  if [[ -n "$hits" ]]; then fail "$label" "found in: $(echo "$hits" | tr '\n' ' ')"; else pass "$label"; fi
}
check "no secret canaries in bundle" "${CANARY}"
check "no OpenAI endpoint in bundle" "api\.openai\.com"
check "no Gemini endpoint in bundle" "generativelanguage\.googleapis\.com"
check "no Anthropic endpoint in bundle" "api\.anthropic\.com"
check "no Gemini SDK in bundle" "GoogleGenAI|@google/genai"
check "no provider key-shaped strings in bundle" "sk-(proj-|ant-)?[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}"
if grep -rqF "coachAI" "$BUILD_DIR"; then pass "bundle calls the coachAI gateway"; else fail "gateway wiring" "coachAI callable not referenced"; fi

js_files=$(find "$BUILD_DIR" -name '*.js' | wc -l | tr -d ' ')
total=$((passed))
if [[ $status -eq 0 ]]; then
  echo "::notice title=Bundle credential scan: ${total} passed / 0 failed::Scanned ${js_files} JS files. Source / prebuild guard / canary bundle checks all passed."
fi
exit $status
