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
exports.PlayEditor = void 0;
const react_1 = __importStar(require("react"));
const firestore_1 = require("../../services/firestore");
const useAuth_1 = require("../../hooks/useAuth");
const PlayEditor = ({ teamId, playId, onSave, onCancel, onError }) => {
    const { user } = (0, useAuth_1.useAuth)();
    const [play, setPlay] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [formData, setFormData] = (0, react_1.useState)({
        name: '',
        formation: '',
        description: '',
        difficulty: 'beginner',
        tags: []
    });
    // Load the play data
    (0, react_1.useEffect)(() => {
        const loadPlay = () => __awaiter(void 0, void 0, void 0, function* () {
            if (!playId)
                return;
            setLoading(true);
            try {
                const plays = yield (0, firestore_1.getPlays)(teamId);
                const foundPlay = plays.find(p => p.id === playId);
                if (foundPlay) {
                    setPlay(foundPlay);
                    setFormData({
                        name: foundPlay.name,
                        formation: foundPlay.formation,
                        description: foundPlay.description,
                        difficulty: foundPlay.difficulty,
                        tags: foundPlay.tags || []
                    });
                }
                else {
                    setError('Play not found');
                }
            }
            catch (err) {
                setError('Failed to load play');
                console.error('Error loading play:', err);
            }
            finally {
                setLoading(false);
            }
        });
        loadPlay();
    }, [teamId, playId]);
    // Handle form changes
    const handleInputChange = (0, react_1.useCallback)((field, value) => {
        setFormData(prev => (Object.assign(Object.assign({}, prev), { [field]: value })));
    }, []);
    // Handle tag changes
    const handleTagChange = (0, react_1.useCallback)((tags) => {
        setFormData(prev => (Object.assign(Object.assign({}, prev), { tags })));
    }, []);
    // Save play with conflict resolution
    const handleSave = (0, react_1.useCallback)(() => __awaiter(void 0, void 0, void 0, function* () {
        if (!play || !user)
            return;
        setSaving(true);
        setError(null);
        try {
            // Prepare update data with current version
            const updateData = Object.assign(Object.assign({}, formData), { version: play.version // Include current version for conflict detection
             });
            // Use the improved updatePlay function with conflict resolution
            yield (0, firestore_1.updatePlay)(teamId, playId, updateData);
            // Update local state
            const updatedPlay = Object.assign(Object.assign(Object.assign({}, play), formData), { version: (play.version || 0) + 1 });
            setPlay(updatedPlay);
            onSave === null || onSave === void 0 ? void 0 : onSave(updatedPlay);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save play';
            setError(errorMessage);
            onError === null || onError === void 0 ? void 0 : onError(errorMessage);
            // If it's a conflict error, we might want to reload the play data
            if (errorMessage.includes('modified by another user')) {
                // Optionally reload the play to get the latest version
                const plays = yield (0, firestore_1.getPlays)(teamId);
                const latestPlay = plays.find(p => p.id === playId);
                if (latestPlay) {
                    setPlay(latestPlay);
                    setFormData({
                        name: latestPlay.name,
                        formation: latestPlay.formation,
                        description: latestPlay.description,
                        difficulty: latestPlay.difficulty,
                        tags: latestPlay.tags || []
                    });
                }
            }
        }
        finally {
            setSaving(false);
        }
    }), [play, user, formData, teamId, playId, onSave, onError]);
    if (loading) {
        return (react_1.default.createElement("div", { className: "flex items-center justify-center p-8" },
            react_1.default.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" }),
            react_1.default.createElement("span", { className: "ml-2" }, "Loading play...")));
    }
    if (!play) {
        return (react_1.default.createElement("div", { className: "p-8 text-center" },
            react_1.default.createElement("p", { className: "text-red-600" }, "Play not found"),
            react_1.default.createElement("button", { onClick: onCancel, className: "mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600" }, "Go Back")));
    }
    return (react_1.default.createElement("div", { className: "max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg" },
        react_1.default.createElement("div", { className: "mb-6" },
            react_1.default.createElement("h2", { className: "text-2xl font-bold text-gray-900 mb-2" }, "Edit Play"),
            react_1.default.createElement("p", { className: "text-sm text-gray-600" },
                "Version: ",
                play.version || 1,
                " | Last modified: ",
                play.lastModifiedAt ? new Date(play.lastModifiedAt.seconds * 1000).toLocaleString() : 'Unknown')),
        error && (react_1.default.createElement("div", { className: "mb-4 p-4 bg-red-50 border border-red-200 rounded-md" },
            react_1.default.createElement("div", { className: "flex" },
                react_1.default.createElement("div", { className: "flex-shrink-0" },
                    react_1.default.createElement("svg", { className: "h-5 w-5 text-red-400", viewBox: "0 0 20 20", fill: "currentColor" },
                        react_1.default.createElement("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z", clipRule: "evenodd" }))),
                react_1.default.createElement("div", { className: "ml-3" },
                    react_1.default.createElement("p", { className: "text-sm text-red-800" }, error))))),
        react_1.default.createElement("form", { onSubmit: (e) => { e.preventDefault(); handleSave(); } },
            react_1.default.createElement("div", { className: "space-y-6" },
                react_1.default.createElement("div", null,
                    react_1.default.createElement("label", { htmlFor: "name", className: "block text-sm font-medium text-gray-700 mb-2" }, "Play Name"),
                    react_1.default.createElement("input", { type: "text", id: "name", value: formData.name, onChange: (e) => handleInputChange('name', e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent", required: true })),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("label", { htmlFor: "formation", className: "block text-sm font-medium text-gray-700 mb-2" }, "Formation"),
                    react_1.default.createElement("input", { type: "text", id: "formation", value: formData.formation, onChange: (e) => handleInputChange('formation', e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "e.g., 4-3-3, 3-5-2" })),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("label", { htmlFor: "description", className: "block text-sm font-medium text-gray-700 mb-2" }, "Description"),
                    react_1.default.createElement("textarea", { id: "description", value: formData.description, onChange: (e) => handleInputChange('description', e.target.value), rows: 4, className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Describe the play strategy..." })),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("label", { htmlFor: "difficulty", className: "block text-sm font-medium text-gray-700 mb-2" }, "Difficulty Level"),
                    react_1.default.createElement("select", { id: "difficulty", value: formData.difficulty, onChange: (e) => handleInputChange('difficulty', e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" },
                        react_1.default.createElement("option", { value: "beginner" }, "Beginner"),
                        react_1.default.createElement("option", { value: "intermediate" }, "Intermediate"),
                        react_1.default.createElement("option", { value: "advanced" }, "Advanced"))),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("label", { htmlFor: "tags", className: "block text-sm font-medium text-gray-700 mb-2" }, "Tags (comma-separated)"),
                    react_1.default.createElement("input", { type: "text", id: "tags", value: formData.tags.join(', '), onChange: (e) => handleTagChange(e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "e.g., counter-attack, set-piece, pressing" }))),
            react_1.default.createElement("div", { className: "mt-8 flex justify-end space-x-4" },
                react_1.default.createElement("button", { type: "button", onClick: onCancel, className: "px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500", disabled: saving }, "Cancel"),
                react_1.default.createElement("button", { type: "submit", disabled: saving, className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" }, saving ? (react_1.default.createElement("div", { className: "flex items-center" },
                    react_1.default.createElement("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" }),
                    "Saving...")) : ('Save Changes'))))));
};
exports.PlayEditor = PlayEditor;
exports.default = exports.PlayEditor;
