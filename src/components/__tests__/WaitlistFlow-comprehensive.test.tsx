import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChakraProvider from '@chakra-ui/react';
import BrowserRouter from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import LandingPage from '../../components/Landing/LandingPage';
import WaitlistPage from '../../components/Waitlist/WaitlistPage';
import WaitlistForm from '../../components/Waitlist/WaitlistForm';
import { waitlistService } from '../../services/waitlist/waitlist-service';

// Mock waitlist service
vi.mock('../../services/waitlist/waitlist-service', () => ({
  waitlistService: {
    addToWaitlist: vi.fn(),
    getWaitlistCount: vi.fn(),
    getAllWaitlistEntries: vi.fn()
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
          {children}
        </BrowserRouter>
      </ChakraProvider>
    </QueryClientProvider>
  );
};

describe('Waitlist Flow - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WaitlistForm Component', () => {
    it('should render waitlist form with all required fields', () => {
      render(
        <TestWrapper>
          <WaitlistForm />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your name/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /role/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument();
    });

    it('should handle successful waitlist signup', async () => {
      vi.mocked(waitlistService.addToWaitlist).mockResolvedValue({
        success: true,
        message: 'Successfully added to waitlist!'
      });

      render(
        <TestWrapper>
          <WaitlistForm />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const nameInput = screen.getByPlaceholderText(/enter your name/i);
      const roleSelect = screen.getByRole('combobox', { name: /role/i });
      const submitButton = screen.getByRole('button', { name: /join waitlist/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(roleSelect, { target: { value: 'head-coach' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(waitlistService.addToWaitlist).toHaveBeenCalledWith(
          'test@example.com',
          'landing-page',
          expect.objectContaining({
            name: 'Test User',
            role: 'head-coach'
          })
        );
        expect(screen.getByText(/successfully added to waitlist/i)).toBeInTheDocument();
      });
    });

    it('should handle waitlist signup errors', async () => {
      vi.mocked(waitlistService.addToWaitlist).mockRejectedValue(
        new Error('Email already exists in waitlist')
      );

      render(
        <TestWrapper>
          <WaitlistForm />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const nameInput = screen.getByPlaceholderText(/enter your name/i);
      const roleSelect = screen.getByRole('combobox', { name: /role/i });
      const submitButton = screen.getByRole('button', { name: /join waitlist/i });

      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(roleSelect, { target: { value: 'head-coach' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email already exists in waitlist/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(
        <TestWrapper>
          <WaitlistForm />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const submitButton = screen.getByRole('button', { name: /join waitlist/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    it('should validate required fields', async () => {
      render(
        <TestWrapper>
          <WaitlistForm />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /join waitlist/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/role is required/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      vi.mocked(waitlistService.addToWaitlist).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(
        <TestWrapper>
          <WaitlistForm />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const nameInput = screen.getByPlaceholderText(/enter your name/i);
      const roleSelect = screen.getByRole('combobox', { name: /role/i });
      const submitButton = screen.getByRole('button', { name: /join waitlist/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(roleSelect, { target: { value: 'head-coach' } });
      fireEvent.click(submitButton);

      expect(screen.getByText(/joining waitlist/i)).toBeInTheDocument();
    });

    it('should clear form after successful submission', async () => {
      vi.mocked(waitlistService.addToWaitlist).mockResolvedValue({
        success: true,
        message: 'Successfully added to waitlist!'
      });

      render(
        <TestWrapper>
          <WaitlistForm />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const nameInput = screen.getByPlaceholderText(/enter your name/i);
      const roleSelect = screen.getByRole('combobox', { name: /role/i });
      const submitButton = screen.getByRole('button', { name: /join waitlist/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(roleSelect, { target: { value: 'head-coach' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toHaveValue('');
        expect(nameInput).toHaveValue('');
        expect(roleSelect).toHaveValue('');
      });
    });
  });

  describe('LandingPage Component', () => {
    it('should render landing page with waitlist form', () => {
      render(
        <TestWrapper>
          <LandingPage />
        </TestWrapper>
      );

      expect(screen.getByText(/coach core ai/i)).toBeInTheDocument();
      expect(screen.getByText(/ai-powered coaching platform/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    });

    it('should handle waitlist signup from landing page', async () => {
      vi.mocked(waitlistService.addToWaitlist).mockResolvedValue({
        success: true,
        message: 'Successfully added to waitlist!'
      });

      render(
        <TestWrapper>
          <LandingPage />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const submitButton = screen.getByRole('button', { name: /join waitlist/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(waitlistService.addToWaitlist).toHaveBeenCalledWith(
          'test@example.com',
          'landing-page'
        );
      });
    });

    it('should display waitlist count if available', async () => {
      vi.mocked(waitlistService.getWaitlistCount).mockResolvedValue(1250);

      render(
        <TestWrapper>
          <LandingPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/1,250 coaches/i)).toBeInTheDocument();
      });
    });

    it('should handle waitlist count errors gracefully', async () => {
      vi.mocked(waitlistService.getWaitlistCount).mockRejectedValue(
        new Error('Failed to fetch count')
      );

      render(
        <TestWrapper>
          <LandingPage />
        </TestWrapper>
      );

      // Should not crash and should render without count
      expect(screen.getByText(/coach core ai/i)).toBeInTheDocument();
    });
  });

  describe('WaitlistPage Component', () => {
    it('should render waitlist page with features and benefits', () => {
      render(
        <TestWrapper>
          <WaitlistPage />
        </TestWrapper>
      );

      expect(screen.getByText(/ai-powered play generation/i)).toBeInTheDocument();
      expect(screen.getByText(/smart practice planning/i)).toBeInTheDocument();
      expect(screen.getByText(/team management/i)).toBeInTheDocument();
      expect(screen.getByText(/performance analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/real-time collaboration/i)).toBeInTheDocument();
      expect(screen.getByText(/offline support/i)).toBeInTheDocument();
    });

    it('should display benefits list', () => {
      render(
        <TestWrapper>
          <WaitlistPage />
        </TestWrapper>
      );

      expect(screen.getByText(/save 10\+ hours per week on planning/i)).toBeInTheDocument();
      expect(screen.getByText(/improve team performance by 25%/i)).toBeInTheDocument();
      expect(screen.getByText(/access to 1000\+ professional drills/i)).toBeInTheDocument();
      expect(screen.getByText(/real-time collaboration tools/i)).toBeInTheDocument();
      expect(screen.getByText(/mobile-first design/i)).toBeInTheDocument();
      expect(screen.getByText(/enterprise-grade security/i)).toBeInTheDocument();
    });

    it('should include waitlist form', () => {
      render(
        <TestWrapper>
          <WaitlistPage />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument();
    });
  });

  describe('Email Validation', () => {
    it('should accept valid email addresses', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org',
        'user123@test-domain.com'
      ];

      for (const email of validEmails) {
        vi.mocked(waitlistService.addToWaitlist).mockResolvedValue({
          success: true,
          message: 'Successfully added to waitlist!'
        });

        render(
          <TestWrapper>
            <WaitlistForm />
          </TestWrapper>
        );

        const emailInput = screen.getByPlaceholderText(/enter your email/i);
        const nameInput = screen.getByPlaceholderText(/enter your name/i);
        const roleSelect = screen.getByRole('combobox', { name: /role/i });
        const submitButton = screen.getByRole('button', { name: /join waitlist/i });

        fireEvent.change(emailInput, { target: { value: email } });
        fireEvent.change(nameInput, { target: { value: 'Test User' } });
        fireEvent.change(roleSelect, { target: { value: 'head-coach' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(waitlistService.addToWaitlist).toHaveBeenCalledWith(
            email,
            'landing-page',
            expect.any(Object)
          );
        });

        // Clean up for next iteration
        vi.clearAllMocks();
      }
    });

    it('should reject invalid email addresses', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
        '',
        'test@.com',
        'test@example.',
        'test space@example.com'
      ];

      for (const email of invalidEmails) {
        render(
          <TestWrapper>
            <WaitlistForm />
          </TestWrapper>
        );

        const emailInput = screen.getByPlaceholderText(/enter your email/i);
        const submitButton = screen.getByRole('button', { name: /join waitlist/i });

        fireEvent.change(emailInput, { target: { value: email } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
        });

        // Clean up for next iteration
        vi.clearAllMocks();
      }
    });
  });

  describe('Role Selection', () => {
    it('should allow selection of different roles', async () => {
      const roles = ['head-coach', 'assistant-coach', 'parent', 'player'];

      for (const role of roles) {
        vi.mocked(waitlistService.addToWaitlist).mockResolvedValue({
          success: true,
          message: 'Successfully added to waitlist!'
        });

        render(
          <TestWrapper>
            <WaitlistForm />
          </TestWrapper>
        );

        const emailInput = screen.getByPlaceholderText(/enter your email/i);
        const nameInput = screen.getByPlaceholderText(/enter your name/i);
        const roleSelect = screen.getByRole('combobox', { name: /role/i });
        const submitButton = screen.getByRole('button', { name: /join waitlist/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(nameInput, { target: { value: 'Test User' } });
        fireEvent.change(roleSelect, { target: { value: role } });
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(waitlistService.addToWaitlist).toHaveBeenCalledWith(
            'test@example.com',
            'landing-page',
            expect.objectContaining({ role })
          );
        });

        // Clean up for next iteration
        vi.clearAllMocks();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(waitlistService.addToWaitlist).mockRejectedValue(
        new Error('Network error')
      );

      render(
        <TestWrapper>
          <WaitlistForm />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const nameInput = screen.getByPlaceholderText(/enter your name/i);
      const roleSelect = screen.getByRole('combobox', { name: /role/i });
      const submitButton = screen.getByRole('button', { name: /join waitlist/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(roleSelect, { target: { value: 'head-coach' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should handle rate limiting errors', async () => {
      vi.mocked(waitlistService.addToWaitlist).mockRejectedValue(
        new Error('Too many requests. Please try again later.')
      );

      render(
        <TestWrapper>
          <WaitlistForm />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const nameInput = screen.getByPlaceholderText(/enter your name/i);
      const roleSelect = screen.getByRole('combobox', { name: /role/i });
      const submitButton = screen.getByRole('button', { name: /join waitlist/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(roleSelect, { target: { value: 'head-coach' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <WaitlistForm />
        </TestWrapper>
      );

      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <WaitlistForm />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const nameInput = screen.getByPlaceholderText(/enter your name/i);
      const roleSelect = screen.getByRole('combobox', { name: /role/i });
      const submitButton = screen.getByRole('button', { name: /join waitlist/i });

      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);

      fireEvent.keyDown(emailInput, { key: 'Tab' });
      expect(document.activeElement).toBe(nameInput);

      fireEvent.keyDown(nameInput, { key: 'Tab' });
      expect(document.activeElement).toBe(roleSelect);

      fireEvent.keyDown(roleSelect, { key: 'Tab' });
      expect(document.activeElement).toBe(submitButton);
    });
  });

  describe('Success States', () => {
    it('should show success message after successful signup', async () => {
      vi.mocked(waitlistService.addToWaitlist).mockResolvedValue({
        success: true,
        message: 'Successfully added to waitlist!'
      });

      render(
        <TestWrapper>
          <WaitlistForm />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const nameInput = screen.getByPlaceholderText(/enter your name/i);
      const roleSelect = screen.getByRole('combobox', { name: /role/i });
      const submitButton = screen.getByRole('button', { name: /join waitlist/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(roleSelect, { target: { value: 'head-coach' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/successfully added to waitlist/i)).toBeInTheDocument();
        expect(screen.getByText(/thank you for joining/i)).toBeInTheDocument();
      });
    });

    it('should show next steps after successful signup', async () => {
      vi.mocked(waitlistService.addToWaitlist).mockResolvedValue({
        success: true,
        message: 'Successfully added to waitlist!'
      });

      render(
        <TestWrapper>
          <WaitlistForm />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const nameInput = screen.getByPlaceholderText(/enter your name/i);
      const roleSelect = screen.getByRole('combobox', { name: /role/i });
      const submitButton = screen.getByRole('button', { name: /join waitlist/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(roleSelect, { target: { value: 'head-coach' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/we'll notify you when we launch/i)).toBeInTheDocument();
        expect(screen.getByText(/follow us on social media/i)).toBeInTheDocument();
      });
    });
  });
});


