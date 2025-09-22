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
  signInWithPopup,
  Auth,
  UserCredential
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

// ============================================
// AUTH STATE CACHING
// ============================================

interface CachedAuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  timestamp: number;
  ttl: number;
}

class AuthCache {
  private cache: CachedAuthState | null = null;
  private readonly DEFAULT_TTL = 2 * 60 * 1000; // 2 minutes
  private profileCache = new Map<string, { profile: UserProfile; timestamp: number }>();
  private readonly PROFILE_TTL = 5 * 60 * 1000; // 5 minutes

  setAuthState(user: FirebaseUser | null, profile: UserProfile | null): void {
    this.cache = {
      user,
      profile,
      timestamp: Date.now(),
      ttl: this.DEFAULT_TTL,
    };
  }

  getAuthState(): { user: FirebaseUser | null; profile: UserProfile | null } | null {
    if (!this.cache) return null;

    const now = Date.now();
    if (now - this.cache.timestamp > this.cache.ttl) {
      this.cache = null;
      return null;
    }

    return {
      user: this.cache.user,
      profile: this.cache.profile,
    };
  }

  setProfile(uid: string, profile: UserProfile): void {
    this.profileCache.set(uid, {
      profile,
      timestamp: Date.now(),
    });
  }

  getProfile(uid: string): UserProfile | null {
    const cached = this.profileCache.get(uid);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.PROFILE_TTL) {
      this.profileCache.delete(uid);
      return null;
    }

    return cached.profile;
  }

  clear(): void {
    this.cache = null;
    this.profileCache.clear();
  }

  clearProfile(uid: string): void {
    this.profileCache.delete(uid);
  }
}

// ============================================
// OPTIMIZED AUTH SERVICE
// ============================================

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

class OptimizedAuthService {
  private authStateListeners: ((state: AuthState) => void)[] = [];
  private currentUser: FirebaseUser | null = null;
  private currentProfile: UserProfile | null = null;
  private isLoading = true;
  private error: string | null = null;
  private authCache = new AuthCache();
  private firestoreHelper = createFirestoreHelper('users');
  private authStateUnsubscribe: (() => void) | null = null;
  private profileListeners = new Map<string, () => void>();

