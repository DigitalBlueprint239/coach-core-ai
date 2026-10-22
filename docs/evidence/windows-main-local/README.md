# Main Coach Core local-emulator setup (Windows delivery)

Existing application source: **0dc94c4c6121aa379fb3e612b7d738a140f56ec6**. No application, auth, rules, backend behavior, existing tests or accepted branch is changed. Only operator helpers and evidence are added on `codex/windows-main-emulator-setup`. This is local setup, not integration, beta/release acceptance or deployment.

## User package

`CoachCore-Main-Local-Windows.zip` (463025bytes), SHA256:
`db3e98aced11b8b700b4cf79474d70dc3177367dbecff53c1d8c48b47aeb1d32`.

Extract All, then double-click `START-COACH-CORE.cmd`. Requires Node22+ (22.23.1 confirmed on Coach Drew's PC) and Java21+ (not yet confirmed on his PC). Missing runtimes produce a specific stop message. Java can be installed from the official Temurin21 Windows distribution or WinGet's `EclipseAdoptium.Temurin.21.JDK`; installer execution and native-Windows startup have not been performed remotely. The connected browser tool returned UNAUTHORIZED/requires reauthentication, and no remote Windows shell is available.

First startup installs the two pinned dependency lockfiles and downloads emulator JARs; an internet connection is needed for npm/Google's artifact downloads. No Firebase login, live project, paid service or app build is required on the user PC. The artifact contains a precompiled main app using the existing emulator recipe, `demo-coach-core-e2e`, fake web config and legacy import OFF. Package hashes are checked before launch. No node_modules, synthetic database export, personal configuration or credentials are shipped. The .secret.local value is an explicit non-key placeholder. AI/Film backend params are OFF.

**One main-app address: http://localhost:3000/start**. The local helper seeds a synthetic beta-verified Auth account and its existing users/profile trigger, then completes the same app's emulator email-link SDK flow. It does not alter AuthGate, rules or identity. Default email is `coach@demo.coachcore.test`; no real Google account or email delivery is needed. All emulator services are loopback-only. Browser CSP blocks external service calls. Child CLI config is isolated, cloud credential environment inputs are removed for that process only, and CI mode disables public CLI MOTD/remote-config polling. Real Google OAuth is intentionally unavailable; use /start.

Ctrl+C lets firebase-tools perform --export-on-exit into .local-state before the launcher exits; a restart imports that local synthetic state. This worked in the tested Linux runtime. The ordinary Windows console/export path still needs observation on Coach Drew's PC. Local export is not a cloud backup; failed exports are reported. Functions deployment via the local configuration is explicitly refused. No deployment command was run.

## Verification actually performed

- Existing **E2E-T01**, **CC-P15**, **CC-P16** unchanged: **6PASS/0FAIL/0SKIP**, one run on Chromium156 and Firefox157, retries0. Teams created in UI reopen in a fresh browser profile; Smart Playbook saves/renames/reopens11players; practice name/notes/period order reopen exactly. No unchanged full matrix.
- Separate actual /start browser journey with service workers allowed: synthetic sign-in -> Teams create -> practice save -> Shotgun play save. Zero external requests. Screenshots and trace retained.
- Ctrl+C exported Auth/Firestore/Storage; restart recovered the same team, practice note and play in a fresh browser context. Final package with fresh lockfile installations passed the restart/browser check too.
- Clean dependency installs: emulator-tools674packages and functions328packages, exits0. These were Linux Node24.19.0/npm11.9.0 installs, not a native-Windows or Node22 installation test. Java21.0.12.1 was used; the Functions emulator warned that the host Node24 differed from its requested22. The user's confirmed22 matches the requested runtime, but native-Windows verification remains outstanding.
- ZIP path membership and every internal file hash were recomputed against package-manifest.json. Exact core build log and source/flags are retained. The main app source/lockfiles/test assertions remain unchanged.

## Specific issues and limits

**Existing visual defect observed:** main CSS retains literal `@tailwind` directives and lacks `.w-6`/`.fixed` utility rules. Several controls are unstyled, and success toast SVGs render oversized below the app. All six bounded functional persistence checks pass; visual/layout acceptance is not claimed. No CSS patch is silently included. Screenshot evidence intentionally retains the defect.

Initial operator setup failures: unnecessary emulator admin-UI download failed; the delivered configuration disables that UI. First shutdown helper attempted an export after the CLI had stopped; the delivered helper instead uses the CLI's own export-on-exit and successful export/import is demonstrated. A first targeted-test filter selected no tests; the operator-only filter was corrected and exactly the requested six tests ran. No accepted assertion was changed. These earlier setup logs remain retained.

An optional official Adoptium API lookup returned HTTP403 in this workspace; no automatic Java downloader or unverified Java binary is bundled. Java presence/access on the PC remains a concrete prerequisite. Other main features, phone/physical devices, native Windows Java/npm installation, Join Team, attachments, external providers and full staging/deployment are not covered by these six tests. A0 remains a separate local Film demo and is not integrated into this main application. MVP remains NO-GO.

The final child environment explicitly forces AI/Film OFF, placeholder-only provider key and loopback emulator hosts even if the parent has conflicting values. The VM guard check exercises those conflicts without network/provider calls and confirms the parent environment stays unchanged. Package guard log and source are retained.
