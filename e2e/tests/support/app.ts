import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { latestSignInLink, grantBeta, adminTeamsOwnedBy } from './emulator';

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
  // Named phases so a stall (FX-02: 48 s before this button resolved) is attributed in CI diagnostics.
  await test.step('sign-in: open app and wait for sign-in screen', async () => {
    await page.goto('/');
    await expect(signInScreen(page)).toBeVisible();
  });
  await test.step('sign-in: request email link', async () => {
    await page.getByLabel('Or get a sign-in link by email').fill(email);
    await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
    await expect(page.getByText(`Check ${email} for a sign-in link`)).toBeVisible();
  });
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
  // #67 shell (2026-10-15): the same destination exists in the desktop sidebar
  // and the phone bottom bar, only one of which is displayed. Click the VISIBLE
  // navigation button; fall back to the pre-#67 in-page tabs.
  const re = new RegExp(name);
  const nav = page.getByRole('navigation').getByRole('button', { name: re }).filter({ visible: true });
  if (await nav.count()) { await nav.first().click(); return; }
  await page.getByRole('button', { name: re }).filter({ visible: true }).first().click();
}

/**
 * N2 investigation (2026-10-15): records Firestore channel traffic (Write/Listen
 * WebChannel and REST commits) relative to a start time, plus named marks.
 * Metadata only (method, channel, TYPE/RID params, timing, status); no bodies.
 */
export function firestoreNetLog(page: Page) {
  const t0 = Date.now();
  type Row = { k: string; m?: string; type?: string; s: number; e: number; st?: number; f?: string; label?: string };
  const rows: Row[] = [];
  const byReq = new Map<object, Row>();
  const kind = (u: string) => (/Firestore\/Write\/channel/.test(u) ? 'W' : /Firestore\/Listen\/channel/.test(u) ? 'L' : /documents:commit/.test(u) ? 'C' : '');
  const onRequest = (r: import('@playwright/test').Request) => {
    const k = kind(r.url()); if (!k) return;
    const q = new URL(r.url()).searchParams;
    const row: Row = { k, m: r.method()[0], type: q.get('TYPE') || (q.get('RID') === 'rpc' ? 'rpc' : ''), s: Date.now() - t0, e: -1 };
    byReq.set(r, row); rows.push(row);
  };
  const onFinished = async (r: import('@playwright/test').Request) => {
    const row = byReq.get(r); if (!row) return;
    row.e = Date.now() - t0;
    try { row.st = (await r.response())?.status() ?? 0; } catch { /* gone */ }
  };
  const onFailed = (r: import('@playwright/test').Request) => { const row = byReq.get(r); if (row) { row.e = Date.now() - t0; row.f = r.failure()?.errorText || 'failed'; } };
  page.on('request', onRequest); page.on('requestfinished', onFinished); page.on('requestfailed', onFailed);
  return {
    stop: () => { page.off('request', onRequest); page.off('requestfinished', onFinished); page.off('requestfailed', onFailed); },
    mark: (label: string) => rows.push({ k: 'MARK', label, s: Date.now() - t0, e: -1 }),
    /** Compact text: marks and Write/commit requests in full; Listen requests counted. */
    summary: (max = 1600) => {
      const listen = rows.filter((r) => r.k === 'L');
      const parts = rows.filter((r) => r.k !== 'L').map((r) => (r.k === 'MARK' ? `[${r.label}@${r.s}]`
        : `${r.k}${r.m}${r.type ? `:${r.type}` : ''} ${r.s}-${r.e < 0 ? 'open' : r.e}${r.st ? ` ${r.st}` : ''}${r.f ? ` ${r.f}` : ''}`));
      return `${parts.join(' | ')} | Listen: ${listen.length} req, ${listen.filter((r) => r.e < 0).length} open`.slice(0, max);
    },
  };
}

export async function createTeamViaUI(page: Page, teamName: string): Promise<void> {
  await openTab(page, 'Teams');
  await page.getByRole('button', { name: 'Create Team', exact: true }).first().click();
  await page.getByLabel('Team Name').fill(teamName);
  const t0 = Date.now();
  const net = firestoreNetLog(page); // N2: network lifecycle, reported only on failure
  net.mark('submit');
  await page.getByRole('button', { name: 'Create Team', exact: true }).last().click();
  try {
    // Team-specific confirmation (H2 follow-up, 2026-10-14): the generic
    // "Team created successfully!" toast lives 5 s, so after creating a FIRST
    // team it could falsely confirm a SECOND one still "Creating..." (Codex's
    // local D10-07 trace: Bravo never rendered, "Switch to" missing). Now the
    // dialog must close and a heading with exactly this team's name must show.
    await expect(page.getByRole('heading', { name: 'Create New Team' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: teamName, exact: true }).first()).toBeVisible();
    net.stop();
  } catch (err) {
    // Diagnostics only (Firefox intermittent, 2026-10-14): what the coach saw,
    // whether the modal is still open, and whether the team reached Firestore.
    const visible = await page.locator('[role=alert],[role=status],.fixed').allInnerTexts().catch(() => []);
    const modalOpen = await page.getByRole('heading', { name: 'Create New Team' }).isVisible().catch(() => false);
    const creating = await page.getByText('Creating...').isVisible().catch(() => false);
    const uid = await page.evaluate(() => (window as any).__coachCoreE2E?.uid?.() ?? null).catch(() => null);
    const saved = uid ? (await adminTeamsOwnedBy(uid)).map((t) => t.name) : 'uid unavailable';
    net.mark('gave-up');
    test.info().annotations.push({ type: 'diag-data', description: `N2 createTeam "${teamName}" modalOpen=${modalOpen} creating=${creating} server=${JSON.stringify(saved)} shown=${JSON.stringify(visible.map((v) => v.replace(/\s+/g, ' ').slice(0, 120))).slice(0, 500)} net: ${net.summary(1200)}` });
    throw new Error(`Team "${teamName}" not confirmed within ${Date.now() - t0} ms. modalOpen=${modalOpen} `
      + `creating=${creating} teamsInFirestore=${JSON.stringify(saved)} visible=${JSON.stringify(visible).slice(0, 300)}`, { cause: err });
  }
}

export async function storage(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => Object.fromEntries(Object.entries(window.localStorage)));
}
