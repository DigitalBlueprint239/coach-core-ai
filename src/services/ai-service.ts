// src/services/ai-service.ts
import { 
  User, Team, Player, PracticePlan, Play, 
  AISuggestion, AIConversation, AIInsight,
  GameContext, TeamContext, PlayerContext
} from '../types/firestore-schema';

// ============================================
// AI SERVICE TYPES
// ============================================

export interface AIServiceConfig {
  apiKey: string;
  model: 'gpt-4' | 'gpt-3.5-turbo' | 'gpt-4-turbo';
  maxTokens: number;
  temperature: number;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface AIRequest {
  prompt: string;
  context?: any;
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  };
}

export interface AIResponse {
  content: string;
  suggestions?: AISuggestion[];
  confidence: number;
  reasoning: string[];
  metadata?: Record<string, any>;
}

export interface SafetyValidation {
  isSafe: boolean;
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

// ============================================
// AI SERVICE CLASS
// ============================================

export class AIService {
  private config: AIServiceConfig;
  private cache: Map<string, { response: AIResponse; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: AIServiceConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      baseUrl: 'https://api.openai.com/v1',
      ...config
    };
  }

  // ============================================
  // CORE AI METHODS
  // ============================================

  async generatePracticePlan(
    teamContext: TeamContext,
    goals: string[],
    duration: number,
    constraints?: any
  ): Promise<AIResponse> {
    const cacheKey = `practice_plan_${teamContext.id}_${goals.join('_')}_${duration}`;
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    const prompt = this.buildPracticePlanPrompt(teamContext, goals, duration, constraints);
    
    const response = await this.makeAIRequest({
      prompt,
      context: { teamContext, goals, duration, constraints },
      options: { temperature: 0.7, maxTokens: 1500 }
    });

    const aiResponse = this.parsePracticePlanResponse(response);
    this.cacheResponse(cacheKey, aiResponse);
    
    return aiResponse;
  }

  async generatePlaySuggestion(
    gameContext: GameContext,
    teamContext: TeamContext,
    playerContext?: PlayerContext
  ): Promise<AIResponse> {
    const cacheKey = `play_suggestion_${teamContext.id}_${JSON.stringify(gameContext)}`;
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    const prompt = this.buildPlaySuggestionPrompt(gameContext, teamContext, playerContext);
    
    const response = await this.makeAIRequest({
      prompt,
      context: { gameContext, teamContext, playerContext },
      options: { temperature: 0.6, maxTokens: 1200 }
    });

    const aiResponse = this.parsePlaySuggestionResponse(response);
    this.cacheResponse(cacheKey, aiResponse);
    
    return aiResponse;
  }

  async analyzeTeamPerformance(
    teamContext: TeamContext,
    performanceData: any,
    timeRange: string
  ): Promise<AIResponse> {
    const cacheKey = `performance_analysis_${teamContext.id}_${timeRange}`;
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    const prompt = this.buildPerformanceAnalysisPrompt(teamContext, performanceData, timeRange);
    
    const response = await this.makeAIRequest({
      prompt,
      context: { teamContext, performanceData, timeRange },
      options: { temperature: 0.5, maxTokens: 1000 }
    });

    const aiResponse = this.parsePerformanceAnalysisResponse(response);
    this.cacheResponse(cacheKey, aiResponse);
    
    return aiResponse;
  }

  async generateDrillSuggestions(
    teamContext: TeamContext,
    focusAreas: string[],
    duration: number,
    skillLevel: string
  ): Promise<AIResponse> {
    const cacheKey = `drill_suggestions_${teamContext.id}_${focusAreas.join('_')}_${duration}`;
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    const prompt = this.buildDrillSuggestionsPrompt(teamContext, focusAreas, duration, skillLevel);
    
    const response = await this.makeAIRequest({
      prompt,
      context: { teamContext, focusAreas, duration, skillLevel },
      options: { temperature: 0.7, maxTokens: 1000 }
    });

    const aiResponse = this.parseDrillSuggestionsResponse(response);
    this.cacheResponse(cacheKey, aiResponse);
    
    return aiResponse;
  }

