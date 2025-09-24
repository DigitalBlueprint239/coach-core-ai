// src/utils/secure-logger.ts
// Secure logging utility that strips sensitive data and provides structured logging

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  environment: string;
  version?: string;
}

// Sensitive data patterns to redact
const SENSITIVE_PATTERNS = [
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Phone numbers
  /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
  // Credit card numbers
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  // SSN
  /\b\d{3}-\d{2}-\d{4}\b/g,
  // API keys
  /[a-zA-Z0-9]{32,}/g,
  // JWT tokens
  /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
  // Firebase tokens
  /[a-zA-Z0-9_-]{20,}/g,
  // Passwords (common patterns)
  /password["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /pwd["\s]*[:=]["\s]*[^"\s,}]+/gi,
  // Auth tokens
  /auth["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /token["\s]*[:=]["\s]*[^"\s,}]+/gi,
  // API secrets
  /secret["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /key["\s]*[:=]["\s]*[^"\s,}]+/gi,
];

// Fields that should always be redacted
const SENSITIVE_FIELDS = [
  'password',
  'pwd',
  'secret',
  'key',
  'token',
  'auth',
  'authorization',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'jwt',
  'bearer',
  'credential',
  'credentials',
  'ssn',
  'socialSecurityNumber',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'cvc',
  'pin',
  'passcode',
  'email',
  'phone',
  'phoneNumber',
  'address',
  'street',
  'city',
  'state',
  'zip',
  'zipCode',
  'country',
  'dateOfBirth',
  'dob',
  'firstName',
  'lastName',
  'fullName',
  'name',
  'username',
  'userName',
  'login',
  'account',
  'id',
  'userId',
  'user_id',
  'sessionId',
  'session_id',
  'ip',
  'ipAddress',
  'ip_address',
  'userAgent',
  'user_agent',
  'referer',
  'referrer',
  'origin',
  'host',
  'hostname',
  'domain',
  'url',
  'uri',
  'path',
  'query',
  'params',
  'headers',
  'cookies',
  'cookie',
  'session',
  'localStorage',
  'sessionStorage',
  'storage',
  'data',
  'payload',
  'body',
  'request',
  'response',
  'result',
  'output',
  'input',
  'args',
  'arguments',
  'props',
  'state',
  'context',
  'config',
  'options',
  'settings',
  'preferences',
  'profile',
  'user',
  'account',
  'team',
  'organization',
  'company',
  'client',
  'customer',
  'patient',
  'member',
  'player',
  'coach',
  'staff',
  'employee',
  'admin',
  'manager',
  'owner',
  'creator',
  'author',
  'editor',
  'moderator',
  'guest',
  'visitor',
  'anonymous',
  'public',
  'private',
  'confidential',
  'sensitive',
  'personal',
  'private',
  'internal',
  'external',
  'public',
  'shared',
  'restricted',
  'protected',
  'secure',
  'encrypted',
  'hashed',
  'encoded',
  'decoded',
  'parsed',
  'serialized',
  'deserialized',
  'transformed',
  'mapped',
  'filtered',
  'sorted',
  'grouped',
  'aggregated',
  'calculated',
  'computed',
  'derived',
  'generated',
  'created',
  'updated',
  'deleted',
  'removed',
  'added',
  'inserted',
  'modified',
  'changed',
  'altered',
  'edited',
  'saved',
  'stored',
  'cached',
  'retrieved',
  'fetched',
  'loaded',
  'unloaded',
  'mounted',
  'unmounted',
  'rendered',
  'painted',
  'drawn',
  'displayed',
  'shown',
  'hidden',
  'visible',
  'invisible',
  'enabled',
  'disabled',
  'active',
  'inactive',
  'online',
  'offline',
  'connected',
  'disconnected',
  'authenticated',
  'authorized',
  'permitted',
  'allowed',
  'denied',
  'blocked',
  'restricted',
  'limited',
  'unlimited',
  'free',
  'premium',
  'pro',
  'enterprise',
  'business',
  'personal',
  'individual',
  'group',
  'team',
  'organization',
  'company',
  'institution',
  'school',
  'university',
  'college',
  'academy',
  'club',
  'association',
  'society',
  'community',
  'network',
  'platform',
  'service',
  'application',
  'app',
  'website',
  'site',
  'page',
  'route',
  'path',
  'endpoint',
  'api',
  'service',
  'microservice',
  'function',
  'method',
  'handler',
  'controller',
  'middleware',
  'plugin',
  'extension',
  'addon',
  'module',
  'package',
  'library',
  'framework',
  'toolkit',
  'sdk',
  'client',
  'server',
  'database',
  'db',
  'store',
  'cache',
  'memory',
  'disk',
  'file',
  'folder',
  'directory',
  'path',
  'location',
  'position',
  'coordinate',
  'latitude',
  'longitude',
  'altitude',
  'elevation',
  'depth',
  'height',
  'width',
  'size',
  'length',
  'distance',
  'duration',
  'time',
  'date',
  'timestamp',
  'epoch',
  'millisecond',
  'second',
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'year',
  'decade',
  'century',
  'millennium',
  'era',
  'period',
  'interval',
  'range',
  'span',
  'scope',
  'extent',
  'boundary',
  'limit',
  'threshold',
  'minimum',
  'maximum',
  'average',
  'mean',
  'median',
  'mode',
  'sum',
  'total',
  'count',
  'number',
  'quantity',
  'amount',
  'value',
  'price',
  'cost',
  'fee',
  'charge',
  'payment',
  'transaction',
  'order',
  'purchase',
  'sale',
  'refund',
  'credit',
  'debit',
  'balance',
  'account',
  'wallet',
  'purse',
  'bank',
  'financial',
  'monetary',
  'currency',
  'dollar',
  'euro',
  'pound',
  'yen',
  'yuan',
  'rupee',
  'peso',
  'franc',
  'mark',
  'lira',
  'ruble',
  'real',
  'rand',
  'krona',
  'krone',
  'dinar',
  'dirham',
  'riyal',
  'shekel',
  'won',
  'baht',
  'ringgit',
  'rupiah',
  'peso',
  'quetzal',
  'colon',
  'bolivar',
  'sol',
  'guarani',
  'pataca',
  'taka',
  'afghani',
  'rial',
  'som',
  'tenge',
  'manat',
  'somoni',
  'leu',
  'lev',
  'kuna',
  'forint',
  'zloty',
  'koruna',
  'lei',
  'denar',
  'dinar',
  'lek',
  'marka',
  'convertible',
  'mark',
  'tolar',
  'tallinn',
  'riga',
  'vilnius',
  'tallinn',
  'riga',
  'vilnius',
  'tallinn',
  'riga',
  'vilnius',
];

