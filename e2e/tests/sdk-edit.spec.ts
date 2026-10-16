// A4a (release-gate queue, 2026-10-16). Practice-plan EDITS go through runTransaction in
// features/persistence/gateway.ts. Evidence 55 (first version of these tests) showed that
// path never touches the SDK Write STREAM (/Firestore/Write/channel): faultHits=0 in 40/40,
// because SDK transactions use the unary documents:commit RPC. These DIAGNOSTIC tests
// therefore fault THAT transport during an edit: a connection reset, and a hold of the
// commit POST (request not yet at the server). They record what the coach sees and assert
// only safety facts: never "saved" without the server holding the edit, exactly one
// document, the edit never lost. Recovery mode is recorded, not required.
import { test, expect, type Page, type Route } from '@playwright/test';
import { resetEmulators, adminQuery, AUTH_ONLY } from './support/emulator';
import { coachEmail, skipOnboarding, signInAsBetaCoach, openTab, createTeamViaUI } from './support/app';

test.beforeEach(async ({ context }) => {
  test.skip(AUTH_ONLY, 'needs the Firestore emulator');
  await resetEmulators();
  await skipOnboarding(context);
});
const record = (d: string) => test.info().annotations.push({ type: 'diag-data', description: d });
const planStatus = (page: Page) => page.getByRole('status', { name: 'Practice save status' });
const field = (page: Page, path: string) => page.getByLabel(path, { exact: true });
const savePlan = (page: Page) => page.getByRole('button', { name: 'Save practice plan', exact: true }).click();
async function plansOf(uid: string) { return adminQuery('practicePlans', 'createdBy', uid); }
async function until(fn: () => Promise<boolean>, since: number, deadlineMs: number): Promise<number> {
  while (Date.now() - since < deadlineMs) { if (await fn()) return Date.now() - since; await new Promise((r) => setTimeout(r, 100)); }
  return -1;
}

async function savedPlan(page: Page, label: string) {
  const uid = await signInAsBetaCoach(page, coachEmail(label));
  await createTeamViaUI(page, 'Edit Path Owls');
  await openTab(page, 'Practice Plans');
  await expect(page.getByRole('heading', { name: 'Practice Planner' })).toBeVisible();
  await field(page, 'Plan.name').fill('Edit path plan');
  await savePlan(page);
  await expect(planStatus(page)).toHaveText('saved'); // REST create-only path
  const [doc] = await plansOf(uid);
  expect(doc.data).toMatchObject({ name: 'Edit path plan', revision: 1 });
  return { uid, id: doc.id };
}

