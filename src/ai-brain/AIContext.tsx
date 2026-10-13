import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  AISuggestion, AIConversation, AIInsight,
  TeamContext, GameContext, PlayerContext, User
} from '../types/firestore-schema';
import { useTeam } from '../contexts/TeamContext';
import {
  coachAI, CoachAIError,
  type AgeGroup, type SkillLevel, type ContactLevel,
} from '../services/coach-ai-client';

// ============================================
// AI CONTEXT
//
// Security (Day 2, F-01): every AI call goes through the authenticated
// server gateway (`coachAI` callable) via services/coach-ai-client.ts.
// The browser never holds a provider key or a shared proxy token, and no
// code in this file reaches OpenAI, Gemini or any other provider directly.
//
// Private-beta scope: practice plans, drill recommendations and the coach
// assistant. Other legacy AI features fail closed with a clear message
// instead of returning fabricated "AI" output.
// ============================================

/** Retained for API compatibility with older callers; no longer used. */
export interface AIServiceConfig {
  [key: string]: unknown;
}

interface SmartPracticeInput {
  duration: number;
  goals: string[];
  teamId?: string;
  ageGroup?: AgeGroup;
  skillLevel?: SkillLevel;
  contactLevel?: ContactLevel;
  equipment?: string[];
  rosterContext?: unknown; // ignored: roster data is never sent to AI
  focusAreas?: string[];
  experienceLevel?: string;
}

interface AIContextType {
  // Legacy service methods (kept for backward compatibility)
  generatePracticePlan: (teamContext: TeamContext, goals: string[], duration: number, constraints?: any) => Promise<any>;
  generatePlaySuggestion: (gameContext: GameContext, teamContext: TeamContext, playerContext?: PlayerContext) => Promise<any>;
  analyzeTeamPerformance: (teamContext: TeamContext, performanceData: any, timeRange: string) => Promise<any>;
  generateDrillSuggestions: (teamContext: TeamContext, focusAreas: string[], duration: number, skillLevel: string) => Promise<any>;
  processConversation: (message: string, conversationHistory: AIConversation[], userContext: User, teamContext?: TeamContext) => Promise<any>;
  validateSafety: (suggestion: AISuggestion, teamContext: TeamContext, ageGroup: string) => Promise<any>;

  // Football intelligence methods
  generateSmartPractice: (input: SmartPracticeInput) => Promise<any>;
  getRealtimeInsight: (context: any) => Promise<any>;
  analyzeFormation: (formation: any) => Promise<any>;
  getCoverageRecommendation: (situation: any) => Promise<any>;
  generateDrillSuggestionsForFocus: (focus: string, playerLevel: string) => Promise<any>;
  assessPlayerDevelopment: (playerData: any) => Promise<any>;
  generateGamePlan: (opponentTendencies: any, teamStrengths: any) => Promise<any>;
  getMotivationalInsight: (teamContext: any) => Promise<any>;

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

  // Configuration (no-ops: configuration is server-side now)
  updateConfig: (config: Partial<AIServiceConfig>) => void;
  getCacheStats: () => { size: number; keys: string[] };
  clearCache: () => void;
}

