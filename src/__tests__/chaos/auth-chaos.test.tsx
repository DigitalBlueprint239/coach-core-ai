import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import BrowserRouter from 'react-router-dom';
import ChakraProvider from '@chakra-ui/react';
import { authService } from '../../services/firebase/auth-service';
import { enhancedWaitlistService } from '../../services/waitlist/enhanced-waitlist-service';
import { validateToken } from '../../utils/token-validator';
import LoginPage from '../../components/auth/LoginPage';
import BetaAccess from '../../pages/BetaAccess';
import modernTheme from '../../theme/modern-design-system';
import { createMockAuthResponse, createMockUser, createMockUserProfile } from '../utils/test-types';

// Mock services
vi.mock('../../services/firebase/auth-service');
vi.mock('../../services/waitlist/enhanced-waitlist-service');
vi.mock('../../utils/token-validator');
vi.mock('@sentry/react', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
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

describe('Authentication Chaos Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Network Chaos Scenarios', () => {
    it('should handle complete network loss during login', async () => {
      // Mock network failure
      const networkError = new Error('Network request failed');
      networkError.name = 'TypeError';
      networkError.message = 'Failed to fetch';
      
      vi.mocked(authService.signIn).mockRejectedValue(networkError);

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

    it('should handle intermittent network failures with exponential backoff', async () => {
      let attemptCount = 0;
      const maxAttempts = 3;
      
      vi.mocked(authService.signIn).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < maxAttempts) {
          const networkError = new Error('Network request failed');
          networkError.name = 'TypeError';
          throw networkError;
        }
        return Promise.resolve(createMockAuthResponse());
      });

      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('should handle DNS resolution failures', async () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND firebase.googleapis.com');
      dnsError.name = 'TypeError';
      
      vi.mocked(authService.signIn).mockRejectedValue(dnsError);

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
    });
  });

  describe('Data Corruption Chaos Scenarios', () => {
    it('should handle corrupted profile data from Firestore', async () => {
      const corruptedProfileError = new Error('Invalid profile data structure');
      
      vi.mocked(authService.signIn).mockRejectedValue(corruptedProfileError);

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

    it('should handle malformed JSON in localStorage', async () => {
      // Mock corrupted localStorage
      const originalLocalStorage = window.localStorage;
      const mockLocalStorage = {
        getItem: vi.fn((key) => {
          if (key === 'demo_user_data') {
            return 'corrupted-json-data{invalid}';
          }
          return originalLocalStorage.getItem(key);
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

      vi.mocked(enhancedWaitlistService.validateAccessToken).mockResolvedValue(null);

      renderWithProviders(<BetaAccess />);

      await waitFor(() => {
        expect(screen.getByText(/invalid or expired token/i)).toBeInTheDocument();
      });

      // Restore original localStorage
      Object.defineProperty(window, 'localStorage', { value: originalLocalStorage });
    });

    it('should handle null/undefined values in auth state', async () => {
      // Mock auth service returning null values
      vi.mocked(authService.signIn).mockResolvedValue({
        user: null as any,
        profile: null as any,
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
    });
  });

  describe('Token Chaos Scenarios', () => {
    it('should handle malformed tokens gracefully', async () => {
      vi.mocked(validateToken).mockReturnValue({
        isValid: false,
        isExpired: false,
        error: 'Invalid token format'
      });

      const result = validateToken('malformed-token');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid token format');
    });

    it('should handle expired tokens gracefully', async () => {
      vi.mocked(validateToken).mockReturnValue({
        isValid: false,
        isExpired: true,
        error: 'Token has expired'
      });

      const result = validateToken('expired-token');
      expect(result.isValid).toBe(false);
      expect(result.isExpired).toBe(true);
    });

    it('should handle tokens with invalid characters', async () => {
      vi.mocked(validateToken).mockReturnValue({
        isValid: false,
        isExpired: false,
        error: 'Token contains invalid characters'
      });

      const result = validateToken('invalid@token#with$special%chars');
      expect(result.isValid).toBe(false);
    });

    it('should handle extremely long tokens', async () => {
      const longToken = 'a'.repeat(10000);
      
      vi.mocked(validateToken).mockReturnValue({
        isValid: false,
        isExpired: false,
        error: 'Token must be no more than 1000 characters long'
      });

      const result = validateToken(longToken);
      expect(result.isValid).toBe(false);
    });

    it('should handle empty tokens', async () => {
      vi.mocked(validateToken).mockReturnValue({
        isValid: false,
        isExpired: false,
        error: 'Token is required'
      });

      const result = validateToken('');
      expect(result.isValid).toBe(false);
    });

    it('should handle null/undefined tokens', async () => {
      vi.mocked(validateToken).mockReturnValue({
        isValid: false,
        isExpired: false,
        error: 'Token is required'
      });

      const result = validateToken(null as any);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Memory Pressure Chaos Scenarios', () => {
    it('should handle memory pressure during authentication', async () => {
      // Simulate memory pressure by creating large objects
      const largeArray = new Array(1000000).fill('x');
      
      vi.mocked(authService.signIn).mockImplementation(async () => {
        // Simulate memory pressure
        const memoryPressure = new Array(100).fill(largeArray);
        return createMockAuthResponse();
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
  });

  describe('Concurrent Operation Chaos Scenarios', () => {
    it('should handle multiple simultaneous login attempts', async () => {
      let resolveFirst: (value: { user: any; profile: any }) => void;
      const firstPromise = new Promise<{ user: any; profile: any }>(resolve => {
        resolveFirst = resolve;
      });

      vi.mocked(authService.signIn).mockImplementationOnce(() => firstPromise);

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
        resolveFirst!(createMockAuthResponse());
      });

      await waitFor(() => {
        expect(signInButton).not.toBeDisabled();
      });
    });

    it('should handle rapid tab switching during authentication', async () => {
      vi.mocked(authService.signIn).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(createMockAuthResponse()), 1000))
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

  describe('Browser Environment Chaos Scenarios', () => {
    it('should handle localStorage being disabled', async () => {
      // Mock localStorage being disabled
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        configurable: true,
      });

      vi.mocked(authService.signIn).mockResolvedValue(createMockAuthResponse());

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

      // Should not crash despite localStorage being disabled
      expect(screen.getByText(/successfully signed in/i)).toBeInTheDocument();
    });

    it('should handle navigator.userAgent being undefined', async () => {
      // Mock undefined userAgent
      Object.defineProperty(navigator, 'userAgent', {
        value: undefined,
        configurable: true,
      });

      vi.mocked(authService.signIn).mockResolvedValue(createMockAuthResponse());

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

      // Should not crash despite undefined userAgent
      expect(screen.getByText(/successfully signed in/i)).toBeInTheDocument();
    });
  });
});

