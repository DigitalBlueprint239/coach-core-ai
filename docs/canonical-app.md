# Canonical Application Structure

## Canonical application
The **canonical Coach Core application** is the repository root app:
- `package.json` at repository root
- source in `src/`
- build output in `build/`

This is the only surface used for development and production workflows.

## Why this is canonical
- It is the surface wired to root scripts (`start`, `build`, `test`, `typecheck`, `verify`).
- It provides deterministic build/typecheck behavior from repository root.
- Duplicate app surfaces were archived to eliminate ambiguity.

## Install and run
From repository root:

```bash
npm install --legacy-peer-deps
npm start
npm run build
npm run typecheck
npm run verify
```

## Archived non-canonical surfaces
The following were archived and are not part of active build/runtime:
- `archive/coach-core-ai-legacy/`
- `archive/smartplaybook-standalone/`

Each archived directory contains `DO_NOT_USE.md` with rationale and usage constraints.

## CI/verification contract
Canonical validation is run from repository root:
- `npm run build`
- `npm run typecheck`
- `npm run verify`
