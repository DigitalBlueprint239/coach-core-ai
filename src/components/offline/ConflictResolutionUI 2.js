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
exports.ConflictResolutionUI = void 0;
// src/components/offline/ConflictResolutionUI.tsx
const react_1 = __importStar(require("react"));
const OfflineQueueManager_1 = require("../../services/offline/OfflineQueueManager");
const ConflictResolutionUI = ({ userId, className = '' }) => {
    const [conflicts, setConflicts] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [selectedConflict, setSelectedConflict] = (0, react_1.useState)(null);
    const [resolutionStrategy, setResolutionStrategy] = (0, react_1.useState)('SERVER_WINS');
    const [mergedData, setMergedData] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        loadConflicts();
        const interval = setInterval(loadConflicts, 5000);
        return () => clearInterval(interval);
    }, []);
    const loadConflicts = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            setLoading(true);
            const conflictsList = yield OfflineQueueManager_1.offlineQueueManager.getConflicts();
            setConflicts(conflictsList);
        }
        catch (error) {
            console.error('Failed to load conflicts:', error);
        }
        finally {
            setLoading(false);
        }
    });
    const handleResolveConflict = (conflict) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            let finalData = null;
            switch (resolutionStrategy) {
                case 'SERVER_WINS':
                    finalData = conflict.serverData;
                    break;
                case 'CLIENT_WINS':
                    finalData = conflict.clientData;
                    break;
                case 'MERGE':
                    finalData = mergedData || conflict.clientData;
                    break;
            }
            yield OfflineQueueManager_1.offlineQueueManager.resolveConflict(conflict.itemId, resolutionStrategy, finalData, userId);
            // Reload conflicts
            yield loadConflicts();
            setSelectedConflict(null);
            setMergedData(null);
            setResolutionStrategy('SERVER_WINS');
        }
        catch (error) {
            console.error('Failed to resolve conflict:', error);
        }
    });
    const handleAutoResolveAll = (strategy) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            for (const conflict of conflicts) {
                yield OfflineQueueManager_1.offlineQueueManager.resolveConflict(conflict.itemId, strategy, strategy === 'SERVER_WINS' ? conflict.serverData : conflict.clientData, userId);
            }
            yield loadConflicts();
        }
        catch (error) {
            console.error('Failed to auto-resolve conflicts:', error);
        }
    });
    const getConflictDescription = (conflict) => {
        const serverKeys = Object.keys(conflict.serverData || {});
        const clientKeys = Object.keys(conflict.clientData || {});
        const conflictingKeys = serverKeys.filter(key => clientKeys.includes(key) &&
            JSON.stringify(conflict.serverData[key]) !== JSON.stringify(conflict.clientData[key]));
        return {
            totalFields: Math.max(serverKeys.length, clientKeys.length),
            conflictingFields: conflictingKeys.length,
            conflictingKeys
        };
    };
    const renderDataComparison = (conflict) => {
        const serverData = conflict.serverData || {};
        const clientData = conflict.clientData || {};
        const allKeys = [...new Set([...Object.keys(serverData), ...Object.keys(clientData)])];
        return (react_1.default.createElement("div", { className: "space-y-4" },
            react_1.default.createElement("h4", { className: "font-medium text-gray-900" }, "Field Comparison"),
            react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-sm" },
                react_1.default.createElement("div", { className: "font-medium text-gray-700" }, "Field"),
                react_1.default.createElement("div", { className: "font-medium text-gray-700" }, "Server Version"),
                react_1.default.createElement("div", { className: "font-medium text-gray-700" }, "Local Version"),
                allKeys.map(key => {
                    const serverValue = serverData[key];
                    const clientValue = clientData[key];
                    const isConflicting = JSON.stringify(serverValue) !== JSON.stringify(clientValue);
                    return (react_1.default.createElement(react_1.default.Fragment, { key: key },
                        react_1.default.createElement("div", { className: `font-medium ${isConflicting ? 'text-red-600' : 'text-gray-900'}` },
                            key,
                            isConflicting && react_1.default.createElement("span", { className: "ml-1 text-red-500" }, "*")),
                        react_1.default.createElement("div", { className: `p-2 bg-gray-50 rounded ${isConflicting ? 'border border-red-200' : ''}` },
                            react_1.default.createElement("pre", { className: "text-xs overflow-auto" }, JSON.stringify(serverValue, null, 2))),
                        react_1.default.createElement("div", { className: `p-2 bg-gray-50 rounded ${isConflicting ? 'border border-red-200' : ''}` },
                            react_1.default.createElement("pre", { className: "text-xs overflow-auto" }, JSON.stringify(clientValue, null, 2)))));
                }))));
    };
    const renderMergeEditor = (conflict) => {
        const serverData = conflict.serverData || {};
        const clientData = conflict.clientData || {};
        const allKeys = [...new Set([...Object.keys(serverData), ...Object.keys(clientData)])];
        const handleMergeFieldChange = (key, value) => {
            setMergedData(prev => (Object.assign(Object.assign({}, prev), { [key]: value })));
        };
        return (react_1.default.createElement("div", { className: "space-y-4" },
            react_1.default.createElement("h4", { className: "font-medium text-gray-900" }, "Merge Data"),
            react_1.default.createElement("div", { className: "space-y-3" }, allKeys.map(key => {
                var _a;
                const serverValue = serverData[key];
                const clientValue = clientData[key];
                const currentValue = (_a = mergedData === null || mergedData === void 0 ? void 0 : mergedData[key]) !== null && _a !== void 0 ? _a : clientValue;
                const isConflicting = JSON.stringify(serverValue) !== JSON.stringify(clientValue);
                return (react_1.default.createElement("div", { key: key, className: "space-y-2" },
                    react_1.default.createElement("label", { className: "block text-sm font-medium text-gray-700" },
                        key,
                        isConflicting && react_1.default.createElement("span", { className: "ml-1 text-red-500" }, "*")),
                    react_1.default.createElement("div", { className: "flex space-x-2" },
                        react_1.default.createElement("button", { onClick: () => handleMergeFieldChange(key, serverValue), className: "px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200" }, "Use Server"),
                        react_1.default.createElement("button", { onClick: () => handleMergeFieldChange(key, clientValue), className: "px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200" }, "Use Local")),
                    react_1.default.createElement("textarea", { value: JSON.stringify(currentValue, null, 2), onChange: (e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                handleMergeFieldChange(key, parsed);
                            }
                            catch (error) {
                                // Invalid JSON, ignore
                            }
                        }, className: "w-full p-2 text-xs border border-gray-300 rounded resize-none", rows: 3 })));
            }))));
    };
    return (react_1.default.createElement("div", { className: `bg-white rounded-lg shadow-md ${className}` },
        react_1.default.createElement("div", { className: "p-4 border-b border-gray-200" },
            react_1.default.createElement("div", { className: "flex items-center justify-between" },
                react_1.default.createElement("h2", { className: "text-lg font-semibold text-gray-900" }, "Conflict Resolution"),
                react_1.default.createElement("div", { className: "flex items-center space-x-2" },
                    react_1.default.createElement("span", { className: "text-sm text-gray-500" },
                        conflicts.length,
                        " conflicts"),
                    conflicts.length > 0 && (react_1.default.createElement("div", { className: "flex space-x-2" },
                        react_1.default.createElement("button", { onClick: () => handleAutoResolveAll('SERVER_WINS'), className: "px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700" }, "Server Wins All"),
                        react_1.default.createElement("button", { onClick: () => handleAutoResolveAll('CLIENT_WINS'), className: "px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700" }, "Local Wins All")))))),
        loading ? (react_1.default.createElement("div", { className: "p-8 text-center" },
            react_1.default.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" }),
            react_1.default.createElement("p", { className: "mt-2 text-gray-500" }, "Loading conflicts..."))) : conflicts.length === 0 ? (react_1.default.createElement("div", { className: "p-8 text-center text-gray-500" }, "No conflicts to resolve")) : (react_1.default.createElement("div", { className: "p-4" },
            react_1.default.createElement("div", { className: "space-y-4" }, conflicts.map((conflict) => {
                const description = getConflictDescription(conflict);
                return (react_1.default.createElement("div", { key: conflict.itemId, className: "border border-gray-200 rounded-lg p-4" },
                    react_1.default.createElement("div", { className: "flex items-center justify-between mb-4" },
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("h3", { className: "font-medium text-gray-900" },
                                "Conflict #",
                                conflict.itemId.slice(-8)),
                            react_1.default.createElement("p", { className: "text-sm text-gray-500" },
                                description.conflictingFields,
                                " of ",
                                description.totalFields,
                                " fields have conflicts")),
                        react_1.default.createElement("div", { className: "flex space-x-2" },
                            react_1.default.createElement("button", { onClick: () => setSelectedConflict((selectedConflict === null || selectedConflict === void 0 ? void 0 : selectedConflict.itemId) === conflict.itemId ? null : conflict), className: "px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200" },
                                (selectedConflict === null || selectedConflict === void 0 ? void 0 : selectedConflict.itemId) === conflict.itemId ? 'Hide' : 'View',
                                " Details"))),
                    (selectedConflict === null || selectedConflict === void 0 ? void 0 : selectedConflict.itemId) === conflict.itemId && (react_1.default.createElement("div", { className: "space-y-6" },
                        renderDataComparison(conflict),
                        react_1.default.createElement("div", { className: "space-y-4" },
                            react_1.default.createElement("h4", { className: "font-medium text-gray-900" }, "Resolution Strategy"),
                            react_1.default.createElement("div", { className: "space-y-3" },
                                react_1.default.createElement("label", { className: "flex items-center" },
                                    react_1.default.createElement("input", { type: "radio", value: "SERVER_WINS", checked: resolutionStrategy === 'SERVER_WINS', onChange: (e) => setResolutionStrategy(e.target.value), className: "mr-2" }),
                                    react_1.default.createElement("span", { className: "text-sm" }, "Server Wins (Use server version)")),
                                react_1.default.createElement("label", { className: "flex items-center" },
                                    react_1.default.createElement("input", { type: "radio", value: "CLIENT_WINS", checked: resolutionStrategy === 'CLIENT_WINS', onChange: (e) => setResolutionStrategy(e.target.value), className: "mr-2" }),
                                    react_1.default.createElement("span", { className: "text-sm" }, "Local Wins (Use local version)")),
                                react_1.default.createElement("label", { className: "flex items-center" },
                                    react_1.default.createElement("input", { type: "radio", value: "MERGE", checked: resolutionStrategy === 'MERGE', onChange: (e) => setResolutionStrategy(e.target.value), className: "mr-2" }),
                                    react_1.default.createElement("span", { className: "text-sm" }, "Merge (Combine both versions)")))),
                        resolutionStrategy === 'MERGE' && renderMergeEditor(conflict),
                        react_1.default.createElement("div", { className: "flex space-x-3 pt-4 border-t border-gray-200" },
                            react_1.default.createElement("button", { onClick: () => handleResolveConflict(conflict), className: "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" }, "Resolve Conflict"),
                            react_1.default.createElement("button", { onClick: () => {
                                    setSelectedConflict(null);
                                    setMergedData(null);
                                    setResolutionStrategy('SERVER_WINS');
                                }, className: "px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200" }, "Cancel"))))));
            }))))));
};
exports.ConflictResolutionUI = ConflictResolutionUI;
