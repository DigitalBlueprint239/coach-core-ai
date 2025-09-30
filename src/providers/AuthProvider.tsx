import React, { useEffect, useState } from 'react';
import { authService, AuthState } from '../services/firebase/auth-service';
import { AuthContext } from '../hooks/useAuth';

interface Props {
  children: React.ReactNode;
}

const defaultState: AuthState = {
  user: null,
  profile: null,
  isLoading: true,
  error: null,
};

export const AuthProvider: React.FC<Props> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultState);

  useEffect(() => {
    const unsubscribe = authService.addAuthStateListener(state => {
      setAuthState(state);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const value = {
    ...authState,
    signOut: authService.signOut.bind(authService),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
