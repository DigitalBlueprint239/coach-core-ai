import React, { useState } from 'react';
import { AIProvider } from './ai-brain/AIContext';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/common/ErrorBoundary';
import ToastManager from './components/ToastManager';
import LoadingSpinner from './components/LoadingSpinner';
// Real email/password auth provider from hooks/useAuth
import { AuthProvider, useAuth } from './hooks/useAuth';
import { TeamProvider } from './contexts/TeamContext';
import Login from './features/auth/Login';
import Signup from './features/auth/Signup';

// View type for unauthenticated screens
type AuthView = 'login' | 'signup';

/**
 * Inner component that consumes auth context to decide what to render.
 * Unauthenticated users see Login/Signup.
 * Authenticated users see the Dashboard (which has its own tab navigation).
 */
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Loading Coach Core..." />
      </div>
    );
  }

  // Not authenticated — show login or signup
  if (!user) {
    if (authView === 'signup') {
      return (
        <Signup
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }
    return (
      <Login
        onSwitchToSignup={() => setAuthView('signup')}
      />
    );
  }

  // Authenticated — wrap in TeamProvider + AIProvider and show Dashboard.
  // Dashboard already handles team selection, practice planner tabs, etc.
  return (
    <TeamProvider>
      <AIProvider>
        <Dashboard />
      </AIProvider>
    </TeamProvider>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastManager>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastManager>
    </ErrorBoundary>
  );
};

export default App;
