import intelligentDataOrchestrator from './intelligent-orchestrator';

export interface NotificationPriority {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  factors: string[];
  urgency: 'immediate' | 'soon' | 'later' | 'scheduled';
}

export interface SmartNotification {
  id: string;
  type:
    | 'weather'
    | 'health'
    | 'video'
    | 'practice'
    | 'system'
    | 'team'
    | 'player';
  title: string;
  message: string;
  priority: NotificationPriority;
  category: string;
  recipientId: string;
  recipientType:
    | 'head-coach'
    | 'assistant-coach'
    | 'player'
    | 'parent'
    | 'admin';
  data: Record<string, any>;
  channels: NotificationChannel[];
  scheduledFor?: Date;
  expiresAt?: Date;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
  dismissedAt?: Date;
  engagementMetrics: NotificationEngagement;
}

export interface NotificationChannel {
  type: 'push' | 'email' | 'sms' | 'in-app' | 'webhook';
  config: Record<string, any>;
  isEnabled: boolean;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  error?: string;
}

export interface NotificationEngagement {
  openRate: number;
  clickRate: number;
  actionRate: number;
  dismissRate: number;
  timeToRead: number; // seconds
  timeToAction: number; // seconds
}

export interface NotificationPreferences {
  userId: string;
  userType: string;
  categories: {
    weather: NotificationCategoryPreference;
    health: NotificationCategoryPreference;
    video: NotificationCategoryPreference;
    practice: NotificationCategoryPreference;
    system: NotificationCategoryPreference;
    team: NotificationCategoryPreference;
    player: NotificationCategoryPreference;
  };
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
    webhook: boolean;
  };
  quietHours: {
    start: string; // HH:MM
    end: string; // HH:MM
    timezone: string;
    isEnabled: boolean;
  };
  frequency: 'immediate' | 'batched' | 'daily' | 'weekly';
  maxDaily: number;
  maxHourly: number;
}

export interface NotificationCategoryPreference {
  isEnabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  channels: string[];
  quietHours: boolean;
  frequency: 'immediate' | 'batched' | 'daily' | 'weekly';
}

export interface NotificationBatch {
  id: string;
  notifications: SmartNotification[];
  scheduledFor: Date;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  recipientId: string;
  channel: string;
  createdAt: Date;
  sentAt?: Date;
  error?: string;
}

class SmartNotificationEngine {
  private notifications: Map<string, SmartNotification>;
  private preferences: Map<string, NotificationPreferences>;
  private batches: Map<string, NotificationBatch>;
  private isRunning: boolean;
  private processingInterval: NodeJS.Timeout | null;
  private notificationQueue: SmartNotification[];
  private batchQueue: NotificationBatch[];

  constructor() {
    this.notifications = new Map();
    this.preferences = new Map();
    this.batches = new Map();
    this.isRunning = false;
    this.notificationQueue = [];
    this.batchQueue = [];

    this.startProcessing();
    this.initializeDefaultPreferences();
  }

  // **Weather-Aware Practice Notifications**
  async createWeatherAwareNotification(
    teamId: string,
    practiceDate: Date,
    weatherData: any,
    recommendation: any
  ): Promise<SmartNotification[]> {
    const notifications: SmartNotification[] = [];

    // Get team members who need notifications
    const teamMembers = await this.getTeamMembers(teamId);

    for (const member of teamMembers) {
      const priority = this.calculateWeatherNotificationPriority(
        weatherData,
        recommendation,
        member.role,
        practiceDate
      );

      if (priority.score >= this.getNotificationThreshold(member.role)) {
        const notification = this.createNotification({
          type: 'weather',
          title: this.generateWeatherNotificationTitle(
            weatherData,
            recommendation
          ),
          message: this.generateWeatherNotificationMessage(
            weatherData,
            recommendation
          ),
          priority,
          category: 'practice-planning',
          recipientId: member.id,
          recipientType: member.role,
          data: {
            teamId,
            practiceDate,
            weatherData,
            recommendation,
            location: weatherData.location,
          },
          channels: this.determineChannels(member.role, priority, 'weather'),
        });

        notifications.push(notification);
      }
    }

    return notifications;
  }

