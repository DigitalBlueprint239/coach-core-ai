#!/usr/bin/env bash
set -euo pipefail

REQUESTED_ENV_FILE=".env.production"

info() {
  printf "[deploy-secure] %s\n" "$1"
}

error() {
  printf "[deploy-secure] ERROR: %s\n" "$1" >&2
}

if [[ ! -f ${REQUESTED_ENV_FILE} ]]; then
  error "${REQUESTED_ENV_FILE} not found. Create it from .env.example before deploying."
  exit 1
fi

info "Loading environment configuration from ${REQUESTED_ENV_FILE}"
set -a
# shellcheck disable=SC1090
source "${REQUESTED_ENV_FILE}"
set +a

REQUIRED_VARS=(
  VITE_FIREBASE_API_KEY
  VITE_FIREBASE_AUTH_DOMAIN
  VITE_FIREBASE_PROJECT_ID
  VITE_FIREBASE_STORAGE_BUCKET
  VITE_FIREBASE_MESSAGING_SENDER_ID
  VITE_FIREBASE_APP_ID
)

MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    MISSING+=("$var")
  fi
done

if [[ ${#MISSING[@]} -ne 0 ]]; then
  error "The following required environment variables are missing: ${MISSING[*]}"
  exit 1
fi

info "Environment validation passed. Building project..."
npm run build

info "Build complete. Deploy with your preferred Firebase/hosting workflow."
info "Remember to keep ${REQUESTED_ENV_FILE} secure and out of version control."
