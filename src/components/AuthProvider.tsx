import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, signInAnonymously, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { LoadingSpinner, useToast } from './index';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError } = useToast();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [auth]);

  const signIn = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
      showSuccess('Signed in successfully!');
    } catch (error: any) {
      showError(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      showSuccess('Signed out successfully!');
    } catch (error: any) {
      showError(error.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut: handleSignOut,
    isAuthenticated: !!user
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading authentication..." />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 