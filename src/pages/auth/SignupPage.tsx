import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Checkbox,
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
  Progress,
  Stack,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { FcGoogle } from 'react-icons/fc';
import { FiEye, FiEyeOff, FiLock, FiMail, FiUser } from 'react-icons/fi';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { authService } from '@services/firebase/auth-service';

interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password)) strength += 25;
  if (/[^A-Za-z0-9]/.test(password)) strength += 25;
  return strength;
};

export const SignupPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  const validate = useCallback((): boolean => {
    const nextErrors: FieldErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Please provide a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters long.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!acceptTerms) {
      nextErrors.terms = 'You must accept the terms to continue.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [acceptTerms, confirmPassword, email, password]);

  const handleEmailSignup = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);

      if (!validate()) {
        setError('Please resolve the highlighted fields to continue.');
        return;
      }

      setIsSubmitting(true);
      try {
        await authService.signUp({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          teamName: '',
          sport: 'football',
          ageGroup: 'adult',
        });
        setFieldErrors({});
        toast({
          title: 'Account created 🎉',
          description: 'Welcome to Coach Core AI! We are redirecting you to your dashboard.',
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
        navigate('/dashboard', { replace: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to create your account. Please try again.';
        setError(message);
        toast({
          title: 'Signup failed',
          description: message,
          status: 'error',
          duration: 6000,
          isClosable: true,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [displayName, email, navigate, password, toast, validate]
  );

  const handleGoogleSignup = useCallback(async () => {
    setError(null);
    setFieldErrors({});
    setIsGoogleSubmitting(true);
    try {
      await authService.signInWithGoogle();
      toast({
        title: 'Signed in with Google',
        description: 'Your Coach Core AI workspace is ready!',
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
      setError(message);
      toast({
        title: 'Google sign-in failed',
        description: message,
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setIsGoogleSubmitting(false);
    }
  }, [navigate, toast]);

  const strengthColor = useMemo(() => {
    if (passwordStrength >= 75) return 'green.400';
    if (passwordStrength >= 50) return 'yellow.400';
    if (passwordStrength > 0) return 'orange.400';
    return 'gray.200';
  }, [passwordStrength]);

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
        maxW="520px"
        bg="white"
        rounded="xl"
        shadow="2xl"
        px={{ base: 6, md: 10 }}
        py={{ base: 8, md: 12 }}
      >
        <VStack spacing={6} align="stretch">
          <Box>
            <Heading size="lg" color="gray.800">
              Create your Coach Core AI account
            </Heading>
            <Text mt={2} color="gray.500">
              Unlock AI-driven practice planning, analytics, and team collaboration tools.
            </Text>
          </Box>

          {error && (
            <Alert status="error" rounded="md">
              <AlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleEmailSignup} noValidate>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Display name (optional)</FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none" color="gray.400">
                    <FiUser />
                  </InputLeftElement>
                  <Input
                    placeholder="Coach Jamie"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    autoComplete="name"
                  />
                </InputGroup>
              </FormControl>

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
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
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
                <Progress
                  mt={2}
                  value={passwordStrength}
                  bg="gray.100"
                  size="sm"
                  sx={{ '& > div': { backgroundColor: strengthColor } }}
                />
                <FormErrorMessage>{fieldErrors.password}</FormErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={Boolean(fieldErrors.confirmPassword)}>
                <FormLabel>Confirm password</FormLabel>
                <Input
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <FormErrorMessage>{fieldErrors.confirmPassword}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={Boolean(fieldErrors.terms)}>
                <Checkbox
                  isChecked={acceptTerms}
                  onChange={(event) => setAcceptTerms(event.target.checked)}
                >
                  I agree to the{' '}
                  <ChakraLink as={RouterLink} to="/terms" color="blue.500" fontWeight="semibold">
                    Terms of Service
                  </ChakraLink>{' '}
                  and{' '}
                  <ChakraLink as={RouterLink} to="/privacy" color="blue.500" fontWeight="semibold">
                    Privacy Policy
                  </ChakraLink>
                </Checkbox>
                <FormErrorMessage>{fieldErrors.terms}</FormErrorMessage>
              </FormControl>

              <Button
                type="submit"
                size="lg"
                colorScheme="blue"
                isLoading={isSubmitting}
                loadingText="Creating account"
              >
                Create account
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
            onClick={handleGoogleSignup}
            isLoading={isGoogleSubmitting}
            loadingText="Connecting"
          >
            Sign up with Google
          </Button>

          <Text textAlign="center" color="gray.600">
            Already have an account?{' '}
            <ChakraLink as={RouterLink} to="/login" color="blue.500" fontWeight="semibold">
              Sign in instead
            </ChakraLink>
          </Text>
        </VStack>
      </Box>
    </Flex>
  );
};

export default SignupPage;
