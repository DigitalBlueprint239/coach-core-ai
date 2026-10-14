// Authentication tests for the consolidated auth module and route gate
// (Day 2, F-02): signed-out, signed-in, unauthorized (anonymous, unverified,
// not in beta), expired and revoked sessions, sign-out cleanup, and the
// Dashboard context regression from the Day 1 audit.
import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

type Listener = (u: any) => void;
const mockState: { listener: Listener | null; emailLink: boolean } = { listener: null, emailLink: false };
const mockSignOut = jest.fn();
const mockPopup = jest.fn();
const mockSendLink = jest.fn();

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  // Plain functions: CRA's jest config resets jest.fn implementations.
  onAuthStateChanged: (_auth: unknown, cb: Listener) => {
    mockState.listener = cb;
    return () => undefined;
  },
  signOut: (...args: unknown[]) => (mockSignOut as any)(...args),
  signInWithPopup: (...args: unknown[]) => (mockPopup as any)(...args),
  sendSignInLinkToEmail: (...args: unknown[]) => (mockSendLink as any)(...args),
  isSignInWithEmailLink: () => mockState.emailLink,
  signInWithEmailLink: () => Promise.resolve(),
  GoogleAuthProvider: function GoogleAuthProvider() { return {}; },
}));

jest.mock('../../services/firebase', () => ({ auth: { currentUser: null }, db: {}, analytics: undefined }));

// eslint-disable-next-line import/first
import { AuthProvider, useAuth, evaluateUser, registerSignOutGuard } from '../useAuth';
// eslint-disable-next-line import/first
import AuthGate from '../../components/auth/AuthGate';

function fakeUser(claims: Record<string, unknown>, opts: { anonymous?: boolean; verified?: boolean; tokenError?: boolean } = {}) {
  return {
    uid: 'coach-1',
    email: 'coach@example.test',
    isAnonymous: !!opts.anonymous,
    emailVerified: opts.verified ?? true,
    getIdToken: jest.fn(() => Promise.resolve('t')),
    getIdTokenResult: jest.fn(() => opts.tokenError
      ? Promise.reject(Object.assign(new Error('expired'), { code: 'auth/user-token-expired' }))
      : Promise.resolve({
        claims,
        signInProvider: opts.anonymous ? 'anonymous' : 'google.com',
      })),
  };
}

const BETA = { email_verified: true, beta: true };

function renderGate() {
  return render(
    <AuthProvider>
      <AuthGate>
        <div>PROTECTED COACHING CONTENT</div>
      </AuthGate>
    </AuthProvider>,
  );
}

async function emit(user: any) {
  await waitFor(() => expect(mockState.listener).not.toBeNull());
  await act(async () => {
    mockState.listener!(user);
  });
}

beforeEach(() => {
  mockState.listener = null;
  mockState.emailLink = false;
  mockSignOut.mockReset().mockImplementation(() => Promise.resolve());
  mockPopup.mockReset().mockImplementation(() => Promise.resolve());
  mockSendLink.mockReset().mockImplementation(() => Promise.resolve());
  window.localStorage.clear();
});

describe('AuthGate', () => {
  it('shows a loading state before Firebase reports the session', () => {
    renderGate();
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(screen.queryByText('PROTECTED COACHING CONTENT')).toBeNull();
  });

  it('signed out: shows sign-in options and hides coaching content', async () => {
    renderGate();
    await emit(null);
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    expect(screen.getByText('Email me a sign-in link')).toBeInTheDocument();
    expect(screen.queryByText('PROTECTED COACHING CONTENT')).toBeNull();
  });

  it('signed in with a verified beta account: shows coaching content', async () => {
    renderGate();
    await emit(fakeUser(BETA));
    expect(await screen.findByText('PROTECTED COACHING CONTENT')).toBeInTheDocument();
  });

  it('anonymous sessions are signed out and never see content', async () => {
    renderGate();
    await emit(fakeUser(BETA, { anonymous: true }));
    expect(mockSignOut).toHaveBeenCalled();
    expect(await screen.findByText(/Guest access is not available/)).toBeInTheDocument();
    expect(screen.queryByText('PROTECTED COACHING CONTENT')).toBeNull();
  });

  it('unauthorized: unverified email is held at a verification screen', async () => {
    renderGate();
    await emit(fakeUser({ beta: true, email_verified: false }, { verified: false }));
    expect(await screen.findByText('Verify your email')).toBeInTheDocument();
    expect(screen.queryByText('PROTECTED COACHING CONTENT')).toBeNull();
  });

  it('unauthorized: verified account without beta access waits for approval', async () => {
    renderGate();
    await emit(fakeUser({ email_verified: true }));
    expect(await screen.findByText('Waiting for beta access')).toBeInTheDocument();
    expect(screen.queryByText('PROTECTED COACHING CONTENT')).toBeNull();
  });

  it('expired session: unreadable token signs the user out with a notice', async () => {
    renderGate();
    await emit(fakeUser(BETA, { tokenError: true }));
    expect(mockSignOut).toHaveBeenCalled();
    expect(await screen.findByText(/Your session ended/)).toBeInTheDocument();
    expect(screen.queryByText('PROTECTED COACHING CONTENT')).toBeNull();
  });

  it('revoked session: SDK sign-out after a live session clears session data, preserves the quarantined legacy queue, and explains why', async () => {
    window.localStorage.setItem('currentTeamId', 'team-1');
    window.localStorage.setItem('offline_operations', '[{"type":"update"}]');
    window.localStorage.setItem('unrelated', 'keep');
    renderGate();
    await emit(fakeUser(BETA));
    await screen.findByText('PROTECTED COACHING CONTENT');
    await emit(null); // refresh token revoked / account disabled
    expect(await screen.findByText(/Your session ended/)).toBeInTheDocument();
    expect(screen.queryByText('PROTECTED COACHING CONTENT')).toBeNull();
    expect(window.localStorage.getItem('currentTeamId')).toBeNull();
    // Quarantined legacy queue is preserved byte-for-byte (never replayed).
    expect(window.localStorage.getItem('offline_operations')).toBe('[{"type":"update"}]');
    expect(window.localStorage.getItem('unrelated')).toBe('keep');
  });

  it('email link opened on another device asks for the email instead of showing sign-in', async () => {
    mockState.emailLink = true; // no stored email on this device
    renderGate();
    await emit(null);
    expect(await screen.findByText('Confirm your email')).toBeInTheDocument();
    expect(screen.queryByText('Continue with Google')).toBeNull();
    expect(screen.queryByText('PROTECTED COACHING CONTENT')).toBeNull();
  });

  it('sign-in buttons call the real providers (never anonymous)', async () => {
    renderGate();
    await emit(null);
    fireEvent.click(screen.getByText('Continue with Google'));
    await waitFor(() => expect(mockPopup).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText(/sign-in link by email/i), { target: { value: 'coach@example.test' } });
    fireEvent.click(screen.getByText('Email me a sign-in link'));
    await waitFor(() => expect(mockSendLink).toHaveBeenCalled());
    const settings = (mockSendLink.mock.calls[0] as any[])[2];
    expect(settings.handleCodeInApp).toBe(true);
    expect(window.localStorage.getItem('coachcore.emailForSignIn')).toBe('coach@example.test');
  });
});

