# Coach Core AI — Firebase staging isolation runbook (2026-11-06)

**State:** Repository-side isolation prepared. No Firebase staging project, IAM, Google Cloud billing, GitHub environment variables, or cloud deployment has been provisioned by this PR. Do not call staging isolated until the activation checks below pass.

## Why this exists
The legacy "staging" Hosting target and PR previews belonged to Firebase project `coach-core-ai` and could use its production Auth, Firestore and Storage data. A second Hosting site does **not** create a separate backend. Firebase recommends distinct projects per environment.

## Target topology
- Production: Firebase project `coach-core-ai`; `firebase.json` has only the `production` Hosting target. Production workflow remains explicitly owner-approved.
- Staging: **new Firebase project, not yet created** (suggested project ID `coach-core-ai-staging-env`, subject to availability). Its *default Hosting site* runs the staging build; database, Storage, Authentication and Functions are separate.
- PR previews: preview Hosting channels **inside the staging project**; never production. Preview Auth authorized-domain settings need separate verification. Preview URLs are not secrets or access controls.
- Emulators: offline `demo-*` projects for rules and local integration testing. Never point tests at live production.
- No client-side data or student media is copied from production.

## What the repository now enforces
1. `.firebaserc` has no `default` alias and no legacy staging target in production. The production target remains mapped to the production site.
2. `firebase.json` declares only production Hosting. `firebase.staging.template.json` is a separate Hosting-only template.
3. `scripts/assert-firebase-deploy-env.mjs` checks required web config, the exact environment, production vs staging project identity, same-project Auth domain and default Storage bucket, and (for staging) staging-only Workload Identity Federation identity. Empty values and mismatches fail BEFORE cloud authentication.
4. `scripts/prepare-staging-hosting-config.mjs` generates a Hosting-only staging configuration without functions, Firestore, or Storage rules targets; it adds noindex headers.
5. The staging and PR workflows use the GitHub `firebase-staging` environment, separate variable names and short-lived OIDC credentials; they pass `--project "$STAGING_FIREBASE_PROJECT_ID"` and deploy Hosting only.
6. `src/firebase.ts` refuses to initialize a staging/preview build with the production project and rejects reuse of a previously initialized app from a different project.
7. The production workflow has an explicit destination check. No workflow in this PR deploys Firestore rules, Storage rules or Functions.

**Important:** these are defense-in-depth checks, not proof that a staging project exists, and not protection against a person with production IAM deliberately bypassing the workflow. Restrict IAM and GitHub write/approval privileges separately.

## Activation: owner-authorized console/setup steps
1. In Firebase Console create a **new** project, with no imported real users or data. Record its actual immutable project ID. Use a separate billing budget/alerts and confirm Firestore region, data residency, enabled APIs, Storage bucket availability, and operational cost. Do not assume a suggested ID is available.
2. Register a **new Firebase Web App** in the staging project and record the Firebase web config. Enable only required staging Auth providers (Email/Password, Google if genuinely used), stage-only OAuth credentials/domains if needed, and configure authorized domains. Do not reuse production client OAuth secrets, API keys tied to sensitive external services, payment credentials, or callbacks.
3. Provision separate Firestore, Storage and any required Functions in the staging project. Set initially restrictive/default-deny client rules before allowing any test data. Where the new Storage rules use `firestore.get()`, plan the **staging-only** cross-service IAM authorization after reviewing required permissions. Test rules in emulators before staging deployment.
4. Create a staging-only Google Cloud service account **inside the staging project** for Hosting deployments. Give it only the permissions required for Firebase Hosting, plus documented API-viewing permissions if CLI requires them; do not give production IAM or broad Owner/Editor roles. Consider Firebase Authentication Admin only if preview-domain authorization really requires it and the scope is reviewed.
5. Configure Google Cloud Workload Identity Federation (OIDC issuer `https://token.actions.githubusercontent.com/`). Restrict the provider to GitHub repository ID `1018633922`, repository `DigitalBlueprint239/coach-core-ai`, and the `firebase-staging` GitHub environment. Bind only that principal to impersonate the staging deployment service account. Use a dedicated provider or tightly scoped configuration; **no exported JSON service account keys**.
6. GitHub → repository Settings → Environments → create `firebase-staging`. Configure reviewer/branch protection as appropriate for staging access. Add **environment-scoped variables** with exactly these names:

