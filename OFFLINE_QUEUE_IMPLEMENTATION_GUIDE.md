# 🔄 Offline Queue System Implementation Guide

## Overview

This document describes the comprehensive offline queue system implementation for the Coach Core AI application. The system provides robust offline capabilities with IndexedDB persistence, Service Worker background sync, conflict resolution, and intelligent retry logic using a consistent retry pattern.

## 🎯 Key Features

### 1. **OfflineQueueManager Class**
- ✅ **IndexedDB Persistence**: Robust data storage with automatic schema management
- ✅ **Queue Priority System**: CRITICAL, HIGH, NORMAL, LOW priority levels
- ✅ **Conflict Resolution**: Server wins, client wins, merge, and user choice strategies
- ✅ **Batch Processing**: Support for atomic batch operations
- ✅ **Consistent Retry Pattern**: Unified retry logic across all operations

### 2. **Service Worker Implementation**
- ✅ **Background Sync**: Automatic sync when network is restored
- ✅ **Network Detection**: Real-time online/offline status monitoring
- ✅ **Queue Processing**: Background queue processing with progress tracking
- ✅ **Cache Management**: Intelligent caching and offline fallbacks
- ✅ **Retry Integration**: Consistent retry pattern for all network operations

### 3. **UI Components**
- ✅ **Sync Status Indicator**: Real-time sync status with progress bars
- ✅ **Queue Viewer**: Comprehensive queue management interface
- ✅ **Conflict Resolution UI**: Interactive conflict resolution interface
- ✅ **Offline Dashboard**: Complete offline management dashboard

### 4. **Integration**
- ✅ **React Hook**: `useOfflineQueue` for easy integration
- ✅ **Automatic Queue Management**: Seamless integration with existing operations
- ✅ **Smart Retry Logic**: Exponential backoff with configurable attempts
- ✅ **Transaction Support**: Atomic batch operations

## 🔄 Consistent Retry Pattern

### Core Retry Utility
```typescript
const withRetry = async <T>(
  fn: () => Promise<T>,
  options = { maxAttempts: 3, delay: 1000 }
): Promise<T> => {
  for (let i = 0; i < options.maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === options.maxAttempts - 1) throw error;
      await new Promise(resolve => 
        setTimeout(resolve, options.delay * Math.pow(2, i))
      );
    }
  }
  throw new Error('Max retries reached');
};
```

### Usage Across Components

#### 1. OfflineQueueManager
```typescript
export class OfflineQueueManager {
  private withRetry = async <T>(
    fn: () => Promise<T>,
    options = { maxAttempts: 3, delay: 1000 }
  ): Promise<T> => {
    for (let i = 0; i < options.maxAttempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === options.maxAttempts - 1) throw error;
        await new Promise(resolve => 
          setTimeout(resolve, options.delay * Math.pow(2, i))
        );
      }
    }
    throw new Error('Max retries reached');
  };

  // Used in queue processing
  private async processQueueItem(item: QueueItem): Promise<void> {
    return this.withRetry(async () => {
      // Process queue item logic
    }, { maxAttempts: item.maxRetries, delay: 1000 });
  }
}
```

#### 2. Service Worker
```javascript
const withRetry = async (fn, options = { maxAttempts: 3, delay: 1000 }) => {
  for (let i = 0; i < options.maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === options.maxAttempts - 1) throw error;
      await new Promise(resolve => 
        setTimeout(resolve, options.delay * Math.pow(2, i))
      );
    }
  }
  throw new Error('Max retries reached');
};

// Used in fetch handling
async function handleAPIRequest(request) {
  return withRetry(async () => {
    try {
      if (isOnline) {
        const response = await fetch(request);
        if (response.ok) {
          return response;
        }
      }
      
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return new Response(
        JSON.stringify({ error: 'Offline - No cached data available' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
      
    } catch (error) {
      console.error('API request failed:', error);
      
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return new Response(
        JSON.stringify({ error: 'Network error' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }, { maxAttempts: 3, delay: 1000 });
}
```

#### 3. React Hook
```typescript
export const useOfflineQueue = (options: UseOfflineQueueOptions) => {
  const withRetry = useCallback(async <T>(
    fn: () => Promise<T>,
    options = { maxAttempts: 3, delay: 1000 }
  ): Promise<T> => {
    for (let i = 0; i < options.maxAttempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === options.maxAttempts - 1) throw error;
        await new Promise(resolve => 
          setTimeout(resolve, options.delay * Math.pow(2, i))
        );
      }
    }
    throw new Error('Max retries reached');
  }, []);

  const retryWithBackoff = useCallback(async <T>(
    operation: () => Promise<T>,
    maxRetries: number = retryAttempts
  ): Promise<T> => {
    return withRetry(operation, { maxAttempts: maxRetries, delay: 1000 });
  }, [retryAttempts, withRetry]);
};
```

