// D10 / P13: consent-based import of pre-account device plays (PR #55),
// real browser -> app -> Firestore emulator with the repo's rules.
// Founder rule (locked, 2026-10-13): explicit opt-in into the signed-in coach's
// selected authorized team; originals byte-for-byte; no duplicate imports or
// cross-account exposure; decline leaves originals unchanged; no deletion.
import { test, expect } from '@playwright/test';
import { resetEmulators, adminSet, adminGet, adminTeamsFull, AUTH_ONLY } from './support/emulator';
import {
  coachEmail, skipOnboarding, signInAsBetaCoach, signOutViaUI, createTeamViaUI, openTab,
  storage, waitForE2EHooks, awaitOwnedTeamReady,
} from './support/app';
import {
  LEGACY_PLAYS, seedDevice, deviceState, expectOriginalsUntouched, openPlaybook, importPrompt,
  adminCopies, expectLibraryContains, seedControlPlay, libraryNamesLoaded, commitControl, expectedCopyId, decisionKey, acceptImport,
} from './support/legacy';

test.beforeEach(async ({ context }) => {
  test.skip(AUTH_ONLY, 'needs the Firestore emulator');
  await resetEmulators();
  await skipOnboarding(context);
});

/** Coach with one owned team, on the Playbook tab with seeded device data. */
async function coachWithTeam(page: import('@playwright/test').Page, label: string, team: string) {
  await seedDevice(page);
  const email = coachEmail(label);
  const uid = await signInAsBetaCoach(page, email);
  await createTeamViaUI(page, team);
  const teamId = (await storage(page)).currentTeamId;
  expect(teamId).toBeTruthy();
  return { email, uid, teamId: teamId as string };
}

function expectFaithfulCopies(copies: Awaited<ReturnType<typeof adminCopies>>, uid: string, teamId: string) {
  expect(copies.map((c) => c.id).sort()).toEqual(LEGACY_PLAYS.map((p) => expectedCopyId(uid, teamId, p)).sort());
  for (const p of LEGACY_PLAYS) {
    const c = copies.find((x) => x.id === expectedCopyId(uid, teamId, p))!.data;
    expect(c).toMatchObject({
      name: p.name, type: p.type, localId: p.id, teamId, createdBy: uid, revision: 1,
      phase: p.phase === 'special' ? 'special_teams' : p.phase,
    });
    expect(c.players).toEqual(p.players); // every property, incl. extras
    expect(c.routes).toEqual(p.routes);
    if ('createdAt' in p) expect(Date.parse(c.createdAt)).toBe(Date.parse(p.createdAt as string));
    if ('updatedAt' in p) expect(Date.parse(c.updatedAt)).toBe(Date.parse(p.updatedAt as string));
    expect(Object.keys(c).sort()).toEqual(
      ['createdAt', 'createdBy', 'localId', 'name', 'phase', 'players', 'revision', 'routes', 'teamId', 'type', 'updatedAt'],
    );
  }
}

test('D10-00 [SDK-in-browser, diagnostic] a create-only transaction can check a not-yet-existing copy id', async ({ page }) => {
  await coachWithTeam(page, 'd10z', 'Alpha Eagles');
  await waitForE2EHooks(page);
  const r = await page.evaluate(() => (window as any).__coachCoreE2E.txGet('plays/legacy_v1_nn_missing'));
  expect(r, 'transactional read of a missing id (what the import does first)').toEqual({ ok: true, data: 'missing' });
});

test('D10-01 accept: explicit consent copies every play exactly into the selected team, records the decision with the verified ids (ordering proven by D10-10), originals untouched', async ({ page }) => {
  const { uid, teamId } = await coachWithTeam(page, 'd10a', 'Alpha Eagles');
  await openPlaybook(page);
  const prompt = importPrompt(page);
  await expect(prompt).toContainText('Import 3 plays saved on this device into Alpha Eagles for this account?');
  expect(await adminCopies(uid), 'no import before consent').toEqual([]);

  await acceptImport(page);
  await expect(page.getByRole('alert')).toHaveCount(0);

  expectFaithfulCopies(await adminCopies(uid), uid, teamId);
  const decision = JSON.parse((await deviceState(page)).decisions[decisionKey(uid)]);
  expect(decision).toEqual({ decision: 'imported', teamId, ids: LEGACY_PLAYS.map((p) => expectedCopyId(uid, teamId, p)) });
  await expectOriginalsUntouched(page); // includes the standalone format: not converted, not touched
  await expectLibraryContains(page, LEGACY_PLAYS.map((p) => p.name));
});

