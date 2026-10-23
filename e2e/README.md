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
printf 'COACH_CORE_AI_ENABLED=false\nCOACH_CORE_ALLOWED_ORIGINS=["http://localhost:3000"]\n' > functions/.env.local
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

### Isolated run beside your own emulators

The suite resets Auth and Firestore before each test. To run it while other emulators (for example the local Windows package) stay on 127.0.0.1, put everything on another loopback address:

```bash
node e2e/scripts/isolated-emulator-config.mjs 127.0.0.2   # writes firebase.isolated.json (git-ignored)
REACT_APP_FIREBASE_EMULATOR_HOST=127.0.0.2 npm --prefix e2e run build:app
E2E_EMULATOR_HOST=127.0.0.2 E2E_APP_HOST=127.0.0.2 \
  npx --prefix e2e firebase emulators:exec --config firebase.isolated.json --project demo-coach-core-e2e \
  --only auth,firestore,functions "npm --prefix e2e run test:browser"
```

All three variables must name the same host. Defaults (unset) are unchanged: 127.0.0.1 emulators and http://localhost:3000.

## What the emulators do NOT test

The Functions emulator runs with the debug features `enableCors` and `skipTokenVerification` (firebase-tools `functionsEmulator.js`). Inside the emulator:

- **Any origin** passes the AI gateway's CORS check, so the `COACH_CORE_ALLOWED_ORIGINS` allowlist is not tested.
- ID-token **signatures** are not verified. Rules-side auth in the Firestore emulator is still enforced.

Both must be checked in staging (staging smoke plan: gateway from an unlisted origin is refused; a forged token is rejected). Real email delivery, real Google OAuth, App Check, quotas under real latency and physical devices are also out of scope here.

`COACH_CORE_ALLOWED_ORIGINS` is a list param: in any `.env` file it must be a JSON array, e.g. `["https://coach-core-mvp-staging-239.web.app"]`. A bare URL fails to parse, and the gateway then rejects every browser origin. This fails closed, but it breaks AI for everyone, so the staging config must use the array form.

## Status vocabulary

- **PASS / FAIL:** the test ran in a real browser.
- **BLOCKED:** `test.fixme` with a `blocked` annotation naming the missing client feature or founder decision. It never runs and is never counted as passed.
- **SKIPPED:** an environment limit of a local run. It is never counted as passed.
