// src/utils/performance-optimization.ts
import React, {
  ComponentType,
  ReactNode,
  lazy,
  useCallback,
  useEffect,
  useState,
} from 'react';

// ============================================
// PERFORMANCE TYPES
// ============================================

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  bundleSize: number;
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
  cacheHitRate: number;
}

export interface BundleAnalysis {
  totalSize: number;
  chunkCount: number;
  chunks: BundleChunk[];
  dependencies: BundleDependency[];
  recommendations: BundleRecommendation[];
}

export interface BundleChunk {
  name: string;
  size: number;
  modules: string[];
  dependencies: string[];
}

export interface BundleDependency {
  name: string;
  size: number;
  version: string;
  usedIn: string[];
}

export interface BundleRecommendation {
  type: 'split' | 'remove' | 'optimize' | 'lazy';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  savings: number;
}

export interface LazyLoadConfig {
  fallback: ReactNode;
  timeout: number;
  retryAttempts: number;
  preloadThreshold: number;
}

export interface CodeSplitConfig {
  chunks: ChunkConfig[];
  optimization: OptimizationConfig;
  monitoring: MonitoringConfig;
}

export interface ChunkConfig {
  name: string;
  entry: string;
  test: RegExp;
  priority: 'high' | 'medium' | 'low';
  preload: boolean;
}

export interface OptimizationConfig {
  minify: boolean;
  compress: boolean;
  treeShake: boolean;
  splitVendor: boolean;
  cacheBusting: boolean;
}

export interface MonitoringConfig {
  enabled: boolean;
  sampleRate: number;
  metrics: string[];
  reporting: 'console' | 'analytics' | 'custom';
}

// ============================================
// CODE SPLITTING UTILITIES
// ============================================

export class CodeSplittingManager {
  private chunks: Map<string, ComponentType<any>> = new Map();
  private loadedChunks: Set<string> = new Set();
  private loadingChunks: Set<string> = new Set();
  private chunkConfigs: ChunkConfig[] = [];

  constructor(config?: CodeSplitConfig) {
    if (config) {
      this.chunkConfigs = config.chunks;
    }
  }

  // ============================================
  // LAZY LOADING COMPONENTS
  // ============================================

  createLazyComponent(
    importFn: () => Promise<{ default: ComponentType<any> }>,
    config?: LazyLoadConfig
  ): ComponentType<any> {
    const defaultConfig: LazyLoadConfig = {
      fallback: React.createElement('div', null, 'Loading...'),
      timeout: 10000,
      retryAttempts: 3,
      preloadThreshold: 0.8,
    };

    const finalConfig = { ...defaultConfig, ...config };

    return lazy(() => this.createRetryWrapper(importFn, finalConfig));
  }

  private createRetryWrapper(
    importFn: () => Promise<{ default: ComponentType<any> }>,
    config: LazyLoadConfig
  ): Promise<{ default: ComponentType<any> }> {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const attemptLoad = () => {
        attempts++;

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Load timeout')), config.timeout);
        });

