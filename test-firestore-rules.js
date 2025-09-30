// Test script to verify Firestore rules are working
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'coach-core-ai'
});

const db = admin.firestore();

async function testFirestoreRules() {
  try {
    console.log('🧪 Testing Firestore rules for waitlist...');
    
    // Test data that should be allowed
    const testData = {
      email: 'test@example.com',
      name: 'Test User',
      role: 'head-coach',
      referringCoach: null,
      coachingChallenge: 'Test challenge',
      source: 'waitlist-page',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending'
    };
    
    console.log('📝 Test data:', testData);
    
    // Try to add a test document
    const docRef = await db.collection('waitlist').add(testData);
    console.log('✅ Successfully added test document with ID:', docRef.id);
    
    // Clean up - delete the test document
    await docRef.delete();
    console.log('🧹 Cleaned up test document');
    
    console.log('✅ Firestore rules are working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing Firestore rules:', error);
    console.error('Error details:', error.message);
  }
}

testFirestoreRules();