  async processConversation(
    message: string,
    conversationHistory: AIConversation[],
    userContext: User,
    teamContext?: TeamContext
  ): Promise<AIResponse> {
    const prompt = this.buildConversationPrompt(message, conversationHistory, userContext, teamContext);
    
    const response = await this.makeAIRequest({
      prompt,
      context: { message, conversationHistory, userContext, teamContext },
      options: { temperature: 0.8, maxTokens: 800 }
    });

    return this.parseConversationResponse(response);
  }

  // ============================================
  // SAFETY VALIDATION
  // ============================================

  async validateSafety(
    suggestion: AISuggestion,
    teamContext: TeamContext,
    ageGroup: string
  ): Promise<SafetyValidation> {
    const safetyRules = this.getSafetyRules(ageGroup);
    const prompt = this.buildSafetyValidationPrompt(suggestion, safetyRules);
    
    const response = await this.makeAIRequest({
      prompt,
      context: { suggestion, teamContext, safetyRules },
      options: { temperature: 0.3, maxTokens: 500 }
    });

    return this.parseSafetyValidationResponse(response);
  }

  // ============================================
  // PROMPT BUILDERS
  // ============================================

  private buildPracticePlanPrompt(
    teamContext: TeamContext,
    goals: string[],
    duration: number,
    constraints?: any
  ): string {
    return `You are an expert sports coach assistant. Generate a comprehensive practice plan for a ${teamContext.ageGroup} ${teamContext.sport} team.

Team Context:
- Sport: ${teamContext.sport}
- Age Group: ${teamContext.ageGroup}
- Skill Level: ${teamContext.skillLevel || 'intermediate'}
- Team Size: ${teamContext.playerCount || 'unknown'} players
- Season Phase: ${teamContext.seasonPhase || 'regular'}

Practice Goals: ${goals.join(', ')}
Duration: ${duration} minutes
Constraints: ${constraints ? JSON.stringify(constraints) : 'None'}

Generate a structured practice plan with:
1. Warm-up activities (10-15% of time)
2. Skill development drills (40-50% of time)
3. Team practice scenarios (30-40% of time)
4. Cool-down and review (5-10% of time)

For each activity, include:
- Activity name and description
- Duration
- Equipment needed
- Coaching points
- Progression options

Format the response as a JSON object with the structure:
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
            "progression": "string"
          }
        ]
      }
    ]
  },
  "insights": {
    "focusAreas": ["string"],
    "recommendations": ["string"],
    "adaptations": ["string"]
  },
  "confidence": number,
  "reasoning": ["string"]
}`;
  }

  private buildPlaySuggestionPrompt(
    gameContext: GameContext,
    teamContext: TeamContext,
    playerContext?: PlayerContext
  ): string {
    return `You are an expert football coach. Suggest the best play for the current game situation.

Game Context:
- Down: ${gameContext.down}
- Distance: ${gameContext.distance} yards
- Field Position: ${gameContext.fieldPosition}
- Score Differential: ${gameContext.scoreDifferential}
- Time Remaining: ${gameContext.timeRemaining} seconds
- Weather: ${gameContext.weather || 'clear'}

Team Context:
- Age Group: ${teamContext.ageGroup}
- Skill Level: ${teamContext.skillLevel || 'intermediate'}
- Available Players: ${playerContext ? playerContext.availablePlayers?.length || 'unknown' : 'unknown'}

Opponent Tendencies: ${gameContext.opponentTendency || 'balanced'}

Suggest the optimal play with:
1. Play name and formation
2. Player positions and routes
3. Success probability and reasoning
4. Alternative options
5. Safety considerations

Format the response as a JSON object with the structure:
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
        "route": "string"
      }
    ],
    "routes": [
      {
        "playerId": number,
        "points": [{"x": number, "y": number}],
        "type": "string"
      }
    ]
  },
  "confidence": number,
  "reasoning": ["string"],
  "alternatives": [
    {
      "name": "string",
      "confidence": number,
      "reasoning": "string"
    }
  ],
  "safety": {
    "riskLevel": "low|medium|high",
    "considerations": ["string"]
  }
}`;
  }

