import { Play, Route, Player, Point } from './firestore';

export interface DetectedConcept {
  conceptId: string;
  conceptName: string;
  confidence: number; // 0-1
  matchedRoutes: string[]; // route IDs that matched
  description: string;
}

// Route classification based on path shape
export type RouteShape =
  | 'hitch'
  | 'slant'
  | 'out'
  | 'in'
  | 'corner'
  | 'post'
  | 'go'
  | 'flat'
  | 'drag'
  | 'wheel'
  | 'comeback'
  | 'curl'
  | 'custom';

// Field dimensions: 600px wide x 300px high = 53.333 yards x 100 yards
const FIELD_WIDTH_PX = 600;
const FIELD_HEIGHT_PX = 300;
const FIELD_WIDTH_YARDS = 53.333;
const FIELD_HEIGHT_YARDS = 100;

const PX_PER_YARD_X = FIELD_WIDTH_PX / FIELD_WIDTH_YARDS; // ~11.25 px/yard
const PX_PER_YARD_Y = FIELD_HEIGHT_PX / FIELD_HEIGHT_YARDS; // 3.0 px/yard

function pxToYardsX(px: number): number {
  return px / PX_PER_YARD_X;
}

function pxToYardsY(px: number): number {
  return px / PX_PER_YARD_Y;
}

// Center of the field in X (pixels)
const FIELD_CENTER_X = FIELD_WIDTH_PX / 2; // 300px

/**
 * Determine if a player is on the left or right side of the formation.
 * Returns 'left' if the player is left of center, 'right' otherwise.
 */
function getPlayerSide(player: Player): 'left' | 'right' {
  return player.x < FIELD_CENTER_X ? 'left' : 'right';
}

/**
 * Find the break point in a route - where the route changes direction significantly.
 * Returns the index of the break point, or -1 if no break is found.
 */
function findBreakIndex(path: Point[]): number {
  if (path.length < 3) return -1;

  let maxAngleChange = 0;
  let breakIdx = -1;

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    const angle1 = Math.atan2(dy1, dx1);
    const angle2 = Math.atan2(dy2, dx2);

    let angleDiff = Math.abs(angle2 - angle1);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    if (angleDiff > maxAngleChange && angleDiff > Math.PI / 6) {
      // At least 30 degrees
      maxAngleChange = angleDiff;
      breakIdx = i;
    }
  }

  return breakIdx;
}

/**
 * Classify a route based on its path shape relative to the player's starting position.
 *
 * Coordinate system: Y increases downward (toward opponent's end zone).
 * "Depth" means moving downfield = negative Y displacement (going up on screen).
 * We treat downfield as the negative-Y direction.
 */
