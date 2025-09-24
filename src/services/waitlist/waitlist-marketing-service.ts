// @ts-nocheck
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { trackUserAction, trackError } from '../monitoring';
import { trackWaitlistSignup, trackWaitlistSignupSuccess, trackWaitlistSignupError } from '../analytics';

export interface WaitlistMarketingData {
  email: string;
  name: string;
  role: string;
  teamLevel: string;
  source: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  ipAddress?: string;
  userAgent?: string;
  interests?: string[];
  experience?: 'beginner' | 'intermediate' | 'advanced';
  teamSize?: 'small' | 'medium' | 'large';
  immediateAccess?: boolean;
  marketingConsent?: boolean;
  newsletterConsent?: boolean;
  betaInterest?: boolean;
  createdAt?: Date;
}

export interface WaitlistSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    role?: string[];
    teamLevel?: string[];
    experience?: string[];
    source?: string[];
    interests?: string[];
  };
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  segmentId: string;
  status: 'draft' | 'scheduled' | 'sent' | 'paused';
  scheduledAt?: Date;
  sentAt?: Date;
  openRate?: number;
  clickRate?: number;
  conversionRate?: number;
  createdAt: Date;
}

export interface ReferralData {
  referrerEmail: string;
  referredEmail: string;
  referralCode: string;
  status: 'pending' | 'converted' | 'expired';
  rewardEarned?: boolean;
  createdAt: Date;
}

export class WaitlistMarketingService {
  private readonly waitlistCollection = 'waitlist';
  private readonly segmentsCollection = 'waitlist_segments';
  private readonly campaignsCollection = 'email_campaigns';
  private readonly referralsCollection = 'referrals';

