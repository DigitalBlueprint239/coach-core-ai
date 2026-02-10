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
npm run dev
npm run build
npm run preview
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


## Environment variables (Vite)
- Canonical frontend env vars use the `VITE_` prefix.
- Access env values through `src/config/env.ts` instead of reading `process.env` directly in browser code.
- Legacy names are mapped where needed for compatibility during transition.
- Required frontend keys (set in `.env.local`):
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
- Optional keys:
  - `VITE_FIREBASE_MEASUREMENT_ID`
  - `VITE_OPENAI_API_KEY`
  - `VITE_AI_PROXY_ENDPOINT`
  - `VITE_AI_PROXY_TOKEN`
  - `VITE_VAPID_PUBLIC_KEY`

