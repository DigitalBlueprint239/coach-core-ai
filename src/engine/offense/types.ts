export interface EngineRoute {
  route_id: string;
  route_name: string;
  route_number: number; // 0-9 by tree; -1 for specialty
  depth_yards: number;
  break_direction: 'inside' | 'outside' | 'vertical' | 'stop' | 'diagonal-in' | 'diagonal-out';
  tags: string[];
  description: string;
}

export interface EngineConcept {
  concept_id: string;
  concept_name: string;
  required_routes: string[]; // route names that must ALL be present
  optional_routes?: string[]; // route names where at least one must be present
  min_match?: number; // minimum number of required_routes to match (default = all)
  description: string;
  coaching_cue: string;
}

export interface SpacingRule {
  rule_id: string;
  min_yards_apart: number;
  context: string;
  message: string;
}

export interface PlayRouteInstance {
  playerId: string;
  routeName: string;
}

export interface PositionedRoutePoint {
  routeId: string;
  x: number;
  y: number;
}

export interface SpacingWarning {
  routeId1: string;
  routeId2: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface DetectedConcept {
  concept: EngineConcept;
  matchedRoutes: string[];
}

export interface EngineData {
  routes: EngineRoute[];
  concepts: EngineConcept[];
  spacingRules: SpacingRule[];
}