export function classifyRoute(route: Route, player: Player): RouteShape {
  const path = route.path;
  if (!path || path.length < 2) return 'custom';

  const start = path[0];
  const end = path[path.length - 1];

  // Calculate displacement in yards
  // Depth: how far downfield (negative Y = downfield). We'll use absolute depth.
  const depthPx = start.y - end.y; // positive = went downfield (up on screen)
  const depthYards = pxToYardsY(depthPx);

  const lateralPx = end.x - start.x; // positive = moved right, negative = moved left
  const lateralYards = Math.abs(pxToYardsX(lateralPx));

  // Determine if the route breaks (changes direction)
  const breakIdx = findBreakIndex(path);
  const hasBreak = breakIdx !== -1;

  // Calculate depth at break point
  let depthAtBreakYards = 0;
  let lateralAfterBreakYards = 0;
  let depthAfterBreakYards = 0;
  if (hasBreak) {
    const breakPt = path[breakIdx];
    depthAtBreakYards = pxToYardsY(start.y - breakPt.y);
    lateralAfterBreakYards = Math.abs(pxToYardsX(end.x - breakPt.x));
    depthAfterBreakYards = pxToYardsY(breakPt.y - end.y); // positive = continued downfield after break
  }

  // Determine inside/outside direction relative to the player's side
  // Left-side player: "inside" = moving right (toward center), "outside" = moving left
  // Right-side player: "inside" = moving left (toward center), "outside" = moving right
  const playerSide = getPlayerSide(player);
  const movedInside =
    (playerSide === 'left' && lateralPx > 0) ||
    (playerSide === 'right' && lateralPx < 0);
  const movedOutside =
    (playerSide === 'left' && lateralPx < 0) ||
    (playerSide === 'right' && lateralPx > 0);

  // Determine lateral movement after break
  let brokeInside = false;
  let brokeOutside = false;
  if (hasBreak) {
    const breakPt = path[breakIdx];
    const lateralAfterBreak = end.x - breakPt.x;
    brokeInside =
      (playerSide === 'left' && lateralAfterBreak > 0) ||
      (playerSide === 'right' && lateralAfterBreak < 0);
    brokeOutside =
      (playerSide === 'left' && lateralAfterBreak < 0) ||
      (playerSide === 'right' && lateralAfterBreak > 0);
  }

  // --- Classification logic ---

  // FLAT: shallow depth (< 3 yards), mostly lateral movement (> 3 yards lateral)
  if (depthYards < 3 && lateralYards > 3) {
    return 'flat';
  }

  // DRAG: shallow (< 5 yards depth), significant lateral movement crossing toward center
  if (depthYards >= 0 && depthYards < 5 && lateralYards > 5 && movedInside) {
    return 'drag';
  }

  // GO: deep vertical route with minimal lateral movement
  if (depthYards > 12 && lateralYards < 5 && !hasBreak) {
    return 'go';
  }

  // WHEEL: starts lateral (flat) then turns upfield - check for break + depth gain after
  if (hasBreak && depthAtBreakYards < 3 && depthAfterBreakYards > 8) {
    return 'wheel';
  }

  // Routes with a break point:
  if (hasBreak) {
    // HITCH / COMEBACK / CURL: route goes downfield then comes back toward LOS
    if (depthAtBreakYards > 3 && depthAfterBreakYards < -1) {
      if (depthAtBreakYards > 10) {
        return 'comeback';
      }
      // If the route also breaks inside on the way back, it's a curl
      if (brokeInside && lateralAfterBreakYards > 1) {
        return 'curl';
      }
      return 'hitch';
    }

    // CORNER: deep stem (> 10 yards) then breaks outside and continues gaining depth
    if (depthAtBreakYards > 10 && brokeOutside && lateralAfterBreakYards > 3) {
      return 'corner';
    }

    // POST: deep stem (> 10 yards) then breaks inside
    if (depthAtBreakYards > 10 && brokeInside && lateralAfterBreakYards > 3) {
      return 'post';
    }

    // OUT: medium depth stem (5-15 yards) then breaks outside
    if (
      depthAtBreakYards >= 5 &&
      depthAtBreakYards <= 15 &&
      brokeOutside &&
      lateralAfterBreakYards > 2
    ) {
      return 'out';
    }

    // IN (dig): medium depth stem then breaks inside
    if (
      depthAtBreakYards >= 5 &&
      depthAtBreakYards <= 15 &&
      brokeInside &&
      lateralAfterBreakYards > 2
    ) {
      return 'in';
    }

    // SLANT: short stem (< 5 yards) then breaks inside
    if (depthAtBreakYards < 5 && brokeInside && lateralAfterBreakYards > 1) {
      return 'slant';
    }

    // CURL: medium depth then slight turn back inside (less comeback than hitch)
    if (depthAtBreakYards >= 5 && depthAfterBreakYards < 0 && brokeInside) {
      return 'curl';
    }
  }

  // No break routes:
  // SLANT (no break variant): angled inside, moderate depth, significant lateral
  if (!hasBreak && depthYards >= 3 && depthYards <= 12 && movedInside && lateralYards > 3) {
    return 'slant';
  }

  // HITCH (no break variant): short depth, stops (path is short, minimal lateral)
  if (!hasBreak && depthYards >= 3 && depthYards <= 8 && lateralYards < 3) {
    return 'hitch';
  }

  return 'custom';
}

