// Beta Testing Service for Coach Core AI
import { BetaUser } from '../../types/user';

class BetaService {
  private betaUsers: BetaUser[] = [];

  // Add a new beta user
  async addBetaUser(data: Omit<BetaUser, 'uid' | 'createdAt' | 'lastActive'>): Promise<string> {
    const newUser: BetaUser = {
      ...data,
      uid: `beta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      lastActive: new Date(),
    };
    
    this.betaUsers.push(newUser);
    
    // TODO: Implement actual database persistence
    console.log('Beta user added:', newUser);
    
    return newUser.uid;
  }

  // Update an existing beta user
  async updateBetaUser(uid: string, updates: Partial<BetaUser>): Promise<void> {
    const userIndex = this.betaUsers.findIndex(user => user.uid === uid);
    
    if (userIndex === -1) {
      throw new Error(`Beta user with uid ${uid} not found`);
    }
    
    this.betaUsers[userIndex] = {
      ...this.betaUsers[userIndex],
      ...updates,
      lastActive: new Date(),
    };
    
    // TODO: Implement actual database persistence
    console.log('Beta user updated:', this.betaUsers[userIndex]);
  }

  // Remove a beta user
  async removeBetaUser(uid: string): Promise<void> {
    const userIndex = this.betaUsers.findIndex(user => user.uid === uid);
    
    if (userIndex === -1) {
      throw new Error(`Beta user with uid ${uid} not found`);
    }
    
    this.betaUsers.splice(userIndex, 1);
    
    // TODO: Implement actual database persistence
    console.log('Beta user removed:', uid);
  }

  // Get all beta users
  async getBetaUsers(): Promise<BetaUser[]> {
    return [...this.betaUsers];
  }

  // Get a specific beta user
  async getBetaUser(uid: string): Promise<BetaUser | null> {
    return this.betaUsers.find(user => user.uid === uid) || null;
  }

  // Update user activity
  async updateUserActivity(uid: string): Promise<void> {
    const user = this.betaUsers.find(user => user.uid === uid);
    if (user) {
      user.lastActive = new Date();
    }
  }
}

export const betaService = new BetaService();
export default betaService;
