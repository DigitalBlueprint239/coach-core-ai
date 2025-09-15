export interface DemoSession {
  id: string;
  accessToken: string;
  data: {
    plays: any[];
    practices: any[];
    team: any;
    preferences: {
      role: string;
      sport: string;
      ageGroup: string;
    };
  };
  expiresAt: Date;
}

export interface DemoData {
  plays?: any[];
  practices?: any[];
  team?: any;
  preferences?: any;
}

export class DemoService {
  private storageKey = 'demo_session';
  private session: DemoSession | null = null;

  async createDemoSession(accessToken: string, userData: any): Promise<DemoSession> {
    const session: DemoSession = {
      id: this.generateId(),
      accessToken,
      data: {
        plays: [],
        practices: [],
        team: null,
        preferences: {
          role: userData.role || 'head-coach',
          sport: 'football',
          ageGroup: 'youth'
        }
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
    
    this.session = session;
    localStorage.setItem(this.storageKey, JSON.stringify(session));
    return session;
  }

  getCurrentSession(): DemoSession | null {
    if (this.session) {
      return this.session;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const session = JSON.parse(stored);
        // Check if session is expired
        if (new Date(session.expiresAt) > new Date()) {
          this.session = session;
          return session;
        } else {
          this.clearSession();
        }
      }
    } catch (error) {
      console.error('Error loading demo session:', error);
      this.clearSession();
    }

    return null;
  }

  async saveDemoData(data: DemoData): Promise<void> {
    const session = this.getCurrentSession();
    if (session) {
      session.data = { ...session.data, ...data };
      this.session = session;
      localStorage.setItem(this.storageKey, JSON.stringify(session));
    }
  }

  async addPlay(play: any): Promise<void> {
    const session = this.getCurrentSession();
    if (session) {
      session.data.plays = [...(session.data.plays || []), play];
      await this.saveDemoData({ plays: session.data.plays });
    }
  }

  async addPractice(practice: any): Promise<void> {
    const session = this.getCurrentSession();
    if (session) {
      session.data.practices = [...(session.data.practices || []), practice];
      await this.saveDemoData({ practices: session.data.practices });
    }
  }

  async setTeam(team: any): Promise<void> {
    const session = this.getCurrentSession();
    if (session) {
      session.data.team = team;
      await this.saveDemoData({ team });
    }
  }

  async upgradeToAccount(userData: any): Promise<void> {
    const session = this.getCurrentSession();
    if (session) {
      // Transfer demo data to user account
      await this.transferToUserAccount(userData.uid, session.data);
      this.clearSession();
    }
  }

  private async transferToUserAccount(userId: string, demoData: any): Promise<void> {
    try {
      // Import services dynamically to avoid circular dependencies
      const { db } = await import('../firebase/firebase-config');
      const { collection, doc, setDoc } = await import('firebase/firestore');

      // Transfer plays
      if (demoData.plays && demoData.plays.length > 0) {
        for (const play of demoData.plays) {
          await setDoc(doc(db, 'users', userId, 'plays', play.id), {
            ...play,
            userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Transfer practices
      if (demoData.practices && demoData.practices.length > 0) {
        for (const practice of demoData.practices) {
          await setDoc(doc(db, 'users', userId, 'practices', practice.id), {
            ...practice,
            userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Transfer team data
      if (demoData.team) {
        await setDoc(doc(db, 'teams', demoData.team.id), {
          ...demoData.team,
          headCoachId: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      console.log('Demo data transferred successfully to user account');
    } catch (error) {
      console.error('Error transferring demo data:', error);
      throw error;
    }
  }

  clearSession(): void {
    this.session = null;
    localStorage.removeItem(this.storageKey);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Check if user is in demo mode
  isDemoMode(): boolean {
    return !!this.getCurrentSession();
  }

  // Get demo data for display
  getDemoData(): DemoData | null {
    const session = this.getCurrentSession();
    return session ? session.data : null;
  }
}

export const demoService = new DemoService();
