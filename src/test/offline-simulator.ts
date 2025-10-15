import { aiServiceFactory, AIServiceFactory, AIServiceType } from '../services/ai/ai-service-factory';

export type NetworkMode = 'online' | 'offline' | 'flaky' | 'slow';

interface SimulatedResponse<T> {
  run: () => Promise<T>;
}

interface QueueLogEntry {
  timestamp: number;
  action: 'queue' | 'process' | 'skip' | 'drop';
  requestId: string;
  metadata?: Record<string, unknown>;
}

const QUEUE_LOG_KEY = 'offline-simulator-queue-log';

const readQueueLog = (): QueueLogEntry[] => {
  try {
    const stored = localStorage.getItem(QUEUE_LOG_KEY);
    return stored ? (JSON.parse(stored) as QueueLogEntry[]) : [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[OfflineSimulator] Unable to read queue log:', error);
    return [];
  }
};

const appendQueueLog = (entry: QueueLogEntry) => {
  const current = readQueueLog();
  current.push(entry);
  try {
    localStorage.setItem(QUEUE_LOG_KEY, JSON.stringify(current));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[OfflineSimulator] Unable to persist queue log:', error);
  }
};

class OfflineSimulator {
  private mode: NetworkMode = 'online';

  private failureRate = 0;

  private latencyRange: [number, number] = [0, 0];

  private originalFactory: AIServiceFactory | null = null;

  private reinstallFactory() {
    if (this.originalFactory) {
      (aiServiceFactory as unknown as { config: unknown }).config = this.originalFactory.getConfig();
    }
  }

  goOffline(): void {
    this.mode = 'offline';
  }

  goOnline(): void {
    this.mode = 'online';
    this.failureRate = 0;
    this.latencyRange = [0, 0];
    this.reinstallFactory();
  }

  simulateFlaky(failureRate: number): void {
    this.mode = 'flaky';
    this.failureRate = Math.min(Math.max(failureRate, 0), 1);
  }

  simulateLatency(minMs: number, maxMs: number): void {
    this.mode = 'slow';
    this.latencyRange = [minMs, maxMs];
  }

  wrap<T>(operation: () => Promise<T>, requestId: string): SimulatedResponse<T> {
    return {
      run: async () => {
        switch (this.mode) {
          case 'offline':
            appendQueueLog({ timestamp: Date.now(), action: 'queue', requestId });
            throw new Error('Simulated offline mode. Request queued.');
          case 'flaky':
            if (Math.random() < this.failureRate) {
              appendQueueLog({ timestamp: Date.now(), action: 'queue', requestId, metadata: { failureRate: this.failureRate } });
              throw new Error('Simulated flaky network failure.');
            }
            break;
          case 'slow': {
            const [minDelay, maxDelay] = this.latencyRange;
            const delay = Math.random() * (maxDelay - minDelay) + minDelay;
            await new Promise(resolve => setTimeout(resolve, delay));
            break;
          }
          default:
            break;
        }
        return operation();
      },
    };
  }

  hijackFactory(factory: AIServiceFactory): void {
    this.originalFactory = factory;
  }

  getNetworkMode(): NetworkMode {
    return this.mode;
  }

  getLogs(): QueueLogEntry[] {
    return readQueueLog();
  }

  clearLogs(): void {
    try {
      localStorage.removeItem(QUEUE_LOG_KEY);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[OfflineSimulator] Unable to clear queue log:', error);
    }
  }
}

export const offlineSimulator = new OfflineSimulator();
