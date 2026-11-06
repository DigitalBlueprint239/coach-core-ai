# Releasing Coach Core AI

**Isolation rollout in progress (2026-11-06):** Do not use old staging Hosting or PR preview links for security testing until the new isolated Firebase project is provisioned and verified. See `docs/security/FIREBASE_STAGING_ISOLATION_RUNBOOK_2026-11-06.md`.

```
PR → preview (isolated staging project) → recovery branch → staging (same isolated staging project)
     → verified release SHA → owner-approved production deploy (production project)
```

- **Production Firebase project:** `coach-core-ai`. No implicit default project alias remains.
- **Staging/preview Firebase project:** independently provisioned project, explicitly set via GitHub `firebase-staging` environment variables. Not the old production-project staging Hosting site.
- **Credentials:** stage-only GitHub OIDC / Google Workload Identity Federation; no production service-account secrets.
- **Security rules:** not deployed by Hosting workflows; require their own isolated staging rollout, tests and separate production approval.

## Production deployment
The `Deploy production` workflow is still manually dispatched from a commit on `recovery/coach-core-mvp-2026` with `confirm=replace-live-site` and the owner-protected `production` GitHub environment. A new preflight refuses any production Firebase project ID other than `coach-core-ai`.

## Staging activation and rollback
Follow the staging isolation runbook before enabling staging deployment. The new staging workflow must fail closed until its required variables and Workload Identity Federation are configured. Review Firebase Hosting's staging-project release history for rollback; the old `coach-core-ai-staging` site inside production is no longer the staging destination and should be retired only after checking whether it serves active traffic.

## Explicit exclusions
These workflows deploy Hosting only; Firestore and Storage rule deployment, Functions, project creation, IAM, billing, real-user data migration, and staging integration tests are separate approval gates.
