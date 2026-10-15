// Persistence contract v1 (docs/security/PERSISTENCE_CONTRACT.md) in real browsers.
//
// What runs today: the server-side half of concurrent-edit protection, driven
// through the app's own Firebase SDK session in two browser contexts (two
// devices of one coach). It is labelled SDK-in-browser and is NOT a UI workflow.
//
// P13 (D10 legacy import) is now real: e2e/tests/legacy-import.spec.ts.
// Formerly BLOCKED client workflows (P10-P17) were declared here with
// test.fixme so they appeared in every run as BLOCKED with their dependency,
// and the reporter never counts them as passed.
import { test, expect, type Page } from '@playwright/test';
import { resetEmulators, adminSet, adminGet, AUTH_ONLY } from './support/emulator';
import { coachEmail, skipOnboarding, signInAsBetaCoach, waitForE2EHooks } from './support/app';

test.beforeEach(async ({ context }) => {
  test.skip(AUTH_ONLY, 'needs the Firestore emulator');
  await resetEmulators();
  await skipOnboarding(context);
});

const hook = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (window as any).__coachCoreE2E[f as string](...(a as unknown[])), [fn, args] as const);

test('E2E-C01 [SDK-in-browser] two devices edit the same play: the stale second save is rejected, nothing is overwritten', async ({ page, browser }) => {
  const email = coachEmail('c01');
  const uid = await signInAsBetaCoach(page, email);
  const t = new Date('2026-10-13T12:00:00Z');
  await adminSet('teams/team-c01', { name: 'C01', code: 'C01CODE1', ownerId: uid, memberIds: [uid], createdAt: t, updatedAt: t });
  await adminSet('plays/play-c01', {
    name: 'Mesh', phase: 'offense', type: 'pass', revision: 1,
    players: [{ id: 'p1', x: 10, y: 20 }], routes: [],
    teamId: 'team-c01', createdBy: uid, createdAt: t, updatedAt: t,
  });

  const device2 = await browser.newContext({ serviceWorkers: 'block' });
  try {
    await skipOnboarding(device2);
    const p2 = await device2.newPage();
    await signInAsBetaCoach(p2, email);
    await waitForE2EHooks(page);
    await waitForE2EHooks(p2);
    // Both devices loaded revision 1.
    expect((await hook(page, 'get', 'plays/play-c01')).data.revision).toBe(1);
    expect((await hook(p2, 'get', 'plays/play-c01')).data.revision).toBe(1);
    const now = { __ts: new Date().toISOString() };
    expect(await hook(page, 'update', 'plays/play-c01', { name: 'Device 1 edit', revision: 2, updatedAt: now }))
      .toEqual({ ok: true });
    expect(await hook(p2, 'update', 'plays/play-c01', { name: 'Device 2 stale edit', revision: 2, updatedAt: now }))
      .toEqual({ ok: false, code: 'permission-denied' });
    // Omitting the revision is not a way around it.
    expect(await hook(p2, 'update', 'plays/play-c01', { name: 'No revision', updatedAt: now }))
      .toEqual({ ok: false, code: 'permission-denied' });
  } finally {
    await device2.close();
  }
  // Exactly device 1's edit is stored; every other field is unchanged.
  const stored = await adminGet('plays/play-c01');
  expect(stored).toEqual({
    name: 'Device 1 edit', phase: 'offense', type: 'pass', revision: 2,
    players: [{ id: 'p1', x: 10, y: 20 }], routes: [],
    teamId: 'team-c01', createdBy: uid, createdAt: expect.stringMatching(/^2026-10-13T12:00:00(\.0+)?Z$/), updatedAt: expect.any(String),
  });
});

// P10-P17 (CC02/CC03, PR #59/#60) are now real tests in e2e/tests/coaching.spec.ts
// (CC-P10..CC-P17); P13 (D10) is e2e/tests/legacy-import.spec.ts. No placeholders remain.
