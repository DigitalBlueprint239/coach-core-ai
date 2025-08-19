"use strict";
/**
 * Error Boundary Index
 *
 * Main exports for all error boundary components and utilities
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createErrorBoundary = exports.getErrorBoundaryConfig = exports.ERROR_BOUNDARY_CONFIG = exports.ErrorBoundaryProvider = exports.withErrorBoundary = exports.withAnalyticsErrorBoundary = exports.withTeamManagementErrorBoundary = exports.withDataLoadingErrorBoundary = exports.withAIServiceErrorBoundary = exports.withCanvasErrorBoundary = exports.isAIError = exports.isCanvasError = exports.isAuthError = exports.isDataError = exports.isNetworkError = exports.useErrorBoundary = exports.DataLoadingErrorBoundary = exports.AIServiceErrorBoundary = exports.CanvasErrorBoundary = exports.BaseErrorBoundary = void 0;
// Base error boundary
var BaseErrorBoundary_1 = require("./BaseErrorBoundary");
Object.defineProperty(exports, "BaseErrorBoundary", { enumerable: true, get: function () { return __importDefault(BaseErrorBoundary_1).default; } });
// Specialized error boundaries
var CanvasErrorBoundary_1 = require("./CanvasErrorBoundary");
Object.defineProperty(exports, "CanvasErrorBoundary", { enumerable: true, get: function () { return __importDefault(CanvasErrorBoundary_1).default; } });
var AIServiceErrorBoundary_1 = require("./AIServiceErrorBoundary");
Object.defineProperty(exports, "AIServiceErrorBoundary", { enumerable: true, get: function () { return __importDefault(AIServiceErrorBoundary_1).default; } });
var DataLoadingErrorBoundary_1 = require("./DataLoadingErrorBoundary");
Object.defineProperty(exports, "DataLoadingErrorBoundary", { enumerable: true, get: function () { return __importDefault(DataLoadingErrorBoundary_1).default; } });
// Utilities and hooks
var BaseErrorBoundary_2 = require("./BaseErrorBoundary");
Object.defineProperty(exports, "useErrorBoundary", { enumerable: true, get: function () { return BaseErrorBoundary_2.useErrorBoundary; } });
Object.defineProperty(exports, "isNetworkError", { enumerable: true, get: function () { return BaseErrorBoundary_2.isNetworkError; } });
Object.defineProperty(exports, "isDataError", { enumerable: true, get: function () { return BaseErrorBoundary_2.isDataError; } });
Object.defineProperty(exports, "isAuthError", { enumerable: true, get: function () { return BaseErrorBoundary_2.isAuthError; } });
Object.defineProperty(exports, "isCanvasError", { enumerable: true, get: function () { return BaseErrorBoundary_2.isCanvasError; } });
Object.defineProperty(exports, "isAIError", { enumerable: true, get: function () { return BaseErrorBoundary_2.isAIError; } });
// ============================================
// CONVENIENCE WRAPPERS
// ============================================
const react_1 = __importDefault(require("react"));
const _1 = require("./");
/**
 * Wrap SmartPlaybook component with canvas error boundary
 */
const withCanvasErrorBoundary = (component, props) => (react_1.default.createElement(_1.CanvasErrorBoundary, Object.assign({ componentName: "SmartPlaybook", canvasType: "2d", enableWebGLFallback: true, maxRetries: 3, retryDelay: 2000, autoRetry: true, autoRetryDelay: 5000, errorReporting: true, showErrorDetails: process.env.NODE_ENV === 'development' }, props), component));
exports.withCanvasErrorBoundary = withCanvasErrorBoundary;
/**
 * Wrap PracticePlanner component with AI service error boundary
 */
const withAIServiceErrorBoundary = (component, props) => (react_1.default.createElement(_1.AIServiceErrorBoundary, Object.assign({ componentName: "PracticePlanner", serviceName: "OpenAI", enableOfflineMode: true, retryWithBackoff: true, maxRetries: 5, retryDelay: 3000, autoRetry: true, autoRetryDelay: 10000, errorReporting: true, showErrorDetails: process.env.NODE_ENV === 'development' }, props), component));
exports.withAIServiceErrorBoundary = withAIServiceErrorBoundary;
/**
 * Wrap Dashboard component with data loading error boundary
 */
const withDataLoadingErrorBoundary = (component, props) => (react_1.default.createElement(_1.DataLoadingErrorBoundary, Object.assign({ componentName: "Dashboard", dataType: "team", enableCaching: true, cacheTimeout: 300000, maxRetries: 3, retryDelay: 2000, autoRetry: true, autoRetryDelay: 5000, errorReporting: true, showErrorDetails: process.env.NODE_ENV === 'development' }, props), component));
exports.withDataLoadingErrorBoundary = withDataLoadingErrorBoundary;
/**
 * Wrap TeamManagement component with data loading error boundary
 */
const withTeamManagementErrorBoundary = (component, props) => (react_1.default.createElement(_1.DataLoadingErrorBoundary, Object.assign({ componentName: "TeamManagement", dataType: "team", enableCaching: true, cacheTimeout: 600000, maxRetries: 3, retryDelay: 2000, autoRetry: true, autoRetryDelay: 5000, errorReporting: true, showErrorDetails: process.env.NODE_ENV === 'development' }, props), component));
exports.withTeamManagementErrorBoundary = withTeamManagementErrorBoundary;
/**
 * Wrap Analytics component with data loading error boundary
 */
