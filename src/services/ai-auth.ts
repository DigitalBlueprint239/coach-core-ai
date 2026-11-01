// The signed-in coach's Firebase ID token for the AI proxy, or null when signed out.
// Firebase is loaded on first use so importing this module never initialises it (keeps tests light).
export async function firebaseIdToken(): Promise<string | null> {
  const { auth } = await import('../firebase');
  return auth.currentUser ? auth.currentUser.getIdToken() : null;
}
