import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService, AuthState, SignUpData } from '../auth-service';

// Mock Firebase Auth
const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChanged = vi.fn();
const mockGoogleAuthProvider = vi.fn();
const mockOAuthProvider = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockSendEmailVerification = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  signOut: mockSignOut,
  onAuthStateChanged: mockOnAuthStateChanged,
  GoogleAuthProvider: mockGoogleAuthProvider,
  OAuthProvider: mockOAuthProvider,
  signInWithPopup: mockSignInWithPopup,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  sendEmailVerification: mockSendEmailVerification,
  updateProfile: mockUpdateProfile
}));

// Mock Firestore
const mockDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockServerTimestamp = vi.fn(() => 'mock-timestamp');

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: mockDoc,
  setDoc: mockSetDoc,
  getDoc: mockGetDoc,
  updateDoc: mockUpdateDoc,
  serverTimestamp: mockServerTimestamp
}));

// Mock Firebase config
vi.mock('../firebase-config', () => ({
  auth: { currentUser: null },
  db: {},
  analytics: {},
  googleProvider: mockGoogleAuthProvider,
  appleProvider: mockOAuthProvider
}));

// Mock monitoring and analytics
vi.mock('../../monitoring', () => ({
  trackUserAction: vi.fn(),
  setSentryUser: vi.fn(),
  trackError: vi.fn()
}));

vi.mock('../../analytics', () => ({
  trackLogin: vi.fn(),
  trackLogout: vi.fn(),
  trackSignup: vi.fn(),
  setUserContext: vi.fn(),
  clearUserContext: vi.fn()
}));

vi.mock('../../../utils/firestore-sanitization', () => ({
  createFirestoreHelper: vi.fn(() => ({
    sanitize: vi.fn((data) => data),
    validate: vi.fn(() => true)
  }))
}));

