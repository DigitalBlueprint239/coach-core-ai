// CC02 / CC03 independent acceptance (PR #59/#60), real browser -> app ->
// Firestore emulator with repository rules. Written by Claude from Codex's
// exact-SHA handoff (selectors only); Codex's own tests/coaching-ui/** are
// implementation evidence and are not reused here.
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resetEmulators, adminSet, adminGet, adminQuery, adminTeamsOwnedBy, AUTH_ONLY } from './support/emulator';
import {
  coachEmail, skipOnboarding, signInAsBetaCoach, signOutViaUI, createTeamViaUI, openTab, signInScreen,
  storage, waitForE2EHooks,
} from './support/app';
import { commitControl } from './support/legacy';

test.beforeEach(async ({ context, page }) => {
  test.skip(AUTH_ONLY, 'needs the Firestore emulator');
  await resetEmulators();
  await skipOnboarding(context);
  await context.addInitScript(() => { try { localStorage.setItem('smartPlaybook_onboarding_complete', 'true'); } catch { /* */ } });
  page.on('dialog', (d) => { void d.accept(); }); // confirm() prompts are accepted explicitly by the scenario
});

async function coach(page: Page, label: string, team = 'Owls') {
  const email = coachEmail(label);
  const uid = await signInAsBetaCoach(page, email);
  await createTeamViaUI(page, team);
  const teamId = (await storage(page)).currentTeamId as string;
  return { email, uid, teamId };
}
const planner = async (page: Page) => {
  await openTab(page, 'Practice Plans');
  await expect(page.getByRole('heading', { name: 'Practice Planner' })).toBeVisible();
};
const planStatus = (page: Page) => page.getByRole('status', { name: 'Practice save status' });
const savePlan = (page: Page) => page.getByRole('button', { name: 'Save practice plan', exact: true }).click();
const field = (page: Page, path: string) => page.getByLabel(path, { exact: true });
const draftsOf = (page: Page, uid: string) => page.evaluate((u) => Object.entries(localStorage)
  .filter(([k]) => k.startsWith(`coachcore:v1:${u}:`) && k.includes(':drafts:'))
  .map(([k, v]) => ({ key: k, env: JSON.parse(v) })), uid);
async function plansOf(uid: string) { return adminQuery('practicePlans', 'createdBy', uid); }
async function downloadJson(page: Page, click: () => Promise<void>) {
  const [dl] = await Promise.all([page.waitForEvent('download'), click()]);
  return JSON.parse(await readFile((await dl.path())!, 'utf8'));
}
async function newTabSameProfile(context: BrowserContext, email: string) {
  const p = await context.newPage();
  p.on('dialog', (d) => { void d.accept(); });
  await p.goto('/');
  await expect(p.getByText(`Welcome, ${email}`)).toBeVisible();
  return p;
}

// ---------------------------------------------------------------- P10 / P11
test('CC-P10 shared profile: A signs out anyway with an unsynced draft; B sees a blank planner, no A records or drafts, and nothing is uploaded under B', async ({ page }) => {
  const a = await coach(page, 'p10a');
  await planner(page);
  await field(page, 'Plan.name').fill('A private plan');
  await field(page, 'Plan.notes').fill('A unsynced note');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Unsynced draft recovery' })).toBeVisible();
  await page.evaluate(() => { (window as any).__beforeSignOut = true; });
  await page.getByRole('button', { name: 'Sign out anyway', exact: true }).click();
  await page.waitForFunction(() => !(window as any).__beforeSignOut && document.readyState === 'complete');
  await expect(signInScreen(page)).toBeVisible();
  const aDrafts = await draftsOf(page, a.uid);
  expect(aDrafts.map((d) => d.env.fields.notes)).toContain('A unsynced note'); // retained for A (agreed contract)

  const b = await coach(page, 'p10b', 'B Team');
  await planner(page);
  await expect(field(page, 'Plan.name')).toHaveValue('New practice');
  await expect(field(page, 'Plan.notes')).toHaveValue('');
  await expect(page.getByRole('list', { name: 'Saved practice plans' })).not.toContainText('A private plan');
  await page.getByRole('button', { name: 'Find other device drafts' }).first().click();
  await expect(page.getByRole('button', { name: /Recover draft/ })).toHaveCount(0);
  expect(await draftsOf(page, b.uid)).toEqual([]);
  expect(await plansOf(b.uid)).toEqual([]);
  expect(await plansOf(a.uid)).toEqual([]); // A's unsynced draft was never uploaded by anyone
});