  /**
   * Add user to waitlist with comprehensive marketing data
   */
  async addToWaitlistWithMarketing(
    data: WaitlistMarketingData
  ): Promise<{ waitlistId: string; referralCode: string }> {
    try {
      // Track signup attempt
      trackWaitlistSignup({
        email: data.email,
        role: data.role,
        teamLevel: data.teamLevel,
        source: data.source,
        utmSource: data.utmSource,
        utmCampaign: data.utmCampaign,
      });

      // Generate referral code
      const referralCode = this.generateReferralCode(data.email);

      // Create waitlist entry with marketing data
      const waitlistEntry = {
        ...data,
        referralCode,
        createdAt: serverTimestamp(),
        status: 'active',
        lastActivity: serverTimestamp(),
        emailVerified: false,
        leadScore: this.calculateLeadScore(data),
        segment: this.determineSegment(data),
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, this.waitlistCollection), waitlistEntry);

      // Track success
      trackWaitlistSignupSuccess({
        email: data.email,
        role: data.role,
        teamLevel: data.teamLevel,
        source: data.source,
        leadScore: waitlistEntry.leadScore,
        segment: waitlistEntry.segment,
      });

      // Track user action
      trackUserAction('waitlist_signup_marketing', {
        email: data.email,
        role: data.role,
        teamLevel: data.teamLevel,
        source: data.source,
        leadScore: waitlistEntry.leadScore,
        segment: waitlistEntry.segment,
      });

      return { waitlistId: docRef.id, referralCode };
    } catch (error: any) {
      console.error('Error adding to waitlist with marketing:', error);
      trackWaitlistSignupError(error.message || 'unknown_error');
      trackError('waitlist_marketing_signup_error', error);
      throw error;
    }
  }

  /**
   * Process referral signup
   */
  async processReferral(
    referrerEmail: string,
    referredData: WaitlistMarketingData
  ): Promise<{ waitlistId: string; referralId: string }> {
    try {
      // Add referred user to waitlist
      const { waitlistId } = await this.addToWaitlistWithMarketing({
        ...referredData,
        source: 'referral',
        referrer: referrerEmail,
      });

      // Create referral record
      const referralData: ReferralData = {
        referrerEmail,
        referredEmail: referredData.email,
        referralCode: this.generateReferralCode(referredData.email),
        status: 'pending',
        createdAt: new Date(),
      };

      const referralRef = await addDoc(collection(db, this.referralsCollection), {
        ...referralData,
        createdAt: serverTimestamp(),
      });

      // Track referral
      trackUserAction('referral_created', {
        referrerEmail,
        referredEmail: referredData.email,
        referralId: referralRef.id,
      });

      return { waitlistId, referralId: referralRef.id };
    } catch (error: any) {
      console.error('Error processing referral:', error);
      trackError('referral_processing_error', error);
      throw error;
    }
  }

  /**
   * Get waitlist analytics
   */
  async getWaitlistAnalytics(): Promise<{
    totalSignups: number;
    signupsBySource: Record<string, number>;
    signupsByRole: Record<string, number>;
    signupsByTeamLevel: Record<string, number>;
    conversionRate: number;
    topReferrers: Array<{ email: string; count: number }>;
    leadScoreDistribution: Record<string, number>;
  }> {
    try {
      const waitlistQuery = query(
        collection(db, this.waitlistCollection),
        orderBy('createdAt', 'desc')
      );
      const waitlistSnapshot = await getDocs(waitlistQuery);

      const analytics = {
        totalSignups: waitlistSnapshot.size,
        signupsBySource: {} as Record<string, number>,
        signupsByRole: {} as Record<string, number>,
        signupsByTeamLevel: {} as Record<string, number>,
        conversionRate: 0,
        topReferrers: [] as Array<{ email: string; count: number }>,
        leadScoreDistribution: {} as Record<string, number>,
      };

      const referralsMap = new Map<string, number>();

      waitlistSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Source breakdown
        analytics.signupsBySource[data.source] = (analytics.signupsBySource[data.source] || 0) + 1;
        
        // Role breakdown
        analytics.signupsByRole[data.role] = (analytics.signupsByRole[data.role] || 0) + 1;
        
        // Team level breakdown
        analytics.signupsByTeamLevel[data.teamLevel] = (analytics.signupsByTeamLevel[data.teamLevel] || 0) + 1;
        
        // Lead score distribution
        const scoreRange = this.getLeadScoreRange(data.leadScore || 0);
        analytics.leadScoreDistribution[scoreRange] = (analytics.leadScoreDistribution[scoreRange] || 0) + 1;
        
        // Track referrers
        if (data.referrer) {
          referralsMap.set(data.referrer, (referralsMap.get(data.referrer) || 0) + 1);
        }
      });

      // Convert referrals map to array
      analytics.topReferrers = Array.from(referralsMap.entries())
        .map(([email, count]) => ({ email, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return analytics;
    } catch (error: any) {
      console.error('Error getting waitlist analytics:', error);
      trackError('waitlist_analytics_error', error);
      throw error;
    }
  }

  /**
   * Create email campaign
   */
  async createEmailCampaign(campaign: Omit<EmailCampaign, 'id' | 'createdAt'>): Promise<string> {
    try {
      const campaignData = {
        ...campaign,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, this.campaignsCollection), campaignData);
      
      trackUserAction('email_campaign_created', {
        campaignId: docRef.id,
        name: campaign.name,
        segmentId: campaign.segmentId,
      });

      return docRef.id;
    } catch (error: any) {
      console.error('Error creating email campaign:', error);
      trackError('email_campaign_creation_error', error);
      throw error;
    }
  }

  /**
   * Get users by segment
   */
  async getUsersBySegment(segmentId: string): Promise<WaitlistMarketingData[]> {
    try {
      const segmentDoc = await getDocs(query(
        collection(db, this.segmentsCollection),
        where('id', '==', segmentId)
      ));

      if (segmentDoc.empty) {
        throw new Error('Segment not found');
      }

      const segment = segmentDoc.docs[0].data() as WaitlistSegment;
      const users: WaitlistMarketingData[] = [];

      // Build query based on segment criteria
      let waitlistQuery = query(collection(db, this.waitlistCollection));

      // Apply filters based on segment criteria
      if (segment.criteria.role?.length) {
        waitlistQuery = query(waitlistQuery, where('role', 'in', segment.criteria.role));
      }
      if (segment.criteria.teamLevel?.length) {
        waitlistQuery = query(waitlistQuery, where('teamLevel', 'in', segment.criteria.teamLevel));
      }
      if (segment.criteria.source?.length) {
        waitlistQuery = query(waitlistQuery, where('source', 'in', segment.criteria.source));
      }

      const snapshot = await getDocs(waitlistQuery);
      snapshot.forEach((doc) => {
        users.push(doc.data() as WaitlistMarketingData);
      });

      return users;
    } catch (error: any) {
      console.error('Error getting users by segment:', error);
      trackError('segment_users_error', error);
      throw error;
    }
  }

  /**
   * Update user lead score
   */
  async updateLeadScore(email: string, newScore: number): Promise<void> {
    try {
      const userQuery = query(
        collection(db, this.waitlistCollection),
        where('email', '==', email)
      );
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        await updateDoc(doc(db, this.waitlistCollection, userDoc.id), {
          leadScore: newScore,
          lastActivity: serverTimestamp(),
        });

        trackUserAction('lead_score_updated', {
          email,
          newScore,
          previousScore: userDoc.data().leadScore || 0,
        });
      }
    } catch (error: any) {
      console.error('Error updating lead score:', error);
      trackError('lead_score_update_error', error);
      throw error;
    }
  }

  /**
   * Generate referral code
   */
  private generateReferralCode(email: string): string {
    const emailHash = email.split('@')[0].toLowerCase();
    const randomSuffix = Math.random().toString(36).substr(2, 6);
    return `${emailHash}_${randomSuffix}`.toUpperCase();
  }

  /**
   * Calculate lead score based on user data
   */
  private calculateLeadScore(data: WaitlistMarketingData): number {
    let score = 0;

    // Base score
    score += 10;

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
    score += roleScores[data.role] || 5;

    // Team level scoring
    const teamLevelScores: Record<string, number> = {
      'professional': 40,
      'college': 35,
      'high-school': 25,
      'semi-pro': 30,
      'youth': 15,
      'other': 10,
    };
    score += teamLevelScores[data.teamLevel] || 10;

    // Experience scoring
    const experienceScores: Record<string, number> = {
      'advanced': 25,
      'intermediate': 15,
      'beginner': 5,
    };
    score += experienceScores[data.experience || 'beginner'] || 5;

    // Source scoring
    const sourceScores: Record<string, number> = {
      'referral': 30,
      'social-media': 20,
      'google': 15,
      'direct': 10,
      'email': 25,
      'other': 5,
    };
    score += sourceScores[data.source] || 5;

    // Interest scoring
    if (data.interests?.length) {
      score += data.interests.length * 5;
    }

    // Marketing consent bonus
    if (data.marketingConsent) {
      score += 10;
    }

    // Beta interest bonus
    if (data.betaInterest) {
      score += 15;
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Determine user segment
   */
  private determineSegment(data: WaitlistMarketingData): string {
    const leadScore = this.calculateLeadScore(data);
    
    if (leadScore >= 80) return 'high-value';
    if (leadScore >= 60) return 'medium-value';
    if (leadScore >= 40) return 'low-value';
    return 'cold';
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

export const waitlistMarketingService = new WaitlistMarketingService();