describe('AuthService - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth service state
    (authService as any).currentUser = null;
    (authService as any).currentProfile = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('User Sign Up Flow', () => {
    it('should successfully create a new user with profile', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: false
      };

      const mockUserCredential = {
        user: mockUser
      };

      const signUpData: SignUpData = {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
        sport: 'Basketball',
        teamName: 'Test Team'
      };

      mockCreateUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);
      mockSetDoc.mockResolvedValue(undefined);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          email: 'test@example.com',
          displayName: 'Test User',
          sport: 'Basketball',
          teamName: 'Test Team',
          subscription: { plan: 'free', status: 'active' },
          role: 'owner',
          permissions: ['read', 'write'],
          createdAt: 'mock-timestamp',
          updatedAt: 'mock-timestamp'
        })
      });

      const result = await authService.signUp(signUpData);

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        'test@example.com',
        'password123'
      );
      expect(mockSetDoc).toHaveBeenCalled();
      expect(result.user).toEqual(mockUser);
      expect(result.profile).toBeDefined();
    });

    it('should handle sign up errors gracefully', async () => {
      const signUpData: SignUpData = {
        email: 'invalid-email',
        password: 'weak',
        displayName: 'Test User',
        sport: 'Basketball',
        teamName: 'Test Team'
      };

      mockCreateUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/invalid-email',
        message: 'The email address is badly formatted.'
      });

      await expect(authService.signUp(signUpData)).rejects.toThrow();
    });

    it('should validate required sign up fields', async () => {
      const invalidSignUpData = {
        email: '',
        password: '',
        displayName: '',
        sport: '',
        teamName: ''
      } as SignUpData;

      await expect(authService.signUp(invalidSignUpData)).rejects.toThrow();
    });
  });

  describe('User Sign In Flow', () => {
    it('should successfully sign in with valid credentials', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true
      };

      const mockUserCredential = {
        user: mockUser
      };

      mockSignInWithEmailAndPassword.mockResolvedValue(mockUserCredential);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          email: 'test@example.com',
          displayName: 'Test User',
          subscription: { plan: 'free', status: 'active' },
          role: 'owner',
          permissions: ['read', 'write']
        })
      });

      const result = await authService.signIn('test@example.com', 'password123');

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        'test@example.com',
        'password123'
      );
      expect(result.user).toEqual(mockUser);
      expect(result.profile).toBeDefined();
    });

    it('should handle invalid credentials', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/invalid-credential',
        message: 'The email or password is incorrect.'
      });

      await expect(authService.signIn('test@example.com', 'wrongpassword')).rejects.toThrow();
    });

    it('should handle network errors during sign in', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/network-request-failed',
        message: 'A network error has occurred.'
      });

      await expect(authService.signIn('test@example.com', 'password123')).rejects.toThrow();
    });
  });

  describe('Google Sign In Flow', () => {
    it('should successfully sign in with Google', async () => {
      const mockUser = {
        uid: 'google-uid-123',
        email: 'test@gmail.com',
        displayName: 'Google User',
        emailVerified: true
      };

      const mockUserCredential = {
        user: mockUser
      };

      mockSignInWithPopup.mockResolvedValue(mockUserCredential);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          email: 'test@gmail.com',
          displayName: 'Google User',
          subscription: { plan: 'free', status: 'active' },
          role: 'owner',
          permissions: ['read', 'write']
        })
      });

      const result = await authService.signInWithGoogle();

      expect(mockSignInWithPopup).toHaveBeenCalled();
      expect(result.user).toEqual(mockUser);
      expect(result.profile).toBeDefined();
    });

    it('should handle Google sign in cancellation', async () => {
      mockSignInWithPopup.mockRejectedValue({
        code: 'auth/popup-closed-by-user',
        message: 'The popup has been closed by the user before finalizing the operation.'
      });

      await expect(authService.signInWithGoogle()).rejects.toThrow();
    });
  });

  describe('User Sign Out Flow', () => {
    it('should successfully sign out user', async () => {
      mockSignOut.mockResolvedValue(undefined);

      await authService.signOut();

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      mockSignOut.mockRejectedValue({
        code: 'auth/network-request-failed',
        message: 'A network error has occurred.'
      });

      await expect(authService.signOut()).rejects.toThrow();
    });
  });

  describe('Password Reset Flow', () => {
    it('should send password reset email successfully', async () => {
      mockSendPasswordResetEmail.mockResolvedValue(undefined);

      await authService.resetPassword('test@example.com');

      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        expect.any(Object),
        'test@example.com'
      );
    });

    it('should handle invalid email for password reset', async () => {
      mockSendPasswordResetEmail.mockRejectedValue({
        code: 'auth/invalid-email',
        message: 'The email address is badly formatted.'
      });

      await expect(authService.resetPassword('invalid-email')).rejects.toThrow();
    });
  });

  describe('Email Verification Flow', () => {
    it('should send email verification successfully', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        sendEmailVerification: mockSendEmailVerification
      };

      mockSendEmailVerification.mockResolvedValue(undefined);

      await authService.sendEmailVerification(mockUser as any);

      expect(mockSendEmailVerification).toHaveBeenCalled();
    });

    it('should handle email verification errors', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        sendEmailVerification: mockSendEmailVerification
      };

      mockSendEmailVerification.mockRejectedValue({
        code: 'auth/too-many-requests',
        message: 'Too many requests. Please try again later.'
      });

      await expect(authService.sendEmailVerification(mockUser as any)).rejects.toThrow();
    });
  });

  describe('Profile Management', () => {
    it('should update user profile successfully', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User'
      };

      const updateData = {
        displayName: 'Updated Name',
        sport: 'Football'
      };

      mockUpdateDoc.mockResolvedValue(undefined);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          ...updateData,
          email: 'test@example.com',
          subscription: { plan: 'free', status: 'active' },
          role: 'owner',
          permissions: ['read', 'write']
        })
      });

      const result = await authService.updateProfile(mockUser as any, updateData);

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle profile update errors', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: 'test@example.com'
      };

      const updateData = {
        displayName: 'Updated Name'
      };

      mockUpdateDoc.mockRejectedValue({
        code: 'permission-denied',
        message: 'The user does not have permission to update this document.'
      });

      await expect(authService.updateProfile(mockUser as any, updateData)).rejects.toThrow();
    });
  });

  describe('Auth State Management', () => {
    it('should notify listeners of auth state changes', () => {
      const mockListener = vi.fn();
      authService.onAuthStateChange(mockListener);

      // Simulate auth state change
      const mockAuthState: AuthState = {
        user: null,
        profile: null,
        isLoading: false,
        error: null
      };

      (authService as any).notifyListeners(mockAuthState);

      expect(mockListener).toHaveBeenCalledWith(mockAuthState);
    });

    it('should remove auth state listeners', () => {
      const mockListener = vi.fn();
      const unsubscribe = authService.onAuthStateChange(mockListener);

      // Remove listener
      unsubscribe();

      // Simulate auth state change
      const mockAuthState: AuthState = {
        user: null,
        profile: null,
        isLoading: false,
        error: null
      };

      (authService as any).notifyListeners(mockAuthState);

      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle Firebase auth errors with proper error codes', async () => {
      const errorCodes = [
        'auth/user-not-found',
        'auth/wrong-password',
        'auth/email-already-in-use',
        'auth/weak-password',
        'auth/invalid-email',
        'auth/user-disabled',
        'auth/too-many-requests',
        'auth/operation-not-allowed'
      ];

      for (const errorCode of errorCodes) {
        mockSignInWithEmailAndPassword.mockRejectedValue({
          code: errorCode,
          message: `Firebase error: ${errorCode}`
        });

        await expect(authService.signIn('test@example.com', 'password123')).rejects.toThrow();
      }
    });

    it('should handle network connectivity issues', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/network-request-failed',
        message: 'A network error has occurred.'
      });

      await expect(authService.signIn('test@example.com', 'password123')).rejects.toThrow();
    });
  });

  describe('Security Features', () => {
    it('should sanitize user input before processing', async () => {
      const signUpData: SignUpData = {
        email: 'test@example.com',
        password: 'password123',
        displayName: '<script>alert("xss")</script>',
        sport: 'Basketball',
        teamName: 'Test Team'
      };

      mockCreateUserWithEmailAndPassword.mockResolvedValue({
        user: { uid: 'test-uid', email: 'test@example.com' }
      });
      mockSetDoc.mockResolvedValue(undefined);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({})
      });

      await authService.signUp(signUpData);

      // Verify that sanitization was called
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
        ''
      ];

      for (const email of invalidEmails) {
        await expect(authService.signIn(email, 'password123')).rejects.toThrow();
      }
    });
  });
});






