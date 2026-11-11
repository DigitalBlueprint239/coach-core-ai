# Production release governance — inspection record and approval batches (2026-11-10)

Read-only inspection of the Firebase, Google Cloud and GitHub settings behind Coach Core AI, the one change
made (the GitHub `production` environment), and the cloud changes that still need the owner's explicit yes.
Nothing in this document is authorised by being written down here.

## 1. What was inspected and what it showed

Read with the signed-in Firebase CLI, the GitHub API, and the Firebase / Google Cloud consoles in the owner's
browser. No resource was modified during inspection.

### Production project `coach-core-ai`

| Area | Finding |
|---|---|
| Plan | Spark (no billing account attached). |
| Firestore rules | Live rules were released 2 Nov 2026 and are byte-identical to commit `ad95e43`. They are **two commits behind** the recovery branch (`cd2bfcd`, `c71d11f`), so the v3 play-document rules are not live. |
| Storage | The console reports the bucket is inaccessible on the Spark plan. Live Storage rules could not be read. The app does not use Storage. |
| Authentication | Email/password, Google and **Anonymous** sign-in are enabled. Three accounts exist (one anonymous). Authorized domains: `localhost`, the two default project domains, and `coach-core-ai-staging.web.app`. |
| IAM | One human principal (the owner). Default compute and App Engine service accounts hold the legacy Editor role. |
| Service-account keys | Exactly one user-managed key in the project, on `github-preview-deploy` (created 31 Oct 2026). Its roles are Firebase Hosting Admin plus three viewer roles. It **can replace the live site** but cannot release rules or Functions. `github-action-1018633922` has no key and no role. |
| Hosting | Sites `coach-core-ai` (live channel last released 26 Sep 2025) and `coach-core-ai-staging` (released 4 Nov 2026, shares production data). |
| Preview channels | 13 remain on 10 Nov (17 on 9 Nov); the last expires 13 Nov. An expired channel URL returns 404; an unexpired one still returns 200. |
| Functions | 13 deployed. The six waitlist / e-mail functions are not on the recovery branch; their source is on the old `main` branch (`functions/index.js`, `functions/src/drip-campaign.js`). Several repo-defined functions show a warning state with no trigger in the console. |

### Candidate staging project `coach-core-mvp-staging-239`

| Area | Finding |
|---|---|
| Plan / billing | Spark, no billing account. |
| IAM | The owner and the default Admin SDK service agent only. |
| Service accounts / keys | One default service account, no keys. |
| Authentication | Email/password only. No users. |
| Firestore | Default database exists, empty, rules deny everything. |
| Functions / Storage | Cloud Functions API not enabled; no functions. |
| Hosting / apps | One site (`coach-core-mvp-staging-239`), one web app. |
| Not inspected | OAuth consent screen, API-key restrictions, activity log. Check these when provisioning. |

**Recommendation: reuse it.** It is empty, single-owner, keyless and already has the web app the staging
workflow needs. A new project would be configured identically and adds one more project to guard. Hosting,
Auth and Firestore run on Spark at no cost; workload identity federation needs no billing. The limit is that
Spark cannot run Functions, so a staged AI endpoint (Package 5) would need Blaze on staging later — a separate
decision.

### GitHub

| Area | Finding |
|---|---|
| Repo secrets | `FIREBASE_SERVICE_ACCOUNT_COACH_CORE_AI` (the Hosting key above) and `FIREBASE_TOKEN` (legacy CLI token, set 3 Mar 2026). Both are repository-wide. |
| `production` environment | **Created 10 Nov 2026.** Required reviewer: the owner; self-approval allowed (see section 2); deployments limited to `recovery/coach-core-mvp-2026`; no secrets or variables added. Creating it triggered no workflow. |
| `firebase-staging` environment | Exists, no protection, no variables. |
| Default branch | `master`, unprotected, public. Its only workflow is the model pipeline. |

## 2. Single-owner approval

The repository has one collaborator. With "prevent self-review" switched on, nobody could ever approve a
production run, so it is off: the owner starts a release and then approves it in a second, deliberate step.
That gives a recorded confirmation and blocks any workflow that is not waiting for approval; it does **not**
give separation of duties. Real separation needs a second trusted person with write access added as a
required reviewer, after which self-review should be prevented.

