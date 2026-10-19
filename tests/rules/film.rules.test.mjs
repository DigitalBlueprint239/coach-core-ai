// FILM-S1 rules (coach-film.v1): FS-12..18 and the rules side of FS-23.
// Film documents are server-owned; quarantine uploads are create-only for
// the reservation's creator with the exact declared size.
import { describe, it, before, after, beforeEach } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject, updateMetadata } from 'firebase/storage';
import { createEnv, tokens, ALICE, BOB, TEAM_A, TEAM_B } from './helpers.mjs';

let env;
const FILM = '3f1e2d4c-5b6a-4e7f-8a9b-0c1d2e3f4a5b';
const FILM_EXPIRED = '4a2f3e5d-6c7b-4f8a-9bac-1d2e3f4a5b6c';
const FILM_ABANDONED = '5b304f6e-7d8c-4a9b-8cbd-2e3f4a5b6c7d';
const FILM_BOB = '6c41507f-8e9d-4bac-9dce-3f4a5b6c7d8e';
const FILM_AT_MAX = '7e5c6d8f-9a0b-4c1d-8e2f-3a4b5c6d7e8f';
const FILM_OVER_MAX = '8f6d7e90-ab1c-4d2e-9f30-4b5c6d7e8f90';
// PENDING_D3 placeholder; equals functions/src/film/limits.js maxBytes (FS-25).
const MAX_BYTES = 100000000;
const SIZE = 32;
const BYTES = new Uint8Array(SIZE);
const mp4 = { contentType: 'video/mp4' };
const now = Timestamp.now();
const future = Timestamp.fromMillis(Date.now() + 60 * 60 * 1000);
const past = Timestamp.fromMillis(Date.now() - 60 * 1000);
const qpath = (team, film) => `quarantine/${team}/${film}/source.mp4`;

const film = (teamId, filmId, createdBy, over = {}) => ({
  filmId, teamId, createdBy, status: 'reserved', createdAt: now, statusChangedAt: now,
  reservationExpiresAt: future, declaredBytes: SIZE, declaredContentType: 'video/mp4',
  fileName: 'clip.mp4', rightsWordingVersion: 'rights-v1', rightsAcknowledgedAt: now,
  uploadPath: qpath(teamId, filmId), objectGeneration: null, rejectionReason: null,
  abandonedAt: null, ...over,
});

const db = (uid, token = tokens.beta) => env.authenticatedContext(uid, token).firestore();
const store = (uid, token = tokens.beta) => env.authenticatedContext(uid, token).storage();

before(async () => { env = await createEnv({ firestore: true, storage: true }); });
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore();
    await setDoc(doc(f, 'teams', TEAM_A), { name: 'A', ownerId: ALICE, createdAt: now, updatedAt: now });
    await setDoc(doc(f, 'teams', TEAM_B), { name: 'B', ownerId: BOB, createdAt: now, updatedAt: now });
    await setDoc(doc(f, `teams/${TEAM_A}/films/${FILM}`), film(TEAM_A, FILM, ALICE));
    await setDoc(doc(f, `teams/${TEAM_A}/films/${FILM_EXPIRED}`), film(TEAM_A, FILM_EXPIRED, ALICE, { reservationExpiresAt: past }));
    await setDoc(doc(f, `teams/${TEAM_A}/films/${FILM_ABANDONED}`), film(TEAM_A, FILM_ABANDONED, ALICE, { status: 'abandoned', abandonedAt: now }));
    await setDoc(doc(f, `teams/${TEAM_B}/films/${FILM_BOB}`), film(TEAM_B, FILM_BOB, BOB));
    await setDoc(doc(f, `teams/${TEAM_A}/films/${FILM_AT_MAX}`), film(TEAM_A, FILM_AT_MAX, ALICE, { declaredBytes: MAX_BYTES }));
    // Seeded directly (the server would refuse it) to isolate the rules literal.
    await setDoc(doc(f, `teams/${TEAM_A}/films/${FILM_OVER_MAX}`), film(TEAM_A, FILM_OVER_MAX, ALICE, { declaredBytes: MAX_BYTES + 1 }));
    await setDoc(doc(f, `teams/${TEAM_A}/filmLedger/cap`), { slots: {} });
    await setDoc(doc(f, 'filmOperations/x'), { uid: ALICE });
  });
});

describe('FS-12..14 film documents (Firestore)', () => {
  it('FS-12 no client create/update/delete of film docs, even by the owner', async () => {
    const f = db(ALICE);
    const p = `teams/${TEAM_A}/films/${FILM}`;
    await assertFails(updateDoc(doc(f, p), { status: 'ready' }));
    await assertFails(updateDoc(doc(f, p), { objectGeneration: '1' }));
    await assertFails(updateDoc(doc(f, p), { createdBy: BOB }));
    await assertFails(deleteDoc(doc(f, p)));
    const newId = '7d5261a0-9fae-4cbd-aedf-4a5b6c7d8e9f';
    await assertFails(setDoc(doc(f, `teams/${TEAM_A}/films/${newId}`), film(TEAM_A, newId, ALICE, { status: 'ready' })));
  });
  it('FS-13 foreign team film docs unreadable; ledger and operations never readable', async () => {
    await assertFails(getDoc(doc(db(ALICE), `teams/${TEAM_B}/films/${FILM_BOB}`)));
    await assertFails(getDocs(collection(db(ALICE), `teams/${TEAM_B}/films`)));
    await assertFails(getDoc(doc(db(ALICE), `teams/${TEAM_A}/filmLedger/cap`)));
    await assertFails(setDoc(doc(db(ALICE), `teams/${TEAM_A}/filmLedger/cap`), { slots: {} }));
    await assertFails(getDoc(doc(db(ALICE), 'filmOperations/x')));
  });
  it('FS-14 owner can get and list own team films; ineligible callers cannot', async () => {
    await assertSucceeds(getDoc(doc(db(ALICE), `teams/${TEAM_A}/films/${FILM}`)));
    await assertSucceeds(getDocs(collection(db(ALICE), `teams/${TEAM_A}/films`)));
    for (const t of [tokens.noBeta, tokens.unverified, tokens.anonymousWithClaims]) {
      await assertFails(getDoc(doc(db(ALICE, t), `teams/${TEAM_A}/films/${FILM}`)));
    }
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), `teams/${TEAM_A}/films/${FILM}`)));
  });
});

