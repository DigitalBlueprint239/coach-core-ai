import secureLogger from '../../utils/secure-logger';

// BigQuery import with conditional loading
let BigQuery: any = null;
if (typeof window === 'undefined') {
  // Only import on server-side
  try {
    BigQuery = require('@google-cloud/bigquery').BigQuery;
  } catch (error) {
    secureLogger.warn('BigQuery not available in this environment');
  }
}

// BigQuery configuration
const BIGQUERY_PROJECT_ID = import.meta.env.VITE_BIGQUERY_PROJECT_ID;
const BIGQUERY_DATASET_ID = import.meta.env.VITE_BIGQUERY_DATASET_ID || 'coach_core_analytics';
const BIGQUERY_TABLE_ID = import.meta.env.VITE_BIGQUERY_TABLE_ID || 'events';

// BigQuery client
let bigquery: any = null;

// Initialize BigQuery
const initializeBigQuery = (): any => {
  try {
    if (!BIGQUERY_PROJECT_ID) {
      secureLogger.warn('BigQuery Project ID not found, export disabled');
      return null;
    }

    if (!BigQuery) {
      secureLogger.warn('BigQuery not available in this environment');
      return null;
    }

    bigquery = new BigQuery({
      projectId: BIGQUERY_PROJECT_ID,
    });

    secureLogger.info('BigQuery initialized', { projectId: BIGQUERY_PROJECT_ID });
    return bigquery;
  } catch (error) {
    secureLogger.error('Failed to initialize BigQuery', { error });
    return null;
  }
};

// Event schema for BigQuery
export interface BigQueryEvent {
  event_name: string;
  event_category: string;
  event_label?: string;
  value?: number;
  user_id?: string;
  session_id?: string;
  timestamp: string;
  page_title?: string;
  page_path?: string;
  page_location?: string;
  user_agent?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  custom_parameters?: Record<string, any>;
  created_at: string;
}

// BigQuery Export Service
export class BigQueryExportService {
  private bigquery: any = null;
  private isInitialized = false;
  private eventBuffer: BigQueryEvent[] = [];
  private bufferSize = 100; // Buffer size before batch insert
  private flushInterval = 30000; // 30 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      this.bigquery = initializeBigQuery();
      this.isInitialized = !!this.bigquery;
      
