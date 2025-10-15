import { claudeService } from './claude-service';
import { promptOptimizer } from './prompt-optimizer';

// AI Service Types
export type AIServiceType = 'claude' | 'gemini' | 'openai' | 'auto';

// AI Model Capabilities
export interface AIModelCapabilities {
  model: string;
  strengths: string[];
  weaknesses: string[];
  bestFor: string[];
  costPer1kTokens: number;
  maxTokens: number;
  responseTime: 'fast' | 'medium' | 'slow';
}

// Task Classification
export interface AITask {
  type: string;
  complexity: 'simple' | 'medium' | 'complex';
  domain: 'coaching' | 'analysis' | 'generation' | 'evaluation';
  requirements: {
    analytical: boolean;
    creative: boolean;
    structured: boolean;
    fast: boolean;
    costSensitive: boolean;
  };
}

// Service Configuration
export interface AIServiceConfig {
  defaultService: AIServiceType;
  fallbackService: AIServiceType;
  costOptimization: boolean;
  performanceOptimization: boolean;
  autoFallback: boolean;
}

export class AIServiceFactory {
  private config: AIServiceConfig;
  private modelCapabilities: Map<string, AIModelCapabilities> = new Map();
  private taskServiceMapping: Map<string, AIServiceType> = new Map();

  constructor(config?: Partial<AIServiceConfig>) {
    // Try to get configuration from environment
    let envConfig: Partial<AIServiceConfig> = {};
    try {
      const { getAiConfig } = require('../../config/environment');
      const aiConfig = getAiConfig();
      if (aiConfig.enableClaudeService) {
        envConfig = {
          defaultService: 'claude',
          fallbackService: 'gemini',
          costOptimization: true,
          performanceOptimization: true,
          autoFallback: true
        };
      }
    } catch (error) {
      // Use default configuration if environment config is not available
    }

    this.config = {
      defaultService: 'auto',
      fallbackService: 'claude',
      costOptimization: true,
      performanceOptimization: true,
      autoFallback: true,
      ...envConfig,
      ...config
    };

    this.initializeModelCapabilities();
    this.initializeTaskServiceMapping();
  }

  /**
   * Initialize model capabilities for different AI services
   */
  private initializeModelCapabilities(): void {
    this.modelCapabilities = new Map([
      ['claude-3-opus-20240229', {
        model: 'claude-3-opus-20240229',
        strengths: ['Analytical reasoning', 'Complex problem solving', 'Detailed analysis', 'Safety features'],
        weaknesses: ['Higher cost', 'Slower response'],
        bestFor: ['Complex analysis', 'Strategic planning', 'Research tasks', 'Safety-critical applications'],
        costPer1kTokens: 0.015,
        maxTokens: 200000,
        responseTime: 'slow'
      }],
      ['claude-3-sonnet-20240229', {
        model: 'claude-3-sonnet-20240229',
        strengths: ['Balanced performance', 'Good reasoning', 'Cost-effective', 'Reliable'],
        weaknesses: ['Not as powerful as Opus'],
        bestFor: ['General coaching', 'Player analysis', 'Practice planning', 'Performance evaluation'],
        costPer1kTokens: 0.003,
        maxTokens: 200000,
        responseTime: 'medium'
      }],
      ['claude-3-haiku-20240307', {
        model: 'claude-3-haiku-20240307',
        strengths: ['Fast response', 'Low cost', 'Efficient'],
        weaknesses: ['Limited complexity', 'Less detailed analysis'],
        bestFor: ['Simple queries', 'Quick responses', 'Cost-sensitive tasks', 'Basic coaching'],
        costPer1kTokens: 0.00025,
        maxTokens: 200000,
        responseTime: 'fast'
      }],
      ['gemini-pro', {
        model: 'gemini-pro',
        strengths: ['Fast response', 'Good integration', 'Cost-effective'],
        weaknesses: ['Less analytical depth', 'Limited safety features'],
        bestFor: ['Quick generation', 'Basic analysis', 'Integration tasks', 'Cost-sensitive applications'],
        costPer1kTokens: 0.0005,
        maxTokens: 32000,
        responseTime: 'fast'
      }],
      ['gpt-4', {
        model: 'gpt-4',
        strengths: ['High quality', 'Good reasoning', 'Versatile'],
        weaknesses: ['Higher cost', 'API rate limits'],
        bestFor: ['Quality-critical tasks', 'Creative generation', 'Complex reasoning', 'High-stakes decisions'],
        costPer1kTokens: 0.03,
        maxTokens: 8192,
        responseTime: 'medium'
      }],
      ['gpt-3.5-turbo', {
        model: 'gpt-3.5-turbo',
        strengths: ['Fast', 'Cost-effective', 'Reliable'],
        weaknesses: ['Limited complexity', 'Less analytical'],
        bestFor: ['Simple tasks', 'Quick responses', 'Cost-sensitive applications', 'Basic coaching'],
        costPer1kTokens: 0.002,
        maxTokens: 4096,
        responseTime: 'fast'
      }]
    ]);
  }

