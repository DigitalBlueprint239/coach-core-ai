// Plain-language messages for Firebase Auth error codes. `null` means "say nothing": the coach closed the
// sign-in window on purpose, so there is nothing to report.
const SILENT = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/invalid-credential': "That email and password don't match.",
  'auth/wrong-password': "That email and password don't match.",
  'auth/user-not-found': "That email and password don't match.",
  'auth/weak-password': 'Use at least 8 characters for your password.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.',
};

const FALLBACK = "Sign-in didn't work. Try again.";

export function authErrorMessage(code: string): string | null {
  if (SILENT.has(code)) return null;
  return MESSAGES[code] ?? FALLBACK;
}

/** The Firebase error code on an unknown thrown value, or '' if it has none. */
export function authErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof (error as { code: unknown }).code === 'string') {
    return (error as { code: string }).code;
  }
  return '';
}
