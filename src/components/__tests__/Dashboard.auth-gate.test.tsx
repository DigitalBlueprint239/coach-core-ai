import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Dashboard from '../Dashboard';

const authState = vi.hoisted(() => ({ user: null as unknown }));
vi.mock('../AuthProvider', () => ({
  useAuth: () => ({
    user: authState.user,
    loading: false,
    isAuthenticated: !!authState.user,
    signInWithGoogle: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    sendPasswordReset: vi.fn(),
    signOut: vi.fn(),
  }),
}));
vi.mock('../../contexts/TeamContext', () => ({ useTeam: () => ({ currentTeam: null }) }));
vi.mock('../TeamManagement', () => ({ TeamManagement: () => null }));
vi.mock('../../features/practice-planner/PracticePlanner', () => ({ default: () => null }));
vi.mock('../SmartPlaybook/SmartPlaybook', () => ({ default: () => null }));

describe('Dashboard sign-in gate', () => {
  it('shows the sign-in screen when nobody is signed in', () => {
    authState.user = null;
    render(<Dashboard />);
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
  });

  it('shows the sign-in screen to a leftover anonymous session, so it can be linked to a real account', () => {
    authState.user = { uid: 'anon1', isAnonymous: true, email: null };
    render(<Dashboard />);
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.queryByText(/Welcome,/)).not.toBeInTheDocument();
  });

  it('shows the dashboard to a coach with a real account', () => {
    authState.user = { uid: 'c1', isAnonymous: false, email: 'coach@example.com' };
    render(<Dashboard />);
    expect(screen.getByText('Welcome, coach@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});
