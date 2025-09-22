# 🚀 **Coach Core API Integrations Guide**

## **Overview**

Coach Core now includes a comprehensive API integration framework that enables seamless connectivity with third-party services, enhancing the platform's capabilities and providing coaches with access to external data sources and tools.

---

## **🏗️ Architecture Overview**

### **Core Components**

1. **APIService** (`src/services/api/api-service.ts`)
   - Central HTTP client with authentication, caching, and retry logic
   - Request/response management and error handling
   - Automatic token refresh and request queuing

2. **API Integration Manager** (`src/services/api/api-integration-manager.ts`)
   - Coordinates all third-party integrations
   - Health monitoring and auto-sync management
   - Unified interface for integration operations

3. **Specialized Integration Services**
   - Weather API integration
   - Video platform integrations (Hudl, YouTube, Vimeo)
   - Wearable device integrations (Fitbit, Garmin, Apple HealthKit, Google Fit)

4. **Integration Dashboard** (`src/components/API/APIIntegrationDashboard.tsx`)
   - Visual management interface for all integrations
   - Real-time status monitoring and configuration
   - Performance metrics and health reporting

---

## **🌤️ Weather API Integration**

### **Features**
- **Current Weather Data**: Temperature, humidity, wind, precipitation
- **Forecast Data**: 5-day weather predictions
- **Weather Alerts**: Severe weather notifications
- **Practice Recommendations**: Automatic indoor/outdoor practice suggestions
- **Safety Assessments**: Age-appropriate weather risk evaluation

### **Setup**
```bash
# Add to .env.local
REACT_APP_OPENWEATHER_API_KEY=your_openweather_api_key_here
```

### **Usage Examples**

#### **Get Current Weather**
```typescript
import weatherAPIService from './services/api/integrations/weather-api';

// Get current weather for a location
const weather = await weatherAPIService.getCurrentWeather(40.7128, -74.0060);
console.log(`Current temperature: ${weather.temperature}°F`);
```

#### **Get Practice Weather Recommendations**
```typescript
// Get practice recommendations based on weather
const recommendation = await weatherAPIService.getPracticeWeatherRecommendation(
  weather,
  'practice',
  'youth'
);

if (!recommendation.canPracticeOutdoors) {
  console.log('Move practice indoors:', recommendation.recommendations);
}
```

#### **Weather Forecast**
```typescript
// Get 5-day forecast
const forecast = await weatherAPIService.getWeatherForecast(40.7128, -74.0060, 5);
forecast.forEach(day => {
  console.log(`${day.date.toDateString()}: High ${day.high}°F, Low ${day.low}°F`);
});
```

---

## **🎥 Video Platform Integrations**

### **Supported Platforms**

#### **Hudl Integration**
- **Features**: Team video management, play analysis, performance review
- **Setup**: Requires Hudl API key and team authentication
- **Use Cases**: Game film analysis, play design, player development

#### **YouTube Integration**
- **Features**: Video search, metadata retrieval, content discovery
- **Setup**: Requires YouTube Data API v3 key
- **Use Cases**: Training videos, technique demonstrations, motivational content

#### **Vimeo Integration**
- **Features**: Professional video hosting, high-quality streaming
- **Setup**: Requires Vimeo access token
- **Use Cases**: Team highlights, coaching presentations, recruitment videos

### **Setup**
```bash
# Add to .env.local
REACT_APP_HUDL_API_KEY=your_hudl_api_key_here
REACT_APP_YOUTUBE_API_KEY=your_youtube_api_key_here
REACT_APP_VIMEO_API_KEY=your_vimeo_access_token_here
```

### **Usage Examples**

#### **Search Across All Platforms**
```typescript
import apiIntegrationManager from './services/api/api-integration-manager';

// Search for videos across all connected platforms
const videos = await apiIntegrationManager.searchVideos('quarterback technique');

// Search specific platform
const hudlVideos = await apiIntegrationManager.searchVideos('quarterback technique', 'hudl');
```

