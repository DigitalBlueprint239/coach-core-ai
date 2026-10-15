// N2 investigation (Coach Drew directive, 2026-10-15): team creation can be
// persisted on the server while the dialog stays on "Creating...".
// These are DIAGNOSTIC tests: they record the lifecycle as 'diag-data'
// annotations and assert only safety facts (never more teams than the coach
// submitted; no loss of the submitted team). They do not prescribe a fix and
// are reported separately from acceptance tests.
import { test, expect, type Page, type Route } from '@playwright/test';
import { resetEmulators, adminTeamsOwnedBy, adminTeamsFull, adminGet, adminSet, AUTH_ONLY } from './support/emulator';
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

// ---------------------------------------------------------------------------
// N2 REPAIR ACCEPTANCE on the actual transport (2026-10-15; #71 `bdb06ae`), IDs N2-R*.
// The original N2-A1/N2-A2 above (WebChannel fault model, pre-repair evidence 37)
// are preserved unchanged; they do not exercise the REST path.
// Team creation now uses REST: POST .../documents:commit (create-only, fixed
// team id saved on the device first) then GET .../documents/teams/{id}
// (authoritative readback). These tests fault THAT path. Requirements are not
// relaxed: an accessible role=status/alert matching the agreed wording within
// the 8 s outage; afterwards the same operation completes, exactly one team
// exists, and owner/ID/name/code on the server match the device's pending
// operation and the UI. Recovery may be automatic or via the UI's own retry
// control ("Check and retry" / "Resume team creation"); the mode is recorded.
// ---------------------------------------------------------------------------
const COMMIT = /\/documents:commit(\?|$)/;
const READBACK = /\/v1\/projects\/[^/]+\/databases\/\(default\)\/documents\/teams\/[A-Za-z0-9]{20}(\?|$)/;

/** The device's pending operation for uid (id, name, code); read for assertions only, never logged. */
async function pendingOp(page: Page, uid: string): Promise<{ id: string; name: string; code: string } | null> {
  return page.evaluate((u) => {
    const key = Object.keys(localStorage).find((k) => k.endsWith(`:${u}:team-create`));
    if (!key) return null;
    try { const o = JSON.parse(localStorage.getItem(key) || ''); return { id: o.id, name: o.name, code: o.code }; } catch { return null; }
  }, uid);
}
/** Ms from `since` until the agreed accessible status/alert is present, or -1 within `windowMs`. */
async function statusWithin(page: Page, since: number, windowMs: number) {
  return until(async () => (await savingStatus(page).count()) > 0, since, windowMs);
}
/** Recover as a coach would: wait for automatic completion, else use the UI's own retry controls. */
async function recover(page: Page, name: string): Promise<{ mode: string; ms: number }> {
  const done = async () => (await dialog(page).count()) === 0 && (await page.getByRole('heading', { name, exact: true }).count()) > 0;
  const t0 = Date.now();
  if (await until(done, t0, 12_000) >= 0) return { mode: 'automatic', ms: Date.now() - t0 };
  if ((await dialog(page).count()) === 0) {
    const resume = page.getByRole('button', { name: 'Resume team creation' });
    if (await resume.count()) await resume.click();
  }
  const retry = page.getByRole('button', { name: 'Check and retry' });
  if (await retry.count()) await retry.click();
  const ms = await until(done, Date.now(), 20_000);
  return { mode: ms >= 0 ? 'ui-retry' : 'not-recovered', ms: ms >= 0 ? Date.now() - t0 : -1 };
}
/** Authoritative agreement: exactly one team for uid, and it IS the pending operation (id, name, code, owner). */
async function expectExactlyTheOperation(uid: string, op: { id: string; name: string; code: string } | null, label: string) {
  expect(op, `${label}: a pending operation was recorded on the device before the request`).not.toBeNull();
  const teams = (await adminTeamsFull(uid)).filter((t) => t.name === op!.name);
  expect(teams, `${label}: exactly one team for this owner and name`).toHaveLength(1);
  expect(teams[0], `${label}: the server team is the same operation (id, name, code, owner)`)
    .toEqual({ id: op!.id, name: op!.name, code: op!.code, ownerId: uid });
}

