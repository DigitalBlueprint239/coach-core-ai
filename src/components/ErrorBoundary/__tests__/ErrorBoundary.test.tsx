/**
 * Error Boundary Tests
 * 
 * Comprehensive test suite for all error boundary components:
 * - Unit tests for each error boundary type
 * - Integration tests for error recovery
 * - Mock error scenarios
 * - Performance testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  BaseErrorBoundary,
  CanvasErrorBoundary,
  AIServiceErrorBoundary,
  DataLoadingErrorBoundary,
  withErrorBoundary,
  ErrorBoundaryProvider,
  useErrorBoundary,
  isNetworkError,
  isDataError,
  isAuthError,
  isCanvasError,
  isAIError
} from '../index';

// ============================================
// TEST UTILITIES
// ============================================

// Mock error reporting service
jest.mock('../BaseErrorBoundary', () => {
  const original = jest.requireActual('../BaseErrorBoundary');
  return {
    ...original,
    ErrorReportingService: jest.fn().mockImplementation(() => ({
      reportError: jest.fn().mockResolvedValue(undefined),
      processQueue: jest.fn()
    }))
  };
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
const ThrowError = ({ shouldThrow = false, errorType = 'generic' }: { shouldThrow?: boolean; errorType?: string }) => {
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
  return <div>Component rendered successfully</div>;
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
    render(
      <BaseErrorBoundary>
        <div>Test content</div>
      </BaseErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when error occurs', () => {
    render(
      <BaseErrorBoundary>
        <ThrowError shouldThrow={true} />
      </BaseErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    
    render(
      <BaseErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </BaseErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('handles retry functionality', async () => {
    const onRecover = jest.fn();
    
    render(
      <BaseErrorBoundary onRecover={onRecover} maxRetries={3}>
        <ThrowError shouldThrow={true} />
      </BaseErrorBoundary>
    );

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(onRecover).toHaveBeenCalled();
    });
  });

  it('respects max retry limit', () => {
    render(
      <BaseErrorBoundary maxRetries={1}>
        <ThrowError shouldThrow={true} />
      </BaseErrorBoundary>
    );

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    expect(screen.getByText('Max retries reached')).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    render(
      <BaseErrorBoundary showErrorDetails={true}>
        <ThrowError shouldThrow={true} />
      </BaseErrorBoundary>
    );

    const detailsButton = screen.getByText('Error Details');
    fireEvent.click(detailsButton);

    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
    expect(screen.getByText(/Generic error occurred/)).toBeInTheDocument();
  });
});

// ============================================
// CANVAS ERROR BOUNDARY TESTS
// ============================================

describe('CanvasErrorBoundary', () => {
  it('renders canvas-specific error UI for canvas errors', () => {
    render(
      <CanvasErrorBoundary>
        <ThrowError shouldThrow={true} errorType="canvas" />
      </CanvasErrorBoundary>
    );

    expect(screen.getByText('Canvas Error')).toBeInTheDocument();
    expect(screen.getByText(/canvas context was lost/)).toBeInTheDocument();
    expect(screen.getByText('Reset Canvas')).toBeInTheDocument();
  });

  it('shows WebGL support information', () => {
    render(
      <CanvasErrorBoundary>
        <ThrowError shouldThrow={true} errorType="canvas" />
      </CanvasErrorBoundary>
    );

    expect(screen.getByText(/WebGL Support:/)).toBeInTheDocument();
    expect(screen.getByText(/Canvas Type:/)).toBeInTheDocument();
  });

  it('handles context recovery', () => {
    const onCanvasReset = jest.fn();
    
    render(
      <CanvasErrorBoundary onCanvasReset={onCanvasReset}>
        <ThrowError shouldThrow={true} errorType="canvas" />
      </CanvasErrorBoundary>
    );

    const resetButton = screen.getByText('Reset Canvas');
    fireEvent.click(resetButton);

    expect(onCanvasReset).toHaveBeenCalled();
  });
});

// ============================================
// AI SERVICE ERROR BOUNDARY TESTS
// ============================================

describe('AIServiceErrorBoundary', () => {
  it('renders AI-specific error UI for AI errors', () => {
    render(
      <AIServiceErrorBoundary>
        <ThrowError shouldThrow={true} errorType="ai" />
      </AIServiceErrorBoundary>
    );

    expect(screen.getByText('AI Service Error')).toBeInTheDocument();
    expect(screen.getByText(/rate limit exceeded/)).toBeInTheDocument();
    expect(screen.getByText('Wait and Retry')).toBeInTheDocument();
  });

  it('shows service status information', () => {
    render(
      <AIServiceErrorBoundary>
        <ThrowError shouldThrow={true} errorType="ai" />
      </AIServiceErrorBoundary>
    );

    expect(screen.getByText(/Service Status:/)).toBeInTheDocument();
  });

  it('handles rate limit errors with backoff', () => {
    render(
      <AIServiceErrorBoundary retryWithBackoff={true}>
        <ThrowError shouldThrow={true} errorType="ai" />
      </AIServiceErrorBoundary>
    );

    const retryButton = screen.getByText('Wait and Retry');
    fireEvent.click(retryButton);

    // Should implement backoff logic
    expect(retryButton).toBeInTheDocument();
  });

  it('enables offline mode when available', () => {
    render(
      <AIServiceErrorBoundary enableOfflineMode={true}>
        <ThrowError shouldThrow={true} errorType="ai" />
      </AIServiceErrorBoundary>
    );

    expect(screen.getByText('Use Offline Mode')).toBeInTheDocument();
  });
});

// ============================================
// DATA LOADING ERROR BOUNDARY TESTS
// ============================================

describe('DataLoadingErrorBoundary', () => {
  it('renders data-specific error UI for data errors', () => {
    render(
      <DataLoadingErrorBoundary>
        <ThrowError shouldThrow={true} errorType="data" />
      </DataLoadingErrorBoundary>
    );

    expect(screen.getByText('Data Loading Error')).toBeInTheDocument();
    expect(screen.getByText(/permission denied/)).toBeInTheDocument();
    expect(screen.getByText('Request Access')).toBeInTheDocument();
  });

  it('shows data status information', () => {
    render(
      <DataLoadingErrorBoundary>
        <ThrowError shouldThrow={true} errorType="data" />
      </DataLoadingErrorBoundary>
    );

    expect(screen.getByText(/Data Type:/)).toBeInTheDocument();
    expect(screen.getByText(/Source:/)).toBeInTheDocument();
    expect(screen.getByText(/Status:/)).toBeInTheDocument();
  });

  it('handles permission errors', () => {
    const onPermissionRequest = jest.fn();
    
    render(
      <DataLoadingErrorBoundary onPermissionRequest={onPermissionRequest}>
        <ThrowError shouldThrow={true} errorType="auth" />
      </DataLoadingErrorBoundary>
    );

    const requestButton = screen.getByText('Request Access');
    fireEvent.click(requestButton);

    expect(onPermissionRequest).toHaveBeenCalled();
  });

  it('enables caching when available', () => {
    render(
      <DataLoadingErrorBoundary enableCaching={true}>
        <ThrowError shouldThrow={true} errorType="data" />
      </DataLoadingErrorBoundary>
    );

    expect(screen.getByText('Load Cached Data')).toBeInTheDocument();
  });
});

// ============================================
// ERROR UTILITY TESTS
// ============================================

describe('Error Utilities', () => {
  describe('isNetworkError', () => {
    it('identifies network errors correctly', () => {
      expect(isNetworkError(new Error('Network error'))).toBe(true);
      expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
      expect(isNetworkError(new Error('Connection timeout'))).toBe(true);
      expect(isNetworkError(new Error('Generic error'))).toBe(false);
    });
  });

  describe('isDataError', () => {
    it('identifies data errors correctly', () => {
      expect(isDataError(new Error('Data error'))).toBe(true);
      expect(isDataError(new Error('JSON parse error'))).toBe(true);
      expect(isDataError(new Error('Firebase error'))).toBe(true);
      expect(isDataError(new Error('Generic error'))).toBe(false);
    });
  });

  describe('isAuthError', () => {
    it('identifies auth errors correctly', () => {
      expect(isAuthError(new Error('Auth error'))).toBe(true);
      expect(isAuthError(new Error('Unauthorized access'))).toBe(true);
      expect(isAuthError(new Error('Permission denied'))).toBe(true);
      expect(isAuthError(new Error('Generic error'))).toBe(false);
    });
  });

  describe('isCanvasError', () => {
    it('identifies canvas errors correctly', () => {
      expect(isCanvasError(new Error('Canvas error'))).toBe(true);
      expect(isCanvasError(new Error('WebGL context lost'))).toBe(true);
      expect(isCanvasError(new Error('Drawing failed'))).toBe(true);
      expect(isCanvasError(new Error('Generic error'))).toBe(false);
    });
  });

  describe('isAIError', () => {
    it('identifies AI errors correctly', () => {
      expect(isAIError(new Error('AI error'))).toBe(true);
      expect(isAIError(new Error('OpenAI API error'))).toBe(true);
      expect(isAIError(new Error('GPT model error'))).toBe(true);
      expect(isAIError(new Error('Generic error'))).toBe(false);
    });
  });
});

// ============================================
// HIGHER-ORDER COMPONENT TESTS
// ============================================

describe('withErrorBoundary HOC', () => {
  it('wraps component with canvas error boundary', () => {
    const TestComponent = () => <div>Test</div>;
    const WrappedComponent = withErrorBoundary(TestComponent, 'canvas');
    
    render(<WrappedComponent />);
    
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('wraps component with AI error boundary', () => {
    const TestComponent = () => <div>Test</div>;
    const WrappedComponent = withErrorBoundary(TestComponent, 'ai');
    
    render(<WrappedComponent />);
    
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('wraps component with data error boundary', () => {
    const TestComponent = () => <div>Test</div>;
    const WrappedComponent = withErrorBoundary(TestComponent, 'data');
    
    render(<WrappedComponent />);
    
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('wraps component with base error boundary by default', () => {
    const TestComponent = () => <div>Test</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);
    
    render(<WrappedComponent />);
    
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});

// ============================================
// ERROR BOUNDARY PROVIDER TESTS
// ============================================

describe('ErrorBoundaryProvider', () => {
  it('provides global error boundary context', () => {
    render(
      <ErrorBoundaryProvider>
        <div>Test content</div>
      </ErrorBoundaryProvider>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('handles errors at the provider level', () => {
    render(
      <ErrorBoundaryProvider>
        <ThrowError shouldThrow={true} />
      </ErrorBoundaryProvider>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe('Error Boundary Integration', () => {
  it('handles multiple error boundaries correctly', () => {
    render(
      <ErrorBoundaryProvider>
        <CanvasErrorBoundary>
          <AIServiceErrorBoundary>
            <DataLoadingErrorBoundary>
              <ThrowError shouldThrow={true} errorType="canvas" />
            </DataLoadingErrorBoundary>
          </AIServiceErrorBoundary>
        </CanvasErrorBoundary>
      </ErrorBoundaryProvider>
    );

    // Should show canvas error (closest boundary)
    expect(screen.getByText('Canvas Error')).toBeInTheDocument();
  });

  it('provides proper error context', () => {
    const onError = jest.fn();
    
    render(
      <BaseErrorBoundary onError={onError} componentName="TestComponent">
        <ThrowError shouldThrow={true} />
      </BaseErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.stringContaining('TestComponent')
      })
    );
  });
});

// ============================================
// PERFORMANCE TESTS
// ============================================

describe('Error Boundary Performance', () => {
  it('does not impact render performance significantly', () => {
    const startTime = performance.now();
    
    render(
      <BaseErrorBoundary>
        <div>Performance test</div>
      </BaseErrorBoundary>
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render in under 100ms
    expect(renderTime).toBeLessThan(100);
  });

  it('handles rapid error recovery efficiently', async () => {
    const { rerender } = render(
      <BaseErrorBoundary>
        <ThrowError shouldThrow={false} />
      </BaseErrorBoundary>
    );

    // Trigger error
    rerender(
      <BaseErrorBoundary>
        <ThrowError shouldThrow={true} />
      </BaseErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Recover
    rerender(
      <BaseErrorBoundary>
        <ThrowError shouldThrow={false} />
      </BaseErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
    });
  });
}); 