test('D10-02 decline: "Not now" writes nothing to the cloud and leaves originals byte-identical; no repeat prompt for that coach', async ({ page }) => {
  const { uid, teamId } = await coachWithTeam(page, 'd10b', 'Alpha Eagles');
  await openPlaybook(page);
  await importPrompt(page).getByRole('button', { name: 'Not now' }).click();
  await expect(importPrompt(page)).toHaveCount(0);
  expect(await adminCopies(uid)).toEqual([]);
  expect(JSON.parse((await deviceState(page)).decisions[decisionKey(uid)])).toEqual({ decision: 'declined' });
  await expectOriginalsUntouched(page);
  await seedControlPlay(uid, teamId); // positive anchor for the negative library check
  await page.reload();
  await openPlaybook(page);
  await expect(importPrompt(page)).toHaveCount(0);
  expect(await libraryNamesLoaded(page)).not.toEqual(expect.arrayContaining(['Legacy Mesh']));
});

test('D10-03 repeat import is idempotent: same IDs, no duplicates, existing copies not rewritten', async ({ page }) => {
  const { uid, teamId } = await coachWithTeam(page, 'd10c', 'Alpha Eagles');
  await openPlaybook(page);
  await acceptImport(page);
  const first = await adminCopies(uid);
  expect(first).toHaveLength(3);

  // Simulate a lost acknowledgement: the decision never reached this device.
  await page.evaluate((k) => localStorage.removeItem(k), decisionKey(uid));
  await page.reload();
  await openPlaybook(page);
  await acceptImport(page);
  const second = await adminCopies(uid);
  expect(second.map((c) => [c.id, c.updateTime]).sort()).toEqual(first.map((c) => [c.id, c.updateTime]).sort());
  expectFaithfulCopies(second, uid, teamId);
  await expectOriginalsUntouched(page);
});

test('D10-04 partial failure: commits fail mid-batch -> visible error, no decision, partial copies kept; retry completes without duplicates or rewrites', async ({ page }) => {
  const { uid, teamId } = await coachWithTeam(page, 'd10d', 'Alpha Eagles');
  const net = commitControl(page);
  await net.ready;
  net.failFrom(2); // first copy commits, every later commit fails (incl. SDK retries)
  await openPlaybook(page);
  await importPrompt(page).getByRole('button', { name: 'Import plays' }).click();
  await expect(importPrompt(page).getByRole('alert')).toContainText('Import not completed. Original plays preserved.', { timeout: 45_000 });
  const partial = await adminCopies(uid);
  expect(partial).toHaveLength(1);
  expect((await deviceState(page)).decisions[decisionKey(uid)]).toBeUndefined();
  await expectOriginalsUntouched(page);

  net.pass();
  await acceptImport(page);
  const done = await adminCopies(uid);
  expectFaithfulCopies(done, uid, teamId);
  const kept = done.find((c) => c.id === partial[0].id)!;
  expect(kept.updateTime, 'the partial copy must not be rewritten on retry').toBe(partial[0].updateTime);
  expect(JSON.parse((await deviceState(page)).decisions[decisionKey(uid)]).decision).toBe('imported');
});

test('D10-05 a copy changed elsewhere is never overwritten; import stops without acknowledging', async ({ page }) => {
  const { uid, teamId } = await coachWithTeam(page, 'd10e', 'Alpha Eagles');
  const id = expectedCopyId(uid, teamId, LEGACY_PLAYS[0]);
  const t = new Date('2025-08-01T15:30:00.123Z');
  await adminSet(`plays/${id}`, {
    name: 'Edited on another device', phase: 'offense', type: 'pass', localId: 'legacy-mesh', players: [], routes: [],
    teamId, createdBy: uid, revision: 2, createdAt: t, updatedAt: new Date(),
  });
  const before = await adminGet(`plays/${id}`);
  await openPlaybook(page);
  await importPrompt(page).getByRole('button', { name: 'Import plays' }).click();
  await expect(importPrompt(page).getByRole('alert')).toContainText('Import not completed', { timeout: 45_000 });
  expect(await adminGet(`plays/${id}`)).toEqual(before);
  expect((await deviceState(page)).decisions[decisionKey(uid)]).toBeUndefined();
  await expectOriginalsUntouched(page);
});

