import React, { createContext, useCallback, useContext, useEffect, useReducer, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase';
import { LoadingSpinner, useToast } from './index';
import { authErrorCode, authErrorMessage } from './auth/authErrors';

// The one auth system for the app. Coaches sign in with Google or email + password. A browser that still has
// an anonymous session from an older build keeps its uid: the new sign-in is linked to it, not swapped for it.
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
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
  // Linking upgrades the same User object in place and fires no auth-state event (the uid is unchanged), so
  // force a re-render to tell consumers that user.isAnonymous / user.email changed.
  const [, userChanged] = useReducer((n: number) => n + 1, 0);
  const { showError } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Show a friendly message (or nothing, for a deliberately closed popup), then rethrow so callers can stop
  // their own spinners and skip success messages.
  const reportAndRethrow = useCallback(
    (error: unknown): never => {
      const message = authErrorMessage(authErrorCode(error));
      if (message) showError(message);
      throw error;
    },
    [showError],
  );

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    const current = auth.currentUser;
    try {
      if (current?.isAnonymous) {
        try {
          await linkWithPopup(current, provider);
          userChanged();
        } catch (error) {
          // This Google account already belongs to another Coach Core user: sign in to that account. The
          // anonymous session's data stays with the anonymous uid (nothing user-visible depends on it yet).
          if (authErrorCode(error) !== 'auth/credential-already-in-use') throw error;
          const credential = GoogleAuthProvider.credentialFromError(error as never);
          if (!credential) throw error;
          await signInWithCredential(auth, credential);
        }
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      reportAndRethrow(error);
    }
  }, [reportAndRethrow]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        reportAndRethrow(error);
      }
    },
    [reportAndRethrow],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      const current = auth.currentUser;
      try {
        if (current?.isAnonymous) {
          await linkWithCredential(current, EmailAuthProvider.credential(email, password));
          userChanged();
        } else {
          await createUserWithEmailAndPassword(auth, email, password);
        }
      } catch (error) {
        reportAndRethrow(error);
      }
    },
    [reportAndRethrow],
  );

  const sendPasswordReset = useCallback(
    async (email: string) => {
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (error) {
        reportAndRethrow(error);
      }
    },
    [reportAndRethrow],
  );

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      showError("Couldn't sign out. Try again.");
    }
  }, [showError]);

  // Built fresh on every render (not memoized): when linking upgrades the user in place, the userChanged()
  // re-render must hand consumers a new value so they re-read user.isAnonymous / user.email.
  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    signOut,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading authentication..." />
      </div>
    );
  }

  // Keyed by uid so per-user state below (teams, the current team, open plays) starts fresh when a different
  // coach signs in or out on the same browser, instead of showing the previous coach's data.
  return (
    <AuthContext.Provider value={value}>
      <React.Fragment key={user?.uid ?? 'signed-out'}>{children}</React.Fragment>
    </AuthContext.Provider>
  );
};