      if (this.isInitialized) {
        this.startFlushTimer();
        this.createTableIfNotExists();
      }
    } catch (error) {
      secureLogger.error('Failed to initialize BigQuery Export Service', { error });
    }
  }

  // Create table if it doesn't exist
  private async createTableIfNotExists(): Promise<void> {
    if (!this.bigquery) return;

    try {
      const dataset = this.bigquery.dataset(BIGQUERY_DATASET_ID);
      const table = dataset.table(BIGQUERY_TABLE_ID);

      const [exists] = await table.exists();
      if (exists) {
        secureLogger.info('BigQuery table already exists', { tableId: BIGQUERY_TABLE_ID });
        return;
      }

      const schema = [
        { name: 'event_name', type: 'STRING', mode: 'REQUIRED' },
        { name: 'event_category', type: 'STRING', mode: 'REQUIRED' },
        { name: 'event_label', type: 'STRING', mode: 'NULLABLE' },
        { name: 'value', type: 'FLOAT', mode: 'NULLABLE' },
        { name: 'user_id', type: 'STRING', mode: 'NULLABLE' },
        { name: 'session_id', type: 'STRING', mode: 'NULLABLE' },
        { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
        { name: 'page_title', type: 'STRING', mode: 'NULLABLE' },
        { name: 'page_path', type: 'STRING', mode: 'NULLABLE' },
        { name: 'page_location', type: 'STRING', mode: 'NULLABLE' },
        { name: 'user_agent', type: 'STRING', mode: 'NULLABLE' },
        { name: 'device_type', type: 'STRING', mode: 'NULLABLE' },
        { name: 'browser', type: 'STRING', mode: 'NULLABLE' },
        { name: 'os', type: 'STRING', mode: 'NULLABLE' },
        { name: 'country', type: 'STRING', mode: 'NULLABLE' },
        { name: 'city', type: 'STRING', mode: 'NULLABLE' },
        { name: 'custom_parameters', type: 'JSON', mode: 'NULLABLE' },
        { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
      ];

      await table.create({ schema });
      secureLogger.info('BigQuery table created', { tableId: BIGQUERY_TABLE_ID });
    } catch (error) {
      secureLogger.error('Failed to create BigQuery table', { error });
    }
  }

  // Start flush timer
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  // Stop flush timer
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // Add event to buffer
  addEvent(event: Omit<BigQueryEvent, 'created_at'>): void {
    if (!this.isInitialized) return;

    try {
      const bigQueryEvent: BigQueryEvent = {
        ...event,
        created_at: new Date().toISOString(),
      };

      this.eventBuffer.push(bigQueryEvent);

      // Flush if buffer is full
      if (this.eventBuffer.length >= this.bufferSize) {
        this.flush();
      }
    } catch (error) {
      secureLogger.error('Failed to add event to buffer', { error });
    }
  }

  // Flush events to BigQuery
  async flush(): Promise<void> {
    if (!this.isInitialized || this.eventBuffer.length === 0) return;

    try {
      const events = [...this.eventBuffer];
      this.eventBuffer = [];

      await this.insertEvents(events);
      secureLogger.info('Events flushed to BigQuery', { count: events.length });
    } catch (error) {
      secureLogger.error('Failed to flush events to BigQuery', { error });
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...this.eventBuffer);
    }
  }

  // Insert events into BigQuery
  private async insertEvents(events: BigQueryEvent[]): Promise<void> {
    if (!this.bigquery) return;

    try {
      const dataset = this.bigquery.dataset(BIGQUERY_DATASET_ID);
      const table = dataset.table(BIGQUERY_TABLE_ID);

      await table.insert(events);
    } catch (error) {
      secureLogger.error('Failed to insert events into BigQuery', { error });
      throw error;
    }
  }

  // Export single event immediately
  async exportEvent(event: Omit<BigQueryEvent, 'created_at'>): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const bigQueryEvent: BigQueryEvent = {
        ...event,
        created_at: new Date().toISOString(),
      };

      await this.insertEvents([bigQueryEvent]);
      secureLogger.info('Event exported to BigQuery', { eventName: event.event_name });
    } catch (error) {
      secureLogger.error('Failed to export event to BigQuery', { error });
    }
  }

  // Query events from BigQuery
  async queryEvents(
    startDate: string,
    endDate: string,
    eventName?: string,
    userId?: string
  ): Promise<BigQueryEvent[]> {
    if (!this.bigquery) return [];

    try {
      let query = `
        SELECT *
        FROM \`${BIGQUERY_PROJECT_ID}.${BIGQUERY_DATASET_ID}.${BIGQUERY_TABLE_ID}\`
        WHERE timestamp BETWEEN '${startDate}' AND '${endDate}'
      `;

      if (eventName) {
        query += ` AND event_name = '${eventName}'`;
      }

      if (userId) {
        query += ` AND user_id = '${userId}'`;
      }

      query += ` ORDER BY timestamp DESC`;

      const [rows] = await this.bigquery.query(query);
      return rows as BigQueryEvent[];
    } catch (error) {
      secureLogger.error('Failed to query events from BigQuery', { error });
      return [];
    }
  }

  // Get funnel conversion rates
  async getFunnelConversionRates(
    startDate: string,
    endDate: string
  ): Promise<{
    pageViews: number;
    signups: number;
    betaActivations: number;
    subscriptions: number;
    conversionRates: {
      signupRate: number;
      betaActivationRate: number;
      subscriptionRate: number;
    };
  }> {
    if (!this.bigquery) {
      return {
        pageViews: 0,
        signups: 0,
        betaActivations: 0,
        subscriptions: 0,
        conversionRates: {
          signupRate: 0,
          betaActivationRate: 0,
          subscriptionRate: 0,
        },
      };
    }

    try {
      const query = `
        SELECT
          COUNTIF(event_name = 'page_view') as page_views,
          COUNTIF(event_name = 'signup_completed') as signups,
          COUNTIF(event_name = 'beta_activated') as beta_activations,
          COUNTIF(event_name = 'subscription_started') as subscriptions
        FROM \`${BIGQUERY_PROJECT_ID}.${BIGQUERY_DATASET_ID}.${BIGQUERY_TABLE_ID}\`
        WHERE timestamp BETWEEN '${startDate}' AND '${endDate}'
      `;

      const [rows] = await this.bigquery.query(query);
      const result = rows[0] as any;

      const pageViews = result.page_views || 0;
      const signups = result.signups || 0;
      const betaActivations = result.beta_activations || 0;
      const subscriptions = result.subscriptions || 0;

      return {
        pageViews,
        signups,
        betaActivations,
        subscriptions,
        conversionRates: {
          signupRate: pageViews > 0 ? (signups / pageViews) * 100 : 0,
          betaActivationRate: signups > 0 ? (betaActivations / signups) * 100 : 0,
          subscriptionRate: betaActivations > 0 ? (subscriptions / betaActivations) * 100 : 0,
        },
      };
    } catch (error) {
      secureLogger.error('Failed to get funnel conversion rates', { error });
      return {
        pageViews: 0,
        signups: 0,
        betaActivations: 0,
        subscriptions: 0,
        conversionRates: {
          signupRate: 0,
          betaActivationRate: 0,
          subscriptionRate: 0,
        },
      };
    }
  }

  // Get daily KPIs
  async getDailyKPIs(date: string): Promise<{
    date: string;
    pageViews: number;
    uniqueUsers: number;
    signups: number;
    subscriptions: number;
    revenue: number;
    avgSessionDuration: number;
    bounceRate: number;
  }> {
    if (!this.bigquery) {
      return {
        date,
        pageViews: 0,
        uniqueUsers: 0,
        signups: 0,
        subscriptions: 0,
        revenue: 0,
        avgSessionDuration: 0,
        bounceRate: 0,
      };
    }

    try {
      const query = `
        SELECT
          COUNTIF(event_name = 'page_view') as page_views,
          COUNT(DISTINCT user_id) as unique_users,
          COUNTIF(event_name = 'signup_completed') as signups,
          COUNTIF(event_name = 'subscription_started') as subscriptions,
          SUM(IF(event_name = 'subscription_started', value, 0)) as revenue,
          AVG(IF(event_name = 'page_view', 
            TIMESTAMP_DIFF(TIMESTAMP(MAX(timestamp)), TIMESTAMP(MIN(timestamp)), SECOND), 
            NULL
          )) as avg_session_duration,
          COUNTIF(event_name = 'page_view' AND custom_parameters.bounce = true) / 
            NULLIF(COUNTIF(event_name = 'page_view'), 0) * 100 as bounce_rate
        FROM \`${BIGQUERY_PROJECT_ID}.${BIGQUERY_DATASET_ID}.${BIGQUERY_TABLE_ID}\`
        WHERE DATE(timestamp) = '${date}'
      `;

      const [rows] = await this.bigquery.query(query);
      const result = rows[0] as any;

      return {
        date,
        pageViews: result.page_views || 0,
        uniqueUsers: result.unique_users || 0,
        signups: result.signups || 0,
        subscriptions: result.subscriptions || 0,
        revenue: result.revenue || 0,
        avgSessionDuration: result.avg_session_duration || 0,
        bounceRate: result.bounce_rate || 0,
      };
    } catch (error) {
      secureLogger.error('Failed to get daily KPIs', { error });
      return {
        date,
        pageViews: 0,
        uniqueUsers: 0,
        signups: 0,
        subscriptions: 0,
        revenue: 0,
        avgSessionDuration: 0,
        bounceRate: 0,
      };
    }
  }

  // Get weekly KPIs
  async getWeeklyKPIs(startDate: string, endDate: string): Promise<{
    week: string;
    pageViews: number;
    uniqueUsers: number;
    signups: number;
    subscriptions: number;
    revenue: number;
    avgSessionDuration: number;
    bounceRate: number;
  }> {
    if (!this.bigquery) {
      return {
        week: `${startDate} to ${endDate}`,
        pageViews: 0,
        uniqueUsers: 0,
        signups: 0,
        subscriptions: 0,
        revenue: 0,
        avgSessionDuration: 0,
        bounceRate: 0,
      };
    }

    try {
      const query = `
        SELECT
          COUNTIF(event_name = 'page_view') as page_views,
          COUNT(DISTINCT user_id) as unique_users,
          COUNTIF(event_name = 'signup_completed') as signups,
          COUNTIF(event_name = 'subscription_started') as subscriptions,
          SUM(IF(event_name = 'subscription_started', value, 0)) as revenue,
          AVG(IF(event_name = 'page_view', 
            TIMESTAMP_DIFF(TIMESTAMP(MAX(timestamp)), TIMESTAMP(MIN(timestamp)), SECOND), 
            NULL
          )) as avg_session_duration,
          COUNTIF(event_name = 'page_view' AND custom_parameters.bounce = true) / 
            NULLIF(COUNTIF(event_name = 'page_view'), 0) * 100 as bounce_rate
        FROM \`${BIGQUERY_PROJECT_ID}.${BIGQUERY_DATASET_ID}.${BIGQUERY_TABLE_ID}\`
        WHERE timestamp BETWEEN '${startDate}' AND '${endDate}'
      `;

      const [rows] = await this.bigquery.query(query);
      const result = rows[0] as any;

      return {
        week: `${startDate} to ${endDate}`,
        pageViews: result.page_views || 0,
        uniqueUsers: result.unique_users || 0,
        signups: result.signups || 0,
        subscriptions: result.subscriptions || 0,
        revenue: result.revenue || 0,
        avgSessionDuration: result.avg_session_duration || 0,
        bounceRate: result.bounce_rate || 0,
      };
    } catch (error) {
      secureLogger.error('Failed to get weekly KPIs', { error });
      return {
        week: `${startDate} to ${endDate}`,
        pageViews: 0,
        uniqueUsers: 0,
        signups: 0,
        subscriptions: 0,
        revenue: 0,
        avgSessionDuration: 0,
        bounceRate: 0,
      };
    }
  }

  // Cleanup
  destroy(): void {
    this.stopFlushTimer();
    this.flush(); // Flush remaining events
  }
}

// Create singleton instance
export const bigQueryExportService = new BigQueryExportService();

export default bigQueryExportService;
