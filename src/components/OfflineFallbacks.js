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
exports.useOfflineData = exports.useOfflineStatus = exports.OfflineCacheManager = exports.OfflineAction = exports.OfflineData = exports.OfflineIndicator = exports.OfflineFallback = void 0;
// src/components/OfflineFallbacks.tsx
const react_1 = __importStar(require("react"));
const offline_persistence_1 = require("../utils/offline-persistence");
// ============================================
// OFFLINE FALLBACK COMPONENT
// ============================================
const OfflineFallback = ({ children, fallback, showOfflineIndicator = true, enableOfflineMode = true, cacheStrategy = 'stale-while-revalidate', className = '' }) => {
    const { syncStatus } = (0, offline_persistence_1.useOfflinePersistence)();
    const [isOffline, setIsOffline] = (0, react_1.useState)(!navigator.onLine);
    (0, react_1.useEffect)(() => {
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
            return fallback || react_1.default.createElement(DefaultOfflineFallback, null);
        }
        return (react_1.default.createElement(react_1.default.Fragment, null,
            children,
            showOfflineIndicator && (react_1.default.createElement(exports.OfflineIndicator, { isOnline: !isOffline, lastSyncTime: syncStatus.lastSyncTime, pendingOperations: syncStatus.pendingOperations }))));
    };
    return (react_1.default.createElement("div", { className: `offline-fallback ${className}` },
        renderContent(),
        react_1.default.createElement("style", null, `
        .offline-fallback {
          position: relative;
        }
      `)));
};
exports.OfflineFallback = OfflineFallback;
// ============================================
// DEFAULT OFFLINE FALLBACK
// ============================================
const DefaultOfflineFallback = () => {
    return (react_1.default.createElement("div", { className: "default-offline-fallback" },
        react_1.default.createElement("div", { className: "offline-content" },
            react_1.default.createElement("div", { className: "offline-icon" }, "\uD83D\uDCF1"),
            react_1.default.createElement("h2", null, "You're Offline"),
            react_1.default.createElement("p", null, "Please check your internet connection and try again."),
            react_1.default.createElement("div", { className: "offline-actions" },
                react_1.default.createElement("button", { onClick: () => window.location.reload() }, "Retry Connection"))),
        react_1.default.createElement("style", null, `
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
      `)));
};
// ============================================
// OFFLINE INDICATOR COMPONENT
// ============================================
const OfflineIndicator = ({ isOnline, lastSyncTime, pendingOperations = 0, className = '' }) => {
    const [isVisible, setIsVisible] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (!isOnline || pendingOperations > 0) {
            setIsVisible(true);
        }
        else {
            // Hide after a delay when back online
            const timer = setTimeout(() => setIsVisible(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isOnline, pendingOperations]);
    if (!isVisible)
        return null;
    return (react_1.default.createElement("div", { className: `offline-indicator ${isOnline ? 'online' : 'offline'} ${className}` },
        react_1.default.createElement("div", { className: "indicator-content" },
            react_1.default.createElement("div", { className: "indicator-icon" }, isOnline ? '✅' : '📡'),
            react_1.default.createElement("div", { className: "indicator-text" }, isOnline ? (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement("span", null, "Back Online"),
                lastSyncTime && (react_1.default.createElement("small", null,
                    "Last sync: ",
                    new Date(lastSyncTime).toLocaleTimeString())))) : (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement("span", null, "You're Offline"),
                pendingOperations > 0 && (react_1.default.createElement("small", null,
                    pendingOperations,
                    " pending changes")))))),
        react_1.default.createElement("style", null, `
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
      `)));
};
exports.OfflineIndicator = OfflineIndicator;
// ============================================
// OFFLINE DATA COMPONENT
// ============================================
const OfflineData = ({ data, isStale, lastUpdated, onRefresh, className = '' }) => {
    const { syncStatus } = (0, offline_persistence_1.useOfflinePersistence)();
    const isOnline = syncStatus.isOnline;
    return (react_1.default.createElement("div", { className: `offline-data ${className}` },
        isStale && (react_1.default.createElement("div", { className: "stale-data-warning" },
            react_1.default.createElement("div", { className: "warning-icon" }, "\u26A0\uFE0F"),
            react_1.default.createElement("div", { className: "warning-content" },
                react_1.default.createElement("span", null, "Showing cached data"),
                react_1.default.createElement("small", null,
                    "Last updated: ",
                    new Date(lastUpdated).toLocaleString()),
                isOnline && onRefresh && (react_1.default.createElement("button", { onClick: onRefresh, className: "refresh-button" }, "Refresh"))))),
        react_1.default.createElement("div", { className: "data-content" }, data),
        react_1.default.createElement("style", null, `
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
      `)));
};
exports.OfflineData = OfflineData;
// ============================================
// OFFLINE ACTION COMPONENT
// ============================================
const OfflineAction = ({ action, fallback, queueIfOffline = true, children, className = '' }) => {
    const { syncStatus, addToQueue } = (0, offline_persistence_1.useOfflinePersistence)();
    const [isExecuting, setIsExecuting] = (0, react_1.useState)(false);
    const handleAction = (0, react_1.useCallback)(() => __awaiter(void 0, void 0, void 0, function* () {
        if (isExecuting)
            return;
        setIsExecuting(true);
        try {
            if (syncStatus.isOnline) {
                // Execute action immediately if online
                yield action();
            }
            else if (queueIfOffline) {
                // Queue action for later if offline
                yield addToQueue({
                    type: 'create',
                    collection: 'offline_actions',
                    data: { action: action.toString() },
                    maxRetries: 3,
                    priority: 'normal'
                });
            }
            else if (fallback) {
                // Execute fallback if provided
                fallback();
            }
            else {
                throw new Error('Action cannot be executed offline');
            }
        }
        catch (error) {
            console.error('Action failed:', error);
            // Show error to user
        }
        finally {
            setIsExecuting(false);
        }
    }), [action, fallback, queueIfOffline, syncStatus.isOnline, addToQueue, isExecuting]);
    return (react_1.default.createElement("div", { className: `offline-action ${className}` },
        react_1.default.createElement("button", { onClick: handleAction, disabled: isExecuting, className: `action-button ${!syncStatus.isOnline ? 'offline' : ''}` }, isExecuting ? 'Processing...' : children),
        !syncStatus.isOnline && queueIfOffline && (react_1.default.createElement("div", { className: "offline-note" }, "This action will be queued and executed when you're back online.")),
        react_1.default.createElement("style", null, `
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
      `)));
};
exports.OfflineAction = OfflineAction;
// ============================================
// OFFLINE CACHE MANAGER
// ============================================
const OfflineCacheManager = () => {
    const { syncStatus, clearQueue, retryFailed } = (0, offline_persistence_1.useOfflinePersistence)();
    const [cacheStats, setCacheStats] = (0, react_1.useState)({
        totalItems: 0,
        pendingOperations: 0,
        failedOperations: 0
    });
    (0, react_1.useEffect)(() => {
        // Update cache stats
        setCacheStats({
            totalItems: localStorage.length,
            pendingOperations: syncStatus.pendingOperations,
            failedOperations: syncStatus.failedOperations
        });
    }, [syncStatus]);
    const handleClearCache = (0, react_1.useCallback)(() => {
        if (confirm('Are you sure you want to clear all cached data?')) {
            localStorage.clear();
            setCacheStats(prev => (Object.assign(Object.assign({}, prev), { totalItems: 0 })));
        }
    }, []);
    const handleRetryFailed = (0, react_1.useCallback)(() => {
        retryFailed();
    }, [retryFailed]);
    return (react_1.default.createElement("div", { className: "offline-cache-manager" },
        react_1.default.createElement("h3", null, "Offline Cache"),
        react_1.default.createElement("div", { className: "cache-stats" },
            react_1.default.createElement("div", { className: "stat" },
                react_1.default.createElement("span", { className: "stat-label" }, "Cached Items:"),
                react_1.default.createElement("span", { className: "stat-value" }, cacheStats.totalItems)),
            react_1.default.createElement("div", { className: "stat" },
                react_1.default.createElement("span", { className: "stat-label" }, "Pending Operations:"),
                react_1.default.createElement("span", { className: "stat-value" }, cacheStats.pendingOperations)),
            react_1.default.createElement("div", { className: "stat" },
                react_1.default.createElement("span", { className: "stat-label" }, "Failed Operations:"),
                react_1.default.createElement("span", { className: "stat-value" }, cacheStats.failedOperations))),
        react_1.default.createElement("div", { className: "cache-actions" },
            react_1.default.createElement("button", { onClick: handleClearCache, className: "cache-button" }, "Clear Cache"),
            cacheStats.failedOperations > 0 && (react_1.default.createElement("button", { onClick: handleRetryFailed, className: "cache-button retry" }, "Retry Failed"))),
        react_1.default.createElement("style", null, `
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
      `)));
};
exports.OfflineCacheManager = OfflineCacheManager;
// ============================================
// HOOKS
// ============================================
const useOfflineStatus = () => {
    const [isOnline, setIsOnline] = (0, react_1.useState)(navigator.onLine);
    (0, react_1.useEffect)(() => {
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
exports.useOfflineStatus = useOfflineStatus;
const useOfflineData = (key, defaultValue, options = {}) => {
    const { ttl = 5 * 60 * 1000, staleWhileRevalidate = true } = options;
    const [data, setData] = (0, react_1.useState)(defaultValue);
    const [isStale, setIsStale] = (0, react_1.useState)(false);
    const [lastUpdated, setLastUpdated] = (0, react_1.useState)(0);
    const getCachedData = (0, react_1.useCallback)(() => {
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
                }
                else if (staleWhileRevalidate) {
                    setData(cachedData);
                    setLastUpdated(timestamp);
                    setIsStale(true);
                    return cachedData;
                }
            }
        }
        catch (error) {
            console.error('Error reading cached data:', error);
        }
        return defaultValue;
    }, [key, ttl, staleWhileRevalidate, defaultValue]);
    const setCachedData = (0, react_1.useCallback)((newData) => {
        try {
            const timestamp = Date.now();
            const cacheData = { data: newData, timestamp };
            localStorage.setItem(key, JSON.stringify(cacheData));
            setData(newData);
            setLastUpdated(timestamp);
            setIsStale(false);
        }
        catch (error) {
            console.error('Error caching data:', error);
        }
    }, [key]);
    (0, react_1.useEffect)(() => {
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
exports.useOfflineData = useOfflineData;
exports.default = exports.OfflineFallback;
