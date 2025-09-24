// @ts-nocheck
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { trackEvent } from '../analytics';

export interface AuditLogEntry {
  id?: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  userEmail?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  environment: 'development' | 'staging' | 'production';
  success: boolean;
  errorMessage?: string;
  sessionId?: string;
  teamId?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogFilters {
  action?: string;
  resource?: string;
  userId?: string;
  severity?: string;
  success?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

class AuditLogger {
  private collectionName = 'audit_logs';
  private isEnabled: boolean;

  constructor() {
    // Only enable audit logging in production and staging
    this.isEnabled = ['production', 'staging'].includes(
      import.meta.env.VITE_ENVIRONMENT || 'development'
    );
  }

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<string> {
    if (!this.isEnabled) {
      console.log('Audit logging disabled - entry would be logged:', entry);
      return 'disabled';
    }

    try {
      const auditEntry: Omit<AuditLogEntry, 'id'> = {
        ...entry,
        timestamp: new Date(),
        environment: (import.meta.env.VITE_ENVIRONMENT as any) || 'development',
        userAgent: navigator.userAgent,
        sessionId: this.getSessionId()
      };

      const docRef = await addDoc(collection(db, this.collectionName), {
        ...auditEntry,
        timestamp: serverTimestamp()
      });

      // Track audit events in analytics
      trackEvent('audit_log_created', {
        event_category: 'security',
        event_label: entry.action,
        action: entry.action,
        resource: entry.resource,
        severity: entry.severity,
        success: entry.success
      });

      console.log('Audit log created:', docRef.id, entry.action);
      return docRef.id;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break the main flow
      return 'error';
    }
  }

  /**
   * Log sensitive actions
   */
  async logSensitiveAction(
    action: string,
    resource: string,
    resourceId: string,
    userId?: string,
    userEmail?: string,
    details: Record<string, any> = {},
    severity: AuditLogEntry['severity'] = 'medium'
  ): Promise<string> {
    return this.log({
      action,
      resource,
      resourceId,
      userId,
      userEmail,
      details,
      severity,
      success: true
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    action: string,
    resource: string,
    userId?: string,
    userEmail?: string,
    details: Record<string, any> = {},
    severity: AuditLogEntry['severity'] = 'high'
  ): Promise<string> {
    return this.log({
      action,
      resource,
      resourceId: 'security',
      userId,
      userEmail,
      details,
      severity,
      success: true
    });
  }

  /**
   * Log failed actions
   */
  async logFailedAction(
    action: string,
    resource: string,
    userId?: string,
    userEmail?: string,
    errorMessage: string,
    details: Record<string, any> = {},
    severity: AuditLogEntry['severity'] = 'medium'
  ): Promise<string> {
    return this.log({
      action,
      resource,
      userId,
      userEmail,
      details,
      severity,
      success: false,
      errorMessage
    });
  }

  /**
   * Log waitlist submissions
   */
  async logWaitlistSubmission(
    email: string,
    success: boolean,
    errorMessage?: string,
    userId?: string,
    details: Record<string, any> = {}
  ): Promise<string> {
    return this.log({
      action: 'waitlist_submission',
      resource: 'waitlist',
      userId,
      userEmail: email,
      details: {
        email,
        ...details
      },
      severity: success ? 'low' : 'medium',
      success,
      errorMessage
    });
  }

  /**
   * Log play creation
   */
  async logPlayCreation(
    playId: string,
    gameId: string,
    userId: string,
    userEmail: string,
    teamId: string,
    success: boolean,
    errorMessage?: string,
    details: Record<string, any> = {}
  ): Promise<string> {
    return this.log({
      action: 'play_creation',
      resource: 'play',
      resourceId: playId,
      userId,
      userEmail,
      teamId,
      details: {
        playId,
        gameId,
        teamId,
        ...details
      },
      severity: success ? 'low' : 'medium',
      success,
      errorMessage
    });
  }

  /**
   * Log team creation
   */
  async logTeamCreation(
    teamId: string,
    teamName: string,
    userId: string,
    userEmail: string,
    success: boolean,
    errorMessage?: string,
    details: Record<string, any> = {}
  ): Promise<string> {
    return this.log({
      action: 'team_creation',
      resource: 'team',
      resourceId: teamId,
      userId,
      userEmail,
      details: {
        teamId,
        teamName,
        ...details
      },
      severity: success ? 'low' : 'medium',
      success,
      errorMessage
    });
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    action: 'login' | 'logout' | 'signup' | 'password_reset',
    userId: string,
    userEmail: string,
    success: boolean,
    errorMessage?: string,
    details: Record<string, any> = {}
  ): Promise<string> {
    return this.log({
      action: `auth_${action}`,
      resource: 'authentication',
      userId,
      userEmail,
      details: {
        authAction: action,
        ...details
      },
      severity: success ? 'low' : 'high',
      success,
      errorMessage
    });
  }

  /**
   * Log admin actions
   */
  async logAdminAction(
    action: string,
    resource: string,
    resourceId: string,
    adminId: string,
    adminEmail: string,
    details: Record<string, any> = {}
  ): Promise<string> {
    return this.log({
      action: `admin_${action}`,
      resource,
      resourceId,
      userId: adminId,
      userEmail: adminEmail,
      details: {
        adminAction: action,
        ...details
      },
      severity: 'medium',
      success: true
    });
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
    if (!this.isEnabled) {
      return [];
    }

    try {
      let q = query(
        collection(db, this.collectionName),
        orderBy('timestamp', 'desc'),
        limit(filters.limit || 100)
      );

      // Apply filters
      if (filters.action) {
        q = query(q, where('action', '==', filters.action));
      }
      if (filters.resource) {
        q = query(q, where('resource', '==', filters.resource));
      }
      if (filters.userId) {
        q = query(q, where('userId', '==', filters.userId));
      }
      if (filters.severity) {
        q = query(q, where('severity', '==', filters.severity));
      }
      if (filters.success !== undefined) {
        q = query(q, where('success', '==', filters.success));
      }

      const querySnapshot = await getDocs(q);
      const logs: AuditLogEntry[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({
          id: doc.id,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          userId: data.userId,
          userEmail: data.userEmail,
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
          timestamp: data.timestamp?.toDate() || new Date(),
          details: data.details || {},
          severity: data.severity || 'low',
          environment: data.environment || 'development',
          success: data.success || false,
          errorMessage: data.errorMessage,
          sessionId: data.sessionId,
          teamId: data.teamId,
          metadata: data.metadata || {}
        });
      });

      return logs;
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      return [];
    }
  }

  /**
   * Get session ID for tracking
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('audit_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('audit_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Enable/disable audit logging
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Check if audit logging is enabled
   */
  isAuditLoggingEnabled(): boolean {
    return this.isEnabled;
  }
}

export const auditLogger = new AuditLogger();
// @ts-nocheck
