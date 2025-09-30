import { firebaseConfig } from '../firebase/firebase-config';

const DEFAULT_FUNCTION_REGION = 'us-central1';
const DEFAULT_BASE_URL = `https://${DEFAULT_FUNCTION_REGION}-${firebaseConfig.projectId}.cloudfunctions.net/checkWaitlistEmail`;

const CHECK_WAITLIST_ENDPOINT =
  import.meta.env?.VITE_CHECK_WAITLIST_EMAIL_URL ||
  process.env.REACT_APP_CHECK_WAITLIST_EMAIL_URL ||
  DEFAULT_BASE_URL;

export async function isEmailOnWaitlist(email: string): Promise<boolean> {
  try {
    const response = await fetch(CHECK_WAITLIST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(`Duplicate check failed with status ${response.status}`);
    }

    const data = (await response.json()) as { exists?: boolean };
    return !!data?.exists;
  } catch (error) {
    // If the duplicate check fails, fall back to allowing the signup.
    // We prefer to risk a duplicate rather than block a legitimate user.
    console.warn('Waitlist duplicate check failed, allowing submission by default.', error);
    return false;
  }
}
