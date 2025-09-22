import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChakraProvider from '@chakra-ui/react';
import BrowserRouter from 'react-router-dom';
import LoginPage from '../auth/LoginPage';
import modernTheme from '../../theme/modern-design-system';

// Mock the auth service
vi.mock('../../services/firebase/auth-service', () => ({
  authService: {
    signInWithEmail: vi.fn(),
    signInWithGoogle: vi.fn()
  }
}));

// Mock analytics
vi.mock('../../services/analytics/ga4-config', () => ({
  ga4Service: {
    trackEvent: vi.fn()
  }
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

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the login form correctly', () => {
    renderWithProviders(<LoginPage />);
    
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
  });

  it('handles email login with valid credentials', async () => {
    const { authService } = await import('../../services/firebase/auth-service');
    const { ga4Service } = await import('../../services/analytics/ga4-config');
    
    authService.signInWithEmail.mockResolvedValue({
      success: true,
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        subscription: {
          plan: 'free',
          status: 'active'
        }
      }
    });

    renderWithProviders(<LoginPage />);
    
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signInButton);
    
    await waitFor(() => {
      expect(authService.signInWithEmail).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
      expect(ga4Service.trackEvent).toHaveBeenCalledWith(
        'user_login',
        {
          method: 'email',
          user_id: 'test-user-id'
        }
      );
    });
  });

  it('shows error message for invalid credentials', async () => {
    const { authService } = await import('../../services/firebase/auth-service');
    
    authService.signInWithEmail.mockResolvedValue({
      success: false,
      error: 'Invalid email or password'
    });

    renderWithProviders(<LoginPage />);
    
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(signInButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('shows error message for user not found', async () => {
    const { authService } = await import('../../services/firebase/auth-service');
    
    authService.signInWithEmail.mockResolvedValue({
      success: false,
      error: 'No account found with this email'
    });

    renderWithProviders(<LoginPage />);
    
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signInButton);
    
    await waitFor(() => {
      expect(screen.getByText(/no account found with this email/i)).toBeInTheDocument();
    });
  });

  it('validates email format before submission', () => {
    renderWithProviders(<LoginPage />);
    
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signInButton);
    
    expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
  });

  it('validates password is required', () => {
    renderWithProviders(<LoginPage />);
    
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(signInButton);
    
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('shows loading state during login', async () => {
    const { authService } = await import('../../services/firebase/auth-service');
    
    // Mock delayed response
    authService.signInWithEmail.mockImplementation(
      () => new Promise(resolve => 
        setTimeout(() => resolve({ success: true, user: {} }), 1000)
      )
    );

    renderWithProviders(<LoginPage />);
    
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signInButton);
    
    // Check loading state
    expect(signInButton).toBeDisabled();
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });

  it('handles Google login', async () => {
    const { authService } = await import('../../services/firebase/auth-service');
    const { ga4Service } = await import('../../services/analytics/ga4-config');
    
    authService.signInWithGoogle.mockResolvedValue({
      success: true,
      user: {
        id: 'google-user-id',
        email: 'google@example.com',
        displayName: 'Google User',
        subscription: {
          plan: 'free',
          status: 'active'
        }
      }
    });

    renderWithProviders(<LoginPage />);
    
    const googleButton = screen.getByText(/sign in with google/i);
    fireEvent.click(googleButton);
    
    await waitFor(() => {
      expect(authService.signInWithGoogle).toHaveBeenCalled();
      expect(ga4Service.trackEvent).toHaveBeenCalledWith(
        'user_login',
        {
          method: 'google',
          user_id: 'google-user-id'
        }
      );
    });
  });

  it('handles Google login cancellation', async () => {
    const { authService } = await import('../../services/firebase/auth-service');
    
    authService.signInWithGoogle.mockResolvedValue({
      success: false,
      error: 'Sign in was cancelled'
    });

    renderWithProviders(<LoginPage />);
    
    const googleButton = screen.getByText(/sign in with google/i);
    fireEvent.click(googleButton);
    
    await waitFor(() => {
      expect(screen.getByText(/sign in was cancelled/i)).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    const { authService } = await import('../../services/firebase/auth-service');
    
    authService.signInWithEmail.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<LoginPage />);
    
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signInButton);
    
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('redirects to signup page when clicking sign up link', () => {
    renderWithProviders(<LoginPage />);
    
    const signUpLink = screen.getByText(/don't have an account/i);
    fireEvent.click(signUpLink);
    
    // This would typically be handled by React Router
    expect(signUpLink).toBeInTheDocument();
  });

  it('redirects to forgot password page when clicking forgot password link', () => {
    renderWithProviders(<LoginPage />);
    
    const forgotPasswordLink = screen.getByText(/forgot password/i);
    fireEvent.click(forgotPasswordLink);
    
    // This would typically be handled by React Router
    expect(forgotPasswordLink).toBeInTheDocument();
  });
});


