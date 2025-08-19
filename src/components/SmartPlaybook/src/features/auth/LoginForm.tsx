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
  useToast,
  Link,
} from '@chakra-ui/react';
import { FiEye, FiEyeOff, FiMail, FiLock, FiGithub } from 'react-icons/fi';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  onGithubLogin: () => Promise<void>;
  onSwitchToSignup: () => void;
  isLoading?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onGoogleLogin,
  onGithubLogin,
  onSwitchToSignup,
  isLoading = false,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const toast = useToast();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
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
      await onLogin(email, password);
      toast({
        title: 'Login Successful',
        description: 'Welcome back to Coach Core!',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'Please check your credentials and try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await onGoogleLogin();
      toast({
        title: 'Login Successful',
        description: 'Welcome to Coach Core!',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Google Login Failed',
        description: 'Unable to sign in with Google. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleGithubLogin = async () => {
    try {
      await onGithubLogin();
      toast({
        title: 'Login Successful',
        description: 'Welcome to Coach Core!',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'GitHub Login Failed',
        description: 'Unable to sign in with GitHub. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box
      bg="white"
      borderRadius="xl"
      boxShadow="2xl"
      p={8}
      w="full"
      maxW="400px"
      mx="auto"
    >
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Heading size="lg" color="brand.600" mb={2}>
            Welcome Back
          </Heading>
          <Text color="gray.600">
            Sign in to your Coach Core account
          </Text>
        </Box>

        <form onSubmit={handleSubmit}>
          <VStack spacing={4} align="stretch">
            <FormControl isInvalid={!!errors.email}>
              <FormLabel>Email Address</FormLabel>
              <InputGroup>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<FiMail />}
                />
              </InputGroup>
              {errors.email && <FormErrorMessage>{errors.email}</FormErrorMessage>}
            </FormControl>

            <FormControl isInvalid={!!errors.password}>
              <FormLabel>Password</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
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
              {errors.password && <FormErrorMessage>{errors.password}</FormErrorMessage>}
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              isLoading={isSubmitting || isLoading}
              loadingText="Signing in..."
            >
              Sign In
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
            onClick={handleGoogleLogin}
            leftIcon={<Box as="span" fontSize="lg">G</Box>}
          >
            Continue with Google
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={handleGithubLogin}
            leftIcon={<FiGithub />}
          >
            Continue with GitHub
          </Button>
        </VStack>

        <Box textAlign="center">
          <Text fontSize="sm" color="gray.600">
            Don't have an account?{' '}
            <Link color="brand.500" onClick={onSwitchToSignup} cursor="pointer">
              Sign up
            </Link>
          </Text>
        </Box>
      </VStack>
    </Box>
  );
};

export default LoginForm; 