  /**
   * Initialize task-to-service mapping
   */
  private initializeTaskServiceMapping(): void {
    this.taskServiceMapping = new Map([
      // Coaching tasks
      ['coaching_strategy', 'claude'],
      ['player_development', 'claude'],
      ['team_analysis', 'claude'],
      ['practice_planning', 'claude'],
      
      // Analysis tasks
      ['performance_analysis', 'claude'],
      ['error_analysis', 'claude'],
      ['data_insights', 'claude'],
      ['trend_analysis', 'claude'],
      
      // Generation tasks
      ['content_generation', 'gemini'],
      ['play_design', 'gemini'],
      ['drill_creation', 'gemini'],
      ['report_writing', 'gemini'],
      
      // Evaluation tasks
      ['player_evaluation', 'claude'],
      ['team_evaluation', 'claude'],
      ['performance_assessment', 'claude'],
      ['progress_tracking', 'claude'],
      
      // Quick tasks
      ['simple_query', 'gemini'],
      ['basic_question', 'gemini'],
      ['quick_check', 'gemini'],
      ['status_update', 'gemini']
    ]);
  }

  /**
   * Create AI service based on type
   */
  createService(type: AIServiceType): any {
    switch (type) {
      case 'claude':
        return claudeService;
      case 'gemini':
        return this.createGeminiService();
      case 'openai':
        return this.createOpenAIService();
      case 'auto':
        return this.createAutoService();
      default:
        throw new Error(`Unknown AI service type: ${type}`);
    }
  }

  /**
   * Create Gemini service (placeholder for existing implementation)
   */
  private createGeminiService(): any {
    // This would integrate with your existing Gemini service
    // For now, return a placeholder
    return {
      name: 'Gemini Service',
      analyze: async (request: any) => {
        console.log('Gemini service not fully implemented');
        throw new Error('Gemini service not available');
      }
    };
  }

  /**
   * Create OpenAI service (placeholder for existing implementation)
   */
  private createOpenAIService(): any {
    // This would integrate with your existing OpenAI service
    // For now, return a placeholder
    return {
      name: 'OpenAI Service',
      analyze: async (request: any) => {
        console.log('OpenAI service not fully implemented');
        throw new Error('OpenAI service not available');
      }
    };
  }

  /**
   * Create auto-selecting service
   */
  private createAutoService(): any {
    return {
      name: 'Auto AI Service',
      analyze: async (request: any) => {
        const task: AITask | undefined = request?.task || request?.metadata?.task;
        const selected = task
          ? this.selectBestService(task)
          : this.config.defaultService !== 'auto'
            ? this.config.defaultService
            : 'claude';

        const service = this.createService(selected);
        const payload = { ...request, metadata: { ...request?.metadata, selectedService: selected } };

        if (typeof service.analyze !== 'function') {
          throw new Error(`Selected AI service ${selected} does not support analyze()`);
        }

        return service.analyze(payload);
      }
    };
  }

