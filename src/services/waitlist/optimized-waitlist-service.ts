import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
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

// ============================================
// CACHING SYSTEM FOR WAITLIST
// ============================================

interface WaitlistCacheEntry {
  email: string;
  timestamp: number;
  ttl: number;
}

class WaitlistCache {
  private cache = new Map<string, WaitlistCacheEntry>();
  private readonly DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly DUPLICATE_CHECK_TTL = 60 * 60 * 1000; // 1 hour

  setDuplicateCheck(email: string): void {
    this.cache.set(email.toLowerCase(), {
      email: email.toLowerCase(),
      timestamp: Date.now(),
      ttl: this.DUPLICATE_CHECK_TTL,
    });
  }

  isDuplicate(email: string): boolean {
    const entry = this.cache.get(email.toLowerCase());
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(email.toLowerCase());
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// ============================================
// BATCH PROCESSING FOR WAITLIST
// ============================================

interface PendingWaitlistEntry {
  email: string;
  metadata?: Partial<WaitlistEntry>;
  timestamp: number;
  retryCount: number;
}

class WaitlistBatchProcessor {
  private pendingEntries: PendingWaitlistEntry[] = [];
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_TIMEOUT = 5000; // 5 seconds
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  addEntry(email: string, metadata?: Partial<WaitlistEntry>): Promise<string> {
    return new Promise((resolve, reject) => {
      const entry: PendingWaitlistEntry = {
        email,
        metadata,
        timestamp: Date.now(),
        retryCount: 0,
      };

      this.pendingEntries.push(entry);

      // Set up batch processing timer
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.BATCH_TIMEOUT);
      }

      // Process immediately if batch is full
      if (this.pendingEntries.length >= this.BATCH_SIZE) {
        this.processBatch();
      }

      // For now, resolve immediately - in a real implementation,
      // you'd want to track the promise and resolve it after processing
      resolve('pending');
    });
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.pendingEntries.length === 0) return;

    this.isProcessing = true;
    const entries = this.pendingEntries.splice(0, this.BATCH_SIZE);

    try {
      const batch = writeBatch(db);
      const results: string[] = [];

      for (const entry of entries) {
        try {
          const docRef = doc(collection(db, 'waitlist'));
          const entryData = {
            email: entry.email,
            source: entry.metadata?.source || 'landing-page',
            timestamp: serverTimestamp(),
            ipAddress: entry.metadata?.ipAddress,
            userAgent: entry.metadata?.userAgent,
            batchProcessed: true,
            batchTimestamp: serverTimestamp(),
          };

          batch.set(docRef, entryData);
          results.push(docRef.id);
        } catch (error) {
          console.error('❌ Error preparing batch entry:', error);
          // Retry logic could be implemented here
        }
      }

      await batch.commit();
      console.log(`✅ Batch processed: ${results.length} waitlist entries`);

      // Track batch processing
      trackUserAction('waitlist_batch_processed', {
        count: results.length,
        batchSize: this.BATCH_SIZE,
      });

    } catch (error) {
      console.error('❌ Error processing waitlist batch:', error);
      
      // Retry failed entries
      for (const entry of entries) {
        if (entry.retryCount < 3) {
          entry.retryCount++;
          this.pendingEntries.push(entry);
        }
      }
    } finally {
      this.isProcessing = false;
      
      // Process remaining entries if any
      if (this.pendingEntries.length > 0) {
        setTimeout(() => this.processBatch(), 1000);
      }
    }
  }

  clear(): void {
    this.pendingEntries = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
}

// ============================================
// OPTIMIZED WAITLIST SERVICE
// ============================================

export interface WaitlistEntry {
  email: string;
  timestamp: Date;
  source?: string;
  ipAddress?: string;
  userAgent?: string;
  batchProcessed?: boolean;
  batchTimestamp?: Date;
}

export class OptimizedWaitlistService {
  private readonly collectionName = 'waitlist';
  private rateLimiter: RateLimiter;
  private firestoreHelper = createFirestoreHelper('waitlist');
  private cache = new WaitlistCache();
  private batchProcessor = new WaitlistBatchProcessor();

  constructor() {
    // Rate limit: 3 attempts per email per hour
    this.rateLimiter = new RateLimiter(3, 3600000);
  }

  // ============================================
  // MAIN WAITLIST OPERATIONS
  // ============================================

