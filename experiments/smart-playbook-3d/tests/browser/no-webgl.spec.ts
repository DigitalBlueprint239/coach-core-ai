import { expect, test } from '@playwright/test';
import { open, phase, probe } from './helpers';

// Real unavailability: Chrome launched with WebGL disabled, not a simulated flag.
test.use({ launchOptions: { args: ['--disable-webgl', '--disable-3d-apis'] } });

test('without WebGL the 2D editor is fully usable and 3D is cleanly disabled', async ({ page }) => {
  await open(page);
  expect(await probe<boolean>(page, 'glAvailable')).toBe(false);
  await expect(page.getByTestId('btn-3d')).toBeDisabled();
  await expect(page.getByTestId('notice')).toContainText('WebGL');
  await expect(page.getByTestId('layer-3d')).toHaveCount(0);
  await page.keyboard.press('v');
  expect(await phase(page)).toBe('2d');
  await page.getByRole('button', { name: 'QB', exact: true }).click();
  await expect(page.getByTestId('inspector')).toContainText('QB');
  await expect(page.getByTestId('field-2d')).toBeVisible();
});
