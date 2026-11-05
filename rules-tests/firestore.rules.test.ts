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
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

let env: RulesTestEnvironment;

const alice = () => env.authenticatedContext('alice').firestore();
const bob = () => env.authenticatedContext('bob').firestore();
const carol = () => env.authenticatedContext('carol').firestore(); // a listed member of t1, not its owner
const anonymous = () => env.unauthenticatedContext().firestore();
const admin = (verified: boolean) =>
  env.authenticatedContext('admin', { email: 'digitalblueprint239@gmail.com', email_verified: verified }).firestore();

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
    await setDoc(doc(db, 'teams/t1'), { name: 'Eagles', ownerId: 'alice', memberIds: ['alice', 'carol'] });
    await setDoc(doc(db, 'teams/t2'), { name: 'Hawks', ownerId: 'bob', memberIds: ['bob'] });
    await setDoc(doc(db, 'plays/p1'), { name: 'Mesh', teamId: 't1', createdBy: 'alice' });
    await setDoc(doc(db, 'practicePlans/pp1'), { name: 'Tuesday', teamId: 't1', createdBy: 'alice' });
    await setDoc(doc(db, 'users/alice'), { displayName: 'Alice' });
    await setDoc(doc(db, 'waitlist/w1'), { email: 'coach@example.com', createdAt: new Date() });
    await setDoc(doc(db, 'cspViolations/c1'), { blockedUri: 'x' });
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

  it('a coach can create a team only with themselves as owner and only member', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'teams/t3'), { name: 'New', ownerId: 'alice', memberIds: ['alice'] }));
    await assertFails(setDoc(doc(alice(), 'teams/t4'), { name: 'New', ownerId: 'bob', memberIds: ['bob'] }));
    await assertFails(setDoc(doc(alice(), 'teams/t5'), { name: 'New', ownerId: 'alice', memberIds: ['alice', 'bob'] }));
  });

  it("the app's create call (addDoc with server timestamps) succeeds", async () => {
    await assertSucceeds(
      addDoc(collection(alice(), 'teams'), {
        name: 'Created in app',
        code: 'ABCD2345',
        ownerId: 'alice',
        memberIds: ['alice'],
        memberDetails: [{ id: 'alice', email: 'a@example.com', role: 'owner', joinedAt: new Date() }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("the app's 'my teams' query (memberIds array-contains me) is allowed for my own uid only", async () => {
    await assertSucceeds(getDocs(query(collection(alice(), 'teams'), where('memberIds', 'array-contains', 'alice'))));
    await assertFails(getDocs(query(collection(bob(), 'teams'), where('memberIds', 'array-contains', 'alice'))));
  });

  it('a listed member can read the team but not change it', async () => {
    await assertSucceeds(getDoc(doc(carol(), 'teams/t1')));
    await assertFails(updateDoc(doc(carol(), 'teams/t1'), { name: 'Carol FC' }));
  });

  it('searching every team by join code is denied (the app no longer does this)', async () => {
    await assertFails(getDocs(query(collection(alice(), 'teams'), where('code', '==', 'ABCD2345'))));
  });

  it('the owner can save playbook settings on the team document', async () => {
    await assertSucceeds(updateDoc(doc(alice(), 'teams/t1'), { playbook: { level: 'jv', terminology: {}, formations: [] } }));
  });

  it('the owner cannot hand the team to someone else by changing ownerId', async () => {
    await assertFails(updateDoc(doc(alice(), 'teams/t1'), { ownerId: 'bob' }));
  });

  it('the owner cannot accidentally remove themselves from the team member list', async () => {
    await assertFails(updateDoc(doc(alice(), 'teams/t1'), { memberIds: ['carol'] }));
    await assertSucceeds(updateDoc(doc(alice(), 'teams/t1'), { memberIds: ['alice'] }));
  });

  it('the owner cannot replace memberIds with a value of the wrong type', async () => {
    await assertFails(updateDoc(doc(alice(), 'teams/t1'), { memberIds: 'alice' }));
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
])('%s', (collectionName, existingId) => {
  const path = (id: string) => `${collectionName}/${id}`;

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

  it("the app's team query (where teamId == mine) is allowed for the owner only", async () => {
    await assertSucceeds(getDocs(query(collection(alice(), collectionName), where('teamId', '==', 't1'))));
    await assertFails(getDocs(query(collection(bob(), collectionName), where('teamId', '==', 't1'))));
  });
});

describe('users', () => {
  it('a user reads and writes only their own profile', async () => {
    await assertSucceeds(getDoc(doc(alice(), 'users/alice')));
    await assertSucceeds(setDoc(doc(alice(), 'users/alice'), { displayName: 'Alice J' }));
    await assertFails(getDoc(doc(bob(), 'users/alice')));
    await assertFails(setDoc(doc(bob(), 'users/alice'), { displayName: 'hacked' }));
  });

  it('an admin with a verified email can read profiles; the same email unverified cannot', async () => {
    await assertSucceeds(getDoc(doc(admin(true), 'users/alice')));
    await assertFails(getDoc(doc(admin(false), 'users/alice')));
    await assertFails(setDoc(doc(admin(true), 'users/alice'), { displayName: 'admin edit' }));
  });
});

describe('waitlist', () => {
  const entry = { email: 'new.coach@example.com', source: 'landing', createdAt: new Date(), utmSource: 'x' };

  it('a signed-out visitor can join the waitlist with a valid entry', async () => {
    await assertSucceeds(addDoc(collection(anonymous(), 'waitlist'), entry));
  });

  it('invalid entries are refused: unknown field, bad email, missing time', async () => {
    await assertFails(addDoc(collection(anonymous(), 'waitlist'), { ...entry, isAdmin: true }));
    await assertFails(addDoc(collection(anonymous(), 'waitlist'), { ...entry, email: 'not-an-email' }));
    const noTime = { email: entry.email, source: entry.source };
    await assertFails(addDoc(collection(anonymous(), 'waitlist'), noTime));
  });

  it('only a verified admin can read the waitlist; nobody can edit or delete it', async () => {
    await assertFails(getDoc(doc(anonymous(), 'waitlist/w1')));
    await assertFails(getDoc(doc(alice(), 'waitlist/w1')));
    await assertFails(getDoc(doc(admin(false), 'waitlist/w1')));
    await assertSucceeds(getDoc(doc(admin(true), 'waitlist/w1')));
    await assertFails(updateDoc(doc(admin(true), 'waitlist/w1'), { status: 'invited' }));
    await assertFails(deleteDoc(doc(admin(true), 'waitlist/w1')));
  });
});

describe('everything else is closed to the app', () => {
  it('server-only and unlisted collections cannot be read or written', async () => {
    await assertFails(getDoc(doc(admin(true), 'cspViolations/c1')));
    await assertFails(setDoc(doc(alice(), 'staging_feedback/f1'), { text: 'hi' }));
    await assertFails(setDoc(doc(alice(), 'games/g1'), { teamId: 't1', createdBy: 'alice' }));
  });
});

// Smart Playbook v2 (phase 2) relies on these existing rules; it adds no rule changes.
// (Its list-query and playbook-settings cases are covered above, in the plays/practicePlans and teams blocks.)
describe('Smart Playbook v2 access (no rule changes)', () => {
  it('an unfiltered list of every play is denied', async () => {
    await assertFails(getDocs(collection(alice(), 'plays')));
  });

  it("another coach cannot write t1's playbook settings", async () => {
    await assertFails(updateDoc(doc(bob(), 'teams/t1'), { playbook: { terminology: {}, level: 'jv', formations: [] } }));
  });
});

// Canonical v3 plays: optimistic concurrency (T-109). Each save must move the revision forward by exactly one.
describe('v3 play revisions', () => {
  const v3 = (revision: number) => ({ schemaVersion: 3, name: 'IZ', teamId: 't1', createdBy: 'alice', revision });

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'plays/v3a'), v3(4));
    });
  });

  it('a new v3 play must start at revision 1', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'plays/v3new'), v3(1)));
    await assertFails(setDoc(doc(alice(), 'plays/v3bad'), v3(2)));
  });

  it('an update must set revision to exactly the stored revision + 1', async () => {
    await assertSucceeds(updateDoc(doc(alice(), 'plays/v3a'), { name: 'IZ 2', revision: 5 }));
  });

  it('a stale editor (same revision) or a skipped revision is denied', async () => {
    await assertFails(updateDoc(doc(alice(), 'plays/v3a'), { name: 'stale', revision: 4 }));
    await assertFails(updateDoc(doc(alice(), 'plays/v3a'), { name: 'skip', revision: 6 }));
    await assertFails(updateDoc(doc(alice(), 'plays/v3a'), { name: 'no revision' }));
  });

  it('a v3 play cannot be downgraded to an older schema', async () => {
    await assertFails(updateDoc(doc(alice(), 'plays/v3a'), { schemaVersion: 2, revision: 5 }));
  });

  it('rejects overwriting a legacy v2 play as v3 at the same document ID', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'plays/old-v2'), {
        schemaVersion: 2, teamId: 't1', createdBy: 'alice', name: 'Old v2',
      });
    });
    await assertFails(updateDoc(doc(alice(), 'plays/old-v2'), { schemaVersion: 3, revision: 1 }));
    // Ordinary edits to the original v2 are still possible without version promotion.
    await assertSucceeds(updateDoc(doc(alice(), 'plays/old-v2'), { name: 'Renamed v2' }));
  });

  it('rejects promoting a legacy version-one play to v3 in place', async () => {
    await assertFails(updateDoc(doc(alice(), 'plays/p1'), { schemaVersion: 3, revision: 1 }));
  });

  it('allows a new, separately identified v3 play to be created without overwriting the v2 source', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'plays/old-v2'), {
        schemaVersion: 2, teamId: 't1', createdBy: 'alice', name: 'Source',
      });
    });
    await assertSucceeds(setDoc(doc(alice(), 'plays/new-v3-copy'), {
      ...v3(1), provenance: { origin: 'migrated', fromSchemaVersion: 2, sourceId: 'old-v2' },
    }));
    await assertSucceeds(getDoc(doc(alice(), 'plays/old-v2')));
  });

  it('older plays without a schema version keep their existing rules', async () => {
    await assertSucceeds(updateDoc(doc(alice(), 'plays/p1'), { name: 'renamed again' }));
  });
});
