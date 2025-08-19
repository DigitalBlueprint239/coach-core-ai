import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useBreakpointValue,
  useColorModeValue,
} from '@chakra-ui/react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { RESPONSIVE_SPACING, RESPONSIVE_FONTS } from '../../utils/responsive';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  showRefreshButton?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ResponsiveErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleGoBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback 
        error={this.state.error!}
        onRetry={this.handleRetry}
        onGoHome={this.handleGoHome}
        onGoBack={this.handleGoBack}
        showHomeButton={this.props.showHomeButton}
        showBackButton={this.props.showBackButton}
        showRefreshButton={this.props.showRefreshButton}
      />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  onRetry: () => void;
  onGoHome: () => void;
  onGoBack: () => void;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  showRefreshButton?: boolean;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  onGoHome,
  onGoBack,
  showHomeButton = true,
  showBackButton = true,
  showRefreshButton = true,
}) => {
  const bgColor = useColorModeValue('red.50', 'red.900');
  const borderColor = useColorModeValue('red.200', 'red.700');
  const textColor = useColorModeValue('red.800', 'red.100');
  const spacing = useBreakpointValue(RESPONSIVE_SPACING.lg);
  const headingSize = useBreakpointValue(RESPONSIVE_FONTS.xl);
  const textSize = useBreakpointValue(RESPONSIVE_FONTS.sm);

  return (
    <Box
      minH="100vh"
      bg={bgColor}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={spacing}
    >
      <VStack
        maxW={{ base: '100%', md: '600px', lg: '800px' }}
        spacing={spacing}
        align="center"
        textAlign="center"
      >
        <Box
          w={{ base: '80px', md: '100px', lg: '120px' }}
          h={{ base: '80px', md: '100px', lg: '120px' }}
          borderRadius="full"
          bg="red.100"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="red.600"
        >
          <Icon as={AlertTriangle} boxSize={{ base: '40px', md: '50px', lg: '60px' }} />
        </Box>

        <VStack spacing={4}>
          <Heading 
            size={headingSize} 
            color={textColor}
            className="animate-fade-in-responsive"
          >
            Oops! Something went wrong
          </Heading>
          
          <Text 
            fontSize={textSize} 
            color={textColor}
            maxW="500px"
            className="animate-slide-up-responsive"
          >
            We encountered an unexpected error. Don't worry, our team has been notified and we're working to fix it.
          </Text>

          {process.env.NODE_ENV === 'development' && (
            <Alert status="error" borderRadius="lg" maxW="600px">
              <AlertIcon />
              <Box>
                <AlertTitle>Error Details (Development)</AlertTitle>
                <AlertDescription fontSize="xs" fontFamily="mono">
                  {error.message}
                </AlertDescription>
              </Box>
            </Alert>
          )}
        </VStack>

        <VStack spacing={3} w="full" maxW="400px">
          {showRefreshButton && (
            <Button
              leftIcon={<Icon as={RefreshCw} />}
              colorScheme="red"
              variant="solid"
              size={{ base: 'md', md: 'lg' }}
              onClick={onRetry}
              w="full"
              className="animate-fade-in-responsive"
            >
              Try Again
            </Button>
          )}

          {showBackButton && (
            <Button
              leftIcon={<Icon as={ArrowLeft} />}
              variant="outline"
              colorScheme="red"
              size={{ base: 'md', md: 'lg' }}
              onClick={onGoBack}
              w="full"
              className="animate-fade-in-responsive"
            >
              Go Back
            </Button>
          )}

          {showHomeButton && (
            <Button
              leftIcon={<Icon as={Home} />}
              variant="ghost"
              colorScheme="red"
              size={{ base: 'md', md: 'lg' }}
              onClick={onGoHome}
              w="full"
              className="animate-fade-in-responsive"
            >
              Go Home
            </Button>
          )}
        </VStack>
      </VStack>
    </Box>
  );
};

export default ResponsiveErrorBoundary;
