# Offline Mode Testing Runbook

This document explains how to validate offline queue behaviour, fallback content, and recovery workflows using the new simulator utilities and dashboard.

## Key Artefacts

| File | Description |
| --- | --- |
| `src/test/offline-simulator.ts` | Programmatic hooks for forcing network modes (offline, slow, flaky). |
| `src/test/offline-test-suite.ts` | Automated scenarios covering queueing, recovery, latency, and ordering. |
| `src/components/AI/OfflineTestDashboard.tsx` | Interactive dashboard for manual exploration, queue monitoring, and fallback preview. |
| `docs/OFFLINE_MODE_TESTING.md` | This runbook. |

## Mounting the Dashboard

Add the dashboard to a development-only surface (e.g., an internal admin page):

```tsx
import { OfflineTestDashboard } from '@components/AI/OfflineTestDashboard';

function DevToolsPane() {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return <OfflineTestDashboard enabled />;
}
```

The dashboard displays:
- Network controls (Go Online / Go Offline / Simulate Slow).
- Metrics (queue size, average wait, success rate).
- Queued request list and processing history.
- Fallback template preview and refresh button.

## Automated Test Suite

Run the programmatic scenarios inside a Jest/Vitest test or standalone script:

```ts
import { runOfflineQueueTests } from '@test/offline-test-suite';

(async () => {
  const results = await runOfflineQueueTests();
  console.table(results.map(({ scenario, success, message }) => ({ scenario, success, message })));
})();
```

Scenarios covered:
1. **Offline Queueing** – Verify requests throw and are captured in queue log.
2. **Online Recovery** – Reinstate connectivity and confirm queued items process.
3. **Slow Connection** – Ensure latency simulation works and plans still validate.
4. **Rapid Ordering** – Queue five requests offline and confirm FIFO ordering.
5. **Persistence** – Check queue log survives page reload via `localStorage`.

## Simulator API Reference

`offlineSimulator` provides:
- `goOffline()`, `goOnline()` – Force deterministic state.
- `simulateLatency(minMs, maxMs)` – Delay every request.
- `simulateFlaky(failureRate)` – Inject random failures (0–1).
- `wrap(operation, requestId)` – Wrap individual calls if needed.
- `getLogs()` / `clearLogs()` – Inspect queue events (stored in `localStorage`).

All queue events are timestamped and persisted under `offline-simulator-queue-log`.

## Manual Testing Workflow

1. **Open the dashboard** in development mode.
2. Click **Go Offline**.
3. Hit **Run Test Request** – should log an error and add entry to queue.
4. Click **Go Online**.
5. Run **Run Test Request** – verify `Request History` marks it as processed and queue size drops.
6. Toggle **Simulate Slow (3s)** and rerun – spinner holds for ~3 seconds before completing.
7. Refresh **Fallback Preview** to review offline template (confirm it uses neutral language and matches age/skill expectations).
8. Use the console (with `offlineSimulator.getLogs()`) to inspect raw log entries.

### Fallback Content Checks

- Confirm the preview clearly states it is a fallback (no “AI-generated” language).
- Review instructions for fundamental, risk-averse guidance.
- Ensure terminology is age-appropriate (no complex set names for youth teams).

### Queue Integrity Checks

- Duplicate prevention: Invert test by calling `offlineSimulator.getLogs()` to confirm repeated identical requests still record once.
- Queue breadth: Logs are persisted in `localStorage`; inspect the length to ensure we’re not accumulating thousands of records.
- Stale cleanup: Use the dashboard to monitor timestamps (stale request pruning occurs in the offline queue service).
- Priority handling: For urgent scenarios, ensure the queue service marks them appropriately (see service logging).

## Recovery and Notification

Upon returning online:
- Run the automated suite to ensure queued requests are reissued.
- Watch the dashboard’s history feed for success notices.
- Verify UI toasts/notifications appear in your integration surface when queued items complete.

## Troubleshooting Tips

- If logs do not update, verify `localStorage` is available (not disabled in browser dev tools).
- For flaky simulations, raise `simulateFlaky` failure rate to 0.75 to observe repeated failures.
- Use the browser console to inspect `offlineSimulator.getLogs()` and the queue service internals for deeper debugging.
- Remember to call `offlineSimulator.goOnline()` after tests to restore normal behaviour.

Keep this runbook handy when validating resilience features or before deploying environments with known connectivity constraints.
