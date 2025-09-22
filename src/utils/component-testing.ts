// Comprehensive component testing utilities for Coach Core AI MVP

export interface TestResult {
  component: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  timestamp: Date;
}

export interface ComponentTestSuite {
  componentName: string;
  tests: TestResult[];
  overallStatus: 'pass' | 'fail' | 'warning';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  warnings: number;
}

export class ComponentTester {
  private static instance: ComponentTester;
  private testResults: TestResult[] = [];

  private constructor() {}

  static getInstance(): ComponentTester {
    if (!ComponentTester.instance) {
      ComponentTester.instance = new ComponentTester();
    }
    return ComponentTester.instance;
  }

  /**
   * Test form validation functionality
   */
  async testFormValidation(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    try {
      // Test email validation
      const { validateEmail } = await import('../utils/validation');

      // Test valid email
      const validEmailResult = validateEmail('test@example.com');
      results.push({
        component: 'Validation Utils',
        test: 'Valid Email Validation',
        status: validEmailResult.isValid ? 'pass' : 'fail',
        message: validEmailResult.isValid
          ? 'Email validation working correctly'
          : 'Email validation failed',
        details: validEmailResult,
        timestamp: new Date(),
      });

      // Test invalid email
      const invalidEmailResult = validateEmail('invalid-email');
      results.push({
        component: 'Validation Utils',
        test: 'Invalid Email Validation',
        status: !invalidEmailResult.isValid ? 'pass' : 'fail',
        message: !invalidEmailResult.isValid
          ? 'Invalid email correctly rejected'
          : 'Invalid email incorrectly accepted',
        details: invalidEmailResult,
        timestamp: new Date(),
      });

      // Test name validation
      const { validateName } = await import('../utils/validation');
      const validNameResult = validateName('John Smith');
      results.push({
        component: 'Validation Utils',
        test: 'Valid Name Validation',
        status: validNameResult.isValid ? 'pass' : 'fail',
        message: validNameResult.isValid
          ? 'Name validation working correctly'
          : 'Name validation failed',
        details: validNameResult,
        timestamp: new Date(),
      });
    } catch (error: any) {
      results.push({
        component: 'Validation Utils',
        test: 'Import Test',
        status: 'fail',
        message: 'Failed to import validation utilities',
        details: error.message,
        timestamp: new Date(),
      });
    }

    return results;
  }

  /**
   * Test error handling functionality
   */
  async testErrorHandling(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    try {
      const {
        errorHandler,
        FirebaseErrorHandler,
      } = await import('../utils/error-handling');

      // Test basic error handling
      const testError = new Error('Test error message');
      const handledError = errorHandler.handleError(testError, 'test-context');

      results.push({
        component: 'Error Handling',
        test: 'Basic Error Handling',
        status: handledError ? 'pass' : 'fail',
        message: handledError
          ? 'Error handler working correctly'
          : 'Error handler failed',
        details: handledError,
        timestamp: new Date(),
      });

      // Test Firebase error handling
      const firebaseError = {
        code: 'firestore/permission-denied',
        message: 'Access denied',
      };
      const firebaseHandledError =
        FirebaseErrorHandler.handleFirestoreError(firebaseError);

      results.push({
        component: 'Error Handling',
        test: 'Firebase Error Handling',
        status: firebaseHandledError ? 'pass' : 'fail',
        message: firebaseHandledError
          ? 'Firebase error handler working correctly'
          : 'Firebase error handler failed',
        details: firebaseHandledError,
        timestamp: new Date(),
      });
    } catch (error: any) {
      results.push({
        component: 'Error Handling',
        test: 'Import Test',
        status: 'fail',
        message: 'Failed to import error handling utilities',
        details: error.message,
        timestamp: new Date(),
      });
    }

    return results;
  }

