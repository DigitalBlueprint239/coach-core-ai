import React, { useState, useEffect, Suspense } from 'react';
import { ChakraProvider, Box, useToast, Spinner, Center, Text, useDisclosure, Button } from '@chakra-ui/react';
import { unifiedTheme } from './theme/unified-theme';
import ModernNavigation from './components/navigation/ModernNavigation';
import ModernDashboard from './components/Dashboard/ModernDashboard';
import ModernPracticePlanner from './components/PracticePlanner/ModernPracticePlanner';
import PlaybookDesigner from './components/Playbook/PlaybookDesigner';
import PlayDesignerFunctional from './components/PlayDesigner/PlayDesignerFunctional';
import AIBrainDashboardOptimized from './components/AIBrain/AIBrainDashboardOptimized';
// import TeamManagementOptimized from './components/Team/TeamManagementOptimized';
import ComprehensiveTestDashboard from './components/Testing/ComprehensiveTestDashboard';
import AuthModal from './components/auth/AuthModal';
import UserProfileComponent from './components/auth/UserProfile';
import WelcomeWorkflow from './components/Welcome/WelcomeWorkflow';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorFallback from './components/ErrorBoundary/ErrorFallback';
import { authService, AuthState } from './services/firebase/auth-service';
import { userProfileService } from './services/user/user-profile-service';

import './index.css';

type ViewId = 'dashboard' | 'practice-planner' | 'play-designer' | 'playbook' | 'analytics' | 'ai-brain' | 'team-management' | 'testing';

