/**
 * schema.ts - Type definitions for the offensive engine
 * Defines Route, Concept, SpacingRule, TimingRule, and related types.
 */

// ============================================
// ROUTE DEFINITIONS
// ============================================

export type BreakDirection = 'inside' | 'outside' | 'vertical' | 'stop';
export type ReleaseType = 'vertical' | 'inside' | 'outside' | 'outside_quick' | 'lateral' | 'outside_stem';
export type RouteTag = 'quick' | 'short' | 'intermediate' | 'deep' | 'timing' |
  'zone_beater' | 'man_beater' | 'crosser' | 'big_play' | 'boundary_route' |
  'sideline_route' | 'screen' | 'rpo_eligible' | 'rb_route' | 'te_route';

export interface RouteDef {
  route_id: string;
  route_number: number;
  route_name: string;
  depth_yards: number;
  break_direction: BreakDirection;
  stem: string;
  timing_second: number;
  release_type: ReleaseType;
  key_coaching_points: string[];
  effective_vs_coverage: string[];
  weak_vs_coverage?: string[];
  tags: RouteTag[];
}

// ============================================
// CONCEPT DEFINITIONS
// ============================================

export interface ConceptRoute {
  player: string;
  route: string;
  depth: number;
}

export interface ConceptDef {
  concept_id: string;
  concept_name: string;
  core_routes: ConceptRoute[];
  spacing: {
    vertical_separation?: number[];
    horizontal_separation?: number[];
    triangle_concept?: boolean;
  };
  read_progression: string[];
  key_defenders: string[];
  best_vs: string[];
  weak_vs: string[];
  coaching_cue: string;
}

// ============================================
// SPACING RULES
// ============================================

export type SpacingRuleType = 'spacing_constraint';

export interface SpacingRule {
  rule_id: string;
  rule_type: SpacingRuleType;
  parameter: string;
  min_value: number;
  max_value: number;
  violation_outcome: string;
  correction: string;
}

// ============================================
// TIMING RULES
// ============================================

export type DropType = 'three_step' | 'five_step' | 'seven_step' | 'play_action';

export interface TimingRule {
  timing_id: string;
  drop_type: DropType;
  drop_duration_seconds: number;
  route_numbers_allowed: number[];
}

// ============================================
// SPACING ENGINE TYPES
// ============================================

export interface PositionedRoutePoint {
  routeId: string;
  x: number;
  y: number;
}

export interface SpacingWarning {
  type: string;
  message: string;
  involvedRouteIds: string[];
}

// ============================================
// PLAY-LEVEL TYPES (used for integration)
// ============================================

export type PlayerRole = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'FB';

export interface PlayRouteInstance {
  playerId: string;
  routeId: string;
  routeName: string;
  depth: number;
}
