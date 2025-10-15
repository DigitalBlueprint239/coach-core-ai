import { dataService } from './data-service';
import { syncService } from './sync-service';
import { conflictResolutionService } from './conflict-resolution';

export interface OfflineFirstOptions {
  enableLocalCache?: boolean;
  enableBackgroundSync?: boolean;
  cacheExpiry?: number; // in milliseconds
  maxCacheSize?: number; // in MB
}

export class OfflineFirstService {
  private options: OfflineFirstOptions;
  private localCache: Map<string, { data: any; timestamp: number; version: number }> = new Map();
  private cacheVersion = 1;

  constructor(options: OfflineFirstOptions = {}) {
    this.options = {
      enableLocalCache: true,
      enableBackgroundSync: true,
      cacheExpiry: 5 * 60 * 1000, // 5 minutes
      maxCacheSize: 50, // 50MB
      ...options,
    };

    this.initializeCache();
  }

  private initializeCache() {
    // Load cache from localStorage on initialization
    try {
      const storedCache = localStorage.getItem('coach_core_cache');
      if (storedCache) {
        const parsedCache = JSON.parse(storedCache);
        this.localCache = new Map(parsedCache);
      }
    } catch (error) {
      console.error('Failed to load cache from localStorage:', error);
      this.localCache = new Map();
    }

    // Set up cache cleanup interval
    if (this.options.enableLocalCache) {
      setInterval(() => this.cleanupCache(), 60000); // Clean up every minute
    }
  }

  private saveCache() {
    if (!this.options.enableLocalCache) return;

    try {
      const cacheArray = Array.from(this.localCache.entries());
      localStorage.setItem('coach_core_cache', JSON.stringify(cacheArray));
    } catch (error) {
      console.error('Failed to save cache to localStorage:', error);
    }
  }

