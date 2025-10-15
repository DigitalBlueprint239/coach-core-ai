import { AIPracticePlanRequest } from '../services/ai/enhanced-ai-service';

export type AgeGroup = 'U8' | 'U10' | 'U12' | 'U14' | 'U16' | 'U18';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type FacilityType = 'full_court' | 'half_court' | 'outdoor';

export interface PlayerSkillProfile {
  dribbling: number;
  shooting: number;
  passing: number;
  defense: number;
}

export interface MockPlayer {
  id: string;
  name: string;
  position: string;
  skills: PlayerSkillProfile;
}

export interface SeasonResult {
  opponent: string;
  outcome: 'W' | 'L';
  score: string;
  date: string;
}

export interface SeasonContext {
  record: string;
  recentResults: SeasonResult[];
  upcomingOpponents: string[];
}

export interface PracticeConstraints {
  duration: 15 | 30 | 60 | 90;
  facilityType: FacilityType;
  equipment: string[];
}

export interface MockTeamContext {
  teamName: string;
  ageGroup: AgeGroup;
  skillLevel: SkillLevel;
  headCoach: string;
  players: MockPlayer[];
  season: SeasonContext;
  constraints: PracticeConstraints;
  focusAreas: string[];
}

export interface MockScenario {
  id: string;
  label: string;
  description: string;
  teamContext: MockTeamContext;
  request: AIPracticePlanRequest;
}

export interface MockGeneratorOptions {
  seed?: number;
  teamName?: string;
  ageGroup?: AgeGroup;
  skillLevel?: SkillLevel;
  duration?: 15 | 30 | 60 | 90;
  playerCount?: number;
  facilityType?: FacilityType;
  equipment?: string[];
  focusAreas?: string[];
}

