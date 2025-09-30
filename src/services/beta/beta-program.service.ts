import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';

export interface BetaInviteConversionMetadata {
  onboardingCompleted: boolean;
  firstFeatureUsed?: string;
  timeToActivation?: number;
}

export interface BetaInvite {
  id: string;
  email: string;
  cohortId: string;
  inviteCode: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  sentAt: Timestamp;
  expiresAt?: Timestamp;
  remindersSent: number;
  lastReminderAt?: Timestamp;
  conversionMetadata?: BetaInviteConversionMetadata;
}

export interface BetaUser {
  id: string;
  email: string;
  cohortId: string;
  activatedAt: Timestamp;
  features: string[];
  inviteId: string;
}

export interface BetaFeedback {
  userId: string;
  cohortId: string;
  category: 'bug' | 'feature_request' | 'ux' | 'other';
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  resolved?: boolean;
  responseToUser?: string;
  attachments?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  sessionId?: string;
  submittedAt?: Date;
  createdAt?: Date;
}

export interface BetaCriticalIssue {
  id: string;
  userId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  submittedAt: Date;
  responseToUser?: string;
}

export interface BetaStalledInvite {
  id: string;
  email: string;
  sentAt: Date;
  remindersSent: number;
}

export interface FeedbackSummary {
  total: number;
  byCategory: Record<string, number>;
  latest: Array<{ id: string; message: string; category: string; createdAt: Date }>;
}

export interface BetaEvent {
  userId: string;
  cohortId: string;
  type: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
}

export interface BetaFunnelStage {
  stage: 'invited' | 'accepted' | 'onboarded' | 'active' | 'retained';
  count: number;
  conversionRate: number;
}

export interface BetaMetrics {
  invitesSent: number;
  acceptedInvites: number;
  declinedInvites: number;
  pendingInvites: number;
  onboardingCompleted: number;
  activeUsers: number;
  retainedUsers: number;
  feedbackCount: number;
  featureUsage: Record<string, number>;
  leastUsedFeatures: Array<{ feature: string; count: number }>;
  featureRequests: number;
  criticalIssues: BetaCriticalIssue[];
  stalledInvites: BetaStalledInvite[];
  errorEventsLast24h: number;
  performanceAlertsLast24h: number;
  medianActivationMinutes: number | null;
  p90ActivationMinutes: number | null;
  conversionRates: {
    acceptance: number;
    onboarding: number;
    activation: number;
    retention: number;
  };
  funnel: BetaFunnelStage[];
  activations: number; // Back-compat alias for acceptedInvites
}

const COLLECTIONS = {
  cohorts: 'beta_cohorts',
  invites: 'beta_invites',
  users: 'beta_users',
  feedback: 'beta_feedback',
  events: 'beta_events',
};

const generateInviteCode = () => `beta_${Math.random().toString(36).slice(2, 10)}`;

export class BetaProgramService {
  // Beta user management ----------------------------------------------------
  async inviteBetaUser(email: string, cohortId: string): Promise<BetaInvite> {
    const payload = {
      email: email.toLowerCase(),
      cohortId,
      inviteCode: generateInviteCode(),
      status: 'pending' as const,
      sentAt: serverTimestamp(),
      remindersSent: 0,
      conversionMetadata: {
        onboardingCompleted: false,
      } satisfies BetaInviteConversionMetadata,
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.invites), payload);
    const snapshot = await getDoc(docRef);

    const data = snapshot.data() as Record<string, any>;

