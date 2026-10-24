// Shared-app dialog regressions from the 2026-10-24 acceptance audit (HANDOFF-SHARED-APP.md):
// D2 Join code length and private-beta notice, D3 Create/Join dialog keyboard and names,
// D4 first-visit welcome modal (dialog semantics, Elite surface, no automatic notification prompt).
// Each case runs at desktop and phone width in the chromium and firefox projects.
import { test, expect, type Page, type Locator } from '@playwright/test';
import { resetEmulators, adminSet, adminGet, AUTH_ONLY } from './support/emulator';
import { coachEmail, skipOnboarding, signInAsBetaCoach, openTab, dashboardFor } from './support/app';

test.skip(AUTH_ONLY, 'needs the Firestore emulator');

const BETA_MESSAGE = 'Joining teams is not available during the private beta.';

test.beforeEach(async ({ context }) => {
  await resetEmulators();
  // Count notification permission requests without showing a real prompt.
  await context.addInitScript(() => {
    const w = window as any;
    w.__permissionRequests = 0;
    w.__notificationSupported = 'Notification' in window;
    if (w.__notificationSupported) {
      Notification.requestPermission = (() => { w.__permissionRequests += 1; return Promise.resolve('default'); }) as any;
    }
  });
});

const permissionRequests = (page: Page) => page.evaluate(() => (window as any).__permissionRequests as number);
const focusInside = (dialog: Locator) => dialog.evaluate((d) => d.contains(document.activeElement));

async function expectTabStaysInside(page: Page, dialog: Locator) {
  expect(await focusInside(dialog)).toBe(true);
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    expect(await focusInside(dialog), `Tab ${i + 1} left the dialog`).toBe(true);
  }
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await focusInside(dialog), `Shift+Tab ${i + 1} left the dialog`).toBe(true);
  }
}

for (const [form, viewport] of [['desktop', { width: 1440, height: 950 }], ['phone', { width: 390, height: 844 }]] as const) {
  test.describe(`${form} width`, () => {
    test.use({ viewport });

    test(`SA-01 [D4] first visit: the welcome modal is a named dialog that traps Tab, closes on Escape and does not return (${form})`, async ({ page }) => {
      const email = coachEmail(`sa01${form}`);
      await signInAsBetaCoach(page, email);
      const dialog = page.getByRole('dialog', { name: 'Welcome to Coach Core AI!' });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      await expectTabStaysInside(page, dialog);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(await permissionRequests(page)).toBe(0);
      await page.reload();
      await expect(dashboardFor(page, email)).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await openTab(page, 'Teams');
      await expect(page.getByRole('heading', { name: 'Team Management' })).toBeVisible();
    });

    test(`SA-02 [D4] completing the welcome steps uses the Elite surface and never requests notification permission (${form})`, async ({ page }, info) => {
      await signInAsBetaCoach(page, coachEmail(`sa02${form}`));
      expect(await page.evaluate(() => (window as any).__notificationSupported)).toBe(true);
      const panel = page.locator('.onboarding-modal');
      await expect(panel).toBeVisible();
      const look = await panel.evaluate((el) => {
        const s = getComputedStyle(el); const h = getComputedStyle(el.querySelector('h2')!);
        return { background: `${s.backgroundColor} ${s.backgroundImage}`, title: h.fontFamily };
      });
      expect(look.background).not.toContain('rgb(255, 255, 255)');
      expect(look.title).toContain('Big Shoulders Display');
      await page.screenshot({ path: info.outputPath(`welcome-${form}.png`) });
      for (let i = 0; i < 6; i++) await page.getByRole('dialog').getByRole('button', { name: 'Next' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Finish' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Start Using Coach Core' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.waitForTimeout(500); // an automatic request would follow completion immediately
      expect(await permissionRequests(page)).toBe(0);
    });

    test(`SA-03 [D4] closing the welcome modal with its close button never requests notification permission (${form})`, async ({ page }) => {
      await signInAsBetaCoach(page, coachEmail(`sa03${form}`));
      await page.getByRole('button', { name: 'Close onboarding' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.waitForTimeout(500);
      expect(await permissionRequests(page)).toBe(0);
    });

    for (const [opener, title] of [['Create Team', 'Create New Team'], ['Join Team', 'Join Team']] as const) {
      test(`SA-04 [D3] ${title}: named modal dialog, Tab stays inside, Escape closes and focus returns to ${opener} (${form})`, async ({ page, context }) => {
        await skipOnboarding(context);
        await signInAsBetaCoach(page, coachEmail(`sa04${form}`));
        await openTab(page, 'Teams');
        const button = page.locator('.eb-actions').getByRole('button', { name: opener, exact: true });
        await button.click();
        const dialog = page.getByRole('dialog', { name: title });
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveAttribute('aria-modal', 'true');
        await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible();
        await expectTabStaysInside(page, dialog);
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(button).toBeFocused();
      });
    }

    test(`SA-05 [D2] Join shows the private-beta notice first, keeps an 8-character code and still joins nothing (${form})`, async ({ page, context }) => {
      await skipOnboarding(context);
      const t = new Date();
      await adminSet('teams/sa05-other', { name: 'Other Coach Team', code: 'JQ7MN2XR', ownerId: 'someone-else', memberIds: ['someone-else'], createdAt: t, updatedAt: t });
      await signInAsBetaCoach(page, coachEmail(`sa05${form}`));
      await openTab(page, 'Teams');
      await page.locator('.eb-actions').getByRole('button', { name: 'Join Team', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Join Team' });
      await expect(dialog.getByText(BETA_MESSAGE)).toBeVisible();
      const field = dialog.getByLabel('Team Code');
      await field.pressSequentially('jq7mn2xr');
      await expect(field).toHaveValue('JQ7MN2XR');
      await expect(dialog.getByText(/Enter the 8-character team code/)).toBeVisible();
      await dialog.getByRole('button', { name: 'Join Team' }).click();
      await expect(page.getByText(BETA_MESSAGE).last()).toBeVisible();
      const team = await adminGet('teams/sa05-other');
      expect(team?.memberIds).toEqual(['someone-else']);
    });
  });
}
