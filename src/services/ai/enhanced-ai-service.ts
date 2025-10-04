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
}

export default AIPracticePlanRequest;
