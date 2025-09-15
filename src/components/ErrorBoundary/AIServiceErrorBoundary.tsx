/**
 * AI Service Error Boundary
 *
 * Specialized error boundary for AI-related components:
 * - PracticePlanner (AI service failures)
 * - OpenAI API errors
 * - AI model failures
 * - Network timeouts
 * - Rate limiting
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import BaseErrorBoundary, {
  ErrorBoundaryProps,
  ErrorBoundaryState,
} from './BaseErrorBoundary';
import { isAIError, isNetworkError } from './BaseErrorBoundary';

export interface AIServiceErrorBoundaryProps extends ErrorBoundaryProps {
  serviceName?: string;
  onAIServiceReset?: () => void;
  onFallbackMode?: () => void;
  enableOfflineMode?: boolean;
  retryWithBackoff?: boolean;
}

export interface AIServiceErrorBoundaryState extends ErrorBoundaryState {
  serviceStatus: 'online' | 'offline' | 'degraded';
  lastErrorType: 'api' | 'network' | 'model' | 'rate_limit' | 'unknown';
  rateLimitInfo?: {
    resetTime: number;
    limit: number;
    remaining: number;
  };
  fallbackMode: boolean;
}

export class AIServiceErrorBoundary extends Component<
  AIServiceErrorBoundaryProps,
  AIServiceErrorBoundaryState
> {
  private retryBackoffTimeout: NodeJS.Timeout | null = null;
  private serviceCheckInterval: NodeJS.Timeout | null = null;

  constructor(props: AIServiceErrorBoundaryProps) {
    super(props);
    this.state = {
      ...this.state,
      serviceStatus: 'online',
      lastErrorType: 'unknown',
      fallbackMode: false,
    };
  }

  componentDidMount(): void {
    // Start service health check
    this.startServiceHealthCheck();
  }

  componentWillUnmount(): void {
    if (this.retryBackoffTimeout) {
      clearTimeout(this.retryBackoffTimeout);
    }
    if (this.serviceCheckInterval) {
      clearInterval(this.serviceCheckInterval);
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Determine error type
    const errorType = this.classifyAIError(error);

    this.setState({
      lastErrorType: errorType,
      serviceStatus: this.determineServiceStatus(errorType),
    });

    // Handle rate limiting
    if (errorType === 'rate_limit') {
      this.handleRateLimitError(error);
    }

    // Handle network errors
    if (isNetworkError(error)) {
      this.setState({ serviceStatus: 'offline' });
    }

    // Call parent error handler
    super.componentDidCatch(error, errorInfo);
  }

  private classifyAIError(
    error: Error
  ): 'api' | 'network' | 'model' | 'rate_limit' | 'unknown' {
    const message = error.message.toLowerCase();

    if (message.includes('rate limit') || message.includes('429')) {
      return 'rate_limit';
    }

    if (message.includes('api key') || message.includes('authentication')) {
      return 'api';
    }

    if (
      message.includes('model') ||
      message.includes('gpt') ||
      message.includes('openai')
    ) {
      return 'model';
    }

    if (isNetworkError(error)) {
      return 'network';
    }

    return 'unknown';
  }

  private determineServiceStatus(
    errorType: string
  ): 'online' | 'offline' | 'degraded' {
    switch (errorType) {
      case 'rate_limit':
        return 'degraded';
      case 'network':
        return 'offline';
      case 'api':
        return 'offline';
      case 'model':
        return 'degraded';
      default:
        return 'degraded';
    }
  }

  private handleRateLimitError(error: Error): void {
    // Extract rate limit information from error message
    const message = error.message;
    const resetMatch = message.match(/reset.*?(\d+)/i);
    const limitMatch = message.match(/limit.*?(\d+)/i);
    const remainingMatch = message.match(/remaining.*?(\d+)/i);

    if (resetMatch || limitMatch || remainingMatch) {
      this.setState({
        rateLimitInfo: {
          resetTime: resetMatch
            ? parseInt(resetMatch[1]) * 1000
            : Date.now() + 60000,
          limit: limitMatch ? parseInt(limitMatch[1]) : 0,
          remaining: remainingMatch ? parseInt(remainingMatch[1]) : 0,
        },
      });
    }
  }

  private startServiceHealthCheck(): void {
    this.serviceCheckInterval = setInterval(() => {
      this.checkServiceHealth();
    }, 30000); // Check every 30 seconds
  }

  private async checkServiceHealth(): Promise<void> {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        timeout: 5000,
      });

      if (response.ok) {
        this.setState({ serviceStatus: 'online' });
      } else {
        this.setState({ serviceStatus: 'degraded' });
      }
    } catch (error) {
      this.setState({ serviceStatus: 'offline' });
    }
  }

  private handleAIServiceReset = (): void => {
    this.setState({
      serviceStatus: 'online',
      lastErrorType: 'unknown',
      fallbackMode: false,
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onAIServiceReset) {
      this.props.onAIServiceReset();
    }
  };

  private handleFallbackMode = (): void => {
    this.setState({ fallbackMode: true });

    if (this.props.onFallbackMode) {
      this.props.onFallbackMode();
    }
  };

  private handleRetryWithBackoff = (): void => {
    if (!this.props.retryWithBackoff) {
      this.handleRetry();
      return;
    }

    const { retryCount } = this.state;
    const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds

    this.retryBackoffTimeout = setTimeout(() => {
      this.handleRetry();
    }, backoffDelay);
  };

  private getErrorMessage(): string {
    const { lastErrorType, serviceStatus, rateLimitInfo } = this.state;

    switch (lastErrorType) {
      case 'rate_limit':
        if (rateLimitInfo) {
          const resetTime = new Date(
            rateLimitInfo.resetTime
          ).toLocaleTimeString();
          return `Rate limit exceeded. Please try again after ${resetTime}.`;
        }
        return 'Too many requests. Please wait a moment and try again.';

      case 'api':
        return 'AI service authentication failed. Please check your API configuration.';

      case 'model':
        return 'AI model is temporarily unavailable. Please try again later.';

      case 'network':
        return 'Unable to connect to AI service. Please check your internet connection.';

      default:
        return 'AI service encountered an unexpected error. Please try again.';
    }
  }

  private getRecoveryActions(): Array<{
    label: string;
    action: () => void;
    primary?: boolean;
  }> {
    const { lastErrorType, serviceStatus, fallbackMode } = this.state;
    const actions = [];

    // Primary action based on error type
    switch (lastErrorType) {
      case 'rate_limit':
        actions.push({
          label: 'Wait and Retry',
          action: this.handleRetryWithBackoff,
          primary: true,
        });
        break;

      case 'network':
        actions.push({
          label: 'Check Connection',
          action: this.handleRetry,
          primary: true,
        });
        break;

      default:
        actions.push({
          label: 'Try Again',
          action: this.handleRetry,
          primary: true,
        });
    }

    // Secondary actions
    if (!fallbackMode && this.props.enableOfflineMode) {
      actions.push({
        label: 'Use Offline Mode',
        action: this.handleFallbackMode,
      });
    }

    actions.push({
      label: 'Reset Service',
      action: this.handleAIServiceReset,
    });

    actions.push({
      label: 'Reload Page',
      action: () => window.location.reload(),
    });

    return actions;
  }

  render(): ReactNode {
    const { children, fallback, ...props } = this.props;
    const { serviceStatus, lastErrorType, rateLimitInfo, fallbackMode } =
      this.state;

    // Custom fallback for AI service errors
    const aiServiceFallback = (
      error: Error,
      errorInfo: ErrorInfo,
      retry: () => void,
      reset: () => void
    ) => {
      const actions = this.getRecoveryActions();

      return (
        <div className="ai-service-error-boundary">
          <div className="ai-service-error-container">
            <div className="ai-service-error-header">
              <div className="ai-service-error-icon">🤖</div>
              <h2 className="ai-service-error-title">AI Service Error</h2>
              <p className="ai-service-error-message">
                {this.getErrorMessage()}
              </p>
            </div>

            <div className="ai-service-status">
              <div className={`status-indicator ${serviceStatus}`}>
                <span className="status-dot"></span>
                <span className="status-text">
                  Service Status:{' '}
                  {serviceStatus.charAt(0).toUpperCase() +
                    serviceStatus.slice(1)}
                </span>
              </div>
            </div>

            <div className="ai-service-error-actions">
              {actions.map((action, index) => (
                <button
                  key={index}
                  className={`ai-service-error-button ${action.primary ? 'primary' : 'secondary'}`}
                  onClick={action.action}
                >
                  {action.label}
                </button>
              ))}
            </div>

            {rateLimitInfo && (
              <div className="rate-limit-info">
                <h3>Rate Limit Information</h3>
                <div className="rate-limit-details">
                  <p>
                    <strong>Limit:</strong> {rateLimitInfo.limit} requests
                  </p>
                  <p>
                    <strong>Remaining:</strong> {rateLimitInfo.remaining}{' '}
                    requests
                  </p>
                  <p>
                    <strong>Reset Time:</strong>{' '}
                    {new Date(rateLimitInfo.resetTime).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <div className="ai-service-error-help">
              <h3>What you can do:</h3>
              <ul>
                {lastErrorType === 'rate_limit' && (
                  <li>Wait a few minutes before trying again</li>
                )}
                {lastErrorType === 'network' && (
                  <li>Check your internet connection</li>
                )}
                {lastErrorType === 'api' && (
                  <li>Verify your API configuration</li>
                )}
                <li>Try using offline mode if available</li>
                <li>Contact support if the problem persists</li>
              </ul>
            </div>
          </div>

          <style>{`
            .ai-service-error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            
            .ai-service-error-container {
              max-width: 700px;
              width: 100%;
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
              padding: 40px;
              text-align: center;
            }
            
            .ai-service-error-header {
              margin-bottom: 32px;
            }
            
            .ai-service-error-icon {
              font-size: 80px;
              margin-bottom: 20px;
              filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
            }
            
            .ai-service-error-title {
              font-size: 28px;
              font-weight: 700;
              color: #1f2937;
              margin: 0 0 12px 0;
            }
            
            .ai-service-error-message {
              font-size: 18px;
              color: #6b7280;
              margin: 0;
              line-height: 1.6;
              max-width: 500px;
              margin: 0 auto;
            }
            
            .ai-service-status {
              margin-bottom: 32px;
            }
            
            .status-indicator {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
            }
            
            .status-indicator.online {
              background-color: #dcfce7;
              color: #166534;
            }
            
            .status-indicator.offline {
              background-color: #fee2e2;
              color: #991b1b;
            }
            
            .status-indicator.degraded {
              background-color: #fef3c7;
              color: #92400e;
            }
            
            .status-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background-color: currentColor;
            }
            
            .ai-service-error-actions {
              display: flex;
              gap: 16px;
              justify-content: center;
              margin-bottom: 32px;
              flex-wrap: wrap;
            }
            
            .ai-service-error-button {
              padding: 14px 28px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              min-width: 140px;
            }
            
            .ai-service-error-button.primary {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            
            .ai-service-error-button.primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .ai-service-error-button.secondary {
              background-color: #f8fafc;
              color: #374151;
              border: 2px solid #e2e8f0;
            }
            
            .ai-service-error-button.secondary:hover {
              background-color: #e2e8f0;
              border-color: #cbd5e1;
            }
            
            .rate-limit-info,
            .ai-service-error-help {
              text-align: left;
              margin-top: 32px;
              padding: 24px;
              background-color: #f8fafc;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
            }
            
            .rate-limit-info h3,
            .ai-service-error-help h3 {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin: 0 0 16px 0;
            }
            
            .rate-limit-details {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 12px;
            }
            
            .rate-limit-details p {
              margin: 0;
              color: #4b5563;
            }
            
            .ai-service-error-help ul {
              margin: 0;
              padding-left: 20px;
            }
            
            .ai-service-error-help li {
              margin-bottom: 8px;
              color: #4b5563;
              line-height: 1.5;
            }
          `}</style>
        </div>
      );
    };

    return (
      <BaseErrorBoundary
        {...props}
        fallback={fallback || aiServiceFallback}
        componentName={props.componentName || 'AIServiceComponent'}
        context={{
          ...props.context,
          serviceName: props.serviceName,
          serviceStatus: this.state.serviceStatus,
          lastErrorType: this.state.lastErrorType,
          fallbackMode: this.state.fallbackMode,
        }}
      >
        {children}
      </BaseErrorBoundary>
    );
  }
}

export default AIServiceErrorBoundary;
