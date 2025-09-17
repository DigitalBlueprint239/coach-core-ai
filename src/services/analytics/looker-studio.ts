import { bigQueryExportService } from './bigquery-export';
import secureLogger from '../../utils/secure-logger';

// Looker Studio configuration
const LOOKER_STUDIO_DASHBOARD_ID = import.meta.env.VITE_LOOKER_STUDIO_DASHBOARD_ID;
const LOOKER_STUDIO_EMBED_URL = import.meta.env.VITE_LOOKER_STUDIO_EMBED_URL;

// KPI interface
export interface KPI {
  name: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  format: 'number' | 'percentage' | 'currency';
  description: string;
}

// Dashboard data interface
export interface DashboardData {
  date: string;
  kpis: KPI[];
  funnelData: {
    pageViews: number;
    signups: number;
    betaActivations: number;
    subscriptions: number;
    conversionRates: {
      signupRate: number;
      betaActivationRate: number;
      subscriptionRate: number;
    };
  };
  trends: {
    pageViews: number[];
    signups: number[];
    subscriptions: number[];
    revenue: number[];
  };
  topEvents: Array<{
    eventName: string;
    count: number;
    percentage: number;
  }>;
  userSegments: Array<{
    segment: string;
    count: number;
    percentage: number;
  }>;
}

