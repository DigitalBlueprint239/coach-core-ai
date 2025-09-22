import { claudeService, ClaudeRequest } from '../../services/ai/claude-service';
import { aiServiceFactory, AIServiceType, AITask } from '../../services/ai/ai-service-factory';
import { errorHandler } from '../../utils/error-handling';

// Enhanced AI Brain with Claude integration
export class CoachCoreAIBrain {
  private static instance: CoachCoreAIBrain;
  private claudeService = claudeService;
  private aiServiceFactory = aiServiceFactory;

  // Singleton pattern
  static getInstance(): CoachCoreAIBrain {
    if (!CoachCoreAIBrain.instance) {
      CoachCoreAIBrain.instance = new CoachCoreAIBrain();
    }
    return CoachCoreAIBrain.instance;
  }

  // === Practice Plan Generation ===
  async generateSmartPractice(input: any): Promise<any> {
    try {
      const task: AITask = {
        type: 'practice_planning',
        complexity: 'medium',
        domain: 'coaching',
        requirements: {
          analytical: true,
          creative: true,
          structured: true,
          fast: false,
          costSensitive: false
        }
      };

      // Use Claude for practice planning
      const claudeRequest: ClaudeRequest = {
        type: 'practice_plan_generation',
        data: {
          teamProfile: input.teamProfile,
          focusAreas: input.focusAreas,
          availableTime: input.availableTime,
          equipment: input.equipment,
          skillLevel: input.skillLevel,
          previousPractices: input.previousPractices
        },
        options: {
          maxTokens: 4000,
          temperature: 0.7
        }
      };

      const response = await this.claudeService.analyze(claudeRequest);
      
      if (response.success && response.data) {
        return {
          plan: response.data,
          insights: response.data.insights || [],
          confidence: 0.9,
          alternatives: response.data.alternatives || [],
          metadata: response.metadata
        };
      } else {
        throw new Error(response.error || 'Failed to generate practice plan');
      }
    } catch (error) {
      const appError = errorHandler.handleError(error, 'ai_brain_practice_generation');
      console.error('Practice plan generation failed:', appError);
      
      // Fallback to basic plan
      return {
        plan: this.generateFallbackPracticePlan(input),
        insights: ['Using fallback practice plan due to AI service unavailability'],
        confidence: 0.6,
        alternatives: [],
        metadata: { fallback: true }
      };
    }
  }

  // === Practice History Retrieval ===
  async getRecentPractices(teamId: string): Promise<any[]> {
    try {
      // Use Claude to analyze practice history patterns
      const claudeRequest: ClaudeRequest = {
        type: 'team_performance_analysis',
        data: {
          teamId,
          analysisType: 'practice_history',
          timeRange: 'last_30_days'
        },
        options: {
          maxTokens: 2000,
          temperature: 0.3
        }
      };

      const response = await this.claudeService.analyze(claudeRequest);
      
      if (response.success && response.data) {
        return response.data.practices || [];
      }
    } catch (error) {
      console.error('Practice history analysis failed:', error);
    }

    // Fallback to basic retrieval
    return [];
  }

  // === Real-Time Play/Strategy Insights ===
  async getRealtimeInsight(context: any): Promise<any> {
    try {
      const task: AITask = {
        type: 'game_strategy_analysis',
        complexity: 'complex',
        domain: 'coaching',
        requirements: {
          analytical: true,
          creative: false,
          structured: true,
          fast: true,
          costSensitive: false
        }
      };

      // Use Claude for real-time strategic analysis
      const claudeRequest: ClaudeRequest = {
        type: 'game_strategy_analysis',
        data: {
          gameData: context.gameData,
          teamStrengths: context.teamStrengths,
          opponentAnalysis: context.opponentAnalysis,
          currentScore: context.currentScore,
          timeRemaining: context.timeRemaining,
          possession: context.possession
        },
        options: {
          maxTokens: 3000,
          temperature: 0.5
        }
      };

      const response = await this.claudeService.analyze(claudeRequest);
      
      if (response.success && response.data) {
        return {
          suggestion: response.data.recommendation || '',
          confidence: response.data.confidence || 0.8,
          reasoning: response.data.reasoning || [],
          urgency: response.data.urgency || 'medium',
          tacticalAdjustments: response.data.tacticalAdjustments || [],
          riskAssessment: response.data.riskAssessment || 'low'
        };
      }
    } catch (error) {
      console.error('Real-time insight generation failed:', error);
    }

    // Fallback to basic insight
    return {
      suggestion: 'Maintain current strategy and focus on fundamentals',
      confidence: 0.6,
      reasoning: ['Fallback recommendation due to AI service unavailability'],
      urgency: 'low'
    };
  }

