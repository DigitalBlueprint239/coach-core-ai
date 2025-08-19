// cypress/factories/TeamFactory.ts

export interface Team {
  id: string;
  name: string;
  sport: 'football' | 'basketball' | 'soccer' | 'baseball';
  level: 'youth' | 'high-school' | 'college' | 'professional';
  coachId: string;
  players: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class TeamFactory {
  private static counter = 1;

  static create(overrides: Partial<Team> = {}): Team {
    const id = `team_${this.counter++}`;
    
    return {
      id,
      name: `Test Team ${id}`,
      sport: 'football',
      level: 'high-school',
      coachId: `coach_${id}`,
      players: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createFootball(overrides: Partial<Team> = {}): Team {
    return this.create({
      sport: 'football',
      ...overrides
    });
  }

  static createBasketball(overrides: Partial<Team> = {}): Team {
    return this.create({
      sport: 'basketball',
      ...overrides
    });
  }

  static createYouth(overrides: Partial<Team> = {}): Team {
    return this.create({
      level: 'youth',
      ...overrides
    });
  }

  static createProfessional(overrides: Partial<Team> = {}): Team {
    return this.create({
      level: 'professional',
      ...overrides
    });
  }

  static createWithPlayers(playerCount: number, overrides: Partial<Team> = {}): Team {
    const players = Array.from({ length: playerCount }, (_, i) => `player_${i + 1}`);
    
    return this.create({
      players,
      ...overrides
    });
  }

  static createMultiple(count: number, overrides: Partial<Team> = {}): Team[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
} 