import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AIService, useAIService, AIServiceConfig } from '../services/ai-service';
import { AIProxyService, useAIProxy, AIProxyConfig } from '../services/ai-proxy';
import { 
  AISuggestion, AIConversation, AIInsight,
  TeamContext, GameContext, PlayerContext, User
} from '../types/firestore-schema';

// ============================================
// AI CONTEXT TYPES
// ============================================

interface AIContextType {
  // Core AI functionality
  generatePracticePlan: (teamContext: TeamContext, goals: string[], duration: number, constraints?: any) => Promise<any>;
  generatePlaySuggestion: (gameContext: GameContext, teamContext: TeamContext, playerContext?: PlayerContext) => Promise<any>;
  analyzeTeamPerformance: (teamContext: TeamContext, performanceData: any, timeRange: string) => Promise<any>;
  generateDrillSuggestions: (teamContext: TeamContext, focusAreas: string[], duration: number, skillLevel: string) => Promise<any>;
  processConversation: (message: string, conversationHistory: AIConversation[], userContext: User, teamContext?: TeamContext) => Promise<any>;
  validateSafety: (suggestion: AISuggestion, teamContext: TeamContext, ageGroup: string) => Promise<any>;
  
  // State management
  loading: boolean;
  error: string | null;
  suggestions: AISuggestion[];
  conversations: AIConversation[];
  insights: AIInsight[];
  
  // Utility methods
  clearError: () => void;
  clearSuggestions: () => void;
  addSuggestion: (suggestion: AISuggestion) => void;
  removeSuggestion: (suggestionId: string) => void;
  recordOutcome: (suggestionId: string, outcome: 'success' | 'failure' | 'partial') => void;
  
  // Configuration
  updateConfig: (config: Partial<AIServiceConfig>) => void;
  getCacheStats: () => { size: number; keys: string[] };
  clearCache: () => void;
}

interface AIProviderProps {
  children: ReactNode;
  config?: Partial<AIServiceConfig>;
  useProxy?: boolean;
}

// ============================================
// AI CONTEXT
// ============================================

const AIContext = createContext<AIContextType | undefined>(undefined);

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

// ============================================
// AI PROVIDER
// ============================================

