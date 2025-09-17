// src/services/firestore.ts
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase/firebase-config';
import { createFirestoreHelper } from '../utils/firestore-sanitization';

// ============================================
// TYPES
// ============================================

export interface PracticePlan {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  date: Date;
  duration: number; // in minutes
  drills: Drill[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface Drill {
  id: string;
  name: string;
  description?: string;
  duration: number; // in minutes
  category: string;
  instructions?: string[];
}

export interface Play {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  formation: string;
  type: 'offense' | 'defense' | 'special';
  diagram?: string; // base64 encoded image
  players: PlayPlayer[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface PlayPlayer {
  id: string;
  position: string;
  x: number;
  y: number;
  route?: string;
  notes?: string;
}

// ============================================
// FIRESTORE HELPERS
// ============================================

const practicePlansHelper = createFirestoreHelper('practice_plans');
const playsHelper = createFirestoreHelper('plays');

// ============================================
// PRACTICE PLANS
// ============================================

export async function savePracticePlan(teamId: string, planData: Omit<PracticePlan, 'id' | 'teamId' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<string> {
  const planRef = collection(db, 'practice_plans');
  
  const plan = {
    ...planData,
    teamId,
    createdBy: 'current-user', // This should be replaced with actual user ID
  };

  // Sanitize data for Firestore write
  const { data: sanitizedPlan, isValid, warnings } = practicePlansHelper.prepareCreate(
    plan,
    ['teamId', 'title', 'date', 'duration', 'createdBy']
  );

  if (!isValid) {
    throw new Error('Invalid practice plan data');
  }

  const docRef = await addDoc(planRef, sanitizedPlan);
  
  // Log result
  practicePlansHelper.logResult('create', true, docRef.id, warnings);
  
  return docRef.id;
}

export async function getPracticePlans(teamId: string): Promise<PracticePlan[]> {
  const q = query(
    collection(db, 'practice_plans'),
    where('teamId', '==', teamId),
    orderBy('date', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as PracticePlan));
}

export async function updatePracticePlan(planId: string, updates: Partial<PracticePlan>): Promise<void> {
  const planRef = doc(db, 'practice_plans', planId);
  
  // Sanitize update data for Firestore write
  const { data: sanitizedUpdates, isValid, warnings } = practicePlansHelper.prepareUpdate(
    updates,
    ['id'] // id is required for updates
  );

  if (!isValid) {
    throw new Error('Invalid practice plan update data');
  }

  await updateDoc(planRef, sanitizedUpdates);
  
  // Log result
  practicePlansHelper.logResult('update', true, planId, warnings);
}

export async function deletePracticePlan(planId: string): Promise<void> {
  const planRef = doc(db, 'practice_plans', planId);
  await deleteDoc(planRef);
  
  // Log result
  practicePlansHelper.logResult('delete', true, planId);
}

export function subscribeToPracticePlans(teamId: string, callback: (plans: PracticePlan[]) => void): () => void {
  const q = query(
    collection(db, 'practice_plans'),
    where('teamId', '==', teamId),
    orderBy('date', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const plans = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PracticePlan));
    callback(plans);
  });
}

// ============================================
// PLAYS
// ============================================

export async function savePlay(teamId: string, playData: Omit<Play, 'id' | 'teamId' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<string> {
  const playRef = collection(db, 'plays');
  
  const play = {
    ...playData,
    teamId,
    createdBy: 'current-user', // This should be replaced with actual user ID
  };

  // Sanitize data for Firestore write
  const { data: sanitizedPlay, isValid, warnings } = playsHelper.prepareCreate(
    play,
    ['teamId', 'name', 'formation', 'type', 'createdBy']
  );

  if (!isValid) {
    throw new Error('Invalid play data');
  }

  const docRef = await addDoc(playRef, sanitizedPlay);
  
  // Log result
  playsHelper.logResult('create', true, docRef.id, warnings);
  
  return docRef.id;
}

export async function getPlays(teamId: string): Promise<Play[]> {
  const q = query(
    collection(db, 'plays'),
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Play));
}

export async function updatePlay(teamId: string, playId: string, updates: Partial<Play>): Promise<void> {
  const playRef = doc(db, 'plays', playId);
  
  // Sanitize update data for Firestore write
  const { data: sanitizedUpdates, isValid, warnings } = playsHelper.prepareUpdate(
    updates,
    ['id'] // id is required for updates
  );

  if (!isValid) {
    throw new Error('Invalid play update data');
  }

  await updateDoc(playRef, sanitizedUpdates);
  
  // Log result
  playsHelper.logResult('update', true, playId, warnings);
}

export async function deletePlay(playId: string): Promise<void> {
  const playRef = doc(db, 'plays', playId);
  await deleteDoc(playRef);
  
  // Log result
  playsHelper.logResult('delete', true, playId);
}

export function subscribeToPlays(teamId: string, callback: (plays: Play[]) => void): () => void {
  const q = query(
    collection(db, 'plays'),
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const plays = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Play));
    callback(plays);
  });
}

// ============================================
// MIGRATION UTILITIES
// ============================================

export async function migrateFromLocalStorage(): Promise<void> {
  try {
    // Check for existing data in localStorage
    const practicePlans = localStorage.getItem('practicePlans');
    const plays = localStorage.getItem('plays');
    
    if (practicePlans) {
      const plans = JSON.parse(practicePlans);
      console.log('Migrating practice plans from localStorage:', plans.length);
      // Migration logic would go here
    }
    
    if (plays) {
      const playsData = JSON.parse(plays);
      console.log('Migrating plays from localStorage:', playsData.length);
      // Migration logic would go here
    }
    
    // Clear localStorage after successful migration
    localStorage.removeItem('practicePlans');
    localStorage.removeItem('plays');
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================

export async function batchCreatePracticePlans(plans: Omit<PracticePlan, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[]): Promise<string[]> {
  const batch = writeBatch(db);
  const planRefs: any[] = [];
  
  for (const plan of plans) {
    const planRef = doc(collection(db, 'practice_plans'));
    planRefs.push(planRef);
    
    // Sanitize each plan
    const { data: sanitizedPlan, isValid } = practicePlansHelper.prepareCreate(
      {
        ...plan,
        teamId: plan.teamId,
        createdBy: 'current-user',
      },
      ['teamId', 'title', 'date', 'duration', 'createdBy']
    );
    
    if (!isValid) {
      throw new Error(`Invalid practice plan data: ${plan.title}`);
    }
    
    batch.set(planRef, sanitizedPlan);
  }
  
  await batch.commit();
  
  // Log result
  practicePlansHelper.logResult('batch_create', true, 'multiple', [`Created ${plans.length} practice plans`]);
  
  return planRefs.map(ref => ref.id);
}

export async function batchCreatePlays(plays: Omit<Play, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[]): Promise<string[]> {
  const batch = writeBatch(db);
  const playRefs: any[] = [];
  
  for (const play of plays) {
    const playRef = doc(collection(db, 'plays'));
    playRefs.push(playRef);
    
    // Sanitize each play
    const { data: sanitizedPlay, isValid } = playsHelper.prepareCreate(
      {
        ...play,
        teamId: play.teamId,
        createdBy: 'current-user',
      },
      ['teamId', 'name', 'formation', 'type', 'createdBy']
    );
    
    if (!isValid) {
      throw new Error(`Invalid play data: ${play.name}`);
    }
    
    batch.set(playRef, sanitizedPlay);
  }
  
  await batch.commit();
  
  // Log result
  playsHelper.logResult('batch_create', true, 'multiple', [`Created ${plays.length} plays`]);
  
  return playRefs.map(ref => ref.id);
}

