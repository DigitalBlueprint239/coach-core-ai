// Comprehensive error handling utilities for Coach Core AI

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  userId?: string;
  context?: string;
}

export interface ErrorAnalysis {
  patterns: string[];
  rootCauses: string[];
  impactAssessment: string;
  recommendations: string[];
  priorityOrder: string[];
  estimatedResolutionTime: string;
  confidence: number;
}

export interface ClaudeEnhancedErrorHandler extends ErrorHandler {
  /**
   * Use Claude to analyze error patterns and suggest improvements
   */
  analyzeErrorPatterns(): Promise<ErrorAnalysis>;
  
  /**
   * Generate user-friendly error messages using Claude
   */
  generateUserFriendlyMessage(error: AppError): Promise<string>;
  
  /**
   * Get intelligent error resolution suggestions
   */
  getResolutionSuggestions(error: AppError): Promise<string[]>;
  
  /**
   * Analyze error trends over time
   */
  analyzeErrorTrends(timeframe: string): Promise<any>;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  protected errorLog: AppError[] = [];
  protected maxLogSize = 100;

  protected constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle and categorize errors
   */
  handleError(error: any, context?: string, userId?: string): AppError {
    const appError: AppError = {
      code: this.getErrorCode(error),
      message: this.getErrorMessage(error),
      details: this.getErrorDetails(error),
      timestamp: new Date(),
      userId,
      context,
    };

    // Log the error
    this.logError(appError);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 App Error:', appError);
    }

    return appError;
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: AppError): string {
    const errorMessages: { [key: string]: string } = {
      'auth/user-not-found':
        'Account not found. Please check your email and try again.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/email-already-in-use':
        'An account with this email already exists. Please sign in instead.',
      'auth/weak-password':
        'Password is too weak. Please use at least 8 characters with numbers and symbols.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests':
        'Too many failed attempts. Please try again later.',
      'auth/network-request-failed':
        'Network error. Please check your connection and try again.',
      'firestore/permission-denied':
        'Access denied. You may not have permission to perform this action.',
      'firestore/unavailable':
        'Service temporarily unavailable. Please try again later.',
      'firestore/deadline-exceeded': 'Request timed out. Please try again.',
      'waitlist/email-exists': 'This email is already on our waitlist.',
      'waitlist/invalid-email': 'Please enter a valid email address.',
      'validation/email-invalid': 'Please enter a valid email address.',
      'validation/password-weak':
        'Password is too weak. Please choose a stronger password.',
      'validation/name-invalid': 'Please enter a valid name.',
      'rate-limit/exceeded':
        'Too many attempts. Please wait a moment and try again.',
      'claude_service/unavailable': 'AI analysis service temporarily unavailable.',
      'claude_service/rate_limited': 'AI service rate limit reached. Please try again later.',
      'claude_service/invalid_response': 'AI service returned invalid response.',
      'ai_factory/service_unavailable': 'Selected AI service is currently unavailable.',
      'ai_factory/invalid_configuration': 'AI service configuration error.',
      'prompt_optimizer/failed': 'Prompt optimization failed. Using original prompt.',
      unknown: 'Something went wrong. Please try again or contact support.',
    };

    return (
      errorMessages[error.code] ||
      error.message ||
      'An unexpected error occurred.'
    );
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error: AppError): boolean {
    const retryableCodes = [
      'firestore/unavailable',
      'firestore/deadline-exceeded',
      'auth/network-request-failed',
      'rate-limit/exceeded',
      'claude_service/rate_limited',
      'claude_service/unavailable',
      'ai_factory/service_unavailable'
    ];

    return retryableCodes.includes(error.code);
  }

  /**
   * Get retry delay for retryable errors
   */
  getRetryDelay(error: AppError, attempt: number): number {
    if (!this.isRetryableError(error)) return 0;

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const baseDelay = 1000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    return delay + jitter;
  }

  /**
   * Log error for debugging
   */
  private logError(error: AppError): void {
    this.errorLog.push(error);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
  }

  /**
   * Get error code from various error types
   */
  private getErrorCode(error: any): string {
    if (error?.code) return error.code;
    if (error?.name) return error.name;
    if (error?.type) return error.type;
    return 'unknown';
  }

  /**
   * Get error message from various error types
   */
  private getErrorMessage(error: any): string {
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    if (typeof error === 'string') return error;
    return 'An unknown error occurred';
  }

  /**
   * Get additional error details
   */
  private getErrorDetails(error: any): any {
    if (error?.details) return error.details;
    if (error?.stack) return { stack: error.stack };
    if (error?.cause) return { cause: error.cause };
    return null;
  }

  /**
   * Get error log for debugging
   */
  getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }
}

