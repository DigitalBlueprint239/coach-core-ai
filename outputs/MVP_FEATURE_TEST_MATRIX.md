# MVP feature test matrix

October 13, 2026. Source commits and command ledger: [recovery audit](COACH_CORE_RECOVERY_AUDIT.md).

PASS means the stated test actually executed successfully. PARTIAL means only a layer or subset was executed, not the full workflow. FAIL requires a reproduced failure; BLOCKED means missing runtime/configuration/tool capability prevented verification. NOT IMPLEMENTED means the runnable audited application lacks the workflow. Source inspection alone never earns PASS.

## Standalone Smart Playbook

| Feature | Status | Executed evidence | Limits / affected files |
|---|---|---|---|
| Field canvas rendering | PASS, desktop scope | Actual 1440×1000 full-page browser screenshot shows field lines, offensive circles and defensive triangles | Small viewport does not fit players. React console errors for Layer casing and listening attribute; does not mean crash-free |
| Offensive formations | PARTIAL | JSDOM provider applies Shotgun Ace, verifies 11 offensive players; formation catalogue finite-coordinate check on L/M/R passes | Browser I Strong click attempted but no confirmed change; requires visual placement/football correctness tests |
| Defensive formations | PARTIAL | JSDOM selects first defensive formation, verifies defense plus preserved 11 offensive players | Browser defensive menu opens; 4-3 Over application not confirmed |
| Add players | PARTIAL | Formation application creates players in context | Individual manual-add workflow not verified; duplication/creation handlers require UI test |
| Select players | BLOCKED | Field visually contains players; selection logic inspected | No verified canvas pointer selection; small viewport panels obstruct field |
| Drag players | PARTIAL | onPlayerMove changes actual provider data | Pointer drag and route anchoring not tested; undo fails after movement |
| Remove players | PARTIAL | Clear all empties provider arrays; undo and redo restore/reclear successfully | Single selected player removal not exercised |
| Route drawing | PARTIAL | Generated route added through real provider | Freehand pointer drawing not verified |
| Route editing | PARTIAL | Route point update executed; geometry survives storage round trip | Vertex dragging, labels/selection and snaps not tested visually |
| Undo/redo | FAIL | Clear/undo/redo passes; drag → commit → undo leaves moved coordinates (760 instead of 720) | PlaybookContext.tsx; useHistory.ts. Major editing workflow fails |
| Save/reopen | PARTIAL | savePlaybook/getInitialPlaybook retains route name and geometry; excludes history; malformed JSON handled | Browser multi-play reopen not verified. Structurally incomplete play accepted: FAIL subtest |
| Play animation | BLOCKED | Toolbar correctly says “Add routes to enable animation” for default play | GSAP/UIContext inspected; no route-driven animation or pause/seek/reset verified |
| Single-play PDF export | PARTIAL | Real download 3,569,301 bytes, one parsed page, one image and play/formation text | Rendered PDF is cropped and contains no players at 493×452. Requires complete-diagram export verification |
| Install PDF book | FAIL | Clicking Export Install Book produces “An error occurred during the export process. Please try again.” | exportService.ts calls pdf.autoTable after side-effect import; package smoke finds undefined method. Alert caused subsequent browser focus timeouts |
| Wristband export | BLOCKED | WristbandPanel/Modal exist; source uses window.print | No verified layout, printed output or PDF; source print CSS hides body root while printable content is nested—investigate |
| Mobile/small window | PARTIAL; observed layout failure | Native 493×452 view shows overlapping panels/cropped field; export omits out-of-view players | Not a physical smartphone/touch test; all real mobile workflows remain unverified |
| Tablet interaction | BLOCKED | No usable tablet touch session completed | Must test 768/1024 breakpoints and physical touch, route drag/drop, scroll/pinch and editing |

The [sample PDF](evidence/SMART_PLAYBOOK_SAMPLE.pdf) and [rendered page](evidence/SMART_PLAYBOOK_SAMPLE.png) document the limited export result, not a working coaching diagram.

## Main platform

