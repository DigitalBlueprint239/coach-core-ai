import { errorHandler } from '../../utils/error-handling';

export interface ErrorRecoveryStrategy {
  id: string;
  name: string;
  description: string;
  canHandle: (error: any) => boolean;
  execute: (error: any, context?: any) => Promise<boolean>;
  priority: number; // Higher number = higher priority
}

export interface RecoveryContext {
  userId?: string;
  operation?: string;
  retryCount?: number;
  lastAttempt?: Date;
  metadata?: any;
}

export class ErrorRecoveryService {
  private strategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private recoveryHistory: Array<{
    errorId: string;
    strategy: string;
    success: boolean;
    timestamp: Date;
    context: RecoveryContext;
  }> = [];

  constructor() {
    this.registerDefaultStrategies();
  }

  /**
   * Register a new error recovery strategy
   */
  registerStrategy(strategy: ErrorRecoveryStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(error: any, context: RecoveryContext = {}): Promise<{
    success: boolean;
    strategy?: string;
    message?: string;
  }> {
    const errorId = this.generateErrorId(error);
    
    // Find applicable strategies
    const applicableStrategies = Array.from(this.strategies.values())
      .filter(strategy => strategy.canHandle(error))
      .sort((a, b) => b.priority - a.priority);

    if (applicableStrategies.length === 0) {
      return {
        success: false,
        message: 'No recovery strategy available for this error',
      };
    }

    // Try strategies in order of priority
    for (const strategy of applicableStrategies) {
      try {
        console.log(`Attempting recovery with strategy: ${strategy.name}`);
        const success = await strategy.execute(error, context);
        
        // Record recovery attempt
        this.recoveryHistory.push({
          errorId,
          strategy: strategy.id,
          success,
          timestamp: new Date(),
          context,
        });

        if (success) {
          console.log(`✅ Recovery successful with strategy: ${strategy.name}`);
          return {
            success: true,
            strategy: strategy.id,
            message: `Recovered using ${strategy.name}`,
          };
        }
      } catch (recoveryError) {
        console.error(`Recovery strategy ${strategy.name} failed:`, recoveryError);
      }
    }

    return {
      success: false,
      message: 'All recovery strategies failed',
    };
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats(): {
    totalAttempts: number;
    successfulRecoveries: number;
    successRate: number;
    byStrategy: { [strategyId: string]: { attempts: number; successes: number } };
  } {
    const totalAttempts = this.recoveryHistory.length;
    const successfulRecoveries = this.recoveryHistory.filter(h => h.success).length;
    const successRate = totalAttempts > 0 ? (successfulRecoveries / totalAttempts) * 100 : 0;

    const byStrategy = this.recoveryHistory.reduce((acc, history) => {
      const strategyId = history.strategy;
      if (!acc[strategyId]) {
        acc[strategyId] = { attempts: 0, successes: 0 };
      }
      acc[strategyId].attempts++;
      if (history.success) {
        acc[strategyId].successes++;
      }
      return acc;
    }, {} as { [strategyId: string]: { attempts: number; successes: number } });

    return {
      totalAttempts,
      successfulRecoveries,
      successRate,
      byStrategy,
    };
  }

  /**
   * Clear recovery history
   */
  clearHistory(): void {
    this.recoveryHistory = [];
  }

  /**
   * Register default recovery strategies
   */
  private registerDefaultStrategies(): void {
    // Network error recovery
    this.registerStrategy({
      id: 'network-retry',
      name: 'Network Retry',
      description: 'Retry network operations with exponential backoff',
      priority: 10,
      canHandle: (error) => {
        return error.code === 'auth/network-request-failed' ||
               error.code === 'firestore/unavailable' ||
               error.message?.includes('network') ||
               error.message?.includes('fetch');
      },
      execute: async (error, context) => {
        const retryCount = context.retryCount || 0;
        if (retryCount >= 3) {
          return false;
        }

        // Wait with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        // Update context for next attempt
        context.retryCount = retryCount + 1;
        context.lastAttempt = new Date();

        return true; // Indicate that retry should be attempted
      },
    });

    // Authentication error recovery
    this.registerStrategy({
      id: 'auth-refresh',
      name: 'Authentication Refresh',
      description: 'Refresh authentication token and retry',
      priority: 9,
      canHandle: (error) => {
        return error.code === 'auth/user-token-expired' ||
               error.code === 'auth/invalid-credential' ||
               error.code === 'auth/too-many-requests';
      },
      execute: async (error, context) => {
        try {
          // Import auth service dynamically to avoid circular dependencies
          const { authService } = await import('../firebase/auth-service');
          
          // Try to refresh the token
          await authService.refreshToken();
          return true;
        } catch (refreshError) {
          console.error('Failed to refresh auth token:', refreshError);
          return false;
        }
      },
    });

    // Firestore permission error recovery
    this.registerStrategy({
      id: 'firestore-permission',
      name: 'Firestore Permission Recovery',
      description: 'Handle permission denied errors by checking user roles',
      priority: 8,
      canHandle: (error) => {
        return error.code === 'firestore/permission-denied';
      },
      execute: async (error, context) => {
        try {
          // Check if user needs to re-authenticate
          const { authService } = await import('../firebase/auth-service');
          const currentUser = authService.getCurrentUser();
          
          if (!currentUser) {
            // User needs to log in again
            return false;
          }

          // Check if user has proper permissions
          const { userService } = await import('../firebase/user-service');
          const userProfile = await userService.getUserProfile(currentUser.uid);
          
          if (!userProfile) {
            return false;
          }

          // If we get here, the permission error might be temporary
          return true;
        } catch (permissionError) {
          console.error('Failed to recover from permission error:', permissionError);
          return false;
        }
      },
    });

    // Rate limit error recovery
    this.registerStrategy({
      id: 'rate-limit-wait',
      name: 'Rate Limit Wait',
      description: 'Wait for rate limit to reset before retrying',
      priority: 7,
      canHandle: (error) => {
        return error.code === 'auth/too-many-requests' ||
               error.message?.includes('rate limit') ||
               error.message?.includes('quota exceeded');
      },
      execute: async (error, context) => {
        // Extract retry-after from error if available
        const retryAfter = error.retryAfter || 60; // Default to 60 seconds
        
        console.log(`Rate limit hit. Waiting ${retryAfter} seconds before retry.`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        
        return true;
      },
    });

    // Data validation error recovery
    this.registerStrategy({
      id: 'data-validation',
      name: 'Data Validation Recovery',
      description: 'Clean and validate data before retrying',
      priority: 6,
      canHandle: (error) => {
        return error.message?.includes('validation') ||
               error.message?.includes('invalid data') ||
               error.code === 'firestore/invalid-argument';
      },
      execute: async (error, context) => {
        try {
          // Import data validation utilities
          const { validateData } = await import('../../utils/data-validation');
          
          if (context.metadata?.data) {
            const cleanedData = validateData(context.metadata.data);
            context.metadata.data = cleanedData;
            return true;
          }
          
          return false;
        } catch (validationError) {
          console.error('Failed to clean data:', validationError);
          return false;
        }
      },
    });

    // Generic retry strategy
    this.registerStrategy({
      id: 'generic-retry',
      name: 'Generic Retry',
      description: 'Simple retry with exponential backoff',
      priority: 1,
      canHandle: () => true, // Can handle any error
      execute: async (error, context) => {
        const retryCount = context.retryCount || 0;
        if (retryCount >= 2) {
          return false;
        }

        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        context.retryCount = retryCount + 1;
        return true;
      },
    });
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(error: any): string {
    const errorString = JSON.stringify({
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 100),
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < errorString.length; i++) {
      const char = errorString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `error_${Math.abs(hash)}_${Date.now()}`;
  }
}

export const errorRecoveryService = new ErrorRecoveryService();
export default errorRecoveryService;

