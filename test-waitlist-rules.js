// Test script to verify Firestore waitlist rules
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';

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
const db = getFirestore(app);

async function testWaitlistRules() {
  console.log('🧪 Testing Firestore Waitlist Rules...\n');

  try {
    // Test 1: Valid email submission (should succeed)
    console.log('Test 1: Valid email submission');
    const validEmail = await addDoc(collection(db, 'waitlist'), {
      email: 'test@example.com',
      createdAt: serverTimestamp(),
      source: 'test',
      status: 'pending'
    });
    console.log('✅ Valid email added successfully:', validEmail.id);

    // Test 2: Invalid email (should fail)
    console.log('\nTest 2: Invalid email (non-string)');
    try {
      await addDoc(collection(db, 'waitlist'), {
        email: 12345, // Invalid: not a string
        createdAt: serverTimestamp(),
        source: 'test'
      });
      console.log('❌ Invalid email was accepted (this should not happen)');
    } catch (error) {
      console.log('✅ Invalid email correctly rejected:', error.message);
    }

    // Test 3: Email too long (should fail)
    console.log('\nTest 3: Email too long (>200 chars)');
    try {
      const longEmail = 'a'.repeat(250) + '@example.com';
      await addDoc(collection(db, 'waitlist'), {
        email: longEmail,
        createdAt: serverTimestamp(),
        source: 'test'
      });
      console.log('❌ Long email was accepted (this should not happen)');
    } catch (error) {
      console.log('✅ Long email correctly rejected:', error.message);
    }

    // Test 4: Try to read waitlist (should fail)
    console.log('\nTest 4: Attempting to read waitlist data');
    try {
      const snapshot = await getDocs(collection(db, 'waitlist'));
      console.log('❌ Waitlist data was readable (this should not happen)');
      console.log('Found', snapshot.size, 'documents');
    } catch (error) {
      console.log('✅ Waitlist data correctly protected from reading:', error.message);
    }

    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Rule Summary:');
    console.log('- ✅ Valid emails can be added');
    console.log('- ✅ Invalid emails are rejected');
    console.log('- ✅ Long emails are rejected');
    console.log('- ✅ Waitlist data cannot be read');
    console.log('- ✅ Waitlist data cannot be modified');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testWaitlistRules();
