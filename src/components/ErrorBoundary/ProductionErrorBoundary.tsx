import React, { Component, ErrorInfo, ReactNode } from 'react';
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
  Code,
  HStack,
  IconButton,
  useColorModeValue,
  Collapse,
  useDisclosure,
  Badge,
  Divider
} from '@chakra-ui/react';
import { RefreshCw, AlertTriangle, Bug, ChevronDown, ChevronUp, Copy, ExternalLink } from 'lucide-react';
import { Icon } from '@chakra-ui/react';
import { trackError } from '../../services/analytics';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  environment?: 'development' | 'staging' | 'production';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ProductionErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, environment = 'production' } = this.props;
    
    // Track error in analytics
    trackError(error, {
      component: 'ProductionErrorBoundary',
      errorInfo: errorInfo.componentStack,
      environment,
      errorId: this.state.errorId,
      retryCount: this.retryCount
    });

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Log error details
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: ''
      });
    } else {
      // Redirect to home page after max retries
      window.location.href = '/';
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  copyErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;
    const errorDetails = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
  };

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { children, fallback, showDetails = false, environment = 'production' } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          environment={environment}
          showDetails={showDetails}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
          onCopyDetails={this.copyErrorDetails}
          retryCount={this.retryCount}
          maxRetries={this.maxRetries}
        />
      );
    }

    return children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  environment: string;
  showDetails: boolean;
  onRetry: () => void;
  onReload: () => void;
  onGoHome: () => void;
  onCopyDetails: () => void;
  retryCount: number;
  maxRetries: number;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  environment,
  showDetails,
  onRetry,
  onReload,
  onGoHome,
  onCopyDetails,
  retryCount,
  maxRetries
}) => {
  const { isOpen, onToggle } = useDisclosure();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'development': return 'blue';
      case 'staging': return 'orange';
      case 'production': return 'red';
      default: return 'gray';
    }
  };

  const getErrorSeverity = (error: Error | null) => {
    if (!error) return 'medium';
    
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch')) return 'low';
    if (message.includes('permission') || message.includes('unauthorized')) return 'high';
    if (message.includes('critical') || message.includes('fatal')) return 'critical';
    return 'medium';
  };

  const severity = getErrorSeverity(error);

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')} p={6}>
      <VStack spacing={6} maxW="4xl" mx="auto">
        {/* Error Header */}
        <VStack spacing={4} textAlign="center">
          <Icon as={AlertTriangle} boxSize={16} color="red.500" />
          <Heading size="lg" color="red.500">
            Oops! Something went wrong
          </Heading>
          <Text color="gray.600" fontSize="lg">
            We're sorry, but something unexpected happened. Our team has been notified.
          </Text>
          
          <HStack spacing={2}>
            <Badge colorScheme={getEnvironmentColor(environment)}>
              {environment.toUpperCase()}
            </Badge>
            <Badge colorScheme={severity === 'critical' ? 'red' : severity === 'high' ? 'orange' : 'yellow'}>
              {severity.toUpperCase()}
            </Badge>
            <Badge colorScheme="gray" fontSize="xs">
              ID: {errorId.slice(-8)}
            </Badge>
          </HStack>
        </VStack>

        {/* Error Actions */}
        <VStack spacing={4} w="full" maxW="md">
          <HStack spacing={3} w="full">
            <Button
              leftIcon={<Icon as={RefreshCw} boxSize={4} />}
              colorScheme="blue"
              onClick={onRetry}
              isDisabled={retryCount >= maxRetries}
              flex={1}
            >
              {retryCount >= maxRetries ? 'Max Retries' : 'Try Again'}
            </Button>
            <Button
              leftIcon={<Icon as={RefreshCw} boxSize={4} />}
              variant="outline"
              onClick={onReload}
              flex={1}
            >
              Reload Page
            </Button>
          </HStack>
          
          <Button
            leftIcon={<Icon as={ExternalLink} boxSize={4} />}
            variant="ghost"
            onClick={onGoHome}
            w="full"
          >
            Go to Home Page
          </Button>
        </VStack>

        {/* Error Details (Development/Staging only) */}
        {(environment === 'development' || environment === 'staging' || showDetails) && (
          <Box w="full" maxW="4xl">
            <Button
              leftIcon={<Icon as={isOpen ? ChevronUp : ChevronDown} boxSize={4} />}
              rightIcon={<Icon as={Bug} boxSize={4} />}
              variant="outline"
              onClick={onToggle}
              w="full"
              mb={4}
            >
              {isOpen ? 'Hide' : 'Show'} Error Details
            </Button>
            
            <Collapse in={isOpen}>
              <Box
                bg={bgColor}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="md"
                p={4}
              >
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="semibold">Error Details</Text>
                    <IconButton
                      aria-label="Copy error details"
                      icon={<Icon as={Copy} boxSize={4} />}
                      size="sm"
                      variant="ghost"
                      onClick={onCopyDetails}
                    />
                  </HStack>
                  
                  <Divider />
                  
                  {error && (
                    <Box>
                      <Text fontWeight="semibold" mb={2}>Error Message:</Text>
                      <Code p={2} borderRadius="md" w="full" display="block">
                        {error.message}
                      </Code>
                    </Box>
                  )}
                  
                  {error?.stack && (
                    <Box>
                      <Text fontWeight="semibold" mb={2}>Stack Trace:</Text>
                      <Code p={2} borderRadius="md" w="full" display="block" whiteSpace="pre-wrap" fontSize="sm">
                        {error.stack}
                      </Code>
                    </Box>
                  )}
                  
                  {errorInfo?.componentStack && (
                    <Box>
                      <Text fontWeight="semibold" mb={2}>Component Stack:</Text>
                      <Code p={2} borderRadius="md" w="full" display="block" whiteSpace="pre-wrap" fontSize="sm">
                        {errorInfo.componentStack}
                      </Code>
                    </Box>
                  )}
                  
                  <Box>
                    <Text fontWeight="semibold" mb={2}>Environment Info:</Text>
                    <Code p={2} borderRadius="md" w="full" display="block" fontSize="sm">
                      {JSON.stringify({
                        errorId,
                        environment,
                        userAgent: navigator.userAgent,
                        url: window.location.href,
                        timestamp: new Date().toISOString(),
                        retryCount
                      }, null, 2)}
                    </Code>
                  </Box>
                </VStack>
              </Box>
            </Collapse>
          </Box>
        )}

        {/* Help Information */}
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Need Help?</AlertTitle>
            <AlertDescription>
              If this problem persists, please contact our support team with the error ID above.
            </AlertDescription>
          </Box>
        </Alert>
      </VStack>
    </Box>
  );
};

export default ProductionErrorBoundary;

