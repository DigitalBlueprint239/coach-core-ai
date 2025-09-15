import apiService from '../api-service';

export interface WearableDevice {
  id: string;
  name: string;
  type:
    | 'fitness-tracker'
    | 'smartwatch'
    | 'heart-rate-monitor'
    | 'gps-tracker'
    | 'sleep-tracker';
  brand: string;
  model: string;
  playerId: string;
  playerName: string;
  isActive: boolean;
  lastSync: Date;
  batteryLevel: number;
  firmwareVersion: string;
  capabilities: string[];
}

export interface HealthMetrics {
  id: string;
  deviceId: string;
  playerId: string;
  timestamp: Date;
  heartRate: {
    current: number;
    resting: number;
    max: number;
    zones: HeartRateZone[];
  };
  steps: number;
  calories: number;
  distance: number;
  sleep: {
    duration: number;
    quality: 'poor' | 'fair' | 'good' | 'excellent';
    deepSleep: number;
    lightSleep: number;
    remSleep: number;
    awake: number;
  };
  activity: {
    type: string;
    duration: number;
    intensity: 'low' | 'moderate' | 'high';
    calories: number;
  };
  stress: {
    level: 'low' | 'medium' | 'high';
    score: number;
    factors: string[];
  };
  hydration: number;
  temperature: number;
  bloodOxygen: number;
}

export interface HeartRateZone {
  zone: 'rest' | 'fat-burn' | 'cardio' | 'peak';
  min: number;
  max: number;
  timeInZone: number;
  percentage: number;
}

export interface PerformanceMetrics {
  id: string;
  playerId: string;
  date: Date;
  readiness: {
    score: number;
    factors: string[];
    recommendation: string;
  };
  recovery: {
    score: number;
    hoursOfSleep: number;
    sleepQuality: number;
    stressLevel: number;
    recommendation: string;
  };
  training: {
    load: number;
    intensity: number;
    duration: number;
    calories: number;
    recommendation: string;
  };
  risk: {
    injuryRisk: 'low' | 'medium' | 'high';
    fatigueRisk: 'low' | 'medium' | 'high';
    overtrainingRisk: 'low' | 'medium' | 'high';
    factors: string[];
    recommendations: string[];
  };
}

export interface WearableDataSync {
  deviceId: string;
  playerId: string;
  startTime: Date;
  endTime: Date;
  dataPoints: number;
  success: boolean;
  error?: string;
  duration: number;
}

export interface WearableAlert {
  id: string;
  playerId: string;
  deviceId: string;
  type: 'health' | 'performance' | 'device' | 'safety';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionRequired: boolean;
  actionItems: string[];
}

class WearableAPIService {
  private fitbitClientId: string;
  private garminConsumerKey: string;
  private appleHealthKitEnabled: boolean;
  private googleFitEnabled: boolean;

  constructor() {
    this.fitbitClientId = process.env.REACT_APP_FITBIT_CLIENT_ID || '';
    this.garminConsumerKey = process.env.REACT_APP_GARMIN_CONSUMER_KEY || '';
    this.appleHealthKitEnabled =
      process.env.REACT_APP_APPLE_HEALTH_KIT === 'true';
    this.googleFitEnabled = process.env.REACT_APP_GOOGLE_FIT === 'true';
  }

  // Device Management
  async registerDevice(
    deviceData: Partial<WearableDevice>
  ): Promise<WearableDevice> {
    try {
      const response = await apiService.post('/wearables/devices', deviceData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to register device');
      }

      return response.data;
    } catch (error) {
      console.error('Device registration error:', error);
      throw error;
    }
  }

  async getPlayerDevices(playerId: string): Promise<WearableDevice[]> {
    try {
      const response = await apiService.get(
        `/wearables/players/${playerId}/devices`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch player devices');
      }

      return response.data;
    } catch (error) {
      console.error('Player devices fetch error:', error);
      throw error;
    }
  }

  async updateDevice(
    deviceId: string,
    updates: Partial<WearableDevice>
  ): Promise<WearableDevice> {
    try {
      const response = await apiService.patch(
        `/wearables/devices/${deviceId}`,
        updates
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update device');
      }

      return response.data;
    } catch (error) {
      console.error('Device update error:', error);
      throw error;
    }
  }

