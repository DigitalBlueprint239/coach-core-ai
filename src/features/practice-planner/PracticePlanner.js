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
const defaultGoals = [
    { label: 'Game Prep', value: 'game_prep' },
    { label: 'Red Zone Offense', value: 'red_zone_offense' },
    { label: 'Skill Development', value: 'skill_dev' },
    { label: 'Conditioning', value: 'conditioning' },
];
const PracticePlanner = () => {
    const ai = (0, AIContext_1.useAI)();
    const { currentTeam } = (0, TeamContext_1.useTeam)();
    const [duration, setDuration] = (0, react_1.useState)(90);
    const [goals, setGoals] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [aiResult, setAIResult] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const [feedback, setFeedback] = (0, react_1.useState)(null);
    const handleGoalChange = (goal) => {
        setGoals((prev) => prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]);
    };
    const handleAIGenerate = () => __awaiter(void 0, void 0, void 0, function* () {
        setLoading(true);
        setError(null);
        setAIResult(null);
        setFeedback(null);
        try {
            const teamContext = currentTeam
                ? {
                    teamId: currentTeam.id,
                    teamName: currentTeam.name,
                    sport: currentTeam.sport || 'football',
                    ageGroup: currentTeam.level,
                }
                : { teamId: 'demo-team', teamName: 'Demo Team', sport: 'football', ageGroup: 'youth' };
            const result = yield ai.generatePracticePlan(teamContext, goals, duration);
            setAIResult(result);
        }
        catch (err) {
            setError('AI generation failed. Please try again.');
        }
        finally {
            setLoading(false);
        }
    });
    const handleFeedback = (type) => {
        setFeedback(type);
        ai.recordOutcome('practice_generated', type === 'helpful' ? 'success' : 'failure');
    };
    return (react_1.default.createElement("div", { className: "max-w-lg mx-auto p-4 bg-white rounded-lg shadow-md mt-6" },
        react_1.default.createElement("h2", { className: "text-2xl font-bold mb-4 text-center" }, "Practice Plan Generator (AI)"),
        react_1.default.createElement("div", { className: "mb-4" },
            react_1.default.createElement("label", { className: "block mb-1 font-medium" }, "Duration (minutes)"),
            react_1.default.createElement("input", { type: "number", min: 30, max: 180, value: duration, onChange: e => setDuration(Number(e.target.value)), className: "w-full px-3 py-2 border rounded focus:outline-none focus:ring" })),
        react_1.default.createElement("div", { className: "mb-4" },
            react_1.default.createElement("label", { className: "block mb-1 font-medium" }, "Goals"),
            react_1.default.createElement("div", { className: "flex flex-wrap gap-2" }, defaultGoals.map(goal => (react_1.default.createElement("button", { key: goal.value, type: "button", onClick: () => handleGoalChange(goal.value), className: `px-3 py-1 rounded-full border ${goals.includes(goal.value) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}` }, goal.label))))),
        react_1.default.createElement("button", { onClick: handleAIGenerate, disabled: loading || goals.length === 0, className: "w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition mb-4 disabled:opacity-50" }, loading ? 'Generating...' : 'Generate with AI'),
        error && react_1.default.createElement("div", { className: "text-red-500 text-sm mb-2" }, error),
        aiResult && (react_1.default.createElement("div", { className: "mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200" },
            react_1.default.createElement("h3", { className: "font-semibold text-lg mb-2" }, "AI-Generated Practice Plan"),
            react_1.default.createElement("div", { className: "mb-2" },
                react_1.default.createElement("span", { className: "font-medium" }, "Confidence:"),
                " ",
                react_1.default.createElement("span", { className: "text-blue-700" },
                    Math.round((aiResult.confidence || 0) * 100),
                    "%")),
            aiResult.insights && aiResult.insights.length > 0 && (react_1.default.createElement("div", { className: "mb-2" },
                react_1.default.createElement("span", { className: "font-medium" }, "Insights:"),
                react_1.default.createElement("ul", { className: "list-disc ml-6 text-sm text-blue-900" }, aiResult.insights.map((insight, i) => (react_1.default.createElement("li", { key: i }, insight)))))),
            aiResult.plan && aiResult.plan.periods && (react_1.default.createElement("div", { className: "mb-2" },
                react_1.default.createElement("span", { className: "font-medium" }, "Periods:"),
                react_1.default.createElement("ul", { className: "list-decimal ml-6 text-sm" }, aiResult.plan.periods.map((period, i) => (react_1.default.createElement("li", { key: i, className: "mb-1" },
                    react_1.default.createElement("span", { className: "font-semibold" }, period.name),
                    " - ",
                    period.duration,
                    " min, Intensity: ",
                    period.intensity,
                    period.drills && (react_1.default.createElement("ul", { className: "list-disc ml-6 text-xs text-gray-700" }, period.drills.map((drill, j) => (react_1.default.createElement("li", { key: j }, drill))))))))))),
            react_1.default.createElement("div", { className: "mt-3 flex items-center gap-3" },
                react_1.default.createElement("span", { className: "text-xs text-gray-500" }, "Was this helpful?"),
                react_1.default.createElement("button", { onClick: () => handleFeedback('helpful'), className: `p-1 rounded ${feedback === 'helpful' ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600'}`, disabled: !!feedback }, "\uD83D\uDC4D"),
                react_1.default.createElement("button", { onClick: () => handleFeedback('not_helpful'), className: `p-1 rounded ${feedback === 'not_helpful' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600'}`, disabled: !!feedback }, "\uD83D\uDC4E"),
                feedback && (react_1.default.createElement("span", { className: "text-xs ml-2 text-gray-600" }, "Thank you for your feedback!")))))));
};
exports.default = PracticePlanner;
