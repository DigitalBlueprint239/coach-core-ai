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
