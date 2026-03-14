import { useState, useEffect, useContext, createContext, ReactNode, useRef } from 'react';
import { getFirebaseServices } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence,
  Auth,
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<User | null>;
  login: (email: string, password: string) => Promise<User | null>;
  loginWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authValue = useProvideAuth();
  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

function useProvideAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authRef = useRef<Auth | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    getFirebaseServices()
      .then(({ auth }) => {
        authRef.current = auth;
        setPersistence(auth, browserLocalPersistence);
        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          setUser(firebaseUser);
          setLoading(false);
        });
      })
      .catch(() => {
        setLoading(false);
      });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const getAuth = () => {
    if (!authRef.current) throw new Error('Firebase not initialized yet');
    return authRef.current;
  };

  const signup = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(getAuth(), email, password);
      setUser(result.user);
      return result.user;
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(getAuth(), email, password);
      setUser(result.user);
      return result.user;
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(getAuth(), provider);
      setUser(result.user);
      return result.user;
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(getAuth());
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
  };
}
