// Sign-in, beta gating, session states and sign-out in real browsers.
// All authentication is EMULATOR authentication (see playwright.config.ts).
import { test, expect } from '@playwright/test';
import {
  resetEmulators, grantBeta, disableUser, createUnverifiedPasswordUser,
} from './support/emulator';
import {
  signInAsBetaCoach,
  coachEmail, skipOnboarding, signInScreen, dashboardFor, requestEmailLink,
  signInWithEmailLink, waitForE2EHooks, signOutViaUI, storage, LEGACY_PLAYS_KEY, EMAIL_KEY,
} from './support/app';

test.beforeEach(async ({ context }) => {
  await resetEmulators();
  await skipOnboarding(context);
});

test('E2E-A01 signed-out visitor sees only the sign-in screen', async ({ page }) => {
  await page.goto('/');
  await expect(signInScreen(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  // No coaching UI behind the gate.
  await expect(page.getByText('Team Management')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Practice Plans/ })).toHaveCount(0);
});

test('E2E-A02 [emulator email link] new coach waits for beta, then gets in after access is granted', async ({ page }) => {
  const email = coachEmail('a02');
  await signInWithEmailLink(page, email);
  await expect(page.getByRole('heading', { name: 'Waiting for beta access' })).toBeVisible();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await expect(dashboardFor(page, email)).toHaveCount(0);
  // The sign-in link parameters are removed from the address bar.
  expect(new URL(page.url()).searchParams.get('oobCode')).toBeNull();

  await grantBeta(email); // same claim functions/scripts/beta-access.js sets
  await page.getByRole('button', { name: 'Check again' }).click();
  await expect(dashboardFor(page, email)).toBeVisible();
  expect((await storage(page))[EMAIL_KEY]).toBeUndefined();
});

test('E2E-A03 [emulator email link] link opened on another device asks for the email first', async ({ page, browser }) => {
  const email = coachEmail('a03');
  const link = await requestEmailLink(page, email);
  const other = await browser.newContext({ serviceWorkers: 'block' });
  try {
    const p2 = await other.newPage();
    await p2.goto(link.toString());
    await expect(p2.getByRole('heading', { name: 'Confirm your email' })).toBeVisible();
    await p2.getByLabel(/Enter the email it was sent to/).fill(email);
    await p2.getByRole('button', { name: 'Finish sign-in' }).click();
    await expect(p2.getByRole('heading', { name: 'Waiting for beta access' })).toBeVisible();
  } finally {
    await other.close();
  }
});

test('E2E-A04 [emulator email link] a used sign-in link cannot be replayed', async ({ page, browser }) => {
  const email = coachEmail('a04');
  const link = await requestEmailLink(page, email);
  await page.goto(link.toString());
  await expect(page.getByRole('heading', { name: 'Waiting for beta access' })).toBeVisible();
  const other = await browser.newContext({ serviceWorkers: 'block' });
  try {
    const p2 = await other.newPage();
    await p2.goto(link.toString());
    await p2.getByLabel(/Enter the email it was sent to/).fill(email);
    await p2.getByRole('button', { name: 'Finish sign-in' }).click();
    await expect(p2.getByRole('alert')).toContainText(/invalid or has already been used|expired/);
    await expect(p2.getByRole('heading', { name: 'Waiting for beta access' })).toHaveCount(0);
  } finally {
    await other.close();
  }
});

test('E2E-A05 [SDK-in-browser] unverified email account is held at "Verify your email"', async ({ page }) => {
  // The app has no password UI; this drives the app's own SDK session to
  // prove the gate, so it is not counted as a UI sign-in workflow.
  const email = coachEmail('a05');
  await createUnverifiedPasswordUser(email, 'e2e-not-a-secret-1');
  await grantBeta(email); // even WITH the beta claim, unverified must not get in
  await page.goto('/');
  await waitForE2EHooks(page);
  const r = await page.evaluate(([e, p]) => (window as any).__coachCoreE2E.signInWithPassword(e, p), [email, 'e2e-not-a-secret-1']);
  expect(r.ok).toBe(true);
  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
  await expect(dashboardFor(page, email)).toHaveCount(0);
});