/**
 * Claude-Enhanced Error Handler
 */
export class ClaudeEnhancedErrorHandler extends ErrorHandler {
  private claudeService: any;

  constructor() {
    super();
    this.initializeClaudeService();
  }

  /**
   * Initialize Claude service for error analysis
   */
  private async initializeClaudeService(): Promise<void> {
    try {
      // Dynamic import to avoid circular dependencies
      const { claudeService } = await import('../services/ai/claude-service');
      this.claudeService = claudeService;
    } catch (error) {
      console.warn('Claude service not available for error analysis:', error);
      this.claudeService = null;
    }
  }

  /**
   * Use Claude to analyze error patterns and suggest improvements
   */
  async analyzeErrorPatterns(): Promise<ErrorAnalysis> {
    if (!this.claudeService) {
      return this.fallbackErrorAnalysis();
    }

    try {
      const errorLog = this.getErrorLog();
      const recentErrors = errorLog.slice(-50); // Analyze last 50 errors

      const claudeRequest = {
        type: 'error_pattern_analysis',
        data: {
          errors: recentErrors,
          context: 'coaching_application',
          timeframe: 'last_30_days',
          errorCount: recentErrors.length,
          errorTypes: this.categorizeErrors(recentErrors)
        },
        options: {
          maxTokens: 3000,
          temperature: 0.3
        }
      };

      const response = await this.claudeService.analyze(claudeRequest);
      
      if (response.success && response.data) {
        return this.parseErrorAnalysis(response.data);
      }
    } catch (error) {
      console.error('Claude error analysis failed:', error);
    }

    return this.fallbackErrorAnalysis();
  }

  /**
   * Generate user-friendly error messages using Claude
   */
  async generateUserFriendlyMessage(error: AppError): Promise<string> {
    if (!this.claudeService) {
      return this.getUserFriendlyMessage(error);
    }

    try {
      const claudeRequest = {
        type: 'error_message_generation',
        data: {
          error,
          userContext: 'coach',
          sport: 'football',
          userExperience: 'intermediate',
          preferredTone: 'helpful_and_encouraging'
        },
        options: {
          maxTokens: 1000,
          temperature: 0.7
        }
      };

      const response = await this.claudeService.analyze(claudeRequest);
      
      if (response.success && response.data) {
        return response.data.message || this.getUserFriendlyMessage(error);
      }
    } catch (error) {
      console.error('Claude error message generation failed:', error);
    }

    return this.getUserFriendlyMessage(error);
  }

  /**
   * Get intelligent error resolution suggestions
   */
  async getResolutionSuggestions(error: AppError): Promise<string[]> {
    if (!this.claudeService) {
      return this.getBasicResolutionSuggestions(error);
    }

    try {
      const claudeRequest = {
        type: 'error_resolution_suggestions',
        data: {
          error,
          context: 'coaching_application',
          userRole: 'coach',
          technicalLevel: 'intermediate',
          availableResources: ['documentation', 'support_team', 'community_forum']
        },
        options: {
          maxTokens: 2000,
          temperature: 0.5
        }
      };

      const response = await this.claudeService.analyze(claudeRequest);
      
      if (response.success && response.data) {
        return response.data.suggestions || this.getBasicResolutionSuggestions(error);
      }
    } catch (error) {
      console.error('Claude resolution suggestions failed:', error);
    }

    return this.getBasicResolutionSuggestions(error);
  }

