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
exports.AIBrainSetup = exports.AIBrainService = void 0;
const react_1 = __importStar(require("react"));
const react_2 = require("@chakra-ui/react");
// Mock AI Service
class AIBrainService {
    constructor(config = {}) {
        this.config = config;
    }
    generateResponse(prompt) {
        return __awaiter(this, void 0, void 0, function* () {
            // Simulate API delay
            yield new Promise(resolve => setTimeout(resolve, 1000));
            return {
                content: `Mock AI response to: "${prompt}". This is a placeholder response during recovery.`,
                confidence: 0.8,
                suggestions: [
                    "Try a different approach",
                    "Consider player safety",
                    "Review team formation"
                ]
            };
        });
    }
    generatePracticePlan(teamContext) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise(resolve => setTimeout(resolve, 1500));
            return {
                title: "Mock Practice Plan",
                duration: 90,
                activities: [
                    { name: "Warm-up", duration: 15, type: "conditioning" },
                    { name: "Skill Drills", duration: 30, type: "skills" },
                    { name: "Scrimmage", duration: 30, type: "game" },
                    { name: "Cool-down", duration: 15, type: "conditioning" }
                ]
            };
        });
    }
}
exports.AIBrainService = AIBrainService;
// AI Brain Component
const AIBrainSetup = () => {
    const [prompt, setPrompt] = (0, react_1.useState)('');
    const [response, setResponse] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const aiService = react_1.default.useMemo(() => new AIBrainService(), []);
    const handleSubmit = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!prompt.trim())
            return;
        setLoading(true);
        try {
            const result = yield aiService.generateResponse(prompt);
            setResponse(result);
        }
        catch (error) {
            console.error('AI request failed:', error);
        }
        finally {
            setLoading(false);
        }
    });
    return (react_1.default.createElement(react_2.Box, { p: 4 },
        react_1.default.createElement(react_2.Box, { bg: "yellow.50", border: "1px solid #f6e05e", color: "yellow.800", borderRadius: "md", p: 4, mb: 4 }, "\u26A0\uFE0F AI Brain is in recovery mode - using mock responses"),
        react_1.default.createElement(react_2.Text, { fontSize: "lg", fontWeight: "bold" }, "AI Coaching Assistant"),
        react_1.default.createElement(react_2.Input, { placeholder: "Ask a coaching question...", value: prompt, onChange: (e) => setPrompt(e.target.value), onKeyPress: (e) => e.key === 'Enter' && handleSubmit() }),
        react_1.default.createElement(react_2.Button, { colorScheme: "blue", onClick: handleSubmit, isLoading: loading, loadingText: "Thinking..." }, "Ask AI Coach"),
        response && (react_1.default.createElement(react_2.Box, { bg: "gray.50", p: 4, borderRadius: "md" },
            react_1.default.createElement(react_2.Text, { fontWeight: "bold", mb: 2 }, "AI Response:"),
            react_1.default.createElement(react_2.Text, null, response.content),
            response.suggestions && (react_1.default.createElement(react_2.VStack, { mt: 3, align: "start" },
                react_1.default.createElement(react_2.Text, { fontWeight: "bold", fontSize: "sm" }, "Suggestions:"),
                response.suggestions.map((suggestion, index) => (react_1.default.createElement(react_2.Text, { key: index, fontSize: "sm", color: "gray.600" },
                    "\u2022 ",
                    suggestion)))))))));
};
exports.AIBrainSetup = AIBrainSetup;
exports.default = exports.AIBrainSetup;
