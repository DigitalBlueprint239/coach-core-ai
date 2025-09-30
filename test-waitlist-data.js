// Test script to verify waitlist data is being stored
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'coach-core-ai'
});

const db = admin.firestore();

async function testWaitlistData() {
  try {
    console.log('🔍 Checking waitlist data...');
    
    // Get all waitlist entries
    const snapshot = await db.collection('waitlist').get();
    
    if (snapshot.empty) {
      console.log('❌ No waitlist entries found');
      return;
    }
    
    console.log(`✅ Found ${snapshot.size} waitlist entries:`);
    console.log('=====================================');
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.name} (${data.email})`);
      console.log(`   Role: ${data.role}`);
      console.log(`   Source: ${data.source}`);
      console.log(`   Created: ${data.createdAt?.toDate?.() || 'Unknown'}`);
      if (data.referringCoach) {
        console.log(`   Referred by: ${data.referringCoach}`);
      }
      if (data.coachingChallenge) {
        console.log(`   Challenge: ${data.coachingChallenge}`);
      }
      console.log('   ---');
    });
    
    // Get statistics
    const roleCounts = {};
    const challengeCounts = {};
    const referralCounts = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Count by role
      const role = data.role || 'unknown';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
      
      // Count challenges
      if (data.coachingChallenge) {
        const challenge = data.coachingChallenge.toLowerCase();
        challengeCounts[challenge] = (challengeCounts[challenge] || 0) + 1;
      }
      
      // Count referrals
      if (data.referringCoach) {
        const referrer = data.referringCoach;
        referralCounts[referrer] = (referralCounts[referrer] || 0) + 1;
      }
    });
    
    console.log('\n📊 Statistics:');
    console.log('===============');
    console.log('Roles:', roleCounts);
    console.log('Challenges:', challengeCounts);
    console.log('Referrals:', referralCounts);
    
  } catch (error) {
    console.error('❌ Error checking waitlist data:', error);
  }
}

testWaitlistData();
