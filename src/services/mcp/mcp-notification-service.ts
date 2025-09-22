import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/firebase-config';

export interface NotificationConfig {
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  priorityThreshold: 'low' | 'medium' | 'high' | 'urgent';
}

export interface NotificationTemplate {
  id: string;
  type: 'practice_reminder' | 'game_alert' | 'performance_update' | 'attendance_warning' | 'custom';
  title: string;
  messageTemplate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: ('push' | 'email' | 'sms' | 'in_app')[];
  triggerConditions: {
    timeBeforeEvent?: number; // minutes
    attendanceThreshold?: number; // percentage
    performanceChange?: number; // percentage
  };
}

export interface NotificationPayload {
  teamId: string;
  userId?: string;
  type: NotificationTemplate['type'];
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: ('push' | 'email' | 'sms' | 'in_app')[];
  actionRequired: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationDeliveryStatus {
  notificationId: string;
  channel: 'push' | 'email' | 'sms' | 'in_app';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  timestamp: Date;
  error?: string;
}

class MCPNotificationService {
  private config: NotificationConfig;
  private templates: Map<string, NotificationTemplate> = new Map();
  private listeners: Map<string, Unsubscribe> = new Map();
  private deliveryCallbacks: Set<(status: NotificationDeliveryStatus) => void> = new Set();

