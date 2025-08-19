// src/components/offline/SyncStatusIndicator.tsx
import React, { useState, useEffect } from 'react';
import { offlineQueueManager } from '../../services/offline/OfflineQueueManager';

interface SyncStatusIndicatorProps {
  userId: string;
  showDetails?: boolean;
  className?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  userId, 
  showDetails = false,
  className = ''
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncProgress, setSyncProgress] = useState<number>(0);

  useEffect(() => {
    // Network status listener
    const unsubscribe = offlineQueueManager.onNetworkStatusChange((status) => {
      setIsOnline(status === 'online');
      if (status === 'online') {
        setLastSync(Date.now());
      }
    });

    // Update queue stats periodically
    const updateStats = async () => {
      try {
        const stats = await offlineQueueManager.getQueueStats();
        setQueueStats(stats);
      } catch (error) {
        console.error('Failed to get queue stats:', error);
      }
    };

    updateStats();
    const statsInterval = setInterval(updateStats, 5000);

    // Listen for service worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data.type === 'NETWORK_STATUS') {
        setIsOnline(event.data.status === 'online');
      } else if (event.data.type === 'PROGRESS_UPDATE') {
        setSyncProgress(event.data.progress);
        if (event.data.progress === 100) {
          setIsProcessing(false);
          setLastSync(Date.now());
        }
      } else if (event.data.type === 'PROCESS_OFFLINE_QUEUE') {
        setIsProcessing(true);
        setSyncProgress(0);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      unsubscribe();
      clearInterval(statsInterval);
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-600';
    if (isProcessing) return 'text-yellow-600';
    if (queueStats?.pending > 0) return 'text-orange-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (!isOnline) return '🔴';
    if (isProcessing) return '🔄';
    if (queueStats?.pending > 0) return '⏳';
    return '✅';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isProcessing) return 'Syncing...';
    if (queueStats?.pending > 0) return `${queueStats.pending} pending`;
    return 'Synced';
  };

  const formatLastSync = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const handleManualSync = async () => {
    if (!isOnline) return;
    
    setIsProcessing(true);
    setSyncProgress(0);
    
    try {
      await offlineQueueManager.processQueue();
      setLastSync(Date.now());
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsProcessing(false);
      setSyncProgress(0);
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Status Icon */}
      <div className={`text-lg ${getStatusColor()}`}>
        {getStatusIcon()}
      </div>

      {/* Status Text */}
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        
        {lastSync && (
          <span className="text-xs text-gray-500">
            Last sync: {formatLastSync(lastSync)}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="flex-1 max-w-32">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${syncProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Manual Sync Button */}
      {isOnline && queueStats?.pending > 0 && !isProcessing && (
        <button
          onClick={handleManualSync}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Sync Now
        </button>
      )}

      {/* Detailed Stats */}
      {showDetails && queueStats && (
        <div className="ml-4 pl-4 border-l border-gray-200">
          <div className="text-xs text-gray-600 space-y-1">
            <div>Total: {queueStats.total}</div>
            <div>Pending: {queueStats.pending}</div>
            <div>Failed: {queueStats.failed}</div>
            {queueStats.conflicts > 0 && (
              <div className="text-orange-600">Conflicts: {queueStats.conflicts}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 