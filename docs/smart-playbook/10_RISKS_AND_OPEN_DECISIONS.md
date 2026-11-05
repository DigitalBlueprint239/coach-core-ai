# 10 — Risks and Open Decisions

## Decided by owner (2026-11-03)

- **RD-01:** Verified = 3 independent reliable sources + qualified expert review; governing rule books are primary
  authority for their rules; coach review never substitutes for sources; private coach plays need no citations.
- **RD-02:** ADR-001/002 approved in principle with data-safety safeguards.
- **RD-03:** prepare acquisition and advisory-group proposal; **no spending** without separate authorization.
- **RD-07:** React Three Fiber + three.js primary; Babylon.js fallback only on measured need.
- Product decisions 1-6 recorded in 01.

## Open decisions (owner)

| ID | Decision | Options | Recommendation |
|---|---|---|---|
| RD-03b | Spend approval for the acquisition/advisory proposal (07 sections 3 and 6) | approve items | rule books + 3 reviewers first |
| RD-04 | Beta scope: Smart Playbook-only vs Film required (per #104 Film is MVP scope) | owners decide | — |
| RD-05 | Separate staging Firebase project (staging currently shares prod data) | now / later | before player accounts (Phase 4) |
| RD-06 | Youth privacy: COPPA/parental consent, retention for player accounts under 13 | policy | legal review before Phase 4 |
| RD-08 | Retire v1 Smart Playbook in production after v2 parity | when | after T-111 |
| RD-10 | AI provider for the Smart Playbook advisor (gateway supports OpenAI and Anthropic adapters per 2026-10-13 decision) | OpenAI / Anthropic / both | decide before M5 |
| RD-09 | Who may publish Verified content: owner only / owner + named reviewers | — | owner + named reviewers recorded per item |

## Risks

| ID | Risk | Likelihood/Impact | Mitigation |
|---|---|---|---|
| RK-01 | Verification bar starves the library (open-web sources thin for run game/youth) | High/High | Acquisition plan (07 §3); Expert-reviewed category; panel |
| RK-02 | Parity gaps (exports, player access, quizzes) delay adoption | High/High | Play card in Phase 1; Phase 4 workflow suite |
| RK-03 | Model v3 churn breaks saved plays | Med/High | schemaVersion, pure migrations, fixtures, never rewrite v1 |
| RK-04 | 3D perf on school hardware | Med/Med | budgets + adaptive quality; measured on low-end laptop already |
| RK-05 | 3D seen as parity (GoArmy Edge free) | High/Med | differentiate on football correctness; measure SP-D04 |
| RK-06 | AI accuracy/trust | Med/High | deterministic rules first; structured output; citations; approval |
| RK-07 | Two-lane conflicts on shared files | Med/Med | #104 contract (draft); small shared-file PRs; coordination channel to be confirmed (see note) |
| RK-08 | Credential leakage from reference repo patterns | Low/High | never deploy standalone; guard test on trunk |
| RK-09 | Licensing of 3D assets / coaching material | Med/High | licence register; original diagrams; cite-only |
| RK-10 | Staging shares prod data | Med/Med | RD-05 |
| RK-11 | Laptop limits local builds | High/Low | cloud sessions + CI |

## Unverified items carried from earlier inspections

- Standalone repo: depth of quiz-to-player workflow; whether AI recommendations assume tendencies (read pending).
- Football Play Card "auto-aligned defenses" claim (app store only).
- GoArmy Edge: current feature depth and adoption beyond listing/estimates.

## Security check (2026-11-03)

Standalone repo full-history scan: **no Google/Gemini key ever committed**; one OpenAI/Anthropic-pattern hit
(`d925c6c`) is a false positive (prose); committed `.env.production` files hold only feature flags ("NO secrets").
No rotation needed. The remaining risk is design-level: building that repo with a key set would inline it (ADR-000).

## Staging isolation (current state, 2026-11-03)

Staging (`coach-core-ai-staging`) is a second Hosting site in the **same** Firebase project as production: same
Auth users and Firestore data (the test team and one play from the 2026-11-02 walkthrough live there).
Plan (owner authorization needed to create a project, RD-05): create a separate staging project; staging and preview
builds use its web config (repo variables); rules deployed to both; meanwhile no migration or permission testing on
production data, only in the emulator.

## Coordination references (corrected 2026-11-03)

- **Issue #39** is the authentication and security review issue. Earlier versions of these documents cited it for
  Film and cross-lane reconciliation; that was wrong and is corrected. (Our K1-K5 report was posted there on
  2026-11-02 because PR #104 names #39 for cross-lane handoffs.)
- **Issue #50** is the Film MVP scope reference (Film Analyzer required).
- **PR #104** (draft, Drew's lane) proposes the shared engineering contract; it is not modified by this lane. Its use
  of #39 as the handoff channel conflicts with #39's security purpose; proposed resolution for the owners: a dedicated
  cross-lane coordination issue, with #39 left for security.

## Staging project plan (RD-05) — prepared, NOT executed; needs owner approval

1. **Create** Firebase project `coach-core-ai-stg` (owner clicks Create; Spark/no-cost plan unless the owner approves
   billing). Region matching production Firestore (`nam5`).
2. **Auth:** enable Google + Email/Password; password policy min 8 (enforced); authorized domains = the staging Hosting
   site and `localhost` only; reset-email sender "Coach Core (staging)".
3. **Firestore:** create database; deploy the repo `firestore.rules` (same file as production) with
   `firebase deploy --only firestore:rules --project coach-core-ai-stg`.
4. **Hosting:** create the staging site; move `.firebaserc` target `staging` to the new project.
5. **Variables:** add a GitHub environment `staging` holding the staging web config (`REACT_APP_FIREBASE_*`, public by
   design); `deploy-staging.yml` and preview builds read it; a new service account with Hosting Admin on the staging
   project only (owner sets its secret; agents never handle key values).
6. **Smoke tests after first deploy:** sign up (email), sign in (Google), create a team, save a v2 play, save a v3 play,
   force a revision conflict, confirm production data is untouched.
7. **Rollback:** repoint the `staging` target back to `coach-core-ai` and redeploy; the new project can be deleted
   without affecting production.
Isolation result: separate Auth users, Firestore data, rules deploys and Hosting; production unaffected by staging tests.
