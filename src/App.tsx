// src/App.tsx
// Application shell. Responsibilities:
//   1. Provide all React contexts (Auth, Toast).
//   2. Gate the main UI behind authentication — unauthenticated users always
//      see LoginPage, never a partial or broken dashboard.
//   3. Show a loading spinner during the initial auth state resolution so
//      the user never sees a flash of the login screen on page refresh.
//
// State-based routing: Dashboard owns its own tab navigation internally.
// App.tsx does NOT use React Router — that decision is intentional and unchanged.
// The only routing concern here is "authenticated vs not authenticated".

import React from 'react';
import { AuthProvider } from './components/AuthProvider';  // re-exports from hooks/useAuth
import { useAuth } from './hooks/useAuth';
import ErrorBoundary from './components/common/ErrorBoundary';
import ToastManager from './components/ToastManager';
import LoadingSpinner from './components/LoadingSpinner';
import { TeamProvider } from './contexts/TeamContext';
import { RosterProvider } from './contexts/RosterContext';
import { AIProvider } from './ai-brain/AIContext';
import { MigrationBanner } from './components/MigrationBanner';
import { PWAInstallPrompt, registerServiceWorker } from './components/PWAInstallPrompt';
import { OnboardingModal } from './components/OnboardingModal';
import { requestNotificationPermission, subscribeUserToPush } from './services/push-notifications';
import LoginPage from './components/auth/LoginPage';
import Dashboard from './components/Dashboard';

// AppContent reads the auth state and decides what to render.
// It must be a child of AuthProvider so useAuth() has a context to read from.
const AppContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [onboardingComplete, setOnboardingComplete] = React.useState(false);

  React.useEffect(() => {
    registerServiceWorker();
  }, []);

  React.useEffect(() => {
    // Only check onboarding after auth is resolved and user is present.
    if (!authLoading && user) {
      const onboardingDone = localStorage.getItem('onboardingComplete');
      if (!onboardingDone) {
        setShowOnboarding(true);
      }
    }
  }, [authLoading, user]);

  React.useEffect(() => {
    if (onboardingComplete) {
      requestNotificationPermission().then((permission) => {
        if (permission === 'granted') {
          subscribeUserToPush();
        }
      });
    }
  }, [onboardingComplete]);

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    setOnboardingComplete(true);
    localStorage.setItem('onboardingComplete', 'true');
  };

  // While Firebase resolves the persisted session, show a neutral loading screen.
  // This prevents the flash: authenticated user → brief login screen → dashboard.
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  // Unauthenticated: show login only, no app shell visible.
  if (!user) {
    return <LoginPage />;
  }

  // Authenticated: mount providers only after auth is confirmed
  // so TeamContext can safely call auth.currentUser on mount (it will be set).
  // Provider order: TeamProvider → RosterProvider → AIProvider
  return (
    <TeamProvider>
      <RosterProvider>
        <AIProvider>
          <div className="min-h-screen bg-gray-50">
            <MigrationBanner />
            <Dashboard />
            <PWAInstallPrompt showOnLoad={true} />
            <OnboardingModal
              open={showOnboarding}
              onClose={handleOnboardingClose}
              onDemoMode={() => {}}
              onComplete={handleOnboardingClose}
            />
          </div>
        </AIProvider>
      </RosterProvider>
    </TeamProvider>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastManager>
        {/* AuthProvider must be the outermost context so AppContent can read it. */}
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastManager>
    </ErrorBoundary>
  );
};

export default App;
