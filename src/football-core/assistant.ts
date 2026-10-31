import { isPublishable } from './verification';
import { LEVEL_ORDER } from './types';
import type { Concept, CoverageId, Level, Library, ReadStep } from './types';

export type OpponentProfile = { coverages: Array<{ id: string; share: number }> };

export type Recommendation = {
  concept: Concept;
  score: number;
  beats: CoverageId;
  reason: string;
  stressedDefender: string;
  read: ReadStep[];
  inPlaybook: boolean;
};

/**
 * "What beats this defense?" — deterministic and limited to publishable content. Score is the share of
 * the opponent's coverages a concept beats; ties go to the coach's own plays, then alphabetical.
 */
export function recommend(
  opp: OpponentProfile,
  opts: { level: Level; playbook?: string[]; limit?: number },
  lib: Library,
): Recommendation[] {
  const coverages = new Set(lib.coverages.filter(c => isPublishable(c.verification, 'item')).map(c => c.id as string));
  const usable = opp.coverages.filter(c => coverages.has(c.id) && c.share > 0);
  const total = usable.reduce((sum, c) => sum + c.share, 0);
  if (total <= 0) return [];
  const share = new Map<string, number>();
  for (const c of usable) share.set(c.id, (share.get(c.id) ?? 0) + c.share / total);

  const levelIndex = LEVEL_ORDER.indexOf(opts.level);
  const playbook = new Set(opts.playbook ?? []);
  const results: Recommendation[] = [];

  for (const concept of lib.concepts) {
    if (!isPublishable(concept.verification, 'item')) continue;
    if (LEVEL_ORDER.indexOf(concept.minLevel) > levelIndex) continue;
    const beaten = lib.matchups.filter(
      m => m.concept === concept.id && share.has(m.beats) && isPublishable(m.verification, 'matchup'),
    );
    if (!beaten.length) continue;
    const score = beaten.reduce((sum, m) => sum + (share.get(m.beats) ?? 0), 0);
    const top = beaten.reduce((a, b) => ((share.get(b.beats) ?? 0) > (share.get(a.beats) ?? 0) ? b : a));
    results.push({
      concept,
      score,
      beats: top.beats,
      reason: top.reason,
      stressedDefender: top.stressedDefender,
      read: concept.read,
      inPlaybook: playbook.has(concept.id),
    });
  }

  return results
    .sort((a, b) => b.score - a.score || Number(b.inPlaybook) - Number(a.inPlaybook) || a.concept.name.localeCompare(b.concept.name))
    .slice(0, opts.limit ?? 3);
}
