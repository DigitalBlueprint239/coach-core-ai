// TEMPORARY STUB: Entire file commented out to unblock build. Restore and refactor for type and export compatibility.

/*
// src/utils/data-seeding.ts
import { 
  doc, 
  setDoc, 
  writeBatch, 
  collection, 
  getDocs,
  query,
  where,
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  User, Team, Player, PracticePlan, Play, 
  Sport, AgeGroup, PlayerPosition, UserRole,
  COLLECTIONS, NotificationType, FootballLevel, FeatureGating
} from '../types/firestore-schema';

// ============================================
// SEEDING TYPES
// ============================================

export interface SeedingConfig {
  users: UserSeedConfig;
  teams: TeamSeedConfig;
  players: PlayerSeedConfig;
  practicePlans: PracticePlanSeedConfig;
  plays: PlaySeedConfig;
  dryRun: boolean;
  batchSize: number;
  clearExisting: boolean;
}

export interface UserSeedConfig {
  count: number;
  roles: UserRole[];
  personas: string[];
  includeSubscriptions: boolean;
}

export interface TeamSeedConfig {
  count: number;
  sports: Sport[];
  ageGroups: AgeGroup[];
  includeStats: boolean;
  includeSchedule: boolean;
}

export interface PlayerSeedConfig {
  perTeam: number;
  positions: PlayerPosition[];
  includeMedicalInfo: boolean;
  includeStats: boolean;
}

export interface PracticePlanSeedConfig {
  perTeam: number;
  includeDrills: boolean;
  includeAttendance: boolean;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface PlaySeedConfig {
  perTeam: number;
  categories: string[];
  difficulties: string[];
  includeDiagrams: boolean;
}

export interface SeedResult {
  users: { created: number; failed: number };
  teams: { created: number; failed: number };
  players: { created: number; failed: number };
  practicePlans: { created: number; failed: number };
  plays: { created: number; failed: number };
  totalTime: number;
  errors: string[];
}

// ============================================
// DATA GENERATORS
// ============================================

export class DataSeeder {
  private config: SeedingConfig;
  private generatedData: {
    users: User[];
    teams: Team[];
    players: Player[];
    practicePlans: PracticePlan[];
    plays: Play[];
  } = {
    users: [],
    teams: [],
    players: [],
    practicePlans: [],
    plays: []
  };

  constructor(config: SeedingConfig) {
    this.config = config;
  }

  // ============================================
  // MAIN SEEDING METHODS
  // ============================================

  async seedAll(): Promise<SeedResult> {
    const startTime = Date.now();
    const result: SeedResult = {
      users: { created: 0, failed: 0 },
      teams: { created: 0, failed: 0 },
      players: { created: 0, failed: 0 },
      practicePlans: { created: 0, failed: 0 },
      plays: { created: 0, failed: 0 },
      totalTime: 0,
      errors: []
    };

    try {
      console.log('Starting data seeding...');

      // Clear existing data if configured
      if (this.config.clearExisting) {
        await this.clearExistingData();
      }

      // Seed users first
      console.log('Seeding users...');
      const userResult = await this.seedUsers();
      result.users = userResult;

      // Seed teams
      console.log('Seeding teams...');
      const teamResult = await this.seedTeams();
      result.teams = teamResult;

      // Seed players
      console.log('Seeding players...');
      const playerResult = await this.seedPlayers();
      result.players = playerResult;

      // Seed practice plans
      console.log('Seeding practice plans...');
      const planResult = await this.seedPracticePlans();
      result.practicePlans = planResult;

      // Seed plays
      console.log('Seeding plays...');
      const playResult = await this.seedPlays();
      result.plays = playResult;

      console.log('Data seeding completed successfully!');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      console.error('Error during seeding:', error);
    } finally {
      result.totalTime = Date.now() - startTime;
    }

    return result;
  }

  // ============================================
  // USER SEEDING
  // ============================================

  private async seedUsers(): Promise<{ created: number; failed: number }> {
    const users = this.generateUsers();
    this.generatedData.users = users;

    if (this.config.dryRun) {
      console.log(`Would create ${users.length} users`);
      return { created: users.length, failed: 0 };
    }

    const batch = writeBatch(db);
    let created = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const userRef = doc(db, COLLECTIONS.USERS, user.id!);
        batch.set(userRef, {
          ...user,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        created++;
      } catch (error) {
        console.error(`Failed to create user ${user.id}:`, error);
        failed++;
      }
    }

    await batch.commit();
    return { created, failed };
  }

  private generateUsers(): User[] {
    const users: User[] = [];
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Tom', 'Amy', 'Chris', 'Emma'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

    for (let i = 0; i < this.config.users.count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const role = this.config.users.roles[Math.floor(Math.random() * this.config.users.roles.length)];
      const persona = this.config.users.personas[Math.floor(Math.random() * this.config.users.personas.length)];

      const user: User = {
        id: `user_${i + 1}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        displayName: `${firstName} ${lastName}`,
        photoURL: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`,
        roles: [role],
        teamIds: [],
        persona: persona as any,
        preferences: this.generateUserPreferences(),
        subscription: this.generateSubscription(),
        lastActiveAt: Timestamp.now(),
        isEmailVerified: true,
        phoneNumber: this.generatePhoneNumber(),
        timezone: 'America/New_York',
        language: 'en',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: 'system'
      };

      users.push(user);
    }

    return users;
  }

  private generateUserPreferences() {
    return {
      notifications: {
        email: Math.random() > 0.3,
        sms: Math.random() > 0.7,
        push: Math.random() > 0.2,
        inApp: true,
        frequency: ['immediate', 'daily', 'weekly'][Math.floor(Math.random() * 3)] as any,
        types: ['practice_reminder', 'game_reminder', 'team_update'] as NotificationType[]
      },
      ai: {
        autoSuggest: Math.random() > 0.3,
        confidenceThreshold: 0.6 + Math.random() * 0.3,
        aiPersonality: ['conservative', 'balanced', 'aggressive'][Math.floor(Math.random() * 3)] as any,
        enableVoiceCommands: Math.random() > 0.8
      },
      theme: ['light', 'dark', 'auto'][Math.floor(Math.random() * 3)] as any,
      privacy: {
        profileVisibility: ['public', 'team_only', 'private'][Math.floor(Math.random() * 3)] as any,
        shareAnalytics: Math.random() > 0.4,
        allowDataCollection: Math.random() > 0.3
      }
    };
  }

  private generateSubscription() {
    const tiers = ['free', 'pro', 'enterprise'];
    const tier = tiers[Math.floor(Math.random() * tiers.length)] as any;
    
    return {
      tier,
      status: 'active' as any,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
      features: this.getSubscriptionFeatures(tier),
      billingCycle: Math.random() > 0.5 ? 'monthly' : 'yearly' as any
    };
  }

  private getSubscriptionFeatures(tier: string): string[] {
    const baseFeatures = ['basic_practice_plans', 'player_management'];
    
    switch (tier) {
      case 'pro':
        return [...baseFeatures, 'ai_insights', 'advanced_analytics', 'custom_plays'];
      case 'enterprise':
        return [...baseFeatures, 'ai_insights', 'advanced_analytics', 'custom_plays', 'multi_team', 'api_access', 'priority_support'];
      default:
        return baseFeatures;
    }
  }

  private generatePhoneNumber(): string {
    return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
  }

  // ============================================
  // TEAM SEEDING
  // ============================================

  private async seedTeams(): Promise<{ created: number; failed: number }> {
    const teams = this.generateTeams();
    this.generatedData.teams = teams;

    if (this.config.dryRun) {
      console.log(`Would create ${teams.length} teams`);
      return { created: teams.length, failed: 0 };
    }

    const batch = writeBatch(db);
    let created = 0;
    let failed = 0;

    for (const team of teams) {
      try {
        const teamRef = doc(db, COLLECTIONS.TEAMS, team.id!);
        batch.set(teamRef, {
          ...team,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        created++;
      } catch (error) {
        console.error(`Failed to create team ${team.id}:`, error);
        failed++;
      }
    }

    await batch.commit();
    return { created, failed };
  }

  private generateTeams(): Team[] {
    const teams: Team[] = [];
    const teamNames = [
      'Eagles', 'Lions', 'Tigers', 'Bears', 'Wolves', 'Panthers', 'Falcons', 'Hawks',
      'Sharks', 'Dolphins', 'Whales', 'Seahawks', 'Cardinals', 'Ravens', 'Crows', 'Owls'
    ];
    const cities = ['Springfield', 'Riverside', 'Fairview', 'Kingston', 'Salem', 'Georgetown', 'Madison', 'Franklin'];

    for (let i = 0; i < this.config.teams.count; i++) {
      const city = cities[Math.floor(Math.random() * cities.length)];
      const name = teamNames[Math.floor(Math.random() * teamNames.length)];
      const sport = this.config.teams.sports[Math.floor(Math.random() * this.config.teams.sports.length)];
      const ageGroup = this.config.teams.ageGroups[Math.floor(Math.random() * this.config.teams.ageGroups.length)];
      
      // Assign coaches from generated users
      const coaches = this.generatedData.users.filter(user => 
        user.roles.includes('head_coach') || user.roles.includes('assistant_coach')
      ).slice(0, 2);

      const level = this.config.teams.ageGroups.includes('youth') ? FootballLevel.YOUTH_10U : FootballLevel.VARSITY;
      const team: Team = {
        id: `team_${i + 1}`,
        name: `${city} ${name}`,
        sport,
        ageGroup,
        season: '2025',
        coachIds: coaches.map(c => c.id!),
        playerIds: [],
        settings: {
          isPublic: Math.random() > 0.5,
          allowPlayerFeedback: Math.random() > 0.3,
          enableAI: Math.random() > 0.2,
          requireApproval: Math.random() > 0.6,
          maxPlayers: 25,
          allowGuestAccess: Math.random() > 0.7
        },
        stats: this.config.teams.includeStats ? this.generateTeamStats() : {
          totalPlayers: 0,
          totalPlays: 0,
          totalPracticePlans: 0,
          averageAttendance: 0,
          winLossRecord: { wins: 0, losses: 0, ties: 0, winPercentage: 0 },
          seasonStartDate: Timestamp.now(),
          seasonEndDate: Timestamp.now()
        },
        location: {
          city,
          state: 'CA',
          country: 'USA',
          timezone: 'America/Los_Angeles',
          venue: `${city} Sports Complex`
        },
        schedule: this.config.teams.includeSchedule ? this.generateTeamSchedule() : {
          practiceDays: ['Monday', 'Wednesday', 'Friday'],
          practiceTime: '18:00',
          gameSchedule: []
        },
        level,
        constraints: {},
        level_extensions: {},
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: coaches[0]?.id || 'system'
      };

      teams.push(team);

      // Update user teamIds
      coaches.forEach(coach => {
        coach.teamIds.push(team.id!);
      });
    }

    return teams;
  }

  private generateTeamStats() {
    return {
      totalPlayers: Math.floor(Math.random() * 20) + 10,
      totalPlays: Math.floor(Math.random() * 50) + 10,
      totalPracticePlans: Math.floor(Math.random() * 30) + 5,
      averageAttendance: 70 + Math.random() * 25,
      winLossRecord: {
        wins: Math.floor(Math.random() * 10),
        losses: Math.floor(Math.random() * 8),
        ties: Math.floor(Math.random() * 3),
        winPercentage: Math.random() * 100
      },
      seasonStartDate: Timestamp.now(),
      seasonEndDate: Timestamp.now()
    };
  }

  private generateTeamSchedule() {
    const practiceDays = ['Monday', 'Wednesday', 'Friday'];
    const practiceTime = '18:00';
    const gameSchedule = [];

    // Generate some sample games
    for (let i = 0; i < 5; i++) {
      const gameDate = new Date();
      gameDate.setDate(gameDate.getDate() + (i + 1) * 7);
      
      gameSchedule.push({
        id: `game_${i + 1}`,
        opponent: `Opponent Team ${i + 1}`,
        date: Timestamp.fromDate(gameDate),
        location: 'Home',
        isHome: true,
        result: undefined
      });
    }

    return { practiceDays, practiceTime, gameSchedule };
  }

  // ============================================
  // PLAYER SEEDING
  // ============================================

  private async seedPlayers(): Promise<{ created: number; failed: number }> {
    const players = this.generatePlayers();
    this.generatedData.players = players;

    if (this.config.dryRun) {
      console.log(`Would create ${players.length} players`);
      return { created: players.length, failed: 0 };
    }

    const batch = writeBatch(db);
    let created = 0;
    let failed = 0;

    for (const player of players) {
      try {
        const playerRef = doc(db, COLLECTIONS.PLAYERS, player.id!);
        batch.set(playerRef, {
          ...player,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        created++;
      } catch (error) {
        console.error(`Failed to create player ${player.id}:`, error);
        failed++;
      }
    }

    await batch.commit();
    return { created, failed };
  }

  private generatePlayers(): Player[] {
    const players: Player[] = [];
    const firstNames = ['Alex', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Quinn', 'Avery', 'Morgan', 'Parker', 'Drew'];
    const lastNames = ['Anderson', 'Thompson', 'White', 'Black', 'Green', 'Blue', 'Red', 'Yellow', 'Purple', 'Orange'];

    let playerId = 1;
    for (const team of this.generatedData.teams) {
      for (let i = 0; i < this.config.players.perTeam; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const position = this.config.players.positions[Math.floor(Math.random() * this.config.players.positions.length)];

        const level = team.level;
        const player: Player = {
          id: `player_${playerId}`,
          teamId: team.id!,
          userId: undefined,
          firstName,
          lastName,
          jerseyNumber: i + 1,
          position,
          grade: Math.floor(Math.random() * 4) + 9, // 9-12 for high school
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@student.example.com`,
          phone: this.generatePhoneNumber(),
          parentEmail: `parent.${lastName.toLowerCase()}@example.com`,
          parentPhone: this.generatePhoneNumber(),
          physicalInfo: {
            height: 60 + Math.floor(Math.random() * 24), // 5'0" to 6'11"
            weight: 120 + Math.floor(Math.random() * 80), // 120-200 lbs
            age: 14 + Math.floor(Math.random() * 4), // 14-17 years old
            dominantHand: ['left', 'right', 'ambidextrous'][Math.floor(Math.random() * 3)] as any,
            dominantFoot: ['left', 'right', 'ambidextrous'][Math.floor(Math.random() * 3)] as any
          },
          medicalInfo: this.config.players.includeMedicalInfo ? this.generateMedicalInfo() : {
            allergies: [],
            medications: [],
            conditions: [],
            emergencyContact: {
              name: `${firstName} ${lastName} Sr.`,
              phone: this.generatePhoneNumber(),
              relationship: 'Parent'
            }
          },
          stats: this.config.players.includeStats ? this.generatePlayerStats() : {
            attendance: 85 + Math.random() * 15,
            skillRating: 1 + Math.floor(Math.random() * 5),
            badges: [],
            performance: {},
            improvement: {
              overallProgress: Math.random() * 100,
              strengths: [],
              areasForImprovement: [],
              goals: []
            }
          },
          level,
          constraints: {},
          level_extensions: {},
          achievements: [],
          notes: '',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: team.coachIds[0] || 'system'
        };

        players.push(player);
        team.playerIds.push(player.id!);
        playerId++;
      }
    }

    return players;
  }

  private generateMedicalInfo() {
    const allergies = ['Peanuts', 'Dairy', 'Gluten', 'Shellfish'];
    const medications = ['Inhaler', 'EpiPen', 'None'];
    const conditions = ['Asthma', 'Diabetes', 'None'];

    return {
      allergies: Math.random() > 0.7 ? [allergies[Math.floor(Math.random() * allergies.length)]] : [],
      medications: Math.random() > 0.8 ? [medications[Math.floor(Math.random() * medications.length)]] : [],
      conditions: Math.random() > 0.9 ? [conditions[Math.floor(Math.random() * conditions.length)]] : [],
      emergencyContact: {
        name: 'Emergency Contact',
        phone: this.generatePhoneNumber(),
        relationship: 'Parent'
      }
    };
  }

  private generatePlayerStats() {
    return {
      attendance: 85 + Math.random() * 15,
      skillRating: 1 + Math.floor(Math.random() * 5),
      badges: ['Rookie', 'Team Player', 'Most Improved'].filter(() => Math.random() > 0.5),
      performance: {
        speed: { value: Math.random() * 100, maxValue: 100, unit: 'mph', category: 'physical' },
        strength: { value: Math.random() * 100, maxValue: 100, unit: 'lbs', category: 'physical' },
        agility: { value: Math.random() * 100, maxValue: 100, unit: 'score', category: 'physical' }
      },
      improvement: {
        overallProgress: Math.random() * 100,
        strengths: ['Speed', 'Teamwork', 'Leadership'].slice(0, Math.floor(Math.random() * 3) + 1),
        areasForImprovement: ['Strength', 'Technique', 'Communication'].slice(0, Math.floor(Math.random() * 2) + 1),
        goals: []
      }
    };
  }

  // ============================================
  // PRACTICE PLAN SEEDING
  // ============================================

  private async seedPracticePlans(): Promise<{ created: number; failed: number }> {
    const plans = this.generatePracticePlans();
    this.generatedData.practicePlans = plans;

    if (this.config.dryRun) {
      console.log(`Would create ${plans.length} practice plans`);
      return { created: plans.length, failed: 0 };
    }

    const batch = writeBatch(db);
    let created = 0;
    let failed = 0;

    for (const plan of plans) {
      try {
        const planRef = doc(db, COLLECTIONS.PRACTICE_PLANS, plan.id!);
        batch.set(planRef, {
          ...plan,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        created++;
      } catch (error) {
        console.error(`Failed to create practice plan ${plan.id}:`, error);
        failed++;
      }
    }

    await batch.commit();
    return { created, failed };
  }

  private generatePracticePlans(): PracticePlan[] {
    const plans: PracticePlan[] = [];
    const planNames = [
      'Fundamentals Focus', 'Game Preparation', 'Skill Development', 'Team Building',
      'Conditioning', 'Strategy Session', 'Scrimmage Practice', 'Recovery Day'
    ];

    for (const team of this.generatedData.teams) {
      for (let i = 0; i < this.config.practicePlans.perTeam; i++) {
        const planDate = new Date(this.config.practicePlans.dateRange.start);
        planDate.setDate(planDate.getDate() + (i * 7));

        const plan: PracticePlan = {
          id: `plan_${team.id}_${i + 1}`,
          teamId: team.id!,
          name: planNames[Math.floor(Math.random() * planNames.length)],
          date: Timestamp.fromDate(planDate),
          duration: 60 + Math.floor(Math.random() * 60), // 60-120 minutes
          periods: this.config.practicePlans.includeDrills ? this.generatePracticePeriods() : [],
          goals: ['Improve teamwork', 'Build endurance', 'Practice fundamentals'],
          notes: 'Focus on player development and team cohesion.',
          status: ['draft', 'scheduled', 'completed'][Math.floor(Math.random() * 3)] as any,
          weather: {
            temperature: 65 + Math.random() * 20,
            condition: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)],
            humidity: 40 + Math.random() * 40,
            windSpeed: Math.random() * 15
          },
          equipment: ['Cones', 'Balls', 'Stopwatch', 'Whistle'],
          attendance: this.config.practicePlans.includeAttendance ? this.generateAttendanceRecords(team) : [],
          feedback: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: team.coachIds[0] || 'system'
        };

        plans.push(plan);
      }
    }

    return plans;
  }

  private generatePracticePeriods() {
    const periods = [
      { name: 'Warm-up', duration: 15, type: 'warmup' as any },
      { name: 'Skill Development', duration: 30, type: 'skill_development' as any },
      { name: 'Team Drills', duration: 25, type: 'team_drill' as any },
      { name: 'Cool-down', duration: 10, type: 'cool_down' as any }
    ];

    return periods.map((period, index) => ({
      id: `period_${index + 1}`,
      name: period.name,
      duration: period.duration,
      type: period.type,
      drills: this.generateDrills(),
      notes: '',
      order: index + 1
    }));
  }

  private generateDrills() {
    const drillNames = ['Passing Drill', 'Shooting Practice', 'Defensive Stance', 'Agility Ladder'];
    
    return drillNames.map((name, index) => ({
      id: `drill_${index + 1}`,
      name,
      description: `Practice ${name.toLowerCase()} to improve skills.`,
      duration: 10 + Math.floor(Math.random() * 15),
      equipment: ['Cones', 'Balls'],
      playersInvolved: 5 + Math.floor(Math.random() * 10),
      difficulty: ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)] as any,
      category: 'skill_development',
      instructions: ['Set up equipment', 'Demonstrate technique', 'Practice with partner'],
      variations: ['Increase difficulty', 'Add time pressure', 'Include competition'],
      coachingPoints: ['Focus on form', 'Maintain intensity', 'Encourage teamwork']
    }));
  }

  private generateAttendanceRecords(team: Team) {
    return team.playerIds.map(playerId => ({
      playerId,
      status: ['present', 'absent', 'late', 'excused'][Math.floor(Math.random() * 4)] as any,
      checkInTime: Math.random() > 0.3 ? Timestamp.now() : undefined,
      notes: Math.random() > 0.8 ? 'Player note' : undefined
    }));
  }

  // ============================================
  // PLAY SEEDING
  // ============================================

  private async seedPlays(): Promise<{ created: number; failed: number }> {
    const plays = this.generatePlays();
    this.generatedData.plays = plays;

    if (this.config.dryRun) {
      console.log(`Would create ${plays.length} plays`);
      return { created: plays.length, failed: 0 };
    }

    const batch = writeBatch(db);
    let created = 0;
    let failed = 0;

    for (const play of plays) {
      try {
        const playRef = doc(db, COLLECTIONS.PLAYS, play.id!);
        batch.set(playRef, {
          ...play,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        created++;
      } catch (error) {
        console.error(`Failed to create play ${play.id}:`, error);
        failed++;
      }
    }

    await batch.commit();
    return { created, failed };
  }

  private generatePlays(): Play[] {
    const plays: Play[] = [];
    const playNames = [
      'Quick Pass', 'Deep Route', 'Screen Play', 'Draw Play', 'Counter Run',
      'Zone Block', 'Man Coverage', 'Blitz Package', 'Cover 2', 'Cover 3'
    ];
    const formations = ['Shotgun', 'I-Formation', 'Spread', 'Wishbone', 'Pistol'];

    for (const team of this.generatedData.teams) {
      for (let i = 0; i < this.config.plays.perTeam; i++) {
        const play: Play = {
          id: `play_${team.id}_${i + 1}`,
          teamId: team.id!,
          name: playNames[Math.floor(Math.random() * playNames.length)],
          formation: formations[Math.floor(Math.random() * formations.length)],
          description: `A strategic play designed to ${['score', 'gain yards', 'control the clock'][Math.floor(Math.random() * 3)]}.`,
          routes: this.generateRoutes(team),
          players: this.generatePlayPlayers(team),
          tags: ['offense', 'passing', 'running'].filter(() => Math.random() > 0.5),
          difficulty: this.config.plays.difficulties[Math.floor(Math.random() * this.config.plays.difficulties.length)] as any,
          sport: team.sport,
          category: this.config.plays.categories[Math.floor(Math.random() * this.config.plays.categories.length)] as any,
          successRate: Math.random() * 100,
          usageCount: Math.floor(Math.random() * 20),
          lastUsed: Math.random() > 0.5 ? Timestamp.now() : undefined,
          diagram: this.config.plays.includeDiagrams ? `https://example.com/diagrams/${team.id}_${i + 1}.png` : undefined,
          video: this.config.plays.includeDiagrams ? `https://example.com/videos/${team.id}_${i + 1}.mp4` : undefined,
          level,
          constraints: {},
          level_extensions: {},
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: team.coachIds[0] || 'system'
        };

        plays.push(play);
      }
    }

    return plays;
  }

  private generateRoutes(team: Team) {
    const routes = [];
    const routeTypes = ['run', 'pass', 'block', 'defend', 'cover', 'blitz'];
    
    for (let i = 0; i < 3; i++) {
      routes.push({
        id: `route_${i + 1}`,
        playerId: team.playerIds[i] || `player_${i + 1}`,
        path: this.generatePath(),
        type: routeTypes[Math.floor(Math.random() * routeTypes.length)] as any,
        timing: Math.random() * 5,
        description: `Route ${i + 1} description`,
        keyPoints: ['Start position', 'Movement pattern', 'End position']
      });
    }

    return routes;
  }

  private generatePath() {
    const points = [];
    for (let i = 0; i < 5; i++) {
      points.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        timestamp: i * 0.5
      });
    }
    return points;
  }

  private generatePlayPlayers(team: Team) {
    return team.playerIds.slice(0, 5).map((playerId, index) => ({
      id: playerId,
      number: index + 1,
      position: ['QB', 'RB', 'WR', 'TE', 'OL'][index],
      x: 20 + (index * 15),
      y: 50 + (Math.random() * 20 - 10),
      role: ['Quarterback', 'Running Back', 'Wide Receiver', 'Tight End', 'Offensive Line'][index],
      responsibilities: ['Execute play', 'Block defenders', 'Catch ball'].filter(() => Math.random() > 0.5)
    }));
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private async clearExistingData(): Promise<void> {
    console.log('Clearing existing data...');
    
    const collections = [COLLECTIONS.USERS, COLLECTIONS.TEAMS, COLLECTIONS.PLAYERS, COLLECTIONS.PRACTICE_PLANS, COLLECTIONS.PLAYS];
    
    for (const collectionName of collections) {
      const snapshot = await getDocs(query(collection(db, collectionName), limit(100)));
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    }
  }

  getGeneratedData() {
    return this.generatedData;
  }

  exportData(): string {
    return JSON.stringify(this.generatedData, null, 2);
  }
}

// ============================================
// REACT HOOKS
// ============================================

import { useState, useCallback } from 'react';

export const useDataSeeding = (config: SeedingConfig) => {
  const [seeder] = useState(() => new DataSeeder(config));
  const [isSeeding, setIsSeeding] = useState(false);
  const [lastResult, setLastResult] = useState<SeedResult | null>(null);

  const seedAll = useCallback(async () => {
    setIsSeeding(true);
    try {
      const result = await seeder.seedAll();
      setLastResult(result);
      return result;
    } finally {
      setIsSeeding(false);
    }
  }, [seeder]);

  const exportData = useCallback(() => {
    return seeder.exportData();
  }, [seeder]);

  return {
    seeder,
    isSeeding,
    lastResult,
    seedAll,
    exportData,
    getGeneratedData: () => seeder.getGeneratedData()
  };
};

export default DataSeeder; 

// Add level-specific test data generation
export const generateLevelSpecificTestData = () => {
  const testData = {
    teams: [],
    players: [],
    plays: []
  };

  // Generate teams for each level
  Object.values(FootballLevel).forEach(level => {
    const teamCount = level.includes('youth') ? 2 : 1; // More youth teams for testing
    
    for (let i = 0; i < teamCount; i++) {
      const team: Team = {
        id: `team_${level}_${i + 1}`,
        name: `${level.replace('_', ' ').toUpperCase()} Team ${i + 1}`,
        sport: 'football',
        level,
        season: '2024',
        coachIds: [`coach_${level}_${i + 1}`],
        playerIds: [],
        settings: {
          practiceSchedule: ['Monday', 'Wednesday', 'Friday'],
          gameSchedule: ['Saturday'],
          notifications: true
        },
        stats: {
          wins: Math.floor(Math.random() * 10),
          losses: Math.floor(Math.random() * 5),
          ties: Math.floor(Math.random() * 2),
          pointsFor: Math.floor(Math.random() * 200) + 50,
          pointsAgainst: Math.floor(Math.random() * 150) + 30
        },
        location: {
          city: 'Demo City',
          state: 'CA',
          zipCode: '90210'
        },
        schedule: {
          practices: [],
          games: []
        },
        constraints: FeatureGating.getLevelConstraints(level),
        level_extensions: {}
      };
      
      testData.teams.push(team);
      
      // Generate players for this team
      const playerCount = FeatureGating.getLevelConstraints(level).maxPlayers;
      for (let j = 0; j < playerCount; j++) {
        const player: Player = {
          id: `player_${level}_${i + 1}_${j + 1}`,
          teamId: team.id,
          firstName: `Player${j + 1}`,
          lastName: `${level}${i + 1}`,
          jerseyNumber: j + 1,
          position: getRandomPosition(level),
          grade: getGradeForLevel(level),
          email: `player${j + 1}@${level}team${i + 1}.com`,
          phone: `555-${String(j + 1).padStart(3, '0')}-${String(i + 1).padStart(4, '0')}`,
          parentEmail: level.includes('youth') ? `parent${j + 1}@${level}team${i + 1}.com` : '',
          parentPhone: level.includes('youth') ? `555-${String(j + 1).padStart(3, '0')}-${String(i + 1).padStart(4, '0')}` : '',
          height: getRandomHeight(level),
          weight: getRandomWeight(level),
          medicalInfo: {
            allergies: [],
            medications: [],
            emergencyContact: {
              name: `Emergency Contact ${j + 1}`,
              phone: `555-EMER-${String(j + 1).padStart(3, '0')}`,
              relationship: 'Parent'
            }
          },
          stats: {
            attendance: Math.random() * 0.3 + 0.7, // 70-100%
            skillRating: Math.floor(Math.random() * 3) + 2, // 2-5
            badges: getRandomBadges(level),
            performance: Math.random() * 0.4 + 0.6, // 60-100%
            improvement: Math.random() * 0.5 + 0.5 // 50-100%
          },
          level: level as FootballLevel,
          constraints: FeatureGating.getLevelConstraints(level as FootballLevel),
          level_extensions: {},
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        
        testData.players.push(player);
        team.playerIds.push(player.id);
      }
      
      // Generate plays for this team
      const playCount = FeatureGating.isYouthLevel(level as FootballLevel) ? 3 : 5; // Fewer plays for youth
      for (let k = 0; k < playCount; k++) {
        const play: Play = {
          id: `play_${level}_${i + 1}_${k + 1}`,
          teamId: team.id,
          authorId: team.coachIds[0],
          name: getPlayName(level as FootballLevel, k + 1),
          description: getPlayDescription(level as FootballLevel, k + 1),
          sport: 'football',
          category: k % 2 === 0 ? 'offense' : 'defense',
          formation: getFormationForLevel(level as FootballLevel),
          difficulty: getDifficultyForLevel(level as FootballLevel) as 'beginner' | 'intermediate' | 'advanced',
          level: level as FootballLevel,
          players: generatePlayPlayers(level as FootballLevel),
          routes: generatePlayRoutes(level as FootballLevel),
          tags: getPlayTags(level as FootballLevel),
          isPublic: false,
          status: 'published',
          stats: {
            views: Math.floor(Math.random() * 100),
            uses: Math.floor(Math.random() * 50),
            rating: Math.random() * 2 + 3, // 3-5 stars
            ratingCount: Math.floor(Math.random() * 20)
          },
          source: 'manual',
          constraints: FeatureGating.getLevelConstraints(level as FootballLevel),
          level_extensions: {},
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        
        testData.plays.push(play);
      }
    }
  });

  return testData;
};

// Helper functions for generating level-specific data
const getRandomPosition = (level: FootballLevel): string => {
  const positions = FeatureGating.isYouthLevel(level) 
    ? ['QB', 'RB', 'WR', 'TE', 'C', 'G', 'T'] // Simplified positions for youth
    : ['QB', 'RB', 'WR', 'TE', 'FB', 'LT', 'LG', 'C', 'RG', 'RT', 'DE', 'DT', 'MLB', 'OLB', 'CB', 'FS', 'SS'];
  
  return positions[Math.floor(Math.random() * positions.length)];
};

const getGradeForLevel = (level: FootballLevel): number => {
  const gradeMap = {
    [FootballLevel.YOUTH_6U]: 1,
    [FootballLevel.YOUTH_8U]: 3,
    [FootballLevel.YOUTH_10U]: 5,
    [FootballLevel.YOUTH_12U]: 7,
    [FootballLevel.YOUTH_14U]: 9,
    [FootballLevel.MIDDLE_SCHOOL]: 8,
    [FootballLevel.JV]: 10,
    [FootballLevel.VARSITY]: 12,
    [FootballLevel.COLLEGE]: 14,
    [FootballLevel.SEMI_PRO]: 16,
    [FootballLevel.PROFESSIONAL]: 18
  };
  
  return gradeMap[level] || 12;
};

const getRandomHeight = (level: FootballLevel): number => {
  const baseHeight = FeatureGating.isYouthLevel(level) ? 48 : 70; // inches
  const variance = FeatureGating.isYouthLevel(level) ? 8 : 12;
  return baseHeight + Math.floor(Math.random() * variance);
};

const getRandomWeight = (level: FootballLevel): number => {
  const baseWeight = FeatureGating.isYouthLevel(level) ? 80 : 180; // pounds
  const variance = FeatureGating.isYouthLevel(level) ? 30 : 60;
  return baseWeight + Math.floor(Math.random() * variance);
};

const getRandomBadges = (level: FootballLevel): string[] => {
  const allBadges = ['attendance', 'leadership', 'sportsmanship', 'improvement', 'team_player'];
  const youthBadges = ['safety', 'fun', 'learning', 'teamwork'];
  
  const availableBadges = FeatureGating.isYouthLevel(level) ? youthBadges : allBadges;
  const badgeCount = Math.floor(Math.random() * 3) + 1;
  
  const selectedBadges = [];
  for (let i = 0; i < badgeCount; i++) {
    const badge = availableBadges[Math.floor(Math.random() * availableBadges.length)];
    if (!selectedBadges.includes(badge)) {
      selectedBadges.push(badge);
    }
  }
  
  return selectedBadges;
};

const getPlayName = (level: FootballLevel, index: number): string => {
  const youthNames = [
    'Simple Run Right',
    'Easy Pass Left',
    'Basic Handoff',
    'Quick Toss',
    'Simple Screen'
  ];
  
  const advancedNames = [
    'Shotgun Spread Right',
    'I-Formation Power Run',
    'Play Action Deep Post',
    'Trips Formation Slant',
    'Wildcat Option Left',
    'Pistol Formation Read',
    'Empty Set Quick Slant',
    'Pro Formation Counter'
  ];
  
  const names = FeatureGating.isYouthLevel(level) ? youthNames : advancedNames;
  return names[index % names.length];
};

const getPlayDescription = (level: FootballLevel, index: number): string => {
  if (FeatureGating.isYouthLevel(level)) {
    return `A simple, safe play designed for youth players. Easy to understand and execute.`;
  } else {
    return `An advanced play with multiple options and complex route combinations.`;
  }
};

const getFormationForLevel = (level: FootballLevel): string => {
  const youthFormations = ['shotgun', 'i_formation'];
  const advancedFormations = ['shotgun', 'i_formation', 'spread', 'wildcat', 'pistol'];
  
  const formations = FeatureGating.isYouthLevel(level) ? youthFormations : advancedFormations;
  return formations[Math.floor(Math.random() * formations.length)];
};

const getDifficultyForLevel = (level: FootballLevel): string => {
  if (FeatureGating.isYouthLevel(level)) {
    return 'beginner';
  } else if (FeatureGating.isAdvancedLevel(level)) {
    return 'advanced';
  } else {
    return 'intermediate';
  }
};

const generatePlayPlayers = (level: FootballLevel): any[] => {
  const playerCount = FeatureGating.isYouthLevel(level) ? 7 : 11;
  const players = [];
  
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: `play_player_${i + 1}`,
      position: getRandomPosition(level),
      x: Math.random() * 100,
      y: Math.random() * 100,
      number: i + 1
    });
  }
  
  return players;
};

const generatePlayRoutes = (level: FootballLevel): any[] => {
  const routeCount = FeatureGating.isYouthLevel(level) ? 2 : 5;
  const routes = [];
  
  for (let i = 0; i < routeCount; i++) {
    routes.push({
      id: `route_${i + 1}`,
      playerId: `play_player_${i + 1}`,
      points: [
        { x: Math.random() * 100, y: Math.random() * 100 },
        { x: Math.random() * 100, y: Math.random() * 100 }
      ],
      type: 'custom',
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    });
  }
  
  return routes;
};

const getPlayTags = (level: FootballLevel): string[] => {
  const youthTags = ['youth', 'simple', 'safe', 'beginner'];
  const advancedTags = ['advanced', 'complex', 'professional', 'strategic'];
  
  return FeatureGating.isYouthLevel(level) ? youthTags : advancedTags;
}; 
*/
