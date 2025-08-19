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
exports.SyncStatusIndicator = void 0;
// src/components/offline/SyncStatusIndicator.tsx
const react_1 = __importStar(require("react"));
const OfflineQueueManager_1 = require("../../services/offline/OfflineQueueManager");
const SyncStatusIndicator = ({ userId, showDetails = false, className = '' }) => {
    const [isOnline, setIsOnline] = (0, react_1.useState)(navigator.onLine);
    const [queueStats, setQueueStats] = (0, react_1.useState)(null);
    const [isProcessing, setIsProcessing] = (0, react_1.useState)(false);
    const [lastSync, setLastSync] = (0, react_1.useState)(null);
    const [syncProgress, setSyncProgress] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        var _a;
        // Network status listener
        const unsubscribe = OfflineQueueManager_1.offlineQueueManager.onNetworkStatusChange((status) => {
            setIsOnline(status === 'online');
            if (status === 'online') {
                setLastSync(Date.now());
            }
        });
        // Update queue stats periodically
        const updateStats = () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const stats = yield OfflineQueueManager_1.offlineQueueManager.getQueueStats();
                setQueueStats(stats);
            }
            catch (error) {
                console.error('Failed to get queue stats:', error);
            }
        });
        updateStats();
        const statsInterval = setInterval(updateStats, 5000);
        // Listen for service worker messages
        const handleServiceWorkerMessage = (event) => {
            if (event.data.type === 'NETWORK_STATUS') {
                setIsOnline(event.data.status === 'online');
            }
            else if (event.data.type === 'PROGRESS_UPDATE') {
                setSyncProgress(event.data.progress);
                if (event.data.progress === 100) {
                    setIsProcessing(false);
                    setLastSync(Date.now());
                }
            }
            else if (event.data.type === 'PROCESS_OFFLINE_QUEUE') {
                setIsProcessing(true);
                setSyncProgress(0);
            }
        };
        (_a = navigator.serviceWorker) === null || _a === void 0 ? void 0 : _a.addEventListener('message', handleServiceWorkerMessage);
        return () => {
            var _a;
            unsubscribe();
            clearInterval(statsInterval);
            (_a = navigator.serviceWorker) === null || _a === void 0 ? void 0 : _a.removeEventListener('message', handleServiceWorkerMessage);
        };
    }, []);
    const getStatusColor = () => {
        if (!isOnline)
            return 'text-red-600';
        if (isProcessing)
            return 'text-yellow-600';
        if ((queueStats === null || queueStats === void 0 ? void 0 : queueStats.pending) > 0)
            return 'text-orange-600';
        return 'text-green-600';
    };
    const getStatusIcon = () => {
        if (!isOnline)
            return '🔴';
        if (isProcessing)
            return '🔄';
        if ((queueStats === null || queueStats === void 0 ? void 0 : queueStats.pending) > 0)
            return '⏳';
        return '✅';
    };
    const getStatusText = () => {
        if (!isOnline)
            return 'Offline';
        if (isProcessing)
            return 'Syncing...';
        if ((queueStats === null || queueStats === void 0 ? void 0 : queueStats.pending) > 0)
            return `${queueStats.pending} pending`;
        return 'Synced';
    };
    const formatLastSync = (timestamp) => {
        const now = Date.now();
        const diff = now - timestamp;
        if (diff < 60000)
            return 'Just now';
        if (diff < 3600000)
            return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000)
            return `${Math.floor(diff / 3600000)}h ago`;
        return new Date(timestamp).toLocaleDateString();
    };
    const handleManualSync = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!isOnline)
            return;
        setIsProcessing(true);
        setSyncProgress(0);
        try {
            yield OfflineQueueManager_1.offlineQueueManager.processQueue();
            setLastSync(Date.now());
        }
        catch (error) {
            console.error('Manual sync failed:', error);
        }
        finally {
            setIsProcessing(false);
            setSyncProgress(0);
        }
    });
    return (react_1.default.createElement("div", { className: `flex items-center space-x-2 ${className}` },
        react_1.default.createElement("div", { className: `text-lg ${getStatusColor()}` }, getStatusIcon()),
        react_1.default.createElement("div", { className: "flex flex-col" },
            react_1.default.createElement("span", { className: `text-sm font-medium ${getStatusColor()}` }, getStatusText()),
            lastSync && (react_1.default.createElement("span", { className: "text-xs text-gray-500" },
                "Last sync: ",
                formatLastSync(lastSync)))),
        isProcessing && (react_1.default.createElement("div", { className: "flex-1 max-w-32" },
            react_1.default.createElement("div", { className: "w-full bg-gray-200 rounded-full h-1" },
                react_1.default.createElement("div", { className: "bg-blue-600 h-1 rounded-full transition-all duration-300", style: { width: `${syncProgress}%` } })))),
        isOnline && (queueStats === null || queueStats === void 0 ? void 0 : queueStats.pending) > 0 && !isProcessing && (react_1.default.createElement("button", { onClick: handleManualSync, className: "px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors" }, "Sync Now")),
        showDetails && queueStats && (react_1.default.createElement("div", { className: "ml-4 pl-4 border-l border-gray-200" },
            react_1.default.createElement("div", { className: "text-xs text-gray-600 space-y-1" },
                react_1.default.createElement("div", null,
                    "Total: ",
                    queueStats.total),
                react_1.default.createElement("div", null,
                    "Pending: ",
                    queueStats.pending),
                react_1.default.createElement("div", null,
                    "Failed: ",
                    queueStats.failed),
                queueStats.conflicts > 0 && (react_1.default.createElement("div", { className: "text-orange-600" },
                    "Conflicts: ",
                    queueStats.conflicts)))))));
};
exports.SyncStatusIndicator = SyncStatusIndicator;