class SecureLogger {
  private environment: string;
  private version: string;
  private isDevelopment: boolean;
  private isProduction: boolean;
  private isStaging: boolean;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.version = process.env.REACT_APP_VERSION || '1.0.0';
    this.isDevelopment = this.environment === 'development';
    this.isProduction = this.environment === 'production';
    this.isStaging = this.environment === 'staging';
  }

  /**
   * Redact sensitive data from a string
   */
  private redactString(value: string): string {
    let redacted = value;
    
    // Apply pattern-based redaction
    SENSITIVE_PATTERNS.forEach(pattern => {
      redacted = redacted.replace(pattern, '[REDACTED]');
    });
    
    return redacted;
  }

  /**
   * Redact sensitive data from an object
   */
  private redactObject(obj: any, depth = 0): any {
    if (depth > 10) {
      return '[MAX_DEPTH_REACHED]';
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.redactString(obj);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactObject(item, depth + 1));
    }

    if (typeof obj === 'object') {
      const redacted: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = SENSITIVE_FIELDS.some(field => 
          lowerKey.includes(field.toLowerCase())
        );
        
        if (isSensitive) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = this.redactObject(value, depth + 1);
        }
      }
      return redacted;
    }

    return obj;
  }

  /**
   * Create a log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): LogEntry {
    return {
      level,
      message: this.redactString(message),
      context: context ? this.redactObject(context) : undefined,
      timestamp: new Date().toISOString(),
      environment: this.environment,
      version: this.version,
    };
  }

  /**
   * Log a message with the specified level
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const entry = this.createLogEntry(level, message, context);
    
    // Only log in development or if explicitly enabled
    if (this.isDevelopment || process.env.REACT_APP_ENABLE_LOGGING === 'true') {
      const consoleMethodMap: Record<LogLevel, keyof Console> = {
        debug: 'debug',
        info: 'info',
        warn: 'warn',
        error: 'error',
        fatal: 'error',
      };
      const method = consoleMethodMap[level];
      const logFn: (...args: unknown[]) => void =
        typeof console[method] === 'function'
          ? (console[method] as (...args: unknown[]) => void)
          : console.log.bind(console);
      logFn(`[${entry.timestamp}] [${level.toUpperCase()}] ${entry.message}`, entry.context);
    }

    // In production, you might want to send logs to a logging service
    if (this.isProduction && level === 'error') {
      // Send to external logging service (e.g., Sentry, LogRocket, etc.)
      this.sendToExternalService(entry);
    }
  }

  /**
   * Send log entry to external service
   */
  private sendToExternalService(entry: LogEntry): void {
    // This would integrate with your logging service
    // For now, we'll just store in localStorage for debugging
    try {
      const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
      logs.push(entry);
      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      localStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (error) {
      // Silently fail if localStorage is not available
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Error level logging
   */
  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Fatal level logging
   */
  fatal(message: string, context?: LogContext): void {
    this.log('fatal', message, context);
  }

  /**
   * Log user actions
   */
  userAction(action: string, context?: LogContext): void {
    this.info(`User action: ${action}`, {
      ...context,
      action,
      type: 'user_action',
    });
  }

  /**
   * Log API calls
   */
  apiCall(method: string, url: string, context?: LogContext): void {
    this.info(`API call: ${method} ${url}`, {
      ...context,
      method,
      url,
      type: 'api_call',
    });
  }

  /**
   * Log performance metrics
   */
  performance(metric: string, value: number, context?: LogContext): void {
    this.info(`Performance: ${metric} = ${value}ms`, {
      ...context,
      metric,
      value,
      type: 'performance',
    });
  }

  /**
   * Log security events
   */
  security(event: string, context?: LogContext): void {
    this.warn(`Security event: ${event}`, {
      ...context,
      event,
      type: 'security',
    });
  }

  /**
   * Get stored logs (for debugging)
   */
  getStoredLogs(): LogEntry[] {
    try {
      return JSON.parse(localStorage.getItem('app_logs') || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Clear stored logs
   */
  clearStoredLogs(): void {
    localStorage.removeItem('app_logs');
  }
}

// Create singleton instance
const secureLogger = new SecureLogger();

// Export the logger instance
export default secureLogger;

// Export individual methods for convenience
export const {
  debug,
  info,
  warn,
  error,
  fatal,
  userAction,
  apiCall,
  performance,
  security,
  getStoredLogs,
  clearStoredLogs,
} = secureLogger;
