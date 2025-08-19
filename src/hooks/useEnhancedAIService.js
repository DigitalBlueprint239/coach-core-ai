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
exports.AIErrorMessage = exports.AIErrorBoundary = exports.useEnhancedAIService = void 0;
// src/hooks/useEnhancedAIService.ts
const react_1 = require("react");
const ai_service_enhanced_1 = require("../services/ai-service-enhanced");
// ============================================
// ENHANCED AI SERVICE HOOK
// ============================================
const useEnhancedAIService = (config) => {
    const [state, setState] = (0, react_1.useState)({
        loading: false,
        error: null,
        lastResponse: null,
        metrics: null,
        alerts: []
    });
    const serviceRef = (0, react_1.useRef)(null);
    const retryTimeoutRef = (0, react_1.useRef)(null);
    // Initialize service
    (0, react_1.useEffect)(() => {
        serviceRef.current = new ai_service_enhanced_1.EnhancedAIService(config);
        // Set up metrics polling
        const metricsInterval = setInterval(() => {
            if (serviceRef.current) {
                const metrics = serviceRef.current.getMetrics();
                const alerts = serviceRef.current.getAlerts();
                setState(prev => (Object.assign(Object.assign({}, prev), { metrics, alerts })));
            }
        }, 30000); // Update every 30 seconds
        return () => {
            clearInterval(metricsInterval);
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, [config]);
    // ============================================
    // ERROR HANDLING UTILITIES
    // ============================================
    const handleError = (0, react_1.useCallback)((error, operation) => {
        let aiError;
        if (error instanceof ai_service_enhanced_1.AIError) {
            aiError = error;
        }
        else if (error instanceof ai_service_enhanced_1.RateLimitError) {
            aiError = error;
            // Set up retry for rate limit errors
            if (error.retryAfter) {
                retryTimeoutRef.current = setTimeout(() => {
                    setState(prev => (Object.assign(Object.assign({}, prev), { error: null })));
                }, error.retryAfter * 1000);
            }
        }
        else if (error instanceof ai_service_enhanced_1.QuotaError) {
            aiError = error;
        }
        else if (error instanceof ai_service_enhanced_1.SecurityError) {
            aiError = error;
        }
        else {
            aiError = new ai_service_enhanced_1.AIError(error instanceof Error ? error.message : 'Unknown error occurred', 'UNKNOWN', undefined, false);
        }
        console.error(`AI Service Error in ${operation}:`, aiError);
        setState(prev => (Object.assign(Object.assign({}, prev), { error: aiError })));
        return aiError;
    }, []);
    const createRequestHandler = (0, react_1.useCallback)((operation, handler) => {
        return (...args) => __awaiter(void 0, void 0, void 0, function* () {
            setState(prev => (Object.assign(Object.assign({}, prev), { loading: true, error: null })));
            try {
                const result = yield handler(...args);
                setState(prev => (Object.assign(Object.assign({}, prev), { loading: false, lastResponse: result, error: null })));
                return result;
            }
            catch (error) {
                const aiError = handleError(error, operation);
                setState(prev => (Object.assign(Object.assign({}, prev), { loading: false })));
                throw aiError;
            }
        });
    }, [handleError]);
    // ============================================
    // AI OPERATIONS
    // ============================================
    const generatePracticePlan = (0, react_1.useCallback)((params) => __awaiter(void 0, void 0, void 0, function* () {
        if (!serviceRef.current) {
            throw new Error('AI service not initialized');
        }
        return createRequestHandler('generatePracticePlan', serviceRef.current.generatePracticePlan.bind(serviceRef.current))(params.teamContext, params.goals, params.duration, params.constraints, params.userId);
    }), [createRequestHandler]);
    const generatePlaySuggestion = (0, react_1.useCallback)((params) => __awaiter(void 0, void 0, void 0, function* () {
        if (!serviceRef.current) {
            throw new Error('AI service not initialized');
        }
        // This would need to be implemented in the service
        return createRequestHandler('generatePlaySuggestion', (gameContext, teamContext, playerContext, userId) => __awaiter(void 0, void 0, void 0, function* () {
            // Placeholder implementation
            throw new Error('Not implemented yet');
        }))(params.gameContext, params.teamContext, params.playerContext, params.userId);
    }), [createRequestHandler]);
    const analyzeTeamPerformance = (0, react_1.useCallback)((params) => __awaiter(void 0, void 0, void 0, function* () {
        if (!serviceRef.current) {
            throw new Error('AI service not initialized');
        }
        // This would need to be implemented in the service
        return createRequestHandler('analyzeTeamPerformance', (teamContext, performanceData, timeRange, userId) => __awaiter(void 0, void 0, void 0, function* () {
            // Placeholder implementation
            throw new Error('Not implemented yet');
        }))(params.teamContext, params.performanceData, params.timeRange, params.userId);
    }), [createRequestHandler]);
    const generateDrillSuggestions = (0, react_1.useCallback)((params) => __awaiter(void 0, void 0, void 0, function* () {
        if (!serviceRef.current) {
            throw new Error('AI service not initialized');
        }
        // This would need to be implemented in the service
        return createRequestHandler('generateDrillSuggestions', (teamContext, focusAreas, duration, skillLevel, userId) => __awaiter(void 0, void 0, void 0, function* () {
            // Placeholder implementation
            throw new Error('Not implemented yet');
        }))(params.teamContext, params.focusAreas, params.duration, params.skillLevel, params.userId);
    }), [createRequestHandler]);
    const processConversation = (0, react_1.useCallback)((params) => __awaiter(void 0, void 0, void 0, function* () {
        if (!serviceRef.current) {
            throw new Error('AI service not initialized');
        }
        // This would need to be implemented in the service
        return createRequestHandler('processConversation', (message, conversationHistory, userContext, teamContext, userId) => __awaiter(void 0, void 0, void 0, function* () {
            // Placeholder implementation
            throw new Error('Not implemented yet');
        }))(params.message, params.conversationHistory, params.userContext, params.teamContext, params.userId);
    }), [createRequestHandler]);
    const validateSafety = (0, react_1.useCallback)((params) => __awaiter(void 0, void 0, void 0, function* () {
        if (!serviceRef.current) {
            throw new Error('AI service not initialized');
        }
        // This would need to be implemented in the service
        return createRequestHandler('validateSafety', (suggestion, teamContext, ageGroup, userId) => __awaiter(void 0, void 0, void 0, function* () {
            // Placeholder implementation
            throw new Error('Not implemented yet');
        }))(params.suggestion, params.teamContext, params.ageGroup, params.userId);
    }), [createRequestHandler]);
    // ============================================
    // UTILITY METHODS
    // ============================================
    const clearError = (0, react_1.useCallback)(() => {
        setState(prev => (Object.assign(Object.assign({}, prev), { error: null })));
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }
    }, []);
    const clearCache = (0, react_1.useCallback)(() => {
        if (serviceRef.current) {
            serviceRef.current.clearCache();
        }
    }, []);
    const getCacheStats = (0, react_1.useCallback)(() => {
        if (serviceRef.current) {
            return serviceRef.current.getCacheStats();
        }
        return { size: 0, keys: [] };
    }, []);
    const getUserQuota = (0, react_1.useCallback)((userId) => {
        if (serviceRef.current) {
            return serviceRef.current.getUserQuota(userId);
        }
        return undefined;
    }, []);
    const resetUserQuota = (0, react_1.useCallback)((userId) => {
        if (serviceRef.current) {
            serviceRef.current.resetUserQuota(userId);
        }
    }, []);
    // ============================================
    // RETURN OBJECT
    // ============================================
    const actions = {
        generatePracticePlan,
        generatePlaySuggestion,
        analyzeTeamPerformance,
        generateDrillSuggestions,
        processConversation,
        validateSafety,
        clearError,
        clearCache,
        getCacheStats,
        getUserQuota,
        resetUserQuota
    };
    return Object.assign(Object.assign({}, state), actions);
};
exports.useEnhancedAIService = useEnhancedAIService;
// ============================================
// ERROR BOUNDARY COMPONENT
// ============================================
const react_2 = __importStar(require("react"));
class AIErrorBoundary extends react_2.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('AI Error Boundary caught an error:', error, errorInfo);
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }
    render() {
        var _a;
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (react_2.default.createElement("div", { className: "p-4 bg-red-50 border border-red-200 rounded-lg" },
                react_2.default.createElement("h2", { className: "text-lg font-semibold text-red-900 mb-2" }, "AI Service Error"),
                react_2.default.createElement("p", { className: "text-red-800 mb-4" }, ((_a = this.state.error) === null || _a === void 0 ? void 0 : _a.message) || 'An unexpected error occurred with the AI service.'),
                react_2.default.createElement("button", { onClick: () => this.setState({ hasError: false, error: null }), className: "px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700" }, "Try Again")));
        }
        return this.props.children;
    }
}
exports.AIErrorBoundary = AIErrorBoundary;
const AIErrorMessage = ({ error, onRetry, onDismiss }) => {
    const getErrorIcon = () => {
        switch (error.type) {
            case 'RATE_LIMIT':
                return '⏰';
            case 'QUOTA_EXCEEDED':
                return '💰';
            case 'SECURITY':
                return '🔒';
            case 'NETWORK':
                return '🌐';
            default:
                return '⚠️';
        }
    };
    const getErrorColor = () => {
        switch (error.type) {
            case 'RATE_LIMIT':
                return 'bg-yellow-50 border-yellow-200 text-yellow-900';
            case 'QUOTA_EXCEEDED':
                return 'bg-red-50 border-red-200 text-red-900';
            case 'SECURITY':
                return 'bg-red-50 border-red-200 text-red-900';
            case 'NETWORK':
                return 'bg-blue-50 border-blue-200 text-blue-900';
            default:
                return 'bg-gray-50 border-gray-200 text-gray-900';
        }
    };
    return (react_2.default.createElement("div", { className: `p-4 border rounded-lg ${getErrorColor()}` },
        react_2.default.createElement("div", { className: "flex items-start" },
            react_2.default.createElement("div", { className: "flex-shrink-0 text-xl mr-3" }, getErrorIcon()),
            react_2.default.createElement("div", { className: "flex-1" },
                react_2.default.createElement("h3", { className: "font-semibold mb-1" },
                    error.type === 'RATE_LIMIT' && 'Rate Limit Exceeded',
                    error.type === 'QUOTA_EXCEEDED' && 'Quota Exceeded',
                    error.type === 'SECURITY' && 'Security Violation',
                    error.type === 'NETWORK' && 'Network Error',
                    error.type === 'API' && 'API Error',
                    error.type === 'UNKNOWN' && 'Unknown Error'),
                react_2.default.createElement("p", { className: "text-sm mb-3" }, error.message),
                react_2.default.createElement("div", { className: "flex space-x-2" },
                    onRetry && error.retryable && (react_2.default.createElement("button", { onClick: onRetry, className: "px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700" }, "Retry")),
                    onDismiss && (react_2.default.createElement("button", { onClick: onDismiss, className: "px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700" }, "Dismiss")))))));
};
exports.AIErrorMessage = AIErrorMessage;
