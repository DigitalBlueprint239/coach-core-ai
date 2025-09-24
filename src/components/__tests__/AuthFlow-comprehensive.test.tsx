import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile } from '../../types/user';
import Login from '../../features/auth/Login';
import SignUp from '../../features/auth/Signup';
import { AuthProvider } from '../../components/AuthProvider';
import { authService } from '../../services/firebase/auth-service';

// Mock Firebase Auth
vi.mock('../../services/firebase/auth-service', () => ({
  authService: {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(),
    resetPassword: vi.fn(),
    sendEmailVerification: vi.fn(),
    updateProfile: vi.fn(),
    onAuthStateChange: vi.fn(() => () => {})
  }
}));

// Mock React Router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock Chakra UI toast
const mockToast = vi.fn();
vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual('@chakra-ui/react');
  return {
    ...actual,
    useToast: () => mockToast
  };
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <BrowserRouter>
          <AuthProvider>
            {children}
          </AuthProvider>
        </BrowserRouter>
      </ChakraProvider>
    </QueryClientProvider>
  );
};

describe('Authentication Flow - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Component', () => {
    it('should render login form with all required fields', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
    });

    it('should handle successful email/password login', async () => {
      const mockUser: FirebaseUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User'
      } as unknown as FirebaseUser;

      const mockProfile: UserProfile = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        isEmailVerified: true,
        subscription: 'free',
        subscriptionStatus: 'active',
        usage: { playsGeneratedThisMonth: 0, teamsCreated: 0 },
        preferences: { sport: 'football', timezone: 'UTC', notifications: { email: true, push: false, sms: false, marketing: false, updates: true, reminders: true }, theme: 'auto' },
        teams: [],
        role: 'coach',
        permissions: [],
      };

      vi.mocked(authService.signIn).mockResolvedValue({
        user: mockUser,
        profile: mockProfile
      });

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(authService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Welcome back! 🎉',
            status: 'success'
          })
        );
      });
    });

    it('should handle login errors gracefully', async () => {
      vi.mocked(authService.signIn).mockRejectedValue(new Error('Invalid credentials'));

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('should handle Google sign in', async () => {
      const mockUser: FirebaseUser = {
        uid: 'google-uid',
        email: 'test@gmail.com',
        displayName: 'Google User'
      } as unknown as FirebaseUser;

      const mockProfile: UserProfile = {
        uid: 'google-uid',
        email: 'test@gmail.com',
        displayName: 'Google User',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        isEmailVerified: true,
        subscription: 'free',
        subscriptionStatus: 'active',
        usage: { playsGeneratedThisMonth: 0, teamsCreated: 0 },
        preferences: { sport: 'football', timezone: 'UTC', notifications: { email: true, push: false, sms: false, marketing: false, updates: true, reminders: true }, theme: 'auto' },
        teams: [],
        role: 'coach',
        permissions: [],
      };

      vi.mocked(authService.signInWithGoogle).mockResolvedValue({
        user: mockUser,
        profile: mockProfile
      });

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const googleButton = screen.getByRole('button', { name: /sign in with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(authService.signInWithGoogle).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should validate email format before submission', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during authentication', async () => {
      vi.mocked(authService.signIn).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(signInButton);

      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    });
  });

  describe('Sign Up Component', () => {
    it('should render sign up form with all required fields', () => {
      render(
        <TestWrapper>
          <SignUp />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/confirm your password/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter team name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should handle successful user registration', async () => {
      const mockUser = {
        uid: 'new-user-uid',
        email: 'newuser@example.com',
        displayName: 'New User'
      };

      const mockProfile = {
        id: 'new-user-uid',
        email: 'newuser@example.com',
        displayName: 'New User',
        subscription: { plan: 'free', status: 'active' }
      };

      vi.mocked(authService.signUp).mockResolvedValue({
        user: mockUser,
        profile: mockProfile
      });

      render(
        <TestWrapper>
          <SignUp />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
      const nameInput = screen.getByPlaceholderText(/enter your name/i);
      const teamNameInput = screen.getByPlaceholderText(/enter team name/i);
      const signUpButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.change(nameInput, { target: { value: 'New User' } });
      fireEvent.change(teamNameInput, { target: { value: 'New Team' } });
      fireEvent.click(signUpButton);

      await waitFor(() => {
        expect(authService.signUp).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'password123',
          displayName: 'New User',
          sport: 'Basketball', // Default sport
          teamName: 'New Team'
        });
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should validate password confirmation', async () => {
      render(
        <TestWrapper>
          <SignUp />
        </TestWrapper>
      );

      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
      const signUpButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
      fireEvent.click(signUpButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should validate password strength', async () => {
      render(
        <TestWrapper>
          <SignUp />
        </TestWrapper>
      );

      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
      const signUpButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(passwordInput, { target: { value: 'weak' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'weak' } });
      fireEvent.click(signUpButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('should handle sign up errors', async () => {
      vi.mocked(authService.signUp).mockRejectedValue(new Error('Email already in use'));

      render(
        <TestWrapper>
          <SignUp />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
      const nameInput = screen.getByPlaceholderText(/enter your name/i);
      const teamNameInput = screen.getByPlaceholderText(/enter team name/i);
      const signUpButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(teamNameInput, { target: { value: 'Test Team' } });
      fireEvent.click(signUpButton);

      await waitFor(() => {
        expect(screen.getByText(/email already in use/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Reset Flow', () => {
    it('should handle password reset request', async () => {
      vi.mocked(authService.resetPassword).mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const forgotPasswordLink = screen.getByText(/forgot password/i);
      fireEvent.click(forgotPasswordLink);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const resetButton = screen.getByRole('button', { name: /send reset email/i });
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(authService.resetPassword).toHaveBeenCalledWith('test@example.com');
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Reset email sent',
            status: 'success'
          })
        );
      });
    });

    it('should handle password reset errors', async () => {
      vi.mocked(authService.resetPassword).mockRejectedValue(new Error('User not found'));

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const forgotPasswordLink = screen.getByText(/forgot password/i);
      fireEvent.click(forgotPasswordLink);

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } });

      const resetButton = screen.getByRole('button', { name: /send reset email/i });
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText(/user not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should prevent submission with empty fields', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should validate email format in real-time', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });

      fireEvent.change(emailInput, { target: { value: 'valid@example.com' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.queryByText(/invalid email format/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);

      fireEvent.keyDown(emailInput, { key: 'Tab' });
      expect(document.activeElement).toBe(passwordInput);

      fireEvent.keyDown(passwordInput, { key: 'Tab' });
      expect(document.activeElement).toBe(signInButton);
    });
  });

  describe('Error Recovery', () => {
    it('should clear errors when user starts typing', async () => {
      vi.mocked(authService.signIn).mockRejectedValue(new Error('Invalid credentials'));

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

      await waitFor(() => {
        expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument();
      });
    });
  });
});
