import { draftQueue, publishedLibrary } from '../library';
import type { Concept, Coverage, Front, Library, Matchup, Source, Verification } from '../types';

const src = (publisher: string): Source => ({
  title: publisher, publisher, url: `https://example.org/${publisher}`, accessed: '2026-10-30', kind: 'book',
});
const OK: Verification = { status: 'verified', sources: [src('A'), src('B')] };
const OK3: Verification = { status: 'verified', sources: [src('A'), src('B'), src('C')] };
const DRAFT: Verification = { status: 'draft', sources: [src('A')], note: 'only one source' };
const REJECTED: Verification = { status: 'rejected', reviewer: 'Owner', date: '2026-10-30', reason: 'not how it is taught' };
const APPROVED: Verification = { status: 'approved', reviewer: 'Owner', date: '2026-10-30', sources: [] };

const concept = (id: string, verification: Verification): Concept => ({ id, name: id, minLevel: 'youth', assignments: [], read: [], verification });
const cover3: Coverage = { id: 'cover-3', name: 'Cover 3', deepDefenders: 1, verification: OK };
const front: Front = { id: '43-over', name: '4-3 Over', verification: REJECTED };
const m = (c: string, verification: Verification): Matchup => ({ concept: c, beats: 'cover-3', stressedDefender: 'x', reason: 'r', verification });

const fixture: Library = {
  formations: [],
  fronts: [front],
  coverages: [cover3],
  concepts: [concept('verified', OK), concept('approved', APPROVED), concept('draft', DRAFT), concept('rejected', REJECTED)],
  matchups: [m('verified', OK3), m('draft', OK3)],
};

describe('publishedLibrary', () => {
  it('keeps verified and approved items and drops drafts and rejections', () => {
    const lib = publishedLibrary(fixture);
    expect(lib.concepts.map(c => c.id)).toEqual(['verified', 'approved']);
    expect(lib.fronts).toEqual([]);
    expect(lib.coverages.map(c => c.id)).toEqual(['cover-3']);
  });

  it('drops a verified matchup whose concept is still a draft', () => {
    expect(publishedLibrary(fixture).matchups.map(x => x.concept)).toEqual(['verified']);
  });
});

describe('draftQueue', () => {
  it('lists drafts for the owner to approve or reject, and never rejected items', () => {
    const q = draftQueue(fixture);
    expect(q).toEqual([{ kind: 'concept', id: 'draft', name: 'draft', verification: DRAFT }]);
  });

  it('names a draft matchup by its claim', () => {
    const q = draftQueue({ ...fixture, matchups: [m('verified', DRAFT)] });
    expect(q).toContainEqual({ kind: 'matchup', id: 'verified:cover-3', name: 'verified vs cover-3', verification: DRAFT });
  });
});
