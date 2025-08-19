// Enhanced AI Service with Better Error Handling and Performance
import { 
  User, Team, Player, PracticePlan, Play, 
  AISuggestion, AIConversation, AIInsight,
  GameContext, TeamContext, PlayerContext
} from '../types/firestore-schema';

// ============================================
// ENHANCED AI SERVICE TYPES
// ============================================

export interface EnhancedAIServiceConfig {
  apiKey: string;
  model: 'gpt-4' | 'gpt-3.5-turbo' | 'gpt-4-turbo' | 'gpt-4o';
  maxTokens: number;
  temperature: number;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  enableStreaming?: boolean;
  enableCaching?: boolean;
  cacheTTL?: number;
  enableRateLimiting?: boolean;
  rateLimitPerMinute?: number;
}

export interface AIRequestMetadata {
  requestId: string;
  timestamp: number;
  userId?: string;
  teamId?: string;
  feature: string;
  model: string;
  tokensUsed?: number;
  responseTime?: number;
}

export interface EnhancedAIResponse extends AIResponse {
  metadata: AIRequestMetadata;
  cost?: number;
  modelUsed: string;
  processingTime: number;
}

export interface AIPerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  errorRate: number;
}

// ============================================
// ENHANCED AI SERVICE CLASS
// ============================================

export class EnhancedAIService {
  private config: EnhancedAIServiceConfig;
  private cache: Map<string, { response: EnhancedAIResponse; timestamp: number }> = new Map();
  private requestQueue: Map<string, Promise<EnhancedAIResponse>> = new Map();
  private performanceMetrics: AIPerformanceMetrics = {
    averageResponseTime: 0,
    successRate: 0,
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    errorRate: 0
  };
  private rateLimitTracker: Map<string, number[]> = new Map();

