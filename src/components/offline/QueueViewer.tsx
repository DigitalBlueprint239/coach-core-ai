// src/components/offline/QueueViewer.tsx
import React, { useState, useEffect } from 'react';
import {
  offlineQueueManager,
  QueueItem,
} from '../../services/offline/OfflineQueueManager';

interface QueueViewerProps {
  userId: string;
  className?: string;
}

export const QueueViewer: React.FC<QueueViewerProps> = ({
  userId,
  className = '',
}) => {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '' as QueueItem['status'] | '',
    priority: '' as QueueItem['priority'] | '',
    collection: '',
  });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    loadQueueItems();
    const interval = setInterval(loadQueueItems, 3000);
    return () => clearInterval(interval);
  }, [filters]);

  const loadQueueItems = async () => {
    try {
      setLoading(true);
      const items = await offlineQueueManager.getQueueItems({
        userId,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.collection && { collection: filters.collection }),
      });
      setQueueItems(items);
    } catch (error) {
      console.error('Failed to load queue items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryItem = async (itemId: string) => {
    try {
      const item = queueItems.find(i => i.id === itemId);
      if (!item) return;

      // Reset item status and retry count
      item.status = 'PENDING';
      item.retryCount = 0;
      item.error = undefined;

      // Update the item in the queue
      await offlineQueueManager['updateInIndexedDB']('queue', item);

      // Trigger queue processing
      if (offlineQueueManager.isOnline()) {
        await offlineQueueManager.processQueue();
      }

      loadQueueItems();
    } catch (error) {
      console.error('Failed to retry item:', error);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await offlineQueueManager.removeFromQueue(itemId);
      setSelectedItems(prev => prev.filter(id => id !== itemId));
      loadQueueItems();
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleRemoveSelected = async () => {
    try {
      await Promise.all(
        selectedItems.map(id => offlineQueueManager.removeFromQueue(id))
      );
      setSelectedItems([]);
      loadQueueItems();
    } catch (error) {
      console.error('Failed to remove selected items:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === queueItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(queueItems.map(item => item.id));
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const getStatusColor = (status: QueueItem['status']) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50';
      case 'PROCESSING':
        return 'text-blue-600 bg-blue-50';
      case 'COMPLETED':
        return 'text-green-600 bg-green-50';
      case 'FAILED':
        return 'text-red-600 bg-red-50';
      case 'CONFLICT':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: QueueItem['priority']) => {
    switch (priority) {
      case 'CRITICAL':
        return 'text-red-600';
      case 'HIGH':
        return 'text-orange-600';
      case 'NORMAL':
        return 'text-blue-600';
      case 'LOW':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getOperationDescription = (item: QueueItem) => {
    switch (item.type) {
      case 'CREATE':
        return `Create document in ${item.collection}`;
      case 'UPDATE':
        return `Update ${item.documentId} in ${item.collection}`;
      case 'DELETE':
        return `Delete ${item.documentId} from ${item.collection}`;
      case 'BATCH':
        return `Batch operation on ${item.collection}`;
      default:
        return `${item.type} operation`;
    }
  };

  const filteredItems = queueItems.filter(item => {
    if (filters.status && item.status !== filters.status) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.collection && item.collection !== filters.collection)
      return false;
    return true;
  });

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Offline Queue</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {filteredItems.length} items
            </span>
            <button
              onClick={loadQueueItems}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.status}
            onChange={e =>
              setFilters(prev => ({ ...prev, status: e.target.value as any }))
            }
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="CONFLICT">Conflict</option>
          </select>

          <select
            value={filters.priority}
            onChange={e =>
              setFilters(prev => ({ ...prev, priority: e.target.value as any }))
            }
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>

          <input
            type="text"
            placeholder="Filter by collection..."
            value={filters.collection}
            onChange={e =>
              setFilters(prev => ({ ...prev, collection: e.target.value }))
            }
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />

          {selectedItems.length > 0 && (
            <button
              onClick={handleRemoveSelected}
              className="px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
            >
              Remove Selected ({selectedItems.length})
            </button>
          )}
        </div>
      </div>

      {/* Queue Items */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading queue items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No queue items found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredItems.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collection
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {getOperationDescription(item)}
                    </div>
                    {item.error && (
                      <div className="text-xs text-red-600 mt-1">
                        Error: {item.error}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm font-medium ${getPriorityColor(item.priority)}`}
                    >
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.collection}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatTimestamp(item.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      {item.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetryItem(item.id)}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Retry
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