#### **Upload to Hudl**
```typescript
import videoAPIService from './services/api/integrations/video-api';

const uploadOptions = {
  title: 'Week 3 Game Highlights',
  description: 'Best plays from our victory over Central High',
  tags: ['highlights', 'game', 'week3'],
  categories: ['game-film'],
  privacy: 'team-only',
  allowComments: true,
  allowDownloads: false,
  autoGenerateThumbnail: true,
};

const video = await videoAPIService.uploadToHudl(
  videoFile,
  'team-123',
  uploadOptions
);
```

#### **Create Video Analysis**
```typescript
const analysis = await videoAPIService.createVideoAnalysis({
  videoId: 'video-123',
  analysisType: 'play-review',
  timestamp: 45.2,
  duration: 15.0,
  notes: 'Excellent route running and separation',
  drawings: [
    {
      type: 'arrow',
      x: 100,
      y: 150,
      color: '#00ff00',
      timestamp: 45.2,
    }
  ],
  ratings: [
    {
      category: 'route-running',
      score: 9,
      maxScore: 10,
      notes: 'Perfect route execution',
    }
  ],
  tags: ['route-running', 'separation', 'technique'],
});
```

---

## **⌚ Wearable Device Integrations**

### **Supported Platforms**

#### **Fitbit Integration**
- **Features**: Heart rate monitoring, sleep tracking, activity metrics
- **Setup**: OAuth 2.0 flow with Fitbit API
- **Use Cases**: Player health monitoring, recovery assessment, performance optimization

#### **Garmin Integration**
- **Features**: GPS tracking, workout analysis, health metrics
- **Setup**: Garmin Connect API with consumer key
- **Use Cases**: Training load monitoring, injury prevention, performance tracking

#### **Apple HealthKit Integration**
- **Features**: Comprehensive health data, privacy-focused, iOS ecosystem
- **Setup**: Native iOS integration with HealthKit framework
- **Use Cases**: Player health profiles, medical data integration, wellness tracking

#### **Google Fit Integration**
- **Features**: Cross-platform health data, Android ecosystem
- **Setup**: Google Fit API with OAuth 2.0
- **Use Cases**: Multi-device health tracking, team health analytics

### **Setup**
```bash
# Add to .env.local
REACT_APP_FITBIT_CLIENT_ID=your_fitbit_client_id_here
REACT_APP_GARMIN_CONSUMER_KEY=your_garmin_consumer_key_here
REACT_APP_APPLE_HEALTH_KIT=true
REACT_APP_GOOGLE_FIT=true
```

### **Usage Examples**

#### **Connect Fitbit Device**
```typescript
import wearableAPIService from './services/api/integrations/wearable-api';

// Connect player's Fitbit account
const device = await wearableAPIService.connectFitbit(
  'player-123',
  'auth_code_from_oauth_flow'
);
```

#### **Get Health Metrics**
```typescript
// Get player health metrics for a date range
const metrics = await wearableAPIService.getHealthMetrics(
  'player-123',
  new Date('2024-01-01'),
  new Date('2024-01-31'),
  ['heartRate', 'sleep', 'activity']
);

metrics.forEach(metric => {
  console.log(`Heart Rate: ${metric.heartRate.current} bpm`);
  console.log(`Sleep Quality: ${metric.sleep.quality}`);
  console.log(`Steps: ${metric.steps}`);
});
```

#### **Get Performance Metrics**
```typescript
// Get player readiness and recovery scores
const performance = await wearableAPIService.getPerformanceMetrics(
  'player-123',
  new Date()
);

console.log(`Readiness Score: ${performance.readiness.score}/100`);
console.log(`Recovery Score: ${performance.recovery.score}/100`);
console.log(`Injury Risk: ${performance.risk.injuryRisk}`);
```