// --- Concept Detection ---

interface ClassifiedRoute {
  route: Route;
  player: Player;
  shape: RouteShape;
  side: 'left' | 'right';
  depthYards: number;
}

function classifyAllRoutes(play: Play): ClassifiedRoute[] {
  const results: ClassifiedRoute[] = [];
  for (const route of play.routes) {
    const player = play.players.find((p) => p.id === route.playerId);
    if (!player) continue;
    if (!route.path || route.path.length < 2) continue;

    const shape = classifyRoute(route, player);
    const side = getPlayerSide(player);
    const start = route.path[0];
    const end = route.path[route.path.length - 1];
    const depthYards = pxToYardsY(start.y - end.y);

    results.push({ route, player, shape, side, depthYards });
  }
  return results;
}

function detectSmash(classified: ClassifiedRoute[]): DetectedConcept | null {
  // Smash: Hitch + Corner combination on the same side (high-low read)
  const hitches = classified.filter((r) => r.shape === 'hitch' || r.shape === 'curl');
  const corners = classified.filter((r) => r.shape === 'corner');

  let bestConfidence = 0;
  let matchedRoutes: string[] = [];

  for (const hitch of hitches) {
    for (const corner of corners) {
      if (hitch.side === corner.side) {
        // Perfect match: same side hitch + corner
        const conf = hitch.shape === 'hitch' ? 0.95 : 0.8; // curl variant is slightly lower
        if (conf > bestConfidence) {
          bestConfidence = conf;
          matchedRoutes = [hitch.route.id, corner.route.id];
        }
      }
    }
  }

  if (bestConfidence > 0) {
    return {
      conceptId: 'smash',
      conceptName: 'Smash',
      confidence: bestConfidence,
      matchedRoutes,
      description:
        'High-low read with a hitch/curl underneath and a corner route over the top on the same side.',
    };
  }
  return null;
}

function detectMesh(classified: ClassifiedRoute[]): DetectedConcept | null {
  // Mesh: Two crossing routes (in/drag) from OPPOSITE sides
  const crossingRoutes = classified.filter(
    (r) => r.shape === 'in' || r.shape === 'drag' || r.shape === 'slant'
  );

  let bestConfidence = 0;
  let matchedRoutes: string[] = [];

  for (let i = 0; i < crossingRoutes.length; i++) {
    for (let j = i + 1; j < crossingRoutes.length; j++) {
      const a = crossingRoutes[i];
      const b = crossingRoutes[j];

      // Must be from opposite sides
      if (a.side === b.side) continue;

      // Best if both are drags or ins at similar depth
      let conf = 0.7;
      if (
        (a.shape === 'drag' || a.shape === 'in') &&
        (b.shape === 'drag' || b.shape === 'in')
      ) {
        conf = 0.9;
        // Bonus for similar depth (within 3 yards)
        if (Math.abs(a.depthYards - b.depthYards) < 3) {
          conf = 0.95;
        }
      }

      if (conf > bestConfidence) {
        bestConfidence = conf;
        matchedRoutes = [a.route.id, b.route.id];
      }
    }
  }

  if (bestConfidence > 0) {
    return {
      conceptId: 'mesh',
      conceptName: 'Mesh',
      confidence: bestConfidence,
      matchedRoutes,
      description:
        'Two receivers run crossing routes from opposite sides of the formation, creating a natural pick/rub.',
    };
  }
  return null;
}

