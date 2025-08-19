"use strict";
/**
 * Base Error Boundary Component
 *
 * A comprehensive error boundary with:
 * - Error logging to monitoring service
 * - User-friendly fallback UI
 * - Recovery options (retry, reset, report)
 * - Development vs production error display
 * - Automatic retry mechanisms
 * - State reset capabilities
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
exports.isAIError = exports.isCanvasError = exports.isAuthError = exports.isDataError = exports.isNetworkError = exports.useErrorBoundary = exports.BaseErrorBoundary = void 0;
const react_1 = __importStar(require("react"));
const environment_1 = require("../../config/environment");
// ============================================
// ERROR REPORTING SERVICE
// ============================================
class ErrorReportingService {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.config = (0, environment_1.getEnvironmentConfig)();
        this.endpoint = this.config.API.baseUrl + '/errors';
    }
    reportError(errorReport) {
        return __awaiter(this, void 0, void 0, function* () {
            // Add to queue
            this.queue.push(errorReport);
            // Process queue if not already processing
            if (!this.isProcessing) {
                this.processQueue();
            }
        });
    }
    processQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isProcessing || this.queue.length === 0) {
                return;
            }
            this.isProcessing = true;
            try {
                while (this.queue.length > 0) {
                    const errorReport = this.queue.shift();
                    if (errorReport) {
                        yield this.sendErrorReport(errorReport);
                    }
                }
            }
            catch (error) {
                console.error('Failed to process error queue:', error);
            }
            finally {
                this.isProcessing = false;
            }
        });
    }
    sendErrorReport(errorReport) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Send to Sentry if configured
                if (this.config.MONITORING.sentryDsn && window.Sentry) {
                    window.Sentry.captureException(errorReport.error, {
                        tags: {
                            component: errorReport.context.componentName,
                            errorId: errorReport.errorId,
                            environment: errorReport.appInfo.environment
                        },
                        extra: {
                            errorInfo: errorReport.errorInfo,
                            userInfo: errorReport.userInfo,
                            context: errorReport.context,
                            recovery: errorReport.recovery
                        }
                    });
                }
                // Send to custom endpoint
                const response = yield fetch(this.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.config.AI.aiProxyToken}`
                    },
                    body: JSON.stringify(errorReport),
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            catch (error) {
                console.error('Failed to send error report:', error);
                // Re-queue the error report for later retry
                this.queue.unshift(errorReport);
            }
        });
    }
}
// ============================================
// MAIN ERROR BOUNDARY COMPONENT
// ============================================
class BaseErrorBoundary extends react_1.Component {
    constructor(props) {
        super(props);
        this.retryTimeout = null;
        this.autoRetryTimeout = null;
        this.handleRetry = () => {
            const { maxRetries = 3, retryDelay = 1000 } = this.props;
            const { retryCount, lastErrorTime } = this.state;
            // Check if we should allow retry
            if (retryCount >= maxRetries) {
                console.warn('Max retry attempts reached');
                return;
            }
            // Check if enough time has passed since last error
            const timeSinceLastError = Date.now() - lastErrorTime;
            if (timeSinceLastError < retryDelay) {
                console.warn('Retry too soon, waiting...');
                return;
            }
            this.setState({ isRecovering: true });
            // Reset error state and retry
            this.setState({
                hasError: false,
                error: null,
                errorInfo: null,
                retryCount: retryCount + 1,
                isRecovering: false
            });
            // Call recovery handler
            if (this.props.onRecover) {
                this.props.onRecover();
            }
        };
        this.handleReset = () => {
            this.setState({
                hasError: false,
                error: null,
                errorInfo: null,
                retryCount: 0,
                lastErrorTime: 0,
                isRecovering: false,
                recoveryAttempts: 0
            });
            // Call reset handler
            if (this.props.onReset) {
                this.props.onReset();
            }
        };
        this.handleReport = () => {
            if (this.state.error && this.state.errorInfo) {
                this.reportError(this.state.error, this.state.errorInfo);
            }
        };
        this.handleGoBack = () => {
            window.history.back();
        };
        this.handleReload = () => {
            window.location.reload();
        };
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: '',
            retryCount: 0,
            lastErrorTime: 0,
            isRecovering: false,
            recoveryAttempts: 0
        };
        this.errorReportingService = new ErrorReportingService();
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
            errorId: BaseErrorBoundary.generateErrorId(),
            lastErrorTime: Date.now()
        };
    }
    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        // Call custom error handler
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
        // Report error if enabled
        if (this.props.errorReporting !== false) {
            this.reportError(error, errorInfo);
        }
        // Log error to console in development
        if ((0, environment_1.isDevelopment)()) {
            console.error('Error caught by boundary:', error, errorInfo);
        }
        // Auto-retry if enabled
        if (this.props.autoRetry) {
            this.scheduleAutoRetry();
        }
    }
    componentWillUnmount() {
        // Clean up timeouts
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
        }
        if (this.autoRetryTimeout) {
            clearTimeout(this.autoRetryTimeout);
        }
    }
    static generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    reportError(error, errorInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const errorReport = {
                    errorId: this.state.errorId,
                    error: {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    },
                    errorInfo: {
                        componentStack: errorInfo.componentStack || ''
                    },
                    userInfo: {
                        userId: this.getUserId(),
                        userAgent: navigator.userAgent,
                        url: window.location.href,
                        timestamp: Date.now()
                    },
                    appInfo: {
                        version: process.env.REACT_APP_VERSION || '1.0.0',
                        environment: process.env.NODE_ENV || 'development',
                        buildNumber: process.env.REACT_APP_BUILD_NUMBER
                    },
                    context: {
                        componentName: this.props.componentName || this.getComponentName(errorInfo.componentStack || ''),
                        props: this.props,
                        state: this.state,
                        customContext: this.props.context
                    },
                    recovery: {
                        retryCount: this.state.retryCount,
                        recoveryAttempts: this.state.recoveryAttempts,
                        lastErrorTime: this.state.lastErrorTime
                    }
                };
                yield this.errorReportingService.reportError(errorReport);
            }
            catch (reportingError) {
                console.error('Failed to report error:', reportingError);
            }
        });
    }
    getUserId() {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user.id || user.uid;
        }
        catch (_a) {
            return undefined;
        }
    }
    getComponentName(componentStack) {
        const match = componentStack.match(/at\s+(\w+)/);
        return match ? match[1] : 'Unknown';
    }
    scheduleAutoRetry() {
        const { autoRetryDelay = 5000 } = this.props;
        if (this.autoRetryTimeout) {
            clearTimeout(this.autoRetryTimeout);
        }
        this.autoRetryTimeout = setTimeout(() => {
            this.handleRetry();
        }, autoRetryDelay);
    }
    render() {
        const { hasError, error, errorInfo, retryCount, errorId, isRecovering } = this.state;
        const { children, fallback, maxRetries = 3, showErrorDetails = (0, environment_1.isDevelopment)(), className = '' } = this.props;
        if (isRecovering) {
            return (react_1.default.createElement("div", { className: "error-boundary-recovering" },
                react_1.default.createElement("div", { className: "recovering-spinner" }),
                react_1.default.createElement("p", null, "Recovering..."),
                react_1.default.createElement("style", null, `
            .error-boundary-recovering {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 20px;
              background-color: #f0f9ff;
              border: 1px solid #0ea5e9;
              border-radius: 8px;
            }
            .recovering-spinner {
              width: 24px;
              height: 24px;
              border: 2px solid #0ea5e9;
              border-top: 2px solid transparent;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin-bottom: 8px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `)));
        }
        if (hasError) {
            // Custom fallback component or function
            if (fallback) {
                if (typeof fallback === 'function') {
                    const recoveryOptions = {
                        retry: this.handleRetry,
                        reset: this.handleReset,
                        report: this.handleReport,
                        goBack: this.handleGoBack,
                        reload: this.handleReload
                    };
                    return fallback(error, errorInfo, this.handleRetry, this.handleReset);
                }
                return fallback;
            }
            // Default error UI
            return (react_1.default.createElement("div", { className: `error-boundary ${className}` },
                react_1.default.createElement("div", { className: "error-container" },
                    react_1.default.createElement("div", { className: "error-header" },
                        react_1.default.createElement("div", { className: "error-icon" }, "\u26A0\uFE0F"),
                        react_1.default.createElement("h2", { className: "error-title" }, "Something went wrong"),
                        react_1.default.createElement("p", { className: "error-message" }, "We're sorry, but something unexpected happened. Our team has been notified.")),
                    react_1.default.createElement("div", { className: "error-actions" },
                        react_1.default.createElement("button", { className: "error-button primary", onClick: this.handleRetry, disabled: retryCount >= maxRetries }, retryCount >= maxRetries ? 'Max retries reached' : 'Try Again'),
                        react_1.default.createElement("button", { className: "error-button secondary", onClick: this.handleReset }, "Reset"),
                        react_1.default.createElement("button", { className: "error-button secondary", onClick: this.handleGoBack }, "Go Back"),
                        react_1.default.createElement("button", { className: "error-button secondary", onClick: this.handleReload }, "Reload Page")),
                    showErrorDetails && error && (react_1.default.createElement("div", { className: "error-details" },
                        react_1.default.createElement("details", null,
                            react_1.default.createElement("summary", null, "Error Details"),
                            react_1.default.createElement("div", { className: "error-info" },
                                react_1.default.createElement("p", null,
                                    react_1.default.createElement("strong", null, "Error ID:"),
                                    " ",
                                    errorId),
                                react_1.default.createElement("p", null,
                                    react_1.default.createElement("strong", null, "Component:"),
                                    " ",
                                    this.props.componentName || 'Unknown'),
                                react_1.default.createElement("p", null,
                                    react_1.default.createElement("strong", null, "Error:"),
                                    " ",
                                    error.name,
                                    ": ",
                                    error.message),
                                error.stack && (react_1.default.createElement("div", { className: "error-stack" },
                                    react_1.default.createElement("strong", null, "Stack Trace:"),
                                    react_1.default.createElement("pre", null, error.stack))),
                                errorInfo && (react_1.default.createElement("div", { className: "error-component-stack" },
                                    react_1.default.createElement("strong", null, "Component Stack:"),
                                    react_1.default.createElement("pre", null, errorInfo.componentStack))))))),
                    react_1.default.createElement("div", { className: "error-footer" },
                        react_1.default.createElement("p", { className: "error-help" },
                            "If this problem persists, please contact support with error ID: ",
                            react_1.default.createElement("code", null, errorId)),
                        react_1.default.createElement("button", { className: "error-button tertiary", onClick: this.handleReport }, "Report Issue"))),
                react_1.default.createElement("style", null, `
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
              background-color: #f9fafb;
            }
            
            .error-container {
              max-width: 600px;
              width: 100%;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              padding: 32px;
              text-align: center;
            }
            
            .error-header {
              margin-bottom: 24px;
            }
            
            .error-icon {
              font-size: 64px;
              margin-bottom: 16px;
            }
            
            .error-title {
              font-size: 24px;
              font-weight: 600;
              color: #1f2937;
              margin: 0 0 8px 0;
            }
            
            .error-message {
              font-size: 16px;
              color: #6b7280;
              margin: 0;
              line-height: 1.5;
            }
            
            .error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              margin-bottom: 24px;
              flex-wrap: wrap;
            }
            
            .error-button {
              padding: 12px 24px;
              border: none;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            }
            
            .error-button.primary {
              background-color: #3b82f6;
              color: white;
            }
            
            .error-button.primary:hover:not(:disabled) {
              background-color: #2563eb;
            }
            
            .error-button.primary:disabled {
              background-color: #9ca3af;
              cursor: not-allowed;
            }
            
            .error-button.secondary {
              background-color: #f3f4f6;
              color: #374151;
              border: 1px solid #d1d5db;
            }
            
            .error-button.secondary:hover {
              background-color: #e5e7eb;
            }
            
            .error-button.tertiary {
              background-color: transparent;
              color: #6b7280;
              border: 1px solid #d1d5db;
              padding: 8px 16px;
              font-size: 12px;
            }
            
            .error-button.tertiary:hover {
              background-color: #f9fafb;
            }
            
            .error-details {
              margin: 24px 0;
              text-align: left;
            }
            
            .error-details summary {
              cursor: pointer;
              color: #6b7280;
              font-size: 14px;
              margin-bottom: 12px;
            }
            
            .error-info {
              background-color: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 16px;
              font-size: 14px;
              line-height: 1.5;
            }
            
            .error-stack,
            .error-component-stack {
              margin-top: 12px;
            }
            
            .error-stack pre,
            .error-component-stack pre {
              background-color: #1f2937;
              color: #f9fafb;
              padding: 12px;
              border-radius: 4px;
              overflow-x: auto;
              font-size: 12px;
              margin: 8px 0 0 0;
            }
            
            .error-footer {
              border-top: 1px solid #e5e7eb;
              padding-top: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            .error-help {
              font-size: 14px;
              color: #6b7280;
              margin: 0;
            }
            
            .error-help code {
              background-color: #f3f4f6;
              padding: 2px 6px;
              border-radius: 4px;
              font-family: monospace;
            }
          `)));
        }
        return children;
    }
}
exports.BaseErrorBoundary = BaseErrorBoundary;
// ============================================
// HOOK FOR ERROR BOUNDARY
// ============================================
const useErrorBoundary = () => {
    const [error, setError] = (0, react_1.useState)(null);
    const [errorInfo, setErrorInfo] = (0, react_1.useState)(null);
    const handleError = (0, react_1.useCallback)((error, errorInfo) => {
        setError(error);
        setErrorInfo(errorInfo);
        console.error('Error caught by hook:', error, errorInfo);
    }, []);
    const clearError = (0, react_1.useCallback)(() => {
        setError(null);
        setErrorInfo(null);
    }, []);
    return {
        error,
        errorInfo,
        handleError,
        clearError
    };
};
exports.useErrorBoundary = useErrorBoundary;
// ============================================
// ERROR UTILITIES
// ============================================
const isNetworkError = (error) => {
    return (error.name === 'NetworkError' ||
        error.message.includes('network') ||
        error.message.includes('fetch') ||
        error.message.includes('connection') ||
        error.message.includes('timeout'));
};
exports.isNetworkError = isNetworkError;
const isDataError = (error) => {
    return (error.name === 'DataError' ||
        error.message.includes('data') ||
        error.message.includes('parse') ||
        error.message.includes('JSON') ||
        error.message.includes('firebase'));
};
exports.isDataError = isDataError;
const isAuthError = (error) => {
    return (error.name === 'AuthError' ||
        error.message.includes('auth') ||
        error.message.includes('unauthorized') ||
        error.message.includes('forbidden') ||
        error.message.includes('permission'));
};
exports.isAuthError = isAuthError;
const isCanvasError = (error) => {
    return (error.name === 'CanvasError' ||
        error.message.includes('canvas') ||
        error.message.includes('webgl') ||
        error.message.includes('context') ||
        error.message.includes('drawing'));
};
exports.isCanvasError = isCanvasError;
const isAIError = (error) => {
    return (error.name === 'AIError' ||
        error.message.includes('ai') ||
        error.message.includes('openai') ||
        error.message.includes('gpt') ||
        error.message.includes('model'));
};
exports.isAIError = isAIError;
exports.default = BaseErrorBoundary;
