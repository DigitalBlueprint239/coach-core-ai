import { PracticeSuggestionOutput, validatePracticeSuggestionOutput } from '../../ai/contract/practiceSuggestion';

export const PRACTICE_PLAN_STORAGE_KEY = 'coachcore.practice.latest';

export const persistValidatedPracticePlan = (
  plan: PracticeSuggestionOutput,
  metadata: Record<string, unknown>,
  storage: Pick<Storage, 'setItem'> = localStorage
): boolean => {
  const validation = validatePracticeSuggestionOutput(plan);
  if (!validation.valid) return false;

  storage.setItem(
    PRACTICE_PLAN_STORAGE_KEY,
    JSON.stringify({ plan, metadata, savedAt: new Date().toISOString() })
  );

  return true;
};

export const persistValidatedSegmentUpdate = (
  currentPlan: PracticeSuggestionOutput,
  updatedSegment: PracticeSuggestionOutput['segments'][number],
  metadata: Record<string, unknown>,
  storage: Pick<Storage, 'setItem'> = localStorage
): boolean => {
  const merged: PracticeSuggestionOutput = {
    ...currentPlan,
    segments: currentPlan.segments.map((s) => (s.id === updatedSegment.id ? updatedSegment : s))
  };

  return persistValidatedPracticePlan(merged, metadata, storage);
};
