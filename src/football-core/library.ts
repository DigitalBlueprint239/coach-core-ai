import { PASS_CONCEPTS } from './content/concepts.pass';
import { COVERAGES, FRONT_43_OVER } from './content/defense.43';
import { SPREAD_FORMATIONS } from './content/formations.spread';
import { MATCHUPS } from './content/matchups';
import { isPublishable } from './verification';
import type { Library, Verification } from './types';

export type DraftItem = {
  kind: 'formation' | 'concept' | 'front' | 'coverage' | 'matchup';
  id: string;
  name: string;
  verification: Extract<Verification, { status: 'draft' }>;
};

/** All content in the app, whatever its verification status. */
export function fullLibrary(): Library {
  return {
    formations: SPREAD_FORMATIONS,
    concepts: PASS_CONCEPTS,
    fronts: [FRONT_43_OVER],
    coverages: COVERAGES,
    matchups: MATCHUPS,
  };
}

/** What coaches may see: publishable items, and claims whose concept and coverage are themselves publishable. */
export function publishedLibrary(lib: Library = fullLibrary()): Library {
  const item = (v: Verification) => isPublishable(v, 'item');
  const concepts = lib.concepts.filter(c => item(c.verification));
  const coverages = lib.coverages.filter(c => item(c.verification));
  const conceptIds = new Set(concepts.map(c => c.id));
  const coverageIds = new Set<string>(coverages.map(c => c.id));
  return {
    formations: lib.formations.filter(f => item(f.verification)),
    concepts,
    fronts: lib.fronts.filter(f => item(f.verification)),
    coverages,
    matchups: lib.matchups.filter(
      m => isPublishable(m.verification, 'matchup') && conceptIds.has(m.concept) && coverageIds.has(m.beats),
    ),
  };
}

/** Items waiting for the owner to approve or reject. Rejected items appear nowhere. */
export function draftQueue(lib: Library = fullLibrary()): DraftItem[] {
  const queue: DraftItem[] = [];
  const add = (kind: DraftItem['kind'], id: string, name: string, v: Verification) => {
    if (v.status === 'draft') queue.push({ kind, id, name, verification: v });
  };
  lib.formations.forEach(f => add('formation', f.id, f.name, f.verification));
  lib.concepts.forEach(c => add('concept', c.id, c.name, c.verification));
  lib.fronts.forEach(f => add('front', f.id, f.name, f.verification));
  lib.coverages.forEach(c => add('coverage', c.id, c.name, c.verification));
  lib.matchups.forEach(m => add('matchup', `${m.concept}:${m.beats}`, `${m.concept} vs ${m.beats}`, m.verification));
  return queue;
}
