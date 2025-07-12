import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  InputGroup,
  InputRightElement,
  IconButton,
  Divider,
  Alert,
  AlertIcon,
  useToast,
  Link,
  Checkbox,
  Progress,
} from '@chakra-ui/react';
import { FiEye, FiEyeOff, FiMail, FiLock, FiUser, FiGithub } from 'react-icons/fi';

interface SignupFormProps {
  onSignup: (email: string, password: string, name: string) => Promise<void>;
  onGoogleSignup: () => Promise<void>;
  onGithubSignup: () => Promise<void>;
  onSwitchToLogin: () => void;
  isLoading?: boolean;
}

const SignupForm: React.FC<SignupFormProps> = ({
  onSignup,
  onGoogleSignup,
  onGithubSignup,
  onSwitchToLogin,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<{ 
    name?: string; 
    email?: string; 
    password?: string; 
    confirmPassword?: string; 
    terms?: string; 
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const toast = useToast();

  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const getPasswordStrengthColor = (strength: number) => {
    if (strength <= 2) return 'red';
    if (strength <= 3) return 'orange';
    if (strength <= 4) return 'yellow';
    return 'green';
  };

  const validateForm = () => {
    const newErrors: { 
      name?: string; 
      email?: string; 
      password?: string; 
      confirmPassword?: string; 
      terms?: string; 
    } = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (getPasswordStrength(password) < 3) {
      newErrors.password = 'Password is too weak';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSignup(email, password, name);
      toast({
        title: 'Account Created',
        description: 'Welcome to Coach Core! Your account has been created successfully.',
        status: 'success',
        duration: 5000,
      });
    } catch (error) {
      toast({
        title: 'Signup Failed',
        description: error instanceof Error ? error.message : 'Unable to create account. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await onGoogleSignup();
      toast({
        title: 'Account Created',
        description: 'Welcome to Coach Core!',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Google Signup Failed',
        description: 'Unable to create account with Google. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleGithubSignup = async () => {
    try {
      await onGithubSignup();
      toast({
        title: 'Account Created',
        description: 'Welcome to Coach Core!',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'GitHub Signup Failed',
        description: 'Unable to create account with GitHub. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordStrengthColor = getPasswordStrengthColor(passwordStrength);

  return (
    <Box
      bg="white"
      borderRadius="xl"
      boxShadow="2xl"
      p={8}
      w="full"
      maxW="450px"
      mx="auto"
    >
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Heading size="lg" color="brand.600" mb={2}>
            Join Coach Core
          </Heading>
          <Text color="gray.600">
            Create your account to get started
          </Text>
        </Box>

        <form onSubmit={handleSubmit}>
          <VStack spacing={4} align="stretch">
            <FormControl isInvalid={!!errors.name}>
              <FormLabel>Full Name</FormLabel>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<FiUser />}
              />
              {errors.name && <FormErrorMessage>{errors.name}</FormErrorMessage>}
            </FormControl>

            <FormControl isInvalid={!!errors.email}>
              <FormLabel>Email Address</FormLabel>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<FiMail />}
              />
              {errors.email && <FormErrorMessage>{errors.email}</FormErrorMessage>}
            </FormControl>

            <FormControl isInvalid={!!errors.password}>
              <FormLabel>Password</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<FiLock />}
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    icon={showPassword ? <FiEyeOff /> : <FiEye />}
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                  />
                </InputRightElement>
              </InputGroup>
              {password && (
                <Box mt={2}>
                  <Text fontSize="sm" color="gray.600" mb={1}>
                    Password strength:
                  </Text>
                  <Progress 
                    value={passwordStrength * 20} 
                    colorScheme={passwordStrengthColor}
                    size="sm"
                    borderRadius="full"
                  />
                </Box>
              )}
              {errors.password && <FormErrorMessage>{errors.password}</FormErrorMessage>}
            </FormControl>

            <FormControl isInvalid={!!errors.confirmPassword}>
              <FormLabel>Confirm Password</FormLabel>
              <InputGroup>
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<FiLock />}
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    icon={showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                </InputRightElement>
              </InputGroup>
              {errors.confirmPassword && <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>}
            </FormControl>

            <FormControl isInvalid={!!errors.terms}>
              <Checkbox
                isChecked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                colorScheme="blue"
              >
                <Text fontSize="sm">
                  I agree to the{' '}
                  <Link color="brand.500" href="/terms" isExternal>
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link color="brand.500" href="/privacy" isExternal>
                    Privacy Policy
                  </Link>
                </Text>
              </Checkbox>
              {errors.terms && <FormErrorMessage>{errors.terms}</FormErrorMessage>}
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              isLoading={isSubmitting || isLoading}
              loadingText="Creating account..."
            >
              Create Account
            </Button>
          </VStack>
        </form>

        <HStack spacing={4}>
          <Divider />
          <Text fontSize="sm" color="gray.500">or</Text>
          <Divider />
        </HStack>

        <VStack spacing={3} align="stretch">
          <Button
            variant="outline"
            size="lg"
            onClick={handleGoogleSignup}
            leftIcon={<Box as="span" fontSize="lg">G</Box>}
          >
            Sign up with Google
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={handleGithubSignup}
            leftIcon={<FiGithub />}
          >
            Sign up with GitHub
          </Button>
        </VStack>

        <Box textAlign="center">
          <Text fontSize="sm" color="gray.600">
            Already have an account?{' '}
            <Link color="brand.500" onClick={onSwitchToLogin} cursor="pointer">
              Sign in
            </Link>
          </Text>
        </Box>

        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontSize="sm">
              By creating an account, you'll get access to AI-powered coaching tools and analytics.
            </Text>
          </Box>
        </Alert>
      </VStack>
    </Box>
  );
};

export default SignupForm; 