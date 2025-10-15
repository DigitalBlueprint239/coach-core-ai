import { AIPracticePlanRequest } from '../services/ai/enhanced-ai-service';
import { PracticePlan, PracticePeriod } from '../services/ai/ai-service';

export interface ValidationResult {
  check: string;
  passed: boolean;
  message: string;
  details?: string;
}

export interface PlanValidationSummary {
  passed: boolean;
  requestedDuration: number;
  scheduledDuration: number;
  drillDuration: number;
  results: ValidationResult[];
}

const DURATION_TOLERANCE_MINUTES = 5;
const MIN_PERIOD_COUNT = 3;

function sumPeriodDuration(periods: PracticePeriod[]): number {
  return periods.reduce((total, period) => total + period.duration, 0);
}

function sumDrillDuration(periods: PracticePeriod[]): number {
  return periods.reduce((total, period) => {
    const drillTotal = period.drills.reduce((inner, drill) => inner + drill.duration, 0);
    return total + drillTotal;
  }, 0);
}

function hasMissingCriticalFields(plan: PracticePlan): string[] {
  const missing: string[] = [];

  if (!plan.title) missing.push('title');
  if (!plan.sport) missing.push('sport');
  if (!plan.ageGroup) missing.push('ageGroup');
  if (!plan.goals || plan.goals.length === 0) missing.push('goals');
  if (!plan.periods || plan.periods.length === 0) missing.push('periods');

  plan.periods.forEach((period, periodIndex) => {
    if (!period.name) missing.push(`periods[${periodIndex}].name`);
    if (period.duration <= 0) missing.push(`periods[${periodIndex}].duration`);
    period.drills.forEach((drill, drillIndex) => {
      if (!drill.name) missing.push(`periods[${periodIndex}].drills[${drillIndex}].name`);
      if (drill.duration <= 0) missing.push(`periods[${periodIndex}].drills[${drillIndex}].duration`);
      if (!drill.description) missing.push(`periods[${periodIndex}].drills[${drillIndex}].description`);
    });
  });

  return missing;
}

function validateDuration(request: AIPracticePlanRequest, plan: PracticePlan): ValidationResult {
  const scheduled = sumPeriodDuration(plan.periods);
  const difference = Math.abs(scheduled - request.duration);

  // The duration tolerance accounts for drills that may slightly expand or compress the schedule.
  const passed = difference <= DURATION_TOLERANCE_MINUTES;
  return {
    check: 'Duration Alignment',
    passed,
    message: passed
      ? `Scheduled ${scheduled} min matches request (${request.duration} min) within ±${DURATION_TOLERANCE_MINUTES}.`
      : `Scheduled ${scheduled} min deviates from requested ${request.duration} min by ${difference} min.`,
  };
}

function validateDrillCoverage(plan: PracticePlan, requestedDuration: number): ValidationResult {
  const drillMinutes = sumDrillDuration(plan.periods);
  const coverage = plan.periods.length > 0 ? (drillMinutes / requestedDuration) * 100 : 0;
  const passed = coverage >= 60; // Require at least 60% of requested time to be planned drills.

  return {
    check: 'Drill Coverage',
    passed,
    message: passed
      ? `Drills cover ${coverage.toFixed(1)}% of the requested time.`
      : `Only ${coverage.toFixed(1)}% of the requested time is covered by explicit drills. Add more structured work.`,
  };
}

function validateStructure(plan: PracticePlan): ValidationResult {
  if (plan.periods.length < MIN_PERIOD_COUNT) {
    return {
      check: 'Session Structure',
      passed: false,
      message: `Only ${plan.periods.length} period(s) detected. Minimum of ${MIN_PERIOD_COUNT} recommended for balanced session.`,
    };
  }

  const firstPeriod = plan.periods[0];
  const lastPeriod = plan.periods[plan.periods.length - 1];
  const hasWarmup = /warm|activation|prep/i.test(firstPeriod.name) || firstPeriod.intensity === 'low';
  const hasCooldown = /cool|recover|wrap up/i.test(lastPeriod.name) || lastPeriod.intensity === 'low';
  const hasHighIntensityBlock = plan.periods.some(period => period.intensity === 'high' || /scrimmage|competition|team/i.test(period.name));

  const missingPhases: string[] = [];
  if (!hasWarmup) missingPhases.push('warm-up');
  if (!hasHighIntensityBlock) missingPhases.push('game-speed focus');
  if (!hasCooldown) missingPhases.push('cool-down');

  const passed = missingPhases.length === 0;
  return {
    check: 'Progressive Flow',
    passed,
    message: passed
      ? 'Warm-up, high-intensity, and cool-down phases detected in logical order.'
      : `Missing phases: ${missingPhases.join(', ')}. Ensure progression warm-up → intensity → cool-down.`,
  };
}

function validateAgeAppropriateness(request: AIPracticePlanRequest, plan: PracticePlan): ValidationResult {
  const numericAge = Number.parseInt(request.ageGroup.replace('U', ''), 10);
  if (Number.isNaN(numericAge)) {
    return {
      check: 'Age Appropriateness',
      passed: true,
      message: 'Age group not specified — skipping youth content checks.',
    };
  }

  const restrictedKeywords = ['press', 'complex set', 'isolation', 'triangle', 'double screen'];
  const flagged: string[] = [];

  if (numericAge <= 10) {
    plan.periods.forEach(period => {
      period.drills.forEach(drill => {
        restrictedKeywords.forEach(keyword => {
          if (new RegExp(keyword, 'i').test(drill.description)) {
            flagged.push(`${drill.name} references "${keyword}"`);
          }
        });
        if (drill.duration > 15) {
          flagged.push(`${drill.name} duration ${drill.duration} min may be long for ${request.ageGroup}.`);
        }
      });
    });
  }

  const passed = flagged.length === 0;
  return {
    check: 'Age Appropriateness',
    passed,
    message: passed ? `Content suitable for ${request.ageGroup} athletes.` : flagged.join(' '),
  };
}

function validateRequiredFields(plan: PracticePlan): ValidationResult {
  const missing = hasMissingCriticalFields(plan);
  return {
    check: 'Required Fields',
    passed: missing.length === 0,
    message:
      missing.length === 0
        ? 'All critical fields populated.'
        : `Missing or invalid fields: ${missing.join(', ')}.`,
  };
}

export function validatePracticePlan(
  plan: PracticePlan,
  request: AIPracticePlanRequest
): PlanValidationSummary {
  const durationResult = validateDuration(request, plan);
  const drillCoverageResult = validateDrillCoverage(plan, request.duration);
  const structureResult = validateStructure(plan);
  const requiredFieldsResult = validateRequiredFields(plan);
  const ageAppropriateResult = validateAgeAppropriateness(request, plan);

  const results = [
    durationResult,
    drillCoverageResult,
    structureResult,
    requiredFieldsResult,
    ageAppropriateResult,
  ];

  const summary: PlanValidationSummary = {
    passed: results.every(result => result.passed),
    requestedDuration: request.duration,
    scheduledDuration: sumPeriodDuration(plan.periods),
    drillDuration: sumDrillDuration(plan.periods),
    results,
  };

  return summary;
}
