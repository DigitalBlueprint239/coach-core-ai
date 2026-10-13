// Coach Core AI — the single authentication module (Day 2, F-02).
//
// One provider, one hook. `components/AuthProvider.tsx` re-exports this file
// so older imports keep working.
//
// Private-beta access requires ALL of:
//   * Google sign-in or passwordless email link (never anonymous),
//   * a verified email address,
//   * the server-granted custom claim `beta: true`.
// Firestore/Storage rules and the AI gateway enforce the same checks on the
// server; this module only decides what the UI shows.
//
// Sessions persist across reloads with Firebase's default local persistence.
// Expired or revoked sessions surface as `signed_out` with a reason.

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../services/firebase';

export type AuthStatus =
  | 'loading'
  | 'signed_out'
  | 'needs_email_confirmation' // opened an email link on a different device
  | 'unverified'
  | 'not_beta'
  | 'ready';

export type AuthNotice =
  | 'session-expired'
  | 'anonymous-blocked'
  | 'signed-out'
  | null;

export interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  /** True only for a verified, beta-enabled, non-anonymous session. */
  isAuthenticated: boolean;
  loading: boolean;
  notice: AuthNotice;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  sendEmailLink: (email: string) => Promise<void>;
  completeEmailLink: (email: string) => Promise<void>;
  /** Re-read claims from the server, e.g. after beta access is granted. */
  refreshAccess: () => Promise<void>;
  /**
   * Sign out after every registered sign-out guard agrees. Resolves false
   * (and stays signed in) if a guard cancels, e.g. the coach chose to keep
   * unsynced drafts. Session expiry/revocation by Firebase cannot be guarded;
   * uid-scoped drafts then remain on the device for the same coach.
   */
  logout: () => Promise<boolean>;
  /** Register a guard run before an explicit sign-out (persistence contract §4). */
  registerSignOutGuard: (guard: SignOutGuard) => () => void;
  /** @deprecated alias of signInWithGoogle */
  loginWithGoogle: () => Promise<void>;
  /** @deprecated alias of logout */
  signOut: () => Promise<boolean>;
}

export const EMAIL_FOR_SIGN_IN_KEY = 'coachcore.emailForSignIn';

/**
 * Called before an explicit sign-out with the signed-in uid. Return true to
 * continue, false to cancel. Guards may show UI (e.g. "Sync now / Export
 * drafts / Sign out anyway") and must never delete another uid's data.
 */
export type SignOutGuard = (uid: string) => Promise<boolean> | boolean;
const signOutGuards = new Set<SignOutGuard>();

/** Register a sign-out guard; returns an unregister function. */
export function registerSignOutGuard(guard: SignOutGuard): () => void {
  signOutGuards.add(guard);
  return () => { signOutGuards.delete(guard); };
}

// Browser storage that belongs to the signed-in coach and must not survive a
// sign-out on a shared device (Day 1 F-10).
const USER_SCOPED_STORAGE_KEYS = ['currentTeamId', 'offline_operations'];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Remove user-scoped local data and cached authenticated API responses. */
export async function clearUserScopedState(): Promise<void> {
  const storage = safeStorage();
  USER_SCOPED_STORAGE_KEYS.forEach((k) => {
    try { storage?.removeItem(k); } catch { /* ignore */ }
  });
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const names = await window.caches.keys();
      await Promise.all(names
        .filter((n) => /api|dynamic/i.test(n))
        .map((n) => window.caches.delete(n)));
    }
    navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_USER_CACHES' });
  } catch {
    /* cache cleanup is best effort */
  }
}

/** Decide the UI status for a Firebase user. Exported for tests. */
export async function evaluateUser(user: User | null): Promise<AuthStatus> {
  if (!user) return 'signed_out';
  if (user.isAnonymous) return 'signed_out';
  const token = await user.getIdTokenResult();
  const provider = token.signInProvider || (token.claims?.firebase as any)?.sign_in_provider;
  if (provider === 'anonymous') return 'signed_out';
  if (token.claims?.email_verified !== true && user.emailVerified !== true) return 'unverified';
  if (token.claims?.beta !== true) return 'not_beta';
  return 'ready';
}

