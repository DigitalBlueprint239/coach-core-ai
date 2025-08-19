// cypress/factories/PracticeFactory.ts

export interface Practice {
  id: string;
  name: string;
  date: string;
  duration: number; // minutes
  teamId: string;
  createdBy: string;
  drills: Drill[];
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  attendance: AttendanceRecord[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Drill {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  category: 'warmup' | 'skill' | 'tactical' | 'conditioning';
  equipment: string[];
  instructions: string[];
}

export interface AttendanceRecord {
  playerId: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  checkInTime?: Date;
  notes?: string;
}

export class PracticeFactory {
  private static counter = 1;

  static create(overrides: Partial<Practice> = {}): Practice {
    const id = `practice_${this.counter++}`;
    
    return {
      id,
      name: `Test Practice ${id}`,
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
      duration: 90,
      teamId: `team_${id}`,
      createdBy: `coach_${id}`,
      drills: this.generateDefaultDrills(),
      status: 'scheduled',
      attendance: [],
      notes: 'Test practice notes',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createWithDrills(drillCount: number, overrides: Partial<Practice> = {}): Practice {
    return this.create({
      drills: this.generateDrills(drillCount),
      ...overrides
    });
  }

  static createWithAttendance(playerCount: number, overrides: Partial<Practice> = {}): Practice {
    return this.create({
      attendance: this.generateAttendance(playerCount),
      ...overrides
    });
  }

  static createInProgress(overrides: Partial<Practice> = {}): Practice {
    return this.create({
      status: 'in-progress',
      date: new Date().toISOString().split('T')[0], // Today
      ...overrides
    });
  }

  static createCompleted(overrides: Partial<Practice> = {}): Practice {
    return this.create({
      status: 'completed',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
      ...overrides
    });
  }

  static createComplex(overrides: Partial<Practice> = {}): Practice {
    return this.create({
      name: `Complex Practice ${this.counter}`,
      duration: 120,
      drills: this.generateComplexDrills(),
      attendance: this.generateAttendance(15),
      notes: 'Complex practice with multiple drills and full attendance',
      ...overrides
    });
  }

  private static generateDefaultDrills(): Drill[] {
    return [
      {
        id: 'drill_1',
        name: 'Warm-up Stretches',
        description: 'Basic stretching routine',
        duration: 10,
        category: 'warmup',
        equipment: [],
        instructions: ['Start with neck stretches', 'Move to shoulder stretches', 'Finish with leg stretches']
      },
      {
        id: 'drill_2',
        name: 'Passing Practice',
        description: 'Quarterback and receiver passing drills',
        duration: 20,
        category: 'skill',
        equipment: ['footballs'],
        instructions: ['QB throws to stationary receivers', 'Add movement patterns', 'Practice different routes']
      }
    ];
  }

  private static generateDrills(count: number): Drill[] {
    const drillTypes = [
      {
        name: 'Warm-up Stretches',
        category: 'warmup' as const,
        duration: 10,
        equipment: []
      },
      {
        name: 'Passing Practice',
        category: 'skill' as const,
        duration: 20,
        equipment: ['footballs']
      },
      {
        name: 'Tackling Drills',
        category: 'skill' as const,
        duration: 25,
        equipment: ['tackling dummies']
      },
      {
        name: 'Route Running',
        category: 'skill' as const,
        duration: 15,
        equipment: ['cones']
      },
      {
        name: 'Conditioning',
        category: 'conditioning' as const,
        duration: 30,
        equipment: []
      }
    ];

    return Array.from({ length: count }, (_, i) => ({
      id: `drill_${i + 1}`,
      name: `${drillTypes[i % drillTypes.length].name} ${i + 1}`,
      description: `Drill ${i + 1} description`,
      duration: drillTypes[i % drillTypes.length].duration,
      category: drillTypes[i % drillTypes.length].category,
      equipment: drillTypes[i % drillTypes.length].equipment,
      instructions: [`Step 1 for drill ${i + 1}`, `Step 2 for drill ${i + 1}`, `Step 3 for drill ${i + 1}`]
    }));
  }

  private static generateComplexDrills(): Drill[] {
    return [
      {
        id: 'drill_1',
        name: 'Advanced Warm-up',
        description: 'Comprehensive warm-up routine',
        duration: 15,
        category: 'warmup',
        equipment: ['foam rollers', 'resistance bands'],
        instructions: ['Dynamic stretching', 'Mobility work', 'Activation exercises']
      },
      {
        id: 'drill_2',
        name: 'Complex Passing Tree',
        description: 'Advanced passing routes and timing',
        duration: 30,
        category: 'skill',
        equipment: ['footballs', 'cones', 'timing devices'],
        instructions: ['Set up route tree', 'Practice timing', 'Add defensive pressure']
      },
      {
        id: 'drill_3',
        name: 'Tactical Team Defense',
        description: 'Team defensive positioning and communication',
        duration: 25,
        category: 'tactical',
        equipment: ['whiteboard', 'cones'],
        instructions: ['Review defensive schemes', 'Practice communication', 'Live team drills']
      },
      {
        id: 'drill_4',
        name: 'High-Intensity Conditioning',
        description: 'Endurance and strength building',
        duration: 20,
        category: 'conditioning',
        equipment: ['weights', 'resistance bands'],
        instructions: ['Circuit training', 'Interval sprints', 'Strength exercises']
      }
    ];
  }

  private static generateAttendance(playerCount: number): AttendanceRecord[] {
    const statuses: AttendanceRecord['status'][] = ['present', 'absent', 'late', 'excused'];
    
    return Array.from({ length: playerCount }, (_, i) => ({
      playerId: `player_${i + 1}`,
      status: statuses[i % statuses.length],
      checkInTime: statuses[i % statuses.length] === 'present' ? new Date() : undefined,
      notes: statuses[i % statuses.length] === 'excused' ? 'Doctor appointment' : undefined
    }));
  }

  static createMultiple(count: number, overrides: Partial<Practice> = {}): Practice[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
} 