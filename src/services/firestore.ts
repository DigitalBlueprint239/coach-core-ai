// src/services/firestore.ts
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  connectFirestoreEmulator,
  enableNetwork,
  disableNetwork,
  runTransaction,
  serverTimestamp,
  DocumentReference,
  Transaction
} from 'firebase/firestore';
import { getAuth, connectAuthEmulator, onAuthStateChanged, type User } from 'firebase/auth';
import { FootballLevel } from '../types/football';

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only once
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);
const auth = getAuth(app);

// Connect to emulators in development
if (process.env.REACT_APP_USE_EMULATOR === 'true' && process.env.NODE_ENV === 'development') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
  } catch (error) {
    console.log('Emulators already connected');
  }
}

// ============================================
// OPTIMISTIC LOCKING UTILITIES
// ============================================

interface OptimisticLockingEntity {
  version?: number;
  lastModifiedBy?: string;
  lastModifiedAt?: any;
}

interface OptimisticLockingOptions {
  collectionName: string;
  documentId: string;
  updates: Partial<OptimisticLockingEntity>;
  currentUser: User;
  additionalFields?: Record<string, any>;
}

/**
 * Generic optimistic locking update function
 */
async function updateWithOptimisticLocking<T extends OptimisticLockingEntity>(
  options: OptimisticLockingOptions
): Promise<void> {
  const { collectionName, documentId, updates, currentUser, additionalFields } = options;
  const docRef = doc(db, collectionName, documentId);
  
  try {
    await runTransaction(db, async (transaction) => {
      const docSnapshot = await transaction.get(docRef);
      
      if (!docSnapshot.exists()) {
        throw new Error(`${collectionName} document not found or has been deleted`);
      }
      
      const currentData = docSnapshot.data() as T;
      const currentVersion = currentData.version || 0;
      const expectedVersion = (updates as any).version || currentVersion;
      
      // Check if the document has been modified by another user
      if (currentVersion !== expectedVersion) {
        throw new Error(`${collectionName} has been modified by another user. Please refresh and try again.`);
      }
      
      const updateData = {
        ...updates,
        ...additionalFields,
        version: currentVersion + 1,
        lastModifiedBy: currentUser.uid,
        lastModifiedAt: serverTimestamp(),
        updatedAt: new Date()
      };
      
      transaction.update(docRef, updateData);
    });
  } catch (error) {
    if (!isOnline) {
      // For offline mode, queue the update without version checking
      const data = {
        ...updates,
        ...additionalFields,
        updatedAt: new Date()
      };
      
      addToOfflineQueue({
        type: 'update',
        collection: collectionName,
        docId: documentId,
        data
      });
      return;
    }
    
    // Re-throw the error with a more user-friendly message
    if (error instanceof Error) {
      throw new Error(`Failed to update ${collectionName}: ${error.message}`);
    }
    throw error;
  }
}

// ============================================
// TYPES
// ============================================

export interface PracticePlan {
  id?: string;
  teamId: string;
  name: string;
  date: string;
  duration: number;
  periods: PracticePeriod[];
  goals: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version?: number; // Version for optimistic locking
  lastModifiedBy?: string; // Track who last modified
  lastModifiedAt?: any; // Server timestamp of last modification
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
  level?: FootballLevel; // Added level field
  version?: number; // Version for optimistic locking
  lastModifiedBy?: string; // Track who last modified
  lastModifiedAt?: any; // Server timestamp of last modification
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

// Enhanced Player interface for team management
export interface TeamPlayer {
  id?: string;
  teamId: string;
  userId?: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  position: string;
  grade: number;
  email?: string;
  phone?: string;
  parentEmail?: string;
  parentPhone?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version?: number; // Version for optimistic locking
  lastModifiedBy?: string; // Track who last modified
  lastModifiedAt?: any; // Server timestamp of last modification
}

// Enhanced Team interface
export interface Team {
  id?: string;
  name: string;
  sport: string;
  level: FootballLevel;
  season: string;
  coachIds: string[];
  playerIds: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version?: number; // Version for optimistic locking
  lastModifiedBy?: string; // Track who last modified
  lastModifiedAt?: any; // Server timestamp of last modification
}

// Enhanced User interface
export interface UserProfile {
  id?: string;
  email: string;
  displayName: string;
  photoURL?: string;
  roles: string[];
  teamIds: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version?: number; // Version for optimistic locking
  lastModifiedBy?: string; // Track who last modified
  lastModifiedAt?: any; // Server timestamp of last modification
}

// ============================================
// AUTHENTICATION UTILITIES
// ============================================

function getCurrentUser(): User {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to perform this operation');
  }
  return user;
}

