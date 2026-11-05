# Coach Core AI

Coach Core AI is a coaching platform under active recovery development. The current development stack is **React 19 + TypeScript + Vite 8 + Vitest + Firebase**. React builds the interface; Vite runs and builds it.

> **Branch notice (2026-11-04):** The default `master` branch still contains a legacy Create React App configuration. Work on `recovery/coach-core-mvp-2026` and task branches based on it. Do not copy the `react-scripts` scripts from `master`, merge into `master`, or deploy without owner authorization. [Architecture baseline](docs/ARCHITECTURE_REALITY_2026-11-04.md).

## Current working scope

- Firebase authentication and coach-owned team/plays/practice-plan model; the repository's rules are tested with the Firebase emulator. **Merging rules does not deploy them to Firebase.**
- A feature-gated Smart Playbook v2 screen. Additional deterministic football-core, v3 persistence and Inside Zone work is in **draft PRs #106, #107 and #108**, not accepted product functionality.
- Server-side, authenticated AI proxy; no OpenAI/Gemini provider secrets in the browser. AI is off unless explicitly enabled.
- React-based UI, Vite builds, lint/typecheck/Vitest checks, Firestore emulator tests and controlled Firebase Hosting release workflows.

This is not yet a public-beta launch claim. In particular, the team-sharing/join flow remains disabled pending an approved access model. Staging Hosting has historically shared the production Firebase project's data/accounts; preview and live release require owner review.

## Local development

Use **Node.js 22.12+** (Node 22 is the tested project development family) and npm. See [SETUP.md](SETUP.md) for fuller instructions.

```bash
git clone https://github.com/DigitalBlueprint239/coach-core-ai.git
cd coach-core-ai
git fetch origin
git switch -c my-task origin/recovery/coach-core-mvp-2026
npm ci
cp env.production.example .env.local
# Fill in non-secret Firebase web configuration for the intended local/test project.
npm run dev
```

Vite serves the local app on port 3000. `npm start` is also an alias for Vite.

**Environment variables:** `vite.config.ts` deliberately uses `envPrefix: 'REACT_APP_'`, a compatibility choice from the earlier CRA migration. Do **not** rename them to `VITE_*` without a separate reviewed migration. Build artifacts deliberately go to `build/` for Firebase Hosting compatibility. Browser-visible configuration is not a safe place for API-provider secrets.

Never put `OPENAI_API_KEY`, `GEMINI_API_KEY`, Firebase Admin credentials, service-account JSON or `SENTRY_AUTH_TOKEN` into `.env.local` or variables exposed to the frontend. Provider secrets belong on the backend in approved secret storage.

## Verified repository commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Vite server |
| `npm run check:stack` | Detect wrong legacy build scripts and frontend env naming |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript checking |
| `npm test` | Vitest non-interactive tests |
| `npm run build` | Stack check, TypeScript, Vite build, Tailwind output check |
| `npm run preview` | Local preview of built app |
| `npm run test:rules` | Firebase Firestore emulator rules tests (Java + Firebase CLI dependencies required) |

Run `npm ci` after pulling changes to `package-lock.json`. Do not install `react-scripts` to resolve errors; it is no longer part of the recovery stack.

## Project structure

- `src/components`, `src/features` — React UI and product features
- `src/football-core` — deterministic, source-status-aware football models
- `src/ai-brain`, `src/services` — application and authenticated AI-proxy clients
- `src/firebase.ts`, `firestore.rules`, `rules-tests` — Firebase client and security logic
- `vite.config.ts`, `scripts/check-build.mjs` — Vite/asset build safeguards
- `docs/COACH_CORE_SHARED_CONTEXT.md`, `docs/MVP_7_DAY_SPRINT.md` — historical and shared recovery context (confirm dated claims against latest merged PRs)
- `docs/RELEASING.md` — staging/production process and owner approval controls

## Contribution and release safety

Start task-specific branches from `recovery/coach-core-mvp-2026`. Do not overwrite other agents' owned files, change Firebase production rules, expose private Vault data, merge stacked Smart Playbook PRs, or deploy without owner approval. Passing code tests does not constitute football-expert verification, security authorization, or a production-release decision.

See [architecture status and next user-facing slice](docs/ARCHITECTURE_REALITY_2026-11-04.md) before making major technology changes.
