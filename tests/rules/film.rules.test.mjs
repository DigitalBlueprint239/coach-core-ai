// Film Analyzer FILM-S1 rules tests (reconciliation 2026-10-19, FS-12..FS-18,
// FS-23 and the client-side half of FS-06/FS-25).
//
// Everything here is SYNTHETIC: byte arrays, never footage. The 100000000-byte
// literal is the PENDING_D3 placeholder mirrored from functions/src/film/limits.js;
// it is not an approved limit. Film documents are seeded field-for-field in the
// coach-film.v1 FilmState shape (docs/film/COACH_FILM_V1_CONTRACT.md §4).
//
// Storage rules read the reservation from Firestore, so both emulators run.
import { describe, it, before, after } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';
import { createEnv, tokens, ALICE, BOB, TEAM_A, TEAM_B } from './helpers.mjs';

let env;
const now = Timestamp.fromDate(new Date('2026-10-13T12:00:00Z'));
const future = Timestamp.fromDate(new Date('2099-01-01T00:00:00Z'));
const past = Timestamp.fromDate(new Date('2000-01-01T00:00:00Z'));

// PENDING_D3 placeholder (see functions/src/film/limits.js and storage.rules).
const MAX_BYTES = 100000000;

// Synthetic MP4-shaped bytes: a 24-byte `ftyp` box followed by nothing.
// This is NOT a playable video and is never decoded by these tests.
const FTYP = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, // size=24 'ftyp'
  0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00, // 'isom' minor version
  0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x31, // 'isom' 'mp41'
]);
const mp4 = { contentType: 'video/mp4' };

// Deterministic UUID v4 film ids (contract: filmId is a lowercase UUID v4).
const ID = {
  open: 'a0000000-0000-4000-8000-000000000001',
  open2: 'a0000000-0000-4000-8000-000000000002',
  atLimit: 'a0000000-0000-4000-8000-000000000003',
  overLimit: 'a0000000-0000-4000-8000-000000000004',
  expired: 'a0000000-0000-4000-8000-000000000005',
  abandoned: 'a0000000-0000-4000-8000-000000000006',
  rejected: 'a0000000-0000-4000-8000-000000000007',
  validating: 'a0000000-0000-4000-8000-000000000008',
  foreign: 'a0000000-0000-4000-8000-000000000009',
  ghost: 'a0000000-0000-4000-8000-00000000000a',
  forged: 'a0000000-0000-4000-8000-00000000000b',
};

const film = (filmId, createdBy, status, expiresAt, declaredBytes = FTYP.length, extra = {}) => ({
  filmId, teamId: TEAM_A, createdBy, status, createdAt: now, statusChangedAt: now,
  reservationExpiresAt: expiresAt, declaredBytes, declaredContentType: 'video/mp4',
  fileName: 'synthetic.mp4', rightsWordingVersion: 'rights-v1', rightsAcknowledgedAt: now,
  uploadPath: `quarantine/${TEAM_A}/${filmId}/source.mp4`, objectGeneration: null,
  rejectionReason: null, abandonedAt: null, ...extra,
});

const store = (uid, token) => env.authenticatedContext(uid, token).storage();
const fire = (uid, token) => env.authenticatedContext(uid, token).firestore();
const q = (filmId, name = 'source.mp4') => `quarantine/${TEAM_A}/${filmId}/${name}`;

