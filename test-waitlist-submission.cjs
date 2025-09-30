// Test script to submit a test entry to the waitlist
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'coach-core-ai'
});

const db = admin.firestore();

async function testWaitlistSubmission() {
  try {
    console.log('🧪 Testing waitlist submission...');
    
    // Test data that matches what the form sends
    const testData = {
      email: 'test@coachcore.ai',
      name: 'Test Coach',
      role: 'head-coach',
      referringCoach: 'John Smith',
      coachingChallenge: 'Client scheduling is a nightmare',
      source: 'waitlist-page',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending'
    };
    
    console.log('📝 Submitting test data:', testData);
    
    // Add to waitlist
    const docRef = await db.collection('waitlist').add(testData);
    console.log('✅ Successfully added test entry with ID:', docRef.id);
    
    // Verify the data was stored correctly
    const doc = await docRef.get();
    const storedData = doc.data();
    
    console.log('📋 Stored data:', storedData);
    
    // Check if all fields are present
    const requiredFields = ['email', 'name', 'role', 'source', 'createdAt', 'status'];
    const optionalFields = ['referringCoach', 'coachingChallenge'];
    
    console.log('\n🔍 Field validation:');
    requiredFields.forEach(field => {
      if (storedData[field]) {
        console.log(`✅ ${field}: ${storedData[field]}`);
      } else {
        console.log(`❌ ${field}: Missing!`);
      }
    });
    
    optionalFields.forEach(field => {
      if (storedData[field]) {
        console.log(`✅ ${field}: ${storedData[field]}`);
      } else {
        console.log(`ℹ️  ${field}: Not provided (optional)`);
      }
    });
    
    console.log('\n🎉 Test submission successful!');
    console.log('💡 You can now test the actual waitlist form at:');
    console.log('   https://coach-core-ai.web.app/waitlist');
    
    // Clean up - delete the test document
    console.log('\n🧹 Cleaning up test data...');
    await docRef.delete();
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Error testing waitlist submission:', error);
    console.error('Error details:', error.message);
    
    if (error.code === 'permission-denied') {
      console.log('\n💡 This suggests the Firestore rules might still be blocking writes.');
      console.log('   Check the rules at: https://console.firebase.google.com/project/coach-core-ai/firestore/rules');
    }
  }
}

testWaitlistSubmission();
