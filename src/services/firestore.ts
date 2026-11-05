import { doc, collection, addDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from "../firebase";

// Types
export interface PracticePlan {
  id?: string;
  teamId: string;
  name: string;
  date: string;
  duration: number;
  periods: PracticePeriod[];
  goals: string[];
  notes: string;
  focusPlay?: import('../coach-workflow/practiceFocus').StoredPracticePlayFocus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PracticePeriod {
  id: string;
  name: string;
  duration: number;
  drills: Drill[];
  intensity: number;
}

export interface Drill {
  id: string;
  name: string;
  description: string;
  duration: number;
  equipment: string[];
  playersInvolved: number;
}

export interface Play {
  id?: string;
  teamId: string;
  name: string;
  formation: string;
  description: string;
  routes: Route[];
  players: Player[];
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sport: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Route {
  id: string;
  playerId: string;
  path: Point[];
  type: 'run' | 'pass' | 'block';
  timing: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  number: number;
  position: string;
  x: number;
  y: number;
}

// Firebase Emulators (for local development)
if (import.meta.env.DEV) {
  // connectAuthEmulator(auth, 'http://localhost:9099');
  // connectFirestoreEmulator(db, 'localhost', 8080);
}

// Auth State Management
let currentUser: User | null = null;
let authStateReady = false;
const authStateListeners: ((user: User | null) => void)[] = [];

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  authStateReady = true;
  authStateListeners.forEach(listener => listener(user));
});

export function getCurrentUser(): User {
  if (!currentUser) {
    throw new Error('No authenticated user found. Please log in.');
  }
  return currentUser;
}

export function waitForAuth(): Promise<User | null> {
  return new Promise((resolve) => {
    if (authStateReady) {
      resolve(currentUser);
    } else {
      authStateListeners.push(resolve);
    }
  });
}

export function onAuthStateChange(listener: (user: User | null) => void): () => void {
  authStateListeners.push(listener);
  
  // Call immediately if auth state is ready
  if (authStateReady) {
    listener(currentUser);
  }

  return () => {
    const index = authStateListeners.indexOf(listener);
    if (index > -1) {
      authStateListeners.splice(index, 1);
    }
  };
}

// Security: the previous global 'offline_operations' queue was plaintext, not tied to a
// Firebase auth UID or team, and automatically replayed under whoever signed in next.
// New code MUST NOT load, execute, or persist that queue; it is quarantined for an
// explicit owner-authorized legacy-data decision rather than silently discarded.
export const LEGACY_OFFLINE_QUEUE_KEY = 'offline_operations';

export function hasQuarantinedLegacyOfflineOperations(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(LEGACY_OFFLINE_QUEUE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Data-destroying action: call only from an explicit user/owner-confirmed cleanup UI. */
export function discardQuarantinedLegacyOfflineOperations(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(LEGACY_OFFLINE_QUEUE_KEY);
}

/** Old extension point kept to fail closed. Never queue sensitive writes for later replay. */
export function addToOfflineQueue(_operation: unknown): never {
  throw new Error('Unscoped offline queue disabled for privacy. Reconnect before saving.');
}

function requireOnlineWrite(): void {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Offline changes cannot be safely saved. Reconnect before saving; no data was queued.');
  }
}

// Firestore SDK calls below still rely on authenticated server rules; an internet connection
// hint does not prove connectivity. Do not show "cloud saved" until a write promise resolves.
// A separately reviewed, account-scoped offline design can replace this conservative policy.

// PRACTICE PLANS API
export async function savePracticePlan(teamId: string, planData: Omit<PracticePlan, 'id' | 'teamId' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<string> {
  const user = getCurrentUser();
  requireOnlineWrite();
  const plan = {
    ...planData,
    teamId,
    createdBy: user.uid,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const docRef = await addDoc(collection(db, 'practicePlans'), plan);
  return docRef.id;
}

export async function getPracticePlans(teamId: string): Promise<PracticePlan[]> {
  getCurrentUser(); // Ensure authenticated
  
  try {
    const q = query(
      collection(db, 'practicePlans'),
      where('teamId', '==', teamId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PracticePlan[];
  } catch (error) {
    console.error('Error fetching practice plans:', error);
    throw error;
  }
}

export async function updatePracticePlan(teamId: string, planId: string, updates: Partial<PracticePlan>): Promise<void> {
  getCurrentUser();
  requireOnlineWrite();
  // Team, creator and timestamps may not be changed by arbitrary caller payloads.
  const { id: _id, teamId: _teamId, createdBy: _createdBy, createdAt: _createdAt, ...mutable } = updates;
  void _id; void _teamId; void _createdBy; void _createdAt;
  await updateDoc(doc(db, 'practicePlans', planId), { ...mutable, updatedAt: new Date() });
}

export async function deletePracticePlan(teamId: string, planId: string): Promise<void> {
  getCurrentUser();
  requireOnlineWrite();
  await deleteDoc(doc(db, 'practicePlans', planId));
}

// SMART PLAYBOOK API
export async function savePlay(teamId: string, playData: Omit<Play, 'id' | 'teamId' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<string> {
  const user = getCurrentUser();
  requireOnlineWrite();
  const play = {
    ...playData,
    teamId,
    createdBy: user.uid,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const docRef = await addDoc(collection(db, 'plays'), play);
  return docRef.id;
}

// Versioned plays (v2 and the canonical v3, src/features/playbook2 and src/football-core) share the plays collection;
// version-1 readers never see any of them.
const isPlayV2Doc = (data: unknown) => {
  const version = typeof data === 'object' && data !== null ? (data as { schemaVersion?: unknown }).schemaVersion : undefined;
  return typeof version === 'number' && version >= 2;
};

export async function getPlays(teamId: string): Promise<Play[]> {
  getCurrentUser(); // Ensure authenticated
  
  try {
    const q = query(
      collection(db, 'plays'),
      where('teamId', '==', teamId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .filter(doc => !isPlayV2Doc(doc.data()))
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Play[];
  } catch (error) {
    console.error('Error fetching plays:', error);
    throw error;
  }
}

export async function updatePlay(teamId: string, playId: string, updates: Partial<Play>): Promise<void> {
  getCurrentUser();
  requireOnlineWrite();
  const { id: _id, teamId: _teamId, createdBy: _createdBy, createdAt: _createdAt, ...mutable } = updates;
  void _id; void _teamId; void _createdBy; void _createdAt;
  await updateDoc(doc(db, 'plays', playId), { ...mutable, updatedAt: new Date() });
}

export async function deletePlay(teamId: string, playId: string): Promise<void> {
  getCurrentUser();
  requireOnlineWrite();
  await deleteDoc(doc(db, 'plays', playId));
}

// REAL-TIME SUBSCRIPTIONS
export function subscribeToPracticePlans(teamId: string, callback: (plans: PracticePlan[]) => void) {
  const q = query(
    collection(db, 'practicePlans'),
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const plans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PracticePlan[];
    callback(plans);
  });
}

export function subscribeToPlays(teamId: string, callback: (plays: Play[]) => void) {
  const q = query(
    collection(db, 'plays'),
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const plays = snapshot.docs
      .filter(doc => !isPlayV2Doc(doc.data()))
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Play[];
    callback(plays);
  });
}

export async function migrateFromLocalStorage(teamId: string): Promise<void> {
  getCurrentUser();
  if (!teamId) throw new Error('Select a team before reviewing legacy browser data.');
  // Old browser records lack authenticated ownership provenance. Silently copying them
  // into the current coach's Firestore team could cross a user boundary.
  throw new Error('Legacy browser data migration is paused pending coach ownership verification.');
}

export { db, auth };
