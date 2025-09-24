import React, { useState, useEffect, Suspense, useContext, lazy } from 'react';
// Import React context polyfill to fix createContext issues
import './utils/react-context-polyfill';

// Feature flags for production readiness
const FEATURE_FLAGS = {
  PRACTICE_PLANNER: false,
  ADVANCED_PLAYBOOK: false,
  COMPLEX_ANALYTICS: false,
  LEGACY_SUBSCRIPTIONS: false,
  ADVANCED_MONITORING: false,
  MOBILE_FEATURES: false,
} as const;
import {
  ChakraProvider,
  Spinner,
  Button,
  VStack,
  Box,
  Center,
  Text,
} from '@chakra-ui/react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ErrorBoundary } from '@sentry/react';
import ProductionErrorBoundary from './components/ErrorBoundary/ProductionErrorBoundary';
import modernTheme from './theme/modern-design-system';
import ModernNavigation from './components/navigation/ModernNavigation';
import { authService, AuthState } from './services/firebase/auth-service';
import { AuthContext } from './hooks/useAuth';
import { initMonitoring } from './services/monitoring';
import { initAnalytics } from './services/analytics';
import { performanceMonitor } from './services/monitoring/performance-monitor';
import { featureFlagService } from './services/feature-flags/feature-flag-service';
import { userBehaviorLogger } from './services/analytics/user-behavior-logger';
import { ga4Service } from './services/analytics/ga4-config';
import { bigQueryExportService } from './services/analytics/bigquery-export';
import secureLogger from './utils/secure-logger';
// Critical components - load immediately (no lazy loading)
import LandingPage from './components/Landing/OptimizedLandingPage';
import LoginPage from './components/auth/LoginPage';
import Signup from './features/auth/Signup';
import WaitlistPage from './components/Waitlist/WaitlistPage';

// Lazy load heavy components for better performance
import {
  LazyModernPracticePlanner,
  LazyPlaybookDesigner,
  LazyPlayDesignerFunctional,
  LazyAIBrainDashboard,
  LazyAIPlayGenerator,
  LazyTeamManagement,
  LazyPerformanceDashboard,
  LazyGameCalendar,
  LazyEnhancedDemoMode,
  LazyFeedbackDashboard,
  LazyBetaTestingDashboard,
  LazyAnalyticsDashboard,
  LazyBetaEnrollmentForm,
  LazyBetaFeedbackForm,
  LazyFeatureGatedPlayDesigner,
  LazyFeatureGatedDashboard,
  LazyPricingPage,
  LazySubscriptionManagement,
  LazySubscriptionGatedPlayDesigner
} from './components/LazyComponents';

// Lazy load other components
const ModernDashboard = lazy(() => import('./components/Dashboard/ModernDashboard'));
const OnboardingFlow = lazy(() => import('./components/Onboarding/OnboardingFlow'));
const AuthTest = lazy(() => import('./components/Testing/AuthTest'));

import './index.css';

// Enhanced loading component with better UX
const EnhancedLoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <Center minH="100vh">
    <VStack spacing={4}>
      <Spinner size="xl" color="brand.500" thickness="4px" />
      <Text fontSize="lg" color="gray.600">{message}</Text>
    </VStack>
  </Center>
);

// Auth Provider Component
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // Add auth state listener
    const unsubscribe = authService.addAuthStateListener(newAuthState => {
      secureLogger.debug('Auth state updated in App', { authState: newAuthState });
      setAuthState(newAuthState);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      secureLogger.error('Sign out error', { error: error instanceof Error ? error.message : String(error) });
    }
  };

  const contextValue = {
    ...authState,
    signOut,
    logout: signOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component with better error handling
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useContext(AuthContext);
  
  secureLogger.debug('ProtectedRoute - Auth state', { auth });
  
  if (!auth) {
    secureLogger.debug('ProtectedRoute - No auth context, showing loading...');
    return <EnhancedLoadingSpinner message="Initializing authentication..." />;
  }

  if (auth.isLoading) {
    secureLogger.debug('ProtectedRoute - Auth loading, showing loading...');
    return <EnhancedLoadingSpinner message="Loading Coach Core AI..." />;
  }

  if (!auth.user) {
    secureLogger.debug('ProtectedRoute - No user, redirecting to home...');
    return <Navigate to="/" replace />;
  }

  secureLogger.debug('ProtectedRoute - User authenticated, rendering children');
  return <>{children}</>;
};

// Route wrapper with consistent loading states
const RouteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box>
    <ModernNavigation />
    <Suspense fallback={<EnhancedLoadingSpinner message="Loading component..." />}>
      {children}
    </Suspense>
  </Box>
);

