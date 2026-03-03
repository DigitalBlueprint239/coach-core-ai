# Recruiting Migrations

## Firestore Indexes

The Recruiting Intelligence Hub uses three composite indexes in addition to existing application indexes:

| Collection        | Fields                              | Purpose                                   |
| ----------------- | ----------------------------------- | ----------------------------------------- |
| `athletes`        | `positionPrimary` ASC, `gradYear` DESC | Speed discovery filters by position/year. |
| `matches`         | `programId` ASC, `matchScore` DESC  | Rank athletes per program by match score. |
| `externalAccounts`| `userId` ASC, `provider` ASC        | Enforce single link per provider/user.    |

All indexes live in `firestore.indexes.json` and are deployed via the migration script below.

## Running Migrations

```bash
# Dry run – prints the JSON payload
npm run migrate -- --dry-run

# Deploy to Firestore (requires firebase-tools auth)
npm run migrate -- --project your-firebase-project
```

The script wraps `firebase deploy --only firestore:indexes` and respects `FIREBASE_PROJECT_ID` or `GCLOUD_PROJECT` when `--project` is omitted. Ensure you are logged in (`firebase login`) or provide service account credentials via `GOOGLE_APPLICATION_CREDENTIALS`.

## Rollback

Indexes can be removed/rolled back with:

```bash
firebase firestore:indexes --project your-firebase-project --delete
```

Update `firestore.indexes.json` accordingly and rerun the migration script to apply a new desired state.
