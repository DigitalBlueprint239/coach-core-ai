import { test, expect } from '@playwright/test';

const handle = 'seedathlete';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test('privacy toggles control public visibility', async ({ page }) => {
  await page.goto('/recruiting/profile');
  await page.getByRole('heading', { name: 'Athlete Profile' }).waitFor();
  await expect(page).toHaveURL(/recruiting\/profile/);

  await page.getByLabel('Full Name').fill('Micah Turner');
  await page.getByLabel('Primary Position').fill('QB');
  await page.getByLabel('Graduation Year').fill('2027');
  await page.getByLabel('Height (inches)').fill('75');
  await page.getByLabel('Weight (lbs)').fill('210');
  await page.getByLabel('GPA').fill('3.5');
  await page.getByLabel('ACT').fill('26');
  await page.getByLabel('Transcript URL').fill('https://example.com/transcript.pdf');
  await page.getByLabel('Recruiting Bio').fill('Dual-threat QB with strong pocket awareness.');
  await page.getByLabel('Twitter Handle').fill(`@${handle}`);

  const academicsSwitch = page.getByLabel('Show academics on public page');
  const contactSwitch = page.getByLabel('Share contact info on public page');

  // turn both off
  if (await academicsSwitch.isChecked()) {
    await academicsSwitch.click();
  }
  if (await contactSwitch.isChecked()) {
    await contactSwitch.click();
  }

  await page.goto(`/u/${handle}`);
  await expect(page.getByText('Academics')).toHaveCount(0);
  await expect(page.getByText('Contact')).toHaveCount(0);

  // toggle back on
  await page.goto('/recruiting/profile');
  await page.getByRole('heading', { name: 'Athlete Profile' }).waitFor();
  await expect(page).toHaveURL(/recruiting\/profile/);
  await academicsSwitch.click();
  await contactSwitch.click();

  await page.goto(`/u/${handle}`);
  await expect(page.getByText('Academics')).toBeVisible();
  await expect(page.getByText('Contact')).toBeVisible();
});
