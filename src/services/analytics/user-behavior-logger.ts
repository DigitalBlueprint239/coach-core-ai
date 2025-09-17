import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import secureLogger from '../../utils/secure-logger';

// User behavior event types
export interface UserBehaviorEvent {
  userId: string;
  sessionId: string;
  eventType: 'page_view' | 'feature_usage' | 'interaction' | 'error' | 'performance' | 'beta_feedback';
  eventName: string;
  properties: Record<string, any>;
  timestamp: Date;
  userAgent: string;
  url: string;
  referrer?: string;
  featureFlags?: Record<string, boolean>;
}

// Error event interface
export interface ErrorEvent {
  userId: string;
  sessionId: string;
  errorType: 'javascript' | 'network' | 'firebase' | 'validation' | 'permission' | 'unknown';
  errorMessage: string;
  errorStack?: string;
  component?: string;
  action?: string;
  properties: Record<string, any>;
  timestamp: Date;
  userAgent: string;
  url: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Beta testing feedback interface
export interface BetaFeedback {
  userId: string;
  sessionId: string;
  feature: string;
  rating: number; // 1-5 scale
  feedback: string;
  category: 'bug' | 'feature_request' | 'improvement' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  timestamp: Date;
  userAgent: string;
  url: string;
}

// User behavior logger class
class UserBehaviorLogger {
  private sessionId: string;
  private userId: string | null = null;
  private isEnabled: boolean = true;
  private eventQueue: UserBehaviorEvent[] = [];
  private errorQueue: ErrorEvent[] = [];
  private feedbackQueue: BetaFeedback[] = [];
  private batchSize: number = 10;
  private flushInterval: number = 30000; // 30 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startFlushTimer();
    this.setupErrorHandlers();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.logError({
        errorType: 'javascript',
        errorMessage: event.message,
        errorStack: event.error?.stack,
        component: 'global',
        action: 'unhandled_error',
        properties: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        severity: 'high',
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        errorType: 'javascript',
        errorMessage: event.reason?.message || 'Unhandled promise rejection',
        errorStack: event.reason?.stack,
        component: 'global',
        action: 'unhandled_promise_rejection',
        properties: {
          reason: event.reason,
        },
        severity: 'high',
      });
    });
  }

  // Set user ID for logging
  setUserId(userId: string | null) {
    this.userId = userId;
    secureLogger.info('User ID set for behavior logging', { userId });
  }

  // Enable/disable logging
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    secureLogger.info('Behavior logging enabled/disabled', { enabled });
  }

  // Log user behavior event
  logBehavior(eventName: string, properties: Record<string, any> = {}) {
    if (!this.isEnabled || !this.userId) return;

    const event: UserBehaviorEvent = {
      userId: this.userId,
      sessionId: this.sessionId,
      eventType: 'interaction',
      eventName,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      featureFlags: this.getCurrentFeatureFlags(),
    };

    this.eventQueue.push(event);
    secureLogger.debug('User behavior event logged', { eventName, properties });

    // Flush if queue is full
    if (this.eventQueue.length >= this.batchSize) {
      this.flushEvents();
    }
  }

  // Log page view
  logPageView(pageName: string, properties: Record<string, any> = {}) {
    if (!this.isEnabled || !this.userId) return;

    const event: UserBehaviorEvent = {
      userId: this.userId,
      sessionId: this.sessionId,
      eventType: 'page_view',
      eventName: 'page_view',
      properties: {
        pageName,
        ...properties,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      featureFlags: this.getCurrentFeatureFlags(),
    };

    this.eventQueue.push(event);
    secureLogger.debug('Page view logged', { pageName, properties });
  }

  // Log feature usage
  logFeatureUsage(feature: string, action: string, properties: Record<string, any> = {}) {
    if (!this.isEnabled || !this.userId) return;

    const event: UserBehaviorEvent = {
      userId: this.userId,
      sessionId: this.sessionId,
      eventType: 'feature_usage',
      eventName: 'feature_usage',
      properties: {
        feature,
        action,
        ...properties,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      featureFlags: this.getCurrentFeatureFlags(),
    };

    this.eventQueue.push(event);
    secureLogger.debug('Feature usage logged', { feature, action, properties });
  }

  // Log error
  logError(errorData: Omit<ErrorEvent, 'userId' | 'sessionId' | 'timestamp' | 'userAgent' | 'url'>) {
    if (!this.isEnabled) return;

    const error: ErrorEvent = {
      ...errorData,
      userId: this.userId || 'anonymous',
      sessionId: this.sessionId,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.errorQueue.push(error);
    secureLogger.error('Error logged', { errorData });

    // Flush errors immediately for critical issues
    if (error.severity === 'critical') {
      this.flushErrors();
    }
  }

  // Log beta feedback
  logBetaFeedback(feedback: Omit<BetaFeedback, 'userId' | 'sessionId' | 'timestamp' | 'userAgent' | 'url'>) {
    if (!this.isEnabled || !this.userId) return;

    const betaFeedback: BetaFeedback = {
      ...feedback,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.feedbackQueue.push(betaFeedback);
    secureLogger.info('Beta feedback logged', { feedback });

    // Flush feedback immediately
    this.flushFeedback();
  }

  // Get current feature flags (mock implementation)
  private getCurrentFeatureFlags(): Record<string, boolean> {
    // This would be replaced with actual feature flag service integration
    return {
      enablePlayDesigner: false,
      enableAdvancedDashboard: false,
      enableAIBrain: false,
    };
  }

  // Start flush timer
  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flushAll();
    }, this.flushInterval);
  }

  // Stop flush timer
  private stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // Flush all queues
  async flushAll() {
    await Promise.all([
      this.flushEvents(),
      this.flushErrors(),
      this.flushFeedback(),
    ]);
  }

  // Flush behavior events
  async flushEvents() {
    if (this.eventQueue.length === 0) return;

    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];

      await addDoc(collection(db, 'user_behavior_events'), {
        events,
        batchTimestamp: serverTimestamp(),
        batchSize: events.length,
      });

      secureLogger.info('Behavior events flushed', { count: events.length });
    } catch (error) {
      secureLogger.error('Failed to flush behavior events', { error });
      // Re-add events to queue for retry
      this.eventQueue.unshift(...this.eventQueue);
    }
  }

  // Flush error events
  async flushErrors() {
    if (this.errorQueue.length === 0) return;

    try {
      const errors = [...this.errorQueue];
      this.errorQueue = [];

      await addDoc(collection(db, 'error_events'), {
        errors,
        batchTimestamp: serverTimestamp(),
        batchSize: errors.length,
      });

      secureLogger.info('Error events flushed', { count: errors.length });
    } catch (error) {
      secureLogger.error('Failed to flush error events', { error });
      // Re-add errors to queue for retry
      this.errorQueue.unshift(...this.errorQueue);
    }
  }

  // Flush feedback events
  async flushFeedback() {
    if (this.feedbackQueue.length === 0) return;

    try {
      const feedback = [...this.feedbackQueue];
      this.feedbackQueue = [];

      await addDoc(collection(db, 'beta_feedback'), {
        feedback,
        batchTimestamp: serverTimestamp(),
        batchSize: feedback.length,
      });

      secureLogger.info('Beta feedback flushed', { count: feedback.length });
    } catch (error) {
      secureLogger.error('Failed to flush beta feedback', { error });
      // Re-add feedback to queue for retry
      this.feedbackQueue.unshift(...this.feedbackQueue);
    }
  }

  // Get session ID
  getSessionId(): string {
    return this.sessionId;
  }

  // Get queue sizes
  getQueueSizes() {
    return {
      events: this.eventQueue.length,
      errors: this.errorQueue.length,
      feedback: this.feedbackQueue.length,
    };
  }

  // Cleanup
  destroy() {
    this.stopFlushTimer();
    this.flushAll();
  }
}

// Create singleton instance
export const userBehaviorLogger = new UserBehaviorLogger();

// Export types and service
export { UserBehaviorLogger };
export default userBehaviorLogger;