// Looker Studio Service
export class LookerStudioService {
  private isInitialized = false;
  private dashboardData: DashboardData | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      this.isInitialized = true;
      secureLogger.info('Looker Studio Service initialized');
    } catch (error) {
      secureLogger.error('Failed to initialize Looker Studio Service', { error });
    }
  }

  // Get dashboard data
  async getDashboardData(
    startDate: string,
    endDate: string,
    granularity: 'daily' | 'weekly' = 'daily'
  ): Promise<DashboardData | null> {
    if (!this.isInitialized) return null;

    try {
      // Get funnel data
      const funnelData = await bigQueryExportService.getFunnelConversionRates(
        startDate,
        endDate
      );

      // Get KPI data
      const kpis = await this.getKPIs(startDate, endDate, granularity);

      // Get trends data
      const trends = await this.getTrendsData(startDate, endDate, granularity);

      // Get top events
      const topEvents = await this.getTopEvents(startDate, endDate);

      // Get user segments
      const userSegments = await this.getUserSegments(startDate, endDate);

      this.dashboardData = {
        date: `${startDate} to ${endDate}`,
        kpis,
        funnelData,
        trends,
        topEvents,
        userSegments,
      };

      return this.dashboardData;
    } catch (error) {
      secureLogger.error('Failed to get dashboard data', { error });
      return null;
    }
  }

  // Get KPIs
  private async getKPIs(
    startDate: string,
    endDate: string,
    granularity: 'daily' | 'weekly'
  ): Promise<KPI[]> {
    try {
      let kpiData;
      
      if (granularity === 'daily') {
        kpiData = await bigQueryExportService.getDailyKPIs(startDate);
      } else {
        kpiData = await bigQueryExportService.getWeeklyKPIs(startDate, endDate);
      }

      // Calculate previous period for comparison
      const previousStartDate = new Date(startDate);
      const previousEndDate = new Date(endDate);
      
      if (granularity === 'daily') {
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
      } else {
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate.setDate(previousEndDate.getDate() - 7);
      }

      let previousKpiData;
      if (granularity === 'daily') {
        previousKpiData = await bigQueryExportService.getDailyKPIs(
          previousStartDate.toISOString().split('T')[0]
        );
      } else {
        previousKpiData = await bigQueryExportService.getWeeklyKPIs(
          previousStartDate.toISOString().split('T')[0],
          previousEndDate.toISOString().split('T')[0]
        );
      }

      // Calculate changes
      const calculateChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const getChangeType = (change: number): 'increase' | 'decrease' | 'neutral' => {
        if (change > 0) return 'increase';
        if (change < 0) return 'decrease';
        return 'neutral';
      };

      return [
        {
          name: 'Page Views',
          value: kpiData.pageViews,
          change: calculateChange(kpiData.pageViews, previousKpiData.pageViews),
          changeType: getChangeType(calculateChange(kpiData.pageViews, previousKpiData.pageViews)),
          format: 'number',
          description: 'Total page views',
        },
        {
          name: 'Unique Users',
          value: kpiData.uniqueUsers,
          change: calculateChange(kpiData.uniqueUsers, previousKpiData.uniqueUsers),
          changeType: getChangeType(calculateChange(kpiData.uniqueUsers, previousKpiData.uniqueUsers)),
          format: 'number',
          description: 'Unique users who visited',
        },
        {
          name: 'Signups',
          value: kpiData.signups,
          change: calculateChange(kpiData.signups, previousKpiData.signups),
          changeType: getChangeType(calculateChange(kpiData.signups, previousKpiData.signups)),
          format: 'number',
          description: 'New user signups',
        },
        {
          name: 'Subscriptions',
          value: kpiData.subscriptions,
          change: calculateChange(kpiData.subscriptions, previousKpiData.subscriptions),
          changeType: getChangeType(calculateChange(kpiData.subscriptions, previousKpiData.subscriptions)),
          format: 'number',
          description: 'New subscriptions',
        },
        {
          name: 'Revenue',
          value: kpiData.revenue,
          change: calculateChange(kpiData.revenue, previousKpiData.revenue),
          changeType: getChangeType(calculateChange(kpiData.revenue, previousKpiData.revenue)),
          format: 'currency',
          description: 'Total revenue generated',
        },
        {
          name: 'Conversion Rate',
          value: kpiData.pageViews > 0 ? (kpiData.signups / kpiData.pageViews) * 100 : 0,
          change: 0, // Will be calculated separately
          changeType: 'neutral',
          format: 'percentage',
          description: 'Signup conversion rate',
        },
        {
          name: 'Avg Session Duration',
          value: kpiData.avgSessionDuration,
          change: calculateChange(kpiData.avgSessionDuration, previousKpiData.avgSessionDuration),
          changeType: getChangeType(calculateChange(kpiData.avgSessionDuration, previousKpiData.avgSessionDuration)),
          format: 'number',
          description: 'Average session duration in seconds',
        },
        {
          name: 'Bounce Rate',
          value: kpiData.bounceRate,
          change: calculateChange(kpiData.bounceRate, previousKpiData.bounceRate),
          changeType: getChangeType(calculateChange(kpiData.bounceRate, previousKpiData.bounceRate)),
          format: 'percentage',
          description: 'Page bounce rate',
        },
      ];
    } catch (error) {
      secureLogger.error('Failed to get KPIs', { error });
      return [];
    }
  }

  // Get trends data
  private async getTrendsData(
    startDate: string,
    endDate: string,
    granularity: 'daily' | 'weekly'
  ): Promise<{
    pageViews: number[];
    signups: number[];
    subscriptions: number[];
    revenue: number[];
  }> {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const trends = {
        pageViews: [] as number[],
        signups: [] as number[],
        subscriptions: [] as number[],
        revenue: [] as number[],
      };

      const current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const kpiData = await bigQueryExportService.getDailyKPIs(dateStr);
        
        trends.pageViews.push(kpiData.pageViews);
        trends.signups.push(kpiData.signups);
        trends.subscriptions.push(kpiData.subscriptions);
        trends.revenue.push(kpiData.revenue);

        current.setDate(current.getDate() + 1);
      }

      return trends;
    } catch (error) {
      secureLogger.error('Failed to get trends data', { error });
      return {
        pageViews: [],
        signups: [],
        subscriptions: [],
        revenue: [],
      };
    }
  }

  // Get top events
  private async getTopEvents(
    startDate: string,
    endDate: string
  ): Promise<Array<{ eventName: string; count: number; percentage: number }>> {
    try {
      const events = await bigQueryExportService.queryEvents(startDate, endDate);
      
      // Count events by name
      const eventCounts: Record<string, number> = {};
      events.forEach(event => {
        eventCounts[event.event_name] = (eventCounts[event.event_name] || 0) + 1;
      });

      const totalEvents = events.length;
      const topEvents = Object.entries(eventCounts)
        .map(([eventName, count]) => ({
          eventName,
          count,
          percentage: (count / totalEvents) * 100,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return topEvents;
    } catch (error) {
      secureLogger.error('Failed to get top events', { error });
      return [];
    }
  }

  // Get user segments
  private async getUserSegments(
    startDate: string,
    endDate: string
  ): Promise<Array<{ segment: string; count: number; percentage: number }>> {
    try {
      const events = await bigQueryExportService.queryEvents(startDate, endDate);
      
      // Count users by subscription tier
      const userTiers: Record<string, Set<string>> = {};
      events.forEach(event => {
        if (event.user_id && event.custom_parameters?.subscription_tier) {
          const tier = event.custom_parameters.subscription_tier;
          if (!userTiers[tier]) {
            userTiers[tier] = new Set();
          }
          userTiers[tier].add(event.user_id);
        }
      });

      const totalUsers = new Set(events.map(e => e.user_id).filter(Boolean)).size;
      const segments = Object.entries(userTiers)
        .map(([tier, userIds]) => ({
          segment: tier,
          count: userIds.size,
          percentage: (userIds.size / totalUsers) * 100,
        }))
        .sort((a, b) => b.count - a.count);

      return segments;
    } catch (error) {
      secureLogger.error('Failed to get user segments', { error });
      return [];
    }
  }

  // Get dashboard embed URL
  getDashboardEmbedUrl(): string | null {
    if (!LOOKER_STUDIO_EMBED_URL) {
      secureLogger.warn('Looker Studio embed URL not configured');
      return null;
    }

    return LOOKER_STUDIO_EMBED_URL;
  }

  // Get dashboard ID
  getDashboardId(): string | null {
    if (!LOOKER_STUDIO_DASHBOARD_ID) {
      secureLogger.warn('Looker Studio dashboard ID not configured');
      return null;
    }

    return LOOKER_STUDIO_DASHBOARD_ID;
  }

  // Export dashboard data to CSV
  exportToCSV(data: DashboardData): string {
    try {
      const csvRows: string[] = [];
      
      // Add KPI data
      csvRows.push('Metric,Value,Change,Change Type,Description');
      data.kpis.forEach(kpi => {
        csvRows.push(`"${kpi.name}","${kpi.value}","${kpi.change}","${kpi.changeType}","${kpi.description}"`);
      });

      // Add funnel data
      csvRows.push('');
      csvRows.push('Funnel Metric,Value,Percentage');
      csvRows.push(`"Page Views","${data.funnelData.pageViews}","100%"`);
      csvRows.push(`"Signups","${data.funnelData.signups}","${data.funnelData.conversionRates.signupRate.toFixed(2)}%"`);
      csvRows.push(`"Beta Activations","${data.funnelData.betaActivations}","${data.funnelData.conversionRates.betaActivationRate.toFixed(2)}%"`);
      csvRows.push(`"Subscriptions","${data.funnelData.subscriptions}","${data.funnelData.conversionRates.subscriptionRate.toFixed(2)}%"`);

      return csvRows.join('\n');
    } catch (error) {
      secureLogger.error('Failed to export dashboard data to CSV', { error });
      return '';
    }
  }

  // Get real-time dashboard data
  async getRealTimeData(): Promise<{
    activeUsers: number;
    pageViews: number;
    events: number;
    topPages: Array<{ page: string; views: number }>;
  }> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const events = await bigQueryExportService.queryEvents(
        oneHourAgo.toISOString().split('T')[0],
        now.toISOString().split('T')[0]
      );

      const activeUsers = new Set(events.map(e => e.user_id).filter(Boolean)).size;
      const pageViews = events.filter(e => e.event_name === 'page_view').length;
      const totalEvents = events.length;

      // Get top pages
      const pageCounts: Record<string, number> = {};
      events
        .filter(e => e.event_name === 'page_view' && e.page_path)
        .forEach(event => {
          pageCounts[event.page_path!] = (pageCounts[event.page_path!] || 0) + 1;
        });

      const topPages = Object.entries(pageCounts)
        .map(([page, views]) => ({ page, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

      return {
        activeUsers,
        pageViews,
        events: totalEvents,
        topPages,
      };
    } catch (error) {
      secureLogger.error('Failed to get real-time data', { error });
      return {
        activeUsers: 0,
        pageViews: 0,
        events: 0,
        topPages: [],
      };
    }
  }
}

// Create singleton instance
export const lookerStudioService = new LookerStudioService();

export default lookerStudioService;
