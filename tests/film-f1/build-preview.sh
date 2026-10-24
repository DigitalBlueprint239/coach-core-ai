#!/usr/bin/env bash
# Builds the Film review PREVIEW (F1) for the Firebase Emulator Suite only: synthetic samples,
# emulators, demo-* project. Never deploy this output. The ordinary build excludes Film entirely
# (.env.production sets REACT_APP_FILM_PREVIEW=false; tests/film-f1/production-exclusion.cjs checks it).
set -euo pipefail
cd "$(dirname "$0")/../.."
export REACT_APP_FILM_PREVIEW=true
# Default output is outside the repository, so no ignore rules change.
export E2E_BUILD_PATH="${E2E_BUILD_PATH:-${TMPDIR:-/tmp}/coach-core-film-preview}"
bash e2e/scripts/build-app.sh
mkdir -p "$E2E_BUILD_PATH/film-preview"
cp src/features/film-analyzer/review/samples/out-route.mp4 src/features/film-analyzer/review/samples/out-route.webm "$E2E_BUILD_PATH/film-preview/"
echo "Film preview build: $E2E_BUILD_PATH (synthetic samples copied to /film-preview/)"
