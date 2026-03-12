import type { IntelligenceAnalysis } from '../contracts/intelligence';
import type { AnalysisContext, CanonicalPlay } from '../domains/canonicalPlay';
import { analyzeOffensePlay } from '../oim/api/analyzePlay';
import { applyConfidenceGating } from './renderingPolicy';

const noModuleAnalysis = (play: CanonicalPlay): IntelligenceAnalysis<CanonicalPlay> => ({
  domainType: play.phase,
  detectedPatterns: [],
  issues: [],
  recommendations: [],
  scores: {
    structuralScore: 1,
    spacingScore: 1,
    timingScore: 1,
    integrityScore: 1,
  },
  teachingPoints: [],
  confidenceSummary: {
    overall: 1,
    highConfidenceDetections: 0,
    mediumConfidenceDetections: 0,
    lowConfidenceDetections: 0,
  },
  domain: play,
});

export const analyzePlay = (
  play: CanonicalPlay,
  context: AnalysisContext = {},
): IntelligenceAnalysis<CanonicalPlay> => {
  if (play.phase === 'offense') {
    return applyConfidenceGating(analyzeOffensePlay(play, context));
  }

  return applyConfidenceGating(noModuleAnalysis(play));
};
