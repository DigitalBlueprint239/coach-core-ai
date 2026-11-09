# Coach Core AI — AI Provider Architecture Decision (ADR-001)
**Decision date:** 2026-10-13
**Status:** APPROVED PRODUCT DIRECTION; NOT IMPLEMENTED; PRIVATE MVP REMAINS NO-GO.
**Decision-maker:** Founder direction as stated in project chat: brand-new OpenAI and Claude/Anthropic provider APIs only; NO reuse of previous AI provider keys, AI proxy credentials, or Gemini integration.
**Canonical references:** `AGENTS.md`, `CLAUDE.md`, `docs/COACH_CORE_SHARED_CONTEXT.md`, `docs/MVP_7_DAY_SPRINT.md`, security PR #42/Issue #39, implementation coordination Issue #43.

## Product behavior
- Main Coach Core application has ONE backend AI gateway with **two distinct adapters**, OpenAI and Anthropic.
- **OpenAI default** for assistant, age-appropriate drill suggestions, and editable practice plan generation.
- **Claude optional** for more complex game-plan reviews, coverage analysis, practice critiques, and explicit coach selection; these role suggestions are product defaults, not hard-coded assertions of quality.
- Do not automatically call *both* models for every request; that doubles request costs and latency. Coach or server can choose provider from an allowlist according to feature and admin settings; display which model/provider generated output. No silent fallback that hides a failed request or makes a second billable call without configured policy.
- The app uses the same versioned input/output schemas for both adapters (validated request type, normalized structured response, error semantics). Provider-specific model IDs are **server configuration** and must be validated against accounts/docs before use.
- **No Gemini feature path** ships in the MVP. Isolate/archive old Gemini adapters from the production dependency graph; do not delete their original historical code prematurely. No Legacy `REACT_APP_OPENAI_API_KEY`, `REACT_APP_AI_PROXY_TOKEN`, `VITE_*` AI keys, `GEMINI_API_KEY`, or hardcoded secrets used in the web bundle or client. These values must never be imported into React/Vite code.

## Fresh credentials and account responsibility
- Founders create a *new* OpenAI API project and a *new* Anthropic API workspace/project (or equivalent) with separate fresh scoped API keys. ChatGPT or Claude subscriptions **do not** by themselves constitute API billing; provider setup may be separately billable.
- Keys are created by an authorized human in the provider console, and are never pasted into ChatGPT, Claude Code conversations, GitHub issues, source, terminal output, or screenshots.
- Store **only** in Google Cloud Secret Manager of the chosen isolated Firebase staging project, with exact secret identifiers `COACH_CORE_OPENAI_API_KEY` and `COACH_CORE_ANTHROPIC_API_KEY`. Use Firebase v2 `defineSecret()` (or equivalent current supported binding), bind least privilege to approved functions. Separate staging and production secrets and identities when production exists.
- **Do not reuse or read old AI keys.** Older provider credentials that might have been shipped in a prior live client build require owner-led revocation/rotation (after identifying deployed use); never assume deleting from repo revokes them. Existing Firebase **web** API key/configuration is a different, public identifier used to initialize Firebase; inspect API restrictions and use staging credentials where appropriate. Do not indiscriminately delete Firebase web config or disable active services.

## Server boundary and security (MVP gating)
- Single authenticated Firebase v2 callable function or protected server endpoint, e.g. `coachAI`, routes `provider=openai|anthropic` and `task=practice_plan|drills|play_review|game_plan|coach_chat` through server-side adapters.
- Verify Firebase Authentication and email verification / beta allowlist; enforce team ownership/authorization on every request. Reject anonymous and foreign-team requests.
- Validate input schemas, cap payload sizes, output tokens and request rate, handle timeouts, retries, quotas and provider errors. Set per-user/per-team caps and spending alerts per provider. Default to fail closed with clear message. Do not trust client-supplied cost/identity/model settings.
- Use limited, age-appropriate football context. Avoid sending player names, DOBs, contact details or other identifying youth data to either provider in MVP. Prefer synthetic roster data; document provider data policies before processing real minors' information.
- Prevent provider API key exposure via environment injection, source map, logging, error messages or browser bundle. Add CI tests with canary secrets and production build greps for canaries and provider SDKs/endpoints.
- No public AI endpoint or hardcoded shared browser proxy token. Staging should stay access-restricted and on private beta until rules/auth gates pass.

## Recommended initial tasks and owners
- **Codex:** after current Issue #41 Playbook repair, propose an interface and client caller for one backend gateway, remove Gemini direct calls from SHIPPED client graph, add provider-agnostic mocks and acceptance tests. Do not touch shared auth/AI frontend files until explicit file ownership is agreed on Issue #39.
- **Claude:** leads security architecture and backend implementation proposal for `functions/`, auth/Firestore/Storage rules, secure Secret Manager bindings, and emulator/negative tests on Issue #43; owns rule/function files after file ownership coordination. Do not deploy or touch real secrets until authorized.
- **Founder:** create fresh provider accounts/keys later and place keys only using controlled Secret Manager workflow after reviewed code passes with mocks. Approve test-only Firebase project permissions and any billable changes. Never send secrets in GitHub.
- **Integration reviewer:** validate both providers through mock tests, then credentialed staging smoke tests, and audit cost/usage telemetry. Keep main `master` unchanged until deliberate release approval.

## Acceptance gates
1. OpenAI and Anthropic adapters built with current server SDKs/APIs and mocked integration tests.
2. Both can produce valid, editable practice/game-plan data in staging (only after owner establishes fresh secrets).
3. Canary scans of bundled JS show ZERO provider secrets/token values; no Gemini or direct provider calls from browser in release graph.
4. Unauthorized, anonymous, and cross-tenant function requests DENIED by tests.
5. Rate limits, spending monitors, sanitized logs, error behavior, and privacy minimization verified.
6. No deployment without explicit owner approval; defer provider features if keys unavailable and DO NOT fake success.
7. Source consolidated to one canonical repository and hosting path *after* selective Playbook integration is validated.

## External documentation
- OpenAI production practices: https://developers.openai.com/api/docs/guides/production-best-practices
- OpenAI API dashboard: https://platform.openai.com/
- Claude API console: https://platform.claude.com/
- Firebase Secret Manager: https://firebase.google.com/docs/functions/config-env