test('D10-06 two coaches, one browser profile: coach B never sees or reads coach A\'s imported copies', async ({ page }) => {
  const a = await coachWithTeam(page, 'd10fa', 'Alpha Eagles');
  await openPlaybook(page);
  await acceptImport(page);
  await signOutViaUI(page);

  const b = coachEmail('d10fb');
  const bUid = await signInAsBetaCoach(page, b);
  await createTeamViaUI(page, 'Bravo Bulldogs');
  await seedControlPlay(bUid, (await storage(page)).currentTeamId as string); // positive anchor: B's own library has loaded
  await openPlaybook(page);
  const names = await libraryNamesLoaded(page);
  for (const p of LEGACY_PLAYS) expect(names).not.toContain(p.name); // A's cloud copies are not in B's library
  await waitForE2EHooks(page);
  const aCopy = expectedCopyId(a.uid, a.teamId, LEGACY_PLAYS[0]);
  expect(await page.evaluate((p) => (window as any).__coachCoreE2E.get(p), `plays/${aCopy}`))
    .toEqual({ ok: false, code: 'permission-denied' });
  await expectOriginalsUntouched(page);
});

test('D10-06b [founder rule: no cross-account exposure / duplicates] device plays already imported by coach A are not offered to coach B', async ({ page }) => {
  await coachWithTeam(page, 'd10ga', 'Alpha Eagles');
  await openPlaybook(page);
  await acceptImport(page);
  await signOutViaUI(page);

  await signInAsBetaCoach(page, coachEmail('d10gb'));
  await createTeamViaUI(page, 'Bravo Bulldogs');
  await openPlaybook(page);
  // Acceptance criterion agreed in the R1 repair request (PR #55): a visible
  // notice is the positive anchor, so this cannot pass before the prompt renders.
  await expect(importPrompt(page), 'coach B must see the already-imported notice')
    .toContainText('already imported by another account');
  await expect(importPrompt(page).getByRole('button', { name: 'Import plays' }),
    'coach B must not be offered device plays coach A already imported').toHaveCount(0);
  await expectOriginalsUntouched(page);
});

test('D10-07 team switch while a copy is in flight: no acknowledgement, nothing written to the new team, stale completion discarded (5 s observation window)', async ({ page }) => {
  const { uid, teamId: alpha } = await coachWithTeam(page, 'd10h', 'Alpha Eagles');
  await createTeamViaUI(page, 'Bravo Bulldogs');
  const net = commitControl(page);
  await net.ready;
  net.holdFrom(2);
  await openPlaybook(page);
  await importPrompt(page).getByRole('button', { name: 'Import plays' }).click();
  await test.step('wait for copy #2 on the wire', () => net.waitFor(2)); // copy #2 is on the wire
  await openTab(page, 'Teams');
  await page.getByRole('button', { name: 'Switch to' }).click();
  const bravo = (await storage(page)).currentTeamId;
  expect(bravo).not.toBe(alpha);
  // Keep holding later commits, release only the in-flight copy #2, and wait
  // for it to land: the stale completion has now returned to the client.
  net.release();
  await expect.poll(async () => (await adminCopies(uid)).length).toBe(2);
  // Negative claim (the stale loop must not continue to copy #3 or record a
  // decision) needs an observation window; 5 s is documented, not a retry.
  await test.step('5 s observation window', () => new Promise((r) => setTimeout(r, 5_000)));
  expect(net.count(), 'no further commit after the stale completion').toBe(2);
  expect((await adminCopies(uid)).every((c) => c.data.teamId === alpha)).toBe(true);
  expect((await deviceState(page)).decisions[decisionKey(uid)], 'no decision after an interrupted import').toBeUndefined();
  net.pass(); net.release();
  await expectOriginalsUntouched(page);
});

test('D10-07b [founder rule: no duplicate imports] an import interrupted in team A is not silently re-offered as a fresh import into team B', async ({ page }) => {
  const { uid, teamId: alpha } = await coachWithTeam(page, 'd10i', 'Alpha Eagles');
  await createTeamViaUI(page, 'Bravo Bulldogs');
  const net = commitControl(page);
  await net.ready;
  net.holdFrom(2);
  await openPlaybook(page);
  await importPrompt(page).getByRole('button', { name: 'Import plays' }).click();
  await net.waitFor(2);
  await openTab(page, 'Teams');
  await page.getByRole('button', { name: 'Switch to' }).click();
  net.pass(); net.release();
  await expect.poll(async () => (await adminCopies(uid)).length).toBeGreaterThanOrEqual(1);
  await openPlaybook(page);
  // Acceptance criterion agreed in the R2 repair request (PR #55): in team B the
  // import region must be shown AND point back to the unfinished team (positive
  // anchor), and must not offer a fresh import into Bravo.
  const prompt = importPrompt(page);
  await expect(prompt, 'team B must show the unfinished-import notice').toContainText('Alpha Eagles');
  await expect(prompt.getByRole('button', { name: 'Import plays' }),
    'no fresh import into team B while the team A import is unfinished').toHaveCount(0);
  expect((await adminCopies(uid)).every((c) => c.data.teamId === alpha)).toBe(true);
});

