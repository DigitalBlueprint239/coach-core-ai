import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase-config';
import { userProfileService, UserProfile } from '../user/user-profile-service';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

class AuthService {
  private authStateListeners: ((state: AuthState) => void)[] = [];

  /**
   * Initialize auth state listener
   */
  initializeAuthListener() {
    onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in
        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
        };

        // Get or create user profile
        let userProfile = await userProfileService.getUserProfile(firebaseUser.uid);
        
        if (!userProfile) {
          // Create new user profile
          const defaultProfile = userProfileService.createDefaultProfile(firebaseUser);
          userProfile = await userProfileService.upsertUserProfile(defaultProfile);
        } else {
          // Update last login
          await userProfileService.updateUserProfile(firebaseUser.uid, {
            lastLogin: new Date(),
          });
        }

        const authState: AuthState = {
          user: authUser,
          profile: userProfile,
          isLoading: false,
          error: null,
        };

        this.notifyListeners(authState);
      } else {
        // User is signed out
        const authState: AuthState = {
          user: null,
          profile: null,
          isLoading: false,
          error: null,
        };

        this.notifyListeners(authState);
      }
    });
  }

  /**
   * Add auth state listener
   */
  addAuthStateListener(listener: (state: AuthState) => void) {
    this.authStateListeners.push(listener);
  }

  /**
   * Remove auth state listener
   */
  removeAuthStateListener(listener: (state: AuthState) => void) {
    const index = this.authStateListeners.indexOf(listener);
    if (index > -1) {
      this.authStateListeners.splice(index, 1);
    }
  }

  /**
   * Notify all auth state listeners
   */
  private notifyListeners(state: AuthState) {
    this.authStateListeners.forEach(listener => listener(state));
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<{ user: AuthUser; profile: UserProfile }> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const authUser: AuthUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        emailVerified: result.user.emailVerified,
      };

      // Get or create user profile
      let userProfile = await userProfileService.getUserProfile(result.user.uid);
      
      if (!userProfile) {
        // Create new user profile from Google data
        const defaultProfile = userProfileService.createDefaultProfile(result.user);
        userProfile = await userProfileService.upsertUserProfile(defaultProfile);
      } else {
        // Update last login
        await userProfileService.updateUserProfile(result.user.uid, {
          lastLogin: new Date(),
        });
      }

      return { user: authUser, profile: userProfile };
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  }

  /**
   * Sign in with Apple
   */
  async signInWithApple(): Promise<{ user: AuthUser; profile: UserProfile }> {
    try {
      // TODO: Implement Apple Sign-In
      throw new Error('Apple Sign-In not yet implemented');
    } catch (error: any) {
      console.error('Apple sign-in error:', error);
      throw new Error(error.message || 'Failed to sign in with Apple');
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, displayName: string, teamName: string, sport: string, ageGroup: string): Promise<{ user: AuthUser; profile: UserProfile }> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update Firebase user profile
      await updateProfile(result.user, {
        displayName,
        photoURL: undefined,
      });

      const authUser: AuthUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        emailVerified: result.user.emailVerified,
      };

      // Create user profile with team information
      const defaultProfile = userProfileService.createDefaultProfile(result.user);
      
      // Add team information to the profile
      const enhancedProfile = {
        ...defaultProfile,
        teamName,
        role: 'head-coach' as const,
        preferences: {
          ...defaultProfile.preferences,
          coaching: {
            ...defaultProfile.preferences.coaching,
            sports: [sport],
            ageGroups: [ageGroup],
          }
        }
      };
      
      const userProfile = await userProfileService.upsertUserProfile(enhancedProfile);

      return { user: authUser, profile: userProfile };
    } catch (error: any) {
      console.error('Sign-up error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to create account';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use at least 8 characters with numbers and symbols.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/password sign-up is not enabled. Please contact support.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ user: AuthUser; profile: UserProfile }> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      const authUser: AuthUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        emailVerified: result.user.emailVerified,
      };

      // Get user profile
      const userProfile = await userProfileService.getUserProfile(result.user.uid);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Update last login
      await userProfileService.updateUserProfile(result.user.uid, {
        lastLogin: new Date(),
      });

      return { user: authUser, profile: userProfile };
    } catch (error: any) {
      console.error('Sign-in error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error('Sign-out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!auth.currentUser;
  }
}

export const authService = new AuthService();
export default authService;
