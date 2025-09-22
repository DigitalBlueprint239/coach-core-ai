#!/usr/bin/env node

/**
 * CSP Testing Framework
 * Automated testing for CSP policy compliance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CSPTester {
  constructor() {
    this.testResults = [];
    this.baseUrl = process.env.TEST_URL || 'http://localhost:3000';
  }

  // Test CSP headers are present
  async testCSPHeaders() {
    console.log('🔍 Testing CSP headers...');
    
    try {
      const response = await fetch(this.baseUrl);
      const headers = response.headers;
      
      const tests = [
        {
          name: 'Content-Security-Policy-Report-Only present',
          test: () => headers.has('content-security-policy-report-only'),
          expected: true
        },
        {
          name: 'X-Frame-Options present',
          test: () => headers.has('x-frame-options'),
          expected: true
        },
        {
          name: 'X-Content-Type-Options present',
          test: () => headers.has('x-content-type-options'),
          expected: true
        },
        {
          name: 'Referrer-Policy present',
          test: () => headers.has('referrer-policy'),
          expected: true
        },
        {
          name: 'Permissions-Policy present',
          test: () => headers.has('permissions-policy'),
          expected: true
        }
      ];
      
      tests.forEach(test => {
        const result = test.test();
        this.testResults.push({
          category: 'headers',
          name: test.name,
          passed: result === test.expected,
          expected: test.expected,
          actual: result
        });
      });
      
    } catch (error) {
      console.error('❌ Error testing headers:', error.message);
    }
  }

  // Test OAuth paths have COOP/COEP disabled
  async testOAuthPaths() {
    console.log('🔍 Testing OAuth paths...');
    
    const oauthPaths = [
      '/__/auth/iframe',
      '/auth/callback',
      '/oauth/google'
    ];
    
    for (const path of oauthPaths) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`);
        const headers = response.headers;
        
        const tests = [
          {
            name: `COOP disabled for ${path}`,
            test: () => {
              const coop = headers.get('cross-origin-opener-policy');
              return coop === 'unsafe-none' || !coop;
            },
            expected: true
          },
          {
            name: `COEP disabled for ${path}`,
            test: () => {
              const coep = headers.get('cross-origin-embedder-policy');
              return coep === 'unsafe-none' || !coep;
            },
            expected: true
          }
        ];
        
        tests.forEach(test => {
          const result = test.test();
          this.testResults.push({
            category: 'oauth',
            name: test.name,
            passed: result === test.expected,
            expected: test.expected,
            actual: result
          });
        });
        
      } catch (error) {
        console.error(`❌ Error testing ${path}:`, error.message);
      }
    }
  }

  // Test CSP policy content
  async testCSPPolicy() {
    console.log('🔍 Testing CSP policy content...');
    
    try {
      const response = await fetch(this.baseUrl);
      const cspHeader = response.headers.get('content-security-policy-report-only');
      
      if (!cspHeader) {
        this.testResults.push({
          category: 'policy',
          name: 'CSP header present',
          passed: false,
          expected: 'CSP header should be present',
          actual: 'No CSP header found'
        });
        return;
      }
      
      const tests = [
        {
          name: 'default-src directive present',
          test: () => cspHeader.includes("default-src 'self'"),
          expected: true
        },
        {
          name: 'script-src includes trusted domains',
          test: () => cspHeader.includes('https://www.gstatic.com'),
          expected: true
        },
        {
          name: 'connect-src includes Firebase',
          test: () => cspHeader.includes('https://firestore.googleapis.com'),
          expected: true
        },
        {
          name: 'img-src allows data URIs',
          test: () => cspHeader.includes("img-src 'self' data: https:"),
          expected: true
        },
        {
          name: 'object-src is none',
          test: () => cspHeader.includes("object-src 'none'"),
          expected: true
        },
        {
          name: 'frame-ancestors is none',
          test: () => cspHeader.includes("frame-ancestors 'none'"),
          expected: true
        },
        {
          name: 'report-uri is configured',
          test: () => cspHeader.includes('report-uri /csp-report'),
          expected: true
        }
      ];
      
      tests.forEach(test => {
        const result = test.test();
        this.testResults.push({
          category: 'policy',
          name: test.name,
          passed: result === test.expected,
          expected: test.expected,
          actual: result
        });
      });
      
    } catch (error) {
      console.error('❌ Error testing CSP policy:', error.message);
    }
  }

  // Test application functionality
  async testApplicationFunctionality() {
    console.log('🔍 Testing application functionality...');
    
    const testPages = [
      { path: '/', name: 'Home page' },
      { path: '/auth/login', name: 'Login page' },
      { path: '/dashboard', name: 'Dashboard' }
    ];
    
    for (const page of testPages) {
      try {
        const response = await fetch(`${this.baseUrl}${page.path}`);
        
        this.testResults.push({
          category: 'functionality',
          name: `${page.name} loads`,
          passed: response.ok,
          expected: true,
          actual: response.status
        });
        
        // Test for common CSP violations in response
        const content = await response.text();
        
        const violationTests = [
          {
            name: `${page.name} has no inline scripts`,
            test: () => !/<script[^>]*>.*?<\/script>/gi.test(content),
            expected: true
          },
          {
            name: `${page.name} has no inline styles`,
            test: () => !/<style[^>]*>.*?<\/style>/gi.test(content),
            expected: true
          },
          {
            name: `${page.name} has no eval() calls`,
            test: () => !/eval\s*\(/gi.test(content),
            expected: true
          }
        ];
        
        violationTests.forEach(test => {
          const result = test.test();
          this.testResults.push({
            category: 'functionality',
            name: test.name,
            passed: result === test.expected,
            expected: test.expected,
            actual: result
          });
        });
        
      } catch (error) {
        console.error(`❌ Error testing ${page.name}:`, error.message);
      }
    }
  }

  // Test CSP report endpoint
  async testCSPReportEndpoint() {
    console.log('🔍 Testing CSP report endpoint...');
    
    try {
      const testReport = {
        'csp-report': {
          'document-uri': this.baseUrl,
          'violated-directive': 'script-src',
          'effective-directive': 'script-src',
          'original-policy': 'default-src \'self\'',
          'blocked-uri': 'https://example.com/test.js',
          'source-file': this.baseUrl,
          'line-number': 1,
          'column-number': 1,
          'status-code': 200
        }
      };
      
      const response = await fetch(`${this.baseUrl}/csp-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/csp-report'
        },
        body: JSON.stringify(testReport)
      });
      
      this.testResults.push({
        category: 'endpoint',
        name: 'CSP report endpoint accepts POST',
        passed: response.ok,
        expected: true,
        actual: response.status
      });
      
      this.testResults.push({
        category: 'endpoint',
        name: 'CSP report endpoint returns 204',
        passed: response.status === 204,
        expected: true,
        actual: response.status
      });
      
    } catch (error) {
      console.error('❌ Error testing CSP report endpoint:', error.message);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 Running CSP Compliance Tests');
    console.log('================================\n');
    
    await this.testCSPHeaders();
    await this.testOAuthPaths();
    await this.testCSPPolicy();
    await this.testApplicationFunctionality();
    await this.testCSPReportEndpoint();
    
    this.displayResults();
    this.saveResults();
  }

  // Display test results
  displayResults() {
    console.log('\n📊 TEST RESULTS');
    console.log('================\n');
    
    const categories = [...new Set(this.testResults.map(r => r.category))];
    
    categories.forEach(category => {
      console.log(`📁 ${category.toUpperCase()}`);
      console.log('----------------------------------------');
      
      const categoryTests = this.testResults.filter(r => r.category === category);
      categoryTests.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        console.log(`${status} ${test.name}`);
        if (!test.passed) {
          console.log(`   Expected: ${test.expected}`);
          console.log(`   Actual: ${test.actual}`);
        }
      });
      console.log('');
    });
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log(`📈 OVERALL SCORE: ${passed}/${total} (${percentage}%)`);
    
    if (percentage >= 90) {
      console.log('🎉 Excellent! Ready for CSP enforcement.');
    } else if (percentage >= 80) {
      console.log('⚠️  Good, but some issues need attention.');
    } else {
      console.log('❌ Multiple issues detected. Fix before enforcement.');
    }
  }

  // Save test results
  saveResults() {
    const results = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      results: this.testResults,
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.passed).length,
        failed: this.testResults.filter(r => !r.passed).length,
        percentage: Math.round((this.testResults.filter(r => r.passed).length / this.testResults.length) * 100)
      }
    };
    
    const resultsPath = path.join(__dirname, '..', 'reports', 'csp-test-results.json');
    const resultsDir = path.dirname(resultsPath);
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Test results saved to: ${resultsPath}`);
  }
}

// Main execution
async function main() {
  const tester = new CSPTester();
  await tester.runAllTests();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default CSPTester;





