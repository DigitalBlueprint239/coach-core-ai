import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Chakra UI components
vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual('@chakra-ui/react');
  return {
    ...actual,
    ChakraProvider: ({ children }: { children: React.ReactNode }) => children,
    Box: ({ children, ...props }: any) => React.createElement('div', props, children),
    VStack: ({ children, ...props }: any) => React.createElement('div', props, children),
    HStack: ({ children, ...props }: any) => React.createElement('div', props, children),
    Stack: ({ children, ...props }: any) => React.createElement('div', props, children),
    Heading: ({ children, ...props }: any) => React.createElement('h1', props, children),
    Text: ({ children, ...props }: any) => React.createElement('p', props, children),
    Button: ({ children, ...props }: any) => React.createElement('button', props, children),
    Input: ({ ...props }: any) => React.createElement('input', props),
    InputGroup: ({ children, ...props }: any) => React.createElement('div', props, children),
    InputLeftElement: ({ children, ...props }: any) => React.createElement('div', props, children),
    InputRightElement: ({ children, ...props }: any) => React.createElement('div', props, children),
    FormControl: ({ children, ...props }: any) => React.createElement('div', props, children),
    FormLabel: ({ children, ...props }: any) => React.createElement('label', props, children),
    FormErrorMessage: ({ children, ...props }: any) => React.createElement('div', props, children),
    useToast: () => vi.fn(),
    Container: ({ children, ...props }: any) => React.createElement('div', props, children),
    Card: ({ children, ...props }: any) => React.createElement('div', props, children),
    CardBody: ({ children, ...props }: any) => React.createElement('div', props, children),
    CardHeader: ({ children, ...props }: any) => React.createElement('div', props, children),
    Tabs: ({ children, ...props }: any) => React.createElement('div', props, children),
    TabList: ({ children, ...props }: any) => React.createElement('div', props, children),
    TabPanels: ({ children, ...props }: any) => React.createElement('div', props, children),
    Tab: ({ children, ...props }: any) => React.createElement('div', props, children),
    TabPanel: ({ children, ...props }: any) => React.createElement('div', props, children),
    Divider: ({ ...props }: any) => React.createElement('hr', props),
    Icon: ({ ...props }: any) => React.createElement('span', props, 'icon'),
    Checkbox: ({ ...props }: any) => React.createElement('input', { type: 'checkbox', ...props }),
    Link: ({ children, ...props }: any) => React.createElement('a', props, children),
    Badge: ({ children, ...props }: any) => React.createElement('span', props, children),
    Alert: ({ children, ...props }: any) => React.createElement('div', props, children),
    AlertIcon: ({ ...props }: any) => React.createElement('span', props, '!'),
    AlertTitle: ({ children, ...props }: any) => React.createElement('div', props, children),
    AlertDescription: ({ children, ...props }: any) => React.createElement('div', props, children),
    Spinner: ({ ...props }: any) => React.createElement('div', props, 'Loading...'),
    Progress: ({ ...props }: any) => React.createElement('div', props, 'Progress'),
    Modal: ({ children, ...props }: any) => React.createElement('div', props, children),
    ModalOverlay: ({ children, ...props }: any) => React.createElement('div', props, children),
    ModalContent: ({ children, ...props }: any) => React.createElement('div', props, children),
    ModalHeader: ({ children, ...props }: any) => React.createElement('div', props, children),
    ModalBody: ({ children, ...props }: any) => React.createElement('div', props, children),
    ModalFooter: ({ children, ...props }: any) => React.createElement('div', props, children),
    ModalCloseButton: ({ ...props }: any) => React.createElement('button', props, '×'),
    useDisclosure: () => ({
      isOpen: false,
      onOpen: vi.fn(),
      onClose: vi.fn(),
      onToggle: vi.fn(),
    }),
    useBreakpointValue: (values: any) => values?.base || values,
    useColorMode: () => ({
      colorMode: 'light',
      toggleColorMode: vi.fn(),
    }),
    useColorModeValue: (light: any, dark: any) => light,
    keyframes: vi.fn(),
  };
});

// Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useParams: () => ({}),
  };
});

// Mock Firebase
vi.mock('../services/firebase/firebase-config', () => ({
  default: {},
  db: {},
  auth: {},
  storage: {},
}));

// Mock analytics
vi.mock('../services/analytics/ga4-config', () => ({
  ga4Service: {
    trackPageView: vi.fn(),
    trackSignupStarted: vi.fn(),
    trackSignupCompleted: vi.fn(),
    trackSignupSubmitted: vi.fn(),
    trackSubscriptionStarted: vi.fn(),
    trackSubscriptionCompleted: vi.fn(),
    trackTrialStarted: vi.fn(),
    trackTrialEnded: vi.fn(),
    trackConversion: vi.fn(),
    getMarketingAttribution: vi.fn(() => ({ source: 'direct', medium: 'none', campaign: 'none' })),
    getDebugInfo: vi.fn(() => ({ isInitialized: true, userId: null })),
    isReady: vi.fn(() => true),
  },
  ga4Analytics: {
    trackPageView: vi.fn(),
    trackSignupStarted: vi.fn(),
    trackSignupCompleted: vi.fn(),
    trackSignupSubmitted: vi.fn(),
    trackSubscriptionStarted: vi.fn(),
    trackSubscriptionCompleted: vi.fn(),
    trackTrialStarted: vi.fn(),
    trackTrialEnded: vi.fn(),
    trackConversion: vi.fn(),
    getMarketingAttribution: vi.fn(() => ({ source: 'direct', medium: 'none', campaign: 'none' })),
    getDebugInfo: vi.fn(() => ({ isInitialized: true, userId: null })),
    isReady: vi.fn(() => true),
  },
}));

// Mock auth service
vi.mock('../services/firebase/auth-service', () => ({
  authService: {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn(() => true),
  },
}));

// Mock subscription service
vi.mock('../services/payments/subscription-service', () => ({
  subscriptionService: {
    createSubscription: vi.fn(),
    getSubscription: vi.fn(),
    getUserSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
    getSubscriptionById: vi.fn(),
    getUserSubscriptions: vi.fn(),
    deleteSubscription: vi.fn(),
    isSubscriptionActive: vi.fn(),
    getSubscriptionTier: vi.fn(),
    trackUsage: vi.fn(),
    getUsageStats: vi.fn(),
    handleWebhook: vi.fn(),
    updateUserSubscription: vi.fn(),
  },
}));

// Mock waitlist service
vi.mock('../services/waitlist/waitlist-service', () => ({
  waitlistService: {
    addToWaitlist: vi.fn(),
    getWaitlistCount: vi.fn(),
    getAllWaitlistEntries: vi.fn(),
    getWaitlistEntriesBySource: vi.fn(),
  },
}));

// Test wrapper component
export const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(
      ChakraProvider,
      {},
      React.createElement(
        BrowserRouter,
        {},
        children
      )
    )
  );
};

// Custom render function
export const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: TestWrapper });
};

// Global test setup
beforeEach(() => {
  vi.clearAllMocks();
});
