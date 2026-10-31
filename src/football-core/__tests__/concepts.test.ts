import { applyConcept } from '../concepts';
import { PASS_CONCEPTS } from '../content/concepts.pass';
import { SPREAD_FORMATIONS } from '../content/formations.spread';
import { mirrorFormation } from '../formations';

const formation = (id: string) => SPREAD_FORMATIONS.find(f => f.id === id)!;
const concept = (id: string) => PASS_CONCEPTS.find(c => c.id === id)!;

describe('applyConcept', () => {
  it('flood from trips right sends Z deep, H on the sail, Y to the flat and X on the dig', () => {
    const r = applyConcept(concept('flood'), formation('trips-right'));
    if (!r.ok) throw new Error(`missing ${r.missing.join(', ')}`);
    const byRole = Object.fromEntries(r.routes.map(x => [x.role, x]));
    expect(byRole.Z.route).toBe('go');
    expect(byRole.H.route).toBe('sail');
    expect(byRole.Y.route).toBe('flat');
    expect(byRole.X.route).toBe('dig');
    const h = byRole.H.points;
    expect(h[h.length - 1].x).toBeGreaterThan(h[0].x);
  });

  it('flood from trips left mirrors every route', () => {
    const right = applyConcept(concept('flood'), formation('trips-right'));
    const left = applyConcept(concept('flood'), mirrorFormation(formation('trips-right'), 'trips-left', 'Trips Left'));
    if (!right.ok || !left.ok) throw new Error('flood should run from trips');
    expect(left.routes.map(r => r.role)).toEqual(right.routes.map(r => r.role));
    left.routes.forEach((r, i) =>
      r.points.forEach((p, j) => {
        expect(p.x).toBeCloseTo(-right.routes[i].points[j].x, 9);
        expect(p.y).toBeCloseTo(right.routes[i].points[j].y, 9);
      }),
    );
  });

  it('flood from doubles reports the missing slot instead of failing', () => {
    expect(applyConcept(concept('flood'), formation('doubles'))).toEqual({ ok: false, missing: ['strong-3'] });
  });

  it('curl-flat runs from every content formation', () => {
    for (const f of SPREAD_FORMATIONS) expect(applyConcept(concept('curl-flat'), f).ok).toBe(true);
  });

  it('protect assignments become protectors', () => {
    const r = applyConcept(concept('curl-flat'), formation('doubles'));
    if (!r.ok) throw new Error('curl-flat should run from doubles');
    expect(r.protectors).toEqual(['RB']);
  });

  it('a back with no one to protect is skipped, not reported missing', () => {
    const r = applyConcept(concept('curl-flat'), formation('empty'));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.protectors).toEqual([]);
  });

  it('a swing from the back goes to the strong side', () => {
    const r = applyConcept(concept('snag'), formation('trips-right'));
    if (!r.ok) throw new Error('snag should run from trips');
    const swing = r.routes.find(x => x.route === 'swing')!;
    expect(swing.role).toBe('RB');
    expect(swing.points[swing.points.length - 1].x).toBeGreaterThan(swing.points[0].x);
  });
});