function App() {
  // Initialize monitoring (Sentry + Firebase Performance)
  useEffect(() => {
    initMonitoring();
  }, []);

  // Initialize analytics (Google Analytics)
  useEffect(() => {
    initAnalytics();
  }, []);

  // Initialize performance monitoring
  useEffect(() => {
    performanceMonitor.initialize();
  }, []);

  // Initialize feature flags
  useEffect(() => {
    // Feature flags are initialized automatically
    secureLogger.info('Feature flags service initialized');
  }, []);

  // Initialize user behavior logging
  useEffect(() => {
    // User behavior logging is initialized automatically
    secureLogger.info('User behavior logging initialized');
  }, []);

  // Initialize Google Analytics 4
  useEffect(() => {
    // GA4 is initialized automatically
    secureLogger.info('Google Analytics 4 initialized');
  }, []);

  // Initialize BigQuery Export
  useEffect(() => {
    // BigQuery export is initialized automatically
    secureLogger.info('BigQuery export service initialized');
  }, []);

  const environment = import.meta.env.VITE_ENVIRONMENT || 'development';

  return (
    <ProductionErrorBoundary
      environment={environment as 'development' | 'staging' | 'production'}
      showDetails={environment === 'development'}
    >
      <ErrorBoundary
        fallback={({ error: _error, resetError }) => (
          <Center h="100vh" p={8}>
            <VStack spacing={4}>
              <Text fontSize="2xl" color="red.500" textAlign="center">
                Something went wrong
              </Text>
              <Text color="gray.600" textAlign="center">
                We&apos;ve been notified about this error and are working to fix it.
              </Text>
              <Button colorScheme="blue" onClick={resetError}>
                Try again
              </Button>
            </VStack>
          </Center>
        )}
        beforeCapture={(scope, error, errorInfo) => {
          scope.setTag('errorBoundary', true);
          if (errorInfo && typeof errorInfo === 'object') {
            scope.setContext('errorInfo', errorInfo);
          }
        }}
      >
      <ChakraProvider theme={modernTheme}>
        <AuthProvider>
          <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={
              <Suspense fallback={<EnhancedLoadingSpinner message="Loading landing page..." />}>
                <LandingPage />
              </Suspense>
            } />
            <Route path="/login" element={
              <Suspense fallback={<EnhancedLoadingSpinner message="Loading login..." />}>
                <LoginPage />
              </Suspense>
            } />
            <Route path="/signup" element={
              <Suspense fallback={<EnhancedLoadingSpinner message="Loading signup..." />}>
                <Signup />
              </Suspense>
            } />
            <Route path="/waitlist" element={
              <Suspense fallback={<EnhancedLoadingSpinner message="Loading waitlist..." />}>
                <WaitlistPage />
              </Suspense>
            } />
            
            {/* Onboarding Route */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <OnboardingFlow />
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            
            {/* Protected Routes with lazy loading */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <ModernDashboard />
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/team"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <Box p={6}>
                      <LazyTeamManagement />
                    </Box>
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/games"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <Box p={6}>
                      <LazyGameCalendar teamId="default-team" />
                    </Box>
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/practice"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <Box p={6}>
                      <LazyModernPracticePlanner />
                    </Box>
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/play-designer"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <Box p={6}>
                      <LazyPlayDesignerFunctional />
                    </Box>
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/playbook"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <Box p={6}>
                      <LazyPlaybookDesigner />
                    </Box>
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-brain"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <Box p={6}>
                      <LazyAIBrainDashboard />
                    </Box>
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            
            {/* Performance Dashboard Route */}
            <Route
              path="/performance"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <Box p={6}>
                      <LazyPerformanceDashboard />
                    </Box>
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            
            {/* AI Play Generator Route - Accessible without authentication for development/testing */}
            <Route
              path="/ai-play-generator"
              element={
                <RouteWrapper>
                  <Box p={6}>
                    <LazyAIPlayGenerator />
                  </Box>
                </RouteWrapper>
              }
            />
            
            {/* Demo Route - Accessible without authentication for immediate access */}
            <Route
              path="/demo"
              element={
                <LazyEnhancedDemoMode />
              }
            />
            
            {/* Testing Route - Accessible without authentication for development */}
            <Route
              path="/test"
              element={
                <RouteWrapper>
                  <AuthTest />
                </RouteWrapper>
              }
            />
            
            {/* Admin Routes - Feedback Dashboard */}
            <Route
              path="/admin/feedback"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <LazyFeedbackDashboard />
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            
            {/* Beta Testing Dashboard Route */}
            <Route
              path="/admin/beta-testing"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <Box p={6}>
                      <LazyBetaTestingDashboard />
                    </Box>
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            
            {/* Analytics Dashboard Route */}
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <Box p={6}>
                      <LazyAnalyticsDashboard />
                    </Box>
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            {/* Beta Testing Routes */}
            <Route
              path="/beta/enrollment"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <LazyBetaEnrollmentForm />
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/beta/feedback"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <LazyBetaFeedbackForm />
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            {/* Feature-Gated Routes */}
            <Route
              path="/play-designer"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <LazyFeatureGatedPlayDesigner />
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <LazyFeatureGatedDashboard />
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            {/* Subscription Routes */}
            <Route
              path="/pricing"
              element={
                <RouteWrapper>
                  <LazyPricingPage />
                </RouteWrapper>
              }
            />
            <Route
              path="/subscription"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <LazySubscriptionManagement />
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/play-designer-subscription"
              element={
                <ProtectedRoute>
                  <RouteWrapper>
                    <LazySubscriptionGatedPlayDesigner />
                  </RouteWrapper>
                </ProtectedRoute>
              }
            />
            
            {/* Default redirect for authenticated users */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ChakraProvider>
    </ErrorBoundary>
    </ProductionErrorBoundary>
  );
}

export default App;