export const AIProvider: React.FC<AIProviderProps> = ({ 
  children, 
  config = {},
  useProxy = false 
}) => {
  // Initialize AI service configuration
  const defaultConfig: AIServiceConfig = {
    apiKey: process.env.REACT_APP_OPENAI_API_KEY || '',
    model: 'gpt-4',
    maxTokens: 2000,
    temperature: 0.7,
    ...config
  };

  // Initialize proxy configuration
  const proxyConfig: AIProxyConfig = {
    endpoint: process.env.REACT_APP_AI_PROXY_ENDPOINT || '/api/ai',
    timeout: 30000,
    retries: 3
  };

  // Use appropriate service based on configuration
  const aiService = useAIService(defaultConfig);
  const aiProxy = useAIProxy(proxyConfig);
  
  const service = useProxy ? aiProxy : aiService;
  const { loading, error } = service;

  // Local state
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);

  // ============================================
  // CORE AI METHODS
  // ============================================

  const generatePracticePlan = useCallback(async (
    teamContext: TeamContext,
    goals: string[],
    duration: number,
    constraints?: any
  ) => {
    try {
      if (useProxy) {
        const result = await aiProxy.makeRequest({
          type: 'practice_plan',
          data: { teamContext, goals, duration, constraints },
          options: { temperature: 0.7, maxTokens: 1500 }
        });
        return result.data;
      } else {
        return await aiService.generatePracticePlan(teamContext, goals, duration, constraints);
      }
    } catch (error) {
      console.error('Failed to generate practice plan:', error);
      throw error;
    }
  }, [useProxy, aiProxy, aiService]);

  const generatePlaySuggestion = useCallback(async (
    gameContext: GameContext,
    teamContext: TeamContext,
    playerContext?: PlayerContext
  ) => {
    try {
      if (useProxy) {
        const result = await aiProxy.makeRequest({
          type: 'play_suggestion',
          data: { gameContext, teamContext, playerContext },
          options: { temperature: 0.6, maxTokens: 1200 }
        });
        return result.data;
      } else {
        return await aiService.generatePlaySuggestion(gameContext, teamContext, playerContext);
      }
    } catch (error) {
      console.error('Failed to generate play suggestion:', error);
      throw error;
    }
  }, [useProxy, aiProxy, aiService]);

  const analyzeTeamPerformance = useCallback(async (
    teamContext: TeamContext,
    performanceData: any,
    timeRange: string
  ) => {
    try {
      if (useProxy) {
        const result = await aiProxy.makeRequest({
          type: 'performance_analysis',
          data: { teamContext, performanceData, timeRange },
          options: { temperature: 0.5, maxTokens: 1000 }
        });
        return result.data;
      } else {
        return await aiService.analyzeTeamPerformance(teamContext, performanceData, timeRange);
      }
    } catch (error) {
      console.error('Failed to analyze team performance:', error);
      throw error;
    }
  }, [useProxy, aiProxy, aiService]);

  const generateDrillSuggestions = useCallback(async (
    teamContext: TeamContext,
    focusAreas: string[],
    duration: number,
    skillLevel: string
  ) => {
    try {
      if (useProxy) {
        const result = await aiProxy.makeRequest({
          type: 'drill_suggestions',
          data: { teamContext, focusAreas, duration, skillLevel },
          options: { temperature: 0.7, maxTokens: 1000 }
        });
        return result.data;
      } else {
        return await aiService.generateDrillSuggestions(teamContext, focusAreas, duration, skillLevel);
      }
    } catch (error) {
      console.error('Failed to generate drill suggestions:', error);
      throw error;
    }
  }, [useProxy, aiProxy, aiService]);

  const processConversation = useCallback(async (
    message: string,
    conversationHistory: AIConversation[],
    userContext: User,
    teamContext?: TeamContext
  ) => {
    try {
      if (useProxy) {
        const result = await aiProxy.makeRequest({
          type: 'conversation',
          data: { message, conversationHistory, userContext, teamContext },
          options: { temperature: 0.8, maxTokens: 800 }
        });
        return result.data;
      } else {
        return await aiService.processConversation(message, conversationHistory, userContext, teamContext);
      }
    } catch (error) {
      console.error('Failed to process conversation:', error);
      throw error;
    }
  }, [useProxy, aiProxy, aiService]);

  const validateSafety = useCallback(async (
    suggestion: AISuggestion,
    teamContext: TeamContext,
    ageGroup: string
  ) => {
    try {
      if (useProxy) {
        const result = await aiProxy.makeRequest({
          type: 'safety_validation',
          data: { suggestion, teamContext, ageGroup },
          options: { temperature: 0.3, maxTokens: 500 }
        });
        return result.data;
      } else {
        return await aiService.validateSafety(suggestion, teamContext, ageGroup);
      }
    } catch (error) {
      console.error('Failed to validate safety:', error);
      throw error;
    }
  }, [useProxy, aiProxy, aiService]);

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const clearError = useCallback(() => {
    if (useProxy) {
      // Proxy doesn't have clearError, so we'll handle it locally
    } else {
      // AI service error is managed by the hook
    }
  }, [useProxy]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  const addSuggestion = useCallback((suggestion: AISuggestion) => {
    setSuggestions(prev => [...prev, suggestion]);
  }, []);

  const removeSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  const recordOutcome = useCallback((suggestionId: string, outcome: 'success' | 'failure' | 'partial') => {
    // Update suggestion with outcome
    setSuggestions(prev => prev.map(s => 
      s.id === suggestionId 
        ? { ...s, outcome, lastUsed: new Date().toISOString() }
        : s
    ));

    // Add to insights
    const insight: AIInsight = {
      id: `insight_${Date.now()}`,
      userId: 'current-user', // This should come from auth context
      type: 'suggestion_outcome',
      title: `Suggestion ${outcome}`,
      description: `AI suggestion "${suggestionId}" resulted in ${outcome}`,
      data: { suggestionId, outcome },
      confidence: outcome === 'success' ? 0.9 : 0.5,
      recommendations: [],
      isActionable: false,
      isRead: false,
      createdAt: new Date() as any, // Using any for now since we don't have Timestamp import
      updatedAt: new Date() as any,
      createdBy: 'current-user'
    };

    setInsights(prev => [...prev, insight]);
  }, []);

  // ============================================
  // CONFIGURATION
  // ============================================

  const updateConfig = useCallback((newConfig: Partial<AIServiceConfig>) => {
    if (!useProxy) {
      aiService.service.updateConfig(newConfig);
    }
  }, [useProxy, aiService]);

  const getCacheStats = useCallback(() => {
    if (!useProxy) {
      return aiService.getCacheStats();
    }
    return { size: 0, keys: [] };
  }, [useProxy, aiService]);

  const clearCache = useCallback(() => {
    if (!useProxy) {
      aiService.clearCache();
    }
  }, [useProxy, aiService]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: AIContextType = {
    // Core AI functionality
    generatePracticePlan,
    generatePlaySuggestion,
    analyzeTeamPerformance,
    generateDrillSuggestions,
    processConversation,
    validateSafety,
    
    // State management
    loading,
    error,
    suggestions,
    conversations,
    insights,
    
    // Utility methods
    clearError,
    clearSuggestions,
    addSuggestion,
    removeSuggestion,
    recordOutcome,
    
    // Configuration
    updateConfig,
    getCacheStats,
    clearCache
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
};
