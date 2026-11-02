import { PASS_CONCEPTS } from './content/concepts.pass';
import { COVERAGES, FRONT_43_OVER } from './content/defense.43';
import { SPREAD_FORMATIONS } from './content/formations.spread';
import { MATCHUPS } from './content/matchups';
import decisionsFile from './content/decisions.json';
import { isPublishable } from './verification';
import type { Library, Verification } from './types';

export type DraftItem = {
  kind: 'formation' | 'concept' | 'front' | 'coverage' | 'matchup';
  id: string;
  name: string;
  verification: Extract<Verification, { status: 'draft' }>;
};

/**
 * The owner's approve/reject decision on one draft (spec §6). Decisions live in content/decisions.json and are
 * committed through a reviewed PR, so publishing content is a code change, never a database write.
 */
export type ContentDecision = {
  kind: DraftItem['kind'];
  /** The item id; for a matchup, `${concept}:${coverage}` as in draftQueue(). */
  id: string;
  decision: 'approve' | 'reject';
  reviewer: string;
  /** YYYY-MM-DD */
  date: string;
  reason?: string;
};

const KINDS: ReadonlySet<string> = new Set(['formation', 'concept', 'front', 'coverage', 'matchup']);

function isDecision(v: unknown): v is ContentDecision {
  if (typeof v !== 'object' || v === null) return false;
  const d = v as Record<string, unknown>;
  return (
    typeof d.kind === 'string' && KINDS.has(d.kind) && typeof d.id === 'string' &&
    (d.decision === 'approve' || d.decision === 'reject') &&
    typeof d.reviewer === 'string' && d.reviewer.trim() !== '' && typeof d.date === 'string' && d.date.trim() !== '' &&
    (d.reason === undefined || typeof d.reason === 'string')
  );
}

/** The decisions committed in content/decisions.json (malformed entries are ignored). */
export function committedDecisions(): ContentDecision[] {
  const list: unknown = (decisionsFile as { decisions?: unknown }).decisions;
  return Array.isArray(list) ? list.filter(isDecision) : [];
}

/**
 * Applies owner decisions to drafts only: approve → approved (sources kept), reject → rejected (with the reason).
 * Decisions for unknown ids or for items that are not drafts are ignored. Returns a new library.
 */
export function applyDecisions(lib: Library, decisions: ContentDecision[]): Library {
  if (!decisions.length) return lib;
  const byKey = new Map<string, ContentDecision>();
  for (const d of decisions) byKey.set(`${d.kind}|${d.id}`, d); // the latest decision for an item wins
  const decide = (kind: DraftItem['kind'], id: string, v: Verification): Verification => {
    const d = byKey.get(`${kind}|${id}`);
    if (!d || v.status !== 'draft') return v;
    return d.decision === 'approve'
      ? { status: 'approved', reviewer: d.reviewer, date: d.date, sources: v.sources }
      : { status: 'rejected', reviewer: d.reviewer, date: d.date, reason: d.reason?.trim() || 'Rejected by the reviewer.' };
  };
  return {
    formations: lib.formations.map(f => ({ ...f, verification: decide('formation', f.id, f.verification) })),
    concepts: lib.concepts.map(c => ({ ...c, verification: decide('concept', c.id, c.verification) })),
    fronts: lib.fronts.map(f => ({ ...f, verification: decide('front', f.id, f.verification) })),
    coverages: lib.coverages.map(c => ({ ...c, verification: decide('coverage', c.id, c.verification) })),
    matchups: lib.matchups.map(m => ({ ...m, verification: decide('matchup', `${m.concept}:${m.beats}`, m.verification) })),
  };
}

/** All content in the app, whatever its verification status, with the owner's committed decisions applied. */
export function fullLibrary(): Library {
  return applyDecisions(
    {
      formations: SPREAD_FORMATIONS,
      concepts: PASS_CONCEPTS,
      fronts: [FRONT_43_OVER],
      coverages: COVERAGES,
      matchups: MATCHUPS,
    },
    committedDecisions(),
  );
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