describe('FS-15..18 quarantine uploads (Storage)', () => {
  it('FS-15 creator uploads the exact declared size', async () => {
    await assertSucceeds(uploadBytes(ref(store(ALICE), qpath(TEAM_A, FILM)), BYTES, mp4));
  });
  it('FS-16 wrong size or wrong content type denied', async () => {
    await assertFails(uploadBytes(ref(store(ALICE), qpath(TEAM_A, FILM)), new Uint8Array(SIZE + 1), mp4));
    await assertFails(uploadBytes(ref(store(ALICE), qpath(TEAM_A, FILM)), new Uint8Array(SIZE - 1), mp4));
    await assertFails(uploadBytes(ref(store(ALICE), qpath(TEAM_A, FILM)), BYTES, { contentType: 'video/quicktime' }));
  });
  it('FS-17 wrong path, other user, ineligible tokens, foreign team denied', async () => {
    await assertFails(uploadBytes(ref(store(ALICE), `quarantine/${TEAM_A}/${FILM}/other.mp4`), BYTES, mp4));
    await assertFails(uploadBytes(ref(store(ALICE), `films/${TEAM_A}/${FILM}/source.mp4`), BYTES, mp4));
    await assertFails(uploadBytes(ref(store(ALICE), `frames/${TEAM_A}/${FILM}/f.jpg`), BYTES, { contentType: 'image/jpeg' }));
    await assertFails(uploadBytes(ref(store(BOB), qpath(TEAM_A, FILM)), BYTES, mp4));
    await assertFails(uploadBytes(ref(store(ALICE), qpath(TEAM_B, FILM_BOB)), BYTES, mp4));
    for (const t of [tokens.noBeta, tokens.unverified, tokens.anonymousWithClaims]) {
      await assertFails(uploadBytes(ref(store(ALICE, t), qpath(TEAM_A, FILM)), BYTES, mp4));
    }
    const unreserved = '8e6372b1-a0bf-4dce-bfe0-5b6c7d8e9fa0';
    await assertFails(uploadBytes(ref(store(ALICE), qpath(TEAM_A, unreserved)), BYTES, mp4));
  });
  const seedObjects = () => env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), qpath(TEAM_A, FILM)), BYTES, mp4);
    await uploadBytes(ref(ctx.storage(), `films/${TEAM_A}/${FILM}/source.mp4`), BYTES, mp4);
    await uploadBytes(ref(ctx.storage(), `frames/${TEAM_A}/${FILM}/f.jpg`), BYTES, { contentType: 'image/jpeg' });
  });
  const P18 = [qpath(TEAM_A, FILM), `films/${TEAM_A}/${FILM}/source.mp4`, `frames/${TEAM_A}/${FILM}/f.jpg`];
  for (const p of P18) {
    const label = p.split('/')[0];
    it(`FS-18 ${label}: no client read`, async () => {
      await seedObjects();
      await assertFails(getBytes(ref(store(ALICE), p)));
    });
    it(`FS-18 ${label}: no client delete`, async () => {
      await seedObjects();
      await assertFails(deleteObject(ref(store(ALICE), p)));
    });
    it(`FS-18 ${label}: no client metadata update`, async () => {
      await seedObjects();
      await assertFails(updateMetadata(ref(store(ALICE), p), { customMetadata: { x: '1' } }));
    });
  }
  it('FS-18 quarantine: an existing object cannot be overwritten (create-only)', async () => {
    await seedObjects();
    await assertFails(uploadBytes(ref(store(ALICE), qpath(TEAM_A, FILM)), BYTES, mp4));
  });
});

describe('FS-06 rules side / R8: byte limit at the Storage boundary', () => {
  it('upload of exactly maxBytes is allowed', async () => {
    await assertSucceeds(uploadBytes(ref(store(ALICE), qpath(TEAM_A, FILM_AT_MAX)), new Uint8Array(MAX_BYTES), mp4));
  });
  it('upload of maxBytes + 1 is denied even when the film doc declares it', async () => {
    await assertFails(uploadBytes(ref(store(ALICE), qpath(TEAM_A, FILM_OVER_MAX)), new Uint8Array(MAX_BYTES + 1), mp4));
  });
});

describe('R7 film document identity is checked', () => {
  it('a film doc whose teamId/filmId fields do not match the path is not a live reservation', async () => {
    const mismatched = '9a7e8fa1-bc2d-4e3f-8a41-5c6d7e8f90a1';
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `teams/${TEAM_A}/films/${mismatched}`), film(TEAM_A, FILM, ALICE));
    });
    await assertFails(uploadBytes(ref(store(ALICE), qpath(TEAM_A, mismatched)), BYTES, mp4));
  });
});

describe('FS-23 rules side of expiry and abandonment', () => {
  it('expired or abandoned reservation: upload denied', async () => {
    await assertFails(uploadBytes(ref(store(ALICE), qpath(TEAM_A, FILM_EXPIRED)), BYTES, mp4));
    await assertFails(uploadBytes(ref(store(ALICE), qpath(TEAM_A, FILM_ABANDONED)), BYTES, mp4));
  });
});
