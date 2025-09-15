import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  useToast,
  Container,
  Card,
  CardBody,
  CardHeader,
  useColorModeValue,
  Divider,
  Icon,
} from '@chakra-ui/react';
import { Mail, Lock, Users, Brain, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/firebase/auth-service';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { user, profile } = await authService.signIn(email, password);
      
      toast({
        title: 'Welcome back! 🎉',
        description: `Great to see you again, ${user.displayName || 'Coach'}!`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);

    try {
      const { user, profile } = await authService.signInWithGoogle();
      
      toast({
        title: 'Welcome to Coach Core AI! 🎉',
        description: `Signed in successfully with Google`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg={bgColor} py={8}>
      <Container maxW="md">
        <VStack spacing={8}>
          {/* Header */}
          <VStack spacing={4} textAlign="center">
            <Heading size="2xl" color="brand.600">
              Welcome Back, Coach!
            </Heading>
            <Text fontSize="lg" color="gray.600">
              Sign in to continue transforming your coaching with AI
            </Text>
          </VStack>

          {/* Login Form */}
          <Card w="full" bg={cardBg}>
            <CardHeader textAlign="center" pb={4}>
              <Heading size="lg" color="gray.800">
                Sign In
              </Heading>
            </CardHeader>

            <CardBody>
              <form onSubmit={handleSubmit}>
                <VStack spacing={4}>
                  <FormControl isRequired isInvalid={!!error && !email}>
                    <FormLabel>Email Address</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="coach@team.com"
                      size="lg"
                      leftIcon={<Icon as={Mail} />}
                    />
                  </FormControl>

                  <FormControl isRequired isInvalid={!!error && !password}>
                    <FormLabel>Password</FormLabel>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      size="lg"
                      leftIcon={<Icon as={Lock} />}
                    />
                  </FormControl>

                  {error && (
                    <Box
                      p={3}
                      bg="red.50"
                      color="red.700"
                      borderRadius="md"
                      w="full"
                      textAlign="center"
                    >
                      {error}
                    </Box>
                  )}

                  <Button
                    type="submit"
                    colorScheme="brand"
                    size="lg"
                    w="full"
                    isLoading={loading}
                    loadingText="Signing In..."
                  >
                    Sign In
                  </Button>
                </VStack>
              </form>

              <VStack spacing={4} pt={6}>
                <Divider />
                
                <Button
                  onClick={handleGoogle}
                  variant="outline"
                  size="lg"
                  w="full"
                  isLoading={loading}
                  loadingText="Connecting..."
                  leftIcon={<Icon as={Users} />}
                >
                  Continue with Google
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {/* Sign Up Link */}
          <VStack spacing={4} textAlign="center">
            <Text fontSize="sm" color="gray.600">
              Don't have an account?{' '}
              <Button
                variant="link"
                color="brand.500"
                onClick={() => navigate('/signup')}
              >
                Sign up for free
              </Button>
            </Text>

            {/* Feature Preview */}
            <Card bg={cardBg} w="full" maxW="sm">
              <CardHeader textAlign="center" pb={2}>
                <Heading size="sm" color="gray.700">
                  What's New?
                </Heading>
              </CardHeader>
              <CardBody pt={0}>
                <VStack spacing={3} align="stretch">
                  <HStack spacing={3} p={2} bg="red.50" borderRadius="md">
                    <Icon as={Play} color="red.500" />
                    <Text fontSize="xs" color="red.700">
                      AI Play Generator - Create intelligent football plays
                    </Text>
                  </HStack>
                  <HStack spacing={3} p={2} bg="orange.50" borderRadius="md">
                    <Icon as={Brain} color="orange.500" />
                    <Text fontSize="xs" color="orange.700">
                      AI Brain - Get personalized coaching insights
                    </Text>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </VStack>
      </Container>
    </Box>
  );
};

export default Login;