  /**
   * Select the best AI service for a given task
   */
  selectBestService(task: AITask): AIServiceType {
    const mappedService = this.taskServiceMapping.get(task.type);
    if (mappedService) {
      return mappedService;
    }

    if (task.requirements.analytical && task.requirements.structured) {
      return 'claude';
    }

    if (task.requirements.fast && task.requirements.costSensitive) {
      return 'gemini';
    }

    if (task.requirements.creative && !task.requirements.costSensitive) {
      return 'openai';
    }

    if (task.requirements.fast && task.complexity === 'simple') {
      return 'gemini';
    }

    if (this.config.defaultService !== 'auto') {
      return this.config.defaultService;
    }

    return 'claude';
  }

  /**
   * Get service recommendations for a task
   */
  getServiceRecommendations(task: AITask): Array<{
    service: AIServiceType;
    reason: string;
    confidence: number;
    estimatedCost: number;
    estimatedTime: number;
  }> {
    const recommendations = [];
    
    // Analyze each service for the task
    const services: AIServiceType[] = ['claude', 'gemini', 'openai'];
    
    for (const service of services) {
      const capability = this.getServiceCapability(service);
      const score = this.calculateTaskServiceScore(task, service);
      
      if (score > 0.5) { // Only recommend services with good fit
        recommendations.push({
          service,
          reason: this.getRecommendationReason(task, service),
          confidence: score,
          estimatedCost: this.estimateTaskCost(task, service),
          estimatedTime: this.estimateTaskTime(task, service)
        });
      }
    }
    
    // Sort by confidence score
    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get capability information for a service
   */
  private getServiceCapability(service: AIServiceType): AIModelCapabilities | null {
    // Map service types to specific models
    const modelMap: { [key: string]: string } = {
      'claude': 'claude-3-sonnet-20240229',
      'gemini': 'gemini-pro',
      'openai': 'gpt-4'
    };
    
    const model = modelMap[service];
    return model ? this.modelCapabilities.get(model) || null : null;
  }

  /**
   * Calculate how well a service fits a task
   */
  private calculateTaskServiceScore(task: AITask, service: AIServiceType): number {
    const capability = this.getServiceCapability(service);
    if (!capability) return 0;
    
    let score = 0.5; // Base score
    
    // Adjust based on task requirements
    if (task.requirements.analytical && capability.strengths.some(s => s.includes('Analytical'))) {
      score += 0.2;
    }
    
    if (task.requirements.fast && capability.responseTime === 'fast') {
      score += 0.15;
    }
    
    if (task.requirements.costSensitive && capability.costPer1kTokens < 0.001) {
      score += 0.15;
    }
    
    if (task.complexity === 'complex' && capability.maxTokens > 100000) {
      score += 0.1;
    }
    
    return Math.min(1, score);
  }

  /**
   * Get reason for service recommendation
   */
  private getRecommendationReason(task: AITask, service: AIServiceType): string {
    const capability = this.getServiceCapability(service);
    if (!capability) return 'Service not available';
    
    if (task.requirements.analytical && capability.strengths.some(s => s.includes('Analytical'))) {
      return `Excellent for analytical tasks: ${capability.strengths.join(', ')}`;
    }
    
    if (task.requirements.fast && capability.responseTime === 'fast') {
      return `Fast response time for quick tasks`;
    }
    
    if (task.requirements.costSensitive && capability.costPer1kTokens < 0.001) {
      return `Cost-effective for budget-conscious applications`;
    }
    
    return `Good general performance for ${task.domain} tasks`;
  }

  /**
   * Estimate task cost
   */
  private estimateTaskCost(task: AITask, service: AIServiceType): number {
    const capability = this.getServiceCapability(service);
    if (!capability) return 0;
    
    // Estimate tokens based on task complexity
    const estimatedTokens = task.complexity === 'simple' ? 1000 : 
                           task.complexity === 'medium' ? 3000 : 8000;
    
    return (estimatedTokens / 1000) * capability.costPer1kTokens;
  }

  /**
   * Estimate task completion time
   */
  private estimateTaskTime(task: AITask, service: AIServiceType): number {
    const capability = this.getServiceCapability(service);
    if (!capability) return 0;
    
    // Base time in seconds
    const baseTime = capability.responseTime === 'fast' ? 2 : 
                     capability.responseTime === 'medium' ? 5 : 10;
    
    // Adjust for complexity
    const complexityMultiplier = task.complexity === 'simple' ? 1 : 
                                task.complexity === 'medium' ? 1.5 : 2.5;
    
    return baseTime * complexityMultiplier;
  }

  /**
   * Optimize prompt for the selected service
   */
  async optimizePromptForService(
    prompt: string, 
    service: AIServiceType, 
    task: AITask
  ): Promise<string> {
    const targetModel = this.getTargetModel(service);
    
    const optimizationRequest = {
      originalPrompt: prompt,
      targetModel,
      context: `Task: ${task.type}, Domain: ${task.domain}, Complexity: ${task.complexity}`,
      desiredOutcome: `Optimized prompt for ${service} service to achieve best results`,
      constraints: this.getTaskConstraints(task),
      examples: this.getTaskExamples(task)
    };
    
    try {
      const result = await promptOptimizer.optimizePrompt(optimizationRequest);
      return result.optimizedPrompt;
    } catch (error) {
      console.error('Prompt optimization failed:', error);
      return prompt; // Return original prompt if optimization fails
    }
  }

  /**
   * Get target model for service
   */
  private getTargetModel(service: AIServiceType): string {
    const modelMap: { [key: string]: string } = {
      'claude': 'claude-3',
      'gemini': 'gemini-pro',
      'openai': 'gpt-4'
    };
    
    return modelMap[service] || 'claude-3';
  }

  /**
   * Get task constraints
   */
  private getTaskConstraints(task: AITask): string[] {
    const constraints: string[] = [];
    
    if (task.requirements.costSensitive) {
      constraints.push('Cost optimization required');
    }
    
    if (task.requirements.fast) {
      constraints.push('Fast response time needed');
    }
    
    if (task.requirements.structured) {
      constraints.push('Structured output required');
    }
    
    return constraints;
  }

  /**
   * Get task examples
   */
  private getTaskExamples(task: AITask): string[] {
    // Return relevant examples based on task type and domain
    const examples: { [key: string]: string[] } = {
      'coaching_strategy': [
        'Analyze team strengths and provide strategic recommendations',
        'Create game plan based on opponent analysis'
      ],
      'player_analysis': [
        'Evaluate player performance and suggest improvements',
        'Create development plan for specific skills'
      ],
      'practice_planning': [
        'Design practice session focusing on specific skills',
        'Create progressive drill sequence'
      ]
    };
    
    return examples[task.type] || [];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): AIServiceConfig {
    return { ...this.config };
  }

  /**
   * Get available services
   */
  getAvailableServices(): AIServiceType[] {
    return ['claude', 'gemini', 'openai', 'auto'];
  }

  /**
   * Get service health status
   */
  async getServiceHealth(): Promise<{ [key: string]: boolean }> {
    const health: { [key: string]: boolean } = {};
    
    // Check Claude service
    try {
      health.claude = await claudeService.healthCheck();
    } catch {
      health.claude = false;
    }
    
    // Check other services (placeholder)
    health.gemini = false; // Not implemented yet
    health.openai = false; // Not implemented yet
    
    return health;
  }
}

// Export singleton instance
export const aiServiceFactory = new AIServiceFactory();
