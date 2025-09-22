import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChakraProvider from '@chakra-ui/react';
import BrowserRouter from 'react-router-dom';
import WaitlistForm from '../Waitlist/WaitlistForm';
import modernTheme from '../../theme/modern-design-system';

// Mock the waitlist service
vi.mock('../../services/waitlist/waitlist-service', () => ({
  waitlistService: {
    addToWaitlist: vi.fn(),
    checkEmailExists: vi.fn()
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

describe('WaitlistForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the waitlist form correctly', () => {
    renderWithProviders(<WaitlistForm />);
    
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join the waitlist/i })).toBeInTheDocument();
  });

  it('handles form submission with valid email', async () => {
    const { waitlistService } = await import('../../services/waitlist/waitlist-service');
    const { ga4Service } = await import('../../services/analytics/ga4-config');
    
    waitlistService.addToWaitlist.mockResolvedValue({
      success: true,
      id: 'test-id'
    });

    renderWithProviders(<WaitlistForm />);
    
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', { name: /join the waitlist/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(waitlistService.addToWaitlist).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(Object)
      );
      expect(ga4Service.trackEvent).toHaveBeenCalledWith(
        'waitlist_signup',
        expect.any(Object)
      );
    });
  });

  it('shows success message after successful submission', async () => {
    const { waitlistService } = await import('../../services/waitlist/waitlist-service');
    
    waitlistService.addToWaitlist.mockResolvedValue({
      success: true,
      id: 'test-id'
    });

    renderWithProviders(<WaitlistForm />);
    
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', { name: /join the waitlist/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/thank you for joining/i)).toBeInTheDocument();
    });
  });

  it('shows error message for invalid email', async () => {
    const { waitlistService } = await import('../../services/waitlist/waitlist-service');
    
    waitlistService.addToWaitlist.mockResolvedValue({
      success: false,
      error: 'Invalid email format'
    });

    renderWithProviders(<WaitlistForm />);
    
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', { name: /join the waitlist/i });
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  it('shows error message for duplicate email', async () => {
    const { waitlistService } = await import('../../services/waitlist/waitlist-service');
    
    waitlistService.addToWaitlist.mockResolvedValue({
      success: false,
      error: 'Email already exists'
    });

    renderWithProviders(<WaitlistForm />);
    
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', { name: /join the waitlist/i });
    
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    const { waitlistService } = await import('../../services/waitlist/waitlist-service');
    
    // Mock delayed response
    waitlistService.addToWaitlist.mockImplementation(
      () => new Promise(resolve => 
        setTimeout(() => resolve({ success: true, id: 'test-id' }), 1000)
      )
    );

    renderWithProviders(<WaitlistForm />);
    
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', { name: /join the waitlist/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    // Check loading state
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/joining/i)).toBeInTheDocument();
  });

  it('validates email format before submission', () => {
    renderWithProviders(<WaitlistForm />);
    
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', { name: /join the waitlist/i });
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);
    
    expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
  });

  it('clears form after successful submission', async () => {
    const { waitlistService } = await import('../../services/waitlist/waitlist-service');
    
    waitlistService.addToWaitlist.mockResolvedValue({
      success: true,
      id: 'test-id'
    });

    renderWithProviders(<WaitlistForm />);
    
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', { name: /join the waitlist/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/thank you for joining/i)).toBeInTheDocument();
    });
    
    // Form should be cleared
    expect(emailInput).toHaveValue('');
  });

  it('handles network errors gracefully', async () => {
    const { waitlistService } = await import('../../services/waitlist/waitlist-service');
    
    waitlistService.addToWaitlist.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<WaitlistForm />);
    
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', { name: /join the waitlist/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('tracks analytics events correctly', async () => {
    const { waitlistService } = await import('../../services/waitlist/waitlist-service');
    const { ga4Service } = await import('../../services/analytics/ga4-config');
    
    waitlistService.addToWaitlist.mockResolvedValue({
      success: true,
      id: 'test-id'
    });

    renderWithProviders(<WaitlistForm />);
    
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', { name: /join the waitlist/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(ga4Service.trackEvent).toHaveBeenCalledWith(
        'waitlist_signup',
        {
          email: 'test@example.com',
          source: 'waitlist-form'
        }
      );
    });
  });
});


