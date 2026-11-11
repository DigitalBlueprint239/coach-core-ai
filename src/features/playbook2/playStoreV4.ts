// Firestore persistence for canonical v4 plays. Contract: docs/smart-playbook/SCHEMA_V4.md.
//
// - Every save writes the play AND an immutable copy at plays/{id}/revisions/{revision} in one atomic commit, so
//   there is always a history to go back to. The security rules refuse a play write without its revision copy.
// - An update runs in a transaction and only writes if the stored revision is still the one the coach opened.
//   Otherwise it throws a `PlayConflict` and writes nothing; the editor keeps the coach's unsaved work.
// - Only the newest REVISION_RETENTION copies are kept; the oldest is removed in the same transaction.
// - A v2 or v3 play is never rewritten. Saving a converted play creates a new v4 document whose provenance points
//   at the original.
// - Publishing writes a separate create-only snapshot. The play document itself has no "published" switch.
import { collection, deleteDoc, doc, getDocs, query, runTransaction, where, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { readPlayDocumentV4, validatePlayDocV4, type PlayDocV4 } from '../../football-core';

/** Revision copies kept per play. At a few kilobytes each this bounds history to roughly 100 KB per play. */
export const REVISION_RETENTION = 25;

export type PlayConflict = { kind: 'conflict'; message: string; storedRevision: number | null };

export const isPlayConflict = (e: unknown): e is PlayConflict =>
  typeof e === 'object' && e !== null && (e as PlayConflict).kind === 'conflict';

const conflict = (storedRevision: number | null): PlayConflict => ({
  kind: 'conflict',
  storedRevision,
  message:
    storedRevision === null
      ? "Couldn't save: this play was deleted since you opened it. Your changes are still here."
      : "Couldn't save: this play was changed somewhere else since you opened it. Your changes are still here — reload to see the other version before saving again.",
});

export type PlayRevisionRecord = { teamId: string; playId: string; revision: number; savedBy: string; savedAt: Date; play: PlayDocV4 };
export type PublishedPlayRecord = {
  schemaVersion: 4;
  kind: 'published-play';
  teamId: string;
  playId: string;
  revision: number;
  publishedBy: string;
  publishedAt: Date;
  play: PlayDocV4;
};

export const publishedSnapshotId = (playId: string, revision: number) => `${playId}_r${revision}`;

const playRef = (id: string) => doc(db, 'plays', id);
const revisionRef = (id: string, revision: number) => doc(db, 'plays', id, 'revisions', String(revision));

/** The stored document minus bookkeeping fields that are not part of the play. */
function playFields(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  const { updatedAt: _updatedAt, ...rest } = raw as Record<string, unknown>;
  void _updatedAt;
  return rest;
}

export type SaveTarget = { id: string; expectedRevision: number } | { id?: undefined };

/** Saves a v4 play with its revision copy. Resolves to `{ id, revision }` of what was written. */
export async function savePlayDocV4(play: PlayDocV4, uid: string, target: SaveTarget = {}): Promise<{ id: string; revision: number }> {
  const problems = validatePlayDocV4(play);
  if (problems.length) throw new Error(`Refusing to save a malformed play: ${problems.join(' ')}`);
  const savedAt = new Date();

  if (!target.id) {
    const ref = doc(collection(db, 'plays'));
    const created: PlayDocV4 = { ...structuredClone(play), revision: 1, createdBy: uid };
    const record: PlayRevisionRecord = { teamId: created.teamId, playId: ref.id, revision: 1, savedBy: uid, savedAt, play: created };
    const batch = writeBatch(db);
    batch.set(ref, { ...created, updatedAt: savedAt });
    batch.set(revisionRef(ref.id, 1), record);
    await batch.commit();
    return { id: ref.id, revision: 1 };
  }

  const id = target.id;
  const expected = target.expectedRevision;
  return runTransaction(db, async tx => {
    // All reads first (a Firestore transaction requirement).
    const snap = await tx.get(playRef(id));
    if (!snap.exists()) throw conflict(null);
    const stored = snap.data() as Partial<PlayDocV4>;
    if (stored.schemaVersion !== 4) throw new Error('Refusing to overwrite a non-v4 play; save it as a new v4 play instead.');
    const storedRevision = typeof stored.revision === 'number' ? stored.revision : null;
    if (storedRevision !== expected) throw conflict(storedRevision);
    const revision = expected + 1;
    const expiring = revision - REVISION_RETENTION;
    const expiringExists = expiring >= 1 && (await tx.get(revisionRef(id, expiring))).exists();

    // Identity and history fields always come from the stored play, never from the editor.
    const next: PlayDocV4 = { ...structuredClone(play), teamId: stored.teamId as string, provenance: stored.provenance as PlayDocV4['provenance'], revision };
    if (stored.createdBy === undefined) delete next.createdBy;
    else next.createdBy = stored.createdBy;
    const record: PlayRevisionRecord = { teamId: next.teamId, playId: id, revision, savedBy: uid, savedAt, play: next };
    tx.set(playRef(id), { ...next, updatedAt: savedAt });
    tx.set(revisionRef(id, revision), record);
    if (expiringExists) tx.delete(revisionRef(id, expiring));
    return { id, revision };
  });
}

export type ListedPlayDocV4 = PlayDocV4 & { id: string; sourceSchemaVersion: 2 | 3 | 4 };

/**
 * Loads a team's plays. v4 plays are returned as stored; v2 and v3 plays are converted in memory (nothing is
 * written) and flagged by `sourceSchemaVersion` so the editor saves them as NEW v4 plays. Version-1 and damaged
 * plays are counted in `skipped`, never guessed at.
 */
export async function loadPlayDocsV4(teamId: string): Promise<{ plays: ListedPlayDocV4[]; skipped: number }> {
  if (!teamId) throw new Error('Select a team to open its playbook.');
  const snap = await getDocs(query(collection(db, 'plays'), where('teamId', '==', teamId)));
  const plays: ListedPlayDocV4[] = [];
  let skipped = 0;
  for (const d of snap.docs) {
    const r = readPlayDocumentV4(playFields(d.data()), d.id);
    if (r.status === 'ok' && r.sourceSchemaVersion) plays.push({ ...r.value, id: d.id, sourceSchemaVersion: r.sourceSchemaVersion });
    else skipped++;
  }
  return { plays, skipped };
}

/** The saved history of one play, newest first. */
export async function loadPlayRevisions(teamId: string, playId: string): Promise<PlayRevisionRecord[]> {
  const snap = await getDocs(query(collection(db, 'plays', playId, 'revisions'), where('teamId', '==', teamId)));
  return snap.docs.map(d => d.data() as PlayRevisionRecord).sort((a, b) => b.revision - a.revision);
}

/** Deletes a play and its revision history. Published snapshots are separate records and are not touched. */
export async function deletePlayV4(teamId: string, playId: string): Promise<void> {
  const revisions = await getDocs(query(collection(db, 'plays', playId, 'revisions'), where('teamId', '==', teamId)));
  const batch = writeBatch(db);
  for (const d of revisions.docs) batch.delete(doc(db, 'plays', playId, 'revisions', d.id));
  batch.delete(playRef(playId));
  await batch.commit();
}

/**
 * Publishes the revision the coach is looking at as an immutable snapshot. The snapshot id is derived from the play
 * id and revision, so the same revision cannot be published twice, and the security rules refuse any later change.
 */
export async function publishPlayV4(playId: string, expectedRevision: number, uid: string): Promise<{ snapshotId: string }> {
  const snapshotId = publishedSnapshotId(playId, expectedRevision);
  await runTransaction(db, async tx => {
    const snap = await tx.get(playRef(playId));
    if (!snap.exists()) throw conflict(null);
    const r = readPlayDocumentV4(playFields(snap.data()));
    if (r.status !== 'ok' || r.sourceSchemaVersion !== 4) throw new Error('Only a saved v4 play can be published.');
    if (r.value.revision !== expectedRevision) throw conflict(r.value.revision);
    const record: PublishedPlayRecord = {
      schemaVersion: 4, kind: 'published-play', teamId: r.value.teamId, playId, revision: expectedRevision, publishedBy: uid,
      publishedAt: new Date(), play: r.value,
    };
    tx.set(doc(db, 'publishedPlays', snapshotId), record);
  });
  return { snapshotId };
}

export async function loadPublishedPlays(teamId: string): Promise<Array<PublishedPlayRecord & { id: string }>> {
  const snap = await getDocs(query(collection(db, 'publishedPlays'), where('teamId', '==', teamId)));
  return snap.docs.map(d => ({ ...(d.data() as PublishedPlayRecord), id: d.id }));
}

/** Withdraws a published snapshot. A snapshot can be removed by the team's coach but never edited. */
export async function unpublishPlayV4(snapshotId: string): Promise<void> {
  await deleteDoc(doc(db, 'publishedPlays', snapshotId));
}
