/**
 * Error Boundary Index
 *
 * Main exports for all error boundary components and utilities
 */

// Base error boundary
export { default as BaseErrorBoundary } from './BaseErrorBoundary';
export type {
  ErrorBoundaryProps,
  ErrorBoundaryState,
  ErrorReport,
  ErrorRecoveryOptions,
} from './BaseErrorBoundary';

// Specialized error boundaries
export { default as CanvasErrorBoundary } from './CanvasErrorBoundary';
export type {
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState,
} from './CanvasErrorBoundary';

export { default as AIServiceErrorBoundary } from './AIServiceErrorBoundary';
export type {
  AIServiceErrorBoundaryProps,
  AIServiceErrorBoundaryState,
} from './AIServiceErrorBoundary';

export { default as DataLoadingErrorBoundary } from './DataLoadingErrorBoundary';
export type {
  DataLoadingErrorBoundaryProps,
  DataLoadingErrorBoundaryState,
} from './DataLoadingErrorBoundary';

// Utilities and hooks
export {
  useErrorBoundary,
  isNetworkError,
  isDataError,
  isAuthError,
  isCanvasError,
  isAIError,
} from './BaseErrorBoundary';

// ============================================
// CONVENIENCE WRAPPERS
// ============================================

import React, { ReactNode } from 'react';
import {
  BaseErrorBoundary,
  CanvasErrorBoundary,
  AIServiceErrorBoundary,
  DataLoadingErrorBoundary,
} from './';

/**
 * Wrap SmartPlaybook component with canvas error boundary
 */
export const withCanvasErrorBoundary = (component: ReactNode, props?: any) => (
  <CanvasErrorBoundary
    componentName="SmartPlaybook"
    canvasType="2d"
    enableWebGLFallback={true}
    maxRetries={3}
    retryDelay={2000}
    autoRetry={true}
    autoRetryDelay={5000}
    errorReporting={true}
    showErrorDetails={process.env.NODE_ENV === 'development'}
    {...props}
  >
    {component}
  </CanvasErrorBoundary>
);

/**
 * Wrap PracticePlanner component with AI service error boundary
 */
export const withAIServiceErrorBoundary = (
  component: ReactNode,
  props?: any
) => (
  <AIServiceErrorBoundary
    componentName="PracticePlanner"
    serviceName="OpenAI"
    enableOfflineMode={true}
    retryWithBackoff={true}
    maxRetries={5}
    retryDelay={3000}
    autoRetry={true}
    autoRetryDelay={10000}
    errorReporting={true}
    showErrorDetails={process.env.NODE_ENV === 'development'}
    {...props}
  >
    {component}
  </AIServiceErrorBoundary>
);

/**
 * Wrap Dashboard component with data loading error boundary
 */
export const withDataLoadingErrorBoundary = (
  component: ReactNode,
  props?: any
) => (
  <DataLoadingErrorBoundary
    componentName="Dashboard"
    dataType="team"
    enableCaching={true}
    cacheTimeout={300000} // 5 minutes
    maxRetries={3}
    retryDelay={2000}
    autoRetry={true}
    autoRetryDelay={5000}
    errorReporting={true}
    showErrorDetails={process.env.NODE_ENV === 'development'}
    {...props}
  >
    {component}
  </DataLoadingErrorBoundary>
);

/**
 * Wrap TeamManagement component with data loading error boundary
 */
export const withTeamManagementErrorBoundary = (
  component: ReactNode,
  props?: any
) => (
  <DataLoadingErrorBoundary
    componentName="TeamManagement"
    dataType="team"
    enableCaching={true}
    cacheTimeout={600000} // 10 minutes
    maxRetries={3}
    retryDelay={2000}
    autoRetry={true}
    autoRetryDelay={5000}
    errorReporting={true}
    showErrorDetails={process.env.NODE_ENV === 'development'}
    {...props}
  >
    {component}
  </DataLoadingErrorBoundary>
);

/**
 * Wrap Analytics component with data loading error boundary
 */
export const withAnalyticsErrorBoundary = (
  component: ReactNode,
  props?: any
) => (
  <DataLoadingErrorBoundary
    componentName="Analytics"
    dataType="analytics"
    enableCaching={true}
    cacheTimeout={900000} // 15 minutes
    maxRetries={3}
    retryDelay={2000}
    autoRetry={true}
    autoRetryDelay={5000}
    errorReporting={true}
    showErrorDetails={process.env.NODE_ENV === 'development'}
    {...props}
  >
    {component}
  </DataLoadingErrorBoundary>
);

