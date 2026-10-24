// Team-scoped persistence for coach-film-annotation.v1. Mirrors the shared gateway's guarantees
// (team ownership checked inside the transaction, revision conflicts, server readback before "saved")
// without changing src/features/persistence.
import { collection, doc, getDocFromServer, getDocsFromServer, runTransaction, serverTimestamp, type DocumentData } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { ANNOTATION_SCHEMA, AnnotationFields, AnnotationRecord, parseAnnotationDoc, sameFields, sameSource, validateFields } from './annotation';

export interface TeamScope { uid: string; teamId: string }
export class AnnotationConflict extends Error {
  constructor(public remote: AnnotationRecord | null) { super(remote ? 'This mark was changed elsewhere. Your edits are kept.' : 'This mark was deleted elsewhere. Your edits are kept.'); }
}
export class AccessError extends Error {}
export class AnnotationValidationSourceError extends Error { constructor() { super('A saved mark cannot be moved to a different sample.'); } }
export interface ListResult { records: AnnotationRecord[]; invalid: { id: string; reason: string }[] }

const ref = (s: TeamScope, id: string) => doc(db, 'teams', s.teamId, 'filmAnnotations', id);
const check = (s: TeamScope) => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous || user.uid !== s.uid) throw new AccessError('Account changed or signed out. Nothing was saved.');
};
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);

async function owned(s: TeamScope) {
  check(s);
  const team = await getDocFromServer(doc(db, 'teams', s.teamId));
  check(s);
  if (!team.exists() || team.data().ownerId !== s.uid) throw new AccessError('Team access denied.');
}

export async function listAnnotations(s: TeamScope): Promise<ListResult> {
  await owned(s);
  const snap = await getDocsFromServer(collection(db, 'teams', s.teamId, 'filmAnnotations'));
  check(s);
  const records: AnnotationRecord[] = []; const invalid: ListResult['invalid'] = [];
  for (const d of snap.docs) {
    try {
      const r = parseAnnotationDoc(d.id, d.data());
      if (r.teamId === s.teamId && r.createdBy === s.uid) records.push(r); else invalid.push({ id: d.id, reason: 'Ownership does not match this team.' });
    } catch (e) { invalid.push({ id: d.id, reason: e instanceof Error ? e.message : 'Invalid record.' }); }
  }
  records.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return { records, invalid };
}

const body = (s: TeamScope, f: AnnotationFields): DocumentData => ({
  schemaVersion: ANNOTATION_SCHEMA, teamId: s.teamId, createdBy: s.uid,
  source: { kind: f.source.kind, sampleId: f.source.sampleId, durationMs: f.source.durationMs, sha256: [...f.source.sha256] },
  startMs: f.startMs, endMs: f.endMs, label: f.label, tags: [...f.tags], notes: f.notes,
});

/**
 * Creates (id null, expected 0) or updates (expected = last confirmed revision) one annotation.
 * Resolves only after the server copy is read back and equals what was sent.
 */
export async function saveAnnotation(s: TeamScope, id: string | null, expected: number, fields: AnnotationFields): Promise<AnnotationRecord> {
  const f = validateFields(fields);
  check(s);
  const targetId = id ?? newId();
  await runTransaction(db, async tx => {
    check(s);
    const team = await tx.get(doc(db, 'teams', s.teamId));
    if (!team.exists() || team.data().ownerId !== s.uid) throw new AccessError('Team access denied.');
    const current = await tx.get(ref(s, targetId));
    if (expected === 0) {
      if (current.exists()) throw new AnnotationConflict(parseAnnotationDoc(current.id, current.data()));
      tx.set(ref(s, targetId), { ...body(s, f), revision: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return;
    }
    if (!current.exists()) throw new AnnotationConflict(null);
    const remote = parseAnnotationDoc(current.id, current.data());
    if (remote.teamId !== s.teamId || remote.createdBy !== s.uid) throw new AccessError('This mark belongs to another account or team.');
    if (remote.revision === expected + 1 && sameFields(remote, f)) return; // acknowledgement lost after a successful commit
    if (remote.revision !== expected) throw new AnnotationConflict(remote);
    if (!sameSource(remote.source, f.source)) throw new AnnotationValidationSourceError();
    tx.set(ref(s, targetId), { ...body(s, f), revision: expected + 1, createdAt: current.data().createdAt, updatedAt: serverTimestamp() });
  });
  check(s);
  const ack = await getDocFromServer(ref(s, targetId));
  check(s);
  if (!ack.exists()) throw new Error('Save could not be confirmed. Your edits are kept.');
  const record = parseAnnotationDoc(ack.id, ack.data());
  if (!sameFields(record, f) || record.revision !== expected + 1) throw new AnnotationConflict(record);
  return record;
}


/** Deletes only if the stored revision still matches; confirms absence on the server. */
export async function deleteAnnotation(s: TeamScope, id: string, expected: number): Promise<void> {
  check(s);
  await runTransaction(db, async tx => {
    check(s);
    const current = await tx.get(ref(s, id));
    if (!current.exists()) return;
    const remote = parseAnnotationDoc(current.id, current.data());
    if (remote.revision !== expected) throw new AnnotationConflict(remote);
    tx.delete(ref(s, id));
  });
  check(s);
  const after = await getDocFromServer(ref(s, id));
  if (after.exists()) throw new Error('Delete could not be confirmed.');
}