| Variable | Source |
|---|---|
| `STAGING_FIREBASE_PROJECT_ID` | Immutable newly created staging Firebase project ID |
| `STAGING_FIREBASE_API_KEY` | Firebase staging Web App config |
| `STAGING_FIREBASE_AUTH_DOMAIN` | `<staging-id>.firebaseapp.com` |
| `STAGING_FIREBASE_STORAGE_BUCKET` | Staging default bucket (commonly `<staging-id>.firebasestorage.app`) |
| `STAGING_FIREBASE_MESSAGING_SENDER_ID` | Firebase staging Web App config |
| `STAGING_FIREBASE_APP_ID` | Firebase staging Web App config |
| `STAGING_FIREBASE_MEASUREMENT_ID` | Optional staging analytics measurement ID |
| `STAGING_WIF_PROVIDER` | Full Workload Identity Provider resource identifier |
| `STAGING_DEPLOY_SERVICE_ACCOUNT` | Staging-only service account email |

   Keep existing production variables/secrets separate under GitHub's `production` environment. Review global repository variables for legacy production bindings. The new staging workflow uses only `STAGING_*` variables and never production secret names.

7. Check staging Hosting's default site exists, the domain is authorized for Firebase Auth, and there are no outbound production calls. Check external endpoints, Sentry, AI provider endpoints, email, OAuth, webhooks, analytics, payment processors, and any server-side Admin SDK credentials. Stage-only payment/email behavior should be sandboxed or disabled.
8. Review GitHub OIDC subject and provider IAM policy: GitHub environment `firebase-staging` jobs must be able to impersonate **only the staging** service account. Confirm that this service account has **zero** permissions in production.
9. Merge the isolation PR only after a reviewer verifies the new environment settings. Until then, legacy workflows on the recovery branch can still publish preview Hosting to the production Firebase project; stop using those legacy previews in the meantime. After merge, a staging workflow with missing settings must fail closed; this is expected.
10. Deploy **Hosting only** to the new staging project, first using explicit project ID and staging credentials. Confirm the Hosting release lives under the staging project; verify that a staging browser session talks only to staging Auth, Firestore and Storage. **Do not run full integration tests until this smoke/identity check has passed.**

## Static preflight (no cloud requests)
The staging and preview workflows run `node scripts/assert-firebase-deploy-env.mjs staging` or `preview` before creating any cloud credential. Staging production project IDs and mismatched Auth domains or buckets are refused.
`node scripts/prepare-staging-hosting-config.mjs` creates a generated file used only for `--only hosting` deployments.
For a dry run, use dummy matching staging configuration in a disposable shell; **never** use production credentials to test staging.

## Activation evidence / go-no-go
Require screenshots or authorized audit logs (no tokens or secrets) for:
- Distinct production and staging Google Cloud/Firebase project IDs; verified staging owner.
- Staging Auth users, Firestore database, Storage bucket and Hosting site under the staging project ID.
- GitHub `firebase-staging` variables and environment reviewers/branch restrictions configured.
- WIF claims / staging-only service account policies, and no production IAM binding.
- CI preflight passes; deliberate staging→production misconfiguration fails.
- Hosting is deployed only in staging project; bundle's project ID, Auth domain and bucket match staging.
- Production Hosting release and deployed rules hash unchanged; rollback path documented.
- Separate, pending security-release approvals for Firestore and Storage rules (#122 and #123).

**Do not mark environment isolation complete merely because a Hosting preview URL loads.**

## Official sources
- https://firebase.google.com/docs/projects/dev-workflows/overview-environments
- https://firebase.google.com/docs/projects/dev-workflows/general-best-practices
- https://firebase.google.com/docs/projects/multiprojects
- https://firebase.google.com/docs/hosting/github-integration
- https://firebase.google.com/docs/cli
- https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- https://github.com/google-github-actions/auth
