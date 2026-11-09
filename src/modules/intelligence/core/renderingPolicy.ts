import type {
  AssistModeIssue,
  AssistModeView,
  CoachModeView,
  IntelligenceAnalysis,
  IntelligenceRecommendation,
} from '../contracts/intelligence';

const HIGH_CONFIDENCE = 0.85;
const MEDIUM_CONFIDENCE = 0.65;

export const getAssistModeView = <TDomain>(
  analysis: IntelligenceAnalysis<TDomain>,
): AssistModeView<TDomain> => {
  const surfacedIssues: AssistModeIssue[] = analysis.issues
    .filter((issue) => issue.severity === 'critical' || issue.confidence >= HIGH_CONFIDENCE)
    .map((issue) => ({
      ...issue,
      displayMode: issue.confidence >= HIGH_CONFIDENCE ? 'full' : 'chip',
      coachOnlyDetails: undefined,
    }));

  const surfacedRecommendations: IntelligenceRecommendation[] = analysis.recommendations.filter(
    (recommendation) => recommendation.confidence >= MEDIUM_CONFIDENCE,
  );

  const oneClickFixes = surfacedIssues.flatMap((issue) => issue.quickFixes).slice(0, 3);

  return {
    domainType: analysis.domainType,
    detectedPatterns: analysis.detectedPatterns,
    surfacedIssues,
    surfacedRecommendations,
    oneClickFixes,
    domain: analysis.domain,
  };
};

export const getCoachModeView = <TDomain>(
  analysis: IntelligenceAnalysis<TDomain>,
): CoachModeView<TDomain> => ({
  domainType: analysis.domainType,
  analysis,
});

export const applyConfidenceGating = <TDomain>(
  analysis: IntelligenceAnalysis<TDomain>,
): IntelligenceAnalysis<TDomain> => {
  const filteredRecommendations = analysis.recommendations.filter(
    (recommendation) => recommendation.confidence >= MEDIUM_CONFIDENCE,
  );

  return {
    ...analysis,
    recommendations: filteredRecommendations,
  };
};
