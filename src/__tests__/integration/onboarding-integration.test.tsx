import { createMockAuthResponse, createMockUser, createMockUserProfile } from "../utils/test-types";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}));

// Mock waitlist service
vi.mock('../../services/waitlist/enhanced-waitlist-service', () => ({
  enhancedWaitlistService: {
    validateAccessToken: vi.fn(),
    upgradeToFullAccount: vi.fn(),
  },
}));

// Mock auth service
vi.mock('../../services/firebase/auth-service', () => ({
  authService: {
    signUp: vi.fn(),
  },
}));

// Mock Sentry
vi.mock('@sentry/react', () => ({
  addBreadcrumb: vi.fn(),
}));

// Mock analytics
vi.mock('../../services/analytics/analytics-events', () => ({
  trackUserAction: vi.fn(),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ChakraProvider theme={modernTheme}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </ChakraProvider>
  );
};

describe('Onboarding Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Valid Onboarding Token', () => {
    it('should successfully validate token and show onboarding form', async () => {
      const mockWaitlistData = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'head-coach',
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(enhancedWaitlistService.validateAccessToken).mockResolvedValue(mockWaitlistData);

      // Mock URLSearchParams to return a valid token
      const mockSearchParams = new URLSearchParams('token=valid-token');
      vi.spyOn(URLSearchParams.prototype, 'get').mockReturnValue('valid-token');

      renderWithProviders(<BetaAccess />);

      // Wait for token validation
      await waitFor(() => {
        expect(enhancedWaitlistService.validateAccessToken).toHaveBeenCalledWith('valid-token');
      });

      // Should show onboarding form
      expect(screen.getByText(/welcome to the beta/i)).toBeInTheDocument();
    });

    it('should successfully upgrade account from waitlist', async () => {
      const mockWaitlistData = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'head-coach',
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      const mockUser = {
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
      };

      const mockProfile = {
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'coach',
        activeTeamId: 'team-123',
      };

      vi.mocked(enhancedWaitlistService.validateAccessToken).mockResolvedValue(mockWaitlistData);
      vi.mocked(enhancedWaitlistService.upgradeToFullAccount).mockResolvedValue({
        user: mockUser,
        profile: mockProfile,
      });

      // Mock URLSearchParams to return a valid token
      vi.spyOn(URLSearchParams.prototype, 'get').mockReturnValue('valid-token');

      renderWithProviders(<BetaAccess />);

      // Wait for token validation
      await waitFor(() => {
        expect(enhancedWaitlistService.validateAccessToken).toHaveBeenCalledWith('valid-token');
      });

      // Click start onboarding button
      const startButton = screen.getByRole('button', { name: /start onboarding/i });
      fireEvent.click(startButton);

      // Wait for account upgrade
      await waitFor(() => {
        expect(enhancedWaitlistService.upgradeToFullAccount).toHaveBeenCalledWith('valid-token', expect.any(String));
      });

      // Should show success message
      expect(screen.getByText(/welcome to beta/i)).toBeInTheDocument();
    });
  });

  describe('Invalid Onboarding Token', () => {
    it('should handle expired token gracefully', async () => {
      vi.mocked(enhancedWaitlistService.validateAccessToken).mockResolvedValue(null);

      // Mock URLSearchParams to return an expired token
      vi.spyOn(URLSearchParams.prototype, 'get').mockReturnValue('expired-token');

      renderWithProviders(<BetaAccess />);

      // Wait for token validation
      await waitFor(() => {
        expect(enhancedWaitlistService.validateAccessToken).toHaveBeenCalledWith('expired-token');
      });

      // Should show error message
      expect(screen.getByText(/invalid or expired token/i)).toBeInTheDocument();
    });

    it('should handle malformed token gracefully', async () => {
      vi.mocked(enhancedWaitlistService.validateAccessToken).mockResolvedValue(null);

      // Mock URLSearchParams to return a malformed token
      vi.spyOn(URLSearchParams.prototype, 'get').mockReturnValue('malformed-token');

      renderWithProviders(<BetaAccess />);

      // Wait for token validation
      await waitFor(() => {
        expect(enhancedWaitlistService.validateAccessToken).toHaveBeenCalledWith('malformed-token');
      });

      // Should show error message
      expect(screen.getByText(/invalid or expired token/i)).toBeInTheDocument();
    });

    it('should handle missing token gracefully', async () => {
      vi.mocked(enhancedWaitlistService.validateAccessToken).mockResolvedValue(null);

      // Mock URLSearchParams to return null (no token)
      vi.spyOn(URLSearchParams.prototype, 'get').mockReturnValue(null);

      renderWithProviders(<BetaAccess />);

      // Should show error message
      expect(screen.getByText(/no token provided/i)).toBeInTheDocument();
    });
  });

  describe('Account Upgrade Errors', () => {
    it('should handle account upgrade failure gracefully', async () => {
      const mockWaitlistData = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'head-coach',
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(enhancedWaitlistService.validateAccessToken).mockResolvedValue(mockWaitlistData);
      vi.mocked(enhancedWaitlistService.upgradeToFullAccount).mockRejectedValue(
        new Error('Account upgrade failed')
      );

      // Mock URLSearchParams to return a valid token
      vi.spyOn(URLSearchParams.prototype, 'get').mockReturnValue('valid-token');

      renderWithProviders(<BetaAccess />);

      // Wait for token validation
      await waitFor(() => {
        expect(enhancedWaitlistService.validateAccessToken).toHaveBeenCalledWith('valid-token');
      });

      // Click start onboarding button
      const startButton = screen.getByRole('button', { name: /start onboarding/i });
      fireEvent.click(startButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to start onboarding/i)).toBeInTheDocument();
      });
    });

    it('should handle missing required fields in waitlist data', async () => {
      const invalidWaitlistData = {
        id: 'test-id',
        email: 'test@example.com',
        name: '', // Missing name
        role: 'head-coach',
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(enhancedWaitlistService.validateAccessToken).mockResolvedValue(invalidWaitlistData);
      vi.mocked(enhancedWaitlistService.upgradeToFullAccount).mockRejectedValue(
        new Error('Invalid waitlist data: missing required fields')
      );

      // Mock URLSearchParams to return a valid token
      vi.spyOn(URLSearchParams.prototype, 'get').mockReturnValue('valid-token');

      renderWithProviders(<BetaAccess />);

      // Wait for token validation
      await waitFor(() => {
        expect(enhancedWaitlistService.validateAccessToken).toHaveBeenCalledWith('valid-token');
      });

      // Click start onboarding button
      const startButton = screen.getByRole('button', { name: /start onboarding/i });
      fireEvent.click(startButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to start onboarding/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during token validation', async () => {
      // Mock a delayed response
      vi.mocked(enhancedWaitlistService.validateAccessToken).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          id: 'test-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'head-coach',
          accessToken: 'valid-token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        }), 100))
      );

      // Mock URLSearchParams to return a valid token
      vi.spyOn(URLSearchParams.prototype, 'get').mockReturnValue('valid-token');

      renderWithProviders(<BetaAccess />);

      // Should show loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/welcome to the beta/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during account upgrade', async () => {
      const mockWaitlistData = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'head-coach',
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(enhancedWaitlistService.validateAccessToken).mockResolvedValue(mockWaitlistData);
      
      // Mock a delayed response
      vi.mocked(enhancedWaitlistService.upgradeToFullAccount).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          user: createMockUser(),
          profile: createMockUserProfile()
        }), 100))
      );

      // Mock URLSearchParams to return a valid token
      vi.spyOn(URLSearchParams.prototype, 'get').mockReturnValue('valid-token');

      renderWithProviders(<BetaAccess />);

      // Wait for token validation
      await waitFor(() => {
        expect(enhancedWaitlistService.validateAccessToken).toHaveBeenCalledWith('valid-token');
      });

      // Click start onboarding button
      const startButton = screen.getByRole('button', { name: /start onboarding/i });
      fireEvent.click(startButton);

      // Should show loading state
      expect(startButton).toBeDisabled();
      expect(screen.getByText(/starting onboarding/i)).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/welcome to beta/i)).toBeInTheDocument();
      });
    });
  });
});