        Promise.race([importFn(), timeoutPromise])
          .then(resolve)
          .catch(error => {
            if (attempts < config.retryAttempts) {
              console.warn(
                `Lazy load attempt ${attempts} failed, retrying...`,
                error
              );
              setTimeout(attemptLoad, 1000 * attempts); // Exponential backoff
            } else {
              reject(error);
            }
          });
      };

      attemptLoad();
    });
  }

  // ============================================
  // ROUTE-BASED LAZY LOADING
  // ============================================

  createRouteLazyComponent(
    route: string,
    importFn: () => Promise<{ default: ComponentType<any> }>,
    config?: LazyLoadConfig
  ): ComponentType<any> {
    const component = this.createLazyComponent(importFn, config);

    // Preload component when route is likely to be accessed
    this.setupRoutePreloading(route, importFn, config);

    return component;
  }

  private setupRoutePreloading(
    route: string,
    importFn: () => Promise<{ default: ComponentType<any> }>,
    config?: LazyLoadConfig
  ): void {
    if (!config?.preloadThreshold) return;

    // Preload on hover or when user is near the route
    const preloadOnHover = () => {
      if (!this.loadedChunks.has(route) && !this.loadingChunks.has(route)) {
        this.preloadChunk(route, importFn);
      }
    };

    // Add event listeners for preloading
    document.addEventListener('mouseover', e => {
      const target = e.target as HTMLElement;
      if (target.closest(`[data-route="${route}"]`)) {
        preloadOnHover();
      }
    });
  }

  // ============================================
  // CHUNK MANAGEMENT
  // ============================================

  registerChunk(name: string, component: ComponentType<any>): void {
    this.chunks.set(name, component);
  }

  async preloadChunk(
    name: string,
    importFn: () => Promise<{ default: ComponentType<any> }>
  ): Promise<void> {
    if (this.loadedChunks.has(name) || this.loadingChunks.has(name)) {
      return;
    }

    this.loadingChunks.add(name);

    try {
      const module = await importFn();
      this.chunks.set(name, module.default);
      this.loadedChunks.add(name);
      console.log(`Chunk "${name}" preloaded successfully`);
    } catch (error) {
      console.error(`Failed to preload chunk "${name}":`, error);
    } finally {
      this.loadingChunks.delete(name);
    }
  }

  getChunk(name: string): ComponentType<any> | undefined {
    return this.chunks.get(name);
  }

  isChunkLoaded(name: string): boolean {
    return this.loadedChunks.has(name);
  }

  getLoadedChunks(): string[] {
    return Array.from(this.loadedChunks);
  }

  // ============================================
  // BUNDLE OPTIMIZATION
  // ============================================

  analyzeBundle(): BundleAnalysis {
    // This would integrate with webpack-bundle-analyzer or similar
    const analysis: BundleAnalysis = {
      totalSize: 0,
      chunkCount: this.chunks.size,
      chunks: [],
      dependencies: [],
      recommendations: [],
    };

    // Analyze chunks
    this.chunks.forEach((component, name) => {
      const chunk: BundleChunk = {
        name,
        size: this.estimateChunkSize(component),
        modules: [name],
        dependencies: [],
      };
      analysis.chunks.push(chunk);
      analysis.totalSize += chunk.size;
    });

    // Generate recommendations
    analysis.recommendations = this.generateBundleRecommendations(analysis);

    return analysis;
  }

  private estimateChunkSize(component: ComponentType<any>): number {
    // Rough estimation based on component complexity
    const componentString = component.toString();
    return new Blob([componentString]).size;
  }

  private generateBundleRecommendations(
    analysis: BundleAnalysis
  ): BundleRecommendation[] {
    const recommendations: BundleRecommendation[] = [];

    // Check for large chunks
    const largeChunks = analysis.chunks.filter(chunk => chunk.size > 100000);
    if (largeChunks.length > 0) {
      recommendations.push({
        type: 'split',
        title: 'Split large chunks',
        description: `Found ${largeChunks.length} chunks larger than 100KB`,
        impact: 'high',
        savings: largeChunks.reduce((sum, chunk) => sum + chunk.size * 0.3, 0),
      });
    }

    // Check for duplicate dependencies
    const duplicateDeps = this.findDuplicateDependencies(analysis.dependencies);
    if (duplicateDeps.length > 0) {
      recommendations.push({
        type: 'optimize',
        title: 'Remove duplicate dependencies',
        description: `Found ${duplicateDeps.length} duplicate dependencies`,
        impact: 'medium',
        savings: duplicateDeps.reduce((sum, dep) => sum + dep.size, 0),
      });
    }

    return recommendations;
  }

  private findDuplicateDependencies(
    dependencies: BundleDependency[]
  ): BundleDependency[] {
    const seen = new Map<string, BundleDependency>();
    const duplicates: BundleDependency[] = [];

    dependencies.forEach(dep => {
      if (seen.has(dep.name)) {
        duplicates.push(dep);
      } else {
        seen.set(dep.name, dep);
      }
    });

    return duplicates;
  }
}

// ============================================
// IMAGE OPTIMIZATION
// ============================================

export class ImageOptimizer {
  private imageCache: Map<string, string> = new Map();
  private lazyImages: Set<string> = new Set();

  // ============================================
  // IMAGE COMPRESSION
  // ============================================

