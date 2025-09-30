// Comprehensive verification script for waitlist data storage
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'coach-core-ai'
});

const db = admin.firestore();

async function verifyWaitlistData() {
  try {
    console.log('🔍 Verifying waitlist data storage...');
    console.log('=====================================');
    
    // Get all waitlist entries
    const snapshot = await db.collection('waitlist').get();
    
    if (snapshot.empty) {
      console.log('❌ No waitlist entries found');
      console.log('💡 This could mean:');
      console.log('   - No one has submitted the form yet');
      console.log('   - There might still be permission issues');
      console.log('   - The form submissions are failing silently');
      return;
    }
    
    console.log(`✅ Found ${snapshot.size} waitlist entries:`);
    console.log('=====================================');
    
    let totalEntries = 0;
    let validEntries = 0;
    let entriesWithReferrals = 0;
    let entriesWithChallenges = 0;
    
    const roleCounts = {};
    const challengeCounts = {};
    const referralCounts = {};
    const sourceCounts = {};
    
    snapshot.forEach((doc, index) => {
      totalEntries++;
      const data = doc.data();
      
      console.log(`${index + 1}. ${data.name || 'No name'} (${data.email || 'No email'})`);
      console.log(`   Role: ${data.role || 'No role'}`);
      console.log(`   Source: ${data.source || 'No source'}`);
      console.log(`   Created: ${data.createdAt?.toDate?.() || 'Unknown'}`);
      console.log(`   Status: ${data.status || 'No status'}`);
      
      if (data.referringCoach) {
        console.log(`   Referred by: ${data.referringCoach}`);
        entriesWithReferrals++;
      }
      
      if (data.coachingChallenge) {
        console.log(`   Challenge: ${data.coachingChallenge}`);
        entriesWithChallenges++;
      }
      
      // Validate required fields
      const isValid = data.email && data.name && data.role && data.source && data.createdAt;
      if (isValid) {
        validEntries++;
      } else {
        console.log(`   ⚠️  Missing required fields!`);
      }
      
      // Count statistics
      const role = data.role || 'unknown';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
      
      const source = data.source || 'unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      
      if (data.coachingChallenge) {
        const challenge = data.coachingChallenge.toLowerCase();
        challengeCounts[challenge] = (challengeCounts[challenge] || 0) + 1;
      }
      
      if (data.referringCoach) {
        const referrer = data.referringCoach;
        referralCounts[referrer] = (referralCounts[referrer] || 0) + 1;
      }
      
      console.log('   ---');
    });
    
    console.log('\n📊 Data Quality Report:');
    console.log('=======================');
    console.log(`Total entries: ${totalEntries}`);
    console.log(`Valid entries: ${validEntries} (${Math.round((validEntries/totalEntries)*100)}%)`);
    console.log(`Entries with referrals: ${entriesWithReferrals}`);
    console.log(`Entries with challenges: ${entriesWithChallenges}`);
    
    console.log('\n📈 Statistics:');
    console.log('===============');
    console.log('Roles:', roleCounts);
    console.log('Sources:', sourceCounts);
    console.log('Challenges:', challengeCounts);
    console.log('Referrals:', referralCounts);
    
    // Check for recent entries (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const recentEntries = snapshot.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate?.();
      return createdAt && createdAt > oneDayAgo;
    });
    
    console.log(`\n🕐 Recent entries (last 24h): ${recentEntries.length}`);
    
    if (recentEntries.length > 0) {
      console.log('Recent entries:');
      recentEntries.forEach((doc, index) => {
        const data = doc.data();
        console.log(`  ${index + 1}. ${data.name} (${data.email}) - ${data.createdAt?.toDate?.()}`);
      });
    }
    
    console.log('\n✅ Waitlist data verification complete!');
    
  } catch (error) {
    console.error('❌ Error verifying waitlist data:', error);
    console.error('Error details:', error.message);
  }
}

verifyWaitlistData();
