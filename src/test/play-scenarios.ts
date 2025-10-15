import { TeamProfile, PlayRequirements } from '../services/ai/types';

export type DefenseScheme = 'man_to_man' | 'zone_2_3' | 'zone_1_3_1' | 'press_full_court';
export type CourtPosition = 'baseline' | 'sideline' | 'half_court' | 'inbound';

export interface PlayerContext {
  starInFoulTrouble?: boolean;
  keyPlayerInjured?: boolean;
  mismatchAdvantage?: string;
  benchUnitOnFloor?: boolean;
}

export interface GameSituation {
  scoreDifferential: number; // positive if we lead, negative if we trail
  ourScore: number;
  theirScore: number;
  timeRemainingSeconds: number;
  possession: 'us' | 'them';
  courtPosition: CourtPosition;
  defenseScheme: DefenseScheme;
  shotClock?: number;
  notes?: string;
}

export interface PlayScenario {
  id: string;
  label: string;
  description: string;
  teamProfile: TeamProfile;
  requirements: PlayRequirements;
  situation: GameSituation;
  playerContext?: PlayerContext;
}

const BASE_TEAM: TeamProfile = {
  teamName: 'Metro Elite',
  teamId: 'metro-elite',
  sport: 'basketball',
  ageGroup: 'U18',
  playerCount: 11,
  experienceLevel: 'advanced',
  preferredStyle: 'balanced',
  strengths: ['perimeter shooting', 'ball screens'],
  weaknesses: ['defensive rebounding'],
};

const cloneTeam = (overrides: Partial<TeamProfile>): TeamProfile => ({
  ...BASE_TEAM,
  ...overrides,
});

const baseRequirements: PlayRequirements = {
  objective: 'scoring',
  difficulty: 'advanced',
  timeOnShotClock: 12,
  specialSituations: ['late_game'],
  playerCount: 5,
};

const cloneRequirements = (overrides: Partial<PlayRequirements>): PlayRequirements => ({
  ...baseRequirements,
  ...overrides,
});

