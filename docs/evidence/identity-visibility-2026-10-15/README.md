# Identity visibility screenshots (2026-10-15)

Branch `claude/identity-visibility-2026-10-15`, change commits `d69ef8e` and `dec1ce1`, on top of candidate 9b `2446df2`.

| Files | Source | Shows |
|---|---|---|
| `real-app-no-team-saved-{1440,834,390}.png` | **Real application** (production CRA build in emulator mode, Auth emulator, Chromium) | Signed-in account and the explicit "No team selected" state, saved-data view |
| `real-app-no-team-sample-preview-{1440,834,390}.png` | **Real application** | The same, with "Sample preview · not saved" in the top bar |
| `component-harness-team-{saved,sample-preview}-{1440,834,390}.png` | **Component harness, NOT the app.** The real `AppShell` + `WeekDashboard` + `coach-core.css`, bundled standalone with team "Alpha Eagles" (the app's global CSS is absent, so fonts differ slightly). This environment cannot run the Firestore emulator | Active team displayed at each width; sample-preview badge |

The **real-app** proof of the active-team state at every width is the CI browser test **UI-02** (`e2e/tests/ui-shell.spec.ts`). It requires each identity element to be visible with a box at least 24 px wide.

Synthetic data only (`e2e.coachcore.test`). Visual approval stays with Coach Drew.
