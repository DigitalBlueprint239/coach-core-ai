# DO NOT USE: Archived standalone SmartPlaybook surface

This directory contains a standalone SmartPlaybook app surface previously embedded in the monorepo.

## Why archived
- It introduces an additional app entry point (`package.json`, standalone `src/`) outside the canonical root app.
- Multiple app surfaces caused ambiguous ownership of scripts and compilation scope.

## Status
- Archived for reference only.
- Excluded from canonical build/typecheck workflow.

Use the canonical root application surface under `/src`.
