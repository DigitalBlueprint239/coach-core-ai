import React, { useState, useEffect, useRef } from 'react';
import { Activity, Zap, Clock, HardDrive, TrendingUp, AlertTriangle } from 'lucide-react';

interface PerformanceMetrics {
  renderCount: number;
  filterCount: number;
  searchCount: number;
  cacheHits: number;
  cacheMisses: number;
  lastFilterTime: number;
  averageFilterTime: number;
  cacheSize: number;
  cacheHitRate: number;
  memoryUsage: number;
  fps: number;
  scrollEvents: number;
  thumbnailLoads: number;
  thumbnailErrors: number;
}

interface PlayLibraryPerformanceProps {
  metrics: PerformanceMetrics;
  onClearCache?: () => void;
  onOptimize?: () => void;
  showDetails?: boolean;
  className?: string;
}

const PlayLibraryPerformance: React.FC<PlayLibraryPerformanceProps> = ({
  metrics,
  onClearCache,
  onOptimize,
  showDetails = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<number[]>([]);
  const lastFrameTime = useRef<number>(0);
  const frameCount = useRef<number>(0);

  // FPS calculation
  useEffect(() => {
    const calculateFPS = () => {
      const now = performance.now();
      frameCount.current++;

      if (now - lastFrameTime.current >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / (now - lastFrameTime.current));
        setFpsHistory(prev => [...prev.slice(-29), fps]); // Keep last 30 frames
        frameCount.current = 0;
        lastFrameTime.current = now;
      }

      requestAnimationFrame(calculateFPS);
    };

    const animationId = requestAnimationFrame(calculateFPS);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Memory usage tracking
  useEffect(() => {
    if ('memory' in performance) {
      const updateMemoryHistory = () => {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        setMemoryHistory(prev => [...prev.slice(-29), usedMB]); // Keep last 30 samples
      };

      const interval = setInterval(updateMemoryHistory, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const getPerformanceStatus = () => {
    if (metrics.fps < 30) return 'poor';
    if (metrics.fps < 50) return 'fair';
    return 'good';
  };

  const getMemoryStatus = () => {
    if (metrics.memoryUsage > 100) return 'high';
    if (metrics.memoryUsage > 50) return 'moderate';
    return 'low';
  };

  const getCacheEfficiency = () => {
    if (metrics.cacheHitRate > 0.8) return 'excellent';
    if (metrics.cacheHitRate > 0.6) return 'good';
    if (metrics.cacheHitRate > 0.4) return 'fair';
    return 'poor';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1) return '< 1ms';
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Performance Monitor</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </button>
            {onClearCache && (
              <button
                onClick={onClearCache}
                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                Clear Cache
              </button>
            )}
            {onOptimize && (
              <button
                onClick={onOptimize}
                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                Optimize
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* FPS */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Zap className={`w-4 h-4 ${
                getPerformanceStatus() === 'good' ? 'text-green-600' :
                getPerformanceStatus() === 'fair' ? 'text-yellow-600' : 'text-red-600'
              }`} />
              <span className="text-sm font-medium text-gray-700">FPS</span>
            </div>
            <div className={`text-2xl font-bold ${
              getPerformanceStatus() === 'good' ? 'text-green-600' :
              getPerformanceStatus() === 'fair' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {metrics.fps}
            </div>
            <div className="text-xs text-gray-500">
              {getPerformanceStatus() === 'good' ? 'Excellent' :
               getPerformanceStatus() === 'fair' ? 'Fair' : 'Poor'}
            </div>
          </div>

          {/* Memory Usage */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <HardDrive className={`w-4 h-4 ${
                getMemoryStatus() === 'low' ? 'text-green-600' :
                getMemoryStatus() === 'moderate' ? 'text-yellow-600' : 'text-red-600'
              }`} />
              <span className="text-sm font-medium text-gray-700">Memory</span>
            </div>
            <div className={`text-2xl font-bold ${
              getMemoryStatus() === 'low' ? 'text-green-600' :
              getMemoryStatus() === 'moderate' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {formatBytes(metrics.memoryUsage * 1024 * 1024)}
            </div>
            <div className="text-xs text-gray-500">
              {getMemoryStatus() === 'low' ? 'Low' :
               getMemoryStatus() === 'moderate' ? 'Moderate' : 'High'}
            </div>
          </div>

          {/* Cache Hit Rate */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <TrendingUp className={`w-4 h-4 ${
                getCacheEfficiency() === 'excellent' ? 'text-green-600' :
                getCacheEfficiency() === 'good' ? 'text-blue-600' :
                getCacheEfficiency() === 'fair' ? 'text-yellow-600' : 'text-red-600'
              }`} />
              <span className="text-sm font-medium text-gray-700">Cache</span>
            </div>
            <div className={`text-2xl font-bold ${
              getCacheEfficiency() === 'excellent' ? 'text-green-600' :
              getCacheEfficiency() === 'good' ? 'text-blue-600' :
              getCacheEfficiency() === 'fair' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {(metrics.cacheHitRate * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">
              {getCacheEfficiency() === 'excellent' ? 'Excellent' :
               getCacheEfficiency() === 'good' ? 'Good' :
               getCacheEfficiency() === 'fair' ? 'Fair' : 'Poor'}
            </div>
          </div>

          {/* Filter Time */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Filter</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatTime(metrics.averageFilterTime)}
            </div>
            <div className="text-xs text-gray-500">
              Average
            </div>
          </div>
        </div>

        {/* Performance Alerts */}
        {(getPerformanceStatus() === 'poor' || getMemoryStatus() === 'high') && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Performance Alert</span>
            </div>
            <div className="text-sm text-red-700 mt-1">
              {getPerformanceStatus() === 'poor' && 'Low FPS detected. Consider reducing the number of visible items.'}
              {getMemoryStatus() === 'high' && 'High memory usage detected. Clear cache or optimize rendering.'}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Metrics */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Detailed Metrics</h4>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Render Count</div>
              <div className="font-medium">{metrics.renderCount.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Filter Count</div>
              <div className="font-medium">{metrics.filterCount.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Search Count</div>
              <div className="font-medium">{metrics.searchCount.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Cache Hits</div>
              <div className="font-medium">{metrics.cacheHits.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Cache Misses</div>
              <div className="font-medium">{metrics.cacheMisses.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Cache Size</div>
              <div className="font-medium">{metrics.cacheSize} items</div>
            </div>
            <div>
              <div className="text-gray-600">Last Filter Time</div>
              <div className="font-medium">{formatTime(metrics.lastFilterTime)}</div>
            </div>
            <div>
              <div className="text-gray-600">Scroll Events</div>
              <div className="font-medium">{metrics.scrollEvents.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Thumbnail Loads</div>
              <div className="font-medium">{metrics.thumbnailLoads.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Thumbnail Errors</div>
              <div className="font-medium text-red-600">{metrics.thumbnailErrors.toLocaleString()}</div>
            </div>
          </div>

          {/* Performance Charts */}
          {fpsHistory.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium text-gray-900 mb-2">FPS History (Last 30s)</h5>
              <div className="flex items-end space-x-1 h-20">
                {fpsHistory.map((fps, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-blue-200 rounded-t"
                    style={{
                      height: `${Math.min(100, (fps / 60) * 100)}%`,
                      backgroundColor: fps < 30 ? '#ef4444' : fps < 50 ? '#f59e0b' : '#3b82f6'
                    }}
                    title={`${fps} FPS`}
                  />
                ))}
              </div>
            </div>
          )}

          {memoryHistory.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium text-gray-900 mb-2">Memory Usage (Last 30s)</h5>
              <div className="flex items-end space-x-1 h-20">
                {memoryHistory.map((memory, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-green-200 rounded-t"
                    style={{
                      height: `${Math.min(100, (memory / 100) * 100)}%`,
                      backgroundColor: memory > 100 ? '#ef4444' : memory > 50 ? '#f59e0b' : '#10b981'
                    }}
                    title={`${memory} MB`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayLibraryPerformance; 