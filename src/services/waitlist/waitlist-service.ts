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
      // Validate email
      const validation = validateWaitlistEmail(email);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid email address');
      }

      const sanitizedEmail = validation.sanitized!;

      // Check rate limiting
      if (!this.rateLimiter.canAttempt(sanitizedEmail)) {
        const remainingAttempts =
          this.rateLimiter.getRemainingAttempts(sanitizedEmail);
        throw new Error(
          `Too many attempts for this email. Please wait before trying again.`
        );
      }

      // Check if email already exists (optional - can be disabled for performance)
      const isDuplicate = await this.isEmailOnWaitlist(sanitizedEmail);
      if (isDuplicate) {
        throw new Error('This email is already on our waitlist.');
      }

      // Create waitlist entry
      const entry: Omit<WaitlistEntry, 'timestamp'> = {
        email: sanitizedEmail,
        source: metadata?.source || 'landing-page',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      };

      const docRef = await addDoc(collection(db, this.collectionName), {
        ...entry,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      console.log('✅ Waitlist entry added successfully:', docRef.id);

      // Reset rate limiter on success
      this.rateLimiter.reset(sanitizedEmail);

      return docRef.id;
    } catch (error: any) {
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