before(async () => {
  env = await createEnv({ firestore: true, storage: true });
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'teams', TEAM_A), { name: 'A', ownerId: ALICE, createdAt: now, updatedAt: now });
    await setDoc(doc(db, 'teams', TEAM_B), { name: 'B', ownerId: BOB, createdAt: now, updatedAt: now });
    const films = (id) => doc(db, 'teams', TEAM_A, 'films', id);
    await setDoc(films(ID.open), film(ID.open, ALICE, 'reserved', future));
    await setDoc(films(ID.open2), film(ID.open2, ALICE, 'reserved', future));
    await setDoc(films(ID.atLimit), film(ID.atLimit, ALICE, 'reserved', future, MAX_BYTES));
    await setDoc(films(ID.overLimit), film(ID.overLimit, ALICE, 'reserved', future, MAX_BYTES + 1));
    await setDoc(films(ID.expired), film(ID.expired, ALICE, 'reserved', past));
    await setDoc(films(ID.abandoned), film(ID.abandoned, ALICE, 'abandoned', past, FTYP.length, { abandonedAt: now }));
    await setDoc(films(ID.rejected), film(ID.rejected, ALICE, 'rejected', future, FTYP.length, { rejectionReason: 'size-mismatch', objectGeneration: '1' }));
    await setDoc(films(ID.validating), film(ID.validating, ALICE, 'validating', future, FTYP.length, { objectGeneration: '1' }));
    // A reservation whose createdBy is not the team owner must never be usable
    // (defence in depth: the server never creates one, but the rule must hold).
    await setDoc(films(ID.foreign), film(ID.foreign, BOB, 'reserved', future));
    await setDoc(doc(db, 'teams', TEAM_A, 'filmLedger', 'counts'), { active: 5, updatedAt: now });
    await setDoc(doc(db, 'filmOperations', `${ALICE}__00000000-0000-4000-8000-000000000001`), { uid: ALICE, action: 'reserveFilmUpload' });
    const st = ctx.storage();
    await uploadBytes(ref(st, q(ID.validating)), FTYP, mp4);
    await uploadBytes(ref(st, `films/${TEAM_A}/${ID.validating}/source.mp4`), FTYP, mp4);
    await uploadBytes(ref(st, `frames/${TEAM_A}/${ID.validating}/frame-0001.jpg`), FTYP, { contentType: 'image/jpeg' });
  });
});
after(async () => { await env?.cleanup(); });

describe('FS-12..14 Firestore: film documents are server-owned', () => {
  it('FS-14 owner can get and list film documents for their team', async () => {
    const db = fire(ALICE, tokens.beta);
    await assertSucceeds(getDoc(doc(db, 'teams', TEAM_A, 'films', ID.open)));
    await assertSucceeds(getDocs(collection(db, 'teams', TEAM_A, 'films')));
  });
  it('FS-13 another coach cannot read them; unauthenticated/anonymous/non-beta cannot either', async () => {
    await assertFails(getDoc(doc(fire(BOB, tokens.beta), 'teams', TEAM_A, 'films', ID.open)));
    await assertFails(getDocs(collection(fire(BOB, tokens.beta), 'teams', TEAM_A, 'films')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'teams', TEAM_A, 'films', ID.open)));
    await assertFails(getDoc(doc(fire(ALICE, tokens.anonymousWithClaims), 'teams', TEAM_A, 'films', ID.open)));
    await assertFails(getDoc(doc(fire(ALICE, tokens.noBeta), 'teams', TEAM_A, 'films', ID.open)));
    await assertFails(getDoc(doc(fire(ALICE, tokens.unverified), 'teams', TEAM_A, 'films', ID.open)));
  });
  it('FS-12 owner cannot create, forge status/generation/owner/ready, or delete a film document', async () => {
    const db = fire(ALICE, tokens.beta);
    await assertFails(setDoc(doc(db, 'teams', TEAM_A, 'films', ID.forged), film(ID.forged, ALICE, 'reserved', future)));
    await assertFails(updateDoc(doc(db, 'teams', TEAM_A, 'films', ID.open), { status: 'ready' }));
    await assertFails(updateDoc(doc(db, 'teams', TEAM_A, 'films', ID.open), { status: 'validating' }));
    await assertFails(updateDoc(doc(db, 'teams', TEAM_A, 'films', ID.open), { objectGeneration: '42' }));
    await assertFails(updateDoc(doc(db, 'teams', TEAM_A, 'films', ID.open), { createdBy: BOB }));
    await assertFails(updateDoc(doc(db, 'teams', TEAM_A, 'films', ID.open), { reservationExpiresAt: future, declaredBytes: 1 }));
    await assertFails(deleteDoc(doc(db, 'teams', TEAM_A, 'films', ID.abandoned)));
  });
  it('FS-12 cap ledger and idempotency records have no client access at all', async () => {
    const db = fire(ALICE, tokens.beta);
    await assertFails(getDoc(doc(db, 'teams', TEAM_A, 'filmLedger', 'counts')));
    await assertFails(setDoc(doc(db, 'teams', TEAM_A, 'filmLedger', 'counts'), { active: 0 }));
    await assertFails(getDoc(doc(db, 'filmOperations', `${ALICE}__00000000-0000-4000-8000-000000000001`)));
    await assertFails(setDoc(doc(db, 'filmOperations', `${ALICE}__00000000-0000-4000-8000-000000000002`), { uid: ALICE }));
  });
});