export const PLAY_SCENARIOS: PlayScenario[] = [
  {
    id: 'need-three-late',
    label: 'Down by 3 – 30 seconds left',
    description: 'Need a quick three-pointer out of timeout on sideline inbound.',
    teamProfile: cloneTeam({ preferredStyle: 'perimeter' }),
    requirements: cloneRequirements({
      objective: 'three_point',
      specialSituations: ['need_three', 'sideline_out_of_bounds'],
      timeOnShotClock: 10,
    }),
    situation: {
      scoreDifferential: -3,
      ourScore: 72,
      theirScore: 75,
      timeRemainingSeconds: 30,
      possession: 'us',
      courtPosition: 'sideline',
      defenseScheme: 'man_to_man',
      shotClock: 24,
      notes: 'Quick-hitter, one timeout remaining.',
    },
    playerContext: {
      mismatchAdvantage: 'Our SG vs slower PF after switch',
    },
  },
  {
    id: 'protect-lead',
    label: 'Up by 1 – 10s inbound under basket',
    description: 'Secure inbound, expect quick foul. Need safe entry and FT opportunity.',
    teamProfile: cloneTeam({ preferredStyle: 'deliberate' }),
    requirements: cloneRequirements({
      objective: 'secure_inbound',
      specialSituations: ['baseline_out_of_bounds', 'protect_lead'],
      timeOnShotClock: 5,
    }),
    situation: {
      scoreDifferential: 1,
      ourScore: 68,
      theirScore: 67,
      timeRemainingSeconds: 10,
      possession: 'us',
      courtPosition: 'baseline',
      defenseScheme: 'press_full_court',
      shotClock: 21,
      notes: 'Opponent pressing immediately after timeout.',
    },
    playerContext: {
      starInFoulTrouble: false,
      keyPlayerInjured: false,
    },
  },
  {
    id: 'zone-possession',
    label: 'Tied game vs 2-3 zone',
    description: 'Need a zone-busting set to get clean look with 1:15 left.',
    teamProfile: cloneTeam({ preferredStyle: 'inside_out' }),
    requirements: cloneRequirements({
      objective: 'zone_attack',
      specialSituations: ['half_court'],
      timeOnShotClock: 14,
    }),
    situation: {
      scoreDifferential: 0,
      ourScore: 58,
      theirScore: 58,
      timeRemainingSeconds: 75,
      possession: 'us',
      courtPosition: 'half_court',
      defenseScheme: 'zone_2_3',
      shotClock: 18,
    },
    playerContext: {
      mismatchAdvantage: 'Stretch 4 with shooting range.',
    },
  },
  {
    id: 'fast-break',
    label: '3-on-2 Fast Break',
    description: 'Push tempo with numbers advantage for layup or kick-out three.',
    teamProfile: cloneTeam({ preferredStyle: 'up_tempo' }),
    requirements: cloneRequirements({
      objective: 'transition_finish',
      specialSituations: ['fast_break'],
      timeOnShotClock: 8,
    }),
    situation: {
      scoreDifferential: 2,
      ourScore: 81,
      theirScore: 79,
      timeRemainingSeconds: 45,
      possession: 'us',
      courtPosition: 'half_court',
      defenseScheme: 'man_to_man',
      shotClock: 18,
      notes: 'Secure quick basket before defense is set.',
    },
  },
  {
    id: 'press-break',
    label: 'Break Full-Court Press',
    description: 'Out of timeout, opponent deploying aggressive press. Need structured press break.',
    teamProfile: cloneTeam({ preferredStyle: 'structured' }),
    requirements: cloneRequirements({
      objective: 'press_break',
      specialSituations: ['press'],
      timeOnShotClock: 24,
    }),
    situation: {
      scoreDifferential: -1,
      ourScore: 60,
      theirScore: 61,
      timeRemainingSeconds: 120,
      possession: 'us',
      courtPosition: 'inbound',
      defenseScheme: 'press_full_court',
      shotClock: 24,
    },
  },
  {
    id: 'iso-last-shot',
    label: 'Iso for last shot – 12 seconds',
    description: 'Tie game, no timeout. Need controlled isolation at top of key.',
    teamProfile: cloneTeam({ preferredStyle: 'iso_heavy' }),
    requirements: cloneRequirements({
      objective: 'isolation',
      specialSituations: ['late_clock'],
      timeOnShotClock: 12,
    }),
    situation: {
      scoreDifferential: 0,
      ourScore: 77,
      theirScore: 77,
      timeRemainingSeconds: 12,
      possession: 'us',
      courtPosition: 'half_court',
      defenseScheme: 'man_to_man',
      shotClock: 12,
    },
    playerContext: {
      starInFoulTrouble: true,
      mismatchAdvantage: 'Quick PG vs slower defender',
    },
  },
  {
    id: 'post-mismatch',
    label: 'Exploit Post Mismatch',
    description: 'Our big has advantage; need quick entry with weakside action.',
    teamProfile: cloneTeam({ preferredStyle: 'inside_out' }),
    requirements: cloneRequirements({
      objective: 'post_entry',
      specialSituations: ['half_court'],
      timeOnShotClock: 16,
    }),
    situation: {
      scoreDifferential: 4,
      ourScore: 55,
      theirScore: 51,
      timeRemainingSeconds: 210,
      possession: 'us',
      courtPosition: 'half_court',
      defenseScheme: 'man_to_man',
      shotClock: 16,
    },
    playerContext: {
      mismatchAdvantage: 'Center vs smaller defender',
    },
  },
  {
    id: 'zone-buzzer',
    label: 'Beat 1-3-1 Zone at buzzer',
    description: 'Need corner look vs 1-3-1 with 6 seconds remaining.',
    teamProfile: cloneTeam({ preferredStyle: 'perimeter' }),
    requirements: cloneRequirements({
      objective: 'zone_attack',
      specialSituations: ['baseline_out_of_bounds'],
      timeOnShotClock: 6,
    }),
    situation: {
      scoreDifferential: -2,
      ourScore: 64,
      theirScore: 66,
      timeRemainingSeconds: 6,
      possession: 'us',
      courtPosition: 'baseline',
      defenseScheme: 'zone_1_3_1',
      shotClock: 6,
    },
  },
  {
    id: 'foul-trouble-call',
    label: 'Star in Foul Trouble',
    description: 'Run action that keeps star out of charge situations while producing quality look.',
    teamProfile: cloneTeam({ preferredStyle: 'pace_control' }),
    requirements: cloneRequirements({
      objective: 'scoring',
      specialSituations: ['protect_star'],
      timeOnShotClock: 18,
    }),
    situation: {
      scoreDifferential: 5,
      ourScore: 70,
      theirScore: 65,
      timeRemainingSeconds: 150,
      possession: 'us',
      courtPosition: 'half_court',
      defenseScheme: 'man_to_man',
      shotClock: 18,
    },
    playerContext: {
      starInFoulTrouble: true,
    },
  },
  {
    id: 'lineup-injury',
    label: 'Key Player Injured – adjust set',
    description: 'Our starting PG is out. Need set relying on off-ball action and secondary handlers.',
    teamProfile: cloneTeam({ preferredStyle: 'motion' }),
    requirements: cloneRequirements({
      objective: 'scoring',
      specialSituations: ['injury_adjustment'],
      timeOnShotClock: 20,
    }),
    situation: {
      scoreDifferential: -4,
      ourScore: 52,
      theirScore: 56,
      timeRemainingSeconds: 300,
      possession: 'us',
      courtPosition: 'half_court',
      defenseScheme: 'zone_2_3',
      shotClock: 20,
    },
    playerContext: {
      keyPlayerInjured: true,
      benchUnitOnFloor: true,
    },
  },
  {
    id: 'sideline-after-timeout',
    label: 'SLOB vs switching defense',
    description: 'Need sideline play to punish aggressive switching with under 40 seconds left.',
    teamProfile: cloneTeam({ preferredStyle: 'structured' }),
    requirements: cloneRequirements({
      objective: 'sideline_out_of_bounds',
      specialSituations: ['late_game'],
      timeOnShotClock: 8,
    }),
    situation: {
      scoreDifferential: 1,
      ourScore: 74,
      theirScore: 73,
      timeRemainingSeconds: 38,
      possession: 'us',
      courtPosition: 'sideline',
      defenseScheme: 'man_to_man',
      shotClock: 8,
      notes: 'Opponents switching every screen.',
    },
  },
];
