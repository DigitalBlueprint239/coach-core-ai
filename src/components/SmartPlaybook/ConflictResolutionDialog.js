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
exports.ConflictResolutionDialog = void 0;
const react_1 = __importStar(require("react"));
const ConflictResolutionDialog = ({ isOpen, onClose, onResolve, localChanges, serverVersion, conflictDetails }) => {
    const [selectedAction, setSelectedAction] = (0, react_1.useState)(null);
    const [showOverwriteWarning, setShowOverwriteWarning] = (0, react_1.useState)(false);
    if (!isOpen)
        return null;
    const handleAction = (action) => {
        if (action === 'overwrite') {
            setShowOverwriteWarning(true);
            setSelectedAction(action);
        }
        else {
            onResolve(action);
        }
    };
    const confirmOverwrite = () => {
        if (selectedAction === 'overwrite') {
            onResolve('overwrite');
        }
    };
    const getFieldDiff = (field) => {
        const localValue = localChanges[field];
        const serverValue = serverVersion[field];
        if (Array.isArray(localValue) && Array.isArray(serverValue)) {
            return {
                local: localValue.join(', '),
                server: serverValue.join(', '),
                type: 'array'
            };
        }
        return {
            local: String(localValue || ''),
            server: String(serverValue || ''),
            type: typeof localValue
        };
    };
    return (react_1.default.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" },
        react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" },
            react_1.default.createElement("div", { className: "px-6 py-4 border-b border-gray-200" },
                react_1.default.createElement("div", { className: "flex items-center justify-between" },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h2", { className: "text-xl font-semibold text-gray-900" }, "Conflict Detected"),
                        react_1.default.createElement("p", { className: "text-sm text-gray-600 mt-1" },
                            "This play has been modified by ",
                            conflictDetails.lastModifiedBy,
                            " at",
                            ' ',
                            conflictDetails.lastModifiedAt.toLocaleString())),
                    react_1.default.createElement("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600" },
                        react_1.default.createElement("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                            react_1.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }))))),
            react_1.default.createElement("div", { className: "px-6 py-4" },
                react_1.default.createElement("div", { className: "mb-4" },
                    react_1.default.createElement("h3", { className: "text-lg font-medium text-gray-900 mb-3" }, "Conflicting Changes"),
                    react_1.default.createElement("div", { className: "bg-gray-50 rounded-lg p-4" },
                        react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" }, conflictDetails.conflictingFields.map((field) => {
                            const diff = getFieldDiff(field);
                            return (react_1.default.createElement("div", { key: field, className: "space-y-2" },
                                react_1.default.createElement("h4", { className: "font-medium text-gray-700 capitalize" }, field.replace(/([A-Z])/g, ' $1').trim()),
                                react_1.default.createElement("div", { className: "space-y-1" },
                                    react_1.default.createElement("div", { className: "text-xs text-gray-500" }, "Your version:"),
                                    react_1.default.createElement("div", { className: "text-sm bg-red-50 border border-red-200 rounded px-2 py-1" }, diff.local || '(empty)'),
                                    react_1.default.createElement("div", { className: "text-xs text-gray-500 mt-2" }, "Server version:"),
                                    react_1.default.createElement("div", { className: "text-sm bg-green-50 border border-green-200 rounded px-2 py-1" }, diff.server || '(empty)'))));
                        })))),
                react_1.default.createElement("div", { className: "space-y-4" },
                    react_1.default.createElement("h3", { className: "text-lg font-medium text-gray-900" }, "Choose Resolution:"),
                    react_1.default.createElement("div", { className: "border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer", onClick: () => handleAction('discard') },
                        react_1.default.createElement("div", { className: "flex items-start" },
                            react_1.default.createElement("div", { className: "flex-shrink-0" },
                                react_1.default.createElement("div", { className: "w-6 h-6 rounded-full bg-red-100 flex items-center justify-center" },
                                    react_1.default.createElement("svg", { className: "w-4 h-4 text-red-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                                        react_1.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" })))),
                            react_1.default.createElement("div", { className: "ml-3" },
                                react_1.default.createElement("h4", { className: "text-sm font-medium text-gray-900" }, "Discard My Changes"),
                                react_1.default.createElement("p", { className: "text-sm text-gray-500" }, "Accept the server version and lose your local changes")))),
                    react_1.default.createElement("div", { className: "border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer", onClick: () => handleAction('merge') },
                        react_1.default.createElement("div", { className: "flex items-start" },
                            react_1.default.createElement("div", { className: "flex-shrink-0" },
                                react_1.default.createElement("div", { className: "w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center" },
                                    react_1.default.createElement("svg", { className: "w-4 h-4 text-blue-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                                        react_1.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" })))),
                            react_1.default.createElement("div", { className: "ml-3" },
                                react_1.default.createElement("h4", { className: "text-sm font-medium text-gray-900" }, "Merge Changes"),
                                react_1.default.createElement("p", { className: "text-sm text-gray-500" }, "Combine both versions intelligently (recommended)")))),
                    react_1.default.createElement("div", { className: "border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer", onClick: () => handleAction('overwrite') },
                        react_1.default.createElement("div", { className: "flex items-start" },
                            react_1.default.createElement("div", { className: "flex-shrink-0" },
                                react_1.default.createElement("div", { className: "w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center" },
                                    react_1.default.createElement("svg", { className: "w-4 h-4 text-yellow-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                                        react_1.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" })))),
                            react_1.default.createElement("div", { className: "ml-3" },
                                react_1.default.createElement("h4", { className: "text-sm font-medium text-gray-900" }, "Overwrite Server Version"),
                                react_1.default.createElement("p", { className: "text-sm text-gray-500" }, "Force your changes and overwrite the server version")))))),
            react_1.default.createElement("div", { className: "px-6 py-4 border-t border-gray-200 bg-gray-50" },
                react_1.default.createElement("div", { className: "flex justify-end space-x-3" },
                    react_1.default.createElement("button", { onClick: onClose, className: "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" }, "Cancel")))),
        showOverwriteWarning && (react_1.default.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60" },
            react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-xl max-w-md w-full mx-4" },
                react_1.default.createElement("div", { className: "px-6 py-4 border-b border-gray-200" },
                    react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900" }, "Warning")),
                react_1.default.createElement("div", { className: "px-6 py-4" },
                    react_1.default.createElement("p", { className: "text-sm text-gray-600 mb-4" }, "You're about to overwrite changes made by another user. This action cannot be undone. Are you sure you want to proceed?")),
                react_1.default.createElement("div", { className: "px-6 py-4 border-t border-gray-200 bg-gray-50" },
                    react_1.default.createElement("div", { className: "flex justify-end space-x-3" },
                        react_1.default.createElement("button", { onClick: () => setShowOverwriteWarning(false), className: "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" }, "Cancel"),
                        react_1.default.createElement("button", { onClick: confirmOverwrite, className: "px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700" }, "Overwrite Anyway"))))))));
};
exports.ConflictResolutionDialog = ConflictResolutionDialog;
exports.default = exports.ConflictResolutionDialog;