test('N2-R1 [acceptance] REST commit held through an 8 s outage (request not yet at the server): accessible status within 8 s; the same operation completes once; server and UI agree', async ({ page }) => {
  const uid = await signInAsBetaCoach(page, coachEmail('n2ra1'));
  const name = 'N2 REST Held';
  await openCreate(page, name);
  const releases: Array<() => void> = []; let holding = true; let held = 0;
  await page.route(COMMIT, async (route: Route) => {
    if (holding) { held += 1; await new Promise<void>((r) => releases.push(r)); }
    await route.continue().catch(() => {});
  });
  const net = firestoreNetLog(page);
  const t0 = Date.now(); net.mark('click');
  await submit(page).click();
  const statusAt = await statusWithin(page, t0, 8_000);
  const op = await pendingOp(page, uid);
  const serverDuring = (await adminTeamsFull(uid)).length;
  await new Promise((r) => setTimeout(r, Math.max(0, 8_000 - (Date.now() - t0))));
  holding = false; releases.splice(0).forEach((r) => r()); net.mark('restore');
  const rec = await recover(page, name);
  await new Promise((r) => setTimeout(r, 3_000)); // late-duplicate window
  net.mark('end');
  record(`R1 heldCommits=${held} statusAt=${statusAt}ms serverDuringOutage=${serverDuring} recovery=${rec.mode}/${rec.ms}ms net: ${net.summary(900)}`);
  net.stop(); await page.unroute(COMMIT);
  expect(statusAt, 'accessible saving/connection status within the 8 s outage').toBeGreaterThanOrEqual(0);
  expect(serverDuring, 'nothing on the server while the request is held').toBe(0);
  expect(rec.mode, 'the operation completes after recovery and the UI shows the team').not.toBe('not-recovered');
  await expectExactlyTheOperation(uid, op, 'R1');
  expect(await pendingOp(page, uid), 'pending operation cleared after confirmation').toBeNull();
});

test('N2-R1b [acceptance] REST commit fails with a connection reset during an 8 s outage: accessible status within 8 s; after restore the same operation completes once; server and UI agree', async ({ page }) => {
  const uid = await signInAsBetaCoach(page, coachEmail('n2ra1b'));
  const name = 'N2 REST Reset';
  await openCreate(page, name);
  let blocking = true; let resets = 0;
  await page.route(COMMIT, async (route: Route) => {
    if (blocking) { resets += 1; await route.abort('connectionreset').catch(() => {}); return; }
    await route.continue().catch(() => {});
  });
  const net = firestoreNetLog(page);
  const t0 = Date.now(); net.mark('click');
  await submit(page).click();
  const statusAt = await statusWithin(page, t0, 8_000);
  const op = await pendingOp(page, uid);
  await new Promise((r) => setTimeout(r, Math.max(0, 8_000 - (Date.now() - t0))));
  const serverDuring = (await adminTeamsFull(uid)).length;
  blocking = false; net.mark('restore');
  const rec = await recover(page, name);
  await new Promise((r) => setTimeout(r, 3_000));
  net.mark('end');
  record(`R1b resets=${resets} statusAt=${statusAt}ms serverDuringOutage=${serverDuring} recovery=${rec.mode}/${rec.ms}ms net: ${net.summary(900)}`);
  net.stop(); await page.unroute(COMMIT);
  expect(statusAt, 'accessible saving/connection status within the 8 s outage').toBeGreaterThanOrEqual(0);
  expect(serverDuring, 'nothing on the server during the outage').toBe(0);
  expect(rec.mode, 'the operation completes after restore and the UI shows the team').not.toBe('not-recovered');
  await expectExactlyTheOperation(uid, op, 'R1b');
});

