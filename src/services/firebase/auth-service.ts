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
import { trackUserAction, setSentryUser, trackError } from '../monitoring';
import { 
  trackLogin, 
  trackLogout, 
  trackSignup, 
  setUserContext, 
  clearUserContext 
} from '../analytics';
import { createFirestoreHelper } from '../../utils/firestore-sanitization';

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
  private firestoreHelper = createFirestoreHelper('users');

  constructor() {
    // Set up auth state listener
    onAuthStateChanged(auth, async (user) => {
      // eslint-disable-next-line no-console
      console.log('Auth state changed:', user ? `User ${user.uid} (${user.email})` : 'No user');
      this.currentUser = user;
      if (user) {
        // eslint-disable-next-line no-console
        console.log('Loading user profile for:', user.uid);
        this.currentProfile = await this.getUserProfile(user.uid);
        // eslint-disable-next-line no-console
        console.log('User profile loaded:', this.currentProfile ? 'Success' : 'Failed');
      } else {
        this.currentProfile = null;
      }
      
      const authState = {
        user: this.currentUser,
        profile: this.currentProfile,
        isLoading: false,
        error: null
      };
      
      // eslint-disable-next-line no-console
      console.log('Notifying auth state listeners:', authState);
      this.notifyListeners(authState);
    });
  }

  // Enhanced signup with profile creation
  async signUp(data: SignUpData): Promise<{ user: FirebaseUser; profile: UserProfile }> {
    try {
      // Track user action
      trackUserAction('signup_attempt', { 
        email: data.email, 
        sport: data.sport, 
        teamName: data.teamName 
      });

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
      
      // Track successful signup
      trackUserAction('signup_success', { 
        userId: user.uid, 
        email: data.email,
        teamId: profile.activeTeamId 
      });

      // Set user context in Sentry
      setSentryUser({
        id: user.uid,
        email: user.email || '',
        teamId: profile.activeTeamId
      });
      
      // Track analytics events
      trackSignup('email', user.uid, profile.activeTeamId);
      setUserContext(user.uid, data.email, profile.activeTeamId, 'coach');

      return { user, profile };
    } catch (error: any) {
      // Track signup error
      trackUserAction('signup_error', { 
        email: data.email, 
        error: error.message 
      });
      trackError(error as Error, { action: 'signup', email: data.email });
      throw new Error(`Signup failed: ${error.message}`);
    }
  }

  // Enhanced signin with profile loading
  async signIn(email: string, password: string): Promise<{ user: FirebaseUser; profile: UserProfile }> {
    try {
      // Track login attempt
      trackUserAction('login_attempt', { email });

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Load user profile
      const profile = await this.getUserProfile(user.uid);
      if (!profile) {
        throw new Error('User profile not found');
      }
      
      // Update last login
      await this.updateLastLogin(user.uid);

      // Track successful login
      trackUserAction('login_success', { 
        userId: user.uid, 
        email: user.email,
        teamId: profile.activeTeamId 
      });

      // Set user context in Sentry
      setSentryUser({
        id: user.uid,
        email: user.email || '',
        teamId: profile.activeTeamId
      });
      
      // Track analytics events
      trackLogin('email', user.uid);
      setUserContext(user.uid, user.email || '', profile.activeTeamId, 'coach');
      
      return { user, profile };
    } catch (error: any) {
      // Track login error
      trackUserAction('login_error', { 
        email, 
        error: error.message 
      });
      trackError(error as Error, { action: 'login', email });
      throw new Error(`Signin failed: ${error.message}`);
    }
  }

  // Google OAuth signin
  async signInWithGoogle(): Promise<{ user: FirebaseUser; profile: UserProfile }> {
    try {
      // eslint-disable-next-line no-console
      console.log('Starting Google sign-in process...');
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // eslint-disable-next-line no-console
      console.log('Google sign-in successful, user:', user.uid, user.email);
      
      // Check if profile exists, create if not
      let profile = await this.getUserProfile(user.uid);
      // eslint-disable-next-line no-console
      console.log('Existing profile found:', !!profile);
      
      if (!profile) {
        // eslint-disable-next-line no-console
        console.log('Creating new Google user profile...');
        profile = await this.createGoogleUserProfile(user);
        // eslint-disable-next-line no-console
        console.log('Google user profile created:', profile.uid, profile.activeTeamId);
      }
      
      // Update last login
      await this.updateLastLogin(user.uid);
      
      // Track analytics events
      trackLogin('google', user.uid);
      setUserContext(user.uid, user.email || '', profile.activeTeamId, 'coach');
      
      // eslint-disable-next-line no-console
      console.log('Google sign-in process completed successfully');
      return { user, profile };
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Google sign-in error:', error);
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
      const userId = this.currentUser?.uid;
      await signOut(auth);
      
      // Track analytics events
      trackLogout(userId);
      clearUserContext();
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
      
      // Sanitize update data for Firestore write
      const { data: sanitizedUpdates, isValid, warnings } = this.firestoreHelper.prepareUpdate(
        updates,
        ['uid'] // uid is required for updates
      );

      if (!isValid) {
        throw new Error('Invalid user profile update data');
      }

      await updateDoc(userRef, sanitizedUpdates);
      
      // Log result
      this.firestoreHelper.logResult('update', true, uid, warnings);
      
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
      this.firestoreHelper.logResult('update', false, uid, [error.message]);
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
        return Number(currentUsage || 0) < plan.limits.maxPlaysPerMonth;
      case 'teamsCreated':
        return Number(currentUsage || 0) < plan.limits.maxTeams;
      default:
        return true;
    }
  }

  // Add auth state listener
  addAuthStateListener(listener: (state: AuthState) => void): () => void {
    this.authStateListeners.push(listener);
    
    // Immediately notify with current state
    listener({
      user: this.currentUser,
      profile: this.currentProfile,
      isLoading: this.currentUser === null, // null means still checking
      error: null
    });
    
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
    
    // Sanitize profile data for Firestore write
    const { data: sanitizedProfile, isValid, warnings } = this.firestoreHelper.prepareCreate(
      profile,
      ['uid', 'email', 'displayName', 'createdAt', 'lastLoginAt', 'subscription', 'subscriptionStatus', 'role']
    );

    if (!isValid) {
      throw new Error('Invalid user profile data');
    }

    await setDoc(userRef, sanitizedProfile);
    
    // Log result
    this.firestoreHelper.logResult('create', true, profile.uid, warnings);
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
    // Create a default team for Google users
    const teamId = await this.createInitialTeam(user.uid, `${user.displayName || 'Coach'}'s Team`, 'football', 'adult');
    
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
        teamsCreated: 1,
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
      teams: [teamId],
      activeTeamId: teamId,
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
    try {
      const teamRef = doc(db, 'teams');
      const teamId = teamRef.id;
      
      const teamData = {
        id: teamId,
        name: teamName,
        sport: sport,
        ageGroup: ageGroup,
        headCoachId: uid,
        assistantCoachIds: [],
        players: [],
        settings: {
          season: new Date().getFullYear().toString(),
          league: 'Local League',
          division: 'Open'
        }
      };

      // Sanitize team data for Firestore write
      const { data: sanitizedTeam, isValid, warnings } = this.firestoreHelper.prepareCreate(
        teamData,
        ['id', 'name', 'sport', 'ageGroup', 'headCoachId']
      );

      if (!isValid) {
        throw new Error('Invalid team data');
      }

      await setDoc(teamRef, sanitizedTeam);
      
      // Log result
      this.firestoreHelper.logResult('create', true, teamId, warnings);
      
      return teamId;
    } catch (error) {
      console.error('Error creating initial team:', error);
      this.firestoreHelper.logResult('create', false, 'unknown', [error instanceof Error ? error.message : 'Unknown error']);
      // Return a fallback team ID if creation fails
      return `team_${Date.now()}`;
    }
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
