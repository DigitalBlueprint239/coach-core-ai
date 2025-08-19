"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAPIOptimization = exports.usePerformanceMonitoring = exports.useCodeSplitting = exports.APIOptimizer = exports.PerformanceMonitor = exports.ImageOptimizer = exports.CodeSplittingManager = void 0;
// src/utils/performance-optimization.ts
const react_1 = __importStar(require("react"));
// ============================================
// CODE SPLITTING UTILITIES
// ============================================
class CodeSplittingManager {
    constructor(config) {
        this.chunks = new Map();
        this.loadedChunks = new Set();
        this.loadingChunks = new Set();
        this.chunkConfigs = [];
        if (config) {
            this.chunkConfigs = config.chunks;
        }
    }
    // ============================================
    // LAZY LOADING COMPONENTS
    // ============================================
    createLazyComponent(importFn, config) {
        const defaultConfig = {
            fallback: react_1.default.createElement('div', null, 'Loading...'),
            timeout: 10000,
            retryAttempts: 3,
            preloadThreshold: 0.8
        };
        const finalConfig = Object.assign(Object.assign({}, defaultConfig), config);
        return (0, react_1.lazy)(() => this.createRetryWrapper(importFn, finalConfig));
    }
    createRetryWrapper(importFn, config) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const attemptLoad = () => {
                attempts++;
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Load timeout')), config.timeout);
                });
                Promise.race([importFn(), timeoutPromise])
                    .then(resolve)
                    .catch((error) => {
                    if (attempts < config.retryAttempts) {
                        console.warn(`Lazy load attempt ${attempts} failed, retrying...`, error);
                        setTimeout(attemptLoad, 1000 * attempts); // Exponential backoff
                    }
                    else {
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
    createRouteLazyComponent(route, importFn, config) {
        const component = this.createLazyComponent(importFn, config);
        // Preload component when route is likely to be accessed
        this.setupRoutePreloading(route, importFn, config);
        return component;
    }
    setupRoutePreloading(route, importFn, config) {
        if (!(config === null || config === void 0 ? void 0 : config.preloadThreshold))
            return;
        // Preload on hover or when user is near the route
        const preloadOnHover = () => {
            if (!this.loadedChunks.has(route) && !this.loadingChunks.has(route)) {
                this.preloadChunk(route, importFn);
            }
        };
        // Add event listeners for preloading
        document.addEventListener('mouseover', (e) => {
            const target = e.target;
            if (target.closest(`[data-route="${route}"]`)) {
                preloadOnHover();
            }
        });
    }
    // ============================================
    // CHUNK MANAGEMENT
    // ============================================
    registerChunk(name, component) {
        this.chunks.set(name, component);
    }
    preloadChunk(name, importFn) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loadedChunks.has(name) || this.loadingChunks.has(name)) {
                return;
            }
            this.loadingChunks.add(name);
            try {
                const module = yield importFn();
                this.chunks.set(name, module.default);
                this.loadedChunks.add(name);
                console.log(`Chunk "${name}" preloaded successfully`);
            }
            catch (error) {
                console.error(`Failed to preload chunk "${name}":`, error);
            }
            finally {
                this.loadingChunks.delete(name);
            }
        });
    }
    getChunk(name) {
        return this.chunks.get(name);
    }
    isChunkLoaded(name) {
        return this.loadedChunks.has(name);
    }
    getLoadedChunks() {
        return Array.from(this.loadedChunks);
    }
    // ============================================
    // BUNDLE OPTIMIZATION
    // ============================================
    analyzeBundle() {
        // This would integrate with webpack-bundle-analyzer or similar
        const analysis = {
            totalSize: 0,
            chunkCount: this.chunks.size,
            chunks: [],
            dependencies: [],
            recommendations: []
        };
        // Analyze chunks
        this.chunks.forEach((component, name) => {
            const chunk = {
                name,
                size: this.estimateChunkSize(component),
                modules: [name],
                dependencies: []
            };
            analysis.chunks.push(chunk);
            analysis.totalSize += chunk.size;
        });
        // Generate recommendations
        analysis.recommendations = this.generateBundleRecommendations(analysis);
        return analysis;
    }
    estimateChunkSize(component) {
        // Rough estimation based on component complexity
        const componentString = component.toString();
        return new Blob([componentString]).size;
    }
    generateBundleRecommendations(analysis) {
        const recommendations = [];
        // Check for large chunks
        const largeChunks = analysis.chunks.filter(chunk => chunk.size > 100000);
        if (largeChunks.length > 0) {
            recommendations.push({
                type: 'split',
                title: 'Split large chunks',
                description: `Found ${largeChunks.length} chunks larger than 100KB`,
                impact: 'high',
                savings: largeChunks.reduce((sum, chunk) => sum + chunk.size * 0.3, 0)
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
                savings: duplicateDeps.reduce((sum, dep) => sum + dep.size, 0)
            });
        }
        return recommendations;
    }
    findDuplicateDependencies(dependencies) {
        const seen = new Map();
        const duplicates = [];
        dependencies.forEach(dep => {
            if (seen.has(dep.name)) {
                duplicates.push(dep);
            }
            else {
                seen.set(dep.name, dep);
            }
        });
        return duplicates;
    }
}
exports.CodeSplittingManager = CodeSplittingManager;
// ============================================
// IMAGE OPTIMIZATION
// ============================================
class ImageOptimizer {
    constructor() {
        this.imageCache = new Map();
        this.lazyImages = new Set();
    }
    // ============================================
    // IMAGE COMPRESSION
    // ============================================
    compressImage(file, quality = 0.8, maxWidth, maxHeight) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    ctx === null || ctx === void 0 ? void 0 : ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        }
                        else {
                            reject(new Error('Failed to compress image'));
                        }
                    }, 'image/jpeg', quality);
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = URL.createObjectURL(file);
            });
        });
    }
    // ============================================
    // LAZY LOADING IMAGES
    // ============================================
    setupLazyImages(selector = 'img[data-src]') {
        const images = document.querySelectorAll(selector);
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    this.loadLazyImage(img);
                    imageObserver.unobserve(img);
                }
            });
        });
        images.forEach(img => imageObserver.observe(img));
    }
    loadLazyImage(img) {
        const src = img.getAttribute('data-src');
        if (!src)
            return;
        // Check cache first
        if (this.imageCache.has(src)) {
            img.src = this.imageCache.get(src);
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
    generateResponsiveSrcSet(baseUrl, widths = [320, 640, 960, 1280, 1920]) {
        return widths
            .map(width => `${baseUrl}?w=${width} ${width}w`)
            .join(', ');
    }
    generateResponsiveSizes(breakpoints = [
        { min: 0, size: '100vw' },
        { min: 768, size: '50vw' },
        { min: 1024, size: '33vw' }
    ]) {
        return breakpoints
            .map(bp => `(min-width: ${bp.min}px) ${bp.size}`)
            .join(', ');
    }
}
exports.ImageOptimizer = ImageOptimizer;
// ============================================
// PERFORMANCE MONITORING
// ============================================
class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.observers = new Map();
        this.monitoringEnabled = false;
        // Stub for compatibility
    }
    initializeObservers() {
        // Stub for compatibility
    }
    // ============================================
    // METRICS COLLECTION
    // ============================================
    startMonitoring() {
        this.monitoringEnabled = true;
        this.collectInitialMetrics();
        this.setupContinuousMonitoring();
    }
    stopMonitoring() {
        this.monitoringEnabled = false;
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
    }
    collectInitialMetrics() {
        const metrics = {
            loadTime: this.measureLoadTime(),
            renderTime: this.measureRenderTime(),
            bundleSize: this.estimateBundleSize(),
            memoryUsage: this.getMemoryUsage(),
            cpuUsage: 0, // Will be updated by continuous monitoring
            networkRequests: this.countNetworkRequests(),
            cacheHitRate: this.calculateCacheHitRate()
        };
        this.metrics.push(metrics);
    }
    measureLoadTime() {
        const navigation = performance.getEntriesByType('navigation')[0];
        return navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0;
    }
    measureRenderTime() {
        const paint = performance.getEntriesByType('paint');
        const firstPaint = paint.find(entry => entry.name === 'first-paint');
        const firstContentfulPaint = paint.find(entry => entry.name === 'first-contentful-paint');
        return firstContentfulPaint ? firstContentfulPaint.startTime : 0;
    }
    estimateBundleSize() {
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
    getMemoryUsage() {
        if ('memory' in performance) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }
    countNetworkRequests() {
        const resources = performance.getEntriesByType('resource');
        return resources.length;
    }
    calculateCacheHitRate() {
        const resources = performance.getEntriesByType('resource');
        const cached = resources.filter(resource => resource.transferSize === 0).length;
        return resources.length > 0 ? (cached / resources.length) * 100 : 0;
    }
    // ============================================
    // CONTINUOUS MONITORING
    // ============================================
    setupContinuousMonitoring() {
        // Monitor long tasks
        this.setupLongTaskObserver();
        // Monitor memory usage
        this.setupMemoryObserver();
        // Monitor network performance
        this.setupNetworkObserver();
    }
    setupLongTaskObserver() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    if (entry.duration > 50) { // Tasks longer than 50ms
                        console.warn('Long task detected:', entry);
                    }
                });
            });
            observer.observe({ entryTypes: ['longtask'] });
            this.observers.set('longtask', observer);
        }
    }
    setupMemoryObserver() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
                if (usage > 0.8) {
                    console.warn('High memory usage detected:', usage * 100 + '%');
                }
            }, 5000);
        }
    }
    setupNetworkObserver() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    if (entry.duration > 3000) { // Requests longer than 3s
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
    getMetrics() {
        return [...this.metrics];
    }
    getLatestMetrics() {
        return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
    }
    generatePerformanceReport() {
        const latest = this.getLatestMetrics();
        if (!latest)
            return 'No metrics available';
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
exports.PerformanceMonitor = PerformanceMonitor;
// ============================================
// API CALL OPTIMIZATION
// ============================================
class APIOptimizer {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.requestQueue = [];
        this.maxConcurrentRequests = 5;
        this.activeRequests = 0;
    }
    // ============================================
    // REQUEST CACHING
    // ============================================
    cachedRequest(url, options = {}, ttl = 5 * 60 * 1000 // 5 minutes
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = this.generateCacheKey(url, options);
            // Check cache
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < cached.ttl) {
                return cached.data;
            }
            // Check if request is already pending
            if (this.pendingRequests.has(cacheKey)) {
                return this.pendingRequests.get(cacheKey);
            }
            // Make request
            const requestPromise = this.makeRequest(url, options);
            this.pendingRequests.set(cacheKey, requestPromise);
            try {
                const data = yield requestPromise;
                // Cache the result
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now(),
                    ttl
                });
                return data;
            }
            finally {
                this.pendingRequests.delete(cacheKey);
            }
        });
    }
    generateCacheKey(url, options) {
        return `${url}_${JSON.stringify(options)}`;
    }
    makeRequest(url, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            // Wait for available slot
            yield this.waitForSlot();
            this.activeRequests++;
            try {
                const response = yield fetch(url, options);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return yield response.json();
            }
            finally {
                this.activeRequests--;
                this.processQueue();
            }
        });
    }
    waitForSlot() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.activeRequests >= this.maxConcurrentRequests) {
                return new Promise(resolve => {
                    this.requestQueue.push(() => __awaiter(this, void 0, void 0, function* () {
                        yield this.waitForSlot();
                        resolve();
                    }));
                });
            }
        });
    }
    processQueue() {
        if (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
            const nextRequest = this.requestQueue.shift();
            if (nextRequest) {
                nextRequest();
            }
        }
    }
    // ============================================
    // BATCH REQUESTS
    // ============================================
    batchRequests(requests, batchSize = 10) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            for (let i = 0; i < requests.length; i += batchSize) {
                const batch = requests.slice(i, i + batchSize);
                const batchPromises = batch.map(req => this.cachedRequest(req.url, req.options));
                const batchResults = yield Promise.all(batchPromises);
                results.push(...batchResults);
            }
            return results;
        });
    }
    // ============================================
    // CACHE MANAGEMENT
    // ============================================
    clearCache() {
        this.cache.clear();
    }
    clearExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > value.ttl) {
                this.cache.delete(key);
            }
        }
    }
    getCacheStats() {
        return {
            size: this.cache.size,
            hitRate: 0 // Would need to track hits/misses
        };
    }
}
exports.APIOptimizer = APIOptimizer;
// ============================================
// REACT HOOKS
// ============================================
const useCodeSplitting = (config) => {
    const [manager] = (0, react_1.useState)(() => new CodeSplittingManager(config));
    const [loadedChunks, setLoadedChunks] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        setLoadedChunks(manager.getLoadedChunks());
    }, [manager]);
    const createLazyComponent = (0, react_1.useCallback)((importFn, config) => {
        return manager.createLazyComponent(importFn, config);
    }, [manager]);
    const preloadChunk = (0, react_1.useCallback)((name, importFn) => {
        return manager.preloadChunk(name, importFn);
    }, [manager]);
    return {
        manager,
        loadedChunks,
        createLazyComponent,
        preloadChunk,
        analyzeBundle: () => manager.analyzeBundle()
    };
};
exports.useCodeSplitting = useCodeSplitting;
const usePerformanceMonitoring = () => {
    const [monitor] = (0, react_1.useState)(() => new PerformanceMonitor());
    const [metrics, setMetrics] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
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
        generateReport: () => monitor.generatePerformanceReport()
    };
};
exports.usePerformanceMonitoring = usePerformanceMonitoring;
const useAPIOptimization = () => {
    const [optimizer] = (0, react_1.useState)(() => new APIOptimizer());
    const cachedRequest = (0, react_1.useCallback)((url, options, ttl) => {
        return optimizer.cachedRequest(url, options, ttl);
    }, [optimizer]);
    const batchRequests = (0, react_1.useCallback)((requests, batchSize) => {
        return optimizer.batchRequests(requests, batchSize);
    }, [optimizer]);
    return {
        optimizer,
        cachedRequest,
        batchRequests,
        clearCache: () => optimizer.clearCache(),
        getCacheStats: () => optimizer.getCacheStats()
    };
};
exports.useAPIOptimization = useAPIOptimization;