test('E2E-A06 [SDK-in-browser] anonymous session is ended and told to sign in', async ({ page }) => {
  await page.goto('/');
  await waitForE2EHooks(page);
  const r = await page.evaluate(() => (window as any).__coachCoreE2E.signInAnonymously());
  expect(r.ok).toBe(true);
  await expect(page.getByText('Guest access is not available.')).toBeVisible();
  await expect(signInScreen(page)).toBeVisible();
  expect(await page.evaluate(() => (window as any).__coachCoreE2E.uid())).toBeNull();
});

test('E2E-A07 [emulator email link] sign-out returns to sign-in, survives reload, clears the session team key, keeps legacy plays and the quarantined legacy queue byte-identical', async ({ page }) => {
  const email = coachEmail('a07');
  const legacy = JSON.stringify([{ id: 'legacy-1', name: 'Pre-account play', players: [{ x: 1.25, y: 2.5 }] }]);
  await page.goto('/');
  await page.evaluate(([k, v]) => {
    localStorage.setItem(k, v);
    localStorage.setItem('offline_operations', '[{"op":"stale"}]');
  }, [LEGACY_PLAYS_KEY, legacy]);
  await signInWithEmailLink(page, email);
  await expect(page.getByRole('heading', { name: 'Waiting for beta access' })).toBeVisible();
  await grantBeta(email);
  await page.getByRole('button', { name: 'Check again' }).click();
  await expect(dashboardFor(page, email)).toBeVisible();

  await signOutViaUI(page);
  await page.reload();
  await expect(signInScreen(page)).toBeVisible();
  await expect(dashboardFor(page, email)).toHaveCount(0);
  const s = await storage(page);
  expect(s.currentTeamId).toBeUndefined();
  // Contract change 2026-10-14 (#61): the quarantined legacy queue is kept byte-for-byte.
  expect(s.offline_operations).toBe('[{"op":"stale"}]');
  // D10 pending: legacy device data is neither imported nor deleted.
  expect(s[LEGACY_PLAYS_KEY]).toBe(legacy);
});

test('E2E-A08 [emulator] disabled account is signed out on the next access check', async ({ page }) => {
  const email = coachEmail('a08');
  await signInWithEmailLink(page, email);
  await expect(page.getByRole('heading', { name: 'Waiting for beta access' })).toBeVisible();
  await disableUser(email);
  await page.getByRole('button', { name: 'Check again' }).click();
  await expect(signInScreen(page)).toBeVisible();
  await expect(page.getByText('Your session ended. Please sign in again.')).toBeVisible();
});

