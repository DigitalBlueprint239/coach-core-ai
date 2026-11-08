# Coach Core AI — Firebase environment isolation and activation runbook

**Updated 2026-11-07. State: repository implementation proposed in draft PR #125. Cloud staging has NOT been provisioned or verified. No rules, IAM, production Hosting, billing, or Functions deployment is authorized by this document.**

## Verified repository facts / remaining unknowns

- Production Firebase project ID is `coach-core-ai`. The old `coach-core-ai-staging` Hosting site was in the **same** Firebase project. This is not backend isolation.
- Merged PR #126 disabled automatic legacy staging Hosting deployments and changed the required `preview` status to a harmless no-deployment job. It also suspended a legacy model-optimization Firestore write. It **did not** remove existing Hosting channels or rotate credentials.
- Old previews and the legacy staging site may remain reachable. An external, read-only audit reported 14 preview URLs still reachable; independently confirm exact channel IDs and expiration in Firebase Console before cleanup.
- Deployed Firebase rules, deployed Functions, active Storage download tokens, GitHub environment scopes, production IAM and cloud billing **cannot be certified from repository evidence**. Require authenticated, owner-authorized cloud inspection.
- Separate Firestore/Storage security proposals are in PR #123 and PR #122; neither is deployed by the Hosting workflow.

## Target topology and deliberate preview hold

1. **Production:** Firebase `coach-core-ai`, existing production live Hosting site and manually approved release workflow. Preserve access until the replacement credential process is verified.
2. **Staging:** completely distinct Firebase project ID (suggested `coach-core-ai-staging-env`, subject to availability) with its own Firebase Web App, Auth, Firestore, Storage, Hosting and any required Functions.
3. **PR previews:** **disabled** for cloud deployment, even after staging is created. Keep the required `preview` CI status job as a no-op. A separate proposal with PR trust boundaries and an independently scoped preview identity is necessary before enabling preview Hosting again. Public previews are not access controls.
4. **Local testing:** Firebase Emulator Suite under `demo-*` IDs, using synthetic data only. Do not connect local or cloud tests to production.

## Repository safeguards (proposed, not yet live)

- No `.firebaserc` default project; production Hosting is the only target in `firebase.json`.
- Separate `firebase.staging.template.json` generates Hosting-only `.firebase.staging.generated.json` (ignored by Git), including `noindex` headers.
- `scripts/assert-firebase-deploy-env.mjs` rejects missing/mismatched project, Auth, Storage, Web App, WIF, staging identity, or AI-disabled configuration. In GitHub Actions staging mode it also refuses unexpected numeric repository/owner IDs, events, or refs.
- `src/firebase.ts` rejects staging/preview builds that point to the production Firebase project and rejects reused Firebase app instances from a different project.
- `deploy-staging.yml` uses environment `firebase-staging`, GitHub OIDC and a staging-only service account; build and deploy must use the same staging project ID and explicit `--project`. It deploys **Hosting only**.
- `firebase-preview.yml` remains credential-free. `deploy-production.yml` retains the separately approved production path with an extra client-config destination check.
- Regression checks run with `node --test scripts/tests/firebase-isolation.test.mjs`. These are **static tests**; they do not prove cloud permissions.

## Cloud provisioning sequence — owner authorization required

### Gate A. Existing production containment

- Inspect current Hosting sites, 14 reported preview channels, live releases, token-bearing download links, deployed Firestore/Storage rules and Functions. Do not download or expose user data.
- Approve cleanup **by exact preview channel ID and site**; existing channels do not disappear just because GitHub workflow deploys stop. Independently review site traffic and dependencies before disabling `coach-core-ai-staging`.
- Inventory `FIREBASE_SERVICE_ACCOUNT_COACH_CORE_AI` secret **presence and scope** without reading its value, and the production deploy service-account IAM permissions.
- Identify all non-GitHub deploy paths, including legacy shell scripts and external providers such as Netlify.
- Do not revoke a production credential until a replacement path is verified. Protect the `production` GitHub environment with owner approval.

### Gate B. New Firebase staging project

- Create a **new** Firebase/GCP project (unless an existing candidate is independently proven isolated). Record immutable project ID and project number, region and billing budget alerts. Do not import production users, coach/student files, or private datasets.
- Register a separate Web App. Provision a default Hosting site, Firestore database, Storage bucket and only required Auth providers/authorized domains. Verify each one belongs to the staging project.
- Start with restrictive/default-deny Firestore and Storage rules. Staging deployment of the proposed owner-scoped Storage rules requires explicit IAM review for its cross-service `firestore.get()` calls.
- Use synthetic test accounts; disable or sandbox email, payment, analytics, OAuth callbacks, AI, webhooks and external endpoints that could reach production.

