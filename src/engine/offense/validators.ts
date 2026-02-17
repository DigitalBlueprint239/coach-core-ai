/**
 * validators.ts - Validation utilities for the offensive engine
 */

import { RouteDef, TimingRule, DropType } from './schema';
import { routes, timingRules } from './data.moderate';

/**
 * Validates that a given route is allowed for a specific drop type.
 * Returns true if the route's route_number is in the timing rule's allowed list.
 */
export function isRouteAllowedForDrop(route: RouteDef, dropType: DropType): boolean {
  const rule = timingRules.find(t => t.drop_type === dropType);
  if (!rule) return false;
  return rule.route_numbers_allowed.includes(route.route_number);
}

/**
 * Returns all routes allowed for a given drop type.
 */
export function getRoutesForDrop(dropType: DropType): RouteDef[] {
  const rule = timingRules.find(t => t.drop_type === dropType);
  if (!rule) return [];
  return routes.filter(r => rule.route_numbers_allowed.includes(r.route_number));
}

/**
 * Returns the timing rule for a given drop type.
 */
export function getTimingRule(dropType: DropType): TimingRule | null {
  return timingRules.find(t => t.drop_type === dropType) || null;
}

/**
 * Validates that a route definition has all required fields.
 */
export function validateRouteDef(route: Partial<RouteDef>): string[] {
  const errors: string[] = [];
  if (!route.route_id) errors.push('Missing route_id');
  if (route.route_number === undefined) errors.push('Missing route_number');
  if (!route.route_name) errors.push('Missing route_name');
  if (route.depth_yards === undefined) errors.push('Missing depth_yards');
  if (!route.break_direction) errors.push('Missing break_direction');
  if (!route.stem) errors.push('Missing stem');
  if (route.timing_second === undefined) errors.push('Missing timing_second');
  if (!route.release_type) errors.push('Missing release_type');
  return errors;
}
