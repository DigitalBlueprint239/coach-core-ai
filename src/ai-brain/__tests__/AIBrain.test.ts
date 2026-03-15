/**
 * AIBrain Tests
 * Tests all 8 methods with mocked AI proxy.
 * Verifies: correct request types, response parsing, fallback on failure.
 */

import { CoachCoreAIBrain } from '../core/AIBrain';
import { AIProxyService } from '../../services/ai-proxy';

jest.mock('../../services/ai-proxy');

const MockedAIProxyService = AIProxyService as jest.MockedClass<typeof AIProxyService>;

// Helper to create a mock proxy response
function mockProxySuccess(data: any) {
  return {
    success: true,
    data,
    metadata: { model: 'gpt-4', tokens: 500, cost: 0.01, latency: 200 },
  };
}

function mockProxyFailure(error = 'Proxy unavailable') {
  return { success: false, error };
}

describe('CoachCoreAIBrain', () => {
  let brain: CoachCoreAIBrain;
  let mockMakeRequest: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton so fresh instance is created
    (CoachCoreAIBrain as any).instance = undefined;

    mockMakeRequest = jest.fn();
    MockedAIProxyService.mockImplementation(() => ({
      makeRequest: mockMakeRequest,
    } as any));

    brain = CoachCoreAIBrain.getInstance();
  });

  // ============================================
  // Singleton
  // ============================================
  describe('getInstance', () => {
    it('returns the same instance every time', () => {
      const a = CoachCoreAIBrain.getInstance();
      const b = CoachCoreAIBrain.getInstance();
      expect(a).toBe(b);
    });
  });

  // ============================================
  // generatePracticePlan
  // ============================================
  describe('generatePracticePlan', () => {
    const params = {
      duration: 90,
      goals: ['conditioning', 'install new plays'],
      teamId: 'team1',
    };

    it('returns structured practice plan on success', async () => {
      mockMakeRequest.mockResolvedValueOnce(
        mockProxySuccess(
          JSON.stringify({
            periods: [
              { name: 'Warm-Up', duration: 10, intensity: 'low', drills: ['Dynamic Stretch'], coachingPoints: [] },
              { name: '7-on-7', duration: 30, intensity: 'high', drills: ['Smash Concept'], coachingPoints: ['Eyes on coverage'] },
            ],
            insights: ['Great conditioning focus'],
            confidence: 0.9,
            alternatives: [],
          })
        )
      );

      const result = await brain.generatePracticePlan(params);
      expect(result.plan.periods).toHaveLength(2);
      expect(result.plan.periods[0].name).toBe('Warm-Up');
      expect(result.confidence).toBe(0.9);
    });

    it('uses practice_plan request type', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxySuccess(JSON.stringify({
        periods: [{ name: 'P1', duration: 10, intensity: 'medium', drills: ['d1'] }],
        insights: [], confidence: 0.8, alternatives: []
      })));

      await brain.generatePracticePlan(params);
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'practice_plan' })
      );
    });

    it('returns fallback plan on proxy failure', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxyFailure());

      const result = await brain.generatePracticePlan(params);
      expect(result.plan.periods.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('returns fallback plan on exception', async () => {
      mockMakeRequest.mockRejectedValueOnce(new Error('Network error'));

      const result = await brain.generatePracticePlan(params);
      expect(result.plan.periods.length).toBeGreaterThan(0);
    });

    it('returns fallback on malformed JSON response', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxySuccess('not valid json at all!!!'));
      const result = await brain.generatePracticePlan(params);
      expect(result.plan.periods.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // getPlaySuggestions
  // ============================================
  describe('getPlaySuggestions', () => {
    const context = { formation: 'Shotgun', personnelPackage: '11', down: 3, distance: 7 };

    it('uses play_suggestion request type', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxySuccess(JSON.stringify({
        suggestion: 'Run Mesh',
        confidence: 0.85,
        urgency: 'normal',
        reasoning: ['Mesh attacks zone coverage'],
        suggestions: [{ name: 'Mesh', concept: 'Mesh', reasoning: '...', confidence: 0.9 }]
      })));

      await brain.getPlaySuggestions(context);
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'play_suggestion' })
      );
    });

    it('returns suggestions with reasoning on success', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxySuccess(JSON.stringify({
        suggestion: 'Four Verts',
        confidence: 0.88,
        urgency: 'high',
        reasoning: ['Stretches coverage vertically'],
        suggestions: [{ name: 'Four Verts', concept: 'Four Verts', reasoning: 'Works vs Cover 2', confidence: 0.88 }]
      })));

      const result = await brain.getPlaySuggestions(context);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('returns fallback on proxy failure', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxyFailure());
      const result = await brain.getPlaySuggestions(context);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // analyzeFormation
  // ============================================
  describe('analyzeFormation', () => {
    it('uses performance_analysis request type', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxySuccess(JSON.stringify({
        formation: 'Spread',
        strengths: ['Spacing'],
        weaknesses: ['Run game'],
        personnelPackage: '11',
        likelyDefensiveAdjustments: ['Cover 3'],
        recommendedConcepts: [{ concept: 'Four Verts', reasoning: '...', confidence: 0.9 }],
        confidence: 0.9
      })));

      await brain.analyzeFormation('Spread');
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'performance_analysis' })
      );
    });

    it('returns fallback on failure', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxyFailure());
      const result = await brain.analyzeFormation('Pro Set');
      expect(result.strengths.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // getCoverageRecommendation
  // ============================================
  describe('getCoverageRecommendation', () => {
    it('uses play_suggestion request type', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxySuccess(JSON.stringify({
        likelyCoverage: 'Cover 2',
        confidence: 0.8,
        coverageKey: 'cover_2',
        attackStrategy: ['Smash beats Cover 2'],
        routeCombinations: [{ routes: ['Corner', 'Hitch'], reasoning: 'Smash concept', confidence: 0.85 }]
      })));

      await brain.getCoverageRecommendation({ offensiveFormation: 'Spread', fieldPosition: 'own 40' });
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'play_suggestion' })
      );
    });

    it('returns fallback on failure', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxyFailure());
      const result = await brain.getCoverageRecommendation({});
      expect(result.routeCombinations.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // generateDrillSuggestions
  // ============================================
  describe('generateDrillSuggestions', () => {
    it('uses drill_suggestions request type', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxySuccess(JSON.stringify({
        drills: [
          { name: 'Route Release Drill', description: 'Work release off the line', duration: 10, reps: 5, equipment: [], coachingPoints: [], variations: [] }
        ],
        focusSummary: 'Receiver route running',
        confidence: 0.85
      })));

      await brain.generateDrillSuggestions('route_running', 'high_school');
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'drill_suggestions' })
      );
    });

    it('returns fallback on failure', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxyFailure());
      const result = await brain.generateDrillSuggestions('conditioning', 'youth');
      expect(result.drills.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // assessPlayerDevelopment
  // ============================================
  describe('assessPlayerDevelopment', () => {
    const playerData = { name: 'John Doe', position: 'WR', age: 17, stats: {} };

    it('uses performance_analysis request type', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxySuccess(JSON.stringify({
        playerName: 'John Doe',
        position: 'WR',
        currentLevel: 'developing',
        developmentPriorities: ['Route running'],
        recommendedDrills: ['Route Release'],
        strengths: ['Speed'],
        improvementAreas: ['Route precision'],
        timelineWeeks: 8,
        confidence: 0.8
      })));

      await brain.assessPlayerDevelopment(playerData);
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'performance_analysis' })
      );
    });

    it('returns fallback on failure', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxyFailure());
      const result = await brain.assessPlayerDevelopment(playerData);
      expect(result.developmentPriorities.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // generateGamePlan
  // ============================================
  describe('generateGamePlan', () => {
    const context = { opponent: 'Team B', record: '5-2', tendencies: 'Cover 2 heavy' };

    it('uses play_suggestion request type', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxySuccess(JSON.stringify({
        offensiveConcepts: [{ concept: 'Mesh', reasoning: '...', personnel: '11', situations: [] }],
        personnelDistribution: { '11': 60, '12': 30, '21': 10 },
        situationalRecommendations: { redZone: ['Fade'], thirdDown: ['Mesh'], twoMinute: ['Four Verts'] },
        keyMatchups: [],
        confidence: 0.85
      })));

      await brain.generateGamePlan(context, { strengths: ['passing game'] });
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'play_suggestion' })
      );
    });

    it('returns fallback on failure', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxyFailure());
      const result = await brain.generateGamePlan(context, { strengths: ['passing game'] });
      expect(result.offensiveConcepts.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // getMotivationalInsight
  // ============================================
  describe('getMotivationalInsight', () => {
    it('uses conversation request type', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxySuccess(JSON.stringify({
        insight: 'Focus on execution today',
        category: 'motivation',
        applicability: 'pre-game',
        confidence: 0.9
      })));

      await brain.getMotivationalInsight({ teamName: 'Eagles', seasonPhase: 'Playoff game' });
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'conversation' })
      );
    });

    it('returns fallback on failure', async () => {
      mockMakeRequest.mockResolvedValueOnce(mockProxyFailure());
      const result = await brain.getMotivationalInsight({});
      expect(result.insight).toBeTruthy();
    });
  });
});