  constructor(config: NotificationConfig = {
    enablePushNotifications: true,
    enableEmailNotifications: true,
    enableSMSNotifications: false,
    priorityThreshold: 'medium',
  }) {
    this.config = config;
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default notification templates
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 'practice_reminder',
        type: 'practice_reminder',
        title: 'Practice Reminder',
        messageTemplate: 'Team practice starts in {timeUntil} at {location}',
        priority: 'medium',
        channels: ['push', 'in_app'],
        triggerConditions: {
          timeBeforeEvent: 30, // 30 minutes before
        },
      },
      {
        id: 'game_alert',
        type: 'game_alert',
        title: 'Game Alert',
        messageTemplate: 'Game vs {opponent} starts in {timeUntil} at {location}',
        priority: 'high',
        channels: ['push', 'email', 'in_app'],
        triggerConditions: {
          timeBeforeEvent: 60, // 1 hour before
        },
      },
      {
        id: 'attendance_warning',
        type: 'attendance_warning',
        title: 'Low Attendance Alert',
        messageTemplate: 'Only {attendanceCount} players confirmed for {eventName}. Current rate: {attendanceRate}%',
        priority: 'high',
        channels: ['push', 'email', 'in_app'],
        triggerConditions: {
          attendanceThreshold: 75, // Below 75%
        },
      },
      {
        id: 'performance_update',
        type: 'performance_update',
        title: 'Performance Update',
        messageTemplate: 'Team performance {trend} by {change}% this {period}',
        priority: 'medium',
        channels: ['in_app'],
        triggerConditions: {
          performanceChange: 10, // 10% change
        },
      },
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Send a notification using MCP integration
   */
  async sendNotification(payload: NotificationPayload): Promise<string> {
    try {
      // Add notification to Firestore
      const notificationRef = await addDoc(collection(db, 'notifications'), {
        ...payload,
        timestamp: serverTimestamp(),
        read: false,
        delivered: false,
        createdAt: serverTimestamp(),
      });

      // Process delivery through different channels
      await this.processNotificationDelivery(notificationRef.id, payload);

      return notificationRef.id;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send notification using template
   */
  async sendTemplatedNotification(
    templateId: string,
    teamId: string,
    variables: Record<string, string>,
    userId?: string
  ): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Replace variables in message template
    let message = template.messageTemplate;
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{${key}}`, 'g'), value);
    });

    const payload: NotificationPayload = {
      teamId,
      userId,
      type: template.type,
      title: template.title,
      message,
      priority: template.priority,
      channels: template.channels,
      actionRequired: template.priority === 'high' || template.priority === 'urgent',
    };

    return this.sendNotification(payload);
  }

  /**
   * Process notification delivery through different channels
   */
  private async processNotificationDelivery(
    notificationId: string,
    payload: NotificationPayload
  ): Promise<void> {
    const deliveryPromises = payload.channels.map(async (channel) => {
      try {
        let success = false;

        switch (channel) {
          case 'push':
            success = await this.sendPushNotification(payload);
            break;
          case 'email':
            success = await this.sendEmailNotification(payload);
            break;
          case 'sms':
            success = await this.sendSMSNotification(payload);
            break;
          case 'in_app':
            success = true; // In-app notifications are handled by Firestore
            break;
        }

        const status: NotificationDeliveryStatus = {
          notificationId,
          channel,
          status: success ? 'sent' : 'failed',
          timestamp: new Date(),
        };

        this.notifyDeliveryCallbacks(status);
      } catch (error) {
        const status: NotificationDeliveryStatus = {
          notificationId,
          channel,
          status: 'failed',
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        };

        this.notifyDeliveryCallbacks(status);
      }
    });

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Send push notification (would integrate with FCM via MCP)
   */
  private async sendPushNotification(payload: NotificationPayload): Promise<boolean> {
    if (!this.config.enablePushNotifications) {
      return false;
    }

    // This would integrate with Firebase Cloud Messaging via MCP
    // For now, we'll simulate the process
    console.log('Sending push notification:', payload.title);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return Math.random() > 0.1; // 90% success rate
  }

  /**
   * Send email notification (would integrate with email service via MCP)
   */
  private async sendEmailNotification(payload: NotificationPayload): Promise<boolean> {
    if (!this.config.enableEmailNotifications) {
      return false;
    }

    // This would integrate with email service (SendGrid, SES, etc.) via MCP
    console.log('Sending email notification:', payload.title);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return Math.random() > 0.05; // 95% success rate
  }

  /**
   * Send SMS notification (would integrate with SMS service via MCP)
   */
  private async sendSMSNotification(payload: NotificationPayload): Promise<boolean> {
    if (!this.config.enableSMSNotifications) {
      return false;
    }

    // This would integrate with SMS service (Twilio, AWS SNS, etc.) via MCP
    console.log('Sending SMS notification:', payload.title);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return Math.random() > 0.02; // 98% success rate
  }

  /**
   * Subscribe to real-time notifications for a team
   */
  subscribeToTeamNotifications(
    teamId: string,
    callback: (notification: any) => void
  ): () => void {
    const listenerKey = `team-${teamId}`;
    
    // Clean up existing listener
    if (this.listeners.has(listenerKey)) {
      this.listeners.get(listenerKey)!();
    }

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'notifications'),
        where('teamId', '==', teamId),
        orderBy('timestamp', 'desc'),
        limit(50)
      ),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const notification = {
              id: change.doc.id,
              ...change.doc.data(),
              timestamp: change.doc.data().timestamp?.toDate() || new Date(),
            };
            callback(notification);
          }
        });
      }
    );

    this.listeners.set(listenerKey, unsubscribe);
    return unsubscribe;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Schedule a notification
   */
  async scheduleNotification(
    payload: NotificationPayload,
    scheduledTime: Date
  ): Promise<string> {
    try {
      const notificationRef = await addDoc(collection(db, 'scheduled_notifications'), {
        ...payload,
        scheduledTime: scheduledTime,
        status: 'scheduled',
        createdAt: serverTimestamp(),
      });

      // In a real implementation, this would use a job queue or cloud function
      // For now, we'll use setTimeout for demonstration
      const delay = scheduledTime.getTime() - Date.now();
      if (delay > 0) {
        setTimeout(async () => {
          await this.sendNotification(payload);
          await updateDoc(doc(db, 'scheduled_notifications', notificationRef.id), {
            status: 'sent',
            sentAt: serverTimestamp(),
          });
        }, delay);
      }

      return notificationRef.id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Add delivery status callback
   */
  onDeliveryStatus(callback: (status: NotificationDeliveryStatus) => void): () => void {
    this.deliveryCallbacks.add(callback);
    return () => {
      this.deliveryCallbacks.delete(callback);
    };
  }

  /**
   * Notify delivery callbacks
   */
  private notifyDeliveryCallbacks(status: NotificationDeliveryStatus): void {
    this.deliveryCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in delivery callback:', error);
      }
    });
  }

  /**
   * Add custom notification template
   */
  addTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get notification template
   */
  getTemplate(templateId: string): NotificationTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clean up all listeners
   */
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.deliveryCallbacks.clear();
  }
}

export const mcpNotificationService = new MCPNotificationService();
