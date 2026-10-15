import {test, expect, type Page} from '../../e2e/node_modules/@playwright/test';
import {resetEmulators, adminTeamsOwnedBy} from '../../e2e/tests/support/emulator';
import {coachEmail, skipOnboarding, signInAsBetaCoach, openTab, signOutViaUI} from '../../e2e/tests/support/app';

test.beforeEach(async ({context}) => {
  if (process.env.E2E_PROJECT_ID !== 'demo-coach-core-n2') throw new Error('Requires isolated demo-coach-core-n2 emulators.');
  await resetEmulators(); await skipOnboarding(context);
});
async function openCreate(page: Page, name: string) {
  await openTab(page, 'Teams');
  await page.getByRole('button', {name: 'Create Team', exact: true}).first().click();
  await page.getByLabel('Team Name').fill(name);
}
const named = async (uid: string, name: string) => (await adminTeamsOwnedBy(uid)).filter(t => t.name === name);
const modal = (page: Page) => page.getByRole('heading', {name: 'Create New Team'});
const commit = /\/documents:commit$/;

test('pending create survives cancel/navigation: no second submit, exactly one confirmed server team', async ({page}) => {
  const uid = await signInAsBetaCoach(page, coachEmail('n2owned-nav'));
  await openCreate(page, 'Pending Owls');
  let release!: () => void;
  const gate = new Promise<void>(r => {release = r;});
  await page.route(commit, async route => {await gate; await route.continue().catch(() => {});});
  await page.getByRole('button', {name: 'Create Team', exact: true}).last().click();
  await expect(page.getByRole('button', {name: 'Creating...'})).toBeDisabled();
  await page.getByRole('button', {name: 'Cancel'}).click();
  await openTab(page, 'My Week'); await openTab(page, 'Teams');
  await page.getByRole('button', {name: 'Resume team creation'}).click();
  await expect(page.getByLabel('Team Name')).toHaveValue('Pending Owls');
  await expect(page.getByLabel('Team Name')).toBeDisabled();
  expect(await named(uid, 'Pending Owls')).toHaveLength(0);
  release();
  await expect(modal(page)).toHaveCount(0);
  await expect.poll(async () => (await named(uid, 'Pending Owls')).length).toBe(1);
});

test('response lost after server commit: safe retry confirms the same id without rewriting', async ({page}) => {
  // No listener acknowledgement: this case must succeed through authoritative REST readback.
  await page.route(/Firestore\/Listen\/channel/, route => route.abort('connectionreset'));
  const uid = await signInAsBetaCoach(page, coachEmail('n2owned-ack'));
  await openCreate(page, 'Lost Ack Owls');
  const ids: string[] = [];
  let first = true;
  await page.route(commit, async route => {
    const payload = route.request().postDataJSON();
    ids.push(payload.writes[0].update.name);
    expect(payload.writes[0].currentDocument).toEqual({exists: false});
    if (first) {first = false; await route.fetch(); await route.abort('connectionreset');}
    else await route.continue();
  });
  await page.getByRole('button', {name: 'Create Team', exact: true}).last().click();
  await expect(page.getByRole('button', {name: 'Check and retry'})).toBeEnabled();
  expect(await named(uid, 'Lost Ack Owls')).toHaveLength(1);
  await page.getByRole('button', {name: 'Check and retry'}).click();
  await expect(modal(page)).toHaveCount(0);
  expect(await named(uid, 'Lost Ack Owls')).toHaveLength(1);
  expect(ids.length).toBe(2); expect(new Set(ids).size).toBe(1);
});

test('ten-second unconfirmed status permits retry at the same identity, never false success', async ({page}) => {
  const uid = await signInAsBetaCoach(page, coachEmail('n2owned-timeout'));
  await openCreate(page, 'Timeout Owls');
  let first = true;
  const ids: string[] = [];
  await page.route(commit, async route => {
    ids.push(route.request().postDataJSON().writes[0].update.name);
    if (first) {first = false; return;} // Intentionally unresolved request: bounded UI recovery is under test.
    await route.continue();
  });
  await page.getByRole('button', {name: 'Create Team', exact: true}).last().click();
  // This assertion measures the specified 10-second product threshold, not a relaxed acceptance timeout.
  await expect(page.getByRole('button', {name: 'Check and retry'})).toBeEnabled({timeout: 12_000});
  expect(await named(uid, 'Timeout Owls')).toHaveLength(0);
  await expect(modal(page)).toBeVisible();
  await page.getByRole('button', {name: 'Check and retry'}).click();
  await expect(modal(page)).toHaveCount(0);
  expect(await named(uid, 'Timeout Owls')).toHaveLength(1);
  expect(new Set(ids).size).toBe(1);
});

test('refresh and account switch preserve A operation without offering it or sending it under B', async ({page}) => {
  const emailA = coachEmail('n2owned-a');
  const uidA = await signInAsBetaCoach(page, emailA);
  await openCreate(page, 'A Pending');
  await page.route(commit, route => route.abort('connectionreset'));
  await page.getByRole('button', {name: 'Create Team', exact: true}).last().click();
  await expect(page.getByRole('button', {name: 'Check and retry'})).toBeEnabled();
  await page.getByRole('button', {name: 'Cancel'}).click();
  await page.reload(); await openTab(page, 'Teams');
  await expect(page.getByText('Pending team: A Pending.', {exact: false})).toBeVisible();
  await signOutViaUI(page);
  const uidB = await signInAsBetaCoach(page, coachEmail('n2owned-b'));
  await openTab(page, 'Teams');
  await expect(page.getByText('Pending team: A Pending.', {exact: false})).toHaveCount(0);
  expect(await named(uidB, 'A Pending')).toHaveLength(0);
  await signOutViaUI(page);
  await signInAsBetaCoach(page, emailA);
  await openTab(page, 'Teams');
  await page.getByRole('button', {name: 'Resume team creation'}).click();
  await page.unroute(commit);
  await page.getByRole('button', {name: 'Check and retry'}).click();
  await expect(modal(page)).toHaveCount(0);
  expect(await named(uidA, 'A Pending')).toHaveLength(1);
  expect(await named(uidB, 'A Pending')).toHaveLength(0);
});
