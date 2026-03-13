// src/components/OfflineFallbacks.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useOfflinePersistence } from '../utils/offline-persistence';

// ============================================
// OFFLINE FALLBACK TYPES
// ============================================

export interface OfflineFallbackProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showOfflineIndicator?: boolean;
  enableOfflineMode?: boolean;
  cacheStrategy?: 'stale-while-revalidate' | 'cache-first' | 'network-first';
  className?: string;
}

export interface OfflineIndicatorProps {
  isOnline: boolean;
  lastSyncTime?: number;
  pendingOperations?: number;
  className?: string;
}

export interface OfflineDataProps {
  data: any;
  isStale: boolean;
  lastUpdated: number;
  onRefresh?: () => void;
  className?: string;
}

export interface OfflineActionProps {
  action: () => Promise<void>;
  fallback?: () => void;
  queueIfOffline?: boolean;
  children: React.ReactNode;
  className?: string;
}

// ============================================
// OFFLINE FALLBACK COMPONENT
// ============================================

export const OfflineFallback: React.FC<OfflineFallbackProps> = ({
  children,
  fallback,
  showOfflineIndicator = true,
  enableOfflineMode = true,
  cacheStrategy = 'stale-while-revalidate',
  className = ''
}) => {
  const { syncStatus } = useOfflinePersistence();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const renderContent = () => {
    if (isOffline && !enableOfflineMode) {
      return fallback || <DefaultOfflineFallback />;
    }

    return (
      <>
        {children}
        {showOfflineIndicator && (
          <OfflineIndicator
            isOnline={!isOffline}
            lastSyncTime={syncStatus.lastSyncTime}
            pendingOperations={syncStatus.pendingOperations}
          />
        )}
      </>
    );
  };

  return (
    <div className={`offline-fallback ${className}`}>
      {renderContent()}
      <style>{`
        .offline-fallback {
          position: relative;
        }
      `}</style>
    </div>
  );
};

// ============================================
// DEFAULT OFFLINE FALLBACK
// ============================================

const DefaultOfflineFallback: React.FC = () => {
  return (
    <div className="default-offline-fallback">
      <div className="offline-content">
        <div className="offline-icon">📱</div>
        <h2>You're Offline</h2>
        <p>Please check your internet connection and try again.</p>
        <div className="offline-actions">
          <button onClick={() => window.location.reload()}>
            Retry Connection
          </button>
        </div>
      </div>
      <style>{`
        .default-offline-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
          background-color: #f9fafb;
        }
        
        .offline-content {
          text-align: center;
          max-width: 400px;
        }
        
        .offline-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }
        
        .offline-content h2 {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 8px 0;
        }
        
        .offline-content p {
          font-size: 16px;
          color: #6b7280;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }
        
        .offline-actions button {
          padding: 12px 24px;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .offline-actions button:hover {
          background-color: #2563eb;
        }
      `}</style>
    </div>
  );
};

