# Releasing Coach Core AI

One path from a change to the live site. Nothing reaches production without the owner's approval.

```
PR ──► preview link ──► merge into recovery ──► staging ──► "Deploy production" ──► owner approves ──► live
```

## 1. Pull request → preview link

Every PR into `recovery/coach-core-mvp-2026` runs:

- **test-and-build**: lint, unit tests, typecheck, production build (fails if Tailwind styles are missing).
- **firestore-rules**: security rules tests on the Firestore emulator.
- **preview**: builds the PR and deploys it to a temporary Firebase Hosting preview channel on the main
  site (expires after 7 days). The link is posted as a PR comment.

## 2. Merge → staging

Merging into `recovery/coach-core-mvp-2026` runs **Deploy staging** (`.github/workflows/deploy-staging.yml`),
which tests, builds and deploys to **https://coach-core-ai-staging.web.app**. Check the change there.

> Staging is a second Hosting site in the **same** Firebase project as production. It uses the same
> Firestore data and the same accounts. A separate staging project (owner action O4) removes that risk.

## 3. Staging → production (owner approval)

1. Find the commit SHA running on staging: Actions → **Deploy staging** → the latest successful run → the
   commit it ran on (full 40-character SHA).
2. Actions → **Deploy production** → **Run workflow**:
   - `ref`: that SHA
   - `confirm`: `replace-live-site`
3. The job waits for the owner's approval (GitHub environment `production`, required reviewer: owner).
   Approve it to continue.
4. The workflow refuses to run unless the SHA is already on `recovery/coach-core-mvp-2026`. It tests, builds
   with production settings (work-in-progress flags off) and deploys to **https://coach-core-ai.web.app**.

> **First production run:** it replaces the old build currently live on `coach-core-ai.web.app`. The
> owner decides when that happens. Returning visitors' old offline worker removes itself on first load
> (`public/sw.js`), and HTML is served `no-cache`, so nobody stays stuck on the old version.

## Rollback

Either is fine; the first is instant.

- **Firebase console** → Hosting → site `coach-core-ai` → Release history → ⋮ next to the previous
  release → **Rollback**.
- Or run **Deploy production** again with the previous good SHA.

Staging rolls back the same way (site `coach-core-ai-staging`).

## Not covered by these workflows

- **Firestore security rules** are not deployed by any workflow. Deploying them to a live project is the
  owner's call: `firebase deploy --only firestore:rules --project <project>`.
- Functions and Storage rules are not deployed here either.

## Setup the owner does once

| | What | Where |
|---|---|---|
| O1 | Enable Email/Password and Google sign-in; authorized domains include `coach-core-ai.web.app`, `coach-core-ai.firebaseapp.com`, `coach-core-ai-staging.web.app` | Firebase console → Authentication |
| O2 | Sentry project (React). Repo variable `REACT_APP_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`; secret `SENTRY_AUTH_TOKEN` | Sentry, then GitHub → Settings → Secrets and variables |
| O3 | Environment `production` with required reviewer: owner | GitHub → Settings → Environments |
| — | Hosting site `coach-core-ai-staging` exists in project `coach-core-ai` | Firebase console → Hosting → Add another site |
| O4 | Separate Firebase project for staging/previews (later) | Firebase console |