class SeededRandom {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed % 2147483647;
    if (this.state <= 0) {
      this.state += 2147483646;
    }
  }

  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }

  pick<T>(items: T[]): T {
    const index = Math.floor(this.next() * items.length);
    return items[index];
  }

  pickMany<T>(items: T[], count: number): T[] {
    const copy = [...items];
    const result: T[] = [];
    while (result.length < count && copy.length > 0) {
      const index = Math.floor(this.next() * copy.length);
      result.push(copy.splice(index, 1)[0]);
    }
    return result;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

const BASE_TEAM_NAMES = [
  'Wildcats',
  'Falcons',
  'Storm',
  'Tigers',
  'Hawks',
  'Rangers',
  'Mustangs',
  'Cyclones',
  'Warriors',
  'Lions',
];

const PLAYER_FIRST_NAMES = [
  'Avery',
  'Jordan',
  'Skyler',
  'Rowan',
  'Elliot',
  'Peyton',
  'Harper',
  'Kai',
  'Morgan',
  'Reese',
  'Blake',
  'London',
  'Dakota',
  'Jules',
  'Cam',
];

const PLAYER_LAST_NAMES = [
  'Anderson',
  'Bennett',
  'Carter',
  'Dawson',
  'Emerson',
  'Fischer',
  'Grayson',
  'Hayes',
  'Irving',
  'Jamison',
  'Kennedy',
  'Logan',
  'Monroe',
  'Nolan',
  'Oakley',
];

const PLAYER_POSITIONS = [
  'Point Guard',
  'Shooting Guard',
  'Small Forward',
  'Power Forward',
  'Center',
  'Wing',
  'Utility',
];

const FACILITY_EQUIPMENT: Record<FacilityType, string[]> = {
  full_court: ['cones', 'agility ladder', 'medicine ball', 'shooting machine'],
  half_court: ['cones', 'passing targets', 'resistance bands'],
  outdoor: ['cones', 'portable hoop', 'speed hurdles'],
};

const FOCUS_AREAS_BY_AGE: Record<AgeGroup, string[]> = {
  U8: ['ball-handling fundamentals', 'coordination games', 'teamwork basics'],
  U10: ['dribble control', 'passing accuracy', 'layup mechanics'],
  U12: ['spacing', 'transition awareness', 'defensive stance'],
  U14: ['set plays intro', 'press break', 'shot selection'],
  U16: ['advanced spacing', 'tempo control', 'defensive communication'],
  U18: ['situational execution', 'conditioning', 'special teams'],
};

const GOALS_BY_SKILL: Record<SkillLevel, string[]> = {
  beginner: ['ball control', 'footwork', 'confidence building'],
  intermediate: ['spacing', 'decision making', 'defensive positioning'],
  advanced: ['execution under pressure', 'time management', 'advanced sets'],
};

function buildTeamName(random: SeededRandom, override?: string): string {
  if (override) {
    return override;
  }
  const base = random.pick(BASE_TEAM_NAMES);
  const suffix = random.pick(['Elite', 'Select', 'Academy', 'Club', 'Crew']);
  return `${base} ${suffix}`;
}

function buildPlayer(random: SeededRandom, position: string): MockPlayer {
  const first = random.pick(PLAYER_FIRST_NAMES);
  const last = random.pick(PLAYER_LAST_NAMES);
  const skills: PlayerSkillProfile = {
    dribbling: random.int(1, 5),
    shooting: random.int(1, 5),
    passing: random.int(1, 5),
    defense: random.int(1, 5),
  };

  return {
    id: `${first.toLowerCase()}-${last.toLowerCase()}-${Math.floor(random.next() * 1000)}`,
    name: `${first} ${last}`,
    position,
    skills,
  };
}

function buildPlayers(random: SeededRandom, count: number): MockPlayer[] {
  const players: MockPlayer[] = [];
  const positions = [...PLAYER_POSITIONS];

  for (let i = 0; i < count; i += 1) {
    const position = positions[i % positions.length];
    players.push(buildPlayer(random, position));
  }

  return players;
}

function buildRecord(random: SeededRandom): SeasonContext {
  const wins = random.int(2, 8);
  const losses = random.int(0, 6);
  const recentResults: SeasonResult[] = [];

  for (let i = 0; i < 3; i += 1) {
    const opponent = `${random.pick(BASE_TEAM_NAMES)} ${random.pick(['Squad', 'Crew', 'United', 'Legends'])}`;
    const ourScore = random.int(35, 65);
    const theirScore = random.int(30, 60);
    recentResults.push({
      opponent,
      outcome: ourScore >= theirScore ? 'W' : 'L',
      score: `${ourScore}-${theirScore}`,
      date: new Date(Date.now() - i * 86400000 * 3).toISOString().split('T')[0],
    });
  }

  const upcomingOpponents = random.pickMany(BASE_TEAM_NAMES, 3).map(name => `${name} FC`);

  return {
    record: `${wins}-${losses}`,
    recentResults,
    upcomingOpponents,
  };
}

function buildPracticeConstraints(random: SeededRandom, options: MockGeneratorOptions): PracticeConstraints {
  const duration = options.duration ?? random.pick([30, 60, 90]) as 30 | 60 | 90;
  const facilityType = options.facilityType ?? random.pick(['full_court', 'half_court', 'outdoor']);
  const baseEquipment = FACILITY_EQUIPMENT[facilityType];
  const equipment = options.equipment ?? random.pickMany(baseEquipment, Math.max(1, Math.min(baseEquipment.length, 3)));

  return {
    duration,
    facilityType,
    equipment,
  };
}

function buildFocusAreas(random: SeededRandom, ageGroup: AgeGroup, skillLevel: SkillLevel, overrides?: string[]): string[] {
  if (overrides && overrides.length > 0) {
    return overrides;
  }
  const ageAreas = FOCUS_AREAS_BY_AGE[ageGroup];
  const skillGoals = GOALS_BY_SKILL[skillLevel];
  return [...random.pickMany(ageAreas, Math.min(ageAreas.length, 2)), ...random.pickMany(skillGoals, Math.min(skillGoals.length, 2))];
}

export function generateMockTeamContext(options: MockGeneratorOptions = {}): {
  teamContext: MockTeamContext;
  request: AIPracticePlanRequest;
} {
  const random = new SeededRandom(options.seed);
  const ageGroup = options.ageGroup ?? random.pick(['U8', 'U10', 'U12', 'U14', 'U16', 'U18']);
  const skillLevel = options.skillLevel ?? random.pick(['beginner', 'intermediate', 'advanced']);
  const teamName = buildTeamName(random, options.teamName);
  const constraints = buildPracticeConstraints(random, options);
  const focusAreas = buildFocusAreas(random, ageGroup, skillLevel, options.focusAreas);
  const playerCount = Math.min(12, Math.max(0, options.playerCount ?? random.int(8, 12)));
  const players = playerCount > 0 ? buildPlayers(random, playerCount) : [];

  const teamContext: MockTeamContext = {
    teamName,
    ageGroup,
    skillLevel,
    headCoach: `${random.pick(PLAYER_FIRST_NAMES)} ${random.pick(PLAYER_LAST_NAMES)}`,
    players,
    season: buildRecord(random),
    constraints,
    focusAreas,
  };

  const request: AIPracticePlanRequest = {
    sport: 'basketball',
    ageGroup,
    duration: constraints.duration,
    goals: focusAreas,
    difficulty: skillLevel,
    teamSize: players.length,
    equipment: constraints.equipment,
    weather: constraints.facilityType === 'outdoor' ? 'outdoor' : 'indoor',
    recentPerformance: teamContext.season.record,
    teamContext: {
      teamId: `${teamName.toLowerCase().replace(/\s+/g, '-')}-${Math.floor(random.next() * 100)}`,
      teamName,
      sport: 'basketball',
      ageGroup,
      skillLevel,
      seasonPhase: 'regular',
      strengths: focusAreas.slice(0, 2),
      weaknesses: ['turnovers', 'communication'],
      equipment: constraints.equipment,
    },
  };

  return { teamContext, request };
}

export function generateStandardScenarios(seed?: number): MockScenario[] {
  const result: MockScenario[] = [];
  const baseOptions: MockGeneratorOptions[] = [
    { seed: (seed ?? 1) + 1, ageGroup: 'U12', skillLevel: 'intermediate', duration: 60 },
    { seed: (seed ?? 1) + 2, ageGroup: 'U16', skillLevel: 'advanced', duration: 90 },
    { seed: (seed ?? 1) + 3, ageGroup: 'U10', skillLevel: 'beginner', duration: 30 },
  ];

  baseOptions.forEach((option, index) => {
    const { teamContext, request } = generateMockTeamContext(option);
    result.push({
      id: `standard-${index}`,
      label: `${teamContext.teamName} (${teamContext.ageGroup})`,
      description: `Standard scenario for ${teamContext.ageGroup} ${teamContext.skillLevel} focus`,
      teamContext,
      request,
    });
  });

  return result;
}

export function generateEdgeCaseScenarios(seed?: number): MockScenario[] {
  const randomSeed = seed ?? 99;
  const scenarios: MockScenario[] = [];

  // Empty team
  const emptyTeam = generateMockTeamContext({
    seed: randomSeed,
    playerCount: 0,
    teamName: 'Empty Bench Crew',
    duration: 30,
    equipment: [],
  });
  scenarios.push({
    id: 'edge-empty-team',
    label: 'Edge Case: Empty Roster',
    description: 'No registered players. Ensures fallbacks work without player data.',
    teamContext: emptyTeam.teamContext,
    request: emptyTeam.request,
  });

  // Single player
  const singlePlayer = generateMockTeamContext({
    seed: randomSeed + 1,
    playerCount: 1,
    teamName: 'Solo Star',
    duration: 30,
  });
  scenarios.push({
    id: 'edge-single-player',
    label: 'Edge Case: Solo Session',
    description: 'One player only. Validates plan scaling for individual work.',
    teamContext: singlePlayer.teamContext,
    request: singlePlayer.request,
  });

  // Short practice
  const shortPractice = generateMockTeamContext({
    seed: randomSeed + 2,
    duration: 15,
    teamName: 'Quick Hitters',
    ageGroup: 'U14',
  });
  scenarios.push({
    id: 'edge-short-practice',
    label: 'Edge Case: 15-Minute Practice',
    description: 'Compressed timeline forces condensed plan output.',
    teamContext: shortPractice.teamContext,
    request: shortPractice.request,
  });

  // Missing equipment
  const missingEquipment = generateMockTeamContext({
    seed: randomSeed + 3,
    teamName: 'Minimalists',
    equipment: [],
    facilityType: 'outdoor',
    focusAreas: ['conditioning', 'communication'],
  });
  scenarios.push({
    id: 'edge-missing-equipment',
    label: 'Edge Case: No Equipment',
    description: 'Outdoor setup with no equipment available.',
    teamContext: missingEquipment.teamContext,
    request: missingEquipment.request,
  });

  return scenarios;
}

export function generateAllScenarios(seed?: number): MockScenario[] {
  return [...generateStandardScenarios(seed), ...generateEdgeCaseScenarios(seed ? seed + 10 : undefined)];
}
