import { errorHandler } from '../../utils/error-handling';
// Claude configuration - inline for now
const claudeConfig = {
  apiKey: process.env.REACT_APP_CLAUDE_API_KEY || '',
  baseUrl:
    process.env.REACT_APP_CLAUDE_BASE_URL ||
    process.env.VITE_CLAUDE_BASE_URL ||
    'https://api.anthropic.com/v1/messages',
  defaultModel:
    process.env.REACT_APP_CLAUDE_MODEL ||
    process.env.VITE_CLAUDE_MODEL ||
    'claude-3-sonnet-20240229',
  defaultOptions: {
    maxTokens: Number(process.env.REACT_APP_CLAUDE_MAX_TOKENS || 4000),
    temperature: Number(process.env.REACT_APP_CLAUDE_TEMPERATURE || 0.7),
    topP: Number(process.env.REACT_APP_CLAUDE_TOP_P || 0.9),
    topK: Number(process.env.REACT_APP_CLAUDE_TOP_K || 50),
  },
};

// Claude API Types
export interface ClaudeRequest {
  type: string;
  data: any;
  options?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
  };
}

export interface ClaudeResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
  metadata?: {
    model: string;
    tokens: number;
    cost: number;
    latency: number;
  };
}

export interface ClaudeAnalysisResult {
  insights: string[];
  recommendations: string[];
  confidence: number;
  reasoning: string;
  nextSteps: string[];
}

export interface ClaudeCoachingInsight {
  type: 'tactical' | 'technical' | 'mental' | 'physical';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  evidence: string[];
}

export interface ClaudeGameStrategy {
  formation: string;
  tactics: string[];
  keyPrinciples: string[];
  adjustments: string[];
  riskAssessment: string;
}

export interface ClaudePlayerAnalysis {
  strengths: string[];
  weaknesses: string[];
  developmentAreas: string[];
  recommendations: string[];
  timeline: string;
}

