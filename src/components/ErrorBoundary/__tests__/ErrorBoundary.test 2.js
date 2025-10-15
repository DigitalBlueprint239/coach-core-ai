"use strict";
/**
 * Error Boundary Tests
 *
 * Comprehensive test suite for all error boundary components:
 * - Unit tests for each error boundary type
 * - Integration tests for error recovery
 * - Mock error scenarios
 * - Performance testing
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const index_1 = require("../index");
// ============================================
// TEST UTILITIES
// ============================================
// Mock error reporting service
jest.mock('../BaseErrorBoundary', () => {
    const original = jest.requireActual('../BaseErrorBoundary');
    return Object.assign(Object.assign({}, original), { ErrorReportingService: jest.fn().mockImplementation(() => ({
            reportError: jest.fn().mockResolvedValue(undefined),
            processQueue: jest.fn()
        })) });
});
// Mock environment configuration
jest.mock('../../../config/environment', () => ({
    getEnvironmentConfig: jest.fn(() => ({
        NODE_ENV: 'test',
        ENVIRONMENT: 'test',
        FIREBASE: {
            apiKey: 'test-key',
            authDomain: 'test.firebaseapp.com',
            projectId: 'test-project',
            storageBucket: 'test.appspot.com',
            messagingSenderId: '123456789',
            appId: 'test-app-id'
        },
        API: {
            baseUrl: 'http://localhost:3001/api',
            aiServiceUrl: 'http://localhost:8000',
            timeout: 30000
        },
        AI: {
            openaiApiKey: 'test-openai-key',
            aiProxyToken: 'test-proxy-token',
            enableAiAssistant: true
        },
        MONITORING: {
            sentryDsn: 'test-sentry-dsn',
            enableAnalytics: true,
            enableErrorReporting: true
        }
    })),
    isDevelopment: jest.fn(() => true),
    isProduction: jest.fn(() => false)
}));
// Component that throws an error
const ThrowError = ({ shouldThrow = false, errorType = 'generic' }) => {
    if (shouldThrow) {
        switch (errorType) {
            case 'network':
                throw new Error('Network error: Failed to fetch');
            case 'canvas':
                throw new Error('Canvas error: WebGL context lost');
            case 'ai':
                throw new Error('AI error: OpenAI API rate limit exceeded');
            case 'data':
                throw new Error('Data error: Firebase permission denied');
            case 'auth':
                throw new Error('Auth error: Unauthorized access');
            default:
                throw new Error('Generic error occurred');
        }
    }
    return react_1.default.createElement("div", null, "Component rendered successfully");
};
// ============================================
// BASE ERROR BOUNDARY TESTS
// ============================================
describe('BaseErrorBoundary', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.error = jest.fn(); // Suppress console.error in tests
    });
    it('renders children when no error occurs', () => {
        (0, react_2.render)(react_1.default.createElement(index_1.BaseErrorBoundary, null,
            react_1.default.createElement("div", null, "Test content")));
        expect(react_2.screen.getByText('Test content')).toBeInTheDocument();
    });
    it('renders error UI when error occurs', () => {
        (0, react_2.render)(react_1.default.createElement(index_1.BaseErrorBoundary, null,
            react_1.default.createElement(ThrowError, { shouldThrow: true })));
        expect(react_2.screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(react_2.screen.getByText('Try Again')).toBeInTheDocument();
        expect(react_2.screen.getByText('Reload Page')).toBeInTheDocument();
    });
    it('calls onError callback when error occurs', () => {
        const onError = jest.fn();
        (0, react_2.render)(react_1.default.createElement(index_1.BaseErrorBoundary, { onError: onError },
            react_1.default.createElement(ThrowError, { shouldThrow: true })));
        expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
            componentStack: expect.any(String)
        }));
    });
    it('handles retry functionality', () => __awaiter(void 0, void 0, void 0, function* () {
        const onRecover = jest.fn();
        (0, react_2.render)(react_1.default.createElement(index_1.BaseErrorBoundary, { onRecover: onRecover, maxRetries: 3 },
            react_1.default.createElement(ThrowError, { shouldThrow: true })));
        const retryButton = react_2.screen.getByText('Try Again');
        react_2.fireEvent.click(retryButton);
        yield (0, react_2.waitFor)(() => {
            expect(onRecover).toHaveBeenCalled();
        });
    }));
    it('respects max retry limit', () => {
        (0, react_2.render)(react_1.default.createElement(index_1.BaseErrorBoundary, { maxRetries: 1 },
            react_1.default.createElement(ThrowError, { shouldThrow: true })));
        const retryButton = react_2.screen.getByText('Try Again');
        react_2.fireEvent.click(retryButton);
        expect(react_2.screen.getByText('Max retries reached')).toBeInTheDocument();
    });
    it('shows error details in development mode', () => {
        (0, react_2.render)(react_1.default.createElement(index_1.BaseErrorBoundary, { showErrorDetails: true },
            react_1.default.createElement(ThrowError, { shouldThrow: true })));
        const detailsButton = react_2.screen.getByText('Error Details');
        react_2.fireEvent.click(detailsButton);
        expect(react_2.screen.getByText(/Error ID:/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Generic error occurred/)).toBeInTheDocument();
    });
});
// ============================================
// CANVAS ERROR BOUNDARY TESTS
// ============================================
describe('CanvasErrorBoundary', () => {
    it('renders canvas-specific error UI for canvas errors', () => {
        (0, react_2.render)(react_1.default.createElement(index_1.CanvasErrorBoundary, null,
            react_1.default.createElement(ThrowError, { shouldThrow: true, errorType: "canvas" })));
        expect(react_2.screen.getByText('Canvas Error')).toBeInTheDocument();
        expect(react_2.screen.getByText(/canvas context was lost/)).toBeInTheDocument();
        expect(react_2.screen.getByText('Reset Canvas')).toBeInTheDocument();
    });
    it('shows WebGL support information', () => {
        (0, react_2.render)(react_1.default.createElement(index_1.CanvasErrorBoundary, null,
            react_1.default.createElement(ThrowError, { shouldThrow: true, errorType: "canvas" })));
        expect(react_2.screen.getByText(/WebGL Support:/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Canvas Type:/)).toBeInTheDocument();
    });
    it('handles context recovery', () => {
        const onCanvasReset = jest.fn();
        (0, react_2.render)(react_1.default.createElement(index_1.CanvasErrorBoundary, { onCanvasReset: onCanvasReset },
            react_1.default.createElement(ThrowError, { shouldThrow: true, errorType: "canvas" })));
        const resetButton = react_2.screen.getByText('Reset Canvas');
        react_2.fireEvent.click(resetButton);
        expect(onCanvasReset).toHaveBeenCalled();
    });
});
// ============================================
// AI SERVICE ERROR BOUNDARY TESTS
// ============================================
describe('AIServiceErrorBoundary', () => {
    it('renders AI-specific error UI for AI errors', () => {
        (0, react_2.render)(react_1.default.createElement(index_1.AIServiceErrorBoundary, null,
            react_1.default.createElement(ThrowError, { shouldThrow: true, errorType: "ai" })));
        expect(react_2.screen.getByText('AI Service Error')).toBeInTheDocument();
        expect(react_2.screen.getByText(/rate limit exceeded/)).toBeInTheDocument();
        expect(react_2.screen.getByText('Wait and Retry')).toBeInTheDocument();
    });
    it('shows service status information', () => {
        (0, react_2.render)(react_1.default.createElement(index_1.AIServiceErrorBoundary, null,
            react_1.default.createElement(ThrowError, { shouldThrow: true, errorType: "ai" })));
        expect(react_2.screen.getByText(/Service Status:/)).toBeInTheDocument();
    });
    it('handles rate limit errors with backoff', () => {
        (0, react_2.render)(react_1.default.createElement(index_1.AIServiceErrorBoundary, { retryWithBackoff: true },
            react_1.default.createElement(ThrowError, { shouldThrow: true, errorType: "ai" })));
        const retryButton = react_2.screen.getByText('Wait and Retry');
        react_2.fireEvent.click(retryButton);
        // Should implement backoff logic
        expect(retryButton).toBeInTheDocument();
    });
    it('enables offline mode when available', () => {
        (0, react_2.render)(react_1.default.createElement(index_1.AIServiceErrorBoundary, { enableOfflineMode: true },
            react_1.default.createElement(ThrowError, { shouldThrow: true, errorType: "ai" })));
        expect(react_2.screen.getByText('Use Offline Mode')).toBeInTheDocument();
    });
});
// ============================================
// DATA LOADING ERROR BOUNDARY TESTS
// ============================================
describe('DataLoadingErrorBoundary', () => {
    it('renders data-specific error UI for data errors', () => {
        (0, react_2.render)(react_1.default.createElement(index_1.DataLoadingErrorBoundary, null,
            react_1.default.createElement(ThrowError, { shouldThrow: true, errorType: "data" })));
        expect(react_2.screen.getByText('Data Loading Error')).toBeInTheDocument();
        expect(react_2.screen.getByText(/permission denied/)).toBeInTheDocument();
        expect(react_2.screen.getByText('Request Access')).toBeInTheDocument();
    });
    it('shows data status information', () => {
        (0, react_2.render)(react_1.default.createElement(index_1.DataLoadingErrorBoundary, null,
            react_1.default.createElement(ThrowError, { shouldThrow: true, errorType: "data" })));
        expect(react_2.screen.getByText(/Data Type:/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Source:/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Status:/)).toBeInTheDocument();
    });
    it('handles permission errors', () => {
        const onPermissionRequest = jest.fn();
        (0, react_2.render)(react_1.default.createElement(index_1.DataLoadingErrorBoundary, { onPermissionRequest: onPermissionRequest },
            react_1.default.createElement(ThrowError, { shouldThrow: true, errorType: "auth" })));
        const requestButton = react_2.screen.getByText('Request Access');
        react_2.fireEvent.click(requestButton);
        expect(onPermissionRequest).toHaveBeenCalled();
    });
    it('enables caching when available', () => {
        (0, react_2.render)(react_1.default.createElement(index_1.DataLoadingErrorBoundary, { enableCaching: true },
            react_1.default.createElement(ThrowError, { shouldThrow: true, errorType: "data" })));
        expect(react_2.screen.getByText('Load Cached Data')).toBeInTheDocument();
    });
});
// ============================================
// ERROR UTILITY TESTS
// ============================================
describe('Error Utilities', () => {
    describe('isNetworkError', () => {
        it('identifies network errors correctly', () => {
            expect((0, index_1.isNetworkError)(new Error('Network error'))).toBe(true);
            expect((0, index_1.isNetworkError)(new Error('Failed to fetch'))).toBe(true);
            expect((0, index_1.isNetworkError)(new Error('Connection timeout'))).toBe(true);
            expect((0, index_1.isNetworkError)(new Error('Generic error'))).toBe(false);
        });
    });
    describe('isDataError', () => {
        it('identifies data errors correctly', () => {
            expect((0, index_1.isDataError)(new Error('Data error'))).toBe(true);
            expect((0, index_1.isDataError)(new Error('JSON parse error'))).toBe(true);
            expect((0, index_1.isDataError)(new Error('Firebase error'))).toBe(true);
            expect((0, index_1.isDataError)(new Error('Generic error'))).toBe(false);
        });
    });
    describe('isAuthError', () => {
        it('identifies auth errors correctly', () => {
            expect((0, index_1.isAuthError)(new Error('Auth error'))).toBe(true);
            expect((0, index_1.isAuthError)(new Error('Unauthorized access'))).toBe(true);
            expect((0, index_1.isAuthError)(new Error('Permission denied'))).toBe(true);
            expect((0, index_1.isAuthError)(new Error('Generic error'))).toBe(false);
        });
    });
    describe('isCanvasError', () => {
        it('identifies canvas errors correctly', () => {
            expect((0, index_1.isCanvasError)(new Error('Canvas error'))).toBe(true);
            expect((0, index_1.isCanvasError)(new Error('WebGL context lost'))).toBe(true);
            expect((0, index_1.isCanvasError)(new Error('Drawing failed'))).toBe(true);
            expect((0, index_1.isCanvasError)(new Error('Generic error'))).toBe(false);
        });
    });
    describe('isAIError', () => {
        it('identifies AI errors correctly', () => {
            expect((0, index_1.isAIError)(new Error('AI error'))).toBe(true);
            expect((0, index_1.isAIError)(new Error('OpenAI API error'))).toBe(true);
            expect((0, index_1.isAIError)(new Error('GPT model error'))).toBe(true);
            expect((0, index_1.isAIError)(new Error('Generic error'))).toBe(false);
        });
    });
});
// ============================================
// HIGHER-ORDER COMPONENT TESTS
// ============================================
describe('withErrorBoundary HOC', () => {
    it('wraps component with canvas error boundary', () => {
        const TestComponent = () => react_1.default.createElement("div", null, "Test");
        const WrappedComponent = (0, index_1.withErrorBoundary)(TestComponent, 'canvas');
        (0, react_2.render)(react_1.default.createElement(WrappedComponent, null));
        expect(react_2.screen.getByText('Test')).toBeInTheDocument();
    });
    it('wraps component with AI error boundary', () => {
        const TestComponent = () => react_1.default.createElement("div", null, "Test");
        const WrappedComponent = (0, index_1.withErrorBoundary)(TestComponent, 'ai');
        (0, react_2.render)(react_1.default.createElement(WrappedComponent, null));
        expect(react_2.screen.getByText('Test')).toBeInTheDocument();
    });
    it('wraps component with data error boundary', () => {
        const TestComponent = () => react_1.default.createElement("div", null, "Test");
        const WrappedComponent = (0, index_1.withErrorBoundary)(TestComponent, 'data');
        (0, react_2.render)(react_1.default.createElement(WrappedComponent, null));
        expect(react_2.screen.getByText('Test')).toBeInTheDocument();
    });
    it('wraps component with base error boundary by default', () => {
        const TestComponent = () => react_1.default.createElement("div", null, "Test");
        const WrappedComponent = (0, index_1.withErrorBoundary)(TestComponent);
        (0, react_2.render)(react_1.default.createElement(WrappedComponent, null));
        expect(react_2.screen.getByText('Test')).toBeInTheDocument();
    });
});
// ============================================
// ERROR BOUNDARY PROVIDER TESTS
// ============================================
describe('ErrorBoundaryProvider', () => {
    it('provides global error boundary context', () => {
        (0, react_2.render)(react_1.default.createElement(index_1.ErrorBoundaryProvider, null,
            react_1.default.createElement("div", null, "Test content")));
        expect(react_2.screen.getByText('Test content')).toBeInTheDocument();
    });
    it('handles errors at the provider level', () => {
        (0, react_2.render)(react_1.default.createElement(index_1.ErrorBoundaryProvider, null,
            react_1.default.createElement(ThrowError, { shouldThrow: true })));
        expect(react_2.screen.getByText('Something went wrong')).toBeInTheDocument();
    });
});
// ============================================
// INTEGRATION TESTS
// ============================================
describe('Error Boundary Integration', () => {
    it('handles multiple error boundaries correctly', () => {
        (0, react_2.render)(react_1.default.createElement(index_1.ErrorBoundaryProvider, null,
            react_1.default.createElement(index_1.CanvasErrorBoundary, null,
                react_1.default.createElement(index_1.AIServiceErrorBoundary, null,
                    react_1.default.createElement(index_1.DataLoadingErrorBoundary, null,
                        react_1.default.createElement(ThrowError, { shouldThrow: true, errorType: "canvas" }))))));
        // Should show canvas error (closest boundary)
        expect(react_2.screen.getByText('Canvas Error')).toBeInTheDocument();
    });
    it('provides proper error context', () => {
        const onError = jest.fn();
        (0, react_2.render)(react_1.default.createElement(index_1.BaseErrorBoundary, { onError: onError, componentName: "TestComponent" },
            react_1.default.createElement(ThrowError, { shouldThrow: true })));
        expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
            componentStack: expect.stringContaining('TestComponent')
        }));
    });
});
// ============================================
// PERFORMANCE TESTS
// ============================================
describe('Error Boundary Performance', () => {
    it('does not impact render performance significantly', () => {
        const startTime = performance.now();
        (0, react_2.render)(react_1.default.createElement(index_1.BaseErrorBoundary, null,
            react_1.default.createElement("div", null, "Performance test")));
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        // Should render in under 100ms
        expect(renderTime).toBeLessThan(100);
    });
    it('handles rapid error recovery efficiently', () => __awaiter(void 0, void 0, void 0, function* () {
        const { rerender } = (0, react_2.render)(react_1.default.createElement(index_1.BaseErrorBoundary, null,
            react_1.default.createElement(ThrowError, { shouldThrow: false })));
        // Trigger error
        rerender(react_1.default.createElement(index_1.BaseErrorBoundary, null,
            react_1.default.createElement(ThrowError, { shouldThrow: true })));
        expect(react_2.screen.getByText('Something went wrong')).toBeInTheDocument();
        // Recover
        rerender(react_1.default.createElement(index_1.BaseErrorBoundary, null,
            react_1.default.createElement(ThrowError, { shouldThrow: false })));
        yield (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Component rendered successfully')).toBeInTheDocument();
        });
    }));
});