describe('FS-15 Storage: the reserved upload is allowed exactly as reserved', () => {
  it('owner creates the object at the reserved path with the declared size and video/mp4', async () => {
    await assertSucceeds(uploadBytes(ref(store(ALICE, tokens.beta), q(ID.open)), FTYP, mp4));
  });
  it('FS-16 a second create at the same path (overwrite/update) is denied', async () => {
    await assertFails(uploadBytes(ref(store(ALICE, tokens.beta), q(ID.open)), FTYP, mp4));
  });
});

describe('FS-16 Storage: mismatches against the reservation are denied', () => {
  it('wrong size (declaredBytes - 1 and + 1)', async () => {
    const s = store(ALICE, tokens.beta);
    await assertFails(uploadBytes(ref(s, q(ID.open2)), FTYP.subarray(0, FTYP.length - 1), mp4));
    await assertFails(uploadBytes(ref(s, q(ID.open2)), new Uint8Array(FTYP.length + 1), mp4));
  });
  it('wrong content type, even with the right size', async () => {
    const s = store(ALICE, tokens.beta);
    await assertFails(uploadBytes(ref(s, q(ID.open2)), FTYP, { contentType: 'video/quicktime' }));
    await assertFails(uploadBytes(ref(s, q(ID.open2)), FTYP, { contentType: 'application/octet-stream' }));
    await assertFails(uploadBytes(ref(s, q(ID.open2)), FTYP, { contentType: 'image/png' }));
  });
  it('wrong object name or path shape under the reservation', async () => {
    const s = store(ALICE, tokens.beta);
    await assertFails(uploadBytes(ref(s, q(ID.open2, 'other.mp4')), FTYP, mp4));
    await assertFails(uploadBytes(ref(s, q(ID.open2, 'source.mp4/extra')), FTYP, mp4));
    await assertFails(uploadBytes(ref(s, `quarantine/${TEAM_A}/${ID.open2}`), FTYP, mp4));
    await assertFails(uploadBytes(ref(s, `quarantine/${TEAM_A}/source.mp4`), FTYP, mp4));
  });
  it('a reservation id that does not exist', async () => {
    await assertFails(uploadBytes(ref(store(ALICE, tokens.beta), q(ID.ghost)), FTYP, mp4));
  });
  it('the owner of another team, and the right owner against the wrong team', async () => {
    await assertFails(uploadBytes(ref(store(BOB, tokens.beta), q(ID.open2)), FTYP, mp4));
    await assertFails(uploadBytes(ref(store(ALICE, tokens.beta), `quarantine/${TEAM_B}/${ID.open2}/source.mp4`), FTYP, mp4));
  });
  it('a reservation whose createdBy is not the caller', async () => {
    await assertFails(uploadBytes(ref(store(ALICE, tokens.beta), q(ID.foreign)), FTYP, mp4));
    await assertFails(uploadBytes(ref(store(BOB, tokens.beta), q(ID.foreign)), FTYP, mp4));
  });
  it('identity gates: unauthenticated, anonymous-with-claims, no beta, unverified', async () => {
    await assertFails(uploadBytes(ref(env.unauthenticatedContext().storage(), q(ID.open2)), FTYP, mp4));
    await assertFails(uploadBytes(ref(store(ALICE, tokens.anonymousWithClaims), q(ID.open2)), FTYP, mp4));
    await assertFails(uploadBytes(ref(store(ALICE, tokens.noBeta), q(ID.open2)), FTYP, mp4));
    await assertFails(uploadBytes(ref(store(ALICE, tokens.unverified), q(ID.open2)), FTYP, mp4));
  });
});

