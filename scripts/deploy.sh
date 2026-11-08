#!/usr/bin/env bash
set -euo pipefail

# SECURITY HOLD — 2026-11-07
# The previous script deployed Hosting, Functions, Firestore rules and Storage
# rules using an implicit Firebase CLI project. It could replace live Functions
# whose deployed source has not yet been reconciled with this repository.
# This legacy entry point must never perform cloud mutations.
echo "BLOCKED: legacy multi-service Firebase deployment script is disabled." >&2
echo "Use the reviewed, owner-approved GitHub production release workflow for Hosting." >&2
echo "Firestore, Storage rules, and Functions require a separate explicit project ID," >&2
echo "live inventory, compatibility review and independent release approval." >&2
exit 1
