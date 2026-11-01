import type { RouteId, Yards } from './types';

/** A route point relative to where the receiver starts: o toward his own sideline, d downfield. */
type Rel = { o: number; d: number };

type RouteDef = { name: string; plainName: string; defaultDepth: number; shape: (depth: number) => Rel[] };

export const ROUTES: Record<RouteId, RouteDef> = {
  go: { name: 'Go', plainName: 'Straight up', defaultDepth: 20, shape: D => [{ o: 0.5, d: D }] },
  seam: { name: 'Seam', plainName: 'Up the seam', defaultDepth: 20, shape: D => [{ o: -2, d: D }] },
  sail: { name: 'Sail', plainName: 'Deep out', defaultDepth: 12, shape: D => [{ o: 0, d: D - 3 }, { o: 7, d: D }] },
  flat: { name: 'Flat', plainName: 'Out to the flat', defaultDepth: 3, shape: D => [{ o: 2, d: 2.5 }, { o: 10, d: D }] },
  arrow: { name: 'Arrow', plainName: 'Angled to the flat', defaultDepth: 4, shape: D => [{ o: 7, d: D }] },
  curl: { name: 'Curl', plainName: 'Curl back', defaultDepth: 12, shape: D => [{ o: 0, d: D }, { o: -1.5, d: D - 1.5 }] },
  hitch: { name: 'Hitch', plainName: 'Quick stop', defaultDepth: 5, shape: D => [{ o: 0, d: D }, { o: 0, d: D - 1 }] },
  corner: { name: 'Corner', plainName: 'Corner', defaultDepth: 12, shape: D => [{ o: 0, d: D - 5 }, { o: 6, d: D }] },
  stick: { name: 'Stick', plainName: 'Stop and sit', defaultDepth: 6, shape: D => [{ o: 0, d: D }, { o: -1, d: D }] },
  snag: { name: 'Snag', plainName: 'Stop inside', defaultDepth: 6, shape: D => [{ o: -3, d: D }] },
  drag: { name: 'Drag', plainName: 'Shallow across', defaultDepth: 2, shape: D => [{ o: -4, d: D }, { o: -18, d: D }] },
  out: { name: 'Out', plainName: 'Quick out', defaultDepth: 5, shape: D => [{ o: 0, d: D }, { o: 6, d: D }] },
  dig: { name: 'Dig', plainName: 'Deep in', defaultDepth: 12, shape: D => [{ o: 0, d: D }, { o: -11, d: D }] },
  swing: { name: 'Swing', plainName: 'Swing out', defaultDepth: 1, shape: D => [{ o: 3, d: -0.5 }, { o: 9, d: D }] },
};

/** The route's points in field yards, starting at the receiver; "outside" follows the receiver's side. */
export function routePath(route: RouteId, from: Yards, side: 'left' | 'right', depth?: number): Yards[] {
  const def = ROUTES[route];
  const out = side === 'right' ? 1 : -1;
  return [from, ...def.shape(depth ?? def.defaultDepth).map(r => ({ x: from.x + r.o * out, y: from.y + r.d }))];
}
