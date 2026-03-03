# Recruiting Intelligence Hub

## Purpose
- Deliver a modular, feature-flagged Recruiting Intelligence Hub that lets athletes aggregate external profiles, build AI-assisted recruiting materials, and enables coaches to discover and evaluate talent without disrupting existing Coach Core AI experiences.

## Milestone Plan
- **Milestone A (MVP):** Athlete profile + public page, YouTube adapter, manual Hudl/IG/MaxPreps linking, readiness scoring (mock), coach discovery basics, admin metrics v1.
- **Milestone B:** AI highlight builder (mock pipeline), Twitter OAuth adapter, opportunities feed, endorsements, program needs CRUD with mock matches.
- **Milestone C:** Production AI pipelines (OpenAI), program matcher v1, scheduled syncs, CSV/PDF exports, compliance and privacy upgrades.
- **Milestone D:** Expanded adapters (Instagram, MaxPreps, Hudl partner/ext), geographic insights, similarity search, partner API publishing.

## Architecture Pillars
- **Type Safe:** Zod-backed DTOs, shared schema definitions, strict TypeScript everywhere.
- **Modular:** Provider adapter interface, AI service abstraction, feature-gated routes/components.
- **Test Covered:** Vitest unit/integration suites, Playwright E2E covering key journeys.
- **Incremental:** Ship via milestones with feature flag `features.recruitingHub`; toggle enabled remotely.

## Core User Flows
- Athlete builds unified recruiting profile with autosave, readiness score, highlight reels, and public share page (QR/link/privacy controls).
- Athlete links external accounts (YouTube primary + manual Hudl/Instagram/MaxPreps/Twitter fallbacks) and imports assets.
- Athletes view opportunities feed: program needs, camps, combines, safe outreach templates.
- Coaches discover and filter athlete database, review AI film summaries, endorsements, export packets, bookmark prospects.
- Programs maintain needs portal, pull suggested athletes, download recruiting packets, submit public needs form.
- Admins monitor adoption metrics, sync health, error inbox, compliance guardrails.

## Data Model (Firestore/Supabase)
- `athletes`: bio, academics, measurables, media, readiness metrics, highlight reels.
- `coaches`: verified identities and endorsements.
- `programs`: competitive level, conference, roster needs metadata.
- `externalAccounts`: linked provider handles with sync status.
- `importedAssets`: normalized provider assets with AI tags and fingerprints.
- `recruitingInsights`: readiness/fit/exposure scores with actionable tips.
- `matches`: athlete/program pairing with rationale and contact status.
- Supporting indexes: athletes by `positionPrimary+gradYear`, matches by `programId+matchScore desc`, external accounts by `userId+provider`.

## Integrations & AI Layers
- Provider adapters (`youtube`, `twitter`, `instagram`, `hudl`, `maxpreps`) with connect/disconnect/fetch/map APIs, exponential backoff, dedupe, event emission.
- AI services (`VideoTagger`, `HighlightComposer`, `ReadinessScorer`, `ProgramMatcher`, `SocialOptimizer`) behind `AIService` contract; mock first, OpenAI integration second.
- Backend functions: asset sync, video analysis, reel composition, readiness scoring, program matching, metadata scraping, OAuth webhooks; scheduled refresh jobs.

## Security & Compliance
- Role-gated edits (athlete/coaches), granular privacy toggles, encrypted secrets, sanitized logs.
- Content safety checks for imported assets, audit logs for sensitive actions, manual approvals for any outreach automation.
- `/docs/recruiting/compliance.md` to track NCAA/NAIA guidance and rollout gates.

## Deliverables Checklist (per milestone)
- Feature flag wiring + remote toggle.
- Migrations & seed data (20 athletes, 10 programs, 50 assets).
- Storybook stories with controls/a11y for key recruiting components.
- Playwright E2E suites for athlete, coach, and program journeys.
- Admin telemetry dashboards & error inbox.
- Rollout plan: flag on for canary, monitor 72h, ensure 90% type coverage and ≥80% test coverage on new modules.

## Testing & Dev Commands

```bash
npm run migrate -- --project your-project-id    # Deploy Firestore indexes
npm run seed:recruiting -- --dry-run            # Preview seed payload
npm run seed:recruiting -- --project demo       # Seed Firestore (emulator or project)
npm run test:cov                               # Vitest coverage (adapters, hooks)
npm run test:e2e                               # Playwright recruiting flows
npm run storybook                              # Review UI components
```

## Acceptance Coverage

- **Profile Builder**: zod-validated sections with autosave, readiness meter, manual provider linking, privacy toggles.
- **Public Page**: SEO metadata, provider badges, share link/QR, privacy-aware sections.
- **Media Sync**: YouTube adapter + manual links populate `importedAssets`, mirrored in `AssetGrid` and seeds.
- **Docs & Ops**: migrations (`docs/recruiting/migrations.md`), seeds (`docs/recruiting/seed-plan.md`), provider setup (`docs/recruiting/providers.md`), compliance notes (`docs/recruiting/compliance.md`), admin runbook (`docs/recruiting/admin-runbook.md`).
- **Storybook**: components under `Recruiting/*` with a11y-ready stories.
- **E2E**: Playwright specs exercise profile completion, YouTube sync, and public page visibility.
