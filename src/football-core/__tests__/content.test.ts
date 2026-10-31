import { applyConcept, fullLibrary, validateFormation } from '..';
import type { Source, Verification } from '..';

const lib = fullLibrary();
const sourcesOf = (v: Verification): Source[] => ('sources' in v ? v.sources : []);
const allVerifications = (): Verification[] => [
  ...lib.formations.map(x => x.verification),
  ...lib.concepts.map(x => x.verification),
  ...lib.fronts.map(x => x.verification),
  ...lib.coverages.map(x => x.verification),
  ...lib.matchups.map(x => x.verification),
];
const unique = (ids: string[]) => new Set(ids).size === ids.length;

describe('content slice', () => {
  it('has unique ids within each kind', () => {
    expect(unique(lib.formations.map(f => f.id))).toBe(true);
    expect(unique(lib.concepts.map(c => c.id))).toBe(true);
    expect(unique(lib.fronts.map(f => f.id))).toBe(true);
    expect(unique(lib.coverages.map(c => c.id))).toBe(true);
    expect(unique(lib.matchups.map(m => `${m.concept}:${m.beats}`))).toBe(true);
  });

  it('only makes claims about concepts and coverages that exist', () => {
    const concepts = new Set(lib.concepts.map(c => c.id));
    const coverages = new Set<string>(lib.coverages.map(c => c.id));
    for (const m of lib.matchups) {
      expect(concepts.has(m.concept)).toBe(true);
      expect(coverages.has(m.beats)).toBe(true);
    }
  });

  it('has only legal formations', () => {
    for (const f of lib.formations) expect(validateFormation(f)).toEqual([]);
  });

  it('can run every concept from at least one formation', () => {
    for (const c of lib.concepts) expect(lib.formations.some(f => applyConcept(c, f).ok)).toBe(true);
  });

  it('records sources with https links and access dates', () => {
    for (const s of allVerifications().flatMap(sourcesOf)) {
      expect(s.url.startsWith('https://')).toBe(true);
      expect(s.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
