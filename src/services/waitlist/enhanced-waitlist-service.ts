/* eslint-env browser */
/* eslint-disable no-console */
import { simpleWaitlistService } from './simple-waitlist-service';

export interface EnhancedWaitlistData {
  email: string;
  name: string;
  role: 'head-coach' | 'assistant-coach' | 'parent' | 'player';
  immediateAccess: boolean;
}

export interface WaitlistEntryWithAccess {
  id: string;
  email: string;
  name: string;
  role: string;
  accessToken: string;
  expiresAt: Date;
  createdAt: Date;
}

// Storage utility to handle localStorage safely
class StorageUtil {
  static setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  static getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
    }
    return null;
  }

  static removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }
}

export class EnhancedWaitlistService {
  private accessTokens = new Map<string, WaitlistEntryWithAccess>();

  async addToWaitlistWithAccess(data: EnhancedWaitlistData): Promise<{ waitlistId: string; accessToken: string }> {
    // Add to regular waitlist
    const waitlistId = await simpleWaitlistService.addToWaitlist(
      data.email,
      'landing-page-enhanced',
      {
        name: data.name,
        role: data.role,
        immediateAccess: data.immediateAccess,
      }
    );

    // Generate temporary access token (24 hours)
    const accessToken = this.generateAccessToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store access token
    const entry: WaitlistEntryWithAccess = {
      id: waitlistId,
      email: data.email,
      name: data.name,
      role: data.role,
      accessToken,
      expiresAt,
      createdAt: new Date(),
    };

    this.accessTokens.set(accessToken, entry);
    
    // Store in localStorage for persistence
    StorageUtil.setItem('demo_access_token', accessToken);
    StorageUtil.setItem('demo_user_data', JSON.stringify({
      email: data.email,
      name: data.name,
      role: data.role,
    }));

    return { waitlistId, accessToken };
  }

  async validateAccessToken(token: string): Promise<WaitlistEntryWithAccess | null> {
    const entry = this.accessTokens.get(token);
    
    if (!entry) {
      // Try to load from localStorage
      const storedToken = StorageUtil.getItem('demo_access_token');
      if (storedToken === token) {
        const userData = JSON.parse(StorageUtil.getItem('demo_user_data') || '{}');
        return {
          id: 'local',
          email: userData.email,
          name: userData.name,
          role: userData.role,
          accessToken: token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        };
      }
      return null;
    }

    // Check if token is expired
    if (entry.expiresAt < new Date()) {
      this.accessTokens.delete(token);
      StorageUtil.removeItem('demo_access_token');
      StorageUtil.removeItem('demo_user_data');
      return null;
    }

    return entry;
  }

  async upgradeToFullAccount(
    accessToken: string,
    password: string
  ): Promise<{ user: unknown; profile: unknown }> {
    // Validate token
    const waitlistData = await this.validateAccessToken(accessToken);
    if (!waitlistData) {
      throw new Error('Invalid or expired access token');
    }

    // Import auth service dynamically to avoid circular dependencies
    const { authService } = await import('../firebase/auth-service');
    
    // Create full account with pre-filled data
    const { user, profile } = await authService.signUp({
      email: waitlistData.email,
      password,
      displayName: waitlistData.name,
      teamName: this.suggestTeamName(waitlistData),
      sport: 'football', // Default sport
      ageGroup: 'youth', // Default age group
    });

    // Clean up demo data
    this.accessTokens.delete(accessToken);
    StorageUtil.removeItem('demo_access_token');
    StorageUtil.removeItem('demo_user_data');

    return { user, profile };
  }

  private generateAccessToken(): string {
    return `demo_${Date.now().toString(36)}${Math.random().toString(36).substr(2)}`;
  }

  private suggestTeamName(data: WaitlistEntryWithAccess): string {
    const rolePrefix = data.role === 'head-coach' ? 'Coach' : 'Team';
    const name = data.name.split(' ')[0]; // First name only
    return `${rolePrefix} ${name}&apos;s Football Team`;
  }

  // Get current demo session data
  getCurrentDemoData(): { email: string; name: string; role: string } | null {
    const userData = StorageUtil.getItem('demo_user_data');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  }

  // Check if user has demo access
  hasDemoAccess(): boolean {
    const token = StorageUtil.getItem('demo_access_token');
    return !!token;
  }

  // Clear demo data
  clearDemoData(): void {
    StorageUtil.removeItem('demo_access_token');
    StorageUtil.removeItem('demo_user_data');
  }

  // Get remaining attempts (placeholder implementation)
  getRemainingAttempts(_email: string): number {
    // This would typically check against a rate limiting service
    // For now, return a default value
    return 3;
  }
}

export const enhancedWaitlistService = new EnhancedWaitlistService();
