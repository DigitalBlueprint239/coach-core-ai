#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Simple test runner for k6 load testing
class K6TestRunner {
  constructor() {
    this.stagingUrl = 'https://coach-core-ai-staging.web.app';
    this.resultsDir = 'load-test-results';
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  // Check if k6 is available
  async checkK6() {
    return new Promise((resolve) => {
      const k6 = spawn('k6', ['version'], { stdio: 'pipe' });
      
      k6.on('close', (code) => {
        if (code === 0) {
          console.log('✅ K6 is available');
          resolve(true);
        } else {
          console.log('❌ K6 is not available');
          resolve(false);
        }
      });
      
      k6.on('error', () => {
        console.log('❌ K6 is not available');
        resolve(false);
      });
    });
  }

  // Check staging environment
  async checkStaging() {
    try {
      const response = await fetch(this.stagingUrl);
      if (response.ok) {
        console.log('✅ Staging environment is accessible');
        return true;
      } else {
        console.log(`❌ Staging environment returned ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Staging environment not accessible: ${error.message}`);
      return false;
    }
  }

  // Run a k6 test
  async runTest(testFile, options = {}) {
    return new Promise((resolve, reject) => {
      const args = ['run'];
      
      // Add options
      if (options.vus) args.push('--vus', options.vus.toString());
      if (options.duration) args.push('--duration', options.duration);
      if (options.output) args.push('--out', `json=${options.output}`);
      if (options.summary) args.push('--summary-export', options.summary);
      
      // Add test file
      args.push(testFile);
      
      console.log(`🚀 Running: k6 ${args.join(' ')}`);
      
      const k6 = spawn('k6', args, { stdio: 'inherit' });
      
      k6.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Test completed successfully');
          resolve(true);
        } else {
          console.log(`❌ Test failed with code ${code}`);
          resolve(false);
        }
      });
      
      k6.on('error', (error) => {
        console.log(`❌ Test error: ${error.message}`);
        reject(error);
      });
    });
  }

  // Run quick test
  async runQuickTest() {
    console.log('🔍 Running quick test...');
    
    const success = await this.runTest('quick-test.js', {
      vus: 10,
      duration: '1m'
    });
    
    return success;
  }

  // Run load test scenarios
  async runLoadTests() {
    console.log('📊 Running load test scenarios...');
    
    const tests = [
      { name: '100_users', vus: 100, duration: '5m' },
      { name: '500_users', vus: 500, duration: '5m' },
      { name: '1000_users', vus: 1000, duration: '5m' }
    ];
    
    const results = [];
    
    for (const test of tests) {
      console.log(`\n📈 Running ${test.name}...`);
      
      const outputFile = `${this.resultsDir}/${test.name}_${this.timestamp}.json`;
      const summaryFile = `${this.resultsDir}/${test.name}_${this.timestamp}_summary.json`;
      
      // Create results directory
      if (!fs.existsSync(this.resultsDir)) {
        fs.mkdirSync(this.resultsDir, { recursive: true });
      }
      
      const success = await this.runTest('k6-scenarios.js', {
        vus: test.vus,
        duration: test.duration,
        output: outputFile,
        summary: summaryFile
      });
      
      results.push({
        name: test.name,
        success,
        outputFile,
        summaryFile
      });
    }
    
    return results;
  }

  // Run bottleneck analysis
  async runBottleneckAnalysis() {
    console.log('🔍 Running bottleneck analysis...');
    
    const outputFile = `${this.resultsDir}/bottleneck_analysis_${this.timestamp}.json`;
    const summaryFile = `${this.resultsDir}/bottleneck_analysis_${this.timestamp}_summary.json`;
    
    const success = await this.runTest('bottleneck-analysis.js', {
      vus: 1000,
      duration: '10m',
      output: outputFile,
      summary: summaryFile
    });
    
    return {
      success,
      outputFile,
      summaryFile
    };
  }

  // Generate report
  async generateReport() {
    console.log('📊 Generating report...');
    
    try {
      const { spawn } = require('child_process');
      
      return new Promise((resolve) => {
        const node = spawn('node', ['generate-report.js'], { stdio: 'inherit' });
        
        node.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Report generated successfully');
            resolve(true);
          } else {
            console.log(`❌ Report generation failed with code ${code}`);
            resolve(false);
          }
        });
      });
    } catch (error) {
      console.log(`❌ Report generation error: ${error.message}`);
      return false;
    }
  }

  // Main execution
  async run() {
    console.log('🚀 K6 Load Testing Suite');
    console.log('========================');
    console.log(`Target: ${this.stagingUrl}`);
    console.log(`Timestamp: ${this.timestamp}`);
    console.log('');
    
    // Check k6 availability
    const k6Available = await this.checkK6();
    if (!k6Available) {
      console.log('❌ K6 is not available. Please install k6 first.');
      console.log('Installation: npm install -g k6');
      process.exit(1);
    }
    
    // Check staging environment
    const stagingAvailable = await this.checkStaging();
    if (!stagingAvailable) {
      console.log('❌ Staging environment is not accessible.');
      process.exit(1);
    }
    
    // Run quick test
    console.log('\n🔍 Running quick test...');
    const quickTestSuccess = await this.runQuickTest();
    
    if (!quickTestSuccess) {
      console.log('❌ Quick test failed. Aborting load tests.');
      process.exit(1);
    }
    
    // Run load tests
    console.log('\n📊 Running load tests...');
    const loadTestResults = await this.runLoadTests();
    
    // Run bottleneck analysis
    console.log('\n🔍 Running bottleneck analysis...');
    const bottleneckResult = await this.runBottleneckAnalysis();
    
    // Generate report
    console.log('\n📊 Generating report...');
    const reportSuccess = await this.generateReport();
    
    // Summary
    console.log('\n📋 Test Summary');
    console.log('================');
    console.log(`Quick Test: ${quickTestSuccess ? '✅ Passed' : '❌ Failed'}`);
    console.log(`Load Tests: ${loadTestResults.filter(r => r.success).length}/${loadTestResults.length} passed`);
    console.log(`Bottleneck Analysis: ${bottleneckResult.success ? '✅ Passed' : '❌ Failed'}`);
    console.log(`Report Generation: ${reportSuccess ? '✅ Passed' : '❌ Failed'}`);
    
    if (quickTestSuccess && loadTestResults.every(r => r.success) && bottleneckResult.success) {
      console.log('\n🎉 All tests completed successfully!');
    } else {
      console.log('\n⚠️  Some tests failed. Check the logs above.');
    }
    
    console.log(`\n📊 Results saved in: ${this.resultsDir}`);
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new K6TestRunner();
  runner.run().catch(console.error);
}

module.exports = K6TestRunner;