test('N2-R1c [acceptance] lost response AFTER server commit (commit delivered, its response dropped): accessible status within 8 s; recovery confirms the same team without a duplicate; server and UI agree', async ({ page }) => {
  const uid = await signInAsBetaCoach(page, coachEmail('n2ra1c'));
  const name = 'N2 REST Lost Response';
  await openCreate(page, name);
  let dropping = true; let dropped = 0; let committedStatus = 0;
  await page.route(COMMIT, async (route: Route) => {
    if (dropping) {
      dropping = false; // only the first commit
      const response = await route.fetch(); // reaches the server and commits
      committedStatus = response.status(); dropped += 1;
      await route.abort('connectionreset').catch(() => {}); return; // the client never sees the reply
    }
    await route.continue().catch(() => {});
  });
  const net = firestoreNetLog(page);
  const t0 = Date.now(); net.mark('click');
  await submit(page).click();
  const statusAt = await statusWithin(page, t0, 8_000);
  const op = await pendingOp(page, uid);
  const serverAfterCommit = (await adminTeamsFull(uid)).length;
  const rec = await recover(page, name);
  await new Promise((r) => setTimeout(r, 3_000));
  net.mark('end');
  record(`R1c dropped=${dropped} serverCommitStatus=${committedStatus} statusAt=${statusAt}ms serverAfterCommit=${serverAfterCommit} recovery=${rec.mode}/${rec.ms}ms net: ${net.summary(900)}`);
  net.stop(); await page.unroute(COMMIT);
  expect(committedStatus, 'the commit really reached the server').toBe(200);
  expect(statusAt, 'accessible saving/connection status within 8 s').toBeGreaterThanOrEqual(0);
  expect(rec.mode, 'the UI recovers and shows the team').not.toBe('not-recovered');
  await expectExactlyTheOperation(uid, op, 'R1c');
});

test('N2-R2 [acceptance] REST create held pending; coach leaves and returns to Teams and tries the same team again: pending stays recoverable; exactly one team (owner, ID, name, code)', async ({ page }) => {
  const uid = await signInAsBetaCoach(page, coachEmail('n2ra2'));
  const name = 'N2 REST Pending';
  await openCreate(page, name);
  const releases: Array<() => void> = []; let holding = true;
  await page.route(COMMIT, async (route: Route) => {
    if (holding) await new Promise<void>((r) => releases.push(r));
    await route.continue().catch(() => {});
  });
  await submit(page).click();
  await expect(savingStatus(page).first()).toBeVisible(); // positive anchor: pending, with status
  const op = await pendingOp(page, uid);
  const cancel = page.getByRole('button', { name: 'Cancel' });
  if (await cancel.count() && await cancel.isEnabled()) await cancel.click();
  await openTab(page, 'My Week');
  await openTab(page, 'Teams');
  const resumeVisible = await page.getByRole('button', { name: 'Resume team creation' }).isVisible().catch(() => false);
  // Try every route to a second submission the UI allows.
  let secondSubmit = false;
  const create = page.getByRole('button', { name: 'Create Team', exact: true }).first();
  if (await create.count() && await create.isEnabled()) {
    await create.click();
    const field = page.getByLabel('Team Name');
    if (await field.count() && await field.isEnabled()) await field.fill(name);
    const btn = submit(page);
    if (await btn.count() && await btn.isEnabled()) { await btn.click(); secondSubmit = true; }
  }
  holding = false; releases.splice(0).forEach((r) => r());
  const rec = await recover(page, name);
  await new Promise((r) => setTimeout(r, 5_000)); // late-duplicate window
  record(`R2 resumeVisibleWhilePending=${resumeVisible} secondSubmitPossible=${secondSubmit} recovery=${rec.mode}/${rec.ms}ms`);
  await page.unroute(COMMIT);
  expect(resumeVisible, 'the pending creation stays visible and resumable on Teams').toBe(true);
  expect(rec.mode, 'the pending creation completes').not.toBe('not-recovered');
  await expectExactlyTheOperation(uid, op, 'R2');
});

