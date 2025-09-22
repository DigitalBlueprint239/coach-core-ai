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
exports.QueueViewer = void 0;
// src/components/offline/QueueViewer.tsx
const react_1 = __importStar(require("react"));
const OfflineQueueManager_1 = require("../../services/offline/OfflineQueueManager");
const QueueViewer = ({ userId, className = '' }) => {
    const [queueItems, setQueueItems] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [filters, setFilters] = (0, react_1.useState)({
        status: '',
        priority: '',
        collection: ''
    });
    const [selectedItems, setSelectedItems] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        loadQueueItems();
        const interval = setInterval(loadQueueItems, 3000);
        return () => clearInterval(interval);
    }, [filters]);
    const loadQueueItems = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            setLoading(true);
            const items = yield OfflineQueueManager_1.offlineQueueManager.getQueueItems(Object.assign(Object.assign(Object.assign({ userId }, (filters.status && { status: filters.status })), (filters.priority && { priority: filters.priority })), (filters.collection && { collection: filters.collection })));
            setQueueItems(items);
        }
        catch (error) {
            console.error('Failed to load queue items:', error);
        }
        finally {
            setLoading(false);
        }
    });
    const handleRetryItem = (itemId) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const item = queueItems.find(i => i.id === itemId);
            if (!item)
                return;
            // Reset item status and retry count
            item.status = 'PENDING';
            item.retryCount = 0;
            item.error = undefined;
            // Update the item in the queue
            yield OfflineQueueManager_1.offlineQueueManager['updateInIndexedDB']('queue', item);
            // Trigger queue processing
            if (OfflineQueueManager_1.offlineQueueManager.isOnline()) {
                yield OfflineQueueManager_1.offlineQueueManager.processQueue();
            }
            loadQueueItems();
        }
        catch (error) {
            console.error('Failed to retry item:', error);
        }
    });
    const handleRemoveItem = (itemId) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield OfflineQueueManager_1.offlineQueueManager.removeFromQueue(itemId);
            setSelectedItems(prev => prev.filter(id => id !== itemId));
            loadQueueItems();
        }
        catch (error) {
            console.error('Failed to remove item:', error);
        }
    });
    const handleRemoveSelected = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield Promise.all(selectedItems.map(id => OfflineQueueManager_1.offlineQueueManager.removeFromQueue(id)));
            setSelectedItems([]);
            loadQueueItems();
        }
        catch (error) {
            console.error('Failed to remove selected items:', error);
        }
    });
    const handleSelectAll = () => {
        if (selectedItems.length === queueItems.length) {
            setSelectedItems([]);
        }
        else {
            setSelectedItems(queueItems.map(item => item.id));
        }
    };
    const handleSelectItem = (itemId) => {
        setSelectedItems(prev => prev.includes(itemId)
            ? prev.filter(id => id !== itemId)
            : [...prev, itemId]);
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return 'text-yellow-600 bg-yellow-50';
            case 'PROCESSING': return 'text-blue-600 bg-blue-50';
            case 'COMPLETED': return 'text-green-600 bg-green-50';
            case 'FAILED': return 'text-red-600 bg-red-50';
            case 'CONFLICT': return 'text-orange-600 bg-orange-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'CRITICAL': return 'text-red-600';
            case 'HIGH': return 'text-orange-600';
            case 'NORMAL': return 'text-blue-600';
            case 'LOW': return 'text-gray-600';
            default: return 'text-gray-600';
        }
    };
    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };
    const getOperationDescription = (item) => {
        switch (item.type) {
            case 'CREATE':
                return `Create document in ${item.collection}`;
            case 'UPDATE':
                return `Update ${item.documentId} in ${item.collection}`;
            case 'DELETE':
                return `Delete ${item.documentId} from ${item.collection}`;
            case 'BATCH':
                return `Batch operation on ${item.collection}`;
            default:
                return `${item.type} operation`;
        }
    };
    const filteredItems = queueItems.filter(item => {
        if (filters.status && item.status !== filters.status)
            return false;
        if (filters.priority && item.priority !== filters.priority)
            return false;
        if (filters.collection && item.collection !== filters.collection)
            return false;
        return true;
    });
    return (react_1.default.createElement("div", { className: `bg-white rounded-lg shadow-md ${className}` },
        react_1.default.createElement("div", { className: "p-4 border-b border-gray-200" },
            react_1.default.createElement("div", { className: "flex items-center justify-between" },
                react_1.default.createElement("h2", { className: "text-lg font-semibold text-gray-900" }, "Offline Queue"),
                react_1.default.createElement("div", { className: "flex items-center space-x-2" },
                    react_1.default.createElement("span", { className: "text-sm text-gray-500" },
                        filteredItems.length,
                        " items"),
                    react_1.default.createElement("button", { onClick: loadQueueItems, className: "px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200" }, "Refresh")))),
        react_1.default.createElement("div", { className: "p-4 border-b border-gray-200 bg-gray-50" },
            react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4" },
                react_1.default.createElement("select", { value: filters.status, onChange: (e) => setFilters(prev => (Object.assign(Object.assign({}, prev), { status: e.target.value }))), className: "px-3 py-2 border border-gray-300 rounded-md text-sm" },
                    react_1.default.createElement("option", { value: "" }, "All Status"),
                    react_1.default.createElement("option", { value: "PENDING" }, "Pending"),
                    react_1.default.createElement("option", { value: "PROCESSING" }, "Processing"),
                    react_1.default.createElement("option", { value: "COMPLETED" }, "Completed"),
                    react_1.default.createElement("option", { value: "FAILED" }, "Failed"),
                    react_1.default.createElement("option", { value: "CONFLICT" }, "Conflict")),
                react_1.default.createElement("select", { value: filters.priority, onChange: (e) => setFilters(prev => (Object.assign(Object.assign({}, prev), { priority: e.target.value }))), className: "px-3 py-2 border border-gray-300 rounded-md text-sm" },
                    react_1.default.createElement("option", { value: "" }, "All Priorities"),
                    react_1.default.createElement("option", { value: "CRITICAL" }, "Critical"),
                    react_1.default.createElement("option", { value: "HIGH" }, "High"),
                    react_1.default.createElement("option", { value: "NORMAL" }, "Normal"),
                    react_1.default.createElement("option", { value: "LOW" }, "Low")),
                react_1.default.createElement("input", { type: "text", placeholder: "Filter by collection...", value: filters.collection, onChange: (e) => setFilters(prev => (Object.assign(Object.assign({}, prev), { collection: e.target.value }))), className: "px-3 py-2 border border-gray-300 rounded-md text-sm" }),
                selectedItems.length > 0 && (react_1.default.createElement("button", { onClick: handleRemoveSelected, className: "px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700" },
                    "Remove Selected (",
                    selectedItems.length,
                    ")")))),
        react_1.default.createElement("div", { className: "overflow-x-auto" }, loading ? (react_1.default.createElement("div", { className: "p-8 text-center" },
            react_1.default.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" }),
            react_1.default.createElement("p", { className: "mt-2 text-gray-500" }, "Loading queue items..."))) : filteredItems.length === 0 ? (react_1.default.createElement("div", { className: "p-8 text-center text-gray-500" }, "No queue items found")) : (react_1.default.createElement("table", { className: "w-full" },
            react_1.default.createElement("thead", { className: "bg-gray-50" },
                react_1.default.createElement("tr", null,
                    react_1.default.createElement("th", { className: "px-4 py-3 text-left" },
                        react_1.default.createElement("input", { type: "checkbox", checked: selectedItems.length === filteredItems.length, onChange: handleSelectAll, className: "rounded border-gray-300" })),
                    react_1.default.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" }, "Operation"),
                    react_1.default.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" }, "Status"),
                    react_1.default.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" }, "Priority"),
                    react_1.default.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" }, "Collection"),
                    react_1.default.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" }, "Timestamp"),
                    react_1.default.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" }, "Actions"))),
            react_1.default.createElement("tbody", { className: "bg-white divide-y divide-gray-200" }, filteredItems.map((item) => (react_1.default.createElement("tr", { key: item.id, className: "hover:bg-gray-50" },
                react_1.default.createElement("td", { className: "px-4 py-3" },
                    react_1.default.createElement("input", { type: "checkbox", checked: selectedItems.includes(item.id), onChange: () => handleSelectItem(item.id), className: "rounded border-gray-300" })),
                react_1.default.createElement("td", { className: "px-4 py-3" },
                    react_1.default.createElement("div", { className: "text-sm font-medium text-gray-900" }, getOperationDescription(item)),
                    item.error && (react_1.default.createElement("div", { className: "text-xs text-red-600 mt-1" },
                        "Error: ",
                        item.error))),
                react_1.default.createElement("td", { className: "px-4 py-3" },
                    react_1.default.createElement("span", { className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}` }, item.status)),
                react_1.default.createElement("td", { className: "px-4 py-3" },
                    react_1.default.createElement("span", { className: `text-sm font-medium ${getPriorityColor(item.priority)}` }, item.priority)),
                react_1.default.createElement("td", { className: "px-4 py-3 text-sm text-gray-900" }, item.collection),
                react_1.default.createElement("td", { className: "px-4 py-3 text-sm text-gray-500" }, formatTimestamp(item.timestamp)),
                react_1.default.createElement("td", { className: "px-4 py-3" },
                    react_1.default.createElement("div", { className: "flex space-x-2" },
                        item.status === 'FAILED' && (react_1.default.createElement("button", { onClick: () => handleRetryItem(item.id), className: "text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700" }, "Retry")),
                        react_1.default.createElement("button", { onClick: () => handleRemoveItem(item.id), className: "text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700" }, "Remove"))))))))))));
};
exports.QueueViewer = QueueViewer;
