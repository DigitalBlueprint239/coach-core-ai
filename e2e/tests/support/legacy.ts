// D10 legacy-import fixtures and helpers (synthetic data only).
import { createHash } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import { adminQuery, adminSet } from './emulator';
import { openTab } from './app';

export const LEGACY_KEY = 'smartPlaybook_plays';
export const STANDALONE_KEY = 'coachcore-playbook';
export const decisionKey = (uid: string) => `coachcore:v1:${uid}:legacyImportDecision`;

// Three pre-account plays covering: both timestamps, no timestamps + special
// phase, createdAt only, and extra player/route properties.
export const LEGACY_PLAYS = [
  {
    id: 'legacy-mesh', name: 'Legacy Mesh', phase: 'offense', type: 'pass',
    createdAt: '2025-08-01T15:30:00.123Z', updatedAt: '2025-08-02T09:00:00.456Z',
    players: [
      { id: 'qb', x: 300.5, y: 410.25, position: 'QB', number: 7, label: 'Field general' },
      { id: 'x', x: 120, y: 380, position: 'WR', number: 1 },
    ],
    routes: [{ id: 'r1', playerId: 'x', points: [{ x: 120, y: 380 }, { x: 260.75, y: 300 }], type: 'slant', color: '#ff0000', curve: 0.25 }],
  },
  {
    id: 'legacy-punt', name: 'Legacy Punt Safe', phase: 'special', type: 'punt',
    players: [{ id: 'p', x: 300, y: 500, position: 'P', number: 4 }], routes: [],
  },
  {
    id: 'legacy-cover2', name: 'Legacy Cover 2', phase: 'defense', type: 'zone',
    createdAt: '2025-09-10T12:00:00.000Z',
    players: [{ id: 'fs', x: 200, y: 100, position: 'FS', number: 21 }], routes: [],
  },
];
// Deliberately unusual formatting: byte-for-byte checks must see any rewrite.
export const LEGACY_RAW = JSON.stringify(LEGACY_PLAYS, null, 2) + '\n';
export const STANDALONE_RAW = '{"state":{"plays":[{"id":"s1","name":"Standalone only"}]},"version":3}';

/** Same derivation as src/features/legacy-import/firebase-import.ts (reviewed). */
export function expectedCopyId(uid: string, teamId: string, play: (typeof LEGACY_PLAYS)[number]): string {
  const hash = createHash('sha256').update(JSON.stringify([uid, teamId, play])).digest('hex');
  return `legacy_v1_${'createdAt' in play ? 'c' : 'n'}${'updatedAt' in play ? 'u' : 'n'}_${hash}`;
}

export async function seedDevice(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(([lk, lv, sk, sv]) => {
    localStorage.setItem(lk, lv);
    localStorage.setItem(sk, sv);
    localStorage.setItem('smartPlaybook_onboarding_complete', 'true');
  }, [LEGACY_KEY, LEGACY_RAW, STANDALONE_KEY, STANDALONE_RAW]);
}

export async function deviceState(page: Page) {
  return page.evaluate(([lk, sk]) => ({
    legacy: localStorage.getItem(lk), standalone: localStorage.getItem(sk),
    decisions: Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.endsWith(':legacyImportDecision'))),
  }), [LEGACY_KEY, STANDALONE_KEY]);
}

export async function expectOriginalsUntouched(page: Page): Promise<void> {
  const s = await deviceState(page);
  expect(s.legacy, 'smartPlaybook_plays must be byte-identical').toBe(LEGACY_RAW);
  expect(s.standalone, 'coachcore-playbook must be byte-identical').toBe(STANDALONE_RAW);
}

export async function openPlaybook(page: Page): Promise<void> {
  await openTab(page, 'Smart Playbook');
  await expect(page.getByRole('button', { name: /Load Play/ })).toBeVisible();
}

export const importPrompt = (page: Page) => page.getByRole('region', { name: 'Import device plays' });

