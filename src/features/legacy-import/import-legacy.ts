export const D10_APPROVED = true; // Coach Drew, 2026-10-13: implementation/testing only.
export const LEGACY_KEY = 'smartPlaybook_plays';
export const decisionKey = (uid: string) => `coachcore:v1:${uid}:legacyImportDecision`;
export const CLAIM_KEY = 'coachcore:v1:legacyImportClaim';
export const pendingKey = (uid: string) => `coachcore:v1:${uid}:legacyImportPending`;
export function importNotice(storage: Storage, session: ImportSession): string {
  const claim = storage.getItem(CLAIM_KEY);
  if (claim) {
    const value = JSON.parse(claim);
    if (value.uid !== session.uid) return 'Plays on this device were already imported by another account.';
  }
  const pending = storage.getItem(pendingKey(session.uid));
  if (pending) {
    const value = JSON.parse(pending);
    if (value.teamId !== session.teamId) return `An import into ${value.teamName || value.teamId} was started and not finished. Switch to ${value.teamName || value.teamId} to finish it.`;
  }
  return '';
}
export interface LegacyPlay {
  id: string; name: string; phase: string; type: string;
  createdAt?: string; updatedAt?: string;
  players: Array<{id:string; x:number; y:number; position:string; number:number; [key:string]:unknown}>;
  routes: Array<{id:string; playerId:string; points:Array<{x:number;y:number}>; type:string; color?:string; [key:string]:unknown}>;
}
export interface ImportSession { uid: string; teamId: string; teamName?: string }
export interface ImportBackend {
  copy: (session: ImportSession, play: LegacyPlay) => Promise<string>;
  read: (session: ImportSession, id: string) => Promise<LegacyPlay>;
}
// Parse the complete batch before any write. No partial normalization/truncation.
export function readLegacy(storage: Storage): LegacyPlay[] {
  const raw = storage.getItem(LEGACY_KEY);
  if (!raw) return [];
  const plays: unknown = JSON.parse(raw);
  if (!Array.isArray(plays) || plays.length > 500) throw new Error('Invalid legacy library. Originals are preserved.');
  const ids = new Set<string>();
  for (const p of plays) {
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !p.id || p.id.length > 64 || ids.has(p.id)
      || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 120
      || !['offense', 'defense', 'special'].includes(p.phase)
      || typeof p.type !== 'string' || p.type.length > 40
      || !Array.isArray(p.players) || p.players.length > 30 || !Array.isArray(p.routes) || p.routes.length > 60
      || Object.keys(p).some(k => !['id','name','phase','type','players','routes','createdAt','updatedAt'].includes(k))) {
      throw new Error('Unsupported legacy play. Originals are preserved; export/review before importing.');
    }
    ids.add(p.id);
    for (const key of ['createdAt','updatedAt']) {
      if (key in p && (typeof p[key] !== 'string' || !Number.isFinite(Date.parse(p[key])) || new Date(p[key]).toISOString() !== p[key])) throw new Error('Unsupported legacy timestamp. Originals preserved.');
    }
    for (const player of p.players) {
      if (!player || typeof player.id !== 'string' || typeof player.position !== 'string'
        || !Number.isFinite(player.x) || !Number.isFinite(player.y) || !Number.isFinite(player.number)) throw new Error('Invalid player.');
    }
    for (const route of p.routes) {
      if (!route || typeof route.id !== 'string' || !p.players.some((player: any) => player.id === route.playerId)
        || typeof route.type !== 'string' || !Array.isArray(route.points)
        || route.points.some((point: any) => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y))) throw new Error('Invalid route.');
    }
  }
  return plays as LegacyPlay[];
}
export const sameContent = (a: unknown, b: unknown): boolean => {
  const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
};
export function declineImport(storage: Storage, session: ImportSession) {
  storage.setItem(decisionKey(session.uid), JSON.stringify({ decision: 'declined' }));
}
export async function importLegacy(storage: Storage, session: ImportSession, stillCurrent: () => boolean, backend: ImportBackend) {
  if (!D10_APPROVED || !stillCurrent()) throw new Error('Account or team changed.');
  const notice = importNotice(storage, session);
  if (notice) throw new Error(notice);
  if (storage.getItem(decisionKey(session.uid))) return [];
  const plays = readLegacy(storage);
  if (!storage.getItem(pendingKey(session.uid))) storage.setItem(pendingKey(session.uid), JSON.stringify({teamId:session.teamId,teamName:session.teamName || session.teamId,startedAt:new Date().toISOString()}));
  const verified: string[] = [];
  for (const play of plays) {
    if (!stillCurrent()) throw new Error('Account or team changed. Reopen under the original account to resume.');
    const id = await backend.copy(session, play);
    if (!stillCurrent()) throw new Error('Account or team changed.');
    const saved = await backend.read(session, id);
    if (!stillCurrent()) throw new Error('Account or team changed.');
    if (!sameContent(play, saved)) throw new Error('Saved copy does not match. Originals preserved; retry or review.');
    verified.push(id);
  }
  if (!stillCurrent()) throw new Error('Account or team changed.');
  storage.setItem(CLAIM_KEY, JSON.stringify({uid:session.uid,teamId:session.teamId,ids:verified,at:new Date().toISOString()}));
  storage.setItem(decisionKey(session.uid), JSON.stringify({ decision: 'imported', teamId: session.teamId, ids: verified }));
  storage.removeItem(pendingKey(session.uid));
  return verified;
}
