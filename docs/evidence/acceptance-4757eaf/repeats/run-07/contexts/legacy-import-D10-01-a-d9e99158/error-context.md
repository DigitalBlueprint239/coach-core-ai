# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: legacy-import.spec.ts >> D10-01 accept: explicit consent copies every play exactly into the selected team, records the decision with the verified ids (ordering proven by D10-10), originals untouched
- Location: e2e\tests\legacy-import.spec.ts:59:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

Expected: ArrayContaining ["Legacy Mesh", "Legacy Punt Safe", "Legacy Cover 2"]
Received: []
```

# Page snapshot

```yaml
- generic [ref=f2e2]:
  - generic [ref=f2e3]:
    - navigation [ref=f2e4]:
      - generic [ref=f2e5]: Coach Core
    - generic [ref=f2e13]:
      - banner [ref=f2e14]:
        - generic [ref=f2e16]:
          - generic [ref=f2e17]:
            - heading "Coach Core AI" [level=1] [ref=f2e18]
            - text: Alpha Eagles
          - generic [ref=f2e19]:
            - generic [ref=f2e20]: Welcome, d10a-mv8o6dp9-26@e2e.coachcore.test
            - button "Sign out" [ref=f2e21]
      - navigation [ref=f2e22]:
        - generic [ref=f2e24]:
          - button "📊Overview" [ref=f2e25]
          - button "👥Teams" [ref=f2e26]
          - button "📋Practice Plans" [ref=f2e27]
          - button "🏈Smart Playbook" [ref=f2e28]
          - button "📈Analytics" [ref=f2e29]
      - main [ref=f2e30]:
        - generic [ref=f2e31]:
          - region "Earlier account drafts"
          - status "Play save status" [ref=f2e32]: unsaved
          - region "Device recovery" [ref=f2e33]:
            - button "Find other device drafts" [ref=f2e34]
          - button "New play" [ref=f2e35]
          - button "Export draft" [ref=f2e36]
          - button "Refresh play library" [ref=f2e37]
          - generic [ref=f2e40]:
            - heading "Smart Playbook" [level=1] [ref=f2e41]
            - button "Show Debug" [ref=f2e43]
          - generic [ref=f2e45]:
            - generic [ref=f2e46]:
              - generic [ref=f2e47]:
                - heading "Tools" [level=3] [ref=f2e48]
                - generic [ref=f2e49]:
                  - button "View" [ref=f2e50]
                  - button "Add Player" [ref=f2e54]
                  - button "Draw Route" [ref=f2e60]
                  - button "Delete" [ref=f2e65]
                - generic [ref=f2e72]:
                  - generic [ref=f2e73]:
                    - button "Undo" [disabled] [ref=f2e74]
                    - button "Redo" [disabled] [ref=f2e78]
                  - generic [ref=f2e82]: No actions to undo
                  - button "Clear Field" [ref=f2e83]
                  - button "Help" [ref=f2e88]
                - generic [ref=f2e93]:
                  - generic [ref=f2e94]: "Current Mode:"
                  - generic [ref=f2e95]: view
              - generic [ref=f2e99]:
                - heading "Formations" [level=3] [ref=f2e100]
                - generic [ref=f2e101]:
                  - button "Shotgun 11 players" [ref=f2e102]:
                    - generic [ref=f2e108]:
                      - generic [ref=f2e109]: Shotgun
                      - generic [ref=f2e110]: 11 players
                  - button "4-3 Defense 11 players" [ref=f2e113]:
                    - generic [ref=f2e116]:
                      - generic [ref=f2e117]: 4-3 Defense
                      - generic [ref=f2e118]: 11 players
                  - button "I-Formation 11 players" [ref=f2e121]:
                    - generic [ref=f2e127]:
                      - generic [ref=f2e128]: I-Formation
                      - generic [ref=f2e129]: 11 players
                  - button "3-4 Defense 11 players" [ref=f2e132]:
                    - generic [ref=f2e135]:
                      - generic [ref=f2e136]: 3-4 Defense
                      - generic [ref=f2e137]: 11 players
                - paragraph [ref=f2e141]: Click any formation to instantly populate the field with players in proper positions.
              - generic [ref=f2e142]:
                - heading "Player Controls" [level=3] [ref=f2e143]
                - paragraph [ref=f2e148]: Select a player to edit
              - generic [ref=f2e149]:
                - heading "Route Controls" [level=3] [ref=f2e150]
                - paragraph [ref=f2e156]: Select a player to draw routes
              - generic [ref=f2e157]:
                - heading "Route Editor" [level=3] [ref=f2e158]
                - paragraph [ref=f2e164]: Select a route to edit
              - generic [ref=f2e165]:
                - heading "Play Management" [level=3] [ref=f2e166]
                - generic [ref=f2e167]:
                  - generic [ref=f2e168]: Current Play
                  - generic [ref=f2e175]:
                    - generic [ref=f2e176]:
                      - text: Play Name
                      - textbox "Enter play name..." [ref=f2e177]
                    - generic [ref=f2e178]:
                      - generic [ref=f2e179]:
                        - text: Phase
                        - combobox [ref=f2e180]:
                          - option "Offense" [selected]
                          - option "Defense"
                          - option "Special Teams"
                      - generic [ref=f2e181]:
                        - text: Type
                        - combobox [ref=f2e182]:
                          - option "Pass" [selected]
                          - option "Run"
                          - option "Kick"
                          - option "Punt"
                - generic [ref=f2e183]:
                  - button "Save Play" [disabled] [ref=f2e184]
                  - button "Load Play" [active] [ref=f2e189]
                - paragraph [ref=f2e193]: Save your current play setup or load previously saved plays from your library.
            - img "Football field canvas in view mode" [ref=f2e196] [cursor=pointer]
            - generic [ref=f2e198]:
              - heading "Play Library" [level=3] [ref=f2e199]
              - generic [ref=f2e200]:
                - generic [ref=f2e201]:
                  - generic [ref=f2e202]: Legacy Cover 2
                  - generic [ref=f2e203]: "Phase: defense | Type: zone | Invalid Date"
                  - generic [ref=f2e204]:
                    - button "Load" [ref=f2e205]
                    - button "Delete" [ref=f2e206]
                - generic [ref=f2e207]:
                  - generic [ref=f2e208]: Legacy Mesh
                  - generic [ref=f2e209]: "Phase: offense | Type: pass | Invalid Date"
                  - generic [ref=f2e210]:
                    - button "Load" [ref=f2e211]
                    - button "Delete" [ref=f2e212]
                - generic [ref=f2e213]:
                  - generic [ref=f2e214]: Legacy Punt Safe
                  - generic [ref=f2e215]: "Phase: special | Type: punt | Invalid Date"
                  - generic [ref=f2e216]:
                    - button "Load" [ref=f2e217]
                    - button "Delete" [ref=f2e218]
  - generic [ref=f2e223]:
    - paragraph [ref=f2e228]: Team created successfully!
    - button [ref=f2e230]
