/**
 * conceptDetection.ts - Detects offensive concepts from assigned routes
 * Analyzes the combination of routes on a play to identify known concepts.
 */

import { ConceptDef, PlayRouteInstance } from './schema';
import { concepts } from './data.moderate';

/**
 * Detects the offensive concept from the routes assigned in a play.
 * Checks route name patterns against known concept definitions.
 *
 * @param playRoutes - Array of route instances assigned to players in the current play
 * @returns The detected concept definition, or null if no known concept matches
 */
export function detectConcept(playRoutes: PlayRouteInstance[]): ConceptDef | null {
  if (!playRoutes || playRoutes.length < 2) return null;

  const routeNames = playRoutes.map(r => r.routeName.toLowerCase());
  const knownConcepts = concepts;

  // FOUR VERTS detection: 3+ go/vertical routes
  const goCount = routeNames.filter(n => n.includes('go') || n.includes('vert') || n.includes('fade')).length;
  if (goCount >= 3) {
    const fourVerts = knownConcepts.find(c => c.concept_id === 'four_verts');
    if (fourVerts) return fourVerts;
  }

  // Shared detection helpers
  const hasFlat = routeNames.some(n => n.includes('flat') || n.includes('arrow'));
  const hasOut = routeNames.some(n => n.includes('out'));
  const hasGo = routeNames.some(n => n.includes('go') || n.includes('vert') || n.includes('fade'));
  const hasShortHitch = routeNames.some(n => n.includes('hitch') || n.includes('stick'));
  const hasCorner = routeNames.some(n => n.includes('corner'));
  const hasShallow = routeNames.some(n => n.includes('shallow') || n.includes('drag'));
  const hasDig = routeNames.some(n => n.includes('dig') || n.includes('in'));
  const hasCurl = routeNames.some(n => n.includes('curl') || n.includes('hook'));
  const hasSlant = routeNames.some(n => n.includes('slant'));
  const hasPost = routeNames.some(n => n.includes('post'));

  // MESH detection: 2+ shallow/crossing routes
  const shallowCount = routeNames.filter(n =>
    n.includes('shallow') || n.includes('drag') || n.includes('cross')
  ).length;
  if (shallowCount >= 2) {
    const mesh = knownConcepts.find(c => c.concept_id === 'mesh_core');
    if (mesh) return mesh;
  }

  // SMASH detection: hitch + corner
  if (hasShortHitch && hasCorner) {
    const smash = knownConcepts.find(c => c.concept_id === 'smash_core');
    if (smash) return smash;
  }

  // SNAG detection: hitch/snag + flat + corner (must check before stick since it shares hitch+flat)
  if (hasShortHitch && hasFlat && hasCorner) {
    const snag = knownConcepts.find(c => c.concept_id === 'snag_core');
    if (snag) return snag;
  }

  // FLOOD detection: flat + out + go on same side
  if (hasFlat && hasOut && hasGo) {
    const flood = knownConcepts.find(c => c.concept_id === 'flood_core');
    if (flood) return flood;
  }

  // SHALLOW/DRIVE detection: shallow cross + dig
  if (hasShallow && hasDig) {
    const shallow = knownConcepts.find(c => c.concept_id === 'shallow_drive');
    if (shallow) return shallow;
  }

  // STICK detection: hitch/stick at 5-6 yds + flat
  if (hasShortHitch && hasFlat && playRoutes.length >= 2) {
    const stick = knownConcepts.find(c => c.concept_id === 'stick_core');
    if (stick) return stick;
  }

  // CURL/FLAT detection: curl + flat
  if (hasCurl && hasFlat) {
    const curlFlat = knownConcepts.find(c => c.concept_id === 'curl_flat_core');
    if (curlFlat) return curlFlat;
  }

  // SPACING detection: 3+ hitches
  const hitchCount = routeNames.filter(n => n.includes('hitch')).length;
  if (hitchCount >= 3) {
    const spacing = knownConcepts.find(c => c.concept_id === 'spacing_core');
    if (spacing) return spacing;
  }

  return null;
}

/**
 * Returns all known concept definitions for display in the concepts tab.
 */
export function getAllConcepts(): ConceptDef[] {
  return concepts;
}

/**
 * Finds a specific concept by ID.
 */
export function getConceptById(conceptId: string): ConceptDef | null {
  return concepts.find(c => c.concept_id === conceptId) || null;
}