  /**
   * Add a new email to the waitlist with comprehensive optimization
   */
  async addToWaitlist(
    email: string,
    metadata?: Partial<WaitlistEntry>,
    useBatch: boolean = true
  ): Promise<string> {
    try {
      // Track waitlist submission attempt
      trackUserAction('waitlist_submit_attempt', { 
        email, 
        source: metadata?.source,
        useBatch 
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

      // Check cache for duplicates first (fast check)
      if (this.cache.isDuplicate(sanitizedEmail)) {
        throw new Error('This email is already on our waitlist.');
      }

      // Check Firestore for duplicates (only if not in cache)
      const isDuplicate = await this.isEmailOnWaitlist(sanitizedEmail);
      if (isDuplicate) {
        // Add to cache to prevent future checks
        this.cache.setDuplicateCheck(sanitizedEmail);
        throw new Error('This email is already on our waitlist.');
      }

      // Add to cache to prevent duplicate submissions
      this.cache.setDuplicateCheck(sanitizedEmail);

      let docId: string;

      if (useBatch) {
        // Use batch processing for better performance
        docId = await this.batchProcessor.addEntry(sanitizedEmail, metadata);
      } else {
        // Direct Firestore write
        docId = await this.addDirectEntry(sanitizedEmail, metadata);
      }

      // Track successful waitlist submission
      trackUserAction('waitlist_submit_success', { 
        email: sanitizedEmail, 
        docId: docId,
        source: metadata?.source,
        useBatch 
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
          docId: docId,
          source: metadata?.source,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          useBatch
        }
      );

      return docId;
    } catch (error: any) {
      // Track waitlist submission error
      trackUserAction('waitlist_submit_error', { 
        email, 
        error: error.message,
        source: metadata?.source,
        useBatch 
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
          timestamp: new Date().toISOString(),
          useBatch
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
   * Add entry directly to Firestore (non-batched)
   */
  private async addDirectEntry(
    email: string,
    metadata?: Partial<WaitlistEntry>
  ): Promise<string> {
    const entryData = {
      email: email,
      source: metadata?.source || 'landing-page',
      timestamp: serverTimestamp(),
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      batchProcessed: false,
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

    return docRef.id;
  }

  /**
   * Check if an email is already on the waitlist (with caching)
   */
  async isEmailOnWaitlist(email: string): Promise<boolean> {
    try {
      const sanitizedEmail = email.toLowerCase().trim();

      // Check cache first
      if (this.cache.isDuplicate(sanitizedEmail)) {
        return true;
      }

      // Check Firestore
      const q = query(
        collection(db, this.collectionName),
        where('email', '==', sanitizedEmail)
      );

      const querySnapshot = await getDocs(q);
      const isDuplicate = !querySnapshot.empty;

      // Update cache
      if (isDuplicate) {
        this.cache.setDuplicateCheck(sanitizedEmail);
      }

      return isDuplicate;
    } catch (error: any) {
      // Log error but don't fail the signup process
      console.warn('Warning: Could not check for duplicate email:', error);
      return false; // Allow signup to proceed
    }
  }

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  /**
   * Process all pending batch entries immediately
   */
  async flushBatch(): Promise<void> {
    await this.batchProcessor.processBatch();
  }

  /**
   * Add multiple emails to waitlist in a single batch
   */
  async addMultipleToWaitlist(
    entries: Array<{ email: string; metadata?: Partial<WaitlistEntry> }>
  ): Promise<string[]> {
    try {
      const batch = writeBatch(db);
      const docIds: string[] = [];

      for (const entry of entries) {
        // Validate email
        const emailValidation = ValidationService.validateAndSanitizeEmail(entry.email);
        if (!emailValidation.success) {
          console.warn(`Skipping invalid email: ${entry.email}`);
          continue;
        }

        const sanitizedEmail = emailValidation.email;

        // Check for duplicates
        if (this.cache.isDuplicate(sanitizedEmail)) {
          console.warn(`Skipping duplicate email: ${sanitizedEmail}`);
          continue;
        }

        const docRef = doc(collection(db, this.collectionName));
        const entryData = {
          email: sanitizedEmail,
          source: entry.metadata?.source || 'bulk-import',
          timestamp: serverTimestamp(),
          ipAddress: entry.metadata?.ipAddress,
          userAgent: entry.metadata?.userAgent,
          batchProcessed: true,
          batchTimestamp: serverTimestamp(),
        };

        batch.set(docRef, entryData);
        docIds.push(docRef.id);
        this.cache.setDuplicateCheck(sanitizedEmail);
      }

      await batch.commit();

      // Track batch operation
      trackUserAction('waitlist_bulk_add', {
        count: docIds.length,
        totalAttempted: entries.length,
      });

      return docIds;
    } catch (error: any) {
      console.error('❌ Error adding multiple emails to waitlist:', error);
      throw error;
    }
  }

  // ============================================
  // STATISTICS AND MONITORING
  // ============================================

  /**
   * Get waitlist statistics (for admin use - requires proper security rules)
   */
  async getWaitlistStats(): Promise<{ 
    total: number; 
    recent: number; 
    batchProcessed: number;
    cacheStats: { size: number; entries: string[] };
  }> {
    try {
      // This would require admin access and proper security rules
      // For now, return placeholder data with cache stats
      return { 
        total: 0, 
        recent: 0, 
        batchProcessed: 0,
        cacheStats: this.cache.getStats()
      };
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

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  /**
   * Clear the duplicate check cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return this.cache.getStats();
  }

  // ============================================
  // CLEANUP
  // ============================================

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.batchProcessor.clear();
    this.cache.clear();
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

export const optimizedWaitlistService = new OptimizedWaitlistService();
export default optimizedWaitlistService;
