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
const react_1 = __importStar(require("react"));
const AIContext_1 = require("../../ai-brain/AIContext");
const TeamContext_1 = require("../../contexts/TeamContext");
const PlayAISuggestion = ({ playContext }) => {
    const ai = (0, AIContext_1.useAI)();
    const { currentTeam } = (0, TeamContext_1.useTeam)();
    const teamContext = currentTeam
        ? {
            teamId: currentTeam.id,
            teamName: currentTeam.name,
            sport: currentTeam.sport || 'football', // fallback
            ageGroup: currentTeam.level, // fallback
        }
        : null;
    const [suggestion, setSuggestion] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const handleGetSuggestion = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!teamContext) {
            setError('No team context available.');
            return;
        }
        setLoading(true);
        setError(null);
        setSuggestion(null);
        try {
            const result = yield ai.generatePlaySuggestion(playContext, teamContext);
            setSuggestion(result);
        }
        catch (err) {
            setError('Failed to get AI suggestion.');
        }
        finally {
            setLoading(false);
        }
    });
    return (react_1.default.createElement("div", { className: "my-4 p-4 bg-purple-50 rounded-lg shadow" },
        react_1.default.createElement("button", { onClick: handleGetSuggestion, className: "px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700", disabled: loading }, loading ? 'Analyzing...' : 'Get AI Suggestion'),
        error && react_1.default.createElement("div", { className: "text-red-500 text-sm mt-2" }, error),
        suggestion && (react_1.default.createElement("div", { className: "mt-3" },
            react_1.default.createElement("div", { className: "font-semibold text-lg text-purple-800" },
                "Suggestion: ",
                suggestion.suggestion),
            react_1.default.createElement("div", { className: "text-sm text-gray-700" },
                "Confidence: ",
                (suggestion.confidence * 100).toFixed(0),
                "%",
                react_1.default.createElement("br", null),
                "Urgency: ",
                suggestion.urgency,
                react_1.default.createElement("br", null),
                "Reasoning:",
                react_1.default.createElement("ul", { className: "list-disc ml-6" }, suggestion.reasoning.map((r, i) => (react_1.default.createElement("li", { key: i }, r)))))))));
};
exports.default = PlayAISuggestion;
