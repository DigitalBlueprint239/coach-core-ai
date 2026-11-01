import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignInScreen } from '../SignInScreen';

const auth = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
}));
vi.mock('../../AuthProvider', () => ({ useAuth: () => auth }));

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(auth).forEach((fn) => fn.mockResolvedValue(undefined));
});

describe('SignInScreen', () => {
  it('offers Google, email + password, a mode toggle and password reset, with real labels', () => {
    render(<SignInScreen />);
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Forgot password?' })).toBeInTheDocument();
  });

  it('Continue with Google calls signInWithGoogle', async () => {
    render(<SignInScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(auth.signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('signs in with email and password', async () => {
    render(<SignInScreen />);
    await userEvent.type(screen.getByLabelText('Email'), 'coach@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(auth.signInWithEmail).toHaveBeenCalledWith('coach@example.com', 'password123');
    expect(auth.signUpWithEmail).not.toHaveBeenCalled();
  });

  it('switches to account creation and toggles back', async () => {
    render(<SignInScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    // Now the submit button creates the account and the toggle goes back to sign in.
    expect(screen.getByRole('button', { name: 'Create account' })).toHaveAttribute('type', 'submit');
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'button');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'submit');
  });

  it('refuses a 7-character password on sign-up without calling signUpWithEmail', async () => {
    render(<SignInScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await userEvent.type(screen.getByLabelText('Email'), 'coach@example.com');
    await userEvent.type(screen.getByLabelText('Password'), '1234567');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Use at least 8 characters for your password.')).toBeInTheDocument();
    expect(auth.signUpWithEmail).not.toHaveBeenCalled();
  });

  it('creates an account with an 8-character password', async () => {
    render(<SignInScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await userEvent.type(screen.getByLabelText('Email'), 'coach@example.com');
    await userEvent.type(screen.getByLabelText('Password'), '12345678');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(auth.signUpWithEmail).toHaveBeenCalledWith('coach@example.com', '12345678');
  });

  it('Forgot password? sends a reset link to the typed email', async () => {
    render(<SignInScreen />);
    await userEvent.type(screen.getByLabelText('Email'), 'coach@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(auth.sendPasswordReset).toHaveBeenCalledWith('coach@example.com');
    expect(await screen.findByText('Check your email for a reset link.')).toBeInTheDocument();
  });

  it('Forgot password? asks for the email first when the field is empty', async () => {
    render(<SignInScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(auth.sendPasswordReset).not.toHaveBeenCalled();
    expect(screen.getByText('Enter your email above, then tap Forgot password? again.')).toBeInTheDocument();
  });

  it('does not show the success message when the reset request fails', async () => {
    auth.sendPasswordReset.mockRejectedValue(Object.assign(new Error('x'), { code: 'auth/network-request-failed' }));
    render(<SignInScreen />);
    await userEvent.type(screen.getByLabelText('Email'), 'coach@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(auth.sendPasswordReset).toHaveBeenCalled();
    expect(screen.queryByText('Check your email for a reset link.')).not.toBeInTheDocument();
  });

  it('asks for the email and password before calling Firebase when either is empty', async () => {
    render(<SignInScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Email'), 'coach@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(auth.signInWithEmail).not.toHaveBeenCalled();
  });
});
