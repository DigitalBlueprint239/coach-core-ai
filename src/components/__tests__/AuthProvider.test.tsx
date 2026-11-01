import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { AuthProvider, useAuth } from '../AuthProvider';
import ToastManager from '../ToastManager';

const mockAuth = vi.hoisted(() => ({ currentUser: null as unknown }));
vi.mock('../../firebase', () => ({ auth: mockAuth }));

let emitAuthState: (user: Partial<User> | null) => void = () => {};

function Probe() {
  const auth = useAuth();
  const swallow = (p: Promise<void>) => p.catch(() => {});
  return (
    <div>
      <p>user: {auth.user ? auth.user.uid : 'none'}</p>
      <button onClick={() => swallow(auth.signInWithGoogle())}>google</button>
      <button onClick={() => swallow(auth.signUpWithEmail('coach@example.com', 'password123'))}>signup</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <ToastManager>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </ToastManager>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.currentUser = null;
  vi.mocked(onAuthStateChanged).mockImplementation(((_auth: unknown, cb: (u: User | null) => void) => {
    emitAuthState = (u) => act(() => cb(u as User | null));
    cb(null);
    return vi.fn();
  }) as any);
});

describe('AuthProvider — Google sign-in', () => {
  it('signs in with a Google popup when nobody is signed in', async () => {
    vi.mocked(signInWithPopup).mockResolvedValue({ user: { uid: 'g1' } } as any);
    renderProbe();
    await userEvent.click(screen.getByText('google'));
    expect(signInWithPopup).toHaveBeenCalledTimes(1);
    expect(vi.mocked(signInWithPopup).mock.calls[0][0]).toBe(mockAuth);
    expect(vi.mocked(signInWithPopup).mock.calls[0][1]).toBeInstanceOf(GoogleAuthProvider);
    expect(linkWithPopup).not.toHaveBeenCalled();
  });

  it('links an existing anonymous session instead of replacing it', async () => {
    mockAuth.currentUser = { uid: 'anon1', isAnonymous: true };
    vi.mocked(linkWithPopup).mockResolvedValue({ user: { uid: 'anon1' } } as any);
    renderProbe();
    await userEvent.click(screen.getByText('google'));
    expect(linkWithPopup).toHaveBeenCalledTimes(1);
    expect(vi.mocked(linkWithPopup).mock.calls[0][0]).toBe(mockAuth.currentUser);
    expect(signInWithPopup).not.toHaveBeenCalled();
  });

  it('signs in to the existing Google account when it is already linked to another user', async () => {
    mockAuth.currentUser = { uid: 'anon1', isAnonymous: true };
    const err = Object.assign(new Error('in use'), { code: 'auth/credential-already-in-use' });
    const credential = { providerId: 'google.com' };
    vi.mocked(linkWithPopup).mockRejectedValue(err);
    vi.mocked(GoogleAuthProvider.credentialFromError).mockReturnValue(credential as any);
    vi.mocked(signInWithCredential).mockImplementation(async () => {
      emitAuthState({ uid: 'google-user' });
      return { user: { uid: 'google-user' } } as any;
    });
    renderProbe();
    await userEvent.click(screen.getByText('google'));
    expect(GoogleAuthProvider.credentialFromError).toHaveBeenCalledWith(err);
    expect(signInWithCredential).toHaveBeenCalledWith(mockAuth, credential);
    expect(await screen.findByText('user: google-user')).toBeInTheDocument();
  });

  it('says nothing when the coach closes the popup', async () => {
    vi.mocked(signInWithPopup).mockRejectedValue(Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' }));
    renderProbe();
    await userEvent.click(screen.getByText('google'));
    await waitFor(() => expect(signInWithPopup).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/sign-in/i)).not.toBeInTheDocument();
  });

  it('explains a blocked popup', async () => {
    vi.mocked(signInWithPopup).mockRejectedValue(Object.assign(new Error('blocked'), { code: 'auth/popup-blocked' }));
    renderProbe();
    await userEvent.click(screen.getByText('google'));
    expect(
      await screen.findByText('Your browser blocked the sign-in window. Allow pop-ups for this site and try again.'),
    ).toBeInTheDocument();
  });
});

describe('AuthProvider — email accounts', () => {
  it('upgrades an anonymous session to an email account by linking', async () => {
    mockAuth.currentUser = { uid: 'anon1', isAnonymous: true };
    vi.mocked(EmailAuthProvider.credential).mockReturnValue({ providerId: 'password' } as any);
    vi.mocked(linkWithCredential).mockResolvedValue({ user: { uid: 'anon1' } } as any);
    renderProbe();
    await userEvent.click(screen.getByText('signup'));
    expect(EmailAuthProvider.credential).toHaveBeenCalledWith('coach@example.com', 'password123');
    expect(linkWithCredential).toHaveBeenCalledWith(mockAuth.currentUser, { providerId: 'password' });
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('creates a new email account when nobody is signed in', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({ user: { uid: 'e1' } } as any);
    renderProbe();
    await userEvent.click(screen.getByText('signup'));
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(mockAuth, 'coach@example.com', 'password123');
    expect(linkWithCredential).not.toHaveBeenCalled();
  });
});
