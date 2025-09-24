import React, { useState, useEffect, Suspense, useContext, lazy } from 'react';
// Import React context polyfill to fix createContext issues
import './utils/react-context-polyfill';
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
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FEATURE_FLAGS } from './config/feature-flags';

// Lazy load only essential components
const LoginPage = lazy(() => import('./components/auth/LoginPage'));
const SignupPage = lazy(() => import('./components/auth/SignupPage'));
const ModernDashboard = lazy(() => import('./components/dashboard/ModernDashboard'));
const WaitlistPage = lazy(() => import('./pages/WaitlistPage'));

// Conditional lazy loading based on feature flags
const PracticePlanner = FEATURE_FLAGS.PRACTICE_PLANNER 
  ? lazy(() => import('./components/practice/ModernPracticePlanner'))
  : null;

const PlaybookDesigner = FEATURE_FLAGS.ADVANCED_PLAYBOOK_TOOLING
  ? lazy(() => import('./components/playbook/PlaybookDesigner'))
  : null;

const AnalyticsDashboard = FEATURE_FLAGS.COMPLEX_ANALYTICS
  ? lazy(() => import('./components/analytics/AnalyticsDashboard'))
  : null;

// Loading component
const LoadingSpinner = () => (
  <Center h="100vh">
    <VStack spacing={4}>
      <Spinner size="xl" color="blue.500" />
      <Text>Loading Coach Core AI...</Text>
    </VStack>
  </Center>
);

// Error fallback component
const ErrorFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => (
  <Center h="100vh">
    <VStack spacing={4} textAlign="center">
      <Text fontSize="xl" color="red.500">
        Something went wrong
      </Text>
      <Text color="gray.600">
        {error.message}
      </Text>
      <Button onClick={resetError} colorScheme="blue">
        Try Again
      </Button>
    </VStack>
  </Center>
);

// Main app content
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <Box minH="100vh" bg="gray.50">
        <ModernNavigation />
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public routes */}
            <Route 
              path="/waitlist" 
              element={<WaitlistPage mode="landing" variant="pre-launch" />} 
            />
            <Route 
              path="/waitlist/form" 
              element={<WaitlistPage mode="form" variant="pre-launch" />} 
            />
            <Route 
              path="/waitlist/analytics" 
              element={<WaitlistPage mode="analytics" />} 
            />
            <Route 
              path="/waitlist/management" 
              element={<WaitlistPage mode="management" showAdminFeatures={true} />} 
            />
            
            {/* Auth routes */}
            <Route 
              path="/login" 
              element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
            />
            <Route 
              path="/signup" 
              element={user ? <Navigate to="/dashboard" replace /> : <SignupPage />} 
            />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={user ? <ModernDashboard /> : <Navigate to="/login" replace />} 
            />
            
            {/* Conditional feature routes */}
            {FEATURE_FLAGS.PRACTICE_PLANNER && PracticePlanner && (
              <Route 
                path="/practice" 
                element={user ? <PracticePlanner /> : <Navigate to="/login" replace />} 
              />
            )}
            
            {FEATURE_FLAGS.ADVANCED_PLAYBOOK_TOOLING && PlaybookDesigner && (
              <Route 
                path="/playbook" 
                element={user ? <PlaybookDesigner /> : <Navigate to="/login" replace />} 
              />
            )}
            
            {FEATURE_FLAGS.COMPLEX_ANALYTICS && AnalyticsDashboard && (
              <Route 
                path="/analytics" 
                element={user ? <AnalyticsDashboard /> : <Navigate to="/login" replace />} 
              />
            )}
            
            {/* Default redirect */}
            <Route 
              path="/" 
              element={<Navigate to="/waitlist" replace />} 
            />
            
            {/* Catch all */}
            <Route 
              path="*" 
              element={<Navigate to="/waitlist" replace />} 
            />
          </Routes>
        </Suspense>
      </Box>
    </Router>
  );
};

// Main App component
const App: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <ChakraProvider theme={modernTheme}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ChakraProvider>
    </ErrorBoundary>
  );
};

export default App;
