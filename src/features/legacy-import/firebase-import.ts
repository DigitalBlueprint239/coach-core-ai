import { collection, query, where, getDocsFromServer, doc, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { ImportBackend, ImportSession, LegacyPlay, sameContent } from './import-legacy';
const check = (session: ImportSession) => {
  if (!auth.currentUser || auth.currentUser.isAnonymous || auth.currentUser.uid !== session.uid) throw new Error('Account changed.');
};
const payload = (p: LegacyPlay) => ({ name: p.name, phase: p.phase === 'special' ? 'special_teams' : p.phase,
  type: p.type, localId: p.id, players: p.players, routes: p.routes });
const decode = (d: any): LegacyPlay => ({ id: d.localId, name: d.name,
  phase: d.phase === 'special_teams' ? 'special' : d.phase, type: d.type, players: d.players, routes: d.routes });
export async function loadImportedPlays(session: ImportSession): Promise<LegacyPlay[]> {
  check(session);
  const results = await getDocsFromServer(query(collection(db, 'plays'), where('teamId', '==', session.teamId)));
  check(session);
  return results.docs.filter(d => d.data().createdBy === session.uid && typeof d.data().localId === 'string')
    .map(d => ({ ...decode(d.data()), id: d.id }));
}
export const firebaseImport: ImportBackend = {
  async copy(session, play) {
    check(session);
    const bytes = new TextEncoder().encode(JSON.stringify([session.uid, session.teamId, play]));
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(n => n.toString(16).padStart(2, '0')).join('');
    const id = `legacy_${hash}`;
    await runTransaction(db, async tx => {
      check(session);
      const ref = doc(db, 'plays', id);
      const existing = await tx.get(ref);
      if (existing.exists()) {
        const d = existing.data();
        if (d.teamId !== session.teamId || d.createdBy !== session.uid || !sameContent(play, decode(d))) throw new Error('Imported copy changed elsewhere. Preserve and review; no overwrite.');
      } else {
        check(session);
        tx.set(ref, { ...payload(play), teamId: session.teamId, createdBy: session.uid, revision: 1,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
    });
    return id;
  },
  async read(session, id) {
    check(session);
    const result = await getDocFromServer(doc(db, 'plays', id));
    if (!result.exists() || result.data().teamId !== session.teamId || result.data().createdBy !== session.uid) throw new Error('Copy could not be verified.');
    check(session);
    return decode(result.data());
  },
};
