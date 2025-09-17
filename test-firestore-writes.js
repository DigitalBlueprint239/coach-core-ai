#!/usr/bin/env node

// test-firestore-writes.js
// Test script to verify Firestore writes return 200 responses instead of 400

const { initializeApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator, collection, addDoc, doc, setDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "test-api-key",
  authDomain: "test-project.firebaseapp.com",
  projectId: "test-project",
  storageBucket: "test-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "test-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to Firestore emulator
connectFirestoreEmulator(db, 'localhost', 8080);

// Test data with potential undefined/null values
const testData = {
  // Valid data
  validUser: {
    uid: 'test-user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    createdAt: new Date(),
    lastLoginAt: new Date(),
    subscription: 'free',
    subscriptionStatus: 'active',
    role: 'coach'
  },
  
  // Data with undefined values (should be sanitized)
  userWithUndefined: {
    uid: 'test-user-2',
    email: 'test2@example.com',
    displayName: 'Test User 2',
    photoURL: undefined, // This should be removed
    bio: undefined, // This should be removed
    createdAt: new Date(),
    lastLoginAt: new Date(),
    subscription: 'free',
    subscriptionStatus: 'active',
    role: 'coach',
    preferences: {
      theme: 'light',
      notifications: true,
      invalidField: undefined // This should be removed
    }
  },
  
  // Data with null values (should be kept but logged)
  userWithNull: {
    uid: 'test-user-3',
    email: 'test3@example.com',
    displayName: 'Test User 3',
    photoURL: null, // This should be kept
    bio: null, // This should be kept
    createdAt: new Date(),
    lastLoginAt: new Date(),
    subscription: 'free',
    subscriptionStatus: 'active',
    role: 'coach'
  },
  
  // Waitlist data
  validWaitlist: {
    email: 'waitlist@example.com',
    source: 'landing-page',
    timestamp: new Date(),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Test Browser)'
  },
  
  // Waitlist with undefined values
  waitlistWithUndefined: {
    email: 'waitlist2@example.com',
    source: 'landing-page',
    timestamp: new Date(),
    ipAddress: undefined, // Should be removed
    userAgent: undefined, // Should be removed
    invalidField: undefined // Should be removed
  },
  
  // Team data
  validTeam: {
    id: 'team-1',
    name: 'Test Team',
    sport: 'football',
    ageGroup: 'adult',
    headCoachId: 'test-user-1',
    assistantCoachIds: [],
    players: [],
    settings: {
      season: '2024',
      league: 'Local League',
      division: 'Open'
    }
  },
  
  // Team with undefined values
  teamWithUndefined: {
    id: 'team-2',
    name: 'Test Team 2',
    sport: 'football',
    ageGroup: 'adult',
    headCoachId: 'test-user-1',
    assistantCoachIds: [],
    players: [],
    description: undefined, // Should be removed
    invalidField: undefined, // Should be removed
    settings: {
      season: '2024',
      league: 'Local League',
      division: 'Open',
      invalidSetting: undefined // Should be removed
    }
  }
};

async function testFirestoreWrites() {
  console.log('🧪 Testing Firestore writes with sanitization...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };
  
  // Test 1: Valid user data
  try {
    console.log('Test 1: Valid user data');
    const userRef = doc(db, 'users', testData.validUser.uid);
    await setDoc(userRef, testData.validUser);
    console.log('✅ PASS: Valid user data written successfully\n');
    results.passed++;
  } catch (error) {
    console.log('❌ FAIL: Valid user data failed:', error.message, '\n');
    results.failed++;
    results.errors.push({ test: 'Valid user data', error: error.message });
  }
  
  // Test 2: User data with undefined values
  try {
    console.log('Test 2: User data with undefined values');
    const userRef = doc(db, 'users', testData.userWithUndefined.uid);
    await setDoc(userRef, testData.userWithUndefined);
    console.log('✅ PASS: User data with undefined values written successfully (should be sanitized)\n');
    results.passed++;
  } catch (error) {
    console.log('❌ FAIL: User data with undefined values failed:', error.message, '\n');
    results.failed++;
    results.errors.push({ test: 'User data with undefined', error: error.message });
  }
  
  // Test 3: User data with null values
  try {
    console.log('Test 3: User data with null values');
    const userRef = doc(db, 'users', testData.userWithNull.uid);
    await setDoc(userRef, testData.userWithNull);
    console.log('✅ PASS: User data with null values written successfully\n');
    results.passed++;
  } catch (error) {
    console.log('❌ FAIL: User data with null values failed:', error.message, '\n');
    results.failed++;
    results.errors.push({ test: 'User data with null', error: error.message });
  }
  
  // Test 4: Valid waitlist data
  try {
    console.log('Test 4: Valid waitlist data');
    const waitlistRef = collection(db, 'waitlist');
    const docRef = await addDoc(waitlistRef, testData.validWaitlist);
    console.log('✅ PASS: Valid waitlist data written successfully:', docRef.id, '\n');
    results.passed++;
  } catch (error) {
    console.log('❌ FAIL: Valid waitlist data failed:', error.message, '\n');
    results.failed++;
    results.errors.push({ test: 'Valid waitlist data', error: error.message });
  }
  
  // Test 5: Waitlist data with undefined values
  try {
    console.log('Test 5: Waitlist data with undefined values');
    const waitlistRef = collection(db, 'waitlist');
    const docRef = await addDoc(waitlistRef, testData.waitlistWithUndefined);
    console.log('✅ PASS: Waitlist data with undefined values written successfully (should be sanitized):', docRef.id, '\n');
    results.passed++;
  } catch (error) {
    console.log('❌ FAIL: Waitlist data with undefined values failed:', error.message, '\n');
    results.failed++;
    results.errors.push({ test: 'Waitlist data with undefined', error: error.message });
  }
  
  // Test 6: Valid team data
  try {
    console.log('Test 6: Valid team data');
    const teamRef = doc(db, 'teams', testData.validTeam.id);
    await setDoc(teamRef, testData.validTeam);
    console.log('✅ PASS: Valid team data written successfully\n');
    results.passed++;
  } catch (error) {
    console.log('❌ FAIL: Valid team data failed:', error.message, '\n');
    results.failed++;
    results.errors.push({ test: 'Valid team data', error: error.message });
  }
  
  // Test 7: Team data with undefined values
  try {
    console.log('Test 7: Team data with undefined values');
    const teamRef = doc(db, 'teams', testData.teamWithUndefined.id);
    await setDoc(teamRef, testData.teamWithUndefined);
    console.log('✅ PASS: Team data with undefined values written successfully (should be sanitized)\n');
    results.passed++;
  } catch (error) {
    console.log('❌ FAIL: Team data with undefined values failed:', error.message, '\n');
    results.failed++;
    results.errors.push({ test: 'Team data with undefined', error: error.message });
  }
  
  // Summary
  console.log('📊 Test Results Summary:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n🚨 Errors:');
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  console.log('\n🎯 Expected Results:');
  console.log('- All tests should pass with 200 responses');
  console.log('- Undefined values should be sanitized (removed)');
  console.log('- Null values should be kept but logged');
  console.log('- No 400 errors should occur');
  
  return results;
}

// Run the tests
if (require.main === module) {
  testFirestoreWrites()
    .then((results) => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { testFirestoreWrites };

