import React, { useState, useEffect } from 'react';
import { AIProvider } from './ai-brain/AIContext';
import Dashboard from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import ToastManager from './components/ToastManager';
import LoadingSpinner from './components/LoadingSpinner';
import { AuthProvider } from './components/AuthProvider';
import { TeamProvider } from './contexts/TeamContext';
import { TeamSelector } from './components/TeamManagement';
import { MigrationBanner } from './components/MigrationBanner';
import { OnboardingModal } from './components/OnboardingModal';
import { PWAInstallPrompt, registerServiceWorker } from './components/PWAInstallPrompt';
import { requestNotificationPermission, subscribeUserToPush } from './services/push-notifications';
import SmartPlaybook from './components/SmartPlaybook/SmartPlaybook';

const FirebaseTest = React.lazy(() => import('./components/FirebaseTest'));

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'playbook' | 'test'>('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPWAInstall, setShowPWAInstall] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    // Register service worker for PWA
    registerServiceWorker();
    // Show onboarding for new users (or if not completed)
    const onboardingDone = localStorage.getItem('onboardingComplete');
    if (!onboardingDone) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    if (onboardingComplete) {
      // Request push notification permission after onboarding
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

  const handleDemoMode = async () => {
    // Load sample data for demo mode
    setDemoMode(true);
    // ...populate state with demo data as needed
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'playbook':
        return <SmartPlaybook />;
      case 'test':
        return (
          <React.Suspense fallback={<LoadingSpinner text="Loading Firebase Test..." />}>
            <FirebaseTest />
          </React.Suspense>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary children={
      <ToastManager>
        <AuthProvider>
          <TeamProvider>
            <AIProvider>
              <div className="min-h-screen bg-gray-50">
                <nav className="bg-white shadow-sm border-b">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                      <div className="flex items-center space-x-8">
                        <div className="flex items-center space-x-1">
                          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <span className="text-xl font-bold text-gray-900">Coach Core</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </nav>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <MigrationBanner />
                  {renderContent()}
                </div>
                <PWAInstallPrompt showOnLoad={true} />
                <OnboardingModal
                  open={showOnboarding}
                  onClose={handleOnboardingClose}
                  onDemoMode={handleDemoMode}
                  onComplete={handleOnboardingClose}
                />
              </div>
            </AIProvider>
          </TeamProvider>
        </AuthProvider>
      </ToastManager>
    } />
  );
};

export default App;
