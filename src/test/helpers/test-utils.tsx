import { vi } from "vitest";
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import modernTheme from '../theme/modern-design-system';

// Mock Firebase
const mockFirebase = {
  auth: () => ({
    currentUser: null,
    onAuthStateChanged: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn()
  }),
  firestore: () => ({
    collection: vi.fn(),
    doc: vi.fn(),
    addDoc: vi.fn(),
    getDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn()
  }),
  analytics: () => ({
    logEvent: vi.fn(),
    setUserId: vi.fn(),
    setUserProperties: vi.fn()
  })
};

// Mock Firebase modules
vi.mock('../firebase/firebase-config', () => ({
  default: mockFirebase,
  db: mockFirebase.firestore(),
  auth: mockFirebase.auth(),
  analytics: mockFirebase.analytics()
}));

// Mock React Query
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  user?: any;
  route?: string;
}

const AllTheProviders = ({ 
  children, 
  queryClient = createTestQueryClient(),
  user = null,
  route = '/'
}: { 
  children: React.ReactNode;
  queryClient?: QueryClient;
  user?: any;
  route?: string;
}) => {
  // Mock user in localStorage if provided
  React.useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Mock route if provided
  React.useEffect(() => {
    if (route !== '/') {
      window.history.pushState({}, '', route);
    }
  }, [route]);

  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={modernTheme}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </ChakraProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient, user, route, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders 
        queryClient={queryClient} 
        user={user} 
        route={route}
      >
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  subscription: {
    plan: 'free',
    status: 'active'
  },
  team: {
    id: 'test-team-id',
    name: 'Test Team',
    role: 'owner'
  },
  ...overrides
});

export const createMockProUser = (overrides = {}) => createMockUser({
  subscription: {
    plan: 'pro',
    status: 'active',
    subscriptionId: 'sub_test_123'
  },
  ...overrides
});

export const createMockPlay = (overrides = {}) => ({
  id: 'test-play-id',
  name: 'Test Play',
  description: 'A test football play',
  formation: 'I-Formation',
  teamId: 'test-team-id',
  createdBy: 'test-user-id',
  isPublic: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockPractice = (overrides = {}) => ({
  id: 'test-practice-id',
  name: 'Test Practice',
  date: '2024-01-15',
  duration: 90,
  teamId: 'test-team-id',
  createdBy: 'test-user-id',
  drills: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockTeam = (overrides = {}) => ({
  id: 'test-team-id',
  name: 'Test Team',
  sport: 'Football',
  ageGroup: 'High School',
  season: 'Fall 2024',
  ownerId: 'test-user-id',
  members: ['test-user-id'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// Mock service responses
export const mockServiceResponse = (data: any, success = true) => ({
  success,
  data: success ? data : null,
  error: success ? null : data
});

export const mockFirebaseError = (code: string, message: string) => ({
  code,
  message,
  name: 'FirebaseError'
});

// Wait for async operations
export const waitForAsync = (ms = 0) => 
  new Promise(resolve => setTimeout(resolve, ms));

// Mock API responses
export const mockApiResponse = (data: any, status = 200) => ({
  status,
  data,
  headers: {},
  config: {},
  statusText: 'OK'
});

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock performance API
  Object.defineProperty(window, 'performance', {
    writable: true,
    value: {
      now: vi.fn(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByType: vi.fn(() => []),
      getEntriesByName: vi.fn(() => []),
      clearMarks: vi.fn(),
      clearMeasures: vi.fn(),
    },
  });
};

// Cleanup after tests
export const cleanupTestEnvironment = () => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  // Reset any global state
};