  private buildPerformanceAnalysisPrompt(
    teamContext: TeamContext,
    performanceData: any,
    timeRange: string
  ): string {
    return `You are an expert sports analyst. Analyze the team's performance data and provide insights.

Team Context:
- Sport: ${teamContext.sport}
- Age Group: ${teamContext.ageGroup}
- Time Range: ${timeRange}

Performance Data:
${JSON.stringify(performanceData, null, 2)}

Provide a comprehensive analysis including:
1. Key performance indicators
2. Strengths and weaknesses
3. Trends and patterns
4. Recommendations for improvement
5. Individual player insights (if data available)

Format the response as a JSON object with the structure:
{
  "analysis": {
    "summary": "string",
    "strengths": ["string"],
    "weaknesses": ["string"],
    "trends": ["string"],
    "recommendations": ["string"]
  },
  "metrics": {
    "overallScore": number,
    "improvementAreas": ["string"],
    "excellenceAreas": ["string"]
  },
  "confidence": number,
  "reasoning": ["string"]
}`;
  }

  private buildDrillSuggestionsPrompt(
    teamContext: TeamContext,
    focusAreas: string[],
    duration: number,
    skillLevel: string
  ): string {
    return `You are an expert sports coach. Suggest drills for a ${teamContext.sport} team.

Team Context:
- Sport: ${teamContext.sport}
- Age Group: ${teamContext.ageGroup}
- Skill Level: ${skillLevel}
- Focus Areas: ${focusAreas.join(', ')}
- Available Time: ${duration} minutes

Suggest 3-5 drills that:
1. Target the specified focus areas
2. Are appropriate for the age group and skill level
3. Can be completed within the time constraint
4. Require minimal equipment
5. Can be adapted for different group sizes

For each drill, include:
- Drill name and category
- Duration and setup time
- Equipment needed
- Step-by-step instructions
- Coaching points
- Variations and progressions

Format the response as a JSON object with the structure:
{
  "drills": [
    {
      "name": "string",
      "category": "string",
      "duration": number,
      "equipment": ["string"],
      "instructions": ["string"],
      "coachingPoints": ["string"],
      "variations": ["string"]
    }
  ],
  "confidence": number,
  "reasoning": ["string"]
}`;
  }

  private buildConversationPrompt(
    message: string,
    conversationHistory: AIConversation[],
    userContext: User,
    teamContext?: TeamContext
  ): string {
    const history = conversationHistory
      .slice(-5) // Last 5 conversations
      .flatMap(conversation => conversation.messages || [])
      .slice(-10) // Last 10 messages across conversations
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `You are an AI coaching assistant for Coach Core AI. You help coaches with practice planning, game strategy, and team management.

User Context:
- Role: ${userContext.roles?.join(', ') || 'coach'}
- Experience: ${userContext.persona || 'experienced_coach'}
- Team: ${teamContext ? `${teamContext.sport} ${teamContext.ageGroup}` : 'Not specified'}

Recent Conversation:
${history}

Current Message: ${message}

Provide a helpful, professional response that:
1. Addresses the user's question or concern
2. Offers practical coaching advice
3. Suggests relevant features or tools
4. Maintains a supportive, encouraging tone
5. Asks clarifying questions when needed

Keep your response concise but comprehensive. If appropriate, suggest specific actions or tools available in the app.`;
  }

  private buildSafetyValidationPrompt(
    suggestion: AISuggestion,
    safetyRules: any
  ): string {
    return `You are a safety expert for youth sports. Validate if this play suggestion is safe for the specified age group.

Play Suggestion:
${JSON.stringify(suggestion, null, 2)}

Safety Rules for Age Group:
${JSON.stringify(safetyRules, null, 2)}

Evaluate the safety of this play considering:
1. Physical risk to players
2. Age-appropriate complexity
3. Equipment requirements
4. Supervision needs
5. Injury prevention

Provide a safety assessment with:
- Overall safety rating (low/medium/high risk)
- Specific safety concerns
- Recommendations for modification
- Alternative safer options

Format the response as a JSON object with the structure:
{
  "isSafe": boolean,
  "riskLevel": "low|medium|high",
  "warnings": ["string"],
  "recommendations": ["string"],
  "modifications": ["string"],
  "alternatives": ["string"]
}`;
  }

  // ============================================
  // RESPONSE PARSERS
  // ============================================

