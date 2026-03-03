# Recruiting Data Contracts

This document captures the initial Zod schemas and shared DTO contracts that power the Recruiting Intelligence Hub. All schemas live in `src/features/recruiting/domain/schema.ts` and are exported for use across web clients, Storybook, and backend functions.

## Shared Helpers

| Schema | Notes |
| --- | --- |
| `timestampSchema` | Imported from `@/services/security/validation-rules`. Ensures serialized `Date` instances or Firestore timestamps normalize before persistence. |
| `highlightReelRefSchema` | `{ id, url, coverFrame?, createdAt }` reference for items in `athlete.highlightReels`. |
| `measurablesSchema` | Optional combine metrics (`forty`, `shuttle`, `vertical`, `bench`). Bounds prevent extreme values. |

## Core Collections

| Collection | Schema | Key Fields |
| --- | --- | --- |
| `athletes` | `athleteSchema` | Academic + bio data, measurable metrics, highlight references, readiness score, metadata timestamps. |
| `coaches` | `coachSchema` | Coach identity, verification status, and endorsements issued. |
| `programs` | `programSchema` | Program name, level (`HS` &#8594; `D1`), optional conference/location, structured roster needs. |
| `externalAccounts` | `externalAccountSchema` | Linked provider handle, OAuth tokens (encrypted upstream), sync bookkeeping, structured metadata (e.g., uploads playlist ID). |
| `importedAssets` | `importedAssetSchema` | Normalized asset payload (videos/clips/posts/stats) with source URL, engagement meta, fingerprint dedupe key. |
| `recruitingInsights` | `recruitingInsightSchema` | Readiness/fit/exposure insights with actionable next steps. |
| `matches` | `matchSchema` | Athlete ↔ program pairing with scoring, rationale, scheme notes, and contact pipeline state. |

### Index Plan

`recruitingIndexes` exports canonical composite indexes for Firestore / Supabase migrations:

- `athletes_by_position_gradYear`: optimize discovery searches (`positionPrimary`, `gradYear`).
- `matches_by_program_matchScore`: enables descending match lookups per program.
- `externalAccounts_by_user_provider`: unique constraint for provider linkage per user.

## Types & Inference

Each schema exports its inferred type for use in services, components, and backend jobs:

- `Athlete`, `Coach`, `Program`, `ExternalAccount`, `ImportedAsset`, `RecruitingInsight`, `Match`
- `ProgramNeed`, `ExternalAccountMetadata`
- `CompositeIndexConfig` / `CompositeIndexField` for migration scripts

## Usage Notes

1. **Validation**: Every write to Firestore/Supabase should run through the matching Zod schema to guarantee shape parity across clients and edge functions.
2. **Timestamps**: Persist `Date` values only after normalizing through the schema. Repositories convert to/from `Timestamp`.
3. **Fingerprints**: Imported assets must provide deterministic `fingerprint` values (e.g., hash of provider + source URL + publishedAt) to ensure idempotent ingestion.
4. **Metadata Extensibility**: `externalAccountMetadataSchema` uses `.catchall(z.unknown())` to tolerate provider-specific payload without losing type safety for known fields such as `uploadsPlaylistId`.
5. **Feature Flags**: The Recruiting module depends on `appConfig.features.recruitingHub` or a remote-config override (`recruitingHub`) to enable routes and sync jobs.

Keep this document updated whenever schemas evolve. Update related migrations and seeds alongside schema changes to prevent drift.
