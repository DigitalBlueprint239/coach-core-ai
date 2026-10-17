# N2 repair (#71) — real-app screenshots (2026-10-15)

| | |
|---|---|
| Runtime | `bdb06ae6d39ff9ed3fee7000f93468c8cf2f8fe7` (#71) |
| Built from | Candidate `claude/n2-repair-acceptance-2026-10-15` @ `8ff5521`. Runtime is byte-identical to `bdb06ae` |
| Build | `bash e2e/scripts/build-app.sh` (production CRA build, emulator mode, demo project) |
| Environment | Local Chromium 141, Auth emulator only |

There is **no Firestore emulator here**, so the app's REST `documents:commit` has nothing to reach: a genuine outage. The commit was additionally held for 400 ms to photograph the in-progress state.

| File | State shown |
|---|---|
| `n2-real-app-saving-status-{1440,390}.png` | Immediately after submit: the dialog's `role="status"` saving message and the "Creating…" button |
| `n2-real-app-unconfirmed-check-and-retry-{1440,390}.png` | After the request fails: "Still saving. Check your connection…" status, a `role="alert"` and **Check and retry**; the team name is locked |
| `n2-real-app-pending-resume-{1440,390}.png` | After Cancel: the Teams page keeps "Pending team: … Still saving; confirmation is unavailable." with **Resume team creation** |

Synthetic account (`e2e.coachcore.test`). No tokens or IDs appear.

**Observations, not N2 test results:**
1. The alert shows the raw browser error "Failed to fetch".
2. The Teams panel and Create Team dialog render with browser-default styling (no overlay, unstyled buttons). The same Tailwind setup (`@tailwind` directives with Tailwind 4, no config) is present in candidate 8 `069c8f1` and candidate 10 `186a743`, so this predates N2.
