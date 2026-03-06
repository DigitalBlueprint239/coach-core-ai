import type { PlayRouteInstance, EngineConcept, DetectedConcept } from './types';

/**
 * Count occurrences of each route name in the play.
 */
function buildRouteCount(playRoutes: PlayRouteInstance[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of playRoutes) {
    counts.set(r.routeName, (counts.get(r.routeName) ?? 0) + 1);
  }
  return counts;
}

/**
 * Determine whether a set of play routes satisfies the requirements of a concept.
 *
 * Matching rules:
 * - Build a frequency map of required_routes (allows duplicate names like 'Go','Go')
 * - For each distinct required route name, check that the play has at least that many instances
 * - If concept has min_match, at least that many distinct required routes must match
 */
function matchesConcept(
  playRouteCount: Map<string, number>,
  concept: EngineConcept
): boolean {
  // Count how many of each route name the concept needs
  const needed = new Map<string, number>();
  for (const name of concept.required_routes) {
    needed.set(name, (needed.get(name) ?? 0) + 1);
  }

  let matched = 0;
  Array.from(needed.entries()).forEach(([name, count]) => {
    if ((playRouteCount.get(name) ?? 0) >= count) {
      matched++;
    }
  });

  const minRequired = concept.min_match ?? needed.size;
  return matched >= minRequired;
}

/**
 * Given the labeled routes in a play and the known concepts, return the first
 * detected concept (or null if none match).
 *
 * Only labeled routes (non-empty routeName) participate in detection.
 */
export function detectConcept(
  playRoutes: PlayRouteInstance[],
  knownConcepts: EngineConcept[]
): DetectedConcept | null {
  const labeled = playRoutes.filter(r => r.routeName && r.routeName !== 'Unknown Route');
  if (labeled.length === 0) return null;

  const count = buildRouteCount(labeled);

  for (const concept of knownConcepts) {
    if (matchesConcept(count, concept)) {
      const matchedRoutes = labeled
        .filter(r => concept.required_routes.includes(r.routeName))
        .map(r => r.routeName);
      return { concept, matchedRoutes };
    }
  }

  return null;
}

/**
 * Return ALL concepts that match the current play (not just the first).
 */
export function detectAllConcepts(
  playRoutes: PlayRouteInstance[],
  knownConcepts: EngineConcept[]
): DetectedConcept[] {
  const labeled = playRoutes.filter(r => r.routeName && r.routeName !== 'Unknown Route');
  if (labeled.length === 0) return [];

  const count = buildRouteCount(labeled);

  return knownConcepts
    .filter(concept => matchesConcept(count, concept))
    .map(concept => ({
      concept,
      matchedRoutes: labeled
        .filter(r => concept.required_routes.includes(r.routeName))
        .map(r => r.routeName),
    }));
}
