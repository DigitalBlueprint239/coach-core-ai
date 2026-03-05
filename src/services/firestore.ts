import { doc, collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, connectFirestoreEmulator, enableNetwork, disableNetwork } from 'firebase/firestore';
import { connectAuthEmulator, onAuthStateChanged, type User } from 'firebase/auth';
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
if (process.env.NODE_ENV === 'development') {
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

// Offline Persistence (for Firestore)
let isOnline = navigator.onLine;
let offlineQueue: any[] = [];

window.addEventListener('online', () => {
  isOnline = true;
  syncOfflineQueue();
});

window.addEventListener('offline', () => {
  isOnline = false;
});

function addToOfflineQueue(operation: { type: string; collection: string; data?: Record<string, unknown>; docId?: string; tempId?: string }) {
  offlineQueue.push(operation);
  saveOfflineQueue();
}

function saveOfflineQueue() {
  localStorage.setItem('offline_operations', JSON.stringify(offlineQueue));
}

function loadOfflineQueue() {
  const storedQueue = localStorage.getItem('offline_operations');
  if (storedQueue) {
    offlineQueue = JSON.parse(storedQueue);
  }
}

async function syncOfflineQueue() {
  if (!isOnline || offlineQueue.length === 0) {
    return;
  }

  const queue = [...offlineQueue];
  offlineQueue = [];
  saveOfflineQueue();

  for (const operation of queue) {
    try {
      await executeOperation(operation);
    } catch (error: unknown) {
      console.error('Failed to sync offline operation:', error);
      // Only add back to queue if it's not a permanent error
      if (!(error instanceof Error && error.message?.includes('permission-denied'))) {
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

export async function migrateFromLocalStorage(teamId: string): Promise<void> {
  // Migrate any data from localStorage to Firestore
  const localStorageKey = `coach-core-ai-${teamId}`;
  const localData = localStorage.getItem(localStorageKey);
  
  if (localData) {
    try {
      const data = JSON.parse(localData);
      // Migrate plays
      if (data.plays && Array.isArray(data.plays)) {
        for (const play of data.plays) {
          await savePlay(teamId, {
            name: play.name,
            formation: play.formation,
            description: play.description || '',
            routes: play.routes || [],
            players: play.players || [],
            tags: play.tags || [],
            difficulty: play.difficulty || 'beginner',
            sport: play.sport || 'football'
          });
        }
      }
      // Migrate practice plans
      if (data.plans && Array.isArray(data.plans)) {
        for (const plan of data.plans) {
          await savePracticePlan(teamId, {
            name: plan.name,
            date: plan.date,
            duration: plan.duration,
            periods: plan.periods || [],
            goals: plan.goals || [],
            notes: plan.notes || ''
          });
        }
      }
      // Clear localStorage after successful migration
      localStorage.removeItem(localStorageKey);
    } catch (error) {
      console.error('Error migrating from localStorage:', error);
    }
  }
}

export { db, auth };
