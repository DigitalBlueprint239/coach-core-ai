#!/usr/bin/env python3
"""Utility helpers for keeping Firestore beta collections aligned with schema expectations."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

REPO_ROOT = Path(__file__).resolve().parent
INDEX_PATH = REPO_ROOT / "firestore.indexes.json"

# The beta invite funnel relies on fast lookups by status and cohort to drive reminders
# and conversion dashboards. These are the composite indexes we expect to exist.
REQUIRED_INDEXES: List[Dict[str, object]] = [
    {
        "collectionGroup": "beta_invites",
        "queryScope": "COLLECTION",
        "fields": [
            {"fieldPath": "cohortId", "order": "ASCENDING"},
            {"fieldPath": "status", "order": "ASCENDING"},
            {"fieldPath": "sentAt", "order": "DESCENDING"},
        ],
    },
    {
        "collectionGroup": "beta_feedback",
        "queryScope": "COLLECTION",
        "fields": [
            {"fieldPath": "cohortId", "order": "ASCENDING"},
            {"fieldPath": "severity", "order": "DESCENDING"},
            {"fieldPath": "resolved", "order": "ASCENDING"},
        ],
    },
    {
        "collectionGroup": "beta_feedback",
        "queryScope": "COLLECTION",
        "fields": [
            {"fieldPath": "userId", "order": "ASCENDING"},
            {"fieldPath": "submittedAt", "order": "DESCENDING"},
        ],
    },
]

# Data governance constants used for retention / backup operations.
BETA_DATA_RETENTION_DAYS = 180
BACKUP_BUCKET_ENV = "BETA_BACKUP_BUCKET"
DAILY_BACKUP_CRON = "0 5 * * *"  # 05:00 UTC daily


def _index_signature(index: Dict[str, object]) -> Tuple[str, str, Tuple[Tuple[str, str], ...]]:
    """Return a hashable signature for a Firestore composite index definition."""

    fields: Iterable[Dict[str, str]] = index.get("fields", [])  # type: ignore[arg-type]
    sorted_fields = tuple((field["fieldPath"], field.get("order", "")) for field in fields)
    return (
        index.get("collectionGroup", ""),
        index.get("queryScope", ""),
        sorted_fields,
    )


def _load_current_indexes() -> List[Dict[str, object]]:
    if not INDEX_PATH.exists():
        raise FileNotFoundError(f"Missing Firestore index file: {INDEX_PATH}")

    data = json.loads(INDEX_PATH.read_text())
    indexes = data.get("indexes", [])
    if not isinstance(indexes, list):
        raise ValueError("firestore.indexes.json is malformed: 'indexes' must be a list")
    return indexes


def find_missing_indexes() -> List[Dict[str, object]]:
    """Compare the repo index file with the required beta indexes."""

    existing_signatures = {_index_signature(index) for index in _load_current_indexes()}
    missing: List[Dict[str, object]] = []

    for required in REQUIRED_INDEXES:
        if _index_signature(required) not in existing_signatures:
            missing.append(required)

    return missing


def describe_retention_policy() -> str:
    """Return a human readable summary of the beta data retention and backup plan."""

    return (
        "Beta data retention: delete documents after "
        f"{BETA_DATA_RETENTION_DAYS} days. "
        "Schedule daily managed export jobs at 05:00 UTC and store them in the bucket "
        f"defined by {BACKUP_BUCKET_ENV}. Ensure pre/post milestone snapshots run manually."
    )


def main() -> None:
    missing_indexes = find_missing_indexes()

    if missing_indexes:
        print("Missing Firestore indexes detected. Add the following blocks to firestore.indexes.json:")
        print(json.dumps({"indexes": missing_indexes}, indent=2))
        raise SystemExit(1)

    print("All required beta indexes are present.")
    print(describe_retention_policy())


if __name__ == "__main__":
    main()
