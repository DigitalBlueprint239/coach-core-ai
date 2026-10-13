// AI stays OFF (founder instruction). In the emulator the coachAI gateway runs
// with COACH_CORE_AI_ENABLED=false and a placeholder key, so this proves the
// browser -> gateway path and the kill switch without any provider call.
import { test, expect } from '@playwright/test';
import { resetEmulators, AUTH_ONLY } from './support/emulator';
import { coachEmail, skipOnboarding, signInAsBetaCoach, createTeamViaUI, openTab } from './support/app';

test.beforeEach(async ({ context }) => {
  test.skip(AUTH_ONLY, 'needs the Firestore and Functions emulators');
  await resetEmulators();
  await skipOnboarding(context);
});

test('E2E-AI01 practice planner reaches the gateway, which refuses because AI is disabled', async ({ page }) => {
  const providerCalls: string[] = [];
  const gatewayCalls: number[] = [];
  page.on('request', (r) => { if (/openai\.com|generativelanguage|anthropic\.com/.test(r.url())) providerCalls.push(r.url()); });
  page.on('response', (r) => { if (r.url().includes('/coachAI')) gatewayCalls.push(r.status()); });

  await signInAsBetaCoach(page, coachEmail('ai01'));
  await createTeamViaUI(page, 'AI Off Team');
  await openTab(page, 'Practice Plans');
  await page.getByLabel('Age group').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Game Prep' }).click();
  await page.getByRole('button', { name: 'Generate with AI' }).click();
  await expect(page.getByText('AI features are turned off right now. Everything else still works.')).toBeVisible();
  expect(gatewayCalls.length).toBeGreaterThan(0); // reached the emulated function, not a stub
  expect(providerCalls).toEqual([]);
});
