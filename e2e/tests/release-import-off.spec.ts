// Release proof, behavioural leg (PR #78, fourth revision, 2026-10-18).
//
// Runs ONLY through e2e/playwright.release-proof.config.ts against e2e/.app-build-import-off: the
// SAME commit and toolchain as the release build, compiled with the release value of the import flag
// (REACT_APP_ENABLE_LEGACY_IMPORT=false) plus the emulator wiring. Nothing about the import UI is
// modelled or reconstructed here: a real browser loads the real bundle, a real emulator account owns a
// real team, and the assertions observe what the disabled build does with device plays, with an
// unfinished claim, and with no device data. The ON control is the accepted D10-01/D10-02 suite on the
// opted-in build, run by the same config. scripts/security/release-import-config.js gate requires all
// RP-OFF-* and D10-01/D10-02 executions to have PASSED (a skip is never counted).
import { test, expect, type Page } from '@playwright/test';
import { resetEmulators, adminQuery, AUTH_ONLY } from './support/emulator';
import { coachEmail, skipOnboarding, signInAsBetaCoach, createTeamViaUI, openTab, storage, awaitOwnedTeamReady } from './support/app';
import { LEGACY_KEY, LEGACY_RAW, seedDevice, expectOriginalsUntouched, importPrompt } from './support/legacy';

const CLAIM_KEY = 'coachcore:v1:legacyImportClaim';
const pendingKey = (uid: string) => `coachcore:v1:${uid}:legacyImportPending`;
const DISABLED_NOTICE = 'Device-play import is disabled in this build. Original plays and unfinished imports remain on this device.';
const CANARY_OFF = 'coachcore:import-config=false';
const OBSERVATION_MS = 3_000; // bounded settle window: the disabled build must stay silent after the UI renders

test.beforeEach(async ({ context }) => {
  test.skip(AUTH_ONLY, 'needs the Firestore emulator');
  await resetEmulators();
  await skipOnboarding(context);
});

/** Every import-related key on the device (claim, per-account pending/decision). */
async function importKeys(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k === 'coachcore:v1:legacyImportClaim' || k.endsWith(':legacyImportPending') || k.endsWith(':legacyImportDecision'))));
}
async function ownerWithTeam(page: Page, label: string, team: string) {
  const uid = await signInAsBetaCoach(page, coachEmail(label));
  await createTeamViaUI(page, team);
  await awaitOwnedTeamReady(page, team, uid);
  const teamId = (await storage(page)).currentTeamId as string;
  expect(teamId).toBeTruthy();
  return { uid, teamId };
}
async function expectNothingImported(page: Page, uid: string, teamId: string) {
  await page.waitForTimeout(OBSERVATION_MS);
  expect(await adminQuery('plays', 'teamId', teamId), 'no play of any kind written for the team').toEqual([]);
  expect(await adminQuery('plays', 'createdBy', uid), 'no play written by the coach').toEqual([]);
}
async function expectDisabledOffer(page: Page) {
  const region = importPrompt(page);
  await expect(region).toBeVisible();
  await expect(region, 'the compiled marker carries the release value').toHaveAttribute('data-import-config', CANARY_OFF);
  await expect(region.getByRole('alert')).toHaveText(DISABLED_NOTICE);
  await expect(region.getByRole('button'), 'no Import plays / Not now / Resume import control exists in the disabled build').toHaveCount(0);
  await expect(region).toContainText('contact support');
}

test('RP-OFF-01 [release proof] owner with device plays: the disabled build shows the notice only, offers no import or decline control, writes no play and no claim/decision, originals byte-identical', async ({ page }) => {
  await seedDevice(page);
  const { uid, teamId } = await ownerWithTeam(page, 'rpoff1', 'Alpha Eagles');
  await openTab(page, 'Smart Playbook');
  await expectDisabledOffer(page);
  await expectNothingImported(page, uid, teamId);
  expect(await importKeys(page), 'no claim, pending or decision key written').toEqual({});
  await expectOriginalsUntouched(page);
  // Reload: the disabled build never changes its mind.
  await page.reload();
  await openTab(page, 'Smart Playbook');
  await expectDisabledOffer(page);
  expect(await importKeys(page)).toEqual({});
  await expectOriginalsUntouched(page);
});

test('RP-OFF-02 [release proof] unfinished import of this very coach and team: the disabled build does not resume, postpone or clear it; claim and pending markers stay byte-identical; nothing is copied', async ({ page }) => {
  await seedDevice(page);
  const { uid, teamId } = await ownerWithTeam(page, 'rpoff2', 'Alpha Eagles');
  // Shape written by the accepted runtime at PR #76 (61448f0) before the first copy; same account, same team.
  const claim = JSON.stringify({ uid, status: 'pending', teamId, teamName: 'Alpha Eagles' });
  const pending = JSON.stringify({ teamId, teamName: 'Alpha Eagles', startedAt: '2026-10-01T10:00:00.000Z' });
  await page.evaluate(([ck, cv, pk, pv]) => { localStorage.setItem(ck, cv); localStorage.setItem(pk, pv); }, [CLAIM_KEY, claim, pendingKey(uid), pending]);
  await page.reload();
  await openTab(page, 'Smart Playbook');
  await expectDisabledOffer(page);
  await expectNothingImported(page, uid, teamId);
  expect(await importKeys(page), 'claim and pending preserved exactly; no decision recorded').toEqual({ [CLAIM_KEY]: claim, [pendingKey(uid)]: pending });
  await expectOriginalsUntouched(page);
});

test('RP-OFF-03 [release proof] owner without device plays: no import region at all, nothing written', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('smartPlaybook_onboarding_complete', 'true')); // same as seedDevice, minus any device plays
  const { uid, teamId } = await ownerWithTeam(page, 'rpoff3', 'Alpha Eagles');
  expect(await page.evaluate((k) => localStorage.getItem(k), LEGACY_KEY)).toBeNull();
  await openTab(page, 'Smart Playbook');
  await expect(page.getByRole('button', { name: /Load Play/ })).toBeVisible();
  await expect(importPrompt(page)).toHaveCount(0);
  await expectNothingImported(page, uid, teamId);
  expect(await importKeys(page)).toEqual({});
});
