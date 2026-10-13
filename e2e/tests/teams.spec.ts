// Account-scoped cloud data that exists in the client today: teams.
// Requires the Firestore emulator (runs in CI; see e2e/README.md).
import { test, expect } from '@playwright/test';
import { resetEmulators, adminTeamsOwnedBy, AUTH_ONLY } from './support/emulator';
import {
  coachEmail, skipOnboarding, signInAsBetaCoach, signOutViaUI, createTeamViaUI,
  openTab, storage, waitForE2EHooks, dashboardFor,
} from './support/app';

test.skip(AUTH_ONLY, 'needs the Firestore emulator');

test.beforeEach(async ({ context }) => {
  await resetEmulators();
  await skipOnboarding(context);
});

test('E2E-T01 cloud save/reopen: a team created in the UI is in Firestore and reopens on a fresh device', async ({ page, browser }) => {
  const email = coachEmail('t01');
  const uid = await signInAsBetaCoach(page, email);
  await createTeamViaUI(page, 'Alpha Eagles');
  await expect.poll(() => adminTeamsOwnedBy(uid)).toEqual([expect.objectContaining({ name: 'Alpha Eagles' })]);

  // Fresh browser profile = new device with empty local storage.
  const device2 = await browser.newContext({ serviceWorkers: 'block' });
  try {
    await skipOnboarding(device2);
    const p2 = await device2.newPage();
    await signInAsBetaCoach(p2, email);
    await openTab(p2, 'Teams');
    await expect(p2.getByRole('heading', { name: 'Alpha Eagles' })).toBeVisible();
  } finally {
    await device2.close();
  }
});

test('E2E-T02 account switching on one browser profile shows each coach only their own team', async ({ page }) => {
  const a = coachEmail('t02a');
  const b = coachEmail('t02b');
  await signInAsBetaCoach(page, a);
  await createTeamViaUI(page, 'Alpha Eagles');
  const alphaId = (await storage(page)).currentTeamId;
  expect(alphaId).toBeTruthy();
  await signOutViaUI(page);
  expect((await storage(page)).currentTeamId).toBeUndefined();

  const uidB = await signInAsBetaCoach(page, b);
  await openTab(page, 'Teams');
  await expect(page.getByText('No team selected')).toBeVisible();
  await expect(page.getByText('Alpha Eagles')).toHaveCount(0);
  await createTeamViaUI(page, 'Bravo Bulldogs');
  expect((await storage(page)).currentTeamId).not.toBe(alphaId);
  await expect.poll(() => adminTeamsOwnedBy(uidB)).toEqual([expect.objectContaining({ name: 'Bravo Bulldogs' })]);
  await signOutViaUI(page);

  await signInAsBetaCoach(page, a);
  await openTab(page, 'Teams');
  await expect(page.getByRole('heading', { name: 'Alpha Eagles' })).toBeVisible();
  await expect(page.getByText('Bravo Bulldogs')).toHaveCount(0);
});

test('E2E-T03 [SDK-in-browser] coach B is denied coach A\'s team and cannot write into it', async ({ page, browser }) => {
  const a = coachEmail('t03a');
  const uidA = await signInAsBetaCoach(page, a);
  await createTeamViaUI(page, 'Alpha Eagles');
  await expect.poll(async () => (await adminTeamsOwnedBy(uidA)).length).toBe(1);
  const alphaId = (await adminTeamsOwnedBy(uidA))[0].id;

  const ctxB = await browser.newContext({ serviceWorkers: 'block' });
  try {
    await skipOnboarding(ctxB);
    const pb = await ctxB.newPage();
    const b = coachEmail('t03b');
    const uidB = await signInAsBetaCoach(pb, b);
    await waitForE2EHooks(pb);
    const hooks = (fn: string, ...args: unknown[]) =>
      pb.evaluate(([f, a2]) => (window as any).__coachCoreE2E[f as string](...(a2 as unknown[])), [fn, args] as const);
    const now = { __ts: new Date().toISOString() };

    expect(await hooks('get', `teams/${alphaId}`)).toEqual({ ok: false, code: 'permission-denied' });
    expect(await hooks('update', `teams/${alphaId}`, { name: 'Hijacked', updatedAt: now }))
      .toEqual({ ok: false, code: 'permission-denied' });
    expect(await hooks('set', 'plays/injected', {
      name: 'Injected', teamId: alphaId, createdBy: uidB, createdAt: now, updatedAt: now, revision: 1,
    })).toEqual({ ok: false, code: 'permission-denied' });
    expect(await hooks('set', 'practicePlans/injected', {
      name: 'Injected', teamId: alphaId, createdBy: uidB, createdAt: now, updatedAt: now, revision: 1,
    })).toEqual({ ok: false, code: 'permission-denied' });
    await expect(dashboardFor(pb, b)).toBeVisible();
    await expect(pb.getByText('Alpha Eagles')).toHaveCount(0);
  } finally {
    await ctxB.close();
  }
  // A's team is untouched.
  expect(await adminTeamsOwnedBy(uidA)).toEqual([{ id: alphaId, name: 'Alpha Eagles' }]);
});
