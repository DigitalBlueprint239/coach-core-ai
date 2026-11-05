// Research-stage Inside Zone selection for the existing v2 sheet editor.
// We persist only the coach's named draft, formation and side as v2 tags.
// We do NOT pretend v2 can store the v3 OL/ball-action assignments. Those remain
// a derived, read-only preview until the canonical v3 save workflow is wired.
import type { Formation, RunSide } from '../../../football-core';
import { newBlankPlay, type PlayV2 } from '../playModel';

export const INSIDE_ZONE_DRAFT_TAG = 'research:inside-zone@1';
const SIDE_PREFIX = 'run-side:';

export function insideZoneSide(tags: readonly string[]): RunSide | null {
  if (!tags.includes(INSIDE_ZONE_DRAFT_TAG)) return null;
  return tags.includes('run-side:weak') ? 'weak' : 'strong';
}

export function withInsideZoneSide(tags: readonly string[], side: RunSide): string[] {
  return [...tags.filter(tag => !tag.startsWith(SIDE_PREFIX)), `${SIDE_PREFIX}${side}`];
}

export function newInsideZoneDraft(teamId: string, formation: Formation): PlayV2 {
  const base = newBlankPlay(teamId, formation);
  return {
    ...base,
    name: 'Inside Zone (research draft)',
    tags: [INSIDE_ZONE_DRAFT_TAG, 'run-side:strong'],
    notes: 'Research-only coaching convention. OL assignments and ball actions shown in the preview are not yet stored as canonical v3 instructions.',
  };
}
