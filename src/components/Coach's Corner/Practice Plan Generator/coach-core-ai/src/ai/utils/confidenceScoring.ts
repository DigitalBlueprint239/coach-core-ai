/**
 * AI Confidence Scoring Utilities
 * 
 * Helper functions for calculating and validating AI confidence scores,
 * data quality assessment, and model accuracy evaluation.
 */

import { ConfidenceScore, TeamProfile, PracticeGoal, AISuggestion } from '../interfaces';

export interface ConfidenceFactors {
  dataQuality: number;
  modelAccuracy: number;
  contextRelevance: number;
  historicalSuccess: number;
  userFeedback: number;
  consistency: number;
}

export interface DataQualityMetrics {
  completeness: number;
  recency: number;
  accuracy: number;
  consistency: number;
  relevance: number;
}

/**
 * Calculate overall confidence score from individual factors
 */
export function calculateConfidenceScore(factors: ConfidenceFactors): ConfidenceScore {
  const weights = {
    dataQuality: 0.25,
    modelAccuracy: 0.20,
    contextRelevance: 0.20,
    historicalSuccess: 0.15,
    userFeedback: 0.10,
    consistency: 0.10
  };

  const overall = Object.entries(factors).reduce((sum, [key, value]) => {
    return sum + (value * weights[key as keyof typeof weights]);
  }, 0);

  return {
    overall: Math.min(Math.max(overall, 0), 1), // Clamp between 0 and 1
    factors,
    explanation: generateConfidenceExplanation(factors)
  };
}

/**
 * Assess data quality for team profile and practice goals
 */
export function assessDataQuality(
  teamProfile: TeamProfile,
  practiceGoal: PracticeGoal
): DataQualityMetrics {
  const completeness = calculateCompleteness(teamProfile, practiceGoal);
  const recency = calculateRecency(teamProfile);
  const accuracy = calculateAccuracy(teamProfile);
  const consistency = calculateConsistency(teamProfile);
  const relevance = calculateRelevance(teamProfile, practiceGoal);

  return {
    completeness,
    recency,
    accuracy,
    consistency,
    relevance
  };
}

/**
 * Calculate data completeness score
 */
function calculateCompleteness(teamProfile: TeamProfile, practiceGoal: PracticeGoal): number {
  let score = 0;
  let totalChecks = 0;

  // Team profile completeness
  if (teamProfile.name) { score += 1; totalChecks += 1; }
  if (teamProfile.sport) { score += 1; totalChecks += 1; }
  if (teamProfile.level) { score += 1; totalChecks += 1; }
  if (teamProfile.players.length > 0) { score += 1; totalChecks += 1; }
  if (teamProfile.strengths.length > 0) { score += 1; totalChecks += 1; }
  if (teamProfile.weaknesses.length > 0) { score += 1; totalChecks += 1; }

  // Practice goal completeness
  if (practiceGoal.title) { score += 1; totalChecks += 1; }
  if (practiceGoal.description) { score += 1; totalChecks += 1; }
  if (practiceGoal.focusAreas.length > 0) { score += 1; totalChecks += 1; }
  if (practiceGoal.duration > 0) { score += 1; totalChecks += 1; }

  return totalChecks > 0 ? score / totalChecks : 0;
}

/**
 * Calculate data recency score
 */
function calculateRecency(teamProfile: TeamProfile): number {
  if (!teamProfile.practiceHistory || teamProfile.practiceHistory.length === 0) {
    return 0.3; // Low score if no recent data
  }

  const mostRecentSession = teamProfile.practiceHistory
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  
  const daysSinceLastSession = (Date.now() - new Date(mostRecentSession.date).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceLastSession <= 7) return 1.0;
  if (daysSinceLastSession <= 14) return 0.8;
  if (daysSinceLastSession <= 30) return 0.6;
  if (daysSinceLastSession <= 60) return 0.4;
  return 0.2;
}

/**
 * Calculate data accuracy score
 */
function calculateAccuracy(teamProfile: TeamProfile): number {
  let score = 0;
  let totalChecks = 0;

  // Check for realistic values
  if (teamProfile.players.length > 0 && teamProfile.players.length <= 50) {
    score += 1;
  }
  totalChecks += 1;

  if (teamProfile.recentPerformance) {
    const perf = teamProfile.recentPerformance;
    if (perf.wins >= 0 && perf.losses >= 0 && perf.ties >= 0) {
      score += 1;
    }
    if (perf.averageScore >= 0) {
      score += 1;
    }
    totalChecks += 2;
  }

  return totalChecks > 0 ? score / totalChecks : 0.5;
}

/**
 * Calculate data consistency score
 */
