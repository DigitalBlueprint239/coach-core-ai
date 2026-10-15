// N2 investigation (Coach Drew directive, 2026-10-15): team creation can be
// persisted on the server while the dialog stays on "Creating...".
// These are DIAGNOSTIC tests: they record the lifecycle as 'diag-data'
// annotations and assert only safety facts (never more teams than the coach
// submitted; no loss of the submitted team). They do not prescribe a fix and
// are reported separately from acceptance tests.
import { test, expect, type Page, type Route } from '@playwright/test';
import { resetEmulators, adminTeamsOwnedBy, AUTH_ONLY } from './support/emulator';
import { coachEmail, skipOnboarding, signInAsBetaCoach, openTab, firestoreNetLog, createTeamViaUI, signOutViaUI } from './support/app';

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
  // Safety only: no duplicate, and no false success (a closed dialog means the team is on the server).
  expect(teams.length, 'never more teams than submitted').toBeLessThanOrEqual(1);
  if (closed >= 0) expect(teams.length, 'dialog closed, so the team must be on the server').toBe(1);
});

/** Shared runner for "hold one leg of the Write stream for 8 s" experiments. */
async function holdLeg(page: Page, label: string, leg: 'write-response' | 'backchannel') {
  const uid = await signInAsBetaCoach(page, coachEmail(`n2${label.toLowerCase()}`));
  const name = `N2 ${label}`;
  await openCreate(page, name);
  const releases: Array<() => void> = []; let holding = true; let posts = 0; let heldCount = 0;
  await page.route(/Firestore\/Write\/channel/, async (route: Route) => {
    const req = route.request();
    if (leg === 'write-response' && req.method() === 'POST') {
      posts += 1;
      if (holding && posts >= 2) { // 1st POST = handshake; 2nd carries the write
        const response = await route.fetch(); // delivered to the server now
        heldCount += 1; await new Promise<void>((r) => releases.push(r));
        await route.fulfill({ response }).catch(() => {}); return;
      }
    }
    if (leg === 'backchannel' && req.method() === 'GET' && holding) {
      heldCount += 1; await new Promise<void>((r) => releases.push(r)); // request not yet sent
    }
    await route.continue().catch(() => {});
  });
  const net = firestoreNetLog(page);
  const t0 = Date.now(); net.mark('click');
  await submit(page).click();
  const server = await until(async () => (await teamsNamed(uid, name)).length > 0, t0, 8_000);
  const closedWhileHeld = await until(async () => (await dialog(page).count()) === 0, t0, Math.max(0, 8_000 - (Date.now() - t0)));
  const serverAt8 = (await teamsNamed(uid, name)).length;
  holding = false; releases.splice(0).forEach((r) => r()); net.mark('release');
  const closed = closedWhileHeld >= 0 ? closedWhileHeld : await until(async () => (await dialog(page).count()) === 0, t0, 40_000);
  net.mark('end');
  const teams = await teamsNamed(uid, name);
  record(`${label} leg=${leg} held=${heldCount} server=${server}ms serverAt8s=${serverAt8} dialogClosedWhileHeld=${closedWhileHeld >= 0} dialogClosed=${closed}ms teams=${teams.length} net: ${net.summary(1200)}`);
  net.stop(); await page.unroute(/Firestore\/Write\/channel/);
  expect(teams.length, 'never more teams than submitted').toBeLessThanOrEqual(1);
  if (closed >= 0) expect(teams.length, 'dialog closed, so the team must be on the server').toBe(1);
}

test('N2-D3 [diagnostic] the write POST reaches the server but its HTTP response is held 8 s: which channel carries the acknowledgement?', async ({ page }) => {
  await holdLeg(page, 'D3', 'write-response');
});