  /**
   * Analyze error trends over time
   */
  async analyzeErrorTrends(timeframe: string): Promise<any> {
    if (!this.claudeService) {
      return this.fallbackTrendAnalysis(timeframe);
    }

    try {
      const errorLog = this.getErrorLog();
      const filteredErrors = this.filterErrorsByTimeframe(errorLog, timeframe);

      const claudeRequest = {
        type: 'error_trend_analysis',
        data: {
          errors: filteredErrors,
          timeframe,
          analysisType: 'trend_identification',
          includePredictions: true,
          includeRecommendations: true
        },
        options: {
          maxTokens: 2500,
          temperature: 0.4
        }
      };

      const response = await this.claudeService.analyze(claudeRequest);
      
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Claude trend analysis failed:', error);
    }

    return this.fallbackTrendAnalysis(timeframe);
  }

  /**
   * Categorize errors for analysis
   */
  private categorizeErrors(errors: AppError[]): { [key: string]: number } {
    const categories: { [key: string]: number } = {};
    
    errors.forEach(error => {
      const category = this.getErrorCategory(error);
      categories[category] = (categories[category] || 0) + 1;
    });
    
    return categories;
  }

  /**
   * Get error category
   */
  private getErrorCategory(error: AppError): string {
    if (error.code.startsWith('auth/')) return 'Authentication';
    if (error.code.startsWith('firestore/')) return 'Database';
    if (error.code.startsWith('claude_')) return 'AI Service';
    if (error.code.startsWith('ai_')) return 'AI System';
    if (error.code.startsWith('validation/')) return 'Validation';
    if (error.code.startsWith('rate-limit/')) return 'Rate Limiting';
    if (error.code.startsWith('network/')) return 'Network';
    return 'Other';
  }

  /**
   * Parse Claude's error analysis response
   */
  private parseErrorAnalysis(data: any): ErrorAnalysis {
    return {
      patterns: data.patterns || data.errorPatterns || [],
      rootCauses: data.rootCauses || data.rootCauseIdentification || [],
      impactAssessment: data.impactAssessment || data.impact || 'Unknown',
      recommendations: data.recommendations || data.improvementRecommendations || [],
      priorityOrder: data.priorityOrder || data.priorityOrderForFixes || [],
      estimatedResolutionTime: data.estimatedResolutionTime || 'Unknown',
      confidence: data.confidence || 0.8
    };
  }

  /**
   * Get basic resolution suggestions when Claude is unavailable
   */
  private getBasicResolutionSuggestions(error: AppError): string[] {
    const suggestions: { [key: string]: string[] } = {
      'auth/user-not-found': [
        'Verify the email address is correct',
        'Check if the account exists',
        'Try creating a new account'
      ],
      'firestore/permission-denied': [
        'Check user permissions',
        'Verify authentication status',
        'Contact administrator for access'
      ],
      'claude_service/unavailable': [
        'Wait a few minutes and try again',
        'Check internet connection',
        'Use fallback error handling'
      ],
      'network/request-failed': [
        'Check internet connection',
        'Try again in a few minutes',
        'Contact support if problem persists'
      ]
    };

    return suggestions[error.code] || [
      'Try refreshing the page',
      'Check your internet connection',
      'Contact support if the problem continues'
    ];
  }

  /**
   * Filter errors by timeframe
   */
  private filterErrorsByTimeframe(errors: AppError[], timeframe: string): AppError[] {
    const now = new Date();
    const cutoff = new Date();
    
    switch (timeframe) {
      case 'last_hour':
        cutoff.setHours(now.getHours() - 1);
        break;
      case 'last_day':
        cutoff.setDate(now.getDate() - 1);
        break;
      case 'last_week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'last_month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      default:
        cutoff.setDate(now.getDate() - 30); // Default to last 30 days
    }
    
    return errors.filter(error => error.timestamp >= cutoff);
  }