| Feature | Status | Executed evidence | Limits / affected files |
|---|---|---|---|
| Dashboard rendering | FAIL in mocked App runtime | Existing App test executes and logs auth-context exception caught by ErrorBoundary | App mounts components/AuthProvider; Dashboard consumes hooks/useAuth. Test itself passes on fallback text; does not verify dashboard |
| Authentication | FAIL at application context boundary | Above provider mismatch reproduced under existing mocked App test | Sign In UI source displays “Authentication coming soon!” instead of authentication. Real Firebase login/signup/session/logout not verified |
| Team creation | BLOCKED | TeamContext/createTeam source inspected | No real credentials/emulator; no TeamContext end-to-end test. Owner/membership schema and rules must agree |
| Team selection | BLOCKED | switchTeam source exists | Requires auth repair and seeded emulator test with two teams and ownership denial |
| Roster management | NOT IMPLEMENTED in runnable main UI | Roster files are .jsx.txt artifacts; dashboard tabs do not route to roster | Service/types alone do not provide a working roster UI |
| Practice planning | PARTIAL | AI Brain mocked practice-plan/fallback tests pass; duration/goal component source exists | Actual UI navigation, editing, save/reopen and team binding not verified; planner uses literal demo-team |
| Smart Playbook navigation | BLOCKED | Dashboard has playbook tab and renders SmartPlaybook in source | Dashboard context exception prevents verified path; root App currentView setter has no visible navigation wiring |
| Onboarding | BLOCKED | Modal and local completion flag exist | Not exercised as a coach; demo handler only sets a boolean without loading sample data; cannot claim demo onboarding PASS |
| AI coaching assistant | PARTIAL | Mocked AIBrain/proxy tests exercise parsing, error and fallback behavior | No real model response, authenticated proxy, or verified conversational UI; API key boundary unsafe |
| Firebase integration | PARTIAL, mock-only | Existing firestore suites pass under mocked Firebase SDK | No network integration, auth/ownership/rules compiler tests or live configuration review; emulator connection lines commented out |

## Existing main Playbook engine tests

PlayController and edge suites pass for player creation/removal/selection/position updates, offensive/defensive formation constructors, route creation/removal and pure undo/redo helpers. This is executed unit evidence. It does not verify CanvasArea pointer wiring, touch handling, animation, save-dialog/UI behavior, PDF/wristbands, or main Dashboard navigation. Overall feature status stays PARTIAL/BLOCKED until those interactions pass.

## Standalone isolated harness: final run

Command: `node ../run-smart-harness.cjs` in work/smart-playbook-source. Results: **8 PASS, 2 FAIL; exit 1**. No network backend or mocked canvas is used. Real React provider state is mounted in JSDOM and driven with act().

| Check | Result |
|---|---|
| Default play initializes offense and defense | PASS |
| Apply offensive formation through context | PASS |
| Apply defensive formation preserving offense | PASS |
| Add generated route and edit points | PASS |
| Save/reload route labels and geometry; history excluded | PASS |
| Drag move undo restores starting coordinates | FAIL |
| Clear all players, undo, redo | PASS |
| Malformed JSON does not crash initializer | PASS; initializer removes invalid key in isolated storage |
| Incomplete stored play rejected safely | FAIL; routes missing but object accepted |
| All formation coordinates finite on three hashes | PASS; finite does not prove tactical legality or boundaries |

Main Jest final run: 338 passed and 2 failed tests; 14 passed and 2 failed suites. FieldMemo suite never loads because import is invalid. Nested starter adds one unrelated passing CRA starter test; do not combine it with coaching feature coverage. Standalone has no existing automated suite. Functions has lint and load checks, no executable test script. Existing Python model/optimization examples are unrelated prototypes outside either web application's runtime and were not provisioned or executed.

## Retest gates

1. Reproduce auth fixes with an App test asserting actual dashboard content and no error-boundary fallback.
2. Use a demo Firebase project emulator with synthetic two-owner/two-team fixtures; verify allowed and forbidden document/storage operations, session transitions and offline replay.
3. On desktop, execute create play → formations → add/select/drag/remove → route draw/edit → undo/redo → save → reload → animation → complete PDF and wristband.
4. Repeat on mobile/tablet with touch and narrow layouts. Test corrupted storage, unavailable/quota-limited storage and denied backend requests.
5. Verify downloaded diagrams contain the expected players/routes and all pages; a download event alone is insufficient.
