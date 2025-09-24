// @ts-nocheck
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
import { ga4Service } from '../analytics/ga4-config';

export interface WaitlistEntry {
  email: string;
  timestamp: Date;
  source?: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  name?: string;
  role?: string;
  immediateAccess?: boolean;
  // Enhanced marketing fields
  teamLevel?: string;
  experience?: 'beginner' | 'intermediate' | 'advanced';
  teamSize?: 'small' | 'medium' | 'large';
  interests?: string[];
  marketingConsent?: boolean;
  newsletterConsent?: boolean;
  betaInterest?: boolean;
  referrerEmail?: string;
  referralCode?: string;
  leadScore?: number;
  segment?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
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

      // Track GA4 analytics
      ga4Service.trackSignupStarted(metadata?.source || 'waitlist');

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

  /**
   * Calculate lead score based on user data
   */
  calculateLeadScore(entry: Partial<WaitlistEntry>): number {
    let score = 10; // Base score

    // Role scoring
    const roleScores: Record<string, number> = {
      'head-coach': 30,
      'assistant-coach': 25,
      'coordinator': 20,
      'position-coach': 15,
      'volunteer': 10,
      'athletic-director': 35,
      'other': 5,
    };
    score += roleScores[entry.role || ''] || 5;

    // Team level scoring
    const teamLevelScores: Record<string, number> = {
      'professional': 40,
      'college': 35,
      'high-school': 25,
      'semi-pro': 30,
      'youth': 15,
      'other': 10,
    };
    score += teamLevelScores[entry.teamLevel || ''] || 10;

    // Experience scoring
    const experienceScores: Record<string, number> = {
      'advanced': 25,
      'intermediate': 15,
      'beginner': 5,
    };
    score += experienceScores[entry.experience || 'beginner'] || 5;

    // Team size scoring
    const teamSizeScores: Record<string, number> = {
      'large': 20,
      'medium': 15,
      'small': 10,
    };
    score += teamSizeScores[entry.teamSize || ''] || 10;

    // Interest scoring
    if (entry.interests?.length) {
      score += entry.interests.length * 5;
    }

    // Marketing consent bonus
    if (entry.marketingConsent) score += 10;
    if (entry.newsletterConsent) score += 5;
    if (entry.betaInterest) score += 15;

    // Referral bonus
    if (entry.referrerEmail) score += 20;

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Determine user segment based on lead score
   */
  determineSegment(score: number): string {
    if (score >= 80) return 'high-value';
    if (score >= 60) return 'medium-value';
    if (score >= 40) return 'low-value';
    return 'cold';
  }

  /**
   * Get waitlist analytics
   */
  async getWaitlistAnalytics(): Promise<{
    totalSignups: number;
    signupsBySource: Record<string, number>;
    signupsByRole: Record<string, number>;
    signupsByTeamLevel: Record<string, number>;
    leadScoreDistribution: Record<string, number>;
    topReferrers: Array<{ email: string; count: number }>;
    averageLeadScore: number;
  }> {
    try {
      const waitlistQuery = query(
        collection(db, this.collectionName),
        orderBy('timestamp', 'desc')
      );
      const waitlistSnapshot = await getDocs(waitlistQuery);

      const analytics = {
        totalSignups: waitlistSnapshot.size,
        signupsBySource: {} as Record<string, number>,
        signupsByRole: {} as Record<string, number>,
        signupsByTeamLevel: {} as Record<string, number>,
        leadScoreDistribution: {} as Record<string, number>,
        topReferrers: [] as Array<{ email: string; count: number }>,
        averageLeadScore: 0,
      };

      const referralsMap = new Map<string, number>();
      let totalLeadScore = 0;
      let leadScoreCount = 0;

      waitlistSnapshot.forEach((doc) => {
        const data = doc.data() as WaitlistEntry;
        
        // Source breakdown
        analytics.signupsBySource[data.source || 'unknown'] = 
          (analytics.signupsBySource[data.source || 'unknown'] || 0) + 1;
        
        // Role breakdown
        analytics.signupsByRole[data.role || 'unknown'] = 
          (analytics.signupsByRole[data.role || 'unknown'] || 0) + 1;
        
        // Team level breakdown
        analytics.signupsByTeamLevel[data.teamLevel || 'unknown'] = 
          (analytics.signupsByTeamLevel[data.teamLevel || 'unknown'] || 0) + 1;
        
        // Lead score distribution
        const leadScore = data.leadScore || this.calculateLeadScore(data);
        const scoreRange = this.getLeadScoreRange(leadScore);
        analytics.leadScoreDistribution[scoreRange] = 
          (analytics.leadScoreDistribution[scoreRange] || 0) + 1;
        
        // Track referrers
        if (data.referrerEmail) {
          referralsMap.set(data.referrerEmail, (referralsMap.get(data.referrerEmail) || 0) + 1);
        }

        // Calculate average lead score
        totalLeadScore += leadScore;
        leadScoreCount++;
      });

      // Convert referrals map to array
      analytics.topReferrers = Array.from(referralsMap.entries())
        .map(([email, count]) => ({ email, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      analytics.averageLeadScore = leadScoreCount > 0 ? totalLeadScore / leadScoreCount : 0;

      return analytics;
    } catch (error: any) {
      console.error('Error getting waitlist analytics:', error);
      trackError('waitlist_analytics_error', error);
      throw error;
    }
  }

  /**
   * Get lead score range for analytics
   */
  private getLeadScoreRange(score: number): string {
    if (score >= 80) return '80-100';
    if (score >= 60) return '60-79';
    if (score >= 40) return '40-59';
    if (score >= 20) return '20-39';
    return '0-19';
  }
}

export const waitlistService = new WaitlistService();
export default waitlistService;