```

# Test source

```ts
  1   | // D10 / P13: consent-based import of pre-account device plays (PR #55),
  2   | // real browser -> app -> Firestore emulator with the repo's rules.
  3   | // Founder rule (locked, 2026-10-13): explicit opt-in into the signed-in coach's
  4   | // selected authorized team; originals byte-for-byte; no duplicate imports or
  5   | // cross-account exposure; decline leaves originals unchanged; no deletion.
  6   | import { test, expect } from '@playwright/test';
  7   | import { resetEmulators, adminSet, adminGet, AUTH_ONLY } from './support/emulator';
  8   | import {
  9   |   coachEmail, skipOnboarding, signInAsBetaCoach, signOutViaUI, createTeamViaUI, openTab,
  10  |   storage, waitForE2EHooks,
  11  | } from './support/app';
  12  | import {
  13  |   LEGACY_PLAYS, seedDevice, deviceState, expectOriginalsUntouched, openPlaybook, importPrompt,
  14  |   adminCopies, libraryNames, commitControl, expectedCopyId, decisionKey, acceptImport,
  15  | } from './support/legacy';
  16  |
  17  | test.beforeEach(async ({ context }) => {
  18  |   test.skip(AUTH_ONLY, 'needs the Firestore emulator');
  19  |   await resetEmulators();
  20  |   await skipOnboarding(context);
  21  | });
  22  |
  23  | /** Coach with one owned team, on the Playbook tab with seeded device data. */
  24  | async function coachWithTeam(page: import('@playwright/test').Page, label: string, team: string) {
  25  |   await seedDevice(page);
  26  |   const email = coachEmail(label);
  27  |   const uid = await signInAsBetaCoach(page, email);
  28  |   await createTeamViaUI(page, team);
  29  |   const teamId = (await storage(page)).currentTeamId;
  30  |   expect(teamId).toBeTruthy();
  31  |   return { email, uid, teamId: teamId as string };
  32  | }
  33  |
  34  | function expectFaithfulCopies(copies: Awaited<ReturnType<typeof adminCopies>>, uid: string, teamId: string) {
  35  |   expect(copies.map((c) => c.id).sort()).toEqual(LEGACY_PLAYS.map((p) => expectedCopyId(uid, teamId, p)).sort());
  36  |   for (const p of LEGACY_PLAYS) {
  37  |     const c = copies.find((x) => x.id === expectedCopyId(uid, teamId, p))!.data;
  38  |     expect(c).toMatchObject({
  39  |       name: p.name, type: p.type, localId: p.id, teamId, createdBy: uid, revision: 1,
  40  |       phase: p.phase === 'special' ? 'special_teams' : p.phase,
  41  |     });
  42  |     expect(c.players).toEqual(p.players); // every property, incl. extras
  43  |     expect(c.routes).toEqual(p.routes);
  44  |     if ('createdAt' in p) expect(Date.parse(c.createdAt)).toBe(Date.parse(p.createdAt as string));
  45  |     if ('updatedAt' in p) expect(Date.parse(c.updatedAt)).toBe(Date.parse(p.updatedAt as string));
  46  |     expect(Object.keys(c).sort()).toEqual(
  47  |       ['createdAt', 'createdBy', 'localId', 'name', 'phase', 'players', 'revision', 'routes', 'teamId', 'type', 'updatedAt'],
  48  |     );
  49  |   }
  50  | }
  51  |
  52  | test('D10-00 [SDK-in-browser, diagnostic] a create-only transaction can check a not-yet-existing copy id', async ({ page }) => {
  53  |   await coachWithTeam(page, 'd10z', 'Alpha Eagles');
  54  |   await waitForE2EHooks(page);
  55  |   const r = await page.evaluate(() => (window as any).__coachCoreE2E.txGet('plays/legacy_v1_nn_missing'));
  56  |   expect(r, 'transactional read of a missing id (what the import does first)').toEqual({ ok: true, data: 'missing' });
  57  | });
  58  |
  59  | test('D10-01 accept: explicit consent copies every play exactly into the selected team, records the decision with the verified ids (ordering proven by D10-10), originals untouched', async ({ page }) => {
  60  |   const { uid, teamId } = await coachWithTeam(page, 'd10a', 'Alpha Eagles');
  61  |   await openPlaybook(page);
  62  |   const prompt = importPrompt(page);
  63  |   await expect(prompt).toContainText('Import 3 plays saved on this device into Alpha Eagles for this account?');
  64  |   expect(await adminCopies(uid), 'no import before consent').toEqual([]);
  65  |
  66  |   await acceptImport(page);
  67  |   await expect(page.getByRole('alert')).toHaveCount(0);
  68  |
  69  |   expectFaithfulCopies(await adminCopies(uid), uid, teamId);
  70  |   const decision = JSON.parse((await deviceState(page)).decisions[decisionKey(uid)]);
  71  |   expect(decision).toEqual({ decision: 'imported', teamId, ids: LEGACY_PLAYS.map((p) => expectedCopyId(uid, teamId, p)) });
  72  |   await expectOriginalsUntouched(page); // includes the standalone format: not converted, not touched
> 73  |   expect(await libraryNames(page)).toEqual(expect.arrayContaining(LEGACY_PLAYS.map((p) => p.name)));
      |                                    ^ Error: expect(received).toEqual(expected) // deep equality
  74  | });
  75  |
  76  | test('D10-02 decline: "Not now" writes nothing to the cloud and leaves originals byte-identical; no repeat prompt for that coach', async ({ page }) => {
  77  |   const { uid } = await coachWithTeam(page, 'd10b', 'Alpha Eagles');
  78  |   await openPlaybook(page);
  79  |   await importPrompt(page).getByRole('button', { name: 'Not now' }).click();
  80  |   await expect(importPrompt(page)).toHaveCount(0);
  81  |   expect(await adminCopies(uid)).toEqual([]);
  82  |   expect(JSON.parse((await deviceState(page)).decisions[decisionKey(uid)])).toEqual({ decision: 'declined' });
  83  |   await expectOriginalsUntouched(page);
  84  |   await page.reload();
  85  |   await openPlaybook(page);
  86  |   await expect(importPrompt(page)).toHaveCount(0);
  87  |   expect(await libraryNames(page)).not.toEqual(expect.arrayContaining(['Legacy Mesh']));
  88  | });
  89  |
  90  | test('D10-03 repeat import is idempotent: same IDs, no duplicates, existing copies not rewritten', async ({ page }) => {
  91  |   const { uid, teamId } = await coachWithTeam(page, 'd10c', 'Alpha Eagles');
  92  |   await openPlaybook(page);
  93  |   await acceptImport(page);
  94  |   const first = await adminCopies(uid);
  95  |   expect(first).toHaveLength(3);
  96  |
  97  |   // Simulate a lost acknowledgement: the decision never reached this device.
  98  |   await page.evaluate((k) => localStorage.removeItem(k), decisionKey(uid));
  99  |   await page.reload();
  100 |   await openPlaybook(page);
  101 |   await acceptImport(page);
  102 |   const second = await adminCopies(uid);
  103 |   expect(second.map((c) => [c.id, c.updateTime]).sort()).toEqual(first.map((c) => [c.id, c.updateTime]).sort());
  104 |   expectFaithfulCopies(second, uid, teamId);
  105 |   await expectOriginalsUntouched(page);
  106 | });
  107 |
  108 | test('D10-04 partial failure: commits fail mid-batch -> visible error, no decision, partial copies kept; retry completes without duplicates or rewrites', async ({ page }) => {
  109 |   const { uid, teamId } = await coachWithTeam(page, 'd10d', 'Alpha Eagles');
  110 |   const net = commitControl(page);
  111 |   await net.ready;
  112 |   net.failFrom(2); // first copy commits, every later commit fails (incl. SDK retries)
  113 |   await openPlaybook(page);
  114 |   await importPrompt(page).getByRole('button', { name: 'Import plays' }).click();
  115 |   await expect(importPrompt(page).getByRole('alert')).toContainText('Import not completed. Original plays preserved.', { timeout: 45_000 });
  116 |   const partial = await adminCopies(uid);
  117 |   expect(partial).toHaveLength(1);
  118 |   expect((await deviceState(page)).decisions[decisionKey(uid)]).toBeUndefined();
  119 |   await expectOriginalsUntouched(page);
  120 |
  121 |   net.pass();
  122 |   await acceptImport(page);
  123 |   const done = await adminCopies(uid);
  124 |   expectFaithfulCopies(done, uid, teamId);
  125 |   const kept = done.find((c) => c.id === partial[0].id)!;
  126 |   expect(kept.updateTime, 'the partial copy must not be rewritten on retry').toBe(partial[0].updateTime);
  127 |   expect(JSON.parse((await deviceState(page)).decisions[decisionKey(uid)]).decision).toBe('imported');
  128 | });
  129 |
  130 | test('D10-05 a copy changed elsewhere is never overwritten; import stops without acknowledging', async ({ page }) => {
  131 |   const { uid, teamId } = await coachWithTeam(page, 'd10e', 'Alpha Eagles');
  132 |   const id = expectedCopyId(uid, teamId, LEGACY_PLAYS[0]);
  133 |   const t = new Date('2025-08-01T15:30:00.123Z');
  134 |   await adminSet(`plays/${id}`, {
  135 |     name: 'Edited on another device', phase: 'offense', type: 'pass', localId: 'legacy-mesh', players: [], routes: [],
  136 |     teamId, createdBy: uid, revision: 2, createdAt: t, updatedAt: new Date(),
  137 |   });
  138 |   const before = await adminGet(`plays/${id}`);
  139 |   await openPlaybook(page);
  140 |   await importPrompt(page).getByRole('button', { name: 'Import plays' }).click();
  141 |   await expect(importPrompt(page).getByRole('alert')).toContainText('Import not completed', { timeout: 45_000 });
  142 |   expect(await adminGet(`plays/${id}`)).toEqual(before);
  143 |   expect((await deviceState(page)).decisions[decisionKey(uid)]).toBeUndefined();
  144 |   await expectOriginalsUntouched(page);
  145 | });
  146 |
  147 | test('D10-06 two coaches, one browser profile: coach B never sees or reads coach A\'s imported copies', async ({ page }) => {
  148 |   const a = await coachWithTeam(page, 'd10fa', 'Alpha Eagles');
  149 |   await openPlaybook(page);
  150 |   await acceptImport(page);
  151 |   await signOutViaUI(page);
  152 |
  153 |   const b = coachEmail('d10fb');
  154 |   await signInAsBetaCoach(page, b);
  155 |   await createTeamViaUI(page, 'Bravo Bulldogs');
  156 |   await openPlaybook(page);
  157 |   const names = await libraryNames(page);
  158 |   for (const p of LEGACY_PLAYS) expect(names).not.toContain(p.name); // A's cloud copies are not in B's library
  159 |   await waitForE2EHooks(page);
  160 |   const aCopy = expectedCopyId(a.uid, a.teamId, LEGACY_PLAYS[0]);
  161 |   expect(await page.evaluate((p) => (window as any).__coachCoreE2E.get(p), `plays/${aCopy}`))
  162 |     .toEqual({ ok: false, code: 'permission-denied' });
  163 |   await expectOriginalsUntouched(page);
  164 | });
  165 |
  166 | test('D10-06b [founder rule: no cross-account exposure / duplicates] device plays already imported by coach A are not offered to coach B', async ({ page }) => {
  167 |   await coachWithTeam(page, 'd10ga', 'Alpha Eagles');
  168 |   await openPlaybook(page);
  169 |   await acceptImport(page);
  170 |   await signOutViaUI(page);
  171 |
  172 |   await signInAsBetaCoach(page, coachEmail('d10gb'));
  173 |   await createTeamViaUI(page, 'Bravo Bulldogs');
```