export class ClaudeService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private defaultOptions: any;

  constructor() {
    // Get configuration from claude-config
    this.apiKey = claudeConfig.apiKey;
    this.baseUrl = claudeConfig.baseUrl;
    this.model = claudeConfig.defaultModel;
    this.defaultOptions = claudeConfig.defaultOptions;
  }

  /**
   * Main analysis method for Claude
   */
  async analyze(request: ClaudeRequest): Promise<ClaudeResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.apiKey) {
        throw new Error('Claude API key not configured');
      }

      const { type, data, options } = request;
      const prompt = this.buildPrompt(type, data);
      const systemPrompt = this.getSystemPrompt(type);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: options?.maxTokens || this.defaultOptions.maxTokens,
          temperature: options?.temperature || this.defaultOptions.temperature,
          top_p: options?.topP || this.defaultOptions.topP,
          top_k: options?.topK || this.defaultOptions.topK,
          messages: [{
            role: 'user',
            content: prompt
          }],
          system: systemPrompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Claude API error: ${response.status} ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      const latency = Date.now() - startTime;
      
      const parsedResponse = this.parseResponse(result, type);
      
      return {
        success: true,
        data: parsedResponse,
        metadata: {
          model: this.model,
          tokens: result.usage?.input_tokens + result.usage?.output_tokens || 0,
          cost: this.calculateCost(result.usage?.input_tokens + result.usage?.output_tokens || 0),
          latency
        }
      };

    } catch (error) {
      const appError = errorHandler.handleError(error, 'claude_service');
      return {
        success: false,
        error: appError.message,
        metadata: {
          model: this.model,
          tokens: 0,
          cost: 0,
          latency: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Build specialized prompts for different analysis types
   */
  private buildPrompt(type: string, data: any): string {
    switch (type) {
      case 'error_pattern_analysis':
        return this.buildErrorAnalysisPrompt(data);
      case 'coaching_strategy':
        return this.buildCoachingStrategyPrompt(data);
      case 'player_analysis':
        return this.buildPlayerAnalysisPrompt(data);
      case 'game_strategy_analysis':
        return this.buildGameStrategyPrompt(data);
      case 'personalized_coaching':
        return this.buildPersonalizedCoachingPrompt(data);
      case 'prompt_optimization':
        return this.buildPromptOptimizationPrompt(data);
      case 'team_performance_analysis':
        return this.buildTeamPerformancePrompt(data);
      case 'practice_plan_generation':
        return this.buildPracticePlanPrompt(data);
      default:
        return `Please analyze the following data and provide insights:\n\n${JSON.stringify(data, null, 2)}`;
    }
  }

  /**
   * Build error analysis prompt
   */
  private buildErrorAnalysisPrompt(data: any): string {
    return `Analyze the following error logs from a sports coaching application and provide insights:

Error Data:
${JSON.stringify(data.errors, null, 2)}

Context: ${data.context}
Timeframe: ${data.timeframe}

Please provide:
1. Error pattern analysis
2. Root cause identification
3. Impact assessment
4. Improvement recommendations
5. Priority order for fixes

Format your response as structured JSON with these fields.`;
  }

  /**
   * Build coaching strategy prompt
   */
  private buildCoachingStrategyPrompt(data: any): string {
    return `As an expert football coach with 20+ years experience, analyze this team situation and provide strategic advice:

Team Profile:
${JSON.stringify(data.teamProfile, null, 2)}

Current Situation:
${JSON.stringify(data.situation, null, 2)}

Please provide:
1. Strategic recommendations
2. Practice focus areas
3. Player development priorities
4. Game day tactics
5. Risk mitigation strategies

Format your response as structured JSON with these fields.`;
  }

  /**
   * Build player analysis prompt
   */
  private buildPlayerAnalysisPrompt(data: any): string {
    return `As a sports performance analyst, analyze this player data and provide development recommendations:

Player Data:
${JSON.stringify(data.playerData, null, 2)}

Performance Metrics:
${JSON.stringify(data.performanceMetrics, null, 2)}

Please provide:
1. Strengths identification
2. Areas for improvement
3. Development recommendations
4. Timeline for progress
5. Specific drills/exercises

Format your response as structured JSON with these fields.`;
  }

  /**
   * Build game strategy prompt
   */
  private buildGameStrategyPrompt(data: any): string {
    return `As a tactical football coach, analyze this game situation and provide strategic insights:

Game Data:
${JSON.stringify(data.gameData, null, 2)}

Team Strengths:
${JSON.stringify(data.teamStrengths, null, 2)}

Opponent Analysis:
${JSON.stringify(data.opponentAnalysis, null, 2)}

Historical Data:
${JSON.stringify(data.historicalData, null, 2)}

Please provide:
1. Recommended formation
2. Key tactical principles
3. Strategic adjustments
4. Risk assessment
5. Success metrics

Format your response as structured JSON with these fields.`;
  }

  /**
   * Build personalized coaching prompt
   */
  private buildPersonalizedCoachingPrompt(data: any): string {
    return `As a personalized coaching specialist, analyze this player and provide tailored insights:

Player Profile:
${JSON.stringify(data.player, null, 2)}

Performance History:
${JSON.stringify(data.performance, null, 2)}

Goals:
${JSON.stringify(data.goals, null, 2)}

Team Context:
${JSON.stringify(data.teamContext, null, 2)}

Please provide:
1. Personalized coaching insights
2. Development roadmap
3. Motivation strategies
4. Communication approach
5. Progress tracking methods

Format your response as structured JSON with these fields.`;
  }

  /**
   * Build prompt optimization prompt
   */
  private buildPromptOptimizationPrompt(data: any): string {
    return `As an AI prompt engineering expert, optimize this prompt for better results:

Original Prompt:
${data.originalPrompt}

Target Model: ${data.targetModel}
Context: ${data.context}
Desired Outcome: ${data.desiredOutcome}

Please provide:
1. Optimized prompt
2. Key improvements made
3. Reasoning for changes
4. Expected outcome improvements
5. Additional context suggestions

Format your response as structured JSON with these fields.`;
  }

  /**
   * Build team performance prompt
   */
  private buildTeamPerformancePrompt(data: any): string {
    return `As a team performance analyst, analyze this team data and provide insights:

Team Data:
${JSON.stringify(data.teamData, null, 2)}

Performance Metrics:
${JSON.stringify(data.performanceMetrics, null, 2)}

Goals:
${JSON.stringify(data.goals, null, 2)}

Please provide:
1. Performance analysis
2. Strengths and weaknesses
3. Improvement areas
4. Strategic recommendations
5. Success metrics

Format your response as structured JSON with these fields.`;
  }

  /**
   * Build practice plan prompt
   */
  private buildPracticePlanPrompt(data: any): string {
    return `As an expert practice planner, create a comprehensive practice plan:

Team Profile:
${JSON.stringify(data.teamProfile, null, 2)}

Focus Areas:
${JSON.stringify(data.focusAreas, null, 2)}

Available Time: ${data.availableTime}
Equipment: ${data.equipment}

Please provide:
1. Practice structure
2. Drill sequences
3. Time allocations
4. Progression plan
5. Success criteria

Format your response as structured JSON with these fields.`;
  }

  /**
   * Get system prompts for different analysis types
   */
  private getSystemPrompt(type: string): string {
    const prompts: { [key: string]: string } = {
      error_pattern_analysis: `You are an expert software engineer specializing in error analysis and system optimization. Analyze error patterns to identify root causes and provide actionable improvement recommendations. Always respond with valid JSON.`,
      
      coaching_strategy: `You are an expert football coach with 20+ years of experience at the highest levels. You specialize in strategic planning, team development, and tactical analysis. Provide practical, actionable advice based on proven coaching principles. Always respond with valid JSON.`,
      
      player_analysis: `You are a sports performance analyst with expertise in player development, performance metrics, and coaching methodologies. Provide data-driven insights and practical recommendations for player improvement. Always respond with valid JSON.`,
      
      game_strategy_analysis: `You are a tactical football coach specializing in game strategy, formation analysis, and opponent scouting. Provide strategic insights based on current game situations and historical data. Always respond with valid JSON.`,
      
      personalized_coaching: `You are a personalized coaching specialist who understands individual player psychology, motivation, and development needs. Provide tailored coaching insights that consider the unique characteristics of each player. Always respond with valid JSON.`,
      
      prompt_optimization: `You are an AI prompt engineering expert who understands how to craft effective prompts for different AI models. Optimize prompts for clarity, specificity, and desired outcomes. Always respond with valid JSON.`,
      
      team_performance_analysis: `You are a team performance analyst specializing in sports analytics, team dynamics, and performance optimization. Provide comprehensive analysis and strategic recommendations for team improvement. Always respond with valid JSON.`,
      
      practice_plan_generation: `You are an expert practice planner with deep knowledge of sports training methodologies, drill progression, and skill development. Create comprehensive, effective practice plans that maximize learning and improvement. Always respond with valid JSON.`
    };
    
    return prompts[type] || 'You are a helpful AI assistant specializing in sports coaching and analysis. Always respond with valid JSON when requested.';
  }

  /**
   * Parse Claude's response based on analysis type
   */
  private parseResponse(result: any, type: string): any {
    try {
      const content = result.content[0]?.text || '';
      
      // Try to parse as JSON first
      try {
        return JSON.parse(content);
      } catch {
        // If not JSON, try to extract structured information
        return this.extractStructuredInfo(content, type);
      }
    } catch (error) {
      console.error('Failed to parse Claude response:', error);
      return { rawResponse: result.content[0]?.text || 'No response' };
    }
  }

  /**
   * Extract structured information from non-JSON responses
   */
  private extractStructuredInfo(content: string, type: string): any {
    // Basic extraction logic for non-JSON responses
    const sections = content.split('\n\n');
    const structured: any = {};
    
    sections.forEach(section => {
      if (section.includes(':')) {
        const [key, ...values] = section.split(':');
        structured[key.trim()] = values.join(':').trim();
      }
    });
    
    return structured;
  }

  /**
   * Calculate cost based on token usage
   * Claude 3 Sonnet pricing: $3 per 1M input tokens, $15 per 1M output tokens
   */
  private calculateCost(totalTokens: number): number {
    const inputTokens = Math.floor(totalTokens * 0.8); // Estimate 80% input, 20% output
    const outputTokens = totalTokens - inputTokens;
    
    const inputCost = (inputTokens / 1000000) * 3;
    const outputCost = (outputTokens / 1000000) * 15;
    
    return Math.round((inputCost + outputCost) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Health check for Claude service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.analyze({
        type: 'health_check',
        data: { message: 'Hello' },
        options: { maxTokens: 10 }
      });
      return response.success;
    } catch {
      return false;
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
  }

  /**
   * Update model configuration
   */
  updateModel(model: string): void {
    if (this.getAvailableModels().includes(model)) {
      this.model = model;
    } else {
      throw new Error(`Invalid model: ${model}`);
    }
  }
}

// Export singleton instance
export const claudeService = new ClaudeService();
