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
  const gateway: Array<{ method: string; status: number; body: string }> = [];
  page.on('request', (r) => { if (/openai\.com|generativelanguage|anthropic\.com/.test(r.url())) providerCalls.push(r.url()); });
  page.on('response', async (r) => {
    if (!r.url().includes('/coachAI')) return;
    let body = '';
    try { body = (await r.text()).slice(0, 300); } catch { /* preflight has no body */ }
    gateway.push({ method: r.request().method(), status: r.status(), body });
  });
  page.on('requestfailed', (r) => {
    if (r.url().includes('/coachAI')) gateway.push({ method: r.method(), status: 0, body: r.failure()?.errorText || 'failed' });
  });

  await signInAsBetaCoach(page, coachEmail('ai01'));
  await createTeamViaUI(page, 'AI Off Team');
  await openTab(page, 'Practice Plans');
  await page.getByLabel('Age group').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Game Prep' }).click();
  await page.getByRole('button', { name: 'Generate with AI' }).click();
  const shown = page.locator('div.text-red-500');
  await expect(shown).toBeVisible({ timeout: 30_000 });
  const text = (await shown.textContent())?.trim();
  // Diagnostics go into the message so a CI annotation explains a failure.
  expect(text, `UI error="${text}" gateway=${JSON.stringify(gateway)}`)
    .toBe('AI features are turned off right now. Everything else still works.');
  expect(gateway.some((g) => g.method === 'POST'), 'reached the emulated function, not a stub').toBe(true);
  expect(providerCalls).toEqual([]);
});
