import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Center,
  Divider,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Link as ChakraLink,
  Spinner,
  Stack,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react';
import type { Location } from 'react-router-dom';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi';
import { authService } from '@services/firebase/auth-service';
import { useAuth } from '@hooks/useAuth';

interface LocationState {
  from?: Location;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { user, isLoading } = useAuth();

  const redirectTarget = useMemo(() => {
    const state = location.state as LocationState | undefined;
    return state?.from?.pathname ?? '/dashboard';
  }, [location.state]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (!isLoading && user) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isLoading, navigate, redirectTarget, user]);

  const handleError = useCallback(
    (message: string) => {
      setError(message);
      toast({
        title: 'Authentication Error',
        description: message,
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
    },
    [toast]
  );

  const handleSuccess = useCallback(() => {
    toast({
      title: 'Welcome back! 👋',
      description: 'You have been signed in successfully.',
      status: 'success',
      duration: 4000,
      isClosable: true,
    });
    navigate(redirectTarget, { replace: true });
  }, [navigate, redirectTarget, toast]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      const validationErrors: { email?: string; password?: string } = {};

      if (!trimmedEmail) {
        validationErrors.email = 'Email is required.';
      }
      if (!trimmedPassword) {
        validationErrors.password = 'Password is required.';
      }

      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        setError('Please fix the highlighted fields to continue.');
        return;
      }

      setError(null);
      setFieldErrors({});
      setIsSubmitting(true);
      try {
        await authService.signIn(trimmedEmail, trimmedPassword);
        handleSuccess();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to sign in. Please try again.';
        handleError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, handleError, handleSuccess, password]
  );

  const handleGoogleSignIn = useCallback(async () => {
    setError(null);
    setFieldErrors({});
    setIsGoogleSubmitting(true);
    try {
      await authService.signInWithGoogle();
      handleSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
      handleError(message);
    } finally {
      setIsGoogleSubmitting(false);
    }
  }, [handleError, handleSuccess]);

  if (isLoading && !user) {
    return (
      <Center minH="100vh" bgGradient="linear(to-br, gray.900, gray.800)">
        <VStack spacing={4}>
          <Spinner size="xl" thickness="4px" color="blue.300" speed="0.65s" />
          <Heading size="sm" color="whiteAlpha.800">
            Preparing your experience…
          </Heading>
          <Text fontSize="sm" color="whiteAlpha.700">
            Just a moment while we verify your session.
          </Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Flex
      minH="100vh"
      bgGradient="linear(to-br, gray.900, gray.800)"
      align="center"
      justify="center"
      px={{ base: 4, md: 8 }}
      py={{ base: 8, md: 16 }}
    >
      <Box
        w="full"
        maxW="480px"
        bg="white"
        rounded="xl"
        shadow="2xl"
        px={{ base: 6, md: 10 }}
        py={{ base: 8, md: 12 }}
      >
        <VStack spacing={6} align="stretch">
          <Box>
            <Text fontSize="sm" color="gray.500" mb={2}>
              Welcome back
            </Text>
            <Heading size="lg" color="gray.800">
              Sign in to Coach Core AI
            </Heading>
            <Text mt={2} color="gray.500">
              Continue where you left off and keep your team prepared.
            </Text>
          </Box>

          {error && (
            <Alert status="error" rounded="md">
              <AlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired isInvalid={Boolean(fieldErrors.email)}>
                <FormLabel>Email address</FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none" color="gray.400">
                    <FiMail />
                  </InputLeftElement>
                  <Input
                    type="email"
                    placeholder="coach@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                  />
                </InputGroup>
                <FormErrorMessage>{fieldErrors.email}</FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={Boolean(fieldErrors.password)}>
                <FormLabel>Password</FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none" color="gray.400">
                    <FiLock />
                  </InputLeftElement>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                  <InputRightElement>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </Button>
                  </InputRightElement>
                </InputGroup>
                <FormErrorMessage>{fieldErrors.password}</FormErrorMessage>
              </FormControl>

              <Stack direction="row" justify="space-between" align="center" pt={2}>
                <ChakraLink as={RouterLink} to="/" color="blue.500" fontWeight="medium">
                  ← Back to home
                </ChakraLink>
                <ChakraLink as={RouterLink} to="/forgot-password" color="blue.500" fontWeight="medium">
                  Forgot password?
                </ChakraLink>
              </Stack>

              <Button
                type="submit"
                size="lg"
                colorScheme="blue"
                isLoading={isSubmitting}
                loadingText="Signing in"
              >
                Sign in
              </Button>
            </VStack>
          </form>

          <Divider>
            <Text color="gray.500" fontSize="sm">
              or continue with
            </Text>
          </Divider>

          <Button
            size="lg"
            variant="outline"
            leftIcon={<FcGoogle size={20} />}
            onClick={handleGoogleSignIn}
            isLoading={isGoogleSubmitting}
            loadingText="Connecting"
          >
            Sign in with Google
          </Button>

          <Text textAlign="center" color="gray.600">
            New to Coach Core AI?{' '}
            <ChakraLink as={RouterLink} to="/signup" color="blue.500" fontWeight="semibold">
              Create an account
            </ChakraLink>
          </Text>
        </VStack>
      </Box>
    </Flex>
  );
};

export default LoginPage;