test('N2-R3 [acceptance] pending REST creation survives a page refresh and the same coach recovers it once', async ({ page }) => {
  const uid = await signInAsBetaCoach(page, coachEmail('n2ra3'));
  const name = 'N2 REST Refresh';
  await openCreate(page, name);
  let holding = true;
  await page.route(COMMIT, async (route: Route) => {
    if (holding) { await route.abort('connectionreset').catch(() => {}); return; } // never reaches the server
    await route.continue().catch(() => {});
  });
  await submit(page).click();
  await expect(savingStatus(page).first()).toBeVisible();
  const op = await pendingOp(page, uid);
  await page.reload();
  holding = false;
  await openTab(page, 'Teams');
  await expect(page.getByRole('button', { name: 'Resume team creation' }), 'pending creation survives refresh').toBeVisible();
  const rec = await recover(page, name);
  await new Promise((r) => setTimeout(r, 3_000));
  record(`R3 recovery=${rec.mode}/${rec.ms}ms`);
  await page.unroute(COMMIT);
  expect(rec.mode).not.toBe('not-recovered');
  await expectExactlyTheOperation(uid, op, 'R3');
});

test('N2-R4 [acceptance] account isolation A -> B -> A: B cannot see or resume A\'s pending team; A recovers it once', async ({ page }) => {
  const emailA = coachEmail('n2ra4a');
  const uidA = await signInAsBetaCoach(page, emailA);
  const name = 'N2 REST Isolation';
  await openCreate(page, name);
  let holding = true;
  await page.route(COMMIT, async (route: Route) => {
    if (holding) { await route.abort('connectionreset').catch(() => {}); return; }
    await route.continue().catch(() => {});
  });
  await submit(page).click();
  await expect(savingStatus(page).first()).toBeVisible();
  const opA = await pendingOp(page, uidA);
  const cancel = page.getByRole('button', { name: 'Cancel' });
  if (await cancel.count() && await cancel.isEnabled()) await cancel.click();
  holding = false;
  await signOutViaUI(page);
  const uidB = await signInAsBetaCoach(page, coachEmail('n2ra4b'));
  await openTab(page, 'Teams');
  // Positive anchor for B's Teams page, then isolation checks.
  await expect(page.getByRole('main').getByText('No team selected')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume team creation' }), 'B cannot resume A\'s pending team').toHaveCount(0);
  await expect(page.getByText(name), 'A\'s pending team name is not shown to B').toHaveCount(0);
  expect(await pendingOp(page, uidB), 'B has no pending operation').toBeNull();
  await signOutViaUI(page);
  await signInAsBetaCoach(page, emailA);
  await openTab(page, 'Teams');
  await expect(page.getByRole('button', { name: 'Resume team creation' }), 'A can resume').toBeVisible();
  const rec = await recover(page, name);
  await new Promise((r) => setTimeout(r, 3_000));
  record(`R4 recovery=${rec.mode}/${rec.ms}ms`);
  await page.unroute(COMMIT);
  expect(rec.mode).not.toBe('not-recovered');
  await expectExactlyTheOperation(uidA, opA, 'R4');
  expect((await adminTeamsFull(uidB)).filter((t) => t.name === name), 'nothing under B').toHaveLength(0);
});


/** No success shown: dialog still open, no success toast, no team heading. */
async function noSuccessShown(page: Page, name: string) {
  return (await dialog(page).count()) > 0
    && (await page.getByText('Team created successfully!').count()) === 0
    && (await page.getByRole('heading', { name, exact: true }).count()) === 0;
}

