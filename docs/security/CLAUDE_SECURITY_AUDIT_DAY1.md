# Coach Core AI — Independent Security & Architecture Audit (Day 1)

| | |
|---|---|
| Issue | #39 — Day 1, Claude: independent authentication and security review |
| Author | Claude (independent security/architecture reviewer) |
| Date | 2026-10-13 |
| Branch / PR | `claude/security-audit-day1` → `recovery/coach-core-mvp-2026` (documentation only) |
| Sources audited | `coach-core-ai` @ `3992d8d` (recovery branch head); `Coach-Core-Smart-Playbook-` @ `6b4c42c` (`main`), plus full git history of both repos (all refs) |
| Not touched | Production Firebase projects, deployed hosting, provider consoles, Codex-owned files, any branch other than this one |

**Verdict: private beta is BLOCKED on security.** Four findings are release blockers (F-01 to F-04). None is hard to fix, but none is fixed today, and three of them (AI keys, missing sign-in, tenant isolation in Storage) are exactly the gates listed in `docs/COACH_CORE_SHARED_CONTEXT.md`.

Evidence labels used below: **[Reproduced]** = executed here with output recorded; **[Static]** = source inspection only; **[Owner-verify]** = needs a human with console access, agents must not do it.

---

## 1. Findings

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| F-01 | **Critical (blocker)** | AI provider credentials are compiled into the browser bundle in both apps | [Reproduced] canary builds |
| F-02 | **Critical (blocker)** | No working sign-in; the only implemented auth path is anonymous; auth contexts are mis-wired | [Reproduced] render test + [Static] |
| F-03 | **High → Critical if anonymous auth is enabled (blocker)** | Storage rules give every signed-in user read/write on every team's files | [Static] |
| F-04 | **High (blocker)** | `firestore.rules` uses syntax that does not exist in the rules language; deployed rules are unknown | [Static], compiler run blocked |
| F-05 | High | Firestore updates do not pin tenant fields (`teamId`, `createdBy`, `ownerId`) and have no schema/size limits | [Static] |
| F-06 | High | Unauthenticated destructive HTTP function; analytics callable stores IP/UA and unbounded payloads | [Static] |
| F-07 | Medium | Firebase web API keys committed (2 distinct keys, 22 occurrences in history, 1 in current tree); possible Gemini exposure through key scope | [Reproduced] history scan + [Owner-verify] |
| F-08 | Medium | Rules contradict the app's team model; the team join code is a 6-char bearer secret | [Static] |
| F-09 | Medium | Youth/player context is sent from the browser to third-party AI with no server-side minimization | [Static] |
| F-10 | Medium | Offline write queue and service-worker API cache are not partitioned by user/team (shared-device leakage) | [Static] |
| F-11 | Medium | Production dependency advisories: main 10 (3 critical, 5 high), functions 23 (5 critical, 6 high) | [Reproduced] `npm audit --omit=dev` |
| F-12 | Low | No security headers on either hosting target | [Static] |
| F-13 | Low | Configuration/branch hygiene that will reintroduce F-01 on merge | [Static] |

### F-01 — AI credentials compiled into the client (Critical)

**Main app.** `src/App.tsx:86` mounts `<AIProvider>` with `useProxy` defaulting to `false` (`src/ai-brain/AIContext.tsx:80`). The default path builds `AIService` with `apiKey: process.env.REACT_APP_OPENAI_API_KEY` (`AIContext.tsx:84`) and calls `${baseUrl}/chat/completions` with `Authorization: Bearer <key>` directly from the browser (`src/services/ai-service.ts:678-683`). The proxy path is no better: it sends a shared `REACT_APP_AI_PROXY_TOKEN` (`src/services/ai-proxy.ts:53`), which is equally extractable, and no `/api/ai` server exists in deployable code (only `src/_archived/server/ai-proxy-server.js`).

