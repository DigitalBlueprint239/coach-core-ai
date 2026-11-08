#!/usr/bin/env bash
set -euo pipefail

# SECURITY HOLD — 2026-11-07
# The earlier script used an implicit project and attempted a combined
# Hosting/Functions rollback using unverified Firebase CLI commands.
# Rollback is environment- and resource-specific; no automatic mutations here.
echo "BLOCKED: legacy cross-service rollback script is disabled." >&2
echo "For Hosting, review the exact production or staging project's Hosting" >&2
echo "release history, then follow an explicitly approved rollback plan." >&2
echo "Functions, Firestore and Storage rules require their own separate plan." >&2
exit 1
