import { describe, expect, it } from 'vitest';
import { fullLibrary } from '../../../football-core';
import { newBlankPlay, type PlayV2 } from '../playModel';
import { INSIDE_ZONE_DRAFT_TAG } from '../run/insideZoneDraft';
import { makeCanonicalDraft, projectV3ForField } from '../canonical/canonicalProjection';

const formation = fullLibrary().formations[0];
const newPlay = (): PlayV2 => newBlankPlay('team-a', formation);

describe('v2 to canonical v3 draft', () => {
  it('creates a draft v3 document from a new play without source claims', () => {
    const v3 = makeCanonicalDraft(newPlay());
    expect(v3).toMatchObject({ schemaVersion: 3, teamId: 'team-a', revision: 1, status: 'draft', provenance: { origin: 'created' } });
    expect(v3.assignments).toEqual([]);
    expect(Object.prototype.hasOwnProperty.call(v3, 'concept')).toBe(false);
  });
  it('retains the exact v2 source document ID and never mutates the original', () => {
    const source = { ...newPlay(), id: 'legacy-42', name: 'Old play' };
    const original = structuredClone(source);
    const v3 = makeCanonicalDraft(source);
    expect(v3.provenance).toEqual({ origin: 'migrated', fromSchemaVersion: 2, sourceId: 'legacy-42' });
    expect(source).toEqual(original);
    expect(v3.formation).not.toBe(source.formation);
  });
  it('recognizes tagged Inside Zone as a RUN without inventing player assignments', () => {
    const source = { ...newPlay(), tags: [INSIDE_ZONE_DRAFT_TAG, 'run-side:weak'] };
    const v3 = makeCanonicalDraft(source);
    expect(v3.concept).toEqual({ id: 'inside-zone', family: 'run' });
    expect(v3.assignments).toEqual([]);
    expect(v3.tags).toContain('run-side:weak');
  });
  it('projects only displayable v3 assignments while preserving exact stored typed assignments', () => {
    const v3 = makeCanonicalDraft(newPlay());
    v3.assignments = [
      { kind: 'run-track', slot: 'back', track: { aimingPoint: 'A-gap', side: 'strong' } },
      { kind: 'block', slot: 'LT', rule: 'zone-playside' },
      { kind: 'protect', slot: 'back', rule: 'unspecified' },
    ];
    const original = structuredClone(v3);
    const result = projectV3ForField(v3);
    expect(result.undisplayedAssignments).toBe(2);
    expect(result.play.assignments).toEqual([{ slot: 'back', kind: 'protect' }]);
    expect(v3).toEqual(original);
    expect(result.play.schemaVersion).toBe(2);
  });
});