  constructor() {
    this.initializeAuthStateListener();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  private initializeAuthStateListener(): void {
    this.authStateUnsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        console.log('🔄 Auth state changed:', user?.uid || 'signed out');
        
        this.currentUser = user;
        this.isLoading = false;

        if (user) {
          try {
            // Check cache first
            const cachedProfile = this.authCache.getProfile(user.uid);
            if (cachedProfile) {
              console.log('📦 Using cached profile for user:', user.uid);
              this.currentProfile = cachedProfile;
            } else {
              // Load profile from Firestore
              this.currentProfile = await this.loadUserProfile(user.uid);
              if (this.currentProfile) {
                this.authCache.setProfile(user.uid, this.currentProfile);
              }
            }

            // Set up real-time profile listener
            this.setupProfileListener(user.uid);

            // Update analytics and monitoring
            setSentryUser(user);
            setUserContext(user, this.currentProfile);
            trackUserAction('auth_state_change', { 
              userId: user.uid, 
              email: user.email,
              hasProfile: !!this.currentProfile 
            });
          } catch (error) {
            console.error('❌ Error loading user profile:', error);
            this.error = 'Failed to load user profile';
            this.currentProfile = null;
          }
        } else {
          this.currentProfile = null;
          this.authCache.clear();
          clearUserContext();
        }

        // Update cache
        this.authCache.setAuthState(this.currentUser, this.currentProfile);

        // Notify listeners
        this.notifyAuthStateListeners();
      },
      (error) => {
        console.error('❌ Auth state listener error:', error);
        this.error = 'Authentication error';
        this.isLoading = false;
        this.notifyAuthStateListeners();
      }
    );
  }

  private setupProfileListener(uid: string): void {
    // Clean up existing listener
    const existingListener = this.profileListeners.get(uid);
    if (existingListener) {
      existingListener();
    }

    // Set up new listener
    const unsubscribe = this.firestoreHelper.subscribeToDocument(
      'users',
      uid,
      (profile: UserProfile | null) => {
        if (profile) {
          this.currentProfile = profile;
          this.authCache.setProfile(uid, profile);
          this.notifyAuthStateListeners();
        }
      }
    );

    this.profileListeners.set(uid, unsubscribe);
  }

  // ============================================
  // AUTH STATE MANAGEMENT
  // ============================================

  addAuthStateListener(listener: (state: AuthState) => void): () => void {
    this.authStateListeners.push(listener);

    // Immediately call with current state
    listener(this.getCurrentAuthState());

    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(listener);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  private notifyAuthStateListeners(): void {
    const authState = this.getCurrentAuthState();
    this.authStateListeners.forEach(listener => listener(authState));
  }

  getCurrentAuthState(): AuthState {
    return {
      user: this.currentUser,
      profile: this.currentProfile,
      isLoading: this.isLoading,
      error: this.error,
    };
  }

  // ============================================
  // USER PROFILE MANAGEMENT
  // ============================================

  private async loadUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      // Check cache first
      const cachedProfile = this.authCache.getProfile(uid);
      if (cachedProfile) {
        return cachedProfile;
      }

      // Load from Firestore
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const profile = { uid, ...userSnap.data() } as UserProfile;
        this.authCache.setProfile(uid, profile);
        return profile;
      }

      return null;
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      throw error;
    }
  }

  async createUserProfile(profile: UserProfile): Promise<void> {
    try {
      const { data: sanitizedProfile, isValid, warnings } = this.firestoreHelper.prepareCreate(
        profile,
        ['uid', 'email', 'displayName', 'createdAt', 'lastLoginAt', 'subscription', 'subscriptionStatus', 'role']
      );

      if (!isValid) {
        throw new Error('Invalid user profile data');
      }

      const userRef = doc(db, 'users', profile.uid);
      await setDoc(userRef, sanitizedProfile);
      
      this.firestoreHelper.logResult('create', true, profile.uid, warnings);
      
      // Update cache
      this.authCache.setProfile(profile.uid, profile);
      this.currentProfile = profile;
      this.notifyAuthStateListeners();
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const { data: sanitizedUpdates, isValid, warnings } = this.firestoreHelper.prepareUpdate(
        updates,
        ['uid'] // uid is required for updates
      );

      if (!isValid) {
        throw new Error('Invalid user profile update data');
      }

      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, sanitizedUpdates);
      
      this.firestoreHelper.logResult('update', true, uid, warnings);

      // Update cache
      if (this.currentProfile) {
        const updatedProfile = { ...this.currentProfile, ...sanitizedUpdates };
        this.authCache.setProfile(uid, updatedProfile);
        this.currentProfile = updatedProfile;
        this.notifyAuthStateListeners();
      }
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }

  // ============================================
  // AUTHENTICATION METHODS
  // ============================================

  async signUp(data: SignUpData): Promise<UserCredential> {
    try {
      this.isLoading = true;
      this.error = null;
      this.notifyAuthStateListeners();

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      const user = userCredential.user;

      // Update display name
      await updateProfile(user, {
        displayName: data.displayName,
      });

      // Create user profile
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: data.displayName,
        isEmailVerified: user.emailVerified,
        lastLoginAt: serverTimestamp(),
        subscription: 'free' as SubscriptionTier,
        subscriptionStatus: 'active',
        role: 'head-coach' as UserRole,
        permissions: [
          { resource: 'team', action: 'create' },
          { resource: 'team', action: 'read' },
          { resource: 'team', action: 'update' },
          { resource: 'team', action: 'delete' },
          { resource: 'play', action: 'create' },
          { resource: 'play', action: 'read' },
          { resource: 'play', action: 'update' },
          { resource: 'play', action: 'delete' },
          { resource: 'practice', action: 'create' },
          { resource: 'practice', action: 'read' },
          { resource: 'practice', action: 'update' },
          { resource: 'practice', action: 'delete' },
        ],
        teams: [],
        usage: {
          playsGeneratedThisMonth: 0,
          teamsCreated: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await this.createUserProfile(profile);

      // Create initial team
      await this.createInitialTeam(user.uid, data.teamName, data.sport, data.ageGroup);

      // Track analytics
      trackSignup(data.email, data.displayName);
      trackUserAction('user_signup', { 
        userId: user.uid, 
        email: data.email,
        sport: data.sport,
        teamName: data.teamName 
      });

      this.isLoading = false;
      this.notifyAuthStateListeners();

      return userCredential;
    } catch (error: any) {
      this.error = error.message;
      this.isLoading = false;
      this.notifyAuthStateListeners();
      
      trackError(error as Error, { action: 'signup', email: data.email });
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<UserCredential> {
    try {
      this.isLoading = true;
      this.error = null;
      this.notifyAuthStateListeners();

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update last login time
      await this.updateUserProfile(user.uid, {
        lastLoginAt: serverTimestamp(),
      });

      // Track analytics
      trackLogin(email);
      trackUserAction('user_login', { 
        userId: user.uid, 
        email: email 
      });

      this.isLoading = false;
      this.notifyAuthStateListeners();

      return userCredential;
    } catch (error: any) {
      this.error = error.message;
      this.isLoading = false;
      this.notifyAuthStateListeners();
      
      trackError(error as Error, { action: 'login', email });
      throw error;
    }
  }

  async signInWithGoogle(): Promise<UserCredential> {
    try {
      this.isLoading = true;
      this.error = null;
      this.notifyAuthStateListeners();

      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check if user profile exists
      const existingProfile = await this.loadUserProfile(user.uid);
      
      if (!existingProfile) {
        // Create profile for new Google user
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || '',
          isEmailVerified: user.emailVerified,
          lastLoginAt: serverTimestamp(),
          subscription: 'free' as SubscriptionTier,
          subscriptionStatus: 'active',
          role: 'head-coach' as UserRole,
          permissions: [
            { resource: 'team', action: 'create' },
            { resource: 'team', action: 'read' },
            { resource: 'team', action: 'update' },
            { resource: 'team', action: 'delete' },
            { resource: 'play', action: 'create' },
            { resource: 'play', action: 'read' },
            { resource: 'play', action: 'update' },
            { resource: 'play', action: 'delete' },
            { resource: 'practice', action: 'create' },
            { resource: 'practice', action: 'read' },
            { resource: 'practice', action: 'update' },
            { resource: 'practice', action: 'delete' },
          ],
          teams: [],
          usage: {
            playsGeneratedThisMonth: 0,
            teamsCreated: 0,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await this.createUserProfile(profile);
      } else {
        // Update last login time
        await this.updateUserProfile(user.uid, {
          lastLoginAt: serverTimestamp(),
        });
      }

      // Track analytics
      trackLogin(user.email!);
      trackUserAction('user_login_google', { 
        userId: user.uid, 
        email: user.email 
      });

      this.isLoading = false;
      this.notifyAuthStateListeners();

      return userCredential;
    } catch (error: any) {
      this.error = error.message;
      this.isLoading = false;
      this.notifyAuthStateListeners();
      
      trackError(error as Error, { action: 'google_login' });
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      this.isLoading = true;
      this.notifyAuthStateListeners();

      // Track analytics
      if (this.currentUser) {
        trackLogout(this.currentUser.email!);
        trackUserAction('user_logout', { 
          userId: this.currentUser.uid, 
          email: this.currentUser.email 
        });
      }

      // Clean up listeners
      this.profileListeners.forEach(unsubscribe => unsubscribe());
      this.profileListeners.clear();

      // Clear cache
      this.authCache.clear();

      await signOut(auth);
      
      this.isLoading = false;
      this.notifyAuthStateListeners();
    } catch (error: any) {
      this.error = error.message;
      this.isLoading = false;
      this.notifyAuthStateListeners();
      
      trackError(error as Error, { action: 'logout' });
      throw error;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
      trackUserAction('password_reset_requested', { email });
    } catch (error: any) {
      trackError(error as Error, { action: 'password_reset', email });
      throw error;
    }
  }

  async sendEmailVerification(): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user signed in');
    }

    try {
      await sendEmailVerification(this.currentUser);
      trackUserAction('email_verification_sent', { 
        userId: this.currentUser.uid,
        email: this.currentUser.email 
      });
    } catch (error: any) {
      trackError(error as Error, { action: 'email_verification' });
      throw error;
    }
  }

  // ============================================
  // TEAM MANAGEMENT
  // ============================================

  private async createInitialTeam(uid: string, teamName: string, sport: string, ageGroup: string): Promise<void> {
    try {
      const teamId = `team_${uid}_${Date.now()}`;
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

      const teamRef = doc(db, 'teams', teamId);
      await setDoc(teamRef, sanitizedTeam);
      
      this.firestoreHelper.logResult('create', true, teamId, warnings);

      // Update user profile with team
      await this.updateUserProfile(uid, {
        teams: [teamId],
        activeTeamId: teamId,
      });

      trackUserAction('initial_team_created', { 
        userId: uid,
        teamId: teamId,
        sport: sport,
        ageGroup: ageGroup 
      });
    } catch (error) {
      console.error('❌ Error creating initial team:', error);
      throw error;
    }
  }

  // ============================================
  // CLEANUP
  // ============================================

  cleanup(): void {
    if (this.authStateUnsubscribe) {
      this.authStateUnsubscribe();
      this.authStateUnsubscribe = null;
    }

    this.profileListeners.forEach(unsubscribe => unsubscribe());
    this.profileListeners.clear();
    this.authCache.clear();
    this.authStateListeners = [];
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

export const optimizedAuthService = new OptimizedAuthService();
export default optimizedAuthService;
