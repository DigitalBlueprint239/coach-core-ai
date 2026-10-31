import { recommend } from '../assistant';
import { MATCHUPS } from '../content/matchups';
import type { Concept, Coverage, CoverageId, Library, Matchup, Source, Verification } from '../types';

const src = (publisher: string): Source => ({
  title: `${publisher} clinic`, publisher, url: `https://example.org/${publisher}`, accessed: '2026-10-30', kind: 'association',
});
const ITEM_OK: Verification = { status: 'verified', sources: [src('A'), src('B')] };
const MATCHUP_OK: Verification = { status: 'verified', sources: [src('A'), src('B'), src('C')] };

const concept = (id: string, minLevel: Concept['minLevel']): Concept => ({
  id, name: id, minLevel, assignments: [], read: [{ focus: 'x', text: `read ${id}` }], verification: ITEM_OK,
});
const coverage = (id: CoverageId): Coverage => ({ id, name: id, deepDefenders: 1, verification: ITEM_OK });
const matchup = (c: string, beats: CoverageId, v: Verification = MATCHUP_OK): Matchup => ({
  concept: c, beats, stressedDefender: `defender vs ${c}`, reason: `${c} beats ${beats}`, verification: v,
});

const lib = (matchups?: Matchup[]): Library => ({
  formations: [],
  fronts: [],
  coverages: [coverage('cover-2'), coverage('cover-3')],
  concepts: [concept('Alpha', 'jv'), concept('Bravo', 'youth'), concept('Charlie', 'varsity'), concept('Delta', 'jv')],
  matchups: matchups ?? [
    matchup('Alpha', 'cover-3'),
    matchup('Bravo', 'cover-2'),
    matchup('Charlie', 'cover-3'),
    matchup('Delta', 'cover-3'),
  ],
});

describe('recommend', () => {
  it('ranks concepts by how much of the opponent defense they beat', () => {
    const r = recommend({ coverages: [{ id: 'cover-3', share: 0.7 }, { id: 'cover-2', share: 0.3 }] }, { level: 'varsity', limit: 10 }, lib());
    expect(r.map(x => x.concept.id)).toEqual(['Alpha', 'Charlie', 'Delta', 'Bravo']);
    expect(r[0].score).toBeCloseTo(0.7, 9);
    expect(r[3].score).toBeCloseTo(0.3, 9);
    expect(r[0].beats).toBe('cover-3');
    expect(r[0].reason).toBe('Alpha beats cover-3');
    expect(r[0].read[0].text).toBe('read Alpha');
  });

  it('returns three by default', () => {
    const r = recommend({ coverages: [{ id: 'cover-3', share: 1 }, { id: 'cover-2', share: 1 }] }, { level: 'varsity' }, lib());
    expect(r).toHaveLength(3);
  });

  it('normalises messy shares and ignores unknown coverages', () => {
    const r = recommend({ coverages: [{ id: 'cover-3', share: 70 }, { id: 'cover-9', share: 30 }] }, { level: 'jv' }, lib());
    expect(r[0].score).toBeCloseTo(1, 9);
    expect(recommend({ coverages: [] }, { level: 'jv' }, lib())).toEqual([]);
    expect(recommend({ coverages: [{ id: 'cover-9', share: 1 }] }, { level: 'jv' }, lib())).toEqual([]);
    expect(recommend({ coverages: [{ id: 'cover-3', share: 0 }] }, { level: 'jv' }, lib())).toEqual([]);
  });

  it("respects the coach's level", () => {
    const opp = { coverages: [{ id: 'cover-3', share: 1 }] };
    expect(recommend(opp, { level: 'jv', limit: 10 }, lib()).map(x => x.concept.id)).not.toContain('Charlie');
    expect(recommend(opp, { level: 'varsity', limit: 10 }, lib()).map(x => x.concept.id)).toContain('Charlie');
  });

  it("prefers the coach's own plays on a tie", () => {
    const r = recommend({ coverages: [{ id: 'cover-3', share: 1 }] }, { level: 'jv', playbook: ['Delta'] }, lib());
    expect(r.map(x => x.concept.id)).toEqual(['Delta', 'Alpha']);
    expect(r[0].inPlaybook).toBe(true);
    expect(r[1].inPlaybook).toBe(false);
  });

  it('never recommends draft, rejected or under-sourced content', () => {
    const opp = { coverages: [{ id: 'cover-3', share: 1 }] };
    const bad: Verification[] = [
      { status: 'draft', sources: MATCHUP_OK.status === 'verified' ? MATCHUP_OK.sources : [], note: 'unconfirmed' },
      { status: 'rejected', reviewer: 'Owner', date: '2026-10-30', reason: 'wrong' },
      { status: 'verified', sources: [src('A'), src('B')] },
    ];
    for (const v of bad) {
      expect(recommend(opp, { level: 'jv' }, lib([matchup('Alpha', 'cover-3', v)]))).toEqual([]);
    }
    const draftConcept = lib([matchup('Alpha', 'cover-3')]);
    draftConcept.concepts[0] = { ...draftConcept.concepts[0], verification: { status: 'draft', sources: [], note: 'x' } };
    expect(recommend(opp, { level: 'jv' }, draftConcept)).toEqual([]);
  });
});

describe('MATCHUPS content', () => {
  it('states each claim in plain words with the stressed defender', () => {
    expect(MATCHUPS).toHaveLength(8);
    for (const m of MATCHUPS) {
      expect(m.reason.length).toBeGreaterThan(20);
      expect(m.stressedDefender.length).toBeGreaterThan(0);
    }
  });
});
