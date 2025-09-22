#!/usr/bin/env node

const { featureFlagService } = require('../src/services/feature-flags/feature-flag-service');

// Sample beta users for testing
const sampleBetaUsers = [
  {
    userId: 'coach_1',
    email: 'coach1@example.com',
    name: 'John Smith',
    notes: 'High school football coach, 5 years experience',
  },
  {
    userId: 'coach_2',
    email: 'coach2@example.com',
    name: 'Sarah Johnson',
    notes: 'Youth soccer coach, 3 years experience',
  },
  {
    userId: 'coach_3',
    email: 'coach3@example.com',
    name: 'Mike Davis',
    notes: 'College basketball coach, 10 years experience',
  },
  {
    userId: 'coach_4',
    email: 'coach4@example.com',
    name: 'Lisa Wilson',
    notes: 'High school volleyball coach, 7 years experience',
  },
  {
    userId: 'coach_5',
    email: 'coach5@example.com',
    name: 'David Brown',
    notes: 'Youth baseball coach, 4 years experience',
  },
];

// Enroll beta users
async function enrollBetaUsers() {
  try {
    console.log('🚀 Enrolling beta users...');

    // Wait for feature flag service to initialize
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!featureFlagService.isReady() && attempts < maxAttempts) {
      console.log('⏳ Waiting for feature flag service to initialize...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!featureFlagService.isReady()) {
      throw new Error('Feature flag service failed to initialize');
    }

    console.log('✅ Feature flag service initialized');

    // Enroll each user
    for (const user of sampleBetaUsers) {
      try {
        featureFlagService.addBetaUser(user);
        console.log(`✅ Enrolled: ${user.name} (${user.email})`);
      } catch (error) {
        console.error(`❌ Failed to enroll ${user.name}:`, error.message);
      }
    }

    // Display enrolled users
    const allBetaUsers = featureFlagService.getAllBetaUsers();
    console.log(`\n📊 Total beta users: ${allBetaUsers.length}`);

    console.log('\n👥 Enrolled Beta Users:');
    allBetaUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email})`);
      console.log(`     User ID: ${user.userId}`);
      console.log(`     Status: ${user.status}`);
      console.log(`     Enrolled: ${user.enrolledAt.toLocaleDateString()}`);
      if (user.notes) {
        console.log(`     Notes: ${user.notes}`);
      }
      console.log('');
    });

    // Test feature access
    console.log('🧪 Testing feature access...');
    const testUserId = sampleBetaUsers[0].userId;
    
    const features = ['betaFeatures', 'playDesigner', 'dashboard', 'aiPlayGenerator'];
    features.forEach(feature => {
      const hasAccess = featureFlagService.isFeatureEnabled(feature, testUserId);
      const accessDetails = featureFlagService.getFeatureAccess(feature, testUserId);
      console.log(`  • ${feature}: ${hasAccess ? '✅' : '❌'} (${accessDetails.reason})`);
    });

    console.log('\n🎉 Beta user enrollment complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Test feature flags in your application');
    console.log('2. Monitor user activity and feedback');
    console.log('3. Update Firebase Remote Config with user IDs');

  } catch (error) {
    console.error('❌ Error enrolling beta users:', error);
    process.exit(1);
  }
}

// Run enrollment
enrollBetaUsers();
