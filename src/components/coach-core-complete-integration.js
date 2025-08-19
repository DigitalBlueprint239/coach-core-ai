"use strict";
// Coach Core AI - Complete Integration
// This file contains all new features in one place for easy integration
// You can copy this entire file and gradually split it into modules
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
const recharts_1 = require("recharts");
// ============================================
// SECTION 1: FIREBASE SERVICE (Mock Version)
// ============================================
// Replace this with actual Firebase config when ready
const mockFirebase = {
    auth: {
        currentUser: { uid: 'demo-user', email: 'demo@coachcore.ai', teamId: 'demo-team' }
    },
    teamService: {
        createTeam(teamData) {
            return __awaiter(this, void 0, void 0, function* () {
                console.log('Creating team:', teamData);
                return 'new-team-id';
            });
        },
        getTeam(teamId) {
            return __awaiter(this, void 0, void 0, function* () {
                return {
                    id: teamId,
                    name: 'Demo Team',
                    players: 20,
                    coaches: 3
                };
            });
        }
    },
    playService: {
        savePlay(teamId, playData) {
            return __awaiter(this, void 0, void 0, function* () {
                console.log('Saving play:', playData);
                return 'new-play-id';
            });
        },
        getPlays(teamId) {
            return __awaiter(this, void 0, void 0, function* () {
                return [
                    { id: '1', name: 'Shotgun Pass Right', type: 'pass', successRate: 0.75 },
                    { id: '2', name: 'I-Form Run', type: 'run', successRate: 0.68 }
                ];
            });
        }
    },
    analyticsService: {
        trackPlayUsage(teamId, playId, result) {
            return __awaiter(this, void 0, void 0, function* () {
                console.log('Tracking play usage:', { teamId, playId, result });
            });
        },
        getTeamAnalytics(teamId, dateRange) {
            return __awaiter(this, void 0, void 0, function* () {
                return {
                    attendance: 0.85,
                    playSuccess: 0.72,
                    avgDrillRating: 4.2
                };
            });
        }
    }
};
// ============================================
// SECTION 2: AI PLAY SUGGESTION SYSTEM
// ============================================
const AIPlaySuggestion = ({ teamData, currentSituation, playerRoster, onApplyPlay, ageGroup = 'youth' }) => {
    const [suggestion, setSuggestion] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [feedback, setFeedback] = (0, react_1.useState)(null);
    const [safetyWarnings, setSafetyWarnings] = (0, react_1.useState)([]);
    const SAFETY_RULES = {
        youth: {
            maxPlayers: 11,
            prohibitedPlays: ['blitz_all', 'quarterback_sneak'],
            maxRouteDepth: 20,
            requiredRest: true
        },
        highSchool: {
            maxPlayers: 11,
            prohibitedPlays: [],
            maxRouteDepth: 40,
            requiredRest: false
        }
    };
    const generateSuggestion = () => __awaiter(void 0, void 0, void 0, function* () {
        setLoading(true);
        setSafetyWarnings([]);
        try {
            yield new Promise(resolve => setTimeout(resolve, 1500));
            const mockSuggestion = {
                id: 'ai_' + Date.now(),
                name: 'AI Suggested: Quick Slant Right',
                type: 'pass',
                formation: 'shotgun',
                confidence: 0.85,
                reasoning: [
                    'Opponent shows weak coverage on right side',
                    'Your WR #81 has 75% success rate on slant routes',
                    'Quick release counters their pass rush tendency'
                ],
                players: [
                    { id: 1, position: 'QB', x: 300, y: 200, number: 12 },
                    { id: 2, position: 'WR', x: 450, y: 150, number: 81 },
                    { id: 3, position: 'WR', x: 150, y: 150, number: 80 }
                ],
                routes: [
                    {
                        playerId: 2,
                        points: [{ x: 450, y: 150 }, { x: 480, y: 120 }, { x: 500, y: 100 }],
                        type: 'slant'
                    }
                ],
                alternativeOptions: [
                    { name: 'Screen Pass Left', confidence: 0.72 },
                    { name: 'Draw Play', confidence: 0.68 }
                ]
            };
            const warnings = validatePlaySafety(mockSuggestion, SAFETY_RULES[ageGroup]);
            setSafetyWarnings(warnings);
            setSuggestion(mockSuggestion);
        }
        catch (error) {
            console.error('AI suggestion error:', error);
        }
        finally {
            setLoading(false);
        }
    });
    const validatePlaySafety = (play, rules) => {
        var _a;
        const warnings = [];
        if (rules.prohibitedPlays.includes(play.type)) {
            warnings.push({
                type: 'prohibited',
                message: `${play.type} plays are not allowed for ${ageGroup} level`
            });
        }
        (_a = play.routes) === null || _a === void 0 ? void 0 : _a.forEach(route => {
            const maxY = Math.max(...route.points.map(p => Math.abs(p.y - route.points[0].y)));
            if (maxY > rules.maxRouteDepth) {
                warnings.push({
                    type: 'depth',
                    message: `Route depth exceeds ${rules.maxRouteDepth} yard limit for ${ageGroup}`
                });
            }
        });
        return warnings;
    };
    const handleFeedback = (type) => {
        setFeedback(type);
        console.log('AI feedback:', { suggestionId: suggestion.id, feedback: type });
    };
    return (react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm p-4" },
        react_1.default.createElement("div", { className: "flex items-center justify-between mb-4" },
            react_1.default.createElement("h3", { className: "font-semibold text-gray-800 flex items-center gap-2" },
                react_1.default.createElement(lucide_react_1.Sparkles, { className: "text-purple-600", size: 20 }),
                "AI Play Assistant"),
            suggestion && (react_1.default.createElement("div", { className: "text-sm text-gray-500" },
                "Confidence: ",
                (suggestion.confidence * 100).toFixed(0),
                "%"))),
        !suggestion ? (react_1.default.createElement("div", { className: "text-center py-8" },
            react_1.default.createElement("button", { onClick: generateSuggestion, disabled: loading, className: "px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-2 mx-auto" }, loading ? (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement("div", { className: "animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" }),
                "Analyzing...")) : (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement(lucide_react_1.Sparkles, { size: 16 }),
                "Suggest a Play"))),
            react_1.default.createElement("p", { className: "text-xs text-gray-500 mt-2" }, "AI will analyze your team's strengths and suggest optimal plays"))) : (react_1.default.createElement("div", { className: "space-y-4" },
            safetyWarnings.length > 0 && (react_1.default.createElement("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-3" },
                react_1.default.createElement("div", { className: "flex items-start gap-2" },
                    react_1.default.createElement(lucide_react_1.AlertTriangle, { className: "text-yellow-600 flex-shrink-0", size: 16 }),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("p", { className: "text-sm font-medium text-yellow-800" }, "Safety Considerations"),
                        react_1.default.createElement("ul", { className: "text-xs text-yellow-700 mt-1 space-y-1" }, safetyWarnings.map((warning, i) => (react_1.default.createElement("li", { key: i },
                            "\u2022 ",
                            warning.message)))))))),
            react_1.default.createElement("div", { className: "bg-purple-50 rounded-lg p-4" },
                react_1.default.createElement("h4", { className: "font-medium text-purple-900 mb-2" }, suggestion.name),
                react_1.default.createElement("div", { className: "space-y-2 mb-3" },
                    react_1.default.createElement("p", { className: "text-xs font-medium text-purple-700" }, "Why this play?"),
                    react_1.default.createElement("ul", { className: "text-xs text-purple-600 space-y-1" }, suggestion.reasoning.map((reason, i) => (react_1.default.createElement("li", { key: i, className: "flex items-start gap-1" },
                        react_1.default.createElement("span", { className: "text-purple-400 mt-0.5" }, "\u2022"),
                        reason))))),
                react_1.default.createElement("div", { className: "bg-white rounded p-2 mb-3" },
                    react_1.default.createElement("div", { className: "aspect-video bg-green-100 rounded flex items-center justify-center" },
                        react_1.default.createElement("p", { className: "text-xs text-green-600" }, "Play preview would render here"))),
                suggestion.alternativeOptions.length > 0 && (react_1.default.createElement("div", { className: "mb-3" },
                    react_1.default.createElement("p", { className: "text-xs font-medium text-purple-700 mb-1" }, "Other options:"),
                    react_1.default.createElement("div", { className: "space-y-1" }, suggestion.alternativeOptions.map((alt, i) => (react_1.default.createElement("div", { key: i, className: "flex items-center justify-between text-xs" },
                        react_1.default.createElement("span", { className: "text-purple-600" }, alt.name),
                        react_1.default.createElement("span", { className: "text-purple-400" },
                            (alt.confidence * 100).toFixed(0),
                            "%"))))))),
                react_1.default.createElement("div", { className: "flex gap-2" },
                    react_1.default.createElement("button", { onClick: () => onApplyPlay(suggestion), className: "flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors", disabled: safetyWarnings.some(w => w.type === 'prohibited') }, "Apply This Play"),
                    react_1.default.createElement("button", { onClick: generateSuggestion, className: "px-3 py-2 bg-purple-100 text-purple-700 text-sm rounded-lg hover:bg-purple-200 transition-colors" }, "Try Another")),
                react_1.default.createElement("div", { className: "flex items-center justify-center gap-4 mt-3 pt-3 border-t border-purple-200" },
                    react_1.default.createElement("span", { className: "text-xs text-purple-600" }, "Was this helpful?"),
                    react_1.default.createElement("button", { onClick: () => handleFeedback('helpful'), className: `p-1 rounded transition-colors ${feedback === 'helpful' ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600'}` },
                        react_1.default.createElement(lucide_react_1.ThumbsUp, { size: 16 })),
                    react_1.default.createElement("button", { onClick: () => handleFeedback('not_helpful'), className: `p-1 rounded transition-colors ${feedback === 'not_helpful' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600'}` },
                        react_1.default.createElement(lucide_react_1.ThumbsUp, { size: 16, className: "rotate-180" }))))))));
};
// ============================================
// SECTION 3: PLAYER FEEDBACK COMPONENT
// ============================================
const PlayerFeedback = ({ playId, drillId, playerId, onSubmit, allowComments = true, isModerated = true }) => {
    const [rating, setRating] = (0, react_1.useState)(0);
    const [hoveredRating, setHoveredRating] = (0, react_1.useState)(0);
    const [comment, setComment] = (0, react_1.useState)('');
    const [submitted, setSubmitted] = (0, react_1.useState)(false);
    const [showCommentBox, setShowCommentBox] = (0, react_1.useState)(false);
    const handleSubmit = () => {
        if (rating === 0)
            return;
        const feedback = {
            playId,
            drillId,
            playerId,
            rating,
            comment: comment.trim(),
            timestamp: new Date(),
            status: isModerated ? 'pending' : 'approved'
        };
        onSubmit(feedback);
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setRating(0);
            setComment('');
            setShowCommentBox(false);
        }, 3000);
    };
    if (submitted) {
        return (react_1.default.createElement("div", { className: "bg-green-50 border border-green-200 rounded-lg p-3 text-center" },
            react_1.default.createElement(lucide_react_1.ThumbsUp, { className: "text-green-600 mx-auto mb-1", size: 20 }),
            react_1.default.createElement("p", { className: "text-sm text-green-700" }, "Thanks for your feedback!")));
    }
    return (react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm p-4" },
        react_1.default.createElement("h4", { className: "text-sm font-medium text-gray-700 mb-3" }, "How was this drill?"),
        react_1.default.createElement("div", { className: "flex items-center gap-1 mb-3" }, [1, 2, 3, 4, 5].map((value) => (react_1.default.createElement("button", { key: value, onClick: () => {
                setRating(value);
                if (allowComments && value >= 4) {
                    setShowCommentBox(true);
                }
            }, onMouseEnter: () => setHoveredRating(value), onMouseLeave: () => setHoveredRating(0), className: "transition-all" },
            react_1.default.createElement(lucide_react_1.Star, { size: 24, className: `${value <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'} transition-colors` }))))),
        allowComments && (rating > 0 || showCommentBox) && (react_1.default.createElement("div", { className: "mb-3" },
            react_1.default.createElement("textarea", { value: comment, onChange: (e) => setComment(e.target.value), placeholder: "Any comments? (optional)", className: "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500", rows: 2, maxLength: 200 }),
            react_1.default.createElement("p", { className: "text-xs text-gray-500 mt-1" },
                comment.length,
                "/200 characters",
                isModerated && ' • Comments are reviewed by coaches'))),
        rating > 0 && (react_1.default.createElement("button", { onClick: handleSubmit, className: "w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors" }, "Submit Feedback"))));
};
// ============================================
// SECTION 4: COACH ANALYTICS DASHBOARD
// ============================================
const CoachDashboard = ({ teamId, dateRange = { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() } }) => {
    const [activeTab, setActiveTab] = (0, react_1.useState)('overview');
    const [analytics, setAnalytics] = (0, react_1.useState)({
        attendance: { rate: 0.85, trend: 0.05 },
        playEffectiveness: { rate: 0.72, trend: 0.12 },
        drillRatings: { average: 4.2, trend: 0.3 },
        playerLoad: { average: 82, trend: -0.03 }
    });
    const attendanceData = [
        { date: 'Mon', present: 18, absent: 2 },
        { date: 'Tue', present: 19, absent: 1 },
        { date: 'Wed', present: 17, absent: 3 },
        { date: 'Thu', present: 20, absent: 0 },
        { date: 'Fri', present: 16, absent: 4 },
    ];
    const playEffectivenessData = [
        { name: 'Shotgun Pass', success: 78, usage: 45 },
        { name: 'I-Form Run', success: 72, usage: 38 },
        { name: 'Screen Pass', success: 68, usage: 28 },
        { name: 'Play Action', success: 65, usage: 22 },
        { name: 'Draw Play', success: 58, usage: 15 },
    ];
    const playerLoadData = [
        { player: 'QB #12', load: 85, optimal: 80 },
        { player: 'RB #21', load: 92, optimal: 85 },
        { player: 'WR #81', load: 78, optimal: 80 },
        { player: 'WR #80', load: 75, optimal: 80 },
        { player: 'TE #88', load: 70, optimal: 75 },
    ];
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return (react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-lg p-6" },
        react_1.default.createElement("div", { className: "flex items-center justify-between mb-6" },
            react_1.default.createElement("h2", { className: "text-xl font-bold text-gray-900" }, "Coach Analytics Dashboard"),
            react_1.default.createElement("div", { className: "flex items-center gap-2" },
                react_1.default.createElement("button", { className: "p-2 text-gray-600 hover:bg-gray-100 rounded-lg" },
                    react_1.default.createElement(lucide_react_1.Filter, { size: 18 })),
                react_1.default.createElement("button", { className: "p-2 text-gray-600 hover:bg-gray-100 rounded-lg" },
                    react_1.default.createElement(lucide_react_1.Download, { size: 18 })))),
        react_1.default.createElement("div", { className: "flex gap-1 mb-6 border-b" }, ['overview', 'attendance', 'plays', 'players'].map((tab) => (react_1.default.createElement("button", { key: tab, onClick: () => setActiveTab(tab), className: `px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'}` }, tab)))),
        react_1.default.createElement("div", { className: "space-y-6" },
            activeTab === 'overview' && (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4" },
                    react_1.default.createElement("div", { className: "bg-blue-50 rounded-lg p-4" },
                        react_1.default.createElement("div", { className: "flex items-center justify-between mb-2" },
                            react_1.default.createElement(lucide_react_1.Users, { className: "text-blue-600", size: 20 }),
                            react_1.default.createElement("span", { className: "text-xs text-green-600 font-medium" },
                                "+",
                                (analytics.attendance.trend * 100).toFixed(0),
                                "%")),
                        react_1.default.createElement("p", { className: "text-2xl font-bold text-blue-900" },
                            (analytics.attendance.rate * 100).toFixed(0),
                            "%"),
                        react_1.default.createElement("p", { className: "text-sm text-blue-700" }, "Attendance Rate")),
                    react_1.default.createElement("div", { className: "bg-green-50 rounded-lg p-4" },
                        react_1.default.createElement("div", { className: "flex items-center justify-between mb-2" },
                            react_1.default.createElement(lucide_react_1.Target, { className: "text-green-600", size: 20 }),
                            react_1.default.createElement("span", { className: "text-xs text-green-600 font-medium" },
                                "+",
                                (analytics.playEffectiveness.trend * 100).toFixed(0),
                                "%")),
                        react_1.default.createElement("p", { className: "text-2xl font-bold text-green-900" },
                            (analytics.playEffectiveness.rate * 100).toFixed(0),
                            "%"),
                        react_1.default.createElement("p", { className: "text-sm text-green-700" }, "Play Success Rate")),
                    react_1.default.createElement("div", { className: "bg-yellow-50 rounded-lg p-4" },
                        react_1.default.createElement("div", { className: "flex items-center justify-between mb-2" },
                            react_1.default.createElement(lucide_react_1.Star, { className: "text-yellow-600", size: 20 }),
                            react_1.default.createElement("span", { className: "text-xs text-gray-600 font-medium" },
                                "+",
                                analytics.drillRatings.trend.toFixed(1))),
                        react_1.default.createElement("p", { className: "text-2xl font-bold text-yellow-900" }, analytics.drillRatings.average.toFixed(1)),
                        react_1.default.createElement("p", { className: "text-sm text-yellow-700" }, "Avg Drill Rating")),
                    react_1.default.createElement("div", { className: "bg-purple-50 rounded-lg p-4" },
                        react_1.default.createElement("div", { className: "flex items-center justify-between mb-2" },
                            react_1.default.createElement(lucide_react_1.Activity, { className: "text-purple-600", size: 20 }),
                            react_1.default.createElement("span", { className: "text-xs text-red-600 font-medium" },
                                (analytics.playerLoad.trend * 100).toFixed(0),
                                "%")),
                        react_1.default.createElement("p", { className: "text-2xl font-bold text-purple-900" },
                            analytics.playerLoad.average,
                            "%"),
                        react_1.default.createElement("p", { className: "text-sm text-purple-700" }, "Player Load Index"))),
                react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6" },
                    react_1.default.createElement("div", { className: "bg-gray-50 rounded-lg p-4" },
                        react_1.default.createElement("h3", { className: "font-medium text-gray-900 mb-4" }, "Weekly Attendance"),
                        react_1.default.createElement(recharts_1.ResponsiveContainer, { width: "100%", height: 200 },
                            react_1.default.createElement(recharts_1.BarChart, { data: attendanceData },
                                react_1.default.createElement(recharts_1.CartesianGrid, { strokeDasharray: "3 3" }),
                                react_1.default.createElement(recharts_1.XAxis, { dataKey: "date" }),
                                react_1.default.createElement(recharts_1.YAxis, null),
                                react_1.default.createElement(recharts_1.Tooltip, null),
                                react_1.default.createElement(recharts_1.Bar, { dataKey: "present", fill: "#10b981", name: "Present" }),
                                react_1.default.createElement(recharts_1.Bar, { dataKey: "absent", fill: "#ef4444", name: "Absent" })))),
                    react_1.default.createElement("div", { className: "bg-gray-50 rounded-lg p-4" },
                        react_1.default.createElement("h3", { className: "font-medium text-gray-900 mb-4" }, "Play Effectiveness"),
                        react_1.default.createElement(recharts_1.ResponsiveContainer, { width: "100%", height: 200 },
                            react_1.default.createElement(recharts_1.BarChart, { data: playEffectivenessData, layout: "horizontal" },
                                react_1.default.createElement(recharts_1.CartesianGrid, { strokeDasharray: "3 3" }),
                                react_1.default.createElement(recharts_1.XAxis, { type: "number" }),
                                react_1.default.createElement(recharts_1.YAxis, { dataKey: "name", type: "category" }),
                                react_1.default.createElement(recharts_1.Tooltip, null),
                                react_1.default.createElement(recharts_1.Bar, { dataKey: "success", fill: "#3b82f6", name: "Success %" }))))))),
            activeTab === 'players' && (react_1.default.createElement("div", { className: "space-y-4" },
                react_1.default.createElement("div", { className: "bg-gray-50 rounded-lg p-4" },
                    react_1.default.createElement("h3", { className: "font-medium text-gray-900 mb-4" }, "Player Load Management"),
                    react_1.default.createElement(recharts_1.ResponsiveContainer, { width: "100%", height: 300 },
                        react_1.default.createElement(recharts_1.BarChart, { data: playerLoadData },
                            react_1.default.createElement(recharts_1.CartesianGrid, { strokeDasharray: "3 3" }),
                            react_1.default.createElement(recharts_1.XAxis, { dataKey: "player" }),
                            react_1.default.createElement(recharts_1.YAxis, null),
                            react_1.default.createElement(recharts_1.Tooltip, null),
                            react_1.default.createElement(recharts_1.Legend, null),
                            react_1.default.createElement(recharts_1.Bar, { dataKey: "load", fill: "#3b82f6", name: "Current Load" }),
                            react_1.default.createElement(recharts_1.Bar, { dataKey: "optimal", fill: "#10b981", name: "Optimal Load" }))),
                    react_1.default.createElement("div", { className: "mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg" },
                        react_1.default.createElement("p", { className: "text-sm text-yellow-800" },
                            react_1.default.createElement("strong", null, "Warning:"),
                            " RB #21 is above optimal load. Consider rest or reduced practice intensity."))))))));
};
// ============================================
// SECTION 5: NOTIFICATION CENTER
// ============================================
const NotificationCenter = ({ userId, userRole }) => {
    const [notifications, setNotifications] = (0, react_1.useState)([]);
    const [filter, setFilter] = (0, react_1.useState)('all');
    const [showPreferences, setShowPreferences] = (0, react_1.useState)(false);
    const [preferences, setPreferences] = (0, react_1.useState)({
        channels: { email: true, sms: true, push: true, inApp: true },
        categories: {
            practiceReminders: true,
            scheduleChanges: true,
            playerProgress: true,
            teamAnnouncements: true,
            emergencyAlerts: true
        }
    });
    (0, react_1.useEffect)(() => {
        setNotifications([
            {
                id: 1,
                type: 'practiceReminder',
                title: 'Practice Tomorrow',
                message: 'Football practice tomorrow at 3:30 PM on Field 2',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                read: false,
                priority: 'normal',
                icon: lucide_react_1.Calendar,
                iconColor: 'text-blue-600'
            },
            {
                id: 2,
                type: 'scheduleChange',
                title: 'Schedule Change',
                message: 'Saturday\'s game moved to 2:00 PM due to weather',
                timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
                read: false,
                priority: 'high',
                icon: lucide_react_1.AlertTriangle,
                iconColor: 'text-yellow-600'
            }
        ]);
    }, []);
    const filteredNotifications = filter === 'all'
        ? notifications
        : notifications.filter(n => !n.read);
    const markAsRead = (notificationId) => {
        setNotifications(prev => prev.map(n => n.id === notificationId ? Object.assign(Object.assign({}, n), { read: true }) : n));
    };
    if (showPreferences) {
        return (react_1.default.createElement("div", { className: "max-w-2xl mx-auto" },
            react_1.default.createElement("button", { onClick: () => setShowPreferences(false), className: "mb-4 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1" }, "\u2190 Back to Notifications"),
            react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm p-6" },
                react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900 mb-6" }, "Notification Preferences"),
                react_1.default.createElement("div", { className: "mb-6" },
                    react_1.default.createElement("h4", { className: "text-sm font-medium text-gray-700 mb-3" }, "Notification Channels"),
                    react_1.default.createElement("div", { className: "space-y-3" }, Object.entries({
                        email: { icon: lucide_react_1.Mail, label: 'Email', desc: 'Receive notifications via email' },
                        sms: { icon: lucide_react_1.MessageSquare, label: 'SMS', desc: 'Get text alerts for urgent updates' },
                        push: { icon: lucide_react_1.Smartphone, label: 'Push', desc: 'Mobile app notifications' },
                        inApp: { icon: lucide_react_1.Bell, label: 'In-App', desc: 'See alerts when you\'re in the app' }
                    }).map(([key, { icon: Icon, label, desc }]) => (react_1.default.createElement("label", { key: key, className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" },
                        react_1.default.createElement("div", { className: "flex items-center gap-3" },
                            react_1.default.createElement(Icon, { className: "text-gray-600", size: 18 }),
                            react_1.default.createElement("div", null,
                                react_1.default.createElement("p", { className: "font-medium text-gray-900" }, label),
                                react_1.default.createElement("p", { className: "text-xs text-gray-500" }, desc))),
                        react_1.default.createElement("input", { type: "checkbox", checked: preferences.channels[key], onChange: () => setPreferences(prev => (Object.assign(Object.assign({}, prev), { channels: Object.assign(Object.assign({}, prev.channels), { [key]: !prev.channels[key] }) }))), className: "h-4 w-4 text-blue-600 rounded focus:ring-blue-500" })))))),
                react_1.default.createElement("button", { onClick: () => setShowPreferences(false), className: "w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" }, "Save Preferences"))));
    }
    return (react_1.default.createElement("div", { className: "max-w-2xl mx-auto" },
        react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm" },
            react_1.default.createElement("div", { className: "p-4 border-b border-gray-200" },
                react_1.default.createElement("div", { className: "flex items-center justify-between mb-4" },
                    react_1.default.createElement("h2", { className: "text-lg font-semibold text-gray-900 flex items-center gap-2" },
                        react_1.default.createElement(lucide_react_1.Bell, { size: 20 }),
                        "Notifications"),
                    react_1.default.createElement("button", { onClick: () => setShowPreferences(true), className: "p-2 text-gray-600 hover:bg-gray-100 rounded-lg" },
                        react_1.default.createElement(lucide_react_1.Settings, { size: 18 }))),
                react_1.default.createElement("div", { className: "flex gap-4" },
                    react_1.default.createElement("button", { onClick: () => setFilter('all'), className: `text-sm font-medium pb-2 border-b-2 transition-colors ${filter === 'all' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent'}` },
                        "All (",
                        notifications.length,
                        ")"),
                    react_1.default.createElement("button", { onClick: () => setFilter('unread'), className: `text-sm font-medium pb-2 border-b-2 transition-colors ${filter === 'unread' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent'}` },
                        "Unread (",
                        notifications.filter(n => !n.read).length,
                        ")"))),
            react_1.default.createElement("div", { className: "divide-y divide-gray-100" }, filteredNotifications.map(notification => {
                const Icon = notification.icon;
                return (react_1.default.createElement("div", { key: notification.id, className: `p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50 bg-opacity-30' : ''}`, onClick: () => markAsRead(notification.id) },
                    react_1.default.createElement("div", { className: "flex gap-3" },
                        react_1.default.createElement("div", { className: `mt-1 ${notification.iconColor}` },
                            react_1.default.createElement(Icon, { size: 20 })),
                        react_1.default.createElement("div", { className: "flex-1" },
                            react_1.default.createElement("div", { className: "flex items-start justify-between" },
                                react_1.default.createElement("div", null,
                                    react_1.default.createElement("h4", { className: "font-medium text-gray-900 text-sm" },
                                        notification.title,
                                        !notification.read && (react_1.default.createElement("span", { className: "ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full" }))),
                                    react_1.default.createElement("p", { className: "text-sm text-gray-600 mt-1" }, notification.message)),
                                notification.priority === 'high' && (react_1.default.createElement("span", { className: "px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full" }, "Important")))))));
            })))));
};
// ============================================
// SECTION 6: MAIN APP INTEGRATION
// ============================================
const CoachCoreAIComplete = () => {
    const [currentView, setCurrentView] = (0, react_1.useState)('dashboard');
    const [userRole, setUserRole] = (0, react_1.useState)('coach');
    const [notifications, setNotifications] = (0, react_1.useState)([]);
    // Mock user data
    const mockUser = {
        uid: 'demo-user',
        email: 'coach@demo.com',
        teamId: 'demo-team',
        role: userRole
    };
    return (react_1.default.createElement("div", { className: "min-h-screen bg-gray-50" },
        react_1.default.createElement("nav", { className: "bg-white shadow-sm border-b" },
            react_1.default.createElement("div", { className: "max-w-7xl mx-auto px-4" },
                react_1.default.createElement("div", { className: "flex items-center justify-between h-16" },
                    react_1.default.createElement("div", { className: "flex items-center gap-6" },
                        react_1.default.createElement("h1", { className: "text-xl font-bold text-gray-900" }, "Coach Core AI"),
                        react_1.default.createElement("div", { className: "flex gap-4" },
                            react_1.default.createElement("button", { onClick: () => setCurrentView('dashboard'), className: `text-sm font-medium ${currentView === 'dashboard' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}` }, "Dashboard"),
                            react_1.default.createElement("button", { onClick: () => setCurrentView('ai-assistant'), className: `text-sm font-medium ${currentView === 'ai-assistant' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}` }, "AI Assistant"),
                            react_1.default.createElement("button", { onClick: () => setCurrentView('analytics'), className: `text-sm font-medium ${currentView === 'analytics' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}` }, "Analytics"),
                            react_1.default.createElement("button", { onClick: () => setCurrentView('notifications'), className: `text-sm font-medium ${currentView === 'notifications' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}` }, "Notifications"))),
                    react_1.default.createElement("div", { className: "flex items-center gap-4" },
                        react_1.default.createElement("select", { value: userRole, onChange: (e) => setUserRole(e.target.value), className: "text-sm border rounded px-2 py-1" },
                            react_1.default.createElement("option", { value: "coach" }, "Coach"),
                            react_1.default.createElement("option", { value: "player" }, "Player"),
                            react_1.default.createElement("option", { value: "parent" }, "Parent")),
                        react_1.default.createElement("div", { className: "relative" },
                            react_1.default.createElement(lucide_react_1.Bell, { size: 20, className: "text-gray-600" }),
                            notifications.length > 0 && (react_1.default.createElement("span", { className: "absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center" }, notifications.length))))))),
        react_1.default.createElement("main", { className: "max-w-7xl mx-auto px-4 py-6" },
            currentView === 'dashboard' && (react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" },
                react_1.default.createElement("div", { className: "bg-white rounded-lg shadow p-6" },
                    react_1.default.createElement("h3", { className: "font-semibold text-gray-900 mb-2" }, "Quick Actions"),
                    react_1.default.createElement("div", { className: "space-y-2" },
                        react_1.default.createElement("button", { onClick: () => setCurrentView('ai-assistant'), className: "w-full text-left p-3 bg-purple-50 text-purple-700 rounded hover:bg-purple-100" }, "\uD83E\uDD16 Get AI Play Suggestion"),
                        react_1.default.createElement("button", { className: "w-full text-left p-3 bg-blue-50 text-blue-700 rounded hover:bg-blue-100" }, "\uD83D\uDCCB Create New Play"),
                        react_1.default.createElement("button", { className: "w-full text-left p-3 bg-green-50 text-green-700 rounded hover:bg-green-100" }, "\u2705 Take Attendance"))),
                react_1.default.createElement("div", { className: "bg-white rounded-lg shadow p-6" },
                    react_1.default.createElement("h3", { className: "font-semibold text-gray-900 mb-2" }, "Team Stats"),
                    react_1.default.createElement("div", { className: "space-y-3" },
                        react_1.default.createElement("div", { className: "flex justify-between" },
                            react_1.default.createElement("span", { className: "text-gray-600" }, "Attendance Rate"),
                            react_1.default.createElement("span", { className: "font-medium" }, "85%")),
                        react_1.default.createElement("div", { className: "flex justify-between" },
                            react_1.default.createElement("span", { className: "text-gray-600" }, "Play Success"),
                            react_1.default.createElement("span", { className: "font-medium" }, "72%")),
                        react_1.default.createElement("div", { className: "flex justify-between" },
                            react_1.default.createElement("span", { className: "text-gray-600" }, "Active Players"),
                            react_1.default.createElement("span", { className: "font-medium" }, "22")))),
                react_1.default.createElement("div", { className: "bg-white rounded-lg shadow p-6" },
                    react_1.default.createElement("h3", { className: "font-semibold text-gray-900 mb-2" }, "Recent Activity"),
                    react_1.default.createElement("div", { className: "space-y-2 text-sm text-gray-600" },
                        react_1.default.createElement("div", null, "\u2713 Practice plan created"),
                        react_1.default.createElement("div", null, "\u2713 3 new plays added"),
                        react_1.default.createElement("div", null, "\u2713 Roster updated"),
                        react_1.default.createElement("div", null, "\u2713 Game results logged"))))),
            currentView === 'ai-assistant' && (react_1.default.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6" },
                react_1.default.createElement("div", { className: "lg:col-span-2" },
                    react_1.default.createElement(AIPlaySuggestion, { teamData: { id: mockUser.teamId }, currentSituation: {}, playerRoster: [], onApplyPlay: (play) => console.log('Apply play:', play), ageGroup: "youth" })),
                react_1.default.createElement("div", null,
                    react_1.default.createElement(PlayerFeedback, { playId: "demo-play", drillId: "demo-drill" // ADDED to fix missing prop error
                        , playerId: mockUser.uid, onSubmit: (feedback) => console.log('Feedback submitted:', feedback) })))),
            currentView === 'analytics' && (react_1.default.createElement(CoachDashboard, { teamId: mockUser.teamId })),
            currentView === 'notifications' && (react_1.default.createElement(NotificationCenter, { userId: mockUser.uid, userRole: userRole })))));
};
exports.default = CoachCoreAIComplete;
