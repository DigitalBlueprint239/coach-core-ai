import { waitlistService } from './waitlist-service';

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

export class EnhancedWaitlistService {
  private accessTokens = new Map<string, WaitlistEntryWithAccess>();

  async addToWaitlistWithAccess(data: EnhancedWaitlistData): Promise<{ waitlistId: string; accessToken: string }> {
    // Add to regular waitlist
    const waitlistId = await waitlistService.addToWaitlist(data.email, {
      name: data.name,
      role: data.role,
      immediateAccess: true,
      source: 'landing-page-enhanced',
      userAgent: navigator.userAgent,
    });

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
    localStorage.setItem('demo_access_token', accessToken);
    localStorage.setItem('demo_user_data', JSON.stringify({
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
      const storedToken = localStorage.getItem('demo_access_token');
      if (storedToken === token) {
        const userData = JSON.parse(localStorage.getItem('demo_user_data') || '{}');
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
      localStorage.removeItem('demo_access_token');
      localStorage.removeItem('demo_user_data');
      return null;
    }

    return entry;
  }

  async upgradeToFullAccount(
    accessToken: string,
    password: string
  ): Promise<{ user: any; profile: any }> {
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
    localStorage.removeItem('demo_access_token');
    localStorage.removeItem('demo_user_data');

    return { user, profile };
  }

  private generateAccessToken(): string {
    return 'demo_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private suggestTeamName(data: WaitlistEntryWithAccess): string {
    const rolePrefix = data.role === 'head-coach' ? 'Coach' : 'Team';
    const name = data.name.split(' ')[0]; // First name only
    return `${rolePrefix} ${name}'s Football Team`;
  }

  // Get current demo session data
  getCurrentDemoData(): { email: string; name: string; role: string } | null {
    const userData = localStorage.getItem('demo_user_data');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  }

  // Check if user has demo access
  hasDemoAccess(): boolean {
    const token = localStorage.getItem('demo_access_token');
    return !!token;
  }

  // Clear demo data
  clearDemoData(): void {
    localStorage.removeItem('demo_access_token');
    localStorage.removeItem('demo_user_data');
  }

  // Get remaining attempts (placeholder implementation)
  getRemainingAttempts(email: string): number {
    // This would typically check against a rate limiting service
    // For now, return a default value
    return 3;
  }
}

export const enhancedWaitlistService = new EnhancedWaitlistService();
