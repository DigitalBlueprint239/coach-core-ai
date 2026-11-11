// FROZEN interpretation `cc-interp@1`. DO NOT EDIT.
//
// Version-2 and version-3 plays stored a slot and a route name, and the drawing was computed from the code at render
// time. This file is a frozen copy of exactly how that code turned a formation into slots and a route name into a
// shape between 2026-11-01 (first v2 play possible) and the introduction of schema v4. Migration to v4 uses this
// copy, never the live route library, so a later change to the library cannot change what an old play means.
// If the old behaviour is ever found to have differed, add `v2.ts` and select by date; never change this file.
import type { Yards } from '../types';

export const INTERPRETATION_V1 = 'cc-interp@1' as const;

type Rel = { o: number; d: number };
type FrozenRoute = { defaultDepth: number; shape: (depth: number) => Rel[] };

const ROUTES_V1: Readonly<Record<string, FrozenRoute>> = Object.freeze({
  go: { defaultDepth: 20, shape: (D: number) => [{ o: 0.5, d: D }] },
  seam: { defaultDepth: 20, shape: (D: number) => [{ o: -2, d: D }] },
  sail: { defaultDepth: 12, shape: (D: number) => [{ o: 0, d: D - 3 }, { o: 7, d: D }] },
  flat: { defaultDepth: 3, shape: (D: number) => [{ o: 2, d: 2.5 }, { o: 10, d: D }] },
  arrow: { defaultDepth: 4, shape: (D: number) => [{ o: 7, d: D }] },
  curl: { defaultDepth: 12, shape: (D: number) => [{ o: 0, d: D }, { o: -1.5, d: D - 1.5 }] },
  hitch: { defaultDepth: 5, shape: (D: number) => [{ o: 0, d: D }, { o: 0, d: D - 1 }] },
  corner: { defaultDepth: 12, shape: (D: number) => [{ o: 0, d: D - 5 }, { o: 6, d: D }] },
  stick: { defaultDepth: 6, shape: (D: number) => [{ o: 0, d: D }, { o: -1, d: D }] },
  snag: { defaultDepth: 6, shape: (D: number) => [{ o: -3, d: D }] },
  drag: { defaultDepth: 2, shape: (D: number) => [{ o: -4, d: D }, { o: -18, d: D }] },
  out: { defaultDepth: 5, shape: (D: number) => [{ o: 0, d: D }, { o: 6, d: D }] },
  dig: { defaultDepth: 12, shape: (D: number) => [{ o: 0, d: D }, { o: -11, d: D }] },
  swing: { defaultDepth: 1, shape: (D: number) => [{ o: 3, d: -0.5 }, { o: 9, d: D }] },
});

export const knownRouteV1 = (routeId: string): boolean => Object.prototype.hasOwnProperty.call(ROUTES_V1, routeId);

/** Route points as offsets from the player's alignment (x toward the offense's right, y downfield). */
export function routeOffsetsV1(routeId: string, side: 'left' | 'right', depth?: number): Yards[] | null {
  if (!knownRouteV1(routeId)) return null;
  const def = ROUTES_V1[routeId];
  const out = side === 'right' ? 1 : -1;
  // `+ 0` turns a negative zero into zero so stored geometry compares and serialises cleanly.
  return def.shape(depth ?? def.defaultDepth).map(r => ({ x: r.o * out + 0, y: r.d + 0 }));
}

type SlotPlayer = { role: string; at: Yards };
const LINEMEN = ['LT', 'LG', 'C', 'RG', 'RT'];
const BACK_ORDER = ['RB', 'FB', 'F'];
const rank = (role: string) => {
  const i = BACK_ORDER.indexOf(role);
  return i < 0 ? BACK_ORDER.length : i;
};

export type SlotResolutionV1 = { strength: 'left' | 'right'; slots: Map<string, number> };

/** Slot name → index into `players`, exactly as v2/v3 resolved it. */
export function resolveSlotsV1(players: readonly SlotPlayer[], declaredStrength: 'left' | 'right'): SlotResolutionV1 {
  const backs: number[] = [];
  const left: number[] = [];
  const right: number[] = [];
  let qb = -1;
  players.forEach((p, i) => {
    if (LINEMEN.includes(p.role)) return;
    if (p.role === 'QB') qb = i;
    else if (Math.abs(p.at.x) <= 4 && p.at.y <= -3) backs.push(i);
    else (p.at.x > 0 ? right : left).push(i);
  });
  backs.sort((a, b) => rank(players[a].role) - rank(players[b].role));
  const strength = right.length === left.length ? declaredStrength : right.length > left.length ? 'right' : 'left';
  const strong = strength === 'right' ? right : left;
  const weak = strength === 'right' ? left : right;
  const slots = new Map<string, number>();
  if (qb >= 0) slots.set('qb', qb);
  if (backs[0] !== undefined) slots.set('back', backs[0]);
  if (backs[1] !== undefined) slots.set('back-2', backs[1]);
  const number = (side: number[], prefix: 'strong' | 'weak') =>
    [...side]
      .sort((a, b) => Math.abs(players[b].at.x) - Math.abs(players[a].at.x))
      .slice(0, 3)
      .forEach((index, n) => slots.set(`${prefix}-${n + 1}`, index));
  number(strong, 'strong');
  number(weak, 'weak');
  return { strength, slots };
}
