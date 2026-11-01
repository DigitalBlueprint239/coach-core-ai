import { applyConcept, fullLibrary, isPublishable, publishedLibrary, validateFormation } from '..';
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

  it('never covers a receiver on the line (only the end man on each side is eligible)', () => {
    const linemen = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
    for (const f of lib.formations) {
      for (const side of [1, -1]) {
        const onLine = f.players.filter(p => p.onLine && Math.sign(p.at.x) === side);
        const outermost = Math.max(...onLine.map(p => Math.abs(p.at.x)));
        for (const p of onLine) {
          if (!linemen.has(p.role)) expect(`${f.id}:${p.role}:${Math.abs(p.at.x) === outermost ? 'end' : 'covered'}`).toBe(`${f.id}:${p.role}:end`);
        }
      }
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

  it('publishes only items that really meet the verification bar', () => {
    const pub = publishedLibrary();
    for (const x of [...pub.formations, ...pub.concepts, ...pub.fronts, ...pub.coverages]) {
      expect(isPublishable(x.verification, 'item')).toBe(true);
    }
    for (const m of pub.matchups) expect(isPublishable(m.verification, 'matchup')).toBe(true);
  });

  it('the slice is usable: at least one verified formation, coverage and matchup reach coaches', () => {
    const pub = publishedLibrary();
    const ready = pub.formations.length > 0 && pub.coverages.length > 0 && pub.matchups.length > 0;
    if (!ready) throw new Error('Content slice is not ready to show coaches: no verified formation, coverage or matchup.');
    expect(ready).toBe(true);
  });
});
