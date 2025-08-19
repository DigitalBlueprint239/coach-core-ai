"use strict";
/**
 * AI Assistant Component
 *
 * Main chat interface for AI-powered coaching assistance.
 * Handles real-time suggestions, practice plan generation, and coaching guidance.
 */
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
const AIAssistant = ({ teamProfile, onSuggestionApply, onPlanGenerate, className = '' }) => {
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [inputValue, setInputValue] = (0, react_1.useState)('');
    const [isTyping, setIsTyping] = (0, react_1.useState)(false);
    const messagesEndRef = (0, react_1.useRef)(null);
    // Auto-scroll to bottom when new messages arrive
    (0, react_1.useEffect)(() => {
        var _a;
        (_a = messagesEndRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    // Initialize with welcome message
    (0, react_1.useEffect)(() => {
        setMessages([{
                id: 'welcome',
                type: 'ai',
                content: `Hello! I'm your AI coaching assistant. I can help you create practice plans, analyze team performance, and provide personalized coaching advice. What would you like to work on today?`,
                timestamp: new Date(),
                suggestions: [
                    {
                        id: 'create-plan',
                        type: 'drill_selection',
                        title: 'Create Practice Plan',
                        description: 'Generate a new practice plan based on your team\'s needs',
                        confidence: 0.9,
                        reasoning: 'Based on your team profile and recent performance',
                        implementation: ['Set practice goals', 'Select drills', 'Optimize schedule'],
                        estimatedImpact: 'significant',
                        prerequisites: []
                    },
                    {
                        id: 'analyze-performance',
                        type: 'team_strategy',
                        title: 'Analyze Team Performance',
                        description: 'Get insights into your team\'s strengths and areas for improvement',
                        confidence: 0.85,
                        reasoning: 'Using recent game and practice data',
                        implementation: ['Review metrics', 'Identify patterns', 'Suggest improvements'],
                        estimatedImpact: 'moderate',
                        prerequisites: []
                    }
                ]
            }]);
    }, []);
    const handleSendMessage = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!inputValue.trim())
            return;
        const userMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: inputValue,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);
        // Simulate AI response
        setTimeout(() => {
            const aiResponse = generateAIResponse(inputValue, teamProfile);
            setMessages(prev => [...prev, aiResponse]);
            setIsTyping(false);
        }, 1500);
    });
    const generateAIResponse = (userInput, teamProfile) => {
        const lowerInput = userInput.toLowerCase();
        if (lowerInput.includes('practice plan') || lowerInput.includes('create plan')) {
            return {
                id: Date.now().toString(),
                type: 'ai',
                content: `I'd be happy to help you create a practice plan! Based on your ${teamProfile.sport} team's profile, I can suggest drills and optimize your practice schedule. What specific areas would you like to focus on?`,
                timestamp: new Date(),
                suggestions: [
                    {
                        id: 'focus-skills',
                        type: 'skill_development',
                        title: 'Focus on Skill Development',
                        description: 'Create a plan focused on improving specific skills',
                        confidence: 0.88,
                        reasoning: 'Team analysis shows skill gaps that can be addressed',
                        implementation: ['Identify key skills', 'Select targeted drills', 'Progressive difficulty'],
                        estimatedImpact: 'significant',
                        prerequisites: ['Skill assessment']
                    },
                    {
                        id: 'team-strategy',
                        type: 'team_strategy',
                        title: 'Team Strategy Practice',
                        description: 'Focus on team coordination and game strategies',
                        confidence: 0.82,
                        reasoning: 'Recent games show opportunities for strategic improvement',
                        implementation: ['Team drills', 'Game scenarios', 'Communication exercises'],
                        estimatedImpact: 'moderate',
                        prerequisites: ['Team assessment']
                    }
                ]
            };
        }
        if (lowerInput.includes('performance') || lowerInput.includes('analyze')) {
            return {
                id: Date.now().toString(),
                type: 'ai',
                content: `Let me analyze your team's performance. Based on recent data, your team shows ${teamProfile.strengths.length} key strengths and ${teamProfile.weaknesses.length} areas for improvement. Would you like me to dive deeper into any specific aspect?`,
                timestamp: new Date(),
                suggestions: [
                    {
                        id: 'strength-analysis',
                        type: 'team_strategy',
                        title: 'Analyze Strengths',
                        description: 'Detailed analysis of team strengths and how to leverage them',
                        confidence: 0.85,
                        reasoning: 'Comprehensive data available on team performance',
                        implementation: ['Review game footage', 'Analyze statistics', 'Identify patterns'],
                        estimatedImpact: 'moderate',
                        prerequisites: ['Performance data']
                    }
                ]
            };
        }
        // Default response
        return {
            id: Date.now().toString(),
            type: 'ai',
            content: `I understand you're asking about "${userInput}". I can help you with practice planning, performance analysis, drill selection, and more. Could you be more specific about what you'd like to accomplish?`,
            timestamp: new Date()
        };
    };
    const handleSuggestionClick = (suggestion) => {
        onSuggestionApply(suggestion);
        // Add follow-up message
        const followUpMessage = {
            id: Date.now().toString(),
            type: 'ai',
            content: `Great choice! I've applied the "${suggestion.title}" suggestion. ${suggestion.description}`,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, followUpMessage]);
    };
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };
    return (react_1.default.createElement("div", { className: `flex flex-col h-full bg-white rounded-lg shadow-lg ${className}` },
        react_1.default.createElement("div", { className: "flex items-center justify-between p-4 border-b border-gray-200" },
            react_1.default.createElement("div", { className: "flex items-center space-x-3" },
                react_1.default.createElement("div", { className: "w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center" },
                    react_1.default.createElement("span", { className: "text-white text-lg" }, "\uD83E\uDD16")),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("h3", { className: "font-semibold text-gray-800" }, "AI Coaching Assistant"),
                    react_1.default.createElement("p", { className: "text-sm text-gray-500" }, "Powered by advanced AI"))),
            react_1.default.createElement("div", { className: "flex items-center space-x-2" },
                react_1.default.createElement("div", { className: `w-2 h-2 rounded-full ${isTyping ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}` }),
                react_1.default.createElement("span", { className: "text-xs text-gray-500" }, isTyping ? 'Typing...' : 'Online'))),
        react_1.default.createElement("div", { className: "flex-1 overflow-y-auto p-4 space-y-4" },
            messages.map((message) => (react_1.default.createElement("div", { key: message.id, className: `flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}` },
                react_1.default.createElement("div", { className: `max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'}` },
                    react_1.default.createElement("p", { className: "text-sm" }, message.content),
                    react_1.default.createElement("p", { className: "text-xs opacity-70 mt-1" }, message.timestamp.toLocaleTimeString()))))),
            messages.length > 0 && messages[messages.length - 1].type === 'ai' &&
                messages[messages.length - 1].suggestions && (react_1.default.createElement("div", { className: "space-y-2" }, messages[messages.length - 1].suggestions.map((suggestion) => (react_1.default.createElement("button", { key: suggestion.id, onClick: () => handleSuggestionClick(suggestion), className: "w-full text-left p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors" },
                react_1.default.createElement("div", { className: "font-medium text-blue-800" }, suggestion.title),
                react_1.default.createElement("div", { className: "text-sm text-blue-600" }, suggestion.description),
                react_1.default.createElement("div", { className: "text-xs text-blue-500 mt-1" },
                    "Confidence: ",
                    Math.round(suggestion.confidence * 100),
                    "%")))))),
            react_1.default.createElement("div", { ref: messagesEndRef })),
        react_1.default.createElement("div", { className: "p-4 border-t border-gray-200" },
            react_1.default.createElement("div", { className: "flex space-x-2" },
                react_1.default.createElement("textarea", { value: inputValue, onChange: (e) => setInputValue(e.target.value), onKeyPress: handleKeyPress, placeholder: "Ask me about practice planning, team analysis, or coaching advice...", className: "flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none", rows: 2, disabled: isTyping }),
                react_1.default.createElement("button", { onClick: handleSendMessage, disabled: !inputValue.trim() || isTyping, className: "px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors" }, "Send")))));
};
exports.default = AIAssistant;
