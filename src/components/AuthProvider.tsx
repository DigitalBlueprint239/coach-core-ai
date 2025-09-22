import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  uid: string;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>({
    uid: 'demo-user',
    email: 'demo@coachcore.ai',
  });
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    // Simulate sign in
    setTimeout(() => {
      setUser({ uid: 'demo-user', email: 'demo@coachcore.ai' });
      setLoading(false);
    }, 1000);
  };

  const signOut = async () => {
    setLoading(true);
    // Simulate sign out
    setTimeout(() => {
      setUser(null);
      setLoading(false);
    }, 1000);
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
