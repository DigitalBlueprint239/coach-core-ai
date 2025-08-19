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
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const PlayLibraryPerformance = ({ metrics, onClearCache, onOptimize, showDetails = false, className = '' }) => {
    const [isExpanded, setIsExpanded] = (0, react_1.useState)(false);
    const [fpsHistory, setFpsHistory] = (0, react_1.useState)([]);
    const [memoryHistory, setMemoryHistory] = (0, react_1.useState)([]);
    const lastFrameTime = (0, react_1.useRef)(0);
    const frameCount = (0, react_1.useRef)(0);
    // FPS calculation
    (0, react_1.useEffect)(() => {
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
    (0, react_1.useEffect)(() => {
        if ('memory' in performance) {
            const updateMemoryHistory = () => {
                const memory = performance.memory;
                const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
                setMemoryHistory(prev => [...prev.slice(-29), usedMB]); // Keep last 30 samples
            };
            const interval = setInterval(updateMemoryHistory, 1000);
            return () => clearInterval(interval);
        }
    }, []);
    const getPerformanceStatus = () => {
        if (metrics.fps < 30)
            return 'poor';
        if (metrics.fps < 50)
            return 'fair';
        return 'good';
    };
    const getMemoryStatus = () => {
        if (metrics.memoryUsage > 100)
            return 'high';
        if (metrics.memoryUsage > 50)
            return 'moderate';
        return 'low';
    };
    const getCacheEfficiency = () => {
        if (metrics.cacheHitRate > 0.8)
            return 'excellent';
        if (metrics.cacheHitRate > 0.6)
            return 'good';
        if (metrics.cacheHitRate > 0.4)
            return 'fair';
        return 'poor';
    };
    const formatBytes = (bytes) => {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    const formatTime = (ms) => {
        if (ms < 1)
            return '< 1ms';
        if (ms < 1000)
            return `${ms.toFixed(1)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };
    return (react_1.default.createElement("div", { className: `bg-white border border-gray-200 rounded-lg shadow-sm ${className}` },
        react_1.default.createElement("div", { className: "p-4 border-b border-gray-200" },
            react_1.default.createElement("div", { className: "flex items-center justify-between" },
                react_1.default.createElement("div", { className: "flex items-center space-x-2" },
                    react_1.default.createElement(lucide_react_1.Activity, { className: "w-5 h-5 text-blue-600" }),
                    react_1.default.createElement("h3", { className: "font-semibold text-gray-900" }, "Performance Monitor")),
                react_1.default.createElement("div", { className: "flex items-center space-x-2" },
                    react_1.default.createElement("button", { onClick: () => setIsExpanded(!isExpanded), className: "text-sm text-gray-600 hover:text-gray-800" }, isExpanded ? 'Hide Details' : 'Show Details'),
                    onClearCache && (react_1.default.createElement("button", { onClick: onClearCache, className: "px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors" }, "Clear Cache")),
                    onOptimize && (react_1.default.createElement("button", { onClick: onOptimize, className: "px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors" }, "Optimize"))))),
        react_1.default.createElement("div", { className: "p-4" },
            react_1.default.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4" },
                react_1.default.createElement("div", { className: "text-center" },
                    react_1.default.createElement("div", { className: "flex items-center justify-center space-x-1 mb-1" },
                        react_1.default.createElement(lucide_react_1.Zap, { className: `w-4 h-4 ${getPerformanceStatus() === 'good' ? 'text-green-600' :
                                getPerformanceStatus() === 'fair' ? 'text-yellow-600' : 'text-red-600'}` }),
                        react_1.default.createElement("span", { className: "text-sm font-medium text-gray-700" }, "FPS")),
                    react_1.default.createElement("div", { className: `text-2xl font-bold ${getPerformanceStatus() === 'good' ? 'text-green-600' :
                            getPerformanceStatus() === 'fair' ? 'text-yellow-600' : 'text-red-600'}` }, metrics.fps),
                    react_1.default.createElement("div", { className: "text-xs text-gray-500" }, getPerformanceStatus() === 'good' ? 'Excellent' :
                        getPerformanceStatus() === 'fair' ? 'Fair' : 'Poor')),
                react_1.default.createElement("div", { className: "text-center" },
                    react_1.default.createElement("div", { className: "flex items-center justify-center space-x-1 mb-1" },
                        react_1.default.createElement(lucide_react_1.HardDrive, { className: `w-4 h-4 ${getMemoryStatus() === 'low' ? 'text-green-600' :
                                getMemoryStatus() === 'moderate' ? 'text-yellow-600' : 'text-red-600'}` }),
                        react_1.default.createElement("span", { className: "text-sm font-medium text-gray-700" }, "Memory")),
                    react_1.default.createElement("div", { className: `text-2xl font-bold ${getMemoryStatus() === 'low' ? 'text-green-600' :
                            getMemoryStatus() === 'moderate' ? 'text-yellow-600' : 'text-red-600'}` }, formatBytes(metrics.memoryUsage * 1024 * 1024)),
                    react_1.default.createElement("div", { className: "text-xs text-gray-500" }, getMemoryStatus() === 'low' ? 'Low' :
                        getMemoryStatus() === 'moderate' ? 'Moderate' : 'High')),
                react_1.default.createElement("div", { className: "text-center" },
                    react_1.default.createElement("div", { className: "flex items-center justify-center space-x-1 mb-1" },
                        react_1.default.createElement(lucide_react_1.TrendingUp, { className: `w-4 h-4 ${getCacheEfficiency() === 'excellent' ? 'text-green-600' :
                                getCacheEfficiency() === 'good' ? 'text-blue-600' :
                                    getCacheEfficiency() === 'fair' ? 'text-yellow-600' : 'text-red-600'}` }),
                        react_1.default.createElement("span", { className: "text-sm font-medium text-gray-700" }, "Cache")),
                    react_1.default.createElement("div", { className: `text-2xl font-bold ${getCacheEfficiency() === 'excellent' ? 'text-green-600' :
                            getCacheEfficiency() === 'good' ? 'text-blue-600' :
                                getCacheEfficiency() === 'fair' ? 'text-yellow-600' : 'text-red-600'}` },
                        (metrics.cacheHitRate * 100).toFixed(0),
                        "%"),
                    react_1.default.createElement("div", { className: "text-xs text-gray-500" }, getCacheEfficiency() === 'excellent' ? 'Excellent' :
                        getCacheEfficiency() === 'good' ? 'Good' :
                            getCacheEfficiency() === 'fair' ? 'Fair' : 'Poor')),
                react_1.default.createElement("div", { className: "text-center" },
                    react_1.default.createElement("div", { className: "flex items-center justify-center space-x-1 mb-1" },
                        react_1.default.createElement(lucide_react_1.Clock, { className: "w-4 h-4 text-blue-600" }),
                        react_1.default.createElement("span", { className: "text-sm font-medium text-gray-700" }, "Filter")),
                    react_1.default.createElement("div", { className: "text-2xl font-bold text-blue-600" }, formatTime(metrics.averageFilterTime)),
                    react_1.default.createElement("div", { className: "text-xs text-gray-500" }, "Average"))),
            (getPerformanceStatus() === 'poor' || getMemoryStatus() === 'high') && (react_1.default.createElement("div", { className: "mt-4 p-3 bg-red-50 border border-red-200 rounded-lg" },
                react_1.default.createElement("div", { className: "flex items-center space-x-2" },
                    react_1.default.createElement(lucide_react_1.AlertTriangle, { className: "w-4 h-4 text-red-600" }),
                    react_1.default.createElement("span", { className: "text-sm font-medium text-red-800" }, "Performance Alert")),
                react_1.default.createElement("div", { className: "text-sm text-red-700 mt-1" },
                    getPerformanceStatus() === 'poor' && 'Low FPS detected. Consider reducing the number of visible items.',
                    getMemoryStatus() === 'high' && 'High memory usage detected. Clear cache or optimize rendering.')))),
        isExpanded && (react_1.default.createElement("div", { className: "p-4 border-t border-gray-200 bg-gray-50" },
            react_1.default.createElement("h4", { className: "font-medium text-gray-900 mb-3" }, "Detailed Metrics"),
            react_1.default.createElement("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4 text-sm" },
                react_1.default.createElement("div", null,
                    react_1.default.createElement("div", { className: "text-gray-600" }, "Render Count"),
                    react_1.default.createElement("div", { className: "font-medium" }, metrics.renderCount.toLocaleString())),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("div", { className: "text-gray-600" }, "Filter Count"),
                    react_1.default.createElement("div", { className: "font-medium" }, metrics.filterCount.toLocaleString())),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("div", { className: "text-gray-600" }, "Search Count"),
                    react_1.default.createElement("div", { className: "font-medium" }, metrics.searchCount.toLocaleString())),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("div", { className: "text-gray-600" }, "Cache Hits"),
                    react_1.default.createElement("div", { className: "font-medium" }, metrics.cacheHits.toLocaleString())),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("div", { className: "text-gray-600" }, "Cache Misses"),
                    react_1.default.createElement("div", { className: "font-medium" }, metrics.cacheMisses.toLocaleString())),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("div", { className: "text-gray-600" }, "Cache Size"),
                    react_1.default.createElement("div", { className: "font-medium" },
                        metrics.cacheSize,
                        " items")),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("div", { className: "text-gray-600" }, "Last Filter Time"),
                    react_1.default.createElement("div", { className: "font-medium" }, formatTime(metrics.lastFilterTime))),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("div", { className: "text-gray-600" }, "Scroll Events"),
                    react_1.default.createElement("div", { className: "font-medium" }, metrics.scrollEvents.toLocaleString())),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("div", { className: "text-gray-600" }, "Thumbnail Loads"),
                    react_1.default.createElement("div", { className: "font-medium" }, metrics.thumbnailLoads.toLocaleString())),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("div", { className: "text-gray-600" }, "Thumbnail Errors"),
                    react_1.default.createElement("div", { className: "font-medium text-red-600" }, metrics.thumbnailErrors.toLocaleString()))),
            fpsHistory.length > 0 && (react_1.default.createElement("div", { className: "mt-4" },
                react_1.default.createElement("h5", { className: "font-medium text-gray-900 mb-2" }, "FPS History (Last 30s)"),
                react_1.default.createElement("div", { className: "flex items-end space-x-1 h-20" }, fpsHistory.map((fps, index) => (react_1.default.createElement("div", { key: index, className: "flex-1 bg-blue-200 rounded-t", style: {
                        height: `${Math.min(100, (fps / 60) * 100)}%`,
                        backgroundColor: fps < 30 ? '#ef4444' : fps < 50 ? '#f59e0b' : '#3b82f6'
                    }, title: `${fps} FPS` })))))),
            memoryHistory.length > 0 && (react_1.default.createElement("div", { className: "mt-4" },
                react_1.default.createElement("h5", { className: "font-medium text-gray-900 mb-2" }, "Memory Usage (Last 30s)"),
                react_1.default.createElement("div", { className: "flex items-end space-x-1 h-20" }, memoryHistory.map((memory, index) => (react_1.default.createElement("div", { key: index, className: "flex-1 bg-green-200 rounded-t", style: {
                        height: `${Math.min(100, (memory / 100) * 100)}%`,
                        backgroundColor: memory > 100 ? '#ef4444' : memory > 50 ? '#f59e0b' : '#10b981'
                    }, title: `${memory} MB` }))))))))));
};
exports.default = PlayLibraryPerformance;