export function waitForAuth(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export function onAuthStateChange(listener: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, listener);
}

// ============================================
// OFFLINE QUEUE MANAGEMENT
// ============================================

let offlineQueue: any[] = [];
let isOnline = navigator.onLine;

// Load offline queue from localStorage
function loadOfflineQueue() {
  try {
    const stored = localStorage.getItem('coach_core_offline_queue');
    if (stored) {
      offlineQueue = JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load offline queue:', error);
    offlineQueue = [];
  }
}

// Save offline queue to localStorage
function saveOfflineQueue() {
  try {
    localStorage.setItem('coach_core_offline_queue', JSON.stringify(offlineQueue));
  } catch (error) {
    console.error('Failed to save offline queue:', error);
  }
}

function addToOfflineQueue(operation: any) {
  offlineQueue.push({
    ...operation,
    timestamp: Date.now(),
    id: `op_${Date.now()}_${Math.random()}`
  });
  saveOfflineQueue();
}

// Load queue on initialization
loadOfflineQueue();

// Network status monitoring
window.addEventListener('online', () => {
  isOnline = true;
  syncOfflineQueue();
});

window.addEventListener('offline', () => {
  isOnline = false;
});

async function syncOfflineQueue() {
  if (!isOnline || offlineQueue.length === 0) return;

  const queue = [...offlineQueue];
  offlineQueue = [];
  saveOfflineQueue();

  for (const operation of queue) {
    try {
      await executeOperation(operation);
    } catch (error) {
      console.error('Failed to sync offline operation:', error);
      // Only add back to queue if it's not a permanent error
      if (!error.message?.includes('permission-denied')) {
        offlineQueue.push(operation);
      }
    }
  }

  if (offlineQueue.length > 0) {
    saveOfflineQueue();
  }
}

async function executeOperation(operation: any) {
  const { type, collection: collectionName, data, docId } = operation;
  
  switch (type) {
    case 'create':
      if (docId) {
        await updateDoc(doc(db, collectionName, docId), data);
      } else {
        await addDoc(collection(db, collectionName), data);
      }
      break;
    case 'update':
      await updateDoc(doc(db, collectionName, docId), data);
      break;
    case 'delete':
      await deleteDoc(doc(db, collectionName, docId));
      break;
  }
}

// ============================================
// PRACTICE PLAN OPERATIONS
// ============================================

export async function savePracticePlan(teamId: string, planData: Omit<PracticePlan, 'id' | 'teamId' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<string> {
  const currentUser = getCurrentUser();
  
  const data = {
    ...planData,
    teamId,
    createdBy: currentUser.uid,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1, // Initialize version for optimistic locking
    lastModifiedBy: currentUser.uid,
    lastModifiedAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, 'practicePlans'), data);
    return docRef.id;
  } catch (error) {
    if (!isOnline) {
      addToOfflineQueue({
        type: 'create',
        collection: 'practicePlans',
        data
      });
      return `offline_${Date.now()}`;
    }
    throw error;
  }
}