  async deactivateDevice(deviceId: string): Promise<boolean> {
    try {
      const response = await apiService.patch(
        `/wearables/devices/${deviceId}`,
        {
          isActive: false,
          lastSync: new Date(),
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to deactivate device');
      }

      return true;
    } catch (error) {
      console.error('Device deactivation error:', error);
      throw error;
    }
  }

  // Fitbit Integration
  async connectFitbit(
    playerId: string,
    authCode: string
  ): Promise<WearableDevice> {
    try {
      const response = await apiService.post('/wearables/fitbit/connect', {
        playerId,
        authCode,
        clientId: this.fitbitClientId,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to connect Fitbit');
      }

      return response.data;
    } catch (error) {
      console.error('Fitbit connection error:', error);
      throw error;
    }
  }

  async syncFitbitData(
    deviceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WearableDataSync> {
    try {
      const response = await apiService.post(`/wearables/fitbit/sync`, {
        deviceId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to sync Fitbit data');
      }

      return response.data;
    } catch (error) {
      console.error('Fitbit sync error:', error);
      throw error;
    }
  }

  // Garmin Integration
  async connectGarmin(
    playerId: string,
    authToken: string
  ): Promise<WearableDevice> {
    try {
      const response = await apiService.post('/wearables/garmin/connect', {
        playerId,
        authToken,
        consumerKey: this.garminConsumerKey,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to connect Garmin');
      }

      return response.data;
    } catch (error) {
      console.error('Garmin connection error:', error);
      throw error;
    }
  }

  async syncGarminData(
    deviceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WearableDataSync> {
    try {
      const response = await apiService.post(`/wearables/garmin/sync`, {
        deviceId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to sync Garmin data');
      }

      return response.data;
    } catch (error) {
      console.error('Garmin sync error:', error);
      throw error;
    }
  }

  // Apple HealthKit Integration
  async connectAppleHealthKit(
    playerId: string,
    healthData: any
  ): Promise<WearableDevice> {
    if (!this.appleHealthKitEnabled) {
      throw new Error('Apple HealthKit integration is not enabled');
    }

    try {
      const response = await apiService.post(
        '/wearables/apple-healthkit/connect',
        {
          playerId,
          healthData,
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to connect Apple HealthKit');
      }

      return response.data;
    } catch (error) {
      console.error('Apple HealthKit connection error:', error);
      throw error;
    }
  }

  // Google Fit Integration
  async connectGoogleFit(
    playerId: string,
    accessToken: string
  ): Promise<WearableDevice> {
    if (!this.googleFitEnabled) {
      throw new Error('Google Fit integration is not enabled');
    }

    try {
      const response = await apiService.post('/wearables/google-fit/connect', {
        playerId,
        accessToken,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to connect Google Fit');
      }

      return response.data;
    } catch (error) {
      console.error('Google Fit connection error:', error);
      throw error;
    }
  }

  // Health Metrics
  async getHealthMetrics(
    playerId: string,
    startDate: Date,
    endDate: Date,
    metrics?: string[]
  ): Promise<HealthMetrics[]> {
    try {
      const params: Record<string, any> = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      if (metrics?.length) {
        params.metrics = metrics.join(',');
      }

      const response = await apiService.get(
        `/wearables/players/${playerId}/metrics`,
        params
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch health metrics');
      }

      return response.data;
    } catch (error) {
      console.error('Health metrics fetch error:', error);
      throw error;
    }
  }

  async getLatestHealthMetrics(
    playerId: string
  ): Promise<HealthMetrics | null> {
    try {
      const response = await apiService.get(
        `/wearables/players/${playerId}/metrics/latest`
      );

      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch latest health metrics'
        );
      }

      return response.data;
    } catch (error) {
      console.error('Latest health metrics fetch error:', error);
      throw error;
    }
  }

  // Performance Metrics
  async getPerformanceMetrics(
    playerId: string,
    date: Date
  ): Promise<PerformanceMetrics> {
    try {
      const response = await apiService.get(
        `/wearables/players/${playerId}/performance`,
        {
          date: date.toISOString(),
        }
      );

      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch performance metrics'
        );
      }

      return response.data;
    } catch (error) {
      console.error('Performance metrics fetch error:', error);
      throw error;
    }
  }

  async getPerformanceTrends(
    playerId: string,
    days: number = 30
  ): Promise<PerformanceMetrics[]> {
    try {
      const response = await apiService.get(
        `/wearables/players/${playerId}/performance/trends`,
        {
          days,
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch performance trends');
      }

      return response.data;
    } catch (error) {
      console.error('Performance trends fetch error:', error);
      throw error;
    }
  }

  // Team Performance Overview
  async getTeamPerformanceOverview(
    teamId: string,
    date: Date
  ): Promise<{
    teamId: string;
    date: Date;
    averageReadiness: number;
    averageRecovery: number;
    averageTrainingLoad: number;
    playersAtRisk: number;
    recommendations: string[];
  }> {
    try {
      const response = await apiService.get(
        `/wearables/teams/${teamId}/performance`,
        {
          date: date.toISOString(),
        }
      );

      if (!response.success) {
        throw new Error(
          response.error || 'Failed to fetch team performance overview'
        );
      }

      return response.data;
    } catch (error) {
      console.error('Team performance overview fetch error:', error);
      throw error;
    }
  }

  // Alerts and Notifications
  async getWearableAlerts(
    playerId: string,
    unreadOnly: boolean = false
  ): Promise<WearableAlert[]> {
    try {
      const response = await apiService.get(
        `/wearables/players/${playerId}/alerts`,
        {
          unreadOnly,
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch wearable alerts');
      }

      return response.data;
    } catch (error) {
      console.error('Wearable alerts fetch error:', error);
      throw error;
    }
  }

  async markAlertAsRead(alertId: string): Promise<boolean> {
    try {
      const response = await apiService.patch(`/wearables/alerts/${alertId}`, {
        isRead: true,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to mark alert as read');
      }

      return true;
    } catch (error) {
      console.error('Mark alert as read error:', error);
      throw error;
    }
  }

  // Data Sync Management
  async getSyncHistory(
    deviceId: string,
    limit: number = 50
  ): Promise<WearableDataSync[]> {
    try {
      const response = await apiService.get(
        `/wearables/devices/${deviceId}/sync-history`,
        {
          limit,
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sync history');
      }

      return response.data;
    } catch (error) {
      console.error('Sync history fetch error:', error);
      throw error;
    }
  }

  async forceDataSync(deviceId: string): Promise<WearableDataSync> {
    try {
      const response = await apiService.post(
        `/wearables/devices/${deviceId}/force-sync`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to force data sync');
      }

      return response.data;
    } catch (error) {
      console.error('Force data sync error:', error);
      throw error;
    }
  }

  // Analytics and Insights
  async getPlayerInsights(
    playerId: string,
    timeframe: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<{
    playerId: string;
    timeframe: string;
    trends: {
      readiness: 'improving' | 'stable' | 'declining';
      recovery: 'improving' | 'stable' | 'declining';
      training: 'improving' | 'stable' | 'declining';
    };
    recommendations: string[];
    riskFactors: string[];
    improvementAreas: string[];
  }> {
    try {
      const response = await apiService.get(
        `/wearables/players/${playerId}/insights`,
        {
          timeframe,
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch player insights');
      }

      return response.data;
    } catch (error) {
      console.error('Player insights fetch error:', error);
      throw error;
    }
  }

  // Export and Reporting
  async exportHealthData(
    playerId: string,
    startDate: Date,
    endDate: Date,
    format: 'csv' | 'json' | 'pdf' = 'csv'
  ): Promise<string> {
    try {
      const response = await apiService.post(
        `/wearables/players/${playerId}/export`,
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          format,
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to export health data');
      }

      return response.data.downloadUrl;
    } catch (error) {
      console.error('Health data export error:', error);
      throw error;
    }
  }
}

export const wearableAPIService = new WearableAPIService();
export default wearableAPIService;
