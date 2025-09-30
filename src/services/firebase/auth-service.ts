import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  sendEmailVerification as firebaseSendEmailVerification,
  updateProfile,
  User as FirebaseUser,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './firebase-config';
import {
  UserProfile,
  SubscriptionTier,
  UserRole,
  Permission,
  UserSubscription,
  SubscriptionTierName,
} from '../../types/user';
import { trackUserAction, setSentryUser, trackError } from '../monitoring/monitoring-lite';
import {
  trackLogin,
  trackLogout,
  trackSignup,
  setUserContext,
  clearUserContext,
} from '../analytics/analytics-events';
import { createFirestoreHelper } from '../../utils/firestore-sanitization';
import {
  appConfigService,
  getConfiguredRolePermissions,
  getConfiguredSubscriptionTier,
} from '../config/app-config-service';
import type { WaitlistEntry } from '../waitlist/waitlist-service';

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
  role?: UserRole;
}

type WaitlistStatusEntry = WaitlistEntry & {
  id?: string;
  status?: 'pending' | 'invited' | 'converted';
  converted?: boolean;
  convertedAt?: Date | null;
  convertedUserId?: string | null;
};

/**
 * Derives the default permission footprint for a given role. This is used during profile
 * creation and when reassigning roles to guarantee consistent access policies.
 *
 * TODO: Replace this hard-coded map with a Firestore or remote-config driven source so roles
 * can be managed without code deployments.
 */
export const getDefaultPermissionsForRole = (role: UserRole): Permission[] =>
  getConfiguredRolePermissions(role);

export class AuthService {
  private authStateListeners: ((state: AuthState) => void)[] = [];
  private currentUser: FirebaseUser | null = null;
  private currentProfile: UserProfile | null = null;
  private firestoreHelper = createFirestoreHelper('users');
  private waitlistHelper = createFirestoreHelper('waitlist');

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
  async signUp(data: SignUpData): Promise<{ user: FirebaseUser; profile: UserProfile }>;
  async signUp(
    email: string,
    password: string,
    displayName: string,
    teamName: string,
    sport: string,
    ageGroup: string,
    role?: UserRole
  ): Promise<{ user: FirebaseUser; profile: UserProfile }>;
  async signUp(
    emailOrData: string | SignUpData,
    password?: string,
    displayName?: string,
    teamName?: string,
    sport?: string,
    ageGroup?: string,
    role: UserRole = 'coach'
  ): Promise<{ user: FirebaseUser; profile: UserProfile }> {
    const data: SignUpData =
      typeof emailOrData === 'string'
        ? {
            email: emailOrData,
            password: password || '',
            displayName: displayName || this.deriveDisplayName(emailOrData),
            teamName: teamName || '',
            sport: sport || 'football',
            ageGroup: ageGroup || 'adult',
            role,
          }
        : {
            ...emailOrData,
            displayName: emailOrData.displayName || this.deriveDisplayName(emailOrData.email),
            teamName: emailOrData.teamName || '',
            sport: emailOrData.sport || 'football',
            ageGroup: emailOrData.ageGroup || 'adult',
            role: emailOrData.role ?? role,
          };

    if (!data.password) {
      throw new Error('Password is required for signup');
    }

    const userRole: UserRole = data.role ?? 'coach';

    try {
      await appConfigService.ensureLoaded();

      trackUserAction('signup_attempt', {
        email: data.email,
        sport: data.sport,
        teamName: data.teamName,
        role: userRole,
      });

      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (data.displayName) {
        await updateProfile(user, { displayName: data.displayName });
      }

      await firebaseSendEmailVerification(user);

      const profile = await this.createInitialUserProfile(user, data, userRole);

      await this.convertWaitlistUser(data.email).catch((conversionError) => {
        console.warn('Waitlist conversion failed during signup:', conversionError);
      });

      trackUserAction('signup_success', {
        userId: user.uid,
        email: data.email,
        teamId: profile.activeTeamId,
        role: userRole,
      });

      setSentryUser({
        id: user.uid,
        email: user.email || '',
        teamId: profile.activeTeamId,
      });

      trackSignup('email', user.uid, profile.activeTeamId);
      setUserContext(user.uid, data.email, profile.activeTeamId, userRole);

      this.currentUser = user;
      this.currentProfile = profile;
      this.notifyListeners({
        user,
        profile,
        isLoading: false,
        error: null,
      });

      return { user, profile };
    } catch (error: any) {
      trackUserAction('signup_error', {
        email: data.email,
        error: error.message,
        role: data.role ?? 'coach',
      });
      trackError(error as Error, { action: 'signup', email: data.email });
      throw new Error(`Signup failed: ${error.message}`);
    }
  }

