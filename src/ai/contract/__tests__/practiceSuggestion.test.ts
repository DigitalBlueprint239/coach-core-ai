import { describe, expect, it } from 'vitest';
import { isMedicalAdviceRequest, validatePracticeSuggestionOutput } from '../practiceSuggestion';

describe('practice suggestion contract', () => {
  it('validates a structured response', () => {
    const result = validatePracticeSuggestionOutput({
      title: 'Plan',
      whyThisPlan: 'Because constraints',
      segments: Array.from({ length: 4 }).map((_, i) => ({
        id: `s${i}`,
        minutes: 10,
        setup: 'Warmup',
        coachingPoints: ['A'],
        variations: ['B']
      }))
    });
    expect(result.valid).toBe(true);
  });

  it('rejects malformed response', () => {
    const result = validatePracticeSuggestionOutput({ title: 'x', segments: [] });
    expect(result.valid).toBe(false);
  });

  it('detects medical advice requests', () => {
    expect(isMedicalAdviceRequest({
      sport: 'football', ageGroup: 'hs', skillLevel: 'intermediate', rosterSize: 20, durationMinutes: 90,
      equipmentAvailable: ['cones'], focusGoals: ['injury recovery'], coachStyleProfile: { tone: 'calm', philosophy: 'safe' }
    })).toBe(true);
  });
});
