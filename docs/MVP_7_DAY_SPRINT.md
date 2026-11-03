# Coach Core AI — Seven-Day MVP Recovery Sprint
Window: **Oct 13–20, 2026** (aggressive target, not guaranteed launch). One status document shared through GitHub.

## Day 1: Evidence and blockers
**Codex owns:** import four previous audit reports into `outputs/` with raw commands, tool versions, reproducible test evidence; fix 2 failing main tests and unloaded suite, or attach reproducible cause. Inventory 810 TS errors by category, not file count alone.
**Claude owns:** independent *read-only* review of auth, Firestore rules, AI secret exposure, minimum secure beta architecture. Produce a PR touching documentation only, no production secrets.
**Gate:** both agents report precise blockers, sources, commands, baselines.

## Day 2: Fix unsafe gates
Codex: test and correct build/typecheck configs and targeted frontend reliability. Claude: implement security repairs only on an explicitly assigned security branch after agreeing non-overlapping files with Codex.
Gate: prioritized blockers fixed or scoped out from shipping.

## Day 3: Playbook reliability
Codex: drag + undo/redo, play loading/saving & validation, targeted regression tests. Claude: independent review of code diffs and negative tests. Gate: repeatable play workflow verified.

## Day 4: Authentication and persistence
Assigned developer: secure login/demo isolation, Firestore rules + ownership, save/reopen cross-session; preserve staging data. Gate: isolated test users cannot access other teams' resources.

## Day 5: Practice planner and integration
Selective Smart Playbook module integration into main app only if tests pass. AI must go server-side or be disabled in beta. Gate: end-to-end coach workflow.

## Day 6: Private deployment
Deploy a restricted staging preview with Firebase Hosting if credentials and plan are approved, capture exact URLs, config, rollback, logs. Test phone/tablet; perform security smoke tests. Never publish publicly without approval.

## Day 7: Coach acceptance / release decision
Run launch checklist. Ship ONLY if evidence passes all security + functional gates; otherwise demo known-good flows privately with mocks and publish a transparent blocker list.

## One daily report format (commit or PR in this file)
Date/owner | GitHub branch & PR | Passed/failed/blocked tests + exact commands | Files changed | Security issues | What remains | Next owner. No unverified percentages.

## Strict controls
- Codex and Claude do not share hidden context or update each other's chat memory. Share decisions via this GitHub repository only.
- Do not add keys, personal player data, customer records, or credentials.
- Preserve `master`, Smart Playbook `main`, existing Firebase projects.
- If waiting on access or unresolved critical vulnerabilities, do not ship.

## Report — 2026-11-01 — Claude — foundation/trunk-hardening
**Branch / PR:** `foundation/trunk-hardening` → draft PR into `recovery/coach-core-mvp-2026` (plan: `docs/superpowers/plans/2026-11-01-foundation-trunk-hardening.md`).

**Evidence (run in the cloud session, Node 22.23.4, npm 10.9.9, from a clean `npm ci` with no flags):**
- `npm run lint` → 0 problems (`--max-warnings 0`)
- `npm run typecheck` → 0 errors
- `npm test` (Vitest) → 35 files, 466 tests passed (trunk baseline under CRA/Jest: 27 suites, 411 tests)
- `npm run build` → OK; postbuild Tailwind check passes
- `npm run test:rules` (Firestore emulator) → 24 passed
- actionlint 1.7.12 on all four workflows → clean
- Screenshots: `docs/evidence/foundation-trunk-hardening/`

**Files changed:** build tooling (Vite, Vitest, ESLint, tsconfig, package.json), `firestore.rules` + `rules-tests/`, auth (`src/components/AuthProvider.tsx`, `src/components/auth/*`, `Dashboard.tsx`; `src/hooks/useAuth.tsx` deleted), `src/monitoring/sentry.ts`, `public/sw.js`, `firebase.json`, `.firebaserc`, workflows (`deploy-staging.yml`, `deploy-production.yml`, edits to the two existing ones), `docs/RELEASING.md`. Full list in the PR.

**Security:**
- Trunk `firestore.rules` did not compile (`else error(...)` is not rules syntax), so the rules live on `coach-core-ai` are unknown from the repo. Fixed and narrowed; **not deployed** (owner's call).
- **Blocker:** the rules deny the app's own team queries (`TeamContext`: `memberIds array-contains uid`, `code == …`), so signed-in coaches cannot create, list or join teams. Fixing it widens read access (members / join codes): needs an owner decision on the team-sharing model. Verified in the emulator.
- Pre-existing, unchanged: `storage.rules` lets any signed-in user read/write every team's files.
- Staging deploys on every merge to a second Hosting site in the **same** Firebase project (shared data and accounts) until O4.

**What remains:** owner actions O1 (sign-in providers + authorized domains), O2 (Sentry), O3 (`production` environment), create Hosting site `coach-core-ai-staging`; team rules decision; Google/email sign-in check on the PR preview (needs O1); add `firestore-rules` to required checks after merge.

**Next owner:** repository owner (review, owner actions, rules decision); then the next plan (rebuild Smart Playbook phase 2 on the new trunk).

## Report — 2026-11-02 — Claude — smart-playbook/phase2-screen
**Branch / PR:** `smart-playbook/phase2-screen` → draft PR into `recovery/coach-core-mvp-2026` (plan: `docs/superpowers/plans/2026-10-31-smart-playbook-phase2-playbook-screen.md`).

**Evidence (cloud session, Node 22.23.4, after `npm ci`):**
- `npm run lint` → 0 problems; `npm run typecheck` → 0 errors
- `npm test` → 50 files, 586 tests passed (branch base: 35 files, 466)
- `npm run build` → OK; the new screen, review screen and fonts are lazy chunks (main bundle has no playbook v2 code)
- `npm run test:rules` → 29 passed (24 existing + 5 new; **no rule changes**). The `where('teamId','==',…)` list query passes under the current rules.
- Browser walkthrough (Auth + Firestore emulators with the real rules; `useAuth`/`useTeam` stubbed in an uncommitted harness because the trunk rules deny TeamContext's team queries): library → Use Smash from Doubles → drag → undo → rename H to F → Mostly Cover 2 → step 2 → save → reload → Content review approve, at 1440/768/390 px; no horizontal overflow, no console errors. Screenshots: `docs/evidence/smart-playbook-phase2/`.

**Files changed:** new `src/features/playbook2/**`; `src/football-core/library.ts`, `index.ts`, `content/decisions.json`, `content/README.md`; `src/components/Dashboard.tsx` (flag-gated entry + Content review tab); `src/components/SmartPlaybook/SmartPlaybook.tsx` and `src/services/firestore.ts` (v1 reads skip v2 plays); `rules-tests/firestore.rules.test.ts` (tests only); `src/vite-env.d.ts`; `package.json` (3 `@fontsource` packages).

**Security:** no rules, auth or AI changes; nothing calls the AI. Code review and security review run on the diff; code-review findings fixed (listed in the PR). Security review: no findings with confidence ≥ 8.

**Remaining blockers:** the trunk blocker stands (rules deny TeamContext's team queries, so a real coach can't select a team until the owner decides the team-sharing model); the content-review screen shows drafts to any signed-in user of a build with `REACT_APP_ENABLE_CONTENT_REVIEW=true` (keep it to dev/preview builds); on a 390 px phone, players on the sheet are smaller than 44 px (the 44 px nudge buttons and the keyboard are the accessible path).

**Next owner:** repository owner (review the draft PR, the rulings listed in it, and the flags), then phase 3 (level switch, one play every formation, whiteprint/print).
