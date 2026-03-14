import { routeDefinitions, getRouteById, getAllRoutes } from './routeDefinitions';

describe('routeDefinitions', () => {
  it('has exactly 18 route definitions', () => {
    expect(routeDefinitions).toHaveLength(18);
  });

  it('has no duplicate IDs', () => {
    const ids = routeDefinitions.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every route has required schema fields', () => {
    for (const route of routeDefinitions) {
      expect(route.id).toBeTruthy();
      expect(route.name).toBeTruthy();
      expect(typeof route.depth).toBe('number');
      expect(route.family).toBeTruthy();
      expect(route.coachingCue).toBeTruthy();
      expect(route.timing).toBeTruthy();
      expect(Array.isArray(route.defaultWaypoints)).toBe(true);
      expect(route.defaultWaypoints.length).toBeGreaterThan(0);
    }
  });

  it('hitch route depth is 5–7 yards', () => {
    const hitch = getRouteById('hitch');
    expect(hitch).toBeDefined();
    expect(hitch!.depth).toBeGreaterThanOrEqual(5);
    expect(hitch!.depth).toBeLessThanOrEqual(7);
  });

  it('seam route depth is 12–15 yards', () => {
    const seam = getRouteById('seam');
    expect(seam).toBeDefined();
    expect(seam!.depth).toBeGreaterThanOrEqual(12);
    expect(seam!.depth).toBeLessThanOrEqual(15);
  });

  it('shallow_cross route depth is 1–3 yards', () => {
    const sc = getRouteById('shallow_cross');
    expect(sc).toBeDefined();
    expect(sc!.depth).toBeGreaterThanOrEqual(1);
    expect(sc!.depth).toBeLessThanOrEqual(3);
  });

  it('option route depth is 6–8 yards', () => {
    const opt = getRouteById('option');
    expect(opt).toBeDefined();
    expect(opt!.depth).toBeGreaterThanOrEqual(6);
    expect(opt!.depth).toBeLessThanOrEqual(8);
  });

  it('bubble_screen route depth is 0–2 yards', () => {
    const bs = getRouteById('bubble_screen');
    expect(bs).toBeDefined();
    expect(bs!.depth).toBeGreaterThanOrEqual(0);
    expect(bs!.depth).toBeLessThanOrEqual(2);
  });

  it('getAllRoutes returns all routes', () => {
    expect(getAllRoutes()).toHaveLength(18);
  });

  it('getRouteById returns undefined for unknown ID', () => {
    expect(getRouteById('nonexistent')).toBeUndefined();
  });
});
