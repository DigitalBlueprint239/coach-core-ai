import { describe, expect, it } from 'vitest';
import { authErrorMessage } from '../authErrors';

describe('authErrorMessage', () => {
  it.each([
    ['auth/email-already-in-use', 'An account with this email already exists. Sign in instead.'],
    ['auth/invalid-credential', "That email and password don't match."],
    ['auth/wrong-password', "That email and password don't match."],
    ['auth/user-not-found', "That email and password don't match."],
    ['auth/weak-password', 'Use at least 8 characters for your password.'],
    ['auth/too-many-requests', 'Too many attempts. Wait a minute and try again.'],
    ['auth/network-request-failed', 'No connection. Check your internet and try again.'],
    ['auth/popup-blocked', 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.'],
    ['auth/invalid-email', 'Enter a valid email address.'],
    ['auth/missing-email', 'Enter your email address.'],
    ['auth/missing-password', 'Enter your password.'],
    ['auth/something-new', "Sign-in didn't work. Try again."],
    ['', "Sign-in didn't work. Try again."],
  ])('%s -> %s', (code, message) => {
    expect(authErrorMessage(code)).toBe(message);
  });

  it.each(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])(
    '%s says nothing (the coach closed the window on purpose)',
    (code) => {
      expect(authErrorMessage(code)).toBeNull();
    },
  );
});
