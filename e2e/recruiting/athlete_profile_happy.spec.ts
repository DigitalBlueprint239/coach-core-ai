import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test('athlete completes profile and sees public page', async ({ page }) => {
  await page.goto('/recruiting/profile');
  await page.getByRole('heading', { name: 'Athlete Profile' }).waitFor();
  await expect(page).toHaveURL(/recruiting\/profile/);

  await page.getByLabel('Full Name').fill('Jordan Blake');
  await page.getByLabel('Primary Position').fill('WR');
  await page.getByLabel('Secondary Positions').fill('KR, PR');
  await page.getByLabel('Graduation Year').fill('2026');
  await page.getByLabel('Height (inches)').fill('74');
  await page.getByLabel('Weight (lbs)').fill('195');
  await page.getByLabel('GPA').fill('3.7');
  await page.getByLabel('ACT').fill('27');
  await page.getByLabel('Transcript URL').fill('https://example.com/transcript.pdf');

  await expect(page.getByText('100% complete')).toBeVisible();
  await expect(page.getByText('Readiness')).toBeVisible();

  const [publicPage] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('link', { name: 'View public page' }).click(),
  ]);

  await publicPage.waitForLoadState('domcontentloaded');
  await expect(publicPage.getByRole('heading', { name: 'Jordan Blake' })).toBeVisible();
});