// ============================================
// HIGHER-ORDER COMPONENTS
// ============================================

/**
 * HOC to wrap components with appropriate error boundaries
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryType: 'canvas' | 'ai' | 'data' | 'base' = 'base',
  boundaryProps?: any
) => {
  const WrappedComponent = (props: P) => {
    const component = <Component {...props} />;

    switch (errorBoundaryType) {
      case 'canvas':
        return withCanvasErrorBoundary(component, boundaryProps);
      case 'ai':
        return withAIServiceErrorBoundary(component, boundaryProps);
      case 'data':
        return withDataLoadingErrorBoundary(component, boundaryProps);
      default:
        return (
          <BaseErrorBoundary
            componentName={Component.displayName || Component.name}
            maxRetries={3}
            retryDelay={2000}
            errorReporting={true}
            showErrorDetails={process.env.NODE_ENV === 'development'}
            {...boundaryProps}
          >
            {component}
          </BaseErrorBoundary>
        );
    }
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// ============================================
// ERROR BOUNDARY PROVIDER
// ============================================

interface ErrorBoundaryProviderProps {
  children: ReactNode;
  enableGlobalErrorReporting?: boolean;
  enableAutoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export const ErrorBoundaryProvider: React.FC<ErrorBoundaryProviderProps> = ({
  children,
  enableGlobalErrorReporting = true,
  enableAutoRetry = true,
  maxRetries = 3,
  retryDelay = 2000,
}) => {
  return (
    <BaseErrorBoundary
      componentName="AppRoot"
      errorReporting={enableGlobalErrorReporting}
      autoRetry={enableAutoRetry}
      maxRetries={maxRetries}
      retryDelay={retryDelay}
      showErrorDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </BaseErrorBoundary>
  );
};

// ============================================
// ERROR BOUNDARY CONFIGURATION
// ============================================

export const ERROR_BOUNDARY_CONFIG = {
  // Canvas components
  canvas: {
    maxRetries: 3,
    retryDelay: 2000,
    autoRetry: true,
    autoRetryDelay: 5000,
    enableWebGLFallback: true,
  },

  // AI service components
  ai: {
    maxRetries: 5,
    retryDelay: 3000,
    autoRetry: true,
    autoRetryDelay: 10000,
    retryWithBackoff: true,
    enableOfflineMode: true,
  },

  // Data loading components
  data: {
    maxRetries: 3,
    retryDelay: 2000,
    autoRetry: true,
    autoRetryDelay: 5000,
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
  },

  // Base configuration
  base: {
    maxRetries: 3,
    retryDelay: 2000,
    autoRetry: false,
    errorReporting: true,
    showErrorDetails: process.env.NODE_ENV === 'development',
  },
};

// ============================================
// ERROR BOUNDARY UTILITIES
// ============================================

/**
 * Get error boundary configuration for a specific component type
 */
export const getErrorBoundaryConfig = (
  type: keyof typeof ERROR_BOUNDARY_CONFIG
) => {
  return ERROR_BOUNDARY_CONFIG[type];
};

/**
 * Create a custom error boundary with specific configuration
 */
export const createErrorBoundary = (
  type: keyof typeof ERROR_BOUNDARY_CONFIG,
  customProps?: any
) => {
  const config = getErrorBoundaryConfig(type);

  switch (type) {
    case 'canvas':
      return (component: ReactNode) => (
        <CanvasErrorBoundary {...config} {...customProps}>
          {component}
        </CanvasErrorBoundary>
      );
    case 'ai':
      return (component: ReactNode) => (
        <AIServiceErrorBoundary {...config} {...customProps}>
          {component}
        </AIServiceErrorBoundary>
      );
    case 'data':
      return (component: ReactNode) => (
        <DataLoadingErrorBoundary {...config} {...customProps}>
          {component}
        </DataLoadingErrorBoundary>
      );
    default:
      return (component: ReactNode) => (
        <BaseErrorBoundary {...config} {...customProps}>
          {component}
        </BaseErrorBoundary>
      );
  }
};

export default {
  BaseErrorBoundary,
  CanvasErrorBoundary,
  AIServiceErrorBoundary,
  DataLoadingErrorBoundary,
  withErrorBoundary,
  ErrorBoundaryProvider,
  ERROR_BOUNDARY_CONFIG,
  getErrorBoundaryConfig,
  createErrorBoundary,
};
