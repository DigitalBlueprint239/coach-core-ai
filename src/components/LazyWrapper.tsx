import React, { Suspense, lazy, ComponentType, ReactNode } from 'react';
import { Box, Spinner, Text, VStack, Alert, AlertIcon, AlertTitle, AlertDescription, Button } from '@chakra-ui/react';
import { ErrorBoundary } from '@sentry/react';

interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  minHeight?: string | number;
  showErrorDetails?: boolean;
}

interface LazyComponentProps {
  [key: string]: any;
}

// Default loading fallback component
const DefaultLoadingFallback: React.FC<{ minHeight?: string | number }> = ({ minHeight = '200px' }) => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minH={minHeight}
    p={4}
  >
    <VStack spacing={4}>
      <Spinner size="xl" color="blue.500" thickness="4px" />
      <Text color="gray.600" fontSize="sm">
        Loading component...
      </Text>
    </VStack>
  </Box>
);

// Default error fallback component
const DefaultErrorFallback: React.FC<{ 
  error?: Error; 
  retry?: () => void;
  showDetails?: boolean;
}> = ({ error, retry, showDetails = false }) => (
  <Box p={4}>
    <Alert status="error" borderRadius="md">
      <AlertIcon />
      <Box>
        <AlertTitle>Failed to load component</AlertTitle>
        <AlertDescription>
          There was an error loading this component. Please try again.
          {showDetails && error && (
            <Box mt={2} fontSize="sm" color="red.600">
              Error: {error.message}
            </Box>
          )}
        </AlertDescription>
        {retry && (
          <Button 
            size="sm" 
            colorScheme="red" 
            variant="outline" 
            mt={2}
            onClick={retry}
          >
            Retry
          </Button>
        )}
      </Box>
    </Alert>
  </Box>
);

// Main LazyWrapper component
export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  fallback = <DefaultLoadingFallback />,
  errorFallback,
  minHeight,
  showErrorDetails = process.env.NODE_ENV === 'development'
}) => {
  const [retryKey, setRetryKey] = React.useState(0);

  const handleRetry = () => {
    setRetryKey(prev => prev + 1);
  };

  const errorFallbackComponent = errorFallback || (
    <DefaultErrorFallback 
      retry={handleRetry} 
      showDetails={showErrorDetails}
    />
  );

  return (
    <ErrorBoundary 
      key={retryKey}
      fallback={errorFallbackComponent}
      beforeCapture={(scope) => {
        scope.setTag('component', 'LazyWrapper');
        scope.setContext('retryKey', { retryKey });
      }}
    >
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

// Higher-order component for lazy loading with error handling
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback?: ReactNode,
  errorFallback?: ReactNode
) {
  const LazyComponent = React.forwardRef<any, P>((props, ref) => (
    <LazyWrapper fallback={fallback} errorFallback={errorFallback}>
      <Component {...props} ref={ref} />
    </LazyWrapper>
  ));

  LazyComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;
  return LazyComponent;
}

// Utility function to create lazy components with consistent error handling
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: ReactNode,
  errorFallback?: ReactNode
) {
  const LazyComponent = lazy(importFn);
  
  return React.forwardRef<any, P>((props, ref) => (
    <LazyWrapper fallback={fallback} errorFallback={errorFallback}>
      <LazyComponent {...props} ref={ref} />
    </LazyWrapper>
  ));
}

// Pre-configured lazy components for common use cases
export const LazyPage = React.forwardRef<any, LazyComponentProps>((props, ref) => (
  <LazyWrapper minHeight="100vh" showErrorDetails={process.env.NODE_ENV === 'development'}>
    {props.children}
  </LazyWrapper>
));

export const LazyModal = React.forwardRef<any, LazyComponentProps>((props, ref) => (
  <LazyWrapper minHeight="400px">
    {props.children}
  </LazyWrapper>
));

export const LazyChart = React.forwardRef<any, LazyComponentProps>((props, ref) => (
  <LazyWrapper minHeight="300px">
    {props.children}
  </LazyWrapper>
));

export const LazyCanvas = React.forwardRef<any, LazyComponentProps>((props, ref) => (
  <LazyWrapper minHeight="500px">
    {props.children}
  </LazyWrapper>
));

// Set display names
LazyPage.displayName = 'LazyPage';
LazyModal.displayName = 'LazyModal';
LazyChart.displayName = 'LazyChart';
LazyCanvas.displayName = 'LazyCanvas';

export default LazyWrapper;
