import React, { useId, useState } from 'react';
import { useAuth } from '../AuthProvider';
import { authErrorMessage } from './authErrors';

type Mode = 'signIn' | 'signUp';

const MIN_PASSWORD_LENGTH = 8;

// Signed-out screen: Google, or email + password (sign in / create account), plus password reset.
// Errors from Firebase are shown as toasts by AuthProvider; this screen only shows its own checks.
export const SignInScreen: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const emailId = useId();
  const passwordId = useId();

  const run = async (action: () => Promise<void>, onSuccess?: () => void) => {
    setBusy(true);
    try {
      await action();
      onSuccess?.();
    } catch {
      // AuthProvider already told the coach what went wrong.
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setProblem(null);
    setNotice(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setProblem(null);
    setNotice(null);
    if (!email.trim()) {
      setProblem(authErrorMessage('auth/missing-email'));
      return;
    }
    if (!password) {
      setProblem(authErrorMessage('auth/missing-password'));
      return;
    }
    if (mode === 'signUp') {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setProblem(authErrorMessage('auth/weak-password'));
        return;
      }
      void run(() => signUpWithEmail(email.trim(), password));
    } else {
      void run(() => signInWithEmail(email.trim(), password));
    }
  };

  const handleForgotPassword = () => {
    setProblem(null);
    setNotice(null);
    const address = email.trim();
    if (!address) {
      setProblem('Enter your email above, then tap Forgot password? again.');
      return;
    }
    void run(
      () => sendPasswordReset(address),
      () => setNotice('Check your email for a reset link.'),
    );
  };

  const buttonBase =
    'w-full min-h-11 rounded-lg px-4 py-3 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';
  const linkButton =
    'min-h-11 px-2 text-sm font-medium text-blue-700 hover:text-blue-900 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded';
  const input =
    'block w-full min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen bg-gray-50 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl sm:p-8">
        <h1 className="text-center text-3xl font-bold text-gray-900">Coach Core AI</h1>
        <p className="mt-2 mb-6 text-center text-gray-600">
          {mode === 'signIn' ? 'Sign in to your coaching account.' : 'Create your coaching account.'}
        </p>

        <button
          type="button"
          onClick={() => void run(signInWithGoogle)}
          disabled={busy}
          className={`${buttonBase} flex items-center justify-center gap-3 border border-gray-300 bg-white text-gray-800 hover:bg-gray-50`}
        >
          <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
            <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
          </svg>
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-sm text-gray-500" aria-hidden="true">
          <span className="h-px flex-1 bg-gray-200" />
          or
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor={emailId} className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id={emailId}
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label htmlFor={passwordId} className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id={passwordId}
              type="password"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'signUp' ? MIN_PASSWORD_LENGTH : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
            />
          </div>

          {problem && (
            <p role="alert" className="text-sm text-red-700">
              {problem}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm text-green-700">
              {notice}
            </p>
          )}

          <button type="submit" disabled={busy} className={`${buttonBase} bg-blue-600 text-white hover:bg-blue-700`}>
            {mode === 'signIn' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          {mode === 'signIn' ? (
            <>
              <button type="button" onClick={handleForgotPassword} disabled={busy} className={linkButton}>
                Forgot password?
              </button>
              <span className="text-sm text-gray-600">
                New here?{' '}
                <button type="button" onClick={() => switchMode('signUp')} className={linkButton}>
                  Create account
                </button>
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-600">
              Already have an account?{' '}
              <button type="button" onClick={() => switchMode('signIn')} className={linkButton}>
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignInScreen;
