import { createMockAuthResponse, createMockUser, createMockUserProfile } from "../utils/test-types";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import BrowserRouter from 'react-router-dom';
import ChakraProvider from '@chakra-ui/react';
import { authService } from '../../services/firebase/auth-service';
import { enhancedWaitlistService } from '../../services/waitlist/enhanced-waitlist-service';
import LoginPage from '../../components/auth/LoginPage';
import BetaAccess from '../../pages/BetaAccess';
import modernTheme from '../../theme/modern-design-system';

// Mock Firebase auth
const mockSignIn = vi.fn();
const mockSignInWithGoogle = vi.fn();
const mockSignUp = vi.fn();
const mockResetPassword = vi.fn();

vi.mock('../../services/firebase/auth-service', () => ({
  authService: {
    signIn: mockSignIn,
    signInWithGoogle: mockSignInWithGoogle,
    signUp: mockSignUp,
    resetPassword: mockResetPassword,
  },
}));

// Mock waitlist service
const mockValidateAccessToken = vi.fn();
const mockUpgradeToFullAccount = vi.fn();

vi.mock('../../services/waitlist/enhanced-waitlist-service', () => ({
  enhancedWaitlistService: {
    validateAccessToken: mockValidateAccessToken,
    upgradeToFullAccount: mockUpgradeToFullAccount,
  },
}));

// Mock Sentry
const mockAddBreadcrumb = vi.fn();
const mockCaptureException = vi.fn();

vi.mock('@sentry/react', () => ({
  addBreadcrumb: mockAddBreadcrumb,
  captureException: mockCaptureException,
}));

// Mock analytics
vi.mock('../../services/analytics/analytics-events', () => ({
  trackFunnel: vi.fn(),
  trackUserAction: vi.fn(),
}));

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}));

// Mock Firebase config
vi.mock('../../services/firebase/firebase-config', () => ({
  auth: {},
  db: {},
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock URLSearchParams
const mockSearchParams = new Map();
vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key) => mockSearchParams.get(key));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ChakraProvider theme={modernTheme}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </ChakraProvider>
  );
};

