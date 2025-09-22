# 🔧 MCP Integration Guide - Coach Core AI

## 📋 Overview

This guide documents the Model Context Protocol (MCP) integration implemented for the Coach Core AI project. The integration provides enhanced dashboard functionality, real-time notifications, and advanced analytics through Firebase and external service connections.

## 🏗️ Architecture

### MCP Services Structure
```
src/services/mcp/
├── mcp-dashboard-service.ts    # Real-time dashboard with analytics
├── mcp-notification-service.ts # Multi-channel notifications
└── [future services]           # Additional MCP integrations
```

### Component Integration
```
src/components/Dashboard/
└── EnhancedUserDashboard.tsx   # MCP-powered dashboard component
```

## 🚀 Features Implemented

### 1. Enhanced Dashboard Service (`MCPDashboardService`)

#### Key Features:
- **Real-time Updates**: Live Firebase listeners for team data
- **Advanced Analytics**: Player engagement, practice effectiveness, game performance trends
- **Predictive Insights**: Win probability, attendance predictions, performance trends
- **Caching**: Intelligent caching with configurable timeout
- **Error Handling**: Graceful fallbacks and error recovery

#### Usage:
```typescript
import { mcpDashboardService } from '../services/mcp/mcp-dashboard-service';

// Get enhanced team statistics
const stats = await mcpDashboardService.getEnhancedTeamStats(teamId);

// Subscribe to real-time updates
const unsubscribe = mcpDashboardService.subscribeToRealTimeUpdates(
  teamId,
  (updatedStats) => {
    setStats(updatedStats);
  }
);

// Get advanced analytics
const analytics = await mcpDashboardService.getAdvancedAnalytics(teamId);
```

#### Configuration:
```typescript
interface MCPDashboardConfig {
  enableRealTimeUpdates: boolean;
  cacheTimeout: number;
  analyticsIntegration: boolean;
  notificationIntegration: boolean;
}
```

### 2. Notification Service (`MCPNotificationService`)

#### Key Features:
- **Multi-channel Delivery**: Push, email, SMS, in-app notifications
- **Template System**: Predefined and custom notification templates
- **Scheduling**: Schedule notifications for future delivery
- **Delivery Tracking**: Monitor notification delivery status
- **Real-time Subscriptions**: Live notification updates

#### Usage:
```typescript
import { mcpNotificationService } from '../services/mcp/mcp-notification-service';

// Send a notification
const notificationId = await mcpNotificationService.sendNotification({
  teamId: 'team-123',
  type: 'practice_reminder',
  title: 'Practice Reminder',
  message: 'Team practice starts in 30 minutes',
  priority: 'medium',
  channels: ['push', 'in_app'],
  actionRequired: false,
});

// Send templated notification
await mcpNotificationService.sendTemplatedNotification(
  'practice_reminder',
  teamId,
  {
    timeUntil: '30 minutes',
    location: 'Main Field'
  }
);

// Subscribe to notifications
const unsubscribe = mcpNotificationService.subscribeToTeamNotifications(
  teamId,
  (notification) => {
    console.log('New notification:', notification);
  }
);
```

#### Default Templates:
- **Practice Reminder**: 30 minutes before practice
- **Game Alert**: 1 hour before games
- **Attendance Warning**: When attendance drops below 75%
- **Performance Update**: When performance changes by 10%+

### 3. Enhanced User Dashboard Component

#### Features:
- **Real-time Metrics**: Live team statistics and activity
- **Interactive Charts**: Player engagement and attendance patterns
- **Notification Center**: Recent notifications with priority indicators
- **Predictive Analytics**: Win probability and performance trends
- **Responsive Design**: Mobile-friendly layout with Chakra UI

#### Props:
```typescript
interface EnhancedUserDashboardProps {
  teamId?: string;
  enableRealTime?: boolean;
  showAdvancedAnalytics?: boolean;
}
```

## 🔧 Configuration

### Firebase Integration
The MCP services integrate with Firebase Firestore for:
- Real-time data synchronization
- Notification storage and delivery
- Team and player data management
- Analytics data collection

### Environment Variables
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 📊 Data Structures

