import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User as FirebaseUser,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase-config';
import { UserProfile, SubscriptionTier, UserRole, Permission } from '../../types/user';

export interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
  sport: string;
  teamName: string;
  ageGroup: string;
}

class AuthService {
  private authStateListeners: ((state: AuthState) => void)[] = [];
  private currentUser: FirebaseUser | null = null;
  private currentProfile: UserProfile | null = null;

  constructor() {
    // Set up auth state listener
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      if (user) {
        this.currentProfile = await this.getUserProfile(user.uid);
      } else {
        this.currentProfile = null;
      }
      
      this.notifyListeners({
        user: this.currentUser,
        profile: this.currentProfile,
        isLoading: false,
        error: null
      });
    });
  }

  // Enhanced signup with profile creation
  async signUp(data: SignUpData): Promise<{ user: FirebaseUser; profile: UserProfile }> {
    try {
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        data.email, 
        data.password
      );
      
      const user = userCredential.user;
      
      // Update display name
      await updateProfile(user, { displayName: data.displayName });
      
      // Send email verification
      await sendEmailVerification(user);
      
      // Create user profile in Firestore
      const profile: UserProfile = {
        uid: user.uid,
        email: data.email,
        displayName: data.displayName,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        isEmailVerified: false,
        subscription: 'free',
        subscriptionStatus: 'active',
        usage: {
          playsGeneratedThisMonth: 0,
          teamsCreated: 0,
        },
        preferences: {
          sport: data.sport as any,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          notifications: {
            email: true,
            push: false,
            sms: false,
            marketing: false,
            updates: true,
            reminders: true,
          },
          theme: 'auto',
        },
        teams: [],
        role: 'coach',
        permissions: this.getDefaultPermissions('coach'),
      };
      
      await this.createUserProfile(profile);
      
      // Create initial team
      if (data.teamName) {
        const teamId = await this.createInitialTeam(user.uid, data.teamName, data.sport, data.ageGroup);
        profile.teams = [teamId];
        profile.activeTeamId = teamId;
        await this.updateUserProfile(user.uid, profile);
      }
      
      return { user, profile };
    } catch (error: any) {
      throw new Error(`Signup failed: ${error.message}`);
    }
  }

  // Enhanced signin with profile loading
  async signIn(email: string, password: string): Promise<{ user: FirebaseUser; profile: UserProfile }> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Load user profile
      const profile = await this.getUserProfile(user.uid);
      if (!profile) {
        throw new Error('User profile not found');
      }
      
      // Update last login
      await this.updateLastLogin(user.uid);
      
      return { user, profile };
    } catch (error: any) {
      throw new Error(`Signin failed: ${error.message}`);
    }
  }

  // Google OAuth signin
  async signInWithGoogle(): Promise<{ user: FirebaseUser; profile: UserProfile }> {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // Check if profile exists, create if not
      let profile = await this.getUserProfile(user.uid);
      if (!profile) {
        profile = await this.createGoogleUserProfile(user);
      }
      
      // Update last login
      await this.updateLastLogin(user.uid);
      
      return { user, profile };
    } catch (error: any) {
      throw new Error(`Google signin failed: ${error.message}`);
    }
  }

  // Password reset
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
  }

  // Get current user profile
  async getCurrentProfile(): Promise<UserProfile | null> {
    if (!this.currentUser) return null;
    return this.getUserProfile(this.currentUser.uid);
  }

  // Update user profile
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      
      // Update local profile if it's the current user
      if (this.currentUser?.uid === uid && this.currentProfile) {
        this.currentProfile = { ...this.currentProfile, ...updates };
        this.notifyListeners({
          user: this.currentUser,
          profile: this.currentProfile,
          isLoading: false,
          error: null
        });
      }
    } catch (error: any) {
      throw new Error(`Profile update failed: ${error.message}`);
    }
  }

  // Check if user can perform action
  async canPerformAction(action: string, resource?: string): Promise<boolean> {
    if (!this.currentProfile) return false;
    
    // Admin can do everything
    if (this.currentProfile.role === 'admin') return true;
    
    // Check specific permissions
    const permission = this.currentProfile.permissions.find(
      p => p.resource === (resource || 'general') && p.action === action
    );
    
    return !!permission;
  }

  // Check subscription limits
  async checkSubscriptionLimit(feature: keyof UserProfile['usage']): Promise<boolean> {
    if (!this.currentProfile) return false;
    
    const plan = this.getSubscriptionPlan(this.currentProfile.subscription);
    const currentUsage = this.currentProfile.usage[feature];
    
    switch (feature) {
      case 'playsGeneratedThisMonth':
        return (currentUsage || 0) < plan.limits.maxPlaysPerMonth;
      case 'teamsCreated':
        return (currentUsage || 0) < plan.limits.maxTeams;
      default:
        return true;
    }
  }

  // Add auth state listener
  addAuthStateListener(listener: (state: AuthState) => void): () => void {
    this.authStateListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(listener);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private notifyListeners(state: AuthState): void {
    this.authStateListeners.forEach(listener => listener(state));
  }

  // Private helper methods
  private async createUserProfile(profile: UserProfile): Promise<void> {
    const userRef = doc(db, 'users', profile.uid);
    await setDoc(userRef, {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  private async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  private async createGoogleUserProfile(user: FirebaseUser): Promise<UserProfile> {
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || 'Coach',
      photoURL: user.photoURL || undefined,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      isEmailVerified: user.emailVerified,
      subscription: 'free',
      subscriptionStatus: 'active',
      usage: {
        playsGeneratedThisMonth: 0,
        teamsCreated: 0,
      },
      preferences: {
        sport: 'football',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notifications: {
          email: true,
          push: false,
          sms: false,
          marketing: false,
          updates: true,
          reminders: true,
        },
        theme: 'auto',
      },
      teams: [],
      role: 'coach',
      permissions: this.getDefaultPermissions('coach'),
    };
    
    await this.createUserProfile(profile);
    return profile;
  }

  private async updateLastLogin(uid: string): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
    });
  }

  private async createInitialTeam(uid: string, teamName: string, sport: string, ageGroup: string): Promise<string> {
    // This would create a team document and return the team ID
    // Implementation depends on your team service
    return `team_${Date.now()}`;
  }

  private getDefaultPermissions(role: UserRole): Permission[] {
    const basePermissions: Permission[] = [
      { resource: 'profile', action: 'read' },
      { resource: 'profile', action: 'write' },
    ];

    switch (role) {
      case 'admin':
        return [
          ...basePermissions,
          { resource: 'general', action: 'admin' },
        ];
      case 'coach':
        return [
          ...basePermissions,
          { resource: 'teams', action: 'read' },
          { resource: 'teams', action: 'write' },
          { resource: 'plays', action: 'read' },
          { resource: 'plays', action: 'write' },
        ];
      default:
        return basePermissions;
    }
  }

  private getSubscriptionPlan(tier: SubscriptionTier) {
    // This would return the subscription plan details
    // Implementation depends on your subscription service
    return {
      limits: {
        maxPlaysPerMonth: tier === 'free' ? 5 : tier === 'premium' ? 1000 : 10000,
        maxTeams: tier === 'free' ? 1 : tier === 'premium' ? 5 : 20,
      }
    };
  }
}

export const authService = new AuthService();
