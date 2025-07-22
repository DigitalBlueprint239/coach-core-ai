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
  disableNetwork
} from 'firebase/firestore';
import { getAuth, connectAuthEmulator, onAuthStateChanged, type User } from 'firebase/auth';

// Initialize Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
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
if (import.meta.env.VITE_USE_EMULATOR === 'true' && import.meta.env.MODE === 'development') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
  } catch (error) {
    console.log('Emulators already connected');
  }
}

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

// Auth state management
let currentUser: User | null = null;
let authStateReady = false;
let authStateListeners: ((user: User | null) => void)[] = [];

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  authStateReady = true;
  authStateListeners.forEach(listener => listener(user));
});

// Helper function to get current user with proper error handling
function getCurrentUser(): User {
  if (!authStateReady) {
    throw new Error('Auth state not ready. Please wait for authentication to initialize.');
  }
  
  if (!currentUser) {
    throw new Error('User must be authenticated to perform this operation.');
  }
  
  return currentUser;
}

// Helper function to wait for auth state
export function waitForAuth(): Promise<User | null> {
  return new Promise((resolve) => {
    if (authStateReady) {
      resolve(currentUser);
    } else {
      authStateListeners.push(resolve);
    }
  });
}

// Subscribe to auth state changes
export function onAuthStateChange(listener: (user: User | null) => void): () => void {
  authStateListeners.push(listener);
  
  // Call immediately if auth state is ready
  if (authStateReady) {
    listener(currentUser);
  }
  
  // Return unsubscribe function
  return () => {
    const index = authStateListeners.indexOf(listener);
    if (index > -1) {
      authStateListeners.splice(index, 1);
    }
  };
}

// Offline queue management
let offlineQueue: any[] = [];
let isOnline = navigator.onLine;
const MAX_QUEUE_SIZE = 100; // Prevent unlimited growth

// Network status monitoring
window.addEventListener('online', () => {
  isOnline = true;
  enableNetwork(db);
  syncOfflineQueue();
});

window.addEventListener('offline', () => {
  isOnline = false;
  disableNetwork(db);
});

// Load offline queue from localStorage
function loadOfflineQueue() {
  const stored = localStorage.getItem('firestore_offline_queue');
  if (stored) {
    try {
      offlineQueue = JSON.parse(stored);
      // Limit queue size to prevent memory issues
      if (offlineQueue.length > MAX_QUEUE_SIZE) {
        offlineQueue = offlineQueue.slice(-MAX_QUEUE_SIZE);
        saveOfflineQueue();
      }
    } catch (error) {
      console.error('Failed to parse offline queue:', error);
      offlineQueue = [];
    }
  }
}

function saveOfflineQueue() {
  localStorage.setItem('firestore_offline_queue', JSON.stringify(offlineQueue));
}

function addToOfflineQueue(operation: any) {
  // Prevent queue from growing too large
  if (offlineQueue.length >= MAX_QUEUE_SIZE) {
    console.warn('Offline queue is full. Removing oldest operation.');
    offlineQueue.shift();
  }
  
  offlineQueue.push({
    ...operation,
    id: `offline_${Date.now()}_${Math.random()}`,
    timestamp: new Date().toISOString()
  });
  saveOfflineQueue();
}

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

// Initialize offline queue
loadOfflineQueue();

// PRACTICE PLANS API
export async function savePracticePlan(teamId: string, planData: Omit<PracticePlan, 'id' | 'teamId' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<string> {
  const user = getCurrentUser();
  
  const plan = {
    ...planData,
    teamId,
    createdBy: user.uid,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  try {
    const docRef = await addDoc(collection(db, 'practicePlans'), plan);
    return docRef.id;
  } catch (error) {
    if (!isOnline) {
      const tempId = `offline_${Date.now()}`;
      addToOfflineQueue({
        type: 'create',
        collection: 'practicePlans',
        data: plan,
        tempId
      });
      return tempId;
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
  getCurrentUser(); // Ensure authenticated
  
  const data = {
    ...updates,
    updatedAt: new Date()
  };

  try {
    await updateDoc(doc(db, 'practicePlans', planId), data);
  } catch (error) {
    if (!isOnline) {
      addToOfflineQueue({
        type: 'update',
        collection: 'practicePlans',
        docId: planId,
        data
      });
      return;
    }
    throw error;
  }
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

// SMART PLAYBOOK API
export async function savePlay(teamId: string, playData: Omit<Play, 'id' | 'teamId' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<string> {
  const user = getCurrentUser();
  
  const play = {
    ...playData,
    teamId,
    createdBy: user.uid,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  try {
    const docRef = await addDoc(collection(db, 'plays'), play);
    return docRef.id;
  } catch (error) {
    if (!isOnline) {
      const tempId = `offline_${Date.now()}`;
      addToOfflineQueue({
        type: 'create',
        collection: 'plays',
        data: play,
        tempId
      });
      return tempId;
    }
    throw error;
  }
}

export async function getPlays(teamId: string): Promise<Play[]> {
  getCurrentUser(); // Ensure authenticated
  
  try {
    const q = query(
      collection(db, 'plays'),
      where('teamId', '==', teamId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Play[];
  } catch (error) {
    console.error('Error fetching plays:', error);
    throw error;
  }
}

export async function updatePlay(teamId: string, playId: string, updates: Partial<Play>): Promise<void> {
  getCurrentUser(); // Ensure authenticated
  
  const data = {
    ...updates,
    updatedAt: new Date()
  };

  try {
    await updateDoc(doc(db, 'plays', playId), data);
  } catch (error) {
    if (!isOnline) {
      addToOfflineQueue({
        type: 'update',
        collection: 'plays',
        docId: playId,
        data
      });
      return;
    }
    throw error;
  }
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
    const plays = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Play[];
    callback(plays);
  });
}

// UTILITY FUNCTIONS
export function isOffline(): boolean {
  return !isOnline;
}

export function getOfflineQueueSize(): number {
  return offlineQueue.length;
}

export function getMaxQueueSize(): number {
  return MAX_QUEUE_SIZE;
}

// MIGRATION HELPER
export async function migrateFromLocalStorage(teamId: string): Promise<boolean> {
  try {
    // Migrate practice plans
    const storedPlans = localStorage.getItem('practicePlans');
    if (storedPlans) {
      const plans = JSON.parse(storedPlans);
      for (const plan of plans) {
        await savePracticePlan(teamId, plan);
      }
      localStorage.removeItem('practicePlans');
    }

    // Migrate plays
    const storedPlays = localStorage.getItem('plays');
    if (storedPlays) {
      const plays = JSON.parse(storedPlays);
      for (const play of plays) {
        await savePlay(teamId, play);
      }
      localStorage.removeItem('plays');
    }

    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}
