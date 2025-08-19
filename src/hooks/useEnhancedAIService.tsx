// src/hooks/useEnhancedAIService.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  EnhancedAIService, 
  EnhancedAIServiceConfig, 
  AIError, 
  RateLimitError, 
  QuotaError, 
  SecurityError 
} from '../services/ai-service-enhanced';
import { 
  User, TeamContext, GameContext, PlayerContext, AIConversation 
} from '../types/firestore-schema';

// ============================================
// HOOK TYPES
// ============================================

interface AIState {
  loading: boolean;
  error: AIError | null;
  lastResponse: any;
  metrics: any;
  alerts: any[];
}

interface AIActions {
  generatePracticePlan: (params: PracticePlanParams) => Promise<any>;
  generatePlaySuggestion: (params: PlaySuggestionParams) => Promise<any>;
  analyzeTeamPerformance: (params: PerformanceParams) => Promise<any>;
  generateDrillSuggestions: (params: DrillParams) => Promise<any>;
  processConversation: (params: ConversationParams) => Promise<any>;
  validateSafety: (params: SafetyParams) => Promise<any>;
  clearError: () => void;
  clearCache: () => void;
  getCacheStats: () => any;
  getUserQuota: (userId: string) => any;
  resetUserQuota: (userId: string) => void;
}

interface PracticePlanParams {
  teamContext: TeamContext;
  goals: string[];
  duration: number;
  constraints?: any;
  userId: string;
}

interface PlaySuggestionParams {
  gameContext: GameContext;
  teamContext: TeamContext;
  playerContext?: PlayerContext;
  userId: string;
}

interface PerformanceParams {
  teamContext: TeamContext;
  performanceData: any;
  timeRange: string;
  userId: string;
}

interface DrillParams {
  teamContext: TeamContext;
  focusAreas: string[];
  duration: number;
  skillLevel: string;
  userId: string;
}

interface ConversationParams {
  message: string;
  conversationHistory: AIConversation[];
  userContext: User;
  teamContext?: TeamContext;
  userId: string;
}

interface SafetyParams {
  suggestion: any;
  teamContext: TeamContext;
  ageGroup: string;
  userId: string;
}

// ============================================
// ENHANCED AI SERVICE HOOK
// ============================================

