# Coach Core AI — Vite Development Setup

**Canonical development branch:** `recovery/coach-core-mvp-2026`, not the older `master` branch. React is the UI library and Vite is the build tool; both belong here.

## Requirements
- Node.js **22.12+** and npm (Vite 8 requires Node 20.19+ or 22.12+; use Node 22 for project consistency).
- Git and internet access for the initial `npm ci`.
- A non-production Firebase project/client web config to exercise authenticated flows. Do not commit `.env.local`.
- Java and Firebase emulator dependencies if running `npm run test:rules`.

## Start a safe local app
```bash
git clone https://github.com/DigitalBlueprint239/coach-core-ai.git
cd coach-core-ai
git fetch origin
git switch -c my-task origin/recovery/coach-core-mvp-2026
npm ci
cp env.production.example .env.local
# Edit .env.local: use non-secret REACT_APP_FIREBASE_* values for your test project.
npm run check:stack
npm run dev
```

The app is served by Vite on http://localhost:3000. `npm start` is a Vite alias, **not** `react-scripts`.

## Critical environment rule

`vite.config.ts` uses `envPrefix: 'REACT_APP_'`, intentionally retained for compatibility. **It does not expose `VITE_*` variables.** The `env.production.example` file has been aligned to the names read by `src/firebase.ts`, the authenticated AI proxy and app feature flags.

Only non-secret Firebase *web* configuration and optional public Sentry DSN go in client env. A browser bundle is always inspectable. OpenAI/Gemini provider keys, Firebase Admin secrets, service-account JSON, `SENTRY_AUTH_TOKEN`, passwords and tokens must stay server-side.

AI is disabled by default. Setting `REACT_APP_AI_ENABLED=true` is not sufficient for release: the server-side proxy must be secured and owner-approved.

## Verification commands

```bash
npm run check:stack
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run build` includes the stack guard automatically, then TypeScript/Vite, then the build CSS integrity check.

For Firestore security rules, with Java and the Firebase emulator installed:

```bash
npm run test:rules
```

This runs an emulator using the `demo-coach-core` project ID. It must not affect live Firebase data.

## Important limits
- Do not add `react-scripts`, use `npm test -- --watchAll=false`, or run the old CRA `eject` command.
- Do not assume the merged repository rules have been deployed to the live Firebase project. Owner authorization is required for any rules deployment.
- Team joining/sharing remains disabled by design until an approved safe model exists.
- `master` is not yet the Vite integration branch. Promotion/reconciliation is a separate owner-approved task.
- Staging Hosting may still share backend resources with production. Test with emulators and approved isolated environments, never real youth/team data.
- Use [docs/RELEASING.md](docs/RELEASING.md) for the actual controlled release procedure; never run a generic `firebase deploy` from a README.