test('D10-08 sign-out (the app reloads the page) while a copy is in flight, then a second coach signs in: nothing attributed to that coach', async ({ page }) => {
  const a = await coachWithTeam(page, 'd10ja', 'Alpha Eagles');
  const net = commitControl(page);
  await net.ready;
  net.holdFrom(2);
  await openPlaybook(page);
  await importPrompt(page).getByRole('button', { name: 'Import plays' }).click();
  await net.waitFor(2); // copy #2 is on the wire when coach A signs out
  await signOutViaUI(page); // the app reloads the page; the held request dies with it
  net.pass(); net.release();
  const uidB = await signInAsBetaCoach(page, coachEmail('d10jb'));
  await createTeamViaUI(page, 'Bravo Bulldogs');
  expect(await adminCopies(uidB), 'nothing created under coach B without B\'s consent').toEqual([]);
  expect((await adminCopies(a.uid)).every((c) => c.data.teamId === a.teamId && c.data.createdBy === a.uid)).toBe(true);
  expect((await deviceState(page)).decisions[decisionKey(a.uid)]).toBeUndefined();
  await expectOriginalsUntouched(page);
});

test('D10-09 [SDK-in-browser] cross-team denial with an authorized positive control', async ({ page, browser }) => {
  const a = await coachWithTeam(page, 'd10ka', 'Alpha Eagles');
  await openPlaybook(page);
  await acceptImport(page);

  const ctxB = await browser.newContext({ serviceWorkers: 'block' });
  try {
    await skipOnboarding(ctxB);
    const pb = await ctxB.newPage();
    const uidB = await signInAsBetaCoach(pb, coachEmail('d10kb'));
    await createTeamViaUI(pb, 'Bravo Bulldogs');
    const bravo = (await storage(pb)).currentTeamId as string;
    await waitForE2EHooks(pb);
    const hook = (fn: string, ...args: unknown[]) =>
      pb.evaluate(([f, x]) => (window as any).__coachCoreE2E[f as string](...(x as unknown[])), [fn, args] as const);
    const now = { __ts: new Date().toISOString() };
    const p = LEGACY_PLAYS[0];
    const body = (teamId: string) => ({ name: p.name, phase: 'offense', type: p.type, localId: p.id, players: p.players,
      routes: p.routes, teamId, createdBy: uidB, revision: 1, createdAt: now, updatedAt: now });
    const aCopy = expectedCopyId(a.uid, a.teamId, p);
    expect(await hook('get', `plays/${aCopy}`)).toEqual({ ok: false, code: 'permission-denied' });
    expect(await hook('update', `plays/${aCopy}`, { name: 'Hijack', revision: 2, updatedAt: now })).toEqual({ ok: false, code: 'permission-denied' });
    expect(await hook('set', `plays/${expectedCopyId(uidB, a.teamId, p)}`, body(a.teamId))).toEqual({ ok: false, code: 'permission-denied' });
    // Positive control: identical payload into B's own team is authorized.
    expect(await hook('set', `plays/${expectedCopyId(uidB, bravo, p)}`, body(bravo))).toEqual({ ok: true });
  } finally {
    await ctxB.close();
  }
  expectFaithfulCopies(await adminCopies(a.uid), a.uid, a.teamId);
});

test('D10-10 no acknowledgement until every copy verifies: with the last copy held, the decision is absent and the prompt stays', async ({ page }) => {
  const { uid } = await coachWithTeam(page, 'd10l', 'Alpha Eagles');
  const net = commitControl(page);
  await net.ready;
  net.holdFrom(3);
  await openPlaybook(page);
  await importPrompt(page).getByRole('button', { name: 'Import plays' }).click();
  await net.waitFor(3);
  await expect(importPrompt(page).getByRole('button', { name: 'Verifying copies…' })).toBeDisabled();
  expect((await deviceState(page)).decisions[decisionKey(uid)]).toBeUndefined();
  expect(await adminCopies(uid)).toHaveLength(2);
  net.pass(); net.release();
  await expect(importPrompt(page)).toHaveCount(0);
  expect(await adminCopies(uid)).toHaveLength(3);
  expect(JSON.parse((await deviceState(page)).decisions[decisionKey(uid)]).decision).toBe('imported');
});

