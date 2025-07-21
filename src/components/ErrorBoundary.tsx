// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

// ============================================
// ERROR BOUNDARY TYPES
// ============================================

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  lastErrorTime: number;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRecover?: () => void;
  maxRetries?: number;
  retryDelay?: number;
  errorReporting?: boolean;
  showErrorDetails?: boolean;
  className?: string;
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
  };
}

// ============================================
// MAIN ERROR BOUNDARY COMPONENT
// ============================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorReportingService: ErrorReportingService;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      lastErrorTime: 0
    };
    this.errorReportingService = new ErrorReportingService();
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: ErrorBoundary.generateErrorId(),
      lastErrorTime: Date.now()
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
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
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
          stack: error.stack
        },
        errorInfo: {
          componentStack: errorInfo.componentStack || ''
        },
        userInfo: {
          userId: this.getUserId(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now()
        },
        appInfo: {
          version: import.meta.env.VITE_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          buildNumber: import.meta.env.VITE_BUILD_NUMBER
        },
        context: {
          componentName: this.getComponentName(errorInfo.componentStack || ''),
          props: this.props,
          state: this.state
        }
      };

      await this.errorReportingService.reportError(errorReport);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  private getUserId(): string | undefined {
    // This would typically get the user ID from your auth context
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id;
    } catch {
      return undefined;
    }
  }

  private getComponentName(componentStack: string): string {
    const match = componentStack.match(/at\s+(\w+)/);
    return match ? match[1] : 'Unknown';
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

    // Reset error state and retry
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1
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
      lastErrorTime: 0
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, retryCount, errorId } = this.state;
    const { children, fallback, maxRetries = 3, showErrorDetails = false, className = '' } = this.props;

    if (hasError) {
      // Custom fallback component or function
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error!, errorInfo!, this.handleRetry);
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
                We're sorry, but something unexpected happened. Our team has been notified.
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
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
              
              <button 
                className="error-button secondary"
                onClick={() => window.history.back()}
              >
                Go Back
              </button>
            </div>

            {showErrorDetails && error && (
              <div className="error-details">
                <details>
                  <summary>Error Details</summary>
                  <div className="error-info">
                    <p><strong>Error ID:</strong> {errorId}</p>
                    <p><strong>Error:</strong> {error.name}: {error.message}</p>
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
                If this problem persists, please contact support with error ID: <code>{errorId}</code>
              </p>
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
// ERROR REPORTING SERVICE
// ============================================

class ErrorReportingService {
  private endpoint: string;
  private queue: ErrorReport[] = [];
  private isProcessing: boolean = false;

  constructor() {
    this.endpoint = import.meta.env.VITE_ERROR_REPORTING_ENDPOINT || '/api/errors';
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
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
// SPECIALIZED ERROR BOUNDARIES
// ============================================

export class NetworkErrorBoundary extends ErrorBoundary {
  constructor(props: ErrorBoundaryProps) {
    super({
      ...props,
      fallback: (error, errorInfo, retry) => (
        <div className="network-error">
          <div className="network-error-icon">🌐</div>
          <h3>Network Error</h3>
          <p>Unable to connect to the server. Please check your internet connection.</p>
          <div className="network-error-actions">
            <button onClick={retry}>Retry Connection</button>
            <button onClick={() => window.location.reload()}>Reload Page</button>
          </div>
          <style>{`
            .network-error {
              text-align: center;
              padding: 32px;
            }
            .network-error-icon {
              font-size: 48px;
              margin-bottom: 16px;
            }
            .network-error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              margin-top: 16px;
            }
            .network-error-actions button {
              padding: 8px 16px;
              border: 1px solid #d1d5db;
              border-radius: 4px;
              background: white;
              cursor: pointer;
            }
          `}</style>
        </div>
      )
    });
  }
}

export class DataErrorBoundary extends ErrorBoundary {
  constructor(props: ErrorBoundaryProps) {
    super({
      ...props,
      fallback: (error, errorInfo, retry) => (
        <div className="data-error">
          <div className="data-error-icon">📊</div>
          <h3>Data Loading Error</h3>
          <p>Failed to load the requested data. This might be a temporary issue.</p>
          <div className="data-error-actions">
            <button onClick={retry}>Retry Loading</button>
            <button onClick={() => window.history.back()}>Go Back</button>
          </div>
          <style>{`
            .data-error {
              text-align: center;
              padding: 32px;
            }
            .data-error-icon {
              font-size: 48px;
              margin-bottom: 16px;
            }
            .data-error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              margin-top: 16px;
            }
            .data-error-actions button {
              padding: 8px 16px;
              border: 1px solid #d1d5db;
              border-radius: 4px;
              background: white;
              cursor: pointer;
            }
          `}</style>
        </div>
      )
    });
  }
}

// ============================================
// HOOK FOR ERROR BOUNDARY
// ============================================

export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error, errorInfo: ErrorInfo) => {
    setError(error);
    console.error('Error caught by hook:', error, errorInfo);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError
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
    error.message.includes('connection')
  );
};

export const isDataError = (error: Error): boolean => {
  return (
    error.name === 'DataError' ||
    error.message.includes('data') ||
    error.message.includes('parse') ||
    error.message.includes('JSON')
  );
};

export const isAuthError = (error: Error): boolean => {
  return (
    error.name === 'AuthError' ||
    error.message.includes('auth') ||
    error.message.includes('unauthorized') ||
    error.message.includes('forbidden')
  );
};

export default ErrorBoundary;