test('CC-P10b [SDK-in-browser] B is denied A\'s saved plan and A\'s team; the same write into B\'s own team is authorized', async ({ page }) => {
  const a = await coach(page, 'p10ba');
  await planner(page);
  await field(page, 'Plan.name').fill('A saved plan');
  await savePlan(page);
  await expect(planStatus(page)).toHaveText('saved');
  const [aPlan] = await plansOf(a.uid);
  await signOutViaUI(page);
  const b = await coach(page, 'p10bb', 'B Team');
  await waitForE2EHooks(page);
  const hook = (fn: string, ...args: unknown[]) =>
    page.evaluate(([f, x]) => (window as any).__coachCoreE2E[f as string](...(x as unknown[])), [fn, args] as const);
  const now = { __ts: new Date().toISOString() };
  const body = (teamId: string) => ({ name: 'Injected', teamId, createdBy: b.uid, revision: 1, createdAt: now, updatedAt: now });
  expect(await hook('get', `practicePlans/${aPlan.id}`)).toEqual({ ok: false, code: 'permission-denied' });
  expect(await hook('update', `practicePlans/${aPlan.id}`, { name: 'Hijack', revision: 2, updatedAt: now })).toEqual({ ok: false, code: 'permission-denied' });
  expect(await hook('set', 'practicePlans/inject-a', body(a.teamId))).toEqual({ ok: false, code: 'permission-denied' });
  expect(await hook('set', 'practicePlans/own-b', body(b.teamId))).toEqual({ ok: true });
  expect((await adminGet(`practicePlans/${aPlan.id}`))?.name).toBe('A saved plan');
});

test('CC-P11 team switch while a plan save is held: the copy stays in team A, team B sees nothing of it, A\'s draft stays under A\'s team key', async ({ page }) => {
  const a = await coach(page, 'p11', 'Alpha');
  await createTeamViaUI(page, 'Bravo');
  await planner(page);
  await field(page, 'Plan.name').fill('Alpha plan in flight');
  const net = commitControl(page); await net.ready; net.holdFrom(1);
  await savePlan(page);
  await net.waitFor(1);
  await openTab(page, 'Teams');
  await page.getByRole('button', { name: 'Switch to' }).click();
  const bravo = (await storage(page)).currentTeamId;
  expect(bravo).not.toBe(a.teamId);
  net.pass(); net.release();
  await expect.poll(async () => (await plansOf(a.uid)).length).toBe(1);
  const [doc] = await plansOf(a.uid);
  expect(doc.data).toMatchObject({ name: 'Alpha plan in flight', teamId: a.teamId, createdBy: a.uid, revision: 1 });
  await planner(page);
  await expect(field(page, 'Plan.name')).toHaveValue('New practice');
  await expect(page.getByRole('list', { name: 'Saved practice plans' })).not.toContainText('Alpha plan in flight');
  const drafts = await draftsOf(page, a.uid);
  expect(drafts.every((d) => d.env.scope.teamId === a.teamId || d.env.fields.name !== 'Alpha plan in flight')).toBe(true);
  expect(drafts.some((d) => d.key.includes(`:${bravo}:`) && d.env.fields.name === 'Alpha plan in flight')).toBe(false);
});

