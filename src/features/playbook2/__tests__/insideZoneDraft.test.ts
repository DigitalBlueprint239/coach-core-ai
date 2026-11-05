import { describe, expect, it } from 'vitest';
import { fullLibrary } from '../../../football-core';
import { INSIDE_ZONE_DRAFT_TAG, insideZoneSide, newInsideZoneDraft, withInsideZoneSide } from '../run/insideZoneDraft';

const formation = fullLibrary().formations[0];

describe('Inside Zone research draft metadata', () => {
  it('creates a private editable v2 draft without fabricating a pass concept or v3 instructions', () => {
    const play = newInsideZoneDraft('t1', formation);
    expect(play.teamId).toBe('t1');
    expect(play.schemaVersion).toBe(2);
    expect(play.conceptId).toBeUndefined();
    expect(play.assignments).toEqual([]);
    expect(play.tags).toContain(INSIDE_ZONE_DRAFT_TAG);
    expect(insideZoneSide(play.tags)).toBe('strong');
  });
  it('remembers direction without destroying unrelated coach tags', () => {
    const tags = withInsideZoneSide([INSIDE_ZONE_DRAFT_TAG, 'coach:favorite', 'run-side:strong'], 'weak');
    expect(insideZoneSide(tags)).toBe('weak');
    expect(tags).toContain('coach:favorite');
    expect(tags).not.toContain('run-side:strong');
  });
  it('never treats an ordinary passing play as an Inside Zone draft', () => {
    expect(insideZoneSide(['run-side:weak'])).toBeNull();
    expect(insideZoneSide([])).toBeNull();
  });
});