#### **Team Performance Overview**
```typescript
// Get team-wide performance metrics
const teamOverview = await wearableAPIService.getTeamPerformanceOverview(
  'team-123',
  new Date()
);

console.log(`Average Readiness: ${teamOverview.averageReadiness}`);
console.log(`Players at Risk: ${teamOverview.playersAtRisk}`);
console.log('Recommendations:', teamOverview.recommendations);
```

---

## **🔧 API Integration Manager**

### **Features**
- **Centralized Management**: Single interface for all integrations
- **Health Monitoring**: Automatic status checking and error tracking
- **Auto-Sync**: Configurable data synchronization intervals
- **Performance Metrics**: Request tracking and cache statistics
- **Error Handling**: Retry logic and graceful degradation

### **Usage Examples**

#### **Test Integration Health**
```typescript
import apiIntegrationManager from './services/api/api-integration-manager';

// Test all integrations
const results = await apiIntegrationManager.testAllIntegrations();
results.forEach((success, name) => {
  console.log(`${name}: ${success ? '✅' : '❌'}`);
});

// Test specific integration
const isHealthy = await apiIntegrationManager.testIntegration('weather');
```

#### **Get Integration Status**
```typescript
// Get status of all integrations
const statuses = apiIntegrationManager.getAllIntegrationStatuses();
statuses.forEach(status => {
  console.log(`${status.name}: ${status.status} - ${status.message}`);
});

// Get overall system health
const health = apiIntegrationManager.getOverallHealth();
console.log(`System Health: ${health}`);
```

#### **Configure Integration**
```typescript
// Update integration configuration
apiIntegrationManager.updateIntegration('weather', {
  autoSync: true,
  syncInterval: 15, // 15 minutes
  timeout: 15000, // 15 seconds
});
```

---

## **📊 Integration Dashboard**

### **Features**
- **Real-time Monitoring**: Live status updates and health indicators
- **Configuration Management**: Easy setup and modification of integrations
- **Performance Analytics**: Request metrics and cache statistics
- **Health Alerts**: Visual indicators for integration issues
- **Quick Actions**: One-click testing and synchronization

### **Access**
Navigate to the API Integration Dashboard through the main navigation or access it directly at the `/api-integrations` route.

---

## **🔐 Security & Authentication**

### **API Key Management**
- Store API keys in environment variables
- Never commit keys to version control
- Use different keys for development and production
- Implement key rotation policies

### **OAuth 2.0 Flows**
- Fitbit, Garmin, and Google Fit use OAuth 2.0
- Implement proper state parameter validation
- Store refresh tokens securely
- Handle token expiration gracefully

### **Data Privacy**
- Implement data retention policies
- Provide user consent mechanisms
- Follow GDPR and CCPA requirements
- Encrypt sensitive data in transit and at rest

---

## **📈 Performance & Optimization**

### **Caching Strategy**
- **API Response Caching**: 5-minute cache for GET requests
- **Request Deduplication**: Prevent duplicate simultaneous requests
- **Smart Cache Invalidation**: Update cache on data changes

### **Rate Limiting**
- Respect API provider rate limits
- Implement exponential backoff for retries
- Queue requests when limits are exceeded

### **Error Handling**
- **Retry Logic**: Automatic retry for network failures
- **Graceful Degradation**: Continue operation when integrations fail
- **User Feedback**: Clear error messages and recovery suggestions

---

## **🚀 Getting Started**

### **1. Environment Setup**
```bash
# Copy environment template
cp .env.example .env.local

# Add your API keys
REACT_APP_OPENWEATHER_API_KEY=your_key_here
REACT_APP_HUDL_API_KEY=your_key_here
REACT_APP_YOUTUBE_API_KEY=your_key_here
REACT_APP_FITBIT_CLIENT_ID=your_client_id_here
REACT_APP_GARMIN_CONSUMER_KEY=your_key_here
```

