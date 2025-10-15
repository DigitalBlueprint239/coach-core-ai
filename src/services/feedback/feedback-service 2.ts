import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { trackEvent, trackError } from '../analytics';
import { createFirestoreHelper } from '../../utils/firestore-sanitization';

export interface StagingFeedback {
  id?: string;
  feedback: string;
  category?: 'bug' | 'feature' | 'ui' | 'performance' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  userEmail?: string;
  userAgent?: string;
  pageUrl?: string;
  timestamp: Date;
  status?: 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'closed';
  adminNotes?: string;
  adminId?: string;
  adminEmail?: string;
  reviewedAt?: Date;
  resolvedAt?: Date;
}

export interface FeedbackFilters {
  category?: string;
  priority?: string;
  status?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

class FeedbackService {
  private collectionName = 'staging_feedback';
  private firestoreHelper = createFirestoreHelper('staging_feedback');

  /**
   * Submit feedback from staging environment
   */
  async submitFeedback(
    feedback: string,
    category: StagingFeedback['category'] = 'other',
    priority: StagingFeedback['priority'] = 'medium',
    userId?: string,
    userEmail?: string
  ): Promise<string> {
    try {
      // Track feedback submission attempt
      trackEvent('feedback_submit_attempt', {
        event_category: 'feedback',
        event_label: 'staging_feedback',
        category,
        priority,
        has_user: !!userId
      });

      const feedbackData = {
        feedback: feedback.trim(),
        category,
        priority,
        userId,
        userEmail,
        userAgent: navigator.userAgent,
        pageUrl: window.location.href,
        timestamp: serverTimestamp(),
        status: 'new'
      };

      // Sanitize feedback data for Firestore write
      const { data: sanitizedFeedback, isValid, warnings } = this.firestoreHelper.prepareCreate(
        feedbackData,
        ['feedback', 'category', 'priority', 'timestamp', 'status']
      );

      if (!isValid) {
        throw new Error('Invalid feedback data');
      }

      const docRef = await addDoc(collection(db, this.collectionName), sanitizedFeedback);
      
      // Log result
      this.firestoreHelper.logResult('create', true, docRef.id, warnings);

      console.log('✅ Staging feedback submitted successfully:', docRef.id);

      // Track successful feedback submission
      trackEvent('feedback_submit_success', {
        event_category: 'feedback',
        event_label: 'staging_feedback_success',
        feedback_id: docRef.id,
        category,
        priority,
        has_user: !!userId
      });

      return docRef.id;
    } catch (error: any) {
      // Track feedback submission error
      trackEvent('feedback_submit_error', {
        event_category: 'feedback',
        event_label: 'staging_feedback_error',
        error: error.message,
        category,
        priority
      });

      trackError(error as Error, { action: 'feedback_submit', category });
      throw new Error(`Failed to submit feedback: ${error.message}`);
    }
  }

  /**
   * Get all feedback for admin review
   */
  async getAllFeedback(
    filters: FeedbackFilters = {},
    limitCount: number = 50
  ): Promise<StagingFeedback[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      // Apply filters
      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }
      if (filters.priority) {
        q = query(q, where('priority', '==', filters.priority));
      }
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.userId) {
        q = query(q, where('userId', '==', filters.userId));
      }

      const querySnapshot = await getDocs(q);
      const feedback: StagingFeedback[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        feedback.push({
          id: doc.id,
          feedback: data.feedback,
          category: data.category || 'other',
          priority: data.priority || 'medium',
          userId: data.userId,
          userEmail: data.userEmail,
          userAgent: data.userAgent,
          pageUrl: data.pageUrl,
          timestamp: data.timestamp?.toDate() || new Date(),
          status: data.status || 'new',
          adminNotes: data.adminNotes,
          adminId: data.adminId,
          adminEmail: data.adminEmail,
          reviewedAt: data.reviewedAt?.toDate(),
          resolvedAt: data.resolvedAt?.toDate()
        });
      });

      return feedback;
    } catch (error: any) {
      trackError(error as Error, { action: 'get_all_feedback' });
      throw new Error(`Failed to fetch feedback: ${error.message}`);
    }
  }

  /**
   * Get feedback statistics for admin dashboard
   */
  async getFeedbackStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
    recentCount: number;
  }> {
    try {
      const allFeedback = await this.getAllFeedback({}, 1000);
      
      const stats = {
        total: allFeedback.length,
        byCategory: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        recentCount: 0
      };

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      allFeedback.forEach((feedback) => {
        // Category stats
        const category = feedback.category || 'other';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

        // Priority stats
        const priority = feedback.priority || 'medium';
        stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

        // Status stats
        const status = feedback.status || 'new';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

        // Recent count (last 7 days)
        if (feedback.timestamp >= oneWeekAgo) {
          stats.recentCount++;
        }
      });

      return stats;
    } catch (error: any) {
      trackError(error as Error, { action: 'get_feedback_stats' });
      throw new Error(`Failed to fetch feedback stats: ${error.message}`);
    }
  }

  /**
   * Update feedback status (admin only)
   */
  async updateFeedbackStatus(
    feedbackId: string,
    status: StagingFeedback['status'],
    adminNotes?: string,
    adminId?: string,
    adminEmail?: string
  ): Promise<void> {
    try {
      const feedbackRef = doc(db, this.collectionName, feedbackId);
      const updateData: any = {
        status,
        updatedAt: serverTimestamp()
      };

      if (adminNotes) {
        updateData.adminNotes = adminNotes;
      }
      if (adminId) {
        updateData.adminId = adminId;
      }
      if (adminEmail) {
        updateData.adminEmail = adminEmail;
      }

      if (status === 'reviewed' && !updateData.reviewedAt) {
        updateData.reviewedAt = serverTimestamp();
      }
      if (status === 'resolved' && !updateData.resolvedAt) {
        updateData.resolvedAt = serverTimestamp();
      }

      await updateDoc(feedbackRef, updateData);

      // Track admin action
      trackEvent('feedback_status_update', {
        event_category: 'admin',
        event_label: 'feedback_status_update',
        feedback_id: feedbackId,
        new_status: status,
        admin_id: adminId
      });

      console.log('✅ Feedback status updated:', feedbackId, status);
    } catch (error: any) {
      trackError(error as Error, { action: 'update_feedback_status', feedbackId });
      throw new Error(`Failed to update feedback status: ${error.message}`);
    }
  }

  /**
   * Check if user is admin (simple check for now)
   */
  isAdmin(userId?: string, userEmail?: string): boolean {
    if (!userId && !userEmail) return false;
    
    // Simple admin check - in production, this should be more robust
    const adminEmails = [
      'admin@coachcore.ai',
      'jones@coachcore.ai',
      'support@coachcore.ai'
    ];
    
    const adminUserIds = [
      // Add admin user IDs here
    ];

    return adminEmails.includes(userEmail || '') || adminUserIds.includes(userId || '');
  }
}

export const feedbackService = new FeedbackService();