interface AIProviderProps {
  children: ReactNode;
  /** @deprecated ignored; AI configuration lives on the server. */
  config?: Partial<AIServiceConfig>;
  /** @deprecated ignored; the server gateway is the only path. */
  useProxy?: boolean;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

// ---------------------------------------------------------------- mapping

const LEGACY_AGE_GROUPS: Record<string, AgeGroup> = {
  youth: '10U',
  middle_school: '14U',
  high_school: 'HS_JV',
  college: 'ADULT',
  adult: 'ADULT',
  senior: 'ADULT',
};

const GOAL_LABELS: Record<string, string> = {
  game_prep: 'Game preparation',
  red_zone_offense: 'Red zone offense',
  skill_dev: 'Skill development',
  conditioning: 'Conditioning',
};

function toAgeGroup(value?: string): AgeGroup | undefined {
  if (!value) return undefined;
  if (['6U', '8U', '10U', '12U', '14U', 'HS_JV', 'HS_VARSITY', 'ADULT'].includes(value)) {
    return value as AgeGroup;
  }
  return LEGACY_AGE_GROUPS[value];
}

function toSkillLevel(value?: string): SkillLevel {
  return value === 'intermediate' || value === 'advanced' ? value : 'beginner';
}

function clampMinutes(n: number, min: number, max: number): number {
  const v = Math.round(Number(n) || 0);
  return Math.min(max, Math.max(min, v));
}

function notInBeta(feature: string): never {
  throw new CoachAIError('failed-precondition', 'not-in-beta', undefined, [feature]);
}

// ---------------------------------------------------------------- provider

export const AIProvider: React.FC<AIProviderProps> = ({ children }) => {
  // Tolerate rendering outside a TeamProvider (e.g. isolated component
  // tests); AI calls then require an explicit team id.
  let currentTeam: { id: string } | null = null;
  try {
    currentTeam = useTeam().currentTeam;
  } catch {
    currentTeam = null;
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [conversations] = useState<AIConversation[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);

  /** Run a gateway call with shared loading/error state. */
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI request failed.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const requireTeamId = useCallback((explicit?: string): string => {
    // The signed-in coach's current team is authoritative; the server
    // re-checks ownership on every call.
    const id = currentTeam?.id || explicit;
    if (!id) throw new CoachAIError('failed-precondition', 'team-required');
    return id;
  }, [currentTeam]);

  // ---- private-beta AI features (server gateway) ----

  const generateSmartPractice = useCallback((input: SmartPracticeInput) => run(async () => {
    const ageGroup = toAgeGroup(input.ageGroup);
    if (!ageGroup) throw new CoachAIError('invalid-argument', 'age-group-required');
    const objectives = [...(input.goals || []), ...(input.focusAreas || [])]
      .map((g) => GOAL_LABELS[g] || g)
      .filter(Boolean)
      .slice(0, 5);
    if (objectives.length === 0) throw new CoachAIError('invalid-argument', 'objectives-required');
    const res = await coachAI.practicePlan(requireTeamId(input.teamId), {
      ageGroup,
      durationMinutes: clampMinutes(input.duration, 30, 180),
      skillLevel: toSkillLevel(input.skillLevel || input.experienceLevel),
      objectives,
      equipment: input.equipment || [],
      contactLevel: input.contactLevel || 'non_contact',
    });
    return { ...res.result, meta: res.meta, requestId: res.requestId };
  }), [run, requireTeamId]);

  const generatePracticePlan = useCallback((
    teamContext: TeamContext, goals: string[], duration: number, constraints?: any,
  ) => generateSmartPractice({
    duration,
    goals,
    teamId: teamContext?.teamId || teamContext?.id,
    ageGroup: toAgeGroup(constraints?.ageGroup || teamContext?.ageGroup),
    skillLevel: toSkillLevel(constraints?.skillLevel || teamContext?.skillLevel),
    equipment: Array.isArray(constraints?.equipment) ? constraints.equipment : [],
  }), [generateSmartPractice]);

  const generateDrillSuggestions = useCallback((
    teamContext: TeamContext, focusAreas: string[], duration: number, skillLevel: string,
  ) => run(async () => {
    const ageGroup = toAgeGroup(teamContext?.ageGroup);
    if (!ageGroup) throw new CoachAIError('invalid-argument', 'age-group-required');
    const res = await coachAI.drillRecommendations(
      requireTeamId(teamContext?.teamId || teamContext?.id),
      {
        skillFocus: (focusAreas || []).join(', ').slice(0, 80) || 'fundamentals',
        ageGroup,
        availableMinutes: clampMinutes(duration, 5, 90),
        experienceLevel: toSkillLevel(skillLevel),
      },
    );
    return { ...res.result, meta: res.meta, requestId: res.requestId };
  }), [run, requireTeamId]);

  const processConversation = useCallback((
    message: string, _history: AIConversation[], _user: User, teamContext?: TeamContext,
  ) => run(async () => {
    // Only the question and coarse, non-identifying context are sent.
    const res = await coachAI.assistant(requireTeamId(teamContext?.teamId || teamContext?.id), {
      question: message,
      context: { ageGroup: toAgeGroup(teamContext?.ageGroup) },
    });
    return { ...res.result, meta: res.meta, requestId: res.requestId };
  }), [run, requireTeamId]);

  // ---- not part of the private beta: fail closed, never fabricate ----

  const generatePlaySuggestion = useCallback(async () => notInBeta('play_suggestion'), []);
  const analyzeTeamPerformance = useCallback(async () => notInBeta('performance_analysis'), []);
  const validateSafety = useCallback(async () => notInBeta('safety_validation'), []);
  const getRealtimeInsight = useCallback(async () => notInBeta('realtime_insight'), []);
  const analyzeFormation = useCallback(async () => notInBeta('formation_analysis'), []);
  const getCoverageRecommendation = useCallback(async () => notInBeta('coverage_recommendation'), []);
  const generateDrillSuggestionsForFocus = useCallback(async () => notInBeta('drill_focus'), []);
  const assessPlayerDevelopment = useCallback(async () => notInBeta('player_development'), []);
  const generateGamePlan = useCallback(async () => notInBeta('game_plan'), []);
  const getMotivationalInsight = useCallback(async () => notInBeta('motivational_insight'), []);

  // ---- state utilities ----

  const clearError = useCallback(() => setError(null), []);
  const clearSuggestions = useCallback(() => setSuggestions([]), []);
  const addSuggestion = useCallback((suggestion: AISuggestion) => {
    setSuggestions(prev => [...prev, suggestion]);
  }, []);
  const removeSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  const recordOutcome = useCallback((suggestionId: string, outcome: 'success' | 'failure' | 'partial') => {
    setSuggestions(prev => prev.map(s =>
      s.id === suggestionId ? { ...s, outcome, lastUsed: new Date().toISOString() } : s
    ));
    const insight: AIInsight = {
      id: `insight_${Date.now()}`,
      userId: 'current-user',
      type: 'suggestion_outcome',
      title: `Suggestion ${outcome}`,
      description: `AI suggestion "${suggestionId}" resulted in ${outcome}`,
      data: { suggestionId, outcome },
      confidence: outcome === 'success' ? 0.9 : 0.5,
      recommendations: [],
      isActionable: false,
      isRead: false,
      createdAt: new Date() as any,
      updatedAt: new Date() as any,
      createdBy: 'current-user'
    };
    setInsights(prev => [...prev, insight]);
  }, []);

  const updateConfig = useCallback(() => undefined, []);
  const getCacheStats = useCallback(() => ({ size: 0, keys: [] as string[] }), []);
  const clearCache = useCallback(() => undefined, []);

  const value: AIContextType = {
    generatePracticePlan,
    generatePlaySuggestion,
    analyzeTeamPerformance,
    generateDrillSuggestions,
    processConversation,
    validateSafety,
    generateSmartPractice,
    getRealtimeInsight,
    analyzeFormation,
    getCoverageRecommendation,
    generateDrillSuggestionsForFocus,
    assessPlayerDevelopment,
    generateGamePlan,
    getMotivationalInsight,
    loading,
    error,
    suggestions,
    conversations,
    insights,
    clearError,
    clearSuggestions,
    addSuggestion,
    removeSuggestion,
    recordOutcome,
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
