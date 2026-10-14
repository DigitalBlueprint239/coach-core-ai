# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: legacy-import.spec.ts >> D10-07 team switch while a copy is in flight: no acknowledgement, nothing written to the new team, stale completion discarded (5 s observation window)
- Location: e2e\tests\legacy-import.spec.ts:184:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Switch to' })

```

# Page snapshot

```yaml
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
          - generic [ref=f2e20]: Welcome, d10h-mv8msurt-35@e2e.coachcore.test
          - button "Sign out" [ref=f2e21]
    - navigation [ref=f2e22]:
      - generic [ref=f2e24]:
        - button "📊Overview" [ref=f2e25]
        - button "👥Teams" [active] [ref=f2e26]
        - button "📋Practice Plans" [ref=f2e27]
        - button "🏈Smart Playbook" [ref=f2e28]
        - button "📈Analytics" [ref=f2e29]
    - main [ref=f2e30]:
      - generic [ref=f2e31]:
        - generic [ref=f2e32]:
          - heading "Team Management" [level=2] [ref=f2e33]
          - generic [ref=f2e34]:
            - button "Create Team" [ref=f2e35]
            - button "Join Team" [ref=f2e36]
        - generic [ref=f2e38]:
          - heading "Current Team" [level=3] [ref=f2e39]
          - generic [ref=f2e42]:
            - heading "Alpha Eagles" [level=4] [ref=f2e43]
            - paragraph [ref=f2e44]: "Code: GHMSHQ7U"
            - paragraph [ref=f2e45]: 1 member
