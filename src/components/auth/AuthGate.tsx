import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

// Protects every coaching route. Children render only for a verified,
// beta-enabled, non-anonymous session; everything else gets a sign-in or
// status screen. Server rules enforce the same policy independently.

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
    <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full" role="main">
      <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Coach Core AI</h1>
      <h2 className="text-lg text-center text-gray-700 mb-6">{title}</h2>
      {children}
    </div>
  </div>
);

const NOTICES: Record<string, string> = {
  'session-expired': 'Your session ended. Please sign in again.',
  'anonymous-blocked': 'Guest access is not available. Please sign in with your coach account.',
  'signed-out': 'You have been signed out.',
};

export const SignInScreen: React.FC = () => {
  const { signInWithGoogle, sendEmailLink, notice, error } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await sendEmailLink(email);
      setSent(true);
    } catch {
      setSent(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Private beta sign-in">
      {notice && NOTICES[notice] && (
        <p className="mb-4 text-sm text-blue-800 bg-blue-50 rounded p-3" role="status">{NOTICES[notice]}</p>
      )}
      {error && <p className="mb-4 text-sm text-red-700 bg-red-50 rounded p-3" role="alert">{error}</p>}
      <button
        type="button"
        onClick={() => { void signInWithGoogle(); }}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors mb-6"
      >
        Continue with Google
      </button>
      {sent ? (
        <p className="text-sm text-gray-700" role="status">
          Check {email} for a sign-in link. Open it on this device to finish signing in.
        </p>
      ) : (
        <form onSubmit={onEmail} className="space-y-3">
          <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700">
            Or get a sign-in link by email
          </label>
          <input
            id="signin-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full border border-blue-600 text-blue-700 py-2 px-6 rounded-lg hover:bg-blue-50 disabled:opacity-50"
          >
            Email me a sign-in link
          </button>
        </form>
      )}
      <p className="mt-6 text-xs text-gray-500 text-center">
        Access is limited to invited coaches during the private beta.
      </p>
    </Card>
  );
};

const ConfirmEmailScreen: React.FC = () => {
  const { completeEmailLink, error } = useAuth();
  const [email, setEmail] = useState('');
  return (
    <Card title="Confirm your email">
      {error && <p className="mb-4 text-sm text-red-700 bg-red-50 rounded p-3" role="alert">{error}</p>}
      <form onSubmit={(e) => { e.preventDefault(); void completeEmailLink(email); }} className="space-y-3">
        <label htmlFor="confirm-email" className="block text-sm text-gray-700">
          You opened the sign-in link on a different device. Enter the email it was sent to.
        </label>
        <input id="confirm-email" type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring" />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 px-6 rounded-lg">Finish sign-in</button>
      </form>
    </Card>
  );
};

const StatusScreen: React.FC<{ title: string; body: string }> = ({ title, body }) => {
  const { user, refreshAccess, logout } = useAuth();
  return (
    <Card title={title}>
      <p className="text-gray-700 mb-2">{body}</p>
      {user?.email && <p className="text-sm text-gray-500 mb-6">Signed in as {user.email}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={() => { void refreshAccess(); }}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg">Check again</button>
        <button type="button" onClick={() => { void logout(); }}
          className="flex-1 border border-gray-300 py-2 rounded-lg">Sign out</button>
      </div>
    </Card>
  );
};

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useAuth();
  switch (status) {
    case 'loading':
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-2">
          <span className="text-xl font-bold text-gray-900">Coach Core AI</span>
          <span className="text-gray-600" role="status">Loading…</span>
        </div>
      );
    case 'needs_email_confirmation':
      return <ConfirmEmailScreen />;
    case 'unverified':
      return <StatusScreen title="Verify your email"
        body="Your email address is not verified yet. Use Google sign-in or an email sign-in link to continue." />;
    case 'not_beta':
      return <StatusScreen title="Waiting for beta access"
        body="Your account is signed in but not yet enabled for the Coach Core private beta. Ask the Coach Core team to add you, then choose Check again." />;
    case 'ready':
      return <>{children}</>;
    case 'signed_out':
    default:
      return <SignInScreen />;
  }
};

export default AuthGate;
