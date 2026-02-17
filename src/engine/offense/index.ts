/**
 * Offensive Engine - Public API
 * Re-exports all types, data, and functions for the offensive engine.
 */

// Types
export type {
  RouteDef,
  ConceptDef,
  ConceptRoute,
  SpacingRule,
  TimingRule,
  BreakDirection,
  ReleaseType,
  RouteTag,
  DropType,
  SpacingRuleType,
  PositionedRoutePoint,
  SpacingWarning,
  PlayerRole,
  PlayRouteInstance,
} from './schema';

// Data
export { routes, concepts, spacingRules, timingRules } from './data.moderate';

// Concept detection
export { detectConcept, getAllConcepts, getConceptById } from './conceptDetection';

// Spacing engine
export { checkVerticalSpacing, checkHorizontalSpacing, checkAllSpacing } from './spacingEngine';

// Validators
export { isRouteAllowedForDrop, getRoutesForDrop, getTimingRule, validateRouteDef } from './validators';

// Smart routing
export { getSmartRouteRecommendations } from './smartRouting';
export type { RecommendedRoute } from './smartRouting';
