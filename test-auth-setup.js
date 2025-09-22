// Test script to verify Firebase Authentication setup
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB2iWL0UkuLJYpr-II9IpwGWDOMnLcfq_c",
  authDomain: "coach-core-ai.firebaseapp.com",
  projectId: "coach-core-ai",
  storageBucket: "coach-core-ai.appspot.com",
  messagingSenderId: "384023691487",
  appId: "1:384023691487:web:931094d7a0da903d6e696a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testAuthentication() {
  console.log('🔐 Testing Firebase Authentication Setup...\n');

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  try {
    // Test 1: Create user account
    console.log('Test 1: Creating user account...');
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ User created successfully:', userCredential.user.uid);

    // Test 2: Sign in with created account
    console.log('\nTest 2: Signing in with created account...');
    const signInCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ Sign in successful:', signInCredential.user.uid);

    // Test 3: Create user profile in Firestore
    console.log('\nTest 3: Creating user profile in Firestore...');
    const userProfile = {
      uid: userCredential.user.uid,
      email: testEmail,
      displayName: 'Test User',
      role: 'head-coach',
      createdAt: new Date(),
      teamId: null
    };
    
    const docRef = await addDoc(collection(db, 'users'), userProfile);
    console.log('✅ User profile created:', docRef.id);

    // Test 4: Sign out
    console.log('\nTest 4: Signing out...');
    await signOut(auth);
    console.log('✅ Sign out successful');

    // Test 5: Sign in again
    console.log('\nTest 5: Signing in again...');
    const reSignInCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ Re-sign in successful:', reSignInCredential.user.uid);

    // Clean up: Sign out
    await signOut(auth);

    console.log('\n🎉 All authentication tests passed!');
    console.log('\n📋 Authentication Status:');
    console.log('- ✅ Email/Password signup works');
    console.log('- ✅ Email/Password login works');
    console.log('- ✅ User data persists in Firestore');
    console.log('- ✅ Session management works');
    console.log('\n🚀 Firebase Authentication is properly configured!');

  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    
    if (error.code === 'auth/operation-not-allowed') {
      console.log('\n🔧 SOLUTION: Enable Email/Password authentication in Firebase Console');
      console.log('1. Go to Firebase Console → Authentication → Sign-in method');
      console.log('2. Enable Email/Password authentication');
      console.log('3. Run this test again');
    } else if (error.code === 'auth/unauthorized-domain') {
      console.log('\n🔧 SOLUTION: Add domain to authorized domains');
      console.log('1. Go to Firebase Console → Authentication → Settings');
      console.log('2. Add your domain to authorized domains');
      console.log('3. Run this test again');
    } else {
      console.log('\n🔧 Check Firebase Console configuration and try again');
    }
  }
}

// Run the test
testAuthentication();

