// src/security/AuditLogger.ts
import {
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { AuditLog, DataAccessLog } from '../types/privacy-schema';

export class AuditLogger {
  /**
   * Log an audit event
   */
  static async logAuditEvent(
    userId: string,
    action: string,
    resource: string,
    details: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'low',
    outcome: 'success' | 'failure' | 'partial' = 'success',
    metadata?: {
      resourceId?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): Promise<string> {
    try {
      const auditLog: Omit<AuditLog, 'id'> = {
        userId,
        action,
        resource,
        resourceId: metadata?.resourceId,
        details,
        timestamp: serverTimestamp(),
        ipAddress: metadata?.ipAddress || this.getClientIP(),
        userAgent: metadata?.userAgent || navigator.userAgent,
        sessionId: metadata?.sessionId || this.getSessionId(),
        severity,
        outcome,
      };

      const docRef = await addDoc(collection(db, 'auditLogs'), auditLog);
      return docRef.id;
    } catch (error) {
      console.error('Error logging audit event:', error);
      return '';
    }
  }

  /**
   * Log data access
   */
  static async logDataAccess(
    userId: string,
    dataType: string,
    accessType: 'read' | 'write' | 'delete' | 'export',
    purpose: string,
    consentLevel: 'granted' | 'denied' | 'pending' | 'withdrawn',
    anonymized: boolean = false,
    metadata?: {
      dataId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<string> {
    try {
      const dataAccessLog: Omit<DataAccessLog, 'id'> = {
        userId,
        dataType,
        accessType,
        dataId: metadata?.dataId,
        timestamp: serverTimestamp(),
        purpose,
        consentLevel,
        anonymized,
      };

      const docRef = await addDoc(
        collection(db, 'dataAccessLogs'),
        dataAccessLog
      );
      return docRef.id;
    } catch (error) {
      console.error('Error logging data access:', error);
      return '';
    }
  }

  /**
   * Get audit logs for a user
   */
  static async getUserAuditLogs(
    userId: string,
    limitCount: number = 100
  ): Promise<AuditLog[]> {
    try {
      const q = query(
        collection(db, 'auditLogs'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLog[];
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  }

  /**
   * Get data access logs for a user
   */
  static async getUserDataAccessLogs(
    userId: string,
    limitCount: number = 100
  ): Promise<DataAccessLog[]> {
    try {
      const q = query(
        collection(db, 'dataAccessLogs'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as DataAccessLog[];
    } catch (error) {
      console.error('Error getting data access logs:', error);
      return [];
    }
  }

  /**
   * Get audit logs by severity
   */
  static async getAuditLogsBySeverity(
    severity: 'low' | 'medium' | 'high' | 'critical',
    limitCount: number = 100
  ): Promise<AuditLog[]> {
    try {
      const q = query(
        collection(db, 'auditLogs'),
        where('severity', '==', severity),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLog[];
    } catch (error) {
      console.error('Error getting audit logs by severity:', error);
      return [];
    }
  }

  /**
   * Get audit logs by action type
   */
  static async getAuditLogsByAction(
    action: string,
    limitCount: number = 100
  ): Promise<AuditLog[]> {
    try {
      const q = query(
        collection(db, 'auditLogs'),
        where('action', '==', action),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLog[];
    } catch (error) {
      console.error('Error getting audit logs by action:', error);
      return [];
    }
  }

  /**
   * Get client IP address (simplified)
   */
  private static getClientIP(): string {
    // In a real implementation, this would get the actual IP
    // For now, return a placeholder
    return 'client_ip_placeholder';
  }

  /**
   * Get session ID
   */
  private static getSessionId(): string {
    // Generate or retrieve session ID
    let sessionId = sessionStorage.getItem('coach_core_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('coach_core_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Log security event
   */
  static async logSecurityEvent(
    userId: string,
    event: string,
    details: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<string> {
    return this.logAuditEvent(
      userId,
      'security_event',
      'security',
      { event, ...details },
      severity,
      'success'
    );
  }

  /**
   * Log privacy event
   */
  static async logPrivacyEvent(
    userId: string,
    event: string,
    details: Record<string, any>
  ): Promise<string> {
    return this.logAuditEvent(
      userId,
      'privacy_event',
      'privacy',
      { event, ...details },
      'medium',
      'success'
    );
  }

  /**
   * Log AI training event
   */
  static async logAITrainingEvent(
    userId: string,
    event: string,
    details: Record<string, any>,
    anonymized: boolean
  ): Promise<string> {
    const logId = await this.logAuditEvent(
      userId,
      'ai_training_event',
      'ai_training',
      { event, anonymized, ...details },
      'medium',
      'success'
    );

    // Also log as data access
    await this.logDataAccess(
      userId,
      'ai_training',
      'read',
      'AI model training',
      'granted',
      anonymized
    );

    return logId;
  }
}
