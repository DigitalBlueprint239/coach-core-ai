# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: coaching.spec.ts >> R1 verified legacy import keeps originals and blocks another account
- Location: tests\coaching-ui\coaching.spec.ts:20:5

# Error details

```
Error: page.goto: NS_BINDING_ABORTED
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

# Page snapshot

```yaml
- main [ref=f2e4]:
  - heading "Coach Core AI" [level=1] [ref=f2e5]
  - heading "Private beta sign-in" [level=2] [ref=f2e6]
  - button "Continue with Google" [ref=f2e7]
  - generic [ref=f2e8]:
    - text: Or get a sign-in link by email
    - textbox "Or get a sign-in link by email" [ref=f2e9]
    - button "Email me a sign-in link" [ref=f2e10]
  - paragraph [ref=f2e11]: Access is limited to invited coaches during the private beta.
```

# Test source

```ts
  1  | import { expect, type Page, type BrowserContext } from '@playwright/test';
  2  | import { latestSignInLink, grantBeta, adminTeamsOwnedBy } from './emulator';
  3  | 
  4  | export const LEGACY_PLAYS_KEY = 'smartPlaybook_plays';
  5  | export const EMAIL_KEY = 'coachcore.emailForSignIn';
  6  | 
  7  | let seq = 0;
  8  | /** Unique emulator address per test so state can never leak between tests. */
  9  | export function coachEmail(label: string): string {
  10 |   seq += 1;
  11 |   return `${label}-${Date.now().toString(36)}-${seq}@e2e.coachcore.test`;
  12 | }
  13 | 
  14 | /** Mark the first-run onboarding as done so it does not cover the app. */
  15 | export async function skipOnboarding(context: BrowserContext): Promise<void> {
  16 |   await context.addInitScript(() => {
  17 |     try { window.localStorage.setItem('onboardingComplete', 'true'); } catch { /* ignore */ }
  18 |   });
  19 | }
  20 | 
  21 | export const signInScreen = (page: Page) => page.getByRole('heading', { name: 'Private beta sign-in' });
  22 | export const dashboardFor = (page: Page, email: string) => page.getByText(`Welcome, ${email}`);
  23 | 
  24 | /**
  25 |  * Email-link sign-in through the real UI, completed on the SAME device.
  26 |  * EMULATOR AUTH: the emulator records the link instead of emailing it.
  27 |  */
  28 | export async function requestEmailLink(page: Page, email: string): Promise<URL> {
> 29 |   await page.goto('/');
     |              ^ Error: page.goto: NS_BINDING_ABORTED
  30 |   await expect(signInScreen(page)).toBeVisible();
  31 |   await page.getByLabel('Or get a sign-in link by email').fill(email);
  32 |   await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  33 |   await expect(page.getByText(`Check ${email} for a sign-in link`)).toBeVisible();
  34 |   return latestSignInLink(email);
  35 | }
  36 | 
  37 | export async function signInWithEmailLink(page: Page, email: string): Promise<void> {
  38 |   const link = await requestEmailLink(page, email);
  39 |   await page.goto(link.toString());
  40 | }
  41 | 
  42 | /** Email-link sign-in, beta grant, "Check again" -> dashboard. Returns uid. */
  43 | export async function signInAsBetaCoach(page: Page, email: string): Promise<string> {
  44 |   await signInWithEmailLink(page, email);
  45 |   const waiting = page.getByRole('heading', { name: 'Waiting for beta access' });
  46 |   const dash = dashboardFor(page, email);
  47 |   await expect(waiting.or(dash)).toBeVisible();
  48 |   const uid = await grantBeta(email);
  49 |   if (await waiting.isVisible()) await page.getByRole('button', { name: 'Check again' }).click();
  50 |   await expect(dash).toBeVisible();
  51 |   return uid;
  52 | }
  53 | 
  54 | export async function waitForE2EHooks(page: Page): Promise<void> {
  55 |   await page.waitForFunction(() => Boolean((window as any).__coachCoreE2E));
  56 | }
  57 | 
  58 | /** Sign out and wait for the app's own post-sign-out page reload to finish. */
  59 | export async function signOutViaUI(page: Page): Promise<void> {
  60 |   await page.evaluate(() => { (window as any).__beforeSignOut = true; });
  61 |   await page.getByRole('button', { name: 'Sign out' }).click();
  62 |   await page.waitForFunction(() => !(window as any).__beforeSignOut && document.readyState === 'complete');
  63 |   await expect(signInScreen(page)).toBeVisible();
  64 | }
  65 | 
  66 | export async function openTab(page: Page, name: string): Promise<void> {
  67 |   await page.getByRole('button', { name: new RegExp(name) }).first().click();
  68 | }
  69 | 
  70 | export async function createTeamViaUI(page: Page, teamName: string): Promise<void> {
  71 |   await openTab(page, 'Teams');
  72 |   await page.getByRole('button', { name: 'Create Team', exact: true }).first().click();
  73 |   await page.getByLabel('Team Name').fill(teamName);
  74 |   const t0 = Date.now();
  75 |   await page.getByRole('button', { name: 'Create Team', exact: true }).last().click();
  76 |   try {
  77 |     await expect(page.getByText('Team created successfully!')).toBeVisible();
  78 |   } catch (err) {
  79 |     // Diagnostics only (Firefox intermittent, 2026-10-14): what the coach saw,
  80 |     // whether the modal is still open, and whether the team reached Firestore.
  81 |     const visible = await page.locator('[role=alert],[role=status],.fixed').allInnerTexts().catch(() => []);
  82 |     const modalOpen = await page.getByRole('heading', { name: 'Create New Team' }).isVisible().catch(() => false);
  83 |     const creating = await page.getByText('Creating...').isVisible().catch(() => false);
  84 |     const uid = await page.evaluate(() => (window as any).__coachCoreE2E?.uid?.() ?? null).catch(() => null);
  85 |     const saved = uid ? (await adminTeamsOwnedBy(uid)).map((t) => t.name) : 'uid unavailable';
  86 |     throw new Error(`Team "${teamName}" not confirmed within ${Date.now() - t0} ms. modalOpen=${modalOpen} `
  87 |       + `creating=${creating} teamsInFirestore=${JSON.stringify(saved)} visible=${JSON.stringify(visible).slice(0, 300)}`, { cause: err });
  88 |   }
  89 | }
  90 | 
  91 | export async function storage(page: Page): Promise<Record<string, string>> {
  92 |   return page.evaluate(() => Object.fromEntries(Object.entries(window.localStorage)));
  93 | }
  94 | 
```