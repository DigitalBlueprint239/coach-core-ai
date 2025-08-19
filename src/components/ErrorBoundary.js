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
exports.isAuthError = exports.isDataError = exports.isNetworkError = exports.useErrorBoundary = exports.DataErrorBoundary = exports.NetworkErrorBoundary = exports.ErrorBoundary = void 0;
// src/components/ErrorBoundary.tsx
const react_1 = __importStar(require("react"));
// ============================================
// MAIN ERROR BOUNDARY COMPONENT
// ============================================
class ErrorBoundary extends react_1.Component {
    constructor(props) {
        super(props);
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
            // Reset error state and retry
            this.setState({
                hasError: false,
                error: null,
                errorInfo: null,
                retryCount: retryCount + 1
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
                lastErrorTime: 0
            });
        };
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: '',
            retryCount: 0,
            lastErrorTime: 0
        };
        this.errorReportingService = new ErrorReportingService();
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
            errorId: ErrorBoundary.generateErrorId(),
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
        if (process.env.NODE_ENV === 'development') {
            console.error('Error caught by boundary:', error, errorInfo);
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
                        componentName: this.getComponentName(errorInfo.componentStack || ''),
                        props: this.props,
                        state: this.state
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
        // This would typically get the user ID from your auth context
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user.id;
        }
        catch (_a) {
            return undefined;
        }
    }
    getComponentName(componentStack) {
        const match = componentStack.match(/at\s+(\w+)/);
        return match ? match[1] : 'Unknown';
    }
    render() {
        const { hasError, error, errorInfo, retryCount, errorId } = this.state;
        const { children, fallback, maxRetries = 3, showErrorDetails = false, className = '' } = this.props;
        if (hasError) {
            // Custom fallback component or function
            if (fallback) {
                if (typeof fallback === 'function') {
                    return fallback(error, errorInfo, this.handleRetry);
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
                        react_1.default.createElement("button", { className: "error-button secondary", onClick: () => window.location.reload() }, "Reload Page"),
                        react_1.default.createElement("button", { className: "error-button secondary", onClick: () => window.history.back() }, "Go Back")),
                    showErrorDetails && error && (react_1.default.createElement("div", { className: "error-details" },
                        react_1.default.createElement("details", null,
                            react_1.default.createElement("summary", null, "Error Details"),
                            react_1.default.createElement("div", { className: "error-info" },
                                react_1.default.createElement("p", null,
                                    react_1.default.createElement("strong", null, "Error ID:"),
                                    " ",
                                    errorId),
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
                            react_1.default.createElement("code", null, errorId)))),
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
exports.ErrorBoundary = ErrorBoundary;
// ============================================
// ERROR REPORTING SERVICE
// ============================================
class ErrorReportingService {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.endpoint = process.env.REACT_APP_ERROR_REPORTING_ENDPOINT || '/api/errors';
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
                const response = yield fetch(this.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
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
// SPECIALIZED ERROR BOUNDARIES
// ============================================
class NetworkErrorBoundary extends ErrorBoundary {
    constructor(props) {
        super(Object.assign(Object.assign({}, props), { fallback: (error, errorInfo, retry) => (react_1.default.createElement("div", { className: "network-error" },
                react_1.default.createElement("div", { className: "network-error-icon" }, "\uD83C\uDF10"),
                react_1.default.createElement("h3", null, "Network Error"),
                react_1.default.createElement("p", null, "Unable to connect to the server. Please check your internet connection."),
                react_1.default.createElement("div", { className: "network-error-actions" },
                    react_1.default.createElement("button", { onClick: retry }, "Retry Connection"),
                    react_1.default.createElement("button", { onClick: () => window.location.reload() }, "Reload Page")),
                react_1.default.createElement("style", null, `
            .network-error {
              text-align: center;
              padding: 32px;
            }
            .network-error-icon {
              font-size: 48px;
              margin-bottom: 16px;
            }
            .network-error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              margin-top: 16px;
            }
            .network-error-actions button {
              padding: 8px 16px;
              border: 1px solid #d1d5db;
              border-radius: 4px;
              background: white;
              cursor: pointer;
            }
          `))) }));
    }
}
exports.NetworkErrorBoundary = NetworkErrorBoundary;
class DataErrorBoundary extends ErrorBoundary {
    constructor(props) {
        super(Object.assign(Object.assign({}, props), { fallback: (error, errorInfo, retry) => (react_1.default.createElement("div", { className: "data-error" },
                react_1.default.createElement("div", { className: "data-error-icon" }, "\uD83D\uDCCA"),
                react_1.default.createElement("h3", null, "Data Loading Error"),
                react_1.default.createElement("p", null, "Failed to load the requested data. This might be a temporary issue."),
                react_1.default.createElement("div", { className: "data-error-actions" },
                    react_1.default.createElement("button", { onClick: retry }, "Retry Loading"),
                    react_1.default.createElement("button", { onClick: () => window.history.back() }, "Go Back")),
                react_1.default.createElement("style", null, `
            .data-error {
              text-align: center;
              padding: 32px;
            }
            .data-error-icon {
              font-size: 48px;
              margin-bottom: 16px;
            }
            .data-error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              margin-top: 16px;
            }
            .data-error-actions button {
              padding: 8px 16px;
              border: 1px solid #d1d5db;
              border-radius: 4px;
              background: white;
              cursor: pointer;
            }
          `))) }));
    }
}
exports.DataErrorBoundary = DataErrorBoundary;
// ============================================
// HOOK FOR ERROR BOUNDARY
// ============================================
const useErrorBoundary = () => {
    const [error, setError] = (0, react_1.useState)(null);
    const handleError = react_1.default.useCallback((error, errorInfo) => {
        setError(error);
        console.error('Error caught by hook:', error, errorInfo);
    }, []);
    const clearError = react_1.default.useCallback(() => {
        setError(null);
    }, []);
    return {
        error,
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
        error.message.includes('connection'));
};
exports.isNetworkError = isNetworkError;
const isDataError = (error) => {
    return (error.name === 'DataError' ||
        error.message.includes('data') ||
        error.message.includes('parse') ||
        error.message.includes('JSON'));
};
exports.isDataError = isDataError;
const isAuthError = (error) => {
    return (error.name === 'AuthError' ||
        error.message.includes('auth') ||
        error.message.includes('unauthorized') ||
        error.message.includes('forbidden'));
};
exports.isAuthError = isAuthError;
exports.default = ErrorBoundary;
