# Windows local repair 2026.10.22-r1

Repair branch from PR90 b1ef1a6, app baseline 0dc94c4. Scope: existing functionality only. No AI activation, Film integration, planned destinations, live Firebase or deployment.

The user's list supplies hands-on observations. The uploaded Formation Pack v1.1 contains proposed geometry, SVG/PDF references and implementation notes; it contains no hands-on test log. Those notes are reference input, not user authorization. Exact coordinates are illustrative and await coach scheme review. No saved play migration.

Root causes: CanvasArea omitted mode/route selection props; Field consumed player clicks to drag without selecting. Drag history was never recorded. I/3-4 buttons lacked load cases. CRA5 sets PostCSS config:false; Tailwind4 directives and later nested responsive rules needed explicit compilation and flattening. DeviceRecovery had no inspected/empty state.

Repairs pass mode and route selection through, select before drag, record pre-move history once, prioritize players at route origins, finish via explicit control, map each preset independently, retain formation metadata and phase, render LOS/upfield direction, compile pinned styles before CRA, constrain desktop tools with adjacent field and field-first narrow placement, validate player jersey numbers, label tutorial close, and show a bounded local-browser draft result. Existing backend, rules and dormant AI/Film unchanged.

Formation references fetched HTTP200 on 2026-10-22:
- Shotgun Doubles 10 personnel/2x2/RB left: https://www.crucibletech.com/playbook/formations/shotgun/ (QB 5–7 yards, 2x2/back beside QB).
- I Right 21 personnel/TE right/under-center QB: Bob Davie, ESPN https://a.espncdn.com/ncf/columns/davie/1450473.html (two-back I/fullback lead).
- 4-3 Over strength right: https://www.viqtorysports.com/the-different-looks-of-the-4-3-defense/ (Over nose weak 1-tech, strong 3-tech, 4DL/3LB/4DB).
- 3-4 Base 5-0-5: https://www.coachboard.app/library/american-football/3-4-defense (nose over center, ends outside tackles, 3DL/4LB/4DB).

Canonical yards convert to x=300+10*x, y=190-10*y. QB stays on center axis; canonical under-center depth remains .8 yards. Small close markers use offset text, not displaced saved coordinates. No scout players saved; defense has exactly 11 active defenders. Two-high is alignment only, not a coverage call. No mirrored variants added.

Build: E2E_IMPORT_OFF=1 E2E_BUILD_PATH=e2e/.app-build bash e2e/scripts/build-app.sh. Existing pinned root dependencies reused; postcss-nested6.2.0 already in lock, now declared directly. Existing unchanged emulator/tools pinned clean installs reused. Build errors and test-harness corrections retained; no existing assertions weakened.

New browser proof tools/windows-main-demo/repair-browser.cjs uses local launcher synthetic account and prior synthetic preservation fixtures (Synthetic Training Team, Local Tuesday Practice, Local Shotgun from previous delivery). It uses actual canvas pointer coordinates, downloads JSON and compares all fields after reopen. Pointer-placement tolerance is 1.5 canvas pixels for scaled browser rounding; persisted JSON equality is exact. Seven tutorial steps, not six. My Week presence is verified as a calendar/list button, independently of which practice is selected. To reproduce on an empty suite, create the three named baseline fixtures first; never reset a coach's working database to run tests.

Existing acceptance tests selected unchanged via repair-verify.config.ts reset only the disposable emulator copy. Do not run these against Coach Drew's working local export. Reports identify native Windows and Claude status separately. The updater refuses a running suite, verifies the inventory before writes, keeps dependencies/browser origin/state, copies state and changed files to a backup, and rolls back a partial file update. The ZIP contains no emulator database or node_modules.
