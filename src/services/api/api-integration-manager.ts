import apiService from './api-service';
import weatherAPIService from './integrations/weather-api';
import videoAPIService from './integrations/video-api';
import wearableAPIService from './integrations/wearable-api';

export interface IntegrationStatus {
  name: string;
  isEnabled: boolean;
  isConnected: boolean;
  lastSync: Date | null;
  errorCount: number;
  status: 'healthy' | 'warning' | 'error' | 'disconnected';
  message: string;
}

export interface IntegrationConfig {
  name: string;
  apiKey: string;
  baseURL: string;
  isEnabled: boolean;
  autoSync: boolean;
  syncInterval: number; // in minutes
  retryAttempts: number;
  timeout: number;
}

export interface APIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  lastUpdated: Date;
}

class APIIntegrationManager {
  private integrations: Map<string, IntegrationConfig>;
  private statusCache: Map<string, IntegrationStatus>;
  private metrics: APIMetrics;
  private syncIntervals: Map<string, NodeJS.Timeout>;

  constructor() {
    this.integrations = new Map();
    this.statusCache = new Map();
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      lastUpdated: new Date(),
    };
    this.syncIntervals = new Map();

    this.initializeIntegrations();
    this.startHealthMonitoring();
  }

  private initializeIntegrations() {
    // Weather API
    this.addIntegration({
      name: 'weather',
      apiKey: process.env.REACT_APP_OPENWEATHER_API_KEY || '',
      baseURL: 'https://api.openweathermap.org/data/2.5',
      isEnabled: !!process.env.REACT_APP_OPENWEATHER_API_KEY,
      autoSync: true,
      syncInterval: 30, // 30 minutes
      retryAttempts: 3,
      timeout: 10000,
    });

    // Video APIs
    this.addIntegration({
      name: 'hudl',
      apiKey: process.env.REACT_APP_HUDL_API_KEY || '',
      baseURL: 'https://api.hudl.com/v1',
      isEnabled: !!process.env.REACT_APP_HUDL_API_KEY,
      autoSync: true,
      syncInterval: 60, // 1 hour
      retryAttempts: 3,
      timeout: 15000,
    });

    this.addIntegration({
      name: 'youtube',
      apiKey: process.env.REACT_APP_YOUTUBE_API_KEY || '',
      baseURL: 'https://www.googleapis.com/youtube/v3',
      isEnabled: !!process.env.REACT_APP_YOUTUBE_API_KEY,
      autoSync: false,
      syncInterval: 0,
      retryAttempts: 2,
      timeout: 10000,
    });

    this.addIntegration({
      name: 'vimeo',
      apiKey: process.env.REACT_APP_VIMEO_API_KEY || '',
      baseURL: 'https://api.vimeo.com',
      isEnabled: !!process.env.REACT_APP_VIMEO_API_KEY,
      autoSync: false,
      syncInterval: 0,
      retryAttempts: 2,
      timeout: 10000,
    });

    // Wearable APIs
    this.addIntegration({
      name: 'fitbit',
      apiKey: process.env.REACT_APP_FITBIT_CLIENT_ID || '',
      baseURL: 'https://api.fitbit.com/1',
      isEnabled: !!process.env.REACT_APP_FITBIT_CLIENT_ID,
      autoSync: true,
      syncInterval: 15, // 15 minutes
      retryAttempts: 3,
      timeout: 20000,
    });

    this.addIntegration({
      name: 'garmin',
      apiKey: process.env.REACT_APP_GARMIN_CONSUMER_KEY || '',
      baseURL: 'https://apis.garmin.com/wellness-api/rest',
      isEnabled: !!process.env.REACT_APP_GARMIN_CONSUMER_KEY,
      autoSync: true,
      syncInterval: 15, // 15 minutes
      retryAttempts: 3,
      timeout: 20000,
    });

    // Health platforms
    this.addIntegration({
      name: 'apple-healthkit',
      apiKey: 'enabled',
      baseURL: 'healthkit://',
      isEnabled: process.env.REACT_APP_APPLE_HEALTH_KIT === 'true',
      autoSync: true,
      syncInterval: 10, // 10 minutes
      retryAttempts: 2,
      timeout: 15000,
    });

    this.addIntegration({
      name: 'google-fit',
      apiKey: 'enabled',
      baseURL: 'https://www.googleapis.com/fitness/v1',
      isEnabled: process.env.REACT_APP_GOOGLE_FIT === 'true',
      autoSync: true,
      syncInterval: 10, // 10 minutes
      retryAttempts: 2,
      timeout: 15000,
    });
  }

  addIntegration(config: IntegrationConfig): void {
    this.integrations.set(config.name, config);
    
    if (config.isEnabled && config.autoSync && config.syncInterval > 0) {
      this.startAutoSync(config.name);
    }
  }

  removeIntegration(name: string): void {
    const integration = this.integrations.get(name);
    if (integration) {
      this.stopAutoSync(name);
      this.integrations.delete(name);
      this.statusCache.delete(name);
    }
  }

  updateIntegration(name: string, updates: Partial<IntegrationConfig>): void {
    const integration = this.integrations.get(name);
    if (integration) {
      const updatedIntegration = { ...integration, ...updates };
      this.integrations.set(name, updatedIntegration);
      
      // Restart auto-sync if needed
      if (updatedIntegration.isEnabled && updatedIntegration.autoSync && updatedIntegration.syncInterval > 0) {
        this.stopAutoSync(name);
        this.startAutoSync(name);
      } else {
        this.stopAutoSync(name);
      }
    }
  }

  getIntegration(name: string): IntegrationConfig | undefined {
    return this.integrations.get(name);
  }

  getAllIntegrations(): IntegrationConfig[] {
    return Array.from(this.integrations.values());
  }

  async testIntegration(name: string): Promise<boolean> {
    try {
      const integration = this.integrations.get(name);
      if (!integration || !integration.isEnabled) {
        return false;
      }

      let success = false;
      switch (name) {
        case 'weather':
          success = await this.testWeatherAPI();
          break;
        case 'hudl':
          success = await this.testHudlAPI();
          break;
        case 'youtube':
          success = await this.testYouTubeAPI();
          break;
        case 'fitbit':
          success = await this.testFitbitAPI();
          break;
        case 'garmin':
          success = await this.testGarminAPI();
          break;
        default:
          success = await this.testGenericAPI(integration);
      }

      this.updateIntegrationStatus(name, {
        isConnected: success,
        status: success ? 'healthy' : 'error',
        message: success ? 'Connection successful' : 'Connection failed',
        lastSync: success ? new Date() : null,
      });

      return success;
    } catch (error) {
      console.error(`Integration test failed for ${name}:`, error);
      this.updateIntegrationStatus(name, {
        isConnected: false,
        status: 'error',
        message: `Test failed: ${error.message}`,
        errorCount: (this.statusCache.get(name)?.errorCount || 0) + 1,
      });
      return false;
    }
  }

  async testAllIntegrations(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const [name, integration] of this.integrations) {
      if (integration.isEnabled) {
        results.set(name, await this.testIntegration(name));
      }
    }
    
    return results;
  }

  private async testWeatherAPI(): Promise<boolean> {
    try {
      // Test with a known location (New York City)
      await weatherAPIService.getCurrentWeather(40.7128, -74.0060);
      return true;
    } catch {
      return false;
    }
  }

  private async testHudlAPI(): Promise<boolean> {
    try {
      // Test API health endpoint
      const response = await apiService.get('/hudl/health');
      return response.success;
    } catch {
      return false;
    }
  }

  private async testYouTubeAPI(): Promise<boolean> {
    try {
      // Test API quota endpoint
      const response = await apiService.get('/youtube/quota');
      return response.success;
    } catch {
      return false;
    }
  }

  private async testFitbitAPI(): Promise<boolean> {
    try {
      // Test API health endpoint
      const response = await apiService.get('/fitbit/health');
      return response.success;
    } catch {
      return false;
    }
  }

  private async testGarminAPI(): Promise<boolean> {
    try {
      // Test API health endpoint
      const response = await apiService.get('/garmin/health');
      return response.success;
    } catch {
      return false;
    }
  }

  private async testGenericAPI(integration: IntegrationConfig): Promise<boolean> {
    try {
      const response = await apiService.get(`${integration.baseURL}/health`, {}, {
        timeout: integration.timeout,
      });
      return response.success;
    } catch {
      return false;
    }
  }

  startAutoSync(integrationName: string): void {
    const integration = this.integrations.get(integrationName);
    if (!integration || !integration.autoSync || integration.syncInterval <= 0) {
      return;
    }

    // Stop existing interval if any
    this.stopAutoSync(integrationName);

    // Start new interval
    const interval = setInterval(async () => {
      try {
        await this.syncIntegration(integrationName);
      } catch (error) {
        console.error(`Auto-sync failed for ${integrationName}:`, error);
      }
    }, integration.syncInterval * 60 * 1000);

    this.syncIntervals.set(integrationName, interval);
  }

  stopAutoSync(integrationName: string): void {
    const interval = this.syncIntervals.get(integrationName);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(integrationName);
    }
  }

  async syncIntegration(integrationName: string): Promise<boolean> {
    try {
      const integration = this.integrations.get(integrationName);
      if (!integration || !integration.isEnabled) {
        return false;
      }

      // Perform integration-specific sync
      let success = false;
      switch (integrationName) {
        case 'weather':
          success = await this.syncWeatherData();
          break;
        case 'hudl':
          success = await this.syncHudlData();
          break;
        case 'fitbit':
          success = await this.syncFitbitData();
          break;
        case 'garmin':
          success = await this.syncGarminData();
          break;
        default:
          success = true; // Generic integrations don't need sync
      }

      this.updateIntegrationStatus(integrationName, {
        isConnected: success,
        status: success ? 'healthy' : 'warning',
        message: success ? 'Sync completed' : 'Sync failed',
        lastSync: new Date(),
      });

      return success;
    } catch (error) {
      console.error(`Sync failed for ${integrationName}:`, error);
      this.updateIntegrationStatus(integrationName, {
        isConnected: false,
        status: 'error',
        message: `Sync failed: ${error.message}`,
        errorCount: (this.statusCache.get(integrationName)?.errorCount || 0) + 1,
      });
      return false;
    }
  }

  private async syncWeatherData(): Promise<boolean> {
    try {
      // Sync weather data for all team locations
      // This would typically involve getting team locations and syncing weather data
      return true;
    } catch {
      return false;
    }
  }

  private async syncHudlData(): Promise<boolean> {
    try {
      // Sync Hudl data for all connected teams
      // This would involve syncing video metadata and analysis data
      return true;
    } catch {
      return false;
    }
  }

  private async syncFitbitData(): Promise<boolean> {
    try {
      // Sync Fitbit data for all connected players
      // This would involve syncing health and performance metrics
      return true;
    } catch {
      return false;
    }
  }

  private async syncGarminData(): Promise<boolean> {
    try {
      // Sync Garmin data for all connected players
      // This would involve syncing health and performance metrics
      return true;
    } catch {
      return false;
    }
  }

  private updateIntegrationStatus(name: string, updates: Partial<IntegrationStatus>): void {
    const currentStatus = this.statusCache.get(name) || {
      name,
      isEnabled: false,
      isConnected: false,
      lastSync: null,
      errorCount: 0,
      status: 'disconnected',
      message: 'Not configured',
    };

    const updatedStatus = { ...currentStatus, ...updates };
    this.statusCache.set(name, updatedStatus);
  }

  getIntegrationStatus(name: string): IntegrationStatus | undefined {
    return this.statusCache.get(name);
  }

  getAllIntegrationStatuses(): IntegrationStatus[] {
    return Array.from(this.statusCache.values());
  }

  getOverallHealth(): 'healthy' | 'warning' | 'error' {
    const statuses = this.getAllIntegrationStatuses();
    const enabledStatuses = statuses.filter(s => s.isEnabled);
    
    if (enabledStatuses.length === 0) return 'healthy';
    
    const errorCount = enabledStatuses.filter(s => s.status === 'error').length;
    const warningCount = enabledStatuses.filter(s => s.status === 'warning').length;
    
    if (errorCount > 0) return 'error';
    if (warningCount > 0) return 'warning';
    return 'healthy';
  }

  updateMetrics(requestTime: number, success: boolean, cacheHit: boolean): void {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time
    const currentAvg = this.metrics.averageResponseTime;
    const requestCount = this.metrics.totalRequests;
    this.metrics.averageResponseTime = (currentAvg * (requestCount - 1) + requestTime) / requestCount;

    // Update cache hit rate
    const currentCacheHits = this.metrics.cacheHitRate * (this.metrics.totalRequests - 1);
    this.metrics.cacheHitRate = (currentCacheHits + (cacheHit ? 1 : 0)) / this.metrics.totalRequests;

    this.metrics.lastUpdated = new Date();
  }

  getMetrics(): APIMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      lastUpdated: new Date(),
    };
  }

  private startHealthMonitoring(): void {
    // Monitor integration health every 5 minutes
    setInterval(async () => {
      try {
        await this.testAllIntegrations();
      } catch (error) {
        console.error('Health monitoring failed:', error);
      }
    }, 5 * 60 * 1000);
  }

  // Utility methods for common operations
  async getWeatherForLocation(lat: number, lon: number) {
    if (!this.isIntegrationEnabled('weather')) {
      throw new Error('Weather integration is not enabled');
    }
    return weatherAPIService.getCurrentWeather(lat, lon);
  }

  async searchVideos(query: string, platform?: string) {
    if (platform === 'hudl' && this.isIntegrationEnabled('hudl')) {
      return videoAPIService.getHudlVideos('team-id', { query });
    } else if (platform === 'youtube' && this.isIntegrationEnabled('youtube')) {
      return videoAPIService.searchYouTubeVideos(query);
    } else if (platform === 'vimeo' && this.isIntegrationEnabled('vimeo')) {
      return videoAPIService.searchVimeoVideos(query);
    } else {
      // Search across all enabled platforms
      const results = [];
      if (this.isIntegrationEnabled('hudl')) {
        try {
          const hudlResults = await videoAPIService.getHudlVideos('team-id', { query });
          results.push(...hudlResults);
        } catch (error) {
          console.error('Hudl search failed:', error);
        }
      }
      if (this.isIntegrationEnabled('youtube')) {
        try {
          const youtubeResults = await videoAPIService.searchYouTubeVideos(query);
          results.push(...youtubeResults);
        } catch (error) {
          console.error('YouTube search failed:', error);
        }
      }
      return results;
    }
  }

  async getPlayerHealthMetrics(playerId: string, startDate: Date, endDate: Date) {
    const results = [];
    
    if (this.isIntegrationEnabled('fitbit')) {
      try {
        const fitbitMetrics = await wearableAPIService.getHealthMetrics(playerId, startDate, endDate);
        results.push(...fitbitMetrics);
      } catch (error) {
        console.error('Fitbit metrics failed:', error);
      }
    }
    
    if (this.isIntegrationEnabled('garmin')) {
      try {
        const garminMetrics = await wearableAPIService.getHealthMetrics(playerId, startDate, endDate);
        results.push(...garminMetrics);
      } catch (error) {
        console.error('Garmin metrics failed:', error);
      }
    }
    
    return results;
  }

  private isIntegrationEnabled(name: string): boolean {
    const integration = this.integrations.get(name);
    return integration?.isEnabled && integration?.isConnected !== false;
  }

  // Cleanup
  destroy(): void {
    // Stop all auto-sync intervals
    for (const [name] of this.syncIntervals) {
      this.stopAutoSync(name);
    }
    
    // Clear caches
    this.statusCache.clear();
    this.integrations.clear();
  }
}

export const apiIntegrationManager = new APIIntegrationManager();
export default apiIntegrationManager;
