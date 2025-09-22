#!/usr/bin/env node

const autocannon = require('autocannon');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Configuration
const STAGING_URL = 'https://coach-core-ai-staging.web.app';
const TEST_RESULTS_DIR = './load-test-results';

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: '100 Concurrent Users',
    connections: 100,
    duration: 120, // 2 minutes
    requests: [
      { url: '/', method: 'GET', weight: 30 },
      { url: '/login', method: 'GET', weight: 20 },
      { url: '/signup', method: 'GET', weight: 15 },
      { url: '/waitlist', method: 'GET', weight: 15 },
      { url: '/dashboard', method: 'GET', weight: 10 },
      { url: '/team', method: 'GET', weight: 10 }
    ]
  },
  {
    name: '500 Concurrent Users',
    connections: 500,
    duration: 300, // 5 minutes
    requests: [
      { url: '/', method: 'GET', weight: 25 },
      { url: '/login', method: 'GET', weight: 20 },
      { url: '/signup', method: 'GET', weight: 15 },
      { url: '/waitlist', method: 'GET', weight: 15 },
      { url: '/dashboard', method: 'GET', weight: 10 },
      { url: '/team', method: 'GET', weight: 10 },
      { url: '/practice', method: 'GET', weight: 5 }
    ]
  },
  {
    name: '1000 Concurrent Users',
    connections: 1000,
    duration: 300, // 5 minutes
    requests: [
      { url: '/', method: 'GET', weight: 20 },
      { url: '/login', method: 'GET', weight: 20 },
      { url: '/signup', method: 'GET', weight: 15 },
      { url: '/waitlist', method: 'GET', weight: 15 },
      { url: '/dashboard', method: 'GET', weight: 10 },
      { url: '/team', method: 'GET', weight: 10 },
      { url: '/practice', method: 'GET', weight: 5 },
      { url: '/play-designer', method: 'GET', weight: 5 }
    ]
  }
];

