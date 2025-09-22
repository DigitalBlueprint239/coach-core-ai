import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '../firebase/auth-service';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null
  })),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  OAuthProvider: vi.fn(),
  signInWithPopup: vi.fn()
}));

// Mock Firestore
const mockDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockUpdateDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: mockDoc,
  setDoc: mockSetDoc,
  getDoc: mockGetDoc,
  updateDoc: mockUpdateDoc,
  serverTimestamp: vi.fn(() => 'mock-timestamp')
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('signInWithEmail', () => {
    it('should sign in user successfully', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User'
      };

      const { signInWithEmailAndPassword } = await import('firebase/auth');
      signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      });

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          email: 'test@example.com',
          displayName: 'Test User',
          subscription: {
            plan: 'free',
            status: 'active'
          }
        })
      });

      const result = await authService.signInWithEmail('test@example.com', 'password123');

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        'test@example.com',
        'password123'
      );
      expect(result).toEqual({
        success: true,
        user: {
          id: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          subscription: {
            plan: 'free',
            status: 'active'
          }
        }
      });
    });

    it('should handle invalid credentials', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/invalid-credential',
        message: 'Invalid credentials'
      });

      const result = await authService.signInWithEmail('test@example.com', 'wrongpassword');

      expect(result).toEqual({
        success: false,
        error: 'Invalid email or password'
      });
    });

    it('should handle user not found', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/user-not-found',
        message: 'User not found'
      });

      const result = await authService.signInWithEmail('nonexistent@example.com', 'password123');

      expect(result).toEqual({
        success: false,
        error: 'No account found with this email'
      });
    });
  });

  describe('signUpWithEmail', () => {
    it('should create user successfully', async () => {
      const mockUser = {
        uid: 'new-uid',
        email: 'new@example.com',
        displayName: 'New User'
      };

      mockCreateUserWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      });

      mockSetDoc.mockResolvedValue(undefined);

      const result = await authService.signUpWithEmail(
        'new@example.com',
        'password123',
        'New User',
        'Test Team'
      );

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        'new@example.com',
        'password123'
      );
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.any(Object),
        {
          email: 'new@example.com',
          displayName: 'New User',
          subscription: {
            plan: 'free',
            status: 'active'
          },
          team: {
            name: 'Test Team',
            role: 'owner'
          },
          createdAt: 'mock-timestamp',
          updatedAt: 'mock-timestamp'
        }
      );
      expect(result.success).toBe(true);
    });

    it('should handle email already exists', async () => {
      mockCreateUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/email-already-in-use',
        message: 'Email already in use'
      });

      const result = await authService.signUpWithEmail(
        'existing@example.com',
        'password123',
        'Existing User',
        'Test Team'
      );

      expect(result).toEqual({
        success: false,
        error: 'An account with this email already exists'
      });
    });

    it('should handle weak password', async () => {
      mockCreateUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/weak-password',
        message: 'Password is too weak'
      });

      const result = await authService.signUpWithEmail(
        'test@example.com',
        '123',
        'Test User',
        'Test Team'
      );

      expect(result).toEqual({
        success: false,
        error: 'Password should be at least 6 characters'
      });
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      mockSignOut.mockResolvedValue(undefined);

      const result = await authService.signOut();

      expect(mockSignOut).toHaveBeenCalled();
      expect(result).toEqual({
        success: true
      });
    });

    it('should handle sign out errors', async () => {
      mockSignOut.mockRejectedValue(new Error('Sign out failed'));

      const result = await authService.signOut();

      expect(result).toEqual({
        success: false,
        error: 'Failed to sign out'
      });
    });
  });

  describe('signInWithGoogle', () => {
    it('should sign in with Google successfully', async () => {
      const mockUser = {
        uid: 'google-uid',
        email: 'google@example.com',
        displayName: 'Google User'
      };

      mockSignInWithPopup.mockResolvedValue({
        user: mockUser
      });

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          email: 'google@example.com',
          displayName: 'Google User',
          subscription: {
            plan: 'free',
            status: 'active'
          }
        })
      });

      const result = await authService.signInWithGoogle();

      expect(mockSignInWithPopup).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle Google sign in cancellation', async () => {
      mockSignInWithPopup.mockRejectedValue({
        code: 'auth/popup-closed-by-user',
        message: 'Popup closed by user'
      });

      const result = await authService.signInWithGoogle();

      expect(result).toEqual({
        success: false,
        error: 'Sign in was cancelled'
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user if authenticated', async () => {
      const mockUser = {
        uid: 'current-uid',
        email: 'current@example.com',
        displayName: 'Current User'
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          email: 'current@example.com',
          displayName: 'Current User',
          subscription: {
            plan: 'pro',
            status: 'active'
          }
        })
      });

      // Mock getAuth to return current user
      vi.doMock('firebase/auth', () => ({
        getAuth: vi.fn(() => ({
          currentUser: mockUser
        }))
      }));

      const result = await authService.getCurrentUser();

      expect(result).toEqual({
        success: true,
        user: {
          id: 'current-uid',
          email: 'current@example.com',
          displayName: 'Current User',
          subscription: {
            plan: 'pro',
            status: 'active'
          }
        }
      });
    });

    it('should return null if no user', async () => {
      // Mock getAuth to return null current user
      vi.doMock('firebase/auth', () => ({
        getAuth: vi.fn(() => ({
          currentUser: null
        }))
      }));

      const result = await authService.getCurrentUser();

      expect(result).toEqual({
        success: true,
        user: null
      });
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await authService.updateUserProfile('test-uid', {
        displayName: 'Updated Name',
        preferences: {
          notifications: {
            email: true,
            push: false
          }
        }
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        {
          displayName: 'Updated Name',
          preferences: {
            notifications: {
              email: true,
              push: false
            }
          },
          updatedAt: 'mock-timestamp'
        }
      );
      expect(result).toEqual({
        success: true
      });
    });

    it('should handle update errors', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'));

      const result = await authService.updateUserProfile('test-uid', {
        displayName: 'Updated Name'
      });

      expect(result).toEqual({
        success: false,
        error: 'Failed to update profile'
      });
    });
  });
});
