// Firestore persistence for canonical v3 plays (T-104 storage, T-109 optimistic concurrency).
//
// - New plays are created at revision 1. An update runs in a transaction: it re-reads the stored play and only writes
//   if the stored revision still equals the revision the coach opened (`expectedRevision`); it then writes revision+1.
//   Otherwise it throws a `PlayConflict` and writes nothing, so two editors can never silently overwrite each other.
//   The caller keeps the coach's unsaved work (the editor's local draft) when a save fails.
// - Saving a play that was migrated from v2 creates a NEW v3 document (provenance points at the original); the v2
//   original is never rewritten.
// - Never sends teamId/createdBy changes on update (the security rules deny them); firestore.rules additionally enforce
//   revision + 1 for v3 documents.
import { addDoc, collection, doc, getDocs, query, runTransaction, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { readPlayDocument, validatePlayDocV3, type PlayDocV3 } from '../../football-core';

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

/** Fields an update may write. Never teamId, createdBy or provenance. */
function editable(d: PlayDocV3) {
  const { teamId: _teamId, createdBy: _createdBy, provenance: _provenance, ...rest } = d;
  void _teamId;
  void _createdBy;
  void _provenance;
  return rest;
}

export type SaveTarget = { id: string; expectedRevision: number } | { id?: undefined };

/** Saves a v3 play. Resolves to `{ id, revision }` of what was written. */
export async function savePlayDocV3(play: PlayDocV3, uid: string, target: SaveTarget = {}): Promise<{ id: string; revision: number }> {
  const problems = validatePlayDocV3(play);
  if (problems.length) throw new Error(`Refusing to save a malformed play: ${problems.join(' ')}`);

  if (!target.id) {
    const created: PlayDocV3 = { ...structuredClone(play), revision: 1, createdBy: uid };
    const ref = await addDoc(collection(db, 'plays'), { ...created, updatedAt: new Date() });
    return { id: ref.id, revision: 1 };
  }

  const ref = doc(db, 'plays', target.id);
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw conflict(null);
    const stored = snap.data() as { schemaVersion?: unknown; revision?: unknown };
    if (stored.schemaVersion !== 3) {
      throw new Error('Refusing to overwrite a non-v3 play; save it as a new v3 play instead.');
    }
    const storedRevision = typeof stored.revision === 'number' ? stored.revision : null;
    if (storedRevision !== target.expectedRevision) throw conflict(storedRevision);
    const revision = target.expectedRevision + 1;
    tx.update(ref, { ...editable(play), revision, updatedAt: new Date() });
    return { id: target.id, revision };
  });
}

/** Differentiates actual stored v3 from a v2 document migrated in memory.
 * A migrated v2 document MUST be saved as a NEW v3 document; never update its original ID. */
export type ListedPlayDocV3 = PlayDocV3 & { id: string; sourceSchemaVersion: 2 | 3 };

/** Loads compatible plays, marking the source schema version so UI writes cannot overwrite legacy v2. */
export async function loadPlayDocsV3(teamId: string): Promise<{ plays: ListedPlayDocV3[]; skipped: number }> {
  if (!teamId) throw new Error('Select a team to open its playbook.');
  const snap = await getDocs(query(collection(db, 'plays'), where('teamId', '==', teamId)));
  const plays: ListedPlayDocV3[] = [];
  let skipped = 0;
  for (const d of snap.docs) {
    const raw: unknown = d.data();
    const r = readPlayDocument(raw, d.id);
    if (r.status === 'ok') {
      const version = typeof raw === 'object' && raw !== null && 'schemaVersion' in raw
        ? (raw as { schemaVersion: unknown }).schemaVersion : null;
      if (version === 2 || version === 3) {
        plays.push({ ...r.value, id: d.id, sourceSchemaVersion: version });
      } else {
        skipped++;
      }
    } else {
      skipped++;
    }
  }
  return { plays, skipped };
}
