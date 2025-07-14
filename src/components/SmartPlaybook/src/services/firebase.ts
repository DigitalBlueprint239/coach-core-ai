import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { getAnalytics, logEvent } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Auth providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Types
export interface PracticePlan {
  id?: string;
  userId: string;
  title: string;
  sport: string;
  ageGroup: string;
  duration: number;
  goals: string[];
  activities: Array<{
    name: string;
    duration: number;
    description: string;
    focus: string;
  }>;
  aiInsights: string;
  confidence: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PlaySuggestion {
  id?: string;
  userId: string;
  playName: string;
  description: string;
  formation: string;
  keyPlayers: string[];
  reasoning: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  expectedOutcome: string;
  gameContext: {
    down: number;
    distance: number;
    fieldPosition: string;
    opponent: string;
  };
  createdAt: Timestamp;
}

export interface PlayerProgress {
  id?: string;
  userId: string;
  playerId: string;
  playerName: string;
  metrics: {
    [key: string]: {
      value: number;
      maxValue: number;
      unit: string;
      trend: 'up' | 'down' | 'stable';
      changePercent: number;
      category: string;
    };
  };
  timeRange: {
    start: Timestamp;
    end: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CoachProfile {
  id?: string;
  userId: string;
  name: string;
  email: string;
  sport: string;
  experience: number;
  rating: number;
  specialties: string[];
  isOnline: boolean;
  avatar?: string;
  bio?: string;
  location?: string;
  certifications?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Authentication Services
export const authService = {
  // Email/Password authentication
  signInWithEmail: async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      logEvent(analytics, 'login', { method: 'email' });
      return result.user;
    } catch (error) {
      console.error('Email sign in error:', error);
      throw error;
    }
  },

  signUpWithEmail: async (email: string, password: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile
      await setDoc(doc(db, 'coaches', result.user.uid), {
        userId: result.user.uid,
        name,
        email,
        sport: 'football', // default
        experience: 0,
        rating: 0,
        specialties: [],
        isOnline: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      logEvent(analytics, 'sign_up', { method: 'email' });
      return result.user;
    } catch (error) {
      console.error('Email sign up error:', error);
      throw error;
    }
  },

  // Social authentication
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if user profile exists, create if not
      const userDoc = await getDoc(doc(db, 'coaches', result.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'coaches', result.user.uid), {
          userId: result.user.uid,
          name: result.user.displayName || 'Coach',
          email: result.user.email,
          sport: 'football',
          experience: 0,
          rating: 0,
          specialties: [],
          isOnline: true,
          avatar: result.user.photoURL,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      logEvent(analytics, 'login', { method: 'google' });
      return result.user;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  },

  signInWithGithub: async () => {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      
      // Check if user profile exists, create if not
      const userDoc = await getDoc(doc(db, 'coaches', result.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'coaches', result.user.uid), {
          userId: result.user.uid,
          name: result.user.displayName || 'Coach',
          email: result.user.email,
          sport: 'football',
          experience: 0,
          rating: 0,
          specialties: [],
          isOnline: true,
          avatar: result.user.photoURL,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      logEvent(analytics, 'login', { method: 'github' });
      return result.user;
    } catch (error) {
      console.error('GitHub sign in error:', error);
      throw error;
    }
  },

  signOut: async () => {
    try {
      await signOut(auth);
      logEvent(analytics, 'logout');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  getCurrentUser: () => {
    return auth.currentUser;
  },
};

// Practice Plans Services
export const practicePlanService = {
  create: async (plan: Omit<PracticePlan, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'practicePlans'), {
        ...plan,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      logEvent(analytics, 'practice_plan_created', { sport: plan.sport });
      return docRef.id;
    } catch (error) {
      console.error('Create practice plan error:', error);
      throw error;
    }
  },

  getById: async (id: string): Promise<PracticePlan | null> => {
    try {
      const docRef = doc(db, 'practicePlans', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as PracticePlan;
      }
      return null;
    } catch (error) {
      console.error('Get practice plan error:', error);
      throw error;
    }
  },

  getByUserId: async (userId: string): Promise<PracticePlan[]> => {
    try {
      const q = query(
        collection(db, 'practicePlans'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PracticePlan[];
    } catch (error) {
      console.error('Get practice plans error:', error);
      throw error;
    }
  },

  update: async (id: string, updates: Partial<PracticePlan>) => {
    try {
      const docRef = doc(db, 'practicePlans', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      
      logEvent(analytics, 'practice_plan_updated');
    } catch (error) {
      console.error('Update practice plan error:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'practicePlans', id));
      logEvent(analytics, 'practice_plan_deleted');
    } catch (error) {
      console.error('Delete practice plan error:', error);
      throw error;
    }
  },

  // Real-time subscription
  subscribeToUserPlans: (userId: string, callback: (plans: PracticePlan[]) => void) => {
    const q = query(
      collection(db, 'practicePlans'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const plans = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PracticePlan[];
      callback(plans);
    });
  },
};

// Play Suggestions Services
export const playSuggestionService = {
  create: async (suggestion: Omit<PlaySuggestion, 'id' | 'createdAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'playSuggestions'), {
        ...suggestion,
        createdAt: serverTimestamp(),
      });
      
      logEvent(analytics, 'play_suggestion_created');
      return docRef.id;
    } catch (error) {
      console.error('Create play suggestion error:', error);
      throw error;
    }
  },

  getByUserId: async (userId: string): Promise<PlaySuggestion[]> => {
    try {
      const q = query(
        collection(db, 'playSuggestions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PlaySuggestion[];
    } catch (error) {
      console.error('Get play suggestions error:', error);
      throw error;
    }
  },

  // Real-time subscription
  subscribeToUserSuggestions: (userId: string, callback: (suggestions: PlaySuggestion[]) => void) => {
    const q = query(
      collection(db, 'playSuggestions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const suggestions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PlaySuggestion[];
      callback(suggestions);
    });
  },
};

// Player Progress Services
export const playerProgressService = {
  create: async (progress: Omit<PlayerProgress, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'playerProgress'), {
        ...progress,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      logEvent(analytics, 'player_progress_created');
      return docRef.id;
    } catch (error) {
      console.error('Create player progress error:', error);
      throw error;
    }
  },

  getByUserId: async (userId: string): Promise<PlayerProgress[]> => {
    try {
      const q = query(
        collection(db, 'playerProgress'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PlayerProgress[];
    } catch (error) {
      console.error('Get player progress error:', error);
      throw error;
    }
  },

  update: async (id: string, updates: Partial<PlayerProgress>) => {
    try {
      const docRef = doc(db, 'playerProgress', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      
      logEvent(analytics, 'player_progress_updated');
    } catch (error) {
      console.error('Update player progress error:', error);
      throw error;
    }
  },
};

// Coach Profile Services
export const coachProfileService = {
  getById: async (userId: string): Promise<CoachProfile | null> => {
    try {
      const docRef = doc(db, 'coaches', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as CoachProfile;
      }
      return null;
    } catch (error) {
      console.error('Get coach profile error:', error);
      throw error;
    }
  },

  update: async (userId: string, updates: Partial<CoachProfile>) => {
    try {
      const docRef = doc(db, 'coaches', userId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      
      logEvent(analytics, 'coach_profile_updated');
    } catch (error) {
      console.error('Update coach profile error:', error);
      throw error;
    }
  },

  getAll: async (): Promise<CoachProfile[]> => {
    try {
      const q = query(
        collection(db, 'coaches'),
        orderBy('rating', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CoachProfile[];
    } catch (error) {
      console.error('Get all coaches error:', error);
      throw error;
    }
  },
};

export { auth, db, analytics };
export default app; 