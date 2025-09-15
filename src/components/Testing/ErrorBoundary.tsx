import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  VStack,
  Text,
  Heading,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  useColorModeValue,
} from '@chakra-ui/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box p={8} textAlign="center">
          <VStack spacing={6}>
            <Heading size="lg" color="red.500">
              🚨 Something went wrong
            </Heading>

            <Alert status="error" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Application Error</AlertTitle>
                <AlertDescription>
                  An error occurred while rendering this component.
                </AlertDescription>
              </Box>
            </Alert>

            {this.state.error && (
              <Box textAlign="left" w="full" maxW="2xl">
                <Text fontWeight="semibold" mb={2}>
                  Error Details:
                </Text>
                <Code
                  p={4}
                  borderRadius="md"
                  bg="gray.100"
                  color="red.600"
                  fontSize="sm"
                  display="block"
                >
                  {this.state.error.toString()}
                </Code>
              </Box>
            )}

            {this.state.errorInfo && (
              <Box textAlign="left" w="full" maxW="2xl">
                <Text fontWeight="semibold" mb={2}>
                  Component Stack:
                </Text>
                <Code
                  p={4}
                  borderRadius="md"
                  bg="gray.100"
                  color="gray.600"
                  fontSize="xs"
                  display="block"
                >
                  {this.state.errorInfo.componentStack}
                </Code>
              </Box>
            )}

            <Button
              colorScheme="blue"
              onClick={() => {
                this.setState({
                  hasError: false,
                  error: undefined,
                  errorInfo: undefined,
                });
                window.location.reload();
              }}
            >
              Reload Application
            </Button>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