```

# Test source

```ts
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
  174 |   await openPlaybook(page);
  175 |   // Acceptance criterion agreed in the R1 repair request (PR #55): a visible
  176 |   // notice is the positive anchor, so this cannot pass before the prompt renders.
  177 |   await expect(importPrompt(page), 'coach B must see the already-imported notice')
  178 |     .toContainText('already imported by another account');
  179 |   await expect(importPrompt(page).getByRole('button', { name: 'Import plays' }),
  180 |     'coach B must not be offered device plays coach A already imported').toHaveCount(0);
  181 |   await expectOriginalsUntouched(page);
  182 | });
  183 |
  184 | test('D10-07 team switch while a copy is in flight: no acknowledgement, nothing written to the new team, stale completion discarded (5 s observation window)', async ({ page }) => {
  185 |   const { uid, teamId: alpha } = await coachWithTeam(page, 'd10h', 'Alpha Eagles');
  186 |   await createTeamViaUI(page, 'Bravo Bulldogs');
  187 |   const net = commitControl(page);
  188 |   await net.ready;
  189 |   net.holdFrom(2);
  190 |   await openPlaybook(page);
  191 |   await importPrompt(page).getByRole('button', { name: 'Import plays' }).click();
  192 |   await net.waitFor(2); // copy #2 is on the wire
  193 |   await openTab(page, 'Teams');
> 194 |   await page.getByRole('button', { name: 'Switch to' }).click();
      |                                                         ^ Error: locator.click: Test timeout of 60000ms exceeded.
  195 |   const bravo = (await storage(page)).currentTeamId;
  196 |   expect(bravo).not.toBe(alpha);
  197 |   // Keep holding later commits, release only the in-flight copy #2, and wait
  198 |   // for it to land: the stale completion has now returned to the client.
  199 |   net.release();
  200 |   await expect.poll(async () => (await adminCopies(uid)).length).toBe(2);
  201 |   // Negative claim (the stale loop must not continue to copy #3 or record a
  202 |   // decision) needs an observation window; 5 s is documented, not a retry.
  203 |   await new Promise((r) => setTimeout(r, 5_000));
  204 |   expect(net.count(), 'no further commit after the stale completion').toBe(2);
  205 |   expect((await adminCopies(uid)).every((c) => c.data.teamId === alpha)).toBe(true);
  206 |   expect((await deviceState(page)).decisions[decisionKey(uid)], 'no decision after an interrupted import').toBeUndefined();
  207 |   net.pass(); net.release();
  208 |   await expectOriginalsUntouched(page);
  209 | });
  210 |
  211 | test('D10-07b [founder rule: no duplicate imports] an import interrupted in team A is not silently re-offered as a fresh import into team B', async ({ page }) => {
  212 |   const { uid, teamId: alpha } = await coachWithTeam(page, 'd10i', 'Alpha Eagles');
  213 |   await createTeamViaUI(page, 'Bravo Bulldogs');
  214 |   const net = commitControl(page);
  215 |   await net.ready;
  216 |   net.holdFrom(2);
  217 |   await openPlaybook(page);
  218 |   await importPrompt(page).getByRole('button', { name: 'Import plays' }).click();
  219 |   await net.waitFor(2);
  220 |   await openTab(page, 'Teams');
  221 |   await page.getByRole('button', { name: 'Switch to' }).click();
  222 |   net.pass(); net.release();
  223 |   await expect.poll(async () => (await adminCopies(uid)).length).toBeGreaterThanOrEqual(1);
  224 |   await openPlaybook(page);
  225 |   // Acceptance criterion agreed in the R2 repair request (PR #55): in team B the
  226 |   // import region must be shown AND point back to the unfinished team (positive
  227 |   // anchor), and must not offer a fresh import into Bravo.
  228 |   const prompt = importPrompt(page);
  229 |   await expect(prompt, 'team B must show the unfinished-import notice').toContainText('Alpha Eagles');
  230 |   await expect(prompt.getByRole('button', { name: 'Import plays' }),
  231 |     'no fresh import into team B while the team A import is unfinished').toHaveCount(0);
  232 |   expect((await adminCopies(uid)).every((c) => c.data.teamId === alpha)).toBe(true);
  233 | });
  234 |
  235 | test('D10-08 sign-out (the app reloads the page) while a copy is in flight, then a second coach signs in: nothing attributed to that coach', async ({ page }) => {
  236 |   const a = await coachWithTeam(page, 'd10ja', 'Alpha Eagles');
  237 |   const net = commitControl(page);
  238 |   await net.ready;
  239 |   net.holdFrom(2);
  240 |   await openPlaybook(page);
  241 |   await importPrompt(page).getByRole('button', { name: 'Import plays' }).click();
  242 |   await net.waitFor(2); // copy #2 is on the wire when coach A signs out
  243 |   await signOutViaUI(page); // the app reloads the page; the held request dies with it
  244 |   net.pass(); net.release();
  245 |   const uidB = await signInAsBetaCoach(page, coachEmail('d10jb'));
  246 |   await createTeamViaUI(page, 'Bravo Bulldogs');
  247 |   expect(await adminCopies(uidB), 'nothing created under coach B without B\'s consent').toEqual([]);
  248 |   expect((await adminCopies(a.uid)).every((c) => c.data.teamId === a.teamId && c.data.createdBy === a.uid)).toBe(true);
  249 |   expect((await deviceState(page)).decisions[decisionKey(a.uid)]).toBeUndefined();
  250 |   await expectOriginalsUntouched(page);
  251 | });
  252 |
  253 | test('D10-09 [SDK-in-browser] cross-team denial with an authorized positive control', async ({ page, browser }) => {
  254 |   const a = await coachWithTeam(page, 'd10ka', 'Alpha Eagles');
  255 |   await openPlaybook(page);
  256 |   await acceptImport(page);
  257 |
  258 |   const ctxB = await browser.newContext({ serviceWorkers: 'block' });
  259 |   try {
  260 |     await skipOnboarding(ctxB);
  261 |     const pb = await ctxB.newPage();
  262 |     const uidB = await signInAsBetaCoach(pb, coachEmail('d10kb'));
  263 |     await createTeamViaUI(pb, 'Bravo Bulldogs');
  264 |     const bravo = (await storage(pb)).currentTeamId as string;
  265 |     await waitForE2EHooks(pb);
  266 |     const hook = (fn: string, ...args: unknown[]) =>
  267 |       pb.evaluate(([f, x]) => (window as any).__coachCoreE2E[f as string](...(x as unknown[])), [fn, args] as const);
  268 |     const now = { __ts: new Date().toISOString() };
  269 |     const p = LEGACY_PLAYS[0];
  270 |     const body = (teamId: string) => ({ name: p.name, phase: 'offense', type: p.type, localId: p.id, players: p.players,
  271 |       routes: p.routes, teamId, createdBy: uidB, revision: 1, createdAt: now, updatedAt: now });
  272 |     const aCopy = expectedCopyId(a.uid, a.teamId, p);
  273 |     expect(await hook('get', `plays/${aCopy}`)).toEqual({ ok: false, code: 'permission-denied' });
  274 |     expect(await hook('update', `plays/${aCopy}`, { name: 'Hijack', revision: 2, updatedAt: now })).toEqual({ ok: false, code: 'permission-denied' });
  275 |     expect(await hook('set', `plays/${expectedCopyId(uidB, a.teamId, p)}`, body(a.teamId))).toEqual({ ok: false, code: 'permission-denied' });
  276 |     // Positive control: identical payload into B's own team is authorized.
  277 |     expect(await hook('set', `plays/${expectedCopyId(uidB, bravo, p)}`, body(bravo))).toEqual({ ok: true });
  278 |   } finally {
  279 |     await ctxB.close();
  280 |   }
  281 |   expectFaithfulCopies(await adminCopies(a.uid), a.uid, a.teamId);
  282 | });
  283 |
  284 | test('D10-10 no acknowledgement until every copy verifies: with the last copy held, the decision is absent and the prompt stays', async ({ page }) => {
  285 |   const { uid } = await coachWithTeam(page, 'd10l', 'Alpha Eagles');
  286 |   const net = commitControl(page);
  287 |   await net.ready;
  288 |   net.holdFrom(3);
  289 |   await openPlaybook(page);
  290 |   await importPrompt(page).getByRole('button', { name: 'Import plays' }).click();
  291 |   await net.waitFor(3);
  292 |   await expect(importPrompt(page).getByRole('button', { name: 'Verifying copies…' })).toBeDisabled();
  293 |   expect((await deviceState(page)).decisions[decisionKey(uid)]).toBeUndefined();
  294 |   expect(await adminCopies(uid)).toHaveLength(2);
```
