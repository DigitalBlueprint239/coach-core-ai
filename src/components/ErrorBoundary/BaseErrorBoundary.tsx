/**
 * Base Error Boundary Component
 *
 * A comprehensive error boundary with:
 * - Error logging to monitoring service
 * - User-friendly fallback UI
 * - Recovery options (retry, reset, report)
 * - Development vs production error display
 * - Automatic retry mechanisms
 * - State reset capabilities
 */

import React, {
  Component,
  ErrorInfo,
  ReactNode,
  useState,
  useCallback,
} from 'react';
import {
  getEnvironmentConfig,
  isDevelopment,
  isProduction,
} from '../../config/environment';

// ============================================
// TYPES AND INTERFACES
// ============================================

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  lastErrorTime: number;
  isRecovering: boolean;
  recoveryAttempts: number;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?:
    | ReactNode
    | ((
        error: Error,
        errorInfo: ErrorInfo,
        retry: () => void,
        reset: () => void
      ) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRecover?: () => void;
  onReset?: () => void;
  maxRetries?: number;
  retryDelay?: number;
  autoRetry?: boolean;
  autoRetryDelay?: number;
  errorReporting?: boolean;
  showErrorDetails?: boolean;
  className?: string;
  componentName?: string;
  context?: Record<string, any>;
}

export interface ErrorReport {
  errorId: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  errorInfo: {
    componentStack: string;
  };
  userInfo: {
    userId?: string;
    userAgent: string;
    url: string;
    timestamp: number;
  };
  appInfo: {
    version: string;
    environment: string;
    buildNumber?: string;
  };
  context: {
    componentName?: string;
    props?: Record<string, any>;
    state?: Record<string, any>;
    customContext?: Record<string, any>;
  };
  recovery: {
    retryCount: number;
    recoveryAttempts: number;
    lastErrorTime: number;
  };
}

export interface ErrorRecoveryOptions {
  retry: () => void;
  reset: () => void;
  report: () => void;
  goBack: () => void;
  reload: () => void;
}

// ============================================
// ERROR REPORTING SERVICE
// ============================================

class ErrorReportingService {
  private endpoint: string;
  private queue: ErrorReport[] = [];
  private isProcessing: boolean = false;
  private config = getEnvironmentConfig();

  constructor() {
    this.endpoint = `${this.config.API.baseUrl}/errors`;
  }

