# Coach Core — real-browser tests on the Firebase Emulator Suite

Real Chromium and Firefox drive the production build of the web app against local Auth, Firestore (with the real `firestore.rules`) and Functions emulators. The project is `demo-coach-core-e2e`. A `demo-*` project has no cloud resources, and the app and prebuild guard both refuse emulator mode for any other project ID.

## What "emulator authentication" means

| Label in test title | What really happens | What it does NOT prove |
|---|---|---|
| `[emulator email link]` | The app's email-link UI calls the real Firebase SDK. The Auth emulator records the link instead of emailing it, and the test opens it. | Real email delivery, spam filtering, the authorized-domain list of a real project |
| `[emulator Google IdP]` | "Continue with Google" opens the emulator's fake account picker in a popup | Real Google OAuth, consent screen, Google account policies |
| `[SDK-in-browser]` | The test drives the app's own SDK session through a test-only hook (emulator builds only) for states that have no UI path, such as anonymous, password or another team's document | It is **not** a UI workflow and is never counted as one |
| `[emulator]` | Admin actions (grant beta claim, disable account) through the emulator REST API | The real `beta-access.js` against a real project |

Real Google and email-link sign-in need an approved staging project (Day 6 smoke plan).

## Run

```bash
npm ci --prefix e2e && npm ci --prefix functions
npx --prefix e2e playwright install chromium firefox
npm --prefix e2e run build:app          # emulator build into e2e/.app-build
# functions emulator config (git-ignored, placeholders, AI OFF):
printf 'COACH_CORE_AI_ENABLED=false\nCOACH_CORE_ALLOWED_ORIGINS=http://localhost:3000\n' > functions/.env.local
printf 'COACH_CORE_OPENAI_API_KEY=e2e-placeholder-not-a-key\n' > functions/.secret.local
npm --prefix e2e test                    # emulators:exec + Playwright (Chromium + Firefox)
```

- **Auth-only (no Java or Firestore jar):** `npm --prefix e2e run test:auth-only`. Firestore-dependent tests report SKIPPED.
- **Environment variables:**
  - `E2E_CHROMIUM_PATH`: use a preinstalled Chromium.
  - `E2E_SKIP_FIREFOX=1`: Chromium only.
  - `E2E_NO_GOOGLE_SCRIPTS=1`: skip the Google-popup test where `apis.google.com` is unreachable.

**CI:** `.github/workflows/e2e-emulator.yml` runs on every push to `claude/**`.
- Per-browser PASS/FAIL/BLOCKED counts appear as check annotations.
- Results are uploaded as an artifact.
- `workflow_dispatch` with `repeat_each=10` gives a stability run.

## Status vocabulary

- **PASS / FAIL:** the test ran in a real browser.
- **BLOCKED:** `test.fixme` with a `blocked` annotation naming the missing client feature or founder decision. It never runs and is never counted as passed.
- **SKIPPED:** an environment limit of a local run. It is never counted as passed.
