import type { IntelligenceRecommendation } from '../../contracts/intelligence';

export const buildAdjustmentSuggestions = (
  recommendations: IntelligenceRecommendation[],
): string[] => recommendations.map((recommendation) => recommendation.action);
