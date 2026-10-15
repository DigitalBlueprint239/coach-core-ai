# Coach Core AI — Day 2 Security Repairs & OpenAI Gateway

| | |
|---|---|
| Issues | #43 (security remediation), #46 (OpenAI-only AI architecture), #39 (ownership) |
| Author | Claude (security / backend owner) |
| Date | 2026-10-13 |
| Branch | `claude/day2-security-gateway` → `recovery/coach-core-mvp-2026` |
| Production touched | **No.** No deploy, no live Firebase change, no real key, no real user data. |

**Bottom line:** all four Day 1 blockers (F-01 to F-04) are fixed **in code and tested** with no real credentials. CI runs the rules tests in the real Firebase Emulator Suite, the gateway against a mocked OpenAI, and a canary build of the browser bundle. **Private beta remains NO-GO** until the founder actions in §6 are done, a staging deploy is approved, and the end-to-end coaching workflow passes (Days 3–7).

---

## 1. Definition of done (from the Day 2 brief)

| Requirement | Status | Evidence |
|---|---|---|
| Firebase rules compile and authorization tests pass | **PASS** | CI job *Firestore & Storage rules*: emulator, `demo-coach-core-beta`, 30 tests |
| Authentication works without anonymous access | **PASS (mocked Firebase SDK)** | `src/hooks/__tests__/useAuth.test.tsx` 13 tests; rules deny anonymous tokens even with forged claims |
| Cross-team data access is denied | **PASS** | Rules T5–T9 + Storage cross-team cases; gateway T14 |
| OpenAI credentials exclusively server-side | **PASS** | Secret bound only to `coachAI`; bundle scan 10/10; prebuild guard |
| OpenAI coaching endpoints pass mocked integration tests | **PASS** | 69 functions tests incl. real `openai` SDK against a local Responses API mock |
| No old AI credentials or Gemini integration required | **PASS (main app)** | No Gemini/Anthropic code or env in the main graph. Standalone Smart Playbook Gemini removal is Codex's #48 |
| No critical security issue in the MVP deployment path | **PASS in code; deploy path unverified** | Live project settings are [Owner-verify] (§6) |
| Submitted for review without touching production | **PASS** | PR to recovery branch only |

Real-browser sign-in with real Google/email-link accounts has **not** been tested yet; that needs an approved staging project (§6).

## 2. Files modified

**Rules & tests (Claude-owned):** `firestore.rules`, `storage.rules`, `tests/rules/{package.json,package-lock.json,helpers.mjs,firestore.rules.test.mjs,storage.rules.test.mjs}`.

**Cloud Functions (Claude-owned):** `functions/index.js`, `functions/package.json`, `functions/package-lock.json`, `functions/.eslintrc.js`, `functions/src/ai/{schemas,prompts,privacy,quota,gateway}.js`, `functions/src/ai/providers/{provider,openai}.js`, `functions/scripts/beta-access.js`, `functions/test/{fakes,gateway.test,openai-adapter.test,quota-privacy.test,index-wiring.test,beta-access.test}.js`.

**CI / build guard:** `.github/workflows/security-rules.yml`, `.github/scripts/{annotate-reporter.mjs,bundle-canary-scan.sh}`, `scripts/security/check-client-env.js`, `package.json` (one line: `prebuild`), `firebase.json` (hosting `headers` block only), `.env.local.example`.

