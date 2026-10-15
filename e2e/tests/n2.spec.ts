// N2 investigation (Coach Drew directive, 2026-10-15): team creation can be
// persisted on the server while the dialog stays on "Creating...".
// These are DIAGNOSTIC tests: they record the lifecycle as 'diag-data'
// annotations and assert only safety facts (never more teams than the coach
// submitted; no loss of the submitted team). They do not prescribe a fix and
// are reported separately from acceptance tests.
import { test, expect, type Page, type Route } from '@playwright/test';
import { resetEmulators, adminTeamsOwnedBy, AUTH_ONLY } from './support/emulator';
import { coachEmail, skipOnboarding, signInAsBetaCoach, openTab, firestoreNetLog } from './support/app';

test.beforeEach(async ({ context }) => {
  test.skip(AUTH_ONLY, 'needs the Firestore emulator');
  await resetEmulators();
  await skipOnboarding(context);
});

const record = (description: string) => test.info().annotations.push({ type: 'diag-data', description });
const dialog = (page: Page) => page.getByRole('heading', { name: 'Create New Team' });
async function openCreate(page: Page, name: string) {
  await openTab(page, 'Teams');
  await page.getByRole('button', { name: 'Create Team', exact: true }).first().click();
  await page.getByLabel('Team Name').fill(name);
}
const submit = (page: Page) => page.getByRole('button', { name: /Create Team|Creating/ }).last();
async function teamsNamed(uid: string, name: string) { return (await adminTeamsOwnedBy(uid)).filter((t) => t.name === name); }
/** Poll until fn() is true or the deadline passes; returns elapsed ms from `since`, or -1. */
async function until(fn: () => Promise<boolean>, since: number, deadlineMs: number): Promise<number> {
  while (Date.now() - since < deadlineMs) {
    if (await fn()) return Date.now() - since;
    await new Promise((r) => setTimeout(r, 50));
  }
  return -1;
}

test('N2-D0 [diagnostic] baseline lifecycle: server commit vs dialog close, Firestore channel traffic; exactly one team', async ({ page }) => {
  const uid = await signInAsBetaCoach(page, coachEmail('n2d0'));
  await openCreate(page, 'N2 Baseline');
  const net = firestoreNetLog(page);
  const t0 = Date.now(); net.mark('click');
  await submit(page).click();
  const [server, closed] = await Promise.all([
    until(async () => (await teamsNamed(uid, 'N2 Baseline')).length > 0, t0, 30_000),
    until(async () => (await dialog(page).count()) === 0, t0, 30_000),
  ]);
  net.mark('end');
  record(`D0 server=${server}ms dialogClosed=${closed}ms net: ${net.summary()}`);
  net.stop();
  expect(await teamsNamed(uid, 'N2 Baseline'), 'exactly one team created').toHaveLength(1);
});

test('N2-D1 [diagnostic] write reaches the server but its acknowledgement channel is cut for 8 s: does the dialog stick, recover, or duplicate?', async ({ page }) => {
  const uid = await signInAsBetaCoach(page, coachEmail('n2d1'));
  await openCreate(page, 'N2 Lost Ack');
  let blocking = true; let aborted = 0;
  // Only the Write stream's back channel (GET) is cut; the forward POST carrying the write goes through.
  await page.route(/Firestore\/Write\/channel/, async (route: Route) => {
    if (blocking && route.request().method() === 'GET') { aborted += 1; await route.abort('connectionreset').catch(() => {}); return; }
    await route.continue().catch(() => {});
  });
  const net = firestoreNetLog(page);
  const t0 = Date.now(); net.mark('click');
  await submit(page).click();
  const server = await until(async () => (await teamsNamed(uid, 'N2 Lost Ack')).length > 0, t0, 8_000);
  const stuckAt8s = (await dialog(page).count()) > 0;
  const creatingAt8s = await page.getByText('Creating...').isVisible().catch(() => false);
  await new Promise((r) => setTimeout(r, Math.max(0, 8_000 - (Date.now() - t0))));
  blocking = false; net.mark('unblock');
  const closed = await until(async () => (await dialog(page).count()) === 0, t0, 40_000);
  net.mark('end');
  const teams = await teamsNamed(uid, 'N2 Lost Ack');
  record(`D1 server=${server}ms stuckAt8s=${stuckAt8s} creatingAt8s=${creatingAt8s} abortedBackchannel=${aborted} dialogClosed=${closed}ms teams=${teams.length} net: ${net.summary(1200)}`);
  net.stop(); await page.unroute(/Firestore\/Write\/channel/);
  expect(teams.length, 'never more teams than submitted (1), and the submitted team is not lost').toBe(1);
});

test('N2-D2 [diagnostic] write held (pending, not on the server): coach cancels, leaves Teams, returns and creates again; how many teams result?', async ({ page }) => {
  const uid = await signInAsBetaCoach(page, coachEmail('n2d2'));
  await openCreate(page, 'N2 Retry');
  const held: Array<() => void> = [];
  let holding = true;
  await page.route(/Firestore\/Write\/channel/, async (route: Route) => {
    if (holding && route.request().method() === 'POST') { await new Promise<void>((r) => held.push(r)); }
    await route.continue().catch(() => {});
  });
  const t0 = Date.now();
  await submit(page).click();
  await expect(page.getByText('Creating...')).toBeVisible();
  const serverWhilePending = (await teamsNamed(uid, 'N2 Retry')).length;
  // The coach gives up on the stuck dialog.
  const cancelEnabled = await page.getByRole('button', { name: 'Cancel' }).isEnabled();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await openTab(page, 'My Week');
  await openTab(page, 'Teams');
  await page.getByRole('button', { name: 'Create Team', exact: true }).first().click();
  await page.getByLabel('Team Name').fill('N2 Retry');
  const retryEnabled = await submit(page).isEnabled();
  if (retryEnabled) await submit(page).click();
  // Release everything and let the SDK deliver.
  const heldPosts = held.length;
  holding = false; held.splice(0).forEach((r) => r());
  const settled = await until(async () => (await dialog(page).count()) === 0, t0, 40_000);
  await new Promise((r) => setTimeout(r, 3_000)); // observation window for late duplicates
  const teams = await teamsNamed(uid, 'N2 Retry');
  record(`D2 serverWhilePending=${serverWhilePending} cancelEnabledWhileCreating=${cancelEnabled} retrySubmitEnabled=${retryEnabled} heldPosts=${heldPosts} dialogSettled=${settled}ms teamsNamedSame=${teams.length}`);
  await page.unroute(/Firestore\/Write\/channel/);
  expect(teams.length, 'no more teams than submissions').toBeLessThanOrEqual(retryEnabled ? 2 : 1);
  expect(teams.length, 'the submitted team is not lost').toBeGreaterThanOrEqual(1);
});