  private deriveDisplayName(email: string): string {
    if (!email) return 'Coach';
    const localPart = email.split('@')[0] ?? 'Coach';
    const cleaned = localPart.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned ? cleaned.replace(/\b\w/g, char => char.toUpperCase()) : 'Coach';
  }

  private shouldCreateTeamForRole(role: UserRole): boolean {
    const coachingRoles: UserRole[] = ['coach', 'head-coach', 'assistant-coach', 'team-admin'];
    return coachingRoles.includes(role);
  }

  private normalizePreferredSport(sport: string): UserProfile['preferences']['sport'] {
    const supportedSports: UserProfile['preferences']['sport'][] = ['football', 'basketball', 'soccer', 'baseball'];
    return (supportedSports.includes(sport as any) ? sport : 'football') as UserProfile['preferences']['sport'];
  }

  private async createInitialUserProfile(
    user: FirebaseUser,
    data: SignUpData,
    role: UserRole
  ): Promise<UserProfile> {
    let teamId: string | undefined;

    if (this.shouldCreateTeamForRole(role) && data.teamName) {
      try {
        teamId = await this.createInitialTeam(user.uid, data.teamName, data.sport, data.ageGroup);
      } catch (teamError) {
        console.error('Error creating initial team:', teamError);
      }
    }

    const defaultTierConfig = getConfiguredSubscriptionTier('free');
    const defaultTier = (defaultTierConfig?.name ?? 'free') as SubscriptionTierName;
    const subscriptionInfo: UserSubscription = {
      stripeCustomerId: '',
      subscriptionStatus: 'trialing',
      currentTier: defaultTier,
      billing: {
        currency: defaultTierConfig?.pricing.currency ?? 'usd',
      },
      usage: {
        aiGenerations: 0,
        resetDate: new Date(),
        period: 'monthly',
      },
    };

    const profile: UserProfile = {
      uid: user.uid,
      email: data.email,
      displayName: data.displayName || this.deriveDisplayName(data.email),
      photoURL: user.photoURL || undefined,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      isEmailVerified: user.emailVerified ?? false,
      subscription: defaultTier,
      subscriptionStatus: 'trialing',
      stripeCustomerId: '',
      subscriptionInfo,
      usage: {
        playsGeneratedThisMonth: 0,
        teamsCreated: teamId ? 1 : 0,
      },
      preferences: {
        sport: this.normalizePreferredSport(data.sport),
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
      teams: teamId ? [teamId] : [],
      activeTeamId: teamId,
      role,
      permissions: getDefaultPermissionsForRole(role),
    };

    await this.createUserProfile(profile);

    return profile;
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
        teamId: profile.activeTeamId,
        role: profile.role,
      });

      // Set user context in Sentry
      setSentryUser({
        id: user.uid,
        email: user.email || '',
        teamId: profile.activeTeamId
      });
      
      // Track analytics events
      trackLogin('email', user.uid);
      setUserContext(user.uid, user.email || '', profile.activeTeamId, profile.role);

      this.currentUser = user;
      this.currentProfile = profile;
      this.notifyListeners({
        user,
        profile,
        isLoading: false,
        error: null,
      });
      
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