### Gate C. Staging-only WIF and IAM

- Create a dedicated staging Hosting deploy service account in the staging project. Grant **only** Hosting deployment permissions required by the reviewed CLI path. No production project IAM bindings.
- Create a WIF provider with issuer `https://token.actions.githubusercontent.com/`. Validate `aud`; map `google.subject=assertion.sub`. Add mappings for immutable IDs if using them in principal sets.
- **Mandatory** provider attribute condition (illustrative; verify actual claim names in a legitimate Actions OIDC token before granting IAM):

```text
assertion.repository_id == '1018633922' &&
assertion.repository_owner_id == '206572958' &&
assertion.repository == 'DigitalBlueprint239/coach-core-ai' &&
assertion.ref == 'refs/heads/recovery/coach-core-mvp-2026' &&
(assertion.event_name == 'push' || assertion.event_name == 'workflow_dispatch') &&
assertion.environment == 'firebase-staging' &&
assertion.workflow_ref == 'DigitalBlueprint239/coach-core-ai/.github/workflows/deploy-staging.yml@refs/heads/recovery/coach-core-mvp-2026'
```

- Grant `roles/iam.workloadIdentityUser` on **the staging service account alone** to the exact permitted GitHub OIDC subject (or an equally restricted principal set). Avoid project-wide generic `allAuthenticatedUsers`, unrestricted repo-name bindings, or long-lived JSON keys.
- GitHub repository Settings → Environments: create `firebase-staging`, protect it with the **recovery branch restriction**, and add an owner reviewer for high-risk initial activation. Confirm environment rules match the WIF provider conditions.

### Gate D. GitHub environment variables

Store these variables in the **`firebase-staging` environment**, not shared production repository variables:

| Variable | Description |
| --- | --- |
| `STAGING_FIREBASE_PROJECT_ID` | Actual new staging Firebase project ID |
| `STAGING_FIREBASE_API_KEY` | Staging Web App public API key |
| `STAGING_FIREBASE_AUTH_DOMAIN` | `<staging-id>.firebaseapp.com` |
| `STAGING_FIREBASE_STORAGE_BUCKET` | Staging default bucket from Firebase Console |
| `STAGING_FIREBASE_MESSAGING_SENDER_ID` | Staging Web App messaging sender ID |
| `STAGING_FIREBASE_APP_ID` | Staging Web App ID |
| `STAGING_FIREBASE_MEASUREMENT_ID` | Optional staging analytics ID |
| `STAGING_WIF_PROVIDER` | Full WIF provider resource name |
| `STAGING_DEPLOY_SERVICE_ACCOUNT` | Staging-only service account email |

Production secrets/variables must be audited and moved behind the protected `production` environment under a **separate credential rotation and rollback plan**. This repository change does not rotate credentials.

### Gate E. Activation and evidence

- Before merging PR #125, require independent review of GitHub branch protections, environment approval rules, WIF condition, service-account bindings and complete staging web config.
- Re-run unit tests, lint, TypeScript, emulator suites, static isolation tests and build on the **exact PR head**. A successful build or preflight is not proof of environment isolation.
- Merge under protected PR review only after owner approval. The first staging workflow must run against the correct project. Deploy **Hosting only** and record exact project, site, SHA and URL.
- Verify staging bundle settings and browser network activity: all Firebase services, Auth, Storage and external integrations point to staging or are disabled. Confirm production site release history and deployed rules remain unchanged.
- Only after these checks may the team begin full two-coach integration testing.
- Leave public PR previews disabled until an independent approved preview authorization design exists.

## Rollback and emergency handling

- Hosting rollback is scoped to a *site and project*. It does not roll back Firestore, Storage rules, Functions, IAM, Auth, or leaked URLs.
- On staging misroute detection, stop the workflow and revoke its staging identity only as specifically approved. Do not alter the production live channel.
- Keep a read-only evidence inventory (resource IDs, hashes, URLs with tokens redacted, approval IDs, CI links, observed error statuses). Never store secrets or user content in GitHub issues.

## Official sources
- https://firebase.google.com/docs/projects/dev-workflows/general-best-practices
- https://firebase.google.com/docs/projects/dev-workflows/overview-environments
- https://firebase.google.com/docs/hosting/manage-hosting-resources
- https://firebase.google.com/docs/cli
- https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- https://docs.github.com/en/actions/reference/security/oidc
