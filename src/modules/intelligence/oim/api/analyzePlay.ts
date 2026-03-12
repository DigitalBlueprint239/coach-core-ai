import type { IntelligenceAnalysis, IntelligenceScores } from '../../contracts/intelligence';
import type { AnalysisContext, CanonicalPlay } from '../../domains/canonicalPlay';
import { detectConcepts } from '../analysis/conceptDetection';
import { evaluateCoverageStress } from '../analysis/coverageStressEngine';
import { evaluateSpacing } from '../analysis/spacingEngine';
import { evaluateTiming } from '../analysis/timingEngine';
import { buildInstallCues } from '../coaching/installCues';
import { buildQbProgression } from '../coaching/qbProgressionBuilder';
import { buildAdjustmentSuggestions } from '../recommendations/adjustmentSuggestions';
import { rankSmartRouting } from '../recommendations/smartRouting';

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

const buildScores = (issueCount: number, stressScore: number): IntelligenceScores => {
  const base = clamp(1 - issueCount * 0.1);
  return {
    structuralScore: base,
    spacingScore: clamp(base - issueCount * 0.05),
    timingScore: clamp(base - issueCount * 0.04),
    integrityScore: clamp((base + (1 - stressScore)) / 2),
  };
};

export const analyzeOffensePlay = (
  play: CanonicalPlay,
  _context: AnalysisContext = {},
): IntelligenceAnalysis<CanonicalPlay> => {
  const detectedPatterns = detectConcepts(play);
  const spacingIssues = evaluateSpacing(play);
  const timingIssues = evaluateTiming(play);
  const issues = [...spacingIssues, ...timingIssues];
  const coverageStress = evaluateCoverageStress(play);
  const recommendations = rankSmartRouting(play, issues);
  const teachingPoints = [
    ...buildInstallCues(play),
    ...buildQbProgression(play),
    ...buildAdjustmentSuggestions(recommendations),
  ];

  const highConfidenceDetections = issues.filter((issue) => issue.confidence >= 0.85).length;
  const mediumConfidenceDetections = issues.filter(
    (issue) => issue.confidence >= 0.65 && issue.confidence < 0.85,
  ).length;
  const lowConfidenceDetections = issues.filter((issue) => issue.confidence < 0.65).length;

  return {
    domainType: 'offense',
    detectedPatterns,
    issues,
    recommendations,
    scores: buildScores(issues.length, coverageStress.stressScore),
    teachingPoints,
    confidenceSummary: {
      overall: clamp(1 - issues.length * 0.08),
      highConfidenceDetections,
      mediumConfidenceDetections,
      lowConfidenceDetections,
    },
    rawMetrics: {
      coverageStress,
    },
    domain: play,
  };
};
