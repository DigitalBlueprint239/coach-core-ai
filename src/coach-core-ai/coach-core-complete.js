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
const lucide_react_1 = require("lucide-react");
const AppContext = (0, react_1.createContext)(null);
const useAppContext = () => {
    const context = (0, react_1.useContext)(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within AppProvider');
    }
    return context;
};
const AppProvider = ({ children }) => {
    const [user, setUser] = (0, react_1.useState)({
        id: 'demo-user',
        email: 'coach@demo.com',
        role: 'head_coach',
        teamId: 'demo-team',
        persona: 'experienced_coach',
        preferences: {
            notifications: {
                email: true,
                sms: false,
                push: true,
                inApp: true
            },
            ai: {
                autoSuggest: false,
                onDemandOnly: true,
                confidenceThreshold: 0.7
            },
            privacy: {
                sharePlays: false,
                allowAnalytics: true
            }
        }
    });
    const [team, setTeam] = (0, react_1.useState)({
        id: 'demo-team',
        name: 'Demo Wildcats',
        sport: 'football',
        ageGroup: 'high_school',
        season: '2025',
        players: 22,
        coaches: 3,
        subscription: 'pro'
    });
    const [notifications, setNotifications] = (0, react_1.useState)([]);
    const [offline, setOffline] = (0, react_1.useState)(false);
    return (react_1.default.createElement(AppContext.Provider, { value: {
            user, setUser,
            team, setTeam,
            notifications, setNotifications,
            offline, setOffline
        } }, children));
};
const PersonaPicker = ({ onPersonaSelect }) => {
    const personas = [
        {
            id: 'first_time_coach',
            title: 'First-Time Coach',
            description: 'New to coaching, need guidance on basics',
            icon: lucide_react_1.HelpCircle,
            color: 'blue',
            features: ['Step-by-step tutorials', 'Basic templates', 'Safety guidelines']
        },
        {
            id: 'experienced_coach',
            title: 'Experienced Coach',
            description: 'Seasoned coach looking for advanced tools',
            icon: lucide_react_1.Award,
            color: 'green',
            features: ['Advanced analytics', 'Custom plays', 'AI suggestions']
        },
        {
            id: 'parent_volunteer',
            title: 'Parent Volunteer',
            description: 'Helping out with simple coaching tasks',
            icon: lucide_react_1.Heart,
            color: 'purple',
            features: ['Simple drills', 'Attendance tracking', 'Safety focus']
        },
        {
            id: 'athletic_director',
            title: 'Athletic Director',
            description: 'Managing multiple teams and coaches',
            icon: lucide_react_1.Monitor,
            color: 'orange',
            features: ['Multi-team dashboard', 'Coach oversight', 'Compliance tracking']
        }
    ];
    const colorClasses = {
        blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-900',
        green: 'bg-green-50 border-green-200 hover:bg-green-100 text-green-900',
        purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-900',
        orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-900'
    };
    return (react_1.default.createElement("div", { className: "max-w-4xl mx-auto p-6" },
        react_1.default.createElement("div", { className: "text-center mb-8" },
            react_1.default.createElement("h1", { className: "text-3xl font-bold text-gray-900 mb-4" }, "Welcome to Coach Core AI"),
            react_1.default.createElement("p", { className: "text-lg text-gray-600" }, "Let's personalize your experience. What describes you best?")),
        react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6" }, personas.map(persona => {
            const Icon = persona.icon;
            return (react_1.default.createElement("button", { key: persona.id, onClick: () => onPersonaSelect(persona.id), className: `p-6 rounded-lg border-2 transition-all text-left ${colorClasses[persona.color]}` },
                react_1.default.createElement("div", { className: "flex items-center gap-3 mb-4" },
                    react_1.default.createElement(Icon, { size: 24 }),
                    react_1.default.createElement("h3", { className: "text-xl font-semibold" }, persona.title)),
                react_1.default.createElement("p", { className: "text-sm mb-4 opacity-80" }, persona.description),
                react_1.default.createElement("ul", { className: "space-y-2" }, persona.features.map((feature, i) => (react_1.default.createElement("li", { key: i, className: "text-sm flex items-center gap-2" },
                    react_1.default.createElement(lucide_react_1.Check, { size: 14 }),
                    feature))))));
        }))));
};
// ============================================
// VISUAL TEMPLATE GALLERY
// ============================================
const TemplateGallery = ({ sport = 'football', onSelectTemplate, onStartFromScratch }) => {
    const [viewMode, setViewMode] = (0, react_1.useState)('grid');
    const [category, setCategory] = (0, react_1.useState)('all');
    const templates = [
        {
            id: 'shotgun_spread',
            name: 'Shotgun Spread',
            category: 'offense',
            preview: '🏈 QB in shotgun, 4 WR spread formation',
            description: 'Versatile passing formation with multiple route options',
            complexity: 'intermediate',
            successRate: 72,
            usage: 'High school and above',
            players: 11,
            thumbnail: '/api/placeholder/200/150'
        },
        {
            id: 'i_formation',
            name: 'I-Formation',
            category: 'offense',
            preview: '🏈 Traditional I-Form with FB and RB',
            description: 'Classic power running formation',
            complexity: 'beginner',
            successRate: 68,
            usage: 'All levels',
            players: 11,
            thumbnail: '/api/placeholder/200/150'
        },
        {
            id: '4_3_defense',
            name: '4-3 Defense',
            category: 'defense',
            preview: '🛡️ 4 linemen, 3 linebackers formation',
            description: 'Balanced defensive formation',
            complexity: 'intermediate',
            successRate: 65,
            usage: 'High school and above',
            players: 11,
            thumbnail: '/api/placeholder/200/150'
        },
        {
            id: '3_4_defense',
            name: '3-4 Defense',
            category: 'defense',
            preview: '🛡️ 3 linemen, 4 linebackers formation',
            description: 'Flexible pass rush defense',
            complexity: 'advanced',
            successRate: 70,
            usage: 'Advanced teams only',
            players: 11,
            thumbnail: '/api/placeholder/200/150'
        }
    ];
    const filteredTemplates = category === 'all'
        ? templates
        : templates.filter(t => t.category === category);
    return (react_1.default.createElement("div", { className: "max-w-6xl mx-auto p-6" },
        react_1.default.createElement("div", { className: "flex items-center justify-between mb-6" },
            react_1.default.createElement("div", null,
                react_1.default.createElement("h2", { className: "text-2xl font-bold text-gray-900" }, "Choose Your Starting Point"),
                react_1.default.createElement("p", { className: "text-gray-600" }, "Start with a proven template or build from scratch")),
            react_1.default.createElement("div", { className: "flex items-center gap-4" },
                react_1.default.createElement("button", { onClick: onStartFromScratch, className: "px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2" },
                    react_1.default.createElement(lucide_react_1.PlusCircle, { size: 16 }),
                    "Start from Scratch"),
                react_1.default.createElement("div", { className: "flex items-center gap-2" },
                    react_1.default.createElement("button", { onClick: () => setViewMode('grid'), className: `p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}` },
                        react_1.default.createElement(lucide_react_1.Grid, { size: 16 })),
                    react_1.default.createElement("button", { onClick: () => setViewMode('list'), className: `p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}` },
                        react_1.default.createElement(lucide_react_1.List, { size: 16 }))))),
        react_1.default.createElement("div", { className: "flex gap-4 mb-6" }, ['all', 'offense', 'defense', 'special'].map(cat => (react_1.default.createElement("button", { key: cat, onClick: () => setCategory(cat), className: `px-4 py-2 rounded-lg capitalize transition-colors ${category === cat
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}` }, cat)))),
        viewMode === 'grid' ? (react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" }, filteredTemplates.map(template => (react_1.default.createElement(TemplateCard, { key: template.id, template: template, onSelect: () => onSelectTemplate(template) }))))) : (react_1.default.createElement("div", { className: "space-y-4" }, filteredTemplates.map(template => (react_1.default.createElement(TemplateListItem, { key: template.id, template: template, onSelect: () => onSelectTemplate(template) })))))));
};
const TemplateCard = ({ template, onSelect }) => {
    const complexityColors = {
        beginner: 'text-green-600 bg-green-50',
        intermediate: 'text-yellow-600 bg-yellow-50',
        advanced: 'text-red-600 bg-red-50'
    };
    return (react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow" },
        react_1.default.createElement("div", { className: "aspect-video bg-gray-100 flex items-center justify-center" },
            react_1.default.createElement("div", { className: "text-4xl" }, template.preview)),
        react_1.default.createElement("div", { className: "p-4" },
            react_1.default.createElement("div", { className: "flex items-start justify-between mb-2" },
                react_1.default.createElement("h3", { className: "font-semibold text-gray-900" }, template.name),
                react_1.default.createElement("span", { className: `px-2 py-1 text-xs rounded-full ${complexityColors[template.complexity]}` }, template.complexity)),
            react_1.default.createElement("p", { className: "text-sm text-gray-600 mb-3" }, template.description),
            react_1.default.createElement("div", { className: "flex items-center justify-between text-sm text-gray-500 mb-4" },
                react_1.default.createElement("span", null,
                    template.players,
                    " players"),
                react_1.default.createElement("span", null,
                    template.successRate,
                    "% success rate")),
            react_1.default.createElement("button", { onClick: onSelect, className: "w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" }, "Use This Template"))));
};
const TemplateListItem = ({ template, onSelect }) => (react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between hover:shadow-md transition-shadow" },
    react_1.default.createElement("div", { className: "flex items-center gap-4" },
        react_1.default.createElement("div", { className: "w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl" }, template.preview),
        react_1.default.createElement("div", null,
            react_1.default.createElement("h3", { className: "font-semibold text-gray-900" }, template.name),
            react_1.default.createElement("p", { className: "text-sm text-gray-600" }, template.description),
            react_1.default.createElement("div", { className: "flex items-center gap-4 text-xs text-gray-500 mt-1" },
                react_1.default.createElement("span", null,
                    template.players,
                    " players"),
                react_1.default.createElement("span", null,
                    template.successRate,
                    "% success rate"),
                react_1.default.createElement("span", { className: "capitalize" }, template.complexity)))),
    react_1.default.createElement("button", { onClick: onSelect, className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" }, "Select")));
// ============================================
// AI SUGGESTION SYSTEM WITH SAFETY GUARDRAILS
// ============================================
const AISuggestionPanel = ({ teamContext, gameContext, onApplySuggestion }) => {
    const [suggestion, setSuggestion] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [feedback, setFeedback] = (0, react_1.useState)(null);
    const [safetyWarnings, setSafetyWarnings] = (0, react_1.useState)([]);
    const SAFETY_RULES = {
        youth: {
            maxContactDrills: 2,
            prohibitedPlays: ['full_contact_tackling', 'oklahoma_drill'],
            maxPracticeIntensity: 0.7,
            requiredBreaks: 10 // minutes per hour
        },
        high_school: {
            maxContactDrills: 4,
            prohibitedPlays: ['spear_tackle'],
            maxPracticeIntensity: 0.9,
            requiredBreaks: 5
        }
    };
    const generateSuggestion = () => __awaiter(void 0, void 0, void 0, function* () {
        setLoading(true);
        setSafetyWarnings([]);
        try {
            // Simulate AI processing
            yield new Promise(resolve => setTimeout(resolve, 2000));
            const mockSuggestion = {
                id: `ai_${Date.now()}`,
                type: 'play_suggestion',
                title: 'Quick Slant Right',
                description: 'Based on opponent tendencies, this play has 78% success probability',
                reasoning: [
                    'Opponent shows weak right side coverage in film study',
                    'Your WR #81 has 85% completion rate on slant routes',
                    'Quick release counters their average 3.2s pass rush'
                ],
                confidence: 0.82,
                formation: 'shotgun',
                players: [
                    { id: 1, position: 'QB', x: 300, y: 200, number: 12 },
                    { id: 2, position: 'WR', x: 450, y: 150, number: 81 },
                    { id: 3, position: 'RB', x: 250, y: 230, number: 23 }
                ],
                routes: [
                    {
                        playerId: 2,
                        points: [{ x: 450, y: 150 }, { x: 480, y: 130 }, { x: 510, y: 110 }],
                        type: 'slant',
                        color: '#3b82f6'
                    }
                ],
                alternatives: [
                    { name: 'Screen Pass Left', confidence: 0.74 },
                    { name: 'Draw Play', confidence: 0.68 }
                ],
                metadata: {
                    situational: 'Works best on 1st and 2nd down',
                    personnel: 'Requires skilled slot receiver',
                    risk: 'Low risk, high reward'
                }
            };
            // Check safety rules
            const warnings = validateSafety(mockSuggestion, SAFETY_RULES[teamContext.ageGroup]);
            setSafetyWarnings(warnings);
            setSuggestion(mockSuggestion);
        }
        catch (error) {
            console.error('AI suggestion failed:', error);
        }
        finally {
            setLoading(false);
        }
    });
    const validateSafety = (suggestion, rules) => {
        const warnings = [];
        if (rules.prohibitedPlays.some(play => suggestion.title.toLowerCase().includes(play))) {
            warnings.push({
                type: 'prohibited',
                severity: 'high',
                message: `This play type is not recommended for ${teamContext.ageGroup} level`
            });
        }
        return warnings;
    };
    const handleFeedback = (type) => {
        setFeedback(type);
        // Track feedback for AI learning
        console.log('AI Feedback:', { suggestionId: suggestion.id, feedback: type });
    };
    const handleApply = () => {
        if (safetyWarnings.some(w => w.severity === 'high')) {
            alert('Cannot apply play due to safety concerns');
            return;
        }
        onApplySuggestion(suggestion);
    };
    return (react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm p-6" },
        react_1.default.createElement("div", { className: "flex items-center justify-between mb-4" },
            react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900 flex items-center gap-2" },
                react_1.default.createElement(lucide_react_1.Brain, { className: "text-purple-600" }),
                "AI Play Assistant"),
            react_1.default.createElement("div", { className: "flex items-center gap-2" }, suggestion && (react_1.default.createElement("span", { className: "text-sm text-gray-500" },
                "Confidence: ",
                (suggestion.confidence * 100).toFixed(0),
                "%")))),
        !suggestion ? (react_1.default.createElement("div", { className: "text-center py-8" },
            react_1.default.createElement("button", { onClick: generateSuggestion, disabled: loading, className: "px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-2 mx-auto" }, loading ? (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement("div", { className: "animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" }),
                "Analyzing...")) : (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement(lucide_react_1.Sparkles, { size: 16 }),
                "Suggest a Play"))),
            react_1.default.createElement("p", { className: "text-sm text-gray-500 mt-2" }, "AI will analyze your team's strengths and game situation"))) : (react_1.default.createElement("div", { className: "space-y-4" },
            safetyWarnings.length > 0 && (react_1.default.createElement("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-3" },
                react_1.default.createElement("div", { className: "flex items-start gap-2" },
                    react_1.default.createElement(lucide_react_1.AlertTriangle, { className: "text-yellow-600 flex-shrink-0 mt-0.5", size: 16 }),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("p", { className: "text-sm font-medium text-yellow-800" }, "Safety Advisory"),
                        react_1.default.createElement("ul", { className: "text-xs text-yellow-700 mt-1 space-y-1" }, safetyWarnings.map((warning, i) => (react_1.default.createElement("li", { key: i },
                            "\u2022 ",
                            warning.message)))))))),
            react_1.default.createElement("div", { className: "bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4" },
                react_1.default.createElement("div", { className: "flex items-center justify-between mb-3" },
                    react_1.default.createElement("h4", { className: "font-semibold text-purple-900" }, suggestion.title),
                    react_1.default.createElement("div", { className: "flex items-center gap-1" }, [1, 2, 3, 4, 5].map(i => (react_1.default.createElement(lucide_react_1.Star, { key: i, size: 14, className: `${i <= suggestion.confidence * 5
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'}` }))))),
                react_1.default.createElement("p", { className: "text-sm text-purple-700 mb-3" }, suggestion.description),
                react_1.default.createElement("div", { className: "bg-white rounded-lg p-3 mb-3" },
                    react_1.default.createElement("div", { className: "aspect-video bg-green-100 rounded flex items-center justify-center" },
                        react_1.default.createElement("p", { className: "text-sm text-green-700" }, "Play diagram would render here"))),
                react_1.default.createElement("div", { className: "mb-3" },
                    react_1.default.createElement("p", { className: "text-xs font-medium text-purple-700 mb-1" }, "Why this play?"),
                    react_1.default.createElement("ul", { className: "space-y-1" }, suggestion.reasoning.map((reason, i) => (react_1.default.createElement("li", { key: i, className: "text-xs text-purple-600 flex items-start gap-1" },
                        react_1.default.createElement("span", { className: "text-purple-400 mt-0.5" }, "\u2022"),
                        reason))))),
                react_1.default.createElement("div", { className: "bg-white/60 rounded p-2 mb-3 text-xs" },
                    react_1.default.createElement("div", { className: "grid grid-cols-1 gap-1" },
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("strong", null, "Best for:"),
                            " ",
                            suggestion.metadata.situational),
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("strong", null, "Personnel:"),
                            " ",
                            suggestion.metadata.personnel),
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("strong", null, "Risk Level:"),
                            " ",
                            suggestion.metadata.risk))),
                react_1.default.createElement("div", { className: "flex gap-2" },
                    react_1.default.createElement("button", { onClick: handleApply, disabled: safetyWarnings.some(w => w.severity === 'high'), className: "flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" }, "Apply This Play"),
                    react_1.default.createElement("button", { onClick: () => setSuggestion(null), className: "px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors" }, "Try Another")),
                react_1.default.createElement("div", { className: "flex items-center justify-center gap-4 mt-4 pt-3 border-t border-purple-200" },
                    react_1.default.createElement("span", { className: "text-xs text-purple-600" }, "Was this helpful?"),
                    react_1.default.createElement("button", { onClick: () => handleFeedback('helpful'), className: `p-1 rounded transition-colors ${feedback === 'helpful' ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600'}` },
                        react_1.default.createElement(lucide_react_1.ThumbsUp, { size: 14 })),
                    react_1.default.createElement("button", { onClick: () => handleFeedback('not_helpful'), className: `p-1 rounded transition-colors ${feedback === 'not_helpful' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600'}` },
                        react_1.default.createElement(lucide_react_1.ThumbsUp, { size: 14, className: "rotate-180" })))),
            suggestion.alternatives.length > 0 && (react_1.default.createElement("div", null,
                react_1.default.createElement("p", { className: "text-sm font-medium text-gray-700 mb-2" }, "Other options:"),
                react_1.default.createElement("div", { className: "space-y-2" }, suggestion.alternatives.map((alt, i) => (react_1.default.createElement("div", { key: i, className: "flex items-center justify-between p-2 bg-gray-50 rounded" },
                    react_1.default.createElement("span", { className: "text-sm text-gray-700" }, alt.name),
                    react_1.default.createElement("span", { className: "text-xs text-gray-500" },
                        (alt.confidence * 100).toFixed(0),
                        "%")))))))))));
};
// ============================================
// PLAYER FEEDBACK SYSTEM
// ============================================
const PlayerFeedbackSystem = ({ drillId, playId, allowComments = true, moderated = true }) => {
    const [rating, setRating] = (0, react_1.useState)(0);
    const [comment, setComment] = (0, react_1.useState)('');
    const [submitted, setSubmitted] = (0, react_1.useState)(false);
    const [showEmojiPicker, setShowEmojiPicker] = (0, react_1.useState)(false);
    const emojis = ['😊', '😐', '😕', '💪', '🔥', '👍', '👎', '😴', '🤔'];
    const handleSubmit = () => {
        if (rating === 0)
            return;
        const feedback = {
            drillId,
            playId,
            rating,
            comment: comment.trim(),
            timestamp: new Date(),
            status: moderated ? 'pending' : 'approved'
        };
        console.log('Feedback submitted:', feedback);
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setRating(0);
            setComment('');
        }, 3000);
    };
    if (submitted) {
        return (react_1.default.createElement("div", { className: "bg-green-50 border border-green-200 rounded-lg p-4 text-center" },
            react_1.default.createElement(lucide_react_1.Check, { className: "text-green-600 mx-auto mb-2", size: 24 }),
            react_1.default.createElement("p", { className: "text-sm text-green-700" }, "Thanks for your feedback!"),
            moderated && (react_1.default.createElement("p", { className: "text-xs text-green-600 mt-1" }, "Your comment is being reviewed by coaches"))));
    }
    return (react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm p-4" },
        react_1.default.createElement("h4", { className: "text-sm font-medium text-gray-700 mb-3" }, "How was this drill?"),
        react_1.default.createElement("div", { className: "flex items-center gap-1 mb-3" }, [1, 2, 3, 4, 5].map(value => (react_1.default.createElement("button", { key: value, onClick: () => setRating(value), className: "transition-all hover:scale-110" },
            react_1.default.createElement(lucide_react_1.Star, { size: 28, className: `${value <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} transition-colors` }))))),
        react_1.default.createElement("div", { className: "mb-3" },
            react_1.default.createElement("p", { className: "text-xs text-gray-500 mb-2" }, "Quick reaction:"),
            react_1.default.createElement("div", { className: "flex gap-2 flex-wrap" }, emojis.map(emoji => (react_1.default.createElement("button", { key: emoji, onClick: () => setComment(comment + emoji), className: "text-lg hover:scale-110 transition-transform p-1 hover:bg-gray-100 rounded" }, emoji))))),
        allowComments && (react_1.default.createElement("div", { className: "mb-3" },
            react_1.default.createElement("textarea", { value: comment, onChange: (e) => setComment(e.target.value), placeholder: "Any comments? (optional)", className: "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500", rows: 2, maxLength: 200 }),
            react_1.default.createElement("div", { className: "flex justify-between items-center mt-1" },
                react_1.default.createElement("p", { className: "text-xs text-gray-500" },
                    comment.length,
                    "/200 characters"),
                moderated && (react_1.default.createElement("p", { className: "text-xs text-gray-500" }, "Comments reviewed by coaches"))))),
        rating > 0 && (react_1.default.createElement("button", { onClick: handleSubmit, className: "w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors" }, "Submit Feedback"))));
};
// ============================================
// COMPREHENSIVE DASHBOARD SYSTEM
// ============================================
const DashboardSelector = ({ userRole, onRoleChange }) => {
    const dashboards = {
        head_coach: { icon: lucide_react_1.Award, label: 'Head Coach', color: 'blue' },
        assistant_coach: { icon: lucide_react_1.Users, label: 'Assistant Coach', color: 'green' },
        athletic_director: { icon: lucide_react_1.Monitor, label: 'Athletic Director', color: 'purple' },
        player: { icon: lucide_react_1.User, label: 'Player', color: 'orange' },
        parent: { icon: lucide_react_1.Heart, label: 'Parent', color: 'pink' }
    };
    return (react_1.default.createElement("div", { className: "mb-6" },
        react_1.default.createElement("div", { className: "flex gap-2 flex-wrap" }, Object.entries(dashboards).map(([role, { icon: Icon, label, color }]) => {
            const isActive = userRole === role;
            const colorClasses = {
                blue: isActive ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-100 text-gray-600',
                green: isActive ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-600',
                purple: isActive ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-600',
                orange: isActive ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-gray-100 text-gray-600',
                pink: isActive ? 'bg-pink-100 text-pink-700 border-pink-300' : 'bg-gray-100 text-gray-600'
            };
            return (react_1.default.createElement("button", { key: role, onClick: () => onRoleChange(role), className: `px-3 py-2 rounded-lg border text-sm flex items-center gap-2 transition-colors ${colorClasses[color]}` },
                react_1.default.createElement(Icon, { size: 16 }),
                label));
        }))));
};
const CoachDashboard = () => {
    const [timeRange, setTimeRange] = (0, react_1.useState)('week');
    const [activeTab, setActiveTab] = (0, react_1.useState)('overview');
    const metrics = {
        attendance: { value: 85, trend: 5, label: 'Attendance Rate' },
        playSuccess: { value: 72, trend: 12, label: 'Play Success Rate' },
        drillRating: { value: 4.2, trend: 0.3, label: 'Avg Drill Rating' },
        playerLoad: { value: 82, trend: -3, label: 'Player Load Index' }
    };
    return (react_1.default.createElement("div", { className: "space-y-6" },
        react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4" }, Object.entries(metrics).map(([key, metric]) => (react_1.default.createElement("div", { key: key, className: "bg-white rounded-lg p-4 shadow-sm" },
            react_1.default.createElement("div", { className: "flex items-center justify-between mb-2" },
                react_1.default.createElement("div", { className: "p-2 bg-blue-100 rounded-lg" },
                    react_1.default.createElement(lucide_react_1.Activity, { className: "text-blue-600", size: 20 })),
                react_1.default.createElement("span", { className: `text-xs font-medium ${metric.trend > 0 ? 'text-green-600' : 'text-red-600'}` },
                    metric.trend > 0 ? '+' : '',
                    metric.trend,
                    "%")),
            react_1.default.createElement("p", { className: "text-2xl font-bold text-gray-900" },
                metric.value,
                key === 'drillRating' ? '/5' : '%'),
            react_1.default.createElement("p", { className: "text-sm text-gray-600" }, metric.label))))),
        react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm p-6" },
            react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900 mb-4" }, "Quick Actions"),
            react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" },
                react_1.default.createElement("button", { className: "p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-left" },
                    react_1.default.createElement(lucide_react_1.Brain, { className: "mb-2", size: 24 }),
                    react_1.default.createElement("p", { className: "font-medium" }, "Get AI Suggestion"),
                    react_1.default.createElement("p", { className: "text-sm opacity-75" }, "Let AI analyze and suggest plays")),
                react_1.default.createElement("button", { className: "p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-left" },
                    react_1.default.createElement(lucide_react_1.PlusCircle, { className: "mb-2", size: 24 }),
                    react_1.default.createElement("p", { className: "font-medium" }, "Create New Play"),
                    react_1.default.createElement("p", { className: "text-sm opacity-75" }, "Design custom plays")),
                react_1.default.createElement("button", { className: "p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-left" },
                    react_1.default.createElement(lucide_react_1.Check, { className: "mb-2", size: 24 }),
                    react_1.default.createElement("p", { className: "font-medium" }, "Take Attendance"),
                    react_1.default.createElement("p", { className: "text-sm opacity-75" }, "Track player attendance")))),
        react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm p-6" },
            react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900 mb-4" }, "Recent Activity"),
            react_1.default.createElement("div", { className: "space-y-3" }, [
                { action: 'Practice plan created', time: '2 hours ago', icon: lucide_react_1.Calendar },
                { action: '3 new plays added to library', time: '1 day ago', icon: lucide_react_1.PlusCircle },
                { action: 'Roster updated with 2 new players', time: '2 days ago', icon: lucide_react_1.Users },
                { action: 'Game results logged (Win 21-14)', time: '3 days ago', icon: lucide_react_1.Trophy }
            ].map((activity, i) => {
                const Icon = activity.icon;
                return (react_1.default.createElement("div", { key: i, className: "flex items-center gap-3 p-2 hover:bg-gray-50 rounded" },
                    react_1.default.createElement(Icon, { className: "text-gray-600", size: 16 }),
                    react_1.default.createElement("div", { className: "flex-1" },
                        react_1.default.createElement("p", { className: "text-sm text-gray-900" }, activity.action),
                        react_1.default.createElement("p", { className: "text-xs text-gray-500" }, activity.time))));
            })))));
};
const PlayerDashboard = () => {
    const playerStats = {
        attendance: 92,
        skillRating: 4.1,
        badges: 7,
        practicesThisWeek: 3
    };
    const recentBadges = [
        { name: 'Perfect Attendance', icon: '🎯', earned: '2 days ago' },
        { name: 'Team Player', icon: '🤝', earned: '1 week ago' },
        { name: 'Drill Master', icon: '⚡', earned: '2 weeks ago' }
    ];
    return (react_1.default.createElement("div", { className: "space-y-6" },
        react_1.default.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4" },
            react_1.default.createElement("div", { className: "bg-white rounded-lg p-4 shadow-sm text-center" },
                react_1.default.createElement("p", { className: "text-2xl font-bold text-blue-600" },
                    playerStats.attendance,
                    "%"),
                react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Attendance")),
            react_1.default.createElement("div", { className: "bg-white rounded-lg p-4 shadow-sm text-center" },
                react_1.default.createElement("p", { className: "text-2xl font-bold text-green-600" },
                    playerStats.skillRating,
                    "/5"),
                react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Skill Rating")),
            react_1.default.createElement("div", { className: "bg-white rounded-lg p-4 shadow-sm text-center" },
                react_1.default.createElement("p", { className: "text-2xl font-bold text-purple-600" }, playerStats.badges),
                react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Badges Earned")),
            react_1.default.createElement("div", { className: "bg-white rounded-lg p-4 shadow-sm text-center" },
                react_1.default.createElement("p", { className: "text-2xl font-bold text-orange-600" }, playerStats.practicesThisWeek),
                react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "This Week"))),
        react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm p-6" },
            react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900 mb-4" }, "Recent Achievements"),
            react_1.default.createElement("div", { className: "space-y-3" }, recentBadges.map((badge, i) => (react_1.default.createElement("div", { key: i, className: "flex items-center gap-3 p-3 bg-yellow-50 rounded-lg" },
                react_1.default.createElement("span", { className: "text-2xl" }, badge.icon),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("p", { className: "font-medium text-gray-900" }, badge.name),
                    react_1.default.createElement("p", { className: "text-sm text-gray-600" },
                        "Earned ",
                        badge.earned))))))),
        react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm p-6" },
            react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900 mb-4" }, "Skill Progress"),
            react_1.default.createElement("div", { className: "space-y-4" }, [
                { skill: 'Passing Accuracy', level: 78, target: 85 },
                { skill: 'Route Running', level: 65, target: 75 },
                { skill: 'Conditioning', level: 92, target: 90 }
            ].map((skill, i) => (react_1.default.createElement("div", { key: i },
                react_1.default.createElement("div", { className: "flex justify-between text-sm mb-1" },
                    react_1.default.createElement("span", { className: "text-gray-700" }, skill.skill),
                    react_1.default.createElement("span", { className: "text-gray-500" },
                        skill.level,
                        "% / ",
                        skill.target,
                        "%")),
                react_1.default.createElement("div", { className: "w-full bg-gray-200 rounded-full h-2" },
                    react_1.default.createElement("div", { className: "bg-blue-600 h-2 rounded-full", style: { width: `${(skill.level / skill.target) * 100}%` } })))))))));
};
// ============================================
// NOTIFICATION SYSTEM
// ============================================
const NotificationCenter = () => {
    const [notifications, setNotifications] = (0, react_1.useState)([
        {
            id: 1,
            type: 'practice_reminder',
            title: 'Practice Tomorrow',
            message: 'Team practice at 3:30 PM on Field 2. Don\'t forget your gear!',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            read: false,
            priority: 'normal',
            actions: [
                { label: 'Mark Attending', action: 'attend' },
                { label: 'Can\'t Make It', action: 'absent' }
            ]
        },
        {
            id: 2,
            type: 'achievement',
            title: 'New Badge Earned!',
            message: 'Congratulations! You earned the "Perfect Attendance" badge.',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            read: false,
            priority: 'low'
        }
    ]);
    const [preferences, setPreferences] = (0, react_1.useState)({
        email: true,
        sms: false,
        push: true,
        inApp: true,
        categories: {
            practiceReminders: true,
            achievements: true,
            scheduleChanges: true,
            emergencyAlerts: true
        }
    });
    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? Object.assign(Object.assign({}, n), { read: true }) : n));
    };
    const handleAction = (notificationId, action) => {
        console.log('Notification action:', { notificationId, action });
        markAsRead(notificationId);
    };
    return (react_1.default.createElement("div", { className: "max-w-2xl mx-auto space-y-6" },
        react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm p-6" },
            react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900 mb-4" }, "Notification Preferences"),
            react_1.default.createElement("div", { className: "space-y-4" },
                react_1.default.createElement("div", null,
                    react_1.default.createElement("h4", { className: "text-sm font-medium text-gray-700 mb-2" }, "Delivery Methods"),
                    react_1.default.createElement("div", { className: "space-y-2" }, Object.entries({
                        email: { icon: lucide_react_1.Mail, label: 'Email' },
                        sms: { icon: lucide_react_1.MessageSquare, label: 'SMS' },
                        push: { icon: lucide_react_1.Smartphone, label: 'Push Notifications' },
                        inApp: { icon: lucide_react_1.Bell, label: 'In-App' }
                    }).map(([key, { icon: Icon, label }]) => (react_1.default.createElement("label", { key: key, className: "flex items-center gap-3 cursor-pointer" },
                        react_1.default.createElement("input", { type: "checkbox", checked: preferences[key], onChange: (e) => setPreferences(prev => (Object.assign(Object.assign({}, prev), { [key]: e.target.checked }))), className: "rounded border-gray-300 text-blue-600 focus:ring-blue-500" }),
                        react_1.default.createElement(Icon, { size: 16, className: "text-gray-600" }),
                        react_1.default.createElement("span", { className: "text-sm text-gray-700" }, label)))))),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("h4", { className: "text-sm font-medium text-gray-700 mb-2" }, "Categories"),
                    react_1.default.createElement("div", { className: "space-y-2" }, Object.entries({
                        practiceReminders: 'Practice Reminders',
                        achievements: 'Achievements & Badges',
                        scheduleChanges: 'Schedule Changes',
                        emergencyAlerts: 'Emergency Alerts'
                    }).map(([key, label]) => (react_1.default.createElement("label", { key: key, className: "flex items-center gap-3 cursor-pointer" },
                        react_1.default.createElement("input", { type: "checkbox", checked: preferences.categories[key], onChange: (e) => setPreferences(prev => (Object.assign(Object.assign({}, prev), { categories: Object.assign(Object.assign({}, prev.categories), { [key]: e.target.checked }) }))), className: "rounded border-gray-300 text-blue-600 focus:ring-blue-500" }),
                        react_1.default.createElement("span", { className: "text-sm text-gray-700" }, label)))))))),
        react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm" },
            react_1.default.createElement("div", { className: "p-4 border-b border-gray-200" },
                react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900" }, "Recent Notifications")),
            react_1.default.createElement("div", { className: "divide-y divide-gray-100" }, notifications.map(notification => (react_1.default.createElement("div", { key: notification.id, className: `p-4 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}` },
                react_1.default.createElement("div", { className: "flex gap-3" },
                    react_1.default.createElement("div", { className: "flex-shrink-0" },
                        notification.type === 'practice_reminder' && react_1.default.createElement(lucide_react_1.Calendar, { className: "text-blue-600", size: 20 }),
                        notification.type === 'achievement' && react_1.default.createElement(lucide_react_1.Trophy, { className: "text-yellow-600", size: 20 })),
                    react_1.default.createElement("div", { className: "flex-1" },
                        react_1.default.createElement("div", { className: "flex items-start justify-between" },
                            react_1.default.createElement("div", null,
                                react_1.default.createElement("h4", { className: "font-medium text-gray-900" }, notification.title),
                                react_1.default.createElement("p", { className: "text-sm text-gray-600 mt-1" }, notification.message),
                                react_1.default.createElement("p", { className: "text-xs text-gray-500 mt-2" }, notification.timestamp.toLocaleString())),
                            !notification.read && (react_1.default.createElement("span", { className: "inline-block w-2 h-2 bg-blue-600 rounded-full" }))),
                        notification.actions && (react_1.default.createElement("div", { className: "flex gap-2 mt-3" }, notification.actions.map((action, i) => (react_1.default.createElement("button", { key: i, onClick: () => handleAction(notification.id, action.action), className: "px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors" }, action.label))))))))))))));
};
// ============================================
// MAIN APP COMPONENT
// ============================================
const CoachCoreAIComplete = () => {
    const [currentView, setCurrentView] = (0, react_1.useState)('dashboard');
    const [showOnboarding, setShowOnboarding] = (0, react_1.useState)(false);
    const [userRole, setUserRole] = (0, react_1.useState)('head_coach');
    const navigation = [
        { id: 'dashboard', label: 'Dashboard', icon: lucide_react_1.Home },
        { id: 'playbook', label: 'Smart Playbook', icon: lucide_react_1.Route },
        { id: 'ai-assistant', label: 'AI Assistant', icon: lucide_react_1.Brain },
        { id: 'templates', label: 'Templates', icon: lucide_react_1.Grid },
        { id: 'analytics', label: 'Analytics', icon: lucide_react_1.BarChart3 },
        { id: 'notifications', label: 'Notifications', icon: lucide_react_1.Bell },
        { id: 'feedback', label: 'Feedback', icon: lucide_react_1.MessageSquare }
    ];
    const handlePersonaSelect = (persona) => {
        console.log('Selected persona:', persona);
        setShowOnboarding(false);
        // Customize experience based on persona
    };
    if (showOnboarding) {
        return react_1.default.createElement(PersonaPicker, { onPersonaSelect: handlePersonaSelect });
    }
    return (react_1.default.createElement(AppProvider, null,
        react_1.default.createElement("div", { className: "min-h-screen bg-gray-50" },
            react_1.default.createElement("nav", { className: "bg-white shadow-sm border-b sticky top-0 z-40" },
                react_1.default.createElement("div", { className: "max-w-7xl mx-auto px-4" },
                    react_1.default.createElement("div", { className: "flex items-center justify-between h-16" },
                        react_1.default.createElement("div", { className: "flex items-center gap-6" },
                            react_1.default.createElement("h1", { className: "text-xl font-bold text-gray-900 flex items-center gap-2" },
                                react_1.default.createElement(lucide_react_1.Brain, { className: "text-purple-600" }),
                                "Coach Core AI"),
                            react_1.default.createElement("div", { className: "hidden md:flex gap-4" }, navigation.map(nav => {
                                const Icon = nav.icon;
                                return (react_1.default.createElement("button", { key: nav.id, onClick: () => setCurrentView(nav.id), className: `text-sm font-medium px-3 py-2 rounded-lg transition-colors ${currentView === nav.id
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}` },
                                    react_1.default.createElement(Icon, { size: 16, className: "inline mr-1" }),
                                    nav.label));
                            }))),
                        react_1.default.createElement("div", { className: "flex items-center gap-4" },
                            react_1.default.createElement("button", { onClick: () => setShowOnboarding(true), className: "p-2 text-gray-600 hover:bg-gray-100 rounded-lg", title: "Show onboarding" },
                                react_1.default.createElement(lucide_react_1.HelpCircle, { size: 18 })),
                            react_1.default.createElement("div", { className: "relative" },
                                react_1.default.createElement(lucide_react_1.Bell, { size: 20, className: "text-gray-600" }),
                                react_1.default.createElement("span", { className: "absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center" }, "2")),
                            react_1.default.createElement("div", { className: "flex items-center gap-2" },
                                react_1.default.createElement(lucide_react_1.User, { size: 16, className: "text-gray-600" }),
                                react_1.default.createElement("span", { className: "text-sm text-gray-700 capitalize" }, userRole.replace('_', ' '))))))),
            react_1.default.createElement("main", { className: "max-w-7xl mx-auto px-4 py-6" },
                currentView === 'dashboard' && (react_1.default.createElement("div", { className: "space-y-6" },
                    react_1.default.createElement(DashboardSelector, { userRole: userRole, onRoleChange: setUserRole }),
                    userRole.includes('coach') || userRole === 'athletic_director' ? (react_1.default.createElement(CoachDashboard, null)) : (react_1.default.createElement(PlayerDashboard, null)))),
                currentView === 'templates' && (react_1.default.createElement(TemplateGallery, { sport: "football", onSelectTemplate: (template) => console.log('Selected template:', template), onStartFromScratch: () => console.log('Starting from scratch') })),
                currentView === 'ai-assistant' && (react_1.default.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" },
                    react_1.default.createElement(AISuggestionPanel, { teamContext: { ageGroup: 'high_school', id: 'demo-team' }, gameContext: {}, onApplySuggestion: (suggestion) => console.log('Applied suggestion:', suggestion) }),
                    react_1.default.createElement("div", { className: "space-y-6" },
                        react_1.default.createElement(PlayerFeedbackSystem, { drillId: "demo-drill", playId: "demo-play", allowComments: true, moderated: true })))),
                currentView === 'notifications' && react_1.default.createElement(NotificationCenter, null),
                currentView === 'feedback' && (react_1.default.createElement("div", { className: "max-w-2xl mx-auto" },
                    react_1.default.createElement(PlayerFeedbackSystem, { drillId: "demo-drill", playId: "demo-play", allowComments: true, moderated: true }))),
                currentView === 'playbook' && (react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm p-6" },
                    react_1.default.createElement("h2", { className: "text-2xl font-bold text-gray-900 mb-4" }, "Smart Playbook"),
                    react_1.default.createElement("p", { className: "text-gray-600" }, "Interactive playbook component would be integrated here."),
                    react_1.default.createElement("div", { className: "mt-6 aspect-video bg-gray-100 rounded-lg flex items-center justify-center" },
                        react_1.default.createElement("p", { className: "text-gray-500" }, "Playbook canvas would render here")))),
                currentView === 'analytics' && (react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm p-6" },
                    react_1.default.createElement("h2", { className: "text-2xl font-bold text-gray-900 mb-4" }, "Analytics Dashboard"),
                    react_1.default.createElement("p", { className: "text-gray-600" }, "Comprehensive analytics and insights would be displayed here.")))),
            react_1.default.createElement("div", { className: "fixed bottom-4 left-4" },
                react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-lg p-3 flex items-center gap-2" },
                    react_1.default.createElement("div", { className: "w-2 h-2 bg-green-500 rounded-full" }),
                    react_1.default.createElement("span", { className: "text-sm text-gray-700" }, "Online"))))));
};
exports.default = CoachCoreAIComplete;