function calculateConsistency(teamProfile: TeamProfile): number {
  if (!teamProfile.practiceHistory || teamProfile.practiceHistory.length < 2) {
    return 0.5; // Neutral score for insufficient data
  }

  // Check for consistent practice patterns
  const sessions = teamProfile.practiceHistory.slice(-5); // Last 5 sessions
  const durations = sessions.map(s => s.duration);
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  
  const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Lower standard deviation = higher consistency
  const consistencyScore = Math.max(0, 1 - (standardDeviation / avgDuration));
  
  return consistencyScore;
}

/**
 * Calculate data relevance score
 */
function calculateRelevance(teamProfile: TeamProfile, practiceGoal: PracticeGoal): number {
  let score = 0;
  let totalChecks = 0;

  // Check if practice goal aligns with team needs
  const teamNeeds = [...teamProfile.weaknesses, ...teamProfile.players.flatMap(p => p.areasForImprovement)];
  const goalFocus = practiceGoal.focusAreas;
  
  const relevantFocusAreas = goalFocus.filter(focus => 
    teamNeeds.some(need => 
      need.toLowerCase().includes(focus.toLowerCase()) || 
      focus.toLowerCase().includes(need.toLowerCase())
    )
  );
  
  if (goalFocus.length > 0) {
    score += relevantFocusAreas.length / goalFocus.length;
    totalChecks += 1;
  }

  // Check if practice duration is appropriate for team level
  const appropriateDuration = getAppropriateDuration(teamProfile.level, practiceGoal.intensity);
  if (Math.abs(practiceGoal.duration - appropriateDuration) <= 15) {
    score += 1;
  }
  totalChecks += 1;

  return totalChecks > 0 ? score / totalChecks : 0.5;
}

/**
 * Get appropriate practice duration based on team level and intensity
 */
function getAppropriateDuration(teamLevel: string, intensity: string): number {
  const baseDurations = {
    beginner: 60,
    intermediate: 90,
    advanced: 120,
    elite: 150
  };
  
  const intensityMultipliers = {
    low: 0.8,
    moderate: 1.0,
    high: 1.2,
    extreme: 1.4
  };
  
  const baseDuration = baseDurations[teamLevel as keyof typeof baseDurations] || 90;
  const multiplier = intensityMultipliers[intensity as keyof typeof intensityMultipliers] || 1.0;
  
  return Math.round(baseDuration * multiplier);
}

/**
 * Generate explanation for confidence score
 */
function generateConfidenceExplanation(factors: ConfidenceFactors): string {
  const explanations: string[] = [];
  
  if (factors.dataQuality >= 0.8) {
    explanations.push('High quality input data');
  } else if (factors.dataQuality >= 0.6) {
    explanations.push('Good quality input data');
  } else {
    explanations.push('Limited input data quality');
  }
  
  if (factors.modelAccuracy >= 0.8) {
    explanations.push('Proven model accuracy');
  } else if (factors.modelAccuracy >= 0.6) {
    explanations.push('Reliable model performance');
  } else {
    explanations.push('Model accuracy needs improvement');
  }
  
  if (factors.contextRelevance >= 0.8) {
    explanations.push('Highly relevant context');
  } else if (factors.contextRelevance >= 0.6) {
    explanations.push('Good context alignment');
  } else {
    explanations.push('Limited context relevance');
  }
  
  if (factors.historicalSuccess >= 0.8) {
    explanations.push('Strong historical success');
  } else if (factors.historicalSuccess >= 0.6) {
    explanations.push('Moderate historical success');
  } else {
    explanations.push('Limited historical data');
  }
  
  return explanations.join(', ');
}

/**
 * Validate AI suggestion confidence
 */
export function validateSuggestionConfidence(suggestion: AISuggestion): boolean {
  return suggestion.confidence >= 0.6 && suggestion.confidence <= 1.0;
}

/**
 * Calculate weighted confidence for multiple suggestions
 */
export function calculateWeightedConfidence(suggestions: AISuggestion[]): number {
  if (suggestions.length === 0) return 0;
  
  const totalWeight = suggestions.reduce((sum, suggestion) => sum + suggestion.confidence, 0);
  return totalWeight / suggestions.length;
}

/**
 * Filter suggestions by minimum confidence threshold
 */
export function filterSuggestionsByConfidence(
  suggestions: AISuggestion[], 
  minConfidence: number = 0.6
): AISuggestion[] {
  return suggestions.filter(suggestion => suggestion.confidence >= minConfidence);
}

/**
 * Sort suggestions by confidence (highest first)
 */
export function sortSuggestionsByConfidence(suggestions: AISuggestion[]): AISuggestion[] {
  return [...suggestions].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Generate confidence badge color
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-600 bg-green-100';
  if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
}

/**
 * Format confidence as percentage
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
} 