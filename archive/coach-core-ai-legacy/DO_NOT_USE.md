# DO NOT USE: Archived legacy app surface

This directory contains a legacy duplicate application surface that is **not canonical** for Coach Core.

## Why archived
- It duplicates root-level app concerns (`package.json`, `src/`, build config), causing ambiguous build and typecheck behavior.
- Keeping this active led to nondeterministic maintenance and CI confusion.

## Status
- Archived for historical reference only.
- Not used for development, production, CI build, lint, or typecheck.

Use the repository root application surface instead.
