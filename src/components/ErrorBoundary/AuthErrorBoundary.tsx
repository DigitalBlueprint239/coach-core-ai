import React, { Component, ReactNode } from 'react';
import {
  Box,
  VStack,
  Text,
  Button,
  Heading,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  Container,
  Center
} from '@chakra-ui/react';
import { RefreshCw, Home, ArrowLeft, AlertTriangle } from 'lucide-react';
import * as Sentry from '@sentry/react';

// ============================================
// AUTH ERROR BOUNDARY INTERFACES
// ============================================

interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
  enableRetry?: boolean;
  enableNavigation?: boolean;
}

interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
  retryCount: number;
}

// ============================================
// AUTH ERROR BOUNDARY COMPONENT
// ============================================

export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId(),
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substring(2, 15)
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Update state with error details
    this.setState({
      error,
      errorInfo,
      errorId: this.generateErrorId()
    });

    // Log to Sentry with auth-specific context
    Sentry.captureException(error, {
      tags: {
        errorBoundary: 'auth',
        component: 'AuthErrorBoundary',
        retryCount: this.state.retryCount
      },
      extra: {
        errorInfo,
        errorId: this.state.errorId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      },
      level: 'error'
    });

    // Add breadcrumb for auth error
    Sentry.addBreadcrumb({
      message: 'Auth error boundary caught error',
      category: 'error_boundary',
      level: 'error',
      data: {
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack
      }
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Auth Error Boundary caught error:', error);
      console.error('Error Info:', errorInfo);
    }
  }

  private generateErrorId(): string {
    return `auth_error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));

      // Add breadcrumb for retry attempt
      Sentry.addBreadcrumb({
        message: 'Auth error boundary retry attempted',
        category: 'error_boundary',
        level: 'info',
        data: {
          retryCount: this.state.retryCount + 1,
          maxRetries: this.maxRetries
        }
      });
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleGoBack = () => {
    window.history.back();
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
      retryCount: this.state.retryCount
    };

    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
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

      // Default auth error UI
      return <AuthErrorFallback 
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        errorId={this.state.errorId}
        retryCount={this.state.retryCount}
        maxRetries={this.maxRetries}
        onRetry={this.handleRetry}
        onGoHome={this.handleGoHome}
        onGoBack={this.handleGoBack}
        onReportBug={this.handleReportBug}
        showDetails={this.props.showDetails}
        enableRetry={this.props.enableRetry}
        enableNavigation={this.props.enableNavigation}
      />;
    }

    return this.props.children;
  }
}

// ============================================
// AUTH ERROR FALLBACK UI
// ============================================

interface AuthErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
  retryCount: number;
  maxRetries: number;
  onRetry: () => void;
  onGoHome: () => void;
  onGoBack: () => void;
  onReportBug: () => void;
  showDetails?: boolean;
  enableRetry?: boolean;
  enableNavigation?: boolean;
}

const AuthErrorFallback: React.FC<AuthErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  retryCount,
  maxRetries,
  onRetry,
  onGoHome,
  onGoBack,
  onReportBug,
  showDetails = false,
  enableRetry = true,
  enableNavigation = true
}) => {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('red.200', 'red.800');

  return (
    <Box minH="100vh" bg={bgColor} py={8}>
      <Container maxW="md">
        <Center>
          <Box
            bg={cardBg}
            p={8}
            borderRadius="lg"
            boxShadow="lg"
            border="1px"
            borderColor={borderColor}
            w="full"
          >
            <VStack spacing={6} align="stretch">
              {/* Error Icon and Title */}
              <VStack spacing={4}>
                <Box
                  p={4}
                  borderRadius="full"
                  bg="red.100"
                  color="red.600"
                >
                  <AlertTriangle size={32} />
                </Box>
                <Heading size="lg" color="red.600" textAlign="center">
                  Authentication Error
                </Heading>
                <Text color="gray.600" textAlign="center">
                  Something went wrong with the authentication system. We've been notified and are working to fix it.
                </Text>
              </VStack>

              {/* Error Alert */}
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Error ID: {errorId}</AlertTitle>
                  <AlertDescription>
                    {error?.message || 'An unknown error occurred'}
                  </AlertDescription>
                </Box>
              </Alert>

              {/* Retry Information */}
              {enableRetry && retryCount > 0 && (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <AlertDescription>
                    Retry attempt {retryCount} of {maxRetries}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <VStack spacing={3}>
                {enableRetry && retryCount < maxRetries && (
                  <Button
                    leftIcon={<RefreshCw size={16} />}
                    colorScheme="blue"
                    onClick={onRetry}
                    w="full"
                  >
                    Try Again
                  </Button>
                )}

                {enableNavigation && (
                  <>
                    <Button
                      leftIcon={<Home size={16} />}
                      variant="outline"
                      onClick={onGoHome}
                      w="full"
                    >
                      Go Home
                    </Button>
                    <Button
                      leftIcon={<ArrowLeft size={16} />}
                      variant="ghost"
                      onClick={onGoBack}
                      w="full"
                    >
                      Go Back
                    </Button>
                  </>
                )}

                <Button
                  variant="link"
                  colorScheme="blue"
                  onClick={onReportBug}
                  size="sm"
                >
                  Report This Issue
                </Button>
              </VStack>

              {/* Error Details (Development Only) */}
              {showDetails && process.env.NODE_ENV === 'development' && (
                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb={2}>
                    Error Details (Development):
                  </Text>
                  <Box
                    p={3}
                    bg="gray.100"
                    borderRadius="md"
                    fontSize="xs"
                    fontFamily="mono"
                    overflow="auto"
                    maxH="200px"
                  >
                    <pre>
                      {JSON.stringify({
                        error: error?.message,
                        stack: error?.stack,
                        componentStack: errorInfo?.componentStack
                      }, null, 2)}
                    </pre>
                  </Box>
                </Box>
              )}
            </VStack>
          </Box>
        </Center>
      </Container>
    </Box>
  );
};

// ============================================
// HIGHER-ORDER COMPONENT
// ============================================

export const withAuthErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<AuthErrorBoundaryProps>
) => {
  const WrappedComponent = (props: P) => (
    <AuthErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AuthErrorBoundary>
  );

  WrappedComponent.displayName = `withAuthErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default AuthErrorBoundary;