test('D10-11 cloud reopen: a fresh browser profile with no device data shows the imported plays from the cloud with phase/type intact', async ({ page, browser }) => {
  const a = await coachWithTeam(page, 'd10m', 'Alpha Eagles');
  await openPlaybook(page);
  await acceptImport(page);

  const fresh = await browser.newContext({ serviceWorkers: 'block' });
  try {
    await skipOnboarding(fresh);
    const p2 = await fresh.newPage();
    await p2.goto('/');
    await p2.evaluate(() => localStorage.setItem('smartPlaybook_onboarding_complete', 'true'));
    await signInAsBetaCoach(p2, a.email);
    // Readiness anchor (2026-10-16, evidence 61: D10-11 1/10 Firefox, library empty after a fresh-profile
    // sign-in): identity readiness is not team readiness; the library is scoped to the selected team.
    await awaitOwnedTeamReady(p2, 'Alpha Eagles', a.uid);
    await openPlaybook(p2);
    await expect(importPrompt(p2)).toHaveCount(0); // nothing on this device to import
    await expectLibraryContains(p2, LEGACY_PLAYS.map((p) => p.name));
    await expect(p2.getByText('Phase: special | Type: punt')).toBeVisible(); // special_teams decoded back
    expect(await p2.evaluate(() => localStorage.getItem('smartPlaybook_plays'))).toBeNull();
  } finally {
    await fresh.close();
  }
});

test('D10-12 [R5] signed-in coach without an owned team: truthful block, no save action, nothing stored or uploaded', async ({ page }) => {
  await seedDevice(page);
  const email = coachEmail('d10n');
  const uid = await signInAsBetaCoach(page, email);
  await openTab(page, 'Smart Playbook');
  await expect(page.getByRole('alert')).toContainText('Select or create your authorized team before editing plays. No play has been saved.');
  await expect(page.getByRole('button', { name: 'Save Play', exact: true })).toHaveCount(0);
  await expect(importPrompt(page)).toHaveCount(0);
  expect(await adminCopies(uid)).toEqual([]);
  expect(Object.keys(await storage(page)).filter((k) => k.startsWith(`coachcore:v1:${uid}:`) && k.includes(':drafts'))).toEqual([]);
  await expectOriginalsUntouched(page);
});

test('D10-06c [founder rule: no cross-account exposure / duplicates] while coach A\'s import is unfinished, coach B on the same device is not offered the same plays', async ({ page }) => {
  await coachWithTeam(page, 'd10oa', 'Alpha Eagles');
  const net = commitControl(page); await net.ready; net.holdFrom(2);
  await openPlaybook(page);
  await importPrompt(page).getByRole('button', { name: 'Import plays' }).click();
  await net.waitFor(2); // A has 1 verified copy, copy 2 on the wire
  await signOutViaUI(page); // A's import is now unfinished
  net.pass(); net.release();
  await signInAsBetaCoach(page, coachEmail('d10ob'));
  await createTeamViaUI(page, 'Bravo Bulldogs');
  await openPlaybook(page);
  // Positive anchor: the import region must explain why B cannot import.
  await expect(importPrompt(page), 'coach B must see a notice about the other account\'s import').toBeVisible();
  await expect(importPrompt(page).getByRole('button', { name: 'Import plays' }),
    'coach B must not be offered device plays coach A started importing').toHaveCount(0);
  await expectOriginalsUntouched(page);
});

// R1c probe (verifier follow-up, 2026-10-14). It does not prescribe the fix,
// which Codex owns: it only requires that declining an unfinished import does
// not leave the device library in a state NO account can act on.
test('D10-06d [founder rule: originals preserved, no dead end] after coach A declines ("Not now") an interrupted import, some account can still act on the device plays', async ({ page }) => {
  await coachWithTeam(page, 'd10da', 'Alpha Eagles');
  const net = commitControl(page); await net.ready; net.holdFrom(2);
  await openPlaybook(page);
  await importPrompt(page).getByRole('button', { name: 'Import plays' }).click();
  await net.waitFor(2); // A has 1 verified copy, copy 2 on the wire
  await page.reload();  // import interrupted (tab refreshed); A is still signed in on Alpha
  net.pass(); net.release();
  await openPlaybook(page);
  // Positive anchor: A, on the original team, is offered the unfinished import again.
  await expect(importPrompt(page).getByRole('button', { name: 'Import plays' })).toBeVisible();
  await importPrompt(page).getByRole('button', { name: 'Not now' }).click();
  await page.reload();
  await openPlaybook(page);
  // 5 s observation window for A's offer (the prompt renders in milliseconds when present).
  const aOffered = await importPrompt(page).getByRole('button', { name: 'Import plays' })
    .waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false);
  await signOutViaUI(page);
  await signInAsBetaCoach(page, coachEmail('d10db'));
  await createTeamViaUI(page, 'Bravo Bulldogs');
  await openPlaybook(page);
  await expect(importPrompt(page), 'coach B must see the import region (offer or notice)').toBeVisible();
  const bOffered = (await importPrompt(page).getByRole('button', { name: 'Import plays' }).count()) > 0;
  const bNotice = await importPrompt(page).innerText();
  expect(aOffered || bOffered,
    `dead end: A re-offered=${aOffered}; B offered=${bOffered}; B sees "${bNotice.replace(/\s+/g, ' ').trim()}"`).toBe(true);
  await expectOriginalsUntouched(page);
});

