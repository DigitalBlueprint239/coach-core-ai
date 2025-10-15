import { AIBrain } from '../../ai-brain/core/AIBrain';
import {
  AIPracticePlanRequest,
  AIPracticePlanTeamContext,
} from './enhanced-ai-service';
import {
  TeamProfile,
  PlayRequirements,
  GeneratedPlay,
  GeneratedPlayResponse,
  PlayerPosition,
} from './types';

export interface PracticePlanDrill {
  id: string;
  name: string;
  category: string;
  duration: number;
  description: string;
  equipment: string[];
  objectives: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  sport: string;
  ageGroup: string;
  intensity: 'low' | 'medium' | 'high';
}

export interface PracticePeriod {
  id: string;
  name: string;
  duration: number;
  intensity: 'low' | 'medium' | 'high';
  drills: PracticePlanDrill[];
  notes: string;
  objectives: string[];
}

export interface PracticePlan {
  id: string;
  teamId: string;
  title: string;
  sport: string;
  ageGroup: string;
  duration: number;
  goals: string[];
  periods: PracticePeriod[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  aiConfidence: number;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface AIPracticePlanResponse {
  success: boolean;
  confidence?: number;
  suggestions?: string[];
  insights?: string[];
  plan?: PracticePlan;
  fallback?: boolean;
  raw?: unknown;
}

const DEFAULT_DRILL_INTENSITY: Record<'beginner' | 'intermediate' | 'advanced', 'low' | 'medium' | 'high'> = {
  beginner: 'low',
  intermediate: 'medium',
  advanced: 'high',
};

class AIService {
  async generatePracticePlan(
    request: AIPracticePlanRequest
  ): Promise<AIPracticePlanResponse> {
    const team = this.buildTeamContext(request.teamContext, request);

    try {
      const response = await AIBrain.generateSmartPractice({
        teamProfile: team,
        focusAreas: request.goals,
        availableTime: request.duration,
        equipment: team.equipment,
        skillLevel: team.skillLevel,
        previousPractices: [],
      });

      const plan = this.transformPracticePlan(request, team, response.plan);
      const confidence = Math.round(
        (response.confidence ?? 0.6) * 100
      );

      return {
        success: true,
        confidence,
        suggestions: response.insights ?? [],
        insights: response.insights ?? [],
        plan,
        raw: response,
      };
    } catch (error) {
      console.error('AI practice plan generation failed:', error);
      return {
        success: true,
        fallback: true,
        confidence: 55,
        suggestions: [
          'AI service unavailable – using structured fallback plan.',
          'Consider refining goals to improve future AI results.',
        ],
        plan: this.buildFallbackPlan(request, team),
      };
    }
  }

  async generateCustomPlay(
    teamProfile: TeamProfile,
    requirements: PlayRequirements
  ): Promise<GeneratedPlayResponse> {
    try {
      const strategy = await AIBrain.generateCoachingStrategy(
        this.toStrategyTeamProfile(teamProfile),
        this.toStrategySituation(requirements)
      );

      const play: GeneratedPlay = {
        id: `ai_play_${Date.now()}`,
        name: strategy?.name || this.buildPlayName(requirements),
        description:
          strategy?.summary ||
          'Balanced offensive play tailored to team strengths and opponent tendencies.',
        formation: strategy?.formation,
        positions: this.toPlayerPositions(strategy?.positions),
        coachingPoints: strategy?.keyPrinciples ?? strategy?.coachingPoints ?? [],
        variations: strategy?.adjustments ?? strategy?.alternatives ?? [],
        adjustments: strategy?.adjustments ?? [],
        keySuccessFactors: strategy?.successMetrics ?? [],
        confidence: strategy?.confidence ?? 0.7,
        tags: [requirements.objective, requirements.difficulty].filter(Boolean),
      };

      return {
        success: true,
        play,
        insights: strategy?.insights ?? [],
        confidence: play.confidence,
        raw: strategy,
      };
    } catch (error) {
      console.error('AI play generation failed:', error);
      return {
        success: true,
        fallback: true,
        confidence: 0.55,
        play: this.buildFallbackPlay(teamProfile, requirements),
        insights: [
          'Generated fallback play. Refine team profile for richer AI output.',
        ],
      };
    }
  }

  private buildTeamContext(
    context: AIPracticePlanTeamContext | undefined,
    request: AIPracticePlanRequest
  ) {
    const difficulty = this.normalizeDifficulty(request.difficulty);

    return {
      teamId: context?.teamId ?? 'ai-team',
      teamName:
        context?.teamName ?? `${request.sport} ${request.ageGroup} squad`.trim(),
      sport: context?.sport ?? request.sport,
      ageGroup: context?.ageGroup ?? request.ageGroup,
      skillLevel: context?.skillLevel ?? difficulty,
      seasonPhase: context?.seasonPhase ?? 'in-season',
      strengths: context?.strengths ?? [],
      weaknesses: context?.weaknesses ?? [],
      equipment: context?.equipment ?? request.equipment ?? ['cones', 'markers'],
    };
  }

  private transformPracticePlan(
    request: AIPracticePlanRequest,
    team: ReturnType<typeof this.buildTeamContext>,
    rawPlan: any
  ): PracticePlan {
    const now = new Date();
    const periods = Array.isArray(rawPlan?.periods)
      ? rawPlan.periods
      : [];

    const mappedPeriods: PracticePeriod[] = periods.map(
      (period: any, index: number) => {
        const drills = this.normalizeDrills(
          request,
          period?.drills ?? [],
          period?.duration ?? Math.round(request.duration / periods.length || 1)
        );

        return {
          id: `period_${index}`,
          name: period?.name || `Session Block ${index + 1}`,
          duration: Number(period?.duration) || Math.round(request.duration / (periods.length || 1)),
          intensity: this.normalizeIntensity(period?.intensity, request.difficulty),
          drills,
          notes: period?.notes || '',
          objectives: Array.isArray(period?.objectives)
            ? period.objectives
            : request.goals,
        };
      }
    );

    const hasPeriods = mappedPeriods.length > 0;

    return {
      id: `practice_${Date.now()}`,
      teamId: team.teamId,
      title: `${team.teamName} Practice Blueprint`,
      sport: request.sport,
      ageGroup: request.ageGroup,
      duration: request.duration,
      goals: request.goals,
      periods: hasPeriods
        ? mappedPeriods
        : this.buildFallbackPlan(request, team).periods,
      notes:
        rawPlan?.summary ||
        'AI generated practice plan. Review and customize before sharing.',
      createdAt: new Date(),
      updatedAt: now,
      aiConfidence: Math.round((rawPlan?.confidence ?? 0.6) * 100),
      tags: [request.sport, request.ageGroup, request.difficulty].filter(
        Boolean
      ) as string[],
      difficulty: this.normalizeDifficulty(request.difficulty),
    };
  }

  private normalizeDrills(
    request: AIPracticePlanRequest,
    drills: unknown,
    periodDuration: number
  ): PracticePlanDrill[] {
    if (Array.isArray(drills) && drills.every(d => typeof d === 'object')) {
      return (drills as PracticePlanDrill[]).map((drill, index) => ({
        id: drill.id ?? `drill_${index}`,
        name: drill.name ?? `Drill ${index + 1}`,
        category: drill.category ?? 'general',
        duration: Number(drill.duration) || Math.max(6, Math.round(periodDuration / 3)),
        description: drill.description ?? 'Coach-led activity.',
        equipment: drill.equipment ?? request.equipment ?? [],
        objectives: drill.objectives ?? request.goals,
        skillLevel: this.normalizeDifficulty(request.difficulty),
        sport: request.sport,
        ageGroup: request.ageGroup,
        intensity:
          drill.intensity ??
          DEFAULT_DRILL_INTENSITY[this.normalizeDifficulty(request.difficulty)],
      }));
    }

    const drillList = Array.isArray(drills) ? drills : [];
    const count = drillList.length || 3;
    const durationPerDrill = Math.max(6, Math.round(periodDuration / count));

    return drillList.map((drill, index) => {
      const name = typeof drill === 'string' ? drill : `Drill ${index + 1}`;
      return {
        id: `drill_${index}`,
        name,
        category: 'general',
        duration: durationPerDrill,
        description: typeof drill === 'string' ? drill : 'Coach-led activity.',
        equipment: request.equipment ?? [],
        objectives: request.goals,
        skillLevel: this.normalizeDifficulty(request.difficulty),
        sport: request.sport,
        ageGroup: request.ageGroup,
        intensity: DEFAULT_DRILL_INTENSITY[
          this.normalizeDifficulty(request.difficulty)
        ],
      };
    });
  }

  private buildFallbackPlan(
    request: AIPracticePlanRequest,
    team: ReturnType<typeof this.buildTeamContext>
  ): PracticePlan {
    const now = new Date();
    const periods: PracticePeriod[] = [
      {
        id: 'period_warmup',
        name: 'Warm-Up Activation',
        duration: Math.max(10, Math.round(request.duration * 0.2)),
        intensity: 'low',
        drills: this.normalizeDrills(
          request,
          ['Dynamic mobility circuit', 'Positional footwork refresh'],
          Math.max(10, Math.round(request.duration * 0.2))
        ),
        notes: 'Emphasize movement quality and communication.',
        objectives: request.goals,
      },
      {
        id: 'period_skill',
        name: 'Skill Development',
        duration: Math.max(25, Math.round(request.duration * 0.4)),
        intensity: 'medium',
        drills: this.normalizeDrills(
          request,
          ['Positional technique pods', 'Competitive skill stations'],
          Math.max(25, Math.round(request.duration * 0.4))
        ),
        notes: 'Rotate players through competitive skill environments.',
        objectives: request.goals,
      },
      {
        id: 'period_team',
        name: 'Team Concepts & Scrimmage',
        duration: Math.max(20, Math.round(request.duration * 0.3)),
        intensity: 'high',
        drills: this.normalizeDrills(
          request,
          ['Scenario-based scrimmage', 'Special teams & situational reps'],
          Math.max(20, Math.round(request.duration * 0.3))
        ),
        notes: 'Tie drills back to upcoming opponent or season goals.',
        objectives: request.goals,
      },
      {
        id: 'period_review',
        name: 'Recovery & Review',
        duration: Math.max(10, Math.round(request.duration * 0.1)),
        intensity: 'low',
        drills: this.normalizeDrills(
          request,
          ['Guided recovery & mobility', 'Coach-led reflection circle'],
          Math.max(10, Math.round(request.duration * 0.1))
        ),
        notes: 'Capture takeaways and prep next session.',
        objectives: request.goals,
      },
    ];

    return {
      id: `practice_${Date.now()}`,
      teamId: team.teamId,
      title: `${team.teamName} Practice Blueprint`,
      sport: request.sport,
      ageGroup: request.ageGroup,
      duration: request.duration,
      goals: request.goals,
      periods,
      notes: 'Fallback plan generated locally while AI service recovers.',
      createdAt: now,
      updatedAt: now,
      aiConfidence: 55,
      tags: [request.sport, request.ageGroup, request.difficulty].filter(
        Boolean
      ) as string[],
      difficulty: this.normalizeDifficulty(request.difficulty),
    };
  }

  private normalizeDifficulty(
    difficulty: string
  ): 'beginner' | 'intermediate' | 'advanced' {
    if (difficulty === 'beginner') return 'beginner';
    if (difficulty === 'advanced') return 'advanced';
    return 'intermediate';
  }

  private normalizeIntensity(
    intensity: string | undefined,
    difficulty: string
  ): 'low' | 'medium' | 'high' {
    const normalized = (intensity ?? '').toLowerCase();
    if (normalized.includes('low')) return 'low';
    if (normalized.includes('high')) return 'high';
    return DEFAULT_DRILL_INTENSITY[this.normalizeDifficulty(difficulty)];
  }

  private toStrategyTeamProfile(team: TeamProfile) {
    return {
      teamProfile: {
        name: team.teamName,
        sport: team.sport,
        playerCount: team.playerCount,
        experienceLevel: team.experienceLevel,
        preferredStyle: team.preferredStyle,
        strengths: team.strengths,
        weaknesses: team.weaknesses,
      },
    };
  }

  private toStrategySituation(requirements: PlayRequirements) {
    return {
      objective: requirements.objective,
      difficulty: requirements.difficulty,
      specialSituations: requirements.specialSituations,
      playerCount: requirements.playerCount,
      clock: requirements.timeOnShotClock,
    };
  }

  private toPlayerPositions(positions: any): PlayerPosition[] | undefined {
    if (!Array.isArray(positions)) {
      return undefined;
    }

    return positions.map((position, index) => ({
      position: position?.role || position?.position || `Player ${index + 1}`,
      movement: position?.movement || 'Align with formation, execute assigned route.',
      responsibility:
        position?.responsibility || 'Maintain spacing and execute within timing.',
      keyPoints: position?.keyPoints ?? position?.coachingPoints ?? [],
    }));
  }

  private buildPlayName(requirements: PlayRequirements) {
    const base = requirements.objective
      ? requirements.objective.replace(/[-_]/g, ' ')
      : 'dynamic';
    return `${base.replace(/\b\w/g, (char) => char.toUpperCase())} Strike`;
  }

  private buildFallbackPlay(
    teamProfile: TeamProfile,
    requirements: PlayRequirements
  ): GeneratedPlay {
    return {
      id: `fallback_play_${Date.now()}`,
      name: this.buildPlayName(requirements),
      description:
        'Structured fallback play focusing on alignment, misdirection, and spacing. Designed to leverage team strengths while minimizing turnovers.',
      formation: teamProfile.playerCount >= 11 ? 'Trips Right' : 'Balanced Stack',
      positions: [
        {
          position: 'Quarterback',
          movement: 'Open with play-action fake, bootleg to strong side',
          responsibility: 'Progressive read – deep, intermediate, flat',
          keyPoints: ['Sell the fake', 'Maintain depth', 'Throw on rhythm'],
        },
        {
          position: 'Running Back',
          movement: 'Sell downhill mesh then release to flat',
          responsibility: 'Hold linebackers with fake, leak as safety valve',
          keyPoints: ['Maintain pad level', 'Secure exchange', 'Explode to flat'],
        },
        {
          position: 'Slot Receiver',
          movement: 'Motion across formation, run deep over route',
          responsibility: 'Clear defenders, provide explosive option',
          keyPoints: ['Stack defender', 'Maintain leverage', 'Finish high'],
        },
      ],
      coachingPoints: [
        'Emphasize pre-snap motion to create defensive hesitation.',
        'Quarterback timing determines play success – practice rollout depth.',
        'Backside protection must seal edge to allow quarterback launch point.',
      ],
      variations: [
        'Short yardage: convert to quick hitch concept off play-action.',
        'Against blitz: hot read replaces deep route with quick slant.',
      ],
      adjustments: [],
      keySuccessFactors: ['Sell the play-action', 'Quarterback timing', 'Backside protection'],
      confidence: 0.55,
      tags: [teamProfile.sport, requirements.objective, requirements.difficulty],
    };
  }
}

export const aiService = new AIService();
export default aiService;
