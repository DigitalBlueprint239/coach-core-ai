// Field geometry shared by the sheet and the thumbnails. 1 yd = 10 SVG units (the phase-1 mockup geometry):
// svgX = 300 + 10·x, svgY = 320 − 10·y on a 600×480 sheet. x is lateral from the ball, y is depth from the LOS.
import { ROUTES, routePath, slotsFor, strengthOf } from '../../../football-core';
import type { Defender, DefenderRole, OffenseRole, ReadStep, RouteId, Slot, Yards } from '../../../football-core';
import type { PlayV2 } from '../playModel';

export const SHEET_W = 600;
export const SHEET_H = 480;
export const SIDELINE_YD = 26.67;
export const HASH_YD = 8.9;

export const sx = (x: number) => 300 + 10 * x;
export const sy = (y: number) => 320 - 10 * y;
export const fromSvg = (px: number, py: number): Yards => ({ x: (px - 300) / 10, y: (320 - py) / 10 });

export const LINEMEN: readonly OffenseRole[] = ['LT', 'LG', 'C', 'RG', 'RT'];
export const isLineman = (role: OffenseRole) => LINEMEN.includes(role);

export type PlayRoute = { role: OffenseRole; slot: Slot; route: RouteId; points: Yards[] };

/**
 * The play's routes on its current formation. Unlike applyConcept, a route whose slot the formation lacks is
 * skipped rather than failing the whole play, so a coach mid-edit still sees every route that can run.
 */
export function playRoutes(play: PlayV2): PlayRoute[] {
  const slots = slotsFor(play.formation);
  const strong = strengthOf(play.formation);
  const weak = strong === 'right' ? 'left' : 'right';
  const routes: PlayRoute[] = [];
  for (const a of play.assignments) {
    if (a.kind !== 'route') continue;
    const player = slots.get(a.slot);
    if (!player) continue;
    const side = a.slot.startsWith('weak') ? weak : strong;
    routes.push({ role: player.role, slot: a.slot, route: a.route, points: routePath(a.route, player.at, side, a.depth) });
  }
  return routes;
}

const isRouteId = (s: string): s is RouteId => s in ROUTES;

/** Strong side first, then by receiver number, so "corner" means the strong-side corner. */
const slotOrder = (s: Slot) =>
  ['strong-1', 'strong-2', 'strong-3', 'weak-1', 'weak-2', 'weak-3', 'back', 'back-2', 'qb'].indexOf(s);

function routeFor(focus: string, routes: PlayRoute[]): number {
  if (!isRouteId(focus)) return -1;
  let best = -1;
  routes.forEach((r, i) => {
    if (r.route === focus && (best < 0 || slotOrder(r.slot) < slotOrder(routes[best].slot))) best = i;
  });
  return best;
}

/** Index (into routes) of the key route: the route named by the earliest read step that names one. */
export function keyRouteIndex(read: ReadStep[], routes: PlayRoute[]): number {
  for (const step of read) {
    const i = routeFor(step.focus, routes);
    if (i >= 0) return i;
  }
  return -1;
}

/** Where a route "breaks": its second point when it has a stem, otherwise its end. */
export const breakPoint = (points: Yards[]): Yards => (points.length > 2 ? points[1] : points[points.length - 1]);

const DEFENDER_FOCUS: Record<string, DefenderRole> = {
  CB: 'CB-S', SS: 'SS', FS: 'FS', SAM: 'SAM', MIKE: 'MIKE', WILL: 'WILL', DE: 'DE-S',
};

/** Where each read step's badge sits on the field, or null when the step has nothing to point at. */
export function badgePositions(read: ReadStep[], routes: PlayRoute[], defenders: Defender[]): Array<Yards | null> {
  return read.map(step => {
    const r = routeFor(step.focus, routes);
    if (r >= 0) return breakPoint(routes[r].points);
    const role = DEFENDER_FOCUS[step.focus] ?? (step.focus as DefenderRole);
    return defenders.find(d => d.role === role)?.at ?? null;
  });
}

const POSITION_NAMES: Record<OffenseRole, string> = {
  LT: 'Left tackle', LG: 'Left guard', C: 'Center', RG: 'Right guard', RT: 'Right tackle',
  QB: 'quarterback', RB: 'running back', FB: 'fullback', TE: 'tight end',
  X: 'split end', Z: 'flanker', H: 'slot receiver', Y: 'inside receiver', F: 'H-back',
};

const fmt = (n: number) => String(Math.round(Math.abs(n) * 10) / 10);

/** "H, slot receiver, 13.5 yards left, off the line" — linemen lead with their position. */
export function playerName(role: OffenseRole, label: string, at: Yards, onLine: boolean): string {
  const side = at.x === 0 ? 'on the ball' : `${fmt(at.x)} yards ${at.x > 0 ? 'right' : 'left'}`;
  const line = onLine ? 'on the line' : 'off the line';
  if (isLineman(role)) return `${POSITION_NAMES[role]}, ${side}, ${line}`;
  return `${label}, ${POSITION_NAMES[role]}, ${side}, ${line}`;
}

/** Short defensive labels in the coaching convention (E, T, N, S, M, W, C, SS, FS). */
const DEFENDER_SHORT: Record<DefenderRole, string> = {
  'DE-S': 'E', 'DT-S': 'T', NT: 'N', 'DE-W': 'E', SAM: 'S', MIKE: 'M', WILL: 'W', 'CB-S': 'C', 'CB-W': 'C', SS: 'SS', FS: 'FS',
};
export const defenderShort = (role: DefenderRole) => DEFENDER_SHORT[role];

export const pathD = (points: Yards[]) => points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x)} ${sy(p.y)}`).join(' ');
