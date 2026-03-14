/**
 * playbook.ts — Types for the concept detection engine, route definitions,
 * and playbook intelligence layer. These complement the Firestore Play/Route
 * types and are used by the offline coaching engine (Sessions 6–11).
 */

// ---------------------------------------------------------------------------
// Route Definitions (used by routeDefinitions.ts / conceptService.ts)
// ---------------------------------------------------------------------------

export type FootballRouteId =
  | 'go'
  | 'slant'
  | 'out'
  | 'in'
  | 'corner'
  | 'post'
  | 'hitch'
  | 'flat'
  | 'drag'
  | 'dig'
  | 'curl'
  | 'wheel'
  | 'comeback'
  | 'seam'
  | 'shallow_cross'
  | 'option'
  | 'bubble_screen'
  | 'streak';

export interface RouteDefinition {
  id: FootballRouteId;
  name: string;
  /** Typical depth in yards */
  depth: number;
  /** Route tree number (1–9 system), if applicable */
  routeTreeNumber?: number;
  /** e.g. 'vertical', 'horizontal', 'breaking' */
  family: string;
  /** Natural language coaching cue */
  coachingCue: string;
  /** QB drop timing */
  timing: '1-step' | '3-step' | '5-step' | '7-step' | 'quick' | 'play-action';
  /** Default waypoints (relative to player start, in yards) */
  defaultWaypoints: Waypoint[];
}

export interface Waypoint {
  /** X offset in yards (positive = toward right sideline) */
  dx: number;
  /** Y offset in yards (positive = downfield / toward end zone) */
  dy: number;
}

// ---------------------------------------------------------------------------
// Concept Definitions (used by conceptService.ts)
// ---------------------------------------------------------------------------

export type CoverageShell =
  | 'cover_0'
  | 'cover_1'
  | 'cover_2'
  | 'tampa_2'
  | 'cover_3'
  | 'cover_4'
  | 'cover_6'
  | 'man_coverage';

export interface ConceptDefinition {
  id: string;
  name: string;
  /** Routes that must be present for this concept to fire */
  requiredRoutes: FootballRouteId[];
  /** Minimum number of requiredRoutes that must match for a partial detection */
  minMatchCount: number;
  /** Which coverages this concept attacks effectively */
  coverageBeaters: CoverageShell[];
  /** Coverage shells this concept is weak against */
  weakVs: CoverageShell[];
  /** The stress mechanism — high-low, horizontal stretch, triangle, etc. */
  mechanism: string;
  /** Coaching cue shown in the UI */
  coachingCue: string;
  /** Detection priority — lower number = evaluated first in disambiguation */
  priority: number;
}

// ---------------------------------------------------------------------------
// Concept Detection Results
// ---------------------------------------------------------------------------

export interface ConceptDetectionResult {
  conceptId: string;
  conceptName: string;
  coverageBeaters: string[];
  confidence: 'exact' | 'partial';
  matchedRoutes: string[];
  coachingCue: string;
}

// ---------------------------------------------------------------------------
// Playbook Engine Play — lightweight type for the engine layer.
// Maps from the Firestore Play type for detection purposes.
// ---------------------------------------------------------------------------

export interface EnginePlayer {
  id: string;
  x: number;
  y: number;
  position: string;
  /** Football route assigned to this player (if any) */
  assignedRoute?: FootballRouteId;
  /** Route waypoints (in yards, relative to player position) */
  routeWaypoints?: Waypoint[];
}

export interface EnginePlay {
  id: string;
  name: string;
  formation: string;
  players: EnginePlayer[];
}
