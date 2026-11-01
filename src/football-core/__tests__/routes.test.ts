import { ROUTES, routePath } from '../routes';
import type { RouteId } from '../types';

const start = { x: 13.5, y: -1.6 };
const last = <T>(a: T[]) => a[a.length - 1];

describe('routePath', () => {
  it('a right-side sail breaks toward the right sideline', () => {
    const pts = routePath('sail', start, 'right');
    expect(last(pts).x).toBeGreaterThan(start.x);
    expect(last(pts).y).toBeCloseTo(start.y + 12, 9);
  });

  it('the same sail on the left breaks toward the left sideline', () => {
    const left = { x: -start.x, y: start.y };
    const pts = routePath('sail', left, 'left');
    expect(last(pts).x).toBeLessThan(left.x);
    expect(last(pts).y).toBeCloseTo(left.y + 12, 9);
  });

  it('a depth override moves the break', () => {
    const pts = routePath('curl', start, 'right', 8);
    expect(Math.max(...pts.map(p => p.y))).toBeCloseTo(start.y + 8, 9);
  });

  it('every route starts at the player', () => {
    for (const id of Object.keys(ROUTES) as RouteId[]) {
      expect(routePath(id, start, 'right')[0]).toEqual(start);
    }
  });

  it('every route has a plain name for youth coaches', () => {
    for (const id of Object.keys(ROUTES) as RouteId[]) expect(ROUTES[id].plainName.length).toBeGreaterThan(0);
  });
});