function describeError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const map: Record<string, string> = {
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups and try again.',
    'auth/invalid-email': 'That email address does not look right.',
    'auth/invalid-action-code': 'This sign-in link is invalid or has already been used.',
    'auth/expired-action-code': 'This sign-in link has expired. Request a new one.',
    'auth/network-request-failed': 'Network problem. Check your connection and try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/user-disabled': 'This account is disabled.',
    'auth/unauthorized-domain': 'This site is not authorized for sign-in yet.',
  };
  return map[code] || 'Sign-in failed. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [notice, setNotice] = useState<AuthNotice>(null);
  const [error, setError] = useState<string | null>(null);
  const wasSignedIn = useRef(false);
  // An email sign-in link was opened but needs the address re-entered.
  const pendingEmailLink = useRef(false);

  const apply = useCallback(async (u: User | null) => {
    try {
      if (u?.isAnonymous) {
        // Anonymous sessions never get access; end them.
        await signOut(auth);
        setNotice('anonymous-blocked');
        setUser(null);
        setStatus('signed_out');
        return;
      }
      if (!u && pendingEmailLink.current) {
        // Keep the confirm-email screen instead of falling back to sign-in.
        setUser(null);
        setStatus('needs_email_confirmation');
        return;
      }
      const next = await evaluateUser(u);
      if (!u && wasSignedIn.current) {
        // The SDK signs users out when a token can no longer be refreshed
        // (revoked, disabled, deleted) — tell them why.
        setNotice((n) => n ?? 'session-expired');
        await clearUserScopedState();
      }
      wasSignedIn.current = !!u;
      setUser(u);
      setStatus(next);
    } catch {
      // Token could not be read: treat as expired and fail closed.
      try { await signOut(auth); } catch { /* ignore */ }
      wasSignedIn.current = false;
      setUser(null);
      setNotice('session-expired');
      setStatus('signed_out');
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      setStatus('signed_out');
      return undefined;
    }
    let unsubscribe: (() => void) | undefined;
    const start = async () => {
      // Complete a passwordless email-link sign-in if this page load is one.
      try {
        const href = window.location.href;
        if (isSignInWithEmailLink?.(auth, href)) {
          const email = safeStorage()?.getItem(EMAIL_FOR_SIGN_IN_KEY);
          if (!email) {
            pendingEmailLink.current = true;
            setStatus('needs_email_confirmation');
          } else {
            await signInWithEmailLink(auth, email, href);
            safeStorage()?.removeItem(EMAIL_FOR_SIGN_IN_KEY);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      } catch (err) {
        setError(describeError(err));
      }
      unsubscribe = onAuthStateChanged(auth, (u) => { void apply(u); });
    };
    void start();
    return () => unsubscribe?.();
  }, [apply]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setNotice(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(describeError(err));
    }
  }, []);

  const sendEmailLink = useCallback(async (email: string) => {
    setError(null);
    setNotice(null);
    try {
      await sendSignInLinkToEmail(auth, email.trim(), {
        url: `${window.location.origin}/`,
        handleCodeInApp: true,
      });
      safeStorage()?.setItem(EMAIL_FOR_SIGN_IN_KEY, email.trim());
    } catch (err) {
      setError(describeError(err));
      throw err;
    }
  }, []);

  const completeEmailLink = useCallback(async (email: string) => {
    setError(null);
    try {
      const href = window.location.href;
      await signInWithEmailLink(auth, email.trim(), href);
      pendingEmailLink.current = false;
      safeStorage()?.removeItem(EMAIL_FOR_SIGN_IN_KEY);
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      setError(describeError(err));
    }
  }, []);

  const refreshAccess = useCallback(async () => {
    const u = auth?.currentUser;
    if (!u) return;
    try {
      await u.getIdToken(true);
      setStatus(await evaluateUser(u));
    } catch {
      await apply(null);
    }
  }, [apply]);

  const logout = useCallback(async (): Promise<boolean> => {
    const uid = auth?.currentUser?.uid;
    if (uid) {
      for (const guard of Array.from(signOutGuards)) {
        let proceed = false;
        try {
          proceed = (await guard(uid)) === true;
        } catch {
          proceed = false; // a failing guard must not lose data
        }
        if (!proceed) return false;
      }
    }
    wasSignedIn.current = false;
    try {
      await signOut(auth);
    } finally {
      await clearUserScopedState();
      setUser(null);
      setNotice('signed-out');
      setStatus('signed_out');
      // Reload to drop any in-memory data that belonged to this coach.
      if (process.env.NODE_ENV !== 'test') {
        window.location.assign('/');
      }
    }
    return true;
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    status,
    isAuthenticated: status === 'ready',
    loading: status === 'loading',
    notice,
    error,
    signInWithGoogle,
    sendEmailLink,
    completeEmailLink,
    refreshAccess,
    logout,
    registerSignOutGuard,
    loginWithGoogle: signInWithGoogle,
    signOut: logout,
  }), [user, status, notice, error, signInWithGoogle, sendEmailLink, completeEmailLink, refreshAccess, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