function detectFlood(classified: ClassifiedRoute[]): DetectedConcept | null {
  // Flood: Three routes to the same side at three DISTINCT depths (flat, out/in, corner/post)
  // Depths: shallow (< 5 yards), medium (5-15 yards), deep (> 15 yards)
  const sides: Array<'left' | 'right'> = ['left', 'right'];

  let bestConfidence = 0;
  let matchedRoutes: string[] = [];

  for (const side of sides) {
    const sideRoutes = classified.filter((r) => r.side === side);

    const shallow = sideRoutes.filter(
      (r) => r.depthYards < 5 && (r.shape === 'flat' || r.shape === 'drag')
    );
    const medium = sideRoutes.filter(
      (r) =>
        r.depthYards >= 5 &&
        r.depthYards <= 15 &&
        (r.shape === 'out' || r.shape === 'in' || r.shape === 'curl' || r.shape === 'hitch')
    );
    const deep = sideRoutes.filter(
      (r) =>
        r.depthYards > 12 &&
        (r.shape === 'corner' || r.shape === 'post' || r.shape === 'go' || r.shape === 'comeback')
    );

    if (shallow.length > 0 && medium.length > 0 && deep.length > 0) {
      let conf = 0.85;
      // Higher confidence for canonical flat + out + corner
      const hasFlat = shallow.some((r) => r.shape === 'flat');
      const hasOut = medium.some((r) => r.shape === 'out');
      const hasCorner = deep.some((r) => r.shape === 'corner');
      if (hasFlat && hasOut && hasCorner) conf = 0.95;

      if (conf > bestConfidence) {
        bestConfidence = conf;
        matchedRoutes = [shallow[0].route.id, medium[0].route.id, deep[0].route.id];
      }
    }
  }

  if (bestConfidence > 0) {
    return {
      conceptId: 'flood',
      conceptName: 'Flood',
      confidence: bestConfidence,
      matchedRoutes,
      description:
        'Three routes to the same side at three different depths, flooding the zone coverage.',
    };
  }
  return null;
}

function detectFourVerts(classified: ClassifiedRoute[]): DetectedConcept | null {
  // Four Verts: 4+ vertical (go) routes
  const goRoutes = classified.filter((r) => r.shape === 'go');

  if (goRoutes.length >= 4) {
    const conf = Math.min(1.0, 0.85 + (goRoutes.length - 4) * 0.05);
    return {
      conceptId: 'four_verts',
      conceptName: 'Four Verticals',
      confidence: conf,
      matchedRoutes: goRoutes.map((r) => r.route.id),
      description:
        'Four or more receivers running vertical routes to stretch the defense deep.',
    };
  }
  return null;
}

function detectSpacing(classified: ClassifiedRoute[]): DetectedConcept | null {
  // Spacing: 5 receivers at different levels across the field
  // Need routes at multiple different depths spread across the field
  if (classified.length < 5) return null;

  // Group by depth buckets: 0-3, 3-8, 8-12, 12-18, 18+
  const buckets = [
    classified.filter((r) => r.depthYards < 3),
    classified.filter((r) => r.depthYards >= 3 && r.depthYards < 8),
    classified.filter((r) => r.depthYards >= 8 && r.depthYards < 12),
    classified.filter((r) => r.depthYards >= 12 && r.depthYards < 18),
    classified.filter((r) => r.depthYards >= 18),
  ];

  const occupiedBuckets = buckets.filter((b) => b.length > 0).length;

  if (occupiedBuckets >= 4) {
    // Also check lateral spread - need both sides
    const leftCount = classified.filter((r) => r.side === 'left').length;
    const rightCount = classified.filter((r) => r.side === 'right').length;

    if (leftCount >= 1 && rightCount >= 1) {
      const conf = 0.7 + (occupiedBuckets - 4) * 0.1;
      return {
        conceptId: 'spacing',
        conceptName: 'Spacing',
        confidence: Math.min(conf, 0.95),
        matchedRoutes: classified.map((r) => r.route.id),
        description:
          'Five receivers spread across different levels and areas of the field to create windows in zone coverage.',
      };
    }
  }
  return null;
}

