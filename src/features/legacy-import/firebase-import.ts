import { collection, query, where, getDocsFromServer, doc, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { ImportBackend, ImportSession, LegacyPlay, sameContent } from './import-legacy';
const check = (session: ImportSession) => {
  if (!auth.currentUser || auth.currentUser.isAnonymous || auth.currentUser.uid !== session.uid) throw new Error('Account changed.');
};
const payload = (p: LegacyPlay) => ({ name: p.name, phase: p.phase === 'special' ? 'special_teams' : p.phase,
  type: p.type, localId: p.id, players: p.players, routes: p.routes });
const iso = (date: any): string => (date.toDate ? date.toDate() : date).toISOString();
// ID flags preserve whether optional original timestamps existed, without adding rule fields.
const decode = (d: any, id: string): LegacyPlay => ({ id: d.localId, name: d.name,
  phase: d.phase === 'special_teams' ? 'special' : d.phase, type: d.type, players: d.players, routes: d.routes,
  ...(id.startsWith('legacy_v1_c') ? {createdAt:iso(d.createdAt)} : {}),
  ...(id.substring(11,12) === 'u' ? {updatedAt:iso(d.updatedAt)} : {}) });
export async function loadImportedPlays(session: ImportSession): Promise<LegacyPlay[]> {
  check(session);
  const results = await getDocsFromServer(query(collection(db, 'plays'), where('teamId', '==', session.teamId)));
  check(session);
  return results.docs.filter(d => d.data().createdBy === session.uid && d.id.startsWith('legacy_v1_') && typeof d.data().localId === 'string')
    .map(d => ({ ...decode(d.data(), d.id), id: d.id }));
}
export const firebaseImport: ImportBackend = {
  async copy(session, play) {
    check(session);
    const bytes = new TextEncoder().encode(JSON.stringify([session.uid, session.teamId, play]));
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(n => n.toString(16).padStart(2, '0')).join('');
    const id = `legacy_v1_${play.createdAt ? 'c' : 'n'}${play.updatedAt ? 'u' : 'n'}_${hash}`;
    await runTransaction(db, async tx => {
      check(session);
      const ref = doc(db, 'plays', id);
      const existing = await tx.get(ref);
      if (existing.exists()) {
        const d = existing.data();
        if (d.teamId !== session.teamId || d.createdBy !== session.uid || !sameContent(play, decode(d, id))) throw new Error('Imported copy changed elsewhere. Preserve and review; no overwrite.');
      } else {
        check(session);
        tx.set(ref, { ...payload(play), teamId: session.teamId, createdBy: session.uid, revision: 1,
          createdAt: play.createdAt ? new Date(play.createdAt) : serverTimestamp(), updatedAt: play.updatedAt ? new Date(play.updatedAt) : serverTimestamp() });
      }
    });
    return id;
  },
  async read(session, id) {
    check(session);
    const result = await getDocFromServer(doc(db, 'plays', id));
    if (!result.exists() || result.data().teamId !== session.teamId || result.data().createdBy !== session.uid) throw new Error('Copy could not be verified.');
    check(session);
    return decode(result.data(), id);
  },
};
