// FILM-S2b additive DENY tests (firestore.rules / storage.rules unchanged):
// worker state and job-scoped normalized outputs are server-only. The film
// document itself stays owner-readable exactly as in S1 (FS-14), including
// the v2 fields the worker writes on ready/rejected.
// Run with the Firestore + Storage emulators (demo-* project only).
import { describe, it, before, after, beforeEach } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject, updateMetadata } from 'firebase/storage';
import { createEnv, tokens, ALICE, BOB, TEAM_A } from './helpers.mjs';

let env;
const FILM = '3f1e2d4c-5b6a-4e7f-8a9b-0c1d2e3f4a5b';
const JOB = '0123456789abcdef0123456789abcdef';
const jobPath = `teams/${TEAM_A}/films/${FILM}/workerJobs/${JOB}`;
const outPath = `films/${TEAM_A}/${FILM}/jobs/${JOB}/normalized.mp4`;
const now = Timestamp.now();
const mp4 = { contentType: 'video/mp4' };

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
    await setDoc(doc(f, `teams/${TEAM_A}/films/${FILM}`), { filmId: FILM, teamId: TEAM_A, createdBy: ALICE, status: 'ready',
      readyAt: now, normalizedGeneration: '1001', retentionExpiresAt: null,
      media: { bytes: 1, durationMs: 1, width: 2, height: 2, videoCodec: 'h264', audioCodec: null, frameRateMode: 'cfr', sha256: 'a'.repeat(64) } });
    await setDoc(doc(f, jobPath), { schema: 'film-worker-job.v1', admitted: 1, fence: 1 });
    await uploadBytes(ref(ctx.storage(), outPath), new Uint8Array(8), mp4);
  });
});

describe('FILM-S2b worker paths are server-only', () => {
  it('owner (and others) cannot get, list, write or delete worker jobs', async () => {
    for (const uid of [ALICE, BOB]) {
      await assertFails(getDoc(doc(db(uid), jobPath)));
      await assertFails(getDocs(collection(db(uid), `teams/${TEAM_A}/films/${FILM}/workerJobs`)));
      await assertFails(setDoc(doc(db(uid), jobPath), { admitted: 0 }));
      await assertFails(deleteDoc(doc(db(uid), jobPath)));
    }
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), jobPath)));
  });
  it('the film document stays owner-readable (S1 FS-14 unchanged) and client-unwritable', async () => {
    await assertSucceeds(getDoc(doc(db(ALICE), `teams/${TEAM_A}/films/${FILM}`)));
    await assertFails(getDoc(doc(db(BOB), `teams/${TEAM_A}/films/${FILM}`)));
    await assertFails(setDoc(doc(db(ALICE), `teams/${TEAM_A}/films/${FILM}`), { status: 'ready' }, { merge: true }));
  });
  it('normalized job output: no client read, write, delete or metadata update', async () => {
    for (const uid of [ALICE, BOB]) {
      await assertFails(getBytes(ref(store(uid), outPath)));
      await assertFails(uploadBytes(ref(store(uid), `films/${TEAM_A}/${FILM}/jobs/${JOB}/other.mp4`), new Uint8Array(8), mp4));
      await assertFails(deleteObject(ref(store(uid), outPath)));
      await assertFails(updateMetadata(ref(store(uid), outPath), { customMetadata: { x: '1' } }));
    }
  });
});