  /**
   * Fallback error analysis when Claude is unavailable
   */
  private fallbackErrorAnalysis(): ErrorAnalysis {
    const errorLog = this.getErrorLog();
    const recentErrors = errorLog.slice(-20);
    
    return {
      patterns: this.identifyBasicPatterns(recentErrors),
      rootCauses: ['Service unavailability', 'Network issues', 'Configuration problems'],
      impactAssessment: 'Medium - Some features may be limited',
      recommendations: [
        'Implement better error handling',
        'Add retry mechanisms',
        'Improve user feedback'
      ],
      priorityOrder: ['High', 'Medium', 'Low'],
      estimatedResolutionTime: '1-2 days',
      confidence: 0.6
    };
  }

  /**
   * Identify basic error patterns
   */
  private identifyBasicPatterns(errors: AppError[]): string[] {
    const patterns: string[] = [];
    const categories = this.categorizeErrors(errors);
    
    Object.entries(categories).forEach(([category, count]) => {
      if (count > 2) {
        patterns.push(`${category} errors occurring frequently (${count} times)`);
      }
    });
    
    if (patterns.length === 0) {
      patterns.push('No clear error patterns identified');
    }
    
    return patterns;
  }

  /**
   * Fallback trend analysis
   */
  private fallbackTrendAnalysis(timeframe: string): any {
    const errorLog = this.getErrorLog();
    const filteredErrors = this.filterErrorsByTimeframe(errorLog, timeframe);
    
    return {
      timeframe,
      totalErrors: filteredErrors.length,
      errorTrend: 'stable',
      mostCommonErrors: this.getMostCommonErrors(filteredErrors),
      recommendations: [
        'Monitor error frequency',
        'Implement preventive measures',
        'Improve error logging'
      ],
      confidence: 0.5
    };
  }

  /**
   * Get most common errors
   */
  private getMostCommonErrors(errors: AppError[]): Array<{ code: string; count: number }> {
    const errorCounts: { [key: string]: number } = {};
    
    errors.forEach(error => {
      errorCounts[error.code] = (errorCounts[error.code] || 0) + 1;
    });
    
    return Object.entries(errorCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
}

/**
 * Firebase-specific error handling
 */
export class FirebaseErrorHandler {
  /**
   * Handle Firebase Auth errors
   */
  static handleAuthError(error: any): AppError {
    const errorHandler = ErrorHandler.getInstance();
    return errorHandler.handleError(error, 'authentication');
  }

  /**
   * Handle Firestore errors
   */
  static handleFirestoreError(error: any): AppError {
    const errorHandler = ErrorHandler.getInstance();
    return errorHandler.handleError(error, 'firestore');
  }

  /**
   * Handle Firebase Storage errors
   */
  static handleStorageError(error: any): AppError {
    const errorHandler = ErrorHandler.getInstance();
    return errorHandler.handleError(error, 'storage');
  }
}

/**
 * Network error handling
 */
export class NetworkErrorHandler {
  /**
   * Check if error is network-related
   */
  static isNetworkError(error: any): boolean {
    const networkErrorMessages = [
      'network error',
      'fetch failed',
      'timeout',
      'connection refused',
      'no internet connection',
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    return networkErrorMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Handle network errors
   */
  static handleNetworkError(error: any): AppError {
    const errorHandler = ErrorHandler.getInstance();
    return errorHandler.handleError(error, 'network');
  }
}

/**
 * Validation error handling
 */
export class ValidationErrorHandler {
  /**
   * Handle validation errors
   */
  static handleValidationError(field: string, message: string): AppError {
    const error: AppError = {
      code: `validation/${field}-invalid`,
      message,
      timestamp: new Date(),
      context: 'validation',
    };

    const errorHandler = ErrorHandler.getInstance();
    return errorHandler.handleError(error, 'validation');
  }
}

// Export singleton instances
export const errorHandler = ErrorHandler.getInstance();
export const claudeEnhancedErrorHandler = new ClaudeEnhancedErrorHandler();