**Shared frontend files (claimed on #39; no objection; Codex confirmed no auth/AI edits planned on #46):** `src/hooks/useAuth.tsx`, `src/components/AuthProvider.tsx`, `src/components/Dashboard.tsx`, `src/ai-brain/AIContext.tsx`, `src/services/ai-service.ts`, `src/services/ai-proxy.ts`, `src/App.tsx` (provider wiring), `public/sw.js`.

**Additional frontend files touched (not on any ownership list):** `src/contexts/TeamContext.tsx` (owner-only queries), `src/features/practice-planner/PracticePlanner.tsx` (age group/skill inputs + v1 result rendering).

**New:** `src/components/auth/AuthGate.tsx`, `src/services/coach-ai-client.ts`, `src/hooks/__tests__/useAuth.test.tsx`, `src/services/__tests__/coach-ai-client.test.tsx`, this document.

**Not touched:** `src/services/firestore.ts` (Codex: offline queue), any Smart Playbook file, `master`, any Firebase project.

## 3. Security issues — fixed and remaining

| ID | Fix | Remaining |
|---|---|---|
| F-01 AI keys in bundle | Single `coachAI` callable; OpenAI key from Secret Manager `COACH_CORE_OPENAI_API_KEY`; direct browser OpenAI path and shared proxy token removed; AIContext routes only through the gateway; **prebuild guard** blocks secret-like `REACT_APP_*` values from the environment **and** CRA `.env*` files (CRA inlines *every* `REACT_APP_*` value, not only those the code reads — found while testing) | Owner must confirm no AI key was ever set in a deployed build, and rotate it if one was (§6) |
| F-02 broken auth | One provider/hook; Google + email link; verified email; `beta` claim; `AuthGate` on all coaching UI; anonymous sessions ended; expired/revoked sessions handled; sign-out clears user-scoped storage and caches | Live-browser test on staging; App Check (recommended after first deploy) |
| F-03 Storage | Owner-only `teams/{teamId}/files/*` via Firestore lookup; png/jpeg/webp/pdf ≤5 MB; all legacy paths denied | First deploy needs the Storage→Firestore cross-service permission (owner approval) |
| F-04 invalid rules | Compilable, deny-by-default rules | Live rules unknown until owner checks/deploys |
| F-05 mutable tenant fields | `teamId`, `createdBy`, `createdAt`, `ownerId` immutable; field allowlists, types, sizes; membership edits denied; client team delete denied (prevents re-created-ID takeover of orphaned data) | Item-level validation of `routes`/`players`/`periods` (owner-only, low) |
| F-06 functions | Cleanup is scheduled, not public HTTP; analytics allowlisted, beta + verified only, no IP/UA/payload; health check static | **Deploy note:** delete the old HTTP `cleanupOldNotifications` before deploying (trigger type changes) |
| F-07 web keys | `.env.local.example` cleaned | Owner: restrict both web keys; check Generative Language API |
| F-08 team model | Owner-only listing; join-by-code disabled; crypto team codes | Server invite flow post-beta |
| F-09 youth data | No roster/name fields in the contract; server redacts emails, phones, links, handles, dates; prompts forbid asking for identities; `store: false`; hashed `safety_identifier`; UI privacy notice | Names typed into free text cannot be reliably detected; the UI notice is the control. Use synthetic rosters in beta |
| F-10 shared devices | SW never intercepts cross-origin or `/api/*`, exact-path static matching, cache version bump, `CLEAR_USER_CACHES` on sign-out | `localStorage['smartPlaybook_plays']` (Codex area) survives sign-out; recommend uid-namespaced keys (not cleared to avoid destroying local-only plays) |
| F-11 dependencies | `functions/` production advisories 23 → **0** | Main app 10 production advisories (Codex dependency triage); mostly build-time |
| F-12 headers | Firebase Hosting: nosniff, DENY framing, referrer, permissions, HSTS, COOP for popups, `noindex`, CSP **report-only** | Promote CSP to enforcing after a staging check; Netlify config untouched |

Rules trust the ID token's `beta` claim, so revoking beta stops Firestore/Storage access within about one hour (next token refresh); the script also revokes refresh tokens. The AI gateway reads the live user record and stops immediately.

## 4. Evidence (no real credentials anywhere)

All three CI jobs publish results as check annotations on the PR (Checks tab).

| Suite | Command | Result |
|---|---|---|
| Rules (emulator) | `npm --prefix tests/rules test` (firebase-tools 15.33.0, Java 21, `demo-coach-core-beta`) | **30 passed / 0 failed** |
| Functions gateway | `npm --prefix functions run lint && npm --prefix functions test` | **69 passed / 0 failed**, lint clean |
| Web auth + AI client | `CI=true npx react-scripts test --watchAll=false src/hooks/__tests__/useAuth.test.tsx src/services/__tests__/coach-ai-client.test.tsx src/App.test.tsx` | **21 passed** |
| Full web suite (local) | `CI=true npx react-scripts test --watchAll=false` | **360/360 tests pass**; `FieldMemo.test.js` still fails to load — pre-existing on the base branch, fixed by Codex in PR #40 |
| Typecheck (local) | `npx tsc --noEmit` | exit 0 |
| Bundle scan | `bash .github/scripts/bundle-canary-scan.sh` | **10 passed / 0 failed** on this branch; the same script on the recovery base: **4 failures** (source reads `REACT_APP_OPENAI_API_KEY`, no guard, `api.openai.com` in bundle, no gateway) |
| Secret scan | `gitleaks dir --redact .` | 0 findings in the working tree (was 1) |
| Mutation check | removed the team-ownership check, then the anonymous check, from `gateway.js` | 1 test failed each time, then restored |

Notable gateway tests: unauthenticated, anonymous, unverified, live beta claim removed, disabled, revoked, deleted account; kill switch; foreign/missing team (same reason); 12 contract violations (incl. client-supplied `model`/`provider`/`instructions`); quotas never reach the provider; per-task token caps; PII redaction; hashed safety id; seven provider error categories mapped without leaking messages or a canary key; output schema and bounds rejection; real SDK wire format (`store: false`, `max_output_tokens`, strict `json_schema`, `safety_identifier`, bearer header) against a local mock.

An independent reviewer agent (no access to my reasoning) reviewed the branch. It found no critical or high issues and 7 medium and 9 low issues. Fixed: M1, M3, M4, M5, M6 (UI notice), L1, L2, L3. Documented as remaining: M2 (Playbook local storage), M6 residual (free-text names), M7 (deploy note), L4–L9.

## 5. AI gateway contract `coach-ai.v1` (for Codex frontend integration)

Callable: `coachAI` (Functions v2, default region). Browser client: `src/services/coach-ai-client.ts` (`callCoachAI`, `coachAI.practicePlan|drillRecommendations|assistant`, `CoachAIError`, `AI_PRIVACY_NOTICE`).

Request: `{ schemaVersion: "coach-ai.v1", task, teamId, input }`. Unknown keys are rejected. The client cannot choose a provider, model, token limit or instructions.

| task | input | result |
|---|---|---|
| `practice_plan` | `ageGroup` (6U…ADULT), `durationMinutes` 30–180, `skillLevel`, `objectives` 1–5, `equipment` ≤15, `contactLevel` | title, warmup, periods→drills (setup, instructions, coachingPoints, equipment), cooldown, hydrationBreakMinutes, safetyConsiderations, notes |
| `drill_recommendations` | `skillFocus`, `ageGroup`, `availableMinutes` 5–90, `equipment`, `experienceLevel`, `count` 1–6 | drills[]: objective, duration, playersNeeded, setup, steps, coachingTips, progressions, safetyNotes |
| `coach_assistant` | `question` 3–1000, `context` {ageGroup, skillLevel, topic} | answer, keyPoints, suggestedNextSteps, limitations, safetyFlag, followUpQuestions |

Response: `{ schemaVersion, task, requestId, result, meta: { aiGenerated, provider, model, generatedAt, quota, warnings } }`. Errors are HttpsError codes with `details.reason`, e.g. `ai-disabled`, `beta-access-required`, `team-access-denied`, `invalid-input` (+`issues` paths), `quota-user_daily|user_burst|global_daily`, `ai-timeout`, `ai-busy`, `ai-declined`, `ai-invalid-output`, `ai-misconfigured`, `ai-unavailable`. Friendly messages are mapped in the client.

Server configuration (params): `COACH_CORE_AI_ENABLED` (default **false**), `COACH_CORE_OPENAI_MODEL` (default `gpt-6.1-sol` — **confirm access first**), `COACH_CORE_AI_USER_DAILY_LIMIT` 25, `COACH_CORE_AI_USER_PER_MINUTE` 5, `COACH_CORE_AI_GLOBAL_DAILY_LIMIT` 300, `COACH_CORE_ALLOWED_ORIGINS` (staging origins). Provider timeout 45 s with no SDK retries; function timeout 60 s; `maxInstances` 5.

The Smart Playbook drawing features do not depend on any AI call. Legacy AI features outside the beta (formation analysis, game plans, and so on) reject with `not-in-beta` instead of returning fabricated output.

**PR #47 (ADR-001) needs amending before merge:** one active provider (OpenAI), no Anthropic adapter or credential for the MVP, no coach-facing model selection. Gateway name `coachAI` and contract `coach-ai.v1` as above. Anthropic is deferred behind the provider-neutral interface (`functions/src/ai/providers/provider.js`).

## 6. Founder actions (human only, in this order)

1. **Old keys:** check Netlify and any CI or hosting build settings for `REACT_APP_OPENAI_API_KEY`, `REACT_APP_AI_PROXY_TOKEN`, `GEMINI_API_KEY`, `VITE_*_API_KEY` and `REACT_APP_*` secrets. Delete them. Rotate any key that was ever set for a deployed build. The new prebuild guard will now fail builds that still have them.
2. **Web keys:** in Google Cloud, restrict both Firebase web API keys (HTTP referrers + API allowlist). Confirm whether the Generative Language API is enabled on `coach-core-ai`.
3. **Staging project `coach-core-mvp-staging-239`:** enable Google and Email-link sign-in, and keep **Anonymous disabled**. Add the staging Hosting domains to *Authorized domains*. Upgrade to Blaze only if you approve the cost (Functions, Secret Manager and Cloud Scheduler require it).
4. **Fresh OpenAI key:** create a new OpenAI API project key with a spending limit. Store it only with `firebase functions:secrets:set COACH_CORE_OPENAI_API_KEY --project coach-core-mvp-staging-239` (it prompts; never paste it into chat or GitHub). Confirm the model ID you want and set `COACH_CORE_OPENAI_MODEL` in `functions/.env.coach-core-mvp-staging-239`.
5. **Deploy to staging only, when you approve:**
   - If an old HTTP `cleanupOldNotifications` exists there, run `firebase functions:delete cleanupOldNotifications --project coach-core-mvp-staging-239` first.
   - Then deploy rules, functions and hosting to staging, and accept the Storage→Firestore permission prompt.
6. **Beta allowlist:** after each coach signs in once, run `node functions/scripts/beta-access.js grant <email> --project coach-core-mvp-staging-239`. Use `revoke` to remove someone.
7. **Turn AI on for staging:** set `COACH_CORE_AI_ENABLED=true` for staging only, then run smoke tests (sign-in, cross-team denial, one call per AI task, quota message).

## 7. Sprint status after Day 2

Security gate: **code-level PASS, deployment-level BLOCKED** on §6. Next:
- **Founder:** §6 items 1–4.
- **Codex:** review the shared-file changes; frontend UX on top of `coach-ai-client.ts` (drill recommendations and assistant screens); uid-namespaced Playbook storage (M2); main-app dependency triage.
- **Claude, Day 3:** independent review of Codex's Playbook diffs and negative tests; staging smoke-test plan; App Check plan; promote CSP after the staging check.
