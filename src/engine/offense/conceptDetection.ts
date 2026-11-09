import { Concept, Route } from './schema';

export interface PlayRouteInstance {
  playerId: string;
  routeName: string;
}

export function detectConcept(
  playRoutes: PlayRouteInstance[],
  knownConcepts: Concept[],
): Concept | null {
  if (!playRoutes || playRoutes.length === 0) return null;

  const routeNames = playRoutes.map((r) => r.routeName.toLowerCase());

  // 1. Check for MESH
  const shallowCount = routeNames.filter(
    (n) => n.includes('shallow') || n.includes('mesh'),
  ).length;
  if (shallowCount >= 2 && playRoutes.length >= 3) {
    const mesh = knownConcepts.find((c) => c.concept_id === 'mesh_core');
    if (mesh) return mesh;
  }

  // 2. Check for SMASH
  const hasHitch = routeNames.some(
    (n) => n.includes('hitch') || n.includes('curl'),
  );
  const hasCorner = routeNames.some((n) => n.includes('corner'));
  if (hasHitch && hasCorner) {
    const smash = knownConcepts.find((c) => c.concept_id === 'smash_core');
    if (smash) return smash;
  }

  // 3. Check for FOUR VERTS
  const vertCount = routeNames.filter(
    (n) => n.includes('go') || n.includes('vert') || n.includes('seam'),
  ).length;
  if (vertCount >= 4) {
    const fourVerts = knownConcepts.find((c) => c.concept_id === 'four_verts');
    if (fourVerts) return fourVerts;
  }

  return null;
}
