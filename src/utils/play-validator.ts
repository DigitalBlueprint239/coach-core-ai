import { GeneratedPlay } from '../services/ai/types';
import { PlayScenario } from '../test/play-scenarios';

export interface PlayValidationResult {
  check: string;
  passed: boolean;
  message: string;
}

export interface PlayValidationSummary {
  passed: boolean;
  results: PlayValidationResult[];
}

const MIN_STEPS = 3;
const MAX_STEPS = 7;

const AGE_COMPLEXITY_LIMIT = new Map<number, string[]>([
  [10, ['isolation clear-out', 'double drag', 'horns']],
  [12, ['elevator', 'stagger double']],
]);

const POSITION_TITLES = ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'];

function ensureDefenseAlignment(play: GeneratedPlay, scenario: PlayScenario): PlayValidationResult {
  const { defenseScheme } = scenario.situation;
  const textAggregate = [play.description, ...(play.coachingPoints ?? []), ...(play.variations ?? [])]
    .join(' ')
    .toLowerCase();

  let expectedKeyword: string | null = null;
  if (defenseScheme === 'zone_2_3' || defenseScheme === 'zone_1_3_1') {
    expectedKeyword = 'zone';
  }
  if (defenseScheme === 'press_full_court') {
    expectedKeyword = 'press';
  }

  const passed = expectedKeyword ? textAggregate.includes(expectedKeyword) : true;

  return {
    check: 'Defense Alignment',
    passed,
    message: passed
      ? 'Play references opponent scheme.'
      : `Expected references to ${expectedKeyword ?? 'defense'} for ${defenseScheme}.`,
  };
}

function validatePositions(play: GeneratedPlay): PlayValidationResult {
  const positions = play.positions ?? [];
  const missingLabels = positions.filter(position => !position.position || position.position.trim().length === 0);
  const coverage = POSITION_TITLES.every(title => positions.some(p => p.position.toLowerCase().includes(title.split(' ')[0].toLowerCase())));

  const passed = missingLabels.length === 0 && positions.length >= 3 && coverage;

  return {
    check: 'Player Positions',
    passed,
    message: passed
      ? 'Player responsibilities clearly labeled for 1-5 positions.'
      : 'Ensure all player positions (1-5) are labeled with responsibilities.',
  };
}

function validateStepCount(play: GeneratedPlay): PlayValidationResult {
  const steps = play.coachingPoints ?? play.keySuccessFactors ?? [];
  const passed = steps.length >= MIN_STEPS && steps.length <= MAX_STEPS;

  return {
    check: 'Step Count',
    passed,
    message: passed
      ? `${steps.length} actionable coaching points detected.`
      : `Expected between ${MIN_STEPS} and ${MAX_STEPS} coaching points; found ${steps.length}.`,
  };
}

function validateTiming(play: GeneratedPlay): PlayValidationResult {
  const timingSources = [play.description, ...(play.coachingPoints ?? []), ...(play.variations ?? [])].join(' ');
  const timingRegex = /(shot clock|second|count|tempo|hold for|wait|at \\d{1,2}|\\d{1,2} seconds)/i;
  const hasTiming = timingRegex.test(timingSources);

  return {
    check: 'Timing Information',
    passed: hasTiming,
    message: hasTiming ? 'Timing cues present (shot clock / seconds references).' : 'Add explicit timing guidance for execution.',
  };
}

function validateAgeAppropriateness(play: GeneratedPlay, scenario: PlayScenario): PlayValidationResult {
  const numericAge = Number.parseInt(scenario.teamProfile.ageGroup.replace('U', ''), 10);
  if (Number.isNaN(numericAge)) {
    return {
      check: 'Age Appropriateness',
      passed: true,
      message: 'No age group specified – skipping youth complexity checks.',
    };
  }

  const restrictedTerms: string[] = [];
  AGE_COMPLEXITY_LIMIT.forEach((terms, ageLimit) => {
    if (numericAge <= ageLimit) {
      restrictedTerms.push(...terms);
    }
  });

  const combined = [play.description, ...(play.coachingPoints ?? []), ...(play.variations ?? [])]
    .join(' ')
    .toLowerCase();

  const flaggedTerm = restrictedTerms.find(term => combined.includes(term));

  return {
    check: 'Age Appropriateness',
    passed: !flaggedTerm,
    message: flaggedTerm
      ? `Term "${flaggedTerm}" may be advanced for ${scenario.teamProfile.ageGroup} athletes.`
      : `Content aligned with ${scenario.teamProfile.ageGroup} competency.`,
  };
}

export function validatePlayCall(play: GeneratedPlay, scenario: PlayScenario): PlayValidationSummary {
  const results: PlayValidationResult[] = [
    ensureDefenseAlignment(play, scenario),
    validatePositions(play),
    validateStepCount(play),
    validateTiming(play),
    validateAgeAppropriateness(play, scenario),
  ];

  return {
    passed: results.every(result => result.passed),
    results,
  };
}
