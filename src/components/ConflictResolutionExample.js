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
exports.ConflictResolutionExample = void 0;
// src/components/ConflictResolutionExample.tsx
const react_1 = __importStar(require("react"));
const firestore_1 = require("../services/firestore");
const useAuth_1 = require("../hooks/useAuth");
const ConflictResolutionExample = ({ teamId, playId }) => {
    const { user } = (0, useAuth_1.useAuth)();
    const [play, setPlay] = (0, react_1.useState)(null);
    const [formData, setFormData] = (0, react_1.useState)({
        name: '',
        description: '',
        formation: ''
    });
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)('');
    const [success, setSuccess] = (0, react_1.useState)('');
    // Load play data
    (0, react_1.useEffect)(() => {
        const loadPlay = () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const plays = yield (0, firestore_1.getPlays)(teamId);
                const foundPlay = plays.find(p => p.id === playId);
                if (foundPlay) {
                    setPlay(foundPlay);
                    setFormData({
                        name: foundPlay.name,
                        description: foundPlay.description,
                        formation: foundPlay.formation
                    });
                }
            }
            catch (err) {
                setError('Failed to load play data');
            }
        });
        if (teamId && playId) {
            loadPlay();
        }
    }, [teamId, playId]);
    // Handle form changes
    const handleInputChange = (field, value) => {
        setFormData(prev => (Object.assign(Object.assign({}, prev), { [field]: value })));
        setError(''); // Clear any previous errors
        setSuccess(''); // Clear any previous success messages
    };
    // Handle save with optimistic locking
    const handleSave = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!play || !user)
            return;
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            // Include current version for conflict detection
            const updateData = {
                name: formData.name,
                description: formData.description,
                formation: formData.formation,
                version: play.version // Critical: Include current version
            };
            yield (0, firestore_1.updatePlay)(teamId, playId, updateData);
            // Update local state on success
            const updatedPlay = Object.assign(Object.assign(Object.assign({}, play), formData), { version: (play.version || 0) + 1 });
            setPlay(updatedPlay);
            setSuccess('Play updated successfully!');
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save play';
            setError(errorMessage);
            // Handle conflict errors by reloading latest data
            if (errorMessage.includes('modified by another user')) {
                try {
                    const plays = yield (0, firestore_1.getPlays)(teamId);
                    const latestPlay = plays.find(p => p.id === playId);
                    if (latestPlay) {
                        setPlay(latestPlay);
                        setFormData({
                            name: latestPlay.name,
                            description: latestPlay.description,
                            formation: latestPlay.formation
                        });
                        setError('Play was modified by another user. Latest version loaded. Please review and try again.');
                    }
                }
                catch (reloadError) {
                    setError('Failed to reload latest version. Please refresh the page.');
                }
            }
        }
        finally {
            setSaving(false);
        }
    });
    if (!play) {
        return (react_1.default.createElement("div", { className: "flex items-center justify-center p-8" },
            react_1.default.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" }),
            react_1.default.createElement("span", { className: "ml-2" }, "Loading play...")));
    }
    return (react_1.default.createElement("div", { className: "max-w-2xl mx-auto p-6" },
        react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
            react_1.default.createElement("h2", { className: "text-2xl font-bold text-gray-900 mb-6" }, "Play Editor - Optimistic Locking Example"),
            react_1.default.createElement("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6" },
                react_1.default.createElement("h3", { className: "font-semibold text-blue-900 mb-2" }, "Document Information"),
                react_1.default.createElement("div", { className: "grid grid-cols-2 gap-4 text-sm" },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("span", { className: "font-medium text-blue-800" }, "Version:"),
                        " ",
                        play.version || 0),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("span", { className: "font-medium text-blue-800" }, "Last Modified:"),
                        play.lastModifiedAt ? new Date(play.lastModifiedAt.seconds * 1000).toLocaleString() : 'Unknown'),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("span", { className: "font-medium text-blue-800" }, "Modified By:"),
                        " ",
                        play.lastModifiedBy || 'Unknown'),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("span", { className: "font-medium text-blue-800" }, "Created:"),
                        play.createdAt ? new Date(play.createdAt).toLocaleString() : 'Unknown'))),
            react_1.default.createElement("div", { className: "space-y-4" },
                react_1.default.createElement("div", null,
                    react_1.default.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Play Name"),
                    react_1.default.createElement("input", { type: "text", value: formData.name, onChange: (e) => handleInputChange('name', e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", disabled: saving })),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Formation"),
                    react_1.default.createElement("input", { type: "text", value: formData.formation, onChange: (e) => handleInputChange('formation', e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", disabled: saving })),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Description"),
                    react_1.default.createElement("textarea", { value: formData.description, onChange: (e) => handleInputChange('description', e.target.value), rows: 4, className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", disabled: saving }))),
            error && (react_1.default.createElement("div", { className: "mt-4 p-4 bg-red-50 border border-red-200 rounded-lg" },
                react_1.default.createElement("div", { className: "flex" },
                    react_1.default.createElement("div", { className: "flex-shrink-0" },
                        react_1.default.createElement("svg", { className: "h-5 w-5 text-red-400", viewBox: "0 0 20 20", fill: "currentColor" },
                            react_1.default.createElement("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z", clipRule: "evenodd" }))),
                    react_1.default.createElement("div", { className: "ml-3" },
                        react_1.default.createElement("h3", { className: "text-sm font-medium text-red-800" }, "Error"),
                        react_1.default.createElement("div", { className: "mt-2 text-sm text-red-700" }, error))))),
            success && (react_1.default.createElement("div", { className: "mt-4 p-4 bg-green-50 border border-green-200 rounded-lg" },
                react_1.default.createElement("div", { className: "flex" },
                    react_1.default.createElement("div", { className: "flex-shrink-0" },
                        react_1.default.createElement("svg", { className: "h-5 w-5 text-green-400", viewBox: "0 0 20 20", fill: "currentColor" },
                            react_1.default.createElement("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", clipRule: "evenodd" }))),
                    react_1.default.createElement("div", { className: "ml-3" },
                        react_1.default.createElement("h3", { className: "text-sm font-medium text-green-800" }, "Success"),
                        react_1.default.createElement("div", { className: "mt-2 text-sm text-green-700" }, success))))),
            react_1.default.createElement("div", { className: "mt-6 flex justify-end space-x-4" },
                react_1.default.createElement("button", { onClick: handleSave, disabled: saving, className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" }, saving ? 'Saving...' : 'Save Changes')),
            react_1.default.createElement("div", { className: "mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4" },
                react_1.default.createElement("h3", { className: "font-semibold text-yellow-900 mb-2" }, "How to Test Conflict Resolution:"),
                react_1.default.createElement("ol", { className: "text-yellow-800 text-sm space-y-1 list-decimal list-inside" },
                    react_1.default.createElement("li", null, "Open this page in two different browser tabs"),
                    react_1.default.createElement("li", null, "Make different changes to the play in each tab"),
                    react_1.default.createElement("li", null, "Save the changes in the first tab"),
                    react_1.default.createElement("li", null, "Try to save the changes in the second tab"),
                    react_1.default.createElement("li", null, "You should see a conflict error and the latest version will be loaded"))))));
};
exports.ConflictResolutionExample = ConflictResolutionExample;