test('N2-D4 [diagnostic] the Write stream back channel is held (not reset) 8 s: is the team saved while the dialog stays on Creating...?', async ({ page }) => {
  await holdLeg(page, 'D4', 'backchannel');
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

// ---------------------------------------------------------------------------
// N2 repair ACCEPTANCE tests (2026-10-15, Coach Drew N2-repair directive).
// They state the required behaviour; they are expected to FAIL on code without
// the repair (candidate 10 `186a743`) and are counted as acceptance tests once
// Codex's repair SHA is under test. The fault injection is the same as D1/D2.
// Status wording is matched loosely (proposed on #39): a role=status/alert
// whose text mentions saving, connection, offline or retry.
// ---------------------------------------------------------------------------
const savingStatus = (page: Page) => page.getByRole('status').or(page.getByRole('alert')).filter({ hasText: /saving|connection|offline|retry/i });

test('N2-A1 [acceptance] after the Write stream is reset and connectivity restored, the team is saved exactly once, the UI recovers, and an explicit saving/connection status is shown while unconfirmed', async ({ page }) => {
  const uid = await signInAsBetaCoach(page, coachEmail('n2a1'));
  const name = 'N2 Recovered';
  await openCreate(page, name);
  let blocking = true;
  await page.route(/Firestore\/Write\/channel/, async (route: Route) => {
    if (blocking && route.request().method() === 'GET') { await route.abort('connectionreset').catch(() => {}); return; }
    await route.continue().catch(() => {});
  });
  const net = firestoreNetLog(page);
  const t0 = Date.now(); net.mark('click');
  await submit(page).click();
  // While unconfirmed (within the 8 s outage) the coach must see an explicit status, not only a spinner.
  const statusAt = await until(async () => (await savingStatus(page).count()) > 0, t0, 8_000);
  await new Promise((r) => setTimeout(r, Math.max(0, 8_000 - (Date.now() - t0))));
  blocking = false; net.mark('restore');
  const tr = Date.now();
  const savedAt = await until(async () => (await teamsNamed(uid, name)).length > 0, tr, 30_000);
  const recoveredAt = await until(async () => (await dialog(page).count()) === 0
    && (await page.getByRole('heading', { name, exact: true }).count()) > 0, tr, 30_000);
  await new Promise((r) => setTimeout(r, 3_000)); // late-duplicate observation window
  const teams = await teamsNamed(uid, name);
  net.mark('end');
  record(`A1 statusAt=${statusAt}ms savedAfterRestore=${savedAt}ms recoveredAfterRestore=${recoveredAt}ms teams=${teams.length} net: ${net.summary(1000)}`);
  net.stop(); await page.unroute(/Firestore\/Write\/channel/);
  expect(statusAt, 'an explicit saving/connection status must appear while the save is unconfirmed').toBeGreaterThanOrEqual(0);
  expect(savedAt, 'the pending write must be sent after connectivity returns').toBeGreaterThanOrEqual(0);
  expect(teams.length, 'saved exactly once').toBe(1);
  expect(recoveredAt, 'the UI must recover: dialog closed and the team shown').toBeGreaterThanOrEqual(0);
});

test('N2-A2 [acceptance] cancelling or leaving during a pending create and trying again never produces a duplicate team', async ({ page }) => {
  const uid = await signInAsBetaCoach(page, coachEmail('n2a2'));
  const name = 'N2 No Duplicate';
  await openCreate(page, name);
  const held: Array<() => void> = []; let holding = true;
  await page.route(/Firestore\/Write\/channel/, async (route: Route) => {
    if (holding && route.request().method() === 'POST') { await new Promise<void>((r) => held.push(r)); }
    await route.continue().catch(() => {});
  });
  await submit(page).click();
  await expect(page.getByText('Creating...')).toBeVisible(); // positive anchor: the create is pending
  // The coach tries every way back to a fresh attempt the UI allows.
  const cancel = page.getByRole('button', { name: 'Cancel' });
  const cancelEnabled = (await cancel.count()) > 0 && await cancel.isEnabled();
  if (cancelEnabled) await cancel.click();
  await openTab(page, 'My Week');
  await openTab(page, 'Teams');
  let retried = false;
  const createButton = page.getByRole('button', { name: 'Create Team', exact: true }).first();
  if ((await createButton.count()) > 0 && await createButton.isEnabled()) {
    await createButton.click();
    const field = page.getByLabel('Team Name');
    if ((await field.count()) > 0) {
      await field.fill(name);
      if (await submit(page).isEnabled()) { await submit(page).click(); retried = true; }
    }
  }
  holding = false; held.splice(0).forEach((r) => r());
  const t0 = Date.now();
  const savedAt = await until(async () => (await teamsNamed(uid, name)).length > 0, t0, 30_000);
  await new Promise((r) => setTimeout(r, 5_000)); // late-duplicate observation window
  const teams = await teamsNamed(uid, name);
  record(`A2 cancelEnabled=${cancelEnabled} retrySubmitted=${retried} savedAfterRelease=${savedAt}ms teams=${teams.length}`);
  await page.unroute(/Firestore\/Write\/channel/);
  expect(savedAt, 'the pending team must be saved once delivered').toBeGreaterThanOrEqual(0);
  expect(teams.length, 'never a duplicate team').toBe(1);
});

// ---------------------------------------------------------------------------
// N3 diagnostic (2026-10-15): Create Team produced no request and no
// "Creating..." (D10-06b, Firefox, 1/10 at 186a743). Repeats the D10-06b
// pattern (coach A creates, signs out, coach B signs in and creates at once)
// and records the N3 probe for every creation. Fails only if an N3-like case
// occurs, so a reproduction is preserved; reported separately from acceptance.
// ---------------------------------------------------------------------------
test('N3-D5 [diagnostic] sign-out / sign-in / immediate Create Team cycles: auth state at submit, submit fired, pending state, request, persistence and UI text', async ({ page }) => {
  const rows: string[] = [];
  let failures = 0;
  for (let i = 0; i < 4; i += 1) {
    for (const who of ['a', 'b']) {
      const uid = await signInAsBetaCoach(page, coachEmail(`n3${who}${i}`));
      const name = `N3 ${who.toUpperCase()}${i}`;
      try {
        await createTeamViaUI(page, name);
        rows.push(`${who}${i}:ok`);
      } catch {
        failures += 1;
        rows.push(`${who}${i}:FAIL server=${(await teamsNamed(uid, name)).length}`);
        break;
      }
      await signOutViaUI(page);
    }
    if (failures) break;
  }
  record(`N3-D5 cycles=${rows.join(' ')}`);
  expect(failures, 'an N3-like creation failure occurred (see diag-data for the probe)').toBe(0);
});