export const useEnhancedAIService = (config: EnhancedAIServiceConfig) => {
  const [state, setState] = useState<AIState>({
    loading: false,
    error: null,
    lastResponse: null,
    metrics: null,
    alerts: []
  });

  const serviceRef = useRef<EnhancedAIService | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize service
  useEffect(() => {
    serviceRef.current = new EnhancedAIService(config);
    
    // Set up metrics polling
    const metricsInterval = setInterval(() => {
      if (serviceRef.current) {
        const metrics = serviceRef.current.getMetrics();
        const alerts = serviceRef.current.getAlerts();
        setState(prev => ({ ...prev, metrics, alerts }));
      }
    }, 30000); // Update every 30 seconds

    return () => {
      clearInterval(metricsInterval);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [config]);

  // ============================================
  // ERROR HANDLING UTILITIES
  // ============================================

  const handleError = useCallback((error: any, operation: string): AIError => {
    let aiError: AIError;

    if (error instanceof AIError) {
      aiError = error;
    } else if (error instanceof RateLimitError) {
      aiError = error;
      // Set up retry for rate limit errors
      if (error.retryAfter) {
        retryTimeoutRef.current = setTimeout(() => {
          setState(prev => ({ ...prev, error: null }));
        }, error.retryAfter * 1000);
      }
    } else if (error instanceof QuotaError) {
      aiError = error;
    } else if (error instanceof SecurityError) {
      aiError = error;
    } else {
      aiError = new AIError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'UNKNOWN',
        undefined,
        false
      );
    }

    console.error(`AI Service Error in ${operation}:`, aiError);
    setState(prev => ({ ...prev, error: aiError }));

    return aiError;
  }, []);

  const createRequestHandler = useCallback(<T extends any[], R>(
    operation: string,
    handler: (...args: T) => Promise<R>
  ) => {
    return async (...args: T): Promise<R> => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const result = await handler(...args);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          lastResponse: result,
          error: null 
        }));
        return result;
      } catch (error) {
        const aiError = handleError(error, operation);
        setState(prev => ({ ...prev, loading: false }));
        throw aiError;
      }
    };
  }, [handleError]);

  // ============================================
  // AI OPERATIONS
  // ============================================

  const generatePracticePlan = useCallback(async (params: PracticePlanParams) => {
    if (!serviceRef.current) {
      throw new Error('AI service not initialized');
    }

    return createRequestHandler(
      'generatePracticePlan',
      serviceRef.current.generatePracticePlan.bind(serviceRef.current)
    )(params.teamContext, params.goals, params.duration, params.constraints, params.userId);
  }, [createRequestHandler]);

  const generatePlaySuggestion = useCallback(async (params: PlaySuggestionParams) => {
    if (!serviceRef.current) {
      throw new Error('AI service not initialized');
    }

    // This would need to be implemented in the service
    return createRequestHandler(
      'generatePlaySuggestion',
      async (gameContext: GameContext, teamContext: TeamContext, playerContext: PlayerContext, userId: string) => {
        // Placeholder implementation
        throw new Error('Not implemented yet');
      }
    )(params.gameContext, params.teamContext, params.playerContext, params.userId);
  }, [createRequestHandler]);

  const analyzeTeamPerformance = useCallback(async (params: PerformanceParams) => {
    if (!serviceRef.current) {
      throw new Error('AI service not initialized');
    }

    // This would need to be implemented in the service
    return createRequestHandler(
      'analyzeTeamPerformance',
      async (teamContext: TeamContext, performanceData: any, timeRange: string, userId: string) => {
        // Placeholder implementation
        throw new Error('Not implemented yet');
      }
    )(params.teamContext, params.performanceData, params.timeRange, params.userId);
  }, [createRequestHandler]);

  const generateDrillSuggestions = useCallback(async (params: DrillParams) => {
    if (!serviceRef.current) {
      throw new Error('AI service not initialized');
    }

    // This would need to be implemented in the service
    return createRequestHandler(
      'generateDrillSuggestions',
      async (teamContext: TeamContext, focusAreas: string[], duration: number, skillLevel: string, userId: string) => {
        // Placeholder implementation
        throw new Error('Not implemented yet');
      }
    )(params.teamContext, params.focusAreas, params.duration, params.skillLevel, params.userId);
  }, [createRequestHandler]);

  const processConversation = useCallback(async (params: ConversationParams) => {
    if (!serviceRef.current) {
      throw new Error('AI service not initialized');
    }

    // This would need to be implemented in the service
    return createRequestHandler(
      'processConversation',
      async (message: string, conversationHistory: AIConversation[], userContext: User, teamContext: TeamContext, userId: string) => {
        // Placeholder implementation
        throw new Error('Not implemented yet');
      }
    )(params.message, params.conversationHistory, params.userContext, params.teamContext, params.userId);
  }, [createRequestHandler]);

  const validateSafety = useCallback(async (params: SafetyParams) => {
    if (!serviceRef.current) {
      throw new Error('AI service not initialized');
    }

    // This would need to be implemented in the service
    return createRequestHandler(
      'validateSafety',
      async (suggestion: any, teamContext: TeamContext, ageGroup: string, userId: string) => {
        // Placeholder implementation
        throw new Error('Not implemented yet');
      }
    )(params.suggestion, params.teamContext, params.ageGroup, params.userId);
  }, [createRequestHandler]);

  // ============================================
  // UTILITY METHODS
  // ============================================

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const clearCache = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.clearCache();
    }
  }, []);

  const getCacheStats = useCallback(() => {
    if (serviceRef.current) {
      return serviceRef.current.getCacheStats();
    }
    return { size: 0, keys: [] };
  }, []);

  const getUserQuota = useCallback((userId: string) => {
    if (serviceRef.current) {
      return serviceRef.current.getUserQuota(userId);
    }
    return undefined;
  }, []);

  const resetUserQuota = useCallback((userId: string) => {
    if (serviceRef.current) {
      serviceRef.current.resetUserQuota(userId);
    }
  }, []);

  // ============================================
  // RETURN OBJECT
  // ============================================

  const actions: AIActions = {
    generatePracticePlan,
    generatePlaySuggestion,
    analyzeTeamPerformance,
    generateDrillSuggestions,
    processConversation,
    validateSafety,
    clearError,
    clearCache,
    getCacheStats,
    getUserQuota,
    resetUserQuota
  };

  return {
    ...state,
    ...actions
  };
};

// ============================================
// ERROR BOUNDARY COMPONENT
// ============================================

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AIErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AI Error Boundary caught an error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-900 mb-2">
            AI Service Error
          </h2>
          <p className="text-red-800 mb-4">
            {this.state.error?.message || 'An unexpected error occurred with the AI service.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================
// ERROR MESSAGE COMPONENT
// ============================================

interface ErrorMessageProps {
  error: AIError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const AIErrorMessage: React.FC<ErrorMessageProps> = ({ error, onRetry, onDismiss }) => {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'RATE_LIMIT':
        return '⏰';
      case 'QUOTA_EXCEEDED':
        return '💰';
      case 'SECURITY':
        return '🔒';
      case 'NETWORK':
        return '🌐';
      default:
        return '⚠️';
    }
  };

  const getErrorColor = () => {
    switch (error.type) {
      case 'RATE_LIMIT':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'QUOTA_EXCEEDED':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'SECURITY':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'NETWORK':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  return (
    <div className={`p-4 border rounded-lg ${getErrorColor()}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 text-xl mr-3">
          {getErrorIcon()}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">
            {error.type === 'RATE_LIMIT' && 'Rate Limit Exceeded'}
            {error.type === 'QUOTA_EXCEEDED' && 'Quota Exceeded'}
            {error.type === 'SECURITY' && 'Security Violation'}
            {error.type === 'NETWORK' && 'Network Error'}
            {error.type === 'API' && 'API Error'}
            {error.type === 'UNKNOWN' && 'Unknown Error'}
          </h3>
          <p className="text-sm mb-3">
            {error.message}
          </p>
          <div className="flex space-x-2">
            {onRetry && error.retryable && (
              <button
                onClick={onRetry}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 