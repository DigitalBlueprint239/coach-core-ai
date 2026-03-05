// Offensive Engine Concept Detection
import { Concept } from './schema';

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
  const routeCount = playRoutes.length;

  // Helper
  const has = (keyword: string) => routeNames.some((n) => n.includes(keyword));
  const count = (keyword: string) => routeNames.filter((n) => n.includes(keyword)).length;
  const find = (id: string) => knownConcepts.find((c) => c.concept_id === id) || null;

  // === Detection order matters: most specific first, most generic last ===

  // FOUR VERTS: 4+ vertical/go/seam routes
  if (count('go') + count('vert') + count('seam') >= 4) {
    return find('four_verts');
  }

  // MILLS (Post-Dig): Post + Dig (OUTSIDE runs post, INSIDE runs dig)
  // Must check before Dagger since both have seam/post + dig
  if (has('post') && has('dig') && !has('seam') && !has('shallow')) {
    return find('mills_core');
  }

  // MESH: 2+ shallow/mesh crossing routes + 3+ total
  if (count('shallow') + count('mesh') + count('drag') >= 2 && routeCount >= 3) {
    return find('mesh_core');
  }

  // DRIVE: Shallow + Dig from frontside (no mesh-style dual crossing)
  // Must check BEFORE Dagger so Shallow+Dig+Go is Drive, not Dagger
  if ((has('shallow') || has('drag')) && has('dig') && count('shallow') + count('drag') === 1) {
    return find('drive_core');
  }

  // DAGGER: Seam/Go + Dig + optional shallow
  if ((has('seam') || has('go')) && has('dig') && routeCount >= 2) {
    return find('dagger_core');
  }

  // Y-CROSS: Deep crosser (dig at 15) + post clear
  if (has('dig') && has('post')) {
    return find('y_cross_core');
  }

  // SWITCH/RUB: Slant + Out crossing (man beater)
  if (has('slant') && has('out')) {
    return find('switch_rub_core');
  }

  // FLOOD: Go + Sail/Deep-Out + Flat (3 levels to one side)
  if (has('go') && has('sail') && has('flat')) {
    return find('flood_core');
  }

  // LEVELS: Drag + Dig + Post (staggered in-breakers)
  if (has('drag') && has('dig') && (has('post') || routeCount >= 3)) {
    return find('levels_core');
  }

  // SNAG: Corner + Stick/Snag-sit + Flat (triangle)
  if (has('corner') && has('stick') && has('flat')) {
    return find('snag_core');
  }

  // SPOT: Same as Snag (corner + sit + flat) — from bunch/compressed
  // Spot is functionally identical to Snag; detect as Snag by default
  // Could differentiate by formation context in future

  // SMASH: Hitch/Curl + Corner (hi-lo on CB)
  if ((has('hitch') || has('curl')) && has('corner')) {
    return find('smash_core');
  }

  // CURL/FLAT: Curl + Flat (hi-lo on flat defender) — must check AFTER Smash
  if (has('curl') && has('flat')) {
    return find('curl_flat_core');
  }

  // SPACING: Multiple hitches/sticks at same depth — check BEFORE Stick
  // so 3+ sticks/hitches resolves as Spacing, not Stick
  if (count('hitch') + count('stick') >= 3) {
    return find('spacing_core');
  }

  // STICK: Stick-sit + Flat + Go/Vertical clear
  if (has('stick') && has('flat')) {
    return find('stick_core');
  }

  return null;
}