describe('logout', () => {
  function LogoutProbe() {
    const { logout, status } = useAuth();
    return <button onClick={() => { void logout(); }}>out:{status}</button>;
  }

  it('signs out, clears user-scoped storage and returns to signed_out', async () => {
    window.localStorage.setItem('currentTeamId', 'team-1');
    render(<AuthProvider><LogoutProbe /></AuthProvider>);
    await emit(fakeUser(BETA));
    await screen.findByText('out:ready');
    fireEvent.click(screen.getByText('out:ready'));
    await screen.findByText('out:signed_out');
    expect(mockSignOut).toHaveBeenCalled();
    expect(window.localStorage.getItem('currentTeamId')).toBeNull();
  });
});

describe('sign-out guards (persistence contract §4)', () => {
  function GuardProbe() {
    const { logout, status } = useAuth();
    return <button onClick={() => { void logout(); }}>guard:{status}</button>;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const firebaseMock = require('../../services/firebase');

  it('a guard that cancels keeps the coach signed in and their data untouched', async () => {
    firebaseMock.auth.currentUser = { uid: 'coach-1' };
    window.localStorage.setItem('currentTeamId', 'team-1');
    const seen: string[] = [];
    const off = registerSignOutGuard((uid) => { seen.push(uid); return false; });
    render(<AuthProvider><GuardProbe /></AuthProvider>);
    await emit(fakeUser(BETA));
    fireEvent.click(await screen.findByText('guard:ready'));
    await waitFor(() => expect(seen).toEqual(['coach-1']));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(screen.getByText('guard:ready')).toBeInTheDocument();
    expect(window.localStorage.getItem('currentTeamId')).toBe('team-1');
    off();
    firebaseMock.auth.currentUser = null;
  });

  it('a guard that throws also cancels (fail safe), and an agreeing guard lets sign-out proceed', async () => {
    firebaseMock.auth.currentUser = { uid: 'coach-1' };
    const offThrow = registerSignOutGuard(() => { throw new Error('boom'); });
    render(<AuthProvider><GuardProbe /></AuthProvider>);
    await emit(fakeUser(BETA));
    fireEvent.click(await screen.findByText('guard:ready'));
    await waitFor(() => expect(screen.getByText('guard:ready')).toBeInTheDocument());
    expect(mockSignOut).not.toHaveBeenCalled();
    offThrow();
    const offOk = registerSignOutGuard(async () => true);
    fireEvent.click(screen.getByText('guard:ready'));
    await screen.findByText('guard:signed_out');
    expect(mockSignOut).toHaveBeenCalled();
    offOk();
    firebaseMock.auth.currentUser = null;
  });
});

describe('evaluateUser', () => {
  it('maps tokens to statuses', async () => {
    await expect(evaluateUser(null)).resolves.toBe('signed_out');
    await expect(evaluateUser(fakeUser(BETA, { anonymous: true }) as any)).resolves.toBe('signed_out');
    await expect(evaluateUser(fakeUser({ beta: true }, { verified: false }) as any)).resolves.toBe('unverified');
    await expect(evaluateUser(fakeUser({ email_verified: true }) as any)).resolves.toBe('not_beta');
    await expect(evaluateUser(fakeUser(BETA) as any)).resolves.toBe('ready');
  });
});

describe('Day 1 regression: one auth context', () => {
  it('the hook Dashboard imports works under the provider App mounts', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const appProvider = require('../../components/AuthProvider');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dashboardHook = require('../useAuth');
    expect(appProvider.AuthProvider).toBe(dashboardHook.AuthProvider);
    expect(appProvider.useAuth).toBe(dashboardHook.useAuth);
    function Probe() {
      dashboardHook.useAuth();
      return <span>ok</span>;
    }
    expect(() => render(<appProvider.AuthProvider><Probe /></appProvider.AuthProvider>)).not.toThrow();
  });
});