describe('Authentication Stability Audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockSearchParams.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Network Failure Simulations', () => {
    it('should handle network timeout during email/password login', async () => {
      const networkError = new Error('Network request failed') as any;
      networkError.name = 'FirebaseError';
      networkError.code = 'network-request-failed';
      
      mockSignIn.mockRejectedValue(networkError);

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Should not crash, should show user-friendly error
      expect(screen.getByText(/please check your connection/i)).toBeInTheDocument();
    });

    it('should handle network timeout during Google OAuth', async () => {
      const networkError = new Error('Network request failed') as any;
      networkError.name = 'FirebaseError';
      networkError.code = 'network-request-failed';
      
      mockSignInWithGoogle.mockRejectedValue(networkError);

      renderWithProviders(<LoginPage />);

      const googleButton = screen.getByRole('button', { name: /google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Should not crash, should show user-friendly error
      expect(screen.getByText(/please check your connection/i)).toBeInTheDocument();
    });

    it('should handle intermittent network failures with retry', async () => {
      let attemptCount = 0;
      let networkError: any;
      mockSignIn.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          networkError = new Error('Network request failed') as any;
          networkError.name = 'FirebaseError';
          networkError.code = 'network-request-failed';
          throw networkError;
        }
        return Promise.resolve({
          user: createMockUser(),
          profile: createMockUserProfile()
        });
      });

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      // First attempt should fail
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Retry should succeed
      fireEvent.click(signInButton);
      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      });
    });
  });

  describe('Firestore Failure Simulations', () => {
    it('should handle Firestore connection timeout during profile fetch', async () => {
      const firestoreError = new Error('Firestore connection timeout') as any;
      firestoreError.name = 'FirebaseError';
      firestoreError.code = 'unavailable';
      
      mockSignIn.mockRejectedValue(firestoreError);

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/account setup incomplete/i)).toBeInTheDocument();
      });

      // Should not crash, should show user-friendly error
      expect(screen.getByText(/please contact support/i)).toBeInTheDocument();
    });

    it('should handle corrupted Firestore data gracefully', async () => {
      const corruptedDataError = new Error('Invalid profile data structure') as any;
      mockSignIn.mockRejectedValue(corruptedDataError);

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/account setup incomplete/i)).toBeInTheDocument();
      });
    });

    it('should handle Firestore permission denied errors', async () => {
      const permissionError = new Error('Permission denied') as any;
      permissionError.name = 'FirebaseError';
      permissionError.code = 'permission-denied';
      
      mockSignIn.mockRejectedValue(permissionError);

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/sign in failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Memory and Performance Failure Simulations', () => {
    it('should handle memory pressure during profile loading', async () => {
      // Simulate memory pressure by creating large objects
      const largeObject = new Array(1000000).fill('x').join('');
      
      mockSignIn.mockImplementation(async () => {
        // Simulate memory pressure
        const memoryPressure = new Array(100).fill(largeObject);
        return {
          user: createMockUser(),
          profile: createMockUserProfile()
        };
      });

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      });

      // Should not crash despite memory pressure
      expect(screen.getByText(/successfully signed in/i)).toBeInTheDocument();
    });

    it('should handle slow Firestore responses gracefully', async () => {
      mockSignIn.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            user: createMockUser(),
            profile: createMockUserProfile()
          }), 5000)
        )
      );

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      // Should show loading state
      expect(signInButton).toBeDisabled();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Should eventually succeed
      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      }, { timeout: 6000 });
    });
  });

  describe('Browser Environment Failure Simulations', () => {
    it('should handle localStorage corruption gracefully', async () => {
      // Simulate corrupted localStorage
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'demo_user_data') {
          return 'corrupted-json-data';
        }
        return null;
      });

      mockValidateAccessToken.mockResolvedValue(null);

      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/invalid or expired token/i)).toBeInTheDocument();
      });

      // Should not crash, should show error message
      expect(screen.getByText(/please contact support/i)).toBeInTheDocument();
    });

    it('should handle navigator.userAgent being undefined', async () => {
      // Mock undefined userAgent
      Object.defineProperty(navigator, 'userAgent', {
        value: undefined,
        configurable: true,
      });

      mockSignUp.mockResolvedValue({
        user: createMockUser(),
        profile: createMockUserProfile()
      });

      renderWithProviders(<LoginPage />);

      // Switch to sign up tab
      const signUpTab = screen.getByRole('tab', { name: /sign up/i });
      fireEvent.click(signUpTab);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const displayNameInput = screen.getByLabelText(/name/i);
      const teamNameInput = screen.getByLabelText(/team name/i);
      const signUpButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(displayNameInput, { target: { value: 'Test User' } });
      fireEvent.change(teamNameInput, { target: { value: 'Test Team' } });
      fireEvent.click(signUpButton);

      await waitFor(() => {
        expect(screen.getByText(/account created/i)).toBeInTheDocument();
      });

      // Should not crash despite undefined userAgent
      expect(screen.getByText(/welcome to coach core ai/i)).toBeInTheDocument();
    });

    it('should handle window.location being undefined', async () => {
      // Mock undefined window.location
      const originalLocation = window.location;
      delete (window as any).location;

      mockSignIn.mockResolvedValue({
        user: createMockUser(),
        profile: createMockUserProfile()
      });

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      });

      // Restore original location
      (window as any).location = originalLocation;

      // Should not crash despite undefined location
      expect(screen.getByText(/successfully signed in/i)).toBeInTheDocument();
    });
  });

  describe('Concurrent Operation Simulations', () => {
    it('should handle multiple simultaneous login attempts', async () => {
      let resolveFirst: () => void;
      const firstPromise = new Promise<void>(resolve => {
        resolveFirst = resolve;
      });

      mockSignIn.mockImplementationOnce(() => firstPromise);

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // First click
      fireEvent.click(signInButton);
      expect(signInButton).toBeDisabled();

      // Second click should be ignored
      fireEvent.click(signInButton);
      expect(signInButton).toBeDisabled();

      // Resolve first attempt
      act(() => {
        resolveFirst!();
      });

      await waitFor(() => {
        expect(signInButton).not.toBeDisabled();
      });
    });

    it('should handle rapid tab switching during authentication', async () => {
      mockSignIn.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          user: createMockUser(),
          profile: createMockUserProfile()
        }), 1000))
      );

      renderWithProviders(<LoginPage />);

      const signInTab = screen.getByRole('tab', { name: /sign in/i });
      const signUpTab = screen.getByRole('tab', { name: /sign up/i });

      // Rapid tab switching
      fireEvent.click(signInTab);
      fireEvent.click(signUpTab);
      fireEvent.click(signInTab);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      });

      // Should not crash despite rapid tab switching
      expect(screen.getByText(/successfully signed in/i)).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should catch and handle unexpected errors gracefully', async () => {
      // Mock an unexpected error that could crash the component
      mockSignIn.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/sign in failed/i)).toBeInTheDocument();
      });

      // Should not crash, should show error message
      expect(screen.getByText(/please try again/i)).toBeInTheDocument();
    });

    it('should handle null/undefined values in auth state gracefully', async () => {
      // Mock auth service returning null values
      mockSignIn.mockResolvedValue({
        user: null,
        profile: null,
      });

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/account setup incomplete/i)).toBeInTheDocument();
      });

      // Should not crash, should show error message
      expect(screen.getByText(/please contact support/i)).toBeInTheDocument();
    });
  });
});

