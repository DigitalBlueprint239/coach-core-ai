#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Firebase service account key (you'll need to add this)
const serviceAccount = require('../firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const remoteConfig = admin.remoteConfig();

// Feature flag configurations
const featureFlags = {
  betaFeatures: {
    defaultValue: false,
    description: 'Enable beta features for selected users',
    conditions: [
      {
        name: 'beta_users',
        expression: 'user in ["coach_1", "coach_2", "coach_3"]',
        value: true,
      },
    ],
  },
  playDesigner: {
    defaultValue: false,
    description: 'Enable Play Designer feature',
    conditions: [
      {
        name: 'beta_users',
        expression: 'user in ["coach_1", "coach_2", "coach_3"]',
        value: true,
      },
    ],
  },
  dashboard: {
    defaultValue: false,
    description: 'Enable Dashboard feature',
    conditions: [
      {
        name: 'beta_users',
        expression: 'user in ["coach_1", "coach_2", "coach_3"]',
        value: true,
      },
    ],
  },
  aiPlayGenerator: {
    defaultValue: false,
    description: 'Enable AI Play Generator feature',
    conditions: [
      {
        name: 'beta_users',
        expression: 'user in ["coach_1", "coach_2", "coach_3"]',
        value: true,
      },
    ],
  },
  teamManagement: {
    defaultValue: false,
    description: 'Enable Team Management feature',
    conditions: [
      {
        name: 'beta_users',
        expression: 'user in ["coach_1", "coach_2", "coach_3"]',
        value: true,
      },
    ],
  },
  practicePlanner: {
    defaultValue: false,
    description: 'Enable Practice Planner feature',
    conditions: [
      {
        name: 'beta_users',
        expression: 'user in ["coach_1", "coach_2", "coach_3"]',
        value: true,
      },
    ],
  },
};

// Setup Remote Config
async function setupRemoteConfig() {
  try {
    console.log('🚀 Setting up Firebase Remote Config...');

    // Get current configuration
    const currentConfig = await remoteConfig.getTemplate();
    console.log('📋 Current configuration retrieved');

    // Update parameters
    Object.entries(featureFlags).forEach(([key, config]) => {
      if (!currentConfig.parameters[key]) {
        currentConfig.parameters[key] = {
          defaultValue: { booleanValue: config.defaultValue },
          description: config.description,
        };
      }

      // Add conditions
      if (config.conditions) {
        config.conditions.forEach((condition) => {
          if (!currentConfig.conditions[condition.name]) {
            currentConfig.conditions[condition.name] = {
              expression: condition.expression,
            };
          }

          // Add conditional values
          if (!currentConfig.parameters[key].conditionalValues) {
            currentConfig.parameters[key].conditionalValues = {};
          }
          currentConfig.parameters[key].conditionalValues[condition.name] = {
            value: { booleanValue: condition.value },
          };
        });
      }
    });

    // Publish configuration
    const updatedConfig = await remoteConfig.publishTemplate(currentConfig);
    console.log('✅ Remote Config updated successfully');
    console.log(`📊 Version: ${updatedConfig.versionNumber}`);

    // Save configuration to file
    const configPath = path.join(__dirname, '..', 'deploy-logs', 'remote-config.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
    console.log(`💾 Configuration saved to: ${configPath}`);

    // Display summary
    console.log('\n📋 Feature Flags Summary:');
    Object.entries(featureFlags).forEach(([key, config]) => {
      console.log(`  • ${key}: ${config.defaultValue ? 'Enabled' : 'Disabled'} (default)`);
      if (config.conditions) {
        config.conditions.forEach((condition) => {
          console.log(`    - ${condition.name}: ${condition.value ? 'Enabled' : 'Disabled'}`);
        });
      }
    });

    console.log('\n🎉 Remote Config setup complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Update the beta user list in the conditions');
    console.log('2. Test feature flags in your application');
    console.log('3. Monitor usage in Firebase Console');

  } catch (error) {
    console.error('❌ Error setting up Remote Config:', error);
    process.exit(1);
  }
}

// Run setup
setupRemoteConfig();
