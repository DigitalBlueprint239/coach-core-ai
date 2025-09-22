# Offline-First Strategy

This document summarizes the offline-first approach in the app and how we test it.

## Goals

- Readable user feedback when offline (status, queue, actions).
- Queue writes while offline and sync when connection returns.
- Resolve conflicts predictably with clear UI.
- Resilience to long offline periods (> 1 hour) without data loss.

## Key Concepts

- Network detection: `navigator.onLine` events (`online`/`offline`) update UI state and trigger sync.
- Queueing: Mutations initiated while offline are queued in memory/IndexedDB for later processing.
- Sync: When the app returns online, queued operations are replayed. Progress/status is surfaced in UI.
- Conflict handling: If server data changed while offline, conflict UI prompts for resolution (e.g., Server Wins / Client Wins / Merge).

## User Feedback

- Practice Planner shows an alert with Online/Offline state and either "Syncing…", "Ready to sync", or "Working offline - changes will sync when online". After successful sync, it shows a "Last synced" timestamp.
- Conflict dialogs display details and strategies with confirmation when resolved.

## Testing Strategy (Cypress)

- Spec: `cypress/e2e/offline.spec.ts` includes three flows:
  1) Create/edit while offline, then sync.
  2) Conflict detection and resolution feedback.
  3) Resume app after ~1 hour offline and verify sync status.

- Offline simulation:
  - Stub `navigator.onLine` and dispatch `offline`/`online` events.
  - Intercept network `**/*` with `forceNetworkError: true` while offline.

- CI settings:
  - Tests are scoped to local development (`baseUrl` includes `localhost`) to avoid interfering with hosted (staging/production) E2E runs. CI remains green by default.

## How To Run Locally

1) Start the dev server: `npm run dev`
2) Run Cypress headless: `npm run test:e2e:headless` (or `cypress run --spec cypress/e2e/offline.spec.ts`)

Ensure test credentials are set in Cypress env (see `cypress.config.ts`), or export `CYPRESS_testUserEmail` and `CYPRESS_testUserPassword`.

## Follow-ups

- Implement or wire `offlineQueueManager` end-to-end with IndexedDB to persist queue across reloads.
- Add data-testid hooks for key offline UI elements to make tests more robust.
- Optionally add cypress tasks for `network:offline/online` to centralize offline control (current spec uses inline helpers).