test('N2-R5 [acceptance] commit appears to succeed but the authoritative readback finds nothing: no success is reported; after recovery the same operation is created once at the original ID', async ({ page }) => {
  const uid = await signInAsBetaCoach(page, coachEmail('n2rr5'));
  const name = 'N2 REST Readback';
  await openCreate(page, name);
  let faking = true; let faked = 0;
  await page.route(COMMIT, async (route: Route) => {
    if (faking) { // the request never reaches the server; the client is told it succeeded
      faked += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ writeResults: [{}], commitTime: new Date().toISOString() }) }).catch(() => {});
      return;
    }
    await route.continue().catch(() => {});
  });
  const net = firestoreNetLog(page);
  const t0 = Date.now(); net.mark('click');
  await submit(page).click();
  const statusAt = await statusWithin(page, t0, 8_000);
  const op = await pendingOp(page, uid);
  await new Promise((r) => setTimeout(r, Math.max(0, 8_000 - (Date.now() - t0))));
  const noFalseSuccess = await noSuccessShown(page, name);
  const serverDuring = (await adminTeamsFull(uid)).length;
  faking = false; net.mark('restore');
  const rec = await recover(page, name);
  await new Promise((r) => setTimeout(r, 3_000));
  net.mark('end');
  record(`R5 fakedCommits=${faked} statusAt=${statusAt}ms noFalseSuccessAt8s=${noFalseSuccess} serverDuring=${serverDuring} recovery=${rec.mode}/${rec.ms}ms net: ${net.summary(900)}`);
  net.stop(); await page.unroute(COMMIT);
  expect(faked, 'the fault was applied').toBeGreaterThan(0);
  expect(statusAt, 'accessible saving/connection status within 8 s').toBeGreaterThanOrEqual(0);
  expect(serverDuring, 'nothing on the server').toBe(0);
  expect(noFalseSuccess, 'a commit response without authoritative readback must not be reported as success').toBe(true);
  expect(rec.mode).not.toBe('not-recovered');
  await expectExactlyTheOperation(uid, op, 'R5');
});

test('N2-R6 [acceptance] a different team already exists at the operation\'s document ID: no success, no overwrite, no second team, even after Check and retry', async ({ page }) => {
  const uid = await signInAsBetaCoach(page, coachEmail('n2rr6'));
  const name = 'N2 REST Mismatch';
  await openCreate(page, name);
  const releases: Array<() => void> = []; let holding = true;
  await page.route(COMMIT, async (route: Route) => {
    if (holding) await new Promise<void>((r) => releases.push(r));
    await route.continue().catch(() => {});
  });
  const t0 = Date.now();
  await submit(page).click();
  const statusAt = await statusWithin(page, t0, 8_000);
  const op = await pendingOp(page, uid);
  expect(op, 'pending operation recorded before the request').not.toBeNull();
  // A different team (same owner, different name/code) occupies the operation's ID on the server.
  const t = new Date();
  await adminSet(`teams/${op!.id}`, { name: 'Existing Different Team', code: 'ZZZZ2222', ownerId: uid, memberIds: [uid], createdAt: t, updatedAt: t });
  const before = await adminGet(`teams/${op!.id}`);
  holding = false; releases.splice(0).forEach((r) => r());
  // Give the app time to resolve, then use its own retry control once.
  await new Promise((r) => setTimeout(r, 12_000));
  const noSuccessFirst = await noSuccessShown(page, name);
  const alertShown = (await page.getByRole('alert').count()) > 0;
  const retry = page.getByRole('button', { name: 'Check and retry' });
  let retried = false;
  if (await retry.count() && await retry.isEnabled()) { await retry.click(); retried = true; await new Promise((r) => setTimeout(r, 8_000)); }
  const noSuccessAfterRetry = await noSuccessShown(page, name);
  const after = await adminGet(`teams/${op!.id}`);
  const mine = (await adminTeamsFull(uid)).filter((x) => x.name === name);
  record(`R6 statusAt=${statusAt}ms noSuccess=${noSuccessFirst} alert=${alertShown} retried=${retried} noSuccessAfterRetry=${noSuccessAfterRetry} unchanged=${JSON.stringify(after) === JSON.stringify(before)} teamsWithName=${mine.length}`);
  await page.unroute(COMMIT);
  expect(statusAt, 'accessible saving/connection status within 8 s').toBeGreaterThanOrEqual(0);
  expect(noSuccessFirst, 'mismatching server data is not reported as success').toBe(true);
  expect(alertShown, 'the coach is told the creation was not confirmed').toBe(true);
  expect(noSuccessAfterRetry, 'still no success after Check and retry').toBe(true);
  expect(after, 'the existing team is not overwritten').toEqual(before);
  expect(mine, 'no second team with the submitted name').toHaveLength(0);
});