  constructor(config: EnhancedAIServiceConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      baseUrl: 'https://api.openai.com/v1',
      enableStreaming: false,
      enableCaching: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      enableRateLimiting: true,
      rateLimitPerMinute: 60,
      ...config
    };
  }

  // ============================================
  // ENHANCED CORE METHODS
  // ============================================

  async generatePracticePlan(
    teamContext: TeamContext,
    goals: string[],
    duration: number,
    constraints?: any,
    userId?: string
  ): Promise<EnhancedAIResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Check rate limiting
      if (this.config.enableRateLimiting && !this.checkRateLimit(userId || 'anonymous')) {
        throw new Error('Rate limit exceeded. Please try again in a minute.');
      }

      // Check cache
      const cacheKey = `practice_plan_${teamContext.id}_${goals.join('_')}_${duration}`;
      if (this.config.enableCaching) {
        const cached = this.getCachedResponse(cacheKey);
        if (cached) {
          return this.addMetadata(cached, requestId, startTime, 'practice_plan', userId);
        }
      }

      // Check for duplicate requests
      if (this.requestQueue.has(cacheKey)) {
        return this.requestQueue.get(cacheKey)!;
      }

      const prompt = this.buildEnhancedPracticePlanPrompt(teamContext, goals, duration, constraints);
      
      const promise = this.makeEnhancedAIRequest({
        prompt,
        context: { teamContext, goals, duration, constraints },
        options: { temperature: 0.7, maxTokens: 1500 },
        requestId,
        userId
      }).then(response => {
        const enhancedResponse = this.parseEnhancedPracticePlanResponse(response, requestId, startTime, userId);
        this.cacheResponse(cacheKey, enhancedResponse);
        this.updatePerformanceMetrics(enhancedResponse, true);
        return enhancedResponse;
      }).catch(error => {
        this.updatePerformanceMetrics({} as EnhancedAIResponse, false);
        throw error;
      }).finally(() => {
        this.requestQueue.delete(cacheKey);
      });

      this.requestQueue.set(cacheKey, promise);
      return await promise;

    } catch (error) {
      this.updatePerformanceMetrics({} as EnhancedAIResponse, false);
      throw this.handleError(error, 'generatePracticePlan');
    }
  }

  async generatePlaySuggestion(
    gameContext: GameContext,
    teamContext: TeamContext,
    playerContext?: PlayerContext,
    userId?: string
  ): Promise<EnhancedAIResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      if (this.config.enableRateLimiting && !this.checkRateLimit(userId || 'anonymous')) {
        throw new Error('Rate limit exceeded. Please try again in a minute.');
      }

      const cacheKey = `play_suggestion_${teamContext.id}_${JSON.stringify(gameContext)}`;
      if (this.config.enableCaching) {
        const cached = this.getCachedResponse(cacheKey);
        if (cached) {
          return this.addMetadata(cached, requestId, startTime, 'play_suggestion', userId);
        }
      }

      const prompt = this.buildEnhancedPlaySuggestionPrompt(gameContext, teamContext, playerContext);
      
      const response = await this.makeEnhancedAIRequest({
        prompt,
        context: { gameContext, teamContext, playerContext },
        options: { temperature: 0.6, maxTokens: 1200 },
        requestId,
        userId
      });

      const enhancedResponse = this.parseEnhancedPlaySuggestionResponse(response, requestId, startTime, userId);
      this.cacheResponse(cacheKey, enhancedResponse);
      this.updatePerformanceMetrics(enhancedResponse, true);
      
      return enhancedResponse;

    } catch (error) {
      this.updatePerformanceMetrics({} as EnhancedAIResponse, false);
      throw this.handleError(error, 'generatePlaySuggestion');
    }
  }

  async analyzeTeamPerformance(
    teamContext: TeamContext,
    performanceData: any,
    timeRange: string,
    userId?: string
  ): Promise<EnhancedAIResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      if (this.config.enableRateLimiting && !this.checkRateLimit(userId || 'anonymous')) {
        throw new Error('Rate limit exceeded. Please try again in a minute.');
      }

      const cacheKey = `performance_analysis_${teamContext.id}_${timeRange}`;
      if (this.config.enableCaching) {
        const cached = this.getCachedResponse(cacheKey);
        if (cached) {
          return this.addMetadata(cached, requestId, startTime, 'performance_analysis', userId);
        }
      }

      const prompt = this.buildEnhancedPerformanceAnalysisPrompt(teamContext, performanceData, timeRange);
      
      const response = await this.makeEnhancedAIRequest({
        prompt,
        context: { teamContext, performanceData, timeRange },
        options: { temperature: 0.5, maxTokens: 1000 },
        requestId,
        userId
      });

      const enhancedResponse = this.parseEnhancedPerformanceAnalysisResponse(response, requestId, startTime, userId);
      this.cacheResponse(cacheKey, enhancedResponse);
      this.updatePerformanceMetrics(enhancedResponse, true);
      
      return enhancedResponse;

    } catch (error) {
      this.updatePerformanceMetrics({} as EnhancedAIResponse, false);
      throw this.handleError(error, 'analyzeTeamPerformance');
    }
  }

  // ============================================
  // ENHANCED PROMPT BUILDERS
  // ============================================

  private buildEnhancedPracticePlanPrompt(
    teamContext: TeamContext,
    goals: string[],
    duration: number,
    constraints?: any
  ): string {
    return `You are an expert sports coach assistant with deep knowledge of ${teamContext.sport} coaching. Generate a comprehensive, age-appropriate practice plan.

TEAM CONTEXT:
- Sport: ${teamContext.sport}
- Age Group: ${teamContext.ageGroup}
- Skill Level: ${teamContext.skillLevel || 'intermediate'}
- Team Size: ${teamContext.playerCount || 'unknown'} players
- Season Phase: ${teamContext.seasonPhase || 'regular'}
- Recent Performance: ${teamContext.recentPerformance || 'not specified'}

PRACTICE REQUIREMENTS:
- Goals: ${goals.join(', ')}
- Duration: ${duration} minutes
- Constraints: ${constraints ? JSON.stringify(constraints) : 'None'}

GENERATE A STRUCTURED PRACTICE PLAN WITH:

1. WARM-UP (10-15% of time)
   - Dynamic stretching
   - Sport-specific movements
   - Team building activities

2. SKILL DEVELOPMENT (40-50% of time)
   - Individual skill work
   - Position-specific drills
   - Progressive difficulty

3. TEAM PRACTICE (30-40% of time)
   - Game-like scenarios
   - Team coordination
   - Strategy implementation

4. COOL-DOWN (5-10% of time)
   - Static stretching
   - Team discussion
   - Goal setting for next practice

FOR EACH ACTIVITY INCLUDE:
- Activity name and description
- Duration (minutes)
- Equipment needed
- Coaching points
- Progression options
- Safety considerations
- Success indicators

FORMAT AS JSON:
{
  "plan": {
    "periods": [
      {
        "name": "string",
        "duration": number,
        "activities": [
          {
            "name": "string",
            "description": "string",
            "duration": number,
            "equipment": ["string"],
            "coachingPoints": ["string"],
            "progression": "string",
            "safetyNotes": ["string"],
            "successIndicators": ["string"]
          }
        ]
      }
    ]
  },
  "insights": {
    "focusAreas": ["string"],
    "recommendations": ["string"],
    "adaptations": ["string"],
    "expectedOutcomes": ["string"]
  },
  "confidence": number,
  "reasoning": ["string"]
}`;
  }

  private buildEnhancedPlaySuggestionPrompt(
    gameContext: GameContext,
    teamContext: TeamContext,
    playerContext?: PlayerContext
  ): string {
    return `You are an expert ${teamContext.sport} coach with deep strategic knowledge. Suggest the optimal play for this game situation.

GAME CONTEXT:
- Down: ${gameContext.down}
- Distance: ${gameContext.distance} yards
- Field Position: ${gameContext.fieldPosition}
- Score Differential: ${gameContext.scoreDifferential}
- Time Remaining: ${gameContext.timeRemaining} seconds
- Weather: ${gameContext.weather || 'clear'}
- Opponent Tendencies: ${gameContext.opponentTendency || 'balanced'}

TEAM CONTEXT:
- Age Group: ${teamContext.ageGroup}
- Skill Level: ${teamContext.skillLevel || 'intermediate'}
- Available Players: ${playerContext ? playerContext.availablePlayers?.length || 'unknown' : 'unknown'}
- Team Strengths: ${teamContext.strengths || 'not specified'}
- Team Weaknesses: ${teamContext.weaknesses || 'not specified'}

ANALYZE THE SITUATION AND SUGGEST:

1. PRIMARY PLAY
   - Play name and formation
   - Player positions and routes
   - Success probability and reasoning
   - Key execution points

2. ALTERNATIVE OPTIONS
   - Backup plays for different scenarios
   - Risk assessment for each option

3. SAFETY CONSIDERATIONS
   - Age-appropriate complexity
   - Injury prevention measures
   - Supervision requirements

FORMAT AS JSON:
{
  "suggestion": {
    "name": "string",
    "formation": "string",
    "description": "string",
    "players": [
      {
        "position": "string",
        "x": number,
        "y": number,
        "route": "string",
        "responsibility": "string"
      }
    ],
    "routes": [
      {
        "playerId": number,
        "points": [{"x": number, "y": number}],
        "type": "string",
        "timing": "string"
      }
    ],
    "executionPoints": ["string"],
    "successProbability": number
  },
  "alternatives": [
    {
      "name": "string",
      "confidence": number,
      "reasoning": "string",
      "riskLevel": "low|medium|high"
    }
  ],
  "confidence": number,
  "reasoning": ["string"],
  "safety": {
    "riskLevel": "low|medium|high",
    "considerations": ["string"],
    "modifications": ["string"]
  }
}`;
  }

  // ============================================
  // ENHANCED UTILITY METHODS
  // ============================================

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkRateLimit(userId: string): boolean {
    if (!this.config.enableRateLimiting) return true;

    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    if (!this.rateLimitTracker.has(userId)) {
      this.rateLimitTracker.set(userId, [now]);
      return true;
    }

    const userRequests = this.rateLimitTracker.get(userId)!;
    const recentRequests = userRequests.filter(time => time > oneMinuteAgo);
    
    if (recentRequests.length >= this.config.rateLimitPerMinute!) {
      return false;
    }

    recentRequests.push(now);
    this.rateLimitTracker.set(userId, recentRequests);
    return true;
  }

  private addMetadata(
    response: AIResponse,
    requestId: string,
    startTime: number,
    feature: string,
    userId?: string
  ): EnhancedAIResponse {
    return {
      ...response,
      metadata: {
        requestId,
        timestamp: startTime,
        userId,
        feature,
        model: this.config.model,
        responseTime: Date.now() - startTime
      },
      modelUsed: this.config.model,
      processingTime: Date.now() - startTime
    };
  }

  private updatePerformanceMetrics(response: EnhancedAIResponse, success: boolean): void {
    this.performanceMetrics.totalRequests++;
    
    if (success) {
      this.performanceMetrics.successRate = 
        (this.performanceMetrics.successRate * (this.performanceMetrics.totalRequests - 1) + 1) / 
        this.performanceMetrics.totalRequests;
      
      if (response.processingTime) {
        this.performanceMetrics.averageResponseTime = 
          (this.performanceMetrics.averageResponseTime * (this.performanceMetrics.totalRequests - 1) + response.processingTime) / 
          this.performanceMetrics.totalRequests;
      }
    } else {
      this.performanceMetrics.errorRate = 
        (this.performanceMetrics.errorRate * (this.performanceMetrics.totalRequests - 1) + 1) / 
        this.performanceMetrics.totalRequests;
    }
  }

  private handleError(error: any, method: string): Error {
    console.error(`AI Service Error in ${method}:`, error);
    
    if (error.message.includes('rate limit')) {
      return new Error('Rate limit exceeded. Please try again in a minute.');
    }
    
    if (error.message.includes('API key')) {
      return new Error('AI service configuration error. Please check your API key.');
    }
    
    if (error.message.includes('timeout')) {
      return new Error('Request timed out. Please try again.');
    }
    
    return new Error(`AI service error: ${error.message}`);
  }

  // ============================================
  // PUBLIC UTILITY METHODS
  // ============================================

  getPerformanceMetrics(): AIPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  updateConfig(newConfig: Partial<EnhancedAIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  resetRateLimit(userId: string): void {
    this.rateLimitTracker.delete(userId);
  }
}

