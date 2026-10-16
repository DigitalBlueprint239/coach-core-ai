// Identity visibility in the #67 shell (Coach Drew directive, 2026-10-15):
// signed-in account, active team or an explicit no-team state, and a clear
// sample-preview marker must be DISPLAYED (not 1 px / display:none) and
// accessible at desktop, tablet and phone widths.
import { test, expect, type Page, type Locator } from '@playwright/test';
import { resetEmulators, AUTH_ONLY } from './support/emulator';
import { coachEmail, skipOnboarding, signInAsBetaCoach, createTeamViaUI, openTab } from './support/app';

const WIDTHS = [1440, 834, 390] as const;

async function expectDisplayed(loc: Locator, what: string) {
  await expect(loc, `${what} must be visible`).toBeVisible();
  const box = await loc.boundingBox();
  expect(box && box.width >= 24 && box.height >= 8, `${what} must be displayed at a readable size, got ${JSON.stringify(box)}`).toBe(true);
}
const banner = (page: Page) => page.getByRole('banner');

test.beforeEach(async ({ context }) => {
  await resetEmulators();
  await skipOnboarding(context);
});

test('UI-01 [identity] signed-in account and explicit no-team state are displayed and accessible at 1440, 834 and 390 px', async ({ page }) => {
  const email = coachEmail('ui01');
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInAsBetaCoach(page, email);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await expectDisplayed(banner(page).getByText(`Welcome, ${email}`), `account at ${width}px`);
    await expectDisplayed(banner(page).getByText('No team selected'), `no-team state at ${width}px`);
    await expect(banner(page), `accessible team label at ${width}px`).toContainText('Active team: No team selected');
    await expect(banner(page).getByText(/Sample preview/)).toHaveCount(0);
  }
});

test('UI-02 [identity] the active team is displayed at every width; sample preview is marked "not saved" only while shown', async ({ page }) => {
  test.skip(AUTH_ONLY, 'needs the Firestore emulator');
  const email = coachEmail('ui02');
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInAsBetaCoach(page, email);
  await createTeamViaUI(page, 'Alpha Eagles');
  await openTab(page, 'My Week');
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await expectDisplayed(banner(page).getByText('Alpha Eagles'), `active team at ${width}px`);
    await expect(banner(page)).toContainText('Active team: Alpha Eagles');
    await expectDisplayed(banner(page).getByText(`Welcome, ${email}`), `account at ${width}px`);
    await expect(banner(page).getByText(/Sample preview/), `no sample marker on saved data at ${width}px`).toHaveCount(0);
  }
  // Sample preview: marked in the top bar at every width, and the marker goes when it ends.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Sample preview' }).first().click();
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await expectDisplayed(banner(page).getByText('Sample preview · not saved'), `sample marker at ${width}px`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Exit preview' }).first().click();
  await expect(banner(page).getByText(/Sample preview/)).toHaveCount(0);
  // Leaving the dashboard ends the sample view, so the marker is not shown on real editors.
  await page.getByRole('button', { name: 'Sample preview' }).first().click();
  await openTab(page, 'Practice Plans');
  await expect(banner(page).getByText(/Sample preview/)).toHaveCount(0);
});
