# Foundation: Trustworthy Trunk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `recovery/coach-core-mvp-2026` a trunk that installs cleanly, builds with its styles, lets a coach sign in with a real account, has tested database rules, reports crashes, and releases through staging to production only on the owner's approval.

**Architecture:** Replace Create React App with Vite + Vitest (keeping the `REACT_APP_` env prefix and the `build/` output folder so hosting and repo variables don't change). Collapse the two auth systems into `src/components/AuthProvider.tsx` with Google and email/password sign-in that links any existing anonymous session. Add emulator-based Firestore rules tests, Sentry, and two deploy workflows (staging on every merge, production on manual approval).

**Tech Stack:** React 19, TypeScript 5.8, Vite, Vitest + jsdom, @testing-library/react 16, Tailwind CSS 4 (`@tailwindcss/postcss`), Firebase JS SDK 11, `@firebase/rules-unit-testing`, `firebase-tools`, `@sentry/react`, GitHub Actions, `FirebaseExtended/action-hosting-deploy@v0`.

**Spec:** No separate design doc. This plan implements the owner-approved senior-developer plan of 2026-11-01 ("Week 1: one trustworthy trunk / Week 2: modernize before we build on it"). Its decisions are restated in Global Constraints and the Findings section below, which carry the facts every task argues from.

## Findings this plan fixes (verified on trunk @523c7a2)

1. **No Tailwind styles are generated.** CRA ignores `postcss.config.js`, and `src/index.css` uses v3 directives (`@tailwind base;`…) with Tailwind 4 installed. Every Tailwind class is a no-op; unsized SVG icons render full-width (the giant black shape behind the welcome popup on the PR previews).
2. **Nobody can sign in.** `src/components/Dashboard.tsx` renders a Sign In button whose `onClick` is `showSuccess('Authentication coming soon!')`. `AuthProvider.signIn()` (anonymous) is never called.
3. **Two auth systems.** `src/components/AuthProvider.tsx` (rendered by App) and `src/hooks/useAuth.tsx` (email/Google, rendered nowhere; only a guard test references it).
4. **`npm ci` needs `--legacy-peer-deps`** (react-scripts 5 peers TypeScript ≤4; @testing-library/react 13 peers React 18).
5. **Broken submodule gitlink** `src/components/Coach's Corner/Practice Plan Generator` (mode 160000, no `.gitmodules` entry). Every CI checkout prints `fatal: No url found for submodule path`.
6. **Service worker precaches files that don't exist** (`public/sw.js` lists `/static/js/bundle.js`, `/static/css/main.css`, `/favicon.ico`, `/icons/*`). After the Vite move, file names change again; a stale cache-first worker can pin coaches to an old app.
7. **Rules gaps** in `firestore.rules`: `teams` update allows changing `ownerId`; `plays`/`practicePlans` update checks only the *old* `teamId`, so a coach can move a doc into a team they don't own; `createdBy` is mutable on update. No rules tests exist.
8. **Two Firebase init modules:** `src/firebase.ts` (real) and `src/services/firebase.ts` (re-export). Both stay; only `src/firebase.ts` changes.
9. **Lint warnings:** 15 in old Smart Playbook v1 files (listed in Task 7).

## Global Constraints

- Branch: `foundation/trunk-hardening` from `origin/recovery/coach-core-mvp-2026`. One PR into `recovery/coach-core-mvp-2026`. Never push to `master`. Do not merge or deploy production — the owner does.
- Branch protection on recovery requires `test-and-build` and `preview` to pass; keep those job names unchanged.
- Keep the `REACT_APP_` env prefix (Vite `envPrefix: 'REACT_APP_'`) — repo variables `REACT_APP_FIREBASE_*` must keep working unchanged.
- Keep build output in `build/` (Vite `build.outDir: 'build'`) so `firebase.json` `hosting.public` stays `build`.
- No secrets in client code. Every `REACT_APP_*` value is public. Sentry DSN is public by design; the Sentry auth token is a GitHub secret only, never in the bundle.
- AI stays off (`REACT_APP_AI_ENABLED` unset). Do not touch `src/football-core/` or `src/ai-brain/` behavior.
- No existing play/practice-plan/team documents change shape. Rules changes only *narrow* access; anything a coach could legitimately do before still works.
- `npm ci` with no flags must succeed. Node 22 in CI.
- Coaches are adults; players may be minors. Sentry: `sendDefaultPii: false`, no Session Replay.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Skills to load per task

| Task | Skills |
|---|---|
| All | superpowers:test-driven-development, superpowers:verification-before-completion |
| 2, 3 | vercel:react-best-practices (Vite docs for config) |
| 4 | firestore-rules-creation, firebase-security-rules-auditor |
| 5 | firebase-auth-basics |
| 6 | sentry-react-sdk |
| 8 | firebase-hosting-basics |
| End | code-review, security-review |

## Owner actions (not code — the owner does these in consoles; agents never handle key values)

- **O1 (before Task 5 ships):** Firebase console → project `coach-core-ai` → Authentication → Sign-in method: enable **Email/Password** and **Google**. Settings → Authorized domains: confirm `coach-core-ai.web.app`, `coach-core-ai.firebaseapp.com`, `coach-core-ai-staging.web.app` are listed (add the staging one if missing).
- **O2 (before Task 6 ships):** Create a Sentry project (platform: React). Set repo variable `REACT_APP_SENTRY_DSN` (`! gh variable set REACT_APP_SENTRY_DSN`) and secret `SENTRY_AUTH_TOKEN` (`! gh secret set SENTRY_AUTH_TOKEN`), plus variables `SENTRY_ORG` and `SENTRY_PROJECT`.
- **O3 (before Task 8's production workflow is used):** GitHub → Settings → Environments → create `production` with **Required reviewers: owner**. (An agent may create it via API on the owner's go-ahead; the owner clicks Save on reviewers.)
- **O4 (recommended, later):** create a separate Firebase project for staging/previews so testing never touches production data. Out of scope for this plan's code.

## Review Focus

1. **Coach already has an anonymous session (carried over from the old live build on the same origin) and signs in with Google** → the anonymous account is linked, not replaced; if that Google account already exists, sign in to it (anonymous data stays orphaned — acceptable, nothing user-visible depends on it yet). Test in Task 5.
2. **Popup blocked or closed by the user** (`auth/popup-blocked`, `auth/popup-closed-by-user`, `auth/cancelled-popup-request`) → a friendly message, no crash, no error toast for a deliberate close. Test in Task 5.
3. **A coach updates a play and changes its `teamId` to a team they don't own** → denied. Test in Task 4.
4. **Returning visitor whose browser has the old service worker installed** → after the first load of the new build, the worker unregisters itself and clears its caches; the second load is network-fresh. Test in Task 3.
5. **Build with no Sentry DSN (PRs from contributors, local dev)** → the app runs, Sentry is never initialized, no network calls to Sentry. Test in Task 6.

---

### Task 1: Remove the broken submodule gitlink

**Files:**
- Delete (index only): `src/components/Coach's Corner/Practice Plan Generator` (gitlink)

- [ ] **Step 1: Confirm it's a dangling gitlink**

Run: `git ls-files -s | grep ^160000` → shows exactly one line for `Practice Plan Generator`; `cat .gitmodules` → file doesn't exist.

- [ ] **Step 2: Remove it from the index**

Run: `git rm --cached "src/components/Coach's Corner/Practice Plan Generator"`

- [ ] **Step 3: Verify**

Run: `git ls-files -s | grep ^160000` → no output. `git submodule status` → no output, no error.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove dangling submodule gitlink (no .gitmodules entry; broke every checkout)"
```

---

### Task 2: Move from Create React App to Vite + Vitest; clean install

**Files:**
- Create: `vite.config.ts`, `index.html` (moved from `public/index.html`), `src/vite-env.d.ts`
- Delete: `src/react-app-env.d.ts`, `public/index.html`
- Modify: `package.json`, `package-lock.json`, `tsconfig.json`, `src/setupTests.ts`, `src/index.tsx` (only if needed), the 14 files using `process.env` (`grep -rln "process\.env" src --include=*.ts --include=*.tsx | grep -v _archived`), the 7 test files using `jest.*`, `.github/workflows/unit-tests-and-build.yml`, `.github/workflows/firebase-preview.yml`
- Test: existing suite (27 suites / 411 tests on trunk) + `src/__tests__/env.test.ts`

**Interfaces:**
- Produces: `npm run dev` (Vite dev server), `npm run build` (`tsc --noEmit && vite build` → `build/`), `npm test` (`vitest run`), `npm run typecheck` (`tsc --noEmit`). Env read as `import.meta.env.REACT_APP_*`; mode checks use `import.meta.env.PROD` / `import.meta.env.DEV`.

- [ ] **Step 1: Write the failing env test** `src/__tests__/env.test.ts`

```ts
it('exposes REACT_APP_ variables through import.meta.env', () => {
  vi.stubEnv('REACT_APP_FIREBASE_PROJECT_ID', 'demo-project');
  expect(import.meta.env.REACT_APP_FIREBASE_PROJECT_ID).toBe('demo-project');
});
it('does not run under Jest', () => {
  expect(typeof (globalThis as any).jest).toBe('undefined');
});
```

- [ ] **Step 2: Swap dependencies**

Remove: `react-scripts`, `@types/jest`, `@storybook/testing-library` (unused; peers old testing-library). Add dev: `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`, `@testing-library/react@^16`, `@testing-library/dom@^10`, `@testing-library/user-event@^14`, `@testing-library/jest-dom@^6`. Bump `@types/node` to `^22`. Install with plain `npm install` (no `--legacy-peer-deps`). Record installed majors in the PR description.

- [ ] **Step 3: Configure Vite** — `vite.config.ts`: `plugins: [react()]`, `envPrefix: 'REACT_APP_'`, `build: { outDir: 'build', sourcemap: true }`, `server: { port: 3000 }`, and `test: { environment: 'jsdom', globals: true, setupFiles: ['src/setupTests.ts'], include: ['src/**/*.test.{ts,tsx}'], exclude: ['src/_archived/**', 'src/components/SmartPlaybook/src/**', 'node_modules/**'] }`. Move `public/index.html` to `/index.html`, drop `%PUBLIC_URL%`, add `<script type="module" src="/src/index.tsx"></script>`. `src/vite-env.d.ts`: `/// <reference types="vite/client" />` plus an `ImportMetaEnv` interface declaring every `REACT_APP_*` name in use as `readonly string | undefined`.

- [ ] **Step 4: tsconfig** — `target: "ES2020"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `types: ["vite/client", "vitest/globals", "@testing-library/jest-dom"]`; keep `strict`, `include`, `exclude`.

- [ ] **Step 5: Code changes** — replace `process.env.REACT_APP_X` → `import.meta.env.REACT_APP_X`; `process.env.NODE_ENV === 'production'` → `import.meta.env.PROD` (and `!== 'production'`/`=== 'development'` → `import.meta.env.DEV`). In tests replace `jest.` → `vi.` (`jest.Mock` → `Mock` from `vitest`, `jest.MockedClass` → `MockedClass`); tests that assign `process.env.X` use `vi.stubEnv('X', …)` / `vi.unstubAllEnvs()`. `src/setupTests.ts`: `import '@testing-library/jest-dom/vitest'` and `jest.` → `vi.`. Update `src/services/__tests__/no-client-secrets.test.ts` so its patterns also catch `import.meta.env.REACT_APP_OPENAI*` / `*_API_KEY` for providers (keep every existing assertion).

- [ ] **Step 6: Run everything**

Run: `npm ci && npm test && npm run build`
Expected: `npm ci` succeeds with no flags; Vitest reports ≥ 28 files, all pass, test count ≥ 413; build writes `build/index.html`.

- [ ] **Step 7: CI** — both workflows: `npm ci --no-audit --no-fund` (drop `--legacy-peer-deps` and its comment); unit tests step → `npm test`; add step `Typecheck` → `npm run typecheck` before build in `unit-tests-and-build.yml`. Keep job names `test-and-build` and `preview`.

- [ ] **Step 8: Commit**

```bash
git commit -m "build: move from Create React App to Vite + Vitest; clean npm ci without --legacy-peer-deps"
```

---

### Task 3: Tailwind styles actually ship; retire the broken service worker

**Files:**
- Modify: `src/index.css:1-3`, `public/sw.js` (replace), `src/components/PWAInstallPrompt.tsx` (`registerServiceWorker`)
- Create: `scripts/check-build.mjs`, `src/components/__tests__/service-worker.test.ts`

**Interfaces:**
- Consumes: Task 2's `build/` output.
- Produces: `registerServiceWorker(): Promise<void>` keeps its name and export (App.tsx calls it) but now only unregisters existing workers.

- [ ] **Step 1: Write the failing build check** `scripts/check-build.mjs` — reads every `build/assets/*.css`, exits 1 unless the CSS contains `.min-h-screen{` and `.bg-gray-50{` (both used in `Dashboard.tsx`) and contains no literal `@tailwind`.

- [ ] **Step 2: Run it** — `npm run build && node scripts/check-build.mjs` → FAIL (`@tailwind` present / classes missing).

- [ ] **Step 3: Fix** `src/index.css` lines 1-3 → `@import "tailwindcss";`. Keep the rest of the file. Add `"postbuild": "node scripts/check-build.mjs"` to `package.json` so every build (CI included) enforces it.

- [ ] **Step 4: Run** — `npm run build` → PASS (postbuild check passes).

- [ ] **Step 5: Write the failing service-worker test** `src/components/__tests__/service-worker.test.ts`

```ts
it('unregisters every existing service worker and never registers a new one', async () => {
  const unregister = vi.fn().mockResolvedValue(true);
  const register = vi.fn();
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true,
    value: { getRegistrations: vi.fn().mockResolvedValue([{ unregister }, { unregister }]), register } });
  await registerServiceWorker();
  expect(unregister).toHaveBeenCalledTimes(2);
  expect(register).not.toHaveBeenCalled();
});
it('does nothing when service workers are unsupported', async () => {
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: undefined });
  await expect(registerServiceWorker()).resolves.toBeUndefined();
});
```

- [ ] **Step 6: Implement** — `registerServiceWorker` unregisters all registrations. Replace `public/sw.js` with a kill-switch worker: on `install` → `self.skipWaiting()`; on `activate` → delete every cache (`caches.keys()`), `self.registration.unregister()`, then `clients.matchAll({type:'window'})` and `client.navigate(client.url)`. No `fetch` handler. (Offline mode returns later as its own phase with a generated worker.)

- [ ] **Step 7: Run** — `npm test` → PASS.

- [ ] **Step 8: Visual check** — `npm run build && npx vite preview`; screenshot at 1366 px: the sign-in card is styled (white card, blue button) and no full-width icon appears behind the welcome popup. Attach to the PR.

- [ ] **Step 9: Commit**

```bash
git commit -m "fix: ship Tailwind 4 styles (CRA ignored PostCSS) and retire the stale service worker"
```

---

### Task 4: Firestore rules — close the gaps and test them in CI

**Files:**
- Modify: `firestore.rules`, `package.json` (scripts + devDeps), `.github/workflows/unit-tests-and-build.yml`
- Create: `vitest.rules.config.ts`, `rules-tests/firestore.rules.test.ts`

**Interfaces:**
- Produces: `npm run test:rules` = `firebase emulators:exec --only firestore --project demo-coach-core "vitest run -c vitest.rules.config.ts"`. New CI job `firestore-rules`.

- [ ] **Step 1: Audit first** — run the firebase-security-rules-auditor skill against `firestore.rules`; add any further *narrowing* findings to this task's tests (don't widen anything).

- [ ] **Step 2: Write the failing tests** `rules-tests/firestore.rules.test.ts` with `@firebase/rules-unit-testing` (`initializeTestEnvironment({ projectId: 'demo-coach-core', firestore: { rules: readFileSync('firestore.rules','utf8') } })`; seed with `withSecurityRulesDisabled`; `clearFirestore()` in `beforeEach`). Users: `alice` owns team `t1`, `bob` owns `t2`. Cases (`assertSucceeds` / `assertFails`):
  - alice reads/updates/deletes `teams/t1` ✓; bob reads `teams/t1` ✗; unauthenticated reads ✗
  - alice creates `teams/t3` with `ownerId:'alice'` ✓, with `ownerId:'bob'` ✗
  - alice updates `teams/t1` setting `ownerId:'bob'` ✗ **(new)**
  - alice creates `plays/p1` `{teamId:'t1', createdBy:'alice'}` ✓; with `teamId:'t2'` ✗; with `createdBy:'bob'` ✗
  - alice updates `plays/p1` name ✓; sets `teamId:'t2'` ✗ **(new)**; sets `createdBy:'bob'` ✗ **(new)**; bob updates `plays/p1` ✗
  - the same four create/update cases for `practicePlans`
  - alice reads a play doc that doesn't exist → ✗ (no crash in rules)

- [ ] **Step 3: Run to see the new cases fail** — `npm run test:rules` → the three **(new)** cases (and their practicePlans twins) FAIL; all others PASS.

- [ ] **Step 4: Fix rules** — `teams` update additionally requires `request.resource.data.ownerId == resource.data.ownerId`; `plays` and `practicePlans` update additionally require `request.resource.data.teamId == resource.data.teamId && request.resource.data.createdBy == resource.data.createdBy`. Keep every existing `else error(...)` message.

- [ ] **Step 5: Run** — `npm run test:rules` → all PASS.

- [ ] **Step 6: CI job** `firestore-rules` in `unit-tests-and-build.yml`: checkout, setup-node 22 (npm cache), `actions/setup-java@v4` (`distribution: temurin`, `java-version: 21`), `npm ci`, `npm run test:rules`. `firebase-tools` and `@firebase/rules-unit-testing` are devDependencies (no global installs).

- [ ] **Step 7: Commit**

```bash
git commit -m "security(rules): lock team ownership and play/plan team moves; emulator rules tests in CI"
```

- [ ] **Step 8 (after the PR merges, owner go-ahead):** add `firestore-rules` to recovery's required status checks. Deploying rules to the live project is the owner's call (`firebase deploy --only firestore:rules`), not part of this PR.

---

### Task 5: One auth system with real coach accounts

**Files:**
- Modify: `src/components/AuthProvider.tsx`, `src/components/Dashboard.tsx:22-40` (sign-in card), `src/setupTests.ts` (add `linkWithPopup`, `linkWithCredential`, `EmailAuthProvider`, `sendPasswordResetEmail`, `signInAnonymously` to the auth mock), `src/components/__tests__/auth-provider-consistency.test.ts`
- Create: `src/components/auth/SignInScreen.tsx`, `src/components/auth/authErrors.ts`, `src/components/__tests__/AuthProvider.test.tsx`, `src/components/auth/__tests__/SignInScreen.test.tsx`
- Delete: `src/hooks/useAuth.tsx`

**Interfaces:**
- Produces (from `src/components/AuthProvider.tsx`):
  ```ts
  interface AuthContextType {
    user: User | null; loading: boolean; isAuthenticated: boolean;
    signInWithGoogle(): Promise<void>;
    signInWithEmail(email: string, password: string): Promise<void>;
    signUpWithEmail(email: string, password: string): Promise<void>;
    sendPasswordReset(email: string): Promise<void>;
    signOut(): Promise<void>;
  }
  export const useAuth: () => AuthContextType;
  export const AuthProvider: React.FC<{ children: React.ReactNode }>;
  ```
  The old anonymous `signIn` is removed (nothing calls it).
- `src/components/auth/authErrors.ts`: `export function authErrorMessage(code: string): string | null` — `null` means "say nothing".

- [ ] **Step 1: Write failing tests** `AuthProvider.test.tsx` (render a probe component inside `AuthProvider`, drive `onAuthStateChanged` from the mock):
  - `signInWithGoogle` with no current user → `signInWithPopup` called once with a `GoogleAuthProvider`, `linkWithPopup` not called
  - with `auth.currentUser = { isAnonymous: true }` → `linkWithPopup` called; `signInWithPopup` not called
  - anonymous + `linkWithPopup` rejects `{code:'auth/credential-already-in-use'}` → falls back to `signInWithCredential(auth, GoogleAuthProvider.credentialFromError(err))`; user ends signed in
  - `signUpWithEmail` when anonymous → `linkWithCredential(currentUser, EmailAuthProvider.credential(email, pw))`; when not anonymous → `createUserWithEmailAndPassword`
  - `signInWithGoogle` rejecting `auth/popup-closed-by-user` → no error toast; `auth/popup-blocked` → error toast `"Your browser blocked the sign-in window. Allow pop-ups for this site and try again."`
- [ ] **Step 2: Write failing `authErrorMessage` table test** — exact copy:
  - `auth/email-already-in-use` → `"An account with this email already exists. Sign in instead."`
  - `auth/invalid-credential` / `auth/wrong-password` / `auth/user-not-found` → `"That email and password don't match."`
  - `auth/weak-password` → `"Use at least 8 characters for your password."`
  - `auth/too-many-requests` → `"Too many attempts. Wait a minute and try again."`
  - `auth/network-request-failed` → `"No connection. Check your internet and try again."`
  - `auth/popup-blocked` → (copy above); `auth/popup-closed-by-user`, `auth/cancelled-popup-request` → `null`
  - anything else → `"Sign-in didn't work. Try again."`
- [ ] **Step 3: Write failing `SignInScreen.test.tsx`** — renders "Continue with Google" button, email + password fields, a "Create account" / "Sign in" mode toggle, and "Forgot password?"; submitting sign-up with a 7-character password shows the weak-password copy without calling `signUpWithEmail`; "Forgot password?" with an email calls `sendPasswordReset` and shows `"Check your email for a reset link."`. Labels are real `<label>`s (accessible names).
- [ ] **Step 4: Run** — `npm test` → new tests FAIL.
- [ ] **Step 5: Implement** `AuthProvider` per the interface (firebase-auth-basics skill), `authErrors.ts`, and `SignInScreen` (Tailwind, mobile-first, 44 px min tap targets). `Dashboard.tsx`: replace the "coming soon" card with `<SignInScreen />`. Delete `src/hooks/useAuth.tsx`; update `auth-provider-consistency.test.ts` to assert the file is gone and no `src/**` file imports `hooks/useAuth`.
- [ ] **Step 6: Run** — `npm test` → PASS; `npm run typecheck` → PASS.
- [ ] **Step 7: Manual check on the PR preview** (needs O1): create an email account, sign out, sign back in, Google sign-in; then a team created after sign-in shows `ownerId` = that uid.
- [ ] **Step 8: Commit**

```bash
git commit -m "feat(auth): one auth system — Google and email accounts, links existing anonymous sessions"
```

---

### Task 6: Sentry crash reporting

**Files:**
- Create: `src/monitoring/sentry.ts`, `src/monitoring/__tests__/sentry.test.ts`
- Modify: `src/index.tsx` (call `initMonitoring()` before render), `src/components/common/ErrorBoundary.tsx:24` (`componentDidCatch` also calls `captureError`), `vite.config.ts` (Sentry source-map plugin only when `SENTRY_AUTH_TOKEN` is set), both workflows (pass `REACT_APP_SENTRY_DSN` var; `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` to the build step), `package.json`

**Interfaces:**
- Produces: `initMonitoring(env?: { dsn?: string; mode: string; release?: string }): boolean` (true if initialized); `captureError(error: unknown, context?: Record<string, unknown>): void` (no-op when not initialized).

- [ ] **Step 1: Failing tests** (`vi.mock('@sentry/react')`):
  - no DSN → returns `false`, `Sentry.init` not called, `captureError(new Error())` doesn't call `Sentry.captureException`
  - DSN set, mode `production` → `Sentry.init` called once with `dsn`, `environment: 'production'`, `sendDefaultPii: false`, `tracesSampleRate: 0.1`, and `integrations` not containing a replay integration; returns `true`
  - `captureError(err, {area:'playbook'})` after init → `Sentry.captureException(err, { extra: { area: 'playbook' } })`
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (sentry-react-sdk skill; `@sentry/react` dependency, `@sentry/vite-plugin` devDependency; `release` = `import.meta.env.REACT_APP_RELEASE`, set in CI to `${{ github.sha }}`). Environment: `production` for the production workflow, `staging` for staging, `preview` for PR previews (passed as `REACT_APP_DEPLOY_ENV`). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit**

```bash
git commit -m "feat(monitoring): Sentry crash reporting, off unless a DSN is configured; no PII, no replay"
```

---

### Task 7: Lint and typecheck gate

**Files:**
- Create: `eslint.config.js`
- Modify: `package.json` (`"lint": "eslint src --max-warnings 0"`), `.github/workflows/unit-tests-and-build.yml` (Lint step), and the 15 warnings: `src/components/SmartPlaybook/DebugPanel.js:90,173,182`, `SmartPlaybook.tsx:30,134,340,343,357`, `components/Notification.js:56`, `components/PlayerControls.js:9`, `components/RouteControls.js:9`, `components/RouteEditor.js:9`, `components/SaveLoadPanel.js:9`

- [ ] **Step 1:** `eslint.config.js` (flat config) mirroring what CRA enforced and no more: `typescript-eslint` parser for ts/tsx, `eslint-plugin-react-hooks` (`rules-of-hooks: error`, `exhaustive-deps: warn`), `@typescript-eslint/no-unused-vars` / `no-unused-vars: warn` (args `after-used`, ignore `^_`), `eslint-plugin-jsx-a11y` recommended. Ignore `build/`, `src/_archived/**`, `src/components/SmartPlaybook/src/**`.
- [ ] **Step 2:** `npm run lint` → FAIL listing the warnings above (plus any the new config surfaces — fix those too, no rule disabling).
- [ ] **Step 3:** Fix each: remove unused imports/variables; for the two `exhaustive-deps` cases wrap the callback in `useCallback` or add the dependency — behavior unchanged; `DebugPanel` `safeResults` into its own `useMemo`; drop redundant `role` attributes.
- [ ] **Step 4:** `npm run lint && npm test && npm run build` → all PASS, `0 warnings`.
- [ ] **Step 5: Commit** — `git commit -m "chore(lint): ESLint flat config in CI with zero warnings"`

---

### Task 8: Release path — staging on every merge, production on approval

**Files:**
- Modify: `firebase.json` (`hosting` → array with `target: "production"` and `target: "staging"`, same settings each), `.firebaserc` (add `"targets": { "coach-core-ai": { "hosting": { "production": ["coach-core-ai"], "staging": ["coach-core-ai-staging"] } } }`), `.github/workflows/firebase-preview.yml` (add `target: production` to the deploy step so previews stay on the main site's channels)
- Create: `.github/workflows/deploy-staging.yml`, `.github/workflows/deploy-production.yml`, `docs/RELEASING.md`

**Interfaces:**
- Consumes: secret `FIREBASE_SERVICE_ACCOUNT_COACH_CORE_AI` (has Firebase Hosting Admin), repo variables `REACT_APP_FIREBASE_*`, Task 6's Sentry vars.

- [ ] **Step 1: Verify config locally** — `npx firebase-tools target --project coach-core-ai` is not required; instead validate JSON: `node -e "JSON.parse(require('fs').readFileSync('firebase.json'))"` and confirm both hosting entries have `"public": "build"`.
- [ ] **Step 2: `deploy-staging.yml`** — `on: push: branches: [recovery/coach-core-mvp-2026]` + `workflow_dispatch`; concurrency group `deploy-staging` (no cancel); steps: checkout, node 22, `npm ci`, `npm test`, build with the Firebase vars + `REACT_APP_DEPLOY_ENV: staging` + `REACT_APP_RELEASE: ${{ github.sha }}`, then `FirebaseExtended/action-hosting-deploy@v0` with `channelId: live`, `target: staging`, `projectId: coach-core-ai`. Same flags as previews (`REACT_APP_ENABLE_PLAYBOOK_V2`/`REACT_APP_ENABLE_CONTENT_REVIEW` = `'true'`).
- [ ] **Step 3: `deploy-production.yml`** — `on: workflow_dispatch` with inputs `ref` (required, commit SHA on recovery) and `confirm` (required string). Job uses `environment: production` (O3 → owner approval gate). First step fails unless `inputs.confirm == 'replace-live-site'` and `git merge-base --is-ancestor ${{ inputs.ref }} origin/recovery/coach-core-mvp-2026`. Build at `ref` with `REACT_APP_DEPLOY_ENV: production`, feature flags **unset** (v2 and content review off in production), deploy `channelId: live`, `target: production`.
- [ ] **Step 4: `docs/RELEASING.md`** — one page: PR → preview link → merge → staging (`https://coach-core-ai-staging.web.app`) → run "Deploy production" with the staging SHA → owner approves. Rollback: Firebase console → Hosting → site `coach-core-ai` → Release history → ⋮ → Rollback (instant), or rerun "Deploy production" with the previous SHA. Warn: the first production run replaces the old Vite build currently live; owner decides when.
- [ ] **Step 5: Verify** — `actionlint` isn't installed locally; push the branch and confirm the PR's `preview` job still deploys (target change) and posts a link. Staging deploy is verified after merge by watching the `deploy-staging` run and loading the staging URL.
- [ ] **Step 6: Commit** — `git commit -m "ci: staging deploy on every merge; production deploy behind owner approval with rollback runbook"`

---

### Finish

- [ ] Full gate on the branch: `npm ci && npm run lint && npm run typecheck && npm test && npm run build && npm run test:rules` — all green; report counts.
- [ ] Run code-review and security-review skills on the branch diff; fix findings.
- [ ] Open a draft PR into `recovery/coach-core-mvp-2026` with: findings fixed, installed versions, screenshots (Task 3 Step 8, Task 5 sign-in at 390 px and 1366 px), owner actions O1–O3 still pending, and every ruling made that this plan didn't settle.

## Out of scope (next plans)

- Rebuild `smart-playbook/phase2-playbook-screen` on the new trunk (it was built on the pre-squash phase 1 branch; its Task 1 install fix is superseded by Task 2 here).
- Separate Firebase project for staging/previews (O4); production cutover itself; COPPA/privacy review before practice mode; offline mode with a generated service worker.
