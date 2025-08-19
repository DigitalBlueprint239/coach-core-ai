/**
 * Data Loading Error Boundary
 * 
 * Specialized error boundary for data-related components:
 * - Dashboard (data loading errors)
 * - TeamManagement (permission errors)
 * - Analytics (calculation errors)
 * - Firebase errors
 * - Permission issues
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import BaseErrorBoundary, { ErrorBoundaryProps, ErrorBoundaryState } from './BaseErrorBoundary';
import { isDataError, isAuthError, isNetworkError } from './BaseErrorBoundary';

export interface DataLoadingErrorBoundaryProps extends ErrorBoundaryProps {
  dataType?: 'team' | 'player' | 'analytics' | 'practice' | 'play' | 'user';
  onDataRefresh?: () => void;
  onPermissionRequest?: () => void;
  enableCaching?: boolean;
  cacheTimeout?: number;
}

export interface DataLoadingErrorBoundaryState extends ErrorBoundaryState {
  dataStatus: 'loading' | 'loaded' | 'error' | 'cached';
  permissionLevel: 'none' | 'read' | 'write' | 'admin';
  lastDataSync: number;
  cacheExpiry: number;
  dataSource: 'firebase' | 'cache' | 'local' | 'unknown';
}

export class DataLoadingErrorBoundary extends Component<DataLoadingErrorBoundaryProps, DataLoadingErrorBoundaryState> {
  private dataRefreshTimeout: NodeJS.Timeout | null = null;
  private cacheCheckInterval: NodeJS.Timeout | null = null;

  constructor(props: DataLoadingErrorBoundaryProps) {
    super(props);
    this.state = {
      ...this.state,
      dataStatus: 'loading',
      permissionLevel: 'none',
      lastDataSync: Date.now(),
      cacheExpiry: Date.now() + (props.cacheTimeout || 300000), // 5 minutes default
      dataSource: 'unknown'
    };
  }

  componentDidMount(): void {
    // Start cache management
    if (this.props.enableCaching) {
      this.startCacheManagement();
    }
  }

  componentWillUnmount(): void {
    if (this.dataRefreshTimeout) {
      clearTimeout(this.dataRefreshTimeout);
    }
    if (this.cacheCheckInterval) {
      clearInterval(this.cacheCheckInterval);
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Determine data error type
    const errorType = this.classifyDataError(error);
    
    this.setState({ 
      dataStatus: 'error',
      dataSource: this.determineDataSource(error)
    });

    // Handle permission errors
    if (isAuthError(error)) {
      this.handlePermissionError(error);
    }

    // Handle data validation errors
    if (isDataError(error)) {
      this.handleDataValidationError(error);
    }

    // Call parent error handler
    super.componentDidCatch(error, errorInfo);
  }

  private classifyDataError(error: Error): 'permission' | 'validation' | 'network' | 'firebase' | 'unknown' {
    const message = error.message.toLowerCase();
    
    if (isAuthError(error) || message.includes('permission') || message.includes('unauthorized')) {
      return 'permission';
    }
    
    if (isDataError(error) || message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    
    if (isNetworkError(error)) {
      return 'network';
    }
    
    if (message.includes('firebase') || message.includes('firestore')) {
      return 'firebase';
    }
    
    return 'unknown';
  }

  private determineDataSource(error: Error): 'firebase' | 'cache' | 'local' | 'unknown' {
    const message = error.message.toLowerCase();
    
    if (message.includes('firebase') || message.includes('firestore')) {
      return 'firebase';
    }
    
    if (message.includes('cache') || message.includes('localstorage')) {
      return 'cache';
    }
    
    if (message.includes('local') || message.includes('memory')) {
      return 'local';
    }
    
    return 'unknown';
  }

  private handlePermissionError(error: Error): void {
    // Determine permission level from error
    const message = error.message.toLowerCase();
    let permissionLevel: 'none' | 'read' | 'write' | 'admin' = 'none';
    
    if (message.includes('admin') || message.includes('owner')) {
      permissionLevel = 'admin';
    } else if (message.includes('write') || message.includes('edit')) {
      permissionLevel = 'write';
    } else if (message.includes('read') || message.includes('view')) {
      permissionLevel = 'read';
    }
    
    this.setState({ permissionLevel });
  }

  private handleDataValidationError(error: Error): void {
    console.warn('Data validation error:', error.message);
    
    // Try to recover from cache if available
    if (this.props.enableCaching) {
      this.tryLoadFromCache();
    }
  }

  private startCacheManagement(): void {
    this.cacheCheckInterval = setInterval(() => {
      this.checkCacheExpiry();
    }, 60000); // Check every minute
  }

  private checkCacheExpiry(): void {
    const { cacheExpiry } = this.state;
    
    if (Date.now() > cacheExpiry) {
      this.setState({ 
        dataStatus: 'error',
        dataSource: 'cache'
      });
    }
  }

  private tryLoadFromCache(): void {
    try {
      const cacheKey = `data_cache_${this.props.dataType}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const cacheAge = Date.now() - timestamp;
        
        if (cacheAge < (this.props.cacheTimeout || 300000)) {
          this.setState({
            dataStatus: 'cached',
            dataSource: 'cache',
            lastDataSync: timestamp
          });
          return;
        }
      }
    } catch (error) {
      console.warn('Failed to load from cache:', error);
    }
  }

  private handleDataRefresh = (): void => {
    this.setState({ dataStatus: 'loading' });
    
    if (this.props.onDataRefresh) {
      this.props.onDataRefresh();
    } else {
      // Default refresh behavior
      window.location.reload();
    }
  };

  private handlePermissionRequest = (): void => {
    if (this.props.onPermissionRequest) {
      this.props.onPermissionRequest();
    } else {
      // Default permission request behavior
      window.location.href = '/auth/login';
    }
  };

  private handleCacheRefresh = (): void => {
    this.setState({
      dataStatus: 'loading',
      dataSource: 'firebase',
      lastDataSync: Date.now()
    });
    
    this.handleDataRefresh();
  };

  private getErrorMessage(): string {
    const { dataSource, permissionLevel, dataStatus } = this.state;
    
    if (dataStatus === 'cached') {
      return 'Showing cached data. Some information may be outdated.';
    }
    
    switch (dataSource) {
      case 'firebase':
        if (permissionLevel === 'none') {
          return 'You don\'t have permission to access this data. Please contact your administrator.';
        }
        return 'Unable to load data from the database. Please check your connection and try again.';
        
      case 'cache':
        return 'Cached data is no longer available. Please refresh to load current data.';
        
      case 'local':
        return 'Local data is corrupted or unavailable. Please refresh the page.';
        
      default:
        return 'Unable to load the requested data. Please try again.';
    }
  }

  private getRecoveryActions(): Array<{ label: string; action: () => void; primary?: boolean }> {
    const { dataSource, permissionLevel, dataStatus } = this.state;
    const actions = [];

    // Primary action based on data source and status
    if (dataStatus === 'cached') {
      actions.push({
        label: 'Refresh Data',
        action: this.handleCacheRefresh,
        primary: true
      });
    } else if (permissionLevel === 'none') {
      actions.push({
        label: 'Request Access',
        action: this.handlePermissionRequest,
        primary: true
      });
    } else {
      actions.push({
        label: 'Try Again',
        action: this.handleDataRefresh,
        primary: true
      });
    }

    // Secondary actions
    if (this.props.enableCaching && dataStatus !== 'cached') {
      actions.push({
        label: 'Load Cached Data',
        action: this.tryLoadFromCache
      });
    }

    actions.push({
      label: 'Go Back',
      action: () => window.history.back()
    });

    actions.push({
      label: 'Reload Page',
      action: () => window.location.reload()
    });

    return actions;
  }

  render(): ReactNode {
    const { children, fallback, ...props } = this.props;
    const { dataStatus, dataSource, permissionLevel, lastDataSync } = this.state;

    // Custom fallback for data loading errors
    const dataLoadingFallback = (error: Error, errorInfo: ErrorInfo, retry: () => void, reset: () => void) => {
      const actions = this.getRecoveryActions();
      
      return (
        <div className="data-loading-error-boundary">
          <div className="data-loading-error-container">
            <div className="data-loading-error-header">
              <div className="data-loading-error-icon">📊</div>
              <h2 className="data-loading-error-title">Data Loading Error</h2>
              <p className="data-loading-error-message">
                {this.getErrorMessage()}
              </p>
            </div>

            <div className="data-loading-status">
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">Data Type:</span>
                  <span className="status-value">{props.dataType || 'Unknown'}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Source:</span>
                  <span className="status-value">{dataSource}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Status:</span>
                  <span className={`status-value ${dataStatus}`}>{dataStatus}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Last Sync:</span>
                  <span className="status-value">
                    {new Date(lastDataSync).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="data-loading-error-actions">
              {actions.map((action, index) => (
                <button
                  key={index}
                  className={`data-loading-error-button ${action.primary ? 'primary' : 'secondary'}`}
                  onClick={action.action}
                >
                  {action.label}
                </button>
              ))}
            </div>

            {permissionLevel === 'none' && (
              <div className="permission-info">
                <h3>Permission Required</h3>
                <p>You need appropriate permissions to access this data. Contact your team administrator or coach to request access.</p>
                <div className="permission-levels">
                  <div className="permission-level">
                    <strong>Read Access:</strong> View team data and analytics
                  </div>
                  <div className="permission-level">
                    <strong>Write Access:</strong> Edit team information and create content
                  </div>
                  <div className="permission-level">
                    <strong>Admin Access:</strong> Full team management capabilities
                  </div>
                </div>
              </div>
            )}

            <div className="data-loading-error-help">
              <h3>Troubleshooting Tips</h3>
              <ul>
                {dataSource === 'firebase' && (
                  <li>Check your internet connection</li>
                )}
                {permissionLevel === 'none' && (
                  <li>Verify you have the correct permissions</li>
                )}
                {dataStatus === 'cached' && (
                  <li>Refresh to get the latest data</li>
                )}
                <li>Try clearing your browser cache</li>
                <li>Contact support if the problem persists</li>
              </ul>
            </div>
          </div>

          <style>{`
            .data-loading-error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            
            .data-loading-error-container {
              max-width: 700px;
              width: 100%;
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
              padding: 40px;
              text-align: center;
            }
            
            .data-loading-error-header {
              margin-bottom: 32px;
            }
            
            .data-loading-error-icon {
              font-size: 80px;
              margin-bottom: 20px;
              filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
            }
            
            .data-loading-error-title {
              font-size: 28px;
              font-weight: 700;
              color: #1f2937;
              margin: 0 0 12px 0;
            }
            
            .data-loading-error-message {
              font-size: 18px;
              color: #6b7280;
              margin: 0;
              line-height: 1.6;
              max-width: 500px;
              margin: 0 auto;
            }
            
            .data-loading-status {
              margin-bottom: 32px;
            }
            
            .status-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 16px;
              background-color: #f8fafc;
              border-radius: 12px;
              padding: 24px;
              border: 1px solid #e2e8f0;
            }
            
            .status-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4px;
            }
            
            .status-label {
              font-size: 12px;
              font-weight: 600;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            
            .status-value {
              font-size: 14px;
              font-weight: 600;
              color: #1f2937;
            }
            
            .status-value.cached {
              color: #059669;
            }
            
            .status-value.error {
              color: #dc2626;
            }
            
            .data-loading-error-actions {
              display: flex;
              gap: 16px;
              justify-content: center;
              margin-bottom: 32px;
              flex-wrap: wrap;
            }
            
            .data-loading-error-button {
              padding: 14px 28px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              min-width: 140px;
            }
            
            .data-loading-error-button.primary {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            
            .data-loading-error-button.primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .data-loading-error-button.secondary {
              background-color: #f8fafc;
              color: #374151;
              border: 2px solid #e2e8f0;
            }
            
            .data-loading-error-button.secondary:hover {
              background-color: #e2e8f0;
              border-color: #cbd5e1;
            }
            
            .permission-info,
            .data-loading-error-help {
              text-align: left;
              margin-top: 32px;
              padding: 24px;
              background-color: #f8fafc;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
            }
            
            .permission-info h3,
            .data-loading-error-help h3 {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin: 0 0 16px 0;
            }
            
            .permission-levels {
              display: grid;
              gap: 12px;
              margin-top: 16px;
            }
            
            .permission-level {
              padding: 12px;
              background-color: white;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
              font-size: 14px;
              color: #4b5563;
            }
            
            .data-loading-error-help ul {
              margin: 0;
              padding-left: 20px;
            }
            
            .data-loading-error-help li {
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
        fallback={fallback || dataLoadingFallback}
        componentName={props.componentName || 'DataLoadingComponent'}
        context={{
          ...props.context,
          dataType: props.dataType,
          dataSource: this.state.dataSource,
          dataStatus: this.state.dataStatus,
          permissionLevel: this.state.permissionLevel
        }}
      >
        {children}
      </BaseErrorBoundary>
    );
  }
}

export default DataLoadingErrorBoundary; 