// R1c acceptance with positive anchors (founder guidance, 2026-10-14: "Not now"
// postpones an unfinished import and leaves a clear recovery path for the
// original coach and team; ownership protections, originals and verified
// completion preserved). D10-06d above is kept unchanged as the original probe.
test('D10-06e [founder rule: R1c recovery] "Not now" postpones an unfinished import; the original coach and team can resume and finish with verified copies; another coach stays blocked; originals untouched', async ({ page }) => {
  const a = await coachWithTeam(page, 'd10ea', 'Alpha Eagles');
  const net = commitControl(page); await net.ready; net.holdFrom(2);
  await openPlaybook(page);
  await importPrompt(page).getByRole('button', { name: 'Import plays' }).click();
  await test.step('wait for copy #2 on the wire', () => net.waitFor(2)); // 1 verified copy
  await page.reload(); // import interrupted
  net.pass(); net.release();
  await openPlaybook(page);
  await expect(importPrompt(page).getByRole('button', { name: 'Import plays' })).toBeVisible();
  await importPrompt(page).getByRole('button', { name: 'Not now' }).click();
  // 1. Postponed, with a visible way back, and no permanent decline recorded.
  await expect(importPrompt(page)).toContainText('Unfinished import postponed');
  await expect(importPrompt(page).getByRole('button', { name: 'Resume import' })).toBeVisible();
  expect((await deviceState(page)).decisions[decisionKey(a.uid)], 'postpone must not record a decline').toBeUndefined();
  await importPrompt(page).getByRole('button', { name: 'Resume import' }).click();
  await expect(importPrompt(page).getByRole('button', { name: 'Import plays' })).toBeVisible();
  // 2. After a reload the original coach on the original team is offered it again.
  await page.reload();
  await openPlaybook(page);
  await expect(importPrompt(page).getByRole('button', { name: 'Import plays' }), 'owner re-offered after reload').toBeVisible();
  await expectOriginalsUntouched(page);
  // 3. Another coach on this device is still blocked (R1b) and sees why.
  await signOutViaUI(page);
  await signInAsBetaCoach(page, coachEmail('d10eb'));
  await createTeamViaUI(page, 'Bravo Bulldogs');
  await openPlaybook(page);
  await expect(importPrompt(page)).toContainText('unfinished import by another account');
  await expect(importPrompt(page).getByRole('button', { name: 'Import plays' })).toHaveCount(0);
  await expectOriginalsUntouched(page);
  // 4. The original coach returns, resumes, and finishes: exactly the verified copies, no duplicates.
  await signOutViaUI(page);
  await signInAsBetaCoach(page, a.email);
  // Readiness anchor (2026-10-16, evidence 52 + Codex trace of run 38842101522): Welcome is identity
  // readiness, not team readiness. Wait for the identity strip to show the exact original team
  // (existing expect timeout, no sleep), then assert the exact original ID as before.
  await awaitOwnedTeamReady(page, 'Alpha Eagles', a.uid);
  // A3 diagnostic (2026-10-15): kept so a mismatch AFTER readiness is fully described.
  const selectedOnReturn = (await storage(page)).currentTeamId;
  if (selectedOnReturn !== a.teamId) {
    const aTeams = (await adminTeamsFull(a.uid)).map((t) => ({ id: t.id, name: t.name }));
    const visible = await page.getByRole('heading').allInnerTexts().catch(() => []);
    const again = await new Promise((r) => setTimeout(r, 1_500)).then(() => storage(page)).then((st) => st.currentTeamId);
    test.info().annotations.push({ type: 'diag-data', description: `D10-06e@425 selected=${JSON.stringify(selectedOnReturn)} expected=${a.teamId} after1.5s=${JSON.stringify(again)} aTeamsOnServer=${JSON.stringify(aTeams)} headings=${JSON.stringify(visible.slice(0, 8))}` });
  }
  expect(selectedOnReturn, 'original team selected').toBe(a.teamId);
  await openPlaybook(page);
  await acceptImport(page);
  expectFaithfulCopies(await adminCopies(a.uid), a.uid, a.teamId);
  const decision = JSON.parse((await deviceState(page)).decisions[decisionKey(a.uid)]);
  expect(decision).toEqual({ decision: 'imported', teamId: a.teamId, ids: LEGACY_PLAYS.map((p) => expectedCopyId(a.uid, a.teamId, p)) });
  await expectOriginalsUntouched(page);
});

