import { createMockAuthResponse, createMockUser, createMockUserProfile } from "../utils/test-types";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import BrowserRouter from 'react-router-dom';
import ChakraProvider from '@chakra-ui/react';
import { enhancedWaitlistService } from '../../services/waitlist/enhanced-waitlist-service';
import { authService } from '../../services/firebase/auth-service';
import BetaAccess from '../../pages/BetaAccess';
import modernTheme from '../../theme/modern-design-system';

// Mock Firebase
vi.mock('../../services/firebase/firebase-config', () => ({
  db: {},
}));

// Mock Firestore
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn();
const mockServerTimestamp = vi.fn(() => new Date());

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: mockGetDocs,
  updateDoc: mockUpdateDoc,
  serverTimestamp: mockServerTimestamp,
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

// Mock auth service
const mockSignUp = vi.fn();

vi.mock('../../services/firebase/auth-service', () => ({
  authService: {
    signUp: mockSignUp,
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
  trackUserAction: vi.fn(),
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

describe('Onboarding Stability Audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockSearchParams.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Token Validation Failure Simulations', () => {
    it('should handle malformed token gracefully', async () => {
      mockValidateAccessToken.mockResolvedValue(null);
      mockSearchParams.set('token', 'malformed-token');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/invalid or expired token/i)).toBeInTheDocument();
      });

      // Should not crash, should show error message
      expect(screen.getByText(/please contact support/i)).toBeInTheDocument();
    });

    it('should handle empty token gracefully', async () => {
      mockValidateAccessToken.mockResolvedValue(null);
      mockSearchParams.set('token', '');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/no token provided/i)).toBeInTheDocument();
      });
    });

    it('should handle null token gracefully', async () => {
      mockValidateAccessToken.mockResolvedValue(null);
      mockSearchParams.set('token', null as any);

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/no token provided/i)).toBeInTheDocument();
      });
    });

    it('should handle token validation throwing an error', async () => {
      mockValidateAccessToken.mockRejectedValue(new Error('Token validation failed'));
      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/invalid or expired token/i)).toBeInTheDocument();
      });
    });

    it('should handle token with invalid data structure', async () => {
      const invalidTokenData = {
        id: 'test-id',
        email: 'test@example.com',
        name: '', // Missing name
        role: 'head-coach',
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockValidateAccessToken.mockResolvedValue(invalidTokenData);
      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/welcome to the beta/i)).toBeInTheDocument();
      });

      // Should show the form but handle missing data gracefully
      const startButton = screen.getByRole('button', { name: /start onboarding/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to start onboarding/i)).toBeInTheDocument();
      });
    });
  });

  describe('Account Upgrade Failure Simulations', () => {
    it('should handle account upgrade network failure', async () => {
      const mockWaitlistData = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'head-coach',
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockValidateAccessToken.mockResolvedValue(mockWaitlistData);
      mockUpgradeToFullAccount.mockRejectedValue(new Error('Network request failed'));
      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/welcome to the beta/i)).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start onboarding/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to start onboarding/i)).toBeInTheDocument();
      });
    });

    it('should handle account upgrade with invalid email', async () => {
      const mockWaitlistData = {
        id: 'test-id',
        email: 'invalid-email',
        name: 'Test User',
        role: 'head-coach',
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockValidateAccessToken.mockResolvedValue(mockWaitlistData);
      mockUpgradeToFullAccount.mockRejectedValue(new Error('Invalid email format'));
      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/welcome to the beta/i)).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start onboarding/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to start onboarding/i)).toBeInTheDocument();
      });
    });

    it('should handle account upgrade with weak password', async () => {
      const mockWaitlistData = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'head-coach',
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockValidateAccessToken.mockResolvedValue(mockWaitlistData);
      mockUpgradeToFullAccount.mockRejectedValue(new Error('Password is too weak'));
      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/welcome to the beta/i)).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start onboarding/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to start onboarding/i)).toBeInTheDocument();
      });
    });

    it('should handle account upgrade with email already in use', async () => {
      const mockWaitlistData = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'head-coach',
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockValidateAccessToken.mockResolvedValue(mockWaitlistData);
      mockUpgradeToFullAccount.mockRejectedValue(new Error('Email already in use'));
      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/welcome to the beta/i)).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start onboarding/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to start onboarding/i)).toBeInTheDocument();
      });
    });
  });

  describe('Firestore Write Failure Simulations', () => {
    it('should handle Firestore write timeout during onboarding status update', async () => {
      const mockWaitlistData = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'head-coach',
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockValidateAccessToken.mockResolvedValue(mockWaitlistData);
      mockUpgradeToFullAccount.mockResolvedValue({
        user: createMockUser(),
        profile: createMockUserProfile()
      });

      // Mock Firestore write failure
      mockGetDocs.mockRejectedValue(new Error('Firestore write timeout'));
      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/welcome to the beta/i)).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start onboarding/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to start onboarding/i)).toBeInTheDocument();
      });
    });

    it('should handle Firestore permission denied during onboarding status update', async () => {
      const mockWaitlistData = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'head-coach',
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockValidateAccessToken.mockResolvedValue(mockWaitlistData);
      mockUpgradeToFullAccount.mockResolvedValue({
        user: createMockUser(),
        profile: createMockUserProfile()
      });

      // Mock Firestore permission denied
      const permissionError = new Error('Permission denied') as any;
      permissionError.name = 'FirebaseError';
      permissionError.code = 'permission-denied';
      mockGetDocs.mockRejectedValue(permissionError);
      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/welcome to the beta/i)).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start onboarding/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to start onboarding/i)).toBeInTheDocument();
      });
    });

    it('should handle Firestore document not found during onboarding status update', async () => {
      const mockWaitlistData = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'head-coach',
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockValidateAccessToken.mockResolvedValue(mockWaitlistData);
      mockUpgradeToFullAccount.mockResolvedValue({
        user: createMockUser(),
        profile: createMockUserProfile()
      });

      // Mock Firestore document not found
      mockGetDocs.mockResolvedValue({ empty: true });
      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/welcome to the beta/i)).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start onboarding/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to start onboarding/i)).toBeInTheDocument();
      });
    });
  });

  describe('Concurrent Operation Simulations', () => {
    it('should handle multiple simultaneous onboarding attempts', async () => {
      const mockWaitlistData = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'head-coach',
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockValidateAccessToken.mockResolvedValue(mockWaitlistData);
      mockUpgradeToFullAccount.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          user: createMockUser(),
          profile: createMockUserProfile()
        }), 1000))
      );
      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/welcome to the beta/i)).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start onboarding/i });
      
      // First click
      fireEvent.click(startButton);
      expect(startButton).toBeDisabled();

      // Second click should be ignored
      fireEvent.click(startButton);
      expect(startButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/welcome to beta/i)).toBeInTheDocument();
      });
    });

    it('should handle rapid token validation attempts', async () => {
      let resolveFirst: () => void;
      const firstPromise = new Promise<void>(resolve => {
        resolveFirst = resolve;
      });

      mockValidateAccessToken.mockImplementationOnce(() => firstPromise);
      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      // Should show loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Resolve first attempt
      act(() => {
        resolveFirst!();
      });

      await waitFor(() => {
        expect(screen.getByText(/invalid or expired token/i)).toBeInTheDocument();
      });
    });
  });

  describe('Memory and Performance Failure Simulations', () => {
    it('should handle memory pressure during token validation', async () => {
      // Simulate memory pressure by creating large objects
      const largeObject = new Array(1000000).fill('x').join('');
      
      mockValidateAccessToken.mockImplementation(async () => {
        // Simulate memory pressure
        const memoryPressure = new Array(100).fill(largeObject);
        return {
          id: 'test-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'head-coach',
          accessToken: 'valid-token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        };
      });
      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/welcome to the beta/i)).toBeInTheDocument();
      });

      // Should not crash despite memory pressure
      expect(screen.getByText(/let's get you set up/i)).toBeInTheDocument();
    });

    it('should handle slow token validation gracefully', async () => {
      mockValidateAccessToken.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          id: 'test-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'head-coach',
          accessToken: 'valid-token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        }), 3000))
      );
      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      // Should show loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Should eventually succeed
      await waitFor(() => {
        expect(screen.getByText(/welcome to the beta/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });
  });

  describe('Browser Environment Failure Simulations', () => {
    it('should handle localStorage corruption during token validation', async () => {
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

    it('should handle localStorage being unavailable', async () => {
      // Mock localStorage being unavailable
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        configurable: true,
      });

      mockValidateAccessToken.mockResolvedValue({
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'head-coach',
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });
      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/welcome to the beta/i)).toBeInTheDocument();
      });

      // Should not crash despite localStorage being unavailable
      expect(screen.getByText(/let's get you set up/i)).toBeInTheDocument();
    });

    it('should handle URLSearchParams being unavailable', async () => {
      // Mock URLSearchParams being unavailable
      vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation(() => {
        throw new Error('URLSearchParams not available');
      });

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/no token provided/i)).toBeInTheDocument();
      });

      // Should not crash despite URLSearchParams being unavailable
      expect(screen.getByText(/please contact support/i)).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should catch and handle unexpected errors gracefully', async () => {
      // Mock an unexpected error that could crash the component
      mockValidateAccessToken.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/invalid or expired token/i)).toBeInTheDocument();
      });

      // Should not crash, should show error message
      expect(screen.getByText(/please contact support/i)).toBeInTheDocument();
    });

    it('should handle null/undefined values in waitlist data gracefully', async () => {
      // Mock waitlist service returning null values
      mockValidateAccessToken.mockResolvedValue(null);
      mockSearchParams.set('token', 'test-token');

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/invalid or expired token/i)).toBeInTheDocument();
      });

      // Should not crash, should show error message
      expect(screen.getByText(/please contact support/i)).toBeInTheDocument();
    });
  });
});