  async compressImage(
    file: File,
    quality: number = 0.8,
    maxWidth?: number,
    maxHeight?: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;

        if (maxWidth && width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (maxHeight && height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // ============================================
  // LAZY LOADING IMAGES
  // ============================================

  setupLazyImages(selector: string = 'img[data-src]'): void {
    const images = document.querySelectorAll(selector);

    const imageObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          this.loadLazyImage(img);
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  private loadLazyImage(img: HTMLImageElement): void {
    const src = img.getAttribute('data-src');
    if (!src) return;

    // Check cache first
    if (this.imageCache.has(src)) {
      img.src = this.imageCache.get(src)!;
      return;
    }

    // Load image
    const tempImg = new Image();
    tempImg.onload = () => {
      img.src = src;
      this.imageCache.set(src, src);
      img.classList.remove('lazy');
    };
    tempImg.src = src;
  }

  // ============================================
  // RESPONSIVE IMAGES
  // ============================================

  generateResponsiveSrcSet(
    baseUrl: string,
    widths: number[] = [320, 640, 960, 1280, 1920]
  ): string {
    return widths.map(width => `${baseUrl}?w=${width} ${width}w`).join(', ');
  }

  generateResponsiveSizes(
    breakpoints: { min: number; size: string }[] = [
      { min: 0, size: '100vw' },
      { min: 768, size: '50vw' },
      { min: 1024, size: '33vw' },
    ]
  ): string {
    return breakpoints
      .map(bp => `(min-width: ${bp.min}px) ${bp.size}`)
      .join(', ');
  }
}

// ============================================
// PERFORMANCE MONITORING
// ============================================

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private monitoringEnabled: boolean = false;

  constructor() {
    // Stub for compatibility
  }

  public initializeObservers(): void {
    // Stub for compatibility
  }

  // ============================================
  // METRICS COLLECTION
  // ============================================

  startMonitoring(): void {
    this.monitoringEnabled = true;
    this.collectInitialMetrics();
    this.setupContinuousMonitoring();
  }

  stopMonitoring(): void {
    this.monitoringEnabled = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }

  private collectInitialMetrics(): void {
    const metrics: PerformanceMetrics = {
      loadTime: this.measureLoadTime(),
      renderTime: this.measureRenderTime(),
      bundleSize: this.estimateBundleSize(),
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: 0, // Will be updated by continuous monitoring
      networkRequests: this.countNetworkRequests(),
      cacheHitRate: this.calculateCacheHitRate(),
    };

    this.metrics.push(metrics);
  }

  private measureLoadTime(): number {
    const navigation = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;
    return navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0;
  }

  private measureRenderTime(): number {
    const paint = performance.getEntriesByType('paint');
    const firstPaint = paint.find(entry => entry.name === 'first-paint');
    const firstContentfulPaint = paint.find(
      entry => entry.name === 'first-contentful-paint'
    );

    return firstContentfulPaint ? firstContentfulPaint.startTime : 0;
  }

  private estimateBundleSize(): number {
    // Estimate based on script tags
    const scripts = document.querySelectorAll('script[src]');
    let totalSize = 0;

    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && src.includes('chunk')) {
        totalSize += 50000; // Rough estimate per chunk
      }
    });

    return totalSize;
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private countNetworkRequests(): number {
    const resources = performance.getEntriesByType('resource');
    return resources.length;
  }

  private calculateCacheHitRate(): number {
    const resources = performance.getEntriesByType(
      'resource'
    ) as PerformanceResourceTiming[];
    const cached = resources.filter(
      resource => resource.transferSize === 0
    ).length;
    return resources.length > 0 ? (cached / resources.length) * 100 : 0;
  }

  // ============================================
  // CONTINUOUS MONITORING
  // ============================================

  private setupContinuousMonitoring(): void {
    // Monitor long tasks
    this.setupLongTaskObserver();

    // Monitor memory usage
    this.setupMemoryObserver();

    // Monitor network performance
    this.setupNetworkObserver();
  }

  private setupLongTaskObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.duration > 50) {
            // Tasks longer than 50ms
            console.warn('Long task detected:', entry);
          }
        });
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', observer);
    }
  }

  private setupMemoryObserver(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

        if (usage > 0.8) {
          console.warn('High memory usage detected:', `${usage * 100}%`);
        }
      }, 5000);
    }
  }

  private setupNetworkObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.duration > 3000) {
            // Requests longer than 3s
            console.warn('Slow network request:', entry);
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
    }
  }

  // ============================================
  // PERFORMANCE REPORTING
  // ============================================

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0
      ? this.metrics[this.metrics.length - 1]
      : null;
  }

  generatePerformanceReport(): string {
    const latest = this.getLatestMetrics();
    if (!latest) return 'No metrics available';

    return `
Performance Report:
- Load Time: ${latest.loadTime.toFixed(2)}ms
- Render Time: ${latest.renderTime.toFixed(2)}ms
- Bundle Size: ${(latest.bundleSize / 1024).toFixed(2)}KB
- Memory Usage: ${(latest.memoryUsage / 1024 / 1024).toFixed(2)}MB
- Network Requests: ${latest.networkRequests}
- Cache Hit Rate: ${latest.cacheHitRate.toFixed(1)}%
    `.trim();
  }
}

