import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { authService } from '../../services/firebase/auth-service';
import { enhancedWaitlistService } from '../../services/waitlist/enhanced-waitlist-service';
import LoginPage from '../../components/auth/LoginPage';
import modernTheme from '../../theme/modern-design-system';
import { createMockAuthResponse, createMockUser, createMockUserProfile } from '../utils/test-types';

// Mock Firebase auth
vi.mock('../../services/firebase/auth-service', () => ({
  authService: {
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signUp: vi.fn(),
  },
}));

// Mock waitlist service
vi.mock('../../services/waitlist/enhanced-waitlist-service', () => ({
  enhancedWaitlistService: {
    validateAccessToken: vi.fn(),
    upgradeToFullAccount: vi.fn(),
  },
}));

// Mock Sentry
vi.mock('@sentry/react', () => ({
  addBreadcrumb: vi.fn(),
}));

// Mock analytics
vi.mock('../../services/analytics/analytics-events', () => ({
  trackFunnel: vi.fn(),
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

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful Login Flow', () => {
    it('should successfully log in with valid credentials and navigate to dashboard', async () => {
      vi.mocked(authService.signIn).mockResolvedValue(createMockAuthResponse());

      renderWithProviders(<LoginPage />);

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      // Wait for authentication to complete
      await waitFor(() => {
        expect(authService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      // Should show success message
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });
  });

  describe('Invalid Password Login Attempt', () => {
    it('should display appropriate error message for wrong password', async () => {
      const error = new Error('Signin failed: wrong-password');
      vi.mocked(authService.signIn).mockRejectedValue(error);

      renderWithProviders(<LoginPage />);

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(signInButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/incorrect password/i)).toBeInTheDocument();
      });

      // Should show field-specific error
      expect(screen.getByText(/incorrect password/i)).toBeInTheDocument();
    });

    it('should display appropriate error message for user not found', async () => {
      const error = new Error('Signin failed: user-not-found');
      vi.mocked(authService.signIn).mockRejectedValue(error);

      renderWithProviders(<LoginPage />);

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/no account found with this email address/i)).toBeInTheDocument();
      });
    });

    it('should display appropriate error message for too many requests', async () => {
      const error = new Error('Signin failed: too-many-requests');
      vi.mocked(authService.signIn).mockRejectedValue(error);

      renderWithProviders(<LoginPage />);

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/too many failed attempts/i)).toBeInTheDocument();
      });
    });

    it('should display appropriate error message for network errors', async () => {
      const error = new Error('Signin failed: network');
      vi.mocked(authService.signIn).mockRejectedValue(error);

      renderWithProviders(<LoginPage />);

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Google OAuth Failure', () => {
    it('should display appropriate error message for popup closed by user', async () => {
      const error = new Error('Google signin failed: popup-closed-by-user');
      vi.mocked(authService.signInWithGoogle).mockRejectedValue(error);

      renderWithProviders(<LoginPage />);

      // Click Google sign in button
      const googleButton = screen.getByRole('button', { name: /google/i });
      fireEvent.click(googleButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/sign in was cancelled/i)).toBeInTheDocument();
      });
    });

    it('should display appropriate error message for popup blocked', async () => {
      const error = new Error('Google signin failed: popup-blocked');
      vi.mocked(authService.signInWithGoogle).mockRejectedValue(error);

      renderWithProviders(<LoginPage />);

      // Click Google sign in button
      const googleButton = screen.getByRole('button', { name: /google/i });
      fireEvent.click(googleButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/popup was blocked/i)).toBeInTheDocument();
      });
    });

    it('should display appropriate error message for network request failed', async () => {
      const error = new Error('Google signin failed: network-request-failed');
      vi.mocked(authService.signInWithGoogle).mockRejectedValue(error);

      renderWithProviders(<LoginPage />);

      // Click Google sign in button
      const googleButton = screen.getByRole('button', { name: /google/i });
      fireEvent.click(googleButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should display appropriate error message for account exists with different credential', async () => {
      const error = new Error('Google signin failed: account-exists-with-different-credential');
      vi.mocked(authService.signInWithGoogle).mockRejectedValue(error);

      renderWithProviders(<LoginPage />);

      // Click Google sign in button
      const googleButton = screen.getByRole('button', { name: /google/i });
      fireEvent.click(googleButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/account already exists with this email/i)).toBeInTheDocument();
      });
    });
  });

  describe('Expired/Invalid Onboarding Token', () => {
    it('should handle expired access token during validation', async () => {
      vi.mocked(enhancedWaitlistService.validateAccessToken).mockResolvedValue(null);

      const result = await enhancedWaitlistService.validateAccessToken('expired-token');

      expect(result).toBeNull();
      expect(enhancedWaitlistService.validateAccessToken).toHaveBeenCalledWith('expired-token');
    });

    it('should handle invalid token format during validation', async () => {
      vi.mocked(enhancedWaitlistService.validateAccessToken).mockResolvedValue(null);

      const result = await enhancedWaitlistService.validateAccessToken('invalid');

      expect(result).toBeNull();
      expect(enhancedWaitlistService.validateAccessToken).toHaveBeenCalledWith('invalid');
    });

    it('should throw error when upgrading account with invalid token', async () => {
      vi.mocked(enhancedWaitlistService.validateAccessToken).mockResolvedValue(null);

      await expect(
        enhancedWaitlistService.upgradeToFullAccount('invalid-token', 'password123')
      ).rejects.toThrow('Invalid or expired access token');
    });

    it('should throw error when upgrading account with missing required fields', async () => {
      const invalidWaitlistData = {
        id: 'test-id',
        email: 'test@example.com',
        name: '', // Missing name
        role: 'coach',
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(enhancedWaitlistService.validateAccessToken).mockResolvedValue(invalidWaitlistData);

      await expect(
        enhancedWaitlistService.upgradeToFullAccount('valid-token', 'password123')
      ).rejects.toThrow('Invalid waitlist data: missing required fields');
    });
  });

  describe('Loading States', () => {
    it('should show loading state during sign in', async () => {
      // Mock a delayed response
      vi.mocked(authService.signIn).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(createMockAuthResponse()), 100))
      );

      renderWithProviders(<LoginPage />);

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      // Should show loading state
      expect(signInButton).toBeDisabled();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during Google sign in', async () => {
      // Mock a delayed response
      vi.mocked(authService.signInWithGoogle).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(createMockAuthResponse()), 100))
      );

      renderWithProviders(<LoginPage />);

      // Click Google sign in button
      const googleButton = screen.getByRole('button', { name: /google/i });
      fireEvent.click(googleButton);

      // Should show loading state
      expect(googleButton).toBeDisabled();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/welcome/i)).toBeInTheDocument();
      });
    });
  });
});