function App() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    error: null,
  });
  const [currentView, setCurrentView] = useState('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showWelcomeWorkflow, setShowWelcomeWorkflow] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const toast = useToast();

  // Initialize auth service and listen for auth state changes
  useEffect(() => {
    // Initialize the auth listener
    authService.initializeAuthListener();
    
    // Add auth state listener
    const unsubscribe = authService.addAuthStateListener((newAuthState) => {
      console.log('Auth state changed:', newAuthState);
      setAuthState(newAuthState);
      
      // Show welcome workflow for new users
      if (newAuthState.profile && !newAuthState.profile.teamId) {
        setShowWelcomeWorkflow(true);
      }
    });

    // Cleanup listener on unmount
    return () => {
      authService.removeAuthStateListener(unsubscribe);
    };
  }, []);

  const handleViewChange = async (view: string) => {
    try {
      setCurrentView(view);
      toast({
        title: 'Navigation',
        description: `Switched to ${view.replace('-', ' ')}`,
        status: 'info',
        duration: 1200,
        isClosable: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Navigation failed'));
    }
  };

  const resetError = () => {
    setError(null);
  };

  const handleAuthSuccess = (firebaseUser: any) => {
    // The auth service already manages the auth state through onAuthStateChanged
    // We just need to close the modal and show the welcome workflow
    setIsAuthModalOpen(false);
    
    // Show welcome workflow for new users
    setShowWelcomeWorkflow(true);
    
    // Show success message
    toast({
      title: 'Welcome to Coach Core!',
      description: `Successfully signed in as ${firebaseUser.displayName || 'Coach'}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleWelcomeComplete = () => {
    setShowWelcomeWorkflow(false);
    toast({
      title: 'Setup Complete!',
      description: 'Your team is ready. Welcome to Coach Core!',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  };

  const renderCurrentView = () => {
    if (error) {
      return <ErrorFallback error={error} resetError={resetError} />;
    }

    try {
      switch (currentView) {
        case 'dashboard':
          return (
            <Suspense fallback={<LoadingSpinner />}>
              <ModernDashboard onViewChange={handleViewChange} userProfile={authState.profile} />
            </Suspense>
          );
        case 'practice-planner':
          return (
            <Suspense fallback={<LoadingSpinner />}>
              <ModernPracticePlanner />
            </Suspense>
          );
        case 'play-designer':
          return (
            <Suspense fallback={<LoadingSpinner />}>
              <PlayDesignerFunctional />
            </Suspense>
          );
        case 'playbook':
          return (
            <Box p={6}>
              <PlaybookDesigner />
            </Box>
          );
        case 'analytics':
          return (
            <Box p={6}>
              <Box
                bg="white"
                p={8}
                borderRadius="xl"
                shadow="lg"
                textAlign="center"
              >
                <Box
                  w={16}
                  h={16}
                  bg="orange.500"
                  borderRadius="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  mx="auto"
                  mb={4}
                  color="white"
                  fontSize="2xl"
                >
                  📊
                </Box>
                <Box fontSize="2xl" fontWeight="bold" color="gray.800" mb={2}>
                  Analytics Dashboard
                </Box>
                <Box color="gray.600" mb={6}>
                  Performance tracking and insights coming soon...
                </Box>
              </Box>
            </Box>
          );
        case 'ai-brain':
          return (
            <Box p={6}>
              <AIBrainDashboardOptimized />
            </Box>
          );
        case 'team-management':
          return (
            <Box p={6}>
              {/* <TeamManagementOptimized /> */}
            </Box>
          );
        case 'testing':
          return (
            <Box p={6}>
              <ComprehensiveTestDashboard />
            </Box>
          );
        default:
          return (
            <Suspense fallback={<LoadingSpinner />}>
              <ModernDashboard userProfile={authState.profile} />
            </Suspense>
          );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to render view'));
      return <ErrorFallback error={error!} resetError={resetError} />;
    }
  };

  // Show authentication modal if user is not signed in
  if (!authState.user) {
    return (
      <ChakraProvider theme={unifiedTheme}>
        <Box 
          minH="100vh" 
          bg="linear-gradient(135deg, dark.800 0%, dark.700 50%, dark.600 100%)"
          display="flex" 
          alignItems="center" 
          justifyContent="center"
          position="relative"
          overflow="hidden"
        >
          {/* Animated background elements */}
          <Box
            position="absolute"
            top="-50%"
            left="-50%"
            w="200%"
            h="200%"
            bg="radial-gradient(circle, primary.500 0%, transparent 70%)"
            opacity="0.05"
            animation="pulse 6s ease-in-out infinite"
          />
          
          <Box textAlign="center" p={8} position="relative" zIndex={1}>
            {/* Coach Core Logo */}
            <Box
              w={24}
              h={24}
              bg="linear-gradient(135deg, primary.500 0%, primary.600 50%, primary.700 100%)"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mx="auto"
              mb={8}
              boxShadow="brand-glow-lg"
              position="relative"
            >
              <Box
                position="absolute"
                inset="0"
                borderRadius="full"
                bg="radial-gradient(circle, primary.400 0%, transparent 70%)"
                opacity="0.4"
              />
              <Box
                fontSize="5xl"
                fontWeight="bold"
                color="white"
                textShadow="0 4px 8px rgba(0,0,0,0.5)"
              >
                C
              </Box>
            </Box>
            
            <Box fontSize="4xl" fontWeight="800" color="dark.100" mb={4} letterSpacing="wider">
              COACH CORE
            </Box>
            <Box color="dark.200" mb={8} fontSize="lg" fontWeight="500" letterSpacing="wide">
              Your complete coaching platform for team management, practice planning, and strategic development.
            </Box>
            <Button
              size="lg"
              variant="brand-primary"
              onClick={() => setIsAuthModalOpen(true)}
              px={10}
              py={7}
              fontSize="lg"
              fontWeight="700"
              letterSpacing="wide"
              boxShadow="brand-glow"
              _hover={{
                transform: 'translateY(-3px)',
                boxShadow: 'brand-glow-lg',
              }}
            >
              GET STARTED
            </Button>
          </Box>
        </Box>
        
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </ChakraProvider>
    );
  }

  return (
    <ChakraProvider theme={unifiedTheme}>
      <Box minH="100vh" bg="dark.50">
        {/* Modern Navigation */}
        <ModernNavigation 
          onViewChange={handleViewChange} 
          currentView={currentView}
          userProfile={authState.profile}
        />

        {/* Main Content */}
        <Box as="main">
          {showWelcomeWorkflow ? (
            <WelcomeWorkflow 
              userProfile={authState.profile} 
              onComplete={handleWelcomeComplete}
            />
          ) : (
            renderCurrentView()
          )}
        </Box>
      </Box>
    </ChakraProvider>
  );
}

export default App;