const withAnalyticsErrorBoundary = (component, props) => (react_1.default.createElement(_1.DataLoadingErrorBoundary, Object.assign({ componentName: "Analytics", dataType: "analytics", enableCaching: true, cacheTimeout: 900000, maxRetries: 3, retryDelay: 2000, autoRetry: true, autoRetryDelay: 5000, errorReporting: true, showErrorDetails: process.env.NODE_ENV === 'development' }, props), component));
exports.withAnalyticsErrorBoundary = withAnalyticsErrorBoundary;
// ============================================
// HIGHER-ORDER COMPONENTS
// ============================================
/**
 * HOC to wrap components with appropriate error boundaries
 */
const withErrorBoundary = (Component, errorBoundaryType = 'base', boundaryProps) => {
    const WrappedComponent = (props) => {
        const component = react_1.default.createElement(Component, Object.assign({}, props));
        switch (errorBoundaryType) {
            case 'canvas':
                return (0, exports.withCanvasErrorBoundary)(component, boundaryProps);
            case 'ai':
                return (0, exports.withAIServiceErrorBoundary)(component, boundaryProps);
            case 'data':
                return (0, exports.withDataLoadingErrorBoundary)(component, boundaryProps);
            default:
                return (react_1.default.createElement(_1.BaseErrorBoundary, Object.assign({ componentName: Component.displayName || Component.name, maxRetries: 3, retryDelay: 2000, errorReporting: true, showErrorDetails: process.env.NODE_ENV === 'development' }, boundaryProps), component));
        }
    };
    WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
    return WrappedComponent;
};
exports.withErrorBoundary = withErrorBoundary;
const ErrorBoundaryProvider = ({ children, enableGlobalErrorReporting = true, enableAutoRetry = true, maxRetries = 3, retryDelay = 2000 }) => {
    return (react_1.default.createElement(_1.BaseErrorBoundary, { componentName: "AppRoot", errorReporting: enableGlobalErrorReporting, autoRetry: enableAutoRetry, maxRetries: maxRetries, retryDelay: retryDelay, showErrorDetails: process.env.NODE_ENV === 'development' }, children));
};
exports.ErrorBoundaryProvider = ErrorBoundaryProvider;
// ============================================
// ERROR BOUNDARY CONFIGURATION
// ============================================
exports.ERROR_BOUNDARY_CONFIG = {
    // Canvas components
    canvas: {
        maxRetries: 3,
        retryDelay: 2000,
        autoRetry: true,
        autoRetryDelay: 5000,
        enableWebGLFallback: true
    },
    // AI service components
    ai: {
        maxRetries: 5,
        retryDelay: 3000,
        autoRetry: true,
        autoRetryDelay: 10000,
        retryWithBackoff: true,
        enableOfflineMode: true
    },
    // Data loading components
    data: {
        maxRetries: 3,
        retryDelay: 2000,
        autoRetry: true,
        autoRetryDelay: 5000,
        enableCaching: true,
        cacheTimeout: 300000 // 5 minutes
    },
    // Base configuration
    base: {
        maxRetries: 3,
        retryDelay: 2000,
        autoRetry: false,
        errorReporting: true,
        showErrorDetails: process.env.NODE_ENV === 'development'
    }
};
// ============================================
// ERROR BOUNDARY UTILITIES
// ============================================
/**
 * Get error boundary configuration for a specific component type
 */
const getErrorBoundaryConfig = (type) => {
    return exports.ERROR_BOUNDARY_CONFIG[type];
};
exports.getErrorBoundaryConfig = getErrorBoundaryConfig;
/**
 * Create a custom error boundary with specific configuration
 */
const createErrorBoundary = (type, customProps) => {
    const config = (0, exports.getErrorBoundaryConfig)(type);
    switch (type) {
        case 'canvas':
            return (component) => (react_1.default.createElement(_1.CanvasErrorBoundary, Object.assign({}, config, customProps), component));
        case 'ai':
            return (component) => (react_1.default.createElement(_1.AIServiceErrorBoundary, Object.assign({}, config, customProps), component));
        case 'data':
            return (component) => (react_1.default.createElement(_1.DataLoadingErrorBoundary, Object.assign({}, config, customProps), component));
        default:
            return (component) => (react_1.default.createElement(_1.BaseErrorBoundary, Object.assign({}, config, customProps), component));
    }
};
exports.createErrorBoundary = createErrorBoundary;
exports.default = {
    BaseErrorBoundary: _1.BaseErrorBoundary,
    CanvasErrorBoundary: _1.CanvasErrorBoundary,
    AIServiceErrorBoundary: _1.AIServiceErrorBoundary,
    DataLoadingErrorBoundary: _1.DataLoadingErrorBoundary,
    withErrorBoundary: exports.withErrorBoundary,
    ErrorBoundaryProvider: exports.ErrorBoundaryProvider,
    ERROR_BOUNDARY_CONFIG: exports.ERROR_BOUNDARY_CONFIG,
    getErrorBoundaryConfig: exports.getErrorBoundaryConfig,
    createErrorBoundary: exports.createErrorBoundary
};
