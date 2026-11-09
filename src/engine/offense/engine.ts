import {
  Formation,
  Route,
  Concept,
  SpacingRule,
  TimingRule,
} from './schema';
import {
  formations as rawFormations,
  routes as rawRoutes,
  concepts as rawConcepts,
  spacingRules as rawSpacingRules,
  timingRules as rawTimingRules,
} from './data.moderate';
import {
  validateFormation,
  validateRoute,
  validateConcept,
  validateSpacingRule,
  validateTimingRule,
} from './validators';

export interface OffensiveEngineData {
  formations: Formation[];
  routes: Route[];
  concepts: Concept[];
  spacingRules: SpacingRule[];
  timingRules: TimingRule[];
}

function safeLoad<T>(
  items: T[],
  validate: (item: T) => string[],
  label: string,
): T[] {
  const valid: T[] = [];
  items.forEach((item) => {
    const errors = validate(item);
    if (errors.length) {
      console.warn(`[OffenseEngine] Invalid ${label}`, { item, errors });
    } else {
      valid.push(item);
    }
  });
  return valid;
}

let cachedData: OffensiveEngineData | null = null;

export function loadOffensiveEngineData(): OffensiveEngineData {
  if (cachedData) return cachedData;

  cachedData = {
    formations: safeLoad(rawFormations, validateFormation, 'formation'),
    routes: safeLoad(rawRoutes, validateRoute, 'route'),
    concepts: safeLoad(rawConcepts, validateConcept, 'concept'),
    spacingRules: safeLoad(rawSpacingRules, validateSpacingRule, 'spacingRule'),
    timingRules: safeLoad(rawTimingRules, validateTimingRule, 'timingRule'),
  };

  return cachedData;
}