function detectLevels(classified: ClassifiedRoute[]): DetectedConcept | null {
  // Levels: Two horizontal routes at different depths to the same side
  const inOutRoutes = classified.filter(
    (r) => r.shape === 'in' || r.shape === 'out' || r.shape === 'drag' ||
           r.shape === 'curl' || r.shape === 'hitch'
  );

  let bestConfidence = 0;
  let matchedRoutes: string[] = [];

  for (let i = 0; i < inOutRoutes.length; i++) {
    for (let j = i + 1; j < inOutRoutes.length; j++) {
      const a = inOutRoutes[i];
      const b = inOutRoutes[j];

      // Same side
      if (a.side !== b.side) continue;

      // Different depths (at least 3 yards apart)
      const depthDiff = Math.abs(a.depthYards - b.depthYards);
      if (depthDiff < 3) continue;

      let conf = 0.8;
      // Higher confidence for classic in routes at different depths
      if (a.shape === 'in' && b.shape === 'in') conf = 0.95;
      else if (
        (a.shape === 'in' || a.shape === 'out') &&
        (b.shape === 'in' || b.shape === 'out')
      )
        conf = 0.9;

      if (conf > bestConfidence) {
        bestConfidence = conf;
        matchedRoutes = [a.route.id, b.route.id];
      }
    }
  }

  if (bestConfidence > 0) {
    return {
      conceptId: 'levels',
      conceptName: 'Levels',
      confidence: bestConfidence,
      matchedRoutes,
      description:
        'Two horizontal routes at different depths on the same side, creating a high-low read on the underneath defender.',
    };
  }
  return null;
}

function detectSlantFlat(classified: ClassifiedRoute[]): DetectedConcept | null {
  // Slant + Flat combination on the same side
  const slants = classified.filter((r) => r.shape === 'slant');
  const flats = classified.filter((r) => r.shape === 'flat');

  let bestConfidence = 0;
  let matchedRoutes: string[] = [];

  for (const slant of slants) {
    for (const flat of flats) {
      if (slant.side === flat.side) {
        const conf = 0.9;
        if (conf > bestConfidence) {
          bestConfidence = conf;
          matchedRoutes = [slant.route.id, flat.route.id];
        }
      }
    }
  }

  if (bestConfidence > 0) {
    return {
      conceptId: 'slant_flat',
      conceptName: 'Slant-Flat',
      confidence: bestConfidence,
      matchedRoutes,
      description:
        'A slant route combined with a flat route on the same side, creating a high-low read on the flat defender.',
    };
  }
  return null;
}

function detectCurlFlat(classified: ClassifiedRoute[]): DetectedConcept | null {
  // Curl/Hitch + Flat combination on the same side
  const curlsHitches = classified.filter(
    (r) => r.shape === 'curl' || r.shape === 'hitch'
  );
  const flats = classified.filter((r) => r.shape === 'flat');

  let bestConfidence = 0;
  let matchedRoutes: string[] = [];

  for (const curlHitch of curlsHitches) {
    for (const flat of flats) {
      if (curlHitch.side === flat.side) {
        let conf = curlHitch.shape === 'curl' ? 0.9 : 0.85;
        if (conf > bestConfidence) {
          bestConfidence = conf;
          matchedRoutes = [curlHitch.route.id, flat.route.id];
        }
      }
    }
  }

  if (bestConfidence > 0) {
    return {
      conceptId: 'curl_flat',
      conceptName: 'Curl-Flat',
      confidence: bestConfidence,
      matchedRoutes,
      description:
        'A curl or hitch route combined with a flat route on the same side, reading the flat defender.',
    };
  }
  return null;
}

export function detectConcepts(play: Play): DetectedConcept[] {
  if (!play.routes || play.routes.length === 0 || !play.players || play.players.length === 0) {
    return [];
  }

  const classified = classifyAllRoutes(play);

  if (classified.length === 0) return [];

  const detectors = [
    detectSmash,
    detectMesh,
    detectFlood,
    detectFourVerts,
    detectSpacing,
    detectLevels,
    detectSlantFlat,
    detectCurlFlat,
  ];

  const concepts: DetectedConcept[] = [];
  for (const detect of detectors) {
    const result = detect(classified);
    if (result) {
      concepts.push(result);
    }
  }

  // Sort by confidence descending
  concepts.sort((a, b) => b.confidence - a.confidence);

  return concepts;
}
