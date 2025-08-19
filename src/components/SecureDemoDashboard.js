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
// src/components/SecureDemoDashboard.tsx
const react_1 = __importStar(require("react"));
const useAuth_1 = require("../hooks/useAuth");
const TeamContext_1 = require("../contexts/TeamContext");
const ConsentManager_1 = require("../security/ConsentManager");
const PrivacyManager_1 = require("../security/PrivacyManager");
const DataAnonymizer_1 = require("../security/DataAnonymizer");
const AuditLogger_1 = require("../security/AuditLogger");
const SecureDemoDashboard = () => {
    const { user } = (0, useAuth_1.useAuth)();
    const { currentTeam } = (0, TeamContext_1.useTeam)();
    const [consent, setConsent] = (0, react_1.useState)(null);
    const [privacy, setPrivacy] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [demoData, setDemoData] = (0, react_1.useState)({
        practicePlans: [],
        teamStats: {},
        aiInsights: []
    });
    // Load user consent and privacy settings
    (0, react_1.useEffect)(() => {
        const loadUserSettings = () => __awaiter(void 0, void 0, void 0, function* () {
            if (!(user === null || user === void 0 ? void 0 : user.uid))
                return;
            try {
                const [consentSettings, privacySettings] = yield Promise.all([
                    ConsentManager_1.ConsentManager.getConsent(user.uid),
                    PrivacyManager_1.PrivacyManager.getPrivacySettings(user.uid)
                ]);
                setConsent(consentSettings);
                setPrivacy(privacySettings);
            }
            catch (error) {
                console.error('Error loading user settings:', error);
            }
            finally {
                setLoading(false);
            }
        });
        loadUserSettings();
    }, [user]);
    // Handle consent updates
    const handleConsentUpdate = (consentType, newValue, reason) => __awaiter(void 0, void 0, void 0, function* () {
        if (!(user === null || user === void 0 ? void 0 : user.uid))
            return;
        const success = yield ConsentManager_1.ConsentManager.updateConsent(user.uid, consentType, newValue, reason, {
            ipAddress: 'demo_ip',
            userAgent: navigator.userAgent
        });
        if (success) {
            setConsent(prev => prev ? Object.assign(Object.assign({}, prev), { [consentType]: newValue }) : null);
            // Log the consent change
            yield AuditLogger_1.AuditLogger.logPrivacyEvent(user.uid, 'consent_updated', {
                consentType,
                newValue,
                reason
            });
        }
    });
    // Handle privacy setting updates
    const handlePrivacyUpdate = (updates) => __awaiter(void 0, void 0, void 0, function* () {
        if (!(user === null || user === void 0 ? void 0 : user.uid))
            return;
        const success = yield PrivacyManager_1.PrivacyManager.updatePrivacySettings(user.uid, updates);
        if (success) {
            setPrivacy(prev => prev ? Object.assign(Object.assign({}, prev), updates) : null);
            // Log the privacy change
            yield AuditLogger_1.AuditLogger.logPrivacyEvent(user.uid, 'privacy_updated', updates);
        }
    });
    // Secure data collection for AI training
    const collectSecureData = (action, data) => __awaiter(void 0, void 0, void 0, function* () {
        if (!(user === null || user === void 0 ? void 0 : user.uid) || !(consent === null || consent === void 0 ? void 0 : consent.aiTraining) || consent.aiTraining !== 'granted') {
            console.log('AI training consent not granted');
            return;
        }
        try {
            // Anonymize data before collection
            const anonymizedData = yield DataAnonymizer_1.DataAnonymizer.anonymize(data, action, 'high');
            // Store anonymized data for AI training
            console.log('Anonymized data collected for AI training:', anonymizedData);
            // Log the data collection
            yield AuditLogger_1.AuditLogger.logAITrainingEvent(user.uid, action, { originalDataSize: JSON.stringify(data).length }, true);
        }
        catch (error) {
            console.error('Error collecting secure data:', error);
        }
    });
    const handlePracticePlanCreate = (plan) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        if (!(user === null || user === void 0 ? void 0 : user.uid))
            return;
        // Log the action
        yield AuditLogger_1.AuditLogger.logAuditEvent(user.uid, 'practice_plan_created', 'practice_plans', { planName: plan.name, duration: plan.duration }, 'low', 'success');
        // Collect anonymized data for AI training (if consented)
        yield collectSecureData('practice_plan_created', {
            sport: currentTeam === null || currentTeam === void 0 ? void 0 : currentTeam.sport,
            level: currentTeam === null || currentTeam === void 0 ? void 0 : currentTeam.level,
            planStructure: plan.periods,
            drillTypes: ((_a = plan.drills) === null || _a === void 0 ? void 0 : _a.map((d) => d.category)) || [],
            duration: plan.duration
        });
        // Update demo data
        setDemoData(prev => (Object.assign(Object.assign({}, prev), { practicePlans: [...prev.practicePlans, plan] })));
    });
    const handleTeamManagement = (action, data) => __awaiter(void 0, void 0, void 0, function* () {
        if (!(user === null || user === void 0 ? void 0 : user.uid))
            return;
        // Log the action
        yield AuditLogger_1.AuditLogger.logAuditEvent(user.uid, `team_${action}`, 'team_management', { action, dataType: typeof data }, 'low', 'success');
        // Collect anonymized data for analytics (if consented)
        if ((consent === null || consent === void 0 ? void 0 : consent.analytics) === 'granted') {
            yield collectSecureData('team_management', {
                action,
                sport: currentTeam === null || currentTeam === void 0 ? void 0 : currentTeam.sport,
                level: currentTeam === null || currentTeam === void 0 ? void 0 : currentTeam.level
            });
        }
    });
    const handlePlaybookAction = (action, data) => __awaiter(void 0, void 0, void 0, function* () {
        if (!(user === null || user === void 0 ? void 0 : user.uid))
            return;
        // Log the action
        yield AuditLogger_1.AuditLogger.logAuditEvent(user.uid, `playbook_${action}`, 'playbook', { action, playType: data.type }, 'low', 'success');
        // Collect anonymized data for AI training (if consented)
        yield collectSecureData('playbook_action', {
            action,
            sport: currentTeam === null || currentTeam === void 0 ? void 0 : currentTeam.sport,
            level: currentTeam === null || currentTeam === void 0 ? void 0 : currentTeam.level,
            playType: data.type,
            formation: data.formation
        });
    });
    if (loading) {
        return (react_1.default.createElement("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center" },
            react_1.default.createElement("div", { className: "text-center" },
                react_1.default.createElement("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" }),
                react_1.default.createElement("p", { className: "text-gray-600" }, "Loading secure demo..."))));
    }
    return (react_1.default.createElement("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8" },
        react_1.default.createElement("div", { className: "max-w-6xl mx-auto" },
            react_1.default.createElement("div", { className: "text-center mb-12" },
                react_1.default.createElement("div", { className: "flex items-center justify-center space-x-3 mb-6" },
                    react_1.default.createElement("div", { className: "w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center" },
                        react_1.default.createElement("span", { className: "text-3xl" })),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h1", { className: "text-4xl font-bold text-gray-900" }, "Coach Core AI"),
                        react_1.default.createElement("p", { className: "text-xl text-gray-600" }, "Secure Demo with Privacy Protection"))),
                react_1.default.createElement("p", { className: "text-lg text-gray-600 max-w-2xl mx-auto" }, "Experience the future of sports coaching with enterprise-grade security, privacy protection, and AI-powered features.")),
            react_1.default.createElement("div", { className: "bg-white rounded-xl shadow-lg p-6 mb-8" },
                react_1.default.createElement("h2", { className: "text-2xl font-bold text-gray-900 mb-4" }, "Privacy & Data Collection Settings"),
                react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6" },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900 mb-3" }, "Consent Management"),
                        react_1.default.createElement("div", { className: "space-y-3" }, consent && Object.entries(consent).filter(([key]) => !key.includes('LastUpdated') && !key.includes('Reason')).map(([key, value]) => (react_1.default.createElement("div", { key: key, className: "flex items-center justify-between" },
                            react_1.default.createElement("span", { className: "text-sm text-gray-600 capitalize" }, key.replace(/([A-Z])/g, ' $1').trim()),
                            react_1.default.createElement("div", { className: "flex space-x-2" },
                                react_1.default.createElement("button", { onClick: () => handleConsentUpdate(key, 'granted', 'User granted consent'), className: `px-3 py-1 text-xs rounded ${value === 'granted'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}` }, "Grant"),
                                react_1.default.createElement("button", { onClick: () => handleConsentUpdate(key, 'denied', 'User denied consent'), className: `px-3 py-1 text-xs rounded ${value === 'denied'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}` }, "Deny"))))))),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900 mb-3" }, "Privacy Settings"),
                        react_1.default.createElement("div", { className: "space-y-3" }, privacy && Object.entries(privacy).slice(0, 6).map(([key, value]) => (react_1.default.createElement("div", { key: key, className: "flex items-center justify-between" },
                            react_1.default.createElement("span", { className: "text-sm text-gray-600 capitalize" }, key.replace(/([A-Z])/g, ' $1').trim()),
                            react_1.default.createElement("button", { onClick: () => handlePrivacyUpdate({ [key]: !value }), className: `px-3 py-1 text-xs rounded ${value
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}` }, value ? 'Enabled' : 'Disabled'))))))),
                react_1.default.createElement("div", { className: "mt-6 p-4 bg-blue-50 rounded-lg" },
                    react_1.default.createElement("h3", { className: "font-semibold text-blue-900 mb-2" }, "Security Status"),
                    react_1.default.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 text-sm" },
                        react_1.default.createElement("div", { className: "flex items-center" },
                            react_1.default.createElement("div", { className: "w-2 h-2 bg-green-500 rounded-full mr-2" }),
                            react_1.default.createElement("span", null, "Data Anonymization")),
                        react_1.default.createElement("div", { className: "flex items-center" },
                            react_1.default.createElement("div", { className: "w-2 h-2 bg-green-500 rounded-full mr-2" }),
                            react_1.default.createElement("span", null, "Consent Management")),
                        react_1.default.createElement("div", { className: "flex items-center" },
                            react_1.default.createElement("div", { className: "w-2 h-2 bg-green-500 rounded-full mr-2" }),
                            react_1.default.createElement("span", null, "Audit Logging")),
                        react_1.default.createElement("div", { className: "flex items-center" },
                            react_1.default.createElement("div", { className: "w-2 h-2 bg-green-500 rounded-full mr-2" }),
                            react_1.default.createElement("span", null, "Privacy Compliance"))))),
            react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12" },
                react_1.default.createElement("div", { className: "bg-white rounded-xl shadow-lg p-6" },
                    react_1.default.createElement("div", { className: "flex items-center space-x-4 mb-4" },
                        react_1.default.createElement("div", { className: "w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center" },
                            react_1.default.createElement("span", { className: "text-2xl" }, "\uD83D\uDCCB")),
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900" }, "AI Practice Planner"),
                            react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Generate intelligent practice plans"))),
                    react_1.default.createElement("button", { onClick: () => handlePracticePlanCreate({
                            name: 'Demo Practice Plan',
                            duration: 90,
                            periods: [
                                { name: 'Warm-up', duration: 15, drills: [] },
                                { name: 'Skill Development', duration: 45, drills: [] },
                                { name: 'Cool-down', duration: 15, drills: [] }
                            ]
                        }), className: "w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700" }, "Create Practice Plan")),
                react_1.default.createElement("div", { className: "bg-white rounded-xl shadow-lg p-6" },
                    react_1.default.createElement("div", { className: "flex items-center space-x-4 mb-4" },
                        react_1.default.createElement("div", { className: "w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center" },
                            react_1.default.createElement("span", { className: "text-2xl" }, "\uD83D\uDC65")),
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900" }, "Team Management"),
                            react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Manage player rosters securely"))),
                    react_1.default.createElement("button", { onClick: () => handleTeamManagement('player_added', { playerName: 'Demo Player' }), className: "w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700" }, "Add Player")),
                react_1.default.createElement("div", { className: "bg-white rounded-xl shadow-lg p-6" },
                    react_1.default.createElement("div", { className: "flex items-center space-x-4 mb-4" },
                        react_1.default.createElement("div", { className: "w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center" },
                            react_1.default.createElement("span", { className: "text-2xl" }, "\uD83C\uDFC8")),
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900" }, "Smart Playbook"),
                            react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Design plays with AI assistance"))),
                    react_1.default.createElement("button", { onClick: () => handlePlaybookAction('play_created', {
                            type: 'pass',
                            formation: 'shotgun'
                        }), className: "w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700" }, "Create Play")),
                react_1.default.createElement("div", { className: "bg-white rounded-xl shadow-lg p-6" },
                    react_1.default.createElement("div", { className: "flex items-center space-x-4 mb-4" },
                        react_1.default.createElement("div", { className: "w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center" },
                            react_1.default.createElement("span", { className: "text-2xl" }, "\uD83D\uDCC8")),
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900" }, "Analytics"),
                            react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Track performance metrics"))),
                    react_1.default.createElement("button", { onClick: () => handleTeamManagement('analytics_viewed', { metrics: 'performance' }), className: "w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700" }, "View Analytics")),
                react_1.default.createElement("div", { className: "bg-white rounded-xl shadow-lg p-6" },
                    react_1.default.createElement("div", { className: "flex items-center space-x-4 mb-4" },
                        react_1.default.createElement("div", { className: "w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center" },
                            react_1.default.createElement("span", { className: "text-2xl" }, "\u26BD")),
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900" }, "Drill Library"),
                            react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Browse coaching drills"))),
                    react_1.default.createElement("button", { onClick: () => handleTeamManagement('drill_viewed', { drillType: 'passing' }), className: "w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700" }, "Browse Drills")),
                react_1.default.createElement("div", { className: "bg-white rounded-xl shadow-lg p-6" },
                    react_1.default.createElement("div", { className: "flex items-center space-x-4 mb-4" },
                        react_1.default.createElement("div", { className: "w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center" },
                            react_1.default.createElement("span", { className: "text-2xl" }, "\uD83E\uDD16")),
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900" }, "AI Assistant"),
                            react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Get coaching advice"))),
                    react_1.default.createElement("button", { onClick: () => handleTeamManagement('ai_consulted', { question: 'practice tips' }), className: "w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700" }, "Ask AI"))),
            react_1.default.createElement("div", { className: "bg-white rounded-xl shadow-lg p-8" },
                react_1.default.createElement("h2", { className: "text-2xl font-bold text-gray-900 mb-4" }, "Demo Data Summary"),
                react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6" },
                    react_1.default.createElement("div", { className: "text-center" },
                        react_1.default.createElement("div", { className: "text-3xl font-bold text-blue-600 mb-2" }, demoData.practicePlans.length),
                        react_1.default.createElement("div", { className: "text-gray-600" }, "Practice Plans Created")),
                    react_1.default.createElement("div", { className: "text-center" },
                        react_1.default.createElement("div", { className: "text-3xl font-bold text-green-600 mb-2" }, (consent === null || consent === void 0 ? void 0 : consent.aiTraining) === 'granted' ? '✅' : '❌'),
                        react_1.default.createElement("div", { className: "text-gray-600" }, "AI Training Consent")),
                    react_1.default.createElement("div", { className: "text-center" },
                        react_1.default.createElement("div", { className: "text-3xl font-bold text-purple-600 mb-2" }, (privacy === null || privacy === void 0 ? void 0 : privacy.allowDataCollection) ? '✅' : '❌'),
                        react_1.default.createElement("div", { className: "text-gray-600" }, "Data Collection Enabled")))))));
};
