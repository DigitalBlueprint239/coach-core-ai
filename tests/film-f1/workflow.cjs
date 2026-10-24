// Film review F1 browser workflow against an isolated Film PREVIEW build and the Firebase Emulator Suite.
// Synthetic accounts and synthetic media only. Refuses any request to 127.0.0.1/localhost.
// Usage: FILM_HOST=127.0.0.7 node tests/film-f1/workflow.cjs <chromium|firefox> <outDir>
const path = require('path'), fs = require('fs');
const [engine = 'chromium', out = path.join(process.cwd(), 'film-f1-evidence')] = process.argv.slice(2);
const pw = require(path.resolve(__dirname, '../../e2e/node_modules/@playwright/test'));
const HOST = process.env.FILM_HOST || '127.0.0.7';
if (/^(127\.0\.0\.1|localhost)$/.test(HOST)) throw new Error('Refusing to run against 127.0.0.1/localhost.');
const P = 'demo-coach-core-e2e', AUTH = `http://${HOST}:9099`, FS = `http://${HOST}:8080`, BASE = `http://${HOST}:3000`;
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const stamp = `${engine}-${Date.now().toString(36)}`;
const COACH_A = `film.a.${stamp}@e2e.coachcore.test`, COACH_B = `film.b.${stamp}@e2e.coachcore.test`;
const TEAM_A = `film-a-${stamp}`, TEAM_A2 = `film-a2-${stamp}`, TEAM_B = `film-b-${stamp}`;
const results = []; const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`); };

const call = async (url, init) => { const r = await fetch(url, init); const t = await r.text(); if (!r.ok) throw new Error(`${url} ${r.status} ${t.slice(0, 200)}`); return t ? JSON.parse(t) : {}; };
const enc = (v) => v === null ? { nullValue: null } : v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : typeof v === 'string' ? { stringValue: v }
  : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const dec = (v) => 'nullValue' in v ? null : 'booleanValue' in v ? v.booleanValue : 'integerValue' in v ? Number(v.integerValue) : 'doubleValue' in v ? v.doubleValue
  : 'stringValue' in v ? v.stringValue : 'timestampValue' in v ? v.timestampValue : 'arrayValue' in v ? (v.arrayValue.values || []).map(dec)
  : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dec(x)])) : v;
const docUrl = (p) => `${FS}/v1/projects/${P}/databases/(default)/documents/${p}`;
const adminSet = (p, data) => call(docUrl(p), { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, enc(v)])) }) });
const adminList = async (p) => ((await call(`${docUrl(p)}?pageSize=100`, { headers: OWNER })).documents || []).map((d) => ({ id: d.name.split('/').pop(), data: dec({ mapValue: { fields: d.fields } }), updateTime: d.updateTime }));

async function account(email) {
  await call(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-e2e-web-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'film-f1-only-not-a-secret', returnSecureToken: true }) });
  const { users } = await call(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${P}/accounts:lookup`, { method: 'POST', headers: OWNER, body: JSON.stringify({ email: [email] }) });
  await call(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${P}/accounts:update`, { method: 'POST', headers: OWNER, body: JSON.stringify({ localId: users[0].localId, customAttributes: JSON.stringify({ beta: true }), emailVerified: true }) });
  return users[0].localId;
}
async function signIn(page, email) {
  await call(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=demo-e2e-web-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestType: 'EMAIL_SIGNIN', email, continueUrl: BASE + '/', canHandleCodeInApp: true }) });
  const { oobCodes } = await call(`${AUTH}/emulator/v1/projects/${P}/oobCodes`, { headers: OWNER });
  const link = new URL(oobCodes.filter((c) => c.email === email).pop().oobLink);
  await page.goto(`${BASE}/?mode=signIn&oobCode=${link.searchParams.get('oobCode')}&apiKey=fake-api-key&lang=en`);
  const prompt = page.getByLabel(/Enter the email it was sent to/);
  await prompt.waitFor({ timeout: 15000 }).catch(() => {});
  if (await prompt.count()) { await prompt.fill(email); await page.getByRole('button', { name: 'Finish sign-in' }).click(); }
  await page.getByText(`Welcome, ${email}`).first().waitFor({ timeout: 20000 });
}
const nav = async (page, name) => { await page.getByRole('navigation').getByRole('button', { name }).filter({ visible: true }).first().click(); await page.waitForTimeout(700); };
const status = (page) => page.getByRole('status', { name: 'Film save status' });
const verified = (page) => page.getByText('Sample bytes, hash and duration verified').waitFor({ timeout: 20000 });
const shot = async (page, name, full = true) => { await page.screenshot({ path: path.join(out, `${engine}-${name}.png`), fullPage: full }); };
const seekTo = async (page, seconds) => { await page.getByRole('slider', { name: 'Seek video' }).fill(String(Math.round(seconds * 1000))); await page.waitForTimeout(250); };
const formState = async (page) => ({
  start: await page.getByLabel('Start seconds').inputValue(), end: await page.getByLabel('End seconds').inputValue(),
  label: await page.getByLabel('Label', { exact: true }).inputValue(), notes: await page.getByLabel('Notes').inputValue(),
  tags: await page.locator('.fr-tags ul li').evaluateAll((els) => els.map((e) => e.firstChild.textContent)),
});

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const t = new Date('2026-10-23T12:00:00Z');
  const uidA = await account(COACH_A); const uidB = await account(COACH_B);
  await adminSet(`teams/${TEAM_A}`, { name: 'Film Alpha', code: 'FILMALP1', ownerId: uidA, memberIds: [uidA], createdAt: t, updatedAt: t });
  await adminSet(`teams/${TEAM_A2}`, { name: 'Film Second', code: 'FILMSEC2', ownerId: uidA, memberIds: [uidA], createdAt: t, updatedAt: t });
  await adminSet(`teams/${TEAM_B}`, { name: 'Film Bravo', code: 'FILMBRV3', ownerId: uidB, memberIds: [uidB], createdAt: t, updatedAt: t });
  const browser = await pw[engine].launch();
  const blocked = []; let page;
  const context = async (team, viewport = { width: 1440, height: 1000 }) => {
    const ctx = await browser.newContext({ viewport, serviceWorkers: 'block' });
    await ctx.addInitScript((tm) => { try { localStorage.setItem('onboardingComplete', 'true'); localStorage.setItem('smartPlaybook_onboarding_complete', 'true'); if (!localStorage.getItem('currentTeamId')) localStorage.setItem('currentTeamId', tm); } catch {} }, team);
    await ctx.route(/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//, (r) => { blocked.push(r.request().url()); return r.abort(); });
    return ctx;
  };
  try {
    const ctx = await context(TEAM_A);
    page = await ctx.newPage();
    page.on('dialog', (d) => d.accept());
    await signIn(page, COACH_A);
    check('Film Review destination is present in the preview build', await page.getByRole('navigation').getByRole('button', { name: /Film Review/ }).filter({ visible: true }).count() === 1);
    await nav(page, /Film Review/);
    await verified(page);
    check('sample verified (bytes, hash, duration)', true);
    await shot(page, 'desktop-ready');

    // Playback, seek, speed and keyboard.
    await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.waitForTimeout(900);
    const t1 = await page.locator('video').evaluate((v) => v.currentTime);
    check('playback advances', t1 > 0.3, `currentTime ${t1.toFixed(2)}`);
    await page.getByRole('button', { name: 'Pause' }).click();
    await page.getByLabel('Playback speed').selectOption('0.5');
    check('speed applies to the video', (await page.locator('video').evaluate((v) => v.playbackRate)) === 0.5);
    await seekTo(page, 2);
    await page.locator('.fr-stage').focus(); await page.keyboard.press('ArrowRight');
    const t2 = await page.locator('video').evaluate((v) => v.currentTime);
    check('keyboard → steps 0.5 s', Math.abs(t2 - 2.5) < 0.06, `currentTime ${t2.toFixed(2)}`);
    await page.keyboard.press(' '); await page.waitForTimeout(500);
    const playingByKey = await page.locator('video').evaluate((v) => !v.paused); await page.keyboard.press(' ');
    check('keyboard Space plays and pauses', playingByKey);

    // Mark start/end (button and keyboard), label, tags, notes.
    await seekTo(page, 3.5); await page.getByRole('button', { name: 'Mark start here' }).click();
    await seekTo(page, 6); await page.locator('.fr-stage').focus(); await page.keyboard.press('o');
    let f = await formState(page);
    check('marks set from playhead (button and O key)', f.start === '3.50' && f.end === '6.00', `${f.start}–${f.end}`);
    await page.getByLabel('Label', { exact: true }).fill('Out route break');
    await page.getByLabel('New tag').fill('Route'); await page.keyboard.press('Enter');
    await page.getByRole('button', { name: '+ Break' }).click();
    await page.getByLabel('New tag').fill('route'); await page.keyboard.press('Enter');
    f = await formState(page);
    check('tags added by Enter and suggestion; case-insensitive duplicate ignored', JSON.stringify(f.tags) === JSON.stringify(['Route', 'Break']), JSON.stringify(f.tags));
    const notes = 'Break toward the sideline.\nEyes back to the QB at 6.0 s — “stem” then break.';
    await page.getByLabel('Notes').fill(notes);
    check('unsaved state shown before saving', /Not saved/.test(await status(page).textContent()));

    // Invalid timestamps block saving with a visible reason.
    await page.getByLabel('End seconds').fill('3.0');
    check('end before start is rejected', /at least 0\.1 seconds after start/.test(await page.locator('.fr-validation').textContent()) && await page.getByRole('button', { name: 'Save to team' }).isDisabled());
    await page.getByLabel('End seconds').fill('8.5');
    check('end past the sample is rejected', /cannot be after 8\.0 seconds/.test(await page.locator('.fr-validation').textContent()));
    await page.getByLabel('Start seconds').fill('-1');
    check('negative start is rejected', /before 0 seconds/.test(await page.locator('.fr-validation').textContent()));
    await page.getByLabel('Start seconds').fill('3.5'); await page.getByLabel('End seconds').fill('6');

    // Failed write: offline save never claims Saved and keeps edits.
    await ctx.setOffline(true);
    await page.getByRole('button', { name: 'Save to team' }).click();
    await page.waitForFunction(() => /Not saved/.test(document.querySelector('[aria-label="Film save status"]')?.textContent || ''), null, { timeout: 30000 });
    f = await formState(page);
    check('failed (offline) save shows Not saved and keeps every edit', f.label === 'Out route break' && f.notes === notes && f.tags.length === 2, await status(page).textContent());
    check('nothing written while offline', (await adminList(`teams/${TEAM_A}/filmAnnotations`)).length === 0);
    await ctx.setOffline(false); await page.waitForTimeout(800);

    // Save → confirmed.
    await page.getByRole('button', { name: 'Save to team' }).click();
    await page.waitForFunction(() => /Saved to Film Alpha · revision 1 \(confirmed/.test(document.querySelector('[aria-label="Film save status"]')?.textContent || ''), null, { timeout: 30000 });
    const [doc1] = await adminList(`teams/${TEAM_A}/filmAnnotations`);
    check('server copy equals the marks, tags and notes exactly', doc1 && doc1.data.startMs === 3500 && doc1.data.endMs === 6000 && doc1.data.label === 'Out route break'
      && JSON.stringify(doc1.data.tags) === '["Route","Break"]' && doc1.data.notes === notes && doc1.data.revision === 1 && doc1.data.teamId === TEAM_A && doc1.data.createdBy === uidA, JSON.stringify(doc1 && doc1.data).slice(0, 200));
    await shot(page, 'desktop-saved');

    // Hard reload → reopen exactly.
    await page.reload(); await page.getByText(`Welcome, ${COACH_A}`).first().waitFor({ timeout: 20000 });
    await nav(page, /Film Review/); await verified(page);
    await page.getByRole('button', { name: 'Open Out route break' }).click();
    await page.waitForFunction(() => /reopened and checked against the sample/.test(document.querySelector('[aria-label="Film save status"]')?.textContent || ''), null, { timeout: 20000 });
    f = await formState(page);
    check('hard reload → reopen restores marks, label, tags and notes exactly', f.start === '3.50' && f.end === '6.00' && f.label === 'Out route break' && JSON.stringify(f.tags) === '["Route","Break"]' && f.notes === notes, JSON.stringify(f));
    await shot(page, 'desktop-reopened');

    // Revision conflict: another session changes the mark to revision 2.
    await adminSet(`teams/${TEAM_A}/filmAnnotations/${doc1.id}`, { ...doc1.data, notes: 'Changed in another session.', revision: 2, createdAt: new Date(doc1.data.createdAt), updatedAt: new Date() });
    await page.getByLabel('Notes').fill(notes + ' Mine.');
    await page.getByRole('button', { name: 'Save to team' }).click();
    await page.getByRole('alertdialog', { name: 'Conflicting change' }).waitFor({ timeout: 20000 });
    check('stale save is refused with a conflict and edits kept', /changed elsewhere/.test(await status(page).textContent()) && (await page.getByLabel('Notes').inputValue()).endsWith('Mine.'));
    await shot(page, 'desktop-conflict', false);
    const afterConflict = (await adminList(`teams/${TEAM_A}/filmAnnotations`)).find((d) => d.id === doc1.id);
    check('the other session\'s version was not overwritten', afterConflict.data.notes === 'Changed in another session.' && afterConflict.data.revision === 2);
    await page.getByRole('button', { name: 'Save mine as a new mark' }).click();
    await page.waitForFunction(() => /Saved to Film Alpha · revision 1 \(confirmed/.test(document.querySelector('[aria-label="Film save status"]')?.textContent || ''), null, { timeout: 30000 });
    check('"Save mine as a new mark" creates a separate mark', (await adminList(`teams/${TEAM_A}/filmAnnotations`)).length === 2);

    // Update path: edit and save increments the revision.
    await page.getByLabel('Label', { exact: true }).fill('Out route break (mine)');
    await page.getByRole('button', { name: 'Save to team' }).click();
    await page.waitForFunction(() => /revision 2 \(confirmed/.test(document.querySelector('[aria-label="Film save status"]')?.textContent || ''), null, { timeout: 30000 });
    check('an edit saves as revision 2', true);

    // Unsaved changes survive navigation within the account+team, but never cross teams.
    await page.getByLabel('Notes').fill('Unsaved draft note');
    await nav(page, 'Teams'); await nav(page, /Film Review/);
    check('unsaved changes are offered back after leaving Film', await page.getByRole('button', { name: 'Restore unsaved changes' }).count() === 1);
    await nav(page, 'Teams');
    await page.getByRole('button', { name: 'Switch to' }).first().click(); await page.waitForTimeout(1500);
    await nav(page, /Film Review/); await verified(page);
    check('another team shows no draft and none of the first team\'s marks', await page.getByRole('button', { name: 'Restore unsaved changes' }).count() === 0
      && await page.getByRole('button', { name: /^Open / }).count() === 0, await page.locator('.fr-library').textContent());
    await nav(page, 'Teams'); await page.getByRole('button', { name: 'Switch to' }).first().click(); await page.waitForTimeout(1500);
    await nav(page, /Film Review/);
    await page.getByRole('button', { name: 'Restore unsaved changes' }).click();
    check('switching back restores the first team\'s draft', (await page.getByLabel('Notes').inputValue()) === 'Unsaved draft note');
    await page.getByRole('button', { name: 'New mark' }).click(); // discard (dialog auto-accepted)

    // Mismatched / missing media blocks playback, saving and reopening; stored record untouched.
    const before = await adminList(`teams/${TEAM_A}/filmAnnotations`);
    await ctx.route(/\/film-preview\/out-route\.(mp4|webm)$/, async (r) => { const res = await r.fetch(); const body = Buffer.from(await res.body()); body[body.length - 1] ^= 0xff; return r.fulfill({ response: res, body }); });
    await page.reload(); await page.getByText(`Welcome, ${COACH_A}`).first().waitFor({ timeout: 20000 });
    await nav(page, /Film Review/);
    await page.getByText(/does not match its pinned identity/).waitFor({ timeout: 20000 });
    check('tampered sample is refused; Save disabled', await page.getByRole('button', { name: 'Save to team' }).isDisabled() && await page.getByRole('button', { name: 'Play', exact: true }).isDisabled());
    await page.getByRole('button', { name: /^Open Out route break \(mine\)/ }).click();
    await page.waitForFunction(() => /Not reopened — the sample failed verification/.test(document.querySelector('[aria-label="Film save status"]')?.textContent || ''), null, { timeout: 20000 });
    const after = await adminList(`teams/${TEAM_A}/filmAnnotations`);
    check('a mark never reopens against unverified media; stored marks unchanged', JSON.stringify(after.map((d) => [d.id, d.updateTime])) === JSON.stringify(before.map((d) => [d.id, d.updateTime])) && (await page.getByLabel('Label', { exact: true }).inputValue()) === '');
    await shot(page, 'desktop-tampered', false);
    await ctx.unroute(/\/film-preview\/out-route\.(mp4|webm)$/);
    await ctx.route(/\/film-preview\/out-route\.(mp4|webm)$/, (r) => r.fulfill({ status: 404, body: 'missing' }));
    await page.reload(); await page.getByText(`Welcome, ${COACH_A}`).first().waitFor({ timeout: 20000 });
    await nav(page, /Film Review/);
    await page.getByText(/sample is missing/).waitFor({ timeout: 20000 });
    check('missing sample is refused with a visible reason', await page.getByRole('button', { name: 'Save to team' }).isDisabled());
    await ctx.unroute(/\/film-preview\/out-route\.(mp4|webm)$/);
    await ctx.close();

    // Narrow screen: layout, navigation and saved list.
    const narrow = await context(TEAM_A, { width: 390, height: 844 });
    page = await narrow.newPage(); page.on('dialog', (d) => d.accept());
    await signIn(page, COACH_A);
    await nav(page, /Film/); await verified(page);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('390 px: no horizontal overflow', sw <= 0, `${sw}px`);
    check('390 px: five-destination phone bar includes Film', await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button').count() === 5);
    await page.evaluate(() => window.scrollTo(0, 0)); await shot(page, 'mobile-ready', false); await shot(page, 'mobile-full');
    await page.getByRole('button', { name: /^Open Out route break \(mine\)/ }).click();
    await page.waitForFunction(() => /reopened and checked/.test(document.querySelector('[aria-label="Film save status"]')?.textContent || ''), null, { timeout: 20000 });
    check('390 px: reopen works', (await page.getByLabel('Label', { exact: true }).inputValue()) === 'Out route break (mine)');
    await narrow.close();

    // Another coach sees nothing of team A.
    const other = await context(TEAM_B);
    page = await other.newPage();
    await signIn(page, COACH_B); await nav(page, /Film Review/); await verified(page);
    check('another coach sees none of team A\'s marks', await page.getByRole('button', { name: /^Open / }).count() === 0);
    await other.close();
  } catch (e) {
    check('workflow completed without an unexpected error', false, e.message.split('\n')[0]);
    if (page) await page.screenshot({ path: path.join(out, `${engine}-error.png`), fullPage: true }).catch(() => {});
  } finally {
    check('no request reached 127.0.0.1/localhost', blocked.length === 0, `${blocked.length}`);
    await browser.close();
  }
  fs.writeFileSync(path.join(out, `${engine}-results.json`), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`SUMMARY ${engine}: ${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
