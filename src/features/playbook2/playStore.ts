// Firestore reads and writes for version-2 plays and team playbook settings. Uses only what the existing
// firestore.rules already allow (tested in rules-tests): the team owner reads/writes `plays` of their team and
// updates their team document. Updates never send teamId or createdBy (the rules deny changing them).
import { addDoc, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { LEVEL_ORDER, type Level } from '../../football-core';
import { DEFAULT_SETTINGS, isPlayV2, type PlayV2, type TeamPlaybookSettings } from './playModel';

export type StoreError = { kind: 'signed-out' | 'no-team' | 'permission' | 'network'; message: string };

type Action = 'load' | 'save' | 'settings';

const MESSAGES: Record<StoreError['kind'], Record<Action, string>> = {
  'signed-out': {
    load: 'Sign in to see your playbook.',
    save: "Couldn't save: sign in first.",
    settings: "Couldn't save: sign in first.",
  },
  'no-team': {
    load: 'Pick a team to see its playbook.',
    save: "Couldn't save: pick a team first.",
    settings: "Couldn't save: pick a team first.",
  },
  permission: {
    load: "Couldn't load: only the team's coach can see its plays.",
    save: "Couldn't save: only the team's coach can edit plays.",
    settings: "Couldn't save: only the team's coach can change the playbook settings.",
  },
  network: {
    load: "Couldn't load: check your connection and try again.",
    save: "Couldn't save: check your connection and try again. Your changes are still here.",
    settings: "Couldn't save: check your connection and try again. Your changes are still here.",
  },
};

const storeError = (kind: StoreError['kind'], action: Action): StoreError => ({ kind, message: MESSAGES[kind][action] });

export function isStoreError(e: unknown): e is StoreError {
  return typeof e === 'object' && e !== null && 'kind' in e && 'message' in e && typeof (e as StoreError).message === 'string';
}

function toStoreError(e: unknown, action: Action): StoreError {
  if (isStoreError(e)) return e;
  const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
  if (code === 'permission-denied') return storeError('permission', action);
  if (code === 'unauthenticated') return storeError('signed-out', action);
  return storeError('network', action);
}

async function guarded<T>(action: Action, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    throw toStoreError(e, action);
  }
}

const toDate = (v: unknown): Date | undefined => {
  if (v instanceof Date) return v;
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: unknown }).toDate === 'function') {
    return (v as { toDate(): Date }).toDate();
  }
  return undefined;
};

/** Firestore rejects `undefined`; library data is plain JSON, so a JSON round trip is a safe deep copy. */
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** The fields a coach edits. Never teamId, createdBy or createdAt. */
function editableFields(play: PlayV2): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    schemaVersion: 2,
    coordinateProfile: 'cc-yards-v1',
    name: play.name,
    formation: plain(play.formation),
    assignments: plain(play.assignments),
    read: plain(play.read),
    level: play.level,
    tags: [...play.tags],
    notes: play.notes,
  };
  if (play.conceptId !== undefined) fields.conceptId = play.conceptId;
  if (play.fromLibrary !== undefined) fields.fromLibrary = { ...play.fromLibrary };
  return fields;
}

export async function listPlaysV2(teamId: string): Promise<PlayV2[]> {
  if (!teamId) throw storeError('no-team', 'load');
  return guarded('load', async () => {
    const snap = await getDocs(query(collection(db, 'plays'), where('teamId', '==', teamId)));
    const plays: PlayV2[] = [];
    for (const d of snap.docs) {
      const data: unknown = d.data();
      if (!isPlayV2(data)) continue;
      const raw = data as PlayV2 & { createdAt?: unknown; updatedAt?: unknown };
      plays.push({ ...raw, id: d.id, createdAt: toDate(raw.createdAt), updatedAt: toDate(raw.updatedAt) });
    }
    return plays.sort((a, b) => a.name.localeCompare(b.name));
  });
}

/** Adds a new play (as `uid`) or updates an existing one by id. Resolves to the play's id. */
export async function savePlayV2(play: PlayV2, uid: string): Promise<string> {
  if (!uid) throw storeError('signed-out', 'save');
  if (!play.teamId) throw storeError('no-team', 'save');
  return guarded('save', async () => {
    const now = new Date();
    if (play.id) {
      await updateDoc(doc(db, 'plays', play.id), { ...editableFields(play), updatedAt: now });
      return play.id;
    }
    const ref = await addDoc(collection(db, 'plays'), {
      ...editableFields(play),
      teamId: play.teamId,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  });
}

const isLevel = (v: unknown): v is Level => typeof v === 'string' && (LEVEL_ORDER as readonly string[]).includes(v);

export async function loadTeamSettings(teamId: string): Promise<TeamPlaybookSettings> {
  if (!teamId) throw storeError('no-team', 'load');
  return guarded('load', async () => {
    const snap = await getDoc(doc(db, 'teams', teamId));
    const stored: unknown = snap.exists() ? (snap.data() as Record<string, unknown> | undefined)?.playbook : undefined;
    if (typeof stored !== 'object' || stored === null) return plain(DEFAULT_SETTINGS);
    const s = stored as Partial<TeamPlaybookSettings>;
    const terminology: Record<string, string> = {};
    if (typeof s.terminology === 'object' && s.terminology !== null) {
      for (const [k, v] of Object.entries(s.terminology)) if (typeof v === 'string' && v.trim()) terminology[k] = v;
    }
    return {
      terminology,
      level: isLevel(s.level) ? s.level : DEFAULT_SETTINGS.level,
      formations: Array.isArray(s.formations) ? s.formations : [],
    };
  });
}

export async function saveTeamSettings(teamId: string, s: TeamPlaybookSettings): Promise<void> {
  if (!teamId) throw storeError('no-team', 'settings');
  return guarded('settings', async () => {
    await updateDoc(doc(db, 'teams', teamId), { playbook: plain(s) });
  });
}