  private parsePracticePlanResponse(response: string): AIResponse {
    try {
      const parsed = JSON.parse(response);
      return {
        content: 'Practice plan generated successfully',
        suggestions: parsed.plan ? [{
          id: `plan_${Date.now()}`,
          type: 'practice_plan',
          title: 'Generated Practice Plan',
          description: 'AI-generated practice plan based on your requirements',
          suggestion: 'Practice plan generated successfully',
          confidence: parsed.confidence || 0.8,
          reasoning: parsed.reasoning || [],
          implementation: parsed.insights?.recommendations || [],
          estimatedImpact: 'high',
          prerequisites: [],
          createdAt: new Date() as any
        }] : [],
        confidence: parsed.confidence || 0.8,
        reasoning: parsed.reasoning || [],
        metadata: {
          plan: parsed.plan,
          insights: parsed.insights
        }
      };
    } catch (error) {
      return this.createFallbackResponse('Failed to parse practice plan response');
    }
  }

  private parsePlaySuggestionResponse(response: string): AIResponse {
    try {
      const parsed = JSON.parse(response);
      return {
        content: 'Play suggestion generated successfully',
        suggestions: parsed.suggestion ? [{
          id: `play_${Date.now()}`,
          type: 'play_suggestion',
          title: parsed.suggestion.name,
          description: parsed.suggestion.description,
          suggestion: 'Play suggestion generated successfully',
          confidence: parsed.confidence || 0.8,
          reasoning: parsed.reasoning || [],
          implementation: ['Review play diagram', 'Practice with team', 'Adjust based on feedback'],
          estimatedImpact: 'moderate',
          prerequisites: [],
          createdAt: new Date() as any
        }] : [],
        confidence: parsed.confidence || 0.8,
        reasoning: parsed.reasoning || [],
        metadata: {
          suggestion: parsed.suggestion,
          alternatives: parsed.alternatives,
          safety: parsed.safety
        }
      };
    } catch (error) {
      return this.createFallbackResponse('Failed to parse play suggestion response');
    }
  }

  private parsePerformanceAnalysisResponse(response: string): AIResponse {
    try {
      const parsed = JSON.parse(response);
      return {
        content: 'Performance analysis completed',
        suggestions: parsed.analysis ? [{
          id: `analysis_${Date.now()}`,
          type: 'performance_analysis',
          title: 'Team Performance Analysis',
          description: parsed.analysis.summary,
          suggestion: 'Performance analysis completed',
          confidence: parsed.confidence || 0.8,
          reasoning: parsed.reasoning || [],
          implementation: parsed.analysis.recommendations || [],
          estimatedImpact: 'moderate',
          prerequisites: [],
          createdAt: new Date() as any
        }] : [],
        confidence: parsed.confidence || 0.8,
        reasoning: parsed.reasoning || [],
        metadata: {
          analysis: parsed.analysis,
          metrics: parsed.metrics
        }
      };
    } catch (error) {
      return this.createFallbackResponse('Failed to parse performance analysis response');
    }
  }

  private parseDrillSuggestionsResponse(response: string): AIResponse {
    try {
      const parsed = JSON.parse(response);
      return {
        content: 'Drill suggestions generated successfully',
        suggestions: parsed.drills ? parsed.drills.map((drill: any, index: number) => ({
          id: `drill_${Date.now()}_${index}`,
          type: 'drill_suggestion',
          title: drill.name,
          description: drill.instructions.join(' '),
          suggestion: 'Drill suggestion generated successfully',
          confidence: parsed.confidence || 0.8,
          reasoning: parsed.reasoning || [],
          implementation: drill.coachingPoints || [],
          estimatedImpact: 'moderate',
          prerequisites: drill.equipment || [],
          createdAt: new Date() as any
        })) : [],
        confidence: parsed.confidence || 0.8,
        reasoning: parsed.reasoning || [],
        metadata: {
          drills: parsed.drills
        }
      };
    } catch (error) {
      return this.createFallbackResponse('Failed to parse drill suggestions response');
    }
  }

  private parseConversationResponse(response: string): AIResponse {
    return {
      content: response,
      confidence: 0.9,
      reasoning: ['Conversation response generated'],
      metadata: {
        type: 'conversation'
      }
    };
  }

  private parseSafetyValidationResponse(response: string): SafetyValidation {
    try {
      const parsed = JSON.parse(response);
      return {
        isSafe: parsed.isSafe || false,
        warnings: parsed.warnings || [],
        riskLevel: parsed.riskLevel || 'medium',
        recommendations: parsed.recommendations || []
      };
    } catch (error) {
      return {
        isSafe: false,
        warnings: ['Failed to parse safety validation response'],
        riskLevel: 'high',
        recommendations: ['Review play manually for safety']
      };
    }
  }