// ============================================
// OFFLINE INDICATOR COMPONENT
// ============================================

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOnline,
  lastSyncTime,
  pendingOperations = 0,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isOnline || pendingOperations > 0) {
      setIsVisible(true);
    } else {
      // Hide after a delay when back online
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingOperations]);

  if (!isVisible) return null;

  return (
    <div className={`offline-indicator ${isOnline ? 'online' : 'offline'} ${className}`}>
      <div className="indicator-content">
        <div className="indicator-icon">
          {isOnline ? '✅' : '📡'}
        </div>
        <div className="indicator-text">
          {isOnline ? (
            <>
              <span>Back Online</span>
              {lastSyncTime && (
                <small>
                  Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
                </small>
              )}
            </>
          ) : (
            <>
              <span>You're Offline</span>
              {pendingOperations > 0 && (
                <small>{pendingOperations} pending changes</small>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`
        .offline-indicator {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: slideIn 0.3s ease-out;
          border-left: 4px solid;
        }
        
        .offline-indicator.offline {
          border-left-color: #ef4444;
        }
        
        .offline-indicator.online {
          border-left-color: #10b981;
        }
        
        .indicator-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .indicator-icon {
          font-size: 16px;
        }
        
        .indicator-text {
          display: flex;
          flex-direction: column;
        }
        
        .indicator-text span {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
        }
        
        .indicator-text small {
          font-size: 12px;
          color: #6b7280;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================
// OFFLINE DATA COMPONENT
// ============================================

export const OfflineData: React.FC<OfflineDataProps> = ({
  data,
  isStale,
  lastUpdated,
  onRefresh,
  className = ''
}) => {
  const { syncStatus } = useOfflinePersistence();
  const isOnline = syncStatus.isOnline;

  return (
    <div className={`offline-data ${className}`}>
      {isStale && (
        <div className="stale-data-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <span>Showing cached data</span>
            <small>
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </small>
            {isOnline && onRefresh && (
              <button onClick={onRefresh} className="refresh-button">
                Refresh
              </button>
            )}
          </div>
        </div>
      )}
      
      <div className="data-content">
        {data}
      </div>
      
      <style>{`
        .offline-data {
          position: relative;
        }
        
        .stale-data-warning {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 16px;
        }
        
        .warning-icon {
          font-size: 16px;
        }
        
        .warning-content {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        
        .warning-content span {
          font-size: 14px;
          font-weight: 500;
          color: #92400e;
        }
        
        .warning-content small {
          font-size: 12px;
          color: #b45309;
        }
        
        .refresh-button {
          margin-top: 4px;
          padding: 4px 8px;
          background-color: #f59e0b;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          align-self: flex-start;
        }
        
        .refresh-button:hover {
          background-color: #d97706;
        }
        
        .data-content {
          opacity: ${isStale ? 0.8 : 1};
        }
      `}</style>
    </div>
  );
};

// ============================================
// OFFLINE ACTION COMPONENT
// ============================================

export const OfflineAction: React.FC<OfflineActionProps> = ({
  action,
  fallback,
  queueIfOffline = true,
  children,
  className = ''
}) => {
  const { syncStatus, addToQueue } = useOfflinePersistence();
  const [isExecuting, setIsExecuting] = useState(false);

  const handleAction = useCallback(async () => {
    if (isExecuting) return;

    setIsExecuting(true);

    try {
      if (syncStatus.isOnline) {
        // Execute action immediately if online
        await action();
      } else if (queueIfOffline) {
        // Queue action for later if offline
        await addToQueue({
          type: 'create',
          collection: 'offline_actions',
          data: { action: action.toString() },
          maxRetries: 3,
          priority: 'normal'
        });
      } else if (fallback) {
        // Execute fallback if provided
        fallback();
      } else {
        throw new Error('Action cannot be executed offline');
      }
    } catch (error) {
      console.error('Action failed:', error);
      // Show error to user
    } finally {
      setIsExecuting(false);
    }
  }, [action, fallback, queueIfOffline, syncStatus.isOnline, addToQueue, isExecuting]);

  return (
    <div className={`offline-action ${className}`}>
      <button
        onClick={handleAction}
        disabled={isExecuting}
        className={`action-button ${!syncStatus.isOnline ? 'offline' : ''}`}
      >
        {isExecuting ? 'Processing...' : children}
      </button>
      
      {!syncStatus.isOnline && queueIfOffline && (
        <div className="offline-note">
          This action will be queued and executed when you're back online.
        </div>
      )}
      
      <style>{`
        .offline-action {
          display: inline-block;
        }
        
        .action-button {
          padding: 8px 16px;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .action-button:hover:not(:disabled) {
          background-color: #2563eb;
        }
        
        .action-button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
        
        .action-button.offline {
          background-color: #6b7280;
        }
        
        .action-button.offline:hover {
          background-color: #4b5563;
        }
        
        .offline-note {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
};

// ============================================
// OFFLINE CACHE MANAGER
// ============================================

export const OfflineCacheManager: React.FC = () => {
  const { syncStatus, clearQueue, retryFailed } = useOfflinePersistence();
  const [cacheStats, setCacheStats] = useState({
    totalItems: 0,
    pendingOperations: 0,
    failedOperations: 0
  });

  useEffect(() => {
    // Update cache stats
    setCacheStats({
      totalItems: localStorage.length,
      pendingOperations: syncStatus.pendingOperations,
      failedOperations: syncStatus.failedOperations
    });
  }, [syncStatus]);

  const handleClearCache = useCallback(() => {
    if (confirm('Are you sure you want to clear all cached data?')) {
      localStorage.clear();
      setCacheStats(prev => ({ ...prev, totalItems: 0 }));
    }
  }, []);

  const handleRetryFailed = useCallback(() => {
    retryFailed();
  }, [retryFailed]);

  return (
    <div className="offline-cache-manager">
      <h3>Offline Cache</h3>
      
      <div className="cache-stats">
        <div className="stat">
          <span className="stat-label">Cached Items:</span>
          <span className="stat-value">{cacheStats.totalItems}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Pending Operations:</span>
          <span className="stat-value">{cacheStats.pendingOperations}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Failed Operations:</span>
          <span className="stat-value">{cacheStats.failedOperations}</span>
        </div>
      </div>
      
      <div className="cache-actions">
        <button onClick={handleClearCache} className="cache-button">
          Clear Cache
        </button>
        {cacheStats.failedOperations > 0 && (
          <button onClick={handleRetryFailed} className="cache-button retry">
            Retry Failed
          </button>
        )}
      </div>
      
      <style>{`
        .offline-cache-manager {
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background-color: #f9fafb;
        }
        
        .offline-cache-manager h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .cache-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .stat-label {
          font-size: 14px;
          color: #6b7280;
        }
        
        .stat-value {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
        }
        
        .cache-actions {
          display: flex;
          gap: 8px;
        }
        
        .cache-button {
          padding: 6px 12px;
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

// ============================================
// HOOKS
// ============================================

export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
};

export const useOfflineData = <T,>(
  key: string,
  defaultValue: T,
  options: {
    ttl?: number; // Time to live in milliseconds
    staleWhileRevalidate?: boolean;
  } = {}
) => {
  const { ttl = 5 * 60 * 1000, staleWhileRevalidate = true } = options;
  const [data, setData] = useState<T>(defaultValue);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(0);

  const getCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age < ttl) {
          setData(cachedData);
          setLastUpdated(timestamp);
          setIsStale(false);
          return cachedData;
        } else if (staleWhileRevalidate) {
          setData(cachedData);
          setLastUpdated(timestamp);
          setIsStale(true);
          return cachedData;
        }
      }
    } catch (error) {
      console.error('Error reading cached data:', error);
    }
    
    return defaultValue;
  }, [key, ttl, staleWhileRevalidate, defaultValue]);

  const setCachedData = useCallback((newData: T) => {
    try {
      const timestamp = Date.now();
      const cacheData = { data: newData, timestamp };
      localStorage.setItem(key, JSON.stringify(cacheData));
      setData(newData);
      setLastUpdated(timestamp);
      setIsStale(false);
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }, [key]);

  useEffect(() => {
    getCachedData();
  }, [getCachedData]);

  return {
    data,
    isStale,
    lastUpdated,
    setData: setCachedData,
    refresh: getCachedData
  };
};

export default OfflineFallback; 