    return {
      id: docRef.id,
      ...data,
      sentAt: data.sentAt as Timestamp,
      remindersSent: data.remindersSent ?? 0,
      conversionMetadata: data.conversionMetadata as BetaInviteConversionMetadata | undefined,
    } as BetaInvite;
  }

  async activateBetaAccess(inviteCode: string): Promise<BetaUser> {
    const inviteQuery = query(
      collection(db, COLLECTIONS.invites),
      where('inviteCode', '==', inviteCode),
      where('status', '==', 'pending')
    );
    const inviteSnapshot = await getDocs(inviteQuery);

    if (inviteSnapshot.empty) {
      throw new Error('Invalid or expired invite code');
    }

    const inviteDoc = inviteSnapshot.docs[0];
    const invite = inviteDoc.data();

    const acceptedAt = Timestamp.now();
    let timeToActivation: number | undefined;

    const sentAtField = invite.sentAt;
    if (sentAtField instanceof Timestamp) {
      const diffMs = acceptedAt.toMillis() - sentAtField.toMillis();
      if (diffMs > 0) {
        timeToActivation = Math.round(diffMs / 60000);
      }
    }

    const userDoc = await addDoc(collection(db, COLLECTIONS.users), {
      email: invite.email,
      cohortId: invite.cohortId,
      inviteId: inviteDoc.id,
      activatedAt: serverTimestamp(),
      features: invite.features || [],
    });

    await updateDoc(inviteDoc.ref, {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      userId: userDoc.id,
      conversionMetadata: {
        onboardingCompleted: Boolean(invite.conversionMetadata?.onboardingCompleted),
        firstFeatureUsed: invite.conversionMetadata?.firstFeatureUsed,
        timeToActivation: timeToActivation ?? invite.conversionMetadata?.timeToActivation,
      },
    });

    const snapshot = await getDoc(userDoc);
    return {
      id: userDoc.id,
      ...(snapshot.data() as Record<string, any>),
    } as BetaUser;
  }

  async getBetaCohorts(): Promise<BetaCohort[]> {
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.cohorts), orderBy('startDate', 'desc')));
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        size: data.size || 0,
        features: data.features || [],
        feedbackRequired: Boolean(data.feedbackRequired),
        startDate: this.timestampToDate(data.startDate),
      } as BetaCohort;
    });
  }

  // Feature flags -----------------------------------------------------------
  async enableBetaFeature(feature: string, cohortId: string): Promise<void> {
    const cohortRef = doc(db, COLLECTIONS.cohorts, cohortId);
    await updateDoc(cohortRef, {
      features: arrayUnion(feature),
      updatedAt: serverTimestamp(),
    });
  }

  async getBetaFeatures(userId: string): Promise<string[]> {
    const userRef = doc(db, COLLECTIONS.users, userId);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) return [];

    const data = snapshot.data();
    const cohortId = data.cohortId as string;

    const cohortSnapshot = await getDoc(doc(db, COLLECTIONS.cohorts, cohortId));
    const cohortFeatures = cohortSnapshot.exists() ? (cohortSnapshot.data().features as string[]) || [] : [];

    const userFeatures = (data.features as string[]) || [];

    return Array.from(new Set([...cohortFeatures, ...userFeatures]));
  }

  // Feedback collection -----------------------------------------------------
  async submitFeedback(feedback: BetaFeedback): Promise<void> {
    const submittedAt = serverTimestamp();

    await addDoc(collection(db, COLLECTIONS.feedback), {
      ...feedback,
      severity: feedback.severity ?? 'medium',
      resolved: feedback.resolved ?? false,
      responseToUser: feedback.responseToUser ?? null,
      attachments: feedback.attachments ?? [],
      submittedAt,
      createdAt: submittedAt,
    });
  }

  async getFeedbackSummary(cohortId: string): Promise<FeedbackSummary> {
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.feedback), where('cohortId', '==', cohortId)));

    const byCategory: Record<string, number> = {};
    const latest: FeedbackSummary['latest'] = [];

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const category = data.category || 'other';
      byCategory[category] = (byCategory[category] || 0) + 1;
      if (latest.length < 10) {
        latest.push({
          id: docSnap.id,
          message: data.message,
          category,
          createdAt: this.timestampToDate(data.submittedAt || data.createdAt),
        });
      }
    });

    return {
      total: snapshot.size,
      byCategory,
      latest,
    };
  }

  // Metrics -----------------------------------------------------------------
  async trackBetaEvent(event: BetaEvent): Promise<void> {
    await addDoc(collection(db, COLLECTIONS.events), {
      ...event,
      timestamp: serverTimestamp(),
    });
  }

  async getBetaMetrics(cohortId: string): Promise<BetaMetrics> {
    const invitesSnapshot = await getDocs(query(collection(db, COLLECTIONS.invites), where('cohortId', '==', cohortId)));
    const usersSnapshot = await getDocs(query(collection(db, COLLECTIONS.users), where('cohortId', '==', cohortId)));
    const feedbackSnapshot = await getDocs(query(collection(db, COLLECTIONS.feedback), where('cohortId', '==', cohortId)));
    const eventsSnapshot = await getDocs(query(collection(db, COLLECTIONS.events), where('cohortId', '==', cohortId)));
    type InviteRecord = Record<string, any> & { id: string };
    const invitesData: InviteRecord[] = invitesSnapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Record<string, any>;
      return {
        id: docSnap.id,
        ...data,
      } as InviteRecord;
    });

    const invitesSent = invitesData.length;
    const acceptedInvites = invitesData.filter((invite) => invite.status === 'accepted').length;
    const declinedInvites = invitesData.filter((invite) => invite.status === 'declined').length;
    const pendingInvites = invitesData.filter((invite) => invite.status === 'pending').length;
    const onboardingCompleted = invitesData.filter((invite) => invite.conversionMetadata?.onboardingCompleted).length;

    const activationTimes = invitesData
      .map((invite) => invite.conversionMetadata?.timeToActivation)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0)
      .sort((a, b) => a - b);

    const medianActivationMinutes = this.calculatePercentile(activationTimes, 50);
    const p90ActivationMinutes = this.calculatePercentile(activationTimes, 90);

    const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;
    const stalledInvites: BetaStalledInvite[] = invitesData
      .filter((invite) => invite.status === 'pending')
      .map((invite) => ({
        id: invite.id,
        email: invite.email,
        sentAt: this.timestampToDate(invite.sentAt),
        remindersSent: invite.remindersSent ?? 0,
      }))
      .filter((invite) => invite.sentAt.getTime() < fortyEightHoursAgo)
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());

    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const featureUsage: Record<string, number> = {};
    const retainedUserIds = new Set<string>();
    let errorEventsLast24h = 0;
    let performanceAlertsLast24h = 0;

    eventsSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const eventTimestamp = this.timestampToDate(data.timestamp).getTime();
      const userId = data.userId as string | undefined;

      if (data.type === 'feature_used' && data.properties?.feature) {
        const featureName = data.properties.feature as string;
        featureUsage[featureName] = (featureUsage[featureName] || 0) + 1;
        if (eventTimestamp >= sevenDaysAgo && userId) {
          retainedUserIds.add(userId);
        }
      }

      if (eventTimestamp >= twentyFourHoursAgo) {
        if (data.type === 'error') {
          errorEventsLast24h += 1;
        }
        if (data.type === 'performance' || data.type === 'performance_alert') {
          performanceAlertsLast24h += 1;
        }
      }
    });

    const leastUsedFeatures = Object.entries(featureUsage)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 5)
      .map(([feature, count]) => ({ feature, count }));

    const criticalIssues: BetaCriticalIssue[] = feedbackSnapshot.docs
      .filter((docSnap) => {
        const data = docSnap.data();
        return (data.severity === 'critical' || data.severity === 'high') && !data.resolved;
      })
      .map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId as string,
          message: data.message as string,
          severity: (data.severity as BetaCriticalIssue['severity']) || 'critical',
          submittedAt: this.timestampToDate(data.submittedAt || data.createdAt),
          responseToUser: data.responseToUser || undefined,
        };
      })
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

    const featureRequests = feedbackSnapshot.docs.filter((docSnap) => docSnap.data().category === 'feature_request').length;

    const activeUsers = usersSnapshot.size;
    const retainedUsers = retainedUserIds.size;

    const conversionRates = {
      acceptance: invitesSent > 0 ? (acceptedInvites / invitesSent) * 100 : 0,
      onboarding: acceptedInvites > 0 ? (onboardingCompleted / acceptedInvites) * 100 : 0,
      activation: acceptedInvites > 0 ? (activeUsers / acceptedInvites) * 100 : 0,
      retention: activeUsers > 0 ? (retainedUsers / activeUsers) * 100 : 0,
    };

    const funnel: BetaFunnelStage[] = [
      { stage: 'invited', count: invitesSent, conversionRate: 100 },
      { stage: 'accepted', count: acceptedInvites, conversionRate: conversionRates.acceptance },
      { stage: 'onboarded', count: onboardingCompleted, conversionRate: conversionRates.onboarding },
      { stage: 'active', count: activeUsers, conversionRate: conversionRates.activation },
      { stage: 'retained', count: retainedUsers, conversionRate: conversionRates.retention },
    ];

    return {
      invitesSent,
      acceptedInvites,
      declinedInvites,
      pendingInvites,
      onboardingCompleted,
      activeUsers,
      retainedUsers,
      feedbackCount: feedbackSnapshot.size,
      featureUsage,
      leastUsedFeatures,
      featureRequests,
      criticalIssues,
      stalledInvites,
      errorEventsLast24h,
      performanceAlertsLast24h,
      medianActivationMinutes,
      p90ActivationMinutes,
      conversionRates,
      funnel,
      activations: acceptedInvites,
    };
  }

  // Helpers -----------------------------------------------------------------
  private timestampToDate(value: unknown): Date {
    if (!value) return new Date(0);
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date(0);
  }

  private calculatePercentile(values: number[], percentile: number): number | null {
    if (values.length === 0) {
      return null;
    }

    const index = (percentile / 100) * (values.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return Math.round(values[lower]);
    }

    const weight = index - lower;
    const result = values[lower] + (values[upper] - values[lower]) * weight;
    return Math.round(result);
  }
}

export interface BetaCohort {
  id: string;
  name: string;
  size: number;
  startDate: Date;
  features: string[];
  feedbackRequired: boolean;
}