#### 4. Utility Functions
```typescript
// src/utils/retry.ts
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoffMultiplier = 2,
    maxDelay = 30000,
    onRetry,
    shouldRetry
  } = options;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      if (shouldRetry && !shouldRetry(err)) {
        throw err;
      }
      
      if (i === maxAttempts - 1) {
        throw err;
      }
      
      if (onRetry) {
        onRetry(i + 1, err);
      }
      
      const currentDelay = Math.min(
        delay * Math.pow(backoffMultiplier, i),
        maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }
  
  throw new Error('Max retries reached');
};
```

## 🏗️ Architecture

### System Components with Retry Integration

```
Offline Queue System
├── OfflineQueueManager (IndexedDB)
│   ├── Queue Management
│   ├── Conflict Resolution
│   ├── Priority System
│   ├── Batch Processing
│   └── withRetry Utility
├── Service Worker
│   ├── Background Sync
│   ├── Network Detection
│   ├── Cache Management
│   ├── Progress Tracking
│   └── withRetry Utility
├── UI Components
│   ├── SyncStatusIndicator
│   ├── QueueViewer
│   ├── ConflictResolutionUI
│   └── OfflineDashboard
├── React Integration
│   ├── useOfflineQueue Hook
│   ├── Automatic Fallbacks
│   ├── Smart Retry Logic
│   └── Transaction Support
└── Utility Functions
    ├── withRetry
    ├── withNetworkRetry
    ├── withDatabaseRetry
    └── withAPIRetry
```

## 🔧 Implementation Details

### 1. OfflineQueueManager Class

#### Core Features with Retry
```typescript
export class OfflineQueueManager {
  // Retry utility integrated into all operations
  private withRetry = async <T>(
    fn: () => Promise<T>,
    options = { maxAttempts: 3, delay: 1000 }
  ): Promise<T> => {
    for (let i = 0; i < options.maxAttempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === options.maxAttempts - 1) throw error;
        await new Promise(resolve => 
          setTimeout(resolve, options.delay * Math.pow(2, i))
        );
      }
    }
    throw new Error('Max retries reached');
  };

  // Queue processing with retry
  async processQueue(): Promise<void> {
    if (this.processingQueue || !this.isOnline()) {
      return;
    }

    this.processingQueue = true;
    
    try {
      const pendingItems = await this.getQueueItems({ status: 'PENDING' });
      
      for (const item of pendingItems) {
        try {
          await this.withRetry(
            () => this.processQueueItem(item),
            { maxAttempts: item.maxRetries, delay: 1000 }
          );
        } catch (error) {
          console.error(`Failed to process queue item ${item.id}:`, error);
          await this.handleProcessingError(item, error);
        }
      }
      
      await this.processConflicts();
      
    } catch (error) {
      console.error('Queue processing failed:', error);
    } finally {
      this.processingQueue = false;
    }
  }
}
```

### 2. Service Worker Implementation

#### Retry-Enhanced Fetch Handling
```javascript
const withRetry = async (fn, options = { maxAttempts: 3, delay: 1000 }) => {
  for (let i = 0; i < options.maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === options.maxAttempts - 1) throw error;
      await new Promise(resolve => 
        setTimeout(resolve, options.delay * Math.pow(2, i))
      );
    }
  }
  throw new Error('Max retries reached');
};

async function handleAPIRequest(request) {
  return withRetry(async () => {
    try {
      if (isOnline) {
        const response = await fetch(request);
        if (response.ok) {
          return response;
        }
      }
      
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return new Response(
        JSON.stringify({ error: 'Offline - No cached data available' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
      
    } catch (error) {
      console.error('API request failed:', error);
      
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return new Response(
        JSON.stringify({ error: 'Network error' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }, { maxAttempts: 3, delay: 1000 });
}
```

### 3. React Integration Hook