## 3. `FIREBASE_TOKEN` dependency report

The value was never read. References by name:

| Where | Status |
|---|---|
| Workflows on `recovery`, `master` and every open security branch | None. Enforced by `scripts/tests/release-governance.test.mjs`. |
| `origin/main`, `origin/release/mvp-deploy-202509170937`, `origin/feature/cline-integration`, `origin/feature/mcp-integration`, `origin/feature/phase-1-foundation` | `ci-cd.yml`, `deploy.yml`, `firebase-hosting-deploy.yml`, `marketing-automation.yml`. These run only if someone pushes to or dispatches those branches. |
| `origin/codex/windows-main-emulator-setup`, `origin/codex/windows-playbook-repair` | `tools/windows-main-demo/start.cjs` (local emulator helper). |
| Netlify | Not inspected (the Netlify connector is not signed in). The repo's `netlify.toml` contains no Firebase commands. |
| Scheduled automations | No scheduled workflow on `master` or `recovery` uses it. `marketing-automation.yml` on the old branches is not on the default branch, so its schedule does not run. |

A legacy CLI token acts with the full rights of the account that created it, which makes it the most
powerful credential in the repository. Removal plan: confirm Netlify does not hold a copy; delete the GitHub
secret; revoke the token itself with `firebase logout --token` from the owner's machine (deleting the secret
alone does not invalidate it); then run a staging deploy and a production dry-run to confirm nothing depended
on it.

The same discipline for the JSON key: it is referenced by `deploy-production.yml` only (enforced by test).
It is removed last, after a keyless production release has succeeded.

## 4. Approval batches

Each batch is a separate decision. Exact resources are restated before any action.

| Batch | Action | Expected result | Risk | Verification | Rollback |
|---|---|---|---|---|---|
| A | Provision keyless staging on `coach-core-mvp-staging-239`: workload identity pool + provider bound to this repository ID, owner ID, recovery ref and the `firebase-staging` environment; one Hosting-only service account; set the `STAGING_*` environment variables. | Pushes to recovery deploy to isolated staging. | Low: empty project. | Staging workflow run is green; site serves; app talks to the staging project only. | Delete the pool and service account; clear the variables. |
| B | Provision keyless production: pool + provider bound to the `production` environment; a Hosting-only release account; a separate rules-only account; set `PROD_WIF_PROVIDER`, `PROD_DEPLOY_SERVICE_ACCOUNT`, `PROD_RULES_SERVICE_ACCOUNT` on the `production` environment. | Production releases stop using a stored key. | Medium: production IAM change. | A release of the commit already live succeeds and the site is unchanged. | Clear the variables; the workflow falls back to the JSON key. |
| C | After B is verified: remove the legacy-key step, delete the `FIREBASE_SERVICE_ACCOUNT_COACH_CORE_AI` secret, delete the key on `github-preview-deploy`. | No stored production credential remains. | Medium. | Keyless release still works. | Create a new key (requires a new approval). |
| D | Delete the `FIREBASE_TOKEN` secret and revoke the token (section 3). | Legacy owner-level token gone. | Low once Netlify is checked. | Workflows unaffected. | None needed; a new token can be minted. |
| E | Release the recovery-branch Firestore rules to staging, then production, with `release-firebase-rules.yml`. | Live rules match the tested rules. | Medium: live rules change. | Emulator suite at the same commit; sign in and load a team on production. | Re-release commit `ad95e43`. |
| F | Remove `coach-core-ai-staging.web.app` from production authorized domains and disable that Hosting site, after batch A serves staging. | Legacy staging no longer fronts production data. | Low. | Site returns 404; production sign-in unaffected. | Re-enable the site, re-add the domain. |
| G | Decide on Anonymous sign-in in production. | Removes an unauthenticated path to `request.auth != null`. | Low; needs a check that no flow depends on it. | Sign-in still works. | Re-enable. |

Not proposed: any Functions deploy. The deployed waitlist and e-mail functions come from the old `main`
branch; deploying `functions/` from recovery would delete them.