// ============================================
// API CALL OPTIMIZATION
// ============================================

export class APIOptimizer {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> =
    new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private requestQueue: Array<() => Promise<void>> = [];
  private maxConcurrentRequests: number = 5;
  private activeRequests: number = 0;

  // ============================================
  // REQUEST CACHING
  // ============================================

  async cachedRequest<T>(
    url: string,
    options: RequestInit = {},
    ttl: number = 5 * 60 * 1000 // 5 minutes
  ): Promise<T> {
    const cacheKey = this.generateCacheKey(url, options);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // Make request
    const requestPromise = this.makeRequest<T>(url, options);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const data = await requestPromise;

      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl,
      });

      return data;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private generateCacheKey(url: string, options: RequestInit): string {
    return `${url}_${JSON.stringify(options)}`;
  }

  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Wait for available slot
    await this.waitForSlot();

    this.activeRequests++;

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  private async waitForSlot(): Promise<void> {
    if (this.activeRequests >= this.maxConcurrentRequests) {
      return new Promise(resolve => {
        this.requestQueue.push(async () => {
          await this.waitForSlot();
          resolve();
        });
      });
    }
  }

  private processQueue(): void {
    if (
      this.requestQueue.length > 0 &&
      this.activeRequests < this.maxConcurrentRequests
    ) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        nextRequest();
      }
    }
  }

  // ============================================
  // BATCH REQUESTS
  // ============================================

  async batchRequests<T>(
    requests: Array<{ url: string; options?: RequestInit }>,
    batchSize: number = 10
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(req =>
        this.cachedRequest<T>(req.url, req.options)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  clearCache(): void {
    this.cache.clear();
  }

  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses
    };
  }
}

// ============================================
// REACT HOOKS
// ============================================

export const useCodeSplitting = (config?: CodeSplitConfig) => {
  const [manager] = useState(() => new CodeSplittingManager(config));
  const [loadedChunks, setLoadedChunks] = useState<string[]>([]);

  useEffect(() => {
    setLoadedChunks(manager.getLoadedChunks());
  }, [manager]);

  const createLazyComponent = useCallback(
    (
      importFn: () => Promise<{ default: ComponentType<any> }>,
      config?: LazyLoadConfig
    ) => {
      return manager.createLazyComponent(importFn, config);
    },
    [manager]
  );

  const preloadChunk = useCallback(
    (
      name: string,
      importFn: () => Promise<{ default: ComponentType<any> }>
    ) => {
      return manager.preloadChunk(name, importFn);
    },
    [manager]
  );

  return {
    manager,
    loadedChunks,
    createLazyComponent,
    preloadChunk,
    analyzeBundle: () => manager.analyzeBundle(),
  };
};

export const usePerformanceMonitoring = () => {
  const [monitor] = useState(() => new PerformanceMonitor());
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    monitor.startMonitoring();

    const interval = setInterval(() => {
      const latest = monitor.getLatestMetrics();
      if (latest) {
        setMetrics(latest);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      monitor.stopMonitoring();
    };
  }, [monitor]);

  return {
    monitor,
    metrics,
    getMetrics: () => monitor.getMetrics(),
    generateReport: () => monitor.generatePerformanceReport(),
  };
};

export const useAPIOptimization = () => {
  const [optimizer] = useState(() => new APIOptimizer());

  const cachedRequest = useCallback(
    <T>(url: string, options?: RequestInit, ttl?: number) => {
      return optimizer.cachedRequest<T>(url, options, ttl);
    },
    [optimizer]
  );

  const batchRequests = useCallback(
    <T>(
      requests: Array<{ url: string; options?: RequestInit }>,
      batchSize?: number
    ) => {
      return optimizer.batchRequests<T>(requests, batchSize);
    },
    [optimizer]
  );

  return {
    optimizer,
    cachedRequest,
    batchRequests,
    clearCache: () => optimizer.clearCache(),
    getCacheStats: () => optimizer.getCacheStats(),
  };
};
