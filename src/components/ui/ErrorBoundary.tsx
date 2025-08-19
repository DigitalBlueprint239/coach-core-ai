import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Icon,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  Divider,
  useToast,
} from '@chakra-ui/react';
import { AlertTriangle, RefreshCw, Home, Bug, Info } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId(),
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId: this.generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service (e.g., Sentry, LogRocket)
    this.logErrorToService(error, errorInfo);
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // This would typically send to an error reporting service
    // For now, we'll just log to console
    console.group('Error Details for Reporting');
    console.log('Error ID:', this.state.errorId);
    console.log('Error:', error);
    console.log('Error Info:', errorInfo);
    console.log('User Agent:', navigator.userAgent);
    console.log('URL:', window.location.href);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId(),
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportBug = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    // This would typically open a bug report form or send to support
    console.log('Bug Report Details:', errorDetails);
    
    // For now, copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        // Show success message
        console.log('Error details copied to clipboard');
      })
      .catch(() => {
        // Fallback: open in new window
        const blob = new Blob([JSON.stringify(errorDetails, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return <ErrorFallbackUI 
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        errorId={this.state.errorId}
        onRetry={this.handleRetry}
        onGoHome={this.handleGoHome}
        onReportBug={this.handleReportBug}
        showDetails={this.props.showDetails}
      />;
    }

    return this.props.children;
  }
}

// Error Fallback UI Component
interface ErrorFallbackUIProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  onRetry: () => void;
  onGoHome: () => void;
  onReportBug: () => void;
  showDetails?: boolean;
}

const ErrorFallbackUI: React.FC<ErrorFallbackUIProps> = ({
  error,
  errorInfo,
  errorId,
  onRetry,
  onGoHome,
  onReportBug,
  showDetails = false,
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('red.200', 'red.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const errorColor = useColorModeValue('red.600', 'red.400');

  return (
    <Box
      minH="100vh"
      bg={bgColor}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
    >
      <Box
        maxW="600px"
        w="100%"
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="xl"
        p={8}
        textAlign="center"
        boxShadow="xl"
      >
        <VStack spacing={6}>
          {/* Error Icon */}
          <Box
            w={20}
            h={20}
            borderRadius="full"
            bg={useColorModeValue('red.100', 'red.900')}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Icon as={AlertTriangle} boxSize={10} color={errorColor} />
          </Box>

          {/* Error Title */}
          <VStack spacing={2}>
            <Heading size="lg" color={textColor}>
              Oops! Something went wrong
            </Heading>
            <Text color={useColorModeValue('gray.600', 'gray.400')} fontSize="md">
              We encountered an unexpected error. Don't worry, our team has been notified.
            </Text>
          </VStack>

          {/* Error ID */}
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle fontSize="sm">Error ID</AlertTitle>
              <AlertDescription fontSize="xs" fontFamily="mono">
                {errorId}
              </AlertDescription>
            </Box>
          </Alert>

          {/* Action Buttons */}
          <HStack spacing={4} flexWrap="wrap" justify="center">
            <Button
              leftIcon={<RefreshCw />}
              colorScheme="blue"
              onClick={onRetry}
              size="lg"
            >
              Try Again
            </Button>
            <Button
              leftIcon={<Home />}
              variant="outline"
              onClick={onGoHome}
              size="lg"
            >
              Go Home
            </Button>
            <Button
              leftIcon={<Bug />}
              variant="ghost"
              onClick={onReportBug}
              size="lg"
            >
              Report Bug
            </Button>
          </HStack>

          {/* Error Details (if enabled) */}
          {showDetails && error && (
            <>
              <Divider />
              <VStack spacing={4} align="stretch" textAlign="left">
                <Heading size="md" color={errorColor}>
                  Error Details
                </Heading>
                
                <Box>
                  <Text fontWeight="semibold" mb={2}>Error Message:</Text>
                  <Code p={3} borderRadius="md" fontSize="sm" display="block">
                    {error.message}
                  </Code>
                </Box>

                {error.stack && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Stack Trace:</Text>
                    <Code p={3} borderRadius="md" fontSize="xs" display="block" maxH="200px" overflowY="auto">
                      {error.stack}
                    </Code>
                  </Box>
                )}

                {errorInfo?.componentStack && (
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Component Stack:</Text>
                    <Code p={3} borderRadius="md" fontSize="xs" display="block" maxH="200px" overflowY="auto">
                      {errorInfo.componentStack}
                    </Code>
                  </Box>
                )}
              </VStack>
            </>
          )}

          {/* Help Text */}
          <Box>
            <Text fontSize="sm" color={useColorModeValue('gray.500', 'gray.400')}>
              If this problem persists, please contact support with the Error ID above.
            </Text>
          </Box>
        </VStack>
      </Box>
    </Box>
  );
};

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const toast = useToast();

  const handleError = (error: Error, context?: string) => {
    console.error(`Error in ${context || 'component'}:`, error);
    
    toast({
      title: 'An error occurred',
      description: error.message || 'Something went wrong. Please try again.',
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  };

  const handleAsyncError = async <T>(
    asyncFn: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error as Error, context);
      return null;
    }
  };

  return { handleError, handleAsyncError };
};

// Higher-order component for error handling
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default ErrorBoundary;
