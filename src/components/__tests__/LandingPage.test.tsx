import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { vi } from 'vitest';
import LandingPage from '../Landing/OptimizedLandingPage';
import modernTheme from '../../theme/modern-design-system';

// Mock the waitlist service
vi.mock('../../services/waitlist/waitlist-service', () => ({
  waitlistService: {
    addToWaitlist: vi.fn().mockResolvedValue({ success: true, id: 'test-id' }),
  },
}));

// Mock the analytics service
vi.mock('../../services/analytics/ga4-config', () => ({
  ga4Service: {
    trackPageView: vi.fn(),
    trackSignupSubmitted: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
  },
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

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the landing page with all sections', () => {
    renderWithProviders(<LandingPage />);
    
    expect(screen.getByText(/Coach Core AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Revolutionary AI-Powered/i)).toBeInTheDocument();
    expect(screen.getByText(/Join the Waitlist/i)).toBeInTheDocument();
  });

  it('displays the waitlist form', () => {
    renderWithProviders(<LandingPage />);
    
    const emailInput = screen.getByPlaceholderText(/Enter your email/i);
    const submitButton = screen.getByRole('button', { name: /Join the Waitlist/i });
    
    expect(emailInput).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
  });

  it('handles waitlist form submission', async () => {
    const { waitlistService } = await import('../../services/waitlist/waitlist-service');
    const { ga4Service } = await import('../../services/analytics/ga4-config');
    
    renderWithProviders(<LandingPage />);
    
    const emailInput = screen.getByPlaceholderText(/Enter your email/i);
    const submitButton = screen.getByRole('button', { name: /Join the Waitlist/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(waitlistService.addToWaitlist).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(Object)
      );
      expect(ga4Service.trackSignupSubmitted).toHaveBeenCalled();
    });
  });

  it('shows success message after successful signup', async () => {
    const { waitlistService } = await import('../../services/waitlist/waitlist-service');
    
    renderWithProviders(<LandingPage />);
    
    const emailInput = screen.getByPlaceholderText(/Enter your email/i);
    const submitButton = screen.getByRole('button', { name: /Join the Waitlist/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Thank you for joining/i)).toBeInTheDocument();
    });
  });

  it('shows error message for invalid email', async () => {
    renderWithProviders(<LandingPage />);
    
    const emailInput = screen.getByPlaceholderText(/Enter your email/i);
    const submitButton = screen.getByRole('button', { name: /Join the Waitlist/i });
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email/i)).toBeInTheDocument();
    });
  });

  it('tracks page view on mount', async () => {
    const { ga4Service } = await import('../../services/analytics/ga4-config');
    
    renderWithProviders(<LandingPage />);
    
    await waitFor(() => {
      expect(ga4Service.trackPageView).toHaveBeenCalledWith(
        'Landing Page',
        expect.any(Object)
      );
    });
  });
});
