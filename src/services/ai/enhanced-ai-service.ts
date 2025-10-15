export interface AIPracticePlanTeamContext {
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

export interface AIPracticePlanRequest {
  sport: string;
  ageGroup: string;
  duration: number;
  goals: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | string;
  teamSize?: number;
  equipment?: string[];
  weather?: string;
  recentPerformance?: string;
  teamContext?: AIPracticePlanTeamContext;
}

export default AIPracticePlanRequest;