#### Retry-Enhanced Operations
```typescript
export const useOfflineQueue = (options: UseOfflineQueueOptions) => {
  const withRetry = useCallback(async <T>(
    fn: () => Promise<T>,
    options = { maxAttempts: 3, delay: 1000 }
  ): Promise<T> => {
    for (let i = 0; i < options.maxAttempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === options.maxAttempts - 1) throw error;
        await new Promise(resolve => 
          setTimeout(resolve, options.delay * Math.pow(2, i))
        );
      }
    }
    throw new Error('Max retries reached');
  }, []);

  const retryWithBackoff = useCallback(async <T>(
    operation: () => Promise<T>,
    maxRetries: number = retryAttempts
  ): Promise<T> => {
    return withRetry(operation, { maxAttempts: maxRetries, delay: 1000 });
  }, [retryAttempts, withRetry]);

  const withOfflineFallback = useCallback(async <T>(
    onlineOperation: () => Promise<T>,
    offlineOperation: () => Promise<string>,
    options: {
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
      metadata?: any;
    } = {}
  ): Promise<T | string> => {
    if (isOnline) {
      try {
        return await retryWithBackoff(onlineOperation);
      } catch (error) {
        console.warn('Online operation failed, falling back to offline queue:', error);
        return await offlineOperation();
      }
    } else {
      return await offlineOperation();
    }
  }, [isOnline, retryWithBackoff]);
};
```

## 🚀 Usage Examples

### 1. Basic Integration with Retry
```typescript
import { useOfflineQueue } from '../hooks/useOfflineQueue';

const MyComponent = () => {
  const {
    isOnline,
    queueStats,
    createDocument,
    updateDocument,
    withRetry,
    retryWithBackoff
  } = useOfflineQueue({
    userId: currentUser.id,
    teamId: currentTeam.id,
    autoSync: true
  });

  const handleCreatePlayer = async (playerData: any) => {
    try {
      // Use retry for critical operations
      const itemId = await withRetry(
        () => createDocument('players', playerData, 'HIGH'),
        { maxAttempts: 5, delay: 1000 }
      );
      console.log('Player creation queued:', itemId);
    } catch (error) {
      console.error('Failed to queue player creation:', error);
    }
  };

  const handleUpdatePlayer = async (playerId: string, updates: any) => {
    try {
      const itemId = await retryWithBackoff(
        () => updateDocument('players', playerId, updates, {
          priority: 'NORMAL',
          originalVersion: currentVersion,
          conflictResolution: 'USER_CHOICE'
        })
      );
      console.log('Player update queued:', itemId);
    } catch (error) {
      console.error('Failed to queue player update:', error);
    }
  };

  return (
    <div>
      <SyncStatusIndicator userId={currentUser.id} showDetails={true} />
      <button onClick={handleCreatePlayer}>Create Player</button>
      <button onClick={handleUpdatePlayer}>Update Player</button>
    </div>
  );
};
```

### 2. Transaction Support with Retry
```typescript
const handleComplexOperation = async () => {
  const transaction = createTransaction();
  
  // Add multiple operations
  transaction.add({
    type: 'CREATE',
    collection: 'players',
    data: { name: 'John Doe', position: 'QB' }
  });
  
  transaction.add({
    type: 'UPDATE',
    collection: 'teams',
    documentId: teamId,
    data: { playerCount: currentCount + 1 }
  });
  
  // Commit with retry
  try {
    const batchId = await withRetry(
      () => transaction.commit('HIGH'),
      { maxAttempts: 3, delay: 2000 }
    );
    console.log('Batch operation committed:', batchId);
  } catch (error) {
    console.error('Batch operation failed:', error);
    transaction.rollback();
  }
};
```

### 3. Smart Retry Logic with Fallback
```typescript
const handleDataOperation = async () => {
  const result = await withOfflineFallback(
    // Online operation with retry
    () => retryWithBackoff(async () => {
      const response = await fetch('/api/players', {
        method: 'POST',
        body: JSON.stringify(playerData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    }, 5), // Max 5 retry attempts
    
    // Offline fallback
    () => createDocument('players', playerData, 'HIGH'),
    {
      priority: 'HIGH',
      metadata: { description: 'Player creation with retry' }
    }
  );
  
  console.log('Operation result:', result);
};
```

### 4. Specialized Retry Functions
```typescript
import { withNetworkRetry, withDatabaseRetry, withAPIRetry } from '../utils/retry';

// Network-specific retry
const networkOperation = async () => {
  return withNetworkRetry(
    () => fetch('/api/data'),
    { maxAttempts: 3, delay: 1000 }
  );
};

// Database-specific retry
const databaseOperation = async () => {
  return withDatabaseRetry(
    () => offlineQueueManager.getQueueStats(),
    { maxAttempts: 5, delay: 500 }
  );
};

// API-specific retry
const apiOperation = async () => {
  return withAPIRetry(
    () => fetch('/api/players'),
    { maxAttempts: 3, delay: 1000 }
  );
};
```