/** Apply `fault` to the SDK Write channel for 8 s around an edit save; record and safety-check. */
const COMMIT = /\/documents:commit(\?|$)/;
async function editUnderFault(page: Page, label: string, fault: 'commit-reset' | 'commit-hold') {
  const { uid, id } = await savedPlan(page, label);
  const edited = 'Edit path plan v2';
  await field(page, 'Plan.name').fill(edited);
  let faulting = true; let hits = 0; const releases: Array<() => void> = [];
  await page.route(COMMIT, async (route: Route) => {
    if (faulting && fault === 'commit-reset') { hits += 1; await route.abort('connectionreset').catch(() => {}); return; }
    if (faulting && fault === 'commit-hold') { hits += 1; await new Promise<void>((r) => releases.push(r)); }
    await route.continue().catch(() => {});
  });
  const t0 = Date.now();
  await savePlan(page);
  // Sample what the coach sees during the 8 s window; check the server for a false "saved".
  const seen: string[] = []; let falseSaved = false;
  while (Date.now() - t0 < 8_000) {
    const s = (await planStatus(page).textContent().catch(() => '?'))?.trim() || '?';
    if (seen[seen.length - 1] !== s) seen.push(`${Date.now() - t0}ms:${s}`);
    if (s === 'saved') {
      const docs = await plansOf(uid);
      if (!(docs.length === 1 && docs[0].data.revision === 2 && docs[0].data.name === edited)) falseSaved = true;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  const serverAt8 = (await plansOf(uid)).map((d) => ({ rev: d.data.revision, name: d.data.name }));
  const errorAt8 = await page.getByRole('alert').allInnerTexts().catch(() => []);
  faulting = false; releases.splice(0).forEach((r) => r());
  const recoveredAt = await until(async () => (await planStatus(page).textContent().catch(() => ''))?.trim() === 'saved'
    && (await plansOf(uid)).some((d) => d.data.revision === 2 && d.data.name === edited), Date.now(), 45_000); // CC-P17's existing reconnect window
  const finalDocs = await plansOf(uid);
  const finalStatus = (await planStatus(page).textContent().catch(() => '?'))?.trim();
  record(`${label} fault=${fault} faultHits=${hits} statusSeries=${JSON.stringify(seen)} serverAt8s=${JSON.stringify(serverAt8)} alertsAt8s=${JSON.stringify(errorAt8.map((t) => t.slice(0, 80)))} recoveredAfterRestore=${recoveredAt >= 0 ? recoveredAt + 'ms' : 'NOT within 45 s'} finalStatus=${finalStatus} finalDocs=${JSON.stringify(finalDocs.map((d) => ({ rev: d.data.revision, name: d.data.name })))}`);
  await page.unroute(COMMIT);
  // Safety facts only.
  expect(hits, 'the fault was applied').toBeGreaterThan(0);
  expect(falseSaved, 'never "saved" while the server lacks the edit').toBe(false);
  expect(finalDocs, 'exactly one practice plan document').toHaveLength(1);
  expect(finalDocs[0].id).toBe(id);
  const landed = finalDocs[0].data.revision === 2 && finalDocs[0].data.name === edited;
  if (finalStatus === 'saved') expect(landed, '"saved" means the server holds revision 2 with the edit').toBe(true);
  if (!landed) expect(finalStatus, 'an unsaved edit is never shown as saved').not.toBe('saved');
}

test('CC-E1 [diagnostic] SDK edit path: documents:commit reset for 8 s during a practice-plan edit save — what the coach sees; never false "saved"; one document; edit not lost', async ({ page }) => {
  await editUnderFault(page, 'e1', 'commit-reset');
});
test('CC-E2 [diagnostic] SDK edit path: documents:commit held (request not at the server) for 8 s during a practice-plan edit save — does the save hang on "saving"?', async ({ page }) => {
  await editUnderFault(page, 'e2', 'commit-hold');
});

// ---------------------------------------------------------------------------
// A4b draft-retention coverage (2026-10-16). After the real edit commit FAILS (resets
// until the SDK gives up and the UI shows "failed"), every edited field must still hold
// the unsaved value; then connectivity returns and the coach re-saves with the existing
// button; the server must then hold exactly the intended values (authoritative readback),
// with no false "saved" before, exactly one record, and untouched fields unchanged.
// Diagnostic tag kept: these record behaviour; the safety facts are asserted.
// ---------------------------------------------------------------------------
/** Reset every documents:commit until restored; the caller waits for the UI's own "failed" state. */
async function resetCommits(page: Page, label: string) {
  let faulting = true; let hits = 0; const t0 = Date.now();
  await page.route(COMMIT, async (route: Route) => {
    if (faulting) { hits += 1; await route.abort('connectionreset').catch(() => {}); return; }
    await route.continue().catch(() => {});
  });
  return { restore: async () => { faulting = false; await page.unroute(COMMIT); record(`${label} commitResets=${hits} faultWindow=${Date.now() - t0}ms`); expect(hits, 'the fault was applied').toBeGreaterThan(0); } };
}

test('CC-E3 [diagnostic] practice plan: edited name, notes and a period focus survive a failed commit in the editor; manual re-save after restore lands exactly once with the intended values', async ({ page }) => {
  const { uid, id } = await savedPlan(page, 'e3');
  const v1 = (await plansOf(uid))[0];
  const edits = { 'Plan.name': 'Edit path plan v2', 'Plan.notes': 'Retention notes ' + 'x'.repeat(200) } as const;
  for (const [k, v] of Object.entries(edits)) await field(page, k).fill(v);
  await expect(planStatus(page)).toHaveText('unsaved');
  const fault = await resetCommits(page, 'E3');
  await savePlan(page);
  await expect(planStatus(page), 'the failed save is reported').toHaveText('failed', { timeout: 45_000 });
  // 1. Every edited field still holds the unsaved value; the server still holds v1.
  const retained = Object.fromEntries(await Promise.all(Object.keys(edits).map(async (k) => [k, (await field(page, k).inputValue()).slice(0, 40)])));
  const draftsWithEdit = await page.evaluate((u) => Object.entries(localStorage).filter(([k, v]) => k.startsWith(`coachcore:v1:${u}:`) && k.includes(':drafts:') && v.includes('Edit path plan v2')).length, uid);
  record(`E3 afterFailure fields=${JSON.stringify(retained)} draftsWithEdit=${draftsWithEdit} status=${(await planStatus(page).textContent())?.trim()}`);
  for (const [k, v] of Object.entries(edits)) await expect(field(page, k), `${k} retained after failure`).toHaveValue(v);
  const alert = (await page.getByRole('alert').allInnerTexts()).join(' | ');
  expect((await plansOf(uid)).map((d) => ({ id: d.id, rev: d.data.revision, name: d.data.name }))).toEqual([{ id, rev: 1, name: 'Edit path plan' }]);
  // 2. Restore connectivity; nothing changes on its own within a short observation window (recorded, not required).
  await fault.restore();
  const autoAt = await until(async () => (await planStatus(page).textContent())?.trim() === 'saved', Date.now(), 5_000);
  // 3. Manual re-save with the existing control.
  await savePlan(page);
  await expect(planStatus(page)).toHaveText('saved', { timeout: 45_000 });
  // 4. Authoritative readback: exactly one record, revision 2, intended values, untouched fields unchanged.
  const docs = await plansOf(uid);
  record(`E3 alertAfterFailure="${alert.slice(0, 80)}" autoRecoveredWithin5s=${autoAt >= 0} finalDocs=${JSON.stringify(docs.map((d) => ({ rev: d.data.revision, name: d.data.name })))}`);
  expect(docs).toHaveLength(1);
  expect(docs[0].id).toBe(id);
  expect(docs[0].data).toMatchObject({ revision: 2, name: edits['Plan.name'], notes: edits['Plan.notes'], teamId: v1.data.teamId, createdBy: uid });
  expect(docs[0].data.periods, 'untouched periods unchanged').toEqual(v1.data.periods);
  expect(docs[0].data.duration, 'untouched field unchanged').toEqual(v1.data.duration);
  expect(docs[0].data.goals, 'untouched goals unchanged').toEqual(v1.data.goals);
  expect(String(docs[0].data.createdAt), 'createdAt unchanged').toBe(String(v1.data.createdAt));
});

test('CC-E4 [diagnostic] Smart Playbook play: edited name survives a failed commit in the editor; manual re-save after restore lands exactly once with players and routes unchanged', async ({ page }) => {
  const uid = await signInAsBetaCoach(page, coachEmail('e4'));
  await createTeamViaUI(page, 'Edit Path Owls');
  await openTab(page, 'Smart Playbook');
  await page.getByRole('button', { name: /Shotgun/ }).click();
  await page.getByPlaceholder('Enter play name...').fill('Mesh');
  await page.getByRole('button', { name: 'Save Play', exact: true }).first().click();
  await page.getByRole('button', { name: 'Save Play', exact: true }).last().click();
  const status = page.getByRole('status', { name: 'Play save status' });
  await expect(status).toHaveText('saved');
  const [v1] = await adminQuery('plays', 'createdBy', uid);
  expect(v1.data).toMatchObject({ name: 'Mesh', revision: 1 });
  await page.getByPlaceholder('Enter play name...').fill('Mesh after failure');
  await expect(status).toHaveText('unsaved');
  const fault = await resetCommits(page, 'E4');
  await page.getByRole('button', { name: 'Save Play', exact: true }).first().click();
  await page.getByRole('button', { name: 'Save Play', exact: true }).last().click();
  await expect(status, 'the failed save is reported').toHaveText('failed', { timeout: 45_000 });
  const nameNow = await page.getByPlaceholder('Enter play name...').inputValue();
  const draftsWithEdit = await page.evaluate((u) => Object.entries(localStorage).filter(([k, v]) => k.startsWith(`coachcore:v1:${u}:`) && k.includes(':drafts:') && v.includes('Mesh after failure')).map(([k]) => k.split(':').slice(3, 5).join(':')), uid);
  const alerts = (await page.getByRole('alert').allInnerTexts()).map((t) => t.slice(0, 100));
  record(`E4 afterFailure nameField=${JSON.stringify(nameNow)} draftsWithEdit=${JSON.stringify(draftsWithEdit)} status=${(await status.textContent())?.trim()} alerts=${JSON.stringify(alerts)}`);
  await expect(page.getByPlaceholder('Enter play name...'), 'edited name retained after failure').toHaveValue('Mesh after failure');
  expect((await adminQuery('plays', 'createdBy', uid)).map((d) => ({ id: d.id, rev: d.data.revision, name: d.data.name }))).toEqual([{ id: v1.id, rev: 1, name: 'Mesh' }]);
  await fault.restore();
  const autoAt = await until(async () => (await status.textContent())?.trim() === 'saved', Date.now(), 5_000);
  await page.getByRole('button', { name: 'Save Play', exact: true }).first().click();
  await page.getByRole('button', { name: 'Save Play', exact: true }).last().click();
  await expect(status).toHaveText('saved', { timeout: 45_000 });
  const docs = await adminQuery('plays', 'createdBy', uid);
  record(`E4 autoRecoveredWithin5s=${autoAt >= 0} finalDocs=${JSON.stringify(docs.map((d) => ({ rev: d.data.revision, name: d.data.name })))}`);
  expect(docs).toHaveLength(1);
  expect(docs[0].id).toBe(v1.id);
  expect(docs[0].data).toMatchObject({ name: 'Mesh after failure', revision: 2, teamId: v1.data.teamId, createdBy: uid });
  expect(docs[0].data.players).toEqual(v1.data.players);
  expect(docs[0].data.routes).toEqual(v1.data.routes);
});
