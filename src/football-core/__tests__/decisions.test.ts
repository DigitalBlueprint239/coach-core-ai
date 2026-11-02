import { describe, expect, it } from 'vitest';
import { applyDecisions, committedDecisions, draftQueue, fullLibrary, publishedLibrary, type ContentDecision } from '../library';
import { recommend } from '../assistant';

const raw = () => applyDecisions(fullLibrary(), []);
const approve = (kind: ContentDecision['kind'], id: string): ContentDecision => ({
  kind, id, decision: 'approve', reviewer: 'Owner', date: '2026-11-01',
});

describe('applyDecisions', () => {
  it('an approve decision publishes a draft and keeps its sources', () => {
    const before = raw().concepts.find(c => c.id === 'flood')!;
    expect(publishedLibrary(raw()).concepts.some(c => c.id === 'flood')).toBe(false);
    const lib = applyDecisions(raw(), [approve('concept', 'flood')]);
    const flood = lib.concepts.find(c => c.id === 'flood')!;
    expect(flood.verification).toEqual({
      status: 'approved',
      reviewer: 'Owner',
      date: '2026-11-01',
      sources: before.verification.status === 'draft' ? before.verification.sources : [],
    });
    expect(publishedLibrary(lib).concepts.some(c => c.id === 'flood')).toBe(true);
    expect(draftQueue(lib).some(d => d.id === 'flood')).toBe(false);
  });

  it('an approved matchup reaches the assistant only with its concept and coverage published', () => {
    const lib = applyDecisions(raw(), [approve('concept', 'flood'), approve('matchup', 'flood:cover-3')]);
    const recs = recommend({ coverages: [{ id: 'cover-3', share: 1 }] }, { level: 'varsity' }, publishedLibrary(lib));
    expect(recs.map(r => r.concept.id)).toContain('flood');
  });

  it('a reject decision removes it from the queue and from coaches', () => {
    const lib = applyDecisions(raw(), [
      { kind: 'formation', id: 'empty', decision: 'reject', reviewer: 'Owner', date: '2026-11-01', reason: 'Not how we align it' },
    ]);
    expect(lib.formations.find(f => f.id === 'empty')!.verification).toEqual({
      status: 'rejected', reviewer: 'Owner', date: '2026-11-01', reason: 'Not how we align it',
    });
    expect(draftQueue(lib).some(d => d.id === 'empty')).toBe(false);
    expect(publishedLibrary(lib).formations.some(f => f.id === 'empty')).toBe(false);
  });

  it('decisions for unknown or already-verified items are ignored', () => {
    const base = raw();
    const lib = applyDecisions(base, [
      approve('concept', 'no-such-play'),
      { kind: 'concept', id: 'smash', decision: 'reject', reviewer: 'Owner', date: '2026-11-01', reason: 'x' },
      approve('formation', 'smash'),
    ]);
    expect(lib).toEqual(base);
  });

  it('does not change the library it was given', () => {
    const base = raw();
    const snapshot = JSON.stringify(base);
    applyDecisions(base, [approve('concept', 'flood')]);
    expect(JSON.stringify(base)).toBe(snapshot);
  });

  it('fullLibrary applies the committed decisions file', () => {
    expect(Array.isArray(committedDecisions())).toBe(true);
    expect(fullLibrary()).toEqual(applyDecisions(fullLibrary(), committedDecisions()));
  });
});
