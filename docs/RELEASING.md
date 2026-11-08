# Coach Core AI — Deployment and release controls

**Security isolation transition (2026-11-07).** Production Firebase project: `coach-core-ai`. The former staging Hosting site and PR previews were connected to that project. PR #126 suspended automatic production-linked deployments on the protected recovery branch. Previously published Hosting channels need their own approved cleanup; this repository change does not delete them.

## Deployment route

1. Pull requests to `recovery/coach-core-mvp-2026` run `test-and-build` and Firestore emulator tests. The required `preview` check is deliberately **no-op** (no Hosting site, credentials, or deploy). Do not promise a preview URL.
2. Staging Hosting deployment becomes available **only after** a new, independent Firebase project, the GitHub `firebase-staging` environment, restrictive WIF trust policy, and staging variables are configured. A push to protected recovery or a manual dispatch on that branch runs `deploy-staging.yml`; it fails closed when prerequisites are missing.
3. Production deployment is separately owner-approved. Use Actions → **Deploy production** → `ref` (full 40-character SHA already on protected recovery) and `confirm=replace-live-site`. The `production` GitHub environment must enforce an owner reviewer. Confirm the resulting artifact has the **production** project ID; never promote a staging-built bundle to production.
4. Rules and Functions are never deployed by these Hosting workflows. Firestore rules, Storage rules, indexes, and Functions require separate reviewed release plans and explicit project IDs.

Do not run the legacy `scripts/deploy.sh` or `scripts/rollback.sh`. Those entry points must remain blocked by a separate security hotfix. Avoid bare `firebase deploy` or relying on the CLI default project.

## Environment boundaries

- `firebase.json` is the **production** manifest; `.firebaserc` has no implicit `default` project.
- `firebase.staging.template.json` generates a **Hosting-only** manifest, then deploys using explicit `--project "$STAGING_FIREBASE_PROJECT_ID"`.
- Staging build variables are **environment-scoped** to GitHub `firebase-staging`; the staging OIDC identity must have no roles in the production project.
- No PR job has cloud credentials. Preview Hosting may be considered later only with its own threat model and owner-approved permission boundaries.
- External integrations (Analytics, OAuth, webhooks, Sentry, AI, payments, email) require separate review: a separate Firebase project does not automatically isolate these.

## Rollback and evidence

Before release, record the commit SHA, project ID, release history, exact site, and required reviewers. Hosting rollback uses that **project's** Hosting release history (previous successful version); it does not roll back Firestore, Storage rules, Auth, IAM, or Functions.

Production: Firebase Console → Hosting → site `coach-core-ai` → release history → review the previous good release before rollback. Use the production workflow for an approved code rebuild when appropriate.

Never disable the legacy staging site or delete preview channels without inventorying exact IDs and explicitly confirming that the channels are obsolete. Never use real coach/student data for staging tests.

See `docs/security/FIREBASE_STAGING_ISOLATION_RUNBOOK_2026-11-06.md` for cloud provisioning and sign-off gates.
