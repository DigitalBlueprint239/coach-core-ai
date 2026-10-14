import { expect, type Page, type BrowserContext } from '@playwright/test';
import { latestSignInLink, grantBeta } from './emulator';

export const LEGACY_PLAYS_KEY = 'smartPlaybook_plays';
export const EMAIL_KEY = 'coachcore.emailForSignIn';

let seq = 0;
/** Unique emulator address per test so state can never leak between tests. */
export function coachEmail(label: string): string {
  seq += 1;
  return `${label}-${Date.now().toString(36)}-${seq}@e2e.coachcore.test`;
}

/** Mark the first-run onboarding as done so it does not cover the app. */
export async function skipOnboarding(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    try { window.localStorage.setItem('onboardingComplete', 'true'); } catch { /* ignore */ }
  });
}

export const signInScreen = (page: Page) => page.getByRole('heading', { name: 'Private beta sign-in' });
export const dashboardFor = (page: Page, email: string) => page.getByText(`Welcome, ${email}`);

/**
 * Email-link sign-in through the real UI, completed on the SAME device.
 * EMULATOR AUTH: the emulator records the link instead of emailing it.
 */
export async function requestEmailLink(page: Page, email: string): Promise<URL> {
  await page.goto('/');
  await expect(signInScreen(page)).toBeVisible();
  await page.getByLabel('Or get a sign-in link by email').fill(email);
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByText(`Check ${email} for a sign-in link`)).toBeVisible();
  return latestSignInLink(email);
}

export async function signInWithEmailLink(page: Page, email: string): Promise<void> {
  const link = await requestEmailLink(page, email);
  await page.goto(link.toString());
}

/** Email-link sign-in, beta grant, "Check again" -> dashboard. Returns uid. */
export async function signInAsBetaCoach(page: Page, email: string): Promise<string> {
  await signInWithEmailLink(page, email);
  const waiting = page.getByRole('heading', { name: 'Waiting for beta access' });
  const dash = dashboardFor(page, email);
  await expect(waiting.or(dash)).toBeVisible();
  const uid = await grantBeta(email);
  if (await waiting.isVisible()) await page.getByRole('button', { name: 'Check again' }).click();
  await expect(dash).toBeVisible();
  return uid;
}

export async function waitForE2EHooks(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean((window as any).__coachCoreE2E));
}

/** Sign out and wait for the app's own post-sign-out page reload to finish. */
export async function signOutViaUI(page: Page): Promise<void> {
  await page.evaluate(() => { (window as any).__beforeSignOut = true; });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForFunction(() => !(window as any).__beforeSignOut && document.readyState === 'complete');
  await expect(signInScreen(page)).toBeVisible();
}

export async function openTab(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(name) }).first().click();
}

export async function createTeamViaUI(page: Page, teamName: string): Promise<void> {
  await openTab(page, 'Teams');
  await page.getByRole('button', { name: 'Create Team', exact: true }).first().click();
  await page.getByLabel('Team Name').fill(teamName);
  await page.getByRole('button', { name: 'Create Team', exact: true }).last().click();
  await expect(page.getByText('Team created successfully!')).toBeVisible();
}

export async function storage(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => Object.fromEntries(Object.entries(window.localStorage)));
}
