// cypress/factories/UserFactory.ts

export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'coach' | 'player' | 'admin';
  teamId?: string;
  verified: boolean;
  createdAt: Date;
}

export class UserFactory {
  private static counter = 1;

  static create(overrides: Partial<User> = {}): User {
    const id = `user_${this.counter++}`;

    return {
      id,
      email: `test${id}@coachcore.ai`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'coach',
      verified: true,
      createdAt: new Date(),
      ...overrides,
    };
  }

  static createCoach(overrides: Partial<User> = {}): User {
    return this.create({
      role: 'coach',
      ...overrides,
    });
  }

  static createPlayer(overrides: Partial<User> = {}): User {
    return this.create({
      role: 'player',
      ...overrides,
    });
  }

  static createUnverified(overrides: Partial<User> = {}): User {
    return this.create({
      verified: false,
      ...overrides,
    });
  }

  static createMultiple(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
