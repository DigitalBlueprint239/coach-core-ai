import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  useColorModeValue,
} from '@chakra-ui/react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ProductionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error);
      console.error('Error info:', errorInfo);
    }

    // In production, you might want to log to an error reporting service
    // For now, we'll just log to console
    console.error('Production error:', error);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.handleReset);
      }

      // Default production error UI
      return (
        <Box minH="100vh" bg="gray.50" p={8}>
          <VStack spacing={8} maxW="2xl" mx="auto" textAlign="center">
            <Alert status="error" borderRadius="lg">
              <AlertIcon as={AlertTriangle} />
              <Box>
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>
                  We're sorry, but something unexpected happened. Please try again.
                </AlertDescription>
              </Box>
            </Alert>

            <VStack spacing={4}>
              <Heading size="lg" color="gray.800">
                Oops! Something went wrong
              </Heading>
              <Text color="gray.600" fontSize="lg">
                We're working to fix this issue. In the meantime, you can try refreshing the page or going back to the home page.
              </Text>
            </VStack>

            <VStack spacing={4} w="full">
              <Button
                leftIcon={<RefreshCw />}
                onClick={this.handleReset}
                colorScheme="blue"
                size="lg"
                w="full"
              >
                Try Again
              </Button>
              
              <Button
                leftIcon={<Home />}
                onClick={this.handleGoHome}
                variant="outline"
                size="lg"
                w="full"
              >
                Go Home
              </Button>
            </VStack>

            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box w="full" mt={8}>
                <Text fontSize="sm" color="gray.500" mb={2}>
                  Error Details (Development Only):
                </Text>
                <Code p={4} borderRadius="md" fontSize="sm" w="full" textAlign="left">
                  {this.state.error.toString()}
                  {this.state.errorInfo && (
                    <>
                      {'\n\n'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </Code>
              </Box>
            )}
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ProductionErrorBoundary;