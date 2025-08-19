// cypress/factories/PlayFactory.ts

export interface Play {
  id: string;
  name: string;
  description: string;
  formation: string;
  teamId: string;
  createdBy: string;
  version: number;
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  positions: PlayerPosition[];
  routes: Route[];
  tags: string[];
}

export interface PlayerPosition {
  id: string;
  x: number;
  y: number;
  playerId?: string;
  role: string;
}

export interface Route {
  id: string;
  playerId: string;
  waypoints: { x: number; y: number }[];
  type: 'run' | 'pass' | 'block';
}

export class PlayFactory {
  private static counter = 1;

  static create(overrides: Partial<Play> = {}): Play {
    const id = `play_${this.counter++}`;
    
    return {
      id,
      name: `Test Play ${id}`,
      description: 'A test play for automated testing',
      formation: '4-3-4',
      teamId: `team_${id}`,
      createdBy: `coach_${id}`,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      positions: this.generateDefaultPositions(),
      routes: [],
      tags: ['test', 'automated'],
      ...overrides
    };
  }

  static createOffensive(overrides: Partial<Play> = {}): Play {
    return this.create({
      name: `Offensive Play ${this.counter}`,
      formation: '4-3-4',
      positions: this.generateOffensivePositions(),
      routes: this.generateOffensiveRoutes(),
      tags: ['offensive', 'test'],
      ...overrides
    });
  }

  static createDefensive(overrides: Partial<Play> = {}): Play {
    return this.create({
      name: `Defensive Play ${this.counter}`,
      formation: '4-4-2',
      positions: this.generateDefensivePositions(),
      routes: this.generateDefensiveRoutes(),
      tags: ['defensive', 'test'],
      ...overrides
    });
  }

  static createWithConflict(overrides: Partial<Play> = {}): Play {
    return this.create({
      version: 2,
      lastModifiedBy: 'conflict_user',
      lastModifiedAt: new Date(),
      ...overrides
    });
  }

  static createComplex(overrides: Partial<Play> = {}): Play {
    return this.create({
      name: `Complex Play ${this.counter}`,
      positions: this.generateComplexPositions(),
      routes: this.generateComplexRoutes(),
      tags: ['complex', 'advanced', 'test'],
      ...overrides
    });
  }

  private static generateDefaultPositions(): PlayerPosition[] {
    return [
      { id: 'pos_1', x: 50, y: 20, role: 'QB' },
      { id: 'pos_2', x: 30, y: 10, role: 'RB' },
      { id: 'pos_3', x: 70, y: 10, role: 'WR' },
      { id: 'pos_4', x: 20, y: 30, role: 'OL' },
      { id: 'pos_5', x: 80, y: 30, role: 'OL' }
    ];
  }

  private static generateOffensivePositions(): PlayerPosition[] {
    return [
      { id: 'pos_1', x: 50, y: 50, role: 'QB' },
      { id: 'pos_2', x: 40, y: 40, role: 'RB' },
      { id: 'pos_3', x: 60, y: 40, role: 'RB' },
      { id: 'pos_4', x: 20, y: 30, role: 'WR' },
      { id: 'pos_5', x: 80, y: 30, role: 'WR' },
      { id: 'pos_6', x: 30, y: 60, role: 'OL' },
      { id: 'pos_7', x: 50, y: 60, role: 'OL' },
      { id: 'pos_8', x: 70, y: 60, role: 'OL' }
    ];
  }

  private static generateDefensivePositions(): PlayerPosition[] {
    return [
      { id: 'pos_1', x: 50, y: 50, role: 'MLB' },
      { id: 'pos_2', x: 30, y: 40, role: 'OLB' },
      { id: 'pos_3', x: 70, y: 40, role: 'OLB' },
      { id: 'pos_4', x: 20, y: 30, role: 'CB' },
      { id: 'pos_5', x: 80, y: 30, role: 'CB' },
      { id: 'pos_6', x: 40, y: 60, role: 'DE' },
      { id: 'pos_7', x: 60, y: 60, role: 'DE' },
      { id: 'pos_8', x: 50, y: 70, role: 'DT' }
    ];
  }

  private static generateComplexPositions(): PlayerPosition[] {
    return [
      ...this.generateOffensivePositions(),
      ...this.generateDefensivePositions()
    ];
  }

  private static generateOffensiveRoutes(): Route[] {
    return [
      {
        id: 'route_1',
        playerId: 'pos_3',
        waypoints: [{ x: 60, y: 40 }, { x: 80, y: 20 }],
        type: 'run'
      },
      {
        id: 'route_2',
        playerId: 'pos_5',
        waypoints: [{ x: 80, y: 30 }, { x: 90, y: 10 }],
        type: 'run'
      }
    ];
  }

  private static generateDefensiveRoutes(): Route[] {
    return [
      {
        id: 'route_1',
        playerId: 'pos_1',
        waypoints: [{ x: 50, y: 50 }, { x: 50, y: 30 }],
        type: 'run'
      },
      {
        id: 'route_2',
        playerId: 'pos_2',
        waypoints: [{ x: 30, y: 40 }, { x: 40, y: 30 }],
        type: 'run'
      }
    ];
  }

  private static generateComplexRoutes(): Route[] {
    return [
      ...this.generateOffensiveRoutes(),
      ...this.generateDefensiveRoutes()
    ];
  }

  static createMultiple(count: number, overrides: Partial<Play> = {}): Play[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
} 