// ---------------------------------------------------------------- P12
test('CC-P12 sign-out guard: Cancel keeps the editor; a failing Sync keeps the coach signed in with drafts; Export downloads only this coach\'s drafts; Sync now persists then signs out', async ({ page }) => {
  const a = await coach(page, 'p12');
  await planner(page);
  await field(page, 'Plan.name').fill('Guarded plan');
  await field(page, 'Plan.notes').fill('Keep me');
  const signOut = () => page.getByRole('button', { name: 'Sign out', exact: true }).click();
  const guard = page.getByRole('dialog', { name: 'Unsynced draft recovery' });

  await signOut(); await expect(guard).toBeVisible();
  await guard.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(guard).toHaveCount(0);
  await expect(field(page, 'Plan.notes')).toHaveValue('Keep me');

  const net = commitControl(page); await net.ready; net.failFrom(1);
  await signOut(); await expect(guard).toBeVisible();
  await guard.getByRole('button', { name: 'Sync now', exact: true }).click();
  await expect(guard.getByRole('alert')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(`Welcome, ${a.email}`)).toBeVisible(); // still signed in
  expect((await draftsOf(page, a.uid)).map((d) => d.env.fields.notes)).toContain('Keep me');
  expect(await plansOf(a.uid)).toEqual([]);

  const exported = await downloadJson(page, () => guard.getByRole('button', { name: 'Export drafts', exact: true }).click());
  const list = Array.isArray(exported) ? exported : [exported];
  expect(list.length).toBeGreaterThan(0);
  expect(list.every((d: any) => d.scope?.uid === a.uid)).toBe(true);
  expect(JSON.stringify(list)).toContain('Keep me');

  net.pass();
  await page.evaluate(() => { (window as any).__beforeSignOut = true; });
  await guard.getByRole('button', { name: 'Sync now', exact: true }).click();
  await page.waitForFunction(() => !(window as any).__beforeSignOut && document.readyState === 'complete');
  await expect(signInScreen(page)).toBeVisible();
  const saved = await plansOf(a.uid);
  expect(saved).toHaveLength(1);
  expect(saved[0].data).toMatchObject({ name: 'Guarded plan', notes: 'Keep me', revision: 1 });
});

// ---------------------------------------------------------------- P14
test('CC-P14 two tabs, one profile: stale save shows the conflict screen; Export my version downloads it; Reload remote shows the server copy; Keep my version saves a copy; nothing overwritten', async ({ page, context }) => {
  const a = await coach(page, 'p14');
  await planner(page);
  await field(page, 'Plan.name').fill('Base');
  await savePlan(page); await expect(planStatus(page)).toHaveText('saved');
  const [base] = await plansOf(a.uid);

  const t2 = await newTabSameProfile(context, a.email);
  try {
    await planner(t2);
    await t2.getByRole('button', { name: 'Open Base', exact: true }).click();
    await field(t2, 'Plan.name').fill('Tab 2 edit');
    await page.bringToFront();
    await field(page, 'Plan.name').fill('Tab 1 first');
    await savePlan(page); await expect(planStatus(page)).toHaveText('saved');
    await t2.bringToFront();
    await savePlan(t2);
    const dialog = t2.getByRole('alertdialog', { name: 'Conflicting edits' });
    await expect(dialog).toBeVisible();
    expect((await adminGet(`practicePlans/${base.id}`))).toMatchObject({ name: 'Tab 1 first', revision: 2 });

    const mine = await downloadJson(t2, () => dialog.getByRole('button', { name: 'Export my version' }).click());
    expect(mine.fields.name).toBe('Tab 2 edit');
    expect(mine.remoteRevision).toBe(2);

    await dialog.getByRole('button', { name: 'Keep my version as a copy' }).click();
    await expect(planStatus(t2)).toHaveText('saved');
    const all = await plansOf(a.uid);
    expect(all.map((d) => d.data.name).sort()).toEqual(['Tab 1 first', 'Tab 2 edit']);
    expect((await adminGet(`practicePlans/${base.id}`))).toMatchObject({ name: 'Tab 1 first', revision: 2 });

    // Reload remote path: edit tab 2's copy of Base again from a stale revision.
    await t2.getByRole('button', { name: 'Open Tab 1 first', exact: true }).click();
    await field(t2, 'Plan.name').fill('Stale again');
    await page.bringToFront();
    await page.getByRole('button', { name: 'Open Tab 1 first', exact: true }).click();
    await field(page, 'Plan.notes').fill('server note');
    await savePlan(page); await expect(planStatus(page)).toHaveText('saved');
    await t2.bringToFront();
    await savePlan(t2);
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Reload remote' }).click(); // confirm() accepted by the dialog handler
    await expect(field(t2, 'Plan.name')).toHaveValue('Tab 1 first');
    await expect(field(t2, 'Plan.notes')).toHaveValue('server note');
    expect((await adminGet(`practicePlans/${base.id}`))).toMatchObject({ name: 'Tab 1 first', notes: 'server note', revision: 3 });
  } finally {
    await t2.close();
  }
});

// ---------------------------------------------------------------- P15
test('CC-P15 Smart Playbook: Shotgun play saved, renamed (revision 2, createdAt unchanged), hard reload, reopened in a fresh profile with identical players and routes', async ({ page, browser }) => {
  const a = await coach(page, 'p15');
  await openTab(page, 'Smart Playbook');
  await page.getByRole('button', { name: /Shotgun/ }).click();
  await page.getByPlaceholder('Enter play name...').fill('Mesh');
  await page.getByRole('button', { name: 'Save Play', exact: true }).first().click();
  await page.getByRole('button', { name: 'Save Play', exact: true }).last().click();
  const status = page.getByRole('status', { name: 'Play save status' });
  await expect(status).toHaveText('saved');
  const [v1] = await adminQuery('plays', 'createdBy', a.uid);
  expect(v1.data).toMatchObject({ name: 'Mesh', teamId: a.teamId, revision: 1 });
  expect((v1.data.players as unknown[]).length).toBe(11);

  await page.getByPlaceholder('Enter play name...').fill('Mesh edited');
  await expect(status).toHaveText('unsaved');
  await page.getByRole('button', { name: 'Save Play', exact: true }).first().click();
  await page.getByRole('button', { name: 'Save Play', exact: true }).last().click();
  await expect(status).toHaveText('saved');
  const v2 = await adminGet(`plays/${v1.id}`);
  expect(v2).toMatchObject({ name: 'Mesh edited', revision: 2 });
  expect(v2!.players).toEqual(v1.data.players);
  expect(v2!.routes).toEqual(v1.data.routes);
  expect(Date.parse(v2!.createdAt)).toBe(Date.parse(v1.data.createdAt));
  expect(Date.parse(v2!.updatedAt)).toBeGreaterThan(Date.parse(v1.data.updatedAt));

  const fresh = await browser.newContext({ serviceWorkers: 'block' });
  try {
    await skipOnboarding(fresh);
    await fresh.addInitScript(() => localStorage.setItem('smartPlaybook_onboarding_complete', 'true'));
    const p2 = await fresh.newPage();
    await signInAsBetaCoach(p2, a.email);
    await openTab(p2, 'Smart Playbook');
    await p2.getByRole('button', { name: 'Load Play', exact: true }).click();
    await expect(p2.getByText('Mesh edited', { exact: true })).toBeVisible();
    await p2.getByRole('button', { name: 'Load', exact: true }).first().click();
    await expect(p2.getByPlaceholder('Enter play name...')).toHaveValue('Mesh edited');
    await expect(p2.getByRole('status', { name: 'Play save status' })).toHaveText('saved');
    expect(await adminGet(`plays/${v1.id}`)).toEqual(v2); // reopening did not write
  } finally {
    await fresh.close();
  }
});

