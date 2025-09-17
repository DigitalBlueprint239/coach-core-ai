#!/usr/bin/env node

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where, orderBy, limit } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } = require('firebase/auth');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Firebase configuration (using staging environment)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "coach-core-ai-staging.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "coach-core-ai-staging",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "coach-core-ai-staging.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "your-sender-id",
  appId: process.env.FIREBASE_APP_ID || "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Test configurations
const FIREBASE_TEST_SCENARIOS = [
  {
    name: '100 Concurrent Users - Firebase Operations',
    concurrentUsers: 100,
    duration: 120, // 2 minutes
    operationsPerUser: 10
  },
  {
    name: '500 Concurrent Users - Firebase Operations',
    concurrentUsers: 500,
    duration: 300, // 5 minutes
    operationsPerUser: 8
  },
  {
    name: '1000 Concurrent Users - Firebase Operations',
    concurrentUsers: 1000,
    duration: 300, // 5 minutes
    operationsPerUser: 5
  }
];

// Test data generators
class TestDataGenerator {
  static generateUser(index) {
    return {
      email: `loadtest-user-${index}-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      displayName: `LoadTest User ${index}`,
      uid: `loadtest-${index}-${Date.now()}`
    };
  }

  static generateWaitlistEntry(index) {
    return {
      email: `waitlist-${index}-${Date.now()}@example.com`,
      source: 'load-test',
      timestamp: new Date(),
      ipAddress: `192.168.1.${index % 255}`,
      userAgent: 'LoadTest/1.0'
    };
  }

  static generateTeam(index) {
    return {
      name: `LoadTest Team ${index}`,
      sport: 'Football',
      ageGroup: 'Youth',
      headCoachId: `coach-${index}`,
      assistantCoachIds: [],
      players: [],
      settings: {
        season: new Date().getFullYear().toString(),
        league: 'Load Test League',
        division: 'Test Division'
      }
    };
  }

  static generatePlay(index) {
    return {
      name: `LoadTest Play ${index}`,
      sport: 'Football',
      description: `Test play description ${index}`,
      category: 'offense',
      tags: ['load-test', 'test-play'],
      createdBy: `user-${index}`,
      players: {},
      routes: [],
      isPublic: false
    };
  }
}

// Firebase operation tester
class FirebaseOperationTester {
  constructor() {
    this.metrics = {
      authOperations: [],
      firestoreReads: [],
      firestoreWrites: [],
      errors: [],
      bottlenecks: []
    };
  }

  async testAuthOperation(operation, userData) {
    const startTime = performance.now();
    let success = false;
    let error = null;

    try {
      switch (operation) {
        case 'signUp':
          await createUserWithEmailAndPassword(auth, userData.email, userData.password);
          break;
        case 'signIn':
          await signInWithEmailAndPassword(auth, userData.email, userData.password);
          break;
        case 'signOut':
          await signOut(auth);
          break;
      }
      success = true;
    } catch (err) {
      error = err;
    }

    const duration = performance.now() - startTime;
    
    this.metrics.authOperations.push({
      operation,
      duration,
      success,
      error: error?.message,
      timestamp: Date.now()
    });

    return { success, duration, error };
  }

  async testFirestoreWrite(collectionName, data) {
    const startTime = performance.now();
    let success = false;
    let error = null;
    let docId = null;

    try {
      const docRef = await addDoc(collection(db, collectionName), data);
      docId = docRef.id;
      success = true;
    } catch (err) {
      error = err;
    }

    const duration = performance.now() - startTime;
    
    this.metrics.firestoreWrites.push({
      collection: collectionName,
      duration,
      success,
      error: error?.message,
      docId,
      timestamp: Date.now()
    });

    return { success, duration, error, docId };
  }

  async testFirestoreRead(collectionName, limitCount = 10) {
    const startTime = performance.now();
    let success = false;
    let error = null;
    let docCount = 0;

    try {
      const q = query(collection(db, collectionName), limit(limitCount));
      const querySnapshot = await getDocs(q);
      docCount = querySnapshot.size;
      success = true;
    } catch (err) {
      error = err;
    }

    const duration = performance.now() - startTime;
    
    this.metrics.firestoreReads.push({
      collection: collectionName,
      duration,
      success,
      error: error?.message,
      docCount,
      timestamp: Date.now()
    });

    return { success, duration, error, docCount };
  }

  async testWaitlistSubmission(userIndex) {
    const waitlistData = TestDataGenerator.generateWaitlistEntry(userIndex);
    return await this.testFirestoreWrite('waitlist', waitlistData);
  }

  async testTeamCreation(userIndex) {
    const teamData = TestDataGenerator.generateTeam(userIndex);
    return await this.testFirestoreWrite('teams', teamData);
  }

  async testPlayCreation(userIndex) {
    const playData = TestDataGenerator.generatePlay(userIndex);
    return await this.testFirestoreWrite('plays', playData);
  }

  async testUserProfileCreation(userIndex) {
    const userData = TestDataGenerator.generateUser(userIndex);
    const profileData = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      isEmailVerified: false,
      lastLoginAt: new Date(),
      subscription: 'free',
      subscriptionStatus: 'active',
      role: 'coach',
      permissions: [],
      teams: [],
      usage: {
        playsGeneratedThisMonth: 0,
        teamsCreated: 0
      }
    };
    return await this.testFirestoreWrite('users', profileData);
  }

  analyzePerformance() {
    // Analyze auth operations
    const authOps = this.metrics.authOperations;
    const authSuccessRate = (authOps.filter(op => op.success).length / authOps.length) * 100;
    const avgAuthTime = authOps.reduce((sum, op) => sum + op.duration, 0) / authOps.length;

    // Analyze Firestore writes
    const writeOps = this.metrics.firestoreWrites;
    const writeSuccessRate = (writeOps.filter(op => op.success).length / writeOps.length) * 100;
    const avgWriteTime = writeOps.reduce((sum, op) => sum + op.duration, 0) / writeOps.length;

    // Analyze Firestore reads
    const readOps = this.metrics.firestoreReads;
    const readSuccessRate = (readOps.filter(op => op.success).length / readOps.length) * 100;
    const avgReadTime = readOps.reduce((sum, op) => sum + op.duration, 0) / readOps.length;

    // Identify bottlenecks
    const bottlenecks = [];
    
    if (avgAuthTime > 2000) {
      bottlenecks.push({
        type: 'authentication',
        severity: 'high',
        issue: `Average auth time ${avgAuthTime.toFixed(2)}ms exceeds 2s threshold`,
        recommendation: 'Check Firebase Auth configuration and rate limiting'
      });
    }

    if (avgWriteTime > 1000) {
      bottlenecks.push({
        type: 'firestore-write',
        severity: 'high',
        issue: `Average write time ${avgWriteTime.toFixed(2)}ms exceeds 1s threshold`,
        recommendation: 'Optimize Firestore rules, check connection limits, consider batching'
      });
    }

    if (avgReadTime > 500) {
      bottlenecks.push({
        type: 'firestore-read',
        severity: 'medium',
        issue: `Average read time ${avgReadTime.toFixed(2)}ms exceeds 500ms threshold`,
        recommendation: 'Add indexes, optimize queries, consider caching'
      });
    }

    if (authSuccessRate < 95) {
      bottlenecks.push({
        type: 'authentication',
        severity: 'high',
        issue: `Auth success rate ${authSuccessRate.toFixed(2)}% below 95% threshold`,
        recommendation: 'Check Firebase Auth configuration and error handling'
      });
    }

    if (writeSuccessRate < 98) {
      bottlenecks.push({
        type: 'firestore-write',
        severity: 'high',
        issue: `Write success rate ${writeSuccessRate.toFixed(2)}% below 98% threshold`,
        recommendation: 'Check Firestore rules, connection limits, and error handling'
      });
    }

    if (readSuccessRate < 99) {
      bottlenecks.push({
        type: 'firestore-read',
        severity: 'medium',
        issue: `Read success rate ${readSuccessRate.toFixed(2)}% below 99% threshold`,
        recommendation: 'Check Firestore configuration and query optimization'
      });
    }

    return {
      auth: {
        totalOperations: authOps.length,
        successRate: authSuccessRate,
        avgTime: avgAuthTime,
        slowOperations: authOps.filter(op => op.duration > 2000).length
      },
      firestoreWrites: {
        totalOperations: writeOps.length,
        successRate: writeSuccessRate,
        avgTime: avgWriteTime,
        slowOperations: writeOps.filter(op => op.duration > 1000).length
      },
      firestoreReads: {
        totalOperations: readOps.length,
        successRate: readSuccessRate,
        avgTime: avgReadTime,
        slowOperations: readOps.filter(op => op.duration > 500).length
      },
      bottlenecks
    };
  }

  generateReport() {
    const analysis = this.analyzePerformance();
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalAuthOperations: analysis.auth.totalOperations,
        totalFirestoreWrites: analysis.firestoreWrites.totalOperations,
        totalFirestoreReads: analysis.firestoreReads.totalOperations,
        overallSuccessRate: (
          (analysis.auth.totalOperations * analysis.auth.successRate +
           analysis.firestoreWrites.totalOperations * analysis.firestoreWrites.successRate +
           analysis.firestoreReads.totalOperations * analysis.firestoreReads.successRate) /
          (analysis.auth.totalOperations + analysis.firestoreWrites.totalOperations + analysis.firestoreReads.totalOperations)
        ) / 100
      },
      performance: analysis,
      recommendations: this.generateRecommendations(analysis)
    };
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    // Performance recommendations
    if (analysis.auth.avgTime > 1000) {
      recommendations.push({
        priority: 'high',
        category: 'Authentication Performance',
        issue: 'Slow authentication operations',
        suggestions: [
          'Enable Firebase Auth caching',
          'Implement connection pooling',
          'Check network latency to Firebase servers',
          'Consider using Firebase Admin SDK for server-side operations'
        ]
      });
    }

    if (analysis.firestoreWrites.avgTime > 500) {
      recommendations.push({
        priority: 'high',
        category: 'Firestore Write Performance',
        issue: 'Slow Firestore write operations',
        suggestions: [
          'Implement write batching for multiple operations',
          'Check Firestore rules complexity',
          'Consider using offline persistence',
          'Optimize document structure and size'
        ]
      });
    }

    if (analysis.firestoreReads.avgTime > 300) {
      recommendations.push({
        priority: 'medium',
        category: 'Firestore Read Performance',
        issue: 'Slow Firestore read operations',
        suggestions: [
          'Add composite indexes for complex queries',
          'Implement query result caching',
          'Use pagination for large result sets',
          'Consider denormalizing data for frequently accessed fields'
        ]
      });
    }

    // Reliability recommendations
    if (analysis.auth.successRate < 98) {
      recommendations.push({
        priority: 'high',
        category: 'Authentication Reliability',
        issue: 'High authentication failure rate',
        suggestions: [
          'Implement retry logic with exponential backoff',
          'Add proper error handling and user feedback',
          'Check Firebase Auth quotas and limits',
          'Monitor Firebase Auth service status'
        ]
      });
    }

    if (analysis.firestoreWrites.successRate < 99) {
      recommendations.push({
        priority: 'high',
        category: 'Firestore Write Reliability',
        issue: 'High Firestore write failure rate',
        suggestions: [
          'Implement retry logic for failed writes',
          'Check Firestore security rules',
          'Monitor Firestore quotas and limits',
          'Add proper error handling and logging'
        ]
      });
    }

    // Scaling recommendations
    if (analysis.auth.totalOperations > 1000) {
      recommendations.push({
        priority: 'medium',
        category: 'Authentication Scaling',
        issue: 'High authentication load',
        suggestions: [
          'Consider implementing authentication caching',
          'Use Firebase Auth state persistence',
          'Implement rate limiting on client side',
          'Consider using Firebase Admin SDK for bulk operations'
        ]
      });
    }

    if (analysis.firestoreWrites.totalOperations > 5000) {
      recommendations.push({
        priority: 'medium',
        category: 'Firestore Write Scaling',
        issue: 'High Firestore write load',
        suggestions: [
          'Implement write batching and queuing',
          'Consider using Cloud Functions for bulk operations',
          'Implement write rate limiting',
          'Use Firebase Admin SDK for server-side operations'
        ]
      });
    }

    return recommendations;
  }
}

// Load test runner for Firebase operations
class FirebaseLoadTestRunner {
  constructor() {
    this.tester = new FirebaseOperationTester();
    this.results = [];
  }

  async runScenario(scenario) {
    console.log(`\n🔥 Starting Firebase load test: ${scenario.name}`);
    console.log(`👥 Concurrent Users: ${scenario.concurrentUsers}`);
    console.log(`⏱️  Duration: ${scenario.duration}s`);
    console.log(`🔄 Operations per User: ${scenario.operationsPerUser}`);

    const startTime = performance.now();
    const promises = [];

    // Create concurrent user operations
    for (let i = 0; i < scenario.concurrentUsers; i++) {
      const userPromise = this.simulateUserOperations(i, scenario.operationsPerUser, scenario.duration);
      promises.push(userPromise);
    }

    try {
      await Promise.all(promises);
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;

      const analysis = this.tester.analyzePerformance();
      
      const scenarioResult = {
        name: scenario.name,
        duration,
        concurrentUsers: scenario.concurrentUsers,
        operationsPerUser: scenario.operationsPerUser,
        performance: analysis,
        timestamp: new Date().toISOString()
      };

      this.results.push(scenarioResult);

      console.log(`✅ Completed: ${scenario.name}`);
      console.log(`📊 Auth Operations: ${analysis.auth.totalOperations} (${analysis.auth.successRate.toFixed(2)}% success)`);
      console.log(`📊 Firestore Writes: ${analysis.firestoreWrites.totalOperations} (${analysis.firestoreWrites.successRate.toFixed(2)}% success)`);
      console.log(`📊 Firestore Reads: ${analysis.firestoreReads.totalOperations} (${analysis.firestoreReads.successRate.toFixed(2)}% success)`);
      console.log(`⚠️  Bottlenecks: ${analysis.bottlenecks.length}`);

      return scenarioResult;
    } catch (error) {
      console.error(`❌ Error in scenario ${scenario.name}:`, error.message);
      throw error;
    }
  }

  async simulateUserOperations(userIndex, operationsCount, maxDuration) {
    const userData = TestDataGenerator.generateUser(userIndex);
    const startTime = performance.now();
    const maxTime = maxDuration * 1000; // Convert to milliseconds

    for (let i = 0; i < operationsCount; i++) {
      // Check if we've exceeded the maximum duration
      if (performance.now() - startTime > maxTime) {
        break;
      }

      try {
        // Simulate user registration
        await this.tester.testAuthOperation('signUp', userData);
        
        // Simulate waitlist submission
        await this.tester.testWaitlistSubmission(userIndex);
        
        // Simulate team creation
        await this.tester.testTeamCreation(userIndex);
        
        // Simulate play creation
        await this.tester.testPlayCreation(userIndex);
        
        // Simulate user profile creation
        await this.tester.testUserProfileCreation(userIndex);
        
        // Simulate reading operations
        await this.tester.testFirestoreRead('waitlist', 5);
        await this.tester.testFirestoreRead('teams', 3);
        await this.tester.testFirestoreRead('plays', 5);
        
        // Simulate sign out
        await this.tester.testAuthOperation('signOut', userData);
        
        // Add some delay between operations
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
        
      } catch (error) {
        console.error(`Error in user ${userIndex} operation ${i}:`, error.message);
      }
    }
  }

  async runAllScenarios() {
    console.log('🎯 Starting Firebase load testing suite');
    console.log('🔥 Testing Firebase Auth and Firestore operations');
    console.log('📁 Results will be saved to: ./load-test-results');

    // Create results directory
    const resultsDir = './load-test-results';
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const startTime = performance.now();

    for (const scenario of FIREBASE_TEST_SCENARIOS) {
      try {
        await this.runScenario(scenario);
        
        // Wait between scenarios
        if (scenario !== FIREBASE_TEST_SCENARIOS[FIREBASE_TEST_SCENARIOS.length - 1]) {
          console.log('⏳ Waiting 30 seconds before next scenario...');
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      } catch (error) {
        console.error(`❌ Failed to run scenario ${scenario.name}:`, error.message);
        continue;
      }
    }

    const totalTime = (performance.now() - startTime) / 1000;
    
    // Generate comprehensive report
    const report = this.tester.generateReport();
    report.scenarios = this.results;
    report.totalTestTime = totalTime;

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(resultsDir, `firebase-load-test-report-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate summary
    this.generateSummary(report);

    console.log(`\n📊 Firebase load testing completed in ${totalTime.toFixed(2)}s`);
    console.log(`📄 Full report saved to: ${reportPath}`);
  }

  generateSummary(report) {
    console.log('\n📋 FIREBASE LOAD TEST SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`\n📊 Overall Performance:`);
    console.log(`   Total Auth Operations: ${report.summary.totalAuthOperations}`);
    console.log(`   Total Firestore Writes: ${report.summary.totalFirestoreWrites}`);
    console.log(`   Total Firestore Reads: ${report.summary.totalFirestoreReads}`);
    console.log(`   Overall Success Rate: ${(report.summary.overallSuccessRate * 100).toFixed(2)}%`);
    
    console.log(`\n🔍 Performance Metrics:`);
    console.log(`   Auth Avg Time: ${report.performance.auth.avgTime.toFixed(2)}ms`);
    console.log(`   Write Avg Time: ${report.performance.firestoreWrites.avgTime.toFixed(2)}ms`);
    console.log(`   Read Avg Time: ${report.performance.firestoreReads.avgTime.toFixed(2)}ms`);
    
    console.log(`\n⚠️  Bottlenecks Identified:`);
    report.performance.bottlenecks.forEach((bottleneck, index) => {
      console.log(`   ${index + 1}. [${bottleneck.severity.toUpperCase()}] ${bottleneck.issue}`);
      console.log(`      → ${bottleneck.recommendation}`);
    });
    
    console.log(`\n💡 Recommendations:`);
    report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.category}`);
      console.log(`      Issue: ${rec.issue}`);
      rec.suggestions.forEach(suggestion => {
        console.log(`      • ${suggestion}`);
      });
    });
  }
}

// Main execution
async function main() {
  const runner = new FirebaseLoadTestRunner();
  
  try {
    await runner.runAllScenarios();
  } catch (error) {
    console.error('❌ Firebase load testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { FirebaseLoadTestRunner, FirebaseOperationTester };
