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
/**
 * FX-02 / H2 stall probe (2026-10-16, diagnostics only). Codex's redacted trace of FX-02
 * shows the "before" snapshot of the stalled click landing ~51 s after the call began,
 * i.e. the page was not servicing injected-script work during the gap — but that is an
 * inference. This records, inside the page: a 250 ms timer heartbeat and a rAF heartbeat
 * (gaps => page execution suspended/throttled), visibilitychange events (background tab),
 * and add/remove mutations of the email-link submit button (app remove/reinsert). It is
 * read only when the sign-in step is slow, and reported as diag-data. No timing changed.
 */
async function installStallProbe(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    if (w.__stall) return;
    const p = { t0: performance.now(), timerGaps: [] as string[], rafGaps: [] as string[], visibility: [] as string[], button: [] as string[], lastTimer: performance.now(), lastRaf: performance.now() };
    w.__stall = p;
    const stamp = () => Math.round(performance.now() - p.t0);
    setInterval(() => { const n = performance.now(); if (n - p.lastTimer > 2_000 && p.timerGaps.length < 6) p.timerGaps.push(`${stamp()}ms:gap${Math.round(n - p.lastTimer)}ms`); p.lastTimer = n; }, 250);
    const raf = () => { const n = performance.now(); if (n - p.lastRaf > 2_000 && p.rafGaps.length < 6) p.rafGaps.push(`${stamp()}ms:gap${Math.round(n - p.lastRaf)}ms`); p.lastRaf = n; requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    document.addEventListener('visibilitychange', () => { if (p.visibility.length < 8) p.visibility.push(`${stamp()}ms:${document.visibilityState}`); });
    p.visibility.push(`${stamp()}ms:${document.visibilityState}`);
    const isBtn = (n: Node) => n.nodeType === 1 && /Email me a sign-in link/.test((n as Element).textContent || '') && ((n as Element).matches?.('button') || Boolean((n as Element).querySelector?.('button')));
    new MutationObserver((records) => {
      for (const r of records) {
        for (const n of Array.from(r.addedNodes)) if (isBtn(n) && p.button.length < 10) p.button.push(`${stamp()}ms:+`);
        for (const n of Array.from(r.removedNodes)) if (isBtn(n) && p.button.length < 10) p.button.push(`${stamp()}ms:-`);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }).catch(() => {});
}
async function readStallProbe(page: Page): Promise<string> {
  return page.evaluate(() => {
    const p = (window as any).__stall; if (!p) return 'no-probe';
    return `timerGaps=${JSON.stringify(p.timerGaps)} rafGaps=${JSON.stringify(p.rafGaps)} visibility=${JSON.stringify(p.visibility)} buttonMutations=${JSON.stringify(p.button)} visibleNow=${document.visibilityState}`;
  }).catch(() => 'probe-unreadable');
}

export async function requestEmailLink(page: Page, email: string): Promise<URL> {
  // Named phases so a stall (FX-02: 48 s before this button resolved) is attributed in CI diagnostics.
  await test.step('sign-in: open app and wait for sign-in screen', async () => {
    await page.goto('/');
    await expect(signInScreen(page)).toBeVisible();
  });
  await installStallProbe(page);
  const t0 = Date.now();
  try {
    await test.step('sign-in: request email link', async () => {
      await page.getByLabel('Or get a sign-in link by email').fill(email);
      await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
      await expect(page.getByText(`Check ${email} for a sign-in link`)).toBeVisible();
    });
  } finally {
    // Report the probe only when this phase was slow (FX-02-class) or failed; otherwise stay quiet.
    if (Date.now() - t0 > 5_000) test.info().annotations.push({ type: 'diag-data', description: `stallProbe sign-in ${Date.now() - t0}ms: ${await readStallProbe(page)}` });
  }
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

/**
 * Owned-team readiness (D10-06e line-425 correction, 2026-10-16). `signInAsBetaCoach`
 * returns on IDENTITY readiness (Welcome), while TeamContext still resubscribes and
 * selects the owned team asynchronously (evidence 52: storage read 1 ms after Welcome
 * saw `undefined`; the team was selected 12 ms later). This waits, within the existing
 * expect timeout and with no sleep, for the identity strip to show the exact owned
 * team. On timeout it classifies what the UI shows instead so loading, genuine
 * no-team and a query failure (server has the team, UI never shows it) stay distinct.
 */
export async function awaitOwnedTeamReady(page: Page, teamName: string, uid?: string): Promise<void> {
  const active = page.getByText(`Active team: ${teamName}`, { exact: true });
  try {
    await expect(active).toBeVisible();
  } catch (err) {
    const shown = (await page.getByText(/^Active team: /).allInnerTexts().catch(() => [])).map((t) => t.replace(/\s+/g, ' ').trim());
    const loading = await page.getByText(/Loading your plans…|Loading authorized practice plans…/).first().isVisible().catch(() => false);
    const clearField = await page.getByText('A clear field ahead').first().isVisible().catch(() => false);
    const server = uid ? (await adminTeamsOwnedBy(uid)).map((t) => t.name) : 'uid not given';
    const state = loading ? 'still-loading' : clearField && Array.isArray(server) && server.length === 0 ? 'genuine-no-team'
      : clearField ? 'no-team-shown-but-server-has-teams (query failure or selection defect)' : 'unknown';
    test.info().annotations.push({ type: 'diag-data', description: `ownedTeamReady "${teamName}" NOT reached: state=${state} identity=${JSON.stringify(shown)} serverTeams=${JSON.stringify(server)}` });
    throw new Error(`Owned team "${teamName}" never became the active team within the expect timeout: ${state}; identity shows ${JSON.stringify(shown)}; server teams ${JSON.stringify(server)}`, { cause: err });
  }
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
  // W/L = SDK WebChannel Write/Listen; C = REST documents:commit; R = REST team readback (N2 repair).
  const kind = (u: string) => (/Firestore\/Write\/channel/.test(u) ? 'W' : /Firestore\/Listen\/channel/.test(u) ? 'L' : /documents:commit/.test(u) ? 'C' : /\/v1\/projects\/[^/]+\/databases\/\(default\)\/documents\/teams\//.test(u) ? 'R' : '');
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

/**
 * N3 probe (2026-10-15): what happened between the Create Team click and the
 * first Firestore request. Records booleans and short UI texts only; never
 * uids, emails or tokens. "submitFired" is the DOM submit event (React's
 * onSubmit runs on it); "creatingSeen" proves the handler set its pending state;
 * "shown" holds toast/alert/status texts that appeared (e.g. an auth error).
 */
export async function teamCreateProbe(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__n3 = { submitFired: 0, creatingSeen: false, shown: [] as string[], clicks: [] as string[] };
    // N3 (2026-10-15, 518e9e5 Firefox D10-06c/UI-02): submitFired=0 after a delivered click.
    // Tag the live submit button so a later read can tell whether React replaced the node.
    const btn = Array.from(document.querySelectorAll('button[type=submit]')).find((b) => /Create Team/.test(b.textContent || '')) as HTMLElement | undefined;
    if (btn) btn.dataset.n3Tag = String(Date.now());
    w.__n3.tag = btn?.dataset.n3Tag ?? null;
    if (w.__n3Installed) return;
    w.__n3Installed = true;
    document.addEventListener('submit', () => { w.__n3.submitFired += 1; }, true);
    document.addEventListener('click', (e) => {
      const t = e.target as HTMLElement | null;
      if (w.__n3.clicks.length < 6) w.__n3.clicks.push(`${t?.tagName?.toLowerCase() ?? '?'}${t?.getAttribute?.('type') ? '[' + t.getAttribute('type') + ']' : ''}${(t as any)?.disabled ? '(disabled)' : ''}:${(t?.textContent || '').trim().slice(0, 20)}`);
    }, true);
    new MutationObserver((records) => {
      for (const r of records) for (const n of Array.from(r.addedNodes)) {
        const el = n.nodeType === 1 ? (n as Element) : n.parentElement;
        if (!el) continue;
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (/Creating\.\.\./.test(text)) w.__n3.creatingSeen = true;
        const toast = el.closest('[role=alert],[role=status],.fixed.top-4.right-4');
        if (toast && text && w.__n3.shown.length < 8 && !w.__n3.shown.includes(text.slice(0, 120))) w.__n3.shown.push(text.slice(0, 120));
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  const signedInAtSubmit = await page.evaluate(() => {
    const hooks = (window as any).__coachCoreE2E;
    return hooks?.uid ? Boolean(hooks.uid()) : 'unknown';
  });
  return {
    signedInAtSubmit,
    read: async () => page.evaluate(() => {
      const w = window as any;
      const form = document.querySelector('form') as HTMLFormElement | null;
      const input = document.getElementById('team-name') as HTMLInputElement | null;
      const tagged = w.__n3.tag ? document.querySelector(`[data-n3-tag="${w.__n3.tag}"]`) as HTMLButtonElement | null : null;
      const btn = Array.from(document.querySelectorAll('button[type=submit]')).find((b) => /Create Team|Creating/.test(b.textContent || '')) as HTMLButtonElement | undefined;
      return { ...w.__n3, formValid: form ? form.checkValidity() : null, inputValueLength: input ? input.value.length : null,
        inputValid: input ? input.validity.valid : null, taggedButtonStillInDom: Boolean(tagged), submitButtonDisabled: btn ? btn.disabled : null } as
        { submitFired: number; creatingSeen: boolean; shown: string[]; clicks: string[]; formValid: boolean | null; inputValueLength: number | null; inputValid: boolean | null; taggedButtonStillInDom: boolean; submitButtonDisabled: boolean | null };
    }),
  };
}

export async function createTeamViaUI(page: Page, teamName: string): Promise<void> {
  await openTab(page, 'Teams');
  await page.getByRole('button', { name: 'Create Team', exact: true }).first().click();
  await page.getByLabel('Team Name').fill(teamName);
  const t0 = Date.now();
  const net = firestoreNetLog(page); // N2: network lifecycle, reported only on failure
  const probe = await teamCreateProbe(page); // N3: auth state, submit, pending state, UI texts
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
    const n3 = await probe.read().catch(() => null);
    test.info().annotations.push({ type: 'diag-data', description: `N2 createTeam "${teamName}" modalOpen=${modalOpen} creating=${creating} server=${JSON.stringify(saved)} shown=${JSON.stringify(visible.map((v) => v.replace(/\s+/g, ' ').slice(0, 120))).slice(0, 500)} n3={signedInAtSubmit:${probe.signedInAtSubmit},submitFired:${n3?.submitFired},creatingSeen:${n3?.creatingSeen},clicks:${JSON.stringify(n3?.clicks ?? [])},formValid:${n3?.formValid},inputLen:${n3?.inputValueLength},inputValid:${n3?.inputValid},buttonSameNode:${n3?.taggedButtonStillInDom},buttonDisabled:${n3?.submitButtonDisabled},toasts:${JSON.stringify(n3?.shown ?? []).slice(0, 300)}} net: ${net.summary(1200)}` });
    throw new Error(`Team "${teamName}" not confirmed within ${Date.now() - t0} ms. modalOpen=${modalOpen} `
      + `creating=${creating} teamsInFirestore=${JSON.stringify(saved)} visible=${JSON.stringify(visible).slice(0, 300)}`, { cause: err });
  }
}

export async function storage(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => Object.fromEntries(Object.entries(window.localStorage)));
}
