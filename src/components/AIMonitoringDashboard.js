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
exports.AIMonitoringDashboard = void 0;
// src/components/AIMonitoringDashboard.tsx
const react_1 = __importStar(require("react"));
const useEnhancedAIService_1 = require("../hooks/useEnhancedAIService");
const AIMonitoringDashboard = ({ config, userId }) => {
    var _a, _b, _c, _d, _e, _f;
    const { metrics, alerts, getUserQuota, resetUserQuota, getCacheStats, clearCache } = (0, useEnhancedAIService_1.useEnhancedAIService)(config);
    const [userQuota, setUserQuota] = (0, react_1.useState)(null);
    const [cacheStats, setCacheStats] = (0, react_1.useState)(null);
    const [selectedTimeRange, setSelectedTimeRange] = (0, react_1.useState)('24h');
    // Update data periodically
    (0, react_1.useEffect)(() => {
        const updateData = () => {
            setUserQuota(getUserQuota(userId));
            setCacheStats(getCacheStats());
        };
        updateData();
        const interval = setInterval(updateData, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, [getUserQuota, getCacheStats, userId]);
    const formatNumber = (num) => {
        return new Intl.NumberFormat().format(num);
    };
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };
    const formatDuration = (ms) => {
        if (ms < 1000)
            return `${Math.round(ms)}ms`;
        if (ms < 60000)
            return `${Math.round(ms / 1000)}s`;
        return `${Math.round(ms / 60000)}m`;
    };
    const getAlertSeverityColor = (severity) => {
        switch (severity) {
            case 'CRITICAL': return 'bg-red-100 border-red-300 text-red-800';
            case 'HIGH': return 'bg-orange-100 border-orange-300 text-orange-800';
            case 'MEDIUM': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
            case 'LOW': return 'bg-blue-100 border-blue-300 text-blue-800';
            default: return 'bg-gray-100 border-gray-300 text-gray-800';
        }
    };
    const getSuccessRateColor = (rate) => {
        if (rate >= 0.95)
            return 'text-green-600';
        if (rate >= 0.9)
            return 'text-yellow-600';
        return 'text-red-600';
    };
    const getResponseTimeColor = (time) => {
        if (time < 2000)
            return 'text-green-600';
        if (time < 5000)
            return 'text-yellow-600';
        return 'text-red-600';
    };
    return (react_1.default.createElement("div", { className: "max-w-7xl mx-auto p-6" },
        react_1.default.createElement("div", { className: "mb-8" },
            react_1.default.createElement("h1", { className: "text-3xl font-bold text-gray-900 mb-2" }, "AI Service Monitoring Dashboard"),
            react_1.default.createElement("p", { className: "text-gray-600" }, "Real-time monitoring of AI service performance, usage, and alerts")),
        react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" },
            react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
                react_1.default.createElement("div", { className: "flex items-center" },
                    react_1.default.createElement("div", { className: "flex-shrink-0" },
                        react_1.default.createElement("div", { className: "w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center" },
                            react_1.default.createElement("span", { className: "text-blue-600 text-lg" }, "\uD83D\uDCCA"))),
                    react_1.default.createElement("div", { className: "ml-4" },
                        react_1.default.createElement("p", { className: "text-sm font-medium text-gray-500" }, "Total Requests"),
                        react_1.default.createElement("p", { className: "text-2xl font-semibold text-gray-900" }, metrics ? formatNumber(metrics.requestCount) : '0')))),
            react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
                react_1.default.createElement("div", { className: "flex items-center" },
                    react_1.default.createElement("div", { className: "flex-shrink-0" },
                        react_1.default.createElement("div", { className: "w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center" },
                            react_1.default.createElement("span", { className: "text-green-600 text-lg" }, "\u2705"))),
                    react_1.default.createElement("div", { className: "ml-4" },
                        react_1.default.createElement("p", { className: "text-sm font-medium text-gray-500" }, "Success Rate"),
                        react_1.default.createElement("p", { className: `text-2xl font-semibold ${getSuccessRateColor((metrics === null || metrics === void 0 ? void 0 : metrics.successRate) || 1)}` }, metrics ? `${(metrics.successRate * 100).toFixed(1)}%` : '100%')))),
            react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
                react_1.default.createElement("div", { className: "flex items-center" },
                    react_1.default.createElement("div", { className: "flex-shrink-0" },
                        react_1.default.createElement("div", { className: "w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center" },
                            react_1.default.createElement("span", { className: "text-purple-600 text-lg" }, "\u26A1"))),
                    react_1.default.createElement("div", { className: "ml-4" },
                        react_1.default.createElement("p", { className: "text-sm font-medium text-gray-500" }, "Avg Response Time"),
                        react_1.default.createElement("p", { className: `text-2xl font-semibold ${getResponseTimeColor((metrics === null || metrics === void 0 ? void 0 : metrics.averageResponseTime) || 0)}` }, metrics ? formatDuration(metrics.averageResponseTime) : '0ms')))),
            react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
                react_1.default.createElement("div", { className: "flex items-center" },
                    react_1.default.createElement("div", { className: "flex-shrink-0" },
                        react_1.default.createElement("div", { className: "w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center" },
                            react_1.default.createElement("span", { className: "text-yellow-600 text-lg" }, "\uD83D\uDCB0"))),
                    react_1.default.createElement("div", { className: "ml-4" },
                        react_1.default.createElement("p", { className: "text-sm font-medium text-gray-500" }, "Total Cost"),
                        react_1.default.createElement("p", { className: "text-2xl font-semibold text-gray-900" }, metrics ? formatCurrency(metrics.totalCost) : '$0.00'))))),
        react_1.default.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" },
            react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
                react_1.default.createElement("h2", { className: "text-lg font-semibold text-gray-900 mb-4" }, "User Quota"),
                userQuota ? (react_1.default.createElement("div", { className: "space-y-4" },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("div", { className: "flex justify-between text-sm mb-1" },
                            react_1.default.createElement("span", { className: "text-gray-600" }, "Requests Today"),
                            react_1.default.createElement("span", { className: "font-medium" },
                                userQuota.requestsToday,
                                " / ", (_a = config.rateLimit) === null || _a === void 0 ? void 0 :
                                _a.requestsPerDay)),
                        react_1.default.createElement("div", { className: "w-full bg-gray-200 rounded-full h-2" },
                            react_1.default.createElement("div", { className: "bg-blue-600 h-2 rounded-full", style: { width: `${(userQuota.requestsToday / (((_b = config.rateLimit) === null || _b === void 0 ? void 0 : _b.requestsPerDay) || 1)) * 100}%` } }))),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("div", { className: "flex justify-between text-sm mb-1" },
                            react_1.default.createElement("span", { className: "text-gray-600" }, "Requests This Hour"),
                            react_1.default.createElement("span", { className: "font-medium" },
                                userQuota.requestsThisHour,
                                " / ", (_c = config.rateLimit) === null || _c === void 0 ? void 0 :
                                _c.requestsPerHour)),
                        react_1.default.createElement("div", { className: "w-full bg-gray-200 rounded-full h-2" },
                            react_1.default.createElement("div", { className: "bg-green-600 h-2 rounded-full", style: { width: `${(userQuota.requestsThisHour / (((_d = config.rateLimit) === null || _d === void 0 ? void 0 : _d.requestsPerHour) || 1)) * 100}%` } }))),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("div", { className: "flex justify-between text-sm mb-1" },
                            react_1.default.createElement("span", { className: "text-gray-600" }, "Requests This Minute"),
                            react_1.default.createElement("span", { className: "font-medium" },
                                userQuota.requestsThisMinute,
                                " / ", (_e = config.rateLimit) === null || _e === void 0 ? void 0 :
                                _e.requestsPerMinute)),
                        react_1.default.createElement("div", { className: "w-full bg-gray-200 rounded-full h-2" },
                            react_1.default.createElement("div", { className: "bg-yellow-600 h-2 rounded-full", style: { width: `${(userQuota.requestsThisMinute / (((_f = config.rateLimit) === null || _f === void 0 ? void 0 : _f.requestsPerMinute) || 1)) * 100}%` } }))),
                    react_1.default.createElement("div", { className: "pt-4 border-t" },
                        react_1.default.createElement("div", { className: "flex justify-between text-sm" },
                            react_1.default.createElement("span", { className: "text-gray-600" }, "Total Cost"),
                            react_1.default.createElement("span", { className: "font-medium" }, formatCurrency(userQuota.totalCost)))),
                    react_1.default.createElement("button", { onClick: () => resetUserQuota(userId), className: "w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm" }, "Reset Quota"))) : (react_1.default.createElement("p", { className: "text-gray-500" }, "No quota data available"))),
            react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
                react_1.default.createElement("h2", { className: "text-lg font-semibold text-gray-900 mb-4" }, "Cache Statistics"),
                cacheStats ? (react_1.default.createElement("div", { className: "space-y-4" },
                    react_1.default.createElement("div", { className: "flex justify-between" },
                        react_1.default.createElement("span", { className: "text-gray-600" }, "Cache Size"),
                        react_1.default.createElement("span", { className: "font-medium" },
                            cacheStats.size,
                            " items")),
                    react_1.default.createElement("div", { className: "flex justify-between" },
                        react_1.default.createElement("span", { className: "text-gray-600" }, "Memory Usage"),
                        react_1.default.createElement("span", { className: "font-medium" },
                            "~",
                            (cacheStats.size * 0.1).toFixed(1),
                            " MB")),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("span", { className: "text-gray-600 text-sm" }, "Cached Keys:"),
                        react_1.default.createElement("div", { className: "mt-2 max-h-32 overflow-y-auto" },
                            cacheStats.keys.slice(0, 10).map((key, index) => (react_1.default.createElement("div", { key: index, className: "text-xs text-gray-500 font-mono bg-gray-50 p-1 rounded mb-1" }, key.length > 50 ? key.substring(0, 50) + '...' : key))),
                            cacheStats.keys.length > 10 && (react_1.default.createElement("div", { className: "text-xs text-gray-400" },
                                "... and ",
                                cacheStats.keys.length - 10,
                                " more")))),
                    react_1.default.createElement("button", { onClick: clearCache, className: "w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm" }, "Clear Cache"))) : (react_1.default.createElement("p", { className: "text-gray-500" }, "No cache data available")))),
        react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6 mb-8" },
            react_1.default.createElement("div", { className: "flex items-center justify-between mb-4" },
                react_1.default.createElement("h2", { className: "text-lg font-semibold text-gray-900" }, "Active Alerts"),
                react_1.default.createElement("span", { className: "text-sm text-gray-500" },
                    (alerts === null || alerts === void 0 ? void 0 : alerts.length) || 0,
                    " active alerts")),
            alerts && alerts.length > 0 ? (react_1.default.createElement("div", { className: "space-y-3" }, alerts.map((alert) => (react_1.default.createElement("div", { key: alert.id, className: `p-4 border rounded-lg ${getAlertSeverityColor(alert.severity)}` },
                react_1.default.createElement("div", { className: "flex items-start justify-between" },
                    react_1.default.createElement("div", { className: "flex-1" },
                        react_1.default.createElement("div", { className: "flex items-center mb-1" },
                            react_1.default.createElement("span", { className: "font-medium mr-2" }, alert.type.replace('_', ' ')),
                            react_1.default.createElement("span", { className: `px-2 py-1 text-xs rounded-full ${alert.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' :
                                    alert.severity === 'HIGH' ? 'bg-orange-200 text-orange-800' :
                                        alert.severity === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                                            'bg-blue-200 text-blue-800'}` }, alert.severity)),
                        react_1.default.createElement("p", { className: "text-sm" }, alert.message),
                        react_1.default.createElement("p", { className: "text-xs opacity-75 mt-1" }, new Date(alert.timestamp).toLocaleString())),
                    !alert.acknowledged && (react_1.default.createElement("button", { className: "ml-4 text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" }, "Acknowledge")))))))) : (react_1.default.createElement("p", { className: "text-gray-500 text-center py-4" }, "No active alerts"))),
        react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
            react_1.default.createElement("h2", { className: "text-lg font-semibold text-gray-900 mb-4" }, "Performance Trends"),
            react_1.default.createElement("div", { className: "flex items-center justify-between mb-4" },
                react_1.default.createElement("div", { className: "flex space-x-2" }, ['1h', '24h', '7d'].map((range) => (react_1.default.createElement("button", { key: range, onClick: () => setSelectedTimeRange(range), className: `px-3 py-1 text-sm rounded ${selectedTimeRange === range
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}` }, range))))),
            react_1.default.createElement("div", { className: "h-64 bg-gray-50 rounded-lg flex items-center justify-center" },
                react_1.default.createElement("p", { className: "text-gray-500" },
                    "Performance chart for ",
                    selectedTimeRange,
                    " would be displayed here")))));
};
exports.AIMonitoringDashboard = AIMonitoringDashboard;