// ============================================
// ENHANCED REACT HOOKS
// ============================================

import { useState, useCallback, useRef, useEffect } from 'react';

export const useEnhancedAIService = (config: EnhancedAIServiceConfig) => {
  const [service] = useState(() => new EnhancedAIService(config));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<AIPerformanceMetrics | null>(null);

  // Update performance metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceMetrics(service.getPerformanceMetrics());
    }, 5000);

    return () => clearInterval(interval);
  }, [service]);

  const generatePracticePlan = useCallback(async (
    teamContext: TeamContext,
    goals: string[],
    duration: number,
    constraints?: any,
    userId?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await service.generatePracticePlan(teamContext, goals, duration, constraints, userId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate practice plan';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service]);

  const generatePlaySuggestion = useCallback(async (
    gameContext: GameContext,
    teamContext: TeamContext,
    playerContext?: PlayerContext,
    userId?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await service.generatePlaySuggestion(gameContext, teamContext, playerContext, userId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate play suggestion';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service]);

  const analyzeTeamPerformance = useCallback(async (
    teamContext: TeamContext,
    performanceData: any,
    timeRange: string,
    userId?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await service.analyzeTeamPerformance(teamContext, performanceData, timeRange, userId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze performance';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service]);

  return {
    service,
    loading,
    error,
    performanceMetrics,
    generatePracticePlan,
    generatePlaySuggestion,
    analyzeTeamPerformance,
    clearCache: () => service.clearCache(),
    getCacheStats: () => service.getCacheStats(),
    getPerformanceMetrics: () => service.getPerformanceMetrics(),
    resetRateLimit: (userId: string) => service.resetRateLimit(userId)
  };
}; 