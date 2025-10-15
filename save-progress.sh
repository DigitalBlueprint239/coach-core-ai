#!/usr/bin/env bash
set -euo pipefail

# Coach Core AI workspace autosave helper.
# Suggested shell alias (add to your shell rc):
#   alias cc-save="$(pwd)/save-progress.sh"

BRANCH="feature/phase-1-foundation"

if ! git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  echo "Creating branch $BRANCH off main..."
  git fetch origin main
  git checkout main
  git pull --ff-only
  git checkout -b "$BRANCH"
else
  git checkout "$BRANCH"
fi

git add -A
git commit -m "chore(auto): save progress $(date '+%Y-%m-%d %H:%M')"
git push -u origin "$BRANCH"