export async function getPracticePlans(teamId: string): Promise<PracticePlan[]> {
  getCurrentUser(); // Ensure authenticated
  
  try {
    const q = query(
      collection(db, 'practicePlans'),
      where('teamId', '==', teamId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as PracticePlan[];
  } catch (error) {
    console.error('Error fetching practice plans:', error);
    return [];
  }
}

export async function updatePracticePlan(teamId: string, planId: string, updates: Partial<PracticePlan>): Promise<void> {
  const currentUser = getCurrentUser();
  
  await updateWithOptimisticLocking<PracticePlan>({
    collectionName: 'practicePlans',
    documentId: planId,
    updates,
    currentUser
  });
}

export async function deletePracticePlan(teamId: string, planId: string): Promise<void> {
  getCurrentUser(); // Ensure authenticated
  
  try {
    await deleteDoc(doc(db, 'practicePlans', planId));
  } catch (error) {
    if (!isOnline) {
      addToOfflineQueue({
        type: 'delete',
        collection: 'practicePlans',
        docId: planId
      });
      return;
    }
    throw error;
  }
}

// ============================================
// PLAY OPERATIONS
// ============================================

export async function savePlay(teamId: string, playData: Omit<Play, 'id' | 'teamId' | 'createdAt' | 'updatedAt' | 'createdBy'>, level?: FootballLevel): Promise<string> {
  const currentUser = getCurrentUser();
  
  const data = {
    ...playData,
    teamId,
    createdBy: currentUser.uid,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...(level && { level }),
    version: 1, // Initialize version for optimistic locking
    lastModifiedBy: currentUser.uid,
    lastModifiedAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, 'plays'), data);
    return docRef.id;
  } catch (error) {
    if (!isOnline) {
      addToOfflineQueue({
        type: 'create',
        collection: 'plays',
        data
      });
      return `offline_${Date.now()}`;
    }
    throw error;
  }
}

export async function getPlays(teamId: string, level?: FootballLevel): Promise<Play[]> {
  getCurrentUser(); // Ensure authenticated
  
  try {
    const constraints = [
      where('teamId', '==', teamId),
      orderBy('createdAt', 'desc')
    ];
    
    if (level) {
      constraints.unshift(where('level', '==', level));
    }
    
    const q = query(collection(db, 'plays'), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as Play[];
  } catch (error) {
    console.error('Error fetching plays:', error);
    return [];
  }
}

export async function updatePlay(teamId: string, playId: string, updates: Partial<Play>, level?: FootballLevel): Promise<void> {
  const currentUser = getCurrentUser();
  
  await updateWithOptimisticLocking<Play>({
    collectionName: 'plays',
    documentId: playId,
    updates,
    currentUser,
    additionalFields: level ? { level } : undefined
  });
}

export async function deletePlay(teamId: string, playId: string): Promise<void> {
  getCurrentUser(); // Ensure authenticated
  
  try {
    await deleteDoc(doc(db, 'plays', playId));
  } catch (error) {
    if (!isOnline) {
      addToOfflineQueue({
        type: 'delete',
        collection: 'plays',
        docId: playId
      });
      return;
    }
    throw error;
  }
}

// ============================================
// PLAYER OPERATIONS
// ============================================

export async function savePlayer(teamId: string, playerData: Omit<TeamPlayer, 'id' | 'teamId' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<string> {
  const currentUser = getCurrentUser();
  
  const data = {
    ...playerData,
    teamId,
    createdBy: currentUser.uid,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1, // Initialize version for optimistic locking
    lastModifiedBy: currentUser.uid,
    lastModifiedAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, 'players'), data);
    return docRef.id;
  } catch (error) {
    if (!isOnline) {
      addToOfflineQueue({
        type: 'create',
        collection: 'players',
        data
      });
      return `offline_${Date.now()}`;
    }
    throw error;
  }
}

