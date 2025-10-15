export interface Game {
  id: string;
  teamId: string;
  opponent: string;
  date: Date;
  venue: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  score: { home: number; away: number };
  quarters: Quarter[];
  statistics: GameStatistics;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Quarter {
  number: number;
  duration: number; // in minutes
  homeScore: number;
  awayScore: number;
  plays: Play[];
  timeouts: Timeout[];
}

export interface Play {
  id: string;
  quarter: number;
  time: string; // MM:SS format
  down: number;
  distance: number;
  yardLine: number;
  playType: 'run' | 'pass' | 'punt' | 'field_goal' | 'kickoff' | 'extra_point';
  result: PlayResult;
  players: PlayerInvolvement[];
  notes: string;
}

export interface PlayResult {
  yards: number;
  outcome: 'touchdown' | 'first_down' | 'turnover' | 'incomplete' | 'sack' | 'interception' | 'fumble';
  success: boolean;
}

export interface PlayerInvolvement {
  playerId: string;
  action: 'carry' | 'catch' | 'pass' | 'tackle' | 'interception' | 'fumble';
  yards: number;
  success: boolean;
}

export interface GameStatistics {
  teamStats: TeamStats;
  playerStats: PlayerGameStats[];
  plays: Play[];
  timeouts: Timeout[];
}

export interface TeamStats {
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  turnovers: number;
  penalties: number;
  timeOfPossession: number;
}

export interface PlayerGameStats {
  playerId: string;
  yards: number;
  attempts: number;
  successes: number;
  touchdowns: number;
}

export interface Timeout {
  id: string;
  team: 'home' | 'away';
  quarter: number;
  time: string;
  reason: string;
}

export interface GameFormData {
  opponent: string;
  date: string;
  venue: string;
  notes: string;
}

export interface CreateGameData extends Omit<Game, 'id' | 'createdAt' | 'updatedAt' | 'quarters' | 'statistics'> {
  quarters: Quarter[];
  statistics: GameStatistics;
}
