import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { validateWaitlistEmail, RateLimiter } from '../../utils/validation';
import { errorHandler, FirebaseErrorHandler } from '../../utils/error-handling';
import { trackUserAction, trackError } from '../monitoring/monitoring-lite';
import {
  trackWaitlistSignup,
  trackWaitlistSignupSuccess,
  trackWaitlistSignupError,
  trackWaitlistConversion,
} from '../analytics/analytics-events';
import { createFirestoreHelper } from '../../utils/firestore-sanitization';
import { ga4Service } from '../analytics/ga4-config';
import { isEmailOnWaitlist as checkWaitlistDuplicate } from './waitlist-duplicate-checker';
import {
  appConfigService,
  getConfiguredWaitlistSettings,
  DEFAULT_WAITLIST_SETTINGS,
} from '../config/app-config-service';

export interface WaitlistEntry {
  email: string;
  timestamp: Date;
  source?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: 'pending' | 'invited' | 'converted';
  converted?: boolean;
  convertedAt?: Date | null;
  convertedUserId?: string | null;
  userId?: string;
  id?: string;
}

const logWaitlistSubmission = async (
  email: string,
  success: boolean,
  metadata?: Record<string, unknown>
) => {
  if (import.meta.env?.DEV) {
    console.debug('[waitlist][audit]', success ? 'success' : 'failure', email, metadata);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { auditLogger } = require('../security/audit-logger') as {
      auditLogger?: {
        logWaitlistSubmission?: (
          emailAddr: string,
          outcome: boolean,
          userId?: string,
          teamId?: string,
          details?: Record<string, unknown>
        ) => Promise<void>;
      };
    };

    await auditLogger?.logWaitlistSubmission?.(email, success, undefined, undefined, metadata);
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.warn('[waitlist][audit] logger unavailable', error);
    }
  }
};

const logWaitlistFailure = async (
  email: string,
  reason: string,
  metadata?: Record<string, unknown>
) => {
  if (import.meta.env?.DEV) {
    console.warn('[waitlist][audit] failure', { email, reason, metadata });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { auditLogger } = require('../security/audit-logger') as {
      auditLogger?: {
        logFailedAction?: (
          action: string,
          resource: string,
          errorMessage: string,
          userId?: string,
          userEmail?: string,
          details?: Record<string, unknown>,
          severity?: 'low' | 'medium' | 'high' | 'critical'
        ) => Promise<void>;
      };
    };

    await auditLogger?.logFailedAction?.('waitlist_submission', 'waitlist', reason, undefined, email, metadata, 'medium');
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.warn('[waitlist][audit] failed to record via audit logger', error);
    }
  }
};

export class WaitlistService {
  private readonly collectionName = 'waitlist';
  private rateLimiterConfig = { ...DEFAULT_WAITLIST_SETTINGS.rateLimit };
  private batchConfig = { ...DEFAULT_WAITLIST_SETTINGS.batch };
  private rateLimiter: RateLimiter;
  private firestoreHelper = createFirestoreHelper('waitlist');

  constructor() {
    this.rateLimiter = new RateLimiter(
      this.rateLimiterConfig.maxAttempts,
      this.rateLimiterConfig.windowMs
    );
  }