**Smart Playbook.** `vite.config.ts` uses `define` to substitute `GEMINI_API_KEY` into `process.env.API_KEY`, and five services instantiate `new GoogleGenAI({ apiKey: process.env.API_KEY })` in the browser (`services/aiService.ts`, `quizService.ts`, `gameplanService.ts`, `coverageAnalysisService.ts`, `situationalPlayCallerService.ts`). The `recovery/smart-playbook-mvp-2026` branch has the same `vite.config.ts`.

**Reproduction (no real keys used):**
```bash
# main app (isolated worktree of recovery branch @3992d8d)
npm ci --legacy-peer-deps            # plain `npm ci` fails ERESOLVE (react 19 vs @testing-library/react 13) — Codex scope
CI=false GENERATE_SOURCEMAP=false \
  REACT_APP_OPENAI_API_KEY=CANARY_OPENAI_NOT_A_SECRET \
  REACT_APP_AI_PROXY_TOKEN=CANARY_PROXYTOKEN_NOT_A_SECRET \
  npx react-scripts build              # exit 0
grep -rlo CANARY_OPENAI_NOT_A_SECRET build/     # -> build/static/js/main.<hash>.js
grep -rlo CANARY_PROXYTOKEN_NOT_A_SECRET build/ # -> build/static/js/main.<hash>.js
grep -rlo api.openai.com build/                 # -> build/static/js/main.<hash>.js

# Smart Playbook (isolated worktree of main @6b4c42c)
npm install && GEMINI_API_KEY=CANARY_GEMINI_NOT_A_SECRET npx vite build   # exit 0
grep -o CANARY_GEMINI_NOT_A_SECRET -r dist | wc -l   # -> 6 (dist/assets/index-<hash>.js)
```
**Status of real keys.** A full-history scan of both repos (all refs) found **no committed OpenAI, Gemini, Anthropic, or GitHub credential values** and no private keys. The only `sk-` match is a placeholder in old `src/utils/environmentValidator.*` (sequential digits; classified, not printed). The risk is therefore **build-time**: any deploy that had these variables set shipped the key to every visitor. [Owner-verify] see §4.

**Fix (Day 2):** delete the direct-provider path from the production graph; one Cloud Function (`onCall`, v2) holds provider keys in Secret Manager (`defineSecret`), verifies `request.auth`, checks team ownership in Firestore, validates/limits payload, enforces per-user rate and cost caps, and returns structured errors. Until that ships, AI features are disabled in the beta build (flag off, not merely hidden). Acceptance: the canary build above returns zero matches and zero `api.openai.com` / `generativelanguage.googleapis.com` references in `build/` and `dist/`.

### F-02 — No working authentication (Critical)

