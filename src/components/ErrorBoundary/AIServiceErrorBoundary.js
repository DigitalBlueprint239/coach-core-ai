"use strict";
/**
 * AI Service Error Boundary
 *
 * Specialized error boundary for AI-related components:
 * - PracticePlanner (AI service failures)
 * - OpenAI API errors
 * - AI model failures
 * - Network timeouts
 * - Rate limiting
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIServiceErrorBoundary = void 0;
const react_1 = __importStar(require("react"));
const BaseErrorBoundary_1 = __importDefault(require("./BaseErrorBoundary"));
const BaseErrorBoundary_2 = require("./BaseErrorBoundary");
class AIServiceErrorBoundary extends react_1.Component {
    constructor(props) {
        super(props);
        this.retryBackoffTimeout = null;
        this.serviceCheckInterval = null;
        this.handleAIServiceReset = () => {
            this.setState({
                serviceStatus: 'online',
                lastErrorType: 'unknown',
                fallbackMode: false,
                hasError: false,
                error: null,
                errorInfo: null
            });
            if (this.props.onAIServiceReset) {
                this.props.onAIServiceReset();
            }
        };
        this.handleFallbackMode = () => {
            this.setState({ fallbackMode: true });
            if (this.props.onFallbackMode) {
                this.props.onFallbackMode();
            }
        };
        this.handleRetryWithBackoff = () => {
            if (!this.props.retryWithBackoff) {
                this.handleRetry();
                return;
            }
            const { retryCount } = this.state;
            const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
            this.retryBackoffTimeout = setTimeout(() => {
                this.handleRetry();
            }, backoffDelay);
        };
        this.state = Object.assign(Object.assign({}, this.state), { serviceStatus: 'online', lastErrorType: 'unknown', fallbackMode: false });
    }
    componentDidMount() {
        // Start service health check
        this.startServiceHealthCheck();
    }
    componentWillUnmount() {
        if (this.retryBackoffTimeout) {
            clearTimeout(this.retryBackoffTimeout);
        }
        if (this.serviceCheckInterval) {
            clearInterval(this.serviceCheckInterval);
        }
    }
    componentDidCatch(error, errorInfo) {
        // Determine error type
        const errorType = this.classifyAIError(error);
        this.setState({
            lastErrorType: errorType,
            serviceStatus: this.determineServiceStatus(errorType)
        });
        // Handle rate limiting
        if (errorType === 'rate_limit') {
            this.handleRateLimitError(error);
        }
        // Handle network errors
        if ((0, BaseErrorBoundary_2.isNetworkError)(error)) {
            this.setState({ serviceStatus: 'offline' });
        }
        // Call parent error handler
        super.componentDidCatch(error, errorInfo);
    }
    classifyAIError(error) {
        const message = error.message.toLowerCase();
        if (message.includes('rate limit') || message.includes('429')) {
            return 'rate_limit';
        }
        if (message.includes('api key') || message.includes('authentication')) {
            return 'api';
        }
        if (message.includes('model') || message.includes('gpt') || message.includes('openai')) {
            return 'model';
        }
        if ((0, BaseErrorBoundary_2.isNetworkError)(error)) {
            return 'network';
        }
        return 'unknown';
    }
    determineServiceStatus(errorType) {
        switch (errorType) {
            case 'rate_limit':
                return 'degraded';
            case 'network':
                return 'offline';
            case 'api':
                return 'offline';
            case 'model':
                return 'degraded';
            default:
                return 'degraded';
        }
    }
    handleRateLimitError(error) {
        // Extract rate limit information from error message
        const message = error.message;
        const resetMatch = message.match(/reset.*?(\d+)/i);
        const limitMatch = message.match(/limit.*?(\d+)/i);
        const remainingMatch = message.match(/remaining.*?(\d+)/i);
        if (resetMatch || limitMatch || remainingMatch) {
            this.setState({
                rateLimitInfo: {
                    resetTime: resetMatch ? parseInt(resetMatch[1]) * 1000 : Date.now() + 60000,
                    limit: limitMatch ? parseInt(limitMatch[1]) : 0,
                    remaining: remainingMatch ? parseInt(remainingMatch[1]) : 0
                }
            });
        }
    }
    startServiceHealthCheck() {
        this.serviceCheckInterval = setInterval(() => {
            this.checkServiceHealth();
        }, 30000); // Check every 30 seconds
    }
    checkServiceHealth() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch('/api/health', {
                    method: 'GET',
                    timeout: 5000
                });
                if (response.ok) {
                    this.setState({ serviceStatus: 'online' });
                }
                else {
                    this.setState({ serviceStatus: 'degraded' });
                }
            }
            catch (error) {
                this.setState({ serviceStatus: 'offline' });
            }
        });
    }
    getErrorMessage() {
        const { lastErrorType, serviceStatus, rateLimitInfo } = this.state;
        switch (lastErrorType) {
            case 'rate_limit':
                if (rateLimitInfo) {
                    const resetTime = new Date(rateLimitInfo.resetTime).toLocaleTimeString();
                    return `Rate limit exceeded. Please try again after ${resetTime}.`;
                }
                return 'Too many requests. Please wait a moment and try again.';
            case 'api':
                return 'AI service authentication failed. Please check your API configuration.';
            case 'model':
                return 'AI model is temporarily unavailable. Please try again later.';
            case 'network':
                return 'Unable to connect to AI service. Please check your internet connection.';
            default:
                return 'AI service encountered an unexpected error. Please try again.';
        }
    }
    getRecoveryActions() {
        const { lastErrorType, serviceStatus, fallbackMode } = this.state;
        const actions = [];
        // Primary action based on error type
        switch (lastErrorType) {
            case 'rate_limit':
                actions.push({
                    label: 'Wait and Retry',
                    action: this.handleRetryWithBackoff,
                    primary: true
                });
                break;
            case 'network':
                actions.push({
                    label: 'Check Connection',
                    action: this.handleRetry,
                    primary: true
                });
                break;
            default:
                actions.push({
                    label: 'Try Again',
                    action: this.handleRetry,
                    primary: true
                });
        }
        // Secondary actions
        if (!fallbackMode && this.props.enableOfflineMode) {
            actions.push({
                label: 'Use Offline Mode',
                action: this.handleFallbackMode
            });
        }
        actions.push({
            label: 'Reset Service',
            action: this.handleAIServiceReset
        });
        actions.push({
            label: 'Reload Page',
            action: () => window.location.reload()
        });
        return actions;
    }
    render() {
        const _a = this.props, { children, fallback } = _a, props = __rest(_a, ["children", "fallback"]);
        const { serviceStatus, lastErrorType, rateLimitInfo, fallbackMode } = this.state;
        // Custom fallback for AI service errors
        const aiServiceFallback = (error, errorInfo, retry, reset) => {
            const actions = this.getRecoveryActions();
            return (react_1.default.createElement("div", { className: "ai-service-error-boundary" },
                react_1.default.createElement("div", { className: "ai-service-error-container" },
                    react_1.default.createElement("div", { className: "ai-service-error-header" },
                        react_1.default.createElement("div", { className: "ai-service-error-icon" }, "\uD83E\uDD16"),
                        react_1.default.createElement("h2", { className: "ai-service-error-title" }, "AI Service Error"),
                        react_1.default.createElement("p", { className: "ai-service-error-message" }, this.getErrorMessage())),
                    react_1.default.createElement("div", { className: "ai-service-status" },
                        react_1.default.createElement("div", { className: `status-indicator ${serviceStatus}` },
                            react_1.default.createElement("span", { className: "status-dot" }),
                            react_1.default.createElement("span", { className: "status-text" },
                                "Service Status: ",
                                serviceStatus.charAt(0).toUpperCase() + serviceStatus.slice(1)))),
                    react_1.default.createElement("div", { className: "ai-service-error-actions" }, actions.map((action, index) => (react_1.default.createElement("button", { key: index, className: `ai-service-error-button ${action.primary ? 'primary' : 'secondary'}`, onClick: action.action }, action.label)))),
                    rateLimitInfo && (react_1.default.createElement("div", { className: "rate-limit-info" },
                        react_1.default.createElement("h3", null, "Rate Limit Information"),
                        react_1.default.createElement("div", { className: "rate-limit-details" },
                            react_1.default.createElement("p", null,
                                react_1.default.createElement("strong", null, "Limit:"),
                                " ",
                                rateLimitInfo.limit,
                                " requests"),
                            react_1.default.createElement("p", null,
                                react_1.default.createElement("strong", null, "Remaining:"),
                                " ",
                                rateLimitInfo.remaining,
                                " requests"),
                            react_1.default.createElement("p", null,
                                react_1.default.createElement("strong", null, "Reset Time:"),
                                " ",
                                new Date(rateLimitInfo.resetTime).toLocaleString())))),
                    react_1.default.createElement("div", { className: "ai-service-error-help" },
                        react_1.default.createElement("h3", null, "What you can do:"),
                        react_1.default.createElement("ul", null,
                            lastErrorType === 'rate_limit' && (react_1.default.createElement("li", null, "Wait a few minutes before trying again")),
                            lastErrorType === 'network' && (react_1.default.createElement("li", null, "Check your internet connection")),
                            lastErrorType === 'api' && (react_1.default.createElement("li", null, "Verify your API configuration")),
                            react_1.default.createElement("li", null, "Try using offline mode if available"),
                            react_1.default.createElement("li", null, "Contact support if the problem persists")))),
                react_1.default.createElement("style", null, `
            .ai-service-error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            
            .ai-service-error-container {
              max-width: 700px;
              width: 100%;
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
              padding: 40px;
              text-align: center;
            }
            
            .ai-service-error-header {
              margin-bottom: 32px;
            }
            
            .ai-service-error-icon {
              font-size: 80px;
              margin-bottom: 20px;
              filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
            }
            
            .ai-service-error-title {
              font-size: 28px;
              font-weight: 700;
              color: #1f2937;
              margin: 0 0 12px 0;
            }
            
            .ai-service-error-message {
              font-size: 18px;
              color: #6b7280;
              margin: 0;
              line-height: 1.6;
              max-width: 500px;
              margin: 0 auto;
            }
            
            .ai-service-status {
              margin-bottom: 32px;
            }
            
            .status-indicator {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
            }
            
            .status-indicator.online {
              background-color: #dcfce7;
              color: #166534;
            }
            
            .status-indicator.offline {
              background-color: #fee2e2;
              color: #991b1b;
            }
            
            .status-indicator.degraded {
              background-color: #fef3c7;
              color: #92400e;
            }
            
            .status-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background-color: currentColor;
            }
            
            .ai-service-error-actions {
              display: flex;
              gap: 16px;
              justify-content: center;
              margin-bottom: 32px;
              flex-wrap: wrap;
            }
            
            .ai-service-error-button {
              padding: 14px 28px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              min-width: 140px;
            }
            
            .ai-service-error-button.primary {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            
            .ai-service-error-button.primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .ai-service-error-button.secondary {
              background-color: #f8fafc;
              color: #374151;
              border: 2px solid #e2e8f0;
            }
            
            .ai-service-error-button.secondary:hover {
              background-color: #e2e8f0;
              border-color: #cbd5e1;
            }
            
            .rate-limit-info,
            .ai-service-error-help {
              text-align: left;
              margin-top: 32px;
              padding: 24px;
              background-color: #f8fafc;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
            }
            
            .rate-limit-info h3,
            .ai-service-error-help h3 {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin: 0 0 16px 0;
            }
            
            .rate-limit-details {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 12px;
            }
            
            .rate-limit-details p {
              margin: 0;
              color: #4b5563;
            }
            
            .ai-service-error-help ul {
              margin: 0;
              padding-left: 20px;
            }
            
            .ai-service-error-help li {
              margin-bottom: 8px;
              color: #4b5563;
              line-height: 1.5;
            }
          `)));
        };
        return (react_1.default.createElement(BaseErrorBoundary_1.default, Object.assign({}, props, { fallback: fallback || aiServiceFallback, componentName: props.componentName || 'AIServiceComponent', context: Object.assign(Object.assign({}, props.context), { serviceName: props.serviceName, serviceStatus: this.state.serviceStatus, lastErrorType: this.state.lastErrorType, fallbackMode: this.state.fallbackMode }) }), children));
    }
}
exports.AIServiceErrorBoundary = AIServiceErrorBoundary;
exports.default = AIServiceErrorBoundary;
