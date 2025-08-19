"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIBrainIntegrationDemo = exports.AIInsightCard = void 0;
const react_1 = __importDefault(require("react"));
// Minimal stubs for referenced components
const Sparkles = (props) => react_1.default.createElement("span", Object.assign({}, props), "\u2728");
const ConfidenceBadge = ({ confidence }) => react_1.default.createElement("span", null,
    Math.round((confidence !== null && confidence !== void 0 ? confidence : 0) * 100),
    "%");
const ChevronDown = (props) => react_1.default.createElement("span", Object.assign({}, props), "\u25BC");
const ThumbsUp = (props) => react_1.default.createElement("span", Object.assign({}, props), "\uD83D\uDC4D");
const ThumbsDown = (props) => react_1.default.createElement("span", Object.assign({}, props), "\uD83D\uDC4E");
const AIInsightCard = ({ insight }) => (react_1.default.createElement("div", { className: "bg-white border rounded p-4" },
    react_1.default.createElement("div", { className: "flex items-center" },
        react_1.default.createElement(Sparkles, null),
        react_1.default.createElement("span", null, insight.message),
        react_1.default.createElement(ConfidenceBadge, { confidence: insight.confidence }))));
exports.AIInsightCard = AIInsightCard;
const AIBrainIntegrationDemo = () => (react_1.default.createElement("div", { className: "p-4" },
    react_1.default.createElement("h2", null, "Coach Core AI Brain - Demo"),
    react_1.default.createElement("button", null, "Generate Smart Practice")));
exports.AIBrainIntegrationDemo = AIBrainIntegrationDemo;
exports.default = exports.AIInsightCard;
