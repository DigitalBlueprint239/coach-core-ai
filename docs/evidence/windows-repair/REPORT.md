# Coach Core Windows repair — 2026.10.22-r1

Candidate source: **32f46d34821380dc69c8eaf37554bfc26f71fa06**. Built main app, local `demo-coach-core-e2e` emulators/synthetic accounts only. AI/Film backend OFF; planned sidebar destinations unavailable. No deployment or live Firebase.

| Check | Result | Evidence / limits |
|---|---|---|
| View/select, Add Player, Delete players/routes | PASS | Actual packaged canvas in Chromium + Firefox, correct mode/selection; route origin gives player selection priority. |
| Draw Route / Start Drawing Route | PASS | Multi-point routes originate at selected player. Finish via Finish Route; moving player keeps origin attached. |
| Undo/Redo | PASS | Add/delete/move/route/clear browser checks. New regression failed before repair; 114/114 selected unit tests now pass, including all 113 unchanged originals. |
| Four independent formation buttons | PASS | Named Shotgun Doubles (10/2x2/RB left), I Right (21/TE right), 4-3 Over (strength right), 3-4 Base (5-0-5). Each 11 unique active players; counts, LOS/backfield, fronts/depths/bounds independently checked against reference concepts. Exact coordinates are illustrative, pending coach scheme review. |
| Shared styling / field placement | PASS | Pinned Tailwind compile + flatten before CRA. No unresolved directives; fixed/size/responsive utilities present. Desktop 1440 and narrow 900 viewport screenshots. |
| Practice / My Week preservation | PASS | Existing synthetic practice reopened unchanged; new dated practice saved, appeared in My Week, updated, refreshed/reopened. |
| Team creation / account permissions | PASS | Unchanged acceptance suite tests team creation/fresh profile, account switching, forbidden cross-account reads/writes for teams/plays/practices. |
| Team separation | PASS | Same-coach second team has empty play/practice libraries and draft; returning restores first team. In-flight practice save lands only in its original team. |
| Player positions + nonempty routes | PASS | Save -> refresh -> library reopen exact exported JSON in Chromium + Firefox. Emulator export/shutdown/restart/import + fresh-profile reopen also compared exactly. |
| JSON / New Play / refresh / Clear Field | PASS | Downloads parsed and player IDs/coordinates, route player references/waypoints/type/color inspected. Saved/reopened fields exactly equal. New Play, library refresh/save/reopen and Clear/Undo preserved. |
| Invalid input / failed save | PASS | Negative jersey number rejected; negative practice duration fails without reporting Saved. Offline practice/play drafts stay pending, not Saved; reconnect acknowledges. Stale saves show conflict/recovery rather than overwrite. |
| Draft search / tutorial | PASS | Explicit no-other-drafts and found-draft results, scoped to this browser/team; other computers not searched. Seven-step tutorial Next/Previous/close/completion and selection after close. Header Help & tutorial remains visible. |
| Data-preserving updater | PASS | Refuses running suite; validates all hashes before file replacement; 9 protected synthetic export/config/user files byte-identical before app startup; state backup byte-identical. App files match candidate inventory. Original baseline export retained separately. |
| Windows-native run | **BLOCKED** | No Windows shell/desktop access. Verified here on Linux Node24.19/Java21, Chromium156 + Firefox157. User's Node22.23.1 was confirmed earlier; Java21 and native cmd/npm/console export are not confirmed. |
| Claude independent verdict | **BLOCKED — pending** | Same final source and ZIP handed to Claude through shared GitHub review thread. Author results are not independent acceptance. |

Final selected browser acceptance: **16 PASS / 0 FAIL / 0 SKIP / 0 retries** (8 unchanged scenarios x 2 engines). Dedicated repair workflow: **2/2 engine runs PASS**. Unit: **114/114 PASS**. This is bounded local repair evidence, not a full-suite/beta/release approval.

No remaining feature failure observed in the checked workflows. `repair-failures.md` records corrected build/package defects and new-harness corrections. SDK-seeded acceptance fixtures can log NOT_FOUND for absent userProfiles statistics counters; launcher-created synthetic accounts wait for profile readiness. Counter correctness is not claimed as an acceptance result.

Build uses existing identical-lock dependency installs; no new clean client `npm ci` claimed. Unchanged clean installed emulator tools/functions reused. No physical mobile or Windows usability test. ZIP ships no emulator state, credentials or node_modules; upgrading preserves the existing working folder/browser origin. Never run reset-based test suites on Coach Drew's working local data.

Use READ-ME-FIRST.txt. Stop old app with Ctrl+C once, wait for export, Extract All into a new folder, run UPDATE-EXISTING.cmd, select/type the old folder path, then launch START-COACH-CORE.cmd in that old folder. One address: **http://localhost:3000/start**.

Source/reference explanation: README.md / docs/WINDOWS_REPAIR.md. The attachment contains formation references, not a separate hands-on log; the user's enumerated observations supplied the repair checks. Attachment implementation notes were treated as reference input only.