  // **Health Monitoring Notifications**
  async createHealthMonitoringNotification(
    playerId: string,
    healthData: any,
    riskAssessment: any
  ): Promise<SmartNotification[]> {
    const notifications: SmartNotification[] = [];

    // Get relevant recipients (player, coaches, parents)
    const recipients = await this.getHealthNotificationRecipients(playerId);

    for (const recipient of recipients) {
      const priority = this.calculateHealthNotificationPriority(
        healthData,
        riskAssessment,
        recipient.role
      );

      if (priority.score >= this.getNotificationThreshold(recipient.role)) {
        const notification = this.createNotification({
          type: 'health',
          title: this.generateHealthNotificationTitle(
            healthData,
            riskAssessment
          ),
          message: this.generateHealthNotificationMessage(
            healthData,
            riskAssessment
          ),
          priority,
          category: 'player-health',
          recipientId: recipient.id,
          recipientType: recipient.role,
          data: {
            playerId,
            healthData,
            riskAssessment,
            timestamp: new Date(),
          },
          channels: this.determineChannels(recipient.role, priority, 'health'),
        });

        notifications.push(notification);
      }
    }

    return notifications;
  }

  // **Video Analysis Notifications**
  async createVideoAnalysisNotification(
    videoId: string,
    analysis: any,
    teamId: string
  ): Promise<SmartNotification[]> {
    const notifications: SmartNotification[] = [];

    // Get team members who should see video analysis
    const teamMembers = await this.getTeamMembers(teamId);

    for (const member of teamMembers) {
      if (this.shouldReceiveVideoNotification(member, analysis)) {
        const priority = this.calculateVideoNotificationPriority(
          analysis,
          member.role
        );

        const notification = this.createNotification({
          type: 'video',
          title: this.generateVideoNotificationTitle(analysis),
          message: this.generateVideoNotificationMessage(analysis),
          priority,
          category: 'performance-analysis',
          recipientId: member.id,
          recipientType: member.role,
          data: {
            videoId,
            analysis,
            teamId,
            timestamp: new Date(),
          },
          channels: this.determineChannels(member.role, priority, 'video'),
        });

        notifications.push(notification);
      }
    }

    return notifications;
  }

  // **AI-Powered Priority Calculation**
  private calculateWeatherNotificationPriority(
    weatherData: any,
    recommendation: any,
    role: string,
    practiceDate: Date
  ): NotificationPriority {
    let score = 0;
    const factors: string[] = [];
    let urgency: 'immediate' | 'soon' | 'later' | 'scheduled' = 'scheduled';

    // Time-based urgency
    const hoursUntilPractice =
      (practiceDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilPractice < 2) {
      urgency = 'immediate';
      score += 30;
      factors.push('Practice within 2 hours');
    } else if (hoursUntilPractice < 24) {
      urgency = 'soon';
      score += 20;
      factors.push('Practice within 24 hours');
    }

    // Weather severity
    if (recommendation.riskLevel === 'high') {
      score += 25;
      factors.push('High weather risk');
    } else if (recommendation.riskLevel === 'medium') {
      score += 15;
      factors.push('Medium weather risk');
    }

    // Role-based importance
    if (role === 'head-coach') {
      score += 20;
      factors.push('Head coach responsibility');
    } else if (role === 'assistant-coach') {
      score += 15;
      factors.push('Assistant coach involvement');
    }

    // Practice modification needed
    if (!recommendation.canPracticeOutdoors) {
      score += 20;
      factors.push('Practice modification required');
    }

    // Weather alerts
    if (weatherData.alerts && weatherData.alerts.length > 0) {
      score += 15;
      factors.push('Active weather alerts');
    }

    // Determine priority level
    let level: 'low' | 'medium' | 'high' | 'critical';
    if (score >= 80) level = 'critical';
    else if (score >= 60) level = 'high';
    else if (score >= 40) level = 'medium';
    else level = 'low';

    return { level, score, factors, urgency };
  }