1. The only provider `App` mounts is `src/components/AuthProvider.tsx`, whose `signIn()` calls **`signInAnonymously`** (line 56). Any visitor holding the public web config can mint a Firebase ID token in one call, so every rule written as `request.auth != null` means "anyone on the internet."
2. `src/components/Dashboard.tsx:2` imports `useAuth` from a **different** context (`src/hooks/useAuth.tsx`) whose provider is never mounted. **[Reproduced]** a scratch test rendering `<ToastManager><AuthProvider>` (the App's provider) around a component calling `hooks/useAuth` throws `useAuth must be used within an AuthProvider` (`npx react-scripts test --watchAll=false`, 1 failed / 1 total; test file kept in a scratch worktree, not committed). This fails closed, so it is not a data leak, but there is no usable signed-in state.
3. The signed-out "Sign In" button is a stub: `showSuccess('Authentication coming soon!')` (`Dashboard.tsx` signed-out branch).
4. `auth-config.json` (`emailVerificationRequired: true`, password policy) is **not consumed** by Firebase or by any rule; nothing checks `request.auth.token.email_verified`. Sign-up is open (`disableSignUp: false`).
5. Anonymous sessions also break the MVP's "save/reopen across sessions" requirement: the UID is lost on sign-out or on another device, orphaning data.

This independently confirms Codex S08 and adds the anonymous-auth exposure, which escalates F-03.

**Fix:** one auth module (keep one provider + hook, delete the other); email-link or Google sign-in only; **disable anonymous auth in the beta project**; private-beta allowlist enforced server-side (custom claim `beta: true` set by an admin-only function, or a `betaUsers/{uid}` doc writable only by Admin SDK) and checked in every rule; require `email_verified`. Acceptance: emulator tests in §3 pass, including "anonymous user denied everywhere."

### F-03 — Storage cross-tenant read/write (High; Critical if anonymous auth is enabled)

`storage.rules:31-52`: `/teams/{teamId}/documents/**`, `/practice-plans/{planId}/attachments/**`, `/plays/{playId}/media/**` allow **read and write to any authenticated user** with no ownership check. `users/{uid}/profile/**` is readable by any authenticated user. Combined with F-02, any internet user can read and overwrite any team's files. `text/.*` uploads (including `text/html`) are allowed; impact is limited because objects are served from the Storage domain, not the app origin, but it should be narrowed. Concurs with Codex S04.

**Fix:** Storage rules call `firestore.get()` on `teams/$(teamId)` and require `ownerId == request.auth.uid` (plus beta claim); move plan/play media under `teams/{teamId}/…` so every path carries its tenant; enumerate allowed content types per path; deny overwrite by non-creator. If attachments are not in the MVP, deny all three paths outright for the beta.

### F-04 — `firestore.rules` is not valid rules syntax; deployed state unknown (High)

Every grant uses `allow …: if <expr> else error('permission-denied', '…')` (lines 19-75). The rules language has no `else` clause or `error()` function, so this file should fail to compile and cannot be what is currently deployed. The file has not changed since commit `84989a6` (2025-07-21). Whatever rules are live on the `coach-core-ai` project today are therefore **unknown and unreviewed**. Concurs with Codex S03.

Compiler confirmation was attempted and **blocked**: `firebase setup:emulators:firestore` (firebase-tools 14.27.0, OpenJDK 21) returned `403 … host "storage.googleapis.com"` from this environment's egress allowlist. This needs a CI runner (see §3) or a maintainer machine.

### F-05 — Tenant fields are mutable; no schema limits (High)

For `plays` and `practicePlans`, `allow update` checks only `isTeamOwner(resource.data.teamId)` (old document). An owner of team A can update their own play to `teamId: <team B>` and `createdBy: <anyone>`, injecting content into another tenant once team B's owner lists plays. `teams` update lets the owner rewrite `ownerId` (silent ownership transfer) and `memberIds`. No rule bounds field set, types, or document size. Concurs with Codex S05.

**Fix:** on update require `request.resource.data.teamId == resource.data.teamId`, `createdBy` unchanged, `ownerId` unchanged (transfers via admin function only), and `request.resource.data.keys().hasOnly([...])` with per-field type checks and string/array size caps.

### F-06 — Cloud Functions (High)

* `cleanupOldNotifications` (`functions/index.js:215`) is a public `onRequest` HTTP endpoint with no auth, method, or role check that batch-deletes documents with the Admin SDK (bypassing rules). It also breaks beyond 500 docs (single batch). Concurs with Codex S06. **Fix:** convert to `onSchedule`; do not deploy as HTTP.
* `trackUserActivity` (`index.js:184`) stores `request.ip`, user agent, and an **unvalidated, unbounded `data` object** for any signed-in (including anonymous) user: PII collection plus a cost/abuse vector. It throws plain `Error` instead of `HttpsError`. **Fix:** remove from the beta or whitelist event names and cap payload; drop IP unless there is a stated purpose and retention policy.
* `healthCheck` is public (acceptable) but reads Firestore on every hit; rate-limit or make it static.
* `onPlayCreated` / `onPracticePlanCreated` trust client-supplied `teamId`/`createdBy`; safe only after F-04/F-05 are fixed.
* `maxInstances: 10`, `timeoutSeconds: 540` globally; lower the timeout for request handlers.

### F-07 — Firebase web API keys in git; Gemini exposure path (Medium) [Reproduced + Owner-verify]

`gitleaks` 8.21.2 over **all refs** (`gitleaks git --log-opts=--all --redact`): 24 findings, all `gcp-api-key`/`generic-api-key`. A fingerprinting pass (SHA-256 prefixes only; values never printed) resolves them to **2 distinct `AIza…` keys**, both for Firebase project `coach-core-ai`: key `764e6a8f20` in 22 places (e.g. `deploy-production.sh`, `package.json` deploy script, `public/waitlist.html`, Lighthouse logs, test scripts on old branches) and still present (commented) in the current tree at `.env.local.example`; key `d337ab8d5d` in `test-google-auth*.html`.

Firebase web keys are designed to be public, but they become a **Gemini credential** if the Generative Language API is enabled on the same GCP project and the key is not API-restricted. This is the only plausible Gemini exposure path in the main repo. Smart Playbook history: 0 findings.

**Fix:** [Owner-verify] restrict both keys (HTTP referrers + API allowlist: Identity Toolkit, Token Service, Firestore, Storage, Installations only); rotate `d337ab8d5d` if it is unused; remove the value from `.env.local.example`. History rewrite is **not** recommended (public-by-design key; restriction is the control).

### F-08 — Rules contradict the team model; join code is a bearer secret (Medium)

`TeamContext.tsx` lists teams with `where('memberIds','array-contains',uid)` (line 285), checks code uniqueness with `where('code','==',code)` (line 91), and joins by updating another owner's team (line 154). Owner-only rules that depend on `get()` of the queried document cannot authorize these queries, so team creation and join fail under any correct owner-only rules. **Risk:** the obvious "fix" is opening `teams` reads, which would expose every team. The join code is 6 chars from 36 symbols via `Math.random()` (~2.2×10⁹ space, not cryptographic). As the sole admission control behind open sign-up, it is guessable at scale.

**Fix (MVP):** single-owner teams only (matches the must-have list); list with `where('ownerId','==',uid)`; uniqueness and joins move to a callable function or are deferred. No member role in beta.

### F-09 — Youth player data to third-party AI from the browser (Medium)

`ai-service.ts` builds prompts with team and player context and sends them from the client to the provider. With minors' data this needs server-side minimization (no names/contact/DOB, IDs only), provider data-retention settings, and a stated policy. This is not legal advice; COPPA/FERPA applicability depends on ages and customers and should be confirmed by counsel before real rosters are loaded. Beta guidance: synthetic or initials-only rosters.

### F-10 — Shared-device leakage (Medium)

Concurs with Codex S09/S11 (static): the offline queue key in `src/services/firestore.ts` is global, not per user/team, and is replayed under whoever is signed in next; `public/sw.js` caches `/api/*` GET responses (including `/api/ai`, `/api/teams`) without per-user partitioning or logout purge. Coaches commonly share school tablets. **Fix:** key queue and caches by `uid`, purge on sign-out, never cache authenticated API responses in the beta.

### F-11 — Dependency advisories (Medium)

`npm audit --omit=dev --legacy-peer-deps` (main, production deps only): 10 = 3 critical, 5 high, 2 moderate; high/critical packages: `@grpc/grpc-js`, `browserslist`, `nanoid`, `postcss`, `protobufjs`, `source-map-js`, `tar`, `websocket-driver`. `functions/` (from lockfile): 23 = 5 critical, 6 high. Codex's S07 count (107) includes dev tooling; both views are valid. Most main-app hits are build-time transitive deps of `react-scripts` and are not shipped; `protobufjs`/`@grpc/grpc-js` under `firebase` and everything in `functions/` are runtime. Triage owner: Codex (dependency/build scope); security review of the upgrade PR: Claude.

### F-12 — No security headers (Low)

`firebase.json` hosting, `netlify.toml`, and `public/_headers` set only caching headers. Add `Content-Security-Policy` (start in report-only), `frame-ancestors 'none'` / `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Content-Type-Options: nosniff`. `X-Robots-Tag: all` should become `noindex` for a private beta.

### F-13 — Hygiene that will reintroduce F-01 (Low)

* 24+ remote branches (including `origin/main`, distinct from default `master`) wire `VITE_OPENAI_API_KEY`, `REACT_APP_OPENAI_API_KEY`, `REACT_APP_CLAUDE_API_KEY`, or `VITE_CLAUDE_API_KEY` into client code. Any selective merge from these branches must be reviewed for this pattern.
* `src/components/SmartPlaybook/src/services/firebase.ts` uses `import.meta.env` inside a CRA build and initializes a second Firebase app; it is not imported by the main graph today. Keep it unreachable.
* `.env.local.example` uses `NEXT_PUBLIC_*` names while CRA reads `REACT_APP_*` (Codex S14).
* `FirebaseTest` view is reachable via `currentView='test'`; remove it from production builds.

---

## 2. Concordance with Codex `outputs/SECURITY_FINDINGS.md` (branch `codex/issue-38-tests-audit`)

The audit was done before reading Codex's report, then cross-checked.

| Codex | This audit | Position |
|---|---|---|
| S01 Gemini in client | F-01 | **Agree. Upgraded from source-verified to bundle-verified** (canary ×6 in `dist`) |
| S02 OpenAI / proxy token in client | F-01 | **Agree. Bundle-verified** (both canaries + `api.openai.com` in `main.*.js`) |
| S03 Invalid rules syntax | F-04 | Agree; compile still blocked here too |
| S04 Storage cross-tenant | F-03 | Agree; **escalated** by anonymous auth (F-02) |
| S05 Mutable tenant fields / model mismatch | F-05, F-08 | Agree; adds join-code bearer-secret analysis |
| S06 Unauthed cleanup function | F-06 | Agree; adds `trackUserActivity` PII/unbounded payload |
| S07 Dependency advisories | F-11 | Agree; gives production-only counts |
| S08 Dual auth contexts | F-02 | Agree; **independently reproduced**; adds anonymous-only sign-in |
| S09 Offline queue | F-10 | Agree (static) |
| S10 Standalone local storage | — | Not reviewed (Playbook scope) |
| S11 Service worker cache | F-10 | Agree (static) |
| S12 No AI endpoint | F-01 | Agree |
| S13 Drag undo / export | — | Out of scope (Codex) |
| S14 Example env key | F-07 | Agree; **adds full-history scan** (2 keys, 22 occurrences) and the Gemini-via-key path |
| S15 External resources / CSP | F-12 | Agree; extends to main hosting configs |
| — | F-09 | New: youth data to AI providers |

Codex's report states that full git history, entropy scanning, and deployed bundles were not audited; full git history and canary bundles are now covered here. Deployed bundles and remote CI secrets remain [Owner-verify].

---

## 3. Minimum secure beta architecture and required negative tests

**Architecture (proposed, not deployed):** Firebase Hosting on the **staging** project `coach-core-mvp-staging-239` only → React app with one auth module (Google or email-link; anonymous disabled; beta allowlist claim) → Firestore with owner-only tenancy (`teams.ownerId`; `plays`/`practicePlans` carry immutable `teamId`) → Storage paths under `teams/{teamId}/…` checked against Firestore → one `onCall` AI function holding keys in Secret Manager with per-user quotas (or AI disabled). No HTTP admin functions. App Check (reCAPTCHA Enterprise) on Firestore, Storage, and Functions once the flow works. Security headers per F-12. Production project `coach-core-ai` untouched.

**Emulator test matrix (must pass before Day 6 deploy; run against `demo-*` project ID so no real project can be hit):**

| # | Actor | Action | Expected |
|---|---|---|---|
| T1 | unauthenticated | read/write any collection or storage path | deny |
| T2 | anonymous user | read/write any collection or storage path | deny |
| T3 | signed-in, no beta claim | create team | deny |
| T4 | owner A | CRUD own team, plays, plans | allow |
| T5 | owner B | get/list/update/delete A's team, plays, plans | deny |
| T6 | owner A | update own play with `teamId` = B's team | deny |
| T7 | owner A | change `createdBy` / `ownerId` | deny |
| T8 | owner A | list `plays` without `teamId` filter | deny |
| T9 | owner B | read/write `teams/A/…` storage objects | deny |
| T10 | owner A | upload disallowed content type / >limit size | deny |
| T11 | any | write fields outside the allowlist / oversized strings | deny |
| T12 | any client | write `userProfiles`, `notifications`, `analytics`, `betaUsers` | deny |
| T13 | unauthenticated | call AI function | `unauthenticated` |
| T14 | owner B | call AI function referencing A's team | `permission-denied` |
| T15 | build | canary grep of `build/` and `dist/` for key canaries and provider hosts | 0 matches |

Because this sandbox cannot download the emulator, the Day 2 PR should add a GitHub Actions workflow (`firebase emulators:exec --project demo-coach-core …` with `@firebase/rules-unit-testing`) so results are reproducible by everyone.

---

## 4. Owner actions (human only; agents must not perform)

1. **Hosting env vars:** check Netlify site settings and any Firebase/CI build env for `REACT_APP_OPENAI_API_KEY`, `REACT_APP_AI_PROXY_TOKEN`, `GEMINI_API_KEY`, `VITE_*_API_KEY`. If any was ever set for a deployed build, **rotate it at the provider now** and delete the variable.
2. **GCP API keys (project `coach-core-ai`):** apply API + referrer restrictions to both Firebase web keys; confirm whether the Generative Language API is enabled; if yes and a key is unrestricted, treat it as an exposed Gemini key.
3. **Firebase console (read-only look):** which sign-in providers are enabled (is Anonymous on?); the currently deployed Firestore and Storage rules; whether `cleanupOldNotifications` is deployed. Post answers in issue #39 (no key values).
4. **CI:** approve adding an emulator-test GitHub Actions workflow on the security branch.

---

## 5. Proposed Day 2 file ownership (needs Codex agreement in #39 before any edit)

Claude (security branch): `firestore.rules`, `storage.rules`, `functions/index.js` (+ new AI function), new `tests/rules/**`, new `.github/workflows/security-rules.yml`, hosting header config (`firebase.json` headers block only).
Shared, sequence via issue: `src/components/AuthProvider.tsx`, `src/hooks/useAuth.tsx`, `src/components/Dashboard.tsx` (auth unification), `src/ai-brain/AIContext.tsx`, `src/services/ai-service.ts`, `src/services/ai-proxy.ts` (remove direct path). Codex has tests touching AI services; Claude will not edit these until Codex confirms.
Codex: dependency upgrades (F-11), offline queue/SW (F-10) unless reassigned, all Playbook files.

---

## 6. Commands and tool versions

```
git clone (full history) coach-core-ai; checkout recovery/coach-core-mvp-2026 @3992d8d   # 166 commits across all refs
git clone (full history) Coach-Core-Smart-Playbook-; main @6b4c42c                        # 5 commits
gitleaks 8.21.2: gitleaks git --log-opts="--all" --redact -f json .   # main: 24 findings (2 distinct GCP web keys); playbook: 0
gitleaks dir --redact .                                               # main working tree: 1 (.env.local.example)
custom fingerprint scan (AIza / sk- / sk-ant- / ghp_ / private keys) over `git log --all -p`; SHA-256 prefixes only
node v22.22.0, npm 10.9.4, firebase-tools 14.27.0, OpenJDK 21.0.12
firebase setup:emulators:firestore|storage   -> 403 storage.googleapis.com (egress allowlist)  [BLOCKED]
npm ci --legacy-peer-deps && react-scripts build with canaries      -> exit 0, canaries found in main.<hash>.js
npm install && vite build with GEMINI canary                         -> exit 0, canary ×6 in dist
react-scripts test (scratch-only auth wiring test)                   -> 1 failed / 1 total: "useAuth must be used within an AuthProvider"
npm audit --omit=dev --legacy-peer-deps (main) / npm audit --omit=dev (functions)
```
No secret values appear in this document, in commits, or in logs. All builds ran in throwaway git worktrees; nothing was written to either repository except this branch's documentation.