describe('FS-17/FS-23 Storage: closed reservations accept nothing', () => {
  it('expired reservation (reservationExpiresAt in the past)', async () => {
    await assertFails(uploadBytes(ref(store(ALICE, tokens.beta), q(ID.expired)), FTYP, mp4));
  });
  it('abandoned, rejected and validating reservations', async () => {
    const s = store(ALICE, tokens.beta);
    await assertFails(uploadBytes(ref(s, q(ID.abandoned)), FTYP, mp4));
    await assertFails(uploadBytes(ref(s, q(ID.rejected)), FTYP, mp4));
    await assertFails(uploadBytes(ref(s, q(ID.validating)), FTYP, mp4));
  });
  it('FS-23 a client cannot reopen a reservation by writing the film document', async () => {
    await assertFails(updateDoc(doc(fire(ALICE, tokens.beta), 'teams', TEAM_A, 'films', ID.expired), { reservationExpiresAt: future }));
    await assertFails(updateDoc(doc(fire(ALICE, tokens.beta), 'teams', TEAM_A, 'films', ID.abandoned), { status: 'reserved', reservationExpiresAt: future, abandonedAt: null }));
  });
});

describe('FS-18 Storage: no client reads, updates or deletes under quarantine/, films/, frames/', () => {
  it('owner cannot read or delete their own quarantine object', async () => {
    const s = store(ALICE, tokens.beta);
    await assertFails(getBytes(ref(s, q(ID.validating))));
    await assertFails(deleteObject(ref(s, q(ID.validating))));
    await assertFails(getBytes(ref(s, q(ID.open))));
    await assertFails(deleteObject(ref(s, q(ID.open))));
  });
  it('nobody can read, write or delete under films/ or frames/', async () => {
    for (const s of [store(ALICE, tokens.beta), store(BOB, tokens.beta), env.unauthenticatedContext().storage()]) {
      await assertFails(getBytes(ref(s, `films/${TEAM_A}/${ID.validating}/source.mp4`)));
      await assertFails(uploadBytes(ref(s, `films/${TEAM_A}/new/source.mp4`), FTYP, mp4));
      await assertFails(deleteObject(ref(s, `films/${TEAM_A}/${ID.validating}/source.mp4`)));
      await assertFails(getBytes(ref(s, `frames/${TEAM_A}/${ID.validating}/frame-0001.jpg`)));
      await assertFails(uploadBytes(ref(s, `frames/${TEAM_A}/${ID.validating}/frame-0002.jpg`), FTYP, { contentType: 'image/jpeg' }));
      await assertFails(deleteObject(ref(s, `frames/${TEAM_A}/${ID.validating}/frame-0001.jpg`)));
    }
  });
  it('existing team file rules are unchanged (owner still uploads/reads/deletes a PNG)', async () => {
    const s = store(ALICE, tokens.beta);
    const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    await assertSucceeds(uploadBytes(ref(s, `teams/${TEAM_A}/files/film-s1-regression.png`), PNG, { contentType: 'image/png' }));
    await assertSucceeds(getBytes(ref(s, `teams/${TEAM_A}/files/film-s1-regression.png`)));
    await assertSucceeds(deleteObject(ref(s, `teams/${TEAM_A}/files/film-s1-regression.png`)));
    await assertFails(uploadBytes(ref(s, `teams/${TEAM_A}/files/not-allowed.mp4`), FTYP, mp4));
  });
});

describe('FS-06/FS-25 Storage: PENDING_D3 byte limit literal (placeholder, not an approved limit)', () => {
  it('exactly MAX_BYTES is accepted when the reservation declared it', async () => {
    const big = new Uint8Array(MAX_BYTES);
    big.set(FTYP, 0);
    await assertSucceeds(uploadBytes(ref(store(ALICE, tokens.beta), q(ID.atLimit)), big, mp4));
  });
  it('MAX_BYTES + 1 is denied even when the reservation declared it', async () => {
    const big = new Uint8Array(MAX_BYTES + 1);
    big.set(FTYP, 0);
    await assertFails(uploadBytes(ref(store(ALICE, tokens.beta), q(ID.overLimit)), big, mp4));
  });
});
