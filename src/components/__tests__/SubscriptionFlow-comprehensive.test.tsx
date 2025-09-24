import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import SubscriptionDashboard from '../../components/subscription/SubscriptionDashboard';
import SubscriptionPlans from '../../components/subscription/SubscriptionPlans';
import { useSubscription } from '../../hooks/useSubscription';
import { subscriptionService } from '../../services/payments/subscription-service';
import { stripeCheckoutService } from '../../services/payments/stripe-checkout';

// Mock subscription hook
const mockUseSubscription = {
  userProfile: null,
  subscription: null,
  isLoading: false,
  error: null,
  loadUserData: vi.fn(),
  upgradeSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  updatePaymentMethod: vi.fn()
};

vi.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription
}));

// Mock subscription service
vi.mock('../../services/payments/subscription-service', () => ({
  subscriptionService: {
    getUserProfile: vi.fn(),
    getUserSubscription: vi.fn(),
    createSubscription: vi.fn(),
    updateSubscriptionPlan: vi.fn(),
    cancelSubscription: vi.fn(),
    addPaymentMethod: vi.fn(),
    getPaymentMethods: vi.fn(),
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn(),
    handleWebhookEvent: vi.fn()
  }
}));

// Mock Stripe checkout service
vi.mock('../../services/payments/stripe-checkout', () => ({
  stripeCheckoutService: {
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn()
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

describe('Subscription Flow - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SubscriptionPlans Component', () => {
    it('should render all subscription tiers', () => {
      render(
        <TestWrapper>
          <SubscriptionPlans />
        </TestWrapper>
      );

      expect(screen.getByText(/free plan/i)).toBeInTheDocument();
      expect(screen.getByText(/pro plan/i)).toBeInTheDocument();
      expect(screen.getByText(/enterprise plan/i)).toBeInTheDocument();
    });

    it('should display pricing information correctly', () => {
      render(
        <TestWrapper>
          <SubscriptionPlans />
        </TestWrapper>
      );

      expect(screen.getByText(/\$0/i)).toBeInTheDocument(); // Free plan
      expect(screen.getByText(/\$29\.99/i)).toBeInTheDocument(); // Pro plan
      expect(screen.getByText(/\$99\.99/i)).toBeInTheDocument(); // Enterprise plan
    });

    it('should show plan features for each tier', () => {
      render(
        <TestWrapper>
          <SubscriptionPlans />
        </TestWrapper>
      );

      // Free plan features
      expect(screen.getByText(/basic features/i)).toBeInTheDocument();
      expect(screen.getByText(/limited plays/i)).toBeInTheDocument();

      // Pro plan features
      expect(screen.getByText(/advanced features/i)).toBeInTheDocument();
      expect(screen.getByText(/unlimited plays/i)).toBeInTheDocument();

      // Enterprise plan features
      expect(screen.getByText(/premium features/i)).toBeInTheDocument();
      expect(screen.getByText(/priority support/i)).toBeInTheDocument();
    });

    it('should handle plan selection', async () => {
      vi.mocked(stripeCheckoutService.createCheckoutSession).mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test'
      });

      render(
        <TestWrapper>
          <SubscriptionPlans />
        </TestWrapper>
      );

      const proPlanButton = screen.getByRole('button', { name: /select pro plan/i });
      fireEvent.click(proPlanButton);

      await waitFor(() => {
        expect(stripeCheckoutService.createCheckoutSession).toHaveBeenCalledWith(
          'pro',
          expect.any(String),
          expect.any(String)
        );
      });
    });

    it('should handle checkout errors gracefully', async () => {
      vi.mocked(stripeCheckoutService.createCheckoutSession).mockRejectedValue(
        new Error('Checkout session creation failed')
      );

      render(
        <TestWrapper>
          <SubscriptionPlans />
        </TestWrapper>
      );

      const proPlanButton = screen.getByRole('button', { name: /select pro plan/i });
      fireEvent.click(proPlanButton);

      await waitFor(() => {
        expect(screen.getByText(/checkout session creation failed/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during checkout', async () => {
      vi.mocked(stripeCheckoutService.createCheckoutSession).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(
        <TestWrapper>
          <SubscriptionPlans />
        </TestWrapper>
      );

      const proPlanButton = screen.getByRole('button', { name: /select pro plan/i });
      fireEvent.click(proPlanButton);

      expect(screen.getByText(/creating checkout session/i)).toBeInTheDocument();
    });
  });

  describe('SubscriptionDashboard Component', () => {
    it('should render dashboard for free user', () => {
      mockUseSubscription.userProfile = {
        userId: 'test-user',
        email: 'test@example.com',
        subscription: { plan: 'free', status: 'active' },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockUseSubscription.subscription = null as any;

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/free plan/i)).toBeInTheDocument();
      expect(screen.getByText(/upgrade to pro/i)).toBeInTheDocument();
    });

    it('should render dashboard for pro user', () => {
      mockUseSubscription.userProfile = {
        userId: 'test-user',
        email: 'test@example.com',
        subscription: { plan: 'pro', status: 'active' },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockUseSubscription.subscription = {
        id: 'sub_test_123',
        userId: 'test-user',
        status: 'active',
        plan: 'pro',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/pro plan/i)).toBeInTheDocument();
      expect(screen.getByText(/manage subscription/i)).toBeInTheDocument();
    });

    it('should show subscription details', () => {
      mockUseSubscription.subscription = {
        id: 'sub_test_123',
        userId: 'test-user',
        status: 'active',
        plan: 'pro',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-01-31')
      };

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/subscription id: sub_test_123/i)).toBeInTheDocument();
      expect(screen.getByText(/status: active/i)).toBeInTheDocument();
      expect(screen.getByText(/plan: pro/i)).toBeInTheDocument();
    });

    it('should handle subscription management', async () => {
      vi.mocked(stripeCheckoutService.createPortalSession).mockResolvedValue({
        id: 'ps_test_123',
        url: 'https://billing.stripe.com/test'
      });

      mockUseSubscription.subscription = {
        id: 'sub_test_123',
        userId: 'test-user',
        status: 'active',
        plan: 'pro',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      const manageButton = screen.getByRole('button', { name: /manage subscription/i });
      fireEvent.click(manageButton);

      await waitFor(() => {
        expect(stripeCheckoutService.createPortalSession).toHaveBeenCalledWith(
          'test-user',
          expect.any(String)
        );
      });
    });

    it('should show usage statistics for pro users', () => {
      mockUseSubscription.userProfile = {
        userId: 'test-user',
        email: 'test@example.com',
        subscription: { plan: 'pro', status: 'active' },
        createdAt: new Date(),
        updatedAt: new Date(),
        usage: {
          playsGenerated: 45,
          practicesPlanned: 12,
          teamMembers: 15,
          storageUsed: 2.5
        }
      };

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/plays generated: 45/i)).toBeInTheDocument();
      expect(screen.getByText(/practices planned: 12/i)).toBeInTheDocument();
      expect(screen.getByText(/team members: 15/i)).toBeInTheDocument();
      expect(screen.getByText(/storage used: 2\.5 gb/i)).toBeInTheDocument();
    });

    it('should show billing information', () => {
      mockUseSubscription.subscription = {
        id: 'sub_test_123',
        userId: 'test-user',
        status: 'active',
        plan: 'pro',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-01-31'),
        amount: 2999,
        currency: 'usd'
      };

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/\$29\.99/i)).toBeInTheDocument();
      expect(screen.getByText(/billing cycle: monthly/i)).toBeInTheDocument();
      expect(screen.getByText(/next billing date: january 31, 2024/i)).toBeInTheDocument();
    });
  });

  describe('Subscription Upgrade Flow', () => {
    it('should handle successful upgrade from free to pro', async () => {
      vi.mocked(stripeCheckoutService.createCheckoutSession).mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test'
      });

      mockUseSubscription.userProfile = {
        userId: 'test-user',
        email: 'test@example.com',
        subscription: { plan: 'free', status: 'active' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      const upgradeButton = screen.getByRole('button', { name: /upgrade to pro/i });
      fireEvent.click(upgradeButton);

      await waitFor(() => {
        expect(stripeCheckoutService.createCheckoutSession).toHaveBeenCalledWith(
          'pro',
          expect.any(String),
          expect.any(String)
        );
      });
    });

    it('should handle upgrade errors', async () => {
      vi.mocked(stripeCheckoutService.createCheckoutSession).mockRejectedValue(
        new Error('Payment method required')
      );

      mockUseSubscription.userProfile = {
        userId: 'test-user',
        email: 'test@example.com',
        subscription: { plan: 'free', status: 'active' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      const upgradeButton = screen.getByRole('button', { name: /upgrade to pro/i });
      fireEvent.click(upgradeButton);

      await waitFor(() => {
        expect(screen.getByText(/payment method required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Subscription Cancellation Flow', () => {
    it('should handle subscription cancellation', async () => {
      vi.mocked(subscriptionService.cancelSubscription).mockResolvedValue({
        success: true,
        message: 'Subscription cancelled successfully'
      });

      mockUseSubscription.subscription = {
        id: 'sub_test_123',
        userId: 'test-user',
        status: 'active',
        plan: 'pro',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      const cancelButton = screen.getByRole('button', { name: /cancel subscription/i });
      fireEvent.click(cancelButton);

      // Confirm cancellation
      const confirmButton = screen.getByRole('button', { name: /yes, cancel/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(subscriptionService.cancelSubscription).toHaveBeenCalledWith('sub_test_123');
        expect(screen.getByText(/subscription cancelled successfully/i)).toBeInTheDocument();
      });
    });

    it('should handle cancellation errors', async () => {
      vi.mocked(subscriptionService.cancelSubscription).mockRejectedValue(
        new Error('Unable to cancel subscription')
      );

      mockUseSubscription.subscription = {
        id: 'sub_test_123',
        userId: 'test-user',
        status: 'active',
        plan: 'pro',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      const cancelButton = screen.getByRole('button', { name: /cancel subscription/i });
      fireEvent.click(cancelButton);

      const confirmButton = screen.getByRole('button', { name: /yes, cancel/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/unable to cancel subscription/i)).toBeInTheDocument();
      });
    });
  });

  describe('Payment Method Management', () => {
    it('should display current payment methods', async () => {
      vi.mocked(subscriptionService.getPaymentMethods).mockResolvedValue([
        {
          id: 'pm_1',
          type: 'card',
          card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2025 }
        },
        {
          id: 'pm_2',
          type: 'card',
          card: { brand: 'mastercard', last4: '5555', exp_month: 6, exp_year: 2026 }
        }
      ]);

      mockUseSubscription.subscription = {
        id: 'sub_test_123',
        userId: 'test-user',
        status: 'active',
        plan: 'pro',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      const managePaymentButton = screen.getByRole('button', { name: /manage payment methods/i });
      fireEvent.click(managePaymentButton);

      await waitFor(() => {
        expect(screen.getByText(/visa \*\*\*\* 4242/i)).toBeInTheDocument();
        expect(screen.getByText(/mastercard \*\*\*\* 5555/i)).toBeInTheDocument();
      });
    });

    it('should handle adding new payment method', async () => {
      vi.mocked(subscriptionService.addPaymentMethod).mockResolvedValue({
        success: true,
        message: 'Payment method added successfully'
      });

      mockUseSubscription.subscription = {
        id: 'sub_test_123',
        userId: 'test-user',
        status: 'active',
        plan: 'pro',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      const addPaymentButton = screen.getByRole('button', { name: /add payment method/i });
      fireEvent.click(addPaymentButton);

      await waitFor(() => {
        expect(screen.getByText(/payment method added successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state while fetching subscription data', () => {
      mockUseSubscription.isLoading = true;

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/loading subscription data/i)).toBeInTheDocument();
    });

    it('should show error state when subscription data fails to load', () => {
      mockUseSubscription.error = 'Failed to load subscription data';

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/failed to load subscription data/i)).toBeInTheDocument();
    });

    it('should retry loading subscription data', async () => {
      mockUseSubscription.error = 'Failed to load subscription data';
      mockUseSubscription.loadUserData = vi.fn();

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockUseSubscription.loadUserData).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      mockUseSubscription.userProfile = {
        userId: 'test-user',
        email: 'test@example.com',
        subscription: { plan: 'free', status: 'active' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText(/subscription dashboard/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upgrade to pro/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      mockUseSubscription.userProfile = {
        userId: 'test-user',
        email: 'test@example.com',
        subscription: { plan: 'free', status: 'active' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      const upgradeButton = screen.getByRole('button', { name: /upgrade to pro/i });
      upgradeButton.focus();
      expect(document.activeElement).toBe(upgradeButton);

      fireEvent.keyDown(upgradeButton, { key: 'Enter' });
      expect(upgradeButton).toHaveBeenCalled();
    });
  });

  describe('Subscription Status Handling', () => {
    it('should handle past due subscription status', () => {
      mockUseSubscription.subscription = {
        id: 'sub_test_123',
        userId: 'test-user',
        status: 'past_due',
        plan: 'pro',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000) // Past due
      };

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/subscription past due/i)).toBeInTheDocument();
      expect(screen.getByText(/update payment method/i)).toBeInTheDocument();
    });

    it('should handle cancelled subscription status', () => {
      mockUseSubscription.subscription = {
        id: 'sub_test_123',
        userId: 'test-user',
        status: 'canceled',
        plan: 'pro',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000)
      };

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/subscription cancelled/i)).toBeInTheDocument();
      expect(screen.getByText(/reactivate subscription/i)).toBeInTheDocument();
    });

    it('should handle trialing subscription status', () => {
      mockUseSubscription.subscription = {
        id: 'sub_test_123',
        userId: 'test-user',
        status: 'trialing',
        plan: 'pro',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days trial
      };

      render(
        <TestWrapper>
          <SubscriptionDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/trial period/i)).toBeInTheDocument();
      expect(screen.getByText(/trial ends in 7 days/i)).toBeInTheDocument();
    });
  });
});


