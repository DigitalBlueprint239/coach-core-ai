// AI stays OFF (founder instruction). Since #59 the Practice Planner no longer
// offers AI generation at all; the gateway kill switch is still checked through
// the app's own AI client against the emulated function (placeholder key).
import { test, expect } from '@playwright/test';
import { resetEmulators, AUTH_ONLY } from './support/emulator';
import { coachEmail, skipOnboarding, signInAsBetaCoach, createTeamViaUI, openTab, storage, waitForE2EHooks } from './support/app';

test.beforeEach(async ({ context }) => {
  test.skip(AUTH_ONLY, 'needs the Firestore and Functions emulators');
  await resetEmulators();
  await skipOnboarding(context);
});

test('E2E-AI01 practice planner offers no AI generation and makes no AI request while a plan is created and saved', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', (r) => { if (/\/coachAI|openai\.com|generativelanguage|anthropic\.com/.test(r.url())) calls.push(r.url()); });
  await signInAsBetaCoach(page, coachEmail('ai01'));
  await createTeamViaUI(page, 'AI Off Team');
  await openTab(page, 'Practice Plans');
  await expect(page.getByText('AI generation is disabled.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Generate|AI/ })).toHaveCount(0);
  await page.getByLabel('Plan.name', { exact: true }).fill('Manual plan');
  await page.getByRole('button', { name: 'Save practice plan', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Practice save status' })).toHaveText('saved');
  expect(calls).toEqual([]);
});

test('E2E-AI01b [SDK-in-browser] the app\'s AI client reaches the emulated gateway, which refuses with ai-disabled (browser-side: no provider request; server-side provider not observable here)', async ({ page }) => {
  const provider: string[] = [];
  const gateway: number[] = [];
  page.on('request', (r) => { if (/openai\.com|generativelanguage|anthropic\.com/.test(r.url())) provider.push(r.url()); });
  page.on('response', (r) => { if (r.url().includes('/coachAI') && r.request().method() === 'POST') gateway.push(r.status()); });
  await signInAsBetaCoach(page, coachEmail('ai01b'));
  await createTeamViaUI(page, 'AI Off Team');
  const teamId = (await storage(page)).currentTeamId;
  await waitForE2EHooks(page);
  const r = await page.evaluate((t) => (window as any).__coachCoreE2E.coachAI(t), teamId);
  expect(r).toEqual({ ok: false, code: 'unavailable', reason: 'ai-disabled' });
  expect(gateway.length).toBeGreaterThan(0);
  expect(provider).toEqual([]);
});