  // ============================================
  // CORE AI REQUEST HANDLING
  // ============================================

  private async makeAIRequest(request: AIRequest): Promise<string> {
    const { prompt, context, options } = request;
    
    const messages = [
      {
        role: 'system',
        content: 'You are an expert sports coaching assistant. Provide helpful, accurate, and safe advice for coaches. Always respond with valid JSON when requested.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const requestBody = {
      model: options?.model || this.config.model,
      messages,
      max_tokens: options?.maxTokens || this.config.maxTokens,
      temperature: options?.temperature || this.config.temperature,
      stream: false
    };

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retries!; attempt++) {
      try {
        const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(this.config.timeout!)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response generated';

      } catch (error) {
        lastError = error as Error;
        console.warn(`AI request attempt ${attempt} failed:`, error);
        
        if (attempt < this.config.retries!) {
          await this.delay(1000 * attempt); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('All AI request attempts failed');
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private getCachedResponse(key: string): AIResponse | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.response;
    }
    this.cache.delete(key);
    return null;
  }

  private cacheResponse(key: string, response: AIResponse): void {
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });
  }

  private createFallbackResponse(message: string): AIResponse {
    return {
      content: message,
      confidence: 0.5,
      reasoning: ['Fallback response due to parsing error'],
      metadata: { error: true }
    };
  }

  private getSafetyRules(ageGroup: string): any {
    const rules = {
      youth: {
        maxPlayers: 11,
        prohibitedPlays: ['blitz_all', 'quarterback_sneak', 'hook_and_ladder'],
        maxRouteDepth: 15,
        requiredRest: true,
        maxContact: 'minimal'
      },
      middle_school: {
        maxPlayers: 11,
        prohibitedPlays: ['blitz_all'],
        maxRouteDepth: 25,
        requiredRest: true,
        maxContact: 'moderate'
      },
      high_school: {
        maxPlayers: 11,
        prohibitedPlays: [],
        maxRouteDepth: 40,
        requiredRest: false,
        maxContact: 'full'
      },
      college: {
        maxPlayers: 11,
        prohibitedPlays: [],
        maxRouteDepth: 50,
        requiredRest: false,
        maxContact: 'full'
      }
    };

    return rules[ageGroup as keyof typeof rules] || rules.high_school;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================
  // PUBLIC UTILITY METHODS
  // ============================================

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  updateConfig(newConfig: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// ============================================
// REACT HOOKS
// ============================================

import { useState, useCallback, useRef } from 'react';

export const useAIService = (config: AIServiceConfig) => {
  const [service] = useState(() => new AIService(config));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePracticePlan = useCallback(async (
    teamContext: TeamContext,
    goals: string[],
    duration: number,
    constraints?: any
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await service.generatePracticePlan(teamContext, goals, duration, constraints);
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
    playerContext?: PlayerContext
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await service.generatePlaySuggestion(gameContext, teamContext, playerContext);
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
    timeRange: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await service.analyzeTeamPerformance(teamContext, performanceData, timeRange);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze performance';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service]);

  const generateDrillSuggestions = useCallback(async (
    teamContext: TeamContext,
    focusAreas: string[],
    duration: number,
    skillLevel: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await service.generateDrillSuggestions(teamContext, focusAreas, duration, skillLevel);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate drill suggestions';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service]);

  const processConversation = useCallback(async (
    message: string,
    conversationHistory: AIConversation[],
    userContext: User,
    teamContext?: TeamContext
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await service.processConversation(message, conversationHistory, userContext, teamContext);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process conversation';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service]);

  const validateSafety = useCallback(async (
    suggestion: AISuggestion,
    teamContext: TeamContext,
    ageGroup: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await service.validateSafety(suggestion, teamContext, ageGroup);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate safety';
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
    generatePracticePlan,
    generatePlaySuggestion,
    analyzeTeamPerformance,
    generateDrillSuggestions,
    processConversation,
    validateSafety,
    clearCache: () => service.clearCache(),
    getCacheStats: () => service.getCacheStats()
  };
}; 