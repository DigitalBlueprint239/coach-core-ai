import { alignDefense } from '../defense';
import { COVERAGES, FRONT_43_OVER } from '../content/defense.43';
import { SPREAD_FORMATIONS } from '../content/formations.spread';
import { mirrorFormation } from '../formations';
import type { CoverageId } from '../types';

const ids: CoverageId[] = ['cover-0', 'cover-1', 'cover-2', 'cover-3', 'cover-4'];
const trips = SPREAD_FORMATIONS.find(f => f.id === 'trips-right')!;

describe('alignDefense', () => {
  it('every coverage puts 11 defenders on the field', () => {
    for (const f of SPREAD_FORMATIONS) for (const c of ids) expect(alignDefense(c, f)).toHaveLength(11);
  });

  it('deep defenders match the coverage', () => {
    for (const c of COVERAGES) {
      expect(alignDefense(c.id, trips).filter(d => d.deep)).toHaveLength(c.deepDefenders);
    }
  });

  it('cover-3 has its single deep defender between the hashes', () => {
    const deep = alignDefense('cover-3', trips).filter(d => d.deep);
    expect(deep).toHaveLength(1);
    expect(Math.abs(deep[0].at.x)).toBeLessThanOrEqual(8.89);
  });

  it('cover-2 safeties sit on the hashes', () => {
    const deep = alignDefense('cover-2', trips).filter(d => d.deep);
    expect(deep).toHaveLength(2);
    for (const d of deep) expect(Math.abs(d.at.x)).toBeCloseTo(8.9, 1);
    expect(Math.sign(deep[0].at.x)).not.toBe(Math.sign(deep[1].at.x));
  });

  it('defense mirrors with the formation', () => {
    const left = mirrorFormation(trips, 'trips-left', 'Trips Left');
    const r = alignDefense('cover-3', trips);
    const l = alignDefense('cover-3', left);
    l.forEach((d, i) => {
      expect(d.role).toBe(r[i].role);
      expect(d.at.x).toBeCloseTo(-r[i].at.x, 9);
      expect(d.at.y).toBeCloseTo(r[i].at.y, 9);
    });
  });

  it('the 4-3 over front and all five coverages exist as content', () => {
    expect(FRONT_43_OVER.id).toBe('43-over');
    expect(COVERAGES.map(c => c.id)).toEqual(ids);
  });
});
