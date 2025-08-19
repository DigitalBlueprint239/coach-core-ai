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
exports.ConflictResolutionDemo = void 0;
const react_1 = __importStar(require("react"));
const PlayEditor_1 = require("./PlayEditor");
const firestore_1 = require("../../services/firestore");
const ConflictResolutionDemo = ({ teamId }) => {
    const [plays, setPlays] = (0, react_1.useState)([]);
    const [selectedPlayId, setSelectedPlayId] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    // Load plays
    (0, react_1.useEffect)(() => {
        const loadPlays = () => __awaiter(void 0, void 0, void 0, function* () {
            setLoading(true);
            try {
                const playsData = yield (0, firestore_1.getPlays)(teamId);
                setPlays(playsData);
                if (playsData.length > 0 && !selectedPlayId) {
                    setSelectedPlayId(playsData[0].id || null);
                }
            }
            catch (error) {
                console.error('Error loading plays:', error);
            }
            finally {
                setLoading(false);
            }
        });
        loadPlays();
    }, [teamId, selectedPlayId]);
    const handlePlaySave = (updatedPlay) => {
        setPlays(prev => prev.map(play => play.id === updatedPlay.id ? updatedPlay : play));
        console.log('Play saved successfully:', updatedPlay);
    };
    const handlePlayError = (error) => {
        console.error('Play save error:', error);
    };
    if (loading) {
        return (react_1.default.createElement("div", { className: "flex items-center justify-center p-8" },
            react_1.default.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" }),
            react_1.default.createElement("span", { className: "ml-2" }, "Loading plays...")));
    }
    return (react_1.default.createElement("div", { className: "max-w-6xl mx-auto p-6" },
        react_1.default.createElement("div", { className: "mb-8" },
            react_1.default.createElement("h1", { className: "text-3xl font-bold text-gray-900 mb-4" }, "Play Editor - Conflict Resolution Demo"),
            react_1.default.createElement("p", { className: "text-gray-600 mb-6" }, "This demo shows how the PlayEditor handles concurrent edits with optimistic locking. Try opening this page in multiple browser tabs and editing the same play simultaneously."),
            react_1.default.createElement("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6" },
                react_1.default.createElement("h3", { className: "font-semibold text-blue-900 mb-2" }, "How Conflict Resolution Works:"),
                react_1.default.createElement("ul", { className: "text-blue-800 text-sm space-y-1" },
                    react_1.default.createElement("li", null, "\u2022 Each play has a version number that increments with each edit"),
                    react_1.default.createElement("li", null, "\u2022 When saving, the editor checks if the version matches the server version"),
                    react_1.default.createElement("li", null, "\u2022 If versions don't match, it means another user has modified the play"),
                    react_1.default.createElement("li", null, "\u2022 The system prevents overwriting changes and shows a conflict error"),
                    react_1.default.createElement("li", null, "\u2022 The editor automatically reloads the latest version when conflicts occur")))),
        react_1.default.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6" },
            react_1.default.createElement("div", { className: "lg:col-span-1" },
                react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
                    react_1.default.createElement("h2", { className: "text-xl font-semibold text-gray-900 mb-4" }, "Select a Play"),
                    plays.length === 0 ? (react_1.default.createElement("p", { className: "text-gray-500 text-center py-8" }, "No plays available")) : (react_1.default.createElement("div", { className: "space-y-2" }, plays.map((play) => (react_1.default.createElement("button", { key: play.id, onClick: () => setSelectedPlayId(play.id || null), className: `w-full text-left p-3 rounded-md border transition-colors ${selectedPlayId === play.id
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}` },
                        react_1.default.createElement("div", { className: "font-medium" }, play.name),
                        react_1.default.createElement("div", { className: "text-sm text-gray-600" },
                            "Version: ",
                            play.version || 1,
                            " |",
                            play.lastModifiedAt ?
                                ` Modified: ${new Date(play.lastModifiedAt.seconds * 1000).toLocaleString()}` :
                                ' Never modified')))))))),
            react_1.default.createElement("div", { className: "lg:col-span-2" }, selectedPlayId ? (react_1.default.createElement(PlayEditor_1.PlayEditor, { teamId: teamId, playId: selectedPlayId, onSave: handlePlaySave, onCancel: () => setSelectedPlayId(null), onError: handlePlayError })) : (react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-8 text-center" },
                react_1.default.createElement("div", { className: "text-gray-400 mb-4" },
                    react_1.default.createElement("svg", { className: "mx-auto h-12 w-12", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                        react_1.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }))),
                react_1.default.createElement("h3", { className: "text-lg font-medium text-gray-900 mb-2" }, "No Play Selected"),
                react_1.default.createElement("p", { className: "text-gray-500" }, "Select a play from the list to start editing"))))),
        react_1.default.createElement("div", { className: "mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4" },
            react_1.default.createElement("h3", { className: "font-semibold text-yellow-900 mb-2" }, "Testing Instructions:"),
            react_1.default.createElement("ol", { className: "text-yellow-800 text-sm space-y-1" },
                react_1.default.createElement("li", null, "1. Open this page in two different browser tabs/windows"),
                react_1.default.createElement("li", null, "2. Select the same play in both tabs"),
                react_1.default.createElement("li", null, "3. Make different changes in each tab"),
                react_1.default.createElement("li", null, "4. Save the changes in one tab first"),
                react_1.default.createElement("li", null, "5. Try to save in the second tab - you should see a conflict error"),
                react_1.default.createElement("li", null, "6. The second tab will automatically reload the latest version")))));
};
exports.ConflictResolutionDemo = ConflictResolutionDemo;
exports.default = exports.ConflictResolutionDemo;