  async reportError(errorReport: ErrorReport): Promise<void> {
    // Add to queue
    this.queue.push(errorReport);

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const errorReport = this.queue.shift();
        if (errorReport) {
          await this.sendErrorReport(errorReport);
        }
      }
    } catch (error) {
      console.error('Failed to process error queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendErrorReport(errorReport: ErrorReport): Promise<void> {
    try {
      // Send to Sentry if configured
      const sentry = (window as typeof window & {
        Sentry?: { captureException?: (error: unknown, context?: unknown) => void };
      }).Sentry;
      if (this.config.MONITORING.sentryDsn && sentry?.captureException) {
        sentry.captureException(errorReport.error, {
          tags: {
            component: errorReport.context.componentName,
            errorId: errorReport.errorId,
            environment: errorReport.appInfo.environment,
          },
          extra: {
            errorInfo: errorReport.errorInfo,
            userInfo: errorReport.userInfo,
            context: errorReport.context,
            recovery: errorReport.recovery,
          },
        });
      }

      // Send to custom endpoint
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.AI.aiProxyToken}`,
        },
        body: JSON.stringify(errorReport),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send error report:', error);
      // Re-queue the error report for later retry
      this.queue.unshift(errorReport);
    }
  }
}

// ============================================
// MAIN ERROR BOUNDARY COMPONENT
// ============================================

export class BaseErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private errorReportingService: ErrorReportingService;
  private retryTimeout: NodeJS.Timeout | null = null;
  private autoRetryTimeout: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      lastErrorTime: 0,
      isRecovering: false,
      recoveryAttempts: 0,
    };
    this.errorReportingService = new ErrorReportingService();
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: BaseErrorBoundary.generateErrorId(),
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error if enabled
    if (this.props.errorReporting !== false) {
      this.reportError(error, errorInfo);
    }

    // Log error to console in development
    if (isDevelopment()) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Auto-retry if enabled
    if (this.props.autoRetry) {
      this.scheduleAutoRetry();
    }
  }

  componentWillUnmount(): void {
    // Clean up timeouts
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    if (this.autoRetryTimeout) {
      clearTimeout(this.autoRetryTimeout);
    }
  }

  private static generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async reportError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      const errorReport: ErrorReport = {
        errorId: this.state.errorId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        errorInfo: {
          componentStack: errorInfo.componentStack || '',
        },
        userInfo: {
          userId: this.getUserId(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now(),
        },
        appInfo: {
          version: process.env.REACT_APP_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          buildNumber: process.env.REACT_APP_BUILD_NUMBER,
        },
        context: {
          componentName:
            this.props.componentName ||
            this.getComponentName(errorInfo.componentStack || ''),
          props: this.props,
          state: this.state,
          customContext: this.props.context,
        },
        recovery: {
          retryCount: this.state.retryCount,
          recoveryAttempts: this.state.recoveryAttempts,
          lastErrorTime: this.state.lastErrorTime,
        },
      };

      await this.errorReportingService.reportError(errorReport);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  private getUserId(): string | undefined {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id || user.uid;
    } catch {
      return undefined;
    }
  }

  private getComponentName(componentStack: string): string {
    const match = componentStack.match(/at\s+(\w+)/);
    return match ? match[1] : 'Unknown';
  }

  private scheduleAutoRetry(): void {
    const { autoRetryDelay = 5000 } = this.props;

    if (this.autoRetryTimeout) {
      clearTimeout(this.autoRetryTimeout);
    }

    this.autoRetryTimeout = setTimeout(() => {
      this.handleRetry();
    }, autoRetryDelay);
  }

  private handleRetry = (): void => {
    const { maxRetries = 3, retryDelay = 1000 } = this.props;
    const { retryCount, lastErrorTime } = this.state;

    // Check if we should allow retry
    if (retryCount >= maxRetries) {
      console.warn('Max retry attempts reached');
      return;
    }

    // Check if enough time has passed since last error
    const timeSinceLastError = Date.now() - lastErrorTime;
    if (timeSinceLastError < retryDelay) {
      console.warn('Retry too soon, waiting...');
      return;
    }

    this.setState({ isRecovering: true });

    // Reset error state and retry
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1,
      isRecovering: false,
    });

    // Call recovery handler
    if (this.props.onRecover) {
      this.props.onRecover();
    }
  };

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0,
      isRecovering: false,
      recoveryAttempts: 0,
    });

    // Call reset handler
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReport = (): void => {
    if (this.state.error && this.state.errorInfo) {
      this.reportError(this.state.error, this.state.errorInfo);
    }
  };

  private handleGoBack = (): void => {
    window.history.back();
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, retryCount, errorId, isRecovering } =
      this.state;

    const {
      children,
      fallback,
      maxRetries = 3,
      showErrorDetails = isDevelopment(),
      className = '',
    } = this.props;

    if (isRecovering) {
      return (
        <div className="error-boundary-recovering">
          <div className="recovering-spinner"></div>
          <p>Recovering...</p>
          <style>{`
            .error-boundary-recovering {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20px;
              background-color: #f0f9ff;
              border: 1px solid #0ea5e9;
              border-radius: 8px;
            }
            .recovering-spinner {
              width: 24px;
              height: 24px;
              border: 2px solid #0ea5e9;
              border-top: 2px solid transparent;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin-bottom: 8px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      );
    }

    if (hasError) {
      // Custom fallback component or function
      if (fallback) {
        if (typeof fallback === 'function') {
          const recoveryOptions: ErrorRecoveryOptions = {
            retry: this.handleRetry,
            reset: this.handleReset,
            report: this.handleReport,
            goBack: this.handleGoBack,
            reload: this.handleReload,
          };
          return fallback(
            error!,
            errorInfo!,
            this.handleRetry,
            this.handleReset
          );
        }
        return fallback;
      }

      // Default error UI
      return (
        <div className={`error-boundary ${className}`}>
          <div className="error-container">
            <div className="error-header">
              <div className="error-icon">⚠️</div>
              <h2 className="error-title">Something went wrong</h2>
              <p className="error-message">
                We're sorry, but something unexpected happened. Our team has
                been notified.
              </p>
            </div>

            <div className="error-actions">
              <button
                className="error-button primary"
                onClick={this.handleRetry}
                disabled={retryCount >= maxRetries}
              >
                {retryCount >= maxRetries ? 'Max retries reached' : 'Try Again'}
              </button>

              <button
                className="error-button secondary"
                onClick={this.handleReset}
              >
                Reset
              </button>

              <button
                className="error-button secondary"
                onClick={this.handleGoBack}
              >
                Go Back
              </button>

              <button
                className="error-button secondary"
                onClick={this.handleReload}
              >
                Reload Page
              </button>
            </div>

            {showErrorDetails && error && (
              <div className="error-details">
                <details>
                  <summary>Error Details</summary>
                  <div className="error-info">
                    <p>
                      <strong>Error ID:</strong> {errorId}
                    </p>
                    <p>
                      <strong>Component:</strong>{' '}
                      {this.props.componentName || 'Unknown'}
                    </p>
                    <p>
                      <strong>Error:</strong> {error.name}: {error.message}
                    </p>
                    {error.stack && (
                      <div className="error-stack">
                        <strong>Stack Trace:</strong>
                        <pre>{error.stack}</pre>
                      </div>
                    )}
                    {errorInfo && (
                      <div className="error-component-stack">
                        <strong>Component Stack:</strong>
                        <pre>{errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}

            <div className="error-footer">
              <p className="error-help">
                If this problem persists, please contact support with error ID:{' '}
                <code>{errorId}</code>
              </p>
              <button
                className="error-button tertiary"
                onClick={this.handleReport}
              >
                Report Issue
              </button>
            </div>
          </div>

          <style>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              background-color: #f9fafb;
            }
            
            .error-container {
              max-width: 600px;
              width: 100%;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              padding: 32px;
              text-align: center;
            }
            
            .error-header {
              margin-bottom: 24px;
            }
            
            .error-icon {
              font-size: 64px;
              margin-bottom: 16px;
            }
            
            .error-title {
              font-size: 24px;
              font-weight: 600;
              color: #1f2937;
              margin: 0 0 8px 0;
            }
            
            .error-message {
              font-size: 16px;
              color: #6b7280;
              margin: 0;
              line-height: 1.5;
            }
            
            .error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              margin-bottom: 24px;
              flex-wrap: wrap;
            }
            
            .error-button {
              padding: 12px 24px;
              border: none;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            }
            
            .error-button.primary {
              background-color: #3b82f6;
              color: white;
            }
            
            .error-button.primary:hover:not(:disabled) {
              background-color: #2563eb;
            }
            
            .error-button.primary:disabled {
              background-color: #9ca3af;
              cursor: not-allowed;
            }
            
            .error-button.secondary {
              background-color: #f3f4f6;
              color: #374151;
              border: 1px solid #d1d5db;
            }
            
            .error-button.secondary:hover {
              background-color: #e5e7eb;
            }
            
            .error-button.tertiary {
              background-color: transparent;
              color: #6b7280;
              border: 1px solid #d1d5db;
              padding: 8px 16px;
              font-size: 12px;
            }
            
            .error-button.tertiary:hover {
              background-color: #f9fafb;
            }
            
            .error-details {
              margin: 24px 0;
              text-align: left;
            }
            
            .error-details summary {
              cursor: pointer;
              color: #6b7280;
              font-size: 14px;
              margin-bottom: 12px;
            }
            
            .error-info {
              background-color: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 16px;
              font-size: 14px;
              line-height: 1.5;
            }
            
            .error-stack,
            .error-component-stack {
              margin-top: 12px;
            }
            
            .error-stack pre,
            .error-component-stack pre {
              background-color: #1f2937;
              color: #f9fafb;
              padding: 12px;
              border-radius: 4px;
              overflow-x: auto;
              font-size: 12px;
              margin: 8px 0 0 0;
            }
            
            .error-footer {
              border-top: 1px solid #e5e7eb;
              padding-top: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            .error-help {
              font-size: 14px;
              color: #6b7280;
              margin: 0;
            }
            
            .error-help code {
              background-color: #f3f4f6;
              padding: 2px 6px;
              border-radius: 4px;
              font-family: monospace;
            }
          `}</style>
        </div>
      );
    }

    return children;
  }
}

// ============================================
// HOOK FOR ERROR BOUNDARY
// ============================================

export const useErrorBoundary = () => {
  const [error, setError] = useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  const handleError = useCallback((error: Error, errorInfo: ErrorInfo) => {
    setError(error);
    setErrorInfo(errorInfo);
    console.error('Error caught by hook:', error, errorInfo);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setErrorInfo(null);
  }, []);

  return {
    error,
    errorInfo,
    handleError,
    clearError,
  };
};

// ============================================
// ERROR UTILITIES
// ============================================

export const isNetworkError = (error: Error): boolean => {
  return (
    error.name === 'NetworkError' ||
    error.message.includes('network') ||
    error.message.includes('fetch') ||
    error.message.includes('connection') ||
    error.message.includes('timeout')
  );
};

export const isDataError = (error: Error): boolean => {
  return (
    error.name === 'DataError' ||
    error.message.includes('data') ||
    error.message.includes('parse') ||
    error.message.includes('JSON') ||
    error.message.includes('firebase')
  );
};

export const isAuthError = (error: Error): boolean => {
  return (
    error.name === 'AuthError' ||
    error.message.includes('auth') ||
    error.message.includes('unauthorized') ||
    error.message.includes('forbidden') ||
    error.message.includes('permission')
  );
};

export const isCanvasError = (error: Error): boolean => {
  return (
    error.name === 'CanvasError' ||
    error.message.includes('canvas') ||
    error.message.includes('webgl') ||
    error.message.includes('context') ||
    error.message.includes('drawing')
  );
};

export const isAIError = (error: Error): boolean => {
  return (
    error.name === 'AIError' ||
    error.message.includes('ai') ||
    error.message.includes('openai') ||
    error.message.includes('gpt') ||
    error.message.includes('model')
  );
};

export default BaseErrorBoundary;