// ---------------------------------------------------------------- P16
test('CC-P16 practice plan: 200-char name, 5000-char notes, period focus and reorder save and reopen exactly in a fresh profile', async ({ page, browser }) => {
  const a = await coach(page, 'p16');
  await planner(page);
  const name = 'P'.repeat(199) + 'Z';
  await field(page, 'Plan.name').fill(name);
  await field(page, 'Plan.notes').fill('N'.repeat(4999) + 'E');
  await field(page, 'Plan.periods.2.focus').fill('Route timing');
  // Move the cooldown (period 3) up above the skills period.
  const periods = page.getByRole('group', { name: 'Periods' });
  await periods.getByRole('button', { name: 'Move up' }).nth(2).click();
  await savePlan(page); await expect(planStatus(page)).toHaveText('saved');
  const [doc] = await plansOf(a.uid);
  expect(doc.data.name).toBe(name);
  expect(doc.data.notes).toHaveLength(5000);
  expect((doc.data.periods as any[]).map((p) => p.kind)).toEqual(['warmup', 'cooldown', 'period']);
  expect((doc.data.periods as any[])[2].focus).toBe('Route timing');

  const fresh = await browser.newContext({ serviceWorkers: 'block' });
  try {
    await skipOnboarding(fresh);
    const p2 = await fresh.newPage();
    await signInAsBetaCoach(p2, a.email);
    await planner(p2);
    await p2.getByRole('button', { name: `Open ${name}`, exact: true }).click();
    await expect(field(p2, 'Plan.notes')).toHaveValue('N'.repeat(4999) + 'E');
    await expect(field(p2, 'Plan.periods.3.focus')).toHaveValue('Route timing');
    await expect(field(p2, 'Plan.periods.2.kind')).toHaveValue('cooldown');
  } finally {
    await fresh.close();
  }
});

test('CC-P16b existing AI-provenance plan: editing notes keeps source, aiRequestId, safety and hydration exactly; revision 1 -> 2; no AI call', async ({ page }) => {
  const a = await coach(page, 'p16b');
  const t = new Date('2026-10-01T12:00:00Z');
  const seeded = {
    name: 'AI Tuesday', duration: 75, ageGroup: '10U', skillLevel: 'beginner', contactLevel: 'limited_contact',
    source: 'ai', aiRequestId: '2b1f6c0e-9a7d-4c1e-8f3a-1d2e3f4a5b6c', notes: 'orig',
    periods: [{ kind: 'warmup', name: 'Warm-up', durationMinutes: 10, activities: [{ name: 'High knees', durationMinutes: 5, instructions: 'Lines' }] },
      { kind: 'period', name: 'Tackling', focus: 'Leverage', durationMinutes: 50, drills: [{ name: 'Shimmy', durationMinutes: 15, setup: 'Cones', instructions: 'Walk', coachingPoints: ['Eyes up'], equipment: ['cones'] }] },
      { kind: 'cooldown', name: 'Cool-down', durationMinutes: 15, activities: [] }],
    goals: ['tackling'], safetyConsiderations: ['Water every 20 minutes'], hydrationBreakMinutes: [20, 40],
  };
  await adminSet('practicePlans/ai-seeded', { ...seeded, teamId: a.teamId, createdBy: a.uid, revision: 1, createdAt: t, updatedAt: t });
  const ai: string[] = [];
  page.on('request', (r) => { if (/coachAI|openai\.com/.test(r.url())) ai.push(r.url()); });
  await planner(page);
  await page.getByRole('button', { name: 'Refresh practice library' }).click();
  await page.getByRole('button', { name: 'Open AI Tuesday', exact: true }).click();
  await field(page, 'Plan.notes').fill('coach edited');
  await savePlan(page); await expect(planStatus(page)).toHaveText('saved');
  const after = await adminGet('practicePlans/ai-seeded');
  const { notes: _n, ...rest } = seeded;
  expect(after).toMatchObject({ ...rest, notes: 'coach edited', revision: 2, teamId: a.teamId, createdBy: a.uid });
  expect(Date.parse(after!.createdAt)).toBe(t.getTime());
  expect(ai).toEqual([]);
});

