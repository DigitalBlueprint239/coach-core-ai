export interface TeamProfile {
  teamId?: string;
  teamName: string;
  sport: string;
  ageGroup: string;
  playerCount: number;
  experienceLevel: string;
  preferredStyle?: string;
  strengths: string[];
  weaknesses: string[];
}

export interface PlayRequirements {
  objective: string;
  difficulty: string;
  timeOnShotClock?: number;
  specialSituations: string[];
  playerCount?: number;
}

export interface PlayerPosition {
  position: string;
  movement: string;
  responsibility: string;
  keyPoints?: string[];
}

export interface GeneratedPlay {
  id: string;
  name: string;
  description: string;
  formation?: string;
  positions?: PlayerPosition[];
  coachingPoints?: string[];
  variations?: string[];
  adjustments?: string[];
  keySuccessFactors?: string[];
  confidence?: number;
  tags?: string[];
}

export interface GeneratedPlayResponse {
  success: boolean;
  play?: GeneratedPlay;
  insights?: string[];
  confidence?: number;
  fallback?: boolean;
  raw?: any;
}
