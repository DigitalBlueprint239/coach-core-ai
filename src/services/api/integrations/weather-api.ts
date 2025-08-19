import apiService from '../api-service';

export interface WeatherData {
  location: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  precipitationType: 'rain' | 'snow' | 'sleet' | 'none';
  visibility: number;
  uvIndex: number;
  condition: string;
  conditionCode: string;
  forecast: WeatherForecast[];
  alerts: WeatherAlert[];
  lastUpdated: Date;
}

export interface WeatherForecast {
  date: Date;
  high: number;
  low: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
  humidity: number;
}

export interface WeatherAlert {
  type: 'warning' | 'watch' | 'advisory';
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  expires: Date;
}

export interface PracticeWeatherRecommendation {
  canPracticeOutdoors: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  alternatives: string[];
  equipmentNeeded: string[];
  safetyNotes: string[];
}

class WeatherAPIService {
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.REACT_APP_OPENWEATHER_API_KEY || '';
    this.baseURL = 'https://api.openweathermap.org/data/2.5';
  }

  async getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
    try {
      const response = await apiService.get(`${this.baseURL}/weather`, {
        lat,
        lon,
        appid: this.apiKey,
        units: 'imperial',
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch weather data');
      }

      return this.transformWeatherData(response.data);
    } catch (error) {
      console.error('Weather API error:', error);
      throw error;
    }
  }

  async getWeatherForecast(lat: number, lon: number, days: number = 5): Promise<WeatherForecast[]> {
    try {
      const response = await apiService.get(`${this.baseURL}/forecast`, {
        lat,
        lon,
        appid: this.apiKey,
        units: 'imperial',
        cnt: days * 8, // 8 forecasts per day
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch forecast data');
      }

      return this.transformForecastData(response.data);
    } catch (error) {
      console.error('Weather forecast API error:', error);
      throw error;
    }
  }

  async getWeatherAlerts(lat: number, lon: number): Promise<WeatherAlert[]> {
    try {
      const response = await apiService.get(`${this.baseURL}/onecall`, {
        lat,
        lon,
        appid: this.apiKey,
        exclude: 'current,minutely,hourly,daily',
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch weather alerts');
      }

      return this.transformAlertData(response.data);
    } catch (error) {
      console.error('Weather alerts API error:', error);
      throw error;
    }
  }

  async getPracticeWeatherRecommendation(
    weather: WeatherData,
    practiceType: string,
    ageGroup: string
  ): Promise<PracticeWeatherRecommendation> {
    const recommendations: string[] = [];
    const alternatives: string[] = [];
    const equipmentNeeded: string[] = [];
    const safetyNotes: string[] = [];

    let canPracticeOutdoors = true;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Temperature checks
    if (weather.temperature < 32) {
      canPracticeOutdoors = false;
      riskLevel = 'high';
      recommendations.push('Move practice indoors due to freezing temperatures');
      alternatives.push('Indoor conditioning', 'Film study', 'Strategy session');
      safetyNotes.push('Risk of hypothermia and frostbite');
    } else if (weather.temperature < 40) {
      riskLevel = 'medium';
      recommendations.push('Limit outdoor practice time and ensure proper warm-up');
      alternatives.push('Short outdoor drills', 'Extended indoor warm-up');
      equipmentNeeded.push('Extra layers', 'Hand warmers');
    } else if (weather.temperature > 95) {
      canPracticeOutdoors = false;
      riskLevel = 'high';
      recommendations.push('Move practice indoors due to extreme heat');
      alternatives.push('Indoor conditioning', 'Pool workout', 'Film study');
      safetyNotes.push('Risk of heat exhaustion and heat stroke');
    } else if (weather.temperature > 85) {
      riskLevel = 'medium';
      recommendations.push('Take frequent water breaks and monitor players');
      alternatives.push('Early morning practice', 'Evening practice');
      equipmentNeeded.push('Extra water', 'Shade structures');
    }

    // Precipitation checks
    if (weather.precipitation > 0.1) {
      if (weather.precipitationType === 'rain' && weather.precipitation < 0.5) {
        riskLevel = Math.max(riskLevel === 'low' ? 'low' : 'medium', riskLevel);
        recommendations.push('Light rain - consider indoor alternatives');
        alternatives.push('Indoor drills', 'Film study');
        equipmentNeeded.push('Towels', 'Indoor facility access');
      } else {
        canPracticeOutdoors = false;
        riskLevel = 'high';
        recommendations.push('Heavy precipitation - move practice indoors');
        alternatives.push('Indoor conditioning', 'Strategy session');
        safetyNotes.push('Slippery conditions and poor visibility');
      }
    }

    // Wind checks
    if (weather.windSpeed > 25) {
      riskLevel = Math.max(riskLevel === 'low' ? 'medium' : 'high', riskLevel);
      recommendations.push('High winds - limit outdoor activities');
      alternatives.push('Indoor drills', 'Weight training');
      safetyNotes.push('Risk of flying debris and poor ball control');
    }

    // Visibility checks
    if (weather.visibility < 5) {
      riskLevel = Math.max(riskLevel === 'low' ? 'medium' : 'high', riskLevel);
      recommendations.push('Poor visibility - consider indoor alternatives');
      alternatives.push('Indoor conditioning', 'Film study');
      safetyNotes.push('Safety risk due to poor visibility');
    }

    // Age-specific considerations
    if (ageGroup === 'youth' || ageGroup === 'middle-school') {
      if (riskLevel === 'medium') {
        riskLevel = 'high';
        recommendations.push('Youth players require extra safety precautions');
        alternatives.push('Indoor activities', 'Modified outdoor drills');
      }
    }

    return {
      canPracticeOutdoors,
      riskLevel,
      recommendations,
      alternatives,
      equipmentNeeded,
      safetyNotes,
    };
  }

  async getLocationFromCoordinates(lat: number, lon: number): Promise<string> {
    try {
      const response = await apiService.get(`${this.baseURL}/reverse`, {
        lat,
        lon,
        appid: this.apiKey,
        limit: 1,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch location data');
      }

      const location = response.data[0];
      return `${location.name}, ${location.state || ''}, ${location.country}`.trim();
    } catch (error) {
      console.error('Geocoding API error:', error);
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  }

  private transformWeatherData(data: any): WeatherData {
    return {
      location: data.name || 'Unknown',
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed),
      windDirection: this.getWindDirection(data.wind.deg),
      precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
      precipitationType: this.getPrecipitationType(data.weather[0].id),
      visibility: Math.round(data.visibility / 1609.34), // Convert meters to miles
      uvIndex: 0, // Not available in current weather API
      condition: data.weather[0].main,
      conditionCode: data.weather[0].id.toString(),
      forecast: [], // Will be populated separately
      alerts: [], // Will be populated separately
      lastUpdated: new Date(),
    };
  }

  private transformForecastData(data: any): WeatherForecast[] {
    const forecasts: WeatherForecast[] = [];
    const dailyData = new Map<string, any>();

    // Group forecasts by day
    data.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000);
      const dayKey = date.toDateString();
      
      if (!dailyData.has(dayKey)) {
        dailyData.set(dayKey, {
          date,
          high: item.main.temp_max,
          low: item.main.temp_min,
          condition: item.weather[0].main,
          precipitation: item.rain?.['3h'] || item.snow?.['3h'] || 0,
          windSpeed: item.wind.speed,
          humidity: item.main.humidity,
        });
      } else {
        const existing = dailyData.get(dayKey);
        existing.high = Math.max(existing.high, item.main.temp_max);
        existing.low = Math.min(existing.low, item.main.temp_min);
        existing.precipitation += item.rain?.['3h'] || item.snow?.['3h'] || 0;
      }
    });

    // Convert to array and sort by date
    dailyData.forEach((forecast) => {
      forecasts.push({
        ...forecast,
        precipitation: Math.round(forecast.precipitation * 100) / 100,
        windSpeed: Math.round(forecast.windSpeed),
      });
    });

    return forecasts.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private transformAlertData(data: any): WeatherAlert[] {
    if (!data.alerts) return [];

    return data.alerts.map((alert: any) => ({
      type: this.getAlertType(alert.event),
      title: alert.event,
      description: alert.description,
      severity: this.getAlertSeverity(alert.severity),
      expires: new Date(alert.end * 1000),
    }));
  }

  private getWindDirection(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  private getPrecipitationType(weatherId: number): 'rain' | 'snow' | 'sleet' | 'none' {
    if (weatherId >= 200 && weatherId < 300) return 'rain';
    if (weatherId >= 300 && weatherId < 400) return 'rain';
    if (weatherId >= 500 && weatherId < 600) return 'rain';
    if (weatherId >= 600 && weatherId < 700) return 'snow';
    if (weatherId >= 700 && weatherId < 800) return 'sleet';
    return 'none';
  }

  private getAlertType(event: string): 'warning' | 'watch' | 'advisory' {
    const eventLower = event.toLowerCase();
    if (eventLower.includes('warning')) return 'warning';
    if (eventLower.includes('watch')) return 'watch';
    return 'advisory';
  }

  private getAlertSeverity(severity: string): 'minor' | 'moderate' | 'severe' | 'extreme' {
    const severityLower = severity.toLowerCase();
    if (severityLower.includes('extreme')) return 'extreme';
    if (severityLower.includes('severe')) return 'severe';
    if (severityLower.includes('moderate')) return 'moderate';
    return 'minor';
  }
}

export const weatherAPIService = new WeatherAPIService();
export default weatherAPIService;