// ---------------------------------------------------------------------------
// PR #72 (runtime 35e0d77, Codex): an older, status-less device claim written by the
// pre-repair producer no longer masks a matching pending import after a prior decline;
// recovery is limited to the claim's own account AND team. Independent acceptance
// (Claude, 2026-10-16). Seeds exactly the old producer's state; assertions reuse the
// D10 fixtures (deterministic copy IDs, byte-identical originals, verified readback).
// Expected on the pre-repair runtime 518e9e5: D10-08a FAILS (no resume prompt).
// ---------------------------------------------------------------------------
const CLAIM_KEY = 'coachcore:v1:legacyImportClaim';
const pendingKey = (uid: string) => `coachcore:v1:${uid}:legacyImportPending`;
/** Old producer state: status-less claim + per-account pending marker + a recorded decline. */
async function seedStatusLessClaim(page: import('@playwright/test').Page, uid: string, teamId: string, teamName: string) {
  await page.evaluate(([ck, pk, dk, u, t, n]) => {
    localStorage.setItem(ck, JSON.stringify({ uid: u, teamId: t, teamName: n })); // no status field
    localStorage.setItem(pk, JSON.stringify({ teamId: t, teamName: n, startedAt: '2026-10-10T12:00:00.000Z' }));
    localStorage.setItem(dk, JSON.stringify({ decision: 'declined' }));
  }, [CLAIM_KEY, pendingKey(uid), decisionKey(uid), uid, teamId, teamName]);
  await page.reload();
}

test('D10-08a [PR #72] status-less claim + matching pending + prior decline: the original coach on the original team is offered the resume and finishes with exact verified copies; originals untouched', async ({ page }) => {
  const a = await coachWithTeam(page, 'd10ha', 'Alpha Eagles');
  await seedStatusLessClaim(page, a.uid, a.teamId, 'Alpha Eagles');
  await awaitOwnedTeamReady(page, 'Alpha Eagles', a.uid);
  await openPlaybook(page);
  await expect(importPrompt(page).getByRole('button', { name: 'Import plays' }), 'resume offered to the original coach/team').toBeVisible();
  expect(await adminCopies(a.uid), 'nothing copied before consent').toEqual([]);
  await acceptImport(page);
  expectFaithfulCopies(await adminCopies(a.uid), a.uid, a.teamId);
  const state = await deviceState(page);
  expect(JSON.parse(state.decisions[decisionKey(a.uid)])).toEqual({ decision: 'imported', teamId: a.teamId, ids: LEGACY_PLAYS.map((p) => expectedCopyId(a.uid, a.teamId, p)) });
  const claim = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), CLAIM_KEY);
  expect(claim).toMatchObject({ uid: a.uid, teamId: a.teamId, status: 'imported' });
  expect(await page.evaluate((k) => localStorage.getItem(k), pendingKey(a.uid)), 'pending marker cleared').toBeNull();
  await expectOriginalsUntouched(page);
  // Idempotent: a second visit offers nothing and copies nothing more.
  await page.reload(); await openPlaybook(page);
  await expect(importPrompt(page).getByRole('button', { name: 'Import plays' })).toHaveCount(0);
  expectFaithfulCopies(await adminCopies(a.uid), a.uid, a.teamId);
});

test('D10-08b [PR #72] status-less claim for a DIFFERENT team of the same coach: no resume on this team; nothing copied; originals untouched', async ({ page }) => {
  const a = await coachWithTeam(page, 'd10hb', 'Alpha Eagles');
  await seedStatusLessClaim(page, a.uid, 'OtherTeam000000000000', 'Old Team');
  await awaitOwnedTeamReady(page, 'Alpha Eagles', a.uid);
  await openPlaybook(page);
  await expect(importPrompt(page)).toContainText('An import into Old Team was started and not finished');
  await expect(importPrompt(page).getByRole('button', { name: 'Import plays' })).toHaveCount(0);
  await new Promise((r) => setTimeout(r, 2_000));
  expect(await adminCopies(a.uid)).toEqual([]);
  await expectOriginalsUntouched(page);
});

