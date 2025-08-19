"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEnhancedAIService = exports.EnhancedAIService = void 0;
// ============================================
// ENHANCED AI SERVICE CLASS
// ============================================
class EnhancedAIService {
    constructor(config) {
        this.cache = new Map();
        this.requestQueue = new Map();
        this.performanceMetrics = {
            averageResponseTime: 0,
            successRate: 0,
            totalRequests: 0,
            totalTokens: 0,
            totalCost: 0,
            errorRate: 0
        };
        this.rateLimitTracker = new Map();
        this.config = Object.assign({ timeout: 30000, retries: 3, baseUrl: 'https://api.openai.com/v1', enableStreaming: false, enableCaching: true, cacheTTL: 5 * 60 * 1000, enableRateLimiting: true, rateLimitPerMinute: 60 }, config);
    }
    // ============================================
    // ENHANCED CORE METHODS
    // ============================================
    generatePracticePlan(teamContext, goals, duration, constraints, userId) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    return this.requestQueue.get(cacheKey);
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
                    this.updatePerformanceMetrics({}, false);
                    throw error;
                }).finally(() => {
                    this.requestQueue.delete(cacheKey);
                });
                this.requestQueue.set(cacheKey, promise);
                return yield promise;
            }
            catch (error) {
                this.updatePerformanceMetrics({}, false);
                throw this.handleError(error, 'generatePracticePlan');
            }
        });
    }
    generatePlaySuggestion(gameContext, teamContext, playerContext, userId) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const response = yield this.makeEnhancedAIRequest({
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
            }
            catch (error) {
                this.updatePerformanceMetrics({}, false);
                throw this.handleError(error, 'generatePlaySuggestion');
            }
        });
    }
    analyzeTeamPerformance(teamContext, performanceData, timeRange, userId) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const response = yield this.makeEnhancedAIRequest({
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
            }
            catch (error) {
                this.updatePerformanceMetrics({}, false);
                throw this.handleError(error, 'analyzeTeamPerformance');
            }
        });
    }
    // ============================================
    // ENHANCED PROMPT BUILDERS
    // ============================================
    buildEnhancedPracticePlanPrompt(teamContext, goals, duration, constraints) {
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
    buildEnhancedPlaySuggestionPrompt(gameContext, teamContext, playerContext) {
        var _a;
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
- Available Players: ${playerContext ? ((_a = playerContext.availablePlayers) === null || _a === void 0 ? void 0 : _a.length) || 'unknown' : 'unknown'}
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
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    checkRateLimit(userId) {
        if (!this.config.enableRateLimiting)
            return true;
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        if (!this.rateLimitTracker.has(userId)) {
            this.rateLimitTracker.set(userId, [now]);
            return true;
        }
        const userRequests = this.rateLimitTracker.get(userId);
        const recentRequests = userRequests.filter(time => time > oneMinuteAgo);
        if (recentRequests.length >= this.config.rateLimitPerMinute) {
            return false;
        }
        recentRequests.push(now);
        this.rateLimitTracker.set(userId, recentRequests);
        return true;
    }
    addMetadata(response, requestId, startTime, feature, userId) {
        return Object.assign(Object.assign({}, response), { metadata: {
                requestId,
                timestamp: startTime,
                userId,
                feature,
                model: this.config.model,
                responseTime: Date.now() - startTime
            }, modelUsed: this.config.model, processingTime: Date.now() - startTime });
    }
    updatePerformanceMetrics(response, success) {
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
        }
        else {
            this.performanceMetrics.errorRate =
                (this.performanceMetrics.errorRate * (this.performanceMetrics.totalRequests - 1) + 1) /
                    this.performanceMetrics.totalRequests;
        }
    }
    handleError(error, method) {
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
    getPerformanceMetrics() {
        return Object.assign({}, this.performanceMetrics);
    }
    clearCache() {
        this.cache.clear();
    }
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
    updateConfig(newConfig) {
        this.config = Object.assign(Object.assign({}, this.config), newConfig);
    }
    resetRateLimit(userId) {
        this.rateLimitTracker.delete(userId);
    }
}
exports.EnhancedAIService = EnhancedAIService;
// ============================================
// ENHANCED REACT HOOKS
// ============================================
const react_1 = require("react");
const useEnhancedAIService = (config) => {
    const [service] = (0, react_1.useState)(() => new EnhancedAIService(config));
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [performanceMetrics, setPerformanceMetrics] = (0, react_1.useState)(null);
    // Update performance metrics periodically
    (0, react_1.useEffect)(() => {
        const interval = setInterval(() => {
            setPerformanceMetrics(service.getPerformanceMetrics());
        }, 5000);
        return () => clearInterval(interval);
    }, [service]);
    const generatePracticePlan = (0, react_1.useCallback)((teamContext, goals, duration, constraints, userId) => __awaiter(void 0, void 0, void 0, function* () {
        setLoading(true);
        setError(null);
        try {
            const result = yield service.generatePracticePlan(teamContext, goals, duration, constraints, userId);
            return result;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate practice plan';
            setError(errorMessage);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }), [service]);
    const generatePlaySuggestion = (0, react_1.useCallback)((gameContext, teamContext, playerContext, userId) => __awaiter(void 0, void 0, void 0, function* () {
        setLoading(true);
        setError(null);
        try {
            const result = yield service.generatePlaySuggestion(gameContext, teamContext, playerContext, userId);
            return result;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate play suggestion';
            setError(errorMessage);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }), [service]);
    const analyzeTeamPerformance = (0, react_1.useCallback)((teamContext, performanceData, timeRange, userId) => __awaiter(void 0, void 0, void 0, function* () {
        setLoading(true);
        setError(null);
        try {
            const result = yield service.analyzeTeamPerformance(teamContext, performanceData, timeRange, userId);
            return result;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to analyze performance';
            setError(errorMessage);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }), [service]);
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
        resetRateLimit: (userId) => service.resetRateLimit(userId)
    };
};
exports.useEnhancedAIService = useEnhancedAIService;
