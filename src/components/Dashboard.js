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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const useAuth_1 = require("../hooks/useAuth");
const TeamContext_1 = require("../contexts/TeamContext");
const index_1 = require("./index");
const PracticePlanner_1 = __importDefault(require("../features/practice-planner/PracticePlanner"));
const SmartPlaybook_1 = __importDefault(require("./SmartPlaybook/SmartPlaybook"));
const featureGating_1 = require("../utils/featureGating");
const football_1 = require("../types/football");
// TODO: Fix import path for AnalyticsDashboard if file exists
// import AnalyticsDashboard from '../features/analytics/AnalyticsDashboard';
const Dashboard = () => {
    const { user, loading: authLoading } = (0, useAuth_1.useAuth)();
    const { currentTeam } = (0, TeamContext_1.useTeam)();
    const { showSuccess } = (0, index_1.useToast)();
    const [activeTab, setActiveTab] = (0, react_1.useState)('overview');
    // Get team level for feature gating
    const teamLevel = (currentTeam === null || currentTeam === void 0 ? void 0 : currentTeam.level) || football_1.FootballLevel.VARSITY;
    const { canAccess, availableFeatures, isYouth, isAdvanced } = (0, featureGating_1.useFeatureGating)(teamLevel);
    if (authLoading) {
        return react_1.default.createElement(index_1.LoadingSpinner, { text: "Loading your coaching dashboard..." });
    }
    if (!user) {
        return (react_1.default.createElement("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center" },
            react_1.default.createElement("div", { className: "bg-white p-8 rounded-xl shadow-2xl max-w-md w-full" },
                react_1.default.createElement("h1", { className: "text-3xl font-bold text-center text-gray-900 mb-6" }, "Coach Core AI"),
                react_1.default.createElement("p", { className: "text-gray-600 text-center mb-8" }, "The ultimate sports coaching platform. Sign in to get started."),
                react_1.default.createElement("button", { onClick: () => showSuccess('Authentication coming soon!'), className: "w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors" }, "Sign In"))));
    }
    // Filter tabs based on available features
    const allTabs = [
        { id: 'overview', name: 'Overview', icon: '📊', feature: 'team_dashboard' },
        { id: 'teams', name: 'Teams', icon: '👥', feature: 'roster_management' },
        { id: 'practice', name: 'Practice Plans', icon: '📋', feature: 'practice_plans' },
        { id: 'playbook', name: 'Smart Playbook', icon: '🏈', feature: 'basic_plays' },
        { id: 'analytics', name: 'Analytics', icon: '📈', feature: 'basic_analytics' },
    ];
    const availableTabs = allTabs.filter(tab => canAccess(tab.feature));
    return (react_1.default.createElement("div", { className: "min-h-screen bg-gray-50" },
        react_1.default.createElement("header", { className: "bg-white shadow-sm border-b" },
            react_1.default.createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" },
                react_1.default.createElement("div", { className: "flex justify-between items-center py-4" },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h1", { className: "text-2xl font-bold text-gray-900" }, "Coach Core AI Dashboard"),
                        react_1.default.createElement("p", { className: "text-sm text-gray-600" }, currentTeam ? `${currentTeam.name} - ${teamLevel}` : 'No team selected')),
                    react_1.default.createElement("div", { className: "flex items-center space-x-2" },
                        react_1.default.createElement("span", { className: "px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium" }, isYouth ? 'Youth Level' : isAdvanced ? 'Advanced Level' : 'Standard Level'))),
                react_1.default.createElement("nav", { className: "flex space-x-8" }, availableTabs.map((tab) => (react_1.default.createElement("button", { key: tab.id, onClick: () => setActiveTab(tab.id), className: `py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}` },
                    react_1.default.createElement("span", { className: "mr-2" }, tab.icon),
                    tab.name)))))),
        react_1.default.createElement("main", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" },
            activeTab === 'overview' && (react_1.default.createElement("div", null,
                react_1.default.createElement("div", { className: "mb-8" },
                    react_1.default.createElement("h2", { className: "text-xl font-semibold text-gray-900 mb-4" },
                        "Welcome back, ",
                        user.displayName || 'Coach',
                        "!"),
                    isYouth && (react_1.default.createElement("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6" },
                        react_1.default.createElement("h3", { className: "font-medium text-blue-900 mb-2" }, "Youth Coaching Focus"),
                        react_1.default.createElement("p", { className: "text-blue-700 text-sm" }, "Your dashboard is optimized for youth development with safety tracking, parent communication, and age-appropriate activities."))),
                    isAdvanced && (react_1.default.createElement("div", { className: "bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6" },
                        react_1.default.createElement("h3", { className: "font-medium text-purple-900 mb-2" }, "Advanced Coaching Tools"),
                        react_1.default.createElement("p", { className: "text-purple-700 text-sm" }, "Access to advanced analytics, video analysis, and professional-grade play design tools.")))),
                react_1.default.createElement("div", { className: "mt-8" },
                    react_1.default.createElement("h2", { className: "text-lg font-medium text-gray-900 mb-4" }, "Quick Actions"),
                    react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" },
                        canAccess('roster_management') && (react_1.default.createElement("button", { onClick: () => setActiveTab('teams'), className: "bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors" },
                            react_1.default.createElement("div", { className: "text-2xl mb-2" }, "\uD83D\uDC65"),
                            react_1.default.createElement("div", { className: "font-medium" }, "Manage Teams"),
                            react_1.default.createElement("div", { className: "text-sm opacity-90" }, "Create or join teams"))),
                        canAccess('practice_plans') && (react_1.default.createElement("button", { onClick: () => setActiveTab('practice'), className: "bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors" },
                            react_1.default.createElement("div", { className: "text-2xl mb-2" }, "\uD83D\uDCCB"),
                            react_1.default.createElement("div", { className: "font-medium" }, "Create Practice Plan"),
                            react_1.default.createElement("div", { className: "text-sm opacity-90" }, "AI-powered planning"))),
                        canAccess('basic_plays') && (react_1.default.createElement("button", { onClick: () => setActiveTab('playbook'), className: "bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors" },
                            react_1.default.createElement("div", { className: "text-2xl mb-2" }, "\uD83C\uDFC8"),
                            react_1.default.createElement("div", { className: "font-medium" }, "Smart Playbook"),
                            react_1.default.createElement("div", { className: "text-sm opacity-90" }, isYouth ? 'Design simple plays' : 'Design advanced plays'))))),
                availableFeatures.length < allTabs.length && (react_1.default.createElement("div", { className: "mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4" },
                    react_1.default.createElement("h3", { className: "font-medium text-yellow-900 mb-2" }, "Feature Availability"),
                    react_1.default.createElement("p", { className: "text-yellow-700 text-sm" },
                        "Some features are not available at your current level.",
                        isYouth ? ' Upgrade to access advanced tools.' : ' Contact your administrator for access.'))))),
            activeTab === 'teams' && canAccess('roster_management') && (react_1.default.createElement("div", null,
                react_1.default.createElement("h2", { className: "text-xl font-semibold text-gray-900 mb-4" }, "Team Management"),
                react_1.default.createElement("p", { className: "text-gray-600" }, "Team management features coming soon!"))),
            activeTab === 'practice' && canAccess('practice_plans') && (react_1.default.createElement(PracticePlanner_1.default, null)),
            activeTab === 'playbook' && canAccess('basic_plays') && (react_1.default.createElement(SmartPlaybook_1.default, { teamLevel: teamLevel })),
            activeTab === 'analytics' && canAccess('basic_analytics') && (react_1.default.createElement("div", null,
                react_1.default.createElement("h2", { className: "text-xl font-semibold text-gray-900 mb-4" }, "Analytics Dashboard"),
                react_1.default.createElement("p", { className: "text-gray-600" }, "Analytics features coming soon!"))),
            (() => {
                var _a;
                const feature = (_a = allTabs.find(tab => tab.id === activeTab)) === null || _a === void 0 ? void 0 : _a.feature;
                return feature && !canAccess(feature) ? (react_1.default.createElement("div", { className: "bg-gray-50 border border-gray-200 rounded-lg p-8 text-center" },
                    react_1.default.createElement("h3", { className: "text-lg font-medium text-gray-900 mb-2" }, "Feature Not Available"),
                    react_1.default.createElement("p", { className: "text-gray-600" },
                        "This feature is not available at your current level (",
                        teamLevel,
                        ")."))) : null;
            })())));
};
exports.default = Dashboard;
