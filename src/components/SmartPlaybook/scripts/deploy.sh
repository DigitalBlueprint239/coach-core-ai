#!/usr/bin/env bash
set -euo pipefail

# SECURITY HOLD — 2026-11-07
# Archived Smart Playbook deployment helper targets Vercel directly and bypasses
# Coach Core's protected GitHub production release process. The integration and
# account ownership have not been audited; do not invoke as a release shortcut.
echo "BLOCKED: standalone Smart Playbook Vercel deployment is disabled." >&2
echo "Run unit tests and builds locally, but use only approved deployment pipelines." >&2
exit 1
