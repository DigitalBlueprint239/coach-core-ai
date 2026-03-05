// Offensive Engine — Main Entry Point
// DO NOT MODIFY

import { OffensiveEngineData } from './schema';
import { offensiveEngineData } from './data.moderate';
import { validateRoute, validateFormation, validateConcept } from './validators';
import { detectConcept, PlayRouteInstance } from './conceptDetection';
import { checkSpacingViolations } from './spacingEngine';

export function loadOffensiveEngineData(): OffensiveEngineData {
  return offensiveEngineData;
}

export function getRouteById(routeId: string) {
  return offensiveEngineData.routes.find((r) => r.route_id === routeId) || null;
}

export function getFormationById(formationId: string) {
  return offensiveEngineData.formations.find((f) => f.formation_id === formationId) || null;
}

export function getConceptById(conceptId: string) {
  return offensiveEngineData.concepts.find((c) => c.concept_id === conceptId) || null;
}

export function analyzePlay(playRoutes: PlayRouteInstance[]) {
  const detectedConcept = detectConcept(playRoutes, offensiveEngineData.concepts);
  return {
    detectedConcept,
    routeCount: playRoutes.length,
  };
}

export function validateAllData() {
  const routeErrors = offensiveEngineData.routes.flatMap((r) =>
    validateRoute(r).map((e) => `Route ${r.route_id}: ${e}`)
  );
  const formationErrors = offensiveEngineData.formations.flatMap((f) =>
    validateFormation(f).map((e) => `Formation ${f.formation_id}: ${e}`)
  );
  const conceptErrors = offensiveEngineData.concepts.flatMap((c) =>
    validateConcept(c).map((e) => `Concept ${c.concept_id}: ${e}`)
  );
  return [...routeErrors, ...formationErrors, ...conceptErrors];
}

export { validateRoute, validateFormation, validateConcept, detectConcept, checkSpacingViolations };
export type { PlayRouteInstance };