/** Legacy-import copies created by uid (admin read, bypasses rules). */
export async function adminCopies(uid: string) {
  const docs = await adminQuery('plays', 'createdBy', uid);
  return docs.filter((d) => d.id.startsWith('legacy_v1_'));
}

// Play Library reads (N1 follow-up, 2026-10-14). The list renders "No plays saved."
// both while the cloud query is loading and when it is empty, so a one-shot read
// can be premature: a positive check could fail early (Codex local N1) and a
// negative check could pass vacuously. Positive checks poll; negative checks
// first wait for a server-seeded control play of the SAME coach and team.
async function openLibrary(page: Page) {
  await page.getByRole('button', { name: /Load Play/ }).click();
  const lib = page.getByRole('heading', { name: 'Play Library' }).locator('xpath=..');
  await expect(lib).toBeVisible();
  return lib.locator('.font-semibold');
}
/** The library eventually lists every name in `names` (poll, expect timeout). */
export async function expectLibraryContains(page: Page, names: string[]): Promise<void> {
  const items = await openLibrary(page);
  await expect.poll(() => items.allInnerTexts(), { message: 'Play Library should list the imported plays' })
    .toEqual(expect.arrayContaining(names));
}
export const CONTROL_PLAY = 'Library loaded control';
/** Seed a rule-valid cloud play owned by uid in teamId; its appearance proves the library query has delivered. */
export async function seedControlPlay(uid: string, teamId: string): Promise<void> {
  const t = new Date();
  await adminSet(`plays/control-${uid}-${teamId}`, {
    name: CONTROL_PLAY, phase: 'offense', type: 'pass', players: [], routes: [],
    teamId, createdBy: uid, revision: 1, createdAt: t, updatedAt: t,
  });
}
/** Library names, read only after the seeded control play is listed (positive anchor). */
export async function libraryNamesLoaded(page: Page): Promise<string[]> {
  const items = await openLibrary(page);
  await expect(items.filter({ hasText: CONTROL_PLAY }).first(), 'control play must load before a negative check').toBeVisible();
  return items.allInnerTexts();
}

/** Hold or fail Firestore transaction commits (`…/documents:commit`). */
export function commitControl(page: Page) {
  let seen = 0;
  const releases: Array<() => void> = [];
  let mode: { kind: 'pass' } | { kind: 'hold'; from: number } | { kind: 'fail'; from: number } = { kind: 'pass' };
  const waiters: Array<{ n: number; resolve: () => void }> = [];
  const ready = page.route(/documents:commit/, async (route) => {
    seen += 1;
    const n = seen;
    waiters.filter((w) => w.n <= n).forEach((w) => w.resolve());
    if (mode.kind === 'fail' && n >= mode.from) { try { await route.abort('failed'); } catch { /* cancelled */ } return; }
    if (mode.kind === 'hold' && n >= mode.from) await new Promise<void>((r) => releases.push(r));
    try { await route.continue(); } catch { /* request cancelled by a navigation */ }
  });
  return {
    ready,
    holdFrom: (from: number) => { mode = { kind: 'hold', from }; },
    failFrom: (from: number) => { mode = { kind: 'fail', from }; },
    pass: () => { mode = { kind: 'pass' }; },
    release: () => { releases.splice(0).forEach((r) => r()); },
    count: () => seen,
    waitFor: (n: number) => new Promise<void>((resolve) => { if (seen >= n) resolve(); else waiters.push({ n, resolve }); }),
  };
}

/** Click "Import plays" and wait for success (prompt gone) or a visible error; a failure names the error. */
export async function acceptImport(page: Page): Promise<void> {
  const prompt = importPrompt(page);
  await prompt.getByRole('button', { name: 'Import plays' }).click();
  const alert = prompt.getByRole('alert');
  await expect(prompt.or(alert).first()).toBeVisible().catch(() => undefined);
  await expect.poll(async () => (await prompt.count()) === 0 || (await alert.count()) > 0, { timeout: 45_000 }).toBe(true);
  if (await alert.count()) throw new Error(`Import showed an error instead of completing: "${(await alert.innerText()).trim()}"`);
}
