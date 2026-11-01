/**
 * Firestore security rules — the access each coach should and should not have.
 * Users: alice owns team t1, bob owns team t2. Runs against the emulator (npm run test:rules).
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

let env: RulesTestEnvironment;

const alice = () => env.authenticatedContext('alice').firestore();
const bob = () => env.authenticatedContext('bob').firestore();
const anonymous = () => env.unauthenticatedContext().firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-coach-core',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'teams/t1'), { name: 'Eagles', ownerId: 'alice', memberIds: ['alice'] });
    await setDoc(doc(db, 'teams/t2'), { name: 'Hawks', ownerId: 'bob', memberIds: ['bob'] });
    await setDoc(doc(db, 'plays/p1'), { name: 'Mesh', teamId: 't1', createdBy: 'alice' });
    await setDoc(doc(db, 'practicePlans/pp1'), { name: 'Tuesday', teamId: 't1', createdBy: 'alice' });
  });
});

describe('teams', () => {
  it('the owner can read, update and delete their team', async () => {
    await assertSucceeds(getDoc(doc(alice(), 'teams/t1')));
    await assertSucceeds(updateDoc(doc(alice(), 'teams/t1'), { name: 'Eagles 2' }));
    await assertSucceeds(deleteDoc(doc(alice(), 'teams/t1')));
  });

  it("another coach cannot read someone else's team", async () => {
    await assertFails(getDoc(doc(bob(), 'teams/t1')));
  });

  it('signed-out visitors cannot read a team', async () => {
    await assertFails(getDoc(doc(anonymous(), 'teams/t1')));
  });

  it('a coach can create a team only with themselves as owner', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'teams/t3'), { name: 'New', ownerId: 'alice' }));
    await assertFails(setDoc(doc(alice(), 'teams/t4'), { name: 'New', ownerId: 'bob' }));
  });

  it('the owner cannot hand the team to someone else by changing ownerId', async () => {
    await assertFails(updateDoc(doc(alice(), 'teams/t1'), { ownerId: 'bob' }));
  });

  it("another coach cannot update or delete someone else's team", async () => {
    await assertFails(updateDoc(doc(bob(), 'teams/t1'), { name: 'Mine now' }));
    await assertFails(deleteDoc(doc(bob(), 'teams/t1')));
  });
});

// Plays and practice plans share the same rules shape.
describe.each([
  ['plays', 'p1'],
  ['practicePlans', 'pp1'],
])('%s', (collection, existingId) => {
  const path = (id: string) => `${collection}/${id}`;

  it("the coach can create one in their own team, as themselves", async () => {
    await assertSucceeds(setDoc(doc(alice(), path('new1')), { name: 'x', teamId: 't1', createdBy: 'alice' }));
  });

  it("the coach cannot create one in someone else's team", async () => {
    await assertFails(setDoc(doc(alice(), path('new2')), { name: 'x', teamId: 't2', createdBy: 'alice' }));
  });

  it('the coach cannot create one as somebody else', async () => {
    await assertFails(setDoc(doc(alice(), path('new3')), { name: 'x', teamId: 't1', createdBy: 'bob' }));
  });

  it('the coach can read and rename their own', async () => {
    await assertSucceeds(getDoc(doc(alice(), path(existingId))));
    await assertSucceeds(updateDoc(doc(alice(), path(existingId)), { name: 'renamed' }));
  });

  it("the coach cannot move one into a team they don't own", async () => {
    await assertFails(updateDoc(doc(alice(), path(existingId)), { teamId: 't2' }));
  });

  it('the coach cannot rewrite who created it', async () => {
    await assertFails(updateDoc(doc(alice(), path(existingId)), { createdBy: 'bob' }));
  });

  it("another coach cannot read, update or delete it", async () => {
    await assertFails(getDoc(doc(bob(), path(existingId))));
    await assertFails(updateDoc(doc(bob(), path(existingId)), { name: 'mine' }));
    await assertFails(deleteDoc(doc(bob(), path(existingId))));
  });

  it('the coach can delete their own', async () => {
    await assertSucceeds(deleteDoc(doc(alice(), path(existingId))));
  });

  it('reading a document that does not exist is denied, not a rules crash', async () => {
    await assertFails(getDoc(doc(alice(), path('missing'))));
  });
});

// Smart Playbook v2 (phase 2) relies on these existing rules; it adds no rule changes.
describe('Smart Playbook v2 access (no rule changes)', () => {
  it("the coach can list their team's plays with where('teamId','==','t1')", async () => {
    await assertSucceeds(getDocs(query(collection(alice(), 'plays'), where('teamId', '==', 't1'))));
  });

  it("another coach's list query for t1 is denied", async () => {
    await assertFails(getDocs(query(collection(bob(), 'plays'), where('teamId', '==', 't1'))));
  });

  it('an unfiltered list of every play is denied', async () => {
    await assertFails(getDocs(collection(alice(), 'plays')));
  });

  it('the owner can update teams/t1 with only a playbook field', async () => {
    await assertSucceeds(
      updateDoc(doc(alice(), 'teams/t1'), { playbook: { terminology: { H: 'F' }, level: 'jv', formations: [] } }),
    );
  });

  it("another coach cannot write t1's playbook settings", async () => {
    await assertFails(updateDoc(doc(bob(), 'teams/t1'), { playbook: { terminology: {}, level: 'jv', formations: [] } }));
  });
});
