// Offensive Engine Schema
// DO NOT MODIFY — source of truth for all data types

export interface Route {
  route_id: string;
  route_number: number;
  route_name: string;
  depth_yards: number;
  break_direction: string;
  stem: string;
  timing_second: number;
  release_type: string;
  key_coaching_points: string[];
  effective_vs_coverage: string[];
  weak_vs_coverage: string[];
  tags: string[];
}

export interface FormationAlignment {
  left_side: string[];
  right_side: string[];
  backfield: string[];
}

export interface FormationSpacing {
  wr_splits: number[];
  ol_splits: number[];
  rb_depth: number;
}

export interface Formation {
  formation_id: string;
  formation_name: string;
  personnel: string;
  alignment: FormationAlignment;
  spacing: FormationSpacing;
  strength: string;
  coverage_stress_points: string[];
}

export interface CoreRoute {
  player: string;
  route: string;
  depth: number;
}

export interface ConceptSpacing {
  vertical_separation?: number[];
  horizontal_separation?: number[];
  triangle_concept?: boolean;
}

export interface Concept {
  concept_id: string;
  concept_name: string;
  core_routes: CoreRoute[];
  spacing: ConceptSpacing;
  read_progression: string[];
  key_defenders: string[];
  best_vs: string[];
  weak_vs: string[];
  qb_key: string;
  coaching_cue: string;
}

export interface TimingRule {
  timing_id: string;
  drop_type: string;
  drop_duration_seconds: number;
  route_numbers_allowed: number[];
}

export interface SpacingRule {
  rule_id: string;
  rule_type: string;
  parameter: string;
  min_value: number;
  max_value: number;
  violation_outcome: string;
  correction: string;
}

export interface OffensiveEngineData {
  routes: Route[];
  formations: Formation[];
  concepts: Concept[];
  timingRules: TimingRule[];
  spacingRules: SpacingRule[];
}