  private calculateHealthNotificationPriority(
    healthData: any,
    riskAssessment: any,
    role: string
  ): NotificationPriority {
    let score = 0;
    const factors: string[] = [];
    let urgency: 'immediate' | 'soon' | 'later' | 'scheduled' = 'scheduled';

    // Health risk level
    if (riskAssessment.riskLevel === 'high') {
      score += 30;
      urgency = 'immediate';
      factors.push('High health risk');
    } else if (riskAssessment.riskLevel === 'medium') {
      score += 20;
      urgency = 'soon';
      factors.push('Medium health risk');
    }

    // Role-based urgency
    if (role === 'head-coach') {
      score += 25;
      factors.push('Head coach responsibility');
    } else if (role === 'parent') {
      score += 20;
      factors.push('Parent notification required');
    }

    // Specific health indicators
    if (healthData.heartRate?.current > 180) {
      score += 25;
      urgency = 'immediate';
      factors.push('Excessive heart rate');
    }

    if (healthData.stress?.level === 'high') {
      score += 15;
      factors.push('High stress level');
    }

    // Determine priority level
    let level: 'low' | 'medium' | 'high' | 'critical';
    if (score >= 80) level = 'critical';
    else if (score >= 60) level = 'high';
    else if (score >= 40) level = 'medium';
    else level = 'low';

    return { level, score, factors, urgency };
  }

  private calculateVideoNotificationPriority(
    analysis: any,
    role: string
  ): NotificationPriority {
    let score = 0;
    const factors: string[] = [];
    let urgency: 'immediate' | 'soon' | 'later' | 'scheduled' = 'scheduled';

    // Analysis importance
    if (analysis.confidence > 0.8) {
      score += 20;
      factors.push('High confidence analysis');
    }

    // Role-based importance
    if (role === 'head-coach') {
      score += 25;
      factors.push('Head coach review needed');
    } else if (role === 'player') {
      score += 15;
      factors.push('Player performance feedback');
    }

    // Analysis type
    if (analysis.type === 'injury-risk') {
      score += 30;
      urgency = 'immediate';
      factors.push('Injury risk identified');
    } else if (analysis.type === 'performance-improvement') {
      score += 20;
      factors.push('Performance improvement opportunity');
    }

    // Determine priority level
    let level: 'low' | 'medium' | 'high' | 'critical';
    if (score >= 80) level = 'critical';
    else if (score >= 60) level = 'high';
    else if (score >= 40) level = 'medium';
    else level = 'low';

    return { level, score, factors, urgency };
  }

  // **Smart Channel Selection**
  private determineChannels(
    role: string,
    priority: NotificationPriority,
    category: string
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];
    const preferences = this.getUserPreferences(role);

    // Critical notifications get all channels
    if (priority.level === 'critical') {
      if (preferences.channels.push)
        channels.push({
          type: 'push',
          config: {},
          isEnabled: true,
          status: 'pending',
        });
      if (preferences.channels.email)
        channels.push({
          type: 'email',
          config: {},
          isEnabled: true,
          status: 'pending',
        });
      if (preferences.channels.sms)
        channels.push({
          type: 'sms',
          config: {},
          isEnabled: true,
          status: 'pending',
        });
      if (preferences.channels.inApp)
        channels.push({
          type: 'in-app',
          config: {},
          isEnabled: true,
          status: 'pending',
        });
      return channels;
    }

    // High priority notifications
    if (priority.level === 'high') {
      if (preferences.channels.push)
        channels.push({
          type: 'push',
          config: {},
          isEnabled: true,
          status: 'pending',
        });
      if (preferences.channels.inApp)
        channels.push({
          type: 'in-app',
          config: {},
          isEnabled: true,
          status: 'pending',
        });
      if (preferences.channels.email)
        channels.push({
          type: 'email',
          config: {},
          isEnabled: true,
          status: 'pending',
        });
      return channels;
    }

    // Medium priority notifications
    if (priority.level === 'medium') {
      if (preferences.channels.inApp)
        channels.push({
          type: 'in-app',
          config: {},
          isEnabled: true,
          status: 'pending',
        });
      if (preferences.channels.push)
        channels.push({
          type: 'push',
          config: {},
          isEnabled: true,
          status: 'pending',
        });
      return channels;
    }

    // Low priority notifications
    if (preferences.channels.inApp)
      channels.push({
        type: 'in-app',
        config: {},
        isEnabled: true,
        status: 'pending',
      });

