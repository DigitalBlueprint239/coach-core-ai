# Staging checks the emulator cannot do

Run only after an approved staging deploy (Coach Drew: D5). Use synthetic test accounts only: no player data, no youth footage. AI stays **off** (`COACH_CORE_AI_ENABLED=false`) for all of these. Record the operator, time, browser/device and result for each ID in the smoke-test log.

## A. Real authentication (manual; needs a real inbox and Google account)

| ID | Step | Expected | Why the emulator can't prove it |
|---|---|---|---|
| RA-01 | "Email me a sign-in link" with a test inbox you control | Email arrives from the project's sender; link opens the staging site and signs in. The address bar loses `oobCode` | Emulator records links instead of sending them |
| RA-02 | Open the RA-01 link a second time | "This sign-in link is invalid or has already been used." | Covered in the emulator (A04), but must be re-checked on real Auth |
| RA-03 | Open the link on a second device | "Confirm your email" screen, then sign-in after entering the address | Real cross-device behaviour |
| RA-04 | "Continue with Google" with a test Google account | Real Google consent, then "Waiting for beta access" | Emulator uses a fake account picker |
| RA-05 | Grant beta with `functions/scripts/beta-access.js grant <email>` (founder, staging credentials), then "Check again" | Dashboard | Real custom claims and token refresh |
| RA-06 | Revoke with `beta-access.js revoke <email>` | User is signed out at the next token refresh; "Your session ended" | Real token revocation |
| RA-07 | From the browser console, call `signInAnonymously` with the staging config | Fails (`auth/admin-restricted-operation`): Anonymous is **disabled** in the console | The emulator allows anonymous, and the app blocks it client-side. Staging must also block it server-side |
| RA-08 | Load the app from a host that is **not** in Authorized domains (e.g. a preview URL), then try Google sign-in | `auth/unauthorized-domain`, shown as "This site is not authorized for sign-in yet." | Authorized-domain list exists only in a real project |

## B. Invalid tokens and origins (scripted, no credentials)

`node e2e/staging/gateway-probe.mjs` with `PROBE_PROJECT=PROBE_CONFIRM=coach-core-mvp-staging-239`, the staging origin and (optionally) the public web API key.

| ID | Check | Expected |
|---|---|---|
| SEC-09 | Preflight from the staging origin | `access-control-allow-origin` = that origin |
| SEC-07 | Preflight from an unlisted origin | No allow-origin for it |
| SEC-08 / 08b | Gateway with a forged RS256 token / a malformed token | HTTP 401 `UNAUTHENTICATED`, rejected before the gateway runs |
| SEC-08c | Gateway with no token | Refused (`ai-disabled` while AI is off, or `sign-in-required`) |
| SEC-08d | Firestore REST read with the forged token | HTTP 401 |

**Self-test evidence (2026-10-13).** Against the local Functions emulator, the probe correctly **fails** SEC-07, SEC-08 and SEC-08b, because the emulator allows every origin and skips token verification. It passes SEC-09 and SEC-08c. So the probe really distinguishes enforcement from no enforcement. It refuses to run against any project other than `coach-core-mvp-staging-239`, including production `coach-core-ai`.