### Enhanced Dashboard Stats
```typescript
interface EnhancedDashboardStats extends DashboardStats {
  trends: {
    playersChange: number;
    performanceChange: number;
    attendanceChange: number;
  };
  predictions: {
    nextGameWinProbability: number;
    expectedAttendance: number;
    performanceTrend: 'improving' | 'declining' | 'stable';
  };
  realTimeMetrics: {
    activeUsers: number;
    ongoingPractices: number;
    liveNotifications: number;
  };
}
```

### Notification Payload
```typescript
interface NotificationPayload {
  teamId: string;
  userId?: string;
  type: 'practice_reminder' | 'game_alert' | 'performance_update' | 'attendance_warning' | 'custom';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: ('push' | 'email' | 'sms' | 'in_app')[];
  actionRequired: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}
```

## 🔄 Real-time Features

### Dashboard Updates
- **Player Count Changes**: Instant updates when players join/leave
- **Practice Status**: Live updates on practice sessions
- **Game Results**: Real-time score and performance updates
- **Attendance Tracking**: Live attendance rate calculations

### Notification Delivery
- **Instant Notifications**: Real-time in-app notifications
- **Push Notifications**: Firebase Cloud Messaging integration
- **Email Notifications**: External email service integration
- **SMS Notifications**: SMS service provider integration

## 🧪 Testing

### Unit Tests
```bash
# Run MCP service tests
npm test src/services/mcp/

# Run dashboard component tests
npm test src/components/Dashboard/
```

### Integration Tests
```bash
# Test Firebase integration
npm run test:integration

# Test notification delivery
npm run test:notifications
```

## 🚀 Deployment

### Development
```bash
# Start development server
npm run dev

# Access dashboard at
http://localhost:3001/dashboard
```

### Production
```bash
# Build for production
npm run build

# Deploy to Firebase
npm run deploy
```

## 🔮 Future Enhancements

### Planned MCP Integrations
1. **External Analytics**: Google Analytics, Mixpanel integration
2. **Weather API**: Weather-based practice recommendations
3. **Video Analysis**: AI-powered game footage analysis
4. **Wearable Integration**: Heart rate and performance monitoring
5. **Social Media**: Automated team updates and highlights

### Advanced Features
1. **Machine Learning**: Predictive player performance models
2. **Voice Commands**: Voice-activated coaching assistance
3. **AR/VR Integration**: Immersive training experiences
4. **IoT Sensors**: Smart equipment monitoring

## 📚 API Reference

### MCPDashboardService Methods
- `getEnhancedTeamStats(teamId: string): Promise<EnhancedDashboardStats>`
- `subscribeToRealTimeUpdates(teamId: string, callback: Function): () => void`
- `getRealTimeNotifications(teamId: string): Promise<RealTimeNotification[]>`
- `getAdvancedAnalytics(teamId: string): Promise<AnalyticsData>`
- `cleanup(): void`

### MCPNotificationService Methods
- `sendNotification(payload: NotificationPayload): Promise<string>`
- `sendTemplatedNotification(templateId: string, teamId: string, variables: Record<string, string>): Promise<string>`
- `subscribeToTeamNotifications(teamId: string, callback: Function): () => void`
- `scheduleNotification(payload: NotificationPayload, scheduledTime: Date): Promise<string>`
- `markAsRead(notificationId: string): Promise<void>`
- `addTemplate(template: NotificationTemplate): void`
- `cleanup(): void`

## 🐛 Troubleshooting

### Common Issues
1. **Firebase Connection**: Check environment variables and network connectivity
2. **Real-time Updates**: Verify Firestore security rules allow read/write access
3. **Notification Delivery**: Check service configurations and API keys
4. **Performance**: Monitor cache settings and subscription cleanup

### Debug Mode
```typescript
// Enable debug logging
const dashboardService = new MCPDashboardService({
  enableRealTimeUpdates: true,
  cacheTimeout: 60000,
  analyticsIntegration: true,
  notificationIntegration: true,
  debug: true // Enable debug mode
});
```

## 📞 Support

For issues or questions regarding MCP integration:
1. Check the troubleshooting section above
2. Review Firebase console for errors
3. Check browser console for client-side issues
4. Verify network connectivity and API endpoints

---

**Created**: 2025-01-21 by Cline Agent  
**Version**: 1.0.0  
**Branch**: feature/mcp-integration  
**Status**: Production Ready