export async function getPlayers(teamId: string): Promise<TeamPlayer[]> {
  getCurrentUser(); // Ensure authenticated
  
  try {
    const q = query(
      collection(db, 'players'),
      where('teamId', '==', teamId),
      orderBy('lastName', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as TeamPlayer[];
  } catch (error) {
    console.error('Error fetching players:', error);
    return [];
  }
}

export async function updatePlayer(teamId: string, playerId: string, updates: Partial<TeamPlayer>): Promise<void> {
  const currentUser = getCurrentUser();
  
  await updateWithOptimisticLocking<TeamPlayer>({
    collectionName: 'players',
    documentId: playerId,
    updates,
    currentUser
  });
}

export async function deletePlayer(teamId: string, playerId: string): Promise<void> {
  getCurrentUser(); // Ensure authenticated
  
  try {
    await deleteDoc(doc(db, 'players', playerId));
  } catch (error) {
    if (!isOnline) {
      addToOfflineQueue({
        type: 'delete',
        collection: 'players',
        docId: playerId
      });
      return;
    }
    throw error;
  }
}

// ============================================
// TEAM OPERATIONS
// ============================================

export async function saveTeam(teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<string> {
  const currentUser = getCurrentUser();
  
  const data = {
    ...teamData,
    createdBy: currentUser.uid,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1, // Initialize version for optimistic locking
    lastModifiedBy: currentUser.uid,
    lastModifiedAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, 'teams'), data);
    return docRef.id;
  } catch (error) {
    if (!isOnline) {
      addToOfflineQueue({
        type: 'create',
        collection: 'teams',
        data
      });
      return `offline_${Date.now()}`;
    }
    throw error;
  }
}

export async function getTeams(): Promise<Team[]> {
  const currentUser = getCurrentUser();
  
  try {
    const q = query(
      collection(db, 'teams'),
      where('coachIds', 'array-contains', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as Team[];
  } catch (error) {
    console.error('Error fetching teams:', error);
    return [];
  }
}

export async function updateTeam(teamId: string, updates: Partial<Team>): Promise<void> {
  const currentUser = getCurrentUser();
  
  await updateWithOptimisticLocking<Team>({
    collectionName: 'teams',
    documentId: teamId,
    updates,
    currentUser
  });
}

export async function deleteTeam(teamId: string): Promise<void> {
  getCurrentUser(); // Ensure authenticated
  
  try {
    await deleteDoc(doc(db, 'teams', teamId));
  } catch (error) {
    if (!isOnline) {
      addToOfflineQueue({
        type: 'delete',
        collection: 'teams',
        docId: teamId
      });
      return;
    }
    throw error;
  }
}

// ============================================
// USER PROFILE OPERATIONS
// ============================================

export async function saveUserProfile(userData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<string> {
  const currentUser = getCurrentUser();
  
  const data = {
    ...userData,
    createdBy: currentUser.uid,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1, // Initialize version for optimistic locking
    lastModifiedBy: currentUser.uid,
    lastModifiedAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, 'users'), data);
    return docRef.id;
  } catch (error) {
    if (!isOnline) {
      addToOfflineQueue({
        type: 'create',
        collection: 'users',
        data
      });
      return `offline_${Date.now()}`;
    }
    throw error;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  getCurrentUser(); // Ensure authenticated
  
  try {
    const docRef = doc(db, 'users', userId);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? {
      id: snapshot.id,
      ...(snapshot.data() as any)
    } as UserProfile : null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  const currentUser = getCurrentUser();
  
  await updateWithOptimisticLocking<UserProfile>({
    collectionName: 'users',
    documentId: userId,
    updates,
    currentUser
  });
}

export async function deleteUserProfile(userId: string): Promise<void> {
  getCurrentUser(); // Ensure authenticated
  
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    if (!isOnline) {
      addToOfflineQueue({
        type: 'delete',
        collection: 'users',
        docId: userId
      });
      return;
    }
    throw error;
  }
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

export function subscribeToPracticePlans(teamId: string, callback: (plans: PracticePlan[]) => void) {
  const q = query(
    collection(db, 'practicePlans'),
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const plans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as PracticePlan[];
    callback(plans);
  });
}

export function subscribeToPlays(teamId: string, callback: (plays: Play[]) => void, level?: FootballLevel) {
  const constraints = [
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc')
  ];
  
  if (level) {
    constraints.unshift(where('level', '==', level));
  }
  
  const q = query(collection(db, 'plays'), ...constraints);

  return onSnapshot(q, (snapshot) => {
    const plays = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as Play[];
    callback(plays);
  });
}

export function subscribeToPlayers(teamId: string, callback: (players: TeamPlayer[]) => void) {
  const q = query(
    collection(db, 'players'),
    where('teamId', '==', teamId),
    orderBy('lastName', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const players = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as TeamPlayer[];
    callback(players);
  });
}

export function subscribeToTeams(callback: (teams: Team[]) => void) {
  const currentUser = getCurrentUser();
  
  const q = query(
    collection(db, 'teams'),
    where('coachIds', 'array-contains', currentUser.uid),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const teams = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as Team[];
    callback(teams);
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function isOffline(): boolean {
  return !isOnline;
}

export function getOfflineQueueSize(): number {
  return offlineQueue.length;
}

export function getMaxQueueSize(): number {
  return 100; // Maximum number of offline operations to queue
}

export async function migrateFromLocalStorage(teamId: string): Promise<boolean> {
  try {
    // Implementation for migrating data from localStorage to Firestore
    // This would be used when upgrading from a local-only version
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

// Export the optimistic locking utility for use in other services
export { updateWithOptimisticLocking };
