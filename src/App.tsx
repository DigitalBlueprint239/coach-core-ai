import React, { useState, useEffect, Suspense, useContext, lazy } from 'react';
import {
  ChakraProvider,
  useToast,
  Spinner,
  useDisclosure,
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
import { unifiedTheme } from './theme/unified-theme';
import ModernNavigation from './components/navigation/ModernNavigation';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { authService, AuthState } from './services/firebase/auth-service';
import { AuthContext } from './hooks/useAuth';

// Lazy load components for better performance
const MVPDashboard = lazy(() => import('./components/Dashboard/MVPDashboard'));
const ModernPracticePlanner = lazy(() => import('./components/PracticePlanner/ModernPracticePlanner'));
const PlaybookDesigner = lazy(() => import('./components/Playbook/PlaybookDesigner'));
const PlayDesignerFunctional = lazy(() => import('./components/PlayDesigner/PlayDesignerFunctional'));
const AIBrainDashboardOptimized = lazy(() => import('./components/AIBrain/AIBrainDashboardOptimized'));
const AIPlayGenerator = lazy(() => import('./components/AI/AIPlayGenerator'));
const TeamManagement = lazy(() => import('./components/Team/TeamManagement'));
const LandingPage = lazy(() => import('./components/Landing/LandingPage'));
const LoginPage = lazy(() => import('./components/auth/LoginPage'));
const Signup = lazy(() => import('./features/auth/Signup'));
const OnboardingFlow = lazy(() => import('./components/Onboarding/OnboardingFlow'));
const AuthTest = lazy(() => import('./components/Testing/AuthTest'));
const PerformanceDashboard = lazy(() => import('./components/Performance/PerformanceDashboard'));
const GameCalendar = lazy(() => import('./components/GameManagement/GameCalendar'));
const DemoMode = lazy(() => import('./components/Demo/DemoMode'));

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
      console.log('Auth state changed:', newAuthState);
      setAuthState(newAuthState);
    });

    // Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const contextValue = {
    ...authState,
    signOut,
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
  
  if (!auth) {
    return <EnhancedLoadingSpinner message="Initializing authentication..." />;
  }

  if (auth.isLoading) {
    return <EnhancedLoadingSpinner message="Loading Coach Core AI..." />;
  }

  if (!auth.user) {
    return <Navigate to="/" replace />;
  }

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
  return (
    <ChakraProvider theme={unifiedTheme}>
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
                    <MVPDashboard />
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
                      <TeamManagement />
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
                      <GameCalendar teamId="default-team" />
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
                      <ModernPracticePlanner />
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
                      <PlayDesignerFunctional />
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
                      <PlaybookDesigner />
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
                      <AIBrainDashboardOptimized />
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
                      <PerformanceDashboard />
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
                    <AIPlayGenerator />
                  </Box>
                </RouteWrapper>
              }
            />
            
            {/* Demo Route - Accessible without authentication for immediate access */}
            <Route
              path="/demo"
              element={
                <Suspense fallback={<EnhancedLoadingSpinner message="Loading demo mode..." />}>
                  <DemoMode />
                </Suspense>
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
            
            {/* Default redirect for authenticated users */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;
