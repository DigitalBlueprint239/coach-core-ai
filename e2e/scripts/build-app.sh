#!/usr/bin/env bash
# Build the web app for the Firebase Emulator Suite (demo project, fake web
# config). Output goes to e2e/.app-build so the normal build/ is untouched.
# None of these values is a credential; demo-* projects have no cloud resources.
set -euo pipefail
cd "$(dirname "$0")/../.."
export REACT_APP_USE_FIREBASE_EMULATORS=true
export REACT_APP_FIREBASE_PROJECT_ID="${E2E_PROJECT_ID:-demo-coach-core-e2e}"
export REACT_APP_FIREBASE_API_KEY=demo-e2e-web-key
export REACT_APP_FIREBASE_AUTH_DOMAIN="${REACT_APP_FIREBASE_PROJECT_ID}.firebaseapp.com"
export REACT_APP_FIREBASE_STORAGE_BUCKET="${REACT_APP_FIREBASE_PROJECT_ID}.appspot.com"
export REACT_APP_FIREBASE_APP_ID=1:000000000000:web:e2e
export BUILD_PATH="${E2E_BUILD_PATH:-e2e/.app-build}"
export GENERATE_SOURCEMAP=false CI=false
npm run build