// ---------------------------------------------------------------- P17
test('CC-P17 offline save is captured as pending and never reported saved; reconnect acknowledges it; a stranded pending envelope of coach A is never uploaded while B is signed in; the legacy global queue is never replayed', async ({ page, context }) => {
  const a = await coach(page, 'p17a');
  await planner(page);
  await context.setOffline(true);
  await field(page, 'Plan.name').fill('Offline plan');
  await savePlan(page);
  await expect.poll(async () => (await draftsOf(page, a.uid)).some((d) => d.env.pending && d.env.fields.name === 'Offline plan')).toBe(true);
  await expect(planStatus(page)).not.toHaveText('saved');
  await context.setOffline(false);
  await expect(planStatus(page)).toHaveText('saved', { timeout: 45_000 });
  expect((await plansOf(a.uid)).map((d) => d.data.name)).toEqual(['Offline plan']);

  const legacyQueue = JSON.stringify([{ type: 'create', collection: 'plays', data: { name: 'Legacy queued play', teamId: a.teamId } }]);
  await page.evaluate((q) => localStorage.setItem('offline_operations', q), legacyQueue);
  await signOutViaUI(page);
  // A stranded pending envelope that belongs to coach A (same format the app writes).
  await page.evaluate(([uid, team]) => localStorage.setItem(`coachcore:v1:${uid}:${team}:drafts:practicePlans:stranded-writer`, JSON.stringify({
    scope: { uid, teamId: team }, kind: 'practicePlans', id: 'stranded-a', expectedRevision: 0, pending: true, writer: 'stranded-writer',
    fields: { name: 'A pending only', duration: 60, periods: [], goals: [], notes: '' } })), [a.uid, a.teamId]);

  const b = await coach(page, 'p17b', 'B Team');
  await planner(page);
  await context.setOffline(true); await context.setOffline(false); // fire 'online' under coach B
  await field(page, 'Plan.name').fill('B plan');
  await savePlan(page); await expect(planStatus(page)).toHaveText('saved');
  expect((await plansOf(b.uid)).map((d) => d.data.name)).toEqual(['B plan']);
  expect((await adminQuery('plays', 'createdBy', b.uid))).toEqual([]);
  expect((await adminQuery('plays', 'teamId', a.teamId))).toEqual([]); // legacy queue not replayed
  expect(await adminGet('practicePlans/stranded-a')).toBeNull(); // A's envelope not uploaded under B
  expect((await plansOf(a.uid)).map((d) => d.data.name)).toEqual(['Offline plan']);
});

// ---------------------------------------------------------------- legacy data paths
test('CC-L0 legacy global offline queue: sign-in, reconnect and sign-out leave its bytes identical and nothing is replayed', async ({ page, context }) => {
  const raw = '[{"type":"create","collection":"plays","data":{"name":"Quarantined","teamId":"t"}}]';
  await page.goto('/');
  await page.evaluate((q) => localStorage.setItem('offline_operations', q), raw);
  const a = await coach(page, 'l0');
  await context.setOffline(true); await context.setOffline(false);
  await signOutViaUI(page);
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('offline_operations'))).toBe(raw);
  expect(await adminQuery('plays', 'createdBy', a.uid)).toEqual([]);
});

test('CC-L1 [founder rule: no deletion] dashboard "Migrate Now" must not delete legacy device data or report success it did not verify', async ({ page }) => {
  const a = await coach(page, 'l1');
  const blob = JSON.stringify({ plays: [{ name: 'Old banner play', formation: 'I', routes: [], players: [] }], plans: [] });
  await page.evaluate(([t, b]) => { localStorage.setItem('plays', '[]'); localStorage.setItem(`coach-core-ai-${t}`, b); }, [a.teamId, blob]);
  await page.reload();
  await expect(page.getByText('Migrate Your Data')).toBeVisible();
  await page.getByRole('button', { name: 'Migrate Now' }).click();
  await expect(page.getByText(/Data migrated successfully|Failed to migrate data/)).toBeVisible();
  const cloud = (await adminQuery('plays', 'teamId', a.teamId)).filter((d) => d.data.name === 'Old banner play');
  const original = await page.evaluate((t) => localStorage.getItem(`coach-core-ai-${t}`), a.teamId);
  expect(original, 'legacy blob must be preserved byte-for-byte').toBe(blob);
  if (await page.getByText('Data migrated successfully').count()) {
    expect(cloud.length, 'success shown, so the play must be in the cloud').toBe(1);
  }
});
