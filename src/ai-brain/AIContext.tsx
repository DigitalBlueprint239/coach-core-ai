import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { AIBrain } from './core/AIBrain';
import featureFlagService from '../services/feature-flags/remote-config';

type PracticePlanResult = Awaited<
  ReturnType<(typeof AIBrain)['generateSmartPractice']>
>;
type PlayInsightResult = Awaited<
  ReturnType<(typeof AIBrain)['getRealtimeInsight']>
>;
type ProgressResult = Awaited<
  ReturnType<(typeof AIBrain)['analyzeProgress']>
>;

interface PracticePeriodShape {
  name?: string;
  duration?: number;
  intensity?: string;
  drills?: string[];
  description?: string;
}

interface TeamSummary {
  teamId?: string;
  teamName?: string;
  sport?: string;
  ageGroup?: string;
  skillLevel?: string;
  seasonPhase?: string;
  strengths?: string[];
  weaknesses?: string[];
  equipment?: string[];
}

interface GameSummary {
  score?: { ours: number; theirs: number };
  quarter?: string;
  timeRemaining?: string;
  possession?: string;
  tendencies?: string[];
  opponentAnalysis?: Record<string, unknown>;
}

interface AIContextType {
  isEnabled: boolean;
  isHealthy: boolean | null;
  lastError: string | null;
  generatePracticePlan: (
    team: TeamSummary,
    goals: string[],
    duration: number
  ) => Promise<PracticePlanResult>;
  generatePlaySuggestion: (
    game: GameSummary,
    team: TeamSummary
  ) => Promise<PlayInsightResult>;
  analyzeProgress: (
    userId: string,
    metricType: string,
    timeRange: unknown
  ) => Promise<ProgressResult>;
  recordOutcome: (action: string, outcome: string) => void;
  refreshHealth: () => Promise<boolean>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const useAI = () => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

interface AIProviderProps {
  children: ReactNode;
}

const fallbackPracticePlan = (
  team: TeamSummary,
  goals: string[],
  duration: number
): PracticePlanResult => ({
  plan: {
    title: `${team.teamName || 'Team'} Practice Blueprint`,
    duration,
    summary: 'Structured fallback plan while AI services are offline.',
    periods: [
      {
        name: 'Warm-Up',
        duration: Math.max(10, Math.round(duration * 0.2)),
        intensity: 'moderate',
        drills: [
          'Dynamic stretching sequence',
          `${team.sport || 'sport'} specific movement prep`,
          'Activation circuits',
        ],
      },
      {
        name: 'Skill Development',
        duration: Math.max(20, Math.round(duration * 0.35)),
        intensity: 'high',
        drills: goals.length
          ? goals.map(goal => `Focused reps: ${goal}`)
          : ['Core positional work', 'Passing tree progression'],
      },
      {
        name: 'Team Concepts',
        duration: Math.max(20, Math.round(duration * 0.3)),
        intensity: 'high',
        drills: [
          'Half-field situational reps',
          'Communication emphasis segments',
          'Scripted competition scenarios',
        ],
      },
      {
        name: 'Cooldown & Review',
        duration: Math.max(10, Math.round(duration * 0.15)),
        intensity: 'low',
        drills: ['Static stretching', 'Recovery work', 'Film review outline'],
      },
    ],
  },
  insights: [
    'Fallback plan generated locally due to limited AI availability.',
    'Adjust intensities based on current workload and player readiness.',
  ],
  confidence: 0.55,
  alternatives: [],
  metadata: { fallback: true },
});

const normalizePracticePlan = (
  raw: PracticePlanResult | null | undefined,
  team: TeamSummary,
  goals: string[],
  duration: number
): PracticePlanResult => {
  if (!raw || typeof raw !== 'object') {
    return fallbackPracticePlan(team, goals, duration);
  }

  const base = fallbackPracticePlan(team, goals, duration);
  const plan = raw.plan || {};

  const periods = Array.isArray(plan.periods)
    ? (plan.periods as PracticePeriodShape[])
        .map(period => ({
          name: period?.name || 'Session Block',
          duration: Number(period?.duration) || Math.round(duration / 4),
          intensity: period?.intensity || 'moderate',
          drills: Array.isArray(period?.drills)
            ? period.drills
            : typeof period?.description === 'string'
              ? [period.description]
              : [],
        }))
        .filter(section => section.drills.length > 0)
    : undefined;

  const normalizedPlan = {
    ...base.plan,
    ...plan,
    periods: periods && periods.length > 0 ? periods : base.plan.periods,
    title:
      typeof plan.title === 'string'
        ? plan.title
        : base.plan.title,
    duration: Number(plan.duration) || base.plan.duration,
    summary:
      typeof plan.summary === 'string'
        ? plan.summary
        : base.plan.summary,
  };

  return {
    ...base,
    ...raw,
    plan: normalizedPlan,
    insights: Array.isArray(raw.insights) && raw.insights.length > 0
      ? raw.insights
      : base.insights,
    alternatives: Array.isArray(raw.alternatives) ? raw.alternatives : [],
    metadata: { ...base.metadata, ...raw.metadata },
    confidence:
      typeof raw.confidence === 'number' ? raw.confidence : base.confidence,
  };
};

const normalizeInsight = (
  raw: PlayInsightResult | null | undefined,
  team: TeamSummary
): PlayInsightResult => {
  const base: PlayInsightResult = {
    suggestion: 'Stay with core identity and emphasize execution under control.',
    confidence: 0.6,
    reasoning: [
      'Fallback insight generated locally; AI runtime unavailable.',
      `Base strategy set for ${team.teamName || 'the team'}.`,
    ],
    urgency: 'medium',
    tacticalAdjustments: [
      'Reinforce communication on first possession.',
      'Check tempo through first two drives.',
    ],
    riskAssessment: 'low',
  };

  if (!raw || typeof raw !== 'object') {
    return base;
  }

  return {
    ...base,
    ...raw,
    suggestion:
      typeof raw.suggestion === 'string'
        ? raw.suggestion
        : base.suggestion,
    reasoning: Array.isArray(raw.reasoning) && raw.reasoning.length > 0
      ? raw.reasoning
      : base.reasoning,
    tacticalAdjustments: Array.isArray(raw.tacticalAdjustments)
      ? raw.tacticalAdjustments
      : base.tacticalAdjustments,
    riskAssessment:
      typeof raw.riskAssessment === 'string'
        ? raw.riskAssessment
        : base.riskAssessment,
    urgency:
      typeof raw.urgency === 'string' ? raw.urgency : base.urgency,
    confidence:
      typeof raw.confidence === 'number' ? raw.confidence : base.confidence,
  };
};

export const AIProvider: React.FC<AIProviderProps> = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(
    featureFlagService.isFeatureEnabled('enableAIBrain')
  );
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = featureFlagService.subscribe(flags => {
      setIsEnabled(flags.enableAIBrain);
    });
    return unsubscribe;
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      const health = await AIBrain.healthCheck();
      setIsHealthy(health);
      return health;
    } catch (error) {
      console.error('AI health check failed:', error);
      setIsHealthy(false);
      return false;
    }
  }, []);

  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  const buildTeamProfile = useCallback((team: TeamSummary) => ({
    teamId: team.teamId || 'team-unknown',
    teamName: team.teamName || 'Team',
    sport: team.sport || 'football',
    ageGroup: team.ageGroup || 'youth',
    skillLevel: team.skillLevel || 'intermediate',
    seasonPhase: team.seasonPhase || 'in-season',
    strengths: team.strengths || [],
    weaknesses: team.weaknesses || [],
    equipment: team.equipment || ['cones', 'agility ladder'],
  }), []);

  const generatePracticePlan = useCallback<
    AIContextType['generatePracticePlan']
  >(
    async (team, goals, duration) => {
      const profile = buildTeamProfile(team);
      const requestPayload = {
        teamProfile: profile,
        focusAreas: goals,
        availableTime: duration,
        equipment: profile.equipment,
        skillLevel: profile.skillLevel,
        previousPractices: [],
      };

      if (!isEnabled) {
        return fallbackPracticePlan(team, goals, duration);
      }

      try {
        const response = await AIBrain.generateSmartPractice(requestPayload);
        setLastError(null);
        return normalizePracticePlan(response, team, goals, duration);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Practice generation failed';
        console.error('AI practice generation error:', error);
        setLastError(message);
        return fallbackPracticePlan(team, goals, duration);
      }
    },
    [buildTeamProfile, isEnabled]
  );

  const generatePlaySuggestion = useCallback<
    AIContextType['generatePlaySuggestion']
  >(
    async (game, team) => {
      if (!isEnabled) {
        return normalizeInsight(null, team);
      }

      const profile = buildTeamProfile(team);
      const requestPayload = {
        gameData: {
          score: game.score || { ours: 0, theirs: 0 },
          quarter: game.quarter || '1st',
          timeRemaining: game.timeRemaining || '12:00',
          tendencies: game.tendencies || [],
        },
        teamStrengths: profile.strengths,
        opponentAnalysis: game.opponentAnalysis || {},
        currentScore: game.score || { ours: 0, theirs: 0 },
        timeRemaining: game.timeRemaining || '12:00',
        possession: game.possession || 'ours',
      };

      try {
        const response = await AIBrain.getRealtimeInsight(requestPayload);
        setLastError(null);
        return normalizeInsight(response, team);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Play insight failed';
        console.error('AI play insight error:', error);
        setLastError(message);
        return normalizeInsight(null, team);
      }
    },
    [buildTeamProfile, isEnabled]
  );

  const analyzeProgress = useCallback<AIContextType['analyzeProgress']>(
    async (userId, metricType, timeRange) => {
      if (!isEnabled) {
        return {
          trends: [],
          predictions: [],
          insights: [
            'AI reporting disabled. Re-enable AI Brain to unlock progress analytics.',
          ],
          recommendations: [],
          confidence: 0,
          metadata: { fallback: true },
        } as ProgressResult;
      }

      try {
        const response = await AIBrain.analyzeProgress(
          userId,
          metricType,
          timeRange
        );
        setLastError(null);
        return response;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Progress analysis failed';
        console.error('AI progress analysis error:', error);
        setLastError(message);
        return {
          trends: [],
          predictions: [],
          insights: [
            'Unable to reach AI analytics service. Please try again later.',
          ],
          recommendations: [],
          confidence: 0,
          metadata: { fallback: true },
        } as ProgressResult;
      }
    },
    [isEnabled]
  );

  const recordOutcome = useCallback<AIContextType['recordOutcome']>(
    (action, outcome) => {
      try {
        AIBrain.recordOutcome(action, outcome as 'success' | 'failure' | 'neutral');
      } catch (error) {
        console.error('Failed to record AI outcome:', error);
      }
    },
    []
  );

  const value = useMemo<AIContextType>(
    () => ({
      isEnabled,
      isHealthy,
      lastError,
      generatePracticePlan,
      generatePlaySuggestion,
      analyzeProgress,
      recordOutcome,
      refreshHealth,
    }),
    [
      analyzeProgress,
      generatePlaySuggestion,
      generatePracticePlan,
      isEnabled,
      isHealthy,
      lastError,
      recordOutcome,
      refreshHealth,
    ]
  );

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};
