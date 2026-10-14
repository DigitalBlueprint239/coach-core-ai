// Persistence contract v1 (docs/security/PERSISTENCE_CONTRACT.md) in real browsers.
//
// What runs today: the server-side half of concurrent-edit protection, driven
// through the app's own Firebase SDK session in two browser contexts (two
// devices of one coach). It is labelled SDK-in-browser and is NOT a UI workflow.
//
// P13 (D10 legacy import) is now real: e2e/tests/legacy-import.spec.ts.
// What is BLOCKED: every client workflow below. They are declared with
// test.fixme so they appear in every run as BLOCKED with their dependency,
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

const BLOCKED: Array<[string, string]> = [
  ['E2E-P10 coach A\'s unsynced Playbook drafts are invisible to coach B on the same browser profile',
    'Codex: uid+team-scoped draft storage in SmartPlaybook.tsx / firestore.ts (contract P-10)'],
  ['E2E-P11 sign-out removes only the signed-out coach\'s draft keys',
    'Codex: scoped draft keys coachcore:v1:{uid}:{teamId}:* (contract P-11)'],
  ['E2E-P12b unsynced-drafts sign-out guard: Sync now / Export / Sign out anyway / Cancel',
    'Codex: guard UI registered via registerSignOutGuard (contract P-12b)'],
  ['E2E-P14 two tabs edit the same play: the second save shows the conflict screen and loses nothing',
    'Codex: runTransaction(expectedRevision) + 3-way conflict UI (contract P-14); rules half covered by E2E-C01'],
  ['E2E-P15 Playbook play: create -> cloud save -> hard reload -> reopen identical on another device',
    'Codex: Smart Playbook cloud save/load (today plays live only in localStorage smartPlaybook_plays)'],
  ['E2E-P16 editable practice plan: AI or manual plan -> edit -> save -> reload -> identical',
    'Codex: PracticePlanner save/edit UI + coach-ai.v1 -> practicePlans mapping (contract §2); AI generation also needs founder approval to enable'],
  ['E2E-P17 offline edits replay only for the coach and team that made them',
    'Codex: per-session offline queue (contract P-16)'],
];
for (const [title, dependency] of BLOCKED) {
  test.fixme(title, { annotation: { type: 'blocked', description: dependency } }, async () => {});
}
