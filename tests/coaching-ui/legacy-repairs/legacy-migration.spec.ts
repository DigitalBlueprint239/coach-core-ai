import { test, expect } from '../../../e2e/node_modules/@playwright/test/index.mjs';
import { resetEmulators, adminQuery } from '../../../e2e/tests/support/emulator';
import { skipOnboarding, signInAsBetaCoach, coachEmail, createTeamViaUI, storage, openTab } from '../../../e2e/tests/support/app';

test('L1 disabled migration preserves legacy originals and quarantine after dashboard/planner reload', async ({ page, context }) => {
  await resetEmulators();
  await skipOnboarding(context);
  await signInAsBetaCoach(page, coachEmail('l1repair'));
  await createTeamViaUI(page, 'L1 Team');
  const teamId = (await storage(page)).currentTeamId;
  expect(teamId).toBeTruthy();
  const original = JSON.stringify({ plays: [{ name: 'Old banner play', formation: 'I', routes: [], players: [] }], plans: [] });
  const quarantine = '[ {"type":"create","collection":"plays","data":{"name":"Quarantined original"}} ]';
  await page.evaluate(({ teamId, original, quarantine }) => {
    localStorage.setItem('plays', '[]');
    localStorage.setItem(`coach-core-ai-${teamId}`, original);
    localStorage.setItem('offline_operations', quarantine);
  }, { teamId, original, quarantine });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Migrate Now' })).toHaveCount(0);
  await openTab(page, 'Practice Plans');
  await expect(page.getByRole('region', { name: 'Practice plan editor' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Migrate Now' })).toHaveCount(0);
  const retained = await storage(page);
  expect(retained[`coach-core-ai-${teamId}`]).toBe(original);
  expect(retained.offline_operations).toBe(quarantine);
  expect((await adminQuery('plays', 'teamId', teamId!)).filter(d => d.data.name === 'Old banner play')).toEqual([]);
  await expect(page.getByText('Data migrated successfully!')).toHaveCount(0);
});

