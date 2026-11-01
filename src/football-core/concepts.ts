import { slotsFor, strengthOf } from './formations';
import { routePath } from './routes';
import type { Concept, Formation, OffenseRole, RouteId, Slot, Yards } from './types';

export type ConceptRoute = { role: OffenseRole; slot: Slot; route: RouteId; points: Yards[] };

export type AppliedConcept =
  | { ok: true; routes: ConceptRoute[]; protectors: OffenseRole[] }
  | { ok: false; missing: Slot[] };

/**
 * Runs a concept from a formation by slot (#1/#2/#3 strong and weak, back, QB).
 * Route slots the formation lacks are reported; protect/block slots it lacks are skipped.
 */
export function applyConcept(c: Concept, f: Formation): AppliedConcept {
  const slots = slotsFor(f);
  const strong = strengthOf(f);
  const weak = strong === 'right' ? 'left' : 'right';
  const missing: Slot[] = [];
  const routes: ConceptRoute[] = [];
  const protectors: OffenseRole[] = [];

  for (const a of c.assignments) {
    const player = slots.get(a.slot);
    if (a.kind !== 'route') {
      if (player) protectors.push(player.role);
      continue;
    }
    if (!player) {
      missing.push(a.slot);
      continue;
    }
    const side = a.slot.startsWith('weak') ? weak : strong;
    routes.push({ role: player.role, slot: a.slot, route: a.route, points: routePath(a.route, player.at, side, a.depth) });
  }
  return missing.length ? { ok: false, missing } : { ok: true, routes, protectors };
}
