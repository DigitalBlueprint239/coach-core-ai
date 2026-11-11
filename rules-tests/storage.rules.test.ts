import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import {
  deleteObject, getMetadata, listAll, ref, uploadBytes,
} from 'firebase/storage';

let env: RulesTestEnvironment;
const alice = () => env.authenticatedContext('alice').storage('gs://demo-coach-core.appspot.com');
const bob = () => env.authenticatedContext('bob').storage('gs://demo-coach-core.appspot.com');
const carol = () => env.authenticatedContext('carol').storage('gs://demo-coach-core.appspot.com');
const anonymous = () => env.unauthenticatedContext().storage('gs://demo-coach-core.appspot.com');
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

async function upload(storage: ReturnType<typeof alice>, path: string, contentType = 'image/png') {
  return uploadBytes(ref(storage, path), png, { contentType });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-coach-core',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearStorage();
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'teams/t1'), { ownerId: 'alice', memberIds: ['alice', 'carol'] });
    await setDoc(doc(db, 'teams/t2'), { ownerId: 'bob', memberIds: ['bob'] });
    await setDoc(doc(db, 'plays/p1'), { teamId: 't1', createdBy: 'alice', schemaVersion: 3, revision: 1, status: 'draft' });
    await setDoc(doc(db, 'plays/p2'), { teamId: 't2', createdBy: 'bob', schemaVersion: 3, revision: 1, status: 'draft' });
    await setDoc(doc(db, 'practicePlans/pp1'), { teamId: 't1', createdBy: 'alice' });
    await setDoc(doc(db, 'practicePlans/pp2'), { teamId: 't2', createdBy: 'bob' });
  });
});

describe('Storage owner-scoped authorization', () => {
  it('requires the exact profile owner for image create/read/delete', async () => {
    const file = 'users/alice/profile/avatar.png';
    await assertSucceeds(upload(alice(), file));
    await assertSucceeds(getMetadata(ref(alice(), file)));
    await assertFails(getMetadata(ref(bob(), file)));
    await assertFails(upload(bob(), file));
    await assertFails(getMetadata(ref(anonymous(), file)));
    await assertSucceeds(deleteObject(ref(alice(), file)));
  });

  it('refuses PDF, SVG, zero-size and oversized images in profile storage', async () => {
    await assertFails(upload(alice(), 'users/alice/profile/a.svg', 'image/svg+xml'));
    await assertFails(upload(alice(), 'users/alice/profile/a.pdf', 'application/pdf'));
    await assertFails(uploadBytes(ref(alice(), 'users/alice/profile/empty.png'), new Uint8Array(), { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(alice(), 'users/alice/profile/huge.png'), new Uint8Array(5 * 1024 * 1024 + 1), { contentType: 'image/png' }));
  });

  it('restricts team documents to the actual owner, not any signed-in member', async () => {
    const file = 'teams/t1/documents/install.pdf';
    await assertSucceeds(upload(alice(), file, 'application/pdf'));
    await assertSucceeds(getMetadata(ref(alice(), file)));
    await assertFails(getMetadata(ref(carol(), file)));
    await assertFails(upload(carol(), file, 'application/pdf'));
    await assertFails(getMetadata(ref(bob(), file)));
    await assertFails(upload(bob(), file, 'application/pdf'));
  });

  it('allows the other team owner only for their own team', async () => {
    await assertSucceeds(upload(bob(), 'teams/t2/documents/game-plan.pdf', 'application/pdf'));
    await assertFails(upload(alice(), 'teams/t2/documents/game-plan.pdf', 'application/pdf'));
  });

  it('checks both practice-plan ownership and team ownership', async () => {
    const file = 'practice-plans/pp1/attachments/periods.pdf';
    await assertSucceeds(upload(alice(), file, 'application/pdf'));
    await assertSucceeds(getMetadata(ref(alice(), file)));
    await assertFails(getMetadata(ref(carol(), file)));
    await assertFails(upload(bob(), file, 'application/pdf'));
    await assertFails(upload(alice(), 'practice-plans/pp2/attachments/other.pdf', 'application/pdf'));
    await assertFails(upload(alice(), 'practice-plans/missing/attachments/ghost.pdf', 'application/pdf'));
  });

  it('restricts play diagrams to the owner and rejects unsupported file types', async () => {
    const file = 'plays/p1/media/front.png';
    await assertSucceeds(upload(alice(), file));
    await assertSucceeds(getMetadata(ref(alice(), file)));
    await assertFails(getMetadata(ref(bob(), file)));
    await assertFails(upload(carol(), file));
    await assertFails(upload(alice(), 'plays/p1/media/malware.svg', 'image/svg+xml'));
    await assertFails(upload(alice(), 'plays/p1/media/clip.mp4', 'video/mp4'));
    await assertFails(upload(bob(), 'plays/missing/media/secret.png'));
  });

  it('keeps published v3 play media readable but prevents owner overwrite and deletion', async () => {
    const file = 'plays/p1/media/signed-off.png';
    await assertSucceeds(upload(alice(), file));
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'plays/p1'), {
        teamId: 't1', createdBy: 'alice', schemaVersion: 3, revision: 4, status: 'published',
      });
    });
    await assertSucceeds(getMetadata(ref(alice(), file)));
    await assertFails(upload(alice(), file));
    await assertFails(upload(alice(), 'plays/p1/media/new.png'));
    await assertFails(deleteObject(ref(alice(), file)));
    await assertFails(getMetadata(ref(bob(), file)));
  });

  it('does not allow folder enumeration or unrecognized path operations', async () => {
    await assertSucceeds(upload(alice(), 'teams/t1/documents/private.pdf', 'application/pdf'));
    await assertFails(listAll(ref(alice(), 'teams/t1/documents')));
    await assertFails(listAll(ref(anonymous(), 'teams/t1/documents')));
    await assertFails(upload(alice(), 'shared/team-public.pdf', 'application/pdf'));
  });

  it('does not let deleted parent documents keep granting access', async () => {
    // Missing parent documents cannot confer ownership, even with a known path.
    await assertFails(upload(alice(), 'plays/unknown/media/nope.png'));
    await assertFails(upload(alice(), 'practice-plans/unknown/attachments/nope.pdf', 'application/pdf'));
  });
});