### **2. Test Integrations**
```typescript
// Test all integrations
await apiIntegrationManager.testAllIntegrations();

// Check system health
const health = apiIntegrationManager.getOverallHealth();
console.log(`System Health: ${health}`);
```

### **3. Configure Auto-Sync**
```typescript
// Enable auto-sync for weather data
apiIntegrationManager.updateIntegration('weather', {
  autoSync: true,
  syncInterval: 30, // 30 minutes
});
```

### **4. Monitor Performance**
```typescript
// Get performance metrics
const metrics = apiIntegrationManager.getMetrics();
console.log(`Success Rate: ${(metrics.successfulRequests / metrics.totalRequests * 100).toFixed(1)}%`);
```

---

## **🔍 Troubleshooting**

### **Common Issues**

#### **Integration Not Connecting**
- Verify API keys are correct
- Check network connectivity
- Ensure API quotas haven't been exceeded
- Review API provider status pages

#### **Data Sync Failures**
- Check integration health status
- Verify authentication tokens are valid
- Review error logs for specific failure reasons
- Test individual integration endpoints

#### **Performance Issues**
- Monitor request response times
- Check cache hit rates
- Review API provider rate limits
- Optimize request frequency

### **Debug Mode**
```typescript
// Enable detailed logging
apiIntegrationManager.updateConfig({
  enableCaching: false, // Disable cache for debugging
});

// Get detailed integration status
const status = apiIntegrationManager.getIntegrationStatus('weather');
console.log('Detailed Status:', status);
```

---

## **📚 API Reference**

### **Core Services**
- **APIService**: Base HTTP client with authentication and caching
- **WeatherAPIService**: Weather data and practice recommendations
- **VideoAPIService**: Multi-platform video management
- **WearableAPIService**: Health and fitness data integration

### **Manager Interface**
- **APIIntegrationManager**: Central coordination and monitoring
- **Integration Configuration**: Setup and customization
- **Health Monitoring**: Status tracking and alerts
- **Performance Metrics**: Analytics and optimization

---

## **🔮 Future Enhancements**

### **Planned Integrations**
- **Social Media**: Twitter, Instagram, Facebook integration
- **Communication**: Slack, Microsoft Teams, Discord
- **Analytics**: Google Analytics, Mixpanel, Amplitude
- **Storage**: AWS S3, Google Cloud Storage, Dropbox

### **Advanced Features**
- **AI-Powered Insights**: Machine learning for data analysis
- **Predictive Analytics**: Performance forecasting and risk assessment
- **Real-time Collaboration**: Live data sharing and team coordination
- **Mobile SDKs**: Native mobile app integrations

---

## **📞 Support & Resources**

### **Documentation**
- [API Integration Manager API Reference](./API_REFERENCE.md)
- [Integration Setup Guides](./SETUP_GUIDES.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

### **Community**
- [GitHub Issues](https://github.com/coachcore/app/issues)
- [Discord Community](https://discord.gg/coachcore)
- [Developer Forum](https://forum.coachcore.com)

### **Support**
- **Email**: api-support@coachcore.com
- **Slack**: #api-integrations channel
- **Documentation**: https://docs.coachcore.com/api

---

## **🎯 Conclusion**

The Coach Core API integration framework provides coaches with unprecedented access to external data sources and tools, enabling:

- **Better Practice Planning**: Weather-aware scheduling and recommendations
- **Enhanced Video Analysis**: Multi-platform film review and sharing
- **Comprehensive Health Monitoring**: Wearable device integration for player wellness
- **Seamless Data Flow**: Automatic synchronization and real-time updates
- **Professional Tools**: Enterprise-grade integration management

This framework positions Coach Core as the most connected and data-rich coaching platform available, giving coaches the tools they need to make informed decisions and optimize team performance.

**Ready to integrate?** Start with the weather API for immediate practice planning benefits, then expand to video platforms and wearable devices as your needs grow.