  /**
   * Add a new email to the admin dashboard is currently being non reswaitlist with comprehensive validation
   */
  async addToWaitlist(
    email: string,
    metadata?: Partial<WaitlistEntry>
  ): Promise<string> {
    try {
      await this.syncWaitlistConfig();
      // Track waitlist submission attempt
      trackUserAction('waitlist_submit_attempt', { 
        email, 
        source: metadata?.source 
      });
      
      // Track analytics event
      trackWaitlistSignup(email, metadata?.source);

      // Rate limiting check
      const rateLimitKey = email.trim().toLowerCase();
      if (!this.rateLimiter.canAttempt(rateLimitKey)) {
        await logWaitlistFailure(email, 'Rate limit exceeded', {
          source: metadata?.source,
        });

        throw new Error('Too many waitlist attempts. Please try again later.');
      }

      // Validate and sanitize email
      const emailValidation = validateWaitlistEmail(email);
      if (!emailValidation.isValid || !emailValidation.sanitized) {
        throw new Error(emailValidation.error || 'Invalid email address');
      }

      const sanitizedEmail = emailValidation.sanitized;

      // Check if email already exists (optional - can be disabled for performance)
      const isDuplicate = await checkWaitlistDuplicate(sanitizedEmail);
      if (isDuplicate) {
        throw new Error('This email is already on our waitlist.');
      }

      // Create waitlist entry with sanitization
      const entryData = {
        email: sanitizedEmail,
        source: metadata?.source || 'landing-page',
        timestamp: serverTimestamp(),
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      };

      // Sanitize data for Firestore write
      const { data: sanitizedEntry, isValid, warnings } = this.firestoreHelper.prepareCreate(
        entryData,
        ['email', 'source', 'timestamp']
      );

      if (!isValid) {
        throw new Error('Invalid waitlist entry data');
      }

      const docRef = await addDoc(collection(db, this.collectionName), sanitizedEntry);
      
      // Log result
      this.firestoreHelper.logResult('create', true, docRef.id, warnings);

      console.log('✅ Waitlist entry added successfully:', docRef.id);

      // Track successful waitlist submission
      trackUserAction('waitlist_submit_success', { 
        email: sanitizedEmail, 
        docId: docRef.id,
        source: metadata?.source 
      });
      
      // Track analytics success and conversion
      trackWaitlistSignupSuccess(sanitizedEmail, metadata?.source);
      trackWaitlistConversion(sanitizedEmail, metadata?.source);

      // Track GA4 analytics
      ga4Service.trackSignupSubmitted({
        email: sanitizedEmail,
        source: metadata?.source || 'landing-page',
        user_id: metadata?.userId,
        event_category: 'engagement',
        event_label: 'waitlist_signup',
      });

      // Log successful waitlist submission
      await logWaitlistSubmission(sanitizedEmail, true, {
        docId: docRef.id,
        source: metadata?.source,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        timestamp: new Date().toISOString(),
      });

      return docRef.id;
    } catch (error: any) {
      // Track waitlist submission error
      trackUserAction('waitlist_submit_error', { 
        email, 
        error: error.message,
        source: metadata?.source 
      });
      trackError(error as Error, { action: 'waitlist_submit', email });
      
      // Track analytics error
      trackWaitlistSignupError(email, error.message, metadata?.source);

      // Log failed waitlist submission
      await logWaitlistFailure(email, error.message, {
        source: metadata?.source,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      });

      await logWaitlistSubmission(email, false, {
        error: error.message,
        source: metadata?.source,
        timestamp: new Date().toISOString(),
      });

      // Handle Firebase-specific errors
      if (error.code?.startsWith('firestore/')) {
        const appError = FirebaseErrorHandler.handleFirestoreError(error);
        throw new Error(errorHandler.getUserFriendlyMessage(appError));
      }

      // Handle validation errors
      if (
        error.message?.includes('Invalid email') ||
        error.message?.includes('already on our waitlist')
      ) {
        throw error; // Re-throw validation errors as-is
      }

      // Handle rate limiting errors
      if (error.message?.includes('Too many attempts')) {
        throw error; // Re-throw rate limiting errors as-is
      }

      // Handle other errors
      const appError = errorHandler.handleError(error, 'waitlist');
      throw new Error(errorHandler.getUserFriendlyMessage(appError));
    }
  }

  /**
   * Check if an email is already on the waitlist
   */
  async isEmailOnWaitlist(email: string): Promise<boolean> {
    try {
      return await checkWaitlistDuplicate(email.toLowerCase().trim());
    } catch (error: any) {
      // Log error but don't fail the signup process
      console.warn('Warning: Could not check for duplicate email:', error);
      return false; // Allow signup to proceed
    }
  }

  /**
   * Get waitlist statistics (for admin use - requires proper security rules)
   */
  async getWaitlistStats(): Promise<{ total: number; recent: number }> {
    // This would require admin access and proper security rules
    // For now, return placeholder data
    return { total: 0, recent: 0 };
  }

  /**
   * Get remaining attempts for an email
   */
  getRemainingAttempts(email: string): number {
    return this.rateLimiter.getRemainingAttempts(email.trim().toLowerCase());
  }

  /**
   * Reset rate limiting for an email (useful for testing)
   */
  resetRateLimit(email: string): void {
    this.rateLimiter.reset(email.trim().toLowerCase());
  }

  private async syncWaitlistConfig(): Promise<void> {
    await appConfigService.ensureLoaded();
    const config = getConfiguredWaitlistSettings();
    const { rateLimit, batch } = config;

    if (
      rateLimit.maxAttempts !== this.rateLimiterConfig.maxAttempts ||
      rateLimit.windowMs !== this.rateLimiterConfig.windowMs
    ) {
      this.rateLimiterConfig = { ...rateLimit };
      this.rateLimiter = new RateLimiter(
        this.rateLimiterConfig.maxAttempts,
        this.rateLimiterConfig.windowMs
      );
    }

    this.batchConfig = { ...batch };
  }
}

export const waitlistService = new WaitlistService();
export default waitlistService;
