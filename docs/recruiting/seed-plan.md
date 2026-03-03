# Recruiting Seed Plan

The `scripts/seed-recruiting.ts` script populates Firestore with deterministic sample data to support Milestone A demos and local development.

## Entities Seeded

- **Athletes**: 20 profiles (`seed-athlete-01` → `seed-athlete-20`)
  - Positions: WR, RB, QB, DB (balanced across 2026–2028 classes)
  - Includes measurables, academics, highlight reels, social links, readiness score.
- **Programs**: 10 programs (`seed-program-01` → `seed-program-10`)
  - Levels span D1, D2, D3, NAIA with two roster needs each.
- **Imported Assets**: 50 records per athlete `userId`
  - 30 YouTube highlights (2 per athlete) with views/likes metadata.
  - 20 manual provider links (Hudl, Instagram, MaxPreps) for manual ingestion flows.

All IDs are prefixed with `seed-` to keep them easy to identify and idempotent.

## Running the Seed

```bash
# Preview JSON without writing
npm run seed:recruiting -- --dry-run

# Seed against the Firestore emulator
FIRESTORE_EMULATOR_HOST=localhost:8080 npm run seed:recruiting

# Seed production/staging (requires service account or firebase login)
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
npm run seed:recruiting -- --project your-firebase-project
```

The script will `set` documents using deterministic IDs, so rerunning it keeps demo data up to date without creating duplicates.

## Post-seed Verification

1. Visit `/recruiting` in the app (with `VITE_FEATURE_RECRUITING=true`) and confirm seeded athletes appear.
2. Check Firestore collections: `athletes`, `programs`, `importedAssets` for `seed-*` documents.
3. Run `npm run test:e2e` to verify Playwright flows using the seed data.

Remove demo data when needed via the Firebase console or by deleting documents with the `seed-` prefix.
