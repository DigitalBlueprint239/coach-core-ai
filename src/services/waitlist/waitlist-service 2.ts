import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { validateWaitlistEmail, RateLimiter } from '../../utils/validation';
import { errorHandler, FirebaseErrorHandler } from '../../utils/error-handling';
import { trackUserAction, trackError } from '../monitoring';
import { 
  trackWaitlistSignup, 
  trackWaitlistSignupSuccess, 
  trackWaitlistSignupError,
  trackWaitlistConversion 
} from '../analytics';
import { rateLimiter } from '../security/rate-limiter';
import { auditLogger } from '../security/audit-logger';
import { ValidationService } from '../security/validation-rules';
import { createFirestoreHelper } from '../../utils/firestore-sanitization';

export interface WaitlistEntry {
  email: string;
  timestamp: Date;
  source?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class WaitlistService {
  private readonly collectionName = 'waitlist';
  private rateLimiter: RateLimiter;
  private firestoreHelper = createFirestoreHelper('waitlist');

  constructor() {
    // Rate limit: 3 attempts per email per hour
    this.rateLimiter = new RateLimiter(3, 3600000);
  }

  /**
   * Add a new email to the waitlist with comprehensive validation
   */
  async addToWaitlist(
    email: string,
    metadata?: Partial<WaitlistEntry>
  ): Promise<string> {
    try {
      // Track waitlist submission attempt
      trackUserAction('waitlist_submit_attempt', { 
        email, 
        source: metadata?.source 
      });
      
      // Track analytics event
      trackWaitlistSignup(email, metadata?.source);

      // Rate limiting check
      const rateLimitResult = await rateLimiter.checkRateLimit('waitlist', email, {
        source: metadata?.source,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      if (!rateLimitResult.allowed) {
        const errorMessage = `Too many waitlist attempts. Please try again in ${Math.ceil((rateLimitResult.retryAfter || 0) / 60)} minutes.`;
        
        // Log rate limit violation
        await auditLogger.logFailedAction(
          'waitlist_submission',
          'waitlist',
          undefined,
          email,
          'Rate limit exceeded',
          {
            email,
            source: metadata?.source,
            retryAfter: rateLimitResult.retryAfter
          },
          'medium'
        );

        throw new Error(errorMessage);
      }

      // Validate and sanitize email
      const emailValidation = ValidationService.validateAndSanitizeEmail(email);
      if (!emailValidation.success) {
        throw new Error(emailValidation.error);
      }

      const sanitizedEmail = emailValidation.email;

      // Check if email already exists (optional - can be disabled for performance)
      const isDuplicate = await this.isEmailOnWaitlist(sanitizedEmail);
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

      // Log successful waitlist submission
      await auditLogger.logWaitlistSubmission(
        sanitizedEmail,
        true,
        undefined,
        undefined,
        {
          docId: docRef.id,
          source: metadata?.source,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      );

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
      await auditLogger.logWaitlistSubmission(
        email,
        false,
        error.message,
        undefined,
        {
          source: metadata?.source,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      );

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
      const sanitizedEmail = email.toLowerCase().trim();

      const q = query(
        collection(db, this.collectionName),
        where('email', '==', sanitizedEmail)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
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
    try {
      // This would require admin access and proper security rules
      // For now, return placeholder data
      return { total: 0, recent: 0 };
    } catch (error: any) {
      const appError = FirebaseErrorHandler.handleFirestoreError(error);
      throw new Error(errorHandler.getUserFriendlyMessage(appError));
    }
  }

  /**
   * Get remaining attempts for an email
   */
  getRemainingAttempts(email: string): number {
    return this.rateLimiter.getRemainingAttempts(email);
  }

  /**
   * Reset rate limiting for an email (useful for testing)
   */
  resetRateLimit(email: string): void {
    this.rateLimiter.reset(email);
  }
}

export const waitlistService = new WaitlistService();
export default waitlistService;