  async signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
    const { user } = await this.signIn(email, password);
    return user;
  }

  async signUpWithEmail(email: string, password: string, role: UserRole = 'coach'): Promise<FirebaseUser> {
    const displayName = this.deriveDisplayName(email);
    const defaultTeamName = this.shouldCreateTeamForRole(role) ? `${displayName}'s Team` : '';
    const { user } = await this.signUp(
      email,
      password,
      displayName,
      defaultTeamName,
      'football',
      'adult',
      role
    );
    return user;
  }

  // Google OAuth signin
  async signInWithGoogle(): Promise<{ user: FirebaseUser; profile: UserProfile }> {
    try {
      await appConfigService.ensureLoaded();
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

      if (user.email) {
        await this.convertWaitlistUser(user.email).catch((conversionError) => {
          console.warn('Waitlist conversion failed during Google sign-in:', conversionError);
        });
      }
      
      // Track analytics events
      trackLogin('google', user.uid);
      setUserContext(user.uid, user.email || '', profile.activeTeamId, profile.role);

      this.currentUser = user;
      this.currentProfile = profile;
      this.notifyListeners({
        user,
        profile,
        isLoading: false,
        error: null,
      });
      
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
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await firebaseSendPasswordResetEmail(auth, email);
      trackUserAction('password_reset_requested', { email });
    } catch (error: any) {
      trackUserAction('password_reset_failed', { email, error: error.message });
      trackError(error as Error, { action: 'password_reset', email });
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  async resetPassword(email: string): Promise<void> {
    await this.sendPasswordResetEmail(email);
  }

  async sendEmailVerification(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Cannot send verification email without an authenticated user');
    }

    try {
      await firebaseSendEmailVerification(user);
      trackUserAction('email_verification_sent', { userId: user.uid, email: user.email });
    } catch (error: any) {
      trackError(error as Error, { action: 'send_email_verification', userId: user.uid });
      throw new Error(`Email verification failed: ${error.message}`);
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
  async updateUserProfile(updates: Partial<UserProfile>): Promise<void>;
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void>;
  async updateUserProfile(
    uidOrUpdates: string | Partial<UserProfile>,
    updates?: Partial<UserProfile>
  ): Promise<void> {
    if (typeof uidOrUpdates === 'string') {
      await this.applyProfileUpdate(uidOrUpdates, updates ?? {});
      return;
    }

    if (!this.currentUser) {
      throw new Error('No authenticated user available for profile update');
    }

    await this.applyProfileUpdate(this.currentUser.uid, uidOrUpdates);
  }

  private async applyProfileUpdate(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);

      const { data: sanitizedUpdates, isValid, warnings } = this.firestoreHelper.prepareUpdate(
        updates,
        []
      );

      if (!isValid) {
        throw new Error('Invalid user profile update data');
      }

      await updateDoc(userRef, sanitizedUpdates);

      this.firestoreHelper.logResult('update', true, uid, warnings);

      if (this.currentUser?.uid === uid) {
        const existingProfile = this.currentProfile;
        if (existingProfile) {
          const mergedProfile: UserProfile = {
            ...existingProfile,
            ...updates,
            usage: updates.usage
              ? { ...existingProfile.usage, ...updates.usage }
              : existingProfile.usage,
            preferences: updates.preferences
              ? { ...existingProfile.preferences, ...updates.preferences }
              : existingProfile.preferences,
            permissions: updates.permissions ?? existingProfile.permissions,
          };

          this.currentProfile = mergedProfile;
          this.notifyListeners({
            user: this.currentUser,
            profile: mergedProfile,
            isLoading: false,
            error: null,
          });
        }
      }

      trackUserAction('profile_updated', { userId: uid, fields: Object.keys(updates) });
    } catch (error: any) {
      this.firestoreHelper.logResult('update', false, uid, [error.message]);
      trackError(error as Error, { action: 'profile_update', userId: uid });
      throw new Error(`Profile update failed: ${error.message}`);
    }
  }

  /**
   * Flag waitlist records as converted once an account is provisioned. The waitlist schema
   * expects the following mutation contract:
   * - `converted` boolean flag
   * - `convertedAt` timestamp (Firestore server timestamp)
   * - `convertedUserId` / `convertedBy` references to the created user
   * - `convertedRole` snapshot of the assigned application role
   */
  async convertWaitlistUser(email: string): Promise<void> {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    try {
      const waitlistQuery = query(collection(db, 'waitlist'), where('email', '==', normalizedEmail));
      const snapshot = await getDocs(waitlistQuery);

      if (snapshot.empty) {
        return;
      }

      await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const conversionPayload = {
            converted: true,
            convertedAt: serverTimestamp(),
            convertedUserId: this.currentUser?.uid ?? null,
            convertedBy: this.currentUser?.email ?? null,
            convertedRole: this.currentProfile?.role ?? null,
          };

          const { data: sanitizedUpdate, isValid, warnings } = this.waitlistHelper.prepareUpdate(
            conversionPayload,
            ['converted']
          );

          if (!isValid) {
            throw new Error('Invalid waitlist conversion payload');
          }

          await updateDoc(docSnap.ref, sanitizedUpdate);
          this.waitlistHelper.logResult('update', true, docSnap.id, warnings);
        })
      );

      trackUserAction('waitlist_user_converted', {
        email: normalizedEmail,
        userId: this.currentUser?.uid,
        role: this.currentProfile?.role,
      });
    } catch (error) {
      console.error('Failed to convert waitlist user:', error);
      trackError(error as Error, { action: 'waitlist_conversion', email: normalizedEmail });
      throw error instanceof Error ? error : new Error('Failed to convert waitlist user');
    }
  }

  async checkWaitlistStatus(email: string): Promise<WaitlistStatusEntry | null> {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return null;
    }

    try {
      const waitlistQuery = query(collection(db, 'waitlist'), where('email', '==', normalizedEmail));
      const snapshot = await getDocs(waitlistQuery);

      if (snapshot.empty) {
        return null;
      }

      const docSnap = snapshot.docs[0];
      const data = docSnap.data() as WaitlistStatusEntry & Record<string, any>;

      const waitlistEntry: WaitlistStatusEntry = {
        email: data.email || normalizedEmail,
        timestamp: this.normalizeWaitlistTimestamp(data.timestamp) ?? new Date(),
        source: data.source,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        status: data.status ?? (data.converted ? 'converted' : 'pending'),
        converted: Boolean(data.converted),
        convertedAt: this.normalizeWaitlistTimestamp(data.convertedAt) ?? null,
        convertedUserId: data.convertedUserId ?? null,
        id: docSnap.id,
      };

      return waitlistEntry;
    } catch (error) {
      console.error('Failed to check waitlist status:', error);
      trackError(error as Error, { action: 'waitlist_status', email: normalizedEmail });
      return null;
    }
  }

  private normalizeWaitlistTimestamp(value: any): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'object' && typeof value.toDate === 'function') {
      return value.toDate();
    }

    if (typeof value === 'number') {
      return new Date(value);
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  /**
   * Assign a new role to an existing user while refreshing the permission map derived from
   * {@link getDefaultPermissionsForRole}. Consumers should ensure that any custom overrides
   * are re-applied after calling this helper.
   */
  async assignUserRole(userId: string, role: UserRole): Promise<void> {
    try {
      await appConfigService.ensureLoaded();
      await this.applyProfileUpdate(userId, {
        role,
        permissions: getDefaultPermissionsForRole(role),
      });
      trackUserAction('role_assigned', { userId, role });
    } catch (error) {
      trackError(error as Error, { action: 'assign_role', userId, role });
      throw error;
    }
  }

  // Check if user can perform action
  async canPerformAction(action: string, resource: string = 'general'): Promise<boolean> {
    return this.checkUserPermission(`${resource}:${action}`);
  }

  async checkUserPermission(permission: string): Promise<boolean> {
    if (!this.currentProfile) return false;

    if (this.currentProfile.role === 'admin') {
      return true;
    }

    const [resource = 'general', action = 'read'] = permission.split(':');

    return this.currentProfile.permissions.some((perm) => {
      if (!perm) return false;
      const resourceMatches = perm.resource === resource || perm.resource === 'general';
      if (!resourceMatches) {
        return false;
      }

      if (perm.action === 'admin') {
        return true;
      }

      return perm.action === action;
    });
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

    const defaultTierConfig = getConfiguredSubscriptionTier('free');
    const defaultTier = (defaultTierConfig?.name ?? 'free') as SubscriptionTierName;
    const subscriptionInfo: UserSubscription = {
      stripeCustomerId: '',
      subscriptionStatus: 'trialing',
      currentTier: defaultTier,
      billing: {
        currency: defaultTierConfig?.pricing.currency ?? 'usd',
      },
      usage: {
        aiGenerations: 0,
        resetDate: new Date(),
        period: 'monthly',
      },
    };

    const profile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || 'Coach',
      photoURL: user.photoURL || undefined,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      isEmailVerified: user.emailVerified,
      subscription: defaultTier,
      subscriptionStatus: 'trialing',
      stripeCustomerId: '',
      subscriptionInfo,
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
      permissions: getDefaultPermissionsForRole('coach'),
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
