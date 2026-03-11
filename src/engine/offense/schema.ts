export type FormationId = string;
export type RouteId = string;
export type ConceptId = string;
export type CoverageId = string;

export interface Formation {
  formation_id: FormationId;
  formation_name: string;
  personnel: string;
  alignment: {
    left_side: string[];
    right_side: string[];
    backfield: string[];
  };
  spacing: {
    wr_splits: number[];
    ol_splits: number[];
    rb_depth: number;
  };
  strength: 'left' | 'right' | 'balanced';
  coverage_stress_points: string[];
}

export interface Route {
  route_id: RouteId;
  route_number: number;
  route_name: string;
  depth_yards: number;
  break_direction: 'inside' | 'outside' | 'vertical' | 'stop';
  stem: string;
  timing_second: number;
  release_type?: string;
  key_coaching_points?: string[];
  effective_vs_coverage?: string[];
  weak_vs_coverage?: string[];
  tags?: string[];
}

export interface ConceptCoreRoute {
  player: string;
  route: RouteId | string;
  depth?: number;
}

export interface Concept {
  concept_id: ConceptId;
  concept_name: string;
  core_routes: ConceptCoreRoute[];
  spacing?: {
    vertical_separation?: number[];
    horizontal_separation?: number[];
    triangle_concept?: boolean;
  };
  read_progression?: string[];
  key_defenders?: string[];
  best_vs?: string[];
  weak_vs?: string[];
  qb_key?: string;
  coaching_cue?: string;
}

export interface SpacingRule {
  rule_id: string;
  rule_type: 'spacing_constraint';
  parameter: 'vertical_separation_yards' | 'horizontal_separation_yards';
  min_value: number;
  max_value: number;
  violation_outcome: string;
  correction: string;
}

export interface TimingRule {
  timing_id: string;
  drop_type: 'three_step' | 'five_step' | 'seven_step' | 'play_action';
  drop_duration_seconds: number;
  route_numbers_allowed: number[];
}

export interface Motion {
  motion_id: string;
  motion_type: 'jet' | 'orbit' | 'yoyo' | 'rb_fast_flow' | 'shift';
  starting_position: string;
  ending_position: string;
}