test('E2E-A09 [emulator Google IdP] "Continue with Google" goes through the emulator popup and the beta gate', async ({ page }) => {
  // The Auth emulator replaces Google with a local fake account picker.
  // This proves the app's popup handling, NOT real Google OAuth.
  // The SDK still loads https://apis.google.com/js/api.js for the popup flow.
  test.skip(process.env.E2E_NO_GOOGLE_SCRIPTS === '1', 'apis.google.com unreachable in this environment');
  // Diagnostics only: recorded so a failure explains itself in CI annotations.
  const events: string[] = [];
  const t0 = Date.now();
  const note = (s: string) => events.push(`+${Date.now() - t0}ms ${s}`);
  page.on('console', (m) => { if (m.type() === 'error') note(`console.error ${m.text().slice(0, 120)}`); });
  page.on('requestfailed', (r) => note(`requestfailed ${r.url().slice(0, 80)} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (/apis\.google\.com|9099/.test(r.url())) note(`response ${r.status()} ${r.url().slice(0, 80)}`); });
  await page.goto('/');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  const popup = await popupPromise;
  popup.on('close', () => note('popup closed'));
  await popup.waitForLoadState();
  note(`popup loaded ${popup.url().slice(0, 60)}`);
  await popup.getByRole('button', { name: 'Add new account' }).click();
  const email = coachEmail('a09');
  await popup.locator('#email-input').fill(email);
  await popup.getByRole('button', { name: /Sign in with Google\.com/i }).click();
  note('submitted in popup');
  try {
    await expect(page.getByRole('heading', { name: 'Waiting for beta access' })).toBeVisible();
  } catch (err) {
    const visible = await page.locator('h1,h2,[role=alert],[role=status]').allInnerTexts().catch(() => []);
    throw new Error(`A09 did not reach the beta gate. Page shows: ${JSON.stringify(visible)}. `
      + `Popup closed: ${popup.isClosed()}. Events: ${events.join(' | ')}`, { cause: err });
  }
  await grantBeta(email);
  await page.getByRole('button', { name: 'Check again' }).click();
  await expect(dashboardFor(page, email)).toBeVisible();
});

test('E2E-A10 [FX-03] sign-out never shows an interactive sign-in form before its reload; input typed after it is kept; private content hidden; recovery data preserved', async ({ page }) => {
  const email = coachEmail('a10');
  const uid = await signInAsBetaCoach(page, email);
  const draftKey = `coachcore:v1:${uid}:team-x:drafts:plays`;
  const draft = '{"scope":{"uid":"' + uid + '","teamId":"team-x"},"kind":"plays","id":"d1","expectedRevision":0,"pending":true,"fields":{"name":"Keep"}}';
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('offline_operations', '[{"op":"q"}]'); localStorage.setItem('currentTeamId', 't1'); }, [draftKey, draft]);
  // Hold the post-sign-out cache cleanup so the window between sign-out and the
  // app's reload stays open (same lifecycle point as #62's reproduction).
  await page.evaluate(() => {
    const w = window as any;
    w.__beforeSignOut = true;
    const original = window.caches.keys.bind(window.caches);
    window.caches.keys = () => new Promise<string[]>((resolve) => { w.__releaseCleanup = () => { void original().then(resolve); }; });
    // Record if the sign-in form EVER appears in this (old) document, including
    // a late render after the checks below (verifier follow-up, 2026-10-14).
    w.__formSeen = false;
    const check = () => {
      if ([...document.querySelectorAll('label')].some((l) => /sign-in link by email/i.test(l.textContent || ''))
        || [...document.querySelectorAll('button')].some((b) => /Continue with Google/.test(b.textContent || ''))) w.__formSeen = true;
    };
    check();
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  expect(await page.evaluate(() => (window as any).__formSeen), 'observer baseline: no sign-in form on the dashboard').toBe(false);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  // The seeded unsynced draft triggers the recovery guard first (expected).
  await page.getByRole('dialog', { name: 'Unsynced draft recovery' }).getByRole('button', { name: 'Sign out anyway', exact: true }).click();
  await page.waitForFunction(() => typeof (window as any).__releaseCleanup === 'function');
  // While the old document is still alive: no form, no buttons, no coaching content.
  // The defect's own symptoms are checked first, so pre-fix code fails on them.
  await expect(page.getByText(`Welcome, ${email}`)).toHaveCount(0);
  await expect(page.getByLabel('Or get a sign-in link by email')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Signing out');
  expect(await page.evaluate(() => (window as any).__formSeen), 'sign-in form appeared in the old document').toBe(false);
  expect(await page.evaluate(() => (window as any).__beforeSignOut)).toBe(true); // still the old document
  await page.evaluate(() => (window as any).__releaseCleanup());
  await page.waitForFunction(() => !(window as any).__beforeSignOut && document.readyState === 'complete');
  await expect(signInScreen(page)).toBeVisible();
  // Input typed now survives: no further reload follows.
  await page.evaluate(() => { (window as any).__afterSignOutDoc = true; });
  await page.getByLabel('Or get a sign-in link by email').fill('next-coach@e2e.coachcore.test');
  await page.getByRole('button', { name: 'Continue with Google' }).hover();
  await expect(page.getByLabel('Or get a sign-in link by email')).toHaveValue('next-coach@e2e.coachcore.test');
  expect(await page.evaluate(() => (window as any).__afterSignOutDoc)).toBe(true);
  const s = await storage(page);
  expect(s[draftKey]).toBe(draft);              // recovery draft preserved
  expect(s.offline_operations).toBe('[{"op":"q"}]'); // quarantined queue preserved (L0)
  expect(s.currentTeamId).toBeUndefined();      // session key cleared
  // Still the same document, input intact, after the storage reads.
  await expect(page.getByLabel('Or get a sign-in link by email')).toHaveValue('next-coach@e2e.coachcore.test');
  expect(await page.evaluate(() => (window as any).__afterSignOutDoc)).toBe(true);
});
