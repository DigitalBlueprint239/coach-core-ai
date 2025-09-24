// @ts-nocheck Legacy simple testing utilities pending conversion.
// Simple testing utility for Coach Core AI MVP

export interface SimpleTestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  timestamp: Date;
}

export class SimpleTester {
  private static instance: SimpleTester;
  private testResults: SimpleTestResult[] = [];

  private constructor() {}

  static getInstance(): SimpleTester {
    if (!SimpleTester.instance) {
      SimpleTester.instance = new SimpleTester();
    }
    return SimpleTester.instance;
  }

  /**
   * Test basic functionality without complex imports
   */
  testBasicFunctionality(): SimpleTestResult[] {
    const results: SimpleTestResult[] = [];

    try {
      // Test 1: Basic JavaScript functionality
      results.push({
        name: 'JavaScript Runtime',
        status: 'pass',
        message: 'JavaScript engine working correctly',
        timestamp: new Date(),
      });

      // Test 2: Date functionality
      const testDate = new Date();
      results.push({
        name: 'Date Object',
        status: 'pass',
        message: `Date created successfully: ${testDate.toISOString()}`,
        timestamp: new Date(),
      });

      // Test 3: Array functionality
      const testArray = [1, 2, 3];
      const sum = testArray.reduce((a, b) => a + b, 0);
      results.push({
        name: 'Array Operations',
        status: sum === 6 ? 'pass' : 'fail',
        message: `Array operations working: sum = ${sum}`,
        timestamp: new Date(),
      });

      // Test 4: Object functionality
      const testObj = { key: 'value' };
      results.push({
        name: 'Object Operations',
        status: testObj.key === 'value' ? 'pass' : 'fail',
        message: 'Object operations working correctly',
        timestamp: new Date(),
      });

      // Test 5: String functionality
      const testString = 'Hello World';
      results.push({
        name: 'String Operations',
        status: testString.includes('World') ? 'pass' : 'fail',
        message: 'String operations working correctly',
        timestamp: new Date(),
      });

    } catch (error: any) {
      results.push({
        name: 'Basic Functionality',
        status: 'fail',
        message: `Error: ${error.message}`,
        timestamp: new Date(),
      });
    }

    return results;
  }

  /**
   * Test React-specific functionality
   */
  testReactFunctionality(): SimpleTestResult[] {
    const results: SimpleTestResult[] = [];

    try {
      // Test 1: React import availability
      if (typeof React !== 'undefined') {
        results.push({
          name: 'React Import',
          status: 'pass',
          message: 'React library available',
          timestamp: new Date(),
        });
      } else {
        results.push({
          name: 'React Import',
          status: 'fail',
          message: 'React library not available',
          timestamp: new Date(),
        });
      }

      // Test 2: React hooks availability
      if (typeof useState !== 'undefined') {
        results.push({
          name: 'React Hooks',
          status: 'pass',
          message: 'React hooks available',
          timestamp: new Date(),
        });
      } else {
        results.push({
          name: 'React Hooks',
          status: 'fail',
          message: 'React hooks not available',
          timestamp: new Date(),
        });
      }

    } catch (error: any) {
      results.push({
        name: 'React Functionality',
        status: 'fail',
        message: `Error: ${error.message}`,
        timestamp: new Date(),
      });
    }

    return results;
  }

  /**
   * Run all simple tests
   */
  runAllTests(): SimpleTestResult[] {
    this.testResults = [
      ...this.testBasicFunctionality(),
      ...this.testReactFunctionality(),
    ];
    return this.testResults;
  }

  /**
   * Get test summary
   */
  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    status: string;
  } {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.status === 'pass').length;
    const failed = this.testResults.filter(r => r.status === 'fail').length;
    const warnings = this.testResults.filter(r => r.status === 'warning').length;

    let status = 'PASS';
    if (failed > 0) status = 'FAIL';
    else if (warnings > 0) status = 'WARNING';

    return { total, passed, failed, warnings, status };
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.testResults = [];
  }
}

export const simpleTester = SimpleTester.getInstance();
