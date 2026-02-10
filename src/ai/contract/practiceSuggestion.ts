export interface PracticeSuggestionInput {
  sport: string;
  ageGroup: string;
  skillLevel: string;
  rosterSize: number;
  durationMinutes: number;
  equipmentAvailable: string[];
  focusGoals: string[];
  coachStyleProfile: {
    tone: string;
    philosophy: string;
  };
}

export interface PracticeSuggestionSegment {
  id: string;
  minutes: number;
  setup: string;
  coachingPoints: string[];
  variations: string[];
  regenerated?: boolean;
}

export interface PracticeSuggestionOutput {
  title: string;
  segments: PracticeSuggestionSegment[];
  whyThisPlan: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const validatePracticeSuggestionOutput = (value: unknown): ValidationResult => {
  const errors: string[] = [];
  const output = value as PracticeSuggestionOutput;

  if (!output || typeof output !== 'object') errors.push('Output must be an object.');
  if (!output?.title || typeof output.title !== 'string') errors.push('title is required.');
  if (!Array.isArray(output?.segments)) errors.push('segments must be an array.');
  if (Array.isArray(output?.segments) && (output.segments.length < 4 || output.segments.length > 8)) {
    errors.push('segments must include 4-8 entries.');
  }
  if (!output?.whyThisPlan || typeof output.whyThisPlan !== 'string') errors.push('whyThisPlan is required.');

  if (Array.isArray(output?.segments)) {
    output.segments.forEach((segment, idx) => {
      if (!segment.id) errors.push(`segments[${idx}].id is required.`);
      if (typeof segment.minutes !== 'number' || segment.minutes <= 0) errors.push(`segments[${idx}].minutes must be > 0.`);
      if (!segment.setup) errors.push(`segments[${idx}].setup is required.`);
      if (!Array.isArray(segment.coachingPoints)) errors.push(`segments[${idx}].coachingPoints must be array.`);
      if (!Array.isArray(segment.variations)) errors.push(`segments[${idx}].variations must be array.`);
    });
  }

  return { valid: errors.length === 0, errors };
};

export const isMedicalAdviceRequest = (input: PracticeSuggestionInput): boolean => {
  const text = [...input.focusGoals, input.coachStyleProfile.philosophy, input.coachStyleProfile.tone].join(' ').toLowerCase();
  return ['injury', 'medical', 'rehab', 'concussion', 'diagnose', 'treatment'].some((term) => text.includes(term));
};

export const adaptToPracticeSuggestionOutput = (
  response: any,
  input: PracticeSuggestionInput
): PracticeSuggestionOutput => {
  if (response?.segments) return response as PracticeSuggestionOutput;

  if (Array.isArray(response?.plan?.periods) && response.plan.periods.length > 0) {
    return {
      title: response.plan.name || `${input.sport} Practice Plan`,
      segments: response.plan.periods.slice(0, 8).map((p: any, i: number) => ({
        id: p.id || `seg-${i + 1}`,
        minutes: p.duration || Math.max(5, Math.floor(input.durationMinutes / 6)),
        setup: p.name || `Segment ${i + 1}`,
        coachingPoints: Array.isArray(p.drills) ? p.drills.slice(0, 3) : ['Focus on fundamentals'],
        variations: ['Scale intensity', 'Swap reps by skill level']
      })),
      whyThisPlan: `Built for ${input.ageGroup} ${input.sport} athletes with ${input.durationMinutes} minutes, ${input.rosterSize} players, and goals: ${input.focusGoals.join(', ')}.`
    };
  }

  return {
    title: `${input.sport} Practice Plan`,
    segments: [1,2,3,4].map((n) => ({
      id: `seg-${n}`,
      minutes: Math.max(10, Math.floor(input.durationMinutes / 4)),
      setup: `Segment ${n}`,
      coachingPoints: ['Communicate expectations', 'Run reps with feedback'],
      variations: ['Reduce space', 'Increase pace']
    })),
    whyThisPlan: `Fallback plan created for ${input.sport} (${input.ageGroup}) to meet ${input.durationMinutes} minute session constraints.`
  };
};