// Firebase-specific test data
const FIREBASE_TEST_DATA = {
  waitlist: {
    email: `loadtest-${Date.now()}@example.com`,
    source: 'load-test',
    timestamp: new Date().toISOString()
  },
  user: {
    email: `user-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    displayName: `LoadTest User ${Date.now()}`
  },
  team: {
    name: `LoadTest Team ${Date.now()}`,
    sport: 'Football',
    ageGroup: 'Youth'
  }
};

// Performance metrics collector
class PerformanceCollector {
  constructor() {
    this.metrics = {
      responseTimes: [],
      errorRates: [],
      throughput: [],
      firestoreOperations: [],
      authOperations: [],
      bottlenecks: []
    };
  }

  recordResponseTime(url, method, responseTime, statusCode) {
    this.metrics.responseTimes.push({
      url,
      method,
      responseTime,
      statusCode,
      timestamp: Date.now()
    });
  }

  recordError(url, method, error, statusCode) {
    this.metrics.errorRates.push({
      url,
      method,
      error: error.message || error,
      statusCode,
      timestamp: Date.now()
    });
  }

  recordFirestoreOperation(operation, duration, success) {
    this.metrics.firestoreOperations.push({
      operation,
      duration,
      success,
      timestamp: Date.now()
    });
  }

  recordAuthOperation(operation, duration, success) {
    this.metrics.authOperations.push({
      operation,
      duration,
      success,
      timestamp: Date.now()
    });
  }

  analyzeBottlenecks() {
    const responseTimes = this.metrics.responseTimes;
    const errorRates = this.metrics.errorRates;
    
    // Find slow endpoints
    const slowEndpoints = responseTimes
      .filter(r => r.responseTime > 2000) // > 2 seconds
      .reduce((acc, r) => {
        const key = `${r.method} ${r.url}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

    // Find high error rate endpoints
    const errorEndpoints = errorRates
      .reduce((acc, r) => {
        const key = `${r.method} ${r.url}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

    // Calculate average response times by endpoint
    const avgResponseTimes = responseTimes
      .reduce((acc, r) => {
        const key = `${r.method} ${r.url}`;
        if (!acc[key]) {
          acc[key] = { total: 0, count: 0 };
        }
        acc[key].total += r.responseTime;
        acc[key].count += 1;
        return acc;
      }, {});

    Object.keys(avgResponseTimes).forEach(key => {
      avgResponseTimes[key].average = avgResponseTimes[key].total / avgResponseTimes[key].count;
    });

    this.metrics.bottlenecks = {
      slowEndpoints,
      errorEndpoints,
      avgResponseTimes,
      totalRequests: responseTimes.length,
      totalErrors: errorRates.length,
      errorRate: (errorRates.length / responseTimes.length) * 100
    };
  }

  generateReport() {
    this.analyzeBottlenecks();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRequests: this.metrics.responseTimes.length,
        totalErrors: this.metrics.errorRates.length,
        errorRate: this.metrics.bottlenecks.errorRate,
        avgResponseTime: this.metrics.responseTimes.reduce((sum, r) => sum + r.responseTime, 0) / this.metrics.responseTimes.length,
        firestoreOperations: this.metrics.firestoreOperations.length,
        authOperations: this.metrics.authOperations.length
      },
      bottlenecks: this.metrics.bottlenecks,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    const bottlenecks = this.metrics.bottlenecks;

    // Response time recommendations
    Object.entries(bottlenecks.avgResponseTimes).forEach(([endpoint, data]) => {
      if (data.average > 2000) {
        recommendations.push({
          type: 'performance',
          priority: 'high',
          endpoint,
          issue: `Average response time ${data.average.toFixed(2)}ms exceeds 2s threshold`,
          suggestion: 'Optimize database queries, implement caching, or add CDN'
        });
      } else if (data.average > 1000) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          endpoint,
          issue: `Average response time ${data.average.toFixed(2)}ms is approaching threshold`,
          suggestion: 'Consider optimization for better user experience'
        });
      }
    });

    // Error rate recommendations
    if (bottlenecks.errorRate > 5) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        issue: `Error rate ${bottlenecks.errorRate.toFixed(2)}% exceeds 5% threshold`,
        suggestion: 'Investigate server stability, database connections, and error handling'
      });
    }

    // Firestore operation recommendations
    const firestoreOps = this.metrics.firestoreOperations;
    if (firestoreOps.length > 0) {
      const failedOps = firestoreOps.filter(op => !op.success).length;
      const failureRate = (failedOps / firestoreOps.length) * 100;
      
      if (failureRate > 1) {
        recommendations.push({
          type: 'database',
          priority: 'high',
          issue: `Firestore operation failure rate ${failureRate.toFixed(2)}%`,
          suggestion: 'Check Firestore rules, connection limits, and query optimization'
        });
      }
    }

    // Auth operation recommendations
    const authOps = this.metrics.authOperations;
    if (authOps.length > 0) {
      const failedAuthOps = authOps.filter(op => !op.success).length;
      const authFailureRate = (failedAuthOps / authOps.length) * 100;
      
      if (authFailureRate > 2) {
        recommendations.push({
          type: 'authentication',
          priority: 'high',
          issue: `Authentication failure rate ${authFailureRate.toFixed(2)}%`,
          suggestion: 'Check Firebase Auth configuration and rate limiting'
        });
      }
    }

    return recommendations;
  }
}

// Load test runner
class LoadTestRunner {
  constructor() {
    this.collector = new PerformanceCollector();
    this.results = [];
  }

  async runScenario(scenario) {
    console.log(`\n🚀 Starting load test: ${scenario.name}`);
    console.log(`📊 Connections: ${scenario.connections}, Duration: ${scenario.duration}s`);
    
    const startTime = performance.now();
    
    try {
      const result = await autocannon({
        url: STAGING_URL,
        connections: scenario.connections,
        duration: scenario.duration,
        requests: scenario.requests.map(req => ({
          method: req.method,
          path: req.url,
          weight: req.weight
        })),
        headers: {
          'User-Agent': 'Coach-Core-LoadTest/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        timeout: 30000,
        workers: Math.min(scenario.connections, 10)
      });

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;

      // Record metrics
      this.collector.recordResponseTime('overall', 'GET', result.latency.average, 200);
      
      if (result.non2xx > 0) {
        this.collector.recordError('overall', 'GET', `Non-2xx responses: ${result.non2xx}`, 500);
      }

      const scenarioResult = {
        name: scenario.name,
        duration,
        connections: scenario.connections,
        requests: result.requests,
        throughput: result.throughput,
        latency: result.latency,
        errors: result.non2xx,
        errorRate: (result.non2xx / result.requests) * 100,
        timestamp: new Date().toISOString()
      };

      this.results.push(scenarioResult);
      
      console.log(`✅ Completed: ${scenario.name}`);
      console.log(`📈 Requests: ${result.requests}, Throughput: ${result.throughput} req/s`);
      console.log(`⏱️  Latency: ${result.latency.average}ms avg, ${result.latency.p95}ms p95`);
      console.log(`❌ Errors: ${result.non2xx} (${scenarioResult.errorRate.toFixed(2)}%)`);

      return scenarioResult;
    } catch (error) {
      console.error(`❌ Error in scenario ${scenario.name}:`, error.message);
      this.collector.recordError('scenario', scenario.name, error, 500);
      throw error;
    }
  }

  async runAllScenarios() {
    console.log('🎯 Starting comprehensive load testing suite');
    console.log(`🎯 Target: ${STAGING_URL}`);
    console.log(`📁 Results will be saved to: ${TEST_RESULTS_DIR}`);

    // Create results directory
    if (!fs.existsSync(TEST_RESULTS_DIR)) {
      fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
    }

    const startTime = performance.now();

    for (const scenario of TEST_SCENARIOS) {
      try {
        await this.runScenario(scenario);
        
        // Wait between scenarios
        if (scenario !== TEST_SCENARIOS[TEST_SCENARIOS.length - 1]) {
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
    const report = this.collector.generateReport();
    report.scenarios = this.results;
    report.totalTestTime = totalTime;

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(TEST_RESULTS_DIR, `load-test-report-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate summary
    this.generateSummary(report);

    console.log(`\n📊 Load testing completed in ${totalTime.toFixed(2)}s`);
    console.log(`📄 Full report saved to: ${reportPath}`);
  }

  generateSummary(report) {
    console.log('\n📋 LOAD TEST SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`\n📊 Overall Performance:`);
    console.log(`   Total Requests: ${report.summary.totalRequests}`);
    console.log(`   Total Errors: ${report.summary.totalErrors}`);
    console.log(`   Error Rate: ${report.summary.errorRate.toFixed(2)}%`);
    console.log(`   Avg Response Time: ${report.summary.avgResponseTime.toFixed(2)}ms`);
    
    console.log(`\n🔍 Database Operations:`);
    console.log(`   Firestore Operations: ${report.summary.firestoreOperations}`);
    console.log(`   Auth Operations: ${report.summary.authOperations}`);
    
    console.log(`\n⚠️  Bottlenecks Identified:`);
    Object.entries(report.bottlenecks.avgResponseTimes).forEach(([endpoint, data]) => {
      if (data.average > 1000) {
        console.log(`   ${endpoint}: ${data.average.toFixed(2)}ms avg (${data.count} requests)`);
      }
    });
    
    console.log(`\n💡 Recommendations:`);
    report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.issue}`);
      console.log(`      → ${rec.suggestion}`);
    });
  }
}

// Main execution
async function main() {
  const runner = new LoadTestRunner();
  
  try {
    await runner.runAllScenarios();
  } catch (error) {
    console.error('❌ Load testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { LoadTestRunner, PerformanceCollector };