  // === Progress & Analytics ===
  async analyzeProgress(
    userId: string,
    metricType: string,
    timeRange: any
  ): Promise<any> {
    try {
      const task: AITask = {
        type: 'performance_analysis',
        complexity: 'medium',
        domain: 'analysis',
        requirements: {
          analytical: true,
          creative: false,
          structured: true,
          fast: false,
          costSensitive: false
        }
      };

      // Use Claude for comprehensive progress analysis
      const claudeRequest: ClaudeRequest = {
        type: 'team_performance_analysis',
        data: {
          userId,
          metricType,
          timeRange,
          analysisDepth: 'comprehensive',
          includePredictions: true,
          includeRecommendations: true
        },
        options: {
          maxTokens: 4000,
          temperature: 0.3
        }
      };

      const response = await this.claudeService.analyze(claudeRequest);
      
      if (response.success && response.data) {
        return {
          trends: response.data.trends || [],
          predictions: response.data.predictions || [],
          insights: response.data.insights || [],
          recommendations: response.data.recommendations || [],
          confidence: response.data.confidence || 0.8,
          metadata: response.metadata
        };
      }
    } catch (error) {
      console.error('Progress analysis failed:', error);
    }

    // Fallback to basic analysis
    return {
      trends: [],
      predictions: [],
      insights: ['Basic analysis available - AI service temporarily unavailable'],
      recommendations: ['Continue current training regimen'],
      confidence: 0.5
    };
  }

