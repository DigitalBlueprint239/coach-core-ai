// Cloud Storage security-rules tests (Day 1 report §3 cases T9–T10, F-03).
// Storage rules read team ownership from Firestore, so both emulators run.
import { describe, it, before, after } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';
import { createEnv, tokens, ALICE, BOB, TEAM_A, TEAM_B } from './helpers.mjs';

let env;
const now = Timestamp.fromDate(new Date('2026-10-13T12:00:00Z'));
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const png = { contentType: 'image/png' };

const store = (uid, token) => env.authenticatedContext(uid, token).storage();

before(async () => {
  env = await createEnv({ firestore: true, storage: true });
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'teams', TEAM_A), { name: 'A', ownerId: ALICE, createdAt: now, updatedAt: now });
    await setDoc(doc(ctx.firestore(), 'teams', TEAM_B), { name: 'B', ownerId: BOB, createdAt: now, updatedAt: now });
    await uploadBytes(ref(ctx.storage(), `teams/${TEAM_A}/files/seed.png`), PNG, png);
    await uploadBytes(ref(ctx.storage(), `plays/legacy/media/seed.png`), PNG, png);
  });
});
after(async () => { await env?.cleanup(); });

describe('Storage: identity gates', () => {
  it('unauthenticated users cannot read or write', async () => {
    const s = env.unauthenticatedContext().storage();
    await assertFails(getBytes(ref(s, `teams/${TEAM_A}/files/seed.png`)));
    await assertFails(uploadBytes(ref(s, `teams/${TEAM_A}/files/u.png`), PNG, png));
  });
  it('anonymous users cannot read or write, even with forged claims', async () => {
    const s = store(ALICE, tokens.anonymousWithClaims);
    await assertFails(getBytes(ref(s, `teams/${TEAM_A}/files/seed.png`)));
    await assertFails(uploadBytes(ref(s, `teams/${TEAM_A}/files/anon.png`), PNG, png));
  });
  it('team owner without the beta claim is denied', async () => {
    const s = store(ALICE, tokens.noBeta);
    await assertFails(getBytes(ref(s, `teams/${TEAM_A}/files/seed.png`)));
    await assertFails(uploadBytes(ref(s, `teams/${TEAM_A}/files/nb.png`), PNG, png));
  });
});

describe('Storage: owner access (T4)', () => {
  it('owner can upload, read and delete files in their own team', async () => {
    const s = store(ALICE, tokens.beta);
    await assertSucceeds(uploadBytes(ref(s, `teams/${TEAM_A}/files/diagram.png`), PNG, png));
    await assertSucceeds(getBytes(ref(s, `teams/${TEAM_A}/files/seed.png`)));
    await assertSucceeds(uploadBytes(ref(s, `teams/${TEAM_A}/files/plan.pdf`), PNG, { contentType: 'application/pdf' }));
    await assertSucceeds(deleteObject(ref(s, `teams/${TEAM_A}/files/diagram.png`)));
  });
});

describe('Storage: cross-team denial (T9)', () => {
  it("bob cannot read alice's team files", async () => {
    await assertFails(getBytes(ref(store(BOB, tokens.beta), `teams/${TEAM_A}/files/seed.png`)));
  });
  it("bob cannot write or delete in alice's team", async () => {
    const s = store(BOB, tokens.beta);
    await assertFails(uploadBytes(ref(s, `teams/${TEAM_A}/files/bob.png`), PNG, png));
    await assertFails(uploadBytes(ref(s, `teams/${TEAM_A}/files/seed.png`), PNG, png));
    await assertFails(deleteObject(ref(s, `teams/${TEAM_A}/files/seed.png`)));
  });
  it('nobody can use a team id that does not exist', async () => {
    await assertFails(uploadBytes(ref(store(ALICE, tokens.beta), `teams/ghost/files/x.png`), PNG, png));
  });
});

describe('Storage: upload validation (T10)', () => {
  it('rejects disallowed content types', async () => {
    const s = store(ALICE, tokens.beta);
    await assertFails(uploadBytes(ref(s, `teams/${TEAM_A}/files/x.html`), PNG, { contentType: 'text/html' }));
    await assertFails(uploadBytes(ref(s, `teams/${TEAM_A}/files/x.svg`), PNG, { contentType: 'image/svg+xml' }));
    await assertFails(uploadBytes(ref(s, `teams/${TEAM_A}/files/x.js`), PNG, { contentType: 'application/javascript' }));
  });
  it('rejects uploads over 5 MB', async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    await assertFails(uploadBytes(ref(store(ALICE, tokens.beta), `teams/${TEAM_A}/files/big.png`), big, png));
  });
  it('rejects empty uploads', async () => {
    await assertFails(uploadBytes(ref(store(ALICE, tokens.beta), `teams/${TEAM_A}/files/empty.png`), new Uint8Array(0), png));
  });
});

describe('Storage: legacy paths are closed', () => {
  it('denies read and write on old practice-plan, play-media, team-document and profile paths', async () => {
    const s = store(ALICE, tokens.beta);
    await assertFails(getBytes(ref(s, `plays/legacy/media/seed.png`)));
    await assertFails(uploadBytes(ref(s, `plays/p1/media/x.png`), PNG, png));
    await assertFails(uploadBytes(ref(s, `practice-plans/p1/attachments/x.png`), PNG, png));
    await assertFails(uploadBytes(ref(s, `teams/${TEAM_A}/documents/x.png`), PNG, png));
    await assertFails(uploadBytes(ref(s, `users/${ALICE}/profile/x.png`), PNG, png));
  });
});