  /**
   * Test component imports
   */
  async testComponentImports(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    const componentsToTest = [
      'TeamManagementMVP',
      'PlayDesignerMVP',
      'LandingPage',
      'LoginPage',
      'MVPDashboard',
      'UIErrorBoundary',
    ];

    for (const componentName of componentsToTest) {
      try {
        // Try to import the component
        await import(
          `../components/${
            componentName === 'TeamManagementMVP'
              ? 'Team/TeamManagementMVP'
              : componentName === 'PlayDesignerMVP'
                ? 'PlayDesigner/PlayDesignerMVP'
                : componentName === 'LandingPage'
                  ? 'Landing/LandingPage'
                  : componentName === 'LoginPage'
                  ? 'auth/LoginPage'
                  : componentName === 'MVPDashboard'
                    ? 'Dashboard/MVPDashboard'
                    : componentName === 'UIErrorBoundary'
                      ? 'common/UIErrorBoundary'
                      : componentName
          }`
        );

        results.push({
          component: 'Component Imports',
          test: `${componentName} Import`,
          status: 'pass',
          message: `${componentName} imports successfully`,
          timestamp: new Date(),
        });
      } catch (error: any) {
        results.push({
          component: 'Component Imports',
          test: `${componentName} Import`,
          status: 'fail',
          message: `Failed to import ${componentName}`,
          details: error.message,
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Test utility functions
   */
  async testUtilityFunctions(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    try {
      // Test rate limiter
      const { RateLimiter } = await import('../utils/validation');
      const rateLimiter = new RateLimiter(3, 1000);

      const canAttempt1 = rateLimiter.canAttempt('test@example.com');
      const canAttempt2 = rateLimiter.canAttempt('test@example.com');
      const canAttempt3 = rateLimiter.canAttempt('test@example.com');
      const canAttempt4 = rateLimiter.canAttempt('test@example.com');

      results.push({
        component: 'Rate Limiter',
        test: 'Rate Limiting Logic',
        status:
          canAttempt1 && canAttempt2 && canAttempt3 && !canAttempt4
            ? 'pass'
            : 'fail',
        message:
          canAttempt1 && canAttempt2 && canAttempt3 && !canAttempt4
            ? 'Rate limiting working correctly'
            : 'Rate limiting logic failed',
        details: { canAttempt1, canAttempt2, canAttempt3, canAttempt4 },
        timestamp: new Date(),
      });
    } catch (error: any) {
      results.push({
        component: 'Utility Functions',
        test: 'Rate Limiter Test',
        status: 'fail',
        message: 'Failed to test rate limiter',
        details: error.message,
        timestamp: new Date(),
      });
    }

    return results;
  }

  /**
   * Test authentication context
   */
  async testAuthContext(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    try {
      const { AuthContext } = await import('../hooks/useAuth');

      results.push({
        component: 'Authentication',
        test: 'AuthContext Export',
        status: AuthContext ? 'pass' : 'fail',
        message: AuthContext
          ? 'AuthContext exported correctly'
          : 'AuthContext not exported',
        details: { hasContext: !!AuthContext },
        timestamp: new Date(),
      });
    } catch (error: any) {
      results.push({
        component: 'Authentication',
        test: 'AuthContext Import',
        status: 'fail',
        message: 'Failed to import AuthContext',
        details: error.message,
        timestamp: new Date(),
      });
    }

    return results;
  }

  /**
   * Run all component tests
   */
  async runAllTests(): Promise<ComponentTestSuite[]> {
    const suites: ComponentTestSuite[] = [];

    // Run validation tests
    const validationResults = await this.testFormValidation();
    suites.push(this.createTestSuite('Form Validation', validationResults));

    // Run error handling tests
    const errorHandlingResults = await this.testErrorHandling();
    suites.push(this.createTestSuite('Error Handling', errorHandlingResults));

    // Run component import tests
    const importResults = await this.testComponentImports();
    suites.push(this.createTestSuite('Component Imports', importResults));

    // Run utility function tests
    const utilityResults = await this.testUtilityFunctions();
    suites.push(this.createTestSuite('Utility Functions', utilityResults));

    // Run auth context tests
    const authResults = await this.testAuthContext();
    suites.push(this.createTestSuite('Authentication', authResults));

    // Store all results
    this.testResults = [
      ...validationResults,
      ...errorHandlingResults,
      ...importResults,
      ...utilityResults,
      ...authResults,
    ];

    return suites;
  }

  /**
   * Create a test suite summary
   */
  private createTestSuite(
    name: string,
    results: TestResult[]
  ): ComponentTestSuite {
    const passedTests = results.filter(r => r.status === 'pass').length;
    const failedTests = results.filter(r => r.status === 'fail').length;
    const warnings = results.filter(r => r.status === 'warning').length;

    let overallStatus: 'pass' | 'fail' | 'warning' = 'pass';
    if (failedTests > 0) overallStatus = 'fail';
    else if (warnings > 0) overallStatus = 'warning';

    return {
      componentName: name,
      tests: results,
      overallStatus,
      totalTests: results.length,
      passedTests,
      failedTests,
      warnings,
    };
  }

  /**
   * Get overall test summary
   */
  getOverallSummary(): {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    status: string;
  } {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.status === 'pass').length;
    const failed = this.testResults.filter(r => r.status === 'fail').length;
    const warnings = this.testResults.filter(
      r => r.status === 'warning'
    ).length;

    let status = 'PASS';
    if (failed > 0) status = 'FAIL';
    else if (warnings > 0) status = 'WARNING';

    return { total, passed, failed, warnings, status };
  }

  /**
   * Get failed tests for debugging
   */
  getFailedTests(): TestResult[] {
    return this.testResults.filter(r => r.status === 'fail');
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.testResults = [];
  }
}

// Export singleton instance
export const componentTester = ComponentTester.getInstance();