test('D10-08c [PR #72] status-less claim of coach A: another coach B on the same device is blocked, sees why, copies nothing under B; A\'s claim and originals untouched', async ({ page }) => {
  const a = await coachWithTeam(page, 'd10hc', 'Alpha Eagles');
  await seedStatusLessClaim(page, a.uid, a.teamId, 'Alpha Eagles');
  await awaitOwnedTeamReady(page, 'Alpha Eagles', a.uid);
  const claimBefore = await page.evaluate((k) => localStorage.getItem(k), CLAIM_KEY);
  await signOutViaUI(page);
  const bUid = await signInAsBetaCoach(page, coachEmail('d10hcb'));
  await createTeamViaUI(page, 'Bravo Bulldogs');
  await openPlaybook(page);
  await expect(importPrompt(page)).toContainText(/another account/);
  await expect(importPrompt(page).getByRole('button', { name: 'Import plays' })).toHaveCount(0);
  await new Promise((r) => setTimeout(r, 2_000));
  expect(await adminCopies(bUid), 'nothing under B').toEqual([]);
  expect(await adminCopies(a.uid), 'nothing under A either').toEqual([]);
  expect(await page.evaluate((k) => localStorage.getItem(k), CLAIM_KEY), 'A\'s claim untouched').toBe(claimBefore);
  await expectOriginalsUntouched(page);
});

test('D10-08d [PR #72] resume with a mismatching server copy at the deterministic ID: no success, no overwrite, claim stays pending, originals untouched', async ({ page }) => {
  const a = await coachWithTeam(page, 'd10hd', 'Alpha Eagles');
  await seedStatusLessClaim(page, a.uid, a.teamId, 'Alpha Eagles');
  await awaitOwnedTeamReady(page, 'Alpha Eagles', a.uid);
  // A different document already occupies the first play's deterministic copy ID (same owner/team).
  const id = expectedCopyId(a.uid, a.teamId, LEGACY_PLAYS[0]);
  const t = new Date();
  await adminSet(`plays/${id}`, { name: 'Tampered copy', phase: 'offense', type: 'run', localId: LEGACY_PLAYS[0].id, players: [], routes: [], teamId: a.teamId, createdBy: a.uid, createdAt: t, updatedAt: t });
  const before = await adminGet(`plays/${id}`);
  await openPlaybook(page);
  await expect(importPrompt(page).getByRole('button', { name: 'Import plays' })).toBeVisible();
  let outcome = 'RESOLVED (prompt closed as if successful)';
  try { await acceptImport(page); } catch (e) { outcome = (e as Error).message; }
  const after = await adminGet(`plays/${id}`);
  const copies = await adminCopies(a.uid);
  const claimNow = await page.evaluate((k) => localStorage.getItem(k), CLAIM_KEY);
  test.info().annotations.push({ type: 'diag-data', description: `D10-08d outcome="${outcome.slice(0, 160)}" tamperedUnchanged=${JSON.stringify(after) === JSON.stringify(before)} copies=${JSON.stringify(copies.map((c: any) => ({ id: String(c.id).slice(-8), name: c.name ?? c.data?.name })))} claim=${String(claimNow).slice(0, 120)} alerts=${JSON.stringify((await page.getByRole('alert').allInnerTexts()).map((t) => t.slice(0, 100)))}` });
  // The UI maps the gateway's reason ('Imported copy changed elsewhere…') to one coach-facing message; the
  // specific reason is not shown (observation for Codex). Any of these is an error, never success.
  expect(outcome, 'import must surface an error, not success').toMatch(/Import not completed|changed elsewhere|could not be verified|does not match|Original plays preserved/);
  expect(outcome).not.toMatch(/^RESOLVED/);
  expect(after, 'the existing document is not overwritten').toEqual(before);
  const decision = (await deviceState(page)).decisions[decisionKey(a.uid)];
  expect(JSON.parse(decision).decision, 'no imported decision recorded').not.toBe('imported');
  const claim = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), CLAIM_KEY);
  expect(claim).toMatchObject({ uid: a.uid, teamId: a.teamId, status: 'pending' });
  await expectOriginalsUntouched(page);
});
