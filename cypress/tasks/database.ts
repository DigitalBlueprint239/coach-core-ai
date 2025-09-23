// cypress/tasks/database.ts

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, addDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';

// Firebase configuration for testing
const firebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-project.firebaseapp.com',
  projectId: 'test-project',
  storageBucket: 'test-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef'
};

let app: any;
let db: any;
let auth: any;

const initializeFirebase = () => {
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Connect to emulators
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
  }
};

export const seed = async () => {
  try {
    initializeFirebase();
    
    // Seed test users
    const testUsers = [
      {
        email: 'test@coachcore.ai',
        password: 'TestPassword123!',
        displayName: 'Test User',
        subscription: {
          plan: 'free',
          status: 'active'
        }
      },
      {
        email: 'prouser@coachcore.ai',
        password: 'TestPassword123!',
        displayName: 'Pro User',
        subscription: {
          plan: 'pro',
          status: 'active',
          subscriptionId: 'sub_test_123'
        }
      },
      {
        email: 'freeuser@coachcore.ai',
        password: 'TestPassword123!',
        displayName: 'Free User',
        subscription: {
          plan: 'free',
          status: 'active'
        }
      }
    ];

    for (const userData of testUsers) {
      try {
        await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        
        // Add user profile to Firestore
        await addDoc(collection(db, 'users'), {
          email: userData.email,
          displayName: userData.displayName,
          subscription: userData.subscription,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } catch (error) {
        // User might already exist, continue
        console.log(`User ${userData.email} might already exist`);
      }
    }

    // Seed test teams
    const testTeams = [
      {
        name: 'Test Team',
        sport: 'Football',
        ageGroup: 'High School',
        season: 'Fall 2024',
        ownerId: 'test-user-id',
        members: ['test-user-id']
      },
      {
        name: 'Pro Team',
        sport: 'Football',
        ageGroup: 'College',
        season: 'Fall 2024',
        ownerId: 'pro-user-id',
        members: ['pro-user-id']
      }
    ];

    for (const teamData of testTeams) {
      await addDoc(collection(db, 'teams'), {
        ...teamData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Seed test plays
    const testPlays = [
      {
        name: 'Test Play 1',
        description: 'A simple offensive play',
        formation: 'I-Formation',
        teamId: 'team-123',
        createdBy: 'test-user-id',
        isPublic: false
      },
      {
        name: 'Test Play 2',
        description: 'Another offensive play',
        formation: 'Spread Formation',
        teamId: 'team-123',
        createdBy: 'test-user-id',
        isPublic: true
      }
    ];

    for (const playData of testPlays) {
      await addDoc(collection(db, 'plays'), {
        ...playData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Seed test practices
    const testPractices = [
      {
        name: 'Monday Practice',
        date: '2024-01-15',
        duration: 90,
        teamId: 'team-123',
        createdBy: 'test-user-id',
        drills: []
      },
      {
        name: 'Wednesday Practice',
        date: '2024-01-17',
        duration: 120,
        teamId: 'team-123',
        createdBy: 'test-user-id',
        drills: []
      }
    ];

    for (const practiceData of testPractices) {
      await addDoc(collection(db, 'practices'), {
        ...practiceData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Seed waitlist entries
    const waitlistEntries = [
      {
        email: 'waitlist1@example.com',
        source: 'landing-page',
        createdAt: new Date()
      },
      {
        email: 'waitlist2@example.com',
        source: 'pricing-page',
        createdAt: new Date()
      }
    ];

    for (const entry of waitlistEntries) {
      await addDoc(collection(db, 'waitlist'), entry);
    }

    return { success: true, message: 'Database seeded successfully' };
  } catch (error) {
    console.error('Error seeding database:', error);
    return { success: false, error: error.message };
  }
};

export const clean = async () => {
  try {
    initializeFirebase();
    
    // Clean up test data
    const collections = ['users', 'teams', 'plays', 'practices', 'waitlist', 'subscriptions'];
    
    for (const collectionName of collections) {
      const q = query(collection(db, collectionName));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = querySnapshot.docs.map(docSnapshot => 
        deleteDoc(doc(db, collectionName, docSnapshot.id))
      );
      
      await Promise.all(deletePromises);
    }

    return { success: true, message: 'Database cleaned successfully' };
  } catch (error) {
    console.error('Error cleaning database:', error);
    return { success: false, error: error.message };
  }
};

export const reset = async () => {
  try {
    // First clean, then seed
    await clean();
    await seed();
    
    return { success: true, message: 'Database reset successfully' };
  } catch (error) {
    console.error('Error resetting database:', error);
    return { success: false, error: error.message };
  }
};






