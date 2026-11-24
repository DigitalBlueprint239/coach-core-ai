// Three-way merge of a team's playbook settings, so two devices saving at once do not erase each other's work.
// `base` is what this device loaded, `mine` is what the coach wants now, `stored` is what is in the database.
// Only what the coach changed (base -> mine) is applied to `stored`. Pure; no Firestore here.
import type { Formation } from '../../football-core';
import type { TeamPlaybookSettings } from './playModel';

export type SettingsMerge = { merged: TeamPlaybookSettings; conflicts: string[] };

/** Equality that ignores object key order (Firestore does not preserve it). */
const key = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    typeof x === 'object' && x !== null && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1)))
      : x);
const same = (a: unknown, b: unknown) => key(a ?? null) === key(b ?? null);

export function mergeTeamSettings(base: TeamPlaybookSettings, mine: TeamPlaybookSettings, stored: TeamPlaybookSettings): SettingsMerge {
  const conflicts: string[] = [];

  const terminology: Record<string, string> = {};
  for (const [term, value] of Object.entries(stored.terminology)) if (typeof value === 'string') terminology[term] = value;
  const from = base.terminology as Record<string, string | undefined>;
  const to = mine.terminology as Record<string, string | undefined>;
  for (const term of new Set([...Object.keys(from), ...Object.keys(to)])) {
    if (from[term] === to[term]) continue;
    const value = to[term];
    if (value === undefined) delete terminology[term];
    else terminology[term] = value;
  }

  const byId = (list: Formation[]) => new Map(list.map(f => [f.id, f]));
  const before = byId(base.formations);
  const wanted = byId(mine.formations);
  const result = byId(stored.formations);
  for (const id of new Set([...before.keys(), ...wanted.keys()])) {
    const was = before.get(id);
    const now = wanted.get(id);
    if (same(was, now)) continue;
    const current = result.get(id);
    // Someone else changed the same formation to something different: overwriting it would lose their work.
    if (!same(current, was) && !same(current, now)) {
      conflicts.push(now?.name ?? was?.name ?? id);
      continue;
    }
    if (now) result.set(id, now);
    else result.delete(id);
  }

  return {
    merged: { terminology, level: base.level === mine.level ? stored.level : mine.level, formations: [...result.values()] },
    conflicts,
  };
}