  private cleanupCache() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, value] of this.localCache.entries()) {
      if (now - value.timestamp > this.options.cacheExpiry!) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.localCache.delete(key));
    
    if (expiredKeys.length > 0) {
      this.saveCache();
    }
  }

  private getCacheKey(collectionName: string, docId?: string, queryOptions?: any): string {
    if (docId) {
      return `${collectionName}:${docId}`;
    }
    
    const queryString = queryOptions ? JSON.stringify(queryOptions) : 'all';
    return `${collectionName}:query:${queryString}`;
  }

  private isCacheValid(key: string): boolean {
    const cached = this.localCache.get(key);
    if (!cached) return false;

    const now = Date.now();
    return (now - cached.timestamp) < this.options.cacheExpiry!;
  }

  private setCache(key: string, data: any) {
    if (!this.options.enableLocalCache) return;

    this.localCache.set(key, {
      data,
      timestamp: Date.now(),
      version: this.cacheVersion,
    });

    this.saveCache();
  }

  private getCache(key: string): any | null {
    if (!this.options.enableLocalCache) return null;

    const cached = this.localCache.get(key);
    if (!cached || !this.isCacheValid(key)) {
      return null;
    }

    return cached.data;
  }

  // Offline-first read with local cache
  async read<T>(collectionName: string, docId: string): Promise<T | null> {
    const cacheKey = this.getCacheKey(collectionName, docId);
    
    // Try cache first
    const cachedData = this.getCache(cacheKey);
    if (cachedData) {
      return cachedData as T;
    }

    // If offline, return cached data even if expired
    if (!navigator.onLine) {
      const cached = this.localCache.get(cacheKey);
      if (cached) {
        return cached.data as T;
      }
      return null;
    }

    try {
      // Fetch from server
      const data = await dataService.read<T>(collectionName, docId);
      
      // Cache the result
      if (data) {
        this.setCache(cacheKey, data);
      }
      
      return data;
    } catch (error) {
      console.error('Failed to read from server, trying cache:', error);
      
      // Fallback to cache
      const cached = this.localCache.get(cacheKey);
      return cached ? cached.data as T : null;
    }
  }

  // Offline-first read many with local cache
  async readMany<T>(collectionName: string, queryOptions?: any): Promise<T[]> {
    const cacheKey = this.getCacheKey(collectionName, undefined, queryOptions);
    
    // Try cache first
    const cachedData = this.getCache(cacheKey);
    if (cachedData) {
      return cachedData as T[];
    }

    // If offline, return cached data even if expired
    if (!navigator.onLine) {
      const cached = this.localCache.get(cacheKey);
      if (cached) {
        return cached.data as T[];
      }
      return [];
    }

    try {
      // Fetch from server
      const data = await dataService.readMany<T>(collectionName, queryOptions);
      
      // Cache the result
      this.setCache(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error('Failed to read from server, trying cache:', error);
      
      // Fallback to cache
      const cached = this.localCache.get(cacheKey);
      return cached ? cached.data as T[] : [];
    }
  }

  // Offline-first create with local cache update
  async create<T extends Record<string, any>>(
    collectionName: string, 
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    docId?: string
  ): Promise<string> {
    try {
      // Create on server
      const id = await dataService.create(collectionName, data, docId);
      
      // Update local cache
      if (this.options.enableLocalCache) {
        const cacheKey = this.getCacheKey(collectionName, id);
        const fullData = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
        this.setCache(cacheKey, fullData);
        
        // Invalidate query caches for this collection
        this.invalidateCollectionCache(collectionName);
      }
      
      return id;
    } catch (error) {
      // If offline, queue for later sync
      if (!navigator.onLine) {
        console.log('Offline: Queuing create operation for later sync');
        // The offline queue will handle this
        throw error;
      }
      throw error;
    }
  }

  // Offline-first update with local cache update
  async update<T extends Record<string, any>>(
    collectionName: string, 
    docId: string, 
    data: Partial<T>
  ): Promise<void> {
    try {
      // Update on server
      await dataService.update(collectionName, docId, data);
      
      // Update local cache
      if (this.options.enableLocalCache) {
        const cacheKey = this.getCacheKey(collectionName, docId);
        const cached = this.localCache.get(cacheKey);
        if (cached) {
          const updatedData = { ...cached.data, ...data, updatedAt: new Date() };
          this.setCache(cacheKey, updatedData);
        }
        
        // Invalidate query caches for this collection
        this.invalidateCollectionCache(collectionName);
      }
    } catch (error) {
      // If offline, queue for later sync
      if (!navigator.onLine) {
        console.log('Offline: Queuing update operation for later sync');
        // The offline queue will handle this
        throw error;
      }
      throw error;
    }
  }

  // Offline-first delete with local cache update
  async delete(collectionName: string, docId: string): Promise<void> {
    try {
      // Delete on server
      await dataService.delete(collectionName, docId);
      
      // Update local cache
      if (this.options.enableLocalCache) {
        const cacheKey = this.getCacheKey(collectionName, docId);
        this.localCache.delete(cacheKey);
        
        // Invalidate query caches for this collection
        this.invalidateCollectionCache(collectionName);
        
        this.saveCache();
      }
    } catch (error) {
      // If offline, queue for later sync
      if (!navigator.onLine) {
        console.log('Offline: Queuing delete operation for later sync');
        // The offline queue will handle this
        throw error;
      }
      throw error;
    }
  }

  // Invalidate all caches for a collection
  private invalidateCollectionCache(collectionName: string) {
    const keysToDelete: string[] = [];
    
    for (const key of this.localCache.keys()) {
      if (key.startsWith(`${collectionName}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.localCache.delete(key));
    this.saveCache();
  }

  // Clear all cache
  clearCache() {
    this.localCache.clear();
    localStorage.removeItem('coach_core_cache');
  }

  // Get cache statistics
  getCacheStats() {
    const totalEntries = this.localCache.size;
    const totalSize = JSON.stringify(Array.from(this.localCache.entries())).length;
    const sizeInMB = totalSize / (1024 * 1024);
    
    return {
      totalEntries,
      totalSize,
      sizeInMB,
      maxSize: this.options.maxCacheSize,
      isOverLimit: sizeInMB > this.options.maxCacheSize!,
    };
  }

  // Force sync all data
  async forceSync() {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    // Clear cache and reload all data
    this.clearCache();
    
    // Trigger sync service
    await syncService.forceSync();
  }
}

// Create default offline-first service
export const offlineFirstService = new OfflineFirstService();

// Create specialized instances
export const teamOfflineService = new OfflineFirstService({
  enableLocalCache: true,
  enableBackgroundSync: true,
  cacheExpiry: 2 * 60 * 1000, // 2 minutes for team data
});

export const practiceOfflineService = new OfflineFirstService({
  enableLocalCache: true,
  enableBackgroundSync: true,
  cacheExpiry: 5 * 60 * 1000, // 5 minutes for practice data
});

export const gameOfflineService = new OfflineFirstService({
  enableLocalCache: true,
  enableBackgroundSync: true,
  cacheExpiry: 1 * 60 * 1000, // 1 minute for game data (more frequent updates)
});

