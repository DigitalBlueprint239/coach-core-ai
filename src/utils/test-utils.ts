import { auth, db } from '../services/firebase/firebase-config';
import { waitlistService } from '../services/waitlist/waitlist-service';
import { authService } from '../services/firebase/auth-service';

export interface TestResult {
  service: string;
  status: 'success' | 'error';
  message: string;
  details?: any;
}

export class TestUtils {
  /**
   * Test Firebase connection
   */
  static async testFirebaseConnection(): Promise<TestResult> {
    try {
      // Test if we can access Firebase services
      const authInstance = auth;
      const dbInstance = db;

      if (!authInstance || !dbInstance) {
        return {
          service: 'Firebase Connection',
          status: 'error',
          message: 'Firebase services not initialized',
        };
      }

      return {
        service: 'Firebase Connection',
        status: 'success',
        message: 'Firebase services initialized successfully',
        details: {
          auth: !!authInstance,
          firestore: !!dbInstance,
        },
      };
    } catch (error: any) {
      return {
        service: 'Firebase Connection',
        status: 'error',
        message: 'Firebase connection failed',
        details: error.message,
      };
    }
  }

  /**
   * Test waitlist service
   */
  static async testWaitlistService(): Promise<TestResult> {
    try {
      const testEmail = `test-${Date.now()}@example.com`;
      const result = await waitlistService.addToWaitlist(testEmail, {
        source: 'test-utils',
        userAgent: 'test-user-agent',
      });

      return {
        service: 'Waitlist Service',
        status: 'success',
        message: 'Waitlist service working correctly',
        details: {
          email: testEmail,
          result,
        },
      };
    } catch (error: any) {
      return {
        service: 'Waitlist Service',
        status: 'error',
        message: 'Waitlist service failed',
        details: error.message,
      };
    }
  }

  /**
   * Test auth service
   */
  static async testAuthService(): Promise<TestResult> {
    try {
      const currentUser = authService.getCurrentUser();
      const isAuth = authService.isAuthenticated();

      return {
        service: 'Auth Service',
        status: 'success',
        message: 'Auth service working correctly',
        details: {
          currentUser: currentUser ? currentUser.uid : 'null',
          isAuthenticated: isAuth,
        },
      };
    } catch (error: any) {
      return {
        service: 'Auth Service',
        status: 'error',
        message: 'Auth service failed',
        details: error.message,
      };
    }
  }

  /**
   * Run all tests
   */
  static async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test Firebase connection
    results.push(await this.testFirebaseConnection());

    // Test waitlist service
    results.push(await this.testWaitlistService());

    // Test auth service
    results.push(await this.testAuthService());

    return results;
  }

  /**
   * Get test summary
   */
  static getTestSummary(results: TestResult[]): {
    total: number;
    passed: number;
    failed: number;
    summary: string;
  } {
    const total = results.length;
    const passed = results.filter(r => r.status === 'success').length;
    const failed = total - passed;

    let summary = `Tests: ${passed}/${total} passed`;
    if (failed > 0) {
      summary += ` (${failed} failed)`;
    }

    return { total, passed, failed, summary };
  }
}

export default TestUtils;