    return channels;
  }

  // **Notification Creation and Management**
  private createNotification(
    data: Partial<SmartNotification>
  ): SmartNotification {
    const notification: SmartNotification = {
      id: this.generateId(),
      type: data.type!,
      title: data.title!,
      message: data.message!,
      priority: data.priority!,
      category: data.category!,
      recipientId: data.recipientId!,
      recipientType: data.recipientType!,
      data: data.data || {},
      channels: data.channels || [],
      isRead: false,
      isDismissed: false,
      createdAt: new Date(),
      engagementMetrics: {
        openRate: 0,
        clickRate: 0,
        actionRate: 0,
        dismissRate: 0,
        timeToRead: 0,
        timeToAction: 0,
      },
    };

    this.notifications.set(notification.id, notification);
    this.queueNotification(notification);

    return notification;
  }

  private queueNotification(notification: SmartNotification): void {
    // Check if notification should be sent immediately or batched
    if (notification.priority.urgency === 'immediate') {
      this.notificationQueue.unshift(notification); // High priority first
    } else {
      this.notificationQueue.push(notification);
    }
  }

  // **Batch Processing for Non-Critical Notifications**
  private async processBatches(): Promise<void> {
    const now = new Date();

    for (const batch of this.batchQueue) {
      if (batch.scheduledFor <= now && batch.status === 'pending') {
        await this.sendBatch(batch);
      }
    }
  }

  private async sendBatch(batch: NotificationBatch): Promise<void> {
    batch.status = 'sending';

    try {
      // Send all notifications in the batch
      for (const notification of batch.notifications) {
        await this.sendNotification(notification);
      }

      batch.status = 'sent';
      batch.sentAt = new Date();
    } catch (error) {
      batch.status = 'failed';
      batch.error = error.message;
    }
  }

  // **Smart Notification Sending**
  private async sendNotification(
    notification: SmartNotification
  ): Promise<void> {
    // Check quiet hours
    if (this.isInQuietHours(notification.recipientId)) {
      if (notification.priority.level !== 'critical') {
        // Schedule for later
        this.scheduleNotification(notification);
        return;
      }
    }

    // Send through all enabled channels
    for (const channel of notification.channels) {
      if (channel.isEnabled) {
        try {
          await this.sendThroughChannel(notification, channel);
          channel.status = 'sent';
          channel.sentAt = new Date();
        } catch (error) {
          channel.status = 'failed';
          channel.error = error.message;
        }
      }
    }

    notification.sentAt = new Date();
  }

  private async sendThroughChannel(
    notification: SmartNotification,
    channel: NotificationChannel
  ): Promise<void> {
    switch (channel.type) {
      case 'push':
        await this.sendPushNotification(notification);
        break;
      case 'email':
        await this.sendEmailNotification(notification);
        break;
      case 'sms':
        await this.sendSMSNotification(notification);
        break;
      case 'in-app':
        await this.sendInAppNotification(notification);
        break;
      case 'webhook':
        await this.sendWebhookNotification(notification);
        break;
    }
  }

  // **Channel-Specific Sending Methods**
  private async sendPushNotification(
    notification: SmartNotification
  ): Promise<void> {
    // Simulate push notification sending
    console.log(`Sending push notification: ${notification.title}`);
    await this.delay(100);
  }

  private async sendEmailNotification(
    notification: SmartNotification
  ): Promise<void> {
    // Simulate email sending
    console.log(`Sending email notification: ${notification.title}`);
    await this.delay(200);
  }

  private async sendSMSNotification(
    notification: SmartNotification
  ): Promise<void> {
    // Simulate SMS sending
    console.log(`Sending SMS notification: ${notification.title}`);
    await this.delay(150);
  }

  private async sendInAppNotification(
    notification: SmartNotification
  ): Promise<void> {
    // Simulate in-app notification
    console.log(`Sending in-app notification: ${notification.title}`);
    await this.delay(50);
  }

  private async sendWebhookNotification(
    notification: SmartNotification
  ): Promise<void> {
    // Simulate webhook notification
    console.log(`Sending webhook notification: ${notification.title}`);
    await this.delay(100);
  }

  // **Utility Methods**
  private generateWeatherNotificationTitle(
    weatherData: any,
    recommendation: any
  ): string {
    if (recommendation.riskLevel === 'high') {
      return `⚠️ Weather Alert: Practice Modification Required`;
    } else if (recommendation.riskLevel === 'medium') {
      return `🌤️ Weather Update: Practice Planning`;
    } else {
      return `☀️ Weather Update: Practice Conditions`;
    }
  }

  private generateWeatherNotificationMessage(
    weatherData: any,
    recommendation: any
  ): string {
    if (recommendation.riskLevel === 'high') {
      return `Practice cannot be held outdoors due to ${weatherData.condition.toLowerCase()} conditions. ${recommendation.recommendations[0]}`;
    } else if (recommendation.riskLevel === 'medium') {
      return `Weather conditions require attention: ${weatherData.temperature}°F, ${weatherData.condition.toLowerCase()}. ${recommendation.recommendations[0]}`;
    } else {
      return `Weather conditions are favorable: ${weatherData.temperature}°F, ${weatherData.condition.toLowerCase()}. Practice can proceed as planned.`;
    }
  }

  private generateHealthNotificationTitle(
    healthData: any,
    riskAssessment: any
  ): string {
    if (riskAssessment.riskLevel === 'high') {
      return `🚨 Health Alert: Immediate Attention Required`;
    } else if (riskAssessment.riskLevel === 'medium') {
      return `⚠️ Health Update: Monitor Closely`;
    } else {
      return `✅ Health Update: All Clear`;
    }
  }

  private generateHealthNotificationMessage(
    healthData: any,
    riskAssessment: any
  ): string {
    if (riskAssessment.riskLevel === 'high') {
      return `Player health metrics indicate immediate attention is needed. ${riskAssessment.recommendations[0]}`;
    } else if (riskAssessment.riskLevel === 'medium') {
      return `Player health metrics require monitoring. ${riskAssessment.recommendations[0]}`;
    } else {
      return `Player health metrics are within normal ranges. Continue monitoring as usual.`;
    }
  }

  private generateVideoNotificationTitle(analysis: any): string {
    if (analysis.type === 'injury-risk') {
      return `🎥 Video Analysis: Injury Risk Identified`;
    } else if (analysis.type === 'performance-improvement') {
      return `🎥 Video Analysis: Performance Insights`;
    } else {
      return `🎥 Video Analysis: New Content Available`;
    }
  }

  private generateVideoNotificationMessage(analysis: any): string {
    if (analysis.type === 'injury-risk') {
      return `Video analysis has identified potential injury risk factors. Review recommended.`;
    } else if (analysis.type === 'performance-improvement') {
      return `Video analysis reveals performance improvement opportunities. ${analysis.recommendations[0]}`;
    } else {
      return `New video analysis is available for review. Check for insights and recommendations.`;
    }
  }

  // **Helper Methods**
  private getNotificationThreshold(role: string): number {
    const thresholds: Record<string, number> = {
      'head-coach': 30,
      'assistant-coach': 40,
      player: 50,
      parent: 45,
      admin: 35,
    };
    return thresholds[role] || 50;
  }

  private shouldReceiveVideoNotification(member: any, analysis: any): boolean {
    // Head coaches see all video analysis
    if (member.role === 'head-coach') return true;

    // Assistant coaches see team-related analysis
    if (member.role === 'assistant-coach') return true;

    // Players see their own performance analysis
    if (member.role === 'player' && analysis.playerId === member.id)
      return true;

    return false;
  }

  private getUserPreferences(role: string): NotificationPreferences {
    // Return default preferences for now
    return {
      userId: 'default',
      userType: role,
      categories: {
        weather: {
          isEnabled: true,
          priority: 'medium',
          channels: ['push', 'in-app'],
          quietHours: false,
          frequency: 'immediate',
        },
        health: {
          isEnabled: true,
          priority: 'high',
          channels: ['push', 'email', 'in-app'],
          quietHours: false,
          frequency: 'immediate',
        },
        video: {
          isEnabled: true,
          priority: 'medium',
          channels: ['in-app'],
          quietHours: true,
          frequency: 'batched',
        },
        practice: {
          isEnabled: true,
          priority: 'high',
          channels: ['push', 'email', 'in-app'],
          quietHours: false,
          frequency: 'immediate',
        },
        system: {
          isEnabled: true,
          priority: 'low',
          channels: ['in-app'],
          quietHours: true,
          frequency: 'daily',
        },
        team: {
          isEnabled: true,
          priority: 'medium',
          channels: ['push', 'in-app'],
          quietHours: true,
          frequency: 'batched',
        },
        player: {
          isEnabled: true,
          priority: 'medium',
          channels: ['in-app'],
          quietHours: true,
          frequency: 'batched',
        },
      },
      channels: {
        push: true,
        email: true,
        sms: false,
        inApp: true,
        webhook: false,
      },
      quietHours: {
        start: '22:00',
        end: '07:00',
        timezone: 'America/New_York',
        isEnabled: true,
      },
      frequency: 'immediate',
      maxDaily: 50,
      maxHourly: 10,
    };
  }

  private isInQuietHours(userId: string): boolean {
    const preferences = this.getUserPreferences('default');
    if (!preferences.quietHours.isEnabled) return false;

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false });

    return (
      currentTime >= preferences.quietHours.start &&
      currentTime <= preferences.quietHours.end
    );
  }

  private scheduleNotification(notification: SmartNotification): void {
    // Schedule for after quiet hours
    const preferences = this.getUserPreferences('default');
    const scheduledTime = new Date();
    scheduledTime.setHours(parseInt(preferences.quietHours.end.split(':')[0]));
    scheduledTime.setMinutes(
      parseInt(preferences.quietHours.end.split(':')[1])
    );

    notification.scheduledFor = scheduledTime;
  }

  private async getTeamMembers(teamId: string): Promise<any[]> {
    // Simulate getting team members
    return [
      { id: 'coach-1', role: 'head-coach', name: 'Head Coach' },
      { id: 'coach-2', role: 'assistant-coach', name: 'Assistant Coach' },
      { id: 'player-1', role: 'player', name: 'Player 1' },
      { id: 'player-2', role: 'player', name: 'Player 2' },
    ];
  }

  private async getHealthNotificationRecipients(
    playerId: string
  ): Promise<any[]> {
    // Simulate getting health notification recipients
    return [
      { id: 'coach-1', role: 'head-coach', name: 'Head Coach' },
      { id: 'parent-1', role: 'parent', name: 'Parent' },
      { id: 'player-1', role: 'player', name: 'Player' },
    ];
  }

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processNotifications();
      this.processBatches();
    }, 1000);
  }

  private async processNotifications(): Promise<void> {
    if (this.notificationQueue.length === 0) return;

    const notification = this.notificationQueue.shift();
    if (notification) {
      await this.sendNotification(notification);
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private initializeDefaultPreferences(): void {
    // Initialize with default preferences for different user types
    const userTypes = [
      'head-coach',
      'assistant-coach',
      'player',
      'parent',
      'admin',
    ];

    userTypes.forEach(userType => {
      this.preferences.set(userType, this.getUserPreferences(userType));
    });
  }

  // **Public Interface Methods**
  async getNotificationStatus(
    notificationId: string
  ): Promise<SmartNotification | undefined> {
    return this.notifications.get(notificationId);
  }

  async getUserNotifications(
    userId: string,
    limit: number = 50
  ): Promise<SmartNotification[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.recipientId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.isRead = true;
      notification.readAt = new Date();
    }
  }

  async dismissNotification(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.isDismissed = true;
      notification.dismissedAt = new Date();
    }
  }

  async updateNotificationPreferences(
    userType: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    const current =
      this.preferences.get(userType) || this.getUserPreferences(userType);
    this.preferences.set(userType, { ...current, ...preferences });
  }

  async getNotificationStats(): Promise<{
    total: number;
    unread: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }> {
    const notifications = Array.from(this.notifications.values());

    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      critical: notifications.filter(n => n.priority.level === 'critical')
        .length,
      high: notifications.filter(n => n.priority.level === 'high').length,
      medium: notifications.filter(n => n.priority.level === 'medium').length,
      low: notifications.filter(n => n.priority.level === 'low').length,
    };
  }

  // **Cleanup**
  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }
}

export const smartNotificationEngine = new SmartNotificationEngine();
export default smartNotificationEngine;