## 📊 Monitoring and Analytics

### Retry Performance Metrics
- **Retry Success Rate**: Percentage of operations that succeed after retries
- **Average Retry Attempts**: Mean number of retries needed per operation
- **Retry Delay Patterns**: Analysis of optimal delay configurations
- **Error Type Distribution**: Categorization of errors that trigger retries

### Queue Statistics with Retry Data
```typescript
const stats = await offlineQueueManager.getQueueStats();
console.log('Queue Stats with Retry Info:', {
  total: stats.total,
  pending: stats.pending,
  completed: stats.completed,
  failed: stats.failed,
  conflicts: stats.conflicts,
  averageRetries: stats.averageRetries, // New metric
  retrySuccessRate: stats.retrySuccessRate // New metric
});
```

## 🔒 Security Considerations

### Retry Security
- **Rate Limiting**: Respect rate limits during retries
- **Exponential Backoff**: Prevent overwhelming services
- **Error Classification**: Distinguish between retryable and non-retryable errors
- **Timeout Management**: Prevent infinite retry loops

### Conflict Resolution Security
- **Version Validation**: Ensure data integrity during conflicts
- **User Permissions**: Validate user permissions for conflict resolution
- **Data Sanitization**: Clean data before merging
- **Audit Logging**: Log all conflict resolution decisions

## 🛠️ Configuration Options

### Retry Configuration
```typescript
const retryConfig = {
  defaultMaxAttempts: 3,
  defaultDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 30000,
  networkRetryAttempts: 3,
  databaseRetryAttempts: 5,
  apiRetryAttempts: 3
};
```

### Queue Configuration with Retry
```typescript
const queueConfig = {
  maxQueueSize: 1000,
  maxRetries: 3,
  retryDelay: 1000,
  batchSize: 50,
  syncInterval: 30000,
  retryBackoffMultiplier: 2,
  maxRetryDelay: 30000
};
```

## 🚀 Performance Optimizations

### 1. Retry Optimization
- **Smart Retry Logic**: Only retry appropriate errors
- **Exponential Backoff**: Prevent service overload
- **Retry Limits**: Prevent infinite retry loops
- **Error Classification**: Distinguish retryable from non-retryable errors

### 2. Batch Processing with Retry
- **Atomic Operations**: Ensure batch integrity
- **Partial Success Handling**: Handle partial batch failures
- **Retry Strategies**: Different retry strategies for different operation types

### 3. Conflict Resolution Optimization
- **Auto-resolve Simple Conflicts**: Reduce user intervention
- **Batch Conflict Resolution**: Process multiple conflicts efficiently
- **Optimize Merge Algorithms**: Fast and accurate merging

## 🔄 Migration Guide

### From Basic Retry Logic
```typescript
// Before
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    return await operation();
  } catch (error) {
    if (attempt === maxRetries) throw error;
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}

// After
import { withRetry } from '../utils/retry';

const result = await withRetry(
  () => operation(),
  { maxAttempts: 3, delay: 1000 }
);
```

### From Manual Error Handling
```typescript
// Before
try {
  await apiCall();
} catch (error) {
  if (error.status === 429) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    await apiCall();
  }
}

// After
import { withAPIRetry } from '../utils/retry';

const result = await withAPIRetry(() => apiCall());
```

## 🎯 Best Practices

### 1. Retry Strategy
- **Use Appropriate Retry Functions**: Network, database, or API-specific retries
- **Configure Retry Limits**: Prevent infinite retry loops
- **Implement Exponential Backoff**: Reduce service load
- **Log Retry Attempts**: Monitor retry patterns

### 2. Error Handling
- **Classify Errors**: Distinguish retryable from non-retryable errors
- **Provide Fallbacks**: Always have offline alternatives
- **Monitor Performance**: Track retry success rates
- **User Feedback**: Inform users of retry attempts

### 3. Performance
- **Optimize Retry Delays**: Balance responsiveness with service load
- **Batch Operations**: Reduce individual retry overhead
- **Cache Results**: Avoid unnecessary retries
- **Monitor Metrics**: Track retry performance

### 4. User Experience
- **Progress Indicators**: Show retry progress
- **Error Messages**: Clear, actionable error messages
- **Offline Support**: Graceful offline operation
- **Recovery Options**: Manual retry and fallback options

---

This comprehensive offline queue system with consistent retry patterns provides robust offline capabilities with intelligent error handling, smart retry logic, and seamless integration with existing data operations. The unified retry pattern ensures consistent behavior across all components while maintaining excellent user experience in both online and offline scenarios. 