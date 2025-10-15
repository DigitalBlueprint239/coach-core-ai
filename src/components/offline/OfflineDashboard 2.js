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
exports.OfflineDashboard = void 0;
// src/components/offline/OfflineDashboard.tsx
const react_1 = __importStar(require("react"));
const SyncStatusIndicator_1 = require("./SyncStatusIndicator");
const QueueViewer_1 = require("./QueueViewer");
const ConflictResolutionUI_1 = require("./ConflictResolutionUI");
const OfflineQueueManager_1 = require("../../services/offline/OfflineQueueManager");
const OfflineDashboard = ({ userId, className = '' }) => {
    const [activeTab, setActiveTab] = (0, react_1.useState)('overview');
    const [showAdvanced, setShowAdvanced] = (0, react_1.useState)(false);
    const handleClearQueue = () => __awaiter(void 0, void 0, void 0, function* () {
        if (window.confirm('Are you sure you want to clear the entire offline queue? This action cannot be undone.')) {
            try {
                yield OfflineQueueManager_1.offlineQueueManager.clearQueue();
                alert('Queue cleared successfully');
            }
            catch (error) {
                console.error('Failed to clear queue:', error);
                alert('Failed to clear queue');
            }
        }
    });
    const handleForceSync = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield OfflineQueueManager_1.offlineQueueManager.processQueue();
            alert('Manual sync completed');
        }
        catch (error) {
            console.error('Manual sync failed:', error);
            alert('Manual sync failed');
        }
    });
    const tabs = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'queue', label: 'Queue', icon: '📋' },
        { id: 'conflicts', label: 'Conflicts', icon: '⚠️' },
        { id: 'settings', label: 'Settings', icon: '⚙️' }
    ];
    return (react_1.default.createElement("div", { className: `max-w-7xl mx-auto p-6 ${className}` },
        react_1.default.createElement("div", { className: "mb-8" },
            react_1.default.createElement("h1", { className: "text-3xl font-bold text-gray-900 mb-2" }, "Offline Management Dashboard"),
            react_1.default.createElement("p", { className: "text-gray-600" }, "Monitor and manage offline operations, sync status, and resolve conflicts")),
        react_1.default.createElement("div", { className: "mb-6" },
            react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-4" },
                react_1.default.createElement("div", { className: "flex items-center justify-between" },
                    react_1.default.createElement(SyncStatusIndicator_1.SyncStatusIndicator, { userId: userId, showDetails: true }),
                    react_1.default.createElement("div", { className: "flex space-x-3" },
                        react_1.default.createElement("button", { onClick: handleForceSync, className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors" }, "Force Sync"),
                        react_1.default.createElement("button", { onClick: () => setShowAdvanced(!showAdvanced), className: "px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors" },
                            showAdvanced ? 'Hide' : 'Show',
                            " Advanced"))))),
        showAdvanced && (react_1.default.createElement("div", { className: "mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4" },
            react_1.default.createElement("h3", { className: "font-semibold text-yellow-900 mb-3" }, "Advanced Controls"),
            react_1.default.createElement("div", { className: "flex space-x-3" },
                react_1.default.createElement("button", { onClick: handleClearQueue, className: "px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors" }, "Clear Queue"),
                react_1.default.createElement("button", { onClick: () => OfflineQueueManager_1.offlineQueueManager['clearCache'](), className: "px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors" }, "Clear Cache"),
                react_1.default.createElement("button", { onClick: () => {
                        const stats = OfflineQueueManager_1.offlineQueueManager.getCacheStats();
                        console.log('Cache Stats:', stats);
                        alert(`Cache Stats: ${JSON.stringify(stats, null, 2)}`);
                    }, className: "px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors" }, "View Cache Stats")))),
        react_1.default.createElement("div", { className: "mb-6" },
            react_1.default.createElement("nav", { className: "flex space-x-8 border-b border-gray-200" }, tabs.map((tab) => (react_1.default.createElement("button", { key: tab.id, onClick: () => setActiveTab(tab.id), className: `flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}` },
                react_1.default.createElement("span", null, tab.icon),
                react_1.default.createElement("span", null, tab.label)))))),
        react_1.default.createElement("div", { className: "min-h-96" },
            activeTab === 'overview' && (react_1.default.createElement("div", { className: "space-y-6" },
                react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-6" },
                    react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
                        react_1.default.createElement("div", { className: "flex items-center" },
                            react_1.default.createElement("div", { className: "flex-shrink-0" },
                                react_1.default.createElement("div", { className: "w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center" },
                                    react_1.default.createElement("span", { className: "text-blue-600 text-lg" }, "\uD83D\uDCCA"))),
                            react_1.default.createElement("div", { className: "ml-4" },
                                react_1.default.createElement("p", { className: "text-sm font-medium text-gray-500" }, "Total Operations"),
                                react_1.default.createElement("p", { className: "text-2xl font-semibold text-gray-900" }, "-")))),
                    react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
                        react_1.default.createElement("div", { className: "flex items-center" },
                            react_1.default.createElement("div", { className: "flex-shrink-0" },
                                react_1.default.createElement("div", { className: "w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center" },
                                    react_1.default.createElement("span", { className: "text-yellow-600 text-lg" }, "\u23F3"))),
                            react_1.default.createElement("div", { className: "ml-4" },
                                react_1.default.createElement("p", { className: "text-sm font-medium text-gray-500" }, "Pending"),
                                react_1.default.createElement("p", { className: "text-2xl font-semibold text-gray-900" }, "-")))),
                    react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
                        react_1.default.createElement("div", { className: "flex items-center" },
                            react_1.default.createElement("div", { className: "flex-shrink-0" },
                                react_1.default.createElement("div", { className: "w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center" },
                                    react_1.default.createElement("span", { className: "text-red-600 text-lg" }, "\u26A0\uFE0F"))),
                            react_1.default.createElement("div", { className: "ml-4" },
                                react_1.default.createElement("p", { className: "text-sm font-medium text-gray-500" }, "Conflicts"),
                                react_1.default.createElement("p", { className: "text-2xl font-semibold text-gray-900" }, "-")))),
                    react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
                        react_1.default.createElement("div", { className: "flex items-center" },
                            react_1.default.createElement("div", { className: "flex-shrink-0" },
                                react_1.default.createElement("div", { className: "w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center" },
                                    react_1.default.createElement("span", { className: "text-green-600 text-lg" }, "\u2705"))),
                            react_1.default.createElement("div", { className: "ml-4" },
                                react_1.default.createElement("p", { className: "text-sm font-medium text-gray-500" }, "Success Rate"),
                                react_1.default.createElement("p", { className: "text-2xl font-semibold text-gray-900" }, "-"))))),
                react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
                    react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900 mb-4" }, "Network Status"),
                    react_1.default.createElement("div", { className: "space-y-4" },
                        react_1.default.createElement("div", { className: "flex items-center justify-between" },
                            react_1.default.createElement("span", { className: "text-gray-700" }, "Connection Status"),
                            react_1.default.createElement("span", { className: `px-2 py-1 text-xs rounded-full ${navigator.onLine
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'}` }, navigator.onLine ? 'Online' : 'Offline')),
                        react_1.default.createElement("div", { className: "flex items-center justify-between" },
                            react_1.default.createElement("span", { className: "text-gray-700" }, "Service Worker"),
                            react_1.default.createElement("span", { className: "px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full" }, "Active")),
                        react_1.default.createElement("div", { className: "flex items-center justify-between" },
                            react_1.default.createElement("span", { className: "text-gray-700" }, "IndexedDB"),
                            react_1.default.createElement("span", { className: "px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full" }, "Available")))),
                react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
                    react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900 mb-4" }, "Recent Activity"),
                    react_1.default.createElement("div", { className: "text-gray-500 text-center py-8" }, "Recent activity will be displayed here")))),
            activeTab === 'queue' && (react_1.default.createElement(QueueViewer_1.QueueViewer, { userId: userId })),
            activeTab === 'conflicts' && (react_1.default.createElement(ConflictResolutionUI_1.ConflictResolutionUI, { userId: userId })),
            activeTab === 'settings' && (react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
                react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900 mb-4" }, "Offline Settings"),
                react_1.default.createElement("div", { className: "space-y-6" },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h4", { className: "font-medium text-gray-900 mb-3" }, "Queue Settings"),
                        react_1.default.createElement("div", { className: "space-y-3" },
                            react_1.default.createElement("div", { className: "flex items-center justify-between" },
                                react_1.default.createElement("span", { className: "text-gray-700" }, "Auto-sync on reconnect"),
                                react_1.default.createElement("input", { type: "checkbox", defaultChecked: true, className: "rounded border-gray-300" })),
                            react_1.default.createElement("div", { className: "flex items-center justify-between" },
                                react_1.default.createElement("span", { className: "text-gray-700" }, "Retry failed operations"),
                                react_1.default.createElement("input", { type: "checkbox", defaultChecked: true, className: "rounded border-gray-300" })),
                            react_1.default.createElement("div", { className: "flex items-center justify-between" },
                                react_1.default.createElement("span", { className: "text-gray-700" }, "Show sync notifications"),
                                react_1.default.createElement("input", { type: "checkbox", defaultChecked: true, className: "rounded border-gray-300" })))),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h4", { className: "font-medium text-gray-900 mb-3" }, "Conflict Resolution"),
                        react_1.default.createElement("div", { className: "space-y-3" },
                            react_1.default.createElement("div", null,
                                react_1.default.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Default resolution strategy"),
                                react_1.default.createElement("select", { className: "w-full px-3 py-2 border border-gray-300 rounded-md" },
                                    react_1.default.createElement("option", { value: "SERVER_WINS" }, "Server Wins"),
                                    react_1.default.createElement("option", { value: "CLIENT_WINS" }, "Local Wins"),
                                    react_1.default.createElement("option", { value: "MERGE" }, "Merge"),
                                    react_1.default.createElement("option", { value: "USER_CHOICE" }, "Ask User"))),
                            react_1.default.createElement("div", { className: "flex items-center justify-between" },
                                react_1.default.createElement("span", { className: "text-gray-700" }, "Auto-resolve simple conflicts"),
                                react_1.default.createElement("input", { type: "checkbox", defaultChecked: true, className: "rounded border-gray-300" })))),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h4", { className: "font-medium text-gray-900 mb-3" }, "Storage"),
                        react_1.default.createElement("div", { className: "space-y-3" },
                            react_1.default.createElement("div", { className: "flex items-center justify-between" },
                                react_1.default.createElement("span", { className: "text-gray-700" }, "Max queue size"),
                                react_1.default.createElement("input", { type: "number", defaultValue: "1000", className: "w-24 px-3 py-2 border border-gray-300 rounded-md" })),
                            react_1.default.createElement("div", { className: "flex items-center justify-between" },
                                react_1.default.createElement("span", { className: "text-gray-700" }, "Cache TTL (minutes)"),
                                react_1.default.createElement("input", { type: "number", defaultValue: "5", className: "w-24 px-3 py-2 border border-gray-300 rounded-md" })))),
                    react_1.default.createElement("div", { className: "pt-4 border-t border-gray-200" },
                        react_1.default.createElement("button", { className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors" }, "Save Settings"))))))));
};
exports.OfflineDashboard = OfflineDashboard;