  // === Conversational AI ===
  async processMessage(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<any> {
    try {
      const task: AITask = {
        type: 'conversational_ai',
        complexity: 'medium',
        domain: 'coaching',
        requirements: {
          analytical: true,
          creative: true,
          structured: false,
          fast: true,
          costSensitive: false
        }
      };

      // Use Claude for natural language processing and coaching responses
      const claudeRequest: ClaudeRequest = {
        type: 'personalized_coaching',
        data: {
          userId,
          message,
          conversationId,
          coachingContext: 'conversational',
          responseStyle: 'helpful_and_encouraging'
        },
        options: {
          maxTokens: 2000,
          temperature: 0.7
        }
      };

      const response = await this.claudeService.analyze(claudeRequest);
      
      if (response.success && response.data) {
        return {
          response: response.data.response || '',
          suggestions: response.data.suggestions || [],
          actions: response.data.actions || [],
          metadata: {
            intent: response.data.intent || 'general',
            confidence: response.data.confidence || 0.8,
            followUpQuestions: response.data.followUpQuestions || []
          }
        };
      }
    } catch (error) {
      console.error('Message processing failed:', error);
    }

    // Fallback to basic response
    return {
      response: 'I understand your question. Let me help you with that.',
      suggestions: ['Please try rephrasing your question'],
      actions: [],
      metadata: { fallback: true }
    };
  }

  // === Onboarding Personalization ===
  async personalizeOnboarding(userProfile: any): Promise<any> {
    try {
      const task: AITask = {
        type: 'personalized_coaching',
        complexity: 'medium',
        domain: 'coaching',
        requirements: {
          analytical: true,
          creative: true,
          structured: true,
          fast: false,
          costSensitive: false
        }
      };

      // Use Claude to create personalized onboarding experience
      const claudeRequest: ClaudeRequest = {
        type: 'personalized_coaching',
        data: {
          userProfile,
          onboardingType: 'new_user',
          preferences: userProfile.preferences,
          goals: userProfile.goals,
          experience: userProfile.experience
        },
        options: {
          maxTokens: 3000,
          temperature: 0.6
        }
      };

      const response = await this.claudeService.analyze(claudeRequest);
      
      if (response.success && response.data) {
        return {
          steps: response.data.onboardingSteps || [],
          timeline: response.data.timeline || '2-3 weeks',
          milestones: response.data.milestones || [],
          personalizationLevel: response.data.personalizationLevel || 'high'
        };
      }
    } catch (error) {
      console.error('Onboarding personalization failed:', error);
    }

    // Fallback to standard onboarding
    return {
      steps: [
        'Complete profile setup',
        'Take skill assessment',
        'Set initial goals',
        'First practice session'
      ],
      timeline: '2-3 weeks',
      milestones: ['Profile complete', 'Assessment done', 'Goals set'],
      personalizationLevel: 'standard'
    };
  }

  // === Notifications ===
  async getSmartNotification(userId: string): Promise<any> {
    try {
      const task: AITask = {
        type: 'notification_optimization',
        complexity: 'simple',
        domain: 'coaching',
        requirements: {
          analytical: true,
          creative: false,
          structured: true,
          fast: true,
          costSensitive: true
        }
      };

      // Use Claude to determine optimal notification timing and content
      const claudeRequest: ClaudeRequest = {
        type: 'personalized_coaching',
        data: {
          userId,
          notificationType: 'smart_reminder',
          userPreferences: await this.getUserPreferences(userId),
          recentActivity: await this.getRecentActivity(userId)
        },
        options: {
          maxTokens: 1000,
          temperature: 0.4
        }
      };

      const response = await this.claudeService.analyze(claudeRequest);
      
      if (response.success && response.data) {
        return {
          message: response.data.message || '',
          timing: response.data.optimalTiming || new Date(),
          priority: response.data.priority || 'medium',
          actionRequired: response.data.actionRequired || false
        };
      }
    } catch (error) {
      console.error('Smart notification generation failed:', error);
    }

    // Fallback to basic notification
    return {
      message: 'Time for your next practice session!',
      timing: new Date(),
      priority: 'medium',
      actionRequired: false
    };
  }

  // === Payments/Churn Prediction ===
  async predictChurn(userId: string): Promise<any> {
    try {
      const task: AITask = {
        type: 'churn_prediction',
        complexity: 'complex',
        domain: 'analysis',
        requirements: {
          analytical: true,
          creative: false,
          structured: true,
          fast: false,
          costSensitive: false
        }
      };

      // Use Claude for churn prediction and intervention strategies
      const claudeRequest: ClaudeRequest = {
        type: 'team_performance_analysis',
        data: {
          userId,
          analysisType: 'churn_prediction',
          userBehavior: await this.getUserBehavior(userId),
          engagementMetrics: await this.getEngagementMetrics(userId),
          paymentHistory: await this.getPaymentHistory(userId)
        },
        options: {
          maxTokens: 3000,
          temperature: 0.3
        }
      };

      const response = await this.claudeService.analyze(claudeRequest);
      
      if (response.success && response.data) {
        return {
          risk: response.data.churnRisk || 0.1,
          suggestions: response.data.interventionStrategies || [],
          timeline: response.data.riskTimeline || '30 days',
          confidence: response.data.confidence || 0.8,
          factors: response.data.riskFactors || []
        };
      }
    } catch (error) {
      console.error('Churn prediction failed:', error);
    }

    // Fallback to basic prediction
    return {
      risk: 0.1,
      suggestions: ['Maintain regular engagement', 'Provide value consistently'],
      timeline: '30 days',
      confidence: 0.6
    };
  }

  // === Feedback Loop ===
  recordOutcome(type: string, outcome: 'success' | 'failure' | 'neutral') {
    try {
      // Log outcome for learning
      console.log(`AI Brain Outcome: ${type} - ${outcome}`);
      
      // Update internal models based on outcomes
      this.updateInternalModels(type, outcome);
      
      // Record for Claude analysis
      this.recordOutcomeForAnalysis(type, outcome);
    } catch (error) {
      console.error('Failed to record outcome:', error);
    }
  }

  // === Advanced Claude Integration Methods ===

  /**
   * Generate comprehensive coaching strategy
   */
  async generateCoachingStrategy(teamData: any, situation: any): Promise<any> {
    try {
      const claudeRequest: ClaudeRequest = {
        type: 'coaching_strategy',
        data: {
          teamProfile: teamData,
          situation,
          strategicDepth: 'comprehensive',
          includeAlternatives: true
        },
        options: {
          maxTokens: 5000,
          temperature: 0.6
        }
      };

      const response = await this.claudeService.analyze(claudeRequest);
      
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Coaching strategy generation failed:', error);
    }

    return { strategy: 'Maintain current approach', confidence: 0.5 };
  }

  /**
   * Analyze player performance with Claude
   */
  async analyzePlayerPerformance(playerData: any): Promise<any> {
    try {
      const claudeRequest: ClaudeRequest = {
        type: 'player_analysis',
        data: {
          playerData,
          analysisDepth: 'comprehensive',
          includeRecommendations: true,
          developmentFocus: true
        },
        options: {
          maxTokens: 4000,
          temperature: 0.4
        }
      };

      const response = await this.claudeService.analyze(claudeRequest);
      
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Player performance analysis failed:', error);
    }

    return { analysis: 'Basic analysis available', confidence: 0.5 };
  }

  /**
   * Get AI service recommendations for a task
   */
  getServiceRecommendations(task: AITask): any[] {
    return this.aiServiceFactory.getServiceRecommendations(task);
  }

  /**
   * Optimize prompt for specific AI service
   */
  async optimizePromptForService(
    prompt: string, 
    service: AIServiceType, 
    task: AITask
  ): Promise<string> {
    return this.aiServiceFactory.optimizePromptForService(prompt, service, task);
  }

  // === Helper Methods ===

  private generateFallbackPracticePlan(input: any): any {
    return {
      warmup: ['Light jogging', 'Dynamic stretching', 'Basic drills'],
      mainSession: ['Skill development', 'Team coordination', 'Game scenarios'],
      cooldown: ['Static stretching', 'Team discussion', 'Goal setting'],
      duration: '90 minutes',
      focus: 'Fundamental skills and team building'
    };
  }

  private async getUserPreferences(userId: string): Promise<any> {
    // TODO: Implement user preferences retrieval
    return { notificationFrequency: 'daily', preferredTime: 'morning' };
  }

  private async getRecentActivity(userId: string): Promise<any[]> {
    // TODO: Implement recent activity retrieval
    return [];
  }

  private async getUserBehavior(userId: string): Promise<any> {
    // TODO: Implement user behavior analysis
    return { engagementLevel: 'medium', lastActive: new Date() };
  }

  private async getEngagementMetrics(userId: string): Promise<any> {
    // TODO: Implement engagement metrics retrieval
    return { loginFrequency: 3, featureUsage: 0.7 };
  }

  private async getPaymentHistory(userId: string): Promise<any[]> {
    // TODO: Implement payment history retrieval
    return [];
  }

  private updateInternalModels(type: string, outcome: string): void {
    // TODO: Implement internal model updates based on outcomes
    console.log(`Updating internal models for ${type}: ${outcome}`);
  }

  private recordOutcomeForAnalysis(type: string, outcome: string): void {
    // TODO: Implement outcome recording for Claude analysis
    console.log(`Recording outcome for Claude analysis: ${type} - ${outcome}`);
  }

  // === Health Check ===
  async healthCheck(): Promise<boolean> {
    try {
      const claudeHealth = await this.claudeService.healthCheck();
      const serviceHealth = await this.aiServiceFactory.getServiceHealth();
      
      return claudeHealth && Object.values(serviceHealth).some(healthy => healthy);
    } catch (error) {
      console.error('AI Brain health check failed:', error);
      return false;
    }
  }
}

// Export a singleton instance for convenience
export const AIBrain = CoachCoreAIBrain.getInstance();
