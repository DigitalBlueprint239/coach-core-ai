# Founder read-only checks (B6 / G2–G4) — exact steps, 2026-10-15

For Coach Drew. Every step below **reads** existing configuration and records what is there. **None of them changes a setting, enables billing, creates a key, or spends money.** Where a step would naturally lead to a change (for example "Enforce a hard limit"), the instruction is to stop at the screen and screenshot it. Authorising a change is a separate, later decision and is marked **[AUTHORISATION — not part of this check]**.

Never paste a key, token, password or secret value into chat, GitHub, or this repository. Evidence is a screenshot or a copied list **with any key values redacted**, saved outside the repo (your own drive) and referenced by name in the checklist.

Accounts involved: your Google account with Owner/Editor on Google Cloud project `coach-core-mvp-staging-239` (staging) and `coach-core-ai` (legacy); the Firebase console for the same projects; the Netlify account that hosts the legacy site; the OpenAI platform organisation that will own the staging project. Nothing here touches production users or data.

## G4 — PR #49 founder actions (Day 2 report §6, items 1–3), as read-only checks

| # | Check | Service / account | Exact read-only steps | Evidence to record | Unblocks |
|---|---|---|---|---|---|
| G4-1 | Old client-side secrets are not present in build settings | Netlify (legacy site); any CI/hosting build config | Netlify → Site → Site configuration → Environment variables. **Read** the variable *names* only. Note whether any of `REACT_APP_OPENAI_API_KEY`, `REACT_APP_AI_PROXY_TOKEN`, `GEMINI_API_KEY`, `VITE_*_API_KEY`, `REACT_APP_*` secret-like names exist. Do the same in GitHub → repo → Settings → Secrets and variables → Actions (names only) | List of variable **names** present (no values). "None present" is a valid result | Confirms the prebuild guard has nothing to fail on; closes G4-1. **[AUTHORISATION — not part of this check]:** deleting/rotating any key found |
| G4-2 | Firebase web API keys are restricted | Google Cloud console → `coach-core-ai` and `coach-core-mvp-staging-239` → APIs & Services → Credentials | For each key of type "API key" (browser): open it and **read** "Application restrictions" (expect *HTTP referrers*) and "API restrictions" (expect *Restrict key* with a list). Do not press Save | Screenshot per key showing both restriction panels. Record "Unrestricted" plainly if that is what it shows | Closes G4-2 if restricted; otherwise produces the exact gap. **[AUTHORISATION]:** changing restrictions |
| G4-3 | Generative Language API state on the legacy project | Google Cloud console → `coach-core-ai` → APIs & Services → Enabled APIs & services | **Read** whether "Generative Language API" is listed as enabled | Screenshot of the list (or search result) | Decides whether the legacy project still exposes an AI surface; information for the deploy decision only |
| G4-4 | Staging sign-in providers | Firebase console → `coach-core-mvp-staging-239` → Authentication → Sign-in method | **Read** the provider table: Email/Password with **Email link** on or off; Google on or off; **Anonymous must show Disabled** | Screenshot of the provider table | RA-01..RA-08 staging checks depend on Email-link + Google enabled and Anonymous disabled. **[AUTHORISATION]:** enabling or disabling a provider |
| G4-5 | Staging authorised domains | Same screen → Settings tab → Authorized domains | **Read** the domain list; note whether the staging Hosting domains (`coach-core-mvp-staging-239.web.app`, `.firebaseapp.com`, and any custom domain) are present | Screenshot of the list | RA-01/RA-07 (unauthorised-domain rejection) need the real list. **[AUTHORISATION]:** adding a domain |

## G3 — §4 spending controls, read-only verification

| # | Check | Service / account | Exact read-only steps | Evidence to record | Unblocks |
|---|---|---|---|---|---|
| G3-1 | Billing plan and billing link | Firebase console → `coach-core-mvp-staging-239` → Project settings → Usage and billing → Details & settings | **Read** the plan name (Spark or Blaze). Optional read-only CLI: `gcloud billing projects describe coach-core-mvp-staging-239` and read `billingEnabled` | Screenshot (plan) or the CLI line | D5 decision needs the current state. **[AUTHORISATION — not part of this check]:** upgrading to Blaze |
| G3-2 | Spend-cap availability | Same screen | **Read** whether a "Service-level spend caps" card is shown (only on Blaze). Do not create a cap | Screenshot: card present/absent | Confirms whether the $20 Functions cap in D5 is possible in this account |
| G3-3 | Budgets and alerts | Google Cloud console → Billing → Budgets & alerts (billing account linked to staging, if any). CLI: `gcloud billing budgets list --billing-account=<ID>` (read-only) | **Read** the list of budgets and their thresholds | List or screenshot ("none" is valid) | D5 alerts at $25/$50/$100 are *notify-only*; this records whether any exist. **[AUTHORISATION]:** creating a budget |
| G3-4 | OpenAI hard-limit availability | platform.openai.com → the organisation → the staging project (create nothing) → Settings → Limits → Spend | **Read** whether "Enforce a hard limit" is offered. **Do not save.** If no staging project exists yet, record that; do not create one for this check | Screenshot of the Limits screen with the option visible | D5's $50 hard limit depends on this. **[AUTHORISATION]:** setting the limit; creating the project; creating a key |
| G3-5 | OpenAI model availability | Same project → Limits → Models (read) | **Read** whether the intended model id is available to the project | Screenshot | Sets `COACH_CORE_OPENAI_MODEL` later (deployer), not now |

## G2 — Founder decisions to record (no configuration involved)

| # | Decision | What to write down | Unblocks |
|---|---|---|---|
| G2-D5 | Billing for staging (Decision Packet D5) | Approve / defer Blaze on `coach-core-mvp-staging-239` **with** the controls listed in checklist §4–5, or defer. Recording "defer" is a complete answer | Everything that needs Functions/Storage/Secrets in staging: smoke plan, RA/SEC probes, device tests (queue C2, C3) |
| G2-D10 | Legacy device import (D10) | Confirm the ask-once behaviour already implemented, and decide R3 ("Not now" permanent) and R4 (`D10_APPROVED` constant) from queue B1/B2 | G11 final acceptance; B1, B2 |
| G2-D1–D7 | Film Analyzer decisions | Only if film is in the deploy. Otherwise record "film out of the MVP deploy" | Scope of the staging smoke plan |
| G10 | Shutdown switch | Approve build before film upload, or accept the exposure in writing | G10 |
| B11 | CI presentation | Choose between keeping red-but-bucketed runs or the split proposed in `CI_CHECKS_PROPOSAL_2026-10-15.md` | G5 presentation |
| C6 | Same-name variants | Whether "bulldogs" and "Bulldogs" count as the same team name for the confirmation | R7c test, if yes |

## What these checks do **not** do
- They do not upgrade billing, create budgets, caps, keys, projects or domains, enable providers, or rotate anything. Each of those is an authorisation step listed separately above and is still **not approved** by this document.
- They do not touch production Firebase resources or any coach's data.
- Agents cannot perform them: this workspace has no Google Cloud, Firebase console, Netlify or OpenAI access (Google APIs return 403 at the network proxy), which is why they are founder-only.

## Recording
Add one line per check to `STAGING_READINESS_CHECKLIST.md` §4 / G2–G4: date, result in plain words, evidence file name (your drive). Claude will then re-derive the release-gate queue from the